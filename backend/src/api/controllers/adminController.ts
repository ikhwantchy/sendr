import { Request, Response } from 'express';
import systemSettingsService from '../../services/systemSettingsService';
import auditLogService from '../../services/auditLogService';
import userInviteService from '../../services/userInviteService';
import { query } from '../../database/connection-sqlite';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

/**
 * Admin Controller
 * Handles admin-specific endpoints (settings, dashboard, user management, etc.)
 */

/**
 * POST /api/admin/users/create
 * Create a new user directly (without invite)
 */
export const createUser = async (req: Request, res: Response) => {
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
        const existingUser = await query(
            'SELECT id FROM users WHERE email = ?',
            [email]
        );

        if (existingUser.rows.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Email already exists'
            });
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 10);

        let tenantId = '';

        // If creating a USER (Client), create a new tenant for them
        if (role === 'USER') {
            tenantId = uuidv4();
            const slug = email.toLowerCase().replace(/[^a-z0-9]/g, '-');
            await query(
                `INSERT INTO tenants (id, name, slug, created_at, updated_at)
                 VALUES (?, ?, ?, datetime('now'), datetime('now'))`,
                [tenantId, `${name}'s Workspace`, slug]
            );
        } else {
            // If creating another ADMIN, put them in the default tenant (or the creator's tenant)
            const tenantResult = await query('SELECT id FROM tenants LIMIT 1');
            if (tenantResult.rows.length === 0) {
                return res.status(500).json({
                    success: false,
                    message: 'No tenant found.'
                });
            }
            tenantId = tenantResult.rows[0].id;
        }

        const userId = uuidv4();

        // Create user
        await query(
            `INSERT INTO users (id, tenant_id, email, password_hash, name, role, permissions, status, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, 'active', datetime('now'), datetime('now'))`,
            [userId, tenantId, email, passwordHash, name, role, JSON.stringify(permissions || {})]
        );

        // Log creation
        await auditLogService.log({
            user_id: req.user!.id,
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
    } catch (error: any) {
        console.error('[Admin] Create user error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create user',
            error: error.message
        });
    }
};

// ... (rest of the existing functions)

/**
 * GET /api/admin/dashboard/stats
 * Get dashboard statistics
 */
export const getDashboardStats = async (req: Request, res: Response) => {
    try {
        // Get user count
        const usersResult = await query('SELECT COUNT(*) as total FROM users');
        const totalUsers = parseInt(usersResult.rows[0].total);

        // Get bot count
        const botsResult = await query('SELECT COUNT(*) as total FROM bots');
        const totalBots = parseInt(botsResult.rows[0].total);

        // Get active bots count
        const activeBotsResult = await query(
            `SELECT COUNT(*) as total FROM bots WHERE status = 'connected'`
        );
        const activeBots = parseInt(activeBotsResult.rows[0].total);

        // Get reminder count
        const remindersResult = await query('SELECT COUNT(*) as total FROM reminders');
        const totalReminders = parseInt(remindersResult.rows[0].total);

        // Get active reminders count
        const activeRemindersResult = await query(
            `SELECT COUNT(*) as total FROM reminders WHERE is_active = true`
        );
        const activeReminders = parseInt(activeRemindersResult.rows[0].total);

        // Get message count (last 30 days)
        const messagesResult = await query(
            `SELECT 
                COUNT(*) as total,
                COUNT(CASE WHEN status = 'success' THEN 1 END) as successful,
                COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed
             FROM audit_logs
             WHERE action_category = 'reminder' 
             AND action_type = 'reminder.execute'
             AND created_at >= datetime('now', '-30 days')`
        );
        const messageStats = messagesResult.rows[0];

        // Get invite stats
        const inviteStats = await userInviteService.getInviteStats();

        // Get recent activity
        const recentActivity = await auditLogService.getRecentActivity(10);

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
    } catch (error: any) {
        console.error('[Admin] Dashboard stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch dashboard stats',
            error: error.message
        });
    }
};

/**
 * GET /api/admin/settings/:category
 * Get settings for a category
 */
export const getSettings = async (req: Request, res: Response) => {
    try {
        const { category } = req.params;

        if (!category) {
            return res.status(400).json({
                success: false,
                message: 'Category is required'
            });
        }

        const settings = await systemSettingsService.getCategory(category, true);

        res.json({
            success: true,
            category,
            settings
        });
    } catch (error: any) {
        console.error('[Admin] Get settings error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch settings',
            error: error.message
        });
    }
};

/**
 * GET /api/admin/settings
 * Get all settings
 */
export const getAllSettings = async (req: Request, res: Response) => {
    try {
        const settings = await systemSettingsService.getAll(true);

        res.json({
            success: true,
            settings
        });
    } catch (error: any) {
        console.error('[Admin] Get all settings error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch settings',
            error: error.message
        });
    }
};

/**
 * PUT /api/admin/settings
 * Update multiple settings at once
 */
export const bulkUpdateSettings = async (req: Request, res: Response) => {
    try {
        const { settings: updates } = req.body;

        if (!updates || typeof updates !== 'object') {
            return res.status(400).json({
                success: false,
                message: 'Settings object is required'
            });
        }

        const userId = req.user!.id;
        const keys = Object.keys(updates);

        for (const key of keys) {
            // Find category for this key first
            const result = await query('SELECT category FROM system_settings WHERE key = ?', [key]);
            if (result.rows.length > 0) {
                const category = result.rows[0].category;
                await systemSettingsService.set({
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
    } catch (error: any) {
        console.error('[Admin] Bulk update settings error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update settings',
            error: error.message
        });
    }
};

/**
 * PUT /api/admin/settings/:category
 * Update settings for a category
 */
export const updateSettings = async (req: Request, res: Response) => {
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

        const userId = req.user!.id;

        // Update each setting
        const settingsUpdates = Object.keys(updates).map(key => ({
            category,
            key,
            value: String(updates[key]),
            updated_by: userId
        }));

        await systemSettingsService.setMultiple(settingsUpdates);

        res.json({
            success: true,
            message: 'Settings updated successfully'
        });
    } catch (error: any) {
        console.error('[Admin] Update settings error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update settings',
            error: error.message
        });
    }
};

/**
 * POST /api/admin/settings/test-email
 * Send test email to verify SMTP settings
 */
export const testEmail = async (req: Request, res: Response) => {
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
    } catch (error: any) {
        console.error('[Admin] Test email error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send test email',
            error: error.message
        });
    }
};

/**
 * POST /api/admin/cache/clear
 * Clear system cache
 */
export const clearCache = async (req: Request, res: Response) => {
    try {
        systemSettingsService.clearCache();

        await auditLogService.log({
            user_id: req.user!.id,
            action_type: 'cache.clear',
            action_category: 'system',
            description: 'Cleared system cache',
            status: 'success'
        });

        res.json({
            success: true,
            message: 'Cache cleared successfully'
        });
    } catch (error: any) {
        console.error('[Admin] Clear cache error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to clear cache',
            error: error.message
        });
    }
};
