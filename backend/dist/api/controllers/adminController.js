"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.clearCache = exports.testEmail = exports.updateSettings = exports.bulkUpdateSettings = exports.getAllSettings = exports.getSettings = exports.getDashboardStats = exports.createUser = void 0;
const systemSettingsService_1 = __importDefault(require("../../services/systemSettingsService"));
const auditLogService_1 = __importDefault(require("../../services/auditLogService"));
const userInviteService_1 = __importDefault(require("../../services/userInviteService"));
const connection_sqlite_1 = require("../../database/connection-sqlite");
const bcrypt_1 = __importDefault(require("bcrypt"));
const uuid_1 = require("uuid");
/**
 * Admin Controller
 * Handles admin-specific endpoints (settings, dashboard, user management, etc.)
 */
/**
 * POST /api/admin/users/create
 * Create a new user directly (without invite)
 */
const createUser = async (req, res) => {
    try {
        const { name, email, password, role, permissions } = req.body;
        // Validation
        if (!name || !email || !password || !role) {
            return res.status(400).json({
                success: false,
                message: 'Name, email, password, and role are required'
            });
        }
        // Validate role
        const validRoles = ['ADMIN', 'USER'];
        if (!validRoles.includes(role)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid role. Must be ADMIN or USER'
            });
        }
        // Check if email already exists
        const existingUser = await (0, connection_sqlite_1.query)('SELECT id FROM users WHERE email = ?', [email]);
        if (existingUser.rows.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Email already exists'
            });
        }
        // Hash password
        const passwordHash = await bcrypt_1.default.hash(password, 10);
        let tenantId = '';
        // If creating a USER (Client), create a new tenant for them
        if (role === 'USER') {
            tenantId = (0, uuid_1.v4)();
            // Create unique slug with timestamp
            const baseSlug = email.toLowerCase().replace(/[^a-z0-9]/g, '-');
            const uniqueSlug = `${baseSlug}-${Date.now()}`;
            await (0, connection_sqlite_1.query)(`INSERT INTO tenants (id, name, slug, created_at, updated_at)
                 VALUES (?, ?, ?, datetime('now'), datetime('now'))`, [tenantId, `${name}'s Workspace`, uniqueSlug]);
        }
        else {
            // If creating another ADMIN, put them in the default tenant
            const tenantResult = await (0, connection_sqlite_1.query)('SELECT id FROM tenants LIMIT 1');
            if (tenantResult.rows.length === 0) {
                return res.status(500).json({
                    success: false,
                    message: 'No tenant found.'
                });
            }
            tenantId = tenantResult.rows[0].id;
        }
        const userId = (0, uuid_1.v4)();
        // Create user
        await (0, connection_sqlite_1.query)(`INSERT INTO users (id, tenant_id, email, password_hash, name, role, permissions, status, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, 'active', datetime('now'), datetime('now'))`, [userId, tenantId, email, passwordHash, name, role, JSON.stringify(permissions || {})]);
        // Log creation
        await auditLogService_1.default.log({
            user_id: req.user.id,
            action_type: 'user.create',
            action_category: 'user',
            resource_type: 'user',
            resource_id: userId,
            description: `Created user: ${name} (${email})`,
            status: 'success'
        });
        res.status(201).json({
            success: true,
            message: 'User created successfully',
            user: {
                id: userId,
                name,
                email,
                role,
                password // Return password only once for admin to give to user
            }
        });
    }
    catch (error) {
        console.error('[Admin] Create user error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create user',
            error: error.message
        });
    }
};
exports.createUser = createUser;
// ... (rest of the existing functions)
/**
 * GET /api/admin/dashboard/stats
 * Get dashboard statistics
 */
const getDashboardStats = async (req, res) => {
    try {
        // Get user count
        const usersResult = await (0, connection_sqlite_1.query)('SELECT COUNT(*) as total FROM users');
        const totalUsers = parseInt(usersResult.rows[0].total);
        // Get bot count
        const botsResult = await (0, connection_sqlite_1.query)('SELECT COUNT(*) as total FROM bots');
        const totalBots = parseInt(botsResult.rows[0].total);
        // Get active bots count
        const activeBotsResult = await (0, connection_sqlite_1.query)(`SELECT COUNT(*) as total FROM bots WHERE status = 'connected'`);
        const activeBots = parseInt(activeBotsResult.rows[0].total);
        // Get reminder count
        const remindersResult = await (0, connection_sqlite_1.query)('SELECT COUNT(*) as total FROM reminders');
        const totalReminders = parseInt(remindersResult.rows[0].total);
        // Get active reminders count
        const activeRemindersResult = await (0, connection_sqlite_1.query)(`SELECT COUNT(*) as total FROM reminders WHERE is_active = true`);
        const activeReminders = parseInt(activeRemindersResult.rows[0].total);
        // Get message count (last 30 days)
        const messagesResult = await (0, connection_sqlite_1.query)(`SELECT 
                COUNT(*) as total,
                COUNT(CASE WHEN status = 'success' THEN 1 END) as successful,
                COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed
             FROM audit_logs
             WHERE action_category = 'reminder' 
             AND action_type = 'reminder.execute'
             AND created_at >= datetime('now', '-30 days')`);
        const messageStats = messagesResult.rows[0];
        // Get invite stats
        const inviteStats = await userInviteService_1.default.getInviteStats();
        // Get recent activity
        const recentActivity = await auditLogService_1.default.getRecentActivity(10);
        res.json({
            success: true,
            stats: {
                users: {
                    total: totalUsers,
                    invites_pending: inviteStats.pending
                },
                bots: {
                    total: totalBots,
                    active: activeBots,
                    inactive: totalBots - activeBots
                },
                reminders: {
                    total: totalReminders,
                    active: activeReminders,
                    inactive: totalReminders - activeReminders
                },
                messages: {
                    total: parseInt(messageStats.total),
                    successful: parseInt(messageStats.successful),
                    failed: parseInt(messageStats.failed),
                    success_rate: messageStats.total > 0
                        ? ((messageStats.successful / messageStats.total) * 100).toFixed(2)
                        : 0
                }
            },
            recent_activity: recentActivity
        });
    }
    catch (error) {
        console.error('[Admin] Dashboard stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch dashboard stats',
            error: error.message
        });
    }
};
exports.getDashboardStats = getDashboardStats;
/**
 * GET /api/admin/settings/:category
 * Get settings for a category
 */
const getSettings = async (req, res) => {
    try {
        const { category } = req.params;
        if (!category) {
            return res.status(400).json({
                success: false,
                message: 'Category is required'
            });
        }
        const settings = await systemSettingsService_1.default.getCategory(category, true);
        res.json({
            success: true,
            category,
            settings
        });
    }
    catch (error) {
        console.error('[Admin] Get settings error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch settings',
            error: error.message
        });
    }
};
exports.getSettings = getSettings;
/**
 * GET /api/admin/settings
 * Get all settings
 */
const getAllSettings = async (req, res) => {
    try {
        const settings = await systemSettingsService_1.default.getAll(true);
        res.json({
            success: true,
            settings
        });
    }
    catch (error) {
        console.error('[Admin] Get all settings error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch settings',
            error: error.message
        });
    }
};
exports.getAllSettings = getAllSettings;
/**
 * PUT /api/admin/settings
 * Update multiple settings at once
 */
const bulkUpdateSettings = async (req, res) => {
    try {
        const { settings: updates } = req.body;
        if (!updates || typeof updates !== 'object') {
            return res.status(400).json({
                success: false,
                message: 'Settings object is required'
            });
        }
        const userId = req.user.id;
        const keys = Object.keys(updates);
        for (const key of keys) {
            // Find category for this key first
            const result = await (0, connection_sqlite_1.query)('SELECT category FROM system_settings WHERE key = ?', [key]);
            if (result.rows.length > 0) {
                const category = result.rows[0].category;
                await systemSettingsService_1.default.set({
                    category,
                    key,
                    value: String(updates[key]),
                    updated_by: userId
                });
            }
        }
        res.json({
            success: true,
            message: 'Settings updated successfully'
        });
    }
    catch (error) {
        console.error('[Admin] Bulk update settings error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update settings',
            error: error.message
        });
    }
};
exports.bulkUpdateSettings = bulkUpdateSettings;
/**
 * PUT /api/admin/settings/:category
 * Update settings for a category
 */
const updateSettings = async (req, res) => {
    try {
        const { category } = req.params;
        const updates = req.body;
        if (!category) {
            return res.status(400).json({
                success: false,
                message: 'Category is required'
            });
        }
        if (!updates || typeof updates !== 'object') {
            return res.status(400).json({
                success: false,
                message: 'Settings object is required'
            });
        }
        const userId = req.user.id;
        // Update each setting
        const settingsUpdates = Object.keys(updates).map(key => ({
            category,
            key,
            value: String(updates[key]),
            updated_by: userId
        }));
        await systemSettingsService_1.default.setMultiple(settingsUpdates);
        res.json({
            success: true,
            message: 'Settings updated successfully'
        });
    }
    catch (error) {
        console.error('[Admin] Update settings error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update settings',
            error: error.message
        });
    }
};
exports.updateSettings = updateSettings;
/**
 * POST /api/admin/settings/test-email
 * Send test email to verify SMTP settings
 */
const testEmail = async (req, res) => {
    try {
        const { to } = req.body;
        if (!to) {
            return res.status(400).json({
                success: false,
                message: 'Recipient email is required'
            });
        }
        const emailService = require('../../services/emailService').default;
        await emailService.sendTestEmail(to);
        res.json({
            success: true,
            message: `Test email sent to ${to}`
        });
    }
    catch (error) {
        console.error('[Admin] Test email error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send test email',
            error: error.message
        });
    }
};
exports.testEmail = testEmail;
/**
 * POST /api/admin/cache/clear
 * Clear system cache
 */
const clearCache = async (req, res) => {
    try {
        systemSettingsService_1.default.clearCache();
        await auditLogService_1.default.log({
            user_id: req.user.id,
            action_type: 'cache.clear',
            action_category: 'system',
            description: 'Cleared system cache',
            status: 'success'
        });
        res.json({
            success: true,
            message: 'Cache cleared successfully'
        });
    }
    catch (error) {
        console.error('[Admin] Clear cache error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to clear cache',
            error: error.message
        });
    }
};
exports.clearCache = clearCache;
//# sourceMappingURL=adminController.js.map