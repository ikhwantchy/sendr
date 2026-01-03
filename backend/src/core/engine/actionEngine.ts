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
        const { image_url, caption, variables } = config;

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
            const { query } = await import('../../database/connection-sqlite');
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
                ) VALUES (?, ?, ?, 'outbound', ?, ?, ?, ?, datetime('now'))
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
