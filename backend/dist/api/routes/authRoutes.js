"use strict";
/**
 * Auth Routes
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const connection_1 = require("../../database/connection");
const auth_1 = require("../middleware/auth");
const logger_1 = require("../../utils/logger");
const securityService_1 = __importDefault(require("../../services/securityService"));
const router = (0, express_1.Router)();
/**
 * POST /api/auth/login
 */
router.post('/login', async (req, res) => {
    logger_1.logger.info('Login attempt', { email: req.body.email });
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                error: 'Email and password are required',
            });
        }
        // Normal database authentication
        try {
            const { turnstileToken } = req.body;
            // Turnstile Verification
            const isHuman = await securityService_1.default.verifyTurnstile(turnstileToken);
            if (!isHuman && process.env.NODE_ENV === 'production' && process.env.CF_TURNSTILE_SECRET_KEY !== 'placeholder_secret') {
                return res.status(403).json({
                    success: false,
                    error: 'Security verification failed',
                });
            }
            logger_1.logger.debug('Database query for user', { email });
            const result = await (0, connection_1.query)("SELECT * FROM users WHERE email = ? AND status = 'active'", [email]);
            const user = result.rows[0];
            if (!user) {
                await securityService_1.default.logEvent(null, 'LOGIN_FAILED', req.ip, req.get('user-agent'), { email, reason: 'user_not_found' });
                logger_1.logger.warn('User login failed: Not found or inactive', { email });
                // Send Telegram alert for failed login (unknown user)
                try {
                    await securityService_1.default.sendTelegramAlert(null, `<b>⚠️ Failed Login Attempt</b>\n\n` +
                        `📧 <b>Email:</b> <code>${email}</code>\n` +
                        `❌ <b>Reason:</b> User not found\n` +
                        `🌐 <b>IP:</b> <code>${req.ip || 'Unknown'}</code>\n` +
                        `📱 <b>Device:</b> ${(req.get('user-agent') || 'Unknown').substring(0, 100)}`);
                }
                catch (e) {
                    logger_1.logger.error('Telegram alert failed (login_not_found)', { error: e.message });
                }
                return res.status(401).json({
                    success: false,
                    error: 'Invalid credentials',
                });
            }
            logger_1.logger.debug('Checking password hash');
            const validPassword = await bcryptjs_1.default.compare(password, user.password_hash);
            if (!validPassword) {
                await securityService_1.default.logEvent(user.id, 'LOGIN_FAILED', req.ip, req.get('user-agent'), { email, reason: 'invalid_password' });
                logger_1.logger.warn('User login failed: Password mismatch', { email });
                // Send Telegram alert for failed login (wrong password)
                try {
                    await securityService_1.default.sendTelegramAlert(user.id, `<b>⚠️ Failed Login Attempt</b>\n\n` +
                        `👤 <b>User:</b> ${user.name || 'Unknown'} (${email})\n` +
                        `❌ <b>Reason:</b> Wrong password\n` +
                        `🌐 <b>IP:</b> <code>${req.ip || 'Unknown'}</code>\n` +
                        `📱 <b>Device:</b> ${(req.get('user-agent') || 'Unknown').substring(0, 100)}`);
                }
                catch (e) {
                    logger_1.logger.error('Telegram alert failed (login_wrong_pw)', { error: e.message });
                }
                return res.status(401).json({
                    success: false,
                    error: 'Invalid credentials',
                });
            }
            // Check if 2FA is required
            if (user.two_factor_enabled && !req.body.twoFactorCode) {
                return res.json({
                    success: true,
                    requires2FA: true,
                    userId: user.id
                });
            }
            // If 2FA code is provided, verify it here (skipped for now, will implement in security dashboard first)
            logger_1.logger.debug('Updating last login time');
            try {
                await (0, connection_1.query)("UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?", [user.id]);
            }
            catch (err) {
                logger_1.logger.error('Failed to update last_login_at', { error: err.message });
            }
            logger_1.logger.debug('Generating JWT token');
            const permissions = typeof user.permissions === 'string'
                ? JSON.parse(user.permissions || '{}')
                : (user.permissions || {});
            const token = (0, auth_1.generateToken)({
                id: user.id,
                tenant_id: user.tenant_id,
                email: user.email,
                role: user.role,
                permissions
            });
            // Create Session Tracking
            await securityService_1.default.createSession(user.id, token, req.ip, req.get('user-agent'));
            // Send Telegram alert for successful login
            try {
                logger_1.logger.info('Sending Telegram login alert', { userId: user.id, role: user.role });
                await securityService_1.default.sendTelegramAlert(user.id, `<b>🔔 Login Alert</b>\n\n` +
                    `👤 <b>User:</b> ${user.name || 'Unknown'} (${user.email})\n` +
                    `🔑 <b>Role:</b> ${user.role}\n` +
                    `✅ <b>Status:</b> Successful login\n` +
                    `🌐 <b>IP:</b> <code>${req.ip || 'Unknown'}</code>\n` +
                    `📱 <b>Device:</b> ${(req.get('user-agent') || 'Unknown').substring(0, 100)}`);
                logger_1.logger.info('Telegram login alert sent successfully');
            }
            catch (e) {
                logger_1.logger.error('Telegram alert failed (login_success)', { error: e.message, userId: user.id });
            }
            logger_1.logger.info('Login successful', { email: user.email, id: user.id });
            return res.json({
                success: true,
                data: {
                    token,
                    user: {
                        id: user.id,
                        email: user.email,
                        name: user.name,
                        role: user.role,
                        tenant_id: user.tenant_id,
                        permissions
                    },
                },
            });
        }
        catch (dbError) {
            logger_1.logger.error('Database error during login', { error: dbError.message });
            return res.status(500).json({
                success: false,
                error: 'Database error',
            });
        }
    }
    catch (error) {
        logger_1.logger.error('Login route error', { error: error.message });
        res.status(500).json({
            success: false,
            error: 'Internal server error',
        });
    }
});
/**
 * POST /api/auth/register
 */
router.post('/register', async (req, res) => {
    return res.status(403).json({
        success: false,
        error: 'Registration is currently disabled.'
    });
});
/**
 * GET /api/auth/profile
 * Get current user profile and permissions
 */
router.get('/profile', auth_1.authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const result = await (0, connection_1.query)('SELECT id, email, name, role, tenant_id, permissions FROM users WHERE id = ?', [userId]);
        const user = result.rows[0];
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }
        const permissions = typeof user.permissions === 'string'
            ? JSON.parse(user.permissions || '{}')
            : (user.permissions || {});
        res.json({
            success: true,
            data: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                tenant_id: user.tenant_id,
                permissions
            }
        });
    }
    catch (error) {
        logger_1.logger.error('Profile fetch error', { error: error.message });
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});
exports.default = router;
//# sourceMappingURL=authRoutes.js.map