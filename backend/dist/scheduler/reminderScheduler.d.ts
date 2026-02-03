/**
 * Reminder Scheduler
 * Checks for due reminders and sends them DIRECTLY
 * ✅ Runs every minute
 * ✅ Handles recurring reminders
 * ✅ Updates next_run_at after execution
 * ✅ No queue - sends directly!
 */
declare class ReminderScheduler {
    private isRunning;
    /**
     * Start the scheduler
     */
    start(): void;
    /**
     * Check for due reminders and queue them
     */
    private checkAndQueueReminders;
    /**
     * Process a single reminder
     */
    private processReminder;
    /**
     * Calculate next run time for recurring reminders
     */
    private calculateNextRun;
}
export declare const reminderScheduler: ReminderScheduler;
export {};
//# sourceMappingURL=reminderScheduler.d.ts.map