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
declare class RuleEngine {
    private rulesCache;
    private cacheTTL;
    private lastCacheUpdate;
    constructor();
    /**
     * Initialize the rule engine
     */
    private initialize;
    /**
     * Handle MESSAGE_RECEIVED event
     */
    private handleMessageReceived;
    /**
     * Load rules for a bot (with caching)
     */
    private loadRules;
    /**
     * Filter rules by scope
     */
    private filterRulesByScope;
    /**
     * Match keyword against message
     */
    private matchKeyword;
    /**
     * Invalidate cache when rules change
     */
    private invalidateCache;
    /**
     * Clear all cache (for testing)
     */
    clearCache(): void;
    /**
     * Get cache statistics
     */
    getCacheStats(): {
        cached_bots: number;
        total_cached_rules: number;
    };
}
export declare const ruleEngine: RuleEngine;
export {};
//# sourceMappingURL=ruleEngine.d.ts.map