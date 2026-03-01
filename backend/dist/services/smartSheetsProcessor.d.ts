/**
 * Enhanced Google Sheets Data Processor
 *
 * Provides flexible, easy-to-use data processing for Google Sheets reminders
 * Supports various use cases without hardcoding specific column names
 */
export interface FilterCondition {
    column: string;
    operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'starts_with' | 'ends_with' | 'greater_than' | 'less_than' | 'between' | 'in_list' | 'is_empty' | 'not_empty' | 'date_equals' | 'date_before' | 'date_after' | 'date_between' | 'date_today' | 'date_within_days' | 'day_equals_today' | 'date_within_hours';
    value?: any;
    value2?: any;
    caseInsensitive?: boolean;
}
export interface SortConfig {
    column: string;
    order: 'asc' | 'desc';
}
export interface GroupConfig {
    by: string;
    sortGroups?: 'asc' | 'desc';
}
export interface TransformConfig {
    column: string;
    type: 'uppercase' | 'lowercase' | 'capitalize' | 'trim' | 'date_format' | 'number_format' | 'prefix' | 'suffix' | 'replace';
    params?: any;
}
export interface DataProcessingConfig {
    filters?: FilterCondition[];
    sort?: SortConfig;
    group?: GroupConfig;
    transforms?: TransformConfig[];
    limit?: number;
    offset?: number;
}
declare class SmartSheetsProcessor {
    /**
     * Process sheet data with flexible configuration
     */
    processData(data: any[], config?: DataProcessingConfig): any[];
    /**
     * Apply filters to data
     */
    private applyFilters;
    /**
     * Evaluate a single filter condition
     */
    private evaluateFilter;
    /**
     * Evaluate date-based filters
     */
    private evaluateDateFilter;
    /**
     * Parse date from various formats
     */
    private parseDate;
    /**
     * Apply transformations to data
     */
    private applyTransforms;
    /**
     * Apply a single transformation
     */
    private applyTransform;
    /**
     * Apply sorting
     */
    private applySort;
    /**
     * Group data by column
     */
    groupData(data: any[], config: GroupConfig): Record<string, any[]>;
    /**
     * Smart column detection - find column by various possible names
     */
    findColumn(row: any, possibleNames: string[]): string | null;
    /**
     * Get value with smart column detection
     */
    getValue(row: any, possibleNames: string[], defaultValue?: string): string;
    /**
     * Create preset filters for common use cases
     */
    presets: {
        /**
         * Filter for today's items (by day name)
         */
        today: (dayColumnNames?: string[]) => FilterCondition;
        /**
         * Filter for urgent deadlines (within X days)
         */
        urgentDeadline: (days?: number, dateColumnNames?: string[]) => FilterCondition;
        /**
         * Filter for specific status
         */
        status: (status: string, columnNames?: string[]) => FilterCondition;
        /**
         * Filter for non-empty rows
         */
        notEmpty: (columnName: string) => FilterCondition;
    };
}
declare const _default: SmartSheetsProcessor;
export default _default;
//# sourceMappingURL=smartSheetsProcessor.d.ts.map