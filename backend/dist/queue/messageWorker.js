"use strict";
/**
 * Message Queue Worker - STATELESS
 * ✅ Processes campaign & reminder messages
 * ✅ Calls existing WhatsApp adapter ONLY
 * ✅ NO socket creation
 * ✅ Template variable replacement
 */
Object.defineProperty(exports, "__esModule", { value: true });
const messageQueue_1 = require("./messageQueue");
const uuid_1 = require("uuid");
const whatsappAdapter_baileys_1 = require("../adapters/whatsapp/whatsappAdapter.baileys");
const campaignService_1 = require("../modules/campaign/campaignService");
const reminderService_1 = require("../modules/reminder/reminderService");
const connection_1 = require("../database/connection");
const logger_1 = require("../utils/logger");
/**
 * Replace template variables
 * Example: "Hello {{name}}" or "Hello [name]" + {name: "John"} = "Hello John"
 */
function replaceTemplateVariables(template, variables) {
    let result = template;
    for (const [key, value] of Object.entries(variables || {})) {
        // Support {{name}}
        const regexCurly = new RegExp(`{{${key}}}`, 'gi');
        result = result.replace(regexCurly, value);
        // Support [name]
        const regexSquare = new RegExp(`\\[${key}\\]`, 'gi');
        result = result.replace(regexSquare, value);
    }
    return result;
}
/**
 * Campaign Message Worker
 */
messageQueue_1.messageQueue.process('campaign-message', async (job) => {
    const { campaign_id, recipient_id, bot_id, phone, template, variables, image_url } = job.data;
    logger_1.logger.info('Processing campaign message', {
        job_id: job.id,
        campaign_id,
        recipient_id,
        phone,
        has_image: !!image_url
    });
    try {
        // Replace template variables
        const message = replaceTemplateVariables(template, variables);
        // ✅ Call existing adapter (NO socket creation!)
        const result = await whatsappAdapter_baileys_1.whatsappAdapter.sendMessage(bot_id, phone, {
            type: image_url ? 'image' : 'text',
            content: image_url ? undefined : message,
            media_url: image_url,
            caption: image_url ? message : undefined
        });
        // Log to messages table
        try {
            await (0, connection_1.query)(`
                INSERT INTO messages (
                    id, bot_id, direction, source,
                    message_type, content, created_at
                ) VALUES (?, ?, 'outbound', 'campaign', ?, ?, CURRENT_TIMESTAMP)
            `, [(0, uuid_1.v4)(), bot_id, image_url ? 'image' : 'text', message]);
        }
        catch (logError) {
            logger_1.logger.warn('Failed to log campaign message', { error: logError });
        }
        // Update recipient status
        await campaignService_1.campaignService.updateRecipientStatus(recipient_id, 'sent');
        logger_1.logger.info('Campaign message sent', {
            job_id: job.id,
            recipient_id,
            phone,
        });
        return { success: true, sent_at: new Date().toISOString() };
    }
    catch (error) {
        logger_1.logger.error('Failed to send campaign message', {
            job_id: job.id,
            recipient_id,
            error: error.message,
        });
        // Update recipient status
        await campaignService_1.campaignService.updateRecipientStatus(recipient_id, 'failed', error.message);
        throw error;
    }
});
/**
 * Reminder Message Worker
 */
messageQueue_1.messageQueue.process('reminder-message', async (job) => {
    const { reminder_id } = job.data;
    logger_1.logger.info('Processing reminder message', {
        job_id: job.id,
        reminder_id,
    });
    try {
        // Get reminder details
        const reminder = await reminderService_1.reminderService.getReminder(reminder_id);
        if (!reminder || !reminder.is_active) {
            logger_1.logger.warn('Reminder not found or inactive', { reminder_id });
            return { success: false, reason: 'inactive' };
        }
        // Get group details
        const groupResult = await (0, connection_1.query)('SELECT * FROM wa_groups WHERE id = ?', [reminder.group_id]);
        if (groupResult.rows.length === 0) {
            logger_1.logger.warn('Group not found', { group_id: reminder.group_id });
            return { success: false, reason: 'group_not_found' };
        }
        const group = groupResult.rows[0];
        // Get exact content from message or template_config
        let content = reminder.message;
        if (!content && reminder.template_config) {
            try {
                const config = typeof reminder.template_config === 'string'
                    ? JSON.parse(reminder.template_config)
                    : reminder.template_config;
                content = config.message || config.text || config.caption;
            }
            catch (e) { }
        }
        if (!content)
            content = 'Reminder Executed';
        // ✅ Send to GROUP via adapter (NO socket creation!)
        const result = await whatsappAdapter_baileys_1.whatsappAdapter.sendMessage(reminder.bot_id, group.group_id, {
            type: 'text',
            content: content,
        });
        // Log to messages table
        try {
            await (0, connection_1.query)(`
                INSERT INTO messages (
                    id, bot_id, direction, source,
                    message_type, content, created_at
                ) VALUES (?, ?, 'outbound', 'reminder', 'text', ?, CURRENT_TIMESTAMP)
            `, [(0, uuid_1.v4)(), reminder.bot_id, content]);
        }
        catch (logError) {
            logger_1.logger.warn('Failed to log reminder message', { error: logError });
        }
        // Update last_run_at
        await reminderService_1.reminderService.updateLastRun(reminder_id);
        logger_1.logger.info('Reminder sent to group', {
            job_id: job.id,
            reminder_id,
            group_id: group.group_id,
            group_name: group.group_name,
        });
        return { success: true, sent_at: new Date().toISOString() };
    }
    catch (error) {
        logger_1.logger.error('Failed to send reminder', {
            job_id: job.id,
            reminder_id,
            error: error.message,
        });
        throw error;
    }
});
logger_1.logger.info('✅ Message queue workers initialized', {
    workers: ['campaign-message', 'reminder-message'],
});
//# sourceMappingURL=messageWorker.js.map