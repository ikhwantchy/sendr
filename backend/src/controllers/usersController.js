/**
 * Users Controller
 * Handles user management operations (owner only)
 */

const { query } = require('../database/connection-sqlite');
const crypto = require('crypto');

/**
 * List all users
 * GET /api/users
 */
const listUsers = async (req, res) => {
    try {
        const result = await query(`
      SELECT 
        u.id,
        u.email,
        u.name,
        u.role,
        u.created_at,
        COUNT(DISTINCT bp.bot_id) as bots_count
      FROM users u
      LEFT JOIN bot_permissions bp ON u.id = bp.user_id
      WHERE u.id != ?
      GROUP BY u.id, u.email, u.name, u.role, u.created_at
      ORDER BY u.created_at DESC
    `, [req.user.id]); // Exclude current user (owner)

        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        console.error('List users error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to list users'
        });
    }
};

/**
 * Get user detail
 * GET /api/users/:id
 */
const getUserDetail = async (req, res) => {
    try {
        const { id } = req.params;

        // Get user info
        const userResult = await query(
            'SELECT id, email, name, role, created_at FROM users WHERE id = ?',
            [id]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        const user = userResult.rows[0];

        // Get user's bot permissions
        const permissionsResult = await query(`
      SELECT 
        bp.*,
        b.name as bot_name,
        b.phone_number as bot_phone
      FROM bot_permissions bp
      JOIN bots b ON bp.bot_id = b.id
      WHERE bp.user_id = ?
      ORDER BY bp.granted_at DESC
    `, [id]);

        res.json({
            success: true,
            data: {
                user,
                permissions: permissionsResult.rows
            }
        });
    } catch (error) {
        console.error('Get user detail error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get user detail'
        });
    }
};

/**
 * Invite user
 * POST /api/users/invite
 */
const inviteUser = async (req, res) => {
    try {
        const { email, role, bot_ids, permissions } = req.body;

        // Validate input
        if (!email || !role) {
            return res.status(400).json({
                success: false,
                error: 'Email and role are required'
            });
        }

        // Check if user already exists
        const existingUser = await query(
            'SELECT id FROM users WHERE email = ?',
            [email]
        );

        if (existingUser.rows.length > 0) {
            return res.status(400).json({
                success: false,
                error: 'User with this email already exists'
            });
        }

        // Generate invitation token
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

        // Create invitation
        const invitationResult = await query(`
      INSERT INTO user_invitations (email, role, invited_by, token, expires_at)
      VALUES (?, ?, ?, ?, ?)
      RETURNING *
    `, [email, role, req.user.id, token, expiresAt]);

        const invitation = invitationResult.rows[0];

        // Store bot assignments and permissions temporarily (will be applied when accepted)
        // For now, we'll send them in the invitation email
        const invitationData = {
            ...invitation,
            bot_ids: bot_ids || [],
            permissions: permissions || {
                can_view: true,
                can_edit: false,
                can_delete: false,
                can_create_campaigns: true,
                can_create_rules: false,
                can_view_analytics: true
            }
        };

        // TODO: Send invitation email
        // await sendInvitationEmail(email, token, invitationData);

        res.json({
            success: true,
            data: {
                invitation: invitationData,
                invitation_link: `${process.env.APP_URL || 'http://localhost:3000'}/accept-invitation?token=${token}`
            }
        });
    } catch (error) {
        console.error('Invite user error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to invite user'
        });
    }
};

/**
 * Update user
 * PUT /api/users/:id
 */
const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, role } = req.body;

        const result = await query(`
      UPDATE users 
      SET name = COALESCE(?, name),
          role = COALESCE(?, role),
          updated_at = datetime('now')
      WHERE id = ?
      RETURNING id, email, name, role, created_at, updated_at
    `, [name, role, id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        res.json({
            success: true,
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update user'
        });
    }
};

/**
 * Delete user
 * DELETE /api/users/:id
 */
const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;

        // Delete user (cascade will delete permissions)
        const result = await query(
            'DELETE FROM users WHERE id = ? RETURNING id',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        res.json({
            success: true,
            message: 'User deleted successfully'
        });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete user'
        });
    }
};

/**
 * Get user stats (for owner dashboard)
 * GET /api/users/stats
 */
const getUserStats = async (req, res) => {
    try {
        const result = await query(`
      SELECT 
        COUNT(*) as total_users,
        COUNT(CASE WHEN role = 'admin' THEN 1 END) as admin_count,
        COUNT(CASE WHEN role = 'user' THEN 1 END) as user_count
      FROM users
      WHERE role != 'owner'
    `);

        res.json({
            success: true,
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Get user stats error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get user stats'
        });
    }
};

module.exports = {
    listUsers,
    getUserDetail,
    inviteUser,
    updateUser,
    deleteUser,
    getUserStats
};
