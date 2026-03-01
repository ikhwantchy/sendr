"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const date_fns_1 = require("date-fns");
const node_cron_1 = __importDefault(require("node-cron"));
const connection_1 = require("../database/connection");
const googleSheetsService_1 = __importDefault(require("./googleSheetsService"));
const templateEngineService_1 = __importDefault(require("./templateEngineService"));
const smartSheetsProcessor_1 = __importDefault(require("./smartSheetsProcessor"));
const enhancedTemplateRenderer_1 = __importDefault(require("./enhancedTemplateRenderer"));
/**
 * Reminder Scheduler Service
 * Handles scheduling and execution of reminders using node-cron
 */
class ReminderSchedulerService {
    scheduledReminders = new Map();
    /**
     * Anti-spam delay between messages (randomized to look human-like)
     * WhatsApp can disconnect bots that send too fast
     */
    async antiSpamDelay(minMs = 3000, maxMs = 6000) {
        const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
        console.log(`⏳ Anti-spam delay: ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
    }
    /**
     * Check if bot is still connected before sending
     * Uses a lightweight check that does NOT modify connection state
     */
    async isBotConnected(botId) {
        try {
            const { whatsappAdapter } = await Promise.resolve().then(() => __importStar(require('../adapters/whatsapp/whatsappAdapter.baileys')));
            const status = await whatsappAdapter.getConnectionStatus(botId);
            return status?.status === 'connected';
        }
        catch {
            return false;
        }
    }
    /**
     * Check bot connection before a batch send - only check once, not per-message
     * This avoids excessive status polling that could interfere with the connection
     */
    async ensureBotConnected(botId) {
        const connected = await this.isBotConnected(botId);
        if (!connected) {
            console.error(`❌ Bot ${botId} is not connected. Aborting reminder send.`);
        }
        return connected;
    }
    /**
     * Initialize scheduler - load all active reminders
     */
    async initialize() {
        try {
            const result = await (0, connection_1.query)(`
                SELECT * FROM reminders 
                WHERE is_active = 1
            `);
            console.log(`📅 Loading ${result.rows.length} active reminders...`);
            for (const reminder of result.rows) {
                await this.scheduleReminder(reminder);
            }
            console.log(`✅ Scheduler initialized with ${this.scheduledReminders.size} reminders`);
        }
        catch (error) {
            console.error('Failed to initialize scheduler:', error);
        }
    }
    /**
     * Schedule a reminder
     */
    async scheduleReminder(reminder) {
        try {
            // Unschedule if already scheduled
            this.unscheduleReminder(reminder.id);
            // Skip if schedule is 'now' (one-time immediate execution)
            if (reminder.schedule === 'now') {
                console.log(`⚡ Skipping schedule for immediate reminder: ${reminder.name}`);
                return;
            }
            // Validate cron expression
            if (!node_cron_1.default.validate(reminder.schedule)) {
                console.error(`❌ Invalid cron expression for reminder ${reminder.id}: ${reminder.schedule}`);
                return;
            }
            // Schedule with node-cron
            const task = node_cron_1.default.schedule(reminder.schedule, async () => {
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
                        await (0, connection_1.query)('UPDATE reminders SET next_run_at = ? WHERE id = ?', [nextRunAt, reminder.id]);
                        console.log(`📅 Next run for "${reminder.name}": ${nextRunAt}`);
                    }
                    else {
                        console.error('❌ cron-parser: No valid parse function found', {
                            cpType: typeof cp,
                            parserType: typeof parser,
                            hasParse: typeof parser.parse === 'function',
                            hasParseExpr: typeof parser.parseExpression === 'function'
                        });
                    }
                }
                catch (err) {
                    console.error('Error calculating next run:', err);
                }
            }
            else {
                // Clear next_run_at for "Once" reminders
                await (0, connection_1.query)('UPDATE reminders SET next_run_at = NULL WHERE id = ?', [reminder.id]);
                console.log(`📭 Skipped next_run_at for "Once" reminder: ${reminder.name}`);
            }
            console.log(`✅ Scheduled reminder: ${reminder.name} (${reminder.schedule})`);
        }
        catch (error) {
            console.error(`❌ Error scheduling reminder ${reminder.id}:`, error);
        }
    }
    /**
     * Unschedule a reminder
     */
    unscheduleReminder(reminderId) {
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
    async executeReminder(reminderId) {
        try {
            console.log(`⚡ Executing reminder: ${reminderId}`);
            const result = await (0, connection_1.query)('SELECT * FROM reminders WHERE id = ?', [reminderId]);
            if (result.rows.length === 0) {
                console.error(`❌ Reminder ${reminderId} not found`);
                return;
            }
            const reminder = result.rows[0];
            const templateConfig = JSON.parse(reminder.template_config || '{}');
            const templateText = templateConfig.body || templateConfig.template || '';
            // DEBUG: Log all config
            console.log('🔍 [DEBUG] Reminder config:', {
                id: reminder.id,
                name: reminder.name,
                data_source_id: reminder.data_source_id,
                google_sheets_url: reminder.google_sheets_url,
            });
            console.log('🔍 [DEBUG] Template config:', JSON.stringify(templateConfig, null, 2));
            console.log('🔍 [DEBUG] Template text:', templateText.substring(0, 200));
            // 1. Data Source Logic
            let sheetRows = [];
            let rawSheetsData = {};
            let isFromSheet = false;
            // Handle both legacy dataSourceId and new direct googleSheetsUrl in templateConfig
            const googleSheetsUrl = templateConfig.googleSheetsUrl || reminder.google_sheets_url;
            const spreadsheetId = googleSheetsUrl ? googleSheetsService_1.default.extractSpreadsheetId(googleSheetsUrl) : null;
            console.log('🔍 [DEBUG] googleSheetsUrl:', googleSheetsUrl);
            console.log('🔍 [DEBUG] spreadsheetId:', spreadsheetId);
            if (reminder.data_source_id || (googleSheetsUrl && spreadsheetId)) {
                isFromSheet = true;
                console.log('🔍 [DEBUG] isFromSheet = true, fetching data...');
                try {
                    const result = await this.fetchAndFilterSheetData(reminder, templateConfig, templateText);
                    sheetRows = result.items;
                    rawSheetsData = result.sheetsData;
                    console.log(`📊 Fetched ${sheetRows.length} relevant rows from sheet`);
                    if (sheetRows.length > 0) {
                        console.log('🔍 [DEBUG] First row:', JSON.stringify(sheetRows[0]));
                    }
                }
                catch (err) {
                    console.error('Error in data source pipeline:', err.message);
                    await this.logExecution(reminderId, 'failed', `Data Source Error: ${err.message}`);
                    return;
                }
            }
            else {
                console.log('🔍 [DEBUG] isFromSheet = false (no sheet URL or spreadsheet ID)');
            }
            // 2. Messaging Logic
            if (isFromSheet && !templateConfig.isDigestMode && reminder.target_type === 'contact' && googleSheetsUrl === reminder.target_id) {
                // --- CASE A: Individual Blast from Sheet ---
                console.log('🚀 Starting Individual Blast from Sheet...');
                let successCount = 0;
                let failCount = 0;
                // Check connection once before starting batch
                if (!(await this.ensureBotConnected(reminder.bot_id))) {
                    await this.logExecution(reminderId, 'failed', 'Bot not connected');
                    return;
                }
                for (let i = 0; i < sheetRows.length; i++) {
                    const row = sheetRows[i];
                    const phone = this.extractPhoneNumber(row);
                    if (!phone) {
                        console.warn('⚠️ No phone number found in row, skipping...', row);
                        continue;
                    }
                    const targetJid = phone.includes('@') ? phone : `${phone.replace(/\D/g, '')}@s.whatsapp.net`;
                    const message = templateEngineService_1.default.processTemplate(templateText, row);
                    try {
                        await this.sendMessageWithRetry(reminder.bot_id, targetJid, message, templateConfig.image_url);
                        successCount++;
                    }
                    catch (err) {
                        console.error(`❌ Failed to send to ${targetJid}:`, err.message);
                        failCount++;
                        // If connection error, stop the batch
                        if (err.message?.includes('not connected') || err.message?.includes('not initialized')) {
                            console.error(`❌ Connection lost, aborting remaining ${sheetRows.length - i - 1} sends`);
                            failCount += sheetRows.length - i - 1;
                            break;
                        }
                    }
                    // Anti-spam delay between sends (skip after last message)
                    if (i < sheetRows.length - 1) {
                        await this.antiSpamDelay();
                    }
                }
                await this.logExecution(reminderId, 'success', `Blast completed. Success: ${successCount}, Failed: ${failCount}`);
            }
            else {
                // --- CASE B: Group Message or Single Contact (Standard) ---
                let finalMessage = '';
                if (isFromSheet && templateConfig.isDigestMode) {
                    console.log('🔍 [DEBUG] Digest Mode is ON');
                    // Smarter renderer selection
                    const isModernTemplate = /{{.*(@|==|contains|\|).*}}/.test(templateText);
                    const hasModernBlocks = /\{\{\s*#(if|each|group|section)\s/.test(templateText);
                    console.log('🔍 [DEBUG] isModernTemplate:', isModernTemplate, 'hasModernBlocks:', hasModernBlocks);
                    if (isModernTemplate || hasModernBlocks || !/{{.*#/.test(templateText)) {
                        console.log('🎨 Using enhanced template renderer (Modern/Hybrid)');
                        console.log('🔍 [DEBUG] Passing data to renderer:', sheetRows.length, 'rows');
                        finalMessage = enhancedTemplateRenderer_1.default.render(templateText, {
                            data: sheetRows,
                            sheetsData: rawSheetsData,
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
                        console.log('🔍 [DEBUG] Final message:', finalMessage.substring(0, 300));
                    }
                    else {
                        // Legacy Handlebars path
                        console.log('🎨 Using Handlebars template renderer (Legacy)');
                        const templateRenderingService = require('./templateRenderingService').default;
                        finalMessage = templateRenderingService.renderWithSheetData(templateText, sheetRows);
                    }
                }
                else if (isFromSheet && sheetRows.length > 0) {
                    // Just use the first matching row if not in digest mode but from sheet
                    finalMessage = templateEngineService_1.default.processTemplate(templateText, sheetRows[0]);
                }
                else if (templateConfig.manualContacts && Array.isArray(templateConfig.manualContacts) && templateConfig.manualContacts.length > 0) {
                    // --- CASE C: Manual Contacts with Variables ---
                    console.log('📤 Processing manual contacts with variables...');
                    console.log('📤 Manual contacts data:', JSON.stringify(templateConfig.manualContacts));
                    // Check connection once before starting batch
                    if (!(await this.ensureBotConnected(reminder.bot_id))) {
                        await this.logExecution(reminderId, 'failed', 'Bot not connected');
                        return;
                    }
                    for (let i = 0; i < templateConfig.manualContacts.length; i++) {
                        const contact = templateConfig.manualContacts[i];
                        const targetJid = contact.jid || contact.phone;
                        if (!targetJid)
                            continue;
                        // Process template with contact data (includes Name, Jabatan, etc.)
                        const personalizedMessage = templateEngineService_1.default.processTemplate(templateText, contact);
                        console.log(`📤 Sending to ${targetJid}: "${personalizedMessage}"`);
                        try {
                            await this.sendMessageWithRetry(reminder.bot_id, targetJid, personalizedMessage, templateConfig.image_url);
                        }
                        catch (sendError) {
                            console.error(`❌ Failed to send to ${targetJid}:`, sendError.message);
                            // If connection error, stop the batch
                            if (sendError.message?.includes('not connected') || sendError.message?.includes('not initialized')) {
                                console.error(`❌ Connection lost, aborting remaining sends`);
                                break;
                            }
                        }
                        // Anti-spam delay between sends (skip after last message)
                        if (i < templateConfig.manualContacts.length - 1) {
                            await this.antiSpamDelay();
                        }
                    }
                    await this.logExecution(reminderId, 'success', `Sent to ${templateConfig.manualContacts.length} contacts`);
                    console.log(`✅ Reminder processed successfully: ${reminderId}`);
                    return; // Early return since we already handled everything
                }
                else {
                    // Static message (no variables to replace)
                    finalMessage = templateEngineService_1.default.processTemplate(templateText, {});
                }
                if (!finalMessage) {
                    console.log(`⏭️ Skipping reminder ${reminderId}: Final message is empty (no matching rows?)`);
                    await this.logExecution(reminderId, 'skipped', 'No matching rows found in sheet');
                    return;
                }
                const targetIds = reminder.target_id.split(',');
                for (let i = 0; i < targetIds.length; i++) {
                    const targetJid = targetIds[i].trim();
                    if (!targetJid)
                        continue;
                    try {
                        await this.sendMessageWithRetry(reminder.bot_id, targetJid, finalMessage, templateConfig.image_url);
                    }
                    catch (sendError) {
                        console.error(`❌ Permanent failure sending message to ${targetJid}:`, sendError);
                    }
                    // Anti-spam delay between sends (skip after last message)
                    if (i < targetIds.length - 1) {
                        await this.antiSpamDelay();
                    }
                }
                await this.logExecution(reminderId, 'success', finalMessage);
            }
            console.log(`✅ Reminder processed successfully: ${reminderId}`);
        }
        catch (error) {
            console.error(`❌ Error executing reminder ${reminderId}:`, error);
            try {
                await this.logExecution(reminderId, 'failed', error.message);
            }
            catch { }
        }
    }
    /**
     * Fetch and filter data from Google Sheets (Multi-Sheet Support)
     */
    async fetchAndFilterSheetData(reminder, templateConfig, templateText = '') {
        const googleSheetsUrl = templateConfig.googleSheetsUrl || reminder.google_sheets_url;
        const spreadsheetId = googleSheetsService_1.default.extractSpreadsheetId(googleSheetsUrl);
        if (!spreadsheetId)
            return { items: [], sheetsData: {} };
        // 1. Determine all sheets to fetch
        const primarySheetName = templateConfig.selectedSheets?.[0] || templateConfig.sheetName || 'Sheet1';
        const sheetsToFetch = new Set([primarySheetName]);
        // Detect {{#section "SheetName"}} tags
        const sectionNameRegex = /\{\{\s*#section\s+(?:["']([^"']+)["']|([^\s"'}]+))/g;
        let sMatch;
        while ((sMatch = sectionNameRegex.exec(templateText)) !== null) {
            const sectionSheet = (sMatch[1] || sMatch[2]).trim();
            if (sectionSheet)
                sheetsToFetch.add(sectionSheet);
        }
        console.log(`📋 [Data] Fetching sheets: ${Array.from(sheetsToFetch).join(', ')}`);
        // 2. Fetch all sheets
        const allSheets = await googleSheetsService_1.default.fetchMultipleSheets(spreadsheetId, Array.from(sheetsToFetch));
        // 3. Convert to Objects Map
        const sheetsData = {};
        for (const sheet of allSheets) {
            sheetsData[sheet.sheetName] = googleSheetsService_1.default.convertToObjects(sheet);
        }
        // 4. Get Primary Sheet Data (legacy 'items')
        const primaryKey = Object.keys(sheetsData).find(k => k.toLowerCase() === primarySheetName.toLowerCase()) || primarySheetName;
        const items = sheetsData[primaryKey] || [];
        // 5. Apply Legacy Filtering to Primary Items (if not Advanced Digest)
        const now = new Date();
        const todayStr = (0, date_fns_1.format)(now, 'dd/MM/yyyy');
        const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
        const todayDay = dayNames[now.getDay()];
        const hasAdvancedFilters = templateConfig.filters && Array.isArray(templateConfig.filters) && templateConfig.filters.length > 0;
        const hasSections = /\{\{\s*#section/.test(templateText);
        let filteredItems = items;
        if (templateConfig.isDigestMode && !hasAdvancedFilters && !hasSections) {
            console.log(`📅 [Digest Filter] Today is: ${todayDay} (${todayStr})`);
            filteredItems = items.filter(item => {
                const tipe = String(item.tipe || '').toLowerCase();
                const itemName = String(item.nama || item.name || 'Unknown');
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
                }
                const dateKeys = ['tanggal', 'date', 'deadline', 'waktu', 'due'];
                for (const key of dateKeys) {
                    const val = String(item[key] || '').trim();
                    if (val.includes(todayStr) || val === (0, date_fns_1.format)(now, 'yyyy-MM-dd')) {
                        console.log(`✅ [Filter] DATE "${itemName}" (${val}) → Matches today (${todayStr}) → INCLUDED`);
                        return true;
                    }
                }
                return false;
            });
        }
        else if (hasAdvancedFilters) {
            filteredItems = smartSheetsProcessor_1.default.processData(items, {
                filters: templateConfig.filters,
                sort: templateConfig.sort
            });
        }
        return { items: filteredItems, sheetsData };
    }
    /**
     * Extract phone number from a row object with fuzzy matching
     */
    extractPhoneNumber(row) {
        const possibleColumns = ['phone', 'telp', 'whatsapp', 'number', 'no hp', 'kontak', 'jid'];
        const keys = Object.keys(row);
        for (const col of possibleColumns) {
            // Case-insensitive match or contains
            const key = keys.find(k => k.toLowerCase().includes(col));
            if (key && row[key]) {
                const val = String(row[key]).trim();
                // Basic validation: should have digits
                if (/\d/.test(val))
                    return val;
            }
        }
        return null;
    }
    /**
     * Fetch data from Google Sheets and generate variables (Legacy support)
     */
    async fetchDataAndGenerateVariables(dataSource, timezone) {
        try {
            const config = JSON.parse(dataSource.config || '{}');
            const spreadsheetId = googleSheetsService_1.default.extractSpreadsheetId(dataSource.source_url);
            if (!spreadsheetId) {
                throw new Error('Invalid spreadsheet URL');
            }
            // Fetch sheet data
            const sheetNames = config.selectedSheets || [];
            const sheetsData = await googleSheetsService_1.default.fetchMultipleSheets(spreadsheetId, sheetNames);
            // Convert to objects
            const dataObjects = sheetsData.map(sheet => ({
                name: sheet.sheetName,
                data: googleSheetsService_1.default.convertToObjects(sheet),
            }));
            // Find schedule and tasks sheets
            const scheduleSheet = dataObjects.find(s => s.name.toLowerCase().includes('jadwal') || s.name.toLowerCase().includes('schedule'));
            const tasksSheet = dataObjects.find(s => s.name.toLowerCase().includes('tugas') || s.name.toLowerCase().includes('task'));
            // Generate academic digest variables
            return templateEngineService_1.default.generateAcademicDigestVariables(scheduleSheet?.data || [], tasksSheet?.data || [], timezone);
        }
        catch (error) {
            console.error('Error fetching data:', error);
            return {};
        }
    }
    /**
     * Send message with retry logic for connection issues
     */
    async sendMessageWithRetry(botId, targetJid, message, imageUrl, retryCount = 0) {
        try {
            await this.sendMessage(botId, targetJid, message, imageUrl);
            console.log(`✅ Message sent to ${targetJid}`);
        }
        catch (error) {
            const isConnectionError = error.message?.includes('Closed') ||
                error.message?.includes('Connection') ||
                error.message?.includes('disconnected') ||
                error.output?.statusCode === 428 ||
                error.output?.statusCode === 408;
            if (retryCount < 3 && isConnectionError) {
                const waitTime = (retryCount + 1) * 5000; // 5s, 10s, 15s backoff
                console.warn(`⚠️ Connection issue for bot ${botId}, retry ${retryCount + 1}/3 in ${waitTime / 1000}s...`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
                return this.sendMessageWithRetry(botId, targetJid, message, imageUrl, retryCount + 1);
            }
            throw error;
        }
    }
    /**
     * Send message via WhatsApp
     */
    async sendMessage(botId, targetJid, message, imageUrl) {
        try {
            // Import WhatsApp adapter dynamically to avoid circular dependencies
            const { whatsappAdapter } = await Promise.resolve().then(() => __importStar(require('../adapters/whatsapp/whatsappAdapter.baileys')));
            let result;
            if (imageUrl) {
                // Send with image
                result = await whatsappAdapter.sendMessage(botId, targetJid, {
                    type: 'image',
                    media_url: imageUrl,
                    caption: message,
                });
            }
            else {
                // Send text only
                result = await whatsappAdapter.sendMessage(botId, targetJid, {
                    type: 'text',
                    content: message,
                });
            }
            // Log message to database with source = 'reminder'
            const { v4: uuidv4 } = require('uuid');
            await (0, connection_1.query)(`
                INSERT INTO messages(id, bot_id, wa_message_id, direction, source, message_type, content, created_at)
                VALUES(?, ?, ?, 'outbound', 'reminder', ?, ?, CURRENT_TIMESTAMP)
            `, [
                uuidv4(),
                botId,
                result?.message_id || `reminder_${Date.now()}`,
                imageUrl ? 'image' : 'text',
                message
            ]);
            console.log(`✅ Message sent to ${targetJid}`);
        }
        catch (error) {
            console.error('Error sending message:', error);
            throw error;
        }
    }
    /**
     * Log reminder execution
     */
    async logExecution(reminderId, status, details) {
        try {
            await (0, connection_1.query)(`
                INSERT INTO reminder_logs(id, reminder_id, status, executed_at, error_message)
                VALUES(?, ?, ?, CURRENT_TIMESTAMP, ?)
            `, [require('uuid').v4(), reminderId, status, details]);
            // Get reminder info to check if it's a "Once" type
            const reminderResult = await (0, connection_1.query)('SELECT schedule, timezone FROM reminders WHERE id = ?', [reminderId]);
            if (reminderResult.rows.length === 0)
                return;
            const reminder = reminderResult.rows[0];
            const isOnceReminder = this.isOnceCron(reminder.schedule);
            // Update reminder's last_run_at
            // For "Once" reminders, clear next_run_at after execution
            if (isOnceReminder) {
                await (0, connection_1.query)(`
                    UPDATE reminders 
                    SET last_run_at = CURRENT_TIMESTAMP, last_status = ?, run_count = run_count + 1, next_run_at = NULL
                    WHERE id = ?
                `, [status, reminderId]);
                console.log(`📭 Cleared next_run_at for "Once" reminder: ${reminderId}`);
            }
            else {
                // For recurring reminders, calculate and update next_run_at
                let nextRunAt = null;
                try {
                    const cp = require('cron-parser');
                    const parser = cp.default || cp;
                    const parseFn = parser.parseExpression || parser.parse;
                    if (typeof parseFn === 'function') {
                        const interval = parseFn.call(parser, reminder.schedule, {
                            tz: reminder.timezone || 'Asia/Jakarta'
                        });
                        nextRunAt = interval.next().toISOString();
                        console.log(`📅 Updated next_run_at for "${reminderId}": ${nextRunAt}`);
                    }
                }
                catch (err) {
                    console.error('Error calculating next run after execution:', err);
                }
                await (0, connection_1.query)(`
                    UPDATE reminders 
                    SET last_run_at = CURRENT_TIMESTAMP, last_status = ?, run_count = run_count + 1, next_run_at = ?
                    WHERE id = ?
                `, [status, nextRunAt, reminderId]);
            }
        }
        catch (error) {
            console.error('Error logging execution:', error);
        }
    }
    /**
     * Check if a cron expression represents a "once" execution
     * A "once" cron has specific date/month values (not wildcards)
     */
    isOnceCron(cronExpression) {
        if (!cronExpression || cronExpression === 'now')
            return true;
        // Standard cron format: minute hour day month dayOfWeek
        // "Once" pattern: specific minute, hour, day, and month (e.g., "30 14 19 1 *")
        // "Daily/Weekly" pattern: wildcards in day or month (e.g., "30 14 * * *" or "30 14 * * 1,3,5")
        const parts = cronExpression.trim().split(/\s+/);
        if (parts.length < 5)
            return false;
        const [minute, hour, day, month, dayOfWeek] = parts;
        // If both day AND month are specific numbers (not wildcards), it's a "once" reminder
        const hasSpecificDay = day !== '*' && !day.includes('/') && !day.includes('-') && !day.includes(',');
        const hasSpecificMonth = month !== '*' && !month.includes('/') && !month.includes('-') && !month.includes(',');
        return hasSpecificDay && hasSpecificMonth;
    }
    /**
     * Execute reminder immediately (for "Send Now" option)
     */
    async executeImmediately(reminderId) {
        await this.executeReminder(reminderId);
    }
    /**
     * Get all scheduled reminders
     */
    getScheduledReminders() {
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
exports.default = new ReminderSchedulerService();
//# sourceMappingURL=reminderSchedulerService.js.map