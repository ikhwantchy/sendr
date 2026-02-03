"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ruleEngine = void 0;
const eventBus_1 = require("../events/eventBus");
const types_1 = require("../events/types");
const keywordRuleRepository_1 = require("../../database/repositories/keywordRuleRepository");
const logger_1 = require("../../utils/logger");
class RuleEngine {
    rulesCache = new Map();
    cacheTTL = 60000; // 1 minute
    lastCacheUpdate = new Map();
    constructor() {
        this.initialize();
    }
    /**
     * Initialize the rule engine
     */
    initialize() {
        // Subscribe to MESSAGE_RECEIVED events
        eventBus_1.eventBus.subscribe(types_1.EventType.MESSAGE_RECEIVED, this.handleMessageReceived.bind(this));
        // Subscribe to rule update events to invalidate cache
        eventBus_1.eventBus.subscribe(types_1.EventType.RULE_CREATED, this.invalidateCache.bind(this));
        eventBus_1.eventBus.subscribe(types_1.EventType.RULE_UPDATED, this.invalidateCache.bind(this));
        eventBus_1.eventBus.subscribe(types_1.EventType.RULE_DELETED, this.invalidateCache.bind(this));
        logger_1.logger.info('Rule Engine initialized');
    }
    /**
     * Handle MESSAGE_RECEIVED event
     */
    async handleMessageReceived(event) {
        const { context, payload } = event;
        logger_1.logger.debug('Rule Engine processing message', {
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
                    logger_1.logger.info('Keyword matched', {
                        rule_id: rule.id,
                        rule_name: rule.name,
                        keyword: rule.keyword,
                        message: payload.content,
                    });
                    // Emit KEYWORD_MATCHED event
                    await eventBus_1.eventBus.emit(types_1.EventType.KEYWORD_MATCHED, context, {
                        rule_id: rule.id,
                        rule_name: rule.name,
                        keyword: rule.keyword,
                        match_type: rule.match_type,
                        matched_text: payload.content,
                        actions: rule.actions,
                    });
                    matched = true;
                    break; // Only match first rule (highest priority)
                }
            }
            if (!matched) {
                logger_1.logger.debug('No keyword matched', {
                    tenant_id: context.tenant_id,
                    bot_id: context.bot_id,
                    message: payload.content,
                });
                // Emit KEYWORD_NO_MATCH event with full payload for AI Engine
                await eventBus_1.eventBus.emit(types_1.EventType.KEYWORD_NO_MATCH, context, payload);
            }
        }
        catch (error) {
            logger_1.logger.error('Rule Engine error', { error, context });
        }
    }
    /**
     * Load rules for a bot (with caching)
     */
    async loadRules(tenantId, botId) {
        const cacheKey = `${tenantId}:${botId}`;
        const now = Date.now();
        const lastUpdate = this.lastCacheUpdate.get(cacheKey) || 0;
        // Check cache
        if (now - lastUpdate < this.cacheTTL && this.rulesCache.has(cacheKey)) {
            logger_1.logger.debug('Using cached rules', {
                tenant_id: tenantId,
                bot_id: botId,
                count: this.rulesCache.get(cacheKey).length,
            });
            return this.rulesCache.get(cacheKey);
        }
        // Fetch from database
        const rawRules = await keywordRuleRepository_1.keywordRuleRepository.findByBot(tenantId, botId);
        // Parse actions if they're strings
        const rules = rawRules.map(rule => {
            let parsedActions = rule.actions;
            if (typeof rule.actions === 'string') {
                try {
                    parsedActions = JSON.parse(rule.actions);
                }
                catch (e) {
                    logger_1.logger.error('Failed to parse rule actions', {
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
        logger_1.logger.info('✅ Rules loaded from database', {
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
    filterRulesByScope(rules, context) {
        return rules.filter((rule) => {
            if (!rule.is_active)
                return false;
            switch (rule.scope) {
                case 'global':
                    // Check metadata for granular control (Private vs Group)
                    if (rule.metadata) {
                        let meta = rule.metadata;
                        // Handle potential stringified JSON
                        if (typeof meta === 'string') {
                            try {
                                meta = JSON.parse(meta);
                            }
                            catch (e) {
                                // If parsing fails, proceed with default behavior (allow all)
                            }
                        }
                        const isGroup = !!context.group_id;
                        // Default to true if not specified to maintain backward compatibility
                        const allowPrivate = meta.reply_in_private !== false;
                        const allowGroup = meta.reply_in_group !== false;
                        if (isGroup && !allowGroup)
                            return false;
                        if (!isGroup && !allowPrivate)
                            return false;
                    }
                    return true;
                case 'group':
                    if (!context.group_id)
                        return false; // Only match if message is from a group
                    if (!rule.scope_target)
                        return false; // Rule must have a target
                    // Support multiple targets separated by comma
                    const allowedGroups = rule.scope_target.split(',');
                    return allowedGroups.includes(context.group_id);
                case 'contact':
                    if (context.group_id)
                        return false; // Don't match contact rules in groups (optional logic, usually safer)
                    if (!context.contact_id)
                        return false;
                    if (!rule.scope_target)
                        return false;
                    // Support multiple targets
                    const allowedContacts = rule.scope_target.split(',');
                    // Handle format differences (e.g. with or without @s.whatsapp.net) if necessary
                    // For now assuming exact ID match
                    return allowedContacts.includes(context.contact_id);
                default:
                    return false;
            }
        });
    }
    /**
     * Match keyword against message
     */
    matchKeyword(rule, message) {
        const normalizedMessage = message.trim().toLowerCase();
        const normalizedKeyword = rule.keyword.trim().toLowerCase();
        switch (rule.match_type) {
            case 'equals':
            case 'exact': // Frontend sends 'exact'
                return normalizedMessage === normalizedKeyword;
            case 'contains':
                return normalizedMessage.includes(normalizedKeyword);
            case 'starts_with':
                return normalizedMessage.startsWith(normalizedKeyword);
            case 'ends_with':
                return normalizedMessage.endsWith(normalizedKeyword);
            case 'regex':
                try {
                    const regex = new RegExp(rule.keyword, 'i');
                    return regex.test(message);
                }
                catch (error) {
                    logger_1.logger.error('Invalid regex pattern', {
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
    invalidateCache(event) {
        const { tenant_id, bot_id } = event.context;
        const cacheKey = `${tenant_id}:${bot_id}`;
        this.rulesCache.delete(cacheKey);
        this.lastCacheUpdate.delete(cacheKey);
        logger_1.logger.debug('Rules cache invalidated', { tenant_id, bot_id });
    }
    /**
     * Clear all cache (for testing)
     */
    clearCache() {
        this.rulesCache.clear();
        this.lastCacheUpdate.clear();
        logger_1.logger.info('Rule Engine cache cleared');
    }
    /**
     * Get cache statistics
     */
    getCacheStats() {
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
exports.ruleEngine = new RuleEngine();
//# sourceMappingURL=ruleEngine.js.map