/**
 * Bot User Repository
 * Manages user assignments to bots
 */

import { db } from '../connection';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../../utils/logger';

export interface BotUser {
    id: string;
    bot_id: string;
    user_id: string;
    assigned_by: string;
    assigned_at: string;
    is_active: boolean;
}

export interface BotUserWithDetails extends BotUser {
    bot_name?: string;
    user_name?: string;
    user_email?: string;
    assigned_by_name?: string;
}

class BotUserRepository {
    /**
     * Assign user to bot
     */
    async assignUser(botId: string, userId: string, assignedBy: string): Promise<BotUser> {
        const id = uuidv4();
        const assignedAt = new Date().toISOString();

        const stmt = db.prepare(`
            INSERT INTO bot_users (id, bot_id, user_id, assigned_by, assigned_at, is_active)
            VALUES (?, ?, ?, ?, ?, 1)
        `);

        stmt.run(id, botId, userId, assignedBy, assignedAt);

        logger.info('User assigned to bot', { bot_id: botId, user_id: userId, assigned_by: assignedBy });

        return {
            id,
            bot_id: botId,
            user_id: userId,
            assigned_by: assignedBy,
            assigned_at: assignedAt,
            is_active: true,
        };
    }

    /**
     * Remove user from bot
     */
    async removeUser(botId: string, userId: string): Promise<void> {
        const stmt = db.prepare('DELETE FROM bot_users WHERE bot_id = ? AND user_id = ?');
        stmt.run(botId, userId);

        logger.info('User removed from bot', { bot_id: botId, user_id: userId });
    }

    /**
     * Deactivate user access (soft delete)
     */
    async deactivateUser(botId: string, userId: string): Promise<void> {
        const stmt = db.prepare('UPDATE bot_users SET is_active = 0 WHERE bot_id = ? AND user_id = ?');
        stmt.run(botId, userId);

        logger.info('User access deactivated', { bot_id: botId, user_id: userId });
    }

    /**
     * Reactivate user access
     */
    async reactivateUser(botId: string, userId: string): Promise<void> {
        const stmt = db.prepare('UPDATE bot_users SET is_active = 1 WHERE bot_id = ? AND user_id = ?');
        stmt.run(botId, userId);

        logger.info('User access reactivated', { bot_id: botId, user_id: userId });
    }

    /**
     * Find all users for a bot
     */
    async findByBotId(botId: string): Promise<BotUserWithDetails[]> {
        const stmt = db.prepare(`
            SELECT 
                bu.*,
                u.name as user_name,
                u.email as user_email,
                admin.name as assigned_by_name
            FROM bot_users bu
            LEFT JOIN users u ON bu.user_id = u.id
            LEFT JOIN users admin ON bu.assigned_by = admin.id
            WHERE bu.bot_id = ?
            ORDER BY bu.assigned_at DESC
        `);

        return stmt.all(botId) as BotUserWithDetails[];
    }

    /**
     * Find all bots for a user
     */
    async findByUserId(userId: string): Promise<BotUserWithDetails[]> {
        const stmt = db.prepare(`
            SELECT 
                bu.*,
                b.name as bot_name,
                admin.name as assigned_by_name
            FROM bot_users bu
            LEFT JOIN bots b ON bu.bot_id = b.id
            LEFT JOIN users admin ON bu.assigned_by = admin.id
            WHERE bu.user_id = ? AND bu.is_active = 1
            ORDER BY bu.assigned_at DESC
        `);

        return stmt.all(userId) as BotUserWithDetails[];
    }

    /**
     * Check if user has access to bot
     */
    async findByBotAndUser(botId: string, userId: string): Promise<BotUser | null> {
        const stmt = db.prepare(`
            SELECT * FROM bot_users 
            WHERE bot_id = ? AND user_id = ? AND is_active = 1
        `);

        return stmt.get(botId, userId) as BotUser | null;
    }

    /**
     * Check if user has access to bot (including inactive)
     */
    async findByBotAndUserIncludingInactive(botId: string, userId: string): Promise<BotUser | null> {
        const stmt = db.prepare(`
            SELECT * FROM bot_users 
            WHERE bot_id = ? AND user_id = ?
        `);

        return stmt.get(botId, userId) as BotUser | null;
    }

    /**
     * Get active user count for bot
     */
    async getActiveUserCount(botId: string): Promise<number> {
        const stmt = db.prepare(`
            SELECT COUNT(*) as count FROM bot_users 
            WHERE bot_id = ? AND is_active = 1
        `);

        const result = stmt.get(botId) as { count: number };
        return result.count;
    }

    /**
     * Get all active bot-user assignments
     */
    async findAllActive(): Promise<BotUser[]> {
        const stmt = db.prepare('SELECT * FROM bot_users WHERE is_active = 1');
        return stmt.all() as BotUser[];
    }

    /**
     * Bulk assign users to bot
     */
    async bulkAssignUsers(botId: string, userIds: string[], assignedBy: string): Promise<BotUser[]> {
        const results: BotUser[] = [];

        for (const userId of userIds) {
            try {
                // Check if already assigned
                const existing = await this.findByBotAndUserIncludingInactive(botId, userId);

                if (existing) {
                    // Reactivate if inactive
                    if (!existing.is_active) {
                        await this.reactivateUser(botId, userId);
                        results.push({ ...existing, is_active: true });
                    } else {
                        results.push(existing);
                    }
                } else {
                    // Create new assignment
                    const assignment = await this.assignUser(botId, userId, assignedBy);
                    results.push(assignment);
                }
            } catch (error) {
                logger.error('Failed to assign user in bulk', { bot_id: botId, user_id: userId, error });
            }
        }

        return results;
    }

    /**
     * Remove all users from bot
     */
    async removeAllUsers(botId: string): Promise<void> {
        const stmt = db.prepare('DELETE FROM bot_users WHERE bot_id = ?');
        stmt.run(botId);

        logger.info('All users removed from bot', { bot_id: botId });
    }
}

export const botUserRepository = new BotUserRepository();
