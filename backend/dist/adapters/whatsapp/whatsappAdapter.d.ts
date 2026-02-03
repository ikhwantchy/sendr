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
import { IWhatsAppAdapter, WhatsAppMessage } from './IWhatsAppAdapter';
declare class WhatsAppWebAdapter implements IWhatsAppAdapter {
    private clients;
    private qrCodes;
    private sessionPath;
    constructor();
    /**
     * Ensure session directory exists
     */
    private ensureSessionPath;
    /**
     * Initialize a bot session
     */
    initializeBot(botId: string, config?: any): Promise<void>;
    /**
     * Setup event handlers for WhatsApp client
     */
    private setupEventHandlers;
    /**
     * Handle incoming WhatsApp message
     */
    private handleIncomingMessage;
    /**
     * Get message type
     */
    private getMessageType;
    /**
     * Download media from message
     */
    private downloadMedia;
    /**
     * Request QR code for authentication
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
     * Send a message
     */
    sendMessage(botId: string, recipient: string, message: WhatsAppMessage): Promise<{
        message_id: string;
        sent_at: string;
    }>;
    /**
     * Disconnect a bot
     */
    disconnect(botId: string): Promise<void>;
    /**
     * Destroy a bot session completely
     */
    destroySession(botId: string): Promise<void>;
    /**
     * Get all active clients
     */
    getActiveClients(): string[];
}
export declare const whatsappAdapter: WhatsAppWebAdapter;
export {};
//# sourceMappingURL=whatsappAdapter.d.ts.map