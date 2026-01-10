/**
 * Group Service - WhatsApp Group Detection & Management
 * ✅ Auto-detect groups where bot is member
 * ✅ Store in wa_groups table
 * ✅ Handle group activation via #enable_reminder
 */

import { query } from '../../database/connection';
import { whatsappAdapter } from '../../adapters/whatsapp/whatsappAdapter.baileys';
import { logger } from '../../utils/logger';
import { v4 as uuidv4 } from 'uuid';

class GroupService {
    /**
     * Sync groups for a bot
     * Called when bot connects
     */
    async syncGroupsForBot(botId: string, retryCount = 0): Promise<void> {
        try {
            logger.info('Syncing groups for bot', { bot_id: botId, retry: retryCount });

            // Get socket for this bot
            const sock = whatsappAdapter.getSocket(botId);
            if (!sock) {
                // Retry up to 3 times with 2 second delay
                if (retryCount < 3) {
                    logger.warn('No socket found for bot, retrying...', { bot_id: botId, retry: retryCount });
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    return this.syncGroupsForBot(botId, retryCount + 1);
                }

                logger.warn('No socket found for bot after retries', { bot_id: botId });
                return;
            }

            // Fetch groups from WhatsApp
            const groups = await sock.groupFetchAllParticipating();

            logger.info('Fetched groups', {
                bot_id: botId,
                count: Object.keys(groups).length,
            });

            // Store each group
            for (const [groupId, groupData] of Object.entries(groups)) {
                await this.upsertGroup(botId, groupId, groupData.subject);
            }

            logger.info('Groups synced successfully', { bot_id: botId, count: Object.keys(groups).length });
        } catch (error: any) {
            logger.error('Failed to sync groups', {
                bot_id: botId,
                error: error.message,
            });
        }
    }

    /**
     * Upsert group into database
     */
    private async upsertGroup(
        botId: string,
        groupId: string,
        groupName: string
    ): Promise<void> {
        try {
            // Check if exists
            const existing = await query(
                'SELECT id FROM wa_groups WHERE bot_id = ? AND group_jid = ?',
                [botId, groupId]
            );

            if (existing.rows && existing.rows.length > 0) {
                // Update
                await query(
                    `UPDATE wa_groups 
                    SET group_name = ?, last_synced_at = CURRENT_TIMESTAMP 
                    WHERE bot_id = ? AND group_jid = ?`,
                    [groupName, botId, groupId]
                );
            } else {
                // Insert
                const id = uuidv4();
                await query(
                    `INSERT INTO wa_groups (
                        id, bot_id, group_jid, group_name, is_active, last_synced_at
                    ) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
                    [id, botId, groupId, groupName, 1]
                );
            }
        } catch (error: any) {
            logger.error('Failed to upsert group', { error: error.message });
        }
    }

    /**
     * Activate group for reminders
     */
    async activateGroup(botId: string, groupId: string): Promise<boolean> {
        try {
            await query(
                `UPDATE wa_groups 
                SET is_active = 1, updated_at = CURRENT_TIMESTAMP 
                WHERE bot_id = ? AND group_jid = ?`,
                [botId, groupId]
            );

            logger.info('Group activated', { bot_id: botId, group_id: groupId });
            return true;
        } catch (error: any) {
            logger.error('Failed to activate group', { error: error.message });
            return false;
        }
    }

    /**
     * Deactivate group
     */
    async deactivateGroup(botId: string, groupId: string): Promise<boolean> {
        try {
            await query(
                `UPDATE wa_groups 
                SET is_active = 0, updated_at = CURRENT_TIMESTAMP 
                WHERE bot_id = ? AND group_jid = ?`,
                [botId, groupId]
            );

            logger.info('Group deactivated', { bot_id: botId, group_id: groupId });
            return true;
        } catch (error: any) {
            logger.error('Failed to deactivate group', { error: error.message });
            return false;
        }
    }

    /**
     * Get active groups for bot
     */
    async getActiveGroups(botId: string): Promise<any[]> {
        try {
            const result = await query(
                `SELECT * FROM wa_groups 
                WHERE bot_id = ? AND is_active = 1 
                ORDER BY group_name ASC`,
                [botId]
            );

            return result.rows;
        } catch (error: any) {
            logger.error('Failed to get active groups', { error: error.message });
            return [];
        }
    }

    /**
     * Get all groups for bot
     */
    async getAllGroups(botId: string): Promise<any[]> {
        try {
            const result = await query(
                'SELECT * FROM wa_groups WHERE bot_id = ? ORDER BY group_name ASC',
                [botId]
            );

            return result.rows;
        } catch (error: any) {
            logger.error('Failed to get groups', { error: error.message });
            return [];
        }
    }

    /**
     * Handle #enable_reminder command in group
     */
    async handleEnableCommand(
        botId: string,
        groupId: string,
        senderId: string
    ): Promise<string> {
        try {
            // Check if sender is group admin
            const sock = whatsappAdapter.getSocket(botId);
            if (!sock) {
                return 'Bot not connected';
            }

            const groupMetadata = await sock.groupMetadata(groupId);
            const isAdmin = groupMetadata.participants.some(
                (p: any) => p.id === senderId && (p.admin === 'admin' || p.admin === 'superadmin')
            );

            if (!isAdmin) {
                return '❌ Only group admins can enable reminders';
            }

            // Activate group
            const success = await this.activateGroup(botId, groupId);

            if (success) {
                return '✅ Reminders enabled for this group!\n\nYou can now schedule reminders from the dashboard.';
            } else {
                return '❌ Failed to enable reminders. Please try again.';
            }
        } catch (error: any) {
            logger.error('Failed to handle enable command', { error: error.message });
            return '❌ Error: ' + error.message;
        }
    }

    /**
     * Handle #disable_reminder command in group
     */
    async handleDisableCommand(
        botId: string,
        groupId: string,
        senderId: string
    ): Promise<string> {
        try {
            // Check if sender is group admin
            const sock = whatsappAdapter.getSocket(botId);
            if (!sock) {
                return 'Bot not connected';
            }

            const groupMetadata = await sock.groupMetadata(groupId);
            const isAdmin = groupMetadata.participants.some(
                (p: any) => p.id === senderId && (p.admin === 'admin' || p.admin === 'superadmin')
            );

            if (!isAdmin) {
                return '❌ Only group admins can disable reminders';
            }

            // Deactivate group
            const success = await this.deactivateGroup(botId, groupId);

            if (success) {
                return '✅ Reminders disabled for this group';
            } else {
                return '❌ Failed to disable reminders';
            }
        } catch (error: any) {
            logger.error('Failed to handle disable command', { error: error.message });
            return '❌ Error: ' + error.message;
        }
    }
}

export const groupService = new GroupService();
