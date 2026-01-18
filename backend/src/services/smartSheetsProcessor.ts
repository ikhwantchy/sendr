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
    'date_equals' | 'date_before' | 'date_after' | 'date_between' | 'date_today' | 'date_within_days';
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

    /**
     * Process sheet data with flexible configuration
     */
    processData(data: any[], config: DataProcessingConfig = {}): any[] {
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
    private applyFilters(data: any[], filters: FilterCondition[]): any[] {
        return data.filter(row => {
            // All filters must pass (AND logic)
            return filters.every(filter => this.evaluateFilter(row, filter));
        });
    }

    /**
     * Evaluate a single filter condition
     */
    private evaluateFilter(row: any, filter: FilterCondition): boolean {
        const value = row[filter.column];
        const filterValue = filter.value;
        const caseInsensitive = filter.caseInsensitive !== false; // Default true

        // Helper to compare strings
        const compareStr = (a: any, b: any) => {
            const strA = String(a || '');
            const strB = String(b || '');
            return caseInsensitive
                ? strA.toLowerCase() === strB.toLowerCase()
                : strA === strB;
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
    private evaluateDateFilter(value: any, filter: FilterCondition): boolean {
        const dateValue = this.parseDate(value);
        if (!dateValue) return false;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        switch (filter.operator) {
            case 'date_equals':
                const compareDate = this.parseDate(filter.value);
                if (!compareDate) return false;
                return isEqual(dateValue, compareDate);

            case 'date_before':
                const beforeDate = this.parseDate(filter.value);
                if (!beforeDate) return false;
                return isBefore(dateValue, beforeDate);

            case 'date_after':
                const afterDate = this.parseDate(filter.value);
                if (!afterDate) return false;
                return isAfter(dateValue, afterDate);

            case 'date_between':
                const startDate = this.parseDate(filter.value);
                const endDate = this.parseDate(filter.value2);
                if (!startDate || !endDate) return false;
                return (isAfter(dateValue, startDate) || isEqual(dateValue, startDate)) &&
                    (isBefore(dateValue, endDate) || isEqual(dateValue, endDate));

            case 'date_today':
                return isEqual(dateValue, today);

            case 'date_within_days':
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
    private parseDate(value: any): Date | null {
        if (!value) return null;

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
                newRow[transform.column] = this.applyTransform(value, transform);
            });

            return newRow;
        });
    }

    /**
     * Apply a single transformation
     */
    private applyTransform(value: any, transform: TransformConfig): any {
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
                const date = this.parseDate(value);
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
