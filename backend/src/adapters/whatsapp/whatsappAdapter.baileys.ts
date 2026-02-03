/**
 * Baileys WhatsApp Adapter
 * Lighter alternative to whatsapp-web.js - no Chromium needed!
 */

import makeWASocket, {
    DisconnectReason,
    useMultiFileAuthState,
    WASocket,
    WAMessage,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import QRCode from 'qrcode';
import path from 'path';
import { IWhatsAppAdapter, WhatsAppMessage, WhatsAppIncomingMessage } from './IWhatsAppAdapter';
import { eventBus } from '../../core/events/eventBus';
import { EventType, MessageReceivedPayload } from '../../core/events/types';
import { logger } from '../../utils/logger';
import { botRepository } from '../../database/repositories/botRepository';
import { query } from '../../database/connection';
import { v4 as uuidv4 } from 'uuid';

class BaileysWhatsAppAdapter implements IWhatsAppAdapter {
    private sockets: Map<string, WASocket> = new Map();
    private qrCodes: Map<string, { qr_code: string; expires_at: string }> = new Map();
    private pausedBots: Set<string> = new Set(); // Track paused bots
    private lidToPhone: Map<string, string> = new Map(); // Cache LID -> phone number mapping
    private sessionPath: string;

    constructor() {
        this.sessionPath = process.env.WA_SESSION_PATH || './sessions';
    }

    /**
     * Initialize a bot session
     */
    public async initializeBot(botId: string): Promise<void> {
        // Check if already initialized
        const existingSocket = this.sockets.get(botId);
        if (existingSocket) {
            logger.warn('Bot already initialized - reusing existing socket', { bot_id: botId });
            return;
        }

        // Remove from paused bots if resuming
        this.pausedBots.delete(botId);

        logger.info('Initializing WhatsApp bot with Baileys', { bot_id: botId });

        try {
            const bot = await botRepository.findById(botId);
            if (!bot) {
                throw new Error(`Bot not found: ${botId}`);
            }

            // Setup auth state
            const authPath = path.join(this.sessionPath, `session-${botId}`);
            const { state, saveCreds } = await useMultiFileAuthState(authPath);

            // Create socket with proper config
            const sock = makeWASocket({
                auth: state,
                printQRInTerminal: false,
                markOnlineOnConnect: true,  // ✅ IMPORTANT!
                logger: {
                    level: 'silent' as any,
                    fatal: () => { },
                    error: () => { },
                    warn: () => { },
                    info: () => { },
                    debug: () => { },
                    trace: () => { },
                    child: () => ({
                        level: 'silent' as any,
                        fatal: () => { },
                        error: () => { },
                        warn: () => { },
                        info: () => { },
                        debug: () => { },
                        trace: () => { },
                    } as any),
                } as any,
            });

            // ✅ LOG ALL EVENTS FOR DEBUGGING
            sock.ev.on('*' as any, (event: any) => {
                logger.info('🔍 Baileys event (ANY)', {
                    bot_id: botId,
                    event_constructor: event?.constructor?.name,
                });
            });

            // ✅ STORE SOCKET IMMEDIATELY - CRITICAL!
            this.sockets.set(botId, sock);
            logger.info('✅ Socket stored in map', {
                bot_id: botId,
                total_sockets: this.sockets.size,
                socket_exists: this.sockets.has(botId)
            });

            // Setup event handlers AFTER socket stored
            this.setupEventHandlers(sock, bot, saveCreds);

            logger.info('Event handlers registered successfully', { bot_id: botId });
        } catch (error) {
            logger.error('Failed to initialize bot', { error, bot_id: botId });
            // Cleanup on failure
            this.sockets.delete(botId);
            throw error;
        }
    }

    /**
     * Setup event handlers
     */
    private setupEventHandlers(sock: WASocket, bot: any, saveCreds: () => Promise<void>): void {
        const botId = bot.id;
        const tenantId = bot.tenant_id;

        // Connection update
        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;

            logger.info('Connection update received', {
                bot_id: botId,
                connection,
                has_qr: !!qr,
                has_disconnect: !!lastDisconnect
            });

            // QR Code
            if (qr) {
                logger.info('QR Code generated', { bot_id: botId });

                try {
                    const qrDataUrl = await QRCode.toDataURL(qr);
                    const expiresAt = new Date(Date.now() + 60000).toISOString();

                    this.qrCodes.set(botId, {
                        qr_code: qrDataUrl,
                        expires_at: expiresAt,
                    });

                    await botRepository.update(botId, {
                        qr_code: qrDataUrl,
                        qr_expires_at: expiresAt,
                        status: 'connecting',
                    });

                    await eventBus.emit(
                        EventType.WA_QR_GENERATED,
                        {
                            tenant_id: tenantId,
                            bot_id: botId,
                            channel: 'wa',
                            group_id: null,
                            contact_id: null,
                            message: null,
                            timestamp: new Date().toISOString(),
                        },
                        {
                            qr_code: qrDataUrl,
                            expires_at: expiresAt,
                        }
                    );
                } catch (error) {
                    logger.error('Failed to generate QR code', { error, bot_id: botId });
                }
            }

            // Connected
            if (connection === 'open') {
                logger.info('WhatsApp connected!', { bot_id: botId });

                try {
                    const fullId = sock.user?.id || '';
                    const lid = (sock as any).authState?.creds?.me?.lid || '';
                    const phoneNumber = fullId.split(':')[0] || '';
                    const deviceName = sock.user?.name || 'Unknown';

                    logger.info('Updating bot status to connected', {
                        bot_id: botId,
                        full_id: fullId,
                        lid: lid,
                        phone_number: phoneNumber,
                        device_name: deviceName,
                        me: (sock as any).authState?.creds?.me
                    });

                    await botRepository.update(botId, {
                        status: 'connected',
                        phone_number: phoneNumber,
                        lid: lid.split(':')[0] || lid, // Store clean lid if possible
                        qr_code: null,
                        qr_expires_at: null,
                        last_connected_at: new Date().toISOString(),
                    });

                    logger.info('Bot status updated successfully', { bot_id: botId });

                    await eventBus.emit(
                        EventType.WA_CONNECTED,
                        {
                            tenant_id: tenantId,
                            bot_id: botId,
                            channel: 'wa',
                            group_id: null,
                            contact_id: null,
                            message: null,
                            timestamp: new Date().toISOString(),
                        },
                        {
                            phone_number: phoneNumber,
                            device_name: deviceName,
                            connected_at: new Date().toISOString(),
                        }
                    );

                    logger.info('Connection event emitted', { bot_id: botId });
                } catch (error) {
                    logger.error('Failed to update bot status on connection', { error, bot_id: botId });
                }
            }

            // Disconnected
            if (connection === 'close') {
                const disconnectReason = (lastDisconnect?.error as Boom)?.output?.statusCode;
                const shouldReconnect = disconnectReason !== DisconnectReason.loggedOut;

                const reasonMap = new Map<number, string>([
                    [DisconnectReason.badSession, 'Bad Session'],
                    [DisconnectReason.connectionClosed, 'Connection Closed'],
                    [DisconnectReason.connectionLost, 'Connection Lost'],
                    [DisconnectReason.connectionReplaced, 'Connection Replaced'],
                    [DisconnectReason.loggedOut, 'Logged Out'],
                    [DisconnectReason.restartRequired, 'Restart Required'],
                    [DisconnectReason.timedOut, 'Timed Out'],
                ]);

                const reasonText = disconnectReason ? reasonMap.get(disconnectReason) || `Unknown (${disconnectReason})` : 'Unknown';

                logger.warn('WhatsApp disconnected', {
                    bot_id: botId,
                    shouldReconnect,
                    disconnect_code: disconnectReason,
                    disconnect_reason: reasonText,
                    error: lastDisconnect?.error
                });

                // Check if this bot was paused (user-initiated)
                const wasPaused = this.pausedBots.has(botId);

                await botRepository.update(botId, {
                    status: 'disconnected',
                    // Only clear phone_number if logged out AND not paused
                    ...(disconnectReason === DisconnectReason.loggedOut && !wasPaused ? { phone_number: null } : {}),
                });

                // Emit disconnect event
                await eventBus.emit(
                    EventType.WA_DISCONNECTED,
                    {
                        tenant_id: tenantId,
                        bot_id: botId,
                        channel: 'wa',
                        group_id: null,
                        contact_id: null,
                        message: null,
                        timestamp: new Date().toISOString(),
                    },
                    {
                        reason: reasonText,
                        disconnect_code: disconnectReason,
                        should_reconnect: shouldReconnect,
                    }
                );

                this.sockets.delete(botId);
                this.qrCodes.delete(botId);

                // Don't auto-reconnect if bot was paused by user
                if (shouldReconnect && !wasPaused) {
                    // Auto-reconnect with longer delay to avoid WhatsApp anti-spam
                    logger.info('⏳ Will attempt reconnect in 30 seconds...', { bot_id: botId });
                    setTimeout(() => {
                        logger.info('🔄 Attempting to reconnect...', { bot_id: botId });
                        this.initializeBot(botId).catch(err => {
                            logger.error('Failed to reconnect', { error: err, bot_id: botId });
                        });
                    }, 30000); // 30 seconds delay (safer than 5 seconds)
                } else if (wasPaused) {
                    logger.info('⏸️ Bot was paused by user - not auto-reconnecting', { bot_id: botId });
                } else {
                    logger.info('❌ Not reconnecting - user logged out', { bot_id: botId });
                }
            }
        });

        // Credentials update
        sock.ev.on('creds.update', saveCreds);

        // ✅ AUTO-CAPTURE CONTACTS (LID → Phone mapping)
        sock.ev.on('contacts.upsert', async (contacts) => {
            logger.info('📇 Contacts upsert event', { bot_id: botId, count: contacts.length });
            try {
                const { lidPhoneMappingService } = await import('../../services/lidPhoneMappingService');
                
                for (const contact of contacts) {
                    // contact.id could be either LID or phone format
                    // contact.lid is the LID if the contact has one
                    // We need to map LID ↔ Phone
                    
                    const contactId = contact.id || '';
                    const lidValue = (contact as any).lid;
                    
                    logger.info('📇 Contact info', { 
                        bot_id: botId, 
                        contact_id: contactId,
                        lid: lidValue,
                        name: contact.name || contact.notify,
                        raw: JSON.stringify(contact)
                    });
                    
                    // If contact has both phone JID and LID, save mapping
                    if (contactId.includes('@s.whatsapp.net') && lidValue) {
                        const phone = contactId.split('@')[0];
                        const lid = lidValue.split('@')[0];
                        
                        await lidPhoneMappingService.upsertMapping({
                            bot_id: botId,
                            lid: lid,
                            phone: phone,
                            name: contact.name || contact.notify
                        });
                        logger.info('🔗 Auto-mapped LID from contact', { lid, phone, name: contact.name });
                    }
                }
            } catch (err) {
                logger.error('Failed to process contacts upsert', { error: err });
            }
        });

        // ✅ AUTO-DETECT GROUPS ON UPSERT
        sock.ev.on('groups.upsert', async (groups) => {
            logger.info('👥 Groups upsert event', { bot_id: botId, count: groups.length });
            try {
                const { groupService } = await import('../../modules/group/groupService');
                for (const group of groups) {
                    await (groupService as any).upsertGroup(botId, group.id, group.subject);
                }
            } catch (err) {
                logger.error('Failed to auto-upsert groups', { error: err });
            }
        });

        // ✅ MESSAGES EVENT - PROPERLY BOUND VIA STORE
        sock.ev.on('messages.upsert', async ({ messages, type }) => {
            logger.info('✅ Messages upsert event triggered!', {
                bot_id: botId,
                message_count: messages.length,
                type,
            });

            for (const msg of messages) {
                // Log RAW message for debugging
                logger.info('Processing message (RAW)', {
                    bot_id: botId,
                    from_me: msg.key.fromMe,
                    has_message: !!msg.message,
                    message_keys: Object.keys(msg.message || {}),
                });

                // Handle own messages (manual replies/sends) - Log to DB but don't trigger events
                if (msg.key.fromMe) {
                    logger.debug('Logging own outbound message', { bot_id: botId });
                    await this.handleOutboundLog(msg, bot);
                    continue;
                }

                // Handle Protocol Messages (Revoke/Delete)
                // Type 0 is REVOKE (Delete for Everyone)
                // @ts-ignore - protocolMessage type definition might be loose
                if (msg.message?.protocolMessage?.type === 0) {
                    const key = msg.message.protocolMessage.key;
                    if (key && key.id) {
                        logger.info('🗑️ Message revoked (deleted for everyone)', {
                            bot_id: botId,
                            revoked_msg_id: key.id,
                            remote_jid: key.remoteJid
                        });

                        try {
                            // Mark message as deleted but KEEP content
                            await query(
                                'UPDATE messages SET is_deleted = 1 WHERE wa_message_id = ?',
                                [key.id]
                            );
                            logger.info('✅ Message marked as deleted in DB', { message_id: key.id });
                        } catch (err) {
                            logger.error('Failed to mark message as deleted', { error: err, message_id: key.id });
                        }
                    }
                    continue; // Skip processing as new message
                }

                await this.handleIncomingMessage(msg, bot);
            }
        });

        logger.info('Event handlers registered successfully', { bot_id: botId });
    }

    /**
     * Handle Logger for Outbound (Manual) Messages
     */
    private async handleOutboundLog(msg: WAMessage, bot: any): Promise<void> {
        try {
            const messageContent =
                msg.message?.conversation ||
                msg.message?.extendedTextMessage?.text ||
                msg.message?.imageMessage?.caption ||
                '';

            if (!messageContent) return;

            // Use current time for safety
            const timestamp = new Date().toISOString();

            logger.info('📝 Logging manual outbound message', {
                bot_id: bot.id,
                content: messageContent,
                timestamp
            });

            // NOTE: source MUST be 'auto_reply' because SQLite CHECK constraint restricts values.
            await query(`
                INSERT INTO messages (
                    id, bot_id, wa_message_id, direction, source,
                    message_type, content, created_at
                ) VALUES (?, ?, ?, 'outbound', 'auto_reply', 'text', ?, ?)
            `, [
                uuidv4(),
                bot.id,
                msg.key.id || `manual_${Date.now()}`,
                messageContent,
                timestamp
            ]);
        } catch (error) {
            logger.error('❌ Failed to log outbound manual message', { error });
        }
    }

    /**
     * Handle incoming message
     */
    private async handleIncomingMessage(msg: WAMessage, bot: any): Promise<void> {
        try {
            // Extract message content from various Baileys message types
            const messageContent =
                msg.message?.conversation ||
                msg.message?.extendedTextMessage?.text ||
                msg.message?.imageMessage?.caption ||
                msg.message?.videoMessage?.caption ||
                msg.message?.documentMessage?.caption ||
                msg.message?.buttonsResponseMessage?.selectedButtonId ||
                msg.message?.listResponseMessage?.singleSelectReply?.selectedRowId ||
                msg.message?.templateButtonReplyMessage?.selectedId ||
                '';

            const remoteJid = msg.key.remoteJid || '';
            const senderId = msg.key.participant || msg.key.remoteJid || '';
            
            // Try to resolve LID to phone number
            let senderPhone: string | undefined;
            if (remoteJid.includes('@lid') || senderId.includes('@lid')) {
                // Try to get phone from cache
                const lid = remoteJid.split('@')[0];
                senderPhone = this.lidToPhone.get(lid);
                
                // If not in cache, try to resolve using socket
                if (!senderPhone) {
                    const sock = this.sockets.get(bot.id);
                    if (sock) {
                        try {
                            // Try to get the phone number using fetchStatus or other methods
                            // Note: This might not always work depending on WhatsApp's API
                            const status = await sock.fetchStatus(remoteJid).catch(() => null);
                            if (status && typeof status === 'object' && 'id' in status) {
                                const phoneJid = (status as any).id;
                                if (phoneJid && phoneJid.includes('@s.whatsapp.net')) {
                                    senderPhone = phoneJid.split('@')[0];
                                    this.lidToPhone.set(lid, senderPhone);
                                    logger.info('[LID Resolver] Resolved LID to phone', { lid, phone: senderPhone });
                                }
                            }
                        } catch (e) {
                            // Fallback - check if there's a verifiedName or other identifier
                            logger.debug('[LID Resolver] Could not resolve LID', { lid, error: (e as Error).message });
                        }
                    }
                }
            } else if (remoteJid.includes('@s.whatsapp.net')) {
                // Regular phone number format
                senderPhone = remoteJid.split('@')[0];
            }

            const incomingMessage: WhatsAppIncomingMessage = {
                wa_message_id: msg.key.id || '',
                from: remoteJid,
                to: bot.phone_number || '',
                message_type: 'text',
                content: messageContent,
                is_group: remoteJid.endsWith('@g.us') || false,
                sender_id: senderId,
                sender_name: msg.pushName || 'Unknown',
                timestamp: new Date((msg.messageTimestamp as number) * 1000).toISOString(),
                sender_phone: senderPhone, // Add resolved phone number
            };

            // Extract mentions and quoted message info
            const contextInfo = (msg.message?.extendedTextMessage ||
                msg.message?.imageMessage ||
                msg.message?.videoMessage ||
                msg.message?.documentMessage)?.contextInfo;

            const mentioned_jids = contextInfo?.mentionedJid || [];
            const quoted_message = contextInfo?.quotedMessage ? {
                participant: contextInfo.participant,
                stanzaId: contextInfo.stanzaId,
                content: contextInfo.quotedMessage.conversation || contextInfo.quotedMessage.extendedTextMessage?.text
            } : undefined;

            logger.info('✅ Incoming message parsed', {
                bot_id: bot.id,
                from: incomingMessage.from,
                content: incomingMessage.content,
                mentions: mentioned_jids,
                has_quote: !!quoted_message,
                message_type: Object.keys(msg.message || {})[0],
            });

            // Log INBOUND message to database
            try {
                await query(`
                    INSERT INTO messages (
                        id, bot_id, wa_message_id, direction, source,
                        message_type, content, created_at
                    ) VALUES (?, ?, ?, 'inbound', 'inbound', ?, ?, ?)
                `, [
                    uuidv4(),
                    bot.id,
                    incomingMessage.wa_message_id,
                    'text', // Simplified, or use incomingMessage.message_type
                    incomingMessage.content,
                    // Convert ISO to SQLite format if needed, but ISO is standard text
                    incomingMessage.timestamp || new Date().toISOString()
                ]);
            } catch (logError) {
                logger.error('Failed to log inbound message', { error: logError });
            }

            await eventBus.emit(
                EventType.MESSAGE_RECEIVED,
                {
                    tenant_id: bot.tenant_id,
                    bot_id: bot.id,
                    channel: 'wa',
                    group_id: incomingMessage.is_group ? incomingMessage.from : null,
                    contact_id: !incomingMessage.is_group ? incomingMessage.from : null,
                    message: incomingMessage.content,
                    timestamp: incomingMessage.timestamp,
                },
                {
                    ...incomingMessage,
                    mentioned_jids,
                    quoted_message
                } as MessageReceivedPayload
            );
        } catch (error) {
            logger.error('Failed to handle incoming message', { error, bot_id: bot.id });
        }
    }

    /**
     * Request QR code
     */
    public async requestQRCode(botId: string): Promise<{ qr_code: string; expires_at: string }> {
        try {
            logger.info('Requesting QR code', { bot_id: botId });

            if (!this.sockets.has(botId)) {
                logger.info('Initializing bot for QR request', { bot_id: botId });
                await this.initializeBot(botId);
            }

            // Wait for QR code (max 30 seconds)
            const maxWait = 30000;
            const startTime = Date.now();
            let attempts = 0;

            while (Date.now() - startTime < maxWait) {
                attempts++;
                const qrData = this.qrCodes.get(botId);

                if (qrData) {
                    logger.info('QR code found', { bot_id: botId, attempts });
                    return qrData;
                }

                if (attempts % 10 === 0) {
                    logger.debug('Still waiting for QR code', {
                        bot_id: botId,
                        attempts,
                        elapsed: Date.now() - startTime
                    });
                }

                await new Promise((resolve) => setTimeout(resolve, 500));
            }

            logger.error('QR code generation timeout', { bot_id: botId, attempts });
            throw new Error('QR code generation timeout - please try again');
        } catch (error) {
            logger.error('Failed to request QR code', { error, bot_id: botId });
            throw error;
        }
    }

    /**
     * Get connection status
     */
    public async getConnectionStatus(botId: string): Promise<{
        status: 'connected' | 'disconnected' | 'connecting';
        phone_number?: string;
        device_name?: string;
    }> {
        const sock = this.sockets.get(botId);

        if (!sock) {
            return { status: 'disconnected' };
        }

        // Check if socket is actually connected (not just exists in memory)
        // @ts-ignore - accessing internal state
        const connectionState = sock.ws?.readyState;

        // WebSocket.OPEN = 1, WebSocket.CLOSED = 3
        if (connectionState !== 1) {
            logger.warn('Socket exists but WebSocket is not open', {
                bot_id: botId,
                ws_state: connectionState
            });

            // Clean up disconnected socket
            this.sockets.delete(botId);

            // Update database status
            await botRepository.update(botId, {
                status: 'disconnected',
            });

            return { status: 'disconnected' };
        }

        if (sock.user) {
            return {
                status: 'connected',
                phone_number: sock.user.id.split(':')[0],
                device_name: sock.user.name,
            };
        }

        return { status: 'connecting' };
    }

    /**
     * Pause bot (disconnect socket but keep session data)
     */
    public async pauseBot(botId: string): Promise<void> {
        logger.info('Pausing bot', { bot_id: botId });

        // Mark this bot as paused
        this.pausedBots.add(botId);

        const sock = this.sockets.get(botId);

        if (sock) {
            try {
                // Close the socket connection gracefully
                sock.end(undefined);
                logger.info('Socket connection closed', { bot_id: botId });
            } catch (error) {
                logger.warn('Error closing socket', { error, bot_id: botId });
            }

            // Remove socket from memory
            this.sockets.delete(botId);
            logger.info('Socket removed from memory', {
                bot_id: botId,
                remaining_sockets: this.sockets.size
            });
        } else {
            logger.warn('No socket found to pause', { bot_id: botId });
        }

        // NOTE: We do NOT delete session data from auth_info_baileys folder
        // This allows the bot to resume without scanning QR code again
    }

    /**
     * Resume bot (reconnect a paused bot)
     */
    public async resumeBot(botId: string): Promise<void> {
        logger.info('Resuming bot', { bot_id: botId });

        // Remove from paused bots set
        this.pausedBots.delete(botId);

        // Re-initialize the bot connection
        await this.initializeBot(botId);

        logger.info('Bot resumed successfully', { bot_id: botId });
    }

    /**
     * Send message
     */
    public async sendMessage(
        botId: string,
        recipient: string,
        message: WhatsAppMessage
    ): Promise<{ message_id: string; sent_at: string }> {
        logger.info('🔍 sendMessage called', {
            bot_id: botId,
            recipient,
            type: message.type,
            total_sockets: this.sockets.size,
            has_socket: this.sockets.has(botId),
            all_bot_ids: Array.from(this.sockets.keys())
        });

        const sock = this.sockets.get(botId);

        if (!sock) {
            logger.warn('⚠️ Socket not found, checking bot status...', {
                bot_id: botId,
                available_sockets: Array.from(this.sockets.keys()),
                total_sockets: this.sockets.size
            });

            // Check if bot is connected in database
            try {
                const bot = await botRepository.findById(botId);

                if (bot && bot.status === 'connected') {
                    logger.info('🔄 Bot is connected but socket missing, re-initializing...', {
                        bot_id: botId,
                        bot_name: bot.name
                    });

                    // Re-initialize the bot
                    await this.initializeBot(botId);

                    // Wait a bit for connection to establish
                    await new Promise(resolve => setTimeout(resolve, 2000));

                    // Try to get socket again
                    const newSock = this.sockets.get(botId);
                    if (newSock) {
                        logger.info('✅ Bot re-initialized successfully', { bot_id: botId });
                    } else {
                        logger.error('❌ Re-initialization failed - socket still not found', { bot_id: botId });
                        throw new Error(`Bot re-initialization failed: ${botId}`);
                    }
                } else {
                    logger.error('❌ Bot not initialized - socket not found!', {
                        bot_id: botId,
                        bot_status: bot?.status || 'not found',
                        available_sockets: Array.from(this.sockets.keys()),
                        total_sockets: this.sockets.size
                    });
                    throw new Error(`Bot not initialized: ${botId}`);
                }
            } catch (error) {
                logger.error('Failed to check/reinitialize bot', { error, bot_id: botId });
                throw new Error(`Bot not initialized: ${botId}`);
            }
        }

        // Validate recipient - should be a digits-only string if not already a JID
        const phoneOnly = recipient.split('@')[0].replace(/\D/g, '');
        if (!phoneOnly || phoneOnly.length < 5) {
            logger.error('❌ Invalid recipient format', { recipient });
            throw new Error(`Invalid phone number: ${recipient}`);
        }

        const jid = recipient.includes('@') ? recipient : `${recipient}@s.whatsapp.net`;

        try {
            let result;
            if (message.type === 'text') {
                result = await sock.sendMessage(jid, { text: message.content || '' });
                logger.info('✅ Message sent successfully', {
                    bot_id: botId,
                    recipient: jid,
                    message_id: result?.key?.id
                });
            } else if (message.type === 'image') {
                let media: any;
                let mimetype: string = 'image/jpeg';

                if (message.media_url?.startsWith('data:')) {
                    const matches = message.media_url.match(/^data:([^;]+);base64,(.+)$/);
                    if (matches && matches[2]) {
                        media = Buffer.from(matches[2], 'base64');
                        mimetype = matches[1];
                    }
                } else if (message.media_url) {
                    media = { url: message.media_url };
                }

                if (!media) throw new Error('Invalid media configuration');

                const payload: any = { image: media, caption: message.caption };
                if (Buffer.isBuffer(media)) payload.mimetype = mimetype;

                result = await sock.sendMessage(jid, payload);
                logger.info('✅ Image message sent successfully', {
                    bot_id: botId,
                    recipient: jid,
                    message_id: result?.key?.id
                });
            } else {
                throw new Error(`Unsupported message type: ${message.type}`);
            }

            // Log full result to see LID info
            logger.info('📨 sendMessage result', {
                bot_id: botId,
                sent_to_jid: jid,
                result_key: result?.key,
                remote_jid: result?.key?.remoteJid,
                participant: result?.key?.participant
            });

            // Auto-capture LID mapping if response contains LID
            const remoteJid = result?.key?.remoteJid;
            if (remoteJid && remoteJid.includes('@lid')) {
                const lid = remoteJid.split('@')[0];
                const phone = jid.split('@')[0].replace(/\D/g, '');
                
                // Import and save mapping
                try {
                    const { lidPhoneMappingService } = await import('../../services/lidPhoneMappingService');
                    await lidPhoneMappingService.upsertMapping({
                        bot_id: botId,
                        lid: lid,
                        phone: phone
                    });
                    logger.info('🔗 Auto-captured LID mapping', { lid, phone, bot_id: botId });
                } catch (mapError) {
                    logger.warn('Failed to auto-capture LID mapping', { error: mapError });
                }
            }

            return {
                message_id: result?.key?.id || `msg_${Date.now()}`,
                sent_at: new Date().toISOString(),
            };
        } catch (error) {
            logger.error('❌ Failed to send message', { error, bot_id: botId, recipient: jid });
            throw error;
        }
    }

    /**
     * Disconnect
     */
    public async disconnect(botId: string): Promise<void> {
        const sock = this.sockets.get(botId);

        if (sock) {
            await sock.logout();
            this.sockets.delete(botId);
        }

        this.qrCodes.delete(botId);
    }

    /**
     * Destroy session
     */
    public async destroySession(botId: string): Promise<void> {
        await this.disconnect(botId);
        logger.info('Session destroyed', { bot_id: botId });
    }

    /**
     * Get active clients
     */
    public getActiveClients(): string[] {
        return Array.from(this.sockets.keys());
    }

    /**
     * Get socket for bot (for group operations)
     */
    public getSocket(botId: string): WASocket | undefined {
        return this.sockets.get(botId);
    }
}

export const whatsappAdapter = new BaileysWhatsAppAdapter();
