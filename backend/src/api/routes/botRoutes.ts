/**
 * Bot API Routes
 * Manage WhatsApp bots
 */

import { Router } from 'express';
import { botRepository } from '../../database/repositories/botRepository';
import { whatsappAdapter } from '../../adapters/whatsapp/whatsappAdapter.baileys';
// ✅ USING: Baileys (lightweight, no Chromium)
// 🔧 FIXED: Added proper event handling
import { authenticate, requireRole } from '../middleware/auth';
import { eventBus } from '../../core/events/eventBus';
import { EventType } from '../../core/events/types';
import { logger } from '../../utils/logger';
import { query } from '../../database/connection';
import { logActivity } from '../../database/connection';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/bots
 * List all bots for tenant
 */
router.get('/', async (req, res) => {
    try {
        const isAdmin = req.user!.role === 'ADMIN' || req.user!.role === 'OWNER';
        const bots = isAdmin
            ? await botRepository.findAll()
            : await botRepository.findAccessibleByUser(req.user!.id, req.user!.tenant_id);

        res.json({
            success: true,
            data: bots,
        });
    } catch (error: any) {
        logger.error('Failed to list bots', { error });
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});

/**
 * GET /api/bots/:id
 * Get bot details
 */
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const isAdmin = req.user!.role === 'ADMIN' || req.user!.role === 'OWNER';

        // Find bot first
        let bot = await botRepository.findById(id);

        if (!bot) {
            return res.status(404).json({
                success: false,
                error: 'Bot not found',
            });
        }

        // Access control: Admin/Owner OR Tenant Match OR Explicit Permission
        if (!isAdmin && bot.tenant_id !== req.user!.tenant_id) {
            // FIXED: Using correct table name 'bot_permissions'
            const permCheck = await query(
                `SELECT 1 FROM bot_permissions 
                 WHERE user_id = ? AND bot_id = ? AND (can_view = 1 OR can_view = 'true')`,
                [req.user!.id, id]
            );

            if (permCheck.rows.length === 0) {
                return res.status(403).json({
                    success: false,
                    error: 'Permission denied',
                });
            }
        }

        res.json({
            success: true,
            data: bot,
        });
    } catch (error: any) {
        logger.error('Failed to get bot', { error });
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});

// POST /api/bots
// Create a new bot
router.post('/', requireRole(['OWNER', 'ADMIN', 'OPERATOR', 'USER']), async (req, res) => {
    try {
        const { name, config, target_tenant_id, expires_at, permissions } = req.body;
        let tenantId = req.user!.tenant_id;
        const userId = req.user!.id;
        const userRole = req.user!.role;

        // If ADMIN/OWNER specifies a target tenant, use it
        if (target_tenant_id && (userRole === 'OWNER' || userRole === 'ADMIN')) {
            tenantId = target_tenant_id;
        }

        if (!name) {
            return res.status(400).json({
                success: false,
                error: 'Bot name is required',
            });
        }

        // Only ADMIN/OWNER can set expiration date
        const botExpiresAt = (userRole === 'OWNER' || userRole === 'ADMIN') ? expires_at : null;

        const bot = await botRepository.create({
            tenant_id: tenantId,
            name,
            config: config || {},
            created_by: userId,
            expires_at: botExpiresAt,
        });

        // Default permissions (all enabled except AI)
        const defaultPerms = {
            can_view: 1,
            can_edit: 1,
            can_delete: 1,
            can_create_campaigns: 1,
            can_create_rules: 1,
            can_view_analytics: 1,
            can_use_reminders: 1,
            can_use_ai: 0,
            can_manage_contacts: 1,
            can_manage_datasources: 1,
        };

        // Merge with provided permissions (if admin/owner provides them)
        const finalPerms = { ...defaultPerms };
        if (permissions && (userRole === 'OWNER' || userRole === 'ADMIN')) {
            if (permissions.can_view !== undefined) finalPerms.can_view = permissions.can_view ? 1 : 0;
            if (permissions.can_view_analytics !== undefined) finalPerms.can_view_analytics = permissions.can_view_analytics ? 1 : 0;
            if (permissions.can_create_rules !== undefined) finalPerms.can_create_rules = permissions.can_create_rules ? 1 : 0;
            if (permissions.can_use_reminders !== undefined) finalPerms.can_use_reminders = permissions.can_use_reminders ? 1 : 0;
            if (permissions.can_create_campaigns !== undefined) finalPerms.can_create_campaigns = permissions.can_create_campaigns ? 1 : 0;
            if (permissions.can_use_ai !== undefined) finalPerms.can_use_ai = permissions.can_use_ai ? 1 : 0;
            // Always allow edit/delete/manage for the bot owner
            finalPerms.can_edit = 1;
            finalPerms.can_delete = 1;
            finalPerms.can_manage_contacts = 1;
            finalPerms.can_manage_datasources = 1;
        }

        // If bot is created for a different tenant (by admin), create bot_permissions for the tenant owner
        if (target_tenant_id && (userRole === 'OWNER' || userRole === 'ADMIN')) {
            // Find the user who owns this tenant
            const tenantUserResult = await query(
                `SELECT id FROM users WHERE tenant_id = ? LIMIT 1`,
                [target_tenant_id]
            );

            if (tenantUserResult.rows.length > 0) {
                const targetUserId = tenantUserResult.rows[0].id;
                // Create permissions based on admin's selection
                await query(
                    `INSERT OR REPLACE INTO bot_permissions 
                    (user_id, bot_id, can_view, can_edit, can_delete, can_create_campaigns, can_create_rules, can_view_analytics, can_use_reminders, can_use_ai, can_manage_contacts, can_manage_datasources)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [targetUserId, bot.id, finalPerms.can_view, finalPerms.can_edit, finalPerms.can_delete, finalPerms.can_create_campaigns, finalPerms.can_create_rules, finalPerms.can_view_analytics, finalPerms.can_use_reminders, finalPerms.can_use_ai, finalPerms.can_manage_contacts, finalPerms.can_manage_datasources]
                );
                logger.info('Created bot permissions for tenant user', { targetUserId, botId: bot.id, permissions: finalPerms });
            }
        } else {
            // Bot created by the user themselves - give them full access
            await query(
                `INSERT OR REPLACE INTO bot_permissions 
                (user_id, bot_id, can_view, can_edit, can_delete, can_create_campaigns, can_create_rules, can_view_analytics, can_use_reminders, can_use_ai, can_manage_contacts, can_manage_datasources)
                VALUES (?, ?, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1)`,
                [userId, bot.id]
            );
            logger.info('Created bot permissions for creator', { userId, botId: bot.id });
        }

        res.status(201).json({
            success: true,
            data: bot,
        });
    } catch (error: any) {
        logger.error('Failed to create bot', { error });
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});

// PUT /api/bots/:id
// Update bot details
router.put('/:id', requireRole(['OWNER', 'ADMIN', 'OPERATOR', 'USER']), async (req, res) => {
    try {
        const { id } = req.params;
        const isAdmin = req.user!.role === 'ADMIN' || req.user!.role === 'OWNER';

        let bot = await botRepository.findById(id);
        if (!bot) return res.status(404).json({ success: false, error: 'Bot not found' });

        // Access control for update
        if (!isAdmin && bot.tenant_id !== req.user!.tenant_id) {
            // FIXED: Using correct table name 'bot_permissions'
            const permCheck = await query(
                `SELECT 1 FROM bot_permissions 
                 WHERE user_id = ? AND bot_id = ? AND (can_edit = 1 OR can_edit = 'true')`,
                [req.user!.id, id]
            );

            if (permCheck.rows.length === 0) {
                return res.status(403).json({ success: false, error: 'Permission denied' });
            }
        }

        bot = await botRepository.update(id, req.body);

        res.json({
            success: true,
            data: bot,
        });
    } catch (error: any) {
        logger.error('Failed to update bot', { error, bot_id: req.params.id });
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});

// POST /api/bots/:id/connect
// Initiate WhatsApp connection (request QR code)
router.post('/:id/connect', requireRole(['OWNER', 'ADMIN', 'OPERATOR', 'USER']), async (req, res) => {
    try {
        const { id } = req.params;
        const isAdmin = req.user!.role === 'ADMIN' || req.user!.role === 'OWNER';

        let bot = await botRepository.findById(id);
        if (!bot) return res.status(404).json({ success: false, error: 'Bot not found' });

        // Check if bot has expired
        if (bot.expires_at) {
            const expiresAt = new Date(bot.expires_at);
            if (expiresAt < new Date()) {
                return res.status(403).json({
                    success: false,
                    error: 'Bot subscription has expired',
                    expired_at: bot.expires_at,
                    expired_reason: bot.expired_reason || 'Your bot subscription has ended. Please contact admin to renew.'
                });
            }
        }

        if (!isAdmin && bot.tenant_id !== req.user!.tenant_id) {
            const permCheck = await query(
                `SELECT 1 FROM bot_permissions 
                 WHERE user_id = ? AND bot_id = ? AND (can_edit = 1 OR can_edit = 'true')`,
                [req.user!.id, id]
            );
            if (permCheck.rows.length === 0) return res.status(403).json({ success: false, error: 'Permission denied' });
        }

        const qrData = await whatsappAdapter.requestQRCode(id);

        res.json({
            success: true,
            data: {
                qr_code: qrData.qr_code,
                expires_at: qrData.expires_at,
            },
        });
    } catch (error: any) {
        logger.error('Failed to connect bot', { error });
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});

// POST /api/bots/:id/pair
// Request a phone number pairing code — phone number can be provided in body or read from bot DB
router.post('/:id/pair', requireRole(['OWNER', 'ADMIN', 'OPERATOR', 'USER']), async (req, res) => {
    try {
        const { id } = req.params;
        const { phone_number } = req.body; // optional: user can provide phone directly on connect page
        const isAdmin = req.user!.role === 'ADMIN' || req.user!.role === 'OWNER';

        let bot = await botRepository.findById(id);
        if (!bot) return res.status(404).json({ success: false, error: 'Bot not found' });

        if ((bot as any).expires_at && new Date((bot as any).expires_at) < new Date()) {
            return res.status(403).json({ success: false, error: 'Bot subscription has expired' });
        }

        if (!isAdmin && bot.tenant_id !== req.user!.tenant_id) {
            const permCheck = await query(
                `SELECT 1 FROM bot_permissions WHERE user_id = ? AND bot_id = ? AND (can_edit = 1 OR can_edit = 'true')`,
                [req.user!.id, id]
            );
            if (permCheck.rows.length === 0) return res.status(403).json({ success: false, error: 'Permission denied' });
        }

        // If phone_number provided in body (from connect page), save it to the bot first
        if (phone_number) {
            const cleanPhone = String(phone_number).replace(/\D/g, '');
            if (!cleanPhone || cleanPhone.length < 7) {
                return res.status(400).json({ success: false, error: 'Nomor HP tidak valid. Masukkan nomor dengan kode negara (contoh: 628123456789)' });
            }
            logger.info('Saving phone number from connect page to bot', { bot_id: id, phone: cleanPhone });
            await botRepository.update(id, { phone_number: cleanPhone });
        }

        const pairingData = await whatsappAdapter.requestPairingCode(id);

        res.json({
            success: true,
            data: {
                code: pairingData.code,
                phone: pairingData.phone,
                expires_at: pairingData.expires_at,
            },
        });
    } catch (error: any) {
        logger.error('Failed to generate pairing code', { error });
        res.status(500).json({ success: false, error: error.message });
    }
});


/**
 * GET /api/bots/:id/status
 * Get bot connection status
 */
router.get('/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const isAdmin = req.user!.role === 'ADMIN' || req.user!.role === 'OWNER';

        let bot = await botRepository.findById(id);
        if (!bot) return res.status(404).json({ success: false, error: 'Bot not found' });

        if (!isAdmin && bot.tenant_id !== req.user!.tenant_id) {
            const permCheck = await query(
                `SELECT 1 FROM bot_permissions 
                 WHERE user_id = ? AND bot_id = ? AND (can_view = 1 OR can_view = 'true')`,
                [req.user!.id, id]
            );
            if (permCheck.rows.length === 0) return res.status(403).json({ success: false, error: 'Permission denied' });
        }

        const status = await whatsappAdapter.getConnectionStatus(id);

        res.json({
            success: true,
            data: {
                ...status,
                last_connected_at: bot.last_connected_at,
            },
        });
    } catch (error: any) {
        logger.error('Failed to get bot status', { error });
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});

// POST /api/bots/:id/disconnect
// Disconnect bot
router.post('/:id/disconnect', requireRole(['OWNER', 'ADMIN', 'OPERATOR', 'USER']), async (req, res) => {
    try {
        const { id } = req.params;
        const isAdmin = req.user!.role === 'ADMIN' || req.user!.role === 'OWNER';

        let bot = await botRepository.findById(id);
        if (!bot) return res.status(404).json({ success: false, error: 'Bot not found' });

        if (!isAdmin && bot.tenant_id !== req.user!.tenant_id) {
            const permCheck = await query(
                `SELECT 1 FROM bot_permissions 
                 WHERE user_id = ? AND bot_id = ? AND (can_edit = 1 OR can_edit = 'true')`,
                [req.user!.id, id]
            );
            if (permCheck.rows.length === 0) return res.status(403).json({ success: false, error: 'Permission denied' });
        }

        await whatsappAdapter.disconnect(id);
        await logActivity('bot', `${bot.name} disconnected`, { bot_id: id });

        res.json({
            success: true,
            message: 'Bot disconnected successfully',
        });
    } catch (error: any) {
        logger.error('Failed to disconnect bot', { error });
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});

// POST /api/bots/:id/pause
// Pause bot
router.post('/:id/pause', requireRole(['OWNER', 'ADMIN', 'OPERATOR', 'USER']), async (req, res) => {
    try {
        const { id } = req.params;
        const isAdmin = req.user!.role === 'ADMIN' || req.user!.role === 'OWNER';

        let bot = await botRepository.findById(id);
        if (!bot) return res.status(404).json({ success: false, error: 'Bot not found' });

        if (!isAdmin && bot.tenant_id !== req.user!.tenant_id) {
            const permCheck = await query(
                `SELECT 1 FROM bot_permissions 
                 WHERE user_id = ? AND bot_id = ? AND (can_edit = 1 OR can_edit = 'true')`,
                [req.user!.id, id]
            );
            if (permCheck.rows.length === 0) return res.status(403).json({ success: false, error: 'Permission denied' });
        }

        if (bot.status !== 'connected') {
            return res.status(400).json({
                success: false,
                error: 'Bot is not connected',
            });
        }

        await whatsappAdapter.pauseBot(id);
        // Update is_paused flag WITHOUT changing connection status
        await botRepository.update(id, { is_paused: 1 });
        await logActivity('bot', `${bot.name} paused`, { bot_id: id });

        res.json({ success: true, message: 'Bot paused successfully' });
    } catch (error: any) {
        logger.error('Failed to pause bot', { error });
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/bots/:id/resume
// Resume paused bot
router.post('/:id/resume', requireRole(['OWNER', 'ADMIN', 'OPERATOR', 'USER']), async (req, res) => {
    try {
        const { id } = req.params;
        const isAdmin = req.user!.role === 'ADMIN' || req.user!.role === 'OWNER';

        let bot = await botRepository.findById(id);
        if (!bot) return res.status(404).json({ success: false, error: 'Bot not found' });

        if (!isAdmin && bot.tenant_id !== req.user!.tenant_id) {
            const permCheck = await query(
                `SELECT 1 FROM bot_permissions 
                 WHERE user_id = ? AND bot_id = ? AND (can_edit = 1 OR can_edit = 'true')`,
                [req.user!.id, id]
            );
            if (permCheck.rows.length === 0) return res.status(403).json({ success: false, error: 'Permission denied' });
        }

        // Resume the bot - unpause it
        await whatsappAdapter.resumeBot(id);
        await botRepository.update(id, { is_paused: 0 });
        await logActivity('bot', `${bot.name} resumed`, { bot_id: id });

        res.json({ success: true, message: 'Bot resumed successfully' });
    } catch (error: any) {
        logger.error('Failed to resume bot', { error });
        res.status(500).json({ success: false, error: error.message });
    }
});

// DELETE /api/bots/:id
// Delete bot
router.delete('/:id', requireRole(['OWNER', 'ADMIN', 'USER']), async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.user!.tenant_id;

        const isAdmin = req.user!.role === 'ADMIN' || req.user!.role === 'OWNER';
        const bot = await botRepository.findById(id, isAdmin ? undefined : tenantId);
        if (!bot) return res.status(404).json({ success: false, error: 'Bot not found' });

        await whatsappAdapter.destroySession(id);
        await botRepository.delete(id, isAdmin ? undefined : tenantId);

        await eventBus.emit(EventType.BOT_DELETED, {
            tenant_id: tenantId,
            bot_id: id,
            channel: 'wa',
            group_id: null,
            contact_id: null,
            message: null,
            timestamp: new Date().toISOString(),
        }, { bot_id: id });

        res.json({ success: true, message: 'Bot deleted successfully' });
    } catch (error: any) {
        logger.error('Failed to delete bot', { error });
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/bots/:id/groups
 * Get WhatsApp groups for a bot
 */
router.get('/:id/groups', async (req, res) => {
    const { id } = req.params;
    try {
        const isAdmin = req.user!.role === 'ADMIN' || req.user!.role === 'OWNER';
        let bot = await botRepository.findById(id);
        if (!bot) return res.status(404).json({ success: false, error: 'Bot not found' });

        if (!isAdmin && bot.tenant_id !== req.user!.tenant_id) {
            const permCheck = await query(
                `SELECT 1 FROM bot_permissions 
                 WHERE user_id = ? AND bot_id = ? AND (can_view = 1 OR can_view = 'true')`,
                [req.user!.id, id]
            );
            if (permCheck.rows.length === 0) return res.status(403).json({ success: false, error: 'Permission denied' });
        }

        const dbGroups = await query(`
            SELECT * FROM wa_groups
            WHERE bot_id = ?
            ORDER BY group_name ASC
        `, [id]);

        const groups = dbGroups.rows.map((g: any) => ({
            id: g.id,
            jid: g.group_jid,
            name: g.group_name,
            participant_count: g.participant_count,
            is_active: g.is_active,
            last_synced_at: g.last_synced_at,
            created_at: g.created_at
        }));

        res.json({ success: true, data: groups });
    } catch (error: any) {
        logger.error('Failed to get bot groups', { error: error.message, bot_id: id });
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/bots/:id/sync-groups
 * Manually trigger group sync for a bot
 */
router.post('/:id/sync-groups', async (req, res) => {
    try {
        const { id } = req.params;
        const isAdmin = req.user!.role === 'ADMIN' || req.user!.role === 'OWNER';

        let bot = await botRepository.findById(id);
        if (!bot) return res.status(404).json({ success: false, error: 'Bot not found' });

        if (!isAdmin && bot.tenant_id !== req.user!.tenant_id) {
            const permCheck = await query(
                `SELECT 1 FROM bot_permissions 
                 WHERE user_id = ? AND bot_id = ? AND (can_edit = 1 OR can_edit = 'true')`,
                [req.user!.id, id]
            );
            if (permCheck.rows.length === 0) return res.status(403).json({ success: false, error: 'Permission denied' });
        }

        const { groupService } = await import('../../modules/group/groupService');
        const count = await groupService.syncGroupsForBot(id);

        res.json({ success: true, message: `Sync completed. Found ${count} groups.`, count });
    } catch (error: any) {
        logger.error('Failed to sync groups', { error });
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;
