/**
 * Baileys WhatsApp Adapter
 * Lighter alternative to whatsapp-web.js - no Chromium needed!
 */

import makeWASocket, {
    DisconnectReason,
    useMultiFileAuthState,
    fetchLatestBaileysVersion,
    WASocket,
    WAMessage,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import QRCode from 'qrcode';
import path from 'path';
import { IWhatsAppAdapter, WhatsAppMessage, WhatsAppIncomingMessage } from './IWhatsAppAdapter';
import { eventBus } from '../../core/events/eventBus';
import { EventType, MessageReceivedPayload } from '../../core/events/types';
import { logger } from '../../utils/logger';
import { botRepository } from '../../database/repositories/botRepository';
import { query } from '../../database/connection';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';

class BaileysWhatsAppAdapter implements IWhatsAppAdapter {
    private sockets: Map<string, WASocket> = new Map();
    private qrCodes: Map<string, { qr_code: string; expires_at: string }> = new Map();
    private pairingCodes: Map<string, { code: string; expires_at: string }> = new Map();
    private pausedBots: Set<string> = new Set();
    private reconnecting: Set<string> = new Set();
    private lidToPhone: Map<string, string> = new Map();
    private sessionPath: string;
    private cachedWAVersion: [number, number, number] | null = null; // Cache WA version to avoid repeated fetches

    constructor() {
        this.sessionPath = process.env.WA_SESSION_PATH || './sessions';
    }

    /**
     * Fetch & cache WhatsApp Web version (only fetches once per process lifetime)
     */
    private async getWAVersion(): Promise<[number, number, number]> {
        if (this.cachedWAVersion) return this.cachedWAVersion;
        try {
            const { version, isLatest } = await fetchLatestBaileysVersion();
            logger.info('Fetched latest WA version', { version, isLatest });
            this.cachedWAVersion = version;
            return version;
        } catch (err) {
            logger.warn('Failed to fetch latest WA version, using fallback', { error: err });
            // Fallback to a known-good version
            return [2, 3000, 1023028715];
        }
    }

    /**
     * Check if a bot has a valid session (creds.json exists)
     */
    public hasValidSession(botId: string): boolean {
        const authPath = path.join(this.sessionPath, `session-${botId}`);
        const credsPath = path.join(authPath, 'creds.json');
        try {
            return fs.existsSync(credsPath);
        } catch {
            return false;
        }
    }

    /**
     * Clear session files for a bot, forcing fresh QR on next init.
     * Called when WhatsApp returns 405 or badSession.
     */
    public clearSession(botId: string): void {
        const authPath = path.join(this.sessionPath, `session-${botId}`);
        try {
            if (fs.existsSync(authPath)) {
                fs.rmSync(authPath, { recursive: true, force: true });
                logger.info('🗑️ Session files cleared', { bot_id: botId, path: authPath });
            }
        } catch (err) {
            logger.error('Failed to clear session files', { bot_id: botId, error: err });
        }
    }

    /**
     * Initialize a bot session
     */
    public async initializeBot(botId: string): Promise<void> {
        // Initialization lock - prevent concurrent inits that cause connectionReplaced
        if (this.reconnecting.has(botId)) {
            logger.warn('Initialization already in progress, skipping', { bot_id: botId });
            return;
        }

        // Check if already initialized
        const existingSocket = this.sockets.get(botId);
        if (existingSocket) {
            logger.warn('Bot already initialized - reusing existing socket', { bot_id: botId });
            return;
        }

        this.reconnecting.add(botId);

        // Remove from paused bots if resuming
        this.pausedBots.delete(botId);

        logger.info('Initializing WhatsApp bot with Baileys', { bot_id: botId });

        try {
            const bot = await botRepository.findById(botId);
            if (!bot) {
                throw new Error(`Bot not found: ${botId}`);
            }

            // Setup auth state
            const authPath = path.join(this.sessionPath, `session-${botId}`);
            const { state, saveCreds } = await useMultiFileAuthState(authPath);

            // Fetch the latest WhatsApp Web version — using outdated versions causes 405 rejection
            const version = await this.getWAVersion();
            logger.info('Using WA Web version', { bot_id: botId, version });

            // Create socket with proper config
            const sock = makeWASocket({
                version,
                auth: state,
                printQRInTerminal: false,
                markOnlineOnConnect: true,
                browser: ['Sendr', 'Chrome', '124.0.0'],  // Realistic browser fingerprint
                connectTimeoutMs: 30000,
                keepAliveIntervalMs: 20000,
                // getMessage is required for message retry mechanism stability
                getMessage: async (key) => {
                    return undefined;
                },
                logger: {
                    level: 'silent' as any,
                    fatal: () => { },
                    error: () => { },
                    warn: () => { },
                    info: () => { },
                    debug: () => { },
                    trace: () => { },
                    child: () => ({
                        level: 'silent' as any,
                        fatal: () => { },
                        error: () => { },
                        warn: () => { },
                        info: () => { },
                        debug: () => { },
                        trace: () => { },
                    } as any),
                } as any,
            });

            // ✅ LOG ALL EVENTS FOR DEBUGGING
            sock.ev.on('*' as any, (event: any) => {
                logger.info('🔍 Baileys event (ANY)', {
                    bot_id: botId,
                    event_constructor: event?.constructor?.name,
                });
            });

            // ✅ STORE SOCKET IMMEDIATELY - CRITICAL!
            this.sockets.set(botId, sock);
            logger.info('✅ Socket stored in map', {
                bot_id: botId,
                total_sockets: this.sockets.size,
                socket_exists: this.sockets.has(botId)
            });

            // Setup event handlers AFTER socket stored
            this.setupEventHandlers(sock, bot, saveCreds);

            logger.info('Event handlers registered successfully', { bot_id: botId });

            // Release init lock after a short delay (let connection establish)
            setTimeout(() => this.reconnecting.delete(botId), 10000);
        } catch (error) {
            logger.error('Failed to initialize bot', { error, bot_id: botId });
            // Cleanup on failure
            this.sockets.delete(botId);
            this.reconnecting.delete(botId);
            throw error;
        }
    }

    /**
     * Setup event handlers
     */
    private setupEventHandlers(sock: WASocket, bot: any, saveCreds: () => Promise<void>): void {
        const botId = bot.id;
        const tenantId = bot.tenant_id;

        // Connection update
        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;

            logger.info('Connection update received', {
                bot_id: botId,
                connection,
                has_qr: !!qr,
                has_disconnect: !!lastDisconnect
            });

            // QR Code
            if (qr) {
                logger.info('QR Code generated', { bot_id: botId });

                try {
                    const qrDataUrl = await QRCode.toDataURL(qr);
                    const expiresAt = new Date(Date.now() + 60000).toISOString();

                    this.qrCodes.set(botId, {
                        qr_code: qrDataUrl,
                        expires_at: expiresAt,
                    });

                    await botRepository.update(botId, {
                        qr_code: qrDataUrl,
                        qr_expires_at: expiresAt,
                        status: 'connecting',
                    });

                    await eventBus.emit(
                        EventType.WA_QR_GENERATED,
                        {
                            tenant_id: tenantId,
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
                } catch (error) {
                    logger.error('Failed to generate QR code', { error, bot_id: botId });
                }
            }

            // Connected
            if (connection === 'open') {
                logger.info('WhatsApp connected!', { bot_id: botId });

                try {
                    const fullId = sock.user?.id || '';
                    const lid = (sock as any).authState?.creds?.me?.lid || '';
                    const phoneNumber = fullId.split(':')[0] || '';
                    const deviceName = sock.user?.name || 'Unknown';

                    logger.info('Updating bot status to connected', {
                        bot_id: botId,
                        full_id: fullId,
                        lid: lid,
                        phone_number: phoneNumber,
                        device_name: deviceName,
                        me: (sock as any).authState?.creds?.me
                    });

                    await botRepository.update(botId, {
                        status: 'connected',
                        phone_number: phoneNumber,
                        lid: lid.split(':')[0] || lid, // Store clean lid if possible
                        qr_code: null,
                        qr_expires_at: null,
                        last_connected_at: new Date().toISOString(),
                    });

                    logger.info('Bot status updated successfully', { bot_id: botId });

                    await eventBus.emit(
                        EventType.WA_CONNECTED,
                        {
                            tenant_id: tenantId,
                            bot_id: botId,
                            channel: 'wa',
                            group_id: null,
                            contact_id: null,
                            message: null,
                            timestamp: new Date().toISOString(),
                        },
                        {
                            phone_number: phoneNumber,
                            device_name: deviceName,
                            connected_at: new Date().toISOString(),
                        }
                    );

                    logger.info('Connection event emitted', { bot_id: botId });
                } catch (error) {
                    logger.error('Failed to update bot status on connection', { error, bot_id: botId });
                }
            }

            // Disconnected
            if (connection === 'close') {
                const disconnectReason = (lastDisconnect?.error as Boom)?.output?.statusCode;

                // 405 = Method Not Allowed: WA rejected our session entirely → must clear & re-auth
                // badSession = corrupted local session → must clear & re-auth
                const isSessionInvalid = disconnectReason === 405 ||
                    disconnectReason === DisconnectReason.badSession;

                // Don't auto-reconnect if logged out or connection replaced
                const shouldReconnect = disconnectReason !== DisconnectReason.loggedOut &&
                    disconnectReason !== DisconnectReason.connectionReplaced;

                const reasonMap = new Map<number, string>([
                    [DisconnectReason.badSession, 'Bad Session'],
                    [DisconnectReason.connectionClosed, 'Connection Closed'],
                    [DisconnectReason.connectionLost, 'Connection Lost'],
                    [DisconnectReason.connectionReplaced, 'Connection Replaced'],
                    [DisconnectReason.loggedOut, 'Logged Out'],
                    [DisconnectReason.restartRequired, 'Restart Required'],
                    [DisconnectReason.timedOut, 'Timed Out'],
                    [405, 'Session Rejected by WhatsApp (405)'],
                ]);

                const reasonText = disconnectReason ? reasonMap.get(disconnectReason) || `Unknown (${disconnectReason})` : 'Unknown';

                logger.warn('WhatsApp disconnected', {
                    bot_id: botId,
                    shouldReconnect,
                    isSessionInvalid,
                    disconnect_code: disconnectReason,
                    disconnect_reason: reasonText,
                    error: lastDisconnect?.error
                });

                // Check if this bot was paused (user-initiated)
                const wasPaused = this.pausedBots.has(botId);

                await botRepository.update(botId, {
                    status: 'disconnected',
                    ...(disconnectReason === DisconnectReason.loggedOut && !wasPaused ? { phone_number: null } : {}),
                });

                // Emit disconnect event
                await eventBus.emit(
                    EventType.WA_DISCONNECTED,
                    {
                        tenant_id: tenantId,
                        bot_id: botId,
                        channel: 'wa',
                        group_id: null,
                        contact_id: null,
                        message: null,
                        timestamp: new Date().toISOString(),
                    },
                    {
                        reason: reasonText,
                        disconnect_code: disconnectReason,
                        should_reconnect: shouldReconnect,
                    }
                );

                this.sockets.delete(botId);
                this.qrCodes.delete(botId);

                // If session is invalid (405 / badSession), wipe session files so next init gets fresh QR
                if (isSessionInvalid) {
                    logger.warn('🗑️ Session invalid - clearing session files to force re-authentication', { bot_id: botId, disconnect_code: disconnectReason });
                    this.clearSession(botId);
                    // IMPORTANT: Force-clear the reconnecting lock so the next manual connect works
                    this.reconnecting.delete(botId);
                }

                if (shouldReconnect && !wasPaused) {
                    if (isSessionInvalid && disconnectReason === 405) {
                        // 405 = WhatsApp server is actively rejecting this device.
                        // Do NOT auto-reconnect — it will just keep failing.
                        // User must remove linked device from their phone first.
                        logger.warn('🚫 Not auto-reconnecting after 405 - WhatsApp rejected the session. ' +
                            'User must go to WhatsApp > Settings > Linked Devices > Remove this device, then reconnect manually.',
                            { bot_id: botId });
                        await botRepository.update(botId, { status: 'error' });
                    } else if (this.reconnecting.has(botId)) {
                        logger.warn('⏳ Reconnect already in progress, skipping duplicate attempt', { bot_id: botId });
                    } else {
                        this.reconnecting.add(botId);
                        // Longer delay for session-invalid cases to avoid hammering WA servers
                        const reconnectDelay = isSessionInvalid ? 15000 : 30000;
                        logger.info(`⏳ Will attempt reconnect in ${reconnectDelay / 1000}s...`, { bot_id: botId, reason: reasonText });
                        setTimeout(() => {
                            logger.info('🔄 Attempting to reconnect...', { bot_id: botId });
                            this.reconnecting.delete(botId);
                            this.initializeBot(botId).catch(err => {
                                logger.error('Failed to reconnect', { error: err, bot_id: botId });
                            });
                        }, reconnectDelay);
                    }

                } else if (wasPaused) {
                    logger.info('⏸️ Bot was paused by user - not auto-reconnecting', { bot_id: botId });
                } else if (disconnectReason === DisconnectReason.connectionReplaced) {
                    logger.warn('⚠️ Connection replaced by another session - not auto-reconnecting to avoid loop', { bot_id: botId });
                } else {
                    logger.info('❌ Not reconnecting - user logged out', { bot_id: botId });
                }
            }
        });

        // Credentials update
        sock.ev.on('creds.update', saveCreds);

        // ✅ AUTO-CAPTURE CONTACTS (LID → Phone mapping)
        sock.ev.on('contacts.upsert', async (contacts) => {
            logger.info('📇 Contacts upsert event', { bot_id: botId, count: contacts.length });
            try {
                const { lidPhoneMappingService } = await import('../../services/lidPhoneMappingService');

                for (const contact of contacts) {
                    // contact.id could be either LID or phone format
                    // contact.lid is the LID if the contact has one
                    // We need to map LID ↔ Phone

                    const contactId = contact.id || '';
                    const lidValue = (contact as any).lid;

                    logger.info('📇 Contact info', {
                        bot_id: botId,
                        contact_id: contactId,
                        lid: lidValue,
                        name: contact.name || contact.notify,
                        raw: JSON.stringify(contact)
                    });

                    // If contact has both phone JID and LID, save mapping
                    if (contactId.includes('@s.whatsapp.net') && lidValue) {
                        const phone = contactId.split('@')[0];
                        const lid = lidValue.split('@')[0];

                        await lidPhoneMappingService.upsertMapping({
                            bot_id: botId,
                            lid: lid,
                            phone: phone,
                            name: contact.name || contact.notify
                        });
                        logger.info('🔗 Auto-mapped LID from contact', { lid, phone, name: contact.name });
                    }
                }
            } catch (err) {
                logger.error('Failed to process contacts upsert', { error: err });
            }
        });

        // ✅ AUTO-DETECT GROUPS ON UPSERT
        sock.ev.on('groups.upsert', async (groups) => {
            logger.info('👥 Groups upsert event', { bot_id: botId, count: groups.length });
            try {
                const { groupService } = await import('../../modules/group/groupService');
                for (const group of groups) {
                    await (groupService as any).upsertGroup(botId, group.id, group.subject);
                }
            } catch (err) {
                logger.error('Failed to auto-upsert groups', { error: err });
            }
        });

        // ✅ MESSAGES EVENT - PROPERLY BOUND VIA STORE
        sock.ev.on('messages.upsert', async ({ messages, type }) => {
            logger.info('✅ Messages upsert event triggered!', {
                bot_id: botId,
                message_count: messages.length,
                type,
            });

            for (const msg of messages) {
                // Log RAW message for debugging
                logger.info('Processing message (RAW)', {
                    bot_id: botId,
                    from_me: msg.key.fromMe,
                    has_message: !!msg.message,
                    message_keys: Object.keys(msg.message || {}),
                });

                // Handle own messages (manual replies/sends) - Log to DB but don't trigger events
                if (msg.key.fromMe) {
                    logger.debug('Logging own outbound message', { bot_id: botId });
                    await this.handleOutboundLog(msg, bot);
                    continue;
                }

                // Handle Protocol Messages (Revoke/Delete)
                // Type 0 is REVOKE (Delete for Everyone)
                // @ts-ignore - protocolMessage type definition might be loose
                if (msg.message?.protocolMessage?.type === 0) {
                    const key = msg.message.protocolMessage.key;
                    if (key && key.id) {
                        logger.info('🗑️ Message revoked (deleted for everyone)', {
                            bot_id: botId,
                            revoked_msg_id: key.id,
                            remote_jid: key.remoteJid
                        });

                        try {
                            // Mark message as deleted but KEEP content
                            await query(
                                'UPDATE messages SET is_deleted = 1 WHERE wa_message_id = ?',
                                [key.id]
                            );
                            logger.info('✅ Message marked as deleted in DB', { message_id: key.id });
                        } catch (err) {
                            logger.error('Failed to mark message as deleted', { error: err, message_id: key.id });
                        }
                    }
                    continue; // Skip processing as new message
                }

                await this.handleIncomingMessage(msg, bot);
            }
        });

        logger.info('Event handlers registered successfully', { bot_id: botId });
    }

    /**
     * Handle Logger for Outbound (Manual) Messages
     */
    private async handleOutboundLog(msg: WAMessage, bot: any): Promise<void> {
        try {
            const messageContent =
                msg.message?.conversation ||
                msg.message?.extendedTextMessage?.text ||
                msg.message?.imageMessage?.caption ||
                '';

            if (!messageContent) return;

            // Use current time for safety
            const timestamp = new Date().toISOString();

            logger.info('📝 Logging manual outbound message', {
                bot_id: bot.id,
                content: messageContent,
                timestamp
            });

            // NOTE: source MUST be 'auto_reply' because SQLite CHECK constraint restricts values.
            await query(`
                INSERT INTO messages (
                    id, bot_id, wa_message_id, direction, source,
                    message_type, content, created_at
                ) VALUES (?, ?, ?, 'outbound', 'auto_reply', 'text', ?, ?)
            `, [
                uuidv4(),
                bot.id,
                msg.key.id || `manual_${Date.now()}`,
                messageContent,
                timestamp
            ]);
        } catch (error) {
            logger.error('❌ Failed to log outbound manual message', { error });
        }
    }

    /**
     * Handle incoming message
     */
    private async handleIncomingMessage(msg: WAMessage, bot: any): Promise<void> {
        try {
            // Extract message content from various Baileys message types
            const messageContent =
                msg.message?.conversation ||
                msg.message?.extendedTextMessage?.text ||
                msg.message?.imageMessage?.caption ||
                msg.message?.videoMessage?.caption ||
                msg.message?.documentMessage?.caption ||
                msg.message?.buttonsResponseMessage?.selectedButtonId ||
                msg.message?.listResponseMessage?.singleSelectReply?.selectedRowId ||
                msg.message?.templateButtonReplyMessage?.selectedId ||
                '';

            const remoteJid = msg.key.remoteJid || '';
            const senderId = msg.key.participant || msg.key.remoteJid || '';

            // Try to resolve LID to phone number
            let senderPhone: string | undefined;
            if (remoteJid.includes('@lid') || senderId.includes('@lid')) {
                // Try to get phone from cache
                const lid = remoteJid.split('@')[0];
                senderPhone = this.lidToPhone.get(lid);

                // If not in cache, try to resolve using socket
                if (!senderPhone) {
                    const sock = this.sockets.get(bot.id);
                    if (sock) {
                        try {
                            // Try to get the phone number using fetchStatus or other methods
                            // Note: This might not always work depending on WhatsApp's API
                            const status = await sock.fetchStatus(remoteJid).catch(() => null);
                            if (status && typeof status === 'object' && 'id' in status) {
                                const phoneJid = (status as any).id;
                                if (phoneJid && phoneJid.includes('@s.whatsapp.net')) {
                                    senderPhone = phoneJid.split('@')[0];
                                    this.lidToPhone.set(lid, senderPhone);
                                    logger.info('[LID Resolver] Resolved LID to phone', { lid, phone: senderPhone });
                                }
                            }
                        } catch (e) {
                            // Fallback - check if there's a verifiedName or other identifier
                            logger.debug('[LID Resolver] Could not resolve LID', { lid, error: (e as Error).message });
                        }
                    }
                }
            } else if (remoteJid.includes('@s.whatsapp.net')) {
                // Regular phone number format
                senderPhone = remoteJid.split('@')[0];
            }

            const incomingMessage: WhatsAppIncomingMessage = {
                wa_message_id: msg.key.id || '',
                from: remoteJid,
                to: bot.phone_number || '',
                message_type: 'text',
                content: messageContent,
                is_group: remoteJid.endsWith('@g.us') || false,
                sender_id: senderId,
                sender_name: msg.pushName || 'Unknown',
                timestamp: new Date((msg.messageTimestamp as number) * 1000).toISOString(),
                sender_phone: senderPhone, // Add resolved phone number
            };

            // Extract mentions and quoted message info
            const contextInfo = (msg.message?.extendedTextMessage ||
                msg.message?.imageMessage ||
                msg.message?.videoMessage ||
                msg.message?.documentMessage)?.contextInfo;

            const mentioned_jids = contextInfo?.mentionedJid || [];
            const quoted_message = contextInfo?.quotedMessage ? {
                participant: contextInfo.participant,
                stanzaId: contextInfo.stanzaId,
                content: contextInfo.quotedMessage.conversation || contextInfo.quotedMessage.extendedTextMessage?.text
            } : undefined;

            logger.info('✅ Incoming message parsed', {
                bot_id: bot.id,
                from: incomingMessage.from,
                content: incomingMessage.content,
                mentions: mentioned_jids,
                has_quote: !!quoted_message,
                message_type: Object.keys(msg.message || {})[0],
            });

            // Log INBOUND message to database
            try {
                await query(`
                    INSERT INTO messages (
                        id, bot_id, wa_message_id, direction, source,
                        message_type, content, created_at
                    ) VALUES (?, ?, ?, 'inbound', 'inbound', ?, ?, ?)
                `, [
                    uuidv4(),
                    bot.id,
                    incomingMessage.wa_message_id,
                    'text', // Simplified, or use incomingMessage.message_type
                    incomingMessage.content,
                    // Convert ISO to SQLite format if needed, but ISO is standard text
                    incomingMessage.timestamp || new Date().toISOString()
                ]);
            } catch (logError) {
                logger.error('Failed to log inbound message', { error: logError });
            }

            await eventBus.emit(
                EventType.MESSAGE_RECEIVED,
                {
                    tenant_id: bot.tenant_id,
                    bot_id: bot.id,
                    channel: 'wa',
                    group_id: incomingMessage.is_group ? incomingMessage.from : null,
                    contact_id: !incomingMessage.is_group ? incomingMessage.from : null,
                    message: incomingMessage.content,
                    timestamp: incomingMessage.timestamp,
                },
                {
                    ...incomingMessage,
                    mentioned_jids,
                    quoted_message
                } as MessageReceivedPayload
            );
        } catch (error) {
            logger.error('Failed to handle incoming message', { error, bot_id: bot.id });
        }
    }

    /**
     * Request QR code
     */
    public async requestQRCode(botId: string): Promise<{ qr_code: string; expires_at: string }> {
        try {
            logger.info('Requesting QR code', { bot_id: botId });

            // Always destroy existing socket and clear session FIRST so we start fresh
            if (this.sockets.has(botId)) {
                logger.info('Destroying existing socket before QR request', { bot_id: botId });
                try {
                    const oldSock = this.sockets.get(botId);
                    oldSock?.end(undefined);
                } catch (e) { /* ignore */ }
                this.sockets.delete(botId);
            }

            // Clear any stale reconnecting lock
            this.reconnecting.delete(botId);

            // Clear old QR
            this.qrCodes.delete(botId);

            // Always clear session so a fresh QR is generated (avoids 405 from stale session)
            this.clearSession(botId);

            logger.info('Initializing bot for QR request', { bot_id: botId });
            await this.initializeBot(botId);

            // Wait up to 15 seconds for either: QR code OR connection close (fast-fail)
            const maxWait = 15000;
            const startTime = Date.now();
            let attempts = 0;

            while (Date.now() - startTime < maxWait) {
                attempts++;

                // ✅ Happy path: QR appeared
                const qrData = this.qrCodes.get(botId);
                if (qrData) {
                    logger.info('QR code found', { bot_id: botId, attempts });
                    return qrData;
                }
                // ❌ Fast-fail: socket disappeared — means WA rejected/disconnected early
                if (!this.sockets.has(botId)) {
                    logger.warn('Socket disappeared during QR wait — WA likely rejected connection', { bot_id: botId, attempts });
                    throw new Error(
                        'WhatsApp rejected the connection. Please try using Phone Number Pairing instead: click "Use Phone Number" on the connect page.'
                    );
                }

                await new Promise((resolve) => setTimeout(resolve, 200));
            }

            // Timeout reached without QR
            logger.error('QR code generation timeout', { bot_id: botId, attempts });
            throw new Error('QR code not received in time. Try using Phone Number Pairing instead.');
        } catch (error) {
            logger.error('Failed to request QR code', { error, bot_id: botId });
            throw error;
        }
    }

    /**
     * Request a phone number pairing code (alternative to QR scan)
     * Phone number is read automatically from the bot's DB record.
     * User enters this 8-digit code in WhatsApp > Linked Devices > Link with Phone Number
     */
    public async requestPairingCode(botId: string): Promise<{ code: string; phone: string; expires_at: string }> {
        try {
            // Fetch bot to get its registered phone number
            const bot = await botRepository.findById(botId);
            if (!bot) throw new Error('Bot not found');

            const rawPhone = (bot as any).phone_number || '';
            const cleanPhone = rawPhone.replace(/\D/g, '');
            if (!cleanPhone) {
                throw new Error('This bot has no phone number configured. Please set the phone number in bot settings first.');
            }

            logger.info('Requesting pairing code', { bot_id: botId, phone: cleanPhone });

            // Cleanup existing socket
            if (this.sockets.has(botId)) {
                try { this.sockets.get(botId)?.end(undefined); } catch (e) { }
                this.sockets.delete(botId);
            }
            this.reconnecting.delete(botId);
            this.pairingCodes.delete(botId);
            this.clearSession(botId);

            // Init with pairing mode (no QR needed)
            const authPath = path.join(this.sessionPath, `session-${botId}`);
            const { state, saveCreds } = await useMultiFileAuthState(authPath);
            const version = await this.getWAVersion();

            const sock = makeWASocket({
                version,
                auth: state,
                printQRInTerminal: false,
                markOnlineOnConnect: false, // Must be false for pairing
                browser: ['Sendr', 'Chrome', '124.0.0'],
                connectTimeoutMs: 30000,
            });

            this.sockets.set(botId, sock);
            this.setupEventHandlers(sock, bot, saveCreds);

            // Wait briefly for open connection before requesting code
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Request pairing code from WA
            const code = await sock.requestPairingCode(cleanPhone);
            const formattedCode = `${code.slice(0, 4)}-${code.slice(4)}`;
            const expiresAt = new Date(Date.now() + 120000).toISOString();

            logger.info('✅ Pairing code generated', { bot_id: botId, code: formattedCode });
            this.pairingCodes.set(botId, { code: formattedCode, expires_at: expiresAt });
            setTimeout(() => this.reconnecting.delete(botId), 10000);

            return { code: formattedCode, phone: cleanPhone, expires_at: expiresAt };
        } catch (error: any) {
            logger.error('Failed to request pairing code', { error, bot_id: botId });
            this.sockets.delete(botId);
            this.reconnecting.delete(botId);
            throw error;
        }
    }

    /**
     * Get connection status
     */
    public async getConnectionStatus(botId: string): Promise<{
        status: 'connected' | 'disconnected' | 'connecting';
        phone_number?: string;
        device_name?: string;
    }> {
        const sock = this.sockets.get(botId);

        if (!sock) {
            return { status: 'disconnected' };
        }

        // Check if socket is actually connected (not just exists in memory)
        // @ts-ignore - accessing internal state
        const connectionState = sock.ws?.readyState;

        // WebSocket.OPEN = 1, WebSocket.CLOSED = 3
        // NOTE: Do NOT delete socket or update DB here - this method should be
        // read-only. Destructive cleanup is handled by the 'connection.close' event.
        // Deleting the socket here caused race conditions where transient states
        // during sends would permanently destroy the connection.
        if (connectionState !== 1) {
            logger.warn('Socket exists but WebSocket is not open', {
                bot_id: botId,
                ws_state: connectionState
            });

            return { status: 'disconnected' };
        }

        if (sock.user) {
            return {
                status: 'connected',
                phone_number: sock.user.id.split(':')[0],
                device_name: sock.user.name,
            };
        }

        return { status: 'connecting' };
    }

    /**
     * Pause bot (disconnect socket but keep session data)
     */
    public async pauseBot(botId: string): Promise<void> {
        logger.info('Pausing bot', { bot_id: botId });

        // Mark this bot as paused
        this.pausedBots.add(botId);

        const sock = this.sockets.get(botId);

        if (sock) {
            try {
                // Close the socket connection gracefully
                sock.end(undefined);
                logger.info('Socket connection closed', { bot_id: botId });
            } catch (error) {
                logger.warn('Error closing socket', { error, bot_id: botId });
            }

            // Remove socket from memory
            this.sockets.delete(botId);
            logger.info('Socket removed from memory', {
                bot_id: botId,
                remaining_sockets: this.sockets.size
            });
        } else {
            logger.warn('No socket found to pause', { bot_id: botId });
        }

        // NOTE: We do NOT delete session data from auth_info_baileys folder
        // This allows the bot to resume without scanning QR code again
    }

    /**
     * Resume bot (reconnect a paused bot)
     */
    public async resumeBot(botId: string): Promise<void> {
        logger.info('Resuming bot', { bot_id: botId });

        // Remove from paused bots set
        this.pausedBots.delete(botId);

        // Re-initialize the bot connection
        await this.initializeBot(botId);

        logger.info('Bot resumed successfully', { bot_id: botId });
    }

    /**
     * Send message
     */
    public async sendMessage(
        botId: string,
        recipient: string,
        message: WhatsAppMessage
    ): Promise<{ message_id: string; sent_at: string }> {
        logger.info('🔍 sendMessage called', {
            bot_id: botId,
            recipient,
            type: message.type,
            total_sockets: this.sockets.size,
            has_socket: this.sockets.has(botId),
            all_bot_ids: Array.from(this.sockets.keys())
        });

        let sock = this.sockets.get(botId);

        if (!sock) {
            logger.warn('⚠️ Socket not found, checking bot status...', {
                bot_id: botId,
                available_sockets: Array.from(this.sockets.keys()),
                total_sockets: this.sockets.size
            });

            // Check if bot exists and has valid session
            const bot = await botRepository.findById(botId);
            const hasSession = this.hasValidSession(botId);

            // Re-initialize if: (1) connected status, OR (2) has valid session file
            if (bot && (bot.status === 'connected' || hasSession)) {
                // Skip if reconnect is already in progress
                if (this.reconnecting.has(botId)) {
                    logger.warn('⏳ Reconnect already in progress, waiting...', { bot_id: botId });
                    // Wait for ongoing reconnect to finish (up to 35 seconds)
                    for (let i = 0; i < 70; i++) {
                        await new Promise(resolve => setTimeout(resolve, 500));
                        sock = this.sockets.get(botId);
                        if (sock) {
                            const botStatus = await botRepository.findById(botId);
                            if (botStatus?.status === 'connected') {
                                logger.info('✅ Reconnect completed, proceeding with send', { bot_id: botId });
                                break;
                            }
                        }
                    }
                    if (!sock) {
                        throw new Error(`Bot reconnection in progress but timed out: ${botId}`);
                    }
                } else {
                    logger.info('🔄 Attempting to re-initialize bot...', {
                        bot_id: botId,
                        bot_name: bot.name,
                        bot_status: bot.status,
                        has_valid_session: hasSession
                    });

                    // Re-initialize the bot
                    await this.initializeBot(botId);

                    // Wait for connection to establish with retries
                    let connected = false;
                    for (let i = 0; i < 10; i++) {
                        await new Promise(resolve => setTimeout(resolve, 500));
                        sock = this.sockets.get(botId);
                        if (sock) {
                            // Also check if connection is actually open
                            const botStatus = await botRepository.findById(botId);
                            if (botStatus?.status === 'connected') {
                                connected = true;
                                logger.info('✅ Bot re-initialized and connected', { bot_id: botId, attempt: i + 1 });
                                break;
                            }
                        }
                    }

                    if (!connected || !sock) {
                        logger.error('❌ Re-initialization failed - bot not connected after retries', { bot_id: botId });
                        throw new Error(`Bot not connected: ${botId}. Please wait for connection or reconnect.`);
                    }
                }
            } else {
                logger.error('❌ Bot not initialized - no socket and no valid session!', {
                    bot_id: botId,
                    bot_status: bot?.status || 'not found',
                    has_valid_session: hasSession,
                    available_sockets: Array.from(this.sockets.keys()),
                    total_sockets: this.sockets.size
                });
                throw new Error(`Bot not initialized: ${botId}. Please connect the bot first.`);
            }
        }

        // Validate recipient - should be a digits-only string if not already a JID
        const phoneOnly = recipient.split('@')[0].replace(/\D/g, '');
        if (!phoneOnly || phoneOnly.length < 5) {
            logger.error('❌ Invalid recipient format', { recipient });
            throw new Error(`Invalid phone number: ${recipient}`);
        }

        const jid = recipient.includes('@') ? recipient : `${recipient}@s.whatsapp.net`;

        try {
            let result;
            if (message.type === 'text') {
                result = await sock.sendMessage(jid, { text: message.content || '' });
                logger.info('✅ Message sent successfully', {
                    bot_id: botId,
                    recipient: jid,
                    message_id: result?.key?.id
                });
            } else if (message.type === 'image') {
                let media: any;
                let mimetype: string = 'image/jpeg';

                if (message.media_url?.startsWith('data:')) {
                    const matches = message.media_url.match(/^data:([^;]+);base64,(.+)$/);
                    if (matches && matches[2]) {
                        media = Buffer.from(matches[2], 'base64');
                        mimetype = matches[1];
                    }
                } else if (message.media_url) {
                    media = { url: message.media_url };
                }

                if (!media) throw new Error('Invalid media configuration');

                const payload: any = { image: media, caption: message.caption };
                if (Buffer.isBuffer(media)) payload.mimetype = mimetype;

                result = await sock.sendMessage(jid, payload);
                logger.info('✅ Image message sent successfully', {
                    bot_id: botId,
                    recipient: jid,
                    message_id: result?.key?.id
                });
            } else {
                throw new Error(`Unsupported message type: ${message.type}`);
            }

            // Log full result to see LID info
            logger.info('📨 sendMessage result', {
                bot_id: botId,
                sent_to_jid: jid,
                result_key: result?.key,
                remote_jid: result?.key?.remoteJid,
                participant: result?.key?.participant
            });

            // Auto-capture LID mapping if response contains LID
            const remoteJid = result?.key?.remoteJid;
            if (remoteJid && remoteJid.includes('@lid')) {
                const lid = remoteJid.split('@')[0];
                const phone = jid.split('@')[0].replace(/\D/g, '');

                // Import and save mapping
                try {
                    const { lidPhoneMappingService } = await import('../../services/lidPhoneMappingService');
                    await lidPhoneMappingService.upsertMapping({
                        bot_id: botId,
                        lid: lid,
                        phone: phone
                    });
                    logger.info('🔗 Auto-captured LID mapping', { lid, phone, bot_id: botId });
                } catch (mapError) {
                    logger.warn('Failed to auto-capture LID mapping', { error: mapError });
                }
            }

            return {
                message_id: result?.key?.id || `msg_${Date.now()}`,
                sent_at: new Date().toISOString(),
            };
        } catch (error) {
            logger.error('❌ Failed to send message', { error, bot_id: botId, recipient: jid });
            throw error;
        }
    }

    /**
     * Disconnect
     */
    public async disconnect(botId: string): Promise<void> {
        const sock = this.sockets.get(botId);

        if (sock) {
            await sock.logout();
            this.sockets.delete(botId);
        }

        this.qrCodes.delete(botId);
    }

    /**
     * Destroy session
     */
    public async destroySession(botId: string): Promise<void> {
        await this.disconnect(botId);
        logger.info('Session destroyed', { bot_id: botId });
    }

    /**
     * Get active clients
     */
    public getActiveClients(): string[] {
        return Array.from(this.sockets.keys());
    }

    /**
     * Get socket for bot (for group operations)
     */
    public getSocket(botId: string): WASocket | undefined {
        return this.sockets.get(botId);
    }
}

export const whatsappAdapter = new BaileysWhatsAppAdapter();
