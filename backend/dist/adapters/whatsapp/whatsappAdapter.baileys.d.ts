/**
 * Baileys WhatsApp Adapter
 * Lighter alternative to whatsapp-web.js - no Chromium needed!
 */
import { WASocket } from '@whiskeysockets/baileys';
import { IWhatsAppAdapter, WhatsAppMessage } from './IWhatsAppAdapter';
declare class BaileysWhatsAppAdapter implements IWhatsAppAdapter {
    private sockets;
    private qrCodes;
    private pairingCodes;
    private pausedBots;
    private reconnecting;
    private lidToPhone;
    private sessionPath;
    private cachedWAVersion;
    private contactsCache;
    private chatsCache;
    constructor();
    /** Path to the chats store file for a bot */
    private chatsStorePath;
    /** Save chats cache to disk so it persists across restarts */
    private saveChatsToFile;
    /** Read chats from disk file (used when in-memory cache is empty) */
    private readChatsFromFile;
    /**
     * Fetch & cache WhatsApp Web version (only fetches once per process lifetime)
     */
    private getWAVersion;
    /**
     * Check if a bot has a valid session (creds.json exists)
     */
    hasValidSession(botId: string): boolean;
    /**
     * Clear session files for a bot, forcing fresh QR on next init.
     * Called when WhatsApp returns 405 or badSession.
     */
    clearSession(botId: string): void;
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
     * Request a phone number pairing code (alternative to QR scan)
     * Phone number is read automatically from the bot's DB record.
     * User enters this 8-digit code in WhatsApp > Linked Devices > Link with Phone Number
     */
    requestPairingCode(botId: string): Promise<{
        code: string;
        phone: string;
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
    /**
     * Get cached contacts for a bot.
     */
    getContactsForBot(botId: string): Map<string, any>;
    /**
     * Get all cached chats for a bot (individual + groups).
     * Falls back to file-based store if in-memory cache is empty.
     */
    getChatsForBot(botId: string): Map<string, any>;
    /**
     * Fetch all groups the bot is participating in via Baileys API.
     */
    getAllGroupsForBot(botId: string): Promise<Record<string, any>>;
    /**
     * Force bot to reconnect (triggers chats.set which refreshes the full chat list).
     * Useful for sync when cache is empty.
     */
    forceReconnect(botId: string): Promise<void>;
}
export declare const whatsappAdapter: BaileysWhatsAppAdapter;
export {};
//# sourceMappingURL=whatsappAdapter.baileys.d.ts.map