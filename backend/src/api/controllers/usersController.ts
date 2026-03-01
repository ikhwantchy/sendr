
import { Request, Response } from 'express';
import { query } from '../../database/connection';
import bcrypt from 'bcrypt';

/**
 * List all users
 */
export const listUsers = async (req: Request, res: Response) => {
    try {
        // Show ALL users including current logged-in user
        const result = await query(`
      SELECT 
        u.id,
        u.tenant_id,
        u.email,
        u.password_plain,
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
            'SELECT id, tenant_id, email, password_plain, name, role, created_at FROM users WHERE id = ?',
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

        // 3. Auto-create missing permissions for bots in user's tenant
        // This ensures existing bots get permissions records
        for (const bot of botsResult.rows) {
            const existingPerm = await query(
                'SELECT 1 FROM bot_permissions WHERE user_id = ? AND bot_id = ?',
                [id, bot.id]
            );

            if (existingPerm.rows.length === 0) {
                // Create default full access permissions for bots in user's tenant
                await query(
                    `INSERT INTO bot_permissions 
                    (user_id, bot_id, can_view, can_edit, can_delete, can_create_campaigns, can_create_rules, can_view_analytics, can_use_reminders, can_use_ai, can_manage_contacts, can_manage_datasources)
                    VALUES (?, ?, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1)`,
                    [id, bot.id]
                );
                console.log(`[Users] Auto-created permissions for user ${id} on bot ${bot.id}`);
            }
        }

        // 4. Get granular permissions (now includes auto-created ones)
        const permissionsResult = await query(
            'SELECT * FROM bot_permissions WHERE user_id = ?',
            [id]
        );

        // 5. Get aggregated analytics for this user
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
        const { name, role, password } = req.body;

        // Build update query dynamically
        let updateFields = [];
        let params: any[] = [];

        if (name) {
            updateFields.push('name = ?');
            params.push(name);
        }

        if (role) {
            updateFields.push('role = ?');
            params.push(role);
        }

        if (password) {
            const passwordHash = await bcrypt.hash(password, 10);
            updateFields.push('password_hash = ?');
            params.push(passwordHash);
            updateFields.push('password_plain = ?');
            params.push(password);
        }

        if (updateFields.length === 0) {
            return res.json({ success: true, message: 'No changes made' });
        }

        updateFields.push('updated_at = CURRENT_TIMESTAMP');
        params.push(id);

        const sql = `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`;
        await query(sql, params);

        res.json({ success: true, message: 'User updated successfully' });
    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({ success: false, error: 'Failed to update user' });
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
        // Total users should count ALL users (including current user)
        const result = await query(`
      SELECT 
        COUNT(*) as total_users,
        COUNT(CASE WHEN role IN ('ADMIN', 'OWNER') THEN 1 END) as admin_count,
        COUNT(CASE WHEN role = 'USER' THEN 1 END) as user_count
      FROM users
    `);

        // Also get total bots count
        const botsResult = await query('SELECT COUNT(*) as total_bots FROM bots');

        res.json({
            success: true,
            data: {
                ...result.rows[0],
                total_bots: botsResult.rows[0]?.total_bots || 0
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed' });
    }
};
