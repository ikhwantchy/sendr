"use strict";
/**
 * Action Execution Engine
 *
 * Responsibilities:
 * - Subscribe to KEYWORD_MATCHED events
 * - Execute configured actions
 * - Support template variables ({{nama}}, {{tanggal}}, etc.)
 * - Emit ACTION_EXECUTED / ACTION_FAILED events
 *
 * Supported Actions:
 * - SEND_TEXT: Send text message
 * - SEND_IMAGE: Send image with caption
 * - FETCH_SPREADSHEET: Fetch data from spreadsheet
 * - COMPOSE_MESSAGE: Compose message from template + data
 * - TRIGGER_REMINDER: Schedule a reminder
 * - SEND_SHEET_DATA: Fetch Google Sheet data and send as formatted text
 */
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
exports.actionEngine = void 0;
const eventBus_1 = require("../events/eventBus");
const types_1 = require("../events/types");
const logger_1 = require("../../utils/logger");
const whatsappAdapter_baileys_1 = require("../../adapters/whatsapp/whatsappAdapter.baileys");
const dataSourceService_1 = require("../../modules/datasource/dataSourceService");
const templateEngine_1 = require("../../utils/templateEngine");
const googleSheetsService_1 = __importDefault(require("../../services/googleSheetsService"));
const templateEngineService_1 = __importDefault(require("../../services/templateEngineService"));
const enhancedTemplateRenderer_1 = __importDefault(require("../../services/enhancedTemplateRenderer"));
const smartSheetsProcessor_1 = __importDefault(require("../../services/smartSheetsProcessor"));
class ActionExecutionEngine {
    constructor() {
        this.initialize();
    }
    /**
     * Initialize the action engine
     */
    initialize() {
        // Subscribe to KEYWORD_MATCHED events
        eventBus_1.eventBus.subscribe(types_1.EventType.KEYWORD_MATCHED, this.handleKeywordMatched.bind(this));
        // Subscribe to REMINDER_TRIGGERED events
        eventBus_1.eventBus.subscribe(types_1.EventType.REMINDER_TRIGGERED, this.handleReminderTriggered.bind(this));
        logger_1.logger.info('Action Execution Engine initialized');
    }
    /**
     * Handle KEYWORD_MATCHED event
     */
    async handleKeywordMatched(event) {
        const { context, payload } = event;
        context.source = 'auto_reply'; // Set source for logging
        // Parse actions if it's a string (from database)
        let actions = [];
        if (typeof payload.actions === 'string') {
            try {
                actions = JSON.parse(payload.actions);
            }
            catch (error) {
                logger_1.logger.error('Failed to parse actions JSON', {
                    actions: payload.actions,
                    error,
                });
                return;
            }
        }
        else {
            actions = payload.actions;
        }
        logger_1.logger.debug('Action Engine processing keyword match', {
            tenant_id: context.tenant_id,
            bot_id: context.bot_id,
            rule_id: payload.rule_id,
            actions_count: actions.length,
        });
        // Execute actions sequentially
        for (const action of actions) {
            await this.executeAction(context, action);
        }
    }
    /**
     * Handle REMINDER_TRIGGERED event
     */
    async handleReminderTriggered(event) {
        const { context, payload } = event;
        logger_1.logger.debug('Action Engine processing reminder', {
            tenant_id: context.tenant_id,
            bot_id: context.bot_id,
            reminder_id: payload.reminder_id,
        });
        // Execute reminder action (send message)
        const action = {
            type: 'SEND_TEXT',
            config: {
                message: payload.message_template,
                data_source_id: payload.data_source_id,
            },
        };
        await this.executeAction(context, action);
    }
    /**
     * Execute a single action
     */
    async executeAction(context, action) {
        const startTime = Date.now();
        try {
            logger_1.logger.info('Executing action', {
                tenant_id: context.tenant_id,
                bot_id: context.bot_id,
                action_type: action.type,
            });
            let result;
            switch (action.type) {
                case 'SEND_TEXT':
                    result = await this.executeSendText(context, action.config);
                    break;
                case 'SEND_IMAGE':
                    result = await this.executeSendImage(context, action.config);
                    break;
                case 'FETCH_SPREADSHEET':
                    result = await this.executeFetchSpreadsheet(context, action.config);
                    break;
                case 'COMPOSE_MESSAGE':
                    result = await this.executeComposeMessage(context, action.config);
                    break;
                case 'TRIGGER_REMINDER':
                    result = await this.executeTriggerReminder(context, action.config);
                    break;
                case 'SEND_SHEET_DATA':
                    result = await this.executeSendSheetData(context, action.config);
                    break;
                default:
                    throw new Error(`Unknown action type: ${action.type}`);
            }
            const duration = Date.now() - startTime;
            // Emit ACTION_EXECUTED event
            await eventBus_1.eventBus.emit(types_1.EventType.ACTION_EXECUTED, context, {
                action_type: action.type,
                action_config: action.config,
                result,
                duration_ms: duration,
            });
            logger_1.logger.info('Action executed successfully', {
                action_type: action.type,
                duration_ms: duration,
            });
        }
        catch (error) {
            const duration = Date.now() - startTime;
            logger_1.logger.error('Action execution failed', {
                action_type: action.type,
                error: error.message,
                stack: error.stack,
            });
            // Emit ACTION_FAILED event
            await eventBus_1.eventBus.emit(types_1.EventType.ACTION_FAILED, context, {
                action_type: action.type,
                action_config: action.config,
                error: error.message,
                stack: error.stack,
            });
        }
    }
    /**
     * Execute SEND_TEXT action
     */
    async executeSendText(context, config) {
        const { message, variables } = config;
        // Render template with variables
        const renderedMessage = templateEngine_1.templateEngine.render(message, variables || {});
        // Send message via WhatsApp adapter
        const result = await whatsappAdapter_baileys_1.whatsappAdapter.sendMessage(context.bot_id, context.contact_id || context.group_id, {
            type: 'text',
            content: renderedMessage,
        });
        // Log message to database (non-blocking, won't break if fails)
        this.logMessageToDatabase(context, 'text', renderedMessage, result).catch(err => {
            logger_1.logger.warn('Failed to log message to database', { error: err.message });
        });
        return result;
    }
    /**
     * Execute SEND_IMAGE action
     */
    async executeSendImage(context, config) {
        // Support both naming conventions (backend vs frontend fallback)
        const image_url = config.image_url || config.url;
        const caption = config.caption || config.message;
        const { variables } = config;
        // Render caption template
        const renderedCaption = caption
            ? templateEngine_1.templateEngine.render(caption, variables || {})
            : undefined;
        // Send image via WhatsApp adapter
        const result = await whatsappAdapter_baileys_1.whatsappAdapter.sendMessage(context.bot_id, context.contact_id || context.group_id, {
            type: 'image',
            media_url: image_url,
            caption: renderedCaption,
        });
        // Log message to database (non-blocking, won't break if fails)
        this.logMessageToDatabase(context, 'image', renderedCaption || '', result, image_url).catch(err => {
            logger_1.logger.warn('Failed to log message to database', { error: err.message });
        });
        return result;
    }
    /**
     * Execute FETCH_SPREADSHEET action
     */
    async executeFetchSpreadsheet(context, config) {
        const { data_source_id, filters, store_as } = config;
        // Fetch data from spreadsheet
        const data = await dataSourceService_1.dataSourceService.fetchData(context.tenant_id, data_source_id, filters || {});
        // Store in context for next actions
        if (store_as) {
            context.metadata = context.metadata || {};
            context.metadata[store_as] = data;
        }
        return data;
    }
    /**
     * Execute COMPOSE_MESSAGE action
     */
    async executeComposeMessage(context, config) {
        const { template, data_source_id, variables } = config;
        let data = {};
        // Fetch data if data_source_id provided
        if (data_source_id) {
            data = await dataSourceService_1.dataSourceService.fetchData(context.tenant_id, data_source_id, {});
        }
        // Merge with provided variables
        const allVariables = { ...data, ...variables };
        // Render template
        const message = templateEngine_1.templateEngine.render(template, allVariables);
        // Send composed message
        const result = await whatsappAdapter_baileys_1.whatsappAdapter.sendMessage(context.bot_id, context.contact_id || context.group_id, {
            type: 'text',
            content: message,
        });
        return result;
    }
    /**
     * Execute TRIGGER_REMINDER action
     */
    async executeTriggerReminder(context, config) {
        const { reminder_id, delay_seconds } = config;
        // This would typically schedule a job in Bull queue
        // For now, we'll emit an event that the reminder scheduler can handle
        logger_1.logger.info('Reminder triggered', {
            reminder_id,
            delay_seconds,
        });
        return { reminder_id, scheduled: true };
    }
    /**
     * Execute SEND_SHEET_DATA action
     * Fetches data from Google Sheet, applies filters, renders template, sends formatted message
     * Works like the Reminder system but triggered by keywords
     */
    async executeSendSheetData(context, config) {
        const { spreadsheet_url, sheet_name, message_template, is_digest_mode = true, filter_column, filter_value, filters, sort, max_rows = 50, image_url } = config;
        if (!spreadsheet_url) {
            throw new Error('spreadsheet_url is required for SEND_SHEET_DATA action');
        }
        if (!message_template) {
            throw new Error('message_template is required for SEND_SHEET_DATA action');
        }
        // Extract spreadsheet ID from URL
        const spreadsheetId = googleSheetsService_1.default.extractSpreadsheetId(spreadsheet_url);
        if (!spreadsheetId) {
            throw new Error(`Invalid Google Sheets URL: ${spreadsheet_url}`);
        }
        logger_1.logger.info('SEND_SHEET_DATA: Fetching sheet data', {
            spreadsheetId,
            sheet_name: sheet_name || '(auto)',
            is_digest_mode,
            max_rows,
            has_filters: !!(filters?.length || filter_column)
        });
        // 1. Determine which sheet(s) to fetch
        const primarySheetName = sheet_name?.trim() || 'Sheet1';
        const sheetsToFetch = new Set([primarySheetName]);
        // Also detect {{#section "SheetName"}} references in the template
        const sectionRegex = /\{\{\s*#section\s+(?:["']([^"']+)["']|([^\s"'}]+))/g;
        let sMatch;
        while ((sMatch = sectionRegex.exec(message_template)) !== null) {
            const sectionSheet = (sMatch[1] || sMatch[2])?.trim();
            if (sectionSheet)
                sheetsToFetch.add(sectionSheet);
        }
        // 2. Fetch sheet data
        const allSheets = await googleSheetsService_1.default.fetchMultipleSheets(spreadsheetId, Array.from(sheetsToFetch));
        // 3. Convert to objects
        const sheetsData = {};
        for (const sheet of allSheets) {
            sheetsData[sheet.sheetName] = googleSheetsService_1.default.convertToObjects(sheet);
        }
        // 4. Get primary sheet items
        const primaryKey = Object.keys(sheetsData).find(k => k.toLowerCase() === primarySheetName.toLowerCase()) || primarySheetName;
        let items = sheetsData[primaryKey] || [];
        logger_1.logger.info('SEND_SHEET_DATA: Raw data fetched', {
            primarySheet: primaryKey,
            totalRows: items.length,
            allSheets: Object.keys(sheetsData)
        });
        // 5. Apply filters
        const hasAdvancedFilters = filters && Array.isArray(filters) && filters.length > 0;
        const hasSimpleFilter = filter_column && filter_value;
        if (hasAdvancedFilters) {
            // Advanced filters via smartSheetsProcessor
            items = smartSheetsProcessor_1.default.processData(items, {
                filters,
                sort: sort || undefined
            });
            logger_1.logger.info('SEND_SHEET_DATA: Advanced filter applied', { filtered: items.length });
        }
        else if (hasSimpleFilter) {
            // Simple column=value filter
            items = items.filter(item => {
                const val = String(item[filter_column] || '').trim().toLowerCase();
                return val === String(filter_value).trim().toLowerCase();
            });
            logger_1.logger.info('SEND_SHEET_DATA: Simple filter applied', {
                column: filter_column,
                value: filter_value,
                filtered: items.length
            });
        }
        // Apply sorting (if not already done by advanced filters)
        if (sort?.column && !hasAdvancedFilters) {
            const sortCol = sort.column;
            const sortOrder = sort.order === 'desc' ? -1 : 1;
            items.sort((a, b) => {
                const aVal = String(a[sortCol] || '');
                const bVal = String(b[sortCol] || '');
                return aVal.localeCompare(bVal) * sortOrder;
            });
        }
        // Limit rows
        if (items.length > max_rows) {
            items = items.slice(0, max_rows);
        }
        // 6. Render template
        let finalMessage = '';
        const now = new Date();
        const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
        const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
        if (items.length === 0) {
            // No data found - render template without data or show empty message
            finalMessage = '✅ Tidak ada data yang sesuai filter.';
        }
        else if (is_digest_mode) {
            // DIGEST MODE: All rows → one message via enhancedTemplateRenderer
            const hasModernBlocks = /\{\{\s*#(if|each|group|section|filter)\s/.test(message_template);
            const hasModernSyntax = /\{\{.*(@|==|contains|\|).*\}\}/.test(message_template);
            if (hasModernBlocks || hasModernSyntax) {
                // Enhanced template with {{#each}}, {{#if}}, {{@today}}, etc.
                finalMessage = enhancedTemplateRenderer_1.default.render(message_template, {
                    data: items,
                    sheetsData,
                    globalVars: {
                        RUN_TIME: now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
                        TODAY: now.toLocaleDateString('id-ID', {
                            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
                        })
                    },
                    timezone: 'Asia/Jakarta'
                });
            }
            else {
                // Simple template - auto-wrap with {{#each}} if not present
                // Build a simple digest: process template for each row
                const lines = [];
                for (let i = 0; i < items.length; i++) {
                    const rowVars = {
                        ...items[i],
                        '@index': String(i + 1),
                        '@length': String(items.length),
                        '@today': now.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' }),
                        '@todayFull': `${dayNames[now.getDay()]}, ${now.getDate()} ${monthNames[now.getMonth()]} ${now.getFullYear()}`,
                        '@dayName': dayNames[now.getDay()],
                    };
                    lines.push(templateEngineService_1.default.processTemplate(message_template, rowVars));
                }
                finalMessage = lines.join('\n');
            }
        }
        else {
            // NON-DIGEST: Use first row only
            const rowVars = {
                ...items[0],
                '@index': '1',
                '@length': String(items.length),
                '@today': now.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' }),
                '@todayFull': `${dayNames[now.getDay()]}, ${now.getDate()} ${monthNames[now.getMonth()]} ${now.getFullYear()}`,
                '@dayName': dayNames[now.getDay()],
            };
            finalMessage = templateEngineService_1.default.processTemplate(message_template, rowVars);
        }
        // Trim and clean up
        finalMessage = finalMessage.replace(/\n{4,}/g, '\n\n\n').trim();
        logger_1.logger.info('SEND_SHEET_DATA: Message rendered', {
            length: finalMessage.length,
            digest: is_digest_mode,
            rowsUsed: items.length
        });
        // 7. Send via WhatsApp
        const targetJid = context.contact_id || context.group_id;
        let result;
        if (image_url) {
            result = await whatsappAdapter_baileys_1.whatsappAdapter.sendMessage(context.bot_id, targetJid, {
                type: 'image',
                media_url: image_url,
                caption: finalMessage,
            });
        }
        else {
            result = await whatsappAdapter_baileys_1.whatsappAdapter.sendMessage(context.bot_id, targetJid, {
                type: 'text',
                content: finalMessage,
            });
        }
        // Log to database (non-blocking)
        this.logMessageToDatabase(context, image_url ? 'image' : 'text', finalMessage, result, image_url).catch(err => {
            logger_1.logger.warn('Failed to log sheet data message to database', { error: err.message });
        });
        return result;
    }
    /**
     * Log outbound message to database
     * This is non-blocking and won't break if table doesn't exist
     */
    async logMessageToDatabase(context, messageType, content, result, mediaUrl) {
        try {
            // Dynamically import query to avoid circular dependencies
            const { query } = await Promise.resolve().then(() => __importStar(require('../../database/connection')));
            const { v4: uuidv4 } = await Promise.resolve().then(() => __importStar(require('uuid')));
            // Only log if we have necessary context
            if (!context.bot_id || (!context.contact_id && !context.group_id)) {
                return;
            }
            const messageId = uuidv4();
            const recipient = context.contact_id || context.group_id;
            const waMessageId = result?.key?.id || result?.id || null;
            await query(`
                INSERT INTO messages (
                    id, bot_id, wa_message_id, direction, 
                    message_type, content, media_url, source, created_at
                ) VALUES (?, ?, ?, 'outbound', ?, ?, ?, ?, CURRENT_TIMESTAMP)
            `, [
                messageId,
                context.bot_id,
                waMessageId,
                messageType,
                content,
                mediaUrl || null,
                context.source || null,
            ]);
            logger_1.logger.debug('Message logged to database', {
                message_id: messageId,
                bot_id: context.bot_id,
                type: messageType
            });
        }
        catch (error) {
            // Silently fail - don't break auto-reply if logging fails
            logger_1.logger.debug('Could not log message to database', {
                error: error.message,
                reason: 'Table may not exist yet or database error'
            });
        }
    }
}
// Export singleton instance
exports.actionEngine = new ActionExecutionEngine();
//# sourceMappingURL=actionEngine.js.map