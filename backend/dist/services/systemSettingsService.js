"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const connection_sqlite_1 = require("../database/connection-sqlite");
const auditLogService_1 = __importDefault(require("./auditLogService"));
class SystemSettingsService {
    cache = new Map();
    cacheExpiry = new Map();
    cacheTTL = 3600000; // 1 hour in milliseconds
    /**
     * Get a single setting value
     */
    async get(category, key, defaultValue) {
        const cacheKey = `${category}.${key}`;
        // Check cache
        if (this.isCacheValid(cacheKey)) {
            return this.cache.get(cacheKey);
        }
        try {
            const result = await (0, connection_sqlite_1.query)('SELECT value, data_type as value_type FROM system_settings WHERE category = ? AND key = ?', [category, key]);
            if (result.rows.length === 0) {
                return defaultValue;
            }
            const setting = result.rows[0];
            const value = this.parseValue(setting.value, setting.value_type);
            // Update cache
            this.cache.set(cacheKey, value);
            this.cacheExpiry.set(cacheKey, Date.now() + this.cacheTTL);
            return value;
        }
        catch (error) {
            console.error(`[Settings] Error getting ${category}.${key}:`, error);
            return defaultValue;
        }
    }
    /**
     * Get all settings for a category
     */
    async getCategory(category, includePrivate = false) {
        const whereClause = includePrivate
            ? 'WHERE category = ?'
            : 'WHERE category = ? AND is_public = 1';
        const result = await (0, connection_sqlite_1.query)(`SELECT key, value, data_type as value_type FROM system_settings ${whereClause}`, [category]);
        const settings = {};
        result.rows.forEach(row => {
            settings[row.key] = this.parseValue(row.value, row.value_type);
        });
        return settings;
    }
    /**
     * Get all settings (grouped by category)
     */
    async getAll(includePrivate = false) {
        const whereClause = includePrivate ? '' : 'WHERE is_public = 1';
        const result = await (0, connection_sqlite_1.query)(`SELECT category, key, value, data_type as value_type, description, is_public 
             FROM system_settings ${whereClause}
             ORDER BY category, key`);
        const settings = {};
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
    async set(update) {
        const { category, key, value, updated_by } = update;
        // Get old value for audit log
        const oldValue = await this.get(category, key);
        // Determine value type
        const value_type = this.inferType(value);
        const now = new Date().toISOString();
        // Ensure all values are strings for SQLite compatibility
        const safeValue = value != null ? String(value) : '';
        const safeCategory = category || 'general';
        const safeUpdatedBy = updated_by || null;
        // Check if setting already exists (sql.js has issues with UPSERT)
        const existing = await (0, connection_sqlite_1.query)('SELECT key FROM system_settings WHERE key = ?', [key]);
        if (existing.rows.length > 0) {
            // UPDATE existing
            await (0, connection_sqlite_1.query)(`UPDATE system_settings 
                 SET value = ?, data_type = ?, category = ?, updated_by = ?, updated_at = ?
                 WHERE key = ?`, [safeValue, value_type, safeCategory, safeUpdatedBy, now, key]);
        }
        else {
            // INSERT new
            await (0, connection_sqlite_1.query)(`INSERT INTO system_settings (id, category, key, value, data_type, updated_by, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`, [require('uuid').v4(), safeCategory, key, safeValue, value_type, safeUpdatedBy, now]);
        }
        // Clear cache
        this.cache.delete(`${category}.${key}`);
        this.cacheExpiry.delete(`${category}.${key}`);
        // Log change
        await auditLogService_1.default.logSettingChanged(updated_by, 'default-tenant-id', category, key, oldValue, value);
    }
    /**
     * Update multiple settings at once
     */
    async setMultiple(updates) {
        for (const update of updates) {
            await this.set(update);
        }
    }
    /**
     * Delete a setting
     */
    async delete(category, key, deletedBy) {
        await (0, connection_sqlite_1.query)('DELETE FROM system_settings WHERE category = ? AND key = ?', [category, key]);
        // Clear cache
        this.cache.delete(`${category}.${key}`);
        this.cacheExpiry.delete(`${category}.${key}`);
        // Log deletion
        await auditLogService_1.default.log({
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
    clearCache() {
        this.cache.clear();
        this.cacheExpiry.clear();
        console.log('[Settings] Cache cleared');
    }
    /**
     * Helper: Check if cache is valid
     */
    isCacheValid(key) {
        if (!this.cache.has(key))
            return false;
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
    parseValue(value, type) {
        if (!value)
            return null;
        switch (type) {
            case 'number':
                return parseFloat(value);
            case 'boolean':
                return value === 'true' || value === '1';
            case 'json':
                try {
                    return JSON.parse(value);
                }
                catch {
                    return value;
                }
            default:
                return value;
        }
    }
    /**
     * Helper: Infer type from value
     */
    inferType(value) {
        if (typeof value === 'number')
            return 'number';
        if (typeof value === 'boolean')
            return 'boolean';
        if (typeof value === 'object')
            return 'json';
        return 'string';
    }
    /**
     * Convenience methods for common settings
     */
    async getSiteName() {
        return await this.get('general', 'site_name', 'WA Automation Platform');
    }
    async getContactEmail() {
        return await this.get('general', 'contact_email', 'admin@example.com');
    }
    async getTimezone() {
        return await this.get('general', 'timezone', 'Asia/Jakarta');
    }
    async getMaxBotsPerUser() {
        return await this.get('whatsapp', 'max_bots_per_user', 5);
    }
    async getMaxRemindersPerBot() {
        return await this.get('whatsapp', 'max_reminders_per_bot', 50);
    }
    async getMessageRateLimit() {
        return await this.get('whatsapp', 'message_rate_limit', 30);
    }
    async getPasswordMinLength() {
        return await this.get('security', 'password_min_length', 8);
    }
    async getMaxLoginAttempts() {
        return await this.get('security', 'max_login_attempts', 5);
    }
    async getLockoutDuration() {
        return await this.get('security', 'lockout_duration_minutes', 30);
    }
    async getInviteExpiryDays() {
        return await this.get('security', 'invite_expiry_days', 7);
    }
    async getLogRetentionDays() {
        return await this.get('advanced', 'log_retention_days', 30);
    }
    async getBackupRetentionDays() {
        return await this.get('advanced', 'backup_retention_days', 7);
    }
    async isCachingEnabled() {
        return await this.get('advanced', 'enable_caching', true);
    }
    async isDebugMode() {
        return await this.get('advanced', 'debug_mode', false);
    }
    /**
     * Validate setting value
     */
    validateSetting(category, key, value) {
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
exports.default = new SystemSettingsService();
//# sourceMappingURL=systemSettingsService.js.map