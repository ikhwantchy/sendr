"use strict";
/**
 * Reminder Scheduler
 * Checks for due reminders and sends them DIRECTLY
 * ✅ Runs every minute
 * ✅ Handles recurring reminders
 * ✅ Updates next_run_at after execution
 * ✅ No queue - sends directly!
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.reminderScheduler = void 0;
const node_cron_1 = __importDefault(require("node-cron"));
const connection_1 = require("../database/connection");
const whatsappAdapter_baileys_1 = require("../adapters/whatsapp/whatsappAdapter.baileys");
const logger_1 = require("../utils/logger");
class ReminderScheduler {
    isRunning = false;
    /**
     * Start the scheduler
     */
    start() {
        // Run every minute
        node_cron_1.default.schedule('* * * * *', async () => {
            if (this.isRunning) {
                logger_1.logger.warn('Reminder scheduler already running, skipping...');
                return;
            }
            this.isRunning = true;
            try {
                await this.checkAndQueueReminders();
            }
            catch (error) {
                logger_1.logger.error('Reminder scheduler error', { error: error.message });
            }
            finally {
                this.isRunning = false;
            }
        });
        logger_1.logger.info('Reminder scheduler started (runs every minute)');
    }
    /**
     * Check for due reminders and queue them
     */
    async checkAndQueueReminders() {
        try {
            // Get all active reminders that are due
            const result = await (0, connection_1.query)(`SELECT * FROM reminders 
                WHERE is_active = 1 
                AND datetime(next_run_at) <= CURRENT_TIMESTAMP 
                ORDER BY next_run_at ASC`);
            const dueReminders = result.rows;
            if (dueReminders.length === 0) {
                return;
            }
            logger_1.logger.info('Found due reminders', { count: dueReminders.length });
            for (const reminder of dueReminders) {
                await this.processReminder(reminder);
            }
        }
        catch (error) {
            logger_1.logger.error('Failed to check reminders', { error: error.message });
        }
    }
    /**
     * Process a single reminder
     */
    async processReminder(reminder) {
        try {
            // Parse template config to check for image
            const templateConfig = JSON.parse(reminder.template_config || '{}');
            const imageUrl = templateConfig.image_url;
            // Split recipients by comma (support multiple groups/contacts)
            const recipients = reminder.recipient.split(',').map((r) => r.trim()).filter((r) => r);
            // Send to each recipient
            for (const recipient of recipients) {
                try {
                    // ✅ Send message DIRECTLY via adapter (no queue!)
                    if (imageUrl) {
                        // Send with image
                        await whatsappAdapter_baileys_1.whatsappAdapter.sendMessage(reminder.bot_id, recipient, {
                            type: 'image',
                            content: reminder.message,
                            media_url: imageUrl,
                        });
                    }
                    else {
                        // Send text only
                        await whatsappAdapter_baileys_1.whatsappAdapter.sendMessage(reminder.bot_id, recipient, {
                            type: 'text',
                            content: reminder.message,
                        });
                    }
                    logger_1.logger.info('Reminder sent to recipient', {
                        reminder_id: reminder.id,
                        recipient: recipient,
                        has_image: !!imageUrl,
                    });
                }
                catch (sendError) {
                    logger_1.logger.error('Failed to send reminder to recipient', {
                        reminder_id: reminder.id,
                        recipient: recipient,
                        error: sendError.message,
                    });
                }
            }
            logger_1.logger.info('Reminder processing completed', {
                reminder_id: reminder.id,
                name: reminder.name,
                recipients_count: recipients.length,
            });
            // Update last_run_at
            await (0, connection_1.query)("UPDATE reminders SET last_run_at = CURRENT_TIMESTAMP WHERE id = ?", [reminder.id]);
            // Calculate next run for recurring reminders
            if (reminder.schedule_type !== 'once') {
                const nextRunAt = this.calculateNextRun(reminder.schedule_type, JSON.parse(reminder.schedule_config));
                if (nextRunAt) {
                    await (0, connection_1.query)('UPDATE reminders SET next_run_at = ? WHERE id = ?', [nextRunAt.toISOString(), reminder.id]);
                    logger_1.logger.info('Reminder rescheduled', {
                        reminder_id: reminder.id,
                        next_run_at: nextRunAt,
                    });
                }
                else {
                    // No more runs, deactivate
                    await (0, connection_1.query)('UPDATE reminders SET is_active = 0 WHERE id = ?', [reminder.id]);
                    logger_1.logger.info('Reminder deactivated (no more runs)', {
                        reminder_id: reminder.id,
                    });
                }
            }
            else {
                // One-time reminder, deactivate
                await (0, connection_1.query)('UPDATE reminders SET is_active = 0 WHERE id = ?', [reminder.id]);
                logger_1.logger.info('One-time reminder completed', {
                    reminder_id: reminder.id,
                });
            }
        }
        catch (error) {
            logger_1.logger.error('Failed to process reminder', {
                reminder_id: reminder.id,
                error: error.message,
            });
        }
    }
    /**
     * Calculate next run time for recurring reminders
     */
    calculateNextRun(scheduleType, config) {
        try {
            const now = new Date();
            if (scheduleType === 'daily') {
                // Daily at specific time
                const [hours, minutes] = config.time.split(':');
                const next = new Date(now);
                next.setHours(parseInt(hours), parseInt(minutes), 0, 0);
                // Schedule for tomorrow
                next.setDate(next.getDate() + 1);
                return next;
            }
            else if (scheduleType === 'weekly') {
                // Weekly on specific days
                const [hours, minutes] = config.time.split(':');
                const targetDays = config.days || [];
                const next = new Date(now);
                next.setHours(parseInt(hours), parseInt(minutes), 0, 0);
                // Find next matching day (starting from tomorrow)
                for (let i = 1; i <= 7; i++) {
                    const checkDate = new Date(next);
                    checkDate.setDate(checkDate.getDate() + i);
                    if (targetDays.includes(checkDate.getDay())) {
                        return checkDate;
                    }
                }
            }
            else if (scheduleType === 'custom') {
                // Custom dates
                const dates = config.dates || [];
                const futureDates = dates
                    .map(d => new Date(d))
                    .filter(d => d > now)
                    .sort((a, b) => a.getTime() - b.getTime());
                if (futureDates.length > 0) {
                    return futureDates[0];
                }
            }
            return null;
        }
        catch (error) {
            logger_1.logger.error('Failed to calculate next run', {
                schedule_type: scheduleType,
                error: error.message,
            });
            return null;
        }
    }
}
exports.reminderScheduler = new ReminderScheduler();
//# sourceMappingURL=reminderScheduler.js.map