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
Object.defineProperty(exports, "__esModule", { value: true });
exports.actionEngine = void 0;
const eventBus_1 = require("../events/eventBus");
const types_1 = require("../events/types");
const logger_1 = require("../../utils/logger");
const whatsappAdapter_baileys_1 = require("../../adapters/whatsapp/whatsappAdapter.baileys");
const dataSourceService_1 = require("../../modules/datasource/dataSourceService");
const templateEngine_1 = require("../../utils/templateEngine");
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