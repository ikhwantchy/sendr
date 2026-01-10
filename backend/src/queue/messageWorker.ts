/**
 * Message Queue Worker - STATELESS
 * ✅ Processes campaign & reminder messages
 * ✅ Calls existing WhatsApp adapter ONLY
 * ✅ NO socket creation
 * ✅ Template variable replacement
 */

import { messageQueue } from './messageQueue';
import { v4 as uuidv4 } from 'uuid';
import { whatsappAdapter } from '../adapters/whatsapp/whatsappAdapter.baileys';
import { campaignService } from '../modules/campaign/campaignService';
import { reminderService } from '../modules/reminder/reminderService';
import { query } from '../database/connection';
import { logger } from '../utils/logger';

/**
 * Replace template variables
 * Example: "Hello {{name}}" + {name: "John"} = "Hello John"
 */
function replaceTemplateVariables(template: string, variables: Record<string, string>): string {
    let result = template;

    for (const [key, value] of Object.entries(variables)) {
        const regex = new RegExp(`{{${key}}}`, 'g');
        result = result.replace(regex, value);
    }

    return result;
}

/**
 * Campaign Message Worker
 */
messageQueue.process('campaign-message', async (job) => {
    const { campaign_id, recipient_id, bot_id, phone, template, variables } = job.data;

    logger.info('Processing campaign message', {
        job_id: job.id,
        campaign_id,
        recipient_id,
        phone,
    });

    try {
        // Replace template variables
        const message = replaceTemplateVariables(template, variables);

        // ✅ Call existing adapter (NO socket creation!)
        const result = await whatsappAdapter.sendMessage(bot_id, phone, {
            type: 'text',
            content: message,
        });

        // Log to messages table
        try {
            await query(`
                INSERT INTO messages (
                    id, bot_id, direction, source,
                    message_type, content, created_at
                ) VALUES (?, ?, 'outbound', 'campaign', 'text', ?, CURRENT_TIMESTAMP)
            `, [uuidv4(), bot_id, message]);
        } catch (logError) {
            logger.warn('Failed to log campaign message', { error: logError });
        }

        // Update recipient status
        await campaignService.updateRecipientStatus(recipient_id, 'sent');

        logger.info('Campaign message sent', {
            job_id: job.id,
            recipient_id,
            phone,
        });

        return { success: true, sent_at: new Date().toISOString() };
    } catch (error: any) {
        logger.error('Failed to send campaign message', {
            job_id: job.id,
            recipient_id,
            error: error.message,
        });

        // Update recipient status
        await campaignService.updateRecipientStatus(recipient_id, 'failed', error.message);

        throw error;
    }
});

/**
 * Reminder Message Worker
 */
messageQueue.process('reminder-message', async (job) => {
    const { reminder_id } = job.data;

    logger.info('Processing reminder message', {
        job_id: job.id,
        reminder_id,
    });

    try {
        // Get reminder details
        const reminder = await reminderService.getReminder(reminder_id);

        if (!reminder || !reminder.is_active) {
            logger.warn('Reminder not found or inactive', { reminder_id });
            return { success: false, reason: 'inactive' };
        }

        // Get group details
        const groupResult = await query(
            'SELECT * FROM wa_groups WHERE id = ?',
            [reminder.group_id]
        );

        if (groupResult.rows.length === 0) {
            logger.warn('Group not found', { group_id: reminder.group_id });
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
            } catch (e) { }
        }

        if (!content) content = 'Reminder Executed';

        // ✅ Send to GROUP via adapter (NO socket creation!)
        const result = await whatsappAdapter.sendMessage(reminder.bot_id, group.group_id, {
            type: 'text',
            content: content,
        });

        // Log to messages table
        try {
            await query(`
                INSERT INTO messages (
                    id, bot_id, direction, source,
                    message_type, content, created_at
                ) VALUES (?, ?, 'outbound', 'reminder', 'text', ?, CURRENT_TIMESTAMP)
            `, [uuidv4(), reminder.bot_id, content]);
        } catch (logError) {
            logger.warn('Failed to log reminder message', { error: logError });
        }

        // Update last_run_at
        await reminderService.updateLastRun(reminder_id);

        logger.info('Reminder sent to group', {
            job_id: job.id,
            reminder_id,
            group_id: group.group_id,
            group_name: group.group_name,
        });

        return { success: true, sent_at: new Date().toISOString() };
    } catch (error: any) {
        logger.error('Failed to send reminder', {
            job_id: job.id,
            reminder_id,
            error: error.message,
        });

        throw error;
    }
});

logger.info('✅ Message queue workers initialized', {
    workers: ['campaign-message', 'reminder-message'],
});
