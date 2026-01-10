/**
 * Reminder Scheduler
 * Checks for due reminders and sends them DIRECTLY
 * ✅ Runs every minute
 * ✅ Handles recurring reminders
 * ✅ Updates next_run_at after execution
 * ✅ No queue - sends directly!
 */

import cron from 'node-cron';
import { query } from '../database/connection';
import { whatsappAdapter } from '../adapters/whatsapp/whatsappAdapter.baileys';
import { logger } from '../utils/logger';

class ReminderScheduler {
    private isRunning = false;

    /**
     * Start the scheduler
     */
    start(): void {
        // Run every minute
        cron.schedule('* * * * *', async () => {
            if (this.isRunning) {
                logger.warn('Reminder scheduler already running, skipping...');
                return;
            }

            this.isRunning = true;

            try {
                await this.checkAndQueueReminders();
            } catch (error: any) {
                logger.error('Reminder scheduler error', { error: error.message });
            } finally {
                this.isRunning = false;
            }
        });

        logger.info('Reminder scheduler started (runs every minute)');
    }

    /**
     * Check for due reminders and queue them
     */
    private async checkAndQueueReminders(): Promise<void> {
        try {
            // Get all active reminders that are due
            const result = await query(
                `SELECT * FROM reminders 
                WHERE is_active = 1 
                AND datetime(next_run_at) <= CURRENT_TIMESTAMP 
                ORDER BY next_run_at ASC`
            );

            const dueReminders = result.rows;

            if (dueReminders.length === 0) {
                return;
            }

            logger.info('Found due reminders', { count: dueReminders.length });

            for (const reminder of dueReminders) {
                await this.processReminder(reminder);
            }
        } catch (error: any) {
            logger.error('Failed to check reminders', { error: error.message });
        }
    }

    /**
     * Process a single reminder
     */
    private async processReminder(reminder: any): Promise<void> {
        try {
            // Parse template config to check for image
            const templateConfig = JSON.parse(reminder.template_config || '{}');
            const imageUrl = templateConfig.image_url;

            // Split recipients by comma (support multiple groups/contacts)
            const recipients = reminder.recipient.split(',').map((r: string) => r.trim()).filter((r: string) => r);

            // Send to each recipient
            for (const recipient of recipients) {
                try {
                    // ✅ Send message DIRECTLY via adapter (no queue!)
                    if (imageUrl) {
                        // Send with image
                        await whatsappAdapter.sendMessage(reminder.bot_id, recipient, {
                            type: 'image',
                            content: reminder.message,
                            media_url: imageUrl,
                        });
                    } else {
                        // Send text only
                        await whatsappAdapter.sendMessage(reminder.bot_id, recipient, {
                            type: 'text',
                            content: reminder.message,
                        });
                    }

                    logger.info('Reminder sent to recipient', {
                        reminder_id: reminder.id,
                        recipient: recipient,
                        has_image: !!imageUrl,
                    });
                } catch (sendError: any) {
                    logger.error('Failed to send reminder to recipient', {
                        reminder_id: reminder.id,
                        recipient: recipient,
                        error: sendError.message,
                    });
                }
            }

            logger.info('Reminder processing completed', {
                reminder_id: reminder.id,
                name: reminder.name,
                recipients_count: recipients.length,
            });

            // Update last_run_at
            await query(
                "UPDATE reminders SET last_run_at = CURRENT_TIMESTAMP WHERE id = ?",
                [reminder.id]
            );

            // Calculate next run for recurring reminders
            if (reminder.schedule_type !== 'once') {
                const nextRunAt = this.calculateNextRun(
                    reminder.schedule_type,
                    JSON.parse(reminder.schedule_config)
                );

                if (nextRunAt) {
                    await query(
                        'UPDATE reminders SET next_run_at = ? WHERE id = ?',
                        [nextRunAt.toISOString(), reminder.id]
                    );

                    logger.info('Reminder rescheduled', {
                        reminder_id: reminder.id,
                        next_run_at: nextRunAt,
                    });
                } else {
                    // No more runs, deactivate
                    await query(
                        'UPDATE reminders SET is_active = 0 WHERE id = ?',
                        [reminder.id]
                    );

                    logger.info('Reminder deactivated (no more runs)', {
                        reminder_id: reminder.id,
                    });
                }
            } else {
                // One-time reminder, deactivate
                await query(
                    'UPDATE reminders SET is_active = 0 WHERE id = ?',
                    [reminder.id]
                );

                logger.info('One-time reminder completed', {
                    reminder_id: reminder.id,
                });
            }
        } catch (error: any) {
            logger.error('Failed to process reminder', {
                reminder_id: reminder.id,
                error: error.message,
            });
        }
    }

    /**
     * Calculate next run time for recurring reminders
     */
    private calculateNextRun(scheduleType: string, config: any): Date | null {
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
            } else if (scheduleType === 'weekly') {
                // Weekly on specific days
                const [hours, minutes] = config.time.split(':');
                const targetDays: number[] = config.days || [];

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
            } else if (scheduleType === 'custom') {
                // Custom dates
                const dates: string[] = config.dates || [];
                const futureDates = dates
                    .map(d => new Date(d))
                    .filter(d => d > now)
                    .sort((a, b) => a.getTime() - b.getTime());

                if (futureDates.length > 0) {
                    return futureDates[0];
                }
            }

            return null;
        } catch (error: any) {
            logger.error('Failed to calculate next run', {
                schedule_type: scheduleType,
                error: error.message,
            });
            return null;
        }
    }
}

export const reminderScheduler = new ReminderScheduler();
