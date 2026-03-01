import { inboxRepository, InboxConversation, InboxMessage } from '../database/repositories/inboxRepository';
import { socketService } from './socketService';
import { logger } from '../utils/logger';
import { eventBus } from '../core/events/eventBus';
import { EventType } from '../core/events/types';

export class InboxService {
    constructor() {
        // Subscribe to incoming messages globally
        eventBus.subscribe(EventType.MESSAGE_RECEIVED, async (event: any) => {
            try {
                const { context, payload } = event;

                const isGroup = payload.is_group;
                const finalContactName = isGroup ? (payload.group_name || 'Group Chat') : payload.sender_name;
                const finalSenderName = isGroup ? payload.sender_name : undefined;

                await this.handleIncomingMessage(
                    context.tenant_id,
                    context.bot_id,
                    payload.from || context.contact_id || 'Unknown',
                    finalContactName,
                    payload.wa_message_id || `msg_${Date.now()}`,
                    payload.content || '',
                    payload.message_type || 'text',
                    finalSenderName,
                    payload.media_meta
                );
            } catch (error) {
                logger.error('[InboxService] Error in MESSAGE_RECEIVED handler', error);
            }
        });

        // Subscribe to outgoing messages globally (sync bot replies and blasts to inbox)
        eventBus.subscribe(EventType.MESSAGE_SENT, async (event: any) => {
            try {
                const { context, payload } = event;

                // Ensure it's not a duplicate (e.g. sent via our agents which might save differently)
                if (payload.wa_message_id) {
                    const existing = await inboxRepository.findMessageByMessageId(payload.wa_message_id);
                    if (existing) return;
                }

                const isGroup = payload.is_group;
                const contactNumber = context.contact_id || payload.to || 'Unknown';
                // Find conversation - if it exists, save the message
                let conversation = await inboxRepository.findConversationByContact(context.bot_id, contactNumber);

                // Only create the conversation room automatically if there's actually a message
                // Or if it doesn't exist, we might create it but typical outward marketing blasts
                // might clutter the inbox if they never replied. We'll create it for completeness.
                if (!conversation) {
                    conversation = await inboxRepository.createConversation({
                        tenant_id: context.tenant_id,
                        bot_id: context.bot_id,
                        contact_number: contactNumber,
                        contact_name: payload.group_name || contactNumber,
                        status: 'open',
                    });
                }

                await this.saveOutgoingMessage(
                    conversation.id,
                    payload.wa_message_id || `msg_${Date.now()}`,
                    payload.content || '',
                    'bot',
                    undefined,
                    payload.message_type || 'text',
                    payload.sender_name || 'Bot'
                );
            } catch (error) {
                logger.error('[InboxService] Error in MESSAGE_SENT handler', error);
            }
        });
    }

    /**
     * Handle incoming messages from providers (Baileys/Meta)
     */
    async handleIncomingMessage(
        tenantId: string,
        botId: string,
        contactNumber: string,
        contactName: string | undefined,
        messageId: string,
        content: string,
        messageType: string = 'text',
        senderName?: string,
        mediaMeta?: any
    ): Promise<InboxMessage> {
        try {
            // Log interaction if needed
            logger.debug(`[Inbox] Incoming message from ${contactNumber} on bot ${botId}`);

            // 1. Find or create conversation
            let conversation = await inboxRepository.findConversationByContact(botId, contactNumber);
            let isNew = false;

            if (!conversation) {
                isNew = true;
                conversation = await inboxRepository.createConversation({
                    tenant_id: tenantId,
                    bot_id: botId,
                    contact_number: contactNumber,
                    contact_name: contactName,
                    status: 'open',
                });
            } else {
                // Update contact name if provided and unread count
                await inboxRepository.updateConversation(conversation.id, {
                    contact_name: contactName || conversation.contact_name,
                    status: 'open', // Re-open if closed
                });
                await inboxRepository.incrementUnreadCount(conversation.id);
            }

            // 2. Save the message
            const message = await inboxRepository.createMessage({
                conversation_id: conversation.id,
                message_id: messageId,
                sender_type: 'contact',
                sender_name: senderName,
                content,
                message_type: messageType as any,
                status: 'delivered', // Incoming are delivered immediately
                media_meta: mediaMeta
            });

            const updatedConv = await inboxRepository.findConversationById(conversation.id);

            // 3. Broadcast to Socket.io
            if (isNew) {
                socketService.emitToTenant(tenantId, 'inbox:new_conversation', updatedConv);
            } else {
                socketService.emitToTenant(tenantId, 'inbox:conversation_updated', updatedConv);
            }

            socketService.emitToConversation(conversation.id, 'inbox:new_message', message);

            return message;
        } catch (error) {
            logger.error('[InboxService] Error handling incoming message', error);
            throw error;
        }
    }

    /**
     * Handle outgoing messages primarily sent by agents
     */
    async saveOutgoingMessage(
        conversationId: string,
        messageId: string,
        content: string,
        senderType: 'bot' | 'agent',
        senderId?: string,
        messageType: string = 'text',
        senderName?: string,
        mediaMeta?: {
            filename?: string;
            mimetype?: string;
            file_size?: number;
            message_type?: string;
            media_url?: string;
        }
    ): Promise<InboxMessage> {
        try {
            const message = await inboxRepository.createMessage({
                conversation_id: conversationId,
                message_id: messageId,
                sender_type: senderType,
                sender_id: senderId,
                sender_name: senderName,
                content,
                message_type: (mediaMeta?.message_type || messageType) as any,
                status: 'sent',
                media_meta: mediaMeta,
            } as any);

            // Broadcast to socket
            socketService.emitToConversation(conversationId, 'inbox:new_message', message);

            // Re-fetch conversation to broadcast updated last message preview
            const updatedConv = await inboxRepository.findConversationById(conversationId);
            if (updatedConv) {
                socketService.emitToTenant(updatedConv.tenant_id, 'inbox:conversation_updated', updatedConv);
            }

            return message;
        } catch (error) {
            logger.error('[InboxService] Error saving outgoing message', error);
            throw error;
        }
    }

    async updateMessageStatus(messageId: string, status: 'sent' | 'delivered' | 'read' | 'failed') {
        try {
            await inboxRepository.updateMessageStatus(messageId, status);
        } catch (error) {
            logger.error('[InboxService] Error updating message status', error);
        }
    }

    async getConversations(tenantId: string, botId?: string, status?: string) {
        return inboxRepository.findConversations(tenantId, botId, status);
    }

    async getMessages(conversationId: string, limit: number = 50, offset: number = 0) {
        return inboxRepository.findMessages(conversationId, limit, offset);
    }

    async markAsRead(conversationId: string) {
        return inboxRepository.resetUnreadCount(conversationId);
    }

    async updateStatus(conversationId: string, status: 'open' | 'closed' | 'resolved') {
        return inboxRepository.updateConversation(conversationId, { status });
    }
}

export const inboxService = new InboxService();
