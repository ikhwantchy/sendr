import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { query } from '../../database/connection';
import bcrypt from 'bcryptjs';
import { logger } from '../../utils/logger';

const router = Router();
router.use(authenticate);

// GET /api/users/profile - Get current user profile
router.get('/profile', async (req, res) => {
    try {
        const userId = (req as any).user.id;

        const result = await query(`
            SELECT id, email, name, role, status, created_at, last_login_at
            FROM users
            WHERE id = ?
        `, [userId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        res.json({ success: true, data: result.rows[0] });
    } catch (error: any) {
        logger.error('Error fetching user profile', { error: error.message });
        res.status(500).json({ success: false, message: 'Failed to fetch profile' });
    }
});

// PUT /api/users/profile - Update name and email
router.put('/profile', async (req, res) => {
    try {
        const userId = (req as any).user.id;
        const { name, email } = req.body;

        // Validation
        if (!name || !email) {
            return res.status(400).json({ success: false, message: 'Name and email are required' });
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({ success: false, message: 'Invalid email format' });
        }

        // Check if email is already taken by another user
        const emailCheck = await query(`
            SELECT id FROM users WHERE email = ? AND id != ?
        `, [email, userId]);

        if (emailCheck.rows.length > 0) {
            return res.status(400).json({ success: false, message: 'Email already in use' });
        }

        // Update user
        await query(`
            UPDATE users
            SET name = ?, email = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [name, email, userId]);

        // Fetch updated user
        const result = await query(`
            SELECT id, email, name, role, status, created_at, last_login_at
            FROM users
            WHERE id = ?
        `, [userId]);

        logger.info('User profile updated', { userId, name, email });
        res.json({ success: true, data: result.rows[0], message: 'Profile updated successfully' });
    } catch (error: any) {
        logger.error('Error updating user profile', { error: error.message });
        res.status(500).json({ success: false, message: 'Failed to update profile' });
    }
});

// PUT /api/users/password - Change password
router.put('/password', async (req, res) => {
    try {
        const userId = (req as any).user.id;
        const { currentPassword, newPassword } = req.body;

        // Validation
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ success: false, message: 'Current and new password are required' });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ success: false, message: 'New password must be at least 6 characters' });
        }

        // Get current user
        const userResult = await query(`
            SELECT password_hash FROM users WHERE id = ?
        `, [userId]);

        if (userResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const user = userResult.rows[0];

        // Verify current password
        const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);
        if (!isValidPassword) {
            return res.status(401).json({ success: false, message: 'Current password is incorrect' });
        }

        // Hash new password
        const newPasswordHash = await bcrypt.hash(newPassword, 10);

        // Update password
        await query(`
            UPDATE users
            SET password_hash = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [newPasswordHash, userId]);

        logger.info('User password changed', { userId });
        res.json({ success: true, message: 'Password changed successfully' });
    } catch (error: any) {
        logger.error('Error changing password', { error: error.message });
        res.status(500).json({ success: false, message: 'Failed to change password' });
    }
});

export default router;
