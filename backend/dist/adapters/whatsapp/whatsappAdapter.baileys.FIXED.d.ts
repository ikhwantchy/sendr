/**
 * Baileys WhatsApp Adapter - FIXED VERSION
 * Properly implements makeInMemoryStore and event handling
 */
import { IWhatsAppAdapter, WhatsAppMessage } from './IWhatsAppAdapter';
declare class BaileysWhatsAppAdapter implements IWhatsAppAdapter {
    private sockets;
    private stores;
    private qrCodes;
    private sessionPath;
    constructor();
    /**
     * Initialize a bot session
     */
    initializeBot(botId: string): Promise<void>;
    /**
     * Setup event handlers
     */
    private setupEventHandlers;
    /**
     * Handle incoming message
     */
    private handleIncomingMessage;
    /**
     * Send message
     */
    sendMessage(botId: string, recipient: string, message: WhatsAppMessage): Promise<{
        message_id: string;
        sent_at: string;
    }>;
    /**
     * Request QR code
     */
    requestQRCode(botId: string): Promise<{
        qr_code: string;
        expires_at: string;
    }>;
    /**
     * Get connection status
     */
    getConnectionStatus(botId: string): Promise<{
        status: 'connected' | 'disconnected' | 'connecting';
        phone_number?: string;
        device_name?: string;
    }>;
    /**
     * Disconnect
     */
    disconnect(botId: string): Promise<void>;
    /**
     * Destroy session
     */
    destroySession(botId: string): Promise<void>;
    /**
     * Get active clients
     */
    getActiveClients(): string[];
}
export declare const whatsappAdapter: BaileysWhatsAppAdapter;
export {};
//# sourceMappingURL=whatsappAdapter.baileys.FIXED.d.ts.map