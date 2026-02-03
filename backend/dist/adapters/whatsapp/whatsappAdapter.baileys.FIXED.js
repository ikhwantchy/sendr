"use strict";
/**
 * Baileys WhatsApp Adapter - FIXED VERSION
 * Properly implements makeInMemoryStore and event handling
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
exports.whatsappAdapter = void 0;
const baileys_1 = __importStar(require("@whiskeysockets/baileys"));
// @ts-ignore
const baileys_2 = require("@whiskeysockets/baileys");
const qrcode_1 = __importDefault(require("qrcode"));
const path_1 = __importDefault(require("path"));
const pino_1 = __importDefault(require("pino"));
const eventBus_1 = require("../../core/events/eventBus");
const types_1 = require("../../core/events/types");
const logger_1 = require("../../utils/logger");
const botRepository_1 = require("../../database/repositories/botRepository");
class BaileysWhatsAppAdapter {
    sockets = new Map();
    stores = new Map();
    qrCodes = new Map();
    sessionPath;
    constructor() {
        this.sessionPath = process.env.WA_SESSION_PATH || './sessions';
    }
    /**
     * Initialize a bot session
     */
    async initializeBot(botId) {
        // Prevent duplicate initialization
        if (this.sockets.has(botId)) {
            logger_1.logger.warn('Bot already initialized', { bot_id: botId });
            return;
        }
        logger_1.logger.info('Initializing WhatsApp bot with Baileys', { bot_id: botId });
        try {
            const bot = await botRepository_1.botRepository.findById(botId);
            if (!bot) {
                throw new Error(`Bot not found: ${botId}`);
            }
            // Setup auth state
            const authPath = path_1.default.join(this.sessionPath, `session-${botId}`);
            const { state, saveCreds } = await (0, baileys_1.useMultiFileAuthState)(authPath);
            // ✅ CREATE IN-MEMORY STORE (CRITICAL!)
            const store = (0, baileys_2.makeInMemoryStore)({
                logger: (0, pino_1.default)().child({ level: 'silent', stream: 'store' }),
            });
            // Store for this bot
            this.stores.set(botId, store);
            // Create socket with PROPER config
            const sock = (0, baileys_1.default)({
                auth: state,
                printQRInTerminal: false,
                browser: baileys_1.Browsers.ubuntu('Chrome'),
                markOnlineOnConnect: true, // ✅ IMPORTANT!
                getMessage: async (key) => {
                    // Retrieve message from store
                    const msg = await store.loadMessage(key.remoteJid, key.id);
                    return msg?.message || undefined;
                },
                logger: (0, pino_1.default)({ level: 'silent' }),
            });
            // ✅ BIND STORE TO SOCKET EVENTS (CRITICAL!)
            store.bind(sock.ev);
            // Store socket BEFORE event handlers
            this.sockets.set(botId, sock);
            // Setup event handlers AFTER socket stored
            this.setupEventHandlers(sock, bot, saveCreds, botId);
            logger_1.logger.info('Bot initialized successfully', { bot_id: botId });
        }
        catch (error) {
            logger_1.logger.error('Failed to initialize bot', { error, bot_id: botId });
            // Cleanup on failure
            this.sockets.delete(botId);
            this.stores.delete(botId);
            throw error;
        }
    }
    /**
     * Setup event handlers
     */
    setupEventHandlers(sock, bot, saveCreds, botId) {
        const tenantId = bot.tenant_id;
        // Connection update
        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;
            logger_1.logger.info('Connection update received', {
                bot_id: botId,
                connection,
                has_qr: !!qr,
                has_disconnect: !!lastDisconnect
            });
            // QR Code
            if (qr) {
                logger_1.logger.info('QR Code generated', { bot_id: botId });
                try {
                    const qrDataUrl = await qrcode_1.default.toDataURL(qr);
                    const expiresAt = new Date(Date.now() + 60000).toISOString();
                    this.qrCodes.set(botId, {
                        qr_code: qrDataUrl,
                        expires_at: expiresAt,
                    });
                    await botRepository_1.botRepository.update(botId, {
                        qr_code: qrDataUrl,
                        qr_expires_at: expiresAt,
                        status: 'connecting',
                    });
                    await eventBus_1.eventBus.emit(types_1.EventType.WA_QR_GENERATED, {
                        tenant_id: tenantId,
                        bot_id: botId,
                        channel: 'wa',
                        group_id: null,
                        contact_id: null,
                        message: null,
                        timestamp: new Date().toISOString(),
                    }, {
                        qr_code: qrDataUrl,
                        expires_at: expiresAt,
                    });
                }
                catch (error) {
                    logger_1.logger.error('Failed to generate QR code', { error, bot_id: botId });
                }
            }
            // Connected
            if (connection === 'open') {
                logger_1.logger.info('WhatsApp connected!', { bot_id: botId });
                try {
                    const phoneNumber = sock.user?.id.split(':')[0] || '';
                    const deviceName = sock.user?.name || 'Unknown';
                    logger_1.logger.info('Updating bot status to connected', {
                        bot_id: botId,
                        phone_number: phoneNumber,
                        device_name: deviceName
                    });
                    await botRepository_1.botRepository.update(botId, {
                        status: 'connected',
                        phone_number: phoneNumber,
                        qr_code: null,
                        qr_expires_at: null,
                        last_connected_at: new Date().toISOString(),
                    });
                    logger_1.logger.info('Bot status updated successfully', { bot_id: botId });
                    await eventBus_1.eventBus.emit(types_1.EventType.WA_CONNECTED, {
                        tenant_id: tenantId,
                        bot_id: botId,
                        channel: 'wa',
                        group_id: null,
                        contact_id: null,
                        message: null,
                        timestamp: new Date().toISOString(),
                    }, {
                        phone_number: phoneNumber,
                        device_name: deviceName,
                        connected_at: new Date().toISOString(),
                    });
                    logger_1.logger.info('Connection event emitted', { bot_id: botId });
                }
                catch (error) {
                    logger_1.logger.error('Failed to update bot status on connection', { error, bot_id: botId });
                }
            }
            // Disconnected
            if (connection === 'close') {
                const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== baileys_1.DisconnectReason.loggedOut;
                logger_1.logger.warn('WhatsApp disconnected', {
                    bot_id: botId,
                    shouldReconnect,
                    reason: lastDisconnect?.error
                });
                await botRepository_1.botRepository.update(botId, {
                    status: 'disconnected',
                });
                // Cleanup
                this.sockets.delete(botId);
                this.stores.delete(botId);
                if (shouldReconnect) {
                    // Auto-reconnect after 5 seconds
                    setTimeout(() => {
                        this.initializeBot(botId).catch(err => {
                            logger_1.logger.error('Failed to reconnect', { error: err, bot_id: botId });
                        });
                    }, 5000);
                }
            }
        });
        // Credentials update
        sock.ev.on('creds.update', saveCreds);
        // ✅ MESSAGES EVENT - PROPERLY BOUND VIA STORE
        sock.ev.on('messages.upsert', async ({ messages, type }) => {
            logger_1.logger.info('✅ Messages upsert event triggered!', {
                bot_id: botId,
                message_count: messages.length,
                type,
            });
            for (const msg of messages) {
                // Log RAW message for debugging
                logger_1.logger.info('Processing message (RAW)', {
                    bot_id: botId,
                    from_me: msg.key.fromMe,
                    has_message: !!msg.message,
                    message_keys: Object.keys(msg.message || {}),
                });
                // Skip own messages
                if (msg.key.fromMe) {
                    logger_1.logger.debug('Skipping own message', { bot_id: botId });
                    continue;
                }
                await this.handleIncomingMessage(msg, bot);
            }
        });
        logger_1.logger.info('Event handlers registered', { bot_id: botId });
    }
    /**
     * Handle incoming message
     */
    async handleIncomingMessage(msg, bot) {
        try {
            // Extract message content from various Baileys message types
            const messageContent = msg.message?.conversation ||
                msg.message?.extendedTextMessage?.text ||
                msg.message?.imageMessage?.caption ||
                msg.message?.videoMessage?.caption ||
                msg.message?.documentMessage?.caption ||
                msg.message?.buttonsResponseMessage?.selectedButtonId ||
                msg.message?.listResponseMessage?.singleSelectReply?.selectedRowId ||
                msg.message?.templateButtonReplyMessage?.selectedId ||
                '';
            const incomingMessage = {
                wa_message_id: msg.key.id || '',
                from: msg.key.remoteJid || '',
                to: bot.phone_number || '',
                message_type: 'text',
                content: messageContent,
                is_group: msg.key.remoteJid?.endsWith('@g.us') || false,
                sender_name: msg.pushName || 'Unknown',
                timestamp: new Date(msg.messageTimestamp * 1000).toISOString(),
            };
            logger_1.logger.info('✅ Incoming message parsed', {
                bot_id: bot.id,
                from: incomingMessage.from,
                content: incomingMessage.content,
                message_type: Object.keys(msg.message || {})[0],
            });
            await eventBus_1.eventBus.emit(types_1.EventType.MESSAGE_RECEIVED, {
                tenant_id: bot.tenant_id,
                bot_id: bot.id,
                channel: 'wa',
                group_id: incomingMessage.is_group ? incomingMessage.from : null,
                contact_id: !incomingMessage.is_group ? incomingMessage.from : null,
                message: incomingMessage.content,
                timestamp: incomingMessage.timestamp,
            }, incomingMessage);
        }
        catch (error) {
            logger_1.logger.error('Failed to handle incoming message', { error, bot_id: bot.id });
        }
    }
    /**
     * Send message
     */
    async sendMessage(botId, recipient, message) {
        const sock = this.sockets.get(botId);
        if (!sock) {
            throw new Error(`Bot not initialized: ${botId}`);
        }
        logger_1.logger.info('Sending message', {
            bot_id: botId,
            recipient,
            type: message.type,
        });
        const jid = recipient.includes('@') ? recipient : `${recipient}@s.whatsapp.net`;
        if (message.type === 'text') {
            await sock.sendMessage(jid, { text: message.content || '' });
        }
        else {
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
    async requestQRCode(botId) {
        try {
            logger_1.logger.info('Requesting QR code', { bot_id: botId });
            if (!this.sockets.has(botId)) {
                logger_1.logger.info('Initializing bot for QR request', { bot_id: botId });
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
                    logger_1.logger.info('QR code found', { bot_id: botId, attempts });
                    return qrData;
                }
                if (attempts % 10 === 0) {
                    logger_1.logger.debug('Still waiting for QR code', {
                        bot_id: botId,
                        attempts,
                        elapsed: Date.now() - startTime
                    });
                }
                await new Promise((resolve) => setTimeout(resolve, 500));
            }
            logger_1.logger.error('QR code generation timeout', { bot_id: botId, attempts });
            throw new Error('QR code generation timeout - please try again');
        }
        catch (error) {
            logger_1.logger.error('Failed to request QR code', { error, bot_id: botId });
            throw error;
        }
    }
    /**
     * Get connection status
     */
    async getConnectionStatus(botId) {
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
    async disconnect(botId) {
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
    async destroySession(botId) {
        await this.disconnect(botId);
        logger_1.logger.info('Session destroyed', { bot_id: botId });
    }
    /**
     * Get active clients
     */
    getActiveClients() {
        return Array.from(this.sockets.keys());
    }
}
exports.whatsappAdapter = new BaileysWhatsAppAdapter();
//# sourceMappingURL=whatsappAdapter.baileys.FIXED.js.map