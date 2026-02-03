/**
 * MOCK WhatsApp Adapter for Development
 *
 * This is a SIMPLIFIED version for testing without real WhatsApp connection
 * Replace with real whatsappAdapter.ts when ready for production
 */
import { IWhatsAppAdapter, WhatsAppMessage } from './IWhatsAppAdapter';
declare class MockWhatsAppAdapter implements IWhatsAppAdapter {
    private qrCodes;
    private connectedBots;
    /**
     * Initialize a bot session (MOCK)
     */
    initializeBot(botId: string): Promise<void>;
    /**
     * Request QR code for authentication (MOCK)
     */
    requestQRCode(botId: string): Promise<{
        qr_code: string;
        expires_at: string;
    }>;
    /**
     * Simulate WhatsApp connection (MOCK)
     */
    private simulateConnection;
    /**
     * Get connection status (MOCK)
     */
    getConnectionStatus(botId: string): Promise<{
        status: 'connected' | 'disconnected' | 'connecting';
        phone_number?: string;
        device_name?: string;
    }>;
    /**
     * Send a message (MOCK)
     */
    sendMessage(botId: string, recipient: string, message: WhatsAppMessage): Promise<{
        message_id: string;
        sent_at: string;
    }>;
    /**
     * Disconnect a bot (MOCK)
     */
    disconnect(botId: string): Promise<void>;
    /**
     * Destroy a bot session (MOCK)
     */
    destroySession(botId: string): Promise<void>;
    /**
     * Get all active clients (MOCK)
     */
    getActiveClients(): string[];
    /**
     * Simulate receiving a message (for testing)
     */
    simulateIncomingMessage(botId: string, from: string, content: string): Promise<void>;
}
export declare const whatsappAdapter: MockWhatsAppAdapter;
export {};
//# sourceMappingURL=whatsappAdapter.mock.d.ts.map