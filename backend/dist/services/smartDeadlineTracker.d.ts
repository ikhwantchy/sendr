/**
 * Smart Deadline Tracker
 *
 * Automatically tracks deadlines and status changes from Google Sheets
 * Supports various use cases: academic, work, personal, etc.
 */
export interface DeadlineConfig {
    dateColumn: string;
    statusColumn?: string;
    completedValues?: string[];
    daysBeforeAlert?: number;
    includeToday?: boolean;
    includePast?: boolean;
}
declare class SmartDeadlineTracker {
    /**
     * Get items with upcoming deadlines
     * Automatically filters based on deadline and status
     */
    getUpcomingDeadlines(data: any[], config: DeadlineConfig): any[];
    /**
     * Group deadlines by urgency
     */
    groupByUrgency(data: any[], dateColumn: string): {
        overdue: any[];
        today: any[];
        tomorrow: any[];
        upcoming: any[];
    };
    /**
     * Get days until deadline
     */
    getDaysUntil(deadlineValue: any): number | null;
    /**
     * Format deadline with urgency indicator
     */
    formatDeadlineWithUrgency(deadlineValue: any): string;
    /**
     * Create smart filters for deadline tracking
     */
    createDeadlineFilters(config: DeadlineConfig): any[];
    /**
     * Parse date from various formats
     */
    private parseDate;
    /**
     * Preset configurations for common use cases
     */
    presets: {
        /**
         * Academic deadlines (assignments, exams, etc.)
         */
        academic: (dateColumn?: string, statusColumn?: string) => DeadlineConfig;
        /**
         * Work tasks and projects
         */
        work: (dateColumn?: string, statusColumn?: string) => DeadlineConfig;
        /**
         * Personal reminders
         */
        personal: (dateColumn?: string, statusColumn?: string) => DeadlineConfig;
        /**
         * Bills and payments
         */
        bills: (dateColumn?: string, statusColumn?: string) => DeadlineConfig;
        /**
         * Events and appointments
         */
        events: (dateColumn?: string, statusColumn?: string) => DeadlineConfig;
    };
}
declare const _default: SmartDeadlineTracker;
export default _default;
//# sourceMappingURL=smartDeadlineTracker.d.ts.map