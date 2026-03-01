"use strict";
/**
 * Enhanced Google Sheets Data Processor
 *
 * Provides flexible, easy-to-use data processing for Google Sheets reminders
 * Supports various use cases without hardcoding specific column names
 */
Object.defineProperty(exports, "__esModule", { value: true });
const date_fns_1 = require("date-fns");
class SmartSheetsProcessor {
    /**
     * Process sheet data with flexible configuration
     */
    processData(data, config = {}) {
        let result = [...data];
        // 1. Apply filters
        if (config.filters && config.filters.length > 0) {
            result = this.applyFilters(result, config.filters);
        }
        // 2. Apply transformations
        if (config.transforms && config.transforms.length > 0) {
            result = this.applyTransforms(result, config.transforms);
        }
        // 3. Apply sorting
        if (config.sort) {
            result = this.applySort(result, config.sort);
        }
        // 4. Apply pagination
        if (config.offset !== undefined) {
            result = result.slice(config.offset);
        }
        if (config.limit !== undefined) {
            result = result.slice(0, config.limit);
        }
        return result;
    }
    /**
     * Apply filters to data
     */
    applyFilters(data, filters) {
        return data.filter(row => {
            // All filters must pass (AND logic)
            return filters.every(filter => this.evaluateFilter(row, filter));
        });
    }
    /**
     * Evaluate a single filter condition
     */
    evaluateFilter(row, filter) {
        // Helper to find the ACTUAL column name (fuzzy)
        const allKeys = Object.keys(row);
        const searchKey = filter.column.toLowerCase().trim();
        const actualKey = allKeys.find(k => k.toLowerCase().trim() === searchKey) ||
            allKeys.find(k => k.toLowerCase().trim().includes(searchKey));
        // If column doesn't exist in data, skip this filter (pass = true)
        // This prevents old/misconfigured filters from silently emptying all results
        if (!actualKey) {
            console.warn(`⚠️ [Filter] Column "${filter.column}" not found in data (available: ${allKeys.join(', ')}). Skipping filter.`);
            return true; // Pass — don't reject rows for missing columns
        }
        const value = row[actualKey];
        const filterValue = filter.value;
        const caseInsensitive = filter.caseInsensitive !== false; // Default true
        // Helper to compare strings
        const compareStr = (a, b) => {
            const strA = String(a || '');
            const strB = String(b || '');
            return caseInsensitive
                ? strA.toLowerCase().trim() === strB.toLowerCase().trim()
                : strA.trim() === strB.trim();
        };
        switch (filter.operator) {
            case 'equals':
                return compareStr(value, filterValue);
            case 'not_equals':
                return !compareStr(value, filterValue);
            case 'contains':
                const containsStr = String(value || '');
                const searchStr = String(filterValue || '');
                return caseInsensitive
                    ? containsStr.toLowerCase().includes(searchStr.toLowerCase())
                    : containsStr.includes(searchStr);
            case 'not_contains':
                const notContainsStr = String(value || '');
                const notSearchStr = String(filterValue || '');
                return caseInsensitive
                    ? !notContainsStr.toLowerCase().includes(notSearchStr.toLowerCase())
                    : !notContainsStr.includes(notSearchStr);
            case 'starts_with':
                const startsStr = String(value || '');
                const startsSearch = String(filterValue || '');
                return caseInsensitive
                    ? startsStr.toLowerCase().startsWith(startsSearch.toLowerCase())
                    : startsStr.startsWith(startsSearch);
            case 'ends_with':
                const endsStr = String(value || '');
                const endsSearch = String(filterValue || '');
                return caseInsensitive
                    ? endsStr.toLowerCase().endsWith(endsSearch.toLowerCase())
                    : endsStr.endsWith(endsSearch);
            case 'greater_than':
                return Number(value) > Number(filterValue);
            case 'less_than':
                return Number(value) < Number(filterValue);
            case 'between':
                const num = Number(value);
                return num >= Number(filterValue) && num <= Number(filter.value2);
            case 'in_list':
                const list = Array.isArray(filterValue) ? filterValue : [filterValue];
                return list.some(item => compareStr(value, item));
            case 'is_empty':
                return !value || String(value).trim() === '';
            case 'not_empty':
                return value && String(value).trim() !== '';
            // Day name filter (Senin, Selasa, etc. compared to today)
            case 'day_equals_today': {
                const dayNames = ['minggu', 'senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu'];
                const todayDayName = dayNames[new Date().getDay()];
                const cellValue = String(value || '').toLowerCase().trim();
                return cellValue === todayDayName;
            }
            // Date within hours (for deadline proximity like -12h to +72h)
            case 'date_within_hours': {
                const targetDate = this.parseDate(value);
                if (!targetDate)
                    return false;
                const now = new Date();
                const hoursRange = Number(filterValue) || 72;
                const diffMs = targetDate.getTime() - now.getTime();
                const diffHours = diffMs / (1000 * 60 * 60);
                // Include items from -12 hours (slightly past) to +N hours
                return diffHours >= -12 && diffHours <= hoursRange;
            }
            // Date filters
            case 'date_equals':
            case 'date_before':
            case 'date_after':
            case 'date_between':
            case 'date_today':
            case 'date_within_days':
                return this.evaluateDateFilter(value, filter);
            default:
                return true;
        }
    }
    /**
     * Evaluate date-based filters
     */
    evaluateDateFilter(value, filter) {
        const dateValue = this.parseDate(value);
        if (!dateValue)
            return false;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        switch (filter.operator) {
            case 'date_equals':
                const compareDate = this.parseDate(filter.value);
                if (!compareDate)
                    return false;
                return (0, date_fns_1.isEqual)(dateValue, compareDate);
            case 'date_before':
                const beforeDate = this.parseDate(filter.value);
                if (!beforeDate)
                    return false;
                return (0, date_fns_1.isBefore)(dateValue, beforeDate);
            case 'date_after':
                const afterDate = this.parseDate(filter.value);
                if (!afterDate)
                    return false;
                return (0, date_fns_1.isAfter)(dateValue, afterDate);
            case 'date_between':
                const startDate = this.parseDate(filter.value);
                const endDate = this.parseDate(filter.value2);
                if (!startDate || !endDate)
                    return false;
                return ((0, date_fns_1.isAfter)(dateValue, startDate) || (0, date_fns_1.isEqual)(dateValue, startDate)) &&
                    ((0, date_fns_1.isBefore)(dateValue, endDate) || (0, date_fns_1.isEqual)(dateValue, endDate));
            case 'date_today':
                return (0, date_fns_1.isEqual)(dateValue, today);
            case 'date_within_days':
                // "N hari" = today + (N-1) more days. E.g. "2 hari" on Feb 15 = Feb 15, 16
                const days = Number(filter.value);
                const futureDate = (0, date_fns_1.addDays)(today, days - 1);
                return ((0, date_fns_1.isAfter)(dateValue, today) || (0, date_fns_1.isEqual)(dateValue, today)) &&
                    ((0, date_fns_1.isBefore)(dateValue, futureDate) || (0, date_fns_1.isEqual)(dateValue, futureDate));
            default:
                return false;
        }
    }
    /**
     * Parse date from various formats
     */
    parseDate(value) {
        if (!value)
            return null;
        try {
            const str = String(value).trim();
            // Try common formats
            const formats = [
                'dd/MM/yyyy',
                'dd-MM-yyyy',
                'yyyy-MM-dd',
                'MM/dd/yyyy',
                'dd/MM/yy',
                'dd-MM-yy'
            ];
            for (const fmt of formats) {
                try {
                    const parsed = (0, date_fns_1.parse)(str, fmt, new Date());
                    if (!isNaN(parsed.getTime())) {
                        parsed.setHours(0, 0, 0, 0);
                        return parsed;
                    }
                }
                catch (e) {
                    continue;
                }
            }
            // Try ISO format
            const isoDate = new Date(str);
            if (!isNaN(isoDate.getTime())) {
                isoDate.setHours(0, 0, 0, 0);
                return isoDate;
            }
            return null;
        }
        catch (error) {
            return null;
        }
    }
    /**
     * Apply transformations to data
     */
    applyTransforms(data, transforms) {
        return data.map(row => {
            const newRow = { ...row };
            transforms.forEach(transform => {
                const value = newRow[transform.column];
                newRow[transform.column] = this.applyTransform(value, transform);
            });
            return newRow;
        });
    }
    /**
     * Apply a single transformation
     */
    applyTransform(value, transform) {
        if (value === null || value === undefined)
            return value;
        const str = String(value);
        switch (transform.type) {
            case 'uppercase':
                return str.toUpperCase();
            case 'lowercase':
                return str.toLowerCase();
            case 'capitalize':
                return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
            case 'trim':
                return str.trim();
            case 'date_format':
                const date = this.parseDate(value);
                if (!date)
                    return value;
                return (0, date_fns_1.format)(date, transform.params?.format || 'dd/MM/yyyy');
            case 'number_format':
                const num = Number(value);
                if (isNaN(num))
                    return value;
                return num.toLocaleString('id-ID', transform.params);
            case 'prefix':
                return (transform.params?.prefix || '') + str;
            case 'suffix':
                return str + (transform.params?.suffix || '');
            case 'replace':
                return str.replace(new RegExp(transform.params?.search || '', 'g'), transform.params?.replace || '');
            default:
                return value;
        }
    }
    /**
     * Apply sorting
     */
    applySort(data, sort) {
        return [...data].sort((a, b) => {
            const aVal = a[sort.column];
            const bVal = b[sort.column];
            // Try numeric comparison first
            const aNum = Number(aVal);
            const bNum = Number(bVal);
            if (!isNaN(aNum) && !isNaN(bNum)) {
                return sort.order === 'asc' ? aNum - bNum : bNum - aNum;
            }
            // String comparison
            const aStr = String(aVal || '');
            const bStr = String(bVal || '');
            const comparison = aStr.localeCompare(bStr);
            return sort.order === 'asc' ? comparison : -comparison;
        });
    }
    /**
     * Group data by column
     */
    groupData(data, config) {
        const grouped = {};
        // Find the actual column name (extremely robust matching)
        const sampleRow = data[0];
        if (!sampleRow)
            return {};
        const allKeys = Object.keys(sampleRow);
        const search = config.by.toLowerCase();
        // Try exact match first, then startsWith, then includes
        const actualByColumn = allKeys.find(k => k.toLowerCase() === search) ||
            allKeys.find(k => k.toLowerCase().startsWith(search)) ||
            allKeys.find(k => k.toLowerCase().includes(search)) ||
            config.by;
        data.forEach(row => {
            const val = row[actualByColumn];
            const key = val !== undefined && val !== null ? String(val).trim() : 'Uncategorized';
            if (!grouped[key]) {
                grouped[key] = [];
            }
            grouped[key].push(row);
        });
        // Sort groups if needed
        if (config.sortGroups) {
            const sortedKeys = Object.keys(grouped).sort((a, b) => {
                return config.sortGroups === 'asc'
                    ? a.localeCompare(b)
                    : b.localeCompare(a);
            });
            const sortedGrouped = {};
            sortedKeys.forEach(key => {
                sortedGrouped[key] = grouped[key];
            });
            return sortedGrouped;
        }
        return grouped;
    }
    /**
     * Smart column detection - find column by various possible names
     */
    findColumn(row, possibleNames) {
        const keys = Object.keys(row);
        // Exact match
        for (const name of possibleNames) {
            if (keys.includes(name))
                return name;
        }
        // Case-insensitive match
        for (const name of possibleNames) {
            const match = keys.find(k => k.toLowerCase() === name.toLowerCase());
            if (match)
                return match;
        }
        // Partial match
        for (const name of possibleNames) {
            const match = keys.find(k => k.toLowerCase().includes(name.toLowerCase()) ||
                name.toLowerCase().includes(k.toLowerCase()));
            if (match)
                return match;
        }
        return null;
    }
    /**
     * Get value with smart column detection
     */
    getValue(row, possibleNames, defaultValue = '') {
        const column = this.findColumn(row, possibleNames);
        if (!column)
            return defaultValue;
        const value = row[column];
        return value !== undefined && value !== null ? String(value) : defaultValue;
    }
    /**
     * Create preset filters for common use cases
     */
    presets = {
        /**
         * Filter for today's items (by day name)
         */
        today: (dayColumnNames = ['Hari', 'Day', 'Tanggal']) => {
            const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
            const today = dayNames[new Date().getDay()];
            return {
                column: dayColumnNames[0], // Will be auto-detected
                operator: 'equals',
                value: today,
                caseInsensitive: true
            };
        },
        /**
         * Filter for urgent deadlines (within X days)
         */
        urgentDeadline: (days = 3, dateColumnNames = ['Deadline', 'Tenggat', 'Due Date']) => ({
            column: dateColumnNames[0],
            operator: 'date_within_days',
            value: days
        }),
        /**
         * Filter for specific status
         */
        status: (status, columnNames = ['Status', 'State']) => ({
            column: columnNames[0],
            operator: 'equals',
            value: status,
            caseInsensitive: true
        }),
        /**
         * Filter for non-empty rows
         */
        notEmpty: (columnName) => ({
            column: columnName,
            operator: 'not_empty'
        })
    };
}
exports.default = new SmartSheetsProcessor();
//# sourceMappingURL=smartSheetsProcessor.js.map