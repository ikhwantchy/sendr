"use strict";
/**
 * WhatsApp Web.js Adapter Implementation
 *
 * This is a CONCRETE implementation using whatsapp-web.js
 * It can be REPLACED with any other provider (official API, Baileys, etc.)
 *
 * RULES:
 * - NO business logic here
 * - ONLY WhatsApp communication
 * - Emit events for all important actions
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.whatsappAdapter = void 0;
const whatsapp_web_js_1 = require("whatsapp-web.js");
const qrcode_1 = __importDefault(require("qrcode"));
const path_1 = __importDefault(require("path"));
const promises_1 = __importDefault(require("fs/promises"));
const eventBus_1 = require("../../core/events/eventBus");
const types_1 = require("../../core/events/types");
const logger_1 = require("../../utils/logger");
const botRepository_1 = require("../../database/repositories/botRepository");
class WhatsAppWebAdapter {
    clients = new Map();
    qrCodes = new Map();
    sessionPath;
    constructor() {
        this.sessionPath = process.env.WA_SESSION_PATH || './sessions';
        this.ensureSessionPath();
    }
    /**
     * Ensure session directory exists
     */
    async ensureSessionPath() {
        try {
            await promises_1.default.mkdir(this.sessionPath, { recursive: true });
        }
        catch (error) {
            logger_1.logger.error('Failed to create session directory', { error });
        }
    }
    /**
     * Initialize a bot session
     */
    async initializeBot(botId, config) {
        if (this.clients.has(botId)) {
            logger_1.logger.warn('Bot already initialized', { bot_id: botId });
            return;
        }
        logger_1.logger.info('Initializing WhatsApp bot', { bot_id: botId });
        // Get bot details from database
        const bot = await botRepository_1.botRepository.findById(botId);
        if (!bot) {
            throw new Error(`Bot not found: ${botId}`);
        }
        // Create WhatsApp client
        const client = new whatsapp_web_js_1.Client({
            authStrategy: new whatsapp_web_js_1.LocalAuth({
                clientId: botId,
                dataPath: this.sessionPath,
            }),
            puppeteer: {
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox'],
            },
        });
        // Setup event handlers
        this.setupEventHandlers(client, bot);
        // Store client
        this.clients.set(botId, client);
        // Initialize client
        await client.initialize();
    }
    /**
     * Setup event handlers for WhatsApp client
     */
    setupEventHandlers(client, bot) {
        const botId = bot.id;
        const tenantId = bot.tenant_id;
        // QR Code event
        client.on('qr', async (qr) => {
            logger_1.logger.info('QR Code generated', { bot_id: botId });
            try {
                // Generate QR code as data URL
                const qrDataUrl = await qrcode_1.default.toDataURL(qr);
                const expiresAt = new Date(Date.now() + 60000).toISOString(); // 1 minute
                // Store QR code
                this.qrCodes.set(botId, {
                    qr_code: qrDataUrl,
                    expires_at: expiresAt,
                });
                // Update bot in database
                await botRepository_1.botRepository.update(botId, {
                    qr_code: qrDataUrl,
                    qr_expires_at: expiresAt,
                    status: 'connecting',
                });
                // Emit event
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
        });
        // Ready event (connected)
        client.on('ready', async () => {
            logger_1.logger.info('WhatsApp client ready', { bot_id: botId });
            try {
                const info = client.info;
                // Update bot status
                await botRepository_1.botRepository.update(botId, {
                    status: 'connected',
                    phone_number: info.wid.user,
                    qr_code: null,
                    qr_expires_at: null,
                    last_connected_at: new Date().toISOString(),
                });
                // Emit event
                await eventBus_1.eventBus.emit(types_1.EventType.WA_CONNECTED, {
                    tenant_id: tenantId,
                    bot_id: botId,
                    channel: 'wa',
                    group_id: null,
                    contact_id: null,
                    message: null,
                    timestamp: new Date().toISOString(),
                }, {
                    phone_number: info.wid.user,
                    device_name: info.pushname,
                    connected_at: new Date().toISOString(),
                });
            }
            catch (error) {
                logger_1.logger.error('Failed to handle ready event', { error, bot_id: botId });
            }
        });
        // Disconnected event
        client.on('disconnected', async (reason) => {
            logger_1.logger.warn('WhatsApp client disconnected', { bot_id: botId, reason });
            try {
                // Update bot status
                await botRepository_1.botRepository.update(botId, {
                    status: 'disconnected',
                });
                // Emit event
                await eventBus_1.eventBus.emit(types_1.EventType.WA_DISCONNECTED, {
                    tenant_id: tenantId,
                    bot_id: botId,
                    channel: 'wa',
                    group_id: null,
                    contact_id: null,
                    message: null,
                    timestamp: new Date().toISOString(),
                }, {
                    reason,
                    disconnected_at: new Date().toISOString(),
                });
                // Remove client
                this.clients.delete(botId);
            }
            catch (error) {
                logger_1.logger.error('Failed to handle disconnect event', { error, bot_id: botId });
            }
        });
        // Message received event
        client.on('message', async (message) => {
            try {
                await this.handleIncomingMessage(message, bot);
            }
            catch (error) {
                logger_1.logger.error('Failed to handle incoming message', { error, bot_id: botId });
            }
        });
        // Error event
        client.on('auth_failure', async (error) => {
            logger_1.logger.error('WhatsApp authentication failed', { error, bot_id: botId });
            await botRepository_1.botRepository.update(botId, {
                status: 'error',
            });
            await eventBus_1.eventBus.emit(types_1.EventType.WA_ERROR, {
                tenant_id: tenantId,
                bot_id: botId,
                channel: 'wa',
                group_id: null,
                contact_id: null,
                message: null,
                timestamp: new Date().toISOString(),
            }, {
                error: 'Authentication failed',
            });
        });
    }
    /**
     * Handle incoming WhatsApp message
     */
    async handleIncomingMessage(message, bot) {
        const chat = await message.getChat();
        const contact = await message.getContact();
        const incomingMessage = {
            wa_message_id: message.id._serialized,
            from: message.from,
            to: message.to,
            message_type: this.getMessageType(message),
            content: message.body,
            media_url: message.hasMedia ? await this.downloadMedia(message) : undefined,
            is_group: chat.isGroup,
            group_name: chat.isGroup ? chat.name : undefined,
            sender_name: contact.pushname || contact.name || undefined,
            timestamp: new Date(message.timestamp * 1000).toISOString(),
        };
        logger_1.logger.debug('Incoming message', {
            bot_id: bot.id,
            from: incomingMessage.from,
            type: incomingMessage.message_type,
        });
        // Emit MESSAGE_RECEIVED event
        await eventBus_1.eventBus.emit(types_1.EventType.MESSAGE_RECEIVED, {
            tenant_id: bot.tenant_id,
            bot_id: bot.id,
            channel: 'wa',
            group_id: chat.isGroup ? chat.id._serialized : null,
            contact_id: !chat.isGroup ? contact.id._serialized : null,
            message: incomingMessage.content,
            timestamp: incomingMessage.timestamp,
        }, incomingMessage);
    }
    /**
     * Get message type
     */
    getMessageType(message) {
        if (message.hasMedia) {
            if (message.type === 'image')
                return 'image';
            if (message.type === 'document')
                return 'document';
            if (message.type === 'audio' || message.type === 'ptt')
                return 'audio';
            if (message.type === 'video')
                return 'video';
        }
        return 'text';
    }
    /**
     * Download media from message
     */
    async downloadMedia(message) {
        try {
            const media = await message.downloadMedia();
            if (!media)
                return undefined;
            // In production, upload to S3/CDN and return URL
            // For now, return data URL
            return `data:${media.mimetype};base64,${media.data}`;
        }
        catch (error) {
            logger_1.logger.error('Failed to download media', { error });
            return undefined;
        }
    }
    /**
     * Request QR code for authentication
     */
    async requestQRCode(botId) {
        // Initialize bot if not already
        if (!this.clients.has(botId)) {
            await this.initializeBot(botId);
        }
        // Wait for QR code (max 30 seconds)
        const maxWait = 30000;
        const startTime = Date.now();
        while (Date.now() - startTime < maxWait) {
            const qrData = this.qrCodes.get(botId);
            if (qrData) {
                return qrData;
            }
            await new Promise((resolve) => setTimeout(resolve, 500));
        }
        throw new Error('QR code generation timeout');
    }
    /**
     * Get connection status
     */
    async getConnectionStatus(botId) {
        const client = this.clients.get(botId);
        if (!client) {
            return { status: 'disconnected' };
        }
        const state = await client.getState();
        if (state === 'CONNECTED') {
            const info = client.info;
            return {
                status: 'connected',
                phone_number: info?.wid.user,
                device_name: info?.pushname,
            };
        }
        return { status: 'connecting' };
    }
    /**
     * Send a message
     */
    async sendMessage(botId, recipient, message) {
        const client = this.clients.get(botId);
        if (!client) {
            throw new Error(`Bot not initialized: ${botId}`);
        }
        logger_1.logger.debug('Sending message', {
            bot_id: botId,
            recipient,
            type: message.type,
        });
        let sentMessage;
        if (message.type === 'text') {
            sentMessage = await client.sendMessage(recipient, message.content || '');
        }
        else if (message.type === 'image' && message.media_url) {
            // In production, download from URL first
            sentMessage = await client.sendMessage(recipient, message.media_url, {
                caption: message.caption,
            });
        }
        else {
            throw new Error(`Unsupported message type: ${message.type}`);
        }
        return {
            message_id: sentMessage.id._serialized,
            sent_at: new Date().toISOString(),
        };
    }
    /**
     * Disconnect a bot
     */
    async disconnect(botId) {
        const client = this.clients.get(botId);
        if (client) {
            await client.destroy();
            this.clients.delete(botId);
        }
        this.qrCodes.delete(botId);
    }
    /**
     * Destroy a bot session completely
     */
    async destroySession(botId) {
        await this.disconnect(botId);
        // Delete session files
        const sessionDir = path_1.default.join(this.sessionPath, `session-${botId}`);
        try {
            await promises_1.default.rm(sessionDir, { recursive: true, force: true });
            logger_1.logger.info('Session destroyed', { bot_id: botId });
        }
        catch (error) {
            logger_1.logger.error('Failed to delete session files', { error, bot_id: botId });
        }
    }
    /**
     * Get all active clients
     */
    getActiveClients() {
        return Array.from(this.clients.keys());
    }
}
// Export singleton instance
exports.whatsappAdapter = new WhatsAppWebAdapter();
//# sourceMappingURL=whatsappAdapter.js.map