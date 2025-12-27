/**
 * WhatsApp Adapter Interface
 * 
 * This interface MUST be implemented by any WhatsApp provider
 * NO business logic should be in the adapter
 * The adapter is FULLY REPLACEABLE
 */

export interface IWhatsAppAdapter {
    /**
     * Initialize a bot session
     */
    initializeBot(botId: string, config?: any): Promise<void>;

    /**
     * Request QR code for authentication
     * Returns QR code string and expiry time
     */
    requestQRCode(botId: string): Promise<{
        qr_code: string;
        expires_at: string;
    }>;

    /**
     * Check connection status
     */
    getConnectionStatus(botId: string): Promise<{
        status: 'connected' | 'disconnected' | 'connecting';
        phone_number?: string;
        device_name?: string;
    }>;

    /**
     * Send a message
     */
    sendMessage(
        botId: string,
        recipient: string,
        message: WhatsAppMessage
    ): Promise<{
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
}

export interface WhatsAppMessage {
    type: 'text' | 'image' | 'document' | 'audio' | 'video';
    content?: string;
    media_url?: string;
    caption?: string;
    filename?: string;
}

export interface WhatsAppIncomingMessage {
    wa_message_id: string;
    from: string;
    to: string;
    message_type: 'text' | 'image' | 'document' | 'audio' | 'video';
    content: string;
    media_url?: string;
    is_group: boolean;
    group_name?: string;
    sender_name?: string;
    timestamp: string;
}
