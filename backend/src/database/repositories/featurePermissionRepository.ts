/**
 * Feature Permission Repository
 * Manages feature permissions for users on bots
 */

import { db } from '../connection';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../../utils/logger';

export interface FeaturePermission {
    id: string;
    bot_id: string;
    user_id: string;
    feature_key: string;
    is_enabled: boolean;
    daily_limit: number | null;
    monthly_limit: number | null;
    created_at: string;
    updated_at: string;
}

export interface FeaturePermissionWithDetails extends FeaturePermission {
    feature_name?: string;
    feature_description?: string;
    feature_category?: string;
    is_premium?: boolean;
}

export interface FeaturePermissionInput {
    feature_key: string;
    is_enabled: boolean;
    daily_limit?: number | null;
    monthly_limit?: number | null;
}

class FeaturePermissionRepository {
    /**
     * Create feature permission
     */
    async create(
        botId: string,
        userId: string,
        featureKey: string,
        options: {
            is_enabled?: boolean;
            daily_limit?: number | null;
            monthly_limit?: number | null;
        } = {}
    ): Promise<FeaturePermission> {
        const id = uuidv4();
        const now = new Date().toISOString();

        const stmt = db.prepare(`
            INSERT INTO bot_feature_permissions 
            (id, bot_id, user_id, feature_key, is_enabled, daily_limit, monthly_limit, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        stmt.run(
            id,
            botId,
            userId,
            featureKey,
            options.is_enabled !== undefined ? (options.is_enabled ? 1 : 0) : 1,
            options.daily_limit ?? null,
            options.monthly_limit ?? null,
            now,
            now
        );

        logger.info('Feature permission created', { bot_id: botId, user_id: userId, feature_key: featureKey });

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
    async update(
        id: string,
        options: {
            is_enabled?: boolean;
            daily_limit?: number | null;
            monthly_limit?: number | null;
        }
    ): Promise<void> {
        const updates: string[] = [];
        const values: any[] = [];

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

        if (updates.length === 0) return;

        updates.push('updated_at = ?');
        values.push(new Date().toISOString());
        values.push(id);

        const stmt = db.prepare(`
            UPDATE bot_feature_permissions SET ${updates.join(', ')}
            WHERE id = ?
        `);

        stmt.run(...values);

        logger.info('Feature permission updated', { id });
    }

    /**
     * Delete feature permission
     */
    async delete(id: string): Promise<void> {
        const stmt = db.prepare('DELETE FROM bot_feature_permissions WHERE id = ?');
        stmt.run(id);

        logger.info('Feature permission deleted', { id });
    }

    /**
     * Find all permissions for a bot and user
     */
    async findByBotAndUser(botId: string, userId: string): Promise<FeaturePermissionWithDetails[]> {
        const stmt = db.prepare(`
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

        return stmt.all(botId, userId) as FeaturePermissionWithDetails[];
    }

    /**
     * Find specific permission
     */
    async findByBotUserFeature(botId: string, userId: string, featureKey: string): Promise<FeaturePermission | null> {
        const stmt = db.prepare(`
            SELECT * FROM bot_feature_permissions 
            WHERE bot_id = ? AND user_id = ? AND feature_key = ?
        `);

        return stmt.get(botId, userId, featureKey) as FeaturePermission | null;
    }

    /**
     * Find all permissions for a bot
     */
    async findByBotId(botId: string): Promise<FeaturePermissionWithDetails[]> {
        const stmt = db.prepare(`
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

        return stmt.all(botId) as any[];
    }

    /**
     * Bulk create permissions for user
     */
    async bulkCreate(
        botId: string,
        userId: string,
        features: FeaturePermissionInput[]
    ): Promise<FeaturePermission[]> {
        const results: FeaturePermission[] = [];

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
                } else {
                    // Create new
                    const permission = await this.create(botId, userId, feature.feature_key, {
                        is_enabled: feature.is_enabled,
                        daily_limit: feature.daily_limit,
                        monthly_limit: feature.monthly_limit,
                    });
                    results.push(permission);
                }
            } catch (error) {
                logger.error('Failed to create/update permission in bulk', {
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
    async deleteByBotAndUser(botId: string, userId: string): Promise<void> {
        const stmt = db.prepare('DELETE FROM bot_feature_permissions WHERE bot_id = ? AND user_id = ?');
        stmt.run(botId, userId);

        logger.info('All permissions deleted for user on bot', { bot_id: botId, user_id: userId });
    }

    /**
     * Delete all permissions for bot
     */
    async deleteByBotId(botId: string): Promise<void> {
        const stmt = db.prepare('DELETE FROM bot_feature_permissions WHERE bot_id = ?');
        stmt.run(botId);

        logger.info('All permissions deleted for bot', { bot_id: botId });
    }

    /**
     * Get enabled features for user on bot
     */
    async getEnabledFeatures(botId: string, userId: string): Promise<string[]> {
        const stmt = db.prepare(`
            SELECT feature_key FROM bot_feature_permissions 
            WHERE bot_id = ? AND user_id = ? AND is_enabled = 1
        `);

        const results = stmt.all(botId, userId) as { feature_key: string }[];
        return results.map(r => r.feature_key);
    }

    /**
     * Check if user has feature enabled
     */
    async hasFeature(botId: string, userId: string, featureKey: string): Promise<boolean> {
        const permission = await this.findByBotUserFeature(botId, userId, featureKey);
        return permission !== null && permission.is_enabled;
    }

    /**
     * Copy permissions from one user to another
     */
    async copyPermissions(botId: string, fromUserId: string, toUserId: string): Promise<FeaturePermission[]> {
        const sourcePermissions = await this.findByBotAndUser(botId, fromUserId);
        const results: FeaturePermission[] = [];

        for (const perm of sourcePermissions) {
            try {
                const newPerm = await this.create(botId, toUserId, perm.feature_key, {
                    is_enabled: perm.is_enabled,
                    daily_limit: perm.daily_limit,
                    monthly_limit: perm.monthly_limit,
                });
                results.push(newPerm);
            } catch (error) {
                logger.error('Failed to copy permission', {
                    bot_id: botId,
                    from_user: fromUserId,
                    to_user: toUserId,
                    feature_key: perm.feature_key,
                    error,
                });
            }
        }

        logger.info('Permissions copied', { bot_id: botId, from_user: fromUserId, to_user: toUserId });

        return results;
    }
}

export const featurePermissionRepository = new FeaturePermissionRepository();
