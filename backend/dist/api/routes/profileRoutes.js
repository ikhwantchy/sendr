"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const connection_1 = require("../../database/connection");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const logger_1 = require("../../utils/logger");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
// GET /api/users/profile - Get current user profile
router.get('/profile', async (req, res) => {
    try {
        const userId = req.user.id;
        const result = await (0, connection_1.query)(`
            SELECT id, email, name, role, status, created_at, last_login_at
            FROM users
            WHERE id = ?
        `, [userId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        res.json({ success: true, data: result.rows[0] });
    }
    catch (error) {
        logger_1.logger.error('Error fetching user profile', { error: error.message });
        res.status(500).json({ success: false, message: 'Failed to fetch profile' });
    }
});
// PUT /api/users/profile - Update name and email
router.put('/profile', async (req, res) => {
    try {
        const userId = req.user.id;
        const { name, email } = req.body;
        // Validation
        if (!name || !email) {
            return res.status(400).json({ success: false, message: 'Name and email are required' });
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({ success: false, message: 'Invalid email format' });
        }
        // Check if email is already taken by another user
        const emailCheck = await (0, connection_1.query)(`
            SELECT id FROM users WHERE email = ? AND id != ?
        `, [email, userId]);
        if (emailCheck.rows.length > 0) {
            return res.status(400).json({ success: false, message: 'Email already in use' });
        }
        // Update user
        await (0, connection_1.query)(`
            UPDATE users
            SET name = ?, email = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [name, email, userId]);
        // Fetch updated user
        const result = await (0, connection_1.query)(`
            SELECT id, email, name, role, status, created_at, last_login_at
            FROM users
            WHERE id = ?
        `, [userId]);
        logger_1.logger.info('User profile updated', { userId, name, email });
        res.json({ success: true, data: result.rows[0], message: 'Profile updated successfully' });
    }
    catch (error) {
        logger_1.logger.error('Error updating user profile', { error: error.message });
        res.status(500).json({ success: false, message: 'Failed to update profile' });
    }
});
// PUT /api/users/password - Change password
router.put('/password', async (req, res) => {
    try {
        const userId = req.user.id;
        const { currentPassword, newPassword } = req.body;
        // Validation
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ success: false, message: 'Current and new password are required' });
        }
        if (newPassword.length < 6) {
            return res.status(400).json({ success: false, message: 'New password must be at least 6 characters' });
        }
        // Get current user
        const userResult = await (0, connection_1.query)(`
            SELECT password_hash FROM users WHERE id = ?
        `, [userId]);
        if (userResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        const user = userResult.rows[0];
        // Verify current password
        const isValidPassword = await bcryptjs_1.default.compare(currentPassword, user.password_hash);
        if (!isValidPassword) {
            return res.status(401).json({ success: false, message: 'Current password is incorrect' });
        }
        // Hash new password
        const newPasswordHash = await bcryptjs_1.default.hash(newPassword, 10);
        // Update password
        await (0, connection_1.query)(`
            UPDATE users
            SET password_hash = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [newPasswordHash, userId]);
        logger_1.logger.info('User password changed', { userId });
        res.json({ success: true, message: 'Password changed successfully' });
    }
    catch (error) {
        logger_1.logger.error('Error changing password', { error: error.message });
        res.status(500).json({ success: false, message: 'Failed to change password' });
    }
});
exports.default = router;
//# sourceMappingURL=profileRoutes.js.map