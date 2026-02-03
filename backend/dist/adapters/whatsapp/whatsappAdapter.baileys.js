"use strict";
/**
 * Baileys WhatsApp Adapter
 * Lighter alternative to whatsapp-web.js - no Chromium needed!
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
const qrcode_1 = __importDefault(require("qrcode"));
const path_1 = __importDefault(require("path"));
const eventBus_1 = require("../../core/events/eventBus");
const types_1 = require("../../core/events/types");
const logger_1 = require("../../utils/logger");
const botRepository_1 = require("../../database/repositories/botRepository");
const connection_1 = require("../../database/connection");
const uuid_1 = require("uuid");
const fs_1 = __importDefault(require("fs"));
class BaileysWhatsAppAdapter {
    sockets = new Map();
    qrCodes = new Map();
    pausedBots = new Set(); // Track paused bots
    lidToPhone = new Map(); // Cache LID -> phone number mapping
    sessionPath;
    constructor() {
        this.sessionPath = process.env.WA_SESSION_PATH || './sessions';
    }
    /**
     * Check if a bot has a valid session (creds.json exists)
     */
    hasValidSession(botId) {
        const authPath = path_1.default.join(this.sessionPath, `session-${botId}`);
        const credsPath = path_1.default.join(authPath, 'creds.json');
        try {
            return fs_1.default.existsSync(credsPath);
        }
        catch {
            return false;
        }
    }
    /**
     * Initialize a bot session
     */
    async initializeBot(botId) {
        // Check if already initialized
        const existingSocket = this.sockets.get(botId);
        if (existingSocket) {
            logger_1.logger.warn('Bot already initialized - reusing existing socket', { bot_id: botId });
            return;
        }
        // Remove from paused bots if resuming
        this.pausedBots.delete(botId);
        logger_1.logger.info('Initializing WhatsApp bot with Baileys', { bot_id: botId });
        try {
            const bot = await botRepository_1.botRepository.findById(botId);
            if (!bot) {
                throw new Error(`Bot not found: ${botId}`);
            }
            // Setup auth state
            const authPath = path_1.default.join(this.sessionPath, `session-${botId}`);
            const { state, saveCreds } = await (0, baileys_1.useMultiFileAuthState)(authPath);
            // Create socket with proper config
            const sock = (0, baileys_1.default)({
                auth: state,
                printQRInTerminal: false,
                markOnlineOnConnect: true, // ✅ IMPORTANT!
                logger: {
                    level: 'silent',
                    fatal: () => { },
                    error: () => { },
                    warn: () => { },
                    info: () => { },
                    debug: () => { },
                    trace: () => { },
                    child: () => ({
                        level: 'silent',
                        fatal: () => { },
                        error: () => { },
                        warn: () => { },
                        info: () => { },
                        debug: () => { },
                        trace: () => { },
                    }),
                },
            });
            // ✅ LOG ALL EVENTS FOR DEBUGGING
            sock.ev.on('*', (event) => {
                logger_1.logger.info('🔍 Baileys event (ANY)', {
                    bot_id: botId,
                    event_constructor: event?.constructor?.name,
                });
            });
            // ✅ STORE SOCKET IMMEDIATELY - CRITICAL!
            this.sockets.set(botId, sock);
            logger_1.logger.info('✅ Socket stored in map', {
                bot_id: botId,
                total_sockets: this.sockets.size,
                socket_exists: this.sockets.has(botId)
            });
            // Setup event handlers AFTER socket stored
            this.setupEventHandlers(sock, bot, saveCreds);
            logger_1.logger.info('Event handlers registered successfully', { bot_id: botId });
        }
        catch (error) {
            logger_1.logger.error('Failed to initialize bot', { error, bot_id: botId });
            // Cleanup on failure
            this.sockets.delete(botId);
            throw error;
        }
    }
    /**
     * Setup event handlers
     */
    setupEventHandlers(sock, bot, saveCreds) {
        const botId = bot.id;
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
                    const fullId = sock.user?.id || '';
                    const lid = sock.authState?.creds?.me?.lid || '';
                    const phoneNumber = fullId.split(':')[0] || '';
                    const deviceName = sock.user?.name || 'Unknown';
                    logger_1.logger.info('Updating bot status to connected', {
                        bot_id: botId,
                        full_id: fullId,
                        lid: lid,
                        phone_number: phoneNumber,
                        device_name: deviceName,
                        me: sock.authState?.creds?.me
                    });
                    await botRepository_1.botRepository.update(botId, {
                        status: 'connected',
                        phone_number: phoneNumber,
                        lid: lid.split(':')[0] || lid, // Store clean lid if possible
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
                const disconnectReason = lastDisconnect?.error?.output?.statusCode;
                // Don't auto-reconnect if logged out or connection replaced (another session took over)
                const shouldReconnect = disconnectReason !== baileys_1.DisconnectReason.loggedOut &&
                    disconnectReason !== baileys_1.DisconnectReason.connectionReplaced;
                const reasonMap = new Map([
                    [baileys_1.DisconnectReason.badSession, 'Bad Session'],
                    [baileys_1.DisconnectReason.connectionClosed, 'Connection Closed'],
                    [baileys_1.DisconnectReason.connectionLost, 'Connection Lost'],
                    [baileys_1.DisconnectReason.connectionReplaced, 'Connection Replaced'],
                    [baileys_1.DisconnectReason.loggedOut, 'Logged Out'],
                    [baileys_1.DisconnectReason.restartRequired, 'Restart Required'],
                    [baileys_1.DisconnectReason.timedOut, 'Timed Out'],
                ]);
                const reasonText = disconnectReason ? reasonMap.get(disconnectReason) || `Unknown (${disconnectReason})` : 'Unknown';
                logger_1.logger.warn('WhatsApp disconnected', {
                    bot_id: botId,
                    shouldReconnect,
                    disconnect_code: disconnectReason,
                    disconnect_reason: reasonText,
                    error: lastDisconnect?.error
                });
                // Check if this bot was paused (user-initiated)
                const wasPaused = this.pausedBots.has(botId);
                await botRepository_1.botRepository.update(botId, {
                    status: 'disconnected',
                    // Only clear phone_number if logged out AND not paused
                    ...(disconnectReason === baileys_1.DisconnectReason.loggedOut && !wasPaused ? { phone_number: null } : {}),
                });
                // Emit disconnect event
                await eventBus_1.eventBus.emit(types_1.EventType.WA_DISCONNECTED, {
                    tenant_id: tenantId,
                    bot_id: botId,
                    channel: 'wa',
                    group_id: null,
                    contact_id: null,
                    message: null,
                    timestamp: new Date().toISOString(),
                }, {
                    reason: reasonText,
                    disconnect_code: disconnectReason,
                    should_reconnect: shouldReconnect,
                });
                this.sockets.delete(botId);
                this.qrCodes.delete(botId);
                // Don't auto-reconnect if bot was paused by user
                if (shouldReconnect && !wasPaused) {
                    // Auto-reconnect with longer delay to avoid WhatsApp anti-spam
                    logger_1.logger.info('⏳ Will attempt reconnect in 30 seconds...', { bot_id: botId });
                    setTimeout(() => {
                        logger_1.logger.info('🔄 Attempting to reconnect...', { bot_id: botId });
                        this.initializeBot(botId).catch(err => {
                            logger_1.logger.error('Failed to reconnect', { error: err, bot_id: botId });
                        });
                    }, 30000); // 30 seconds delay (safer than 5 seconds)
                }
                else if (wasPaused) {
                    logger_1.logger.info('⏸️ Bot was paused by user - not auto-reconnecting', { bot_id: botId });
                }
                else if (disconnectReason === baileys_1.DisconnectReason.connectionReplaced) {
                    logger_1.logger.warn('⚠️ Connection replaced by another session - not auto-reconnecting to avoid loop', { bot_id: botId });
                }
                else {
                    logger_1.logger.info('❌ Not reconnecting - user logged out', { bot_id: botId });
                }
            }
        });
        // Credentials update
        sock.ev.on('creds.update', saveCreds);
        // ✅ AUTO-CAPTURE CONTACTS (LID → Phone mapping)
        sock.ev.on('contacts.upsert', async (contacts) => {
            logger_1.logger.info('📇 Contacts upsert event', { bot_id: botId, count: contacts.length });
            try {
                const { lidPhoneMappingService } = await Promise.resolve().then(() => __importStar(require('../../services/lidPhoneMappingService')));
                for (const contact of contacts) {
                    // contact.id could be either LID or phone format
                    // contact.lid is the LID if the contact has one
                    // We need to map LID ↔ Phone
                    const contactId = contact.id || '';
                    const lidValue = contact.lid;
                    logger_1.logger.info('📇 Contact info', {
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
                        logger_1.logger.info('🔗 Auto-mapped LID from contact', { lid, phone, name: contact.name });
                    }
                }
            }
            catch (err) {
                logger_1.logger.error('Failed to process contacts upsert', { error: err });
            }
        });
        // ✅ AUTO-DETECT GROUPS ON UPSERT
        sock.ev.on('groups.upsert', async (groups) => {
            logger_1.logger.info('👥 Groups upsert event', { bot_id: botId, count: groups.length });
            try {
                const { groupService } = await Promise.resolve().then(() => __importStar(require('../../modules/group/groupService')));
                for (const group of groups) {
                    await groupService.upsertGroup(botId, group.id, group.subject);
                }
            }
            catch (err) {
                logger_1.logger.error('Failed to auto-upsert groups', { error: err });
            }
        });
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
                // Handle own messages (manual replies/sends) - Log to DB but don't trigger events
                if (msg.key.fromMe) {
                    logger_1.logger.debug('Logging own outbound message', { bot_id: botId });
                    await this.handleOutboundLog(msg, bot);
                    continue;
                }
                // Handle Protocol Messages (Revoke/Delete)
                // Type 0 is REVOKE (Delete for Everyone)
                // @ts-ignore - protocolMessage type definition might be loose
                if (msg.message?.protocolMessage?.type === 0) {
                    const key = msg.message.protocolMessage.key;
                    if (key && key.id) {
                        logger_1.logger.info('🗑️ Message revoked (deleted for everyone)', {
                            bot_id: botId,
                            revoked_msg_id: key.id,
                            remote_jid: key.remoteJid
                        });
                        try {
                            // Mark message as deleted but KEEP content
                            await (0, connection_1.query)('UPDATE messages SET is_deleted = 1 WHERE wa_message_id = ?', [key.id]);
                            logger_1.logger.info('✅ Message marked as deleted in DB', { message_id: key.id });
                        }
                        catch (err) {
                            logger_1.logger.error('Failed to mark message as deleted', { error: err, message_id: key.id });
                        }
                    }
                    continue; // Skip processing as new message
                }
                await this.handleIncomingMessage(msg, bot);
            }
        });
        logger_1.logger.info('Event handlers registered successfully', { bot_id: botId });
    }
    /**
     * Handle Logger for Outbound (Manual) Messages
     */
    async handleOutboundLog(msg, bot) {
        try {
            const messageContent = msg.message?.conversation ||
                msg.message?.extendedTextMessage?.text ||
                msg.message?.imageMessage?.caption ||
                '';
            if (!messageContent)
                return;
            // Use current time for safety
            const timestamp = new Date().toISOString();
            logger_1.logger.info('📝 Logging manual outbound message', {
                bot_id: bot.id,
                content: messageContent,
                timestamp
            });
            // NOTE: source MUST be 'auto_reply' because SQLite CHECK constraint restricts values.
            await (0, connection_1.query)(`
                INSERT INTO messages (
                    id, bot_id, wa_message_id, direction, source,
                    message_type, content, created_at
                ) VALUES (?, ?, ?, 'outbound', 'auto_reply', 'text', ?, ?)
            `, [
                (0, uuid_1.v4)(),
                bot.id,
                msg.key.id || `manual_${Date.now()}`,
                messageContent,
                timestamp
            ]);
        }
        catch (error) {
            logger_1.logger.error('❌ Failed to log outbound manual message', { error });
        }
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
            const remoteJid = msg.key.remoteJid || '';
            const senderId = msg.key.participant || msg.key.remoteJid || '';
            // Try to resolve LID to phone number
            let senderPhone;
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
                                const phoneJid = status.id;
                                if (phoneJid && phoneJid.includes('@s.whatsapp.net')) {
                                    senderPhone = phoneJid.split('@')[0];
                                    this.lidToPhone.set(lid, senderPhone);
                                    logger_1.logger.info('[LID Resolver] Resolved LID to phone', { lid, phone: senderPhone });
                                }
                            }
                        }
                        catch (e) {
                            // Fallback - check if there's a verifiedName or other identifier
                            logger_1.logger.debug('[LID Resolver] Could not resolve LID', { lid, error: e.message });
                        }
                    }
                }
            }
            else if (remoteJid.includes('@s.whatsapp.net')) {
                // Regular phone number format
                senderPhone = remoteJid.split('@')[0];
            }
            const incomingMessage = {
                wa_message_id: msg.key.id || '',
                from: remoteJid,
                to: bot.phone_number || '',
                message_type: 'text',
                content: messageContent,
                is_group: remoteJid.endsWith('@g.us') || false,
                sender_id: senderId,
                sender_name: msg.pushName || 'Unknown',
                timestamp: new Date(msg.messageTimestamp * 1000).toISOString(),
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
            logger_1.logger.info('✅ Incoming message parsed', {
                bot_id: bot.id,
                from: incomingMessage.from,
                content: incomingMessage.content,
                mentions: mentioned_jids,
                has_quote: !!quoted_message,
                message_type: Object.keys(msg.message || {})[0],
            });
            // Log INBOUND message to database
            try {
                await (0, connection_1.query)(`
                    INSERT INTO messages (
                        id, bot_id, wa_message_id, direction, source,
                        message_type, content, created_at
                    ) VALUES (?, ?, ?, 'inbound', 'inbound', ?, ?, ?)
                `, [
                    (0, uuid_1.v4)(),
                    bot.id,
                    incomingMessage.wa_message_id,
                    'text', // Simplified, or use incomingMessage.message_type
                    incomingMessage.content,
                    // Convert ISO to SQLite format if needed, but ISO is standard text
                    incomingMessage.timestamp || new Date().toISOString()
                ]);
            }
            catch (logError) {
                logger_1.logger.error('Failed to log inbound message', { error: logError });
            }
            await eventBus_1.eventBus.emit(types_1.EventType.MESSAGE_RECEIVED, {
                tenant_id: bot.tenant_id,
                bot_id: bot.id,
                channel: 'wa',
                group_id: incomingMessage.is_group ? incomingMessage.from : null,
                contact_id: !incomingMessage.is_group ? incomingMessage.from : null,
                message: incomingMessage.content,
                timestamp: incomingMessage.timestamp,
            }, {
                ...incomingMessage,
                mentioned_jids,
                quoted_message
            });
        }
        catch (error) {
            logger_1.logger.error('Failed to handle incoming message', { error, bot_id: bot.id });
        }
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
        // Check if socket is actually connected (not just exists in memory)
        // @ts-ignore - accessing internal state
        const connectionState = sock.ws?.readyState;
        // WebSocket.OPEN = 1, WebSocket.CLOSED = 3
        if (connectionState !== 1) {
            logger_1.logger.warn('Socket exists but WebSocket is not open', {
                bot_id: botId,
                ws_state: connectionState
            });
            // Clean up disconnected socket
            this.sockets.delete(botId);
            // Update database status
            await botRepository_1.botRepository.update(botId, {
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
    async pauseBot(botId) {
        logger_1.logger.info('Pausing bot', { bot_id: botId });
        // Mark this bot as paused
        this.pausedBots.add(botId);
        const sock = this.sockets.get(botId);
        if (sock) {
            try {
                // Close the socket connection gracefully
                sock.end(undefined);
                logger_1.logger.info('Socket connection closed', { bot_id: botId });
            }
            catch (error) {
                logger_1.logger.warn('Error closing socket', { error, bot_id: botId });
            }
            // Remove socket from memory
            this.sockets.delete(botId);
            logger_1.logger.info('Socket removed from memory', {
                bot_id: botId,
                remaining_sockets: this.sockets.size
            });
        }
        else {
            logger_1.logger.warn('No socket found to pause', { bot_id: botId });
        }
        // NOTE: We do NOT delete session data from auth_info_baileys folder
        // This allows the bot to resume without scanning QR code again
    }
    /**
     * Resume bot (reconnect a paused bot)
     */
    async resumeBot(botId) {
        logger_1.logger.info('Resuming bot', { bot_id: botId });
        // Remove from paused bots set
        this.pausedBots.delete(botId);
        // Re-initialize the bot connection
        await this.initializeBot(botId);
        logger_1.logger.info('Bot resumed successfully', { bot_id: botId });
    }
    /**
     * Send message
     */
    async sendMessage(botId, recipient, message) {
        logger_1.logger.info('🔍 sendMessage called', {
            bot_id: botId,
            recipient,
            type: message.type,
            total_sockets: this.sockets.size,
            has_socket: this.sockets.has(botId),
            all_bot_ids: Array.from(this.sockets.keys())
        });
        let sock = this.sockets.get(botId);
        if (!sock) {
            logger_1.logger.warn('⚠️ Socket not found, checking bot status...', {
                bot_id: botId,
                available_sockets: Array.from(this.sockets.keys()),
                total_sockets: this.sockets.size
            });
            // Check if bot exists and has valid session
            const bot = await botRepository_1.botRepository.findById(botId);
            const hasSession = this.hasValidSession(botId);
            // Re-initialize if: (1) connected status, OR (2) has valid session file
            if (bot && (bot.status === 'connected' || hasSession)) {
                logger_1.logger.info('🔄 Attempting to re-initialize bot...', {
                    bot_id: botId,
                    bot_name: bot.name,
                    bot_status: bot.status,
                    has_valid_session: hasSession
                });
                // Re-initialize the bot
                await this.initializeBot(botId);
                // Wait for connection to establish with retries
                let connected = false;
                for (let i = 0; i < 10; i++) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                    sock = this.sockets.get(botId);
                    if (sock) {
                        // Also check if connection is actually open
                        const botStatus = await botRepository_1.botRepository.findById(botId);
                        if (botStatus?.status === 'connected') {
                            connected = true;
                            logger_1.logger.info('✅ Bot re-initialized and connected', { bot_id: botId, attempt: i + 1 });
                            break;
                        }
                    }
                }
                if (!connected || !sock) {
                    logger_1.logger.error('❌ Re-initialization failed - bot not connected after retries', { bot_id: botId });
                    throw new Error(`Bot not connected: ${botId}. Please wait for connection or reconnect.`);
                }
            }
            else {
                logger_1.logger.error('❌ Bot not initialized - no socket and no valid session!', {
                    bot_id: botId,
                    bot_status: bot?.status || 'not found',
                    has_valid_session: hasSession,
                    available_sockets: Array.from(this.sockets.keys()),
                    total_sockets: this.sockets.size
                });
                throw new Error(`Bot not initialized: ${botId}. Please connect the bot first.`);
            }
        }
        // Validate recipient - should be a digits-only string if not already a JID
        const phoneOnly = recipient.split('@')[0].replace(/\D/g, '');
        if (!phoneOnly || phoneOnly.length < 5) {
            logger_1.logger.error('❌ Invalid recipient format', { recipient });
            throw new Error(`Invalid phone number: ${recipient}`);
        }
        const jid = recipient.includes('@') ? recipient : `${recipient}@s.whatsapp.net`;
        try {
            let result;
            if (message.type === 'text') {
                result = await sock.sendMessage(jid, { text: message.content || '' });
                logger_1.logger.info('✅ Message sent successfully', {
                    bot_id: botId,
                    recipient: jid,
                    message_id: result?.key?.id
                });
            }
            else if (message.type === 'image') {
                let media;
                let mimetype = 'image/jpeg';
                if (message.media_url?.startsWith('data:')) {
                    const matches = message.media_url.match(/^data:([^;]+);base64,(.+)$/);
                    if (matches && matches[2]) {
                        media = Buffer.from(matches[2], 'base64');
                        mimetype = matches[1];
                    }
                }
                else if (message.media_url) {
                    media = { url: message.media_url };
                }
                if (!media)
                    throw new Error('Invalid media configuration');
                const payload = { image: media, caption: message.caption };
                if (Buffer.isBuffer(media))
                    payload.mimetype = mimetype;
                result = await sock.sendMessage(jid, payload);
                logger_1.logger.info('✅ Image message sent successfully', {
                    bot_id: botId,
                    recipient: jid,
                    message_id: result?.key?.id
                });
            }
            else {
                throw new Error(`Unsupported message type: ${message.type}`);
            }
            // Log full result to see LID info
            logger_1.logger.info('📨 sendMessage result', {
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
                    const { lidPhoneMappingService } = await Promise.resolve().then(() => __importStar(require('../../services/lidPhoneMappingService')));
                    await lidPhoneMappingService.upsertMapping({
                        bot_id: botId,
                        lid: lid,
                        phone: phone
                    });
                    logger_1.logger.info('🔗 Auto-captured LID mapping', { lid, phone, bot_id: botId });
                }
                catch (mapError) {
                    logger_1.logger.warn('Failed to auto-capture LID mapping', { error: mapError });
                }
            }
            return {
                message_id: result?.key?.id || `msg_${Date.now()}`,
                sent_at: new Date().toISOString(),
            };
        }
        catch (error) {
            logger_1.logger.error('❌ Failed to send message', { error, bot_id: botId, recipient: jid });
            throw error;
        }
    }
    /**
     * Disconnect
     */
    async disconnect(botId) {
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
    /**
     * Get socket for bot (for group operations)
     */
    getSocket(botId) {
        return this.sockets.get(botId);
    }
}
exports.whatsappAdapter = new BaileysWhatsAppAdapter();
//# sourceMappingURL=whatsappAdapter.baileys.js.map