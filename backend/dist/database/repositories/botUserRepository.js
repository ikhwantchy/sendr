"use strict";
/**
 * Bot User Repository
 * Manages user assignments to bots
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.botUserRepository = void 0;
const connection_1 = require("../connection");
const uuid_1 = require("uuid");
const logger_1 = require("../../utils/logger");
class BotUserRepository {
    /**
     * Assign user to bot
     */
    async assignUser(botId, userId, assignedBy) {
        const id = (0, uuid_1.v4)();
        const assignedAt = new Date().toISOString();
        const stmt = connection_1.db.prepare(`
            INSERT INTO bot_users (id, bot_id, user_id, assigned_by, assigned_at, is_active)
            VALUES (?, ?, ?, ?, ?, 1)
        `);
        stmt.run(id, botId, userId, assignedBy, assignedAt);
        logger_1.logger.info('User assigned to bot', { bot_id: botId, user_id: userId, assigned_by: assignedBy });
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
    async removeUser(botId, userId) {
        const stmt = connection_1.db.prepare('DELETE FROM bot_users WHERE bot_id = ? AND user_id = ?');
        stmt.run(botId, userId);
        logger_1.logger.info('User removed from bot', { bot_id: botId, user_id: userId });
    }
    /**
     * Deactivate user access (soft delete)
     */
    async deactivateUser(botId, userId) {
        const stmt = connection_1.db.prepare('UPDATE bot_users SET is_active = 0 WHERE bot_id = ? AND user_id = ?');
        stmt.run(botId, userId);
        logger_1.logger.info('User access deactivated', { bot_id: botId, user_id: userId });
    }
    /**
     * Reactivate user access
     */
    async reactivateUser(botId, userId) {
        const stmt = connection_1.db.prepare('UPDATE bot_users SET is_active = 1 WHERE bot_id = ? AND user_id = ?');
        stmt.run(botId, userId);
        logger_1.logger.info('User access reactivated', { bot_id: botId, user_id: userId });
    }
    /**
     * Find all users for a bot
     */
    async findByBotId(botId) {
        const stmt = connection_1.db.prepare(`
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
        return stmt.all(botId);
    }
    /**
     * Find all bots for a user
     */
    async findByUserId(userId) {
        const stmt = connection_1.db.prepare(`
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
        return stmt.all(userId);
    }
    /**
     * Check if user has access to bot
     */
    async findByBotAndUser(botId, userId) {
        const stmt = connection_1.db.prepare(`
            SELECT * FROM bot_users 
            WHERE bot_id = ? AND user_id = ? AND is_active = 1
        `);
        return stmt.get(botId, userId);
    }
    /**
     * Check if user has access to bot (including inactive)
     */
    async findByBotAndUserIncludingInactive(botId, userId) {
        const stmt = connection_1.db.prepare(`
            SELECT * FROM bot_users 
            WHERE bot_id = ? AND user_id = ?
        `);
        return stmt.get(botId, userId);
    }
    /**
     * Get active user count for bot
     */
    async getActiveUserCount(botId) {
        const stmt = connection_1.db.prepare(`
            SELECT COUNT(*) as count FROM bot_users 
            WHERE bot_id = ? AND is_active = 1
        `);
        const result = stmt.get(botId);
        return result.count;
    }
    /**
     * Get all active bot-user assignments
     */
    async findAllActive() {
        const stmt = connection_1.db.prepare('SELECT * FROM bot_users WHERE is_active = 1');
        return stmt.all();
    }
    /**
     * Bulk assign users to bot
     */
    async bulkAssignUsers(botId, userIds, assignedBy) {
        const results = [];
        for (const userId of userIds) {
            try {
                // Check if already assigned
                const existing = await this.findByBotAndUserIncludingInactive(botId, userId);
                if (existing) {
                    // Reactivate if inactive
                    if (!existing.is_active) {
                        await this.reactivateUser(botId, userId);
                        results.push({ ...existing, is_active: true });
                    }
                    else {
                        results.push(existing);
                    }
                }
                else {
                    // Create new assignment
                    const assignment = await this.assignUser(botId, userId, assignedBy);
                    results.push(assignment);
                }
            }
            catch (error) {
                logger_1.logger.error('Failed to assign user in bulk', { bot_id: botId, user_id: userId, error });
            }
        }
        return results;
    }
    /**
     * Remove all users from bot
     */
    async removeAllUsers(botId) {
        const stmt = connection_1.db.prepare('DELETE FROM bot_users WHERE bot_id = ?');
        stmt.run(botId);
        logger_1.logger.info('All users removed from bot', { bot_id: botId });
    }
}
exports.botUserRepository = new BotUserRepository();
//# sourceMappingURL=botUserRepository.js.map