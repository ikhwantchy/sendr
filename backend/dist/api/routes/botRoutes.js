"use strict";
/**
 * Bot API Routes
 * Manage WhatsApp bots
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const botRepository_1 = require("../../database/repositories/botRepository");
const whatsappAdapter_baileys_1 = require("../../adapters/whatsapp/whatsappAdapter.baileys");
// ✅ USING: Baileys (lightweight, no Chromium)
// 🔧 FIXED: Added proper event handling
const auth_1 = require("../middleware/auth");
const eventBus_1 = require("../../core/events/eventBus");
const types_1 = require("../../core/events/types");
const logger_1 = require("../../utils/logger");
const connection_1 = require("../../database/connection");
const connection_2 = require("../../database/connection");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_1.authenticate);
/**
 * GET /api/bots
 * List all bots for tenant
 */
router.get('/', async (req, res) => {
    try {
        const isAdmin = req.user.role === 'ADMIN' || req.user.role === 'OWNER';
        const bots = isAdmin
            ? await botRepository_1.botRepository.findAll()
            : await botRepository_1.botRepository.findAccessibleByUser(req.user.id, req.user.tenant_id);
        res.json({
            success: true,
            data: bots,
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to list bots', { error });
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
        const isAdmin = req.user.role === 'ADMIN' || req.user.role === 'OWNER';
        // Find bot first
        let bot = await botRepository_1.botRepository.findById(id);
        if (!bot) {
            return res.status(404).json({
                success: false,
                error: 'Bot not found',
            });
        }
        // Access control: Admin/Owner OR Tenant Match OR Explicit Permission
        if (!isAdmin && bot.tenant_id !== req.user.tenant_id) {
            // FIXED: Using correct table name 'bot_permissions'
            const permCheck = await (0, connection_1.query)(`SELECT 1 FROM bot_permissions 
                 WHERE user_id = ? AND bot_id = ? AND (can_view = 1 OR can_view = 'true')`, [req.user.id, id]);
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
    }
    catch (error) {
        logger_1.logger.error('Failed to get bot', { error });
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});
// POST /api/bots
// Create a new bot
router.post('/', (0, auth_1.requireRole)(['OWNER', 'ADMIN', 'OPERATOR', 'USER']), async (req, res) => {
    try {
        const { name, config, target_tenant_id, expires_at, permissions } = req.body;
        let tenantId = req.user.tenant_id;
        const userId = req.user.id;
        const userRole = req.user.role;
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
        const bot = await botRepository_1.botRepository.create({
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
            if (permissions.can_view !== undefined)
                finalPerms.can_view = permissions.can_view ? 1 : 0;
            if (permissions.can_view_analytics !== undefined)
                finalPerms.can_view_analytics = permissions.can_view_analytics ? 1 : 0;
            if (permissions.can_create_rules !== undefined)
                finalPerms.can_create_rules = permissions.can_create_rules ? 1 : 0;
            if (permissions.can_use_reminders !== undefined)
                finalPerms.can_use_reminders = permissions.can_use_reminders ? 1 : 0;
            if (permissions.can_create_campaigns !== undefined)
                finalPerms.can_create_campaigns = permissions.can_create_campaigns ? 1 : 0;
            if (permissions.can_use_ai !== undefined)
                finalPerms.can_use_ai = permissions.can_use_ai ? 1 : 0;
            // Always allow edit/delete/manage for the bot owner
            finalPerms.can_edit = 1;
            finalPerms.can_delete = 1;
            finalPerms.can_manage_contacts = 1;
            finalPerms.can_manage_datasources = 1;
        }
        // If bot is created for a different tenant (by admin), create bot_permissions for the tenant owner
        if (target_tenant_id && (userRole === 'OWNER' || userRole === 'ADMIN')) {
            // Find the user who owns this tenant
            const tenantUserResult = await (0, connection_1.query)(`SELECT id FROM users WHERE tenant_id = ? LIMIT 1`, [target_tenant_id]);
            if (tenantUserResult.rows.length > 0) {
                const targetUserId = tenantUserResult.rows[0].id;
                // Create permissions based on admin's selection
                await (0, connection_1.query)(`INSERT OR REPLACE INTO bot_permissions 
                    (user_id, bot_id, can_view, can_edit, can_delete, can_create_campaigns, can_create_rules, can_view_analytics, can_use_reminders, can_use_ai, can_manage_contacts, can_manage_datasources)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [targetUserId, bot.id, finalPerms.can_view, finalPerms.can_edit, finalPerms.can_delete, finalPerms.can_create_campaigns, finalPerms.can_create_rules, finalPerms.can_view_analytics, finalPerms.can_use_reminders, finalPerms.can_use_ai, finalPerms.can_manage_contacts, finalPerms.can_manage_datasources]);
                logger_1.logger.info('Created bot permissions for tenant user', { targetUserId, botId: bot.id, permissions: finalPerms });
            }
        }
        else {
            // Bot created by the user themselves - give them full access
            await (0, connection_1.query)(`INSERT OR REPLACE INTO bot_permissions 
                (user_id, bot_id, can_view, can_edit, can_delete, can_create_campaigns, can_create_rules, can_view_analytics, can_use_reminders, can_use_ai, can_manage_contacts, can_manage_datasources)
                VALUES (?, ?, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1)`, [userId, bot.id]);
            logger_1.logger.info('Created bot permissions for creator', { userId, botId: bot.id });
        }
        res.status(201).json({
            success: true,
            data: bot,
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to create bot', { error });
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});
// PUT /api/bots/:id
// Update bot details
router.put('/:id', (0, auth_1.requireRole)(['OWNER', 'ADMIN', 'OPERATOR', 'USER']), async (req, res) => {
    try {
        const { id } = req.params;
        const isAdmin = req.user.role === 'ADMIN' || req.user.role === 'OWNER';
        let bot = await botRepository_1.botRepository.findById(id);
        if (!bot)
            return res.status(404).json({ success: false, error: 'Bot not found' });
        // Access control for update
        if (!isAdmin && bot.tenant_id !== req.user.tenant_id) {
            // FIXED: Using correct table name 'bot_permissions'
            const permCheck = await (0, connection_1.query)(`SELECT 1 FROM bot_permissions 
                 WHERE user_id = ? AND bot_id = ? AND (can_edit = 1 OR can_edit = 'true')`, [req.user.id, id]);
            if (permCheck.rows.length === 0) {
                return res.status(403).json({ success: false, error: 'Permission denied' });
            }
        }
        bot = await botRepository_1.botRepository.update(id, req.body);
        res.json({
            success: true,
            data: bot,
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to update bot', { error, bot_id: req.params.id });
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});
// POST /api/bots/:id/connect
// Initiate WhatsApp connection (request QR code)
router.post('/:id/connect', (0, auth_1.requireRole)(['OWNER', 'ADMIN', 'OPERATOR', 'USER']), async (req, res) => {
    try {
        const { id } = req.params;
        const isAdmin = req.user.role === 'ADMIN' || req.user.role === 'OWNER';
        let bot = await botRepository_1.botRepository.findById(id);
        if (!bot)
            return res.status(404).json({ success: false, error: 'Bot not found' });
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
        if (!isAdmin && bot.tenant_id !== req.user.tenant_id) {
            const permCheck = await (0, connection_1.query)(`SELECT 1 FROM bot_permissions 
                 WHERE user_id = ? AND bot_id = ? AND (can_edit = 1 OR can_edit = 'true')`, [req.user.id, id]);
            if (permCheck.rows.length === 0)
                return res.status(403).json({ success: false, error: 'Permission denied' });
        }
        const qrData = await whatsappAdapter_baileys_1.whatsappAdapter.requestQRCode(id);
        res.json({
            success: true,
            data: {
                qr_code: qrData.qr_code,
                expires_at: qrData.expires_at,
            },
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to connect bot', { error });
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});
// POST /api/bots/:id/pair
// Request a phone number pairing code — phone number can be provided in body or read from bot DB
router.post('/:id/pair', (0, auth_1.requireRole)(['OWNER', 'ADMIN', 'OPERATOR', 'USER']), async (req, res) => {
    try {
        const { id } = req.params;
        const { phone_number } = req.body; // optional: user can provide phone directly on connect page
        const isAdmin = req.user.role === 'ADMIN' || req.user.role === 'OWNER';
        let bot = await botRepository_1.botRepository.findById(id);
        if (!bot)
            return res.status(404).json({ success: false, error: 'Bot not found' });
        if (bot.expires_at && new Date(bot.expires_at) < new Date()) {
            return res.status(403).json({ success: false, error: 'Bot subscription has expired' });
        }
        if (!isAdmin && bot.tenant_id !== req.user.tenant_id) {
            const permCheck = await (0, connection_1.query)(`SELECT 1 FROM bot_permissions WHERE user_id = ? AND bot_id = ? AND (can_edit = 1 OR can_edit = 'true')`, [req.user.id, id]);
            if (permCheck.rows.length === 0)
                return res.status(403).json({ success: false, error: 'Permission denied' });
        }
        // If phone_number provided in body (from connect page), save it to the bot first
        if (phone_number) {
            const cleanPhone = String(phone_number).replace(/\D/g, '');
            if (!cleanPhone || cleanPhone.length < 7) {
                return res.status(400).json({ success: false, error: 'Nomor HP tidak valid. Masukkan nomor dengan kode negara (contoh: 628123456789)' });
            }
            logger_1.logger.info('Saving phone number from connect page to bot', { bot_id: id, phone: cleanPhone });
            await botRepository_1.botRepository.update(id, { phone_number: cleanPhone });
        }
        const pairingData = await whatsappAdapter_baileys_1.whatsappAdapter.requestPairingCode(id);
        res.json({
            success: true,
            data: {
                code: pairingData.code,
                phone: pairingData.phone,
                expires_at: pairingData.expires_at,
            },
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to generate pairing code', { error });
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
        const isAdmin = req.user.role === 'ADMIN' || req.user.role === 'OWNER';
        let bot = await botRepository_1.botRepository.findById(id);
        if (!bot)
            return res.status(404).json({ success: false, error: 'Bot not found' });
        if (!isAdmin && bot.tenant_id !== req.user.tenant_id) {
            const permCheck = await (0, connection_1.query)(`SELECT 1 FROM bot_permissions 
                 WHERE user_id = ? AND bot_id = ? AND (can_view = 1 OR can_view = 'true')`, [req.user.id, id]);
            if (permCheck.rows.length === 0)
                return res.status(403).json({ success: false, error: 'Permission denied' });
        }
        const status = await whatsappAdapter_baileys_1.whatsappAdapter.getConnectionStatus(id);
        res.json({
            success: true,
            data: {
                ...status,
                last_connected_at: bot.last_connected_at,
            },
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to get bot status', { error });
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});
// POST /api/bots/:id/disconnect
// Disconnect bot
router.post('/:id/disconnect', (0, auth_1.requireRole)(['OWNER', 'ADMIN', 'OPERATOR', 'USER']), async (req, res) => {
    try {
        const { id } = req.params;
        const isAdmin = req.user.role === 'ADMIN' || req.user.role === 'OWNER';
        let bot = await botRepository_1.botRepository.findById(id);
        if (!bot)
            return res.status(404).json({ success: false, error: 'Bot not found' });
        if (!isAdmin && bot.tenant_id !== req.user.tenant_id) {
            const permCheck = await (0, connection_1.query)(`SELECT 1 FROM bot_permissions 
                 WHERE user_id = ? AND bot_id = ? AND (can_edit = 1 OR can_edit = 'true')`, [req.user.id, id]);
            if (permCheck.rows.length === 0)
                return res.status(403).json({ success: false, error: 'Permission denied' });
        }
        await whatsappAdapter_baileys_1.whatsappAdapter.disconnect(id);
        await (0, connection_2.logActivity)('bot', `${bot.name} disconnected`, { bot_id: id });
        res.json({
            success: true,
            message: 'Bot disconnected successfully',
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to disconnect bot', { error });
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});
// POST /api/bots/:id/pause
// Pause bot
router.post('/:id/pause', (0, auth_1.requireRole)(['OWNER', 'ADMIN', 'OPERATOR', 'USER']), async (req, res) => {
    try {
        const { id } = req.params;
        const isAdmin = req.user.role === 'ADMIN' || req.user.role === 'OWNER';
        let bot = await botRepository_1.botRepository.findById(id);
        if (!bot)
            return res.status(404).json({ success: false, error: 'Bot not found' });
        if (!isAdmin && bot.tenant_id !== req.user.tenant_id) {
            const permCheck = await (0, connection_1.query)(`SELECT 1 FROM bot_permissions 
                 WHERE user_id = ? AND bot_id = ? AND (can_edit = 1 OR can_edit = 'true')`, [req.user.id, id]);
            if (permCheck.rows.length === 0)
                return res.status(403).json({ success: false, error: 'Permission denied' });
        }
        if (bot.status !== 'connected') {
            return res.status(400).json({
                success: false,
                error: 'Bot is not connected',
            });
        }
        await whatsappAdapter_baileys_1.whatsappAdapter.pauseBot(id);
        // Update is_paused flag WITHOUT changing connection status
        await botRepository_1.botRepository.update(id, { is_paused: 1 });
        await (0, connection_2.logActivity)('bot', `${bot.name} paused`, { bot_id: id });
        res.json({ success: true, message: 'Bot paused successfully' });
    }
    catch (error) {
        logger_1.logger.error('Failed to pause bot', { error });
        res.status(500).json({ success: false, error: error.message });
    }
});
// POST /api/bots/:id/resume
// Resume paused bot
router.post('/:id/resume', (0, auth_1.requireRole)(['OWNER', 'ADMIN', 'OPERATOR', 'USER']), async (req, res) => {
    try {
        const { id } = req.params;
        const isAdmin = req.user.role === 'ADMIN' || req.user.role === 'OWNER';
        let bot = await botRepository_1.botRepository.findById(id);
        if (!bot)
            return res.status(404).json({ success: false, error: 'Bot not found' });
        if (!isAdmin && bot.tenant_id !== req.user.tenant_id) {
            const permCheck = await (0, connection_1.query)(`SELECT 1 FROM bot_permissions 
                 WHERE user_id = ? AND bot_id = ? AND (can_edit = 1 OR can_edit = 'true')`, [req.user.id, id]);
            if (permCheck.rows.length === 0)
                return res.status(403).json({ success: false, error: 'Permission denied' });
        }
        // Resume the bot - unpause it
        await whatsappAdapter_baileys_1.whatsappAdapter.resumeBot(id);
        await botRepository_1.botRepository.update(id, { is_paused: 0 });
        await (0, connection_2.logActivity)('bot', `${bot.name} resumed`, { bot_id: id });
        res.json({ success: true, message: 'Bot resumed successfully' });
    }
    catch (error) {
        logger_1.logger.error('Failed to resume bot', { error });
        res.status(500).json({ success: false, error: error.message });
    }
});
// DELETE /api/bots/:id
// Delete bot
router.delete('/:id', (0, auth_1.requireRole)(['OWNER', 'ADMIN', 'USER']), async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.user.tenant_id;
        const isAdmin = req.user.role === 'ADMIN' || req.user.role === 'OWNER';
        const bot = await botRepository_1.botRepository.findById(id, isAdmin ? undefined : tenantId);
        if (!bot)
            return res.status(404).json({ success: false, error: 'Bot not found' });
        await whatsappAdapter_baileys_1.whatsappAdapter.destroySession(id);
        await botRepository_1.botRepository.delete(id, isAdmin ? undefined : tenantId);
        await eventBus_1.eventBus.emit(types_1.EventType.BOT_DELETED, {
            tenant_id: tenantId,
            bot_id: id,
            channel: 'wa',
            group_id: null,
            contact_id: null,
            message: null,
            timestamp: new Date().toISOString(),
        }, { bot_id: id });
        res.json({ success: true, message: 'Bot deleted successfully' });
    }
    catch (error) {
        logger_1.logger.error('Failed to delete bot', { error });
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
        const isAdmin = req.user.role === 'ADMIN' || req.user.role === 'OWNER';
        let bot = await botRepository_1.botRepository.findById(id);
        if (!bot)
            return res.status(404).json({ success: false, error: 'Bot not found' });
        if (!isAdmin && bot.tenant_id !== req.user.tenant_id) {
            const permCheck = await (0, connection_1.query)(`SELECT 1 FROM bot_permissions 
                 WHERE user_id = ? AND bot_id = ? AND (can_view = 1 OR can_view = 'true')`, [req.user.id, id]);
            if (permCheck.rows.length === 0)
                return res.status(403).json({ success: false, error: 'Permission denied' });
        }
        const dbGroups = await (0, connection_1.query)(`
            SELECT * FROM wa_groups
            WHERE bot_id = ?
            ORDER BY group_name ASC
        `, [id]);
        const groups = dbGroups.rows.map((g) => ({
            id: g.id,
            jid: g.group_jid,
            name: g.group_name,
            participant_count: g.participant_count,
            is_active: g.is_active,
            last_synced_at: g.last_synced_at,
            created_at: g.created_at
        }));
        res.json({ success: true, data: groups });
    }
    catch (error) {
        logger_1.logger.error('Failed to get bot groups', { error: error.message, bot_id: id });
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
        const isAdmin = req.user.role === 'ADMIN' || req.user.role === 'OWNER';
        let bot = await botRepository_1.botRepository.findById(id);
        if (!bot)
            return res.status(404).json({ success: false, error: 'Bot not found' });
        if (!isAdmin && bot.tenant_id !== req.user.tenant_id) {
            const permCheck = await (0, connection_1.query)(`SELECT 1 FROM bot_permissions 
                 WHERE user_id = ? AND bot_id = ? AND (can_edit = 1 OR can_edit = 'true')`, [req.user.id, id]);
            if (permCheck.rows.length === 0)
                return res.status(403).json({ success: false, error: 'Permission denied' });
        }
        const { groupService } = await Promise.resolve().then(() => __importStar(require('../../modules/group/groupService')));
        const count = await groupService.syncGroupsForBot(id);
        res.json({ success: true, message: `Sync completed. Found ${count} groups.`, count });
    }
    catch (error) {
        logger_1.logger.error('Failed to sync groups', { error });
        res.status(500).json({ success: false, error: error.message });
    }
});
/**
 * POST /api/bots/:id/meta/test-connection
 * Test Meta Cloud API credentials
 */
router.post('/:id/meta/test-connection', (0, auth_1.requireRole)(['OWNER', 'ADMIN', 'OPERATOR', 'USER']), async (req, res) => {
    try {
        const { id } = req.params;
        const { phone_number_id, access_token, waba_id, app_secret } = req.body;
        if (!phone_number_id || !access_token) {
            return res.status(400).json({ success: false, error: 'Phone Number ID dan Access Token wajib diisi' });
        }
        const { metaCloudAdapter } = await Promise.resolve().then(() => __importStar(require('../../adapters/whatsapp/whatsappAdapter.meta-cloud')));
        const result = await metaCloudAdapter.testConnection(id, {
            phone_number_id,
            access_token,
            waba_id: waba_id || '',
            app_secret: app_secret || undefined,
        });
        res.json({ success: result.success, data: result });
    }
    catch (error) {
        logger_1.logger.error('Meta test-connection failed', { error: error.message });
        res.status(500).json({ success: false, error: error.message });
    }
});
/**
 * POST /api/bots/:id/meta/save-config
 * Save Meta Cloud API credentials to bot
 */
router.post('/:id/meta/save-config', (0, auth_1.requireRole)(['OWNER', 'ADMIN', 'OPERATOR', 'USER']), async (req, res) => {
    try {
        const { id } = req.params;
        const { phone_number_id, access_token, waba_id, app_secret } = req.body;
        if (!phone_number_id || !access_token) {
            return res.status(400).json({ success: false, error: 'Phone Number ID dan Access Token wajib diisi' });
        }
        // Test connection first
        const { metaCloudAdapter } = await Promise.resolve().then(() => __importStar(require('../../adapters/whatsapp/whatsappAdapter.meta-cloud')));
        const testResult = await metaCloudAdapter.testConnection(id, {
            phone_number_id, access_token, waba_id: waba_id || '',
        });
        if (!testResult.success) {
            return res.status(400).json({ success: false, error: testResult.error || 'Gagal terhubung ke Meta API' });
        }
        // Save config
        const updated = await botRepository_1.botRepository.update(id, {
            adapter_type: 'meta_cloud',
            meta_phone_number_id: phone_number_id,
            meta_access_token: access_token,
            meta_waba_id: waba_id || null,
            meta_app_secret: app_secret || null,
            status: 'connected',
            phone_number: testResult.phone_number || null,
        });
        // Initialize the adapter
        await metaCloudAdapter.initializeBot(id);
        res.json({ success: true, data: updated });
    }
    catch (error) {
        logger_1.logger.error('Meta save-config failed', { error: error.message });
        res.status(500).json({ success: false, error: error.message });
    }
});
/**
 * GET /api/bots/:id/meta/templates
 * Fetch approved Meta message templates
 */
router.get('/:id/meta/templates', async (req, res) => {
    try {
        const { id } = req.params;
        const bot = await botRepository_1.botRepository.findById(id);
        if (!bot)
            return res.status(404).json({ success: false, error: 'Bot not found' });
        if (bot.adapter_type !== 'meta_cloud') {
            return res.status(400).json({ success: false, error: 'Bot ini bukan WABA bot' });
        }
        const { metaCloudAdapter } = await Promise.resolve().then(() => __importStar(require('../../adapters/whatsapp/whatsappAdapter.meta-cloud')));
        if (!metaCloudAdapter.isInitialized(id)) {
            await metaCloudAdapter.initializeBot(id);
        }
        const templates = await metaCloudAdapter.getApprovedTemplates(id);
        res.json({ success: true, data: templates });
    }
    catch (error) {
        logger_1.logger.error('Failed to get Meta templates', { error: error.message });
        res.status(500).json({ success: false, error: error.message });
    }
});
exports.default = router;
//# sourceMappingURL=botRoutes.js.map