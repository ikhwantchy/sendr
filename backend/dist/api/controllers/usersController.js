"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserStats = exports.deleteUser = exports.updateUser = exports.inviteUser = exports.getUserDetail = exports.listUsers = void 0;
const connection_1 = require("../../database/connection");
/**
 * List all users
 */
const listUsers = async (req, res) => {
    try {
        // Show ALL users including current logged-in user
        const result = await (0, connection_1.query)(`
      SELECT 
        u.id,
        u.tenant_id,
        u.email,
        u.name,
        u.role,
        u.created_at,
        (SELECT COUNT(*) FROM bots b WHERE b.tenant_id = u.tenant_id) as bots_count
      FROM users u
      ORDER BY u.created_at DESC
    `);
        res.json({
            success: true,
            data: result.rows
        });
    }
    catch (error) {
        console.error('List users error:', error);
        res.status(500).json({ success: false, error: 'Failed to list users' });
    }
};
exports.listUsers = listUsers;
/**
 * Get user detail with bots and aggregated analytics
 */
const getUserDetail = async (req, res) => {
    try {
        const { id } = req.params;
        // 1. Get user info
        const userResult = await (0, connection_1.query)('SELECT id, tenant_id, email, name, role, created_at FROM users WHERE id = ?', [id]);
        if (userResult.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }
        const user = userResult.rows[0];
        // 2. Get all bots associated with this user (via tenant or permissions)
        const botsResult = await (0, connection_1.query)(`
            SELECT DISTINCT b.*, 
                   (SELECT can_view FROM bot_permissions bp WHERE bp.bot_id = b.id AND bp.user_id = ?) as perm_status
            FROM bots b
            LEFT JOIN bot_permissions bp ON b.id = bp.bot_id
            WHERE b.tenant_id = ? OR bp.user_id = ?
        `, [id, user.tenant_id, id]);
        // 3. Auto-create missing permissions for bots in user's tenant
        // This ensures existing bots get permissions records
        for (const bot of botsResult.rows) {
            const existingPerm = await (0, connection_1.query)('SELECT 1 FROM bot_permissions WHERE user_id = ? AND bot_id = ?', [id, bot.id]);
            if (existingPerm.rows.length === 0) {
                // Create default full access permissions for bots in user's tenant
                await (0, connection_1.query)(`INSERT INTO bot_permissions 
                    (user_id, bot_id, can_view, can_edit, can_delete, can_create_campaigns, can_create_rules, can_view_analytics, can_use_reminders, can_use_ai, can_manage_contacts, can_manage_datasources)
                    VALUES (?, ?, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1)`, [id, bot.id]);
                console.log(`[Users] Auto-created permissions for user ${id} on bot ${bot.id}`);
            }
        }
        // 4. Get granular permissions (now includes auto-created ones)
        const permissionsResult = await (0, connection_1.query)('SELECT * FROM bot_permissions WHERE user_id = ?', [id]);
        // 5. Get aggregated analytics for this user
        const statsResult = await (0, connection_1.query)(`
            SELECT 
                COUNT(*) as total_messages,
                COUNT(CASE WHEN source = 'auto_reply' THEN 1 END) as auto_replies,
                COUNT(CASE WHEN source = 'campaign' THEN 1 END) as campaigns,
                COUNT(CASE WHEN source = 'reminder' THEN 1 END) as reminders
            FROM messages m
            JOIN bots b ON m.bot_id = b.id
            WHERE b.tenant_id = ?
        `, [user.tenant_id]);
        res.json({
            success: true,
            data: {
                user,
                bots: botsResult.rows,
                permissions: permissionsResult.rows,
                analytics: statsResult.rows[0] || { total_messages: 0, auto_replies: 0, campaigns: 0, reminders: 0 }
            }
        });
    }
    catch (error) {
        console.error('Get user detail error:', error);
        res.status(500).json({ success: false, error: 'Failed to get user detail' });
    }
};
exports.getUserDetail = getUserDetail;
/**
 * Invite user logic
 */
const inviteUser = async (req, res) => {
    try {
        const { email, role, bot_ids, permissions } = req.body;
        // Simplified for now - usually involves email sending
        res.json({ success: true, message: 'Invite functionality is disabled in this preview' });
    }
    catch (error) {
        res.status(500).json({ success: false, error: 'Failed' });
    }
};
exports.inviteUser = inviteUser;
/**
 * Update user
 */
const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, role } = req.body;
        const result = await (0, connection_1.query)('UPDATE users SET name = COALESCE(?, name), role = COALESCE(?, role), updated_at = CURRENT_TIMESTAMP WHERE id = ?', [name, role, id]);
        res.json({ success: true, data: result.rows[0] });
    }
    catch (error) {
        res.status(500).json({ success: false, error: 'Failed' });
    }
};
exports.updateUser = updateUser;
/**
 * Delete user
 */
const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        await (0, connection_1.query)('DELETE FROM users WHERE id = ?', [id]);
        res.json({ success: true, message: 'User deleted' });
    }
    catch (error) {
        res.status(500).json({ success: false, error: 'Failed' });
    }
};
exports.deleteUser = deleteUser;
/**
 * Get user stats
 */
const getUserStats = async (req, res) => {
    try {
        // Total users should count ALL users (including current user)
        const result = await (0, connection_1.query)(`
      SELECT 
        COUNT(*) as total_users,
        COUNT(CASE WHEN role IN ('ADMIN', 'OWNER') THEN 1 END) as admin_count,
        COUNT(CASE WHEN role = 'USER' THEN 1 END) as user_count
      FROM users
    `);
        // Also get total bots count
        const botsResult = await (0, connection_1.query)('SELECT COUNT(*) as total_bots FROM bots');
        res.json({
            success: true,
            data: {
                ...result.rows[0],
                total_bots: botsResult.rows[0]?.total_bots || 0
            }
        });
    }
    catch (error) {
        res.status(500).json({ success: false, error: 'Failed' });
    }
};
exports.getUserStats = getUserStats;
//# sourceMappingURL=usersController.js.map