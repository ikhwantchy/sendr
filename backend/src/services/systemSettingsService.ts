import { query } from '../database/connection-sqlite';
import auditLogService from './auditLogService';

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

class SystemSettingsService {
    private cache: Map<string, any> = new Map();
    private cacheExpiry: Map<string, number> = new Map();
    private cacheTTL = 3600000; // 1 hour in milliseconds

    /**
     * Get a single setting value
     */
    async get(category: string, key: string, defaultValue?: any): Promise<any> {
        const cacheKey = `${category}.${key}`;

        // Check cache
        if (this.isCacheValid(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        try {
            const result = await query(
                'SELECT value, data_type as value_type FROM system_settings WHERE category = ? AND key = ?',
                [category, key]
            );

            if (result.rows.length === 0) {
                return defaultValue;
            }

            const setting = result.rows[0];
            const value = this.parseValue(setting.value, setting.value_type);

            // Update cache
            this.cache.set(cacheKey, value);
            this.cacheExpiry.set(cacheKey, Date.now() + this.cacheTTL);

            return value;
        } catch (error) {
            console.error(`[Settings] Error getting ${category}.${key}:`, error);
            return defaultValue;
        }
    }

    /**
     * Get all settings for a category
     */
    async getCategory(category: string, includePrivate: boolean = false): Promise<Record<string, any>> {
        const whereClause = includePrivate
            ? 'WHERE category = $1'
            : 'WHERE category = $1 AND is_public = true';

        const result = await query(
            `SELECT key, value, data_type as value_type FROM system_settings ${whereClause}`,
            [category]
        );

        const settings: Record<string, any> = {};
        result.rows.forEach(row => {
            settings[row.key] = this.parseValue(row.value, row.value_type);
        });

        return settings;
    }

    /**
     * Get all settings (grouped by category)
     */
    async getAll(includePrivate: boolean = false): Promise<Record<string, Record<string, any>>> {
        const whereClause = includePrivate ? '' : 'WHERE is_public = true';

        const result = await query(
            `SELECT category, key, value, data_type as value_type, description, is_public 
             FROM system_settings ${whereClause}
             ORDER BY category, key`
        );

        const settings: Record<string, Record<string, any>> = {};

        result.rows.forEach(row => {
            if (!settings[row.category]) {
                settings[row.category] = {};
            }
            settings[row.category][row.key] = {
                value: this.parseValue(row.value, row.value_type),
                description: row.description,
                is_public: row.is_public
            };
        });

        return settings;
    }

    /**
     * Update a setting
     */
    async set(update: SettingsUpdate): Promise<void> {
        const { category, key, value, updated_by } = update;

        // Get old value for audit log
        const oldValue = await this.get(category, key);

        // Determine value type
        const value_type = this.inferType(value);

        // Update or insert (SQLite UPSERT)
        await query(
            `INSERT INTO system_settings (id, category, key, value, data_type, updated_by, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
             ON CONFLICT (key) 
             DO UPDATE SET 
                value = excluded.value,
                data_type = excluded.data_type,
                category = excluded.category,
                updated_by = excluded.updated_by,
                updated_at = datetime('now')`,
            [require('uuid').v4(), category, key, value, value_type, updated_by]
        );

        // Clear cache
        this.cache.delete(`${category}.${key}`);
        this.cacheExpiry.delete(`${category}.${key}`);

        // Log change
        await auditLogService.logSettingChanged(updated_by, 'default-tenant-id', category, key, oldValue, value);
    }

    /**
     * Update multiple settings at once
     */
    async setMultiple(updates: SettingsUpdate[]): Promise<void> {
        for (const update of updates) {
            await this.set(update);
        }
    }

    /**
     * Delete a setting
     */
    async delete(category: string, key: string, deletedBy: string): Promise<void> {
        await query(
            'DELETE FROM system_settings WHERE category = ? AND key = ?',
            [category, key]
        );

        // Clear cache
        this.cache.delete(`${category}.${key}`);
        this.cacheExpiry.delete(`${category}.${key}`);

        // Log deletion
        await auditLogService.log({
            user_id: deletedBy,
            action_type: 'settings.delete',
            action_category: 'settings',
            description: `Deleted setting ${category}.${key}`,
            status: 'success'
        });
    }

    /**
     * Clear all cache
     */
    clearCache(): void {
        this.cache.clear();
        this.cacheExpiry.clear();
        console.log('[Settings] Cache cleared');
    }

    /**
     * Helper: Check if cache is valid
     */
    private isCacheValid(key: string): boolean {
        if (!this.cache.has(key)) return false;
        const expiry = this.cacheExpiry.get(key);
        if (!expiry || Date.now() > expiry) {
            this.cache.delete(key);
            this.cacheExpiry.delete(key);
            return false;
        }
        return true;
    }

    /**
     * Helper: Parse value based on type
     */
    private parseValue(value: string, type: string): any {
        if (!value) return null;

        switch (type) {
            case 'number':
                return parseFloat(value);
            case 'boolean':
                return value === 'true' || value === '1';
            case 'json':
                try {
                    return JSON.parse(value);
                } catch {
                    return value;
                }
            default:
                return value;
        }
    }

    /**
     * Helper: Infer type from value
     */
    private inferType(value: any): string {
        if (typeof value === 'number') return 'number';
        if (typeof value === 'boolean') return 'boolean';
        if (typeof value === 'object') return 'json';
        return 'string';
    }

    /**
     * Convenience methods for common settings
     */

    async getSiteName(): Promise<string> {
        return await this.get('general', 'site_name', 'WA Automation Platform');
    }

    async getContactEmail(): Promise<string> {
        return await this.get('general', 'contact_email', 'admin@example.com');
    }

    async getTimezone(): Promise<string> {
        return await this.get('general', 'timezone', 'Asia/Jakarta');
    }

    async getMaxBotsPerUser(): Promise<number> {
        return await this.get('whatsapp', 'max_bots_per_user', 5);
    }

    async getMaxRemindersPerBot(): Promise<number> {
        return await this.get('whatsapp', 'max_reminders_per_bot', 50);
    }

    async getMessageRateLimit(): Promise<number> {
        return await this.get('whatsapp', 'message_rate_limit', 30);
    }

    async getPasswordMinLength(): Promise<number> {
        return await this.get('security', 'password_min_length', 8);
    }

    async getMaxLoginAttempts(): Promise<number> {
        return await this.get('security', 'max_login_attempts', 5);
    }

    async getLockoutDuration(): Promise<number> {
        return await this.get('security', 'lockout_duration_minutes', 30);
    }

    async getInviteExpiryDays(): Promise<number> {
        return await this.get('security', 'invite_expiry_days', 7);
    }

    async getLogRetentionDays(): Promise<number> {
        return await this.get('advanced', 'log_retention_days', 30);
    }

    async getBackupRetentionDays(): Promise<number> {
        return await this.get('advanced', 'backup_retention_days', 7);
    }

    async isCachingEnabled(): Promise<boolean> {
        return await this.get('advanced', 'enable_caching', true);
    }

    async isDebugMode(): Promise<boolean> {
        return await this.get('advanced', 'debug_mode', false);
    }

    /**
     * Validate setting value
     */
    validateSetting(category: string, key: string, value: any): { valid: boolean; error?: string } {
        // Number validations
        if (category === 'whatsapp') {
            if (key === 'max_bots_per_user' && (value < 1 || value > 100)) {
                return { valid: false, error: 'Max bots must be between 1 and 100' };
            }
            if (key === 'max_reminders_per_bot' && (value < 1 || value > 1000)) {
                return { valid: false, error: 'Max reminders must be between 1 and 1000' };
            }
            if (key === 'message_rate_limit' && (value < 1 || value > 100)) {
                return { valid: false, error: 'Rate limit must be between 1 and 100' };
            }
        }

        if (category === 'security') {
            if (key === 'password_min_length' && (value < 6 || value > 32)) {
                return { valid: false, error: 'Password length must be between 6 and 32' };
            }
            if (key === 'max_login_attempts' && (value < 3 || value > 10)) {
                return { valid: false, error: 'Max login attempts must be between 3 and 10' };
            }
        }

        return { valid: true };
    }
}

export default new SystemSettingsService();
