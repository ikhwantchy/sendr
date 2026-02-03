"use strict";
/**
 * Feature Permission Repository
 * Manages feature permissions for users on bots
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.featurePermissionRepository = void 0;
const connection_1 = require("../connection");
const uuid_1 = require("uuid");
const logger_1 = require("../../utils/logger");
class FeaturePermissionRepository {
    /**
     * Create feature permission
     */
    async create(botId, userId, featureKey, options = {}) {
        const id = (0, uuid_1.v4)();
        const now = new Date().toISOString();
        const stmt = connection_1.db.prepare(`
            INSERT INTO bot_feature_permissions 
            (id, bot_id, user_id, feature_key, is_enabled, daily_limit, monthly_limit, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        stmt.run(id, botId, userId, featureKey, options.is_enabled !== undefined ? (options.is_enabled ? 1 : 0) : 1, options.daily_limit ?? null, options.monthly_limit ?? null, now, now);
        logger_1.logger.info('Feature permission created', { bot_id: botId, user_id: userId, feature_key: featureKey });
        return {
            id,
            bot_id: botId,
            user_id: userId,
            feature_key: featureKey,
            is_enabled: options.is_enabled !== undefined ? options.is_enabled : true,
            daily_limit: options.daily_limit ?? null,
            monthly_limit: options.monthly_limit ?? null,
            created_at: now,
            updated_at: now,
        };
    }
    /**
     * Update feature permission
     */
    async update(id, options) {
        const updates = [];
        const values = [];
        if (options.is_enabled !== undefined) {
            updates.push('is_enabled = ?');
            values.push(options.is_enabled ? 1 : 0);
        }
        if (options.daily_limit !== undefined) {
            updates.push('daily_limit = ?');
            values.push(options.daily_limit);
        }
        if (options.monthly_limit !== undefined) {
            updates.push('monthly_limit = ?');
            values.push(options.monthly_limit);
        }
        if (updates.length === 0)
            return;
        updates.push('updated_at = ?');
        values.push(new Date().toISOString());
        values.push(id);
        const stmt = connection_1.db.prepare(`
            UPDATE bot_feature_permissions SET ${updates.join(', ')}
            WHERE id = ?
        `);
        stmt.run(...values);
        logger_1.logger.info('Feature permission updated', { id });
    }
    /**
     * Delete feature permission
     */
    async delete(id) {
        const stmt = connection_1.db.prepare('DELETE FROM bot_feature_permissions WHERE id = ?');
        stmt.run(id);
        logger_1.logger.info('Feature permission deleted', { id });
    }
    /**
     * Find all permissions for a bot and user
     */
    async findByBotAndUser(botId, userId) {
        const stmt = connection_1.db.prepare(`
            SELECT 
                fp.*,
                f.name as feature_name,
                f.description as feature_description,
                f.category as feature_category,
                f.is_premium
            FROM bot_feature_permissions fp
            LEFT JOIN features f ON fp.feature_key = f.key
            WHERE fp.bot_id = ? AND fp.user_id = ?
            ORDER BY f.category, f.name
        `);
        return stmt.all(botId, userId);
    }
    /**
     * Find specific permission
     */
    async findByBotUserFeature(botId, userId, featureKey) {
        const stmt = connection_1.db.prepare(`
            SELECT * FROM bot_feature_permissions 
            WHERE bot_id = ? AND user_id = ? AND feature_key = ?
        `);
        return stmt.get(botId, userId, featureKey);
    }
    /**
     * Find all permissions for a bot
     */
    async findByBotId(botId) {
        const stmt = connection_1.db.prepare(`
            SELECT 
                fp.*,
                f.name as feature_name,
                f.description as feature_description,
                f.category as feature_category,
                f.is_premium,
                u.name as user_name,
                u.email as user_email
            FROM bot_feature_permissions fp
            LEFT JOIN features f ON fp.feature_key = f.key
            LEFT JOIN users u ON fp.user_id = u.id
            WHERE fp.bot_id = ?
            ORDER BY u.name, f.category, f.name
        `);
        return stmt.all(botId);
    }
    /**
     * Bulk create permissions for user
     */
    async bulkCreate(botId, userId, features) {
        const results = [];
        for (const feature of features) {
            try {
                // Check if permission already exists
                const existing = await this.findByBotUserFeature(botId, userId, feature.feature_key);
                if (existing) {
                    // Update existing
                    await this.update(existing.id, {
                        is_enabled: feature.is_enabled,
                        daily_limit: feature.daily_limit,
                        monthly_limit: feature.monthly_limit,
                    });
                    results.push({
                        ...existing,
                        is_enabled: feature.is_enabled,
                        daily_limit: feature.daily_limit ?? null,
                        monthly_limit: feature.monthly_limit ?? null,
                        updated_at: new Date().toISOString(),
                    });
                }
                else {
                    // Create new
                    const permission = await this.create(botId, userId, feature.feature_key, {
                        is_enabled: feature.is_enabled,
                        daily_limit: feature.daily_limit,
                        monthly_limit: feature.monthly_limit,
                    });
                    results.push(permission);
                }
            }
            catch (error) {
                logger_1.logger.error('Failed to create/update permission in bulk', {
                    bot_id: botId,
                    user_id: userId,
                    feature_key: feature.feature_key,
                    error,
                });
            }
        }
        return results;
    }
    /**
     * Delete all permissions for user on bot
     */
    async deleteByBotAndUser(botId, userId) {
        const stmt = connection_1.db.prepare('DELETE FROM bot_feature_permissions WHERE bot_id = ? AND user_id = ?');
        stmt.run(botId, userId);
        logger_1.logger.info('All permissions deleted for user on bot', { bot_id: botId, user_id: userId });
    }
    /**
     * Delete all permissions for bot
     */
    async deleteByBotId(botId) {
        const stmt = connection_1.db.prepare('DELETE FROM bot_feature_permissions WHERE bot_id = ?');
        stmt.run(botId);
        logger_1.logger.info('All permissions deleted for bot', { bot_id: botId });
    }
    /**
     * Get enabled features for user on bot
     */
    async getEnabledFeatures(botId, userId) {
        const stmt = connection_1.db.prepare(`
            SELECT feature_key FROM bot_feature_permissions 
            WHERE bot_id = ? AND user_id = ? AND is_enabled = 1
        `);
        const results = stmt.all(botId, userId);
        return results.map(r => r.feature_key);
    }
    /**
     * Check if user has feature enabled
     */
    async hasFeature(botId, userId, featureKey) {
        const permission = await this.findByBotUserFeature(botId, userId, featureKey);
        return permission !== null && permission.is_enabled;
    }
    /**
     * Copy permissions from one user to another
     */
    async copyPermissions(botId, fromUserId, toUserId) {
        const sourcePermissions = await this.findByBotAndUser(botId, fromUserId);
        const results = [];
        for (const perm of sourcePermissions) {
            try {
                const newPerm = await this.create(botId, toUserId, perm.feature_key, {
                    is_enabled: perm.is_enabled,
                    daily_limit: perm.daily_limit,
                    monthly_limit: perm.monthly_limit,
                });
                results.push(newPerm);
            }
            catch (error) {
                logger_1.logger.error('Failed to copy permission', {
                    bot_id: botId,
                    from_user: fromUserId,
                    to_user: toUserId,
                    feature_key: perm.feature_key,
                    error,
                });
            }
        }
        logger_1.logger.info('Permissions copied', { bot_id: botId, from_user: fromUserId, to_user: toUserId });
        return results;
    }
}
exports.featurePermissionRepository = new FeaturePermissionRepository();
//# sourceMappingURL=featurePermissionRepository.js.map