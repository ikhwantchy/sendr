/**
 * Reminder Service - GROUP-BASED ONLY
 * ✅ Only sends to WhatsApp groups
 * ✅ Uses Bull repeatable jobs
 * ✅ Group selection from active groups
 * ❌ NO individual reminders
 */

import { query } from '../../database/connection';
import { messageQueue } from '../../queue/messageQueue';
import { logger } from '../../utils/logger';
import { v4 as uuidv4 } from 'uuid';

export interface ReminderData {
    tenant_id: string;
    bot_id: string;
    name: string;
    message: string;
    group_id: string; // GROUP ID ONLY!
    schedule_type: 'once' | 'daily' | 'weekly';
    schedule_config: any;
}

class ReminderService {
    /**
     * Create a new group reminder
     */
    async createReminder(data: ReminderData): Promise<any> {
        const {
            tenant_id,
            bot_id,
            name,
            message,
            group_id,
            schedule_type,
            schedule_config,
        } = data;

        try {
            // Verify group exists and is active
            const groupResult = await query(
                'SELECT * FROM wa_groups WHERE id = ? AND bot_id = ? AND is_active = 1',
                [group_id, bot_id]
            );

            if (groupResult.rows.length === 0) {
                throw new Error('Group not found or not active');
            }

            const reminderId = uuidv4();

            // Calculate next_run_at
            const nextRunAt = this.calculateNextRun(schedule_type, schedule_config);

            if (!nextRunAt) {
                throw new Error('Invalid schedule configuration');
            }

            // Insert reminder
            await query(
                `INSERT INTO reminders (
                    id, tenant_id, bot_id, name, message, group_id,
                    schedule_type, schedule_config, next_run_at, is_active
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    reminderId,
                    tenant_id,
                    bot_id,
                    name,
                    message,
                    group_id,
                    schedule_type,
                    JSON.stringify(schedule_config),
                    nextRunAt.toISOString(),
                    1,
                ]
            );

            // Schedule with Bull
            await this.scheduleReminder(reminderId, schedule_type, schedule_config, nextRunAt);

            logger.info('Reminder created', {
                reminder_id: reminderId,
                name,
                schedule_type,
                next_run_at: nextRunAt,
            });

            return {
                id: reminderId,
                name,
                schedule_type,
                next_run_at: nextRunAt,
            };
        } catch (error: any) {
            logger.error('Failed to create reminder', { error: error.message });
            throw error;
        }
    }

    /**
     * Schedule reminder with Bull Queue
     */
    private async scheduleReminder(
        reminderId: string,
        scheduleType: string,
        config: any,
        nextRunAt: Date
    ): Promise<void> {
        try {
            if (scheduleType === 'once') {
                // One-time reminder - delay job
                const delay = nextRunAt.getTime() - Date.now();

                await messageQueue.add(
                    'reminder-message',
                    {
                        type: 'reminder',
                        reminder_id: reminderId,
                    },
                    {
                        delay: delay > 0 ? delay : 0,
                        attempts: 3,
                    }
                );
            } else if (scheduleType === 'daily') {
                // Daily reminder - repeatable job
                const [hours, minutes] = config.time.split(':');

                await messageQueue.add(
                    'reminder-message',
                    {
                        type: 'reminder',
                        reminder_id: reminderId,
                    },
                    {
                        repeat: {
                            cron: `${minutes} ${hours} * * *`, // cron pattern
                        },
                        attempts: 3,
                    }
                );
            } else if (scheduleType === 'weekly') {
                // Weekly reminder - repeatable job
                const [hours, minutes] = config.time.split(':');
                const days = config.days.join(','); // e.g., "1,3,5" for Mon,Wed,Fri

                await messageQueue.add(
                    'reminder-message',
                    {
                        type: 'reminder',
                        reminder_id: reminderId,
                    },
                    {
                        repeat: {
                            cron: `${minutes} ${hours} * * ${days}`,
                        },
                        attempts: 3,
                    }
                );
            }

            logger.info('Reminder scheduled with Bull', {
                reminder_id: reminderId,
                schedule_type: scheduleType,
            });
        } catch (error: any) {
            logger.error('Failed to schedule reminder', { error: error.message });
            throw error;
        }
    }

    /**
     * Calculate next run time
     */
    private calculateNextRun(scheduleType: string, config: any): Date | null {
        try {
            const now = new Date();

            if (scheduleType === 'once') {
                return new Date(config.datetime);
            } else if (scheduleType === 'daily') {
                const [hours, minutes] = config.time.split(':');
                const next = new Date(now);
                next.setHours(parseInt(hours), parseInt(minutes), 0, 0);

                if (next <= now) {
                    next.setDate(next.getDate() + 1);
                }

                return next;
            } else if (scheduleType === 'weekly') {
                const [hours, minutes] = config.time.split(':');
                const targetDays: number[] = config.days || [];

                const next = new Date(now);
                next.setHours(parseInt(hours), parseInt(minutes), 0, 0);

                for (let i = 0; i < 7; i++) {
                    const checkDate = new Date(next);
                    checkDate.setDate(checkDate.getDate() + i);

                    if (targetDays.includes(checkDate.getDay()) && checkDate > now) {
                        return checkDate;
                    }
                }
            }

            return null;
        } catch (error: any) {
            logger.error('Failed to calculate next run', { error: error.message });
            return null;
        }
    }

    /**
     * List reminders
     */
    async listReminders(tenantId: string, botId?: string): Promise<any[]> {
        try {
            let sql = `
                SELECT r.*, g.group_name 
                FROM reminders r
                JOIN wa_groups g ON r.group_id = g.id
                WHERE r.tenant_id = ?
            `;
            const params: any[] = [tenantId];

            if (botId) {
                sql += ' AND r.bot_id = ?';
                params.push(botId);
            }

            sql += ' ORDER BY r.next_run_at ASC';

            const result = await query(sql, params);
            return result.rows;
        } catch (error: any) {
            logger.error('Failed to list reminders', { error: error.message });
            throw error;
        }
    }

    /**
     * Get reminder by ID
     */
    async getReminder(reminderId: string): Promise<any> {
        try {
            const result = await query(
                'SELECT * FROM reminders WHERE id = ?',
                [reminderId]
            );

            if (result.rows.length === 0) {
                throw new Error('Reminder not found');
            }

            return result.rows[0];
        } catch (error: any) {
            logger.error('Failed to get reminder', { error: error.message });
            throw error;
        }
    }

    /**
     * Toggle reminder active status
     */
    async toggleReminder(reminderId: string, isActive: boolean): Promise<void> {
        try {
            await query(
                "UPDATE reminders SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                [isActive ? 1 : 0, reminderId]
            );

            logger.info('Reminder toggled', {
                reminder_id: reminderId,
                is_active: isActive,
            });
        } catch (error: any) {
            logger.error('Failed to toggle reminder', { error: error.message });
            throw error;
        }
    }

    /**
     * Delete reminder
     */
    async deleteReminder(reminderId: string): Promise<void> {
        try {
            // TODO: Remove from Bull queue
            await query('DELETE FROM reminders WHERE id = ?', [reminderId]);
            logger.info('Reminder deleted', { reminder_id: reminderId });
        } catch (error: any) {
            logger.error('Failed to delete reminder', { error: error.message });
            throw error;
        }
    }

    /**
     * Update reminder last_run_at
     */
    async updateLastRun(reminderId: string): Promise<void> {
        try {
            await query(
                `UPDATE reminders 
                SET last_run_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP 
                WHERE id = ?`,
                [reminderId]
            );
        } catch (error: any) {
            logger.error('Failed to update last run', { error: error.message });
        }
    }
}

export const reminderService = new ReminderService();
