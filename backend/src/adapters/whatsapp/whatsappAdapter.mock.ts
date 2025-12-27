/**
 * MOCK WhatsApp Adapter for Development
 * 
 * This is a SIMPLIFIED version for testing without real WhatsApp connection
 * Replace with real whatsappAdapter.ts when ready for production
 */

import QRCode from 'qrcode';
import { IWhatsAppAdapter, WhatsAppMessage, WhatsAppIncomingMessage } from './IWhatsAppAdapter';
import { eventBus } from '../../core/events/eventBus';
import { EventType } from '../../core/events/types';
import { logger } from '../../utils/logger';
import { botRepository } from '../../database/repositories/botRepository';

class MockWhatsAppAdapter implements IWhatsAppAdapter {
    private qrCodes: Map<string, { qr_code: string; expires_at: string }> = new Map();
    private connectedBots: Set<string> = new Set();

    /**
     * Initialize a bot session (MOCK)
     */
    public async initializeBot(botId: string): Promise<void> {
        logger.info('[MOCK] Initializing bot', { bot_id: botId });
        // No-op for mock
    }

    /**
     * Request QR code for authentication (MOCK)
     */
    public async requestQRCode(botId: string): Promise<{ qr_code: string; expires_at: string }> {
        logger.info('[MOCK] Generating QR code', { bot_id: botId });

        // Generate a mock QR code
        const mockData = `MOCK_QR_${botId}_${Date.now()}`;
        const qrDataUrl = await QRCode.toDataURL(mockData);
        const expiresAt = new Date(Date.now() + 60000).toISOString(); // 1 minute

        const qrData = {
            qr_code: qrDataUrl,
            expires_at: expiresAt,
        };

        this.qrCodes.set(botId, qrData);

        // Update bot in database
        await botRepository.update(botId, {
            qr_code: qrDataUrl,
            qr_expires_at: expiresAt,
            status: 'connecting',
        });

        // Get bot for tenant_id
        const bot = await botRepository.findById(botId);
        if (!bot) {
            throw new Error('Bot not found');
        }

        // Emit event
        await eventBus.emit(
            EventType.WA_QR_GENERATED,
            {
                tenant_id: bot.tenant_id,
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

        // Auto-connect after 5 seconds (simulate QR scan)
        setTimeout(async () => {
            await this.simulateConnection(botId);
        }, 5000);

        return qrData;
    }

    /**
     * Simulate WhatsApp connection (MOCK)
     */
    private async simulateConnection(botId: string): Promise<void> {
        logger.info('[MOCK] Simulating WhatsApp connection', { bot_id: botId });

        const bot = await botRepository.findById(botId);
        if (!bot) return;

        // Mark as connected
        this.connectedBots.add(botId);

        // Update bot status
        await botRepository.update(botId, {
            status: 'connected',
            phone_number: '+1234567890',
            qr_code: null,
            qr_expires_at: null,
            last_connected_at: new Date().toISOString(),
        });

        // Emit event
        await eventBus.emit(
            EventType.WA_CONNECTED,
            {
                tenant_id: bot.tenant_id,
                bot_id: botId,
                channel: 'wa',
                group_id: null,
                contact_id: null,
                message: null,
                timestamp: new Date().toISOString(),
            },
            {
                phone_number: '+1234567890',
                device_name: 'Mock Device',
                connected_at: new Date().toISOString(),
            }
        );

        logger.info('[MOCK] Bot connected successfully', { bot_id: botId });
    }

    /**
     * Get connection status (MOCK)
     */
    public async getConnectionStatus(botId: string): Promise<{
        status: 'connected' | 'disconnected' | 'connecting';
        phone_number?: string;
        device_name?: string;
    }> {
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
    public async sendMessage(
        botId: string,
        recipient: string,
        message: WhatsAppMessage
    ): Promise<{ message_id: string; sent_at: string }> {
        if (!this.connectedBots.has(botId)) {
            throw new Error(`Bot not connected: ${botId}`);
        }

        logger.info('[MOCK] Sending message', {
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
    public async disconnect(botId: string): Promise<void> {
        logger.info('[MOCK] Disconnecting bot', { bot_id: botId });

        this.connectedBots.delete(botId);
        this.qrCodes.delete(botId);

        await botRepository.update(botId, {
            status: 'disconnected',
        });
    }

    /**
     * Destroy a bot session (MOCK)
     */
    public async destroySession(botId: string): Promise<void> {
        await this.disconnect(botId);
        logger.info('[MOCK] Session destroyed', { bot_id: botId });
    }

    /**
     * Get all active clients (MOCK)
     */
    public getActiveClients(): string[] {
        return Array.from(this.connectedBots);
    }

    /**
     * Simulate receiving a message (for testing)
     */
    public async simulateIncomingMessage(botId: string, from: string, content: string): Promise<void> {
        const bot = await botRepository.findById(botId);
        if (!bot) return;

        const incomingMessage: WhatsAppIncomingMessage = {
            wa_message_id: `mock_${Date.now()}`,
            from,
            to: bot.phone_number || '',
            message_type: 'text',
            content,
            is_group: false,
            sender_name: 'Test User',
            timestamp: new Date().toISOString(),
        };

        await eventBus.emit(
            EventType.MESSAGE_RECEIVED,
            {
                tenant_id: bot.tenant_id,
                bot_id: botId,
                channel: 'wa',
                group_id: null,
                contact_id: from,
                message: content,
                timestamp: incomingMessage.timestamp,
            },
            incomingMessage as any
        );

        logger.info('[MOCK] Simulated incoming message', { bot_id: botId, from, content });
    }
}

// Export singleton instance
export const whatsappAdapter = new MockWhatsAppAdapter();
