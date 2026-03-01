import { Router } from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { authenticate } from '../middleware/auth';
import { InboxService, inboxService } from '../../services/inboxService';

const router = Router();

// Multer: in-memory storage (no disk needed, we pass buffer directly to WA)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 64 * 1024 * 1024 }, // 64 MB max
});

// Hook up service mapping
const getTenantId = (req: any) => req.user.tenant_id;

// GET /api/inbox/conversations
router.get('/conversations', authenticate, async (req: any, res) => {
    try {
        const { bot_id, status } = req.query;
        const tenantId = getTenantId(req);
        const conversations = await inboxService.getConversations(
            tenantId,
            bot_id as string | undefined,
            status as string | undefined
        );
        res.json({ success: true, data: conversations });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/inbox/conversations/:id/messages
router.get('/conversations/:id/messages', authenticate, async (req: any, res) => {
    try {
        const { id } = req.params;
        const { limit = 50, offset = 0 } = req.query;
        const messages = await inboxService.getMessages(id, parseInt(limit as string), parseInt(offset as string));
        // Mark as read when messages are fetched
        await inboxService.markAsRead(id);
        res.json({ success: true, data: messages });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/inbox/conversations/:id/messages (Send text message as Agent)
router.post('/conversations/:id/messages', authenticate, async (req: any, res) => {
    try {
        const { id } = req.params;
        const { content, message_type = 'text' } = req.body;
        const userId = req.user.id;

        const { inboxRepository } = await import('../../database/repositories/inboxRepository');
        const conv = await inboxRepository.findConversationById(id);

        if (!conv) {
            return res.status(404).json({ success: false, error: 'Conversation not found' });
        }

        // Send via Whatsapp Adapter
        const { botRepository } = await import('../../database/repositories/botRepository');
        const bot = await botRepository.findById(conv.bot_id);

        let sentMessageId = '';

        if (bot.adapter_type === 'meta_cloud') {
            const { metaCloudAdapter } = await import('../../adapters/whatsapp/whatsappAdapter.meta-cloud');
            const result = await metaCloudAdapter.sendMessage(conv.bot_id, conv.contact_number, {
                type: 'text',
                content: content
            });
            sentMessageId = result.message_id || '';
        } else {
            const { whatsappAdapter } = await import('../../adapters/whatsapp/whatsappAdapter.baileys');
            const result = await whatsappAdapter.sendMessage(conv.bot_id, conv.contact_number, {
                type: 'text',
                content: content
            });
            sentMessageId = result.message_id || '';
        }

        const message = await inboxService.saveOutgoingMessage(
            id,
            sentMessageId,
            content,
            'agent',
            userId,
            message_type
        );

        res.json({ success: true, data: message });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/inbox/conversations/:id/media (Send media: image, document, video)
router.post('/conversations/:id/media', authenticate, upload.single('file'), async (req: any, res) => {
    try {
        const { id } = req.params;
        const { caption = '' } = req.body;
        const userId = req.user.id;
        const file = req.file;

        if (!file) {
            return res.status(400).json({ success: false, error: 'No file uploaded' });
        }

        const { inboxRepository } = await import('../../database/repositories/inboxRepository');
        const conv = await inboxRepository.findConversationById(id);

        if (!conv) {
            return res.status(404).json({ success: false, error: 'Conversation not found' });
        }

        const { botRepository } = await import('../../database/repositories/botRepository');
        const bot = await botRepository.findById(conv.bot_id);

        // Determine message type from mimetype
        let messageType: 'image' | 'document' | 'video' | 'audio' = 'document';
        if (file.mimetype.startsWith('image/')) {
            messageType = 'image';
        } else if (file.mimetype.startsWith('video/')) {
            messageType = 'video';
        } else if (file.mimetype.startsWith('audio/')) {
            messageType = 'audio';
        }

        let sentMessageId = '';
        const waMessage: any = {
            type: messageType,
            caption: caption || undefined,
            filename: file.originalname,
            buffer: file.buffer,
            mimetype: file.mimetype,
        };

        if (bot.adapter_type === 'meta_cloud') {
            // For Meta Cloud, convert to base64 data URL
            const dataUrl = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
            const { metaCloudAdapter } = await import('../../adapters/whatsapp/whatsappAdapter.meta-cloud');
            const result = await (metaCloudAdapter as any).sendMessage(conv.bot_id, conv.contact_number, {
                type: messageType,
                media_url: dataUrl,
                caption,
                filename: file.originalname,
            });
            sentMessageId = result.message_id || '';
        } else {
            const { whatsappAdapter } = await import('../../adapters/whatsapp/whatsappAdapter.baileys');
            const result = await (whatsappAdapter as any).sendMessage(conv.bot_id, conv.contact_number, waMessage);
            sentMessageId = result.message_id || '';
        }

        // Save file locally so it can be viewed in the UI
        const ext = path.extname(file.originalname) || '';
        const uniqueFilename = `${uuidv4()}${ext}`;
        const uploadDir = path.join(__dirname, '../../../../data/uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        const filePath = path.join(uploadDir, uniqueFilename);
        fs.writeFileSync(filePath, file.buffer);

        // We use full API URL path or relative if configured, but relative is easier for same origin
        const publicMediaUrl = `/api/public/uploads/${uniqueFilename}`;

        // Content preview for inbox display
        const contentPreview = caption || `[${messageType}: ${file.originalname}]`;

        const message = await inboxService.saveOutgoingMessage(
            id,
            sentMessageId,
            contentPreview,
            'agent',
            userId,
            messageType,
            undefined,
            {
                filename: file.originalname,
                mimetype: file.mimetype,
                file_size: file.size,
                message_type: messageType,
                media_url: publicMediaUrl, // ✅ Saved in DB
            }
        );

        res.json({ success: true, data: message });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// PUT /api/inbox/conversations/:id/status
router.put('/conversations/:id/status', authenticate, async (req: any, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        await inboxService.updateStatus(id, status);
        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/inbox/conversations
 * Create a new empty conversation manually (e.g. to start chat with new numbers)
 */
router.post('/conversations', authenticate, async (req: any, res) => {
    try {
        const tenantId = getTenantId(req);
        const { bot_id, contact_number, contact_name } = req.body;

        if (!bot_id || !contact_number) {
            return res.status(400).json({ success: false, error: 'bot_id and contact_number are required' });
        }

        const { inboxRepository } = await import('../../database/repositories/inboxRepository');

        let existing = await inboxRepository.findConversationByContact(bot_id, contact_number);
        if (existing) {
            return res.json({ success: true, data: existing });
        }

        const newId = await inboxRepository.createConversation({
            tenant_id: tenantId,
            bot_id,
            contact_number,
            contact_name: contact_name || contact_number,
            status: 'open'
        });

        // Fetch back full object
        existing = await inboxRepository.findConversationByContact(bot_id, contact_number);
        res.json({ success: true, data: existing || { id: newId } });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/inbox/sync
 * Sync all WA contacts & groups into inbox conversations.
 * Uses groupFetchAllParticipating() for groups and contactsCache for individual contacts.
 */
router.post('/sync', authenticate, async (req: any, res) => {
    try {
        const tenantId = getTenantId(req);
        const { bot_id } = req.body;

        const { botRepository } = await import('../../database/repositories/botRepository');
        const { inboxRepository } = await import('../../database/repositories/inboxRepository');
        const { whatsappAdapter } = await import('../../adapters/whatsapp/whatsappAdapter.baileys');

        let bots;
        if (bot_id) {
            const b = await botRepository.findById(bot_id);
            bots = b ? [b] : [];
        } else {
            bots = await botRepository.findByTenant(tenantId);
        }

        let created = 0;
        let skipped = 0;
        const errors: string[] = [];

        for (const bot of bots) {
            if (bot.adapter_type !== 'baileys') continue;
            if (bot.status !== 'connected') {
                errors.push(`Bot ${bot.name} tidak terhubung`);
                continue;
            }

            const sock = whatsappAdapter.getSocket(bot.id);
            if (!sock) {
                errors.push(`Socket bot ${bot.name} tidak ditemukan`);
                continue;
            }

            // ── 1. Import from chats cache (individual + group from chats.set event) ───
            const allChats = whatsappAdapter.getChatsForBot(bot.id);

            // If cache is empty, force a reconnect so Baileys fetches full chat list again
            if (allChats.size === 0) {
                try {
                    await whatsappAdapter.forceReconnect(bot.id);
                    errors.push(`Bot ${bot.name} sedang menarik data dari WA, silakan coba Sync lagi dalam 10 detik`);
                    // We still continue to fetch groups via API as fallback
                } catch (err) {
                    errors.push(`Gagal trigger sync chat untuk bot ${bot.name}`);
                }
            }

            for (const [jid, chat] of allChats.entries()) {
                if (jid.includes('status@broadcast') || jid.includes('newsletter')) continue;
                if (!jid.endsWith('@s.whatsapp.net') && !jid.endsWith('@g.us')) continue;

                const existing = await inboxRepository.findConversationByContact(bot.id, jid);
                if (existing) { skipped++; continue; }

                const isGroup = jid.endsWith('@g.us');
                await inboxRepository.createConversation({
                    tenant_id: tenantId,
                    bot_id: bot.id,
                    contact_number: jid,
                    contact_name: chat.name || (isGroup ? 'Group' : jid.split('@')[0]),
                    status: 'open',
                });
                created++;
            }

            // ── 2. Also import GROUPS directly via API (even if chats.set hasn't fired) ──
            try {
                const groups = await whatsappAdapter.getAllGroupsForBot(bot.id);
                for (const [jid, meta] of Object.entries(groups)) {
                    if (!jid.endsWith('@g.us')) continue;
                    const existing = await inboxRepository.findConversationByContact(bot.id, jid);
                    if (existing) { skipped++; continue; }
                    await inboxRepository.createConversation({
                        tenant_id: tenantId,
                        bot_id: bot.id,
                        contact_number: jid,
                        contact_name: (meta as any).subject || 'Group',
                        status: 'open',
                    });
                    created++;
                }
            } catch (groupErr: any) {
                errors.push(`Gagal fetch grup: ${groupErr.message}`);
            }

            // ── 3. Import individual contacts from contact cache (fallback) ────────────
            const contacts = whatsappAdapter.getContactsForBot(bot.id);
            for (const [jid, contact] of contacts.entries()) {
                if (!jid.endsWith('@s.whatsapp.net')) continue;
                if (jid.includes('status@broadcast')) continue;
                const existing = await inboxRepository.findConversationByContact(bot.id, jid);
                if (existing) { skipped++; continue; }
                const name = contact?.name || contact?.notify || contact?.verifiedName || jid.split('@')[0];
                await inboxRepository.createConversation({
                    tenant_id: tenantId,
                    bot_id: bot.id,
                    contact_number: jid,
                    contact_name: name,
                    status: 'open',
                });
                created++;
            }
        }

        const message = errors.length > 0
            ? `Sync selesai: ${created} baru, ${skipped} sudah ada. Peringatan: ${errors.join('; ')}`
            : `Sync selesai! ${created} chat baru ditemukan, ${skipped} sudah ada.`;

        res.json({ success: true, message, created, skipped, errors });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;
