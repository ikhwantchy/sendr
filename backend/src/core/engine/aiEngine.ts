/**
 * AI Engine
 * 
 * Responsibilities:
 * - Subscribe to MESSAGE_RECEIVED for silent data extraction
 * - Subscribe to KEYWORD_NO_MATCH for fallback conversation
 * - Manage AI logic (mentions, hybrid mode, silent mode)
 */

import { eventBus } from '../events/eventBus';
import { EventType, BaseEvent, MessageReceivedPayload } from '../events/types';
import { llmService } from '../../services/llm/llmService';
import { query } from '../../database/connection';
import { logger } from '../../utils/logger';

class AIEngine {
    constructor() {
        this.initialize();
    }

    private initialize() {
        // Subscribe to messages for silent extraction
        eventBus.subscribe(EventType.MESSAGE_RECEIVED, this.handleMessageReceived.bind(this));

        // Subscribe to no-match for fallback conversation
        eventBus.subscribe(EventType.KEYWORD_NO_MATCH, this.handleNoMatch.bind(this));

        logger.info('AI Engine initialized');
    }

    /**
     * Handle every message for potential silent data extraction
     */
    private async handleMessageReceived(event: BaseEvent<MessageReceivedPayload>) {
        const { context, payload } = event;
        const { bot_id, contact_id } = context;

        try {
            // Get bot AI config
            const botResult = await query('SELECT ai_config, name FROM bots WHERE id = ?', [bot_id]);
            if (!botResult.rows.length) return;

            const aiConfig = JSON.parse(botResult.rows[0].ai_config || '{}');
            if (!aiConfig.enabled) return;

            // Mode: data_collection or hybrid -> Extract data silently
            if (aiConfig.mode === 'data_collection' || aiConfig.mode === 'hybrid') {
                if (aiConfig.dataSchema?.enabled) {
                    const result = await llmService.extractData(bot_id, payload.content, contact_id);

                    // If data is complete, we might want to trigger a confirmation or save to sheet
                    if (result.isComplete) {
                        logger.info('AI data extraction complete', { bot_id, contact_id, data: result.extracted });

                        // TODO: Implement Google Sheets saving logic here
                        // For now, emit a notification or internal event
                        await eventBus.emit(EventType.ACTION_EXECUTED, context, {
                            action_type: 'notify',
                            status: 'success',
                            message: '✅ Data collection complete and recorded.'
                        });
                    }
                }
            }
        } catch (error) {
            logger.error('AI handleMessageReceived error', { error, bot_id });
        }
    }

    /**
     * Handle cases where no rules were matched
     */
    private async handleNoMatch(event: BaseEvent<MessageReceivedPayload>) {
        const { context, payload } = event;
        const { bot_id, contact_id } = context;
        const userMessage = payload.content || '';

        logger.info('AI handleNoMatch triggered', { bot_id, contact_id, group_id: context.group_id, content: userMessage });

        try {
            // Get bot AI config
            const botResult = await query('SELECT ai_config, name, phone_number, lid FROM bots WHERE id = ?', [bot_id]);
            if (!botResult.rows.length) return;

            const bot = botResult.rows[0];
            const aiConfig = JSON.parse(bot.ai_config || '{}');

            if (!aiConfig.enabled) {
                logger.debug('AI fallback skipped: disabled', { bot_id });
                return;
            }
            if (aiConfig.mode === 'data_collection') {
                logger.debug('AI fallback skipped: silent mode (data_collection)', { bot_id });
                return;
            }

            // Check if AI should respond (must be mentioned or in hybrid mode)
            const isMentioned = this.isBotMentioned(payload, bot.name, bot.phone_number, bot.lid);
            const isPrivate = !context.group_id;

            logger.info('AI evaluating fallback response', {
                bot_id,
                isPrivate,
                isMentioned,
                message: userMessage.substring(0, 50)
            });

            // Logic: respond if mentioned (@bot / reply) OR always in DM
            if (isMentioned || isPrivate) {
                const conversationPartner = contact_id || payload.from;
                logger.info('🤖 AI generating response...', { bot_id, conversationPartner });

                try {
                    const reply = await llmService.chat(bot_id, userMessage, conversationPartner);

                    // Emit KEYWORD_MATCHED event so Action Engine can send the response
                    await eventBus.emit(EventType.KEYWORD_MATCHED, context, {
                        rule_id: `ai-${bot_id}`,
                        rule_name: 'AI Response',
                        keyword: '@ai',
                        match_type: 'contains',
                        matched_text: userMessage,
                        actions: [
                            {
                                type: 'SEND_TEXT',
                                config: {
                                    message: reply
                                }
                            }
                        ]
                    });
                } catch (aiError: any) {
                    logger.warn('AI failed, sending fallback response', { error: aiError.message, bot_id });

                    // Generic fallback messages that don't expose technical issues
                    const fallbackMessages = [
                        'Hmm, aku lagi agak bingung nih. Bisa diulang pertanyaannya? 🤔',
                        'Waduh, otakku lagi lemot. Coba tanya lagi nanti ya! 😅',
                        'Maaf ya, aku lagi mikir terlalu keras sampai hang. Coba lagi dong! 🙏',
                        'Eh sorry, aku lagi loading. Tanya lagi dalam beberapa saat ya! ⏳'
                    ];

                    // Pick random fallback message
                    const fallbackMessage = fallbackMessages[Math.floor(Math.random() * fallbackMessages.length)];

                    // Send fallback response
                    await eventBus.emit(EventType.KEYWORD_MATCHED, context, {
                        rule_id: `ai-fallback-${bot_id}`,
                        rule_name: 'AI Fallback Response',
                        keyword: '@ai',
                        match_type: 'contains',
                        matched_text: userMessage,
                        actions: [
                            {
                                type: 'SEND_TEXT',
                                config: {
                                    message: fallbackMessage
                                }
                            }
                        ]
                    });
                }
            } else {
                logger.info('AI ignoring message: not mentioned in group', { bot_id, bot_name: bot.name });
            }
        } catch (error) {
            logger.error('AI handleNoMatch error', { error, bot_id });
        }
    }

    /**
     * Check if the bot is mentioned in the message
     */
    private isBotMentioned(payload: MessageReceivedPayload, botName: string, phoneNumber?: string, lid?: string): boolean {
        const message = payload.content || '';
        const mentionedJids = payload.mentioned_jids || [];
        const normalized = message.toLowerCase();

        logger.info('AI Mention check detail', {
            botName,
            phoneNumber,
            lid,
            mentionedJids,
            hasQuote: !!payload.quoted_message,
            quotedParticipant: payload.quoted_message?.participant
        });

        // 1. Check if bot's JID or LID is in the mentionedJid array (VERY ACCURATE)
        if (phoneNumber || lid) {
            const cleanPhone = phoneNumber?.replace(/\D/g, '');
            const cleanLid = lid?.replace(/\D/g, '');

            if (mentionedJids.some(jid => {
                const cleanJid = jid.split('@')[0];
                return (cleanPhone && cleanJid === cleanPhone) || (cleanLid && cleanJid === cleanLid);
            })) {
                logger.info('AI Mention detected: Found in mentioned_jids');
                return true;
            }
        }

        // 2. Check if it's a reply to the bot
        if (payload.quoted_message?.participant && (phoneNumber || lid)) {
            const cleanPhone = phoneNumber?.replace(/\D/g, '');
            const cleanLid = lid?.replace(/\D/g, '');
            const quotedParticipant = payload.quoted_message.participant.split('@')[0];

            if ((cleanPhone && quotedParticipant === cleanPhone) || (cleanLid && quotedParticipant === cleanLid)) {
                logger.info('AI Mention detected: Quoted message reply');
                return true;
            }
        }

        // 3. Special Case: LID mention (common in groups)
        if (mentionedJids.length > 0 && botName) {
            const botNameLower = botName.toLowerCase();
            if (normalized.includes(`@${botNameLower}`)) {
                logger.info('AI Mention detected: Name with @ found with active mentions');
                return true;
            }
        }

        // 4. Check for name mention in text
        if (botName && normalized.includes(botName.toLowerCase())) return true;

        // 5. Check for @name in text
        if (botName && normalized.includes(`@${botName.toLowerCase()}`)) return true;

        // 6. Check for phone number in text
        if (phoneNumber) {
            const cleanPhone = phoneNumber.replace(/\D/g, '');
            if (normalized.includes(cleanPhone)) return true;
        }

        // 7. Check for generic @bot/@ai mention in text
        if (normalized.includes('@bot') || normalized.includes('@ai')) return true;

        return false;
    }
}

export const aiEngine = new AIEngine();
