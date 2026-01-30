import { format } from 'date-fns';
import cron from 'node-cron';
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
     * Initialize scheduler - load all active reminders
     */
    async initialize() {
        try {
            const result = await query(`
                SELECT * FROM reminders 
                WHERE is_active = 1
            `);

            console.log(`📅 Loading ${result.rows.length} active reminders...`);

            for (const reminder of result.rows) {
                await this.scheduleReminder(reminder);
            }

            console.log(`✅ Scheduler initialized with ${this.scheduledReminders.size} reminders`);
        } catch (error) {
            console.error('Failed to initialize scheduler:', error);
        }
    }

    /**
     * Schedule a reminder
     */
    async scheduleReminder(reminder: any) {
        try {
            // Unschedule if already scheduled
            this.unscheduleReminder(reminder.id);

            // Skip if schedule is 'now' (one-time immediate execution)
            if (reminder.schedule === 'now') {
                console.log(`⚡ Skipping schedule for immediate reminder: ${reminder.name}`);
                return;
            }

            // Validate cron expression
            if (!cron.validate(reminder.schedule)) {
                console.error(`❌ Invalid cron expression for reminder ${reminder.id}: ${reminder.schedule}`);
                return;
            }

            // Schedule with node-cron
            const task = cron.schedule(reminder.schedule, async () => {
                console.log(`⏰ Triggered reminder: ${reminder.name}`);
                await this.executeReminder(reminder.id);
            }, {
                scheduled: true,
                timezone: reminder.timezone || 'Asia/Jakarta'
            });

            this.scheduledReminders.set(reminder.id, {
                id: reminder.id,
                cronExpression: reminder.schedule,
                task,
            });

            // Calculate next run at using cron-parser
            // Skip for "Once" reminders - they don't need a "next run" display
            const isOnceReminder = this.isOnceCron(reminder.schedule);

            if (!isOnceReminder) {
                try {
                    // Dynamic import for cron-parser to avoid TypeScript issues
                    const cp = require('cron-parser');
                    const parser = cp.default || cp;

                    // In v5.x, the main export might be the CronExpressionParser class which has a static .parse() method
                    // instead of the traditional .parseExpression() function
                    const parseFn = parser.parseExpression || parser.parse;

                    if (typeof parseFn === 'function') {
                        const interval = parseFn.call(parser, reminder.schedule, {
                            tz: reminder.timezone || 'Asia/Jakarta'
                        });
                        const nextRunAt = interval.next().toISOString();

                        await query('UPDATE reminders SET next_run_at = ? WHERE id = ?', [nextRunAt, reminder.id]);
                        console.log(`📅 Next run for "${reminder.name}": ${nextRunAt}`);
                    } else {
                        console.error('❌ cron-parser: No valid parse function found', {
                            cpType: typeof cp,
                            parserType: typeof parser,
                            hasParse: typeof parser.parse === 'function',
                            hasParseExpr: typeof parser.parseExpression === 'function'
                        });
                    }
                } catch (err) {
                    console.error('Error calculating next run:', err);
                }
            } else {
                // Clear next_run_at for "Once" reminders
                await query('UPDATE reminders SET next_run_at = NULL WHERE id = ?', [reminder.id]);
                console.log(`📭 Skipped next_run_at for "Once" reminder: ${reminder.name}`);
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
                    // NEW: Smarter renderer selection
                    const isModernTemplate = /{{.*(@|==|contains|\|).*}}/.test(templateText);
                    const hasModernBlocks = /{{\s*#(if|each|group)\s/.test(templateText);

                    if (isModernTemplate || hasModernBlocks || !/{{.*#/.test(templateText)) {
                        console.log('🎨 Using enhanced template renderer (Modern/Hybrid)');
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
                        // Legacy Handlebars path
                        console.log('🎨 Using Handlebars template renderer (Legacy)');
                        const templateRenderingService = require('./templateRenderingService').default;
                        finalMessage = templateRenderingService.renderWithSheetData(templateText, sheetRows);
                    }
                } else if (isFromSheet && sheetRows.length > 0) {
                    // Just use the first matching row if not in digest mode but from sheet
                    finalMessage = templateEngineService.processTemplate(templateText, sheetRows[0]);
                } else if (templateConfig.manualContacts && Array.isArray(templateConfig.manualContacts) && templateConfig.manualContacts.length > 0) {
                    // --- CASE C: Manual Contacts with Variables ---
                    console.log('📤 Processing manual contacts with variables...');
                    console.log('📤 Manual contacts data:', JSON.stringify(templateConfig.manualContacts));
                    
                    for (const contact of templateConfig.manualContacts) {
                        const targetJid = contact.jid || contact.phone;
                        if (!targetJid) continue;
                        
                        // Process template with contact data (includes Name, Jabatan, etc.)
                        const personalizedMessage = templateEngineService.processTemplate(templateText, contact);
                        console.log(`📤 Sending to ${targetJid}: "${personalizedMessage}"`);
                        
                        try {
                            await this.sendMessageWithRetry(reminder.bot_id, targetJid, personalizedMessage, templateConfig.image_url);
                        } catch (sendError: any) {
                            console.error(`❌ Failed to send to ${targetJid}:`, sendError.message);
                        }
                    }
                    
                    await this.logExecution(reminderId, 'success', `Sent to ${templateConfig.manualContacts.length} contacts`);
                    console.log(`✅ Reminder processed successfully: ${reminderId}`);
                    return; // Early return since we already handled everything
                } else {
                    // Static message (no variables to replace)
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

            // Get reminder info to check if it's a "Once" type
            const reminderResult = await query('SELECT schedule FROM reminders WHERE id = ?', [reminderId]);
            const isOnceReminder = reminderResult.rows.length > 0 && this.isOnceCron(reminderResult.rows[0].schedule);

            // Update reminder's last_run_at
            // For "Once" reminders, clear next_run_at after execution
            if (isOnceReminder) {
                await query(`
                    UPDATE reminders 
                    SET last_run_at = CURRENT_TIMESTAMP, last_status = ?, run_count = run_count + 1, next_run_at = NULL
                    WHERE id = ?
                `, [status, reminderId]);
                console.log(`📭 Cleared next_run_at for "Once" reminder: ${reminderId}`);
            } else {
                await query(`
                    UPDATE reminders 
                    SET last_run_at = CURRENT_TIMESTAMP, last_status = ?, run_count = run_count + 1
                    WHERE id = ?
                `, [status, reminderId]);
            }
        } catch (error) {
            console.error('Error logging execution:', error);
        }
    }

    /**
     * Check if a cron expression represents a "once" execution
     * A "once" cron has specific date/month values (not wildcards)
     */
    private isOnceCron(cronExpression: string): boolean {
        if (!cronExpression || cronExpression === 'now') return true;

        // Standard cron format: minute hour day month dayOfWeek
        // "Once" pattern: specific minute, hour, day, and month (e.g., "30 14 19 1 *")
        // "Daily/Weekly" pattern: wildcards in day or month (e.g., "30 14 * * *" or "30 14 * * 1,3,5")

        const parts = cronExpression.trim().split(/\s+/);
        if (parts.length < 5) return false;

        const [minute, hour, day, month, dayOfWeek] = parts;

        // If both day AND month are specific numbers (not wildcards), it's a "once" reminder
        const hasSpecificDay = day !== '*' && !day.includes('/') && !day.includes('-') && !day.includes(',');
        const hasSpecificMonth = month !== '*' && !month.includes('/') && !month.includes('-') && !month.includes(',');

        return hasSpecificDay && hasSpecificMonth;
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
