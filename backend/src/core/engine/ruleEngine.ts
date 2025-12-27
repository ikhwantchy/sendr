/**
 * Bot Rule Engine
 * 
 * Responsibilities:
 * - Subscribe to MESSAGE_RECEIVED events
 * - Load keyword rules from database
 * - Match keywords (equals, contains, regex)
 * - Apply scope filtering (global, group, contact)
 * - Emit KEYWORD_MATCHED events
 * 
 * RESTRICTIONS:
 * - MUST NOT send messages
 * - MUST NOT fetch spreadsheets
 * - MUST NOT contain response logic
 * - ONLY matches and emits events
 */

import { eventBus } from '../events/eventBus';
import { EventType, BaseEvent, MessageReceivedPayload, KeywordMatchedPayload } from '../events/types';
import { keywordRuleRepository } from '../../database/repositories/keywordRuleRepository';
import { logger } from '../../utils/logger';

interface KeywordRule {
    id: string;
    tenant_id: string;
    bot_id: string;
    name: string;
    keyword: string;
    match_type: 'equals' | 'contains' | 'regex';
    scope: 'global' | 'group' | 'contact';
    scope_target: string | null;
    priority: number;
    is_active: boolean;
    actions: any[];
}

class RuleEngine {
    private rulesCache: Map<string, KeywordRule[]> = new Map();
    private cacheTTL: number = 60000; // 1 minute
    private lastCacheUpdate: Map<string, number> = new Map();

    constructor() {
        this.initialize();
    }

    /**
     * Initialize the rule engine
     */
    private initialize(): void {
        // Subscribe to MESSAGE_RECEIVED events
        eventBus.subscribe(EventType.MESSAGE_RECEIVED, this.handleMessageReceived.bind(this));

        // Subscribe to rule update events to invalidate cache
        eventBus.subscribe(EventType.RULE_CREATED, this.invalidateCache.bind(this));
        eventBus.subscribe(EventType.RULE_UPDATED, this.invalidateCache.bind(this));
        eventBus.subscribe(EventType.RULE_DELETED, this.invalidateCache.bind(this));

        logger.info('Rule Engine initialized');
    }

    /**
     * Handle MESSAGE_RECEIVED event
     */
    private async handleMessageReceived(event: BaseEvent<MessageReceivedPayload>): Promise<void> {
        const { context, payload } = event;

        logger.debug('Rule Engine processing message', {
            tenant_id: context.tenant_id,
            bot_id: context.bot_id,
            message: payload.content,
        });

        try {
            // Load rules for this bot
            const rules = await this.loadRules(context.tenant_id, context.bot_id);

            // Filter rules by scope
            const applicableRules = this.filterRulesByScope(rules, context);

            // Sort by priority (higher first)
            applicableRules.sort((a, b) => b.priority - a.priority);

            // Try to match keywords
            let matched = false;
            for (const rule of applicableRules) {
                if (this.matchKeyword(rule, payload.content)) {
                    logger.info('Keyword matched', {
                        rule_id: rule.id,
                        rule_name: rule.name,
                        keyword: rule.keyword,
                        message: payload.content,
                    });

                    // Emit KEYWORD_MATCHED event
                    await eventBus.emit(EventType.KEYWORD_MATCHED, context, {
                        rule_id: rule.id,
                        rule_name: rule.name,
                        keyword: rule.keyword,
                        match_type: rule.match_type,
                        matched_text: payload.content,
                        actions: rule.actions,
                    } as KeywordMatchedPayload);

                    matched = true;
                    break; // Only match first rule (highest priority)
                }
            }

            if (!matched) {
                logger.debug('No keyword matched', {
                    tenant_id: context.tenant_id,
                    bot_id: context.bot_id,
                    message: payload.content,
                });

                // Emit KEYWORD_NO_MATCH event
                await eventBus.emit(EventType.KEYWORD_NO_MATCH, context, {
                    message: payload.content,
                });
            }
        } catch (error) {
            logger.error('Rule Engine error', { error, context });
        }
    }

    /**
     * Load rules for a bot (with caching)
     */
    private async loadRules(tenantId: string, botId: string): Promise<KeywordRule[]> {
        const cacheKey = `${tenantId}:${botId}`;
        const now = Date.now();
        const lastUpdate = this.lastCacheUpdate.get(cacheKey) || 0;

        // Check cache
        if (now - lastUpdate < this.cacheTTL && this.rulesCache.has(cacheKey)) {
            logger.debug('Using cached rules', {
                tenant_id: tenantId,
                bot_id: botId,
                count: this.rulesCache.get(cacheKey)!.length,
            });
            return this.rulesCache.get(cacheKey)!;
        }

        // Fetch from database
        const rawRules = await keywordRuleRepository.findByBot(tenantId, botId);

        // Parse actions if they're strings
        const rules = rawRules.map(rule => {
            let parsedActions = rule.actions;
            if (typeof rule.actions === 'string') {
                try {
                    parsedActions = JSON.parse(rule.actions);
                } catch (e) {
                    logger.error('Failed to parse rule actions', {
                        rule_id: rule.id,
                        actions: rule.actions,
                    });
                    parsedActions = [];
                }
            }
            return {
                ...rule,
                actions: parsedActions,
            };
        });

        // Update cache
        this.rulesCache.set(cacheKey, rules);
        this.lastCacheUpdate.set(cacheKey, now);

        logger.info('✅ Rules loaded from database', {
            tenant_id: tenantId,
            bot_id: botId,
            count: rules.length,
            rules: rules.map(r => ({
                id: r.id,
                keyword: r.keyword,
                match_type: r.match_type,
                is_active: r.is_active,
                scope: r.scope,
            })),
        });

        return rules;
    }

    /**
     * Filter rules by scope
     */
    private filterRulesByScope(rules: KeywordRule[], context: any): KeywordRule[] {
        return rules.filter((rule) => {
            if (!rule.is_active) return false;

            switch (rule.scope) {
                case 'global':
                    return true;

                case 'group':
                    return context.group_id === rule.scope_target;

                case 'contact':
                    return context.contact_id === rule.scope_target;

                default:
                    return false;
            }
        });
    }

    /**
     * Match keyword against message
     */
    private matchKeyword(rule: KeywordRule, message: string): boolean {
        const normalizedMessage = message.trim().toLowerCase();
        const normalizedKeyword = rule.keyword.trim().toLowerCase();

        switch (rule.match_type) {
            case 'equals':
                return normalizedMessage === normalizedKeyword;

            case 'contains':
                return normalizedMessage.includes(normalizedKeyword);

            case 'regex':
                try {
                    const regex = new RegExp(rule.keyword, 'i');
                    return regex.test(message);
                } catch (error) {
                    logger.error('Invalid regex pattern', {
                        rule_id: rule.id,
                        keyword: rule.keyword,
                        error,
                    });
                    return false;
                }

            default:
                return false;
        }
    }

    /**
     * Invalidate cache when rules change
     */
    private invalidateCache(event: BaseEvent<any>): void {
        const { tenant_id, bot_id } = event.context;
        const cacheKey = `${tenant_id}:${bot_id}`;

        this.rulesCache.delete(cacheKey);
        this.lastCacheUpdate.delete(cacheKey);

        logger.debug('Rules cache invalidated', { tenant_id, bot_id });
    }

    /**
     * Clear all cache (for testing)
     */
    public clearCache(): void {
        this.rulesCache.clear();
        this.lastCacheUpdate.clear();
        logger.info('Rule Engine cache cleared');
    }

    /**
     * Get cache statistics
     */
    public getCacheStats(): {
        cached_bots: number;
        total_cached_rules: number;
    } {
        let totalRules = 0;
        for (const rules of this.rulesCache.values()) {
            totalRules += rules.length;
        }

        return {
            cached_bots: this.rulesCache.size,
            total_cached_rules: totalRules,
        };
    }
}

// Export singleton instance
export const ruleEngine = new RuleEngine();
