"use strict";
/**
 * Group Service - WhatsApp Group Detection & Management
 * ✅ Auto-detect groups where bot is member
 * ✅ Store in wa_groups table
 * ✅ Handle group activation via #enable_reminder
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.groupService = void 0;
const connection_1 = require("../../database/connection");
const whatsappAdapter_baileys_1 = require("../../adapters/whatsapp/whatsappAdapter.baileys");
const logger_1 = require("../../utils/logger");
const uuid_1 = require("uuid");
class GroupService {
    /**
     * Sync groups for a bot
     * Called when bot connects
     */
    async syncGroupsForBot(botId, retryCount = 0) {
        try {
            logger_1.logger.info('Syncing groups for bot', { bot_id: botId, retry: retryCount });
            // 1. Get socket for this bot
            let sock = whatsappAdapter_baileys_1.whatsappAdapter.getSocket(botId);
            // If socket not found, just skip - don't try to re-initialize!
            // Re-initializing creates a duplicate connection which triggers
            // 'connectionReplaced' (440) and disconnects the bot.
            // The normal reconnection flow will handle it.
            if (!sock) {
                if (retryCount < 2) {
                    logger_1.logger.warn('No socket found for bot, waiting before retry...', { bot_id: botId, retry: retryCount });
                    await new Promise(resolve => setTimeout(resolve, 5000));
                    return this.syncGroupsForBot(botId, retryCount + 1);
                }
                logger_1.logger.warn('No socket found for bot after retries, skipping group sync', { bot_id: botId });
                return 0;
            }
            // 2. Fetch groups from WhatsApp
            // For new connections, WhatsApp might take time to index groups.
            // We use a loop for retries here to avoid context loss in recursion
            let groups = {};
            let groupJids = [];
            let fetchRetries = 0;
            const maxFetchRetries = 5;
            while (fetchRetries < maxFetchRetries) {
                try {
                    logger_1.logger.info(`Fetching participating groups (Attempt ${fetchRetries + 1}/${maxFetchRetries})`, { bot_id: botId });
                    groups = await sock.groupFetchAllParticipating();
                    groupJids = Object.keys(groups);
                    if (groupJids.length > 0)
                        break;
                    logger_1.logger.info('No groups found yet, WA might be syncing...', { bot_id: botId });
                }
                catch (fetchErr) {
                    logger_1.logger.warn('Error during group fetch, might be connection transient', {
                        bot_id: botId,
                        error: fetchErr.message,
                        code: fetchErr.output?.statusCode || fetchErr.code
                    });
                    // If connection closed error (428/CB: 428), we should probably stop
                    if (fetchErr.output?.statusCode === 428) {
                        logger_1.logger.error('Connection terminated during group fetch', { bot_id: botId });
                        break;
                    }
                }
                fetchRetries++;
                if (fetchRetries < maxFetchRetries) {
                    await new Promise(resolve => setTimeout(resolve, 3000));
                }
            }
            if (groupJids.length === 0) {
                logger_1.logger.warn('Finished sync attempts, found 0 groups', { bot_id: botId });
                return 0;
            }
            logger_1.logger.info('Fetched groups raw info', {
                bot_id: botId,
                count: groupJids.length,
            });
            // 3. Store each group
            let upsertedCount = 0;
            for (const [groupId, groupData] of Object.entries(groups)) {
                try {
                    const subject = groupData.subject || 'Unnamed Group';
                    await this.upsertGroup(botId, groupId, subject);
                    upsertedCount++;
                }
                catch (err) {
                    logger_1.logger.error(`Failed to upsert group ${groupId}`, { error: err.message });
                }
            }
            logger_1.logger.info('Groups synced successfully', { bot_id: botId, total: groupJids.length, upserted: upsertedCount });
            return groupJids.length;
        }
        catch (error) {
            logger_1.logger.error('Unexpected error during group sync', {
                bot_id: botId,
                error: error.message,
                stack: error.stack
            });
            return 0;
        }
    }
    /**
     * Upsert group into database
     */
    async upsertGroup(botId, groupId, groupName) {
        try {
            // Check if exists
            const existing = await (0, connection_1.query)('SELECT id FROM wa_groups WHERE bot_id = ? AND group_jid = ?', [botId, groupId]);
            if (existing.rows && existing.rows.length > 0) {
                // Update
                await (0, connection_1.query)(`UPDATE wa_groups 
                    SET group_name = ?, last_synced_at = CURRENT_TIMESTAMP 
                    WHERE bot_id = ? AND group_jid = ?`, [groupName, botId, groupId]);
            }
            else {
                // Insert
                const id = (0, uuid_1.v4)();
                await (0, connection_1.query)(`INSERT INTO wa_groups (
                        id, bot_id, group_jid, group_name, is_active, last_synced_at
                    ) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`, [id, botId, groupId, groupName, 1]);
            }
        }
        catch (error) {
            logger_1.logger.error('Failed to upsert group', { error: error.message });
        }
    }
    /**
     * Activate group for reminders
     */
    async activateGroup(botId, groupId) {
        try {
            await (0, connection_1.query)(`UPDATE wa_groups 
                SET is_active = 1, updated_at = CURRENT_TIMESTAMP 
                WHERE bot_id = ? AND group_jid = ?`, [botId, groupId]);
            logger_1.logger.info('Group activated', { bot_id: botId, group_id: groupId });
            return true;
        }
        catch (error) {
            logger_1.logger.error('Failed to activate group', { error: error.message });
            return false;
        }
    }
    /**
     * Deactivate group
     */
    async deactivateGroup(botId, groupId) {
        try {
            await (0, connection_1.query)(`UPDATE wa_groups 
                SET is_active = 0, updated_at = CURRENT_TIMESTAMP 
                WHERE bot_id = ? AND group_jid = ?`, [botId, groupId]);
            logger_1.logger.info('Group deactivated', { bot_id: botId, group_id: groupId });
            return true;
        }
        catch (error) {
            logger_1.logger.error('Failed to deactivate group', { error: error.message });
            return false;
        }
    }
    /**
     * Get active groups for bot
     */
    async getActiveGroups(botId) {
        try {
            const result = await (0, connection_1.query)(`SELECT * FROM wa_groups 
                WHERE bot_id = ? AND is_active = 1 
                ORDER BY group_name ASC`, [botId]);
            return result.rows;
        }
        catch (error) {
            logger_1.logger.error('Failed to get active groups', { error: error.message });
            return [];
        }
    }
    /**
     * Get all groups for bot
     */
    async getAllGroups(botId) {
        try {
            const result = await (0, connection_1.query)('SELECT * FROM wa_groups WHERE bot_id = ? ORDER BY group_name ASC', [botId]);
            return result.rows;
        }
        catch (error) {
            logger_1.logger.error('Failed to get groups', { error: error.message });
            return [];
        }
    }
    /**
     * Handle #enable_reminder command in group
     */
    async handleEnableCommand(botId, groupId, senderId) {
        try {
            // Check if sender is group admin
            const sock = whatsappAdapter_baileys_1.whatsappAdapter.getSocket(botId);
            if (!sock) {
                return 'Bot not connected';
            }
            const groupMetadata = await sock.groupMetadata(groupId);
            const isAdmin = groupMetadata.participants.some((p) => p.id === senderId && (p.admin === 'admin' || p.admin === 'superadmin'));
            if (!isAdmin) {
                return '❌ Only group admins can enable reminders';
            }
            // Activate group
            const success = await this.activateGroup(botId, groupId);
            if (success) {
                return '✅ Reminders enabled for this group!\n\nYou can now schedule reminders from the dashboard.';
            }
            else {
                return '❌ Failed to enable reminders. Please try again.';
            }
        }
        catch (error) {
            logger_1.logger.error('Failed to handle enable command', { error: error.message });
            return '❌ Error: ' + error.message;
        }
    }
    /**
     * Handle #disable_reminder command in group
     */
    async handleDisableCommand(botId, groupId, senderId) {
        try {
            // Check if sender is group admin
            const sock = whatsappAdapter_baileys_1.whatsappAdapter.getSocket(botId);
            if (!sock) {
                return 'Bot not connected';
            }
            const groupMetadata = await sock.groupMetadata(groupId);
            const isAdmin = groupMetadata.participants.some((p) => p.id === senderId && (p.admin === 'admin' || p.admin === 'superadmin'));
            if (!isAdmin) {
                return '❌ Only group admins can disable reminders';
            }
            // Deactivate group
            const success = await this.deactivateGroup(botId, groupId);
            if (success) {
                return '✅ Reminders disabled for this group';
            }
            else {
                return '❌ Failed to disable reminders';
            }
        }
        catch (error) {
            logger_1.logger.error('Failed to handle disable command', { error: error.message });
            return '❌ Error: ' + error.message;
        }
    }
}
exports.groupService = new GroupService();
//# sourceMappingURL=groupService.js.map