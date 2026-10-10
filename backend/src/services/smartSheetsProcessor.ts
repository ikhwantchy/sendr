/**
 * Enhanced Google Sheets Data Processor
 * 
 * Provides flexible, easy-to-use data processing for Google Sheets reminders
 * Supports various use cases without hardcoding specific column names
 */

import { format, parse, isAfter, isBefore, isEqual, addDays } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

export interface FilterCondition {
    column: string;
    operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'starts_with' | 'ends_with' |
    'greater_than' | 'less_than' | 'between' | 'in_list' | 'is_empty' | 'not_empty' |
    'date_equals' | 'date_before' | 'date_after' | 'date_between' | 'date_today' | 'date_within_days' |
    'day_equals_today' | 'date_within_hours';
    value?: any;
    value2?: any; // For 'between' and 'date_between'
    caseInsensitive?: boolean;
}

export interface SortConfig {
    column: string;
    order: 'asc' | 'desc';
}

export interface GroupConfig {
    by: string; // Column to group by
    sortGroups?: 'asc' | 'desc';
}

export interface TransformConfig {
    column: string;
    type: 'uppercase' | 'lowercase' | 'capitalize' | 'trim' | 'date_format' | 'number_format' | 'prefix' | 'suffix' | 'replace';
    params?: any; // Additional parameters for transformation
}

export interface DataProcessingConfig {
    filters?: FilterCondition[];
    sort?: SortConfig;
    group?: GroupConfig;
    transforms?: TransformConfig[];
    limit?: number;
    offset?: number;
}

class SmartSheetsProcessor {
    public defaultDateFormat: 'MM/DD' | 'DD/MM' | null = null;

    /**
     * Automatically detect date format for a column across an array of rows
     * If parts[1] > 12 (e.g. 10/15/2026), it's definitively MM/DD/YYYY
     * If parts[0] > 12 (e.g. 15/10/2026), it's definitively DD/MM/YYYY
     */
    detectColumnDateFormat(data: any[], column?: string): 'MM/DD' | 'DD/MM' | null {
        if (!data || !Array.isArray(data) || data.length === 0) return null;

        let hasP1Over12 = false; // parts[1] > 12 -> MM/DD/YYYY
        let hasP0Over12 = false; // parts[0] > 12 -> DD/MM/YYYY

        for (const row of data) {
            if (!row || typeof row !== 'object') continue;

            if (column) {
                const allKeys = Object.keys(row);
                const searchKey = column.toLowerCase().trim();
                const actualKey = allKeys.find(k => k.toLowerCase().trim() === searchKey) ||
                    allKeys.find(k => k.toLowerCase().trim().includes(searchKey));
                const val = actualKey ? row[actualKey] : undefined;
                if (!val) continue;

                const str = String(val).trim();
                const parts = str.split(/[\/\-]/);
                if (parts.length === 3) {
                    const p0 = parseInt(parts[0], 10);
                    const p1 = parseInt(parts[1], 10);
                    if (!isNaN(p0) && !isNaN(p1)) {
                        if (p0 > 12 && p1 <= 12) hasP0Over12 = true;
                        if (p1 > 12 && p0 <= 12) hasP1Over12 = true;
                    }
                }
            } else {
                // Check all properties of the row
                for (const k of Object.keys(row)) {
                    const val = row[k];
                    if (!val) continue;
                    const str = String(val).trim();
                    const parts = str.split(/[\/\-]/);
                    if (parts.length === 3) {
                        const p0 = parseInt(parts[0], 10);
                        const p1 = parseInt(parts[1], 10);
                        if (!isNaN(p0) && !isNaN(p1)) {
                            if (p0 > 12 && p1 <= 12) hasP0Over12 = true;
                            if (p1 > 12 && p0 <= 12) hasP1Over12 = true;
                        }
                    }
                }
            }
        }

        if (hasP1Over12 && !hasP0Over12) return 'MM/DD';
        if (hasP0Over12 && !hasP1Over12) return 'DD/MM';
        return null;
    }

    /**
     * Process sheet data with flexible configuration
     */
    processData(data: any[], config: DataProcessingConfig = {}): any[] {
        let result = [...data];

        // Auto-detect date format from data
        const detected = this.detectColumnDateFormat(data);
        if (detected) {
            this.defaultDateFormat = detected;
        }

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
    private applyFilters(data: any[], filters: FilterCondition[]): any[] {
        return data.filter(row => {
            // All filters must pass (AND logic)
            return filters.every(filter => this.evaluateFilter(row, filter, data));
        });
    }

    /**
     * Evaluate a single filter condition
     */
    private evaluateFilter(row: any, filter: FilterCondition, allData?: any[]): boolean {
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
        const compareStr = (a: any, b: any) => {
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
                const tz = filter.value2 || 'Asia/Jakarta'; // Pass timezone as second value if possible
                const todayTz = toZonedTime(new Date(), tz);
                const todayDayName = dayNames[todayTz.getDay()];
                const cellValue = String(value || '').toLowerCase().trim();
                return cellValue === todayDayName;
            }

            // Date within hours (for deadline proximity like -12h to +72h)
            case 'date_within_hours': {
                const colFormat = (allData ? this.detectColumnDateFormat(allData, filter.column) : null) || this.defaultDateFormat;
                const targetDate = this.parseDate(value, colFormat);
                if (!targetDate) return false;
                const tz = filter.value2 || 'Asia/Jakarta';
                const now = toZonedTime(new Date(), tz);
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
                return this.evaluateDateFilter(value, filter, allData);

            default:
                return true;
        }
    }

    /**
     * Evaluate date-based filters
     */
    private evaluateDateFilter(value: any, filter: FilterCondition, allData?: any[]): boolean {
        const colFormat = (allData ? this.detectColumnDateFormat(allData, filter.column) : null) || this.defaultDateFormat;
        const dateValue = this.parseDate(value, colFormat);
        if (!dateValue) return false;

        const tz = filter.value2 || 'Asia/Jakarta';
        const today = toZonedTime(new Date(), tz);
        today.setHours(0, 0, 0, 0);

        switch (filter.operator) {
            case 'date_equals':
                const compareDate = this.parseDate(filter.value, colFormat);
                if (!compareDate) return false;
                return isEqual(dateValue, compareDate);

            case 'date_before':
                const beforeDate = this.parseDate(filter.value, colFormat);
                if (!beforeDate) return false;
                return isBefore(dateValue, beforeDate);

            case 'date_after':
                const afterDate = this.parseDate(filter.value, colFormat);
                if (!afterDate) return false;
                return isAfter(dateValue, afterDate);

            case 'date_between':
                const startDate = this.parseDate(filter.value, colFormat);
                const endDate = this.parseDate(filter.value2, colFormat);
                if (!startDate || !endDate) return false;
                return (isAfter(dateValue, startDate) || isEqual(dateValue, startDate)) &&
                    (isBefore(dateValue, endDate) || isEqual(dateValue, endDate));

            case 'date_today':
                return isEqual(dateValue, today);

            case 'date_within_days':
                // "N hari" = today + N days ahead
                const days = Number(filter.value);
                const futureDate = addDays(today, days);
                return (isAfter(dateValue, today) || isEqual(dateValue, today)) &&
                    (isBefore(dateValue, futureDate) || isEqual(dateValue, futureDate));

            default:
                return false;
        }
    }

    /**
     * Parse date from various formats
     */
    public parseDate(value: any, preferredFormat?: 'MM/DD' | 'DD/MM' | null): Date | null {
        if (!value) return null;

        try {
            const str = String(value).trim();

            // 1. Try ISO or YYYY-MM-DD format
            if (/^\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}/.test(str)) {
                const parts = str.slice(0, 10).split(/[\/\-]/);
                const y = parseInt(parts[0], 10);
                const m = parseInt(parts[1], 10) - 1;
                const d = parseInt(parts[2], 10);
                const dt = new Date(y, m, d);
                if (!isNaN(dt.getTime())) {
                    dt.setHours(0, 0, 0, 0);
                    return dt;
                }
            }

            // 2. Try 3-part slash/dash format (DD/MM/YYYY or MM/DD/YYYY)
            const parts = str.split(/[\/\-]/);
            if (parts.length === 3) {
                const p0 = parseInt(parts[0], 10);
                const p1 = parseInt(parts[1], 10);
                let y = parseInt(parts[2], 10);
                if (y < 100) y += 2000;

                if (!isNaN(p0) && !isNaN(p1) && !isNaN(y)) {
                    // If p0 > 12: p0 must be Day (DD/MM/YYYY)
                    if (p0 > 12 && p1 <= 12) {
                        const dt = new Date(y, p1 - 1, p0);
                        dt.setHours(0, 0, 0, 0);
                        return dt;
                    }
                    // If p1 > 12: p1 must be Day (MM/DD/YYYY)
                    if (p1 > 12 && p0 <= 12) {
                        const dt = new Date(y, p0 - 1, p1);
                        dt.setHours(0, 0, 0, 0);
                        return dt;
                    }

                    // Respect explicit or detected format preference
                    const fmt = preferredFormat || this.defaultDateFormat;
                    if (fmt === 'MM/DD') {
                        const dt = new Date(y, p0 - 1, p1);
                        dt.setHours(0, 0, 0, 0);
                        return dt;
                    }
                    if (fmt === 'DD/MM') {
                        const dt = new Date(y, p1 - 1, p0);
                        dt.setHours(0, 0, 0, 0);
                        return dt;
                    }

                    // If both p0 <= 12 and p1 <= 12 (ambiguous, e.g. 10/12/2026 or 12/9/2026):
                    // For upcoming tasks/deadlines, prioritize upcoming/future date over already expired past date
                    const now = new Date();
                    now.setHours(0, 0, 0, 0);
                    const d1 = new Date(y, p1 - 1, p0); // DD/MM/YYYY
                    const d2 = new Date(y, p0 - 1, p1); // MM/DD/YYYY
                    d1.setHours(0, 0, 0, 0);
                    d2.setHours(0, 0, 0, 0);

                    const d1IsFuture = d1.getTime() >= now.getTime();
                    const d2IsFuture = d2.getTime() >= now.getTime();

                    // If one date is upcoming and the other has passed, pick the upcoming date!
                    if (d1IsFuture && !d2IsFuture) return d1;
                    if (d2IsFuture && !d1IsFuture) return d2;

                    // If both are upcoming or both are in the past, pick the one closer to today
                    const diff1 = Math.abs(d1.getTime() - now.getTime());
                    const diff2 = Math.abs(d2.getTime() - now.getTime());
                    return diff2 < diff1 ? d2 : d1;
                }
            }

            // Try standard formats
            const formats = [
                'yyyy-MM-dd',
                'dd/MM/yyyy',
                'MM/dd/yyyy',
                'dd-MM-yyyy',
                'dd/MM/yy',
                'dd-MM-yy'
            ];

            for (const fmt of formats) {
                try {
                    const parsed = parse(str, fmt, new Date());
                    if (!isNaN(parsed.getTime())) {
                        parsed.setHours(0, 0, 0, 0);
                        return parsed;
                    }
                } catch (e) {
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
        } catch (error) {
            return null;
        }
    }

    /**
     * Apply transformations to data
     */
    private applyTransforms(data: any[], transforms: TransformConfig[]): any[] {
        return data.map(row => {
            const newRow = { ...row };

            transforms.forEach(transform => {
                const value = newRow[transform.column];
                newRow[transform.column] = this.applyTransform(value, transform, data);
            });

            return newRow;
        });
    }

    /**
     * Apply a single transformation
     */
    private applyTransform(value: any, transform: TransformConfig, allData?: any[]): any {
        if (value === null || value === undefined) return value;

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
                const colFormat = (allData ? this.detectColumnDateFormat(allData, transform.column) : null) || this.defaultDateFormat;
                const date = this.parseDate(value, colFormat);
                if (!date) return value;
                return format(date, transform.params?.format || 'dd/MM/yyyy');

            case 'number_format':
                const num = Number(value);
                if (isNaN(num)) return value;
                return num.toLocaleString('id-ID', transform.params);

            case 'prefix':
                return (transform.params?.prefix || '') + str;

            case 'suffix':
                return str + (transform.params?.suffix || '');

            case 'replace':
                return str.replace(
                    new RegExp(transform.params?.search || '', 'g'),
                    transform.params?.replace || ''
                );

            default:
                return value;
        }
    }

    /**
     * Apply sorting
     */
    private applySort(data: any[], sort: SortConfig): any[] {
        const colFormat = this.detectColumnDateFormat(data, sort.column) || this.defaultDateFormat;

        return [...data].sort((a, b) => {
            const allKeysA = Object.keys(a);
            const keyA = allKeysA.find(k => k.toLowerCase().trim() === sort.column.toLowerCase().trim()) || sort.column;
            const aVal = a[keyA];
            const allKeysB = Object.keys(b);
            const keyB = allKeysB.find(k => k.toLowerCase().trim() === sort.column.toLowerCase().trim()) || sort.column;
            const bVal = b[keyB];

            // 1. Try date comparison first (supports DD/MM/YYYY, YYYY-MM-DD, etc.)
            const aDate = this.parseDate(aVal, colFormat);
            const bDate = this.parseDate(bVal, colFormat);
            if (aDate && bDate) {
                const diff = aDate.getTime() - bDate.getTime();
                return sort.order === 'asc' ? diff : -diff;
            }

            // 2. Try numeric comparison
            const aNum = Number(aVal);
            const bNum = Number(bVal);
            if (!isNaN(aNum) && !isNaN(bNum)) {
                return sort.order === 'asc' ? aNum - bNum : bNum - aNum;
            }

            // 3. String comparison
            const aStr = String(aVal || '');
            const bStr = String(bVal || '');
            const comparison = aStr.localeCompare(bStr);

            return sort.order === 'asc' ? comparison : -comparison;
        });
    }

    /**
     * Group data by column
     */
    groupData(data: any[], config: GroupConfig): Record<string, any[]> {
        const grouped: Record<string, any[]> = {};

        // Find the actual column name (extremely robust matching)
        const sampleRow = data[0];
        if (!sampleRow) return {};

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

            const sortedGrouped: Record<string, any[]> = {};
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
    findColumn(row: any, possibleNames: string[]): string | null {
        const keys = Object.keys(row);

        // Exact match
        for (const name of possibleNames) {
            if (keys.includes(name)) return name;
        }

        // Case-insensitive match
        for (const name of possibleNames) {
            const match = keys.find(k => k.toLowerCase() === name.toLowerCase());
            if (match) return match;
        }

        // Partial match
        for (const name of possibleNames) {
            const match = keys.find(k =>
                k.toLowerCase().includes(name.toLowerCase()) ||
                name.toLowerCase().includes(k.toLowerCase())
            );
            if (match) return match;
        }

        return null;
    }

    /**
     * Get value with smart column detection
     */
    getValue(row: any, possibleNames: string[], defaultValue: string = ''): string {
        const column = this.findColumn(row, possibleNames);
        if (!column) return defaultValue;

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
        today: (dayColumnNames: string[] = ['Hari', 'Day', 'Tanggal']): FilterCondition => {
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
        urgentDeadline: (days: number = 3, dateColumnNames: string[] = ['Deadline', 'Tenggat', 'Due Date']): FilterCondition => ({
            column: dateColumnNames[0],
            operator: 'date_within_days',
            value: days
        }),

        /**
         * Filter for specific status
         */
        status: (status: string, columnNames: string[] = ['Status', 'State']): FilterCondition => ({
            column: columnNames[0],
            operator: 'equals',
            value: status,
            caseInsensitive: true
        }),

        /**
         * Filter for non-empty rows
         */
        notEmpty: (columnName: string): FilterCondition => ({
            column: columnName,
            operator: 'not_empty'
        })
    };
}

export default new SmartSheetsProcessor();
