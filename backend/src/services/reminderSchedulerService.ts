import { format } from 'date-fns';
import cron from 'node-cron';
// Robust require for cron-parser
const cronParser = require('cron-parser');
const parseExpression = cronParser.parseExpression || cronParser.default?.parseExpression || (typeof cronParser === 'function' ? cronParser : cronParser.parseExpression);
import { query } from '../database/connection';
import googleSheetsService from './googleSheetsService';
import templateEngineService from './templateEngineService';
import smartSheetsProcessor from './smartSheetsProcessor';
import enhancedTemplateRenderer from './enhancedTemplateRenderer';

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

            const result = await query(`
                SELECT * FROM reminders 
                WHERE is_active = 1
            `);

            const reminders = result.rows || [];

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

            // Skip if schedule is 'now'
            if (reminder.schedule === 'now') {
                console.log(`⚡ Reminder ${reminder.id} is set to 'now', skipping cron registration`);
                return;
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

            // Calculate next run at
            try {
                const interval = parseExpression(reminder.schedule, {
                    tz: reminder.timezone || 'Asia/Jakarta'
                });
                const nextRunAt = interval.next().toISOString();

                await query('UPDATE reminders SET next_run_at = ? WHERE id = ?', [nextRunAt, reminder.id]);
            } catch (err) {
                console.error('Error calculating next run:', err);
            }

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

            const result = await query(
                'SELECT * FROM reminders WHERE id = ?',
                [reminderId]
            );

            if (result.rows.length === 0) {
                console.error(`❌ Reminder ${reminderId} not found`);
                return;
            }

            const reminder = result.rows[0];
            const templateConfig = JSON.parse(reminder.template_config || '{}');
            const templateText = templateConfig.body || templateConfig.template || '';

            // 1. Data Source Logic
            let sheetRows: any[] = [];
            let isFromSheet = false;

            // Handle both legacy dataSourceId and new direct googleSheetsUrl in templateConfig
            const googleSheetsUrl = templateConfig.googleSheetsUrl || reminder.google_sheets_url;
            const spreadsheetId = googleSheetsUrl ? googleSheetsService.extractSpreadsheetId(googleSheetsUrl) : null;

            if (reminder.data_source_id || (googleSheetsUrl && spreadsheetId)) {
                isFromSheet = true;
                try {
                    sheetRows = await this.fetchAndFilterSheetData(reminder, templateConfig);
                    console.log(`📊 Fetched ${sheetRows.length} relevant rows from sheet`);
                } catch (err: any) {
                    console.error('Error in data source pipeline:', err.message);
                    await this.logExecution(reminderId, 'failed', `Data Source Error: ${err.message}`);
                    return;
                }
            }

            // 2. Messaging Logic
            if (isFromSheet && !templateConfig.isDigestMode && reminder.target_type === 'contact' && googleSheetsUrl === reminder.target_id) {
                // --- CASE A: Individual Blast from Sheet ---
                console.log('🚀 Starting Individual Blast from Sheet...');
                let successCount = 0;
                let failCount = 0;

                for (const row of sheetRows) {
                    const phone = this.extractPhoneNumber(row);
                    if (!phone) {
                        console.warn('⚠️ No phone number found in row, skipping...', row);
                        continue;
                    }

                    const targetJid = phone.includes('@') ? phone : `${phone.replace(/\D/g, '')}@s.whatsapp.net`;
                    const message = templateEngineService.processTemplate(templateText, row);

                    try {
                        await this.sendMessageWithRetry(reminder.bot_id, targetJid, message, templateConfig.image_url);
                        successCount++;
                    } catch (err: any) {
                        console.error(`❌ Failed to send to ${targetJid}:`, err.message);
                        failCount++;
                    }
                }

                await this.logExecution(reminderId, 'success', `Blast completed. Success: ${successCount}, Failed: ${failCount}`);
            } else {
                // --- CASE B: Group Message or Single Contact (Standard) ---
                let finalMessage = '';

                if (isFromSheet && templateConfig.isDigestMode) {
                    // Check if template uses new syntax (flexible regex to handle optional whitespace)
                    const usesNewSyntax = /{{\s*#each/.test(templateText) ||
                        /{{\s*#if/.test(templateText) ||
                        /{{\s*#group/.test(templateText);

                    if (usesNewSyntax) {
                        // Use enhanced renderer
                        console.log('🎨 Using enhanced template renderer');
                        finalMessage = enhancedTemplateRenderer.render(templateText, {
                            data: sheetRows,
                            globalVars: {
                                RUN_TIME: new Date().toLocaleTimeString(),
                                TODAY: new Date().toLocaleDateString('id-ID', {
                                    weekday: 'long',
                                    day: 'numeric',
                                    month: 'long'
                                })
                            },
                            timezone: reminder.timezone || 'Asia/Jakarta'
                        });
                    } else {
                        // Use legacy loop-supporting renderer
                        console.log('📝 Using legacy template renderer');
                        finalMessage = templateEngineService.renderGeneralTemplate(templateText, sheetRows, {
                            RUN_TIME: new Date().toLocaleTimeString()
                        });
                    }
                } else if (isFromSheet && sheetRows.length > 0) {
                    // Just use the first matching row if not in digest mode but from sheet
                    finalMessage = templateEngineService.processTemplate(templateText, sheetRows[0]);
                } else {
                    // Static message
                    finalMessage = templateEngineService.processTemplate(templateText, {});
                }

                if (!finalMessage) {
                    console.log(`⏭️ Skipping reminder ${reminderId}: Final message is empty (no matching rows?)`);
                    await this.logExecution(reminderId, 'skipped', 'No matching rows found in sheet');
                    return;
                }

                const targetIds = reminder.target_id.split(',');
                for (const targetJid of targetIds) {
                    if (!targetJid.trim()) continue;
                    try {
                        await this.sendMessageWithRetry(reminder.bot_id, targetJid.trim(), finalMessage, templateConfig.image_url);
                    } catch (sendError: any) {
                        console.error(`❌ Permanent failure sending message to ${targetJid}:`, sendError);
                    }
                }

                await this.logExecution(reminderId, 'success', finalMessage);
            }

            console.log(`✅ Reminder processed successfully: ${reminderId}`);
        } catch (error: any) {
            console.error(`❌ Error executing reminder ${reminderId}:`, error);
            await this.logExecution(reminderId, 'failed', error.message);
        }
    }

    /**
     * Fetch and filter data from Google Sheets
     */
    private async fetchAndFilterSheetData(reminder: any, templateConfig: any): Promise<any[]> {
        const googleSheetsUrl = templateConfig.googleSheetsUrl || reminder.google_sheets_url;
        const spreadsheetId = googleSheetsService.extractSpreadsheetId(googleSheetsUrl);
        if (!spreadsheetId) return [];

        const sheetName = templateConfig.selectedSheets?.[0] || templateConfig.sheetName || 'Sheet1';
        const sheetData = await googleSheetsService.fetchSheetData(spreadsheetId, sheetName);
        if (!sheetData) return [];

        let items = googleSheetsService.convertToObjects(sheetData);
        const now = new Date();
        const todayStr = format(now, 'dd/MM/yyyy');
        const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
        const todayDay = dayNames[now.getDay()];

        // If it's a Daily Digest AND no Advanced Filters, apply legacy "today" filtering
        // If Advanced Filters are enabled, skip this and let Advanced Filters handle everything
        const hasAdvancedFilters = templateConfig.filters && Array.isArray(templateConfig.filters) && templateConfig.filters.length > 0;

        if (templateConfig.isDigestMode && !hasAdvancedFilters) {
            console.log(`📅 [Digest Filter] Today is: ${todayDay} (${todayStr})`);

            const filteredItems = items.filter(item => {
                const tipe = String(item.tipe || '').toLowerCase();
                const itemName = String(item.nama || item.name || 'Unknown');

                // 1. Check for Day Name match (for JADWAL KULIAH)
                if (tipe.includes('jadwal')) {
                    const dayKeys = ['hari', 'day', 'jadwal'];
                    for (const key of dayKeys) {
                        const val = String(item[key] || '').toLowerCase().trim();
                        const todayLower = todayDay.toLowerCase();
                        if (val && (val === todayLower || val.includes(todayLower) || todayLower.includes(val))) {
                            console.log(`✅ [Filter] JADWAL "${itemName}" (${val}) → Matches today (${todayDay}) → INCLUDED`);
                            return true;
                        }
                    }
                    console.log(`❌ [Filter] JADWAL "${itemName}" → Doesn't match today → EXCLUDED`);
                    return false;
                }

                // 2. For other types (including DEADLINE), check if it has a date that matches today
                // NOTE: Advanced date filtering (like "within N days") should be done via Advanced Filters
                const dateKeys = ['tanggal', 'date', 'deadline', 'waktu'];
                for (const key of dateKeys) {
                    const val = String(item[key] || '').trim();
                    if (!val) continue;

                    if (val.includes(todayStr)) {
                        console.log(`✅ [Filter] "${itemName}" → Date matches today → INCLUDED`);
                        return true;
                    }
                    const usToday = format(now, 'M/d/yyyy');
                    const usToday2 = format(now, 'MM/dd/yyyy');
                    if (val.includes(usToday) || val.includes(usToday2)) {
                        console.log(`✅ [Filter] "${itemName}" → Date matches today (US format) → INCLUDED`);
                        return true;
                    }
                }

                console.log(`❌ [Filter] "${itemName}" (type: ${tipe}) → No match → EXCLUDED`);
                return false;
            });
            console.log(`✅ [Digest Filter] Sheets has ${items.length} rows. Filtered down to ${filteredItems.length} valid rows for today.`);
            items = filteredItems;
        }

        // Apply Advanced Filters (New System)
        if (hasAdvancedFilters) {
            console.log(`🔍 Applying ${templateConfig.filters.length} advanced filters...`);

            items = smartSheetsProcessor.processData(items, {
                filters: templateConfig.filters,
                sort: templateConfig.sort,
                limit: templateConfig.limit,
                offset: templateConfig.offset
            });

            console.log(`✅ Filtered to ${items.length} rows`);
            return items;
        }

        // 3. Legacy Filter by Trigger Logic (Backward Compatibility)
        if (templateConfig.triggerColumn && templateConfig.triggerValue) {
            const col = templateConfig.triggerColumn;
            const val = templateConfig.triggerValue.toLowerCase();

            items = items.filter(row => {
                const cellVal = String(row[col] || '').toLowerCase();
                return cellVal === val;
            });

            console.log(`✅ Legacy trigger filter applied: ${items.length} rows`);
        }

        return items;
    }

    /**
     * Extract phone number from a row object with fuzzy matching
     */
    private extractPhoneNumber(row: any): string | null {
        const possibleColumns = ['phone', 'telp', 'whatsapp', 'number', 'no hp', 'kontak', 'jid'];
        const keys = Object.keys(row);

        for (const col of possibleColumns) {
            // Case-insensitive match or contains
            const key = keys.find(k => k.toLowerCase().includes(col));
            if (key && row[key]) {
                const val = String(row[key]).trim();
                // Basic validation: should have digits
                if (/\d/.test(val)) return val;
            }
        }
        return null;
    }

    /**
     * Fetch data from Google Sheets and generate variables (Legacy support)
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
     * Send message with retry logic for connection issues
     */
    private async sendMessageWithRetry(botId: string, targetJid: string, message: string, imageUrl?: string, retryCount = 0) {
        try {
            await this.sendMessage(botId, targetJid, message, imageUrl);
            console.log(`✅ Message sent to ${targetJid}`);
        } catch (error: any) {
            // If connection closed and we haven't retried yet
            if (retryCount < 1 && (error.message?.includes('Closed') || error.output?.statusCode === 428)) {
                console.warn(`⚠️ Connection closed for bot ${botId}, retrying in 3 seconds...`);
                await new Promise(resolve => setTimeout(resolve, 3000));
                return this.sendMessageWithRetry(botId, targetJid, message, imageUrl, retryCount + 1);
            }
            throw error;
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
    private async logExecution(reminderId: string, status: 'success' | 'failed' | 'skipped', details: string) {
        try {
            await query(`
                INSERT INTO reminder_logs (id, reminder_id, status, executed_at, error_message)
                VALUES (?, ?, ?, CURRENT_TIMESTAMP, ?)
            `, [require('uuid').v4(), reminderId, status, details]);

            // Update reminder's last_run_at
            await query(`
                UPDATE reminders 
                SET last_run_at = CURRENT_TIMESTAMP, last_status = ?, run_count = run_count + 1
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
