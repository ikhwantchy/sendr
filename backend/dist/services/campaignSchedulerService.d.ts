/**
 * Campaign Scheduler Service
 * ============================================
 * ISOLATED from Reminder Scheduler
 * Handles scheduled campaign execution with anti-spam features
 */
interface AntiSpamConfig {
    minDelay: number;
    maxDelay: number;
    batchSize: number;
    batchPauseMin: number;
    batchPauseMax: number;
    dailyLimit: number;
    peakHoursAvoid: boolean;
}
declare class CampaignSchedulerService {
    private schedulerTask;
    private isProcessing;
    /**
     * Initialize campaign scheduler
     * Runs every minute to check for scheduled campaigns
     */
    initialize(): Promise<void>;
    /**
     * Process scheduled campaigns that are due
     */
    private processScheduledCampaigns;
    /**
     * Start a campaign - queue all recipients with anti-spam delays
     */
    startCampaign(campaignId: string): Promise<void>;
    /**
     * Get random delay between min and max (inclusive)
     */
    private getRandomDelay;
    /**
     * Pause a running campaign
     */
    pauseCampaign(campaignId: string): Promise<void>;
    /**
     * Resume a paused campaign
     */
    resumeCampaign(campaignId: string): Promise<void>;
    /**
     * Cancel a campaign
     */
    cancelCampaign(campaignId: string): Promise<void>;
    /**
     * Get anti-spam presets
     */
    getAntiSpamPresets(): Record<string, AntiSpamConfig>;
    /**
     * Stop scheduler
     */
    stop(): void;
}
declare const _default: CampaignSchedulerService;
export default _default;
//# sourceMappingURL=campaignSchedulerService.d.ts.map