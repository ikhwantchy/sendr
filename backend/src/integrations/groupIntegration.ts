/**
 * Group Integration - Auto-sync & Command Handling
 * ✅ Syncs groups when bot connects
 * ✅ Listens for #enable_reminder and #disable_reminder commands
 * ✅ Preserves existing auto-reply functionality
 */

import { eventBus } from '../core/events/eventBus';
import { EventType } from '../core/events/types';
import { groupService } from '../modules/group/groupService';
import { whatsappAdapter } from '../adapters/whatsapp/whatsappAdapter.baileys';
import { logger } from '../utils/logger';

/**
 * Initialize group integration
 */
export function initializeGroupIntegration(): void {
    // Sync groups when bot connects
    eventBus.on(EventType.WA_CONNECTED, async (event) => {
        const { bot_id } = event;

        logger.info('Bot connected, syncing groups', { bot_id });

        // Wait a bit for connection to stabilize
        setTimeout(async () => {
            try {
                await groupService.syncGroupsForBot(bot_id);
                logger.info('Groups synced successfully', { bot_id });
            } catch (error: any) {
                logger.error('Failed to sync groups on connection', {
                    bot_id,
                    error: error.message,
                });
            }
        }, 5000); // 5 second delay
    });

    // Listen for group commands
    eventBus.on(EventType.MESSAGE_RECEIVED, async (event) => {
        const { bot_id, message, group_id } = event;

        // Only process group messages
        if (!group_id) {
            return;
        }

        const text = message?.toLowerCase().trim();

        // Check for #enable_reminder command
        if (text === '#enable_reminder') {
            logger.info('Enable reminder command received', {
                bot_id,
                group_id,
            });

            try {
                const response = await groupService.handleEnableCommand(
                    bot_id,
                    group_id,
                    event.contact_id || ''
                );

                // Send response to group
                await whatsappAdapter.sendMessage(bot_id, group_id, {
                    type: 'text',
                    content: response,
                });
            } catch (error: any) {
                logger.error('Failed to handle enable command', {
                    error: error.message,
                });
            }
        }

        // Check for #disable_reminder command
        if (text === '#disable_reminder') {
            logger.info('Disable reminder command received', {
                bot_id,
                group_id,
            });

            try {
                const response = await groupService.handleDisableCommand(
                    bot_id,
                    group_id,
                    event.contact_id || ''
                );

                // Send response to group
                await whatsappAdapter.sendMessage(bot_id, group_id, {
                    type: 'text',
                    content: response,
                });
            } catch (error: any) {
                logger.error('Failed to handle disable command', {
                    error: error.message,
                });
            }
        }
    });

    logger.info('✅ Group integration initialized');
}
