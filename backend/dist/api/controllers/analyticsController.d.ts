type TimeRange = '30m' | '24h' | '7d' | '30d';
interface AnalyticsFilter {
    timeRange: TimeRange;
    tenantId: string | null;
    botId?: string;
    timezone?: string;
}
export declare class AnalyticsController {
    /**
     * Get comprehensive analytics data
     */
    static getAnalyticsData(filter: AnalyticsFilter): Promise<{
        summary: {
            totalMessages: any;
            lifetimeMessages: any;
            trend: number;
            campaigns: any;
            reminders: any;
            activeBots: any;
            totalBots: any;
        };
        trafficChart: any;
        messageDistribution: {
            type: string;
            count: any;
        }[];
        topBots: any;
    }>;
    private static calculateTrend;
}
export {};
//# sourceMappingURL=analyticsController.d.ts.map