/**
 * System Settings Service
 * Manages system-wide configuration settings
 */
export interface SystemSetting {
    id?: string;
    category: string;
    key: string;
    value: string;
    value_type: 'string' | 'number' | 'boolean' | 'json';
    description?: string;
    is_public?: boolean;
    updated_by?: string;
    created_at?: Date;
    updated_at?: Date;
}
export interface SettingsUpdate {
    category: string;
    key: string;
    value: string;
    updated_by: string;
}
declare class SystemSettingsService {
    private cache;
    private cacheExpiry;
    private cacheTTL;
    /**
     * Get a single setting value
     */
    get(category: string, key: string, defaultValue?: any): Promise<any>;
    /**
     * Get all settings for a category
     */
    getCategory(category: string, includePrivate?: boolean): Promise<Record<string, any>>;
    /**
     * Get all settings (grouped by category)
     */
    getAll(includePrivate?: boolean): Promise<Record<string, Record<string, any>>>;
    /**
     * Update a setting
     */
    set(update: SettingsUpdate): Promise<void>;
    /**
     * Update multiple settings at once
     */
    setMultiple(updates: SettingsUpdate[]): Promise<void>;
    /**
     * Delete a setting
     */
    delete(category: string, key: string, deletedBy: string): Promise<void>;
    /**
     * Clear all cache
     */
    clearCache(): void;
    /**
     * Helper: Check if cache is valid
     */
    private isCacheValid;
    /**
     * Helper: Parse value based on type
     */
    private parseValue;
    /**
     * Helper: Infer type from value
     */
    private inferType;
    /**
     * Convenience methods for common settings
     */
    getSiteName(): Promise<string>;
    getContactEmail(): Promise<string>;
    getTimezone(): Promise<string>;
    getMaxBotsPerUser(): Promise<number>;
    getMaxRemindersPerBot(): Promise<number>;
    getMessageRateLimit(): Promise<number>;
    getPasswordMinLength(): Promise<number>;
    getMaxLoginAttempts(): Promise<number>;
    getLockoutDuration(): Promise<number>;
    getInviteExpiryDays(): Promise<number>;
    getLogRetentionDays(): Promise<number>;
    getBackupRetentionDays(): Promise<number>;
    isCachingEnabled(): Promise<boolean>;
    isDebugMode(): Promise<boolean>;
    /**
     * Validate setting value
     */
    validateSetting(category: string, key: string, value: any): {
        valid: boolean;
        error?: string;
    };
}
declare const _default: SystemSettingsService;
export default _default;
//# sourceMappingURL=systemSettingsService.d.ts.map