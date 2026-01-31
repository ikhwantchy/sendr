
import { Request, Response } from 'express';
import { query } from '../../database/connection';

/**
 * List all users
 */
export const listUsers = async (req: Request, res: Response) => {
    try {
        const result = await query(`
      SELECT 
        u.id,
        u.tenant_id,
        u.email,
        u.name,
        u.role,
        u.created_at,
        (SELECT COUNT(*) FROM bots b WHERE b.tenant_id = u.tenant_id) as bots_count
      FROM users u
      WHERE u.id != ?
      ORDER BY u.created_at DESC
    `, [(req as any).user.id]);

        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        console.error('List users error:', error);
        res.status(500).json({ success: false, error: 'Failed to list users' });
    }
};

/**
 * Get user detail with bots and aggregated analytics
 */
export const getUserDetail = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        // 1. Get user info
        const userResult = await query(
            'SELECT id, tenant_id, email, name, role, created_at FROM users WHERE id = ?',
            [id]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        const user = userResult.rows[0];

        // 2. Get all bots associated with this user (via tenant or permissions)
        const botsResult = await query(`
            SELECT DISTINCT b.*, 
                   (SELECT can_view FROM bot_permissions bp WHERE bp.bot_id = b.id AND bp.user_id = ?) as perm_status
            FROM bots b
            LEFT JOIN bot_permissions bp ON b.id = bp.bot_id
            WHERE b.tenant_id = ? OR bp.user_id = ?
        `, [id, user.tenant_id, id]);

        // 3. Get granular permissions
        const permissionsResult = await query(
            'SELECT * FROM bot_permissions WHERE user_id = ?',
            [id]
        );

        // 4. Get aggregated analytics for this user
        const statsResult = await query(`
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
    } catch (error) {
        console.error('Get user detail error:', error);
        res.status(500).json({ success: false, error: 'Failed to get user detail' });
    }
};

/**
 * Invite user logic
 */
export const inviteUser = async (req: Request, res: Response) => {
    try {
        const { email, role, bot_ids, permissions } = req.body;
        // Simplified for now - usually involves email sending
        res.json({ success: true, message: 'Invite functionality is disabled in this preview' });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed' });
    }
};

/**
 * Update user
 */
export const updateUser = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { name, role } = req.body;
        const result = await query(
            'UPDATE users SET name = COALESCE(?, name), role = COALESCE(?, role), updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [name, role, id]
        );
        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed' });
    }
};

/**
 * Delete user
 */
export const deleteUser = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        await query('DELETE FROM users WHERE id = ?', [id]);
        res.json({ success: true, message: 'User deleted' });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed' });
    }
};

/**
 * Get user stats
 */
export const getUserStats = async (req: Request, res: Response) => {
    try {
        const result = await query(`
      SELECT 
        COUNT(*) as total_users,
        COUNT(CASE WHEN role IN ('ADMIN', 'OWNER') THEN 1 END) as admin_count,
        COUNT(CASE WHEN role = 'USER' THEN 1 END) as user_count
      FROM users
      WHERE id != ?
    `, [(req as any).user.id]);
        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed' });
    }
};
