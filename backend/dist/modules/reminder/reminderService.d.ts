/**
 * Reminder Service - GROUP-BASED ONLY
 * ✅ Only sends to WhatsApp groups
 * ✅ Uses Bull repeatable jobs
 * ✅ Group selection from active groups
 * ❌ NO individual reminders
 */
export interface ReminderData {
    tenant_id: string;
    bot_id: string;
    name: string;
    message: string;
    group_id: string;
    schedule_type: 'once' | 'daily' | 'weekly';
    schedule_config: any;
}
declare class ReminderService {
    /**
     * Create a new group reminder
     */
    createReminder(data: ReminderData): Promise<any>;
    /**
     * Schedule reminder with Bull Queue
     */
    private scheduleReminder;
    /**
     * Calculate next run time
     */
    private calculateNextRun;
    /**
     * List reminders
     */
    listReminders(tenantId: string, botId?: string): Promise<any[]>;
    /**
     * Get reminder by ID
     */
    getReminder(reminderId: string): Promise<any>;
    /**
     * Toggle reminder active status
     */
    toggleReminder(reminderId: string, isActive: boolean): Promise<void>;
    /**
     * Delete reminder
     */
    deleteReminder(reminderId: string): Promise<void>;
    /**
     * Update reminder last_run_at
     */
    updateLastRun(reminderId: string): Promise<void>;
}
export declare const reminderService: ReminderService;
export {};
//# sourceMappingURL=reminderService.d.ts.map