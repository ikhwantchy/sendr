"use strict";
/**
 * MOCK WhatsApp Adapter for Development
 *
 * This is a SIMPLIFIED version for testing without real WhatsApp connection
 * Replace with real whatsappAdapter.ts when ready for production
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.whatsappAdapter = void 0;
const qrcode_1 = __importDefault(require("qrcode"));
const eventBus_1 = require("../../core/events/eventBus");
const types_1 = require("../../core/events/types");
const logger_1 = require("../../utils/logger");
const botRepository_1 = require("../../database/repositories/botRepository");
class MockWhatsAppAdapter {
    qrCodes = new Map();
    connectedBots = new Set();
    /**
     * Initialize a bot session (MOCK)
     */
    async initializeBot(botId) {
        logger_1.logger.info('[MOCK] Initializing bot', { bot_id: botId });
        // No-op for mock
    }
    /**
     * Request QR code for authentication (MOCK)
     */
    async requestQRCode(botId) {
        logger_1.logger.info('[MOCK] Generating QR code', { bot_id: botId });
        // Generate a mock QR code
        const mockData = `MOCK_QR_${botId}_${Date.now()}`;
        const qrDataUrl = await qrcode_1.default.toDataURL(mockData);
        const expiresAt = new Date(Date.now() + 60000).toISOString(); // 1 minute
        const qrData = {
            qr_code: qrDataUrl,
            expires_at: expiresAt,
        };
        this.qrCodes.set(botId, qrData);
        // Update bot in database
        await botRepository_1.botRepository.update(botId, {
            qr_code: qrDataUrl,
            qr_expires_at: expiresAt,
            status: 'connecting',
        });
        // Get bot for tenant_id
        const bot = await botRepository_1.botRepository.findById(botId);
        if (!bot) {
            throw new Error('Bot not found');
        }
        // Emit event
        await eventBus_1.eventBus.emit(types_1.EventType.WA_QR_GENERATED, {
            tenant_id: bot.tenant_id,
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
        // Auto-connect after 5 seconds (simulate QR scan)
        setTimeout(async () => {
            await this.simulateConnection(botId);
        }, 5000);
        return qrData;
    }
    /**
     * Simulate WhatsApp connection (MOCK)
     */
    async simulateConnection(botId) {
        logger_1.logger.info('[MOCK] Simulating WhatsApp connection', { bot_id: botId });
        const bot = await botRepository_1.botRepository.findById(botId);
        if (!bot)
            return;
        // Mark as connected
        this.connectedBots.add(botId);
        // Update bot status
        await botRepository_1.botRepository.update(botId, {
            status: 'connected',
            phone_number: '+1234567890',
            qr_code: null,
            qr_expires_at: null,
            last_connected_at: new Date().toISOString(),
        });
        // Emit event
        await eventBus_1.eventBus.emit(types_1.EventType.WA_CONNECTED, {
            tenant_id: bot.tenant_id,
            bot_id: botId,
            channel: 'wa',
            group_id: null,
            contact_id: null,
            message: null,
            timestamp: new Date().toISOString(),
        }, {
            phone_number: '+1234567890',
            device_name: 'Mock Device',
            connected_at: new Date().toISOString(),
        });
        logger_1.logger.info('[MOCK] Bot connected successfully', { bot_id: botId });
    }
    /**
     * Get connection status (MOCK)
     */
    async getConnectionStatus(botId) {
        if (this.connectedBots.has(botId)) {
            return {
                status: 'connected',
                phone_number: '+1234567890',
                device_name: 'Mock Device',
            };
        }
        if (this.qrCodes.has(botId)) {
            return { status: 'connecting' };
        }
        return { status: 'disconnected' };
    }
    /**
     * Send a message (MOCK)
     */
    async sendMessage(botId, recipient, message) {
        if (!this.connectedBots.has(botId)) {
            throw new Error(`Bot not connected: ${botId}`);
        }
        logger_1.logger.info('[MOCK] Sending message', {
            bot_id: botId,
            recipient,
            type: message.type,
            content: message.content,
        });
        return {
            message_id: `mock_msg_${Date.now()}`,
            sent_at: new Date().toISOString(),
        };
    }
    /**
     * Disconnect a bot (MOCK)
     */
    async disconnect(botId) {
        logger_1.logger.info('[MOCK] Disconnecting bot', { bot_id: botId });
        this.connectedBots.delete(botId);
        this.qrCodes.delete(botId);
        await botRepository_1.botRepository.update(botId, {
            status: 'disconnected',
        });
    }
    /**
     * Destroy a bot session (MOCK)
     */
    async destroySession(botId) {
        await this.disconnect(botId);
        logger_1.logger.info('[MOCK] Session destroyed', { bot_id: botId });
    }
    /**
     * Get all active clients (MOCK)
     */
    getActiveClients() {
        return Array.from(this.connectedBots);
    }
    /**
     * Simulate receiving a message (for testing)
     */
    async simulateIncomingMessage(botId, from, content) {
        const bot = await botRepository_1.botRepository.findById(botId);
        if (!bot)
            return;
        const incomingMessage = {
            wa_message_id: `mock_${Date.now()}`,
            from,
            to: bot.phone_number || '',
            message_type: 'text',
            content,
            is_group: false,
            sender_name: 'Test User',
            timestamp: new Date().toISOString(),
        };
        await eventBus_1.eventBus.emit(types_1.EventType.MESSAGE_RECEIVED, {
            tenant_id: bot.tenant_id,
            bot_id: botId,
            channel: 'wa',
            group_id: null,
            contact_id: from,
            message: content,
            timestamp: incomingMessage.timestamp,
        }, incomingMessage);
        logger_1.logger.info('[MOCK] Simulated incoming message', { bot_id: botId, from, content });
    }
}
// Export singleton instance
exports.whatsappAdapter = new MockWhatsAppAdapter();
//# sourceMappingURL=whatsappAdapter.mock.js.map