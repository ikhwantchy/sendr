/**
 * Meta Cloud API Adapter
 * ============================================================
 * Implements IWhatsAppAdapter using Meta's official WABA Cloud API
 * Replaces QR-code-based approach with Access Token auth
 */

import axios, { AxiosError } from 'axios';
import crypto from 'crypto';
import { IWhatsAppAdapter, WhatsAppMessage, WhatsAppIncomingMessage } from './IWhatsAppAdapter';
import { eventBus } from '../../core/events/eventBus';
import { EventType } from '../../core/events/types';
import { logger } from '../../utils/logger';
import { botRepository } from '../../database/repositories/botRepository';

const GRAPH_API_VERSION = 'v19.0';
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

// ─── Types ───────────────────────────────────────────────────

export interface MetaBotConfig {
    phone_number_id: string;
    access_token: string;
    waba_id: string;
    app_secret?: string;
}

export interface MetaTemplateMessage {
    type: 'template';
    template_name: string;
    template_language?: string;
    template_components?: MetaTemplateComponent[];
    content?: string;
    media_url?: string;
    caption?: string;
    filename?: string;
}

export interface MetaTemplateComponent {
    type: 'header' | 'body' | 'button';
    sub_type?: string;
    index?: number;
    parameters: MetaTemplateParameter[];
}

export interface MetaTemplateParameter {
    type: 'text' | 'image' | 'document' | 'video' | 'payload';
    text?: string;
    image?: { link: string };
    document?: { link: string; filename: string };
    payload?: string;
}

// ─── Adapter Class ───────────────────────────────────────────

class MetaCloudAdapter implements IWhatsAppAdapter {
    private configs: Map<string, MetaBotConfig> = new Map();

    // ── Lifecycle ──────────────────────────────────────────

    async initializeBot(botId: string, config?: MetaBotConfig): Promise<void> {
        if (config) {
            this.configs.set(botId, config);
            logger.info('[Meta] Bot initialized with provided config', { bot_id: botId });
            return;
        }

        const bot = await botRepository.findById(botId) as any;
        if (!bot?.meta_phone_number_id || !bot?.meta_access_token) {
            throw new Error(`Bot ${botId} tidak punya konfigurasi Meta Cloud API. Harap setup dulu.`);
        }

        const cfg: MetaBotConfig = {
            phone_number_id: bot.meta_phone_number_id,
            access_token: bot.meta_access_token,
            waba_id: bot.meta_waba_id || '',
            app_secret: bot.meta_app_secret || undefined,
        };

        this.configs.set(botId, cfg);

        // Verify connection
        const status = await this.getConnectionStatus(botId);
        if (status.status !== 'connected') {
            this.configs.delete(botId);
            throw new Error('Gagal terhubung ke Meta API. Periksa Access Token dan Phone Number ID.');
        }

        await botRepository.update(botId, {
            status: 'connected',
            phone_number: status.phone_number,
        });

        logger.info('[Meta] Bot initialized and connected', { bot_id: botId, phone: status.phone_number });
    }

    /**
     * WABA tidak pakai QR Code — return error yang jelas
     */
    async requestQRCode(_botId: string): Promise<{ qr_code: string; expires_at: string }> {
        throw new Error('Meta WABA tidak menggunakan QR Code. Gunakan Access Token di pengaturan bot.');
    }

    async getConnectionStatus(botId: string): Promise<{
        status: 'connected' | 'disconnected' | 'connecting';
        phone_number?: string;
        device_name?: string;
    }> {
        const cfg = this.configs.get(botId);
        if (!cfg) return { status: 'disconnected' };

        try {
            const res = await axios.get(`${GRAPH_BASE}/${cfg.phone_number_id}`, {
                headers: { Authorization: `Bearer ${cfg.access_token}` },
                params: { fields: 'display_phone_number,verified_name,quality_rating,account_mode' },
                timeout: 10000,
            });

            return {
                status: 'connected',
                phone_number: res.data.display_phone_number?.replace(/\D/g, '') || '',
                device_name: res.data.verified_name || 'WABA',
            };
        } catch (err: any) {
            const errMsg = err?.response?.data?.error?.message || err.message;
            logger.warn('[Meta] Connection check failed', { bot_id: botId, error: errMsg });
            return { status: 'disconnected' };
        }
    }

    // ── Send Message ───────────────────────────────────────

    async sendMessage(
        botId: string,
        recipient: string,
        message: WhatsAppMessage | MetaTemplateMessage
    ): Promise<{ message_id: string; sent_at: string }> {
        // Lazy load config if not in memory
        if (!this.configs.has(botId)) {
            await this.initializeBot(botId);
        }

        const cfg = this.configs.get(botId)!;

        // Normalize recipient: strip non-digits, remove leading +
        const to = recipient.replace(/\D/g, '');
        if (!to || to.length < 7) {
            throw new Error(`Nomor penerima tidak valid: ${recipient}`);
        }

        const payload = this._buildPayload(to, message);

        try {
            const res = await axios.post(
                `${GRAPH_BASE}/${cfg.phone_number_id}/messages`,
                payload,
                {
                    headers: {
                        Authorization: `Bearer ${cfg.access_token}`,
                        'Content-Type': 'application/json',
                    },
                    timeout: 15000,
                }
            );

            const messageId = res.data?.messages?.[0]?.id || '';
            logger.info('[Meta] Message sent', { bot_id: botId, to, message_id: messageId });

            return { message_id: messageId, sent_at: new Date().toISOString() };
        } catch (err: any) {
            const apiErr = err?.response?.data?.error;
            const errMsg = apiErr
                ? `Meta API Error (${apiErr.code}): ${apiErr.message}`
                : err.message;
            logger.error('[Meta] Failed to send message', { bot_id: botId, to, error: errMsg });
            throw new Error(errMsg);
        }
    }

    /**
     * Build Meta API payload from message
     */
    private _buildPayload(to: string, message: WhatsAppMessage | MetaTemplateMessage): any {
        const base = {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to,
        };

        if ((message as MetaTemplateMessage).template_name) {
            const tm = message as MetaTemplateMessage;
            return {
                ...base,
                type: 'template',
                template: {
                    name: tm.template_name,
                    language: { code: tm.template_language || 'id' },
                    components: tm.template_components || [],
                },
            };
        }

        switch (message.type) {
            case 'text':
                return {
                    ...base,
                    type: 'text',
                    text: { body: message.content || '', preview_url: false },
                };
            case 'image':
                return {
                    ...base,
                    type: 'image',
                    image: message.media_url?.startsWith('http')
                        ? { link: message.media_url, caption: message.caption || '' }
                        : { id: message.media_url }, // Media ID from Meta
                };
            case 'document':
                return {
                    ...base,
                    type: 'document',
                    document: {
                        link: message.media_url,
                        caption: message.caption || '',
                        filename: message.filename || 'document',
                    },
                };
            default:
                throw new Error(`Unsupported message type for Meta WABA: ${message.type}`);
        }
    }

    // ── Disconnect ─────────────────────────────────────────

    async disconnect(botId: string): Promise<void> {
        this.configs.delete(botId);
        await botRepository.update(botId, { status: 'disconnected' });
        logger.info('[Meta] Bot disconnected (config cleared)', { bot_id: botId });
    }

    async destroySession(botId: string): Promise<void> {
        await this.disconnect(botId);
        logger.info('[Meta] Session destroyed (no local files for WABA)', { bot_id: botId });
    }

    // ── Webhook ────────────────────────────────────────────

    /**
     * Verify Meta webhook signature
     */
    verifyWebhookSignature(rawBody: string, signature: string, appSecret: string): boolean {
        if (!signature.startsWith('sha256=')) return false;
        const expected = 'sha256=' + crypto
            .createHmac('sha256', appSecret)
            .update(rawBody, 'utf8')
            .digest('hex');
        try {
            return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
        } catch {
            return false;
        }
    }

    /**
     * Process incoming webhook payload from Meta
     */
    async processWebhook(body: any, botId: string, tenantId: string): Promise<void> {
        const entries = body.entry || [];

        for (const entry of entries) {
            for (const change of (entry.changes || [])) {
                const value = change.value;
                if (!value?.messages) continue;

                for (const message of value.messages) {
                    await this._processIncomingMessage(message, value, botId, tenantId);
                }

                // Handle message status updates (delivered, read)
                if (value.statuses) {
                    for (const statusUpdate of value.statuses) {
                        logger.debug('[Meta] Status update', {
                            bot_id: botId,
                            wa_id: statusUpdate.id,
                            status: statusUpdate.status,
                        });
                    }
                }
            }
        }
    }

    private async _processIncomingMessage(
        message: any,
        value: any,
        botId: string,
        tenantId: string
    ): Promise<void> {
        const contact = value.contacts?.find((c: any) => c.wa_id === message.from);

        const content =
            message.text?.body ||
            message.image?.caption ||
            message.document?.caption ||
            message.reaction?.emoji ||
            '';

        const incomingMessage: WhatsAppIncomingMessage = {
            wa_message_id: message.id,
            from: message.from,
            to: value.metadata?.display_phone_number?.replace(/\D/g, '') || '',
            message_type: this._toMessageType(message.type),
            content,
            is_group: false, // WABA only receives individual messages
            sender_name: contact?.profile?.name || undefined,
            sender_phone: message.from,
            timestamp: new Date(parseInt(message.timestamp) * 1000).toISOString(),
        };

        logger.info('[Meta] Incoming message', {
            bot_id: botId,
            from: message.from,
            type: message.type,
        });

        await eventBus.emit(
            EventType.MESSAGE_RECEIVED,
            {
                tenant_id: tenantId,
                bot_id: botId,
                channel: 'wa',
                group_id: null,
                contact_id: message.from,
                message: content,
                timestamp: incomingMessage.timestamp,
            },
            incomingMessage
        );
    }

    private _toMessageType(type: string): 'text' | 'image' | 'document' | 'audio' | 'video' {
        switch (type) {
            case 'image': return 'image';
            case 'document': return 'document';
            case 'audio': return 'audio';
            case 'video': return 'video';
            default: return 'text';
        }
    }

    // ── Template Management ────────────────────────────────

    /**
     * Fetch approved templates from Meta
     */
    async getApprovedTemplates(botId: string): Promise<any[]> {
        const cfg = this.configs.get(botId);
        if (!cfg?.waba_id) throw new Error('WABA ID tidak tersedia');

        const res = await axios.get(`${GRAPH_BASE}/${cfg.waba_id}/message_templates`, {
            headers: { Authorization: `Bearer ${cfg.access_token}` },
            params: { status: 'APPROVED', limit: 100 },
            timeout: 10000,
        });

        return res.data?.data || [];
    }

    /**
     * Test connection and return phone details
     */
    async testConnection(botId: string, tempConfig?: MetaBotConfig): Promise<{
        success: boolean;
        phone_number?: string;
        display_name?: string;
        error?: string;
    }> {
        const cfg = tempConfig || this.configs.get(botId);
        if (!cfg) return { success: false, error: 'Konfigurasi tidak ditemukan' };

        // Temporarily store for getConnectionStatus
        const wasInMap = this.configs.has(botId);
        if (!wasInMap && tempConfig) {
            this.configs.set(botId, tempConfig);
        }

        const status = await this.getConnectionStatus(botId);

        if (!wasInMap && tempConfig) {
            this.configs.delete(botId);
        }

        if (status.status === 'connected') {
            return {
                success: true,
                phone_number: status.phone_number,
                display_name: status.device_name,
            };
        }
        return { success: false, error: 'Tidak dapat terhubung. Periksa token dan Phone Number ID.' };
    }

    isInitialized(botId: string): boolean {
        return this.configs.has(botId);
    }
}

export const metaCloudAdapter = new MetaCloudAdapter();
