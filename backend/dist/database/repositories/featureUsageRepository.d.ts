/**
 * Feature Usage Repository
 * Track daily/monthly feature usage for limits enforcement
 */
export interface FeatureUsage {
    id: string;
    bot_id: string;
    user_id: string;
    feature_key: string;
    usage_date: string;
    usage_count: number;
    created_at: string;
    updated_at: string;
}
export interface UsageStats {
    daily: number;
    monthly: number;
}
declare class FeatureUsageRepository {
    /**
     * Record feature usage (increment counter)
     */
    recordUsage(botId: string, userId: string, featureKey: string): Promise<void>;
    /**
     * Get daily usage (today)
     */
    getDailyUsage(botId: string, userId: string, featureKey: string): Promise<number>;
    /**
     * Get monthly usage (current month)
     */
    getMonthlyUsage(botId: string, userId: string, featureKey: string): Promise<number>;
    /**
     * Get usage stats (daily + monthly)
     */
    getUsageStats(botId: string, userId: string, featureKey: string): Promise<UsageStats>;
    /**
     * Get all usage for a bot
     */
    getUsageByBot(botId: string, startDate?: string, endDate?: string): Promise<FeatureUsage[]>;
    /**
     * Get all usage for a user
     */
    getUsageByUser(userId: string, startDate?: string, endDate?: string): Promise<FeatureUsage[]>;
    /**
     * Reset daily usage (for cron job)
     * Note: We don't actually delete, we just let old records stay for analytics
     * The getDailyUsage only looks at today's date
     */
    cleanupOldUsage(daysToKeep?: number): Promise<void>;
    /**
     * Get feature usage summary for bot
     */
    getUsageSummary(botId: string, featureKey: string): Promise<{
        total_users: number;
        total_usage_today: number;
        total_usage_month: number;
    }>;
    /**
     * Check if user has exceeded daily limit
     */
    hasExceededDailyLimit(botId: string, userId: string, featureKey: string, limit: number): Promise<boolean>;
    /**
     * Check if user has exceeded monthly limit
     */
    hasExceededMonthlyLimit(botId: string, userId: string, featureKey: string, limit: number): Promise<boolean>;
}
export declare const featureUsageRepository: FeatureUsageRepository;
export {};
//# sourceMappingURL=featureUsageRepository.d.ts.map