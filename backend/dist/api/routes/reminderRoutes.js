"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const uuid_1 = require("uuid");
const connection_1 = require("../../database/connection");
const auth_1 = require("../middleware/auth");
const reminderSchedulerService_1 = __importDefault(require("../../services/reminderSchedulerService"));
const checkPermission_1 = require("../middleware/checkPermission");
const router = (0, express_1.Router)();
// All reminder routes require authentication
router.use(auth_1.authenticate);
/**
 * GET /api/reminders
 * Get all reminders for the authenticated user
 */
router.get('/', async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;
        const userRole = req.user.role;
        const isAdmin = userRole === 'OWNER' || userRole === 'ADMIN';
        const result = await (0, connection_1.query)(`
            SELECT r.*, b.name as bot_name, b.phone_number,
                   (SELECT group_name FROM wa_groups WHERE group_jid = r.target_id AND bot_id = r.bot_id) as group_name
            FROM reminders r
            LEFT JOIN bots b ON r.bot_id = b.id
            ${isAdmin ? '' : 'WHERE r.tenant_id = ?'}
            ORDER BY r.created_at DESC
        `, isAdmin ? [] : [tenantId]);
        res.json({
            success: true,
            data: result.rows,
        });
    }
    catch (error) {
        console.error('Error fetching reminders:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch reminders',
        });
    }
});
/**
 * GET /api/reminders/bot/:botId
 * Get reminders for a specific bot
 */
router.get('/bot/:botId', (0, checkPermission_1.checkBotAccess)('use_reminders'), async (req, res) => {
    try {
        const { botId } = req.params;
        const isAdmin = req.user.role === 'ADMIN' || req.user.role === 'OWNER';
        const tenantId = req.user.tenant_id;
        const result = await (0, connection_1.query)(`
            SELECT r.*, b.name as bot_name, b.phone_number,
                   (SELECT group_name FROM wa_groups WHERE group_jid = r.target_id AND bot_id = r.bot_id) as group_name
            FROM reminders r
            LEFT JOIN bots b ON r.bot_id = b.id
            WHERE r.bot_id = ? ${isAdmin ? '' : 'AND r.tenant_id = ?'}
            ORDER BY r.created_at DESC
        `, isAdmin ? [botId] : [botId, tenantId]);
        res.json({
            success: true,
            data: result.rows,
        });
    }
    catch (error) {
        console.error('Error fetching reminders:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch reminders',
        });
    }
});
/**
 * GET /api/reminders/by-bot/:botId (Alias for compatibility)
 */
router.get('/by-bot/:botId', (0, checkPermission_1.checkBotAccess)('use_reminders'), async (req, res) => {
    try {
        const { botId } = req.params;
        const tenantId = req.user.tenant_id;
        const userRole = req.user.role;
        const isAdmin = userRole === 'OWNER' || userRole === 'ADMIN';
        const result = await (0, connection_1.query)(`
            SELECT r.*, b.name as bot_name, b.phone_number,
                   (SELECT group_name FROM wa_groups WHERE group_jid = r.target_id AND bot_id = r.bot_id) as group_name
            FROM reminders r
            LEFT JOIN bots b ON r.bot_id = b.id
            WHERE r.bot_id = ? ${isAdmin ? '' : 'AND r.tenant_id = ?'}
            ORDER BY r.created_at DESC
        `, isAdmin ? [botId] : [botId, tenantId]);
        res.json({
            success: true,
            data: result.rows,
        });
    }
    catch (error) {
        console.error('Error fetching reminders:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch reminders',
        });
    }
});
/**
 * GET /api/reminders/:id
 * Get a specific reminder
 */
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.user.tenant_id;
        const userRole = req.user.role;
        const isAdmin = userRole === 'OWNER' || userRole === 'ADMIN';
        const result = await (0, connection_1.query)(`
            SELECT r.*, b.name as bot_name, b.phone_number,
                   (SELECT group_name FROM wa_groups WHERE group_jid = r.target_id AND bot_id = r.bot_id) as group_name
            FROM reminders r
            LEFT JOIN bots b ON r.bot_id = b.id
            WHERE r.id = ? ${isAdmin ? '' : 'AND r.tenant_id = ?'}
        `, isAdmin ? [id] : [id, tenantId]);
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Reminder not found',
            });
        }
        res.json({
            success: true,
            data: result.rows[0],
        });
    }
    catch (error) {
        console.error('Error fetching reminder:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch reminder',
        });
    }
});
/**
 * POST /api/reminders
 * Create a new reminder
 */
router.post('/', async (req, res) => {
    try {
        const userId = req.user.id;
        const tenantId = req.user.tenant_id;
        const { name, description, botId, targetType, targetId, // Changed from targetJid
        schedule, // Changed from cronExpression
        timezone, dataSourceId, googleSheetsUrl, templateConfig, // Changed from messageTemplate
         } = req.body;
        // Debug logging
        console.log('[Reminder] Create request body:', JSON.stringify(req.body, null, 2));
        // Validate required fields
        if (!name || !botId || !targetId || !templateConfig) {
            console.error('[Reminder] Validation failed:', { name, botId, targetId, templateConfig });
            return res.status(400).json({
                success: false,
                error: 'Missing required fields',
                details: { name, botId, targetId, templateConfig }
            });
        }
        // Verify bot ownership - OWNER/ADMIN can access any bot
        const userRole = req.user.role;
        const isAdmin = userRole === 'OWNER' || userRole === 'ADMIN';
        const botResult = await (0, connection_1.query)(isAdmin
            ? 'SELECT * FROM bots WHERE id = ?'
            : 'SELECT * FROM bots WHERE id = ? AND tenant_id = ?', isAdmin ? [botId] : [botId, tenantId]);
        if (botResult.rows.length === 0) {
            return res.status(403).json({
                success: false,
                error: 'Bot not found or access denied',
            });
        }
        const reminderId = (0, uuid_1.v4)();
        let finalDataSourceId = dataSourceId;
        // TODO: Fix data_sources schema mismatch
        // For now, Google Sheets config is stored in templateConfig
        /*
        // Create data source if Google Sheets URL is provided
        if (googleSheetsUrl && !dataSourceId) {
            finalDataSourceId = uuidv4();
            await query(`
                INSERT INTO data_sources (id, tenant_id, name, type, source_url, config, created_by, created_at)
                VALUES (?, ?, ?, 'google_sheets', ?, '{}', ?, CURRENT_TIMESTAMP)
            `, [finalDataSourceId, tenantId, `Data Source for ${name}`, googleSheetsUrl, userId]);
        }
        */
        // Create reminder - matching the connection-sqlite schema
        await (0, connection_1.query)(`
            INSERT INTO reminders (
                id, tenant_id, bot_id, name, description, 
                schedule, timezone, is_active, target_type, target_id, 
                data_source_id, pipeline_config, template_config, 
                created_by, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, '{}', ?, ?, CURRENT_TIMESTAMP)
        `, [
            reminderId,
            tenantId,
            botId,
            name,
            description || '',
            schedule || '',
            timezone || 'Asia/Jakarta',
            targetType,
            targetId,
            finalDataSourceId || null,
            typeof templateConfig === 'string' ? JSON.stringify({ body: templateConfig }) : JSON.stringify(templateConfig),
            userId
        ]);
        // Re-fetch and Schedule
        const result = await (0, connection_1.query)('SELECT * FROM reminders WHERE id = ?', [reminderId]);
        const reminder = result.rows[0];
        if (reminder.schedule === 'now') {
            console.log(`⚡ Executing reminder ${reminderId} immediately`);
            await reminderSchedulerService_1.default.executeImmediately(reminderId);
        }
        else {
            await reminderSchedulerService_1.default.scheduleReminder(reminder);
        }
        res.status(201).json({
            success: true,
            data: {
                id: reminderId,
                message: 'Reminder created and scheduled successfully',
            },
        });
    }
    catch (error) {
        console.error('Error creating reminder:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create reminder',
            details: error.message,
        });
    }
});
/**
 * PUT /api/reminders/:id
 * Update an existing reminder
 */
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.user.tenant_id;
        const userRole = req.user.role;
        const isAdmin = userRole === 'OWNER' || userRole === 'ADMIN';
        const { name, description, botId, targetType, targetId, schedule, timezone, dataSourceId, templateConfig, } = req.body;
        // Verify ownership - OWNER/ADMIN can access any reminder
        const verifyResult = await (0, connection_1.query)(isAdmin
            ? `SELECT * FROM reminders WHERE id = ?`
            : `SELECT * FROM reminders WHERE id = ? AND tenant_id = ?`, isAdmin ? [id] : [id, tenantId]);
        if (verifyResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Reminder not found',
            });
        }
        // Update reminder
        await (0, connection_1.query)(`
            UPDATE reminders 
            SET name = ?, description = ?, bot_id = ?, target_type = ?, target_id = ?, 
                schedule = ?, timezone = ?, data_source_id = ?, template_config = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [
            name,
            description,
            botId,
            targetType,
            targetId,
            schedule,
            timezone,
            dataSourceId,
            JSON.stringify(templateConfig),
            id
        ]);
        // Re-Schedule
        const result = await (0, connection_1.query)('SELECT * FROM reminders WHERE id = ?', [id]);
        const reminder = result.rows[0];
        if (reminder.schedule === 'now') {
            await reminderSchedulerService_1.default.executeImmediately(id);
        }
        else {
            await reminderSchedulerService_1.default.scheduleReminder(reminder);
        }
        res.json({
            success: true,
            message: 'Reminder updated successfully',
        });
    }
    catch (error) {
        console.error('Error updating reminder:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update reminder',
            details: error.message,
        });
    }
});
/**
 * PATCH /api/reminders/:id/toggle
 * Toggle reminder active status
 */
router.patch('/:id/toggle', async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.user.tenant_id;
        const userRole = req.user.role;
        const isAdmin = userRole === 'OWNER' || userRole === 'ADMIN';
        // Verify ownership - OWNER/ADMIN can access any reminder
        const result = await (0, connection_1.query)(isAdmin
            ? `SELECT * FROM reminders WHERE id = ?`
            : `SELECT * FROM reminders WHERE id = ? AND tenant_id = ?`, isAdmin ? [id] : [id, tenantId]);
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Reminder not found',
            });
        }
        const reminder = result.rows[0];
        const newStatus = reminder.is_active === 1 ? 0 : 1;
        await (0, connection_1.query)('UPDATE reminders SET is_active = ? WHERE id = ?', [newStatus, id]);
        if (newStatus === 1) {
            // Re-schedule
            const updated = await (0, connection_1.query)('SELECT * FROM reminders WHERE id = ?', [id]);
            await reminderSchedulerService_1.default.scheduleReminder(updated.rows[0]);
        }
        else {
            // Unschedule
            reminderSchedulerService_1.default.unscheduleReminder(id);
        }
        res.json({
            success: true,
            data: {
                isActive: newStatus === 1,
            },
        });
    }
    catch (error) {
        console.error('Error toggling reminder:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to toggle reminder',
        });
    }
});
/**
 * DELETE /api/reminders/:id
 * Delete a reminder
 */
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.user.tenant_id;
        const userRole = req.user.role;
        const isAdmin = userRole === 'OWNER' || userRole === 'ADMIN';
        // Verify ownership - OWNER/ADMIN can access any reminder
        const result = await (0, connection_1.query)(isAdmin
            ? `SELECT * FROM reminders WHERE id = ?`
            : `SELECT * FROM reminders WHERE id = ? AND tenant_id = ?`, isAdmin ? [id] : [id, tenantId]);
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Reminder not found',
            });
        }
        // Unschedule if active
        reminderSchedulerService_1.default.unscheduleReminder(id);
        // Delete reminder
        await (0, connection_1.query)('DELETE FROM reminders WHERE id = ?', [id]);
        res.json({
            success: true,
            message: 'Reminder deleted successfully',
        });
    }
    catch (error) {
        console.error('Error deleting reminder:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete reminder',
        });
    }
});
/**
 * GET /api/reminders/:id/logs
 * Get execution logs for a reminder
 */
router.get('/:id/logs', async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.user.tenant_id;
        const userRole = req.user.role;
        const isAdmin = userRole === 'OWNER' || userRole === 'ADMIN';
        // Verify ownership - OWNER/ADMIN can access any reminder
        const result = await (0, connection_1.query)(isAdmin
            ? `SELECT * FROM reminders WHERE id = ?`
            : `SELECT * FROM reminders WHERE id = ? AND tenant_id = ?`, isAdmin ? [id] : [id, tenantId]);
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Reminder not found',
            });
        }
        const logsResult = await (0, connection_1.query)(`
            SELECT * FROM reminder_logs
            WHERE reminder_id = ?
            ORDER BY executed_at DESC
            LIMIT 50
        `, [id]);
        res.json({
            success: true,
            data: logsResult.rows,
        });
    }
    catch (error) {
        console.error('Error fetching logs:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch logs',
        });
    }
});
exports.default = router;
//# sourceMappingURL=reminderRoutes.js.map