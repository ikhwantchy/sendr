"use strict";
/**
 * Smart Deadline Tracker
 *
 * Automatically tracks deadlines and status changes from Google Sheets
 * Supports various use cases: academic, work, personal, etc.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const date_fns_1 = require("date-fns");
class SmartDeadlineTracker {
    /**
     * Get items with upcoming deadlines
     * Automatically filters based on deadline and status
     */
    getUpcomingDeadlines(data, config) {
        const { dateColumn, statusColumn, completedValues = ['done', 'selesai', 'completed', 'true', 'yes'], daysBeforeAlert = 3, includeToday = true, includePast = false } = config;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const futureDate = (0, date_fns_1.addDays)(today, daysBeforeAlert);
        return data.filter(row => {
            // 1. Check if status indicates completion
            if (statusColumn && row[statusColumn]) {
                const status = String(row[statusColumn]).toLowerCase().trim();
                if (completedValues.some(val => status === val.toLowerCase())) {
                    return false; // Skip completed items
                }
            }
            // 2. Check deadline date
            const deadlineValue = row[dateColumn];
            if (!deadlineValue)
                return false;
            const deadline = this.parseDate(deadlineValue);
            if (!deadline)
                return false;
            // 3. Apply date filters
            const isPast = (0, date_fns_1.isBefore)(deadline, today);
            const isToday = (0, date_fns_1.isEqual)(deadline, today);
            const isWithinRange = ((0, date_fns_1.isAfter)(deadline, today) || (0, date_fns_1.isEqual)(deadline, today)) &&
                ((0, date_fns_1.isBefore)(deadline, futureDate) || (0, date_fns_1.isEqual)(deadline, futureDate));
            if (isPast && !includePast)
                return false;
            if (isToday && !includeToday)
                return false;
            if (!isToday && !isPast && !isWithinRange)
                return false;
            return true;
        });
    }
    /**
     * Group deadlines by urgency
     */
    groupByUrgency(data, dateColumn) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = (0, date_fns_1.addDays)(today, 1);
        const groups = {
            overdue: [],
            today: [],
            tomorrow: [],
            upcoming: []
        };
        data.forEach(row => {
            const deadlineValue = row[dateColumn];
            if (!deadlineValue)
                return;
            const deadline = this.parseDate(deadlineValue);
            if (!deadline)
                return;
            if ((0, date_fns_1.isBefore)(deadline, today)) {
                groups.overdue.push(row);
            }
            else if ((0, date_fns_1.isEqual)(deadline, today)) {
                groups.today.push(row);
            }
            else if ((0, date_fns_1.isEqual)(deadline, tomorrow)) {
                groups.tomorrow.push(row);
            }
            else {
                groups.upcoming.push(row);
            }
        });
        return groups;
    }
    /**
     * Get days until deadline
     */
    getDaysUntil(deadlineValue) {
        const deadline = this.parseDate(deadlineValue);
        if (!deadline)
            return null;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const diffTime = deadline.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    }
    /**
     * Format deadline with urgency indicator
     */
    formatDeadlineWithUrgency(deadlineValue) {
        const days = this.getDaysUntil(deadlineValue);
        if (days === null)
            return String(deadlineValue);
        const deadline = this.parseDate(deadlineValue);
        if (!deadline)
            return String(deadlineValue);
        const formatted = deadline.toLocaleDateString('id-ID', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
        if (days < 0) {
            return `⚠️ TERLAMBAT ${Math.abs(days)} hari - ${formatted}`;
        }
        else if (days === 0) {
            return `🔴 HARI INI - ${formatted}`;
        }
        else if (days === 1) {
            return `🟡 BESOK - ${formatted}`;
        }
        else if (days <= 3) {
            return `🟠 ${days} hari lagi - ${formatted}`;
        }
        else {
            return `🟢 ${days} hari lagi - ${formatted}`;
        }
    }
    /**
     * Create smart filters for deadline tracking
     */
    createDeadlineFilters(config) {
        const filters = [];
        // Filter 1: Deadline within range
        filters.push({
            column: config.dateColumn,
            operator: 'date_within_days',
            value: config.daysBeforeAlert || 3
        });
        // Filter 2: Not completed (if status column exists)
        if (config.statusColumn) {
            const completedValues = config.completedValues || ['done', 'selesai', 'completed', 'true'];
            // Add filter for each completed value (NOT equals)
            completedValues.forEach(val => {
                filters.push({
                    column: config.statusColumn,
                    operator: 'not_equals',
                    value: val,
                    caseInsensitive: true
                });
            });
        }
        return filters;
    }
    /**
     * Parse date from various formats
     */
    parseDate(value) {
        if (!value)
            return null;
        try {
            const str = String(value).trim();
            // Try ISO format first
            if (str.includes('T') || str.includes('-')) {
                const isoDate = (0, date_fns_1.parseISO)(str);
                if (!isNaN(isoDate.getTime())) {
                    isoDate.setHours(0, 0, 0, 0);
                    return isoDate;
                }
            }
            // Try DD/MM/YYYY or DD-MM-YYYY
            const parts = str.split(/[\/\-]/);
            if (parts.length === 3) {
                const day = parseInt(parts[0]);
                const month = parseInt(parts[1]) - 1; // 0-indexed
                const year = parseInt(parts[2]);
                // Handle 2-digit years
                const fullYear = year < 100 ? 2000 + year : year;
                const date = new Date(fullYear, month, day);
                if (!isNaN(date.getTime())) {
                    date.setHours(0, 0, 0, 0);
                    return date;
                }
            }
            // Try native Date parsing
            const nativeDate = new Date(str);
            if (!isNaN(nativeDate.getTime())) {
                nativeDate.setHours(0, 0, 0, 0);
                return nativeDate;
            }
            return null;
        }
        catch (error) {
            return null;
        }
    }
    /**
     * Preset configurations for common use cases
     */
    presets = {
        /**
         * Academic deadlines (assignments, exams, etc.)
         */
        academic: (dateColumn = 'waktu', statusColumn = 'done') => ({
            dateColumn,
            statusColumn,
            completedValues: ['done', 'selesai', 'true', 'yes'],
            daysBeforeAlert: 3,
            includeToday: true,
            includePast: false
        }),
        /**
         * Work tasks and projects
         */
        work: (dateColumn = 'deadline', statusColumn = 'status') => ({
            dateColumn,
            statusColumn,
            completedValues: ['done', 'completed', 'finished', 'closed'],
            daysBeforeAlert: 5,
            includeToday: true,
            includePast: true // Include overdue items
        }),
        /**
         * Personal reminders
         */
        personal: (dateColumn = 'date', statusColumn) => ({
            dateColumn,
            statusColumn,
            completedValues: ['done', 'yes', 'completed'],
            daysBeforeAlert: 7,
            includeToday: true,
            includePast: false
        }),
        /**
         * Bills and payments
         */
        bills: (dateColumn = 'due_date', statusColumn = 'paid') => ({
            dateColumn,
            statusColumn,
            completedValues: ['paid', 'yes', 'true', 'lunas'],
            daysBeforeAlert: 3,
            includeToday: true,
            includePast: true // Include overdue bills
        }),
        /**
         * Events and appointments
         */
        events: (dateColumn = 'date', statusColumn) => ({
            dateColumn,
            statusColumn,
            completedValues: ['cancelled', 'done'],
            daysBeforeAlert: 1,
            includeToday: true,
            includePast: false
        })
    };
}
exports.default = new SmartDeadlineTracker();
//# sourceMappingURL=smartDeadlineTracker.js.map