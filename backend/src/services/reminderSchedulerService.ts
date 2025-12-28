import cron from 'node-cron';
import { query } from '../database/connection-sqlite';
import googleSheetsService from './googleSheetsService';
import templateEngineService from './templateEngineService';

interface ScheduledReminder {
    id: string;
    cronExpression: string;
    task: cron.ScheduledTask;
}

/**
 * Reminder Scheduler Service
 * Handles scheduling and execution of reminders using node-cron
 */
class ReminderSchedulerService {
    private scheduledReminders: Map<string, ScheduledReminder> = new Map();

    /**
     * Initialize scheduler - load all active reminders from database
     */
    async initialize() {
        try {
            console.log('🔄 Initializing Reminder Scheduler...');

            const reminders = await query(`
                SELECT * FROM reminders 
                WHERE is_active = 1
            `);

            for (const reminder of reminders) {
                await this.scheduleReminder(reminder);
            }

            console.log(`✅ Scheduler initialized with ${reminders.length} active reminders`);
        } catch (error) {
            console.error('❌ Error initializing scheduler:', error);
        }
    }

    /**
     * Schedule a reminder
     */
    async scheduleReminder(reminder: any) {
        try {
            // If already scheduled, remove old schedule first
            if (this.scheduledReminders.has(reminder.id)) {
                this.unscheduleReminder(reminder.id);
            }

            // Create cron task
            const task = cron.schedule(reminder.schedule, async () => {
                await this.executeReminder(reminder.id);
            }, {
                timezone: reminder.timezone || 'Asia/Jakarta',
            });

            this.scheduledReminders.set(reminder.id, {
                id: reminder.id,
                cronExpression: reminder.schedule,
                task,
            });

            console.log(`✅ Scheduled reminder: ${reminder.name} (${reminder.schedule})`);
        } catch (error) {
            console.error(`❌ Error scheduling reminder ${reminder.id}:`, error);
        }
    }

    /**
     * Unschedule a reminder
     */
    unscheduleReminder(reminderId: string) {
        const scheduled = this.scheduledReminders.get(reminderId);
        if (scheduled) {
            scheduled.task.stop();
            this.scheduledReminders.delete(reminderId);
            console.log(`🛑 Unscheduled reminder: ${reminderId}`);
        }
    }

    /**
     * Execute a reminder (fetch data, process template, send message)
     */
    async executeReminder(reminderId: string) {
        try {
            console.log(`⚡ Executing reminder: ${reminderId}`);

            // Get reminder details
            const reminderRows = await query(
                'SELECT * FROM reminders WHERE id = ?',
                [reminderId]
            );

            if (reminderRows.length === 0) {
                console.error(`❌ Reminder ${reminderId} not found`);
                return;
            }

            const reminder = reminderRows[0];

            // Get data source if exists
            let variables: Record<string, any> = {};

            if (reminder.data_source_id) {
                const dataSourceRows = await query(
                    'SELECT * FROM data_sources WHERE id = ?',
                    [reminder.data_source_id]
                );

                if (dataSourceRows.length > 0) {
                    const dataSource = dataSourceRows[0];
                    variables = await this.fetchDataAndGenerateVariables(dataSource, reminder.timezone);
                }
            }

            // Process template
            const templateConfig = JSON.parse(reminder.template_config || '{}');
            const message = templateEngineService.processTemplate(templateConfig.template || '', variables);

            // Send message via WhatsApp
            await this.sendMessage(reminder.bot_id, reminder.target_id, message, templateConfig.image_url);

            // Log execution
            await this.logExecution(reminderId, 'success', message);

            console.log(`✅ Reminder executed successfully: ${reminderId}`);
        } catch (error: any) {
            console.error(`❌ Error executing reminder ${reminderId}:`, error);
            await this.logExecution(reminderId, 'failed', error.message);
        }
    }

    /**
     * Fetch data from Google Sheets and generate variables
     */
    private async fetchDataAndGenerateVariables(dataSource: any, timezone: string): Promise<Record<string, any>> {
        try {
            const config = JSON.parse(dataSource.config || '{}');
            const spreadsheetId = googleSheetsService.extractSpreadsheetId(dataSource.source_url);

            if (!spreadsheetId) {
                throw new Error('Invalid spreadsheet URL');
            }

            // Fetch sheet data
            const sheetNames = config.selectedSheets || [];
            const sheetsData = await googleSheetsService.fetchMultipleSheets(spreadsheetId, sheetNames);

            // Convert to objects
            const dataObjects = sheetsData.map(sheet => ({
                name: sheet.sheetName,
                data: googleSheetsService.convertToObjects(sheet),
            }));

            // Find schedule and tasks sheets
            const scheduleSheet = dataObjects.find(s =>
                s.name.toLowerCase().includes('jadwal') || s.name.toLowerCase().includes('schedule')
            );
            const tasksSheet = dataObjects.find(s =>
                s.name.toLowerCase().includes('tugas') || s.name.toLowerCase().includes('task')
            );

            // Generate academic digest variables
            return templateEngineService.generateAcademicDigestVariables(
                scheduleSheet?.data || [],
                tasksSheet?.data || [],
                timezone
            );
        } catch (error) {
            console.error('Error fetching data:', error);
            return {};
        }
    }

    /**
     * Send message via WhatsApp
     */
    private async sendMessage(botId: string, targetJid: string, message: string, imageUrl?: string) {
        try {
            // Import WhatsApp adapter dynamically to avoid circular dependencies
            const { whatsappAdapter } = await import('../adapters/whatsapp/whatsappAdapter.baileys');

            if (imageUrl) {
                // Send with image
                await whatsappAdapter.sendMessage(botId, targetJid, {
                    type: 'image',
                    media_url: imageUrl,
                    caption: message,
                });
            } else {
                // Send text only
                await whatsappAdapter.sendMessage(botId, targetJid, {
                    type: 'text',
                    content: message,
                });
            }

            console.log(`✅ Message sent to ${targetJid}`);
        } catch (error) {
            console.error('Error sending message:', error);
            throw error;
        }
    }

    /**
     * Log reminder execution
     */
    private async logExecution(reminderId: string, status: 'success' | 'failed', details: string) {
        try {
            await query(`
                INSERT INTO reminder_logs (id, reminder_id, status, executed_at, error_message)
                VALUES (?, ?, ?, datetime('now'), ?)
            `, [require('uuid').v4(), reminderId, status, details]);

            // Update reminder's last_run_at
            await query(`
                UPDATE reminders 
                SET last_run_at = datetime('now'), last_status = ?, run_count = run_count + 1
                WHERE id = ?
            `, [status, reminderId]);
        } catch (error) {
            console.error('Error logging execution:', error);
        }
    }

    /**
     * Execute reminder immediately (for "Send Now" option)
     */
    async executeImmediately(reminderId: string) {
        await this.executeReminder(reminderId);
    }

    /**
     * Get all scheduled reminders
     */
    getScheduledReminders(): ScheduledReminder[] {
        return Array.from(this.scheduledReminders.values());
    }

    /**
     * Stop all scheduled reminders
     */
    stopAll() {
        this.scheduledReminders.forEach(scheduled => {
            scheduled.task.stop();
        });
        this.scheduledReminders.clear();
        console.log('🛑 All reminders stopped');
    }
}

export default new ReminderSchedulerService();
