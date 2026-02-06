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
import { aiSheetUpdaterService } from '../../services/aiSheetUpdaterService';
import { lidPhoneMappingService } from '../../services/lidPhoneMappingService';
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

        logger.info('[AIEngine] handleMessageReceived called', { bot_id, contact_id, from: payload.from, content: payload.content?.substring(0, 30) });

        try {
            // Get bot AI config first to check mode
            const botResult = await query('SELECT ai_config, name FROM bots WHERE id = ?', [bot_id]);
            const aiConfig = botResult.rows.length ? JSON.parse(botResult.rows[0].ai_config || '{}') : {};
            // Silent confirmation for hybrid and data_collection modes
            // Only conversation mode sends "✅ Noted!" confirmation
            const shouldSendConfirmation = aiConfig.mode === 'conversation';

            // ✅ AI Sheet Updater - Process message for auto sheet updates (runs independently)
            // Priority: sender_phone (resolved) > from JID > contact_id
            const senderJid = payload.from || contact_id || '';
            const senderPhone = payload.sender_phone; // Resolved phone from LID
            const sheetResult = await this.processSheetUpdate(bot_id, senderJid, payload.content, payload, senderPhone);

            // Send confirmation for CREATE mode (only in conversation mode)
            if (sheetResult?.success && sheetResult.mode === 'create' && sheetResult.extractedData && shouldSendConfirmation) {
                // Build a natural confirmation message from extracted data
                const dataEntries = Object.entries(sheetResult.extractedData)
                    .filter(([key, value]) => value && !['Phone', 'Timestamp'].includes(key))
                    .map(([key, value]) => `${key}: ${value}`)
                    .join(', ');

                if (dataEntries) {
                    const confirmationMessage = `✅ Noted! ${dataEntries}`;
                    
                    logger.info('[AIEngine] Sending sheet create confirmation', { bot_id, confirmation: confirmationMessage });
                    
                    // Emit event to send confirmation reply
                    await eventBus.emit(EventType.KEYWORD_MATCHED, context, {
                        rule_id: `sheet-confirm-${bot_id}`,
                        rule_name: 'Sheet Create Confirmation',
                        keyword: '@sheet',
                        match_type: 'contains',
                        matched_text: payload.content,
                        actions: [
                            {
                                type: 'SEND_TEXT',
                                config: {
                                    message: confirmationMessage
                                }
                            }
                        ]
                    });
                }
            }

            if (!botResult.rows.length) return;
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

            // ✅ Check if sender is in allowed targets (whitelist) - THIS IS THE PRIMARY CHECK
            const senderJid = context.group_id || contact_id;
            const isAllowed = await this.isTargetAllowed(bot_id, senderJid);

            if (!isAllowed) {
                logger.debug('AI fallback skipped: sender not in whitelist', {
                    bot_id,
                    senderJid,
                    isGroup: !!context.group_id
                });
                return;
            }

            // If we are here, this specific target (group/contact) is allowed.
            // We only block if the bot-level mode is explicitly 'data_collection' (silent mode)
            if (aiConfig.mode === 'data_collection') {
                logger.debug('AI fallback skipped: bot-level silent mode (data_collection)', { bot_id });
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

                    let fallbackMessage = '';

                    if (aiError.message.includes('QUOTA_EXCEEDED')) {
                        fallbackMessage = '⚠️ Maaf, Bot AI sedang mencapai limit harian/menit (Quota Exceeded). Silakan coba lagi nanti atau ganti model ke gemini-1.5-flash di konfigurasi.';
                    } else {
                        // Generic fallback messages that don't expose technical issues
                        const fallbackMessages = [
                            'Hmm, aku lagi agak bingung nih. Bisa diulang pertanyaannya? 🤔',
                            'Waduh, otakku lagi lemot. Coba tanya lagi nanti ya! 😅',
                            'Maaf ya, aku lagi mikir terlalu keras sampai hang. Coba lagi dong! 🙏',
                            'Eh sorry, aku lagi loading. Tanya lagi dalam beberapa saat ya! ⏳'
                        ];
                        fallbackMessage = fallbackMessages[Math.floor(Math.random() * fallbackMessages.length)];
                    }

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

        // 3. Robust Text-based Matching for Mentions (Handles @LID, @Phone, @Name)
        const checkPatterns = [];
        if (lid) checkPatterns.push(`@${lid.replace(/\D/g, '')}`);
        if (phoneNumber) checkPatterns.push(`@${phoneNumber.replace(/\D/g, '')}`);
        if (botName) {
            checkPatterns.push(`@${botName.toLowerCase()}`);
            checkPatterns.push(botName.toLowerCase()); // Plain name match as fallback
        }

        for (const pattern of checkPatterns) {
            if (normalized.includes(pattern)) {
                logger.info('AI Mention detected: Text pattern match', { pattern });
                return true;
            }
        }

        // 4. Generic @bot/@ai mention in text
        if (normalized.includes('@bot') || normalized.includes('@ai')) {
            logger.info('AI Mention detected: Generic @bot/@ai');
            return true;
        }

        return false;
    }

/**
     * Check if target (group/contact) is allowed to use LLM
     */
    private async isTargetAllowed(botId: string, targetJid: string): Promise<boolean> {
        try {
            const result = await query(
                'SELECT id FROM llm_allowed_targets WHERE bot_id = ? AND target_jid = ?',
                [botId, targetJid]
            );

            const isAllowed = result.rows && result.rows.length > 0;

            logger.debug('LLM whitelist check', {
                botId,
                targetJid,
                isAllowed,
                totalAllowed: result.rows?.length || 0
            });

            return isAllowed;
        } catch (error) {
            logger.error('Error checking LLM whitelist', { error, botId, targetJid });
            // Fail-safe: if error, don't allow (prevents accidental bot loops)
            return false;
        }
    }

    /**
     * Process message for AI Sheet Updater
     * Checks if sender matches any configured sheet and updates accordingly
     * Now supports matching by name if phone not found (for LID cases)
     * Returns result for optional confirmation reply
     */
    private async processSheetUpdate(botId: string, senderJid: string, message: string, payload?: MessageReceivedPayload, resolvedPhone?: string): Promise<{ success: boolean; mode?: string; extractedData?: Record<string, string>; message?: string } | null> {
        logger.info('[SheetUpdater] 🔄 Starting processSheetUpdate', { botId, senderJid, message: message?.substring(0, 30), resolvedPhone, senderName: payload?.sender_name });
        
        try {
            // Use resolved phone number if available, otherwise extract from JID
            let phone = resolvedPhone;
            const senderName = payload?.sender_name;
            
            if (!phone) {
                // Check if this is a LID and look up from mapping
                if (senderJid.includes('@lid')) {
                    const lid = senderJid.split('@')[0];
                    logger.info('[SheetUpdater] 🔍 Looking up LID mapping', { botId, lid });
                    const mappedPhone = await lidPhoneMappingService.getPhoneByLid(botId, lid);
                    logger.info('[SheetUpdater] 📱 LID lookup result', { lid, mappedPhone });
                    if (mappedPhone) {
                        phone = mappedPhone;
                        logger.info('[SheetUpdater] Resolved LID to phone from mapping', { lid, phone });
                    } else {
                        // LID not in mapping - will try to match by name in processMessage
                        logger.warn('[SheetUpdater] ⚠️ Unknown LID - will try name match', { 
                            botId, 
                            lid, 
                            senderName,
                            message: message?.substring(0, 30)
                        });
                        // Pass LID as phone, but processMessage will try name match
                        phone = lid;
                    }
                } else if (senderJid.includes('@s.whatsapp.net')) {
                    // Regular phone number format
                    phone = senderJid.split('@')[0];
                } else {
                    phone = senderJid.split('@')[0];
                }
            }
            
            logger.info('[SheetUpdater] Processing message', { botId, phone, resolvedPhone, senderJid, senderName, message: message?.substring(0, 50) });
            
            if (!phone || !message) {
                logger.warn('[SheetUpdater] Missing phone or message, skipping', { phone, message });
                return null;
            }

            logger.info('[SheetUpdater] 🚀 Calling aiSheetUpdaterService.processMessage', { botId, phone, senderName, message: message?.substring(0, 30) });
            
            const result = await aiSheetUpdaterService.processMessage(
                botId,
                phone,
                message,
                senderJid,
                senderName  // Pass sender name for name-based matching
            );

            logger.info('[SheetUpdater] 📊 processMessage result', { result });

            if (result.success) {
                logger.info('📊 AI Sheet Update successful', {
                    botId,
                    phone,
                    classification: result.classification,
                    value: result.updatedValue,
                    mode: result.mode
                });
                
                return {
                    success: true,
                    mode: result.mode,
                    extractedData: result.extractedData,
                    message: result.message
                };
            } else if (result.message !== 'No active sheet updater configs') {
                logger.debug('[SheetUpdater] No update made', { reason: result.message, phone });
            }
            
            return null;
        } catch (error: any) {
            logger.error('AI Sheet Update error', { error: error.message, botId, senderJid });
            return null;
        }
    }
}

export const aiEngine = new AIEngine();
