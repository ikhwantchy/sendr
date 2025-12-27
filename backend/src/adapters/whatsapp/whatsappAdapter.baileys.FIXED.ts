/**
 * Baileys WhatsApp Adapter - FIXED VERSION
 * Properly implements makeInMemoryStore and event handling
 */

import makeWASocket, {
    DisconnectReason,
    useMultiFileAuthState,
    WASocket,
    WAMessage,
    makeInMemoryStore,
    Browsers,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import QRCode from 'qrcode';
import path from 'path';
import pino from 'pino';
import { IWhatsAppAdapter, WhatsAppMessage, WhatsAppIncomingMessage } from './IWhatsAppAdapter';
import { eventBus } from '../../core/events/eventBus';
import { EventType, MessageReceivedPayload } from '../../core/events/types';
import { logger } from '../../utils/logger';
import { botRepository } from '../../database/repositories/botRepository';

class BaileysWhatsAppAdapter implements IWhatsAppAdapter {
    private sockets: Map<string, WASocket> = new Map();
    private stores: Map<string, ReturnType<typeof makeInMemoryStore>> = new Map();
    private qrCodes: Map<string, { qr_code: string; expires_at: string }> = new Map();
    private sessionPath: string;

    constructor() {
        this.sessionPath = process.env.WA_SESSION_PATH || './sessions';
    }

    /**
     * Initialize a bot session
     */
    public async initializeBot(botId: string): Promise<void> {
        // Prevent duplicate initialization
        if (this.sockets.has(botId)) {
            logger.warn('Bot already initialized', { bot_id: botId });
            return;
        }

        logger.info('Initializing WhatsApp bot with Baileys', { bot_id: botId });

        try {
            const bot = await botRepository.findById(botId);
            if (!bot) {
                throw new Error(`Bot not found: ${botId}`);
            }

            // Setup auth state
            const authPath = path.join(this.sessionPath, `session-${botId}`);
            const { state, saveCreds } = await useMultiFileAuthState(authPath);

            // ✅ CREATE IN-MEMORY STORE (CRITICAL!)
            const store = makeInMemoryStore({
                logger: pino().child({ level: 'silent', stream: 'store' }),
            });

            // Store for this bot
            this.stores.set(botId, store);

            // Create socket with PROPER config
            const sock = makeWASocket({
                auth: state,
                printQRInTerminal: false,
                browser: Browsers.ubuntu('Chrome'),
                markOnlineOnConnect: true,  // ✅ IMPORTANT!
                getMessage: async (key) => {
                    // Retrieve message from store
                    const msg = await store.loadMessage(key.remoteJid!, key.id!);
                    return msg?.message || undefined;
                },
                logger: pino({ level: 'silent' }),
            });

            // ✅ BIND STORE TO SOCKET EVENTS (CRITICAL!)
            store.bind(sock.ev);

            // Store socket BEFORE event handlers
            this.sockets.set(botId, sock);

            // Setup event handlers AFTER socket stored
            this.setupEventHandlers(sock, bot, saveCreds, botId);

            logger.info('Bot initialized successfully', { bot_id: botId });
        } catch (error) {
            logger.error('Failed to initialize bot', { error, bot_id: botId });
            // Cleanup on failure
            this.sockets.delete(botId);
            this.stores.delete(botId);
            throw error;
        }
    }

    /**
     * Setup event handlers
     */
    private setupEventHandlers(
        sock: WASocket,
        bot: any,
        saveCreds: () => Promise<void>,
        botId: string
    ): void {
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
                    const phoneNumber = sock.user?.id.split(':')[0] || '';
                    const deviceName = sock.user?.name || 'Unknown';

                    logger.info('Updating bot status to connected', {
                        bot_id: botId,
                        phone_number: phoneNumber,
                        device_name: deviceName
                    });

                    await botRepository.update(botId, {
                        status: 'connected',
                        phone_number: phoneNumber,
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
                const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;

                logger.warn('WhatsApp disconnected', {
                    bot_id: botId,
                    shouldReconnect,
                    reason: lastDisconnect?.error
                });

                await botRepository.update(botId, {
                    status: 'disconnected',
                });

                // Cleanup
                this.sockets.delete(botId);
                this.stores.delete(botId);

                if (shouldReconnect) {
                    // Auto-reconnect after 5 seconds
                    setTimeout(() => {
                        this.initializeBot(botId).catch(err => {
                            logger.error('Failed to reconnect', { error: err, bot_id: botId });
                        });
                    }, 5000);
                }
            }
        });

        // Credentials update
        sock.ev.on('creds.update', saveCreds);

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

                // Skip own messages
                if (msg.key.fromMe) {
                    logger.debug('Skipping own message', { bot_id: botId });
                    continue;
                }

                await this.handleIncomingMessage(msg, bot);
            }
        });

        logger.info('Event handlers registered', { bot_id: botId });
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

            const incomingMessage: WhatsAppIncomingMessage = {
                wa_message_id: msg.key.id || '',
                from: msg.key.remoteJid || '',
                to: bot.phone_number || '',
                message_type: 'text',
                content: messageContent,
                is_group: msg.key.remoteJid?.endsWith('@g.us') || false,
                sender_name: msg.pushName || 'Unknown',
                timestamp: new Date((msg.messageTimestamp as number) * 1000).toISOString(),
            };

            logger.info('✅ Incoming message parsed', {
                bot_id: bot.id,
                from: incomingMessage.from,
                content: incomingMessage.content,
                message_type: Object.keys(msg.message || {})[0],
            });

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
                incomingMessage as MessageReceivedPayload
            );
        } catch (error) {
            logger.error('Failed to handle incoming message', { error, bot_id: bot.id });
        }
    }

    /**
     * Send message
     */
    public async sendMessage(
        botId: string,
        recipient: string,
        message: WhatsAppMessage
    ): Promise<{ message_id: string; sent_at: string }> {
        const sock = this.sockets.get(botId);

        if (!sock) {
            throw new Error(`Bot not initialized: ${botId}`);
        }

        logger.info('Sending message', {
            bot_id: botId,
            recipient,
            type: message.type,
        });

        const jid = recipient.includes('@') ? recipient : `${recipient}@s.whatsapp.net`;

        if (message.type === 'text') {
            await sock.sendMessage(jid, { text: message.content || '' });
        } else {
            throw new Error(`Unsupported message type: ${message.type}`);
        }

        return {
            message_id: `msg_${Date.now()}`,
            sent_at: new Date().toISOString(),
        };
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
     * Disconnect
     */
    public async disconnect(botId: string): Promise<void> {
        const sock = this.sockets.get(botId);

        if (sock) {
            await sock.logout();
            this.sockets.delete(botId);
            this.stores.delete(botId);
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
}

export const whatsappAdapter = new BaileysWhatsAppAdapter();
