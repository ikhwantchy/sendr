import cron from 'node-cron';
interface ScheduledReminder {
    id: string;
    cronExpression: string;
    task: cron.ScheduledTask;
}
/**
 * Reminder Scheduler Service
 * Handles scheduling and execution of reminders using node-cron
 */
declare class ReminderSchedulerService {
    private scheduledReminders;
    /**
     * Anti-spam delay between messages (randomized to look human-like)
     * WhatsApp can disconnect bots that send too fast
     */
    private antiSpamDelay;
    /**
     * Check if bot is still connected before sending
     * Uses a lightweight check that does NOT modify connection state
     */
    private isBotConnected;
    /**
     * Check bot connection before a batch send - only check once, not per-message
     * This avoids excessive status polling that could interfere with the connection
     */
    private ensureBotConnected;
    /**
     * Initialize scheduler - load all active reminders
     */
    initialize(): Promise<void>;
    /**
     * Schedule a reminder
     */
    scheduleReminder(reminder: any): Promise<void>;
    /**
     * Unschedule a reminder
     */
    unscheduleReminder(reminderId: string): void;
    /**
     * Execute a reminder (fetch data, process template, send message)
     */
    executeReminder(reminderId: string): Promise<void>;
    /**
     * Fetch and filter data from Google Sheets (Multi-Sheet Support)
     */
    private fetchAndFilterSheetData;
    /**
     * Extract phone number from a row object with fuzzy matching
     */
    private extractPhoneNumber;
    /**
     * Fetch data from Google Sheets and generate variables (Legacy support)
     */
    private fetchDataAndGenerateVariables;
    /**
     * Send message with retry logic for connection issues
     */
    private sendMessageWithRetry;
    /**
     * Send message via WhatsApp
     */
    private sendMessage;
    /**
     * Log reminder execution
     */
    private logExecution;
    /**
     * Check if a cron expression represents a "once" execution
     * A "once" cron has specific date/month values (not wildcards)
     */
    private isOnceCron;
    /**
     * Execute reminder immediately (for "Send Now" option)
     */
    executeImmediately(reminderId: string): Promise<void>;
    /**
     * Get all scheduled reminders
     */
    getScheduledReminders(): ScheduledReminder[];
    /**
     * Stop all scheduled reminders
     */
    stopAll(): void;
}
declare const _default: ReminderSchedulerService;
export default _default;
//# sourceMappingURL=reminderSchedulerService.d.ts.map