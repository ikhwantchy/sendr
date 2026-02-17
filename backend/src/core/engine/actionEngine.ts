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

import { eventBus } from '../events/eventBus';
import {
    EventType,
    BaseEvent,
    KeywordMatchedPayload,
    ActionExecutedPayload,
    ActionFailedPayload,
    ActionConfig,
} from '../events/types';
import { logger } from '../../utils/logger';
import { whatsappAdapter } from '../../adapters/whatsapp/whatsappAdapter.baileys';
import { dataSourceService } from '../../modules/datasource/dataSourceService';
import { templateEngine } from '../../utils/templateEngine';
import googleSheetsService from '../../services/googleSheetsService';
import templateEngineService from '../../services/templateEngineService';
import enhancedTemplateRenderer from '../../services/enhancedTemplateRenderer';
import smartSheetsProcessor from '../../services/smartSheetsProcessor';

class ActionExecutionEngine {
    constructor() {
        this.initialize();
    }

    /**
     * Initialize the action engine
     */
    private initialize(): void {
        // Subscribe to KEYWORD_MATCHED events
        eventBus.subscribe(EventType.KEYWORD_MATCHED, this.handleKeywordMatched.bind(this));

        // Subscribe to REMINDER_TRIGGERED events
        eventBus.subscribe(EventType.REMINDER_TRIGGERED, this.handleReminderTriggered.bind(this));

        logger.info('Action Execution Engine initialized');
    }

    /**
     * Handle KEYWORD_MATCHED event
     */
    private async handleKeywordMatched(event: BaseEvent<KeywordMatchedPayload>): Promise<void> {
        const { context, payload } = event;
        context.source = 'auto_reply'; // Set source for logging

        // Parse actions if it's a string (from database)
        let actions: ActionConfig[] = [];
        if (typeof payload.actions === 'string') {
            try {
                actions = JSON.parse(payload.actions);
            } catch (error) {
                logger.error('Failed to parse actions JSON', {
                    actions: payload.actions,
                    error,
                });
                return;
            }
        } else {
            actions = payload.actions;
        }

        logger.debug('Action Engine processing keyword match', {
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
    private async handleReminderTriggered(event: BaseEvent<any>): Promise<void> {
        const { context, payload } = event;

        logger.debug('Action Engine processing reminder', {
            tenant_id: context.tenant_id,
            bot_id: context.bot_id,
            reminder_id: payload.reminder_id,
        });

        // Execute reminder action (send message)
        const action: ActionConfig = {
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
    private async executeAction(context: any, action: ActionConfig): Promise<void> {
        const startTime = Date.now();

        try {
            logger.info('Executing action', {
                tenant_id: context.tenant_id,
                bot_id: context.bot_id,
                action_type: action.type,
            });

            let result: any;

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
            await eventBus.emit(EventType.ACTION_EXECUTED, context, {
                action_type: action.type,
                action_config: action.config,
                result,
                duration_ms: duration,
            } as ActionExecutedPayload);

            logger.info('Action executed successfully', {
                action_type: action.type,
                duration_ms: duration,
            });
        } catch (error: any) {
            const duration = Date.now() - startTime;

            logger.error('Action execution failed', {
                action_type: action.type,
                error: error.message,
                stack: error.stack,
            });

            // Emit ACTION_FAILED event
            await eventBus.emit(EventType.ACTION_FAILED, context, {
                action_type: action.type,
                action_config: action.config,
                error: error.message,
                stack: error.stack,
            } as ActionFailedPayload);
        }
    }

    /**
     * Execute SEND_TEXT action
     */
    private async executeSendText(context: any, config: any): Promise<any> {
        const { message, variables } = config;

        // Render template with variables
        const renderedMessage = templateEngine.render(message, variables || {});

        // Send message via WhatsApp adapter
        const result = await whatsappAdapter.sendMessage(
            context.bot_id,
            context.contact_id || context.group_id,
            {
                type: 'text',
                content: renderedMessage,
            }
        );

        // Log message to database (non-blocking, won't break if fails)
        this.logMessageToDatabase(context, 'text', renderedMessage, result).catch(err => {
            logger.warn('Failed to log message to database', { error: err.message });
        });

        return result;
    }

    /**
     * Execute SEND_IMAGE action
     */
    private async executeSendImage(context: any, config: any): Promise<any> {
        // Support both naming conventions (backend vs frontend fallback)
        const image_url = config.image_url || config.url;
        const caption = config.caption || config.message;
        const { variables } = config;

        // Render caption template
        const renderedCaption = caption
            ? templateEngine.render(caption, variables || {})
            : undefined;

        // Send image via WhatsApp adapter
        const result = await whatsappAdapter.sendMessage(
            context.bot_id,
            context.contact_id || context.group_id,
            {
                type: 'image',
                media_url: image_url,
                caption: renderedCaption,
            }
        );

        // Log message to database (non-blocking, won't break if fails)
        this.logMessageToDatabase(context, 'image', renderedCaption || '', result, image_url).catch(err => {
            logger.warn('Failed to log message to database', { error: err.message });
        });

        return result;
    }

    /**
     * Execute FETCH_SPREADSHEET action
     */
    private async executeFetchSpreadsheet(context: any, config: any): Promise<any> {
        const { data_source_id, filters, store_as } = config;

        // Fetch data from spreadsheet
        const data = await dataSourceService.fetchData(
            context.tenant_id,
            data_source_id,
            filters || {}
        );

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
    private async executeComposeMessage(context: any, config: any): Promise<any> {
        const { template, data_source_id, variables } = config;

        let data: any = {};

        // Fetch data if data_source_id provided
        if (data_source_id) {
            data = await dataSourceService.fetchData(
                context.tenant_id,
                data_source_id,
                {}
            );
        }

        // Merge with provided variables
        const allVariables = { ...data, ...variables };

        // Render template
        const message = templateEngine.render(template, allVariables);

        // Send composed message
        const result = await whatsappAdapter.sendMessage(
            context.bot_id,
            context.contact_id || context.group_id,
            {
                type: 'text',
                content: message,
            }
        );

        return result;
    }

    /**
     * Execute TRIGGER_REMINDER action
     */
    private async executeTriggerReminder(context: any, config: any): Promise<any> {
        const { reminder_id, delay_seconds } = config;

        // This would typically schedule a job in Bull queue
        // For now, we'll emit an event that the reminder scheduler can handle

        logger.info('Reminder triggered', {
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
    private async executeSendSheetData(context: any, config: any): Promise<any> {
        const {
            spreadsheet_url,
            sheet_name,
            message_template,
            is_digest_mode = true,
            filter_column,
            filter_value,
            filters,
            sort,
            max_rows = 50,
            image_url
        } = config;

        if (!spreadsheet_url) {
            throw new Error('spreadsheet_url is required for SEND_SHEET_DATA action');
        }

        if (!message_template) {
            throw new Error('message_template is required for SEND_SHEET_DATA action');
        }

        // Extract spreadsheet ID from URL
        const spreadsheetId = googleSheetsService.extractSpreadsheetId(spreadsheet_url);
        if (!spreadsheetId) {
            throw new Error(`Invalid Google Sheets URL: ${spreadsheet_url}`);
        }

        logger.info('SEND_SHEET_DATA: Fetching sheet data', {
            spreadsheetId,
            sheet_name: sheet_name || '(auto)',
            is_digest_mode,
            max_rows,
            has_filters: !!(filters?.length || filter_column)
        });

        // 1. Determine which sheet(s) to fetch
        const primarySheetName = sheet_name?.trim() || 'Sheet1';
        const sheetsToFetch = new Set<string>([primarySheetName]);

        // Also detect {{#section "SheetName"}} references in the template
        const sectionRegex = /\{\{\s*#section\s+(?:["']([^"']+)["']|([^\s"'}]+))/g;
        let sMatch;
        while ((sMatch = sectionRegex.exec(message_template)) !== null) {
            const sectionSheet = (sMatch[1] || sMatch[2])?.trim();
            if (sectionSheet) sheetsToFetch.add(sectionSheet);
        }

        // 2. Fetch sheet data
        const allSheets = await googleSheetsService.fetchMultipleSheets(spreadsheetId, Array.from(sheetsToFetch));

        // 3. Convert to objects
        const sheetsData: Record<string, any[]> = {};
        for (const sheet of allSheets) {
            sheetsData[sheet.sheetName] = googleSheetsService.convertToObjects(sheet);
        }

        // 4. Get primary sheet items
        const primaryKey = Object.keys(sheetsData).find(
            k => k.toLowerCase() === primarySheetName.toLowerCase()
        ) || primarySheetName;
        let items = sheetsData[primaryKey] || [];

        logger.info('SEND_SHEET_DATA: Raw data fetched', {
            primarySheet: primaryKey,
            totalRows: items.length,
            allSheets: Object.keys(sheetsData)
        });

        // 5. Apply filters
        const hasAdvancedFilters = filters && Array.isArray(filters) && filters.length > 0;
        const hasSimpleFilter = filter_column && filter_value;

        if (hasAdvancedFilters) {
            // Advanced filters via smartSheetsProcessor
            items = smartSheetsProcessor.processData(items, {
                filters,
                sort: sort || undefined
            });
            logger.info('SEND_SHEET_DATA: Advanced filter applied', { filtered: items.length });
        } else if (hasSimpleFilter) {
            // Simple column=value filter
            items = items.filter(item => {
                const val = String(item[filter_column] || '').trim().toLowerCase();
                return val === String(filter_value).trim().toLowerCase();
            });
            logger.info('SEND_SHEET_DATA: Simple filter applied', {
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
        } else if (is_digest_mode) {
            // DIGEST MODE: All rows → one message via enhancedTemplateRenderer
            const hasModernBlocks = /\{\{\s*#(if|each|group|section|filter)\s/.test(message_template);
            const hasModernSyntax = /\{\{.*(@|==|contains|\|).*\}\}/.test(message_template);

            if (hasModernBlocks || hasModernSyntax) {
                // Enhanced template with {{#each}}, {{#if}}, {{@today}}, etc.
                finalMessage = enhancedTemplateRenderer.render(message_template, {
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
            } else {
                // Simple template - auto-wrap with {{#each}} if not present
                // Build a simple digest: process template for each row
                const lines: string[] = [];
                for (let i = 0; i < items.length; i++) {
                    const rowVars = {
                        ...items[i],
                        '@index': String(i + 1),
                        '@length': String(items.length),
                        '@today': now.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' }),
                        '@todayFull': `${dayNames[now.getDay()]}, ${now.getDate()} ${monthNames[now.getMonth()]} ${now.getFullYear()}`,
                        '@dayName': dayNames[now.getDay()],
                    };
                    lines.push(templateEngineService.processTemplate(message_template, rowVars));
                }
                finalMessage = lines.join('\n');
            }
        } else {
            // NON-DIGEST: Use first row only
            const rowVars = {
                ...items[0],
                '@index': '1',
                '@length': String(items.length),
                '@today': now.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' }),
                '@todayFull': `${dayNames[now.getDay()]}, ${now.getDate()} ${monthNames[now.getMonth()]} ${now.getFullYear()}`,
                '@dayName': dayNames[now.getDay()],
            };
            finalMessage = templateEngineService.processTemplate(message_template, rowVars);
        }

        // Trim and clean up
        finalMessage = finalMessage.replace(/\n{4,}/g, '\n\n\n').trim();

        logger.info('SEND_SHEET_DATA: Message rendered', {
            length: finalMessage.length,
            digest: is_digest_mode,
            rowsUsed: items.length
        });

        // 7. Send via WhatsApp
        const targetJid = context.contact_id || context.group_id;
        let result;

        if (image_url) {
            result = await whatsappAdapter.sendMessage(
                context.bot_id,
                targetJid,
                {
                    type: 'image',
                    media_url: image_url,
                    caption: finalMessage,
                }
            );
        } else {
            result = await whatsappAdapter.sendMessage(
                context.bot_id,
                targetJid,
                {
                    type: 'text',
                    content: finalMessage,
                }
            );
        }

        // Log to database (non-blocking)
        this.logMessageToDatabase(context, image_url ? 'image' : 'text', finalMessage, result, image_url).catch(err => {
            logger.warn('Failed to log sheet data message to database', { error: err.message });
        });

        return result;
    }

    /**
     * Log outbound message to database
     * This is non-blocking and won't break if table doesn't exist
     */
    private async logMessageToDatabase(
        context: any,
        messageType: string,
        content: string,
        result: any,
        mediaUrl?: string
    ): Promise<void> {
        try {
            // Dynamically import query to avoid circular dependencies
            const { query } = await import('../../database/connection');
            const { v4: uuidv4 } = await import('uuid');

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

            logger.debug('Message logged to database', {
                message_id: messageId,
                bot_id: context.bot_id,
                type: messageType
            });
        } catch (error: any) {
            // Silently fail - don't break auto-reply if logging fails
            logger.debug('Could not log message to database', {
                error: error.message,
                reason: 'Table may not exist yet or database error'
            });
        }
    }
}

// Export singleton instance
export const actionEngine = new ActionExecutionEngine();
