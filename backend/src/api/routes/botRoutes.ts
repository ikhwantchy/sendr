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
        const { name, config, target_tenant_id } = req.body;
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

        const bot = await botRepository.create({
            tenant_id: tenantId,
            name,
            config: config || {},
            created_by: userId,
        });

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

// ... rest of the file (disconnect, pause, resume, delete, groups, sync-groups)
// Needs proper restoration for the rest as well to ensure table name is fixed everywhere

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
        await botRepository.update(id, { status: 'disconnected' });
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

        if (!bot.phone_number) {
            return res.status(400).json({ success: false, error: 'Bot has no saved session' });
        }

        await whatsappAdapter.initializeBot(id);
        await logActivity('bot', `${bot.name} resumed`, { bot_id: id });

        res.json({ success: true, message: 'Bot is resuming connection...' });
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
