"use strict";
/**
 * Group Integration - Auto-sync & Command Handling
 * ✅ Syncs groups when bot connects
 * ✅ Listens for #enable_reminder and #disable_reminder commands
 * ✅ Preserves existing auto-reply functionality
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeGroupIntegration = initializeGroupIntegration;
const eventBus_1 = require("../core/events/eventBus");
const types_1 = require("../core/events/types");
const groupService_1 = require("../modules/group/groupService");
const whatsappAdapter_baileys_1 = require("../adapters/whatsapp/whatsappAdapter.baileys");
const logger_1 = require("../utils/logger");
/**
 * Initialize group integration
 */
function initializeGroupIntegration() {
    // Sync groups when bot connects
    eventBus_1.eventBus.on(types_1.EventType.WA_CONNECTED, async (event) => {
        const { bot_id } = event.context; // <-- FIX: bot_id is in context!
        logger_1.logger.info('Bot connected, syncing groups', { bot_id });
        // Wait a bit for connection to stabilize
        setTimeout(async () => {
            try {
                await groupService_1.groupService.syncGroupsForBot(bot_id);
                logger_1.logger.info('Groups synced successfully', { bot_id });
            }
            catch (error) {
                logger_1.logger.error('Failed to sync groups on connection', {
                    bot_id,
                    error: error.message,
                });
            }
        }, 5000); // 5 second delay
    });
    // Listen for group commands
    eventBus_1.eventBus.on(types_1.EventType.MESSAGE_RECEIVED, async (event) => {
        const { bot_id, message, group_id } = event;
        // Only process group messages
        if (!group_id) {
            return;
        }
        const text = message?.toLowerCase().trim();
        // Check for #enable_reminder command
        if (text === '#enable_reminder') {
            logger_1.logger.info('Enable reminder command received', {
                bot_id,
                group_id,
            });
            try {
                const response = await groupService_1.groupService.handleEnableCommand(bot_id, group_id, event.contact_id || '');
                // Send response to group
                await whatsappAdapter_baileys_1.whatsappAdapter.sendMessage(bot_id, group_id, {
                    type: 'text',
                    content: response,
                });
            }
            catch (error) {
                logger_1.logger.error('Failed to handle enable command', {
                    error: error.message,
                });
            }
        }
        // Check for #disable_reminder command
        if (text === '#disable_reminder') {
            logger_1.logger.info('Disable reminder command received', {
                bot_id,
                group_id,
            });
            try {
                const response = await groupService_1.groupService.handleDisableCommand(bot_id, group_id, event.contact_id || '');
                // Send response to group
                await whatsappAdapter_baileys_1.whatsappAdapter.sendMessage(bot_id, group_id, {
                    type: 'text',
                    content: response,
                });
            }
            catch (error) {
                logger_1.logger.error('Failed to handle disable command', {
                    error: error.message,
                });
            }
        }
    });
    logger_1.logger.info('✅ Group integration initialized');
}
//# sourceMappingURL=groupIntegration.js.map