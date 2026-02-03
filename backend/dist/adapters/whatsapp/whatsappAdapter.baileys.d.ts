/**
 * Baileys WhatsApp Adapter
 * Lighter alternative to whatsapp-web.js - no Chromium needed!
 */
import { WASocket } from '@whiskeysockets/baileys';
import { IWhatsAppAdapter, WhatsAppMessage } from './IWhatsAppAdapter';
declare class BaileysWhatsAppAdapter implements IWhatsAppAdapter {
    private sockets;
    private qrCodes;
    private pausedBots;
    private lidToPhone;
    private sessionPath;
    constructor();
    /**
     * Check if a bot has a valid session (creds.json exists)
     */
    hasValidSession(botId: string): boolean;
    /**
     * Initialize a bot session
     */
    initializeBot(botId: string): Promise<void>;
    /**
     * Setup event handlers
     */
    private setupEventHandlers;
    /**
     * Handle Logger for Outbound (Manual) Messages
     */
    private handleOutboundLog;
    /**
     * Handle incoming message
     */
    private handleIncomingMessage;
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
     * Pause bot (disconnect socket but keep session data)
     */
    pauseBot(botId: string): Promise<void>;
    /**
     * Resume bot (reconnect a paused bot)
     */
    resumeBot(botId: string): Promise<void>;
    /**
     * Send message
     */
    sendMessage(botId: string, recipient: string, message: WhatsAppMessage): Promise<{
        message_id: string;
        sent_at: string;
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
    /**
     * Get socket for bot (for group operations)
     */
    getSocket(botId: string): WASocket | undefined;
}
export declare const whatsappAdapter: BaileysWhatsAppAdapter;
export {};
//# sourceMappingURL=whatsappAdapter.baileys.d.ts.map