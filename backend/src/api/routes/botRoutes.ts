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

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/bots
 * List all bots for tenant
 */
router.get('/', async (req, res) => {
    try {
        const tenantId = req.user!.tenant_id;
        const bots = await botRepository.findByTenant(tenantId);

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
        const tenantId = req.user!.tenant_id;

        const bot = await botRepository.findById(id, tenantId);

        if (!bot) {
            return res.status(404).json({
                success: false,
                error: 'Bot not found',
            });
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

/**
 * POST /api/bots
 * Create a new bot
 */
router.post('/', requireRole(['OWNER', 'OPERATOR']), async (req, res) => {
    try {
        const { name, config } = req.body;
        const tenantId = req.user!.tenant_id;
        const userId = req.user!.id;

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

        // Event emission skipped for now - bot_id validation issue
        // Will be handled by webhook/polling system instead
        /*
        await eventBus.emit(
            EventType.BOT_CREATED,
            {
                tenant_id: tenantId,
                bot_id: bot.id,
                channel: 'wa',
                group_id: null,
                contact_id: null,
                message: null,
                timestamp: new Date().toISOString(),
            },
            { bot }
        );
        */

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

/**
 * POST /api/bots/:id/connect
 * Initiate WhatsApp connection (request QR code)
 */
router.post('/:id/connect', requireRole(['OWNER', 'OPERATOR']), async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.user!.tenant_id;

        const bot = await botRepository.findById(id, tenantId);

        if (!bot) {
            return res.status(404).json({
                success: false,
                error: 'Bot not found',
            });
        }

        // Initialize bot and request QR
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
        const tenantId = req.user!.tenant_id;

        const bot = await botRepository.findById(id, tenantId);

        if (!bot) {
            return res.status(404).json({
                success: false,
                error: 'Bot not found',
            });
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

/**
 * POST /api/bots/:id/disconnect
 * Disconnect bot
 */
router.post('/:id/disconnect', requireRole(['OWNER', 'OPERATOR']), async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.user!.tenant_id;

        const bot = await botRepository.findById(id, tenantId);

        if (!bot) {
            return res.status(404).json({
                success: false,
                error: 'Bot not found',
            });
        }

        await whatsappAdapter.disconnect(id);

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

/**
 * DELETE /api/bots/:id
 * Delete bot
 */
router.delete('/:id', requireRole(['OWNER']), async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.user!.tenant_id;

        const bot = await botRepository.findById(id, tenantId);

        if (!bot) {
            return res.status(404).json({
                success: false,
                error: 'Bot not found',
            });
        }

        // Destroy session and delete
        await whatsappAdapter.destroySession(id);
        await botRepository.delete(id, tenantId);

        // Emit event
        await eventBus.emit(
            EventType.BOT_DELETED,
            {
                tenant_id: tenantId,
                bot_id: id,
                channel: 'wa',
                group_id: null,
                contact_id: null,
                message: null,
                timestamp: new Date().toISOString(),
            },
            { bot_id: id }
        );

        res.json({
            success: true,
            message: 'Bot deleted successfully',
        });
    } catch (error: any) {
        logger.error('Failed to delete bot', { error });
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});

export default router;
