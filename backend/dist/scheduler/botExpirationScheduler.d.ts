/**
 * Bot Expiration Scheduler
 * Automatically disconnects bots that have passed their expiration date
 * ✅ Runs every 5 minutes
 * ✅ Auto-disconnects expired bots
 * ✅ Pauses associated reminders and campaigns
 */
declare class BotExpirationScheduler {
    private isRunning;
    /**
     * Start the scheduler
     */
    start(): void;
    /**
     * Check for expired bots and disconnect them
     */
    private checkAndDisconnectExpiredBots;
    /**
     * Disconnect an expired bot and pause its associated tasks
     */
    private disconnectExpiredBot;
}
export declare const botExpirationScheduler: BotExpirationScheduler;
export {};
//# sourceMappingURL=botExpirationScheduler.d.ts.map