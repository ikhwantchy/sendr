"use strict";
/**
 * Security Management Routes
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const crypto_1 = __importDefault(require("crypto"));
const auth_1 = require("../middleware/auth");
const securityService_1 = __importDefault(require("../../services/securityService"));
const systemSettingsService_1 = __importDefault(require("../../services/systemSettingsService"));
const connection_1 = require("../../database/connection");
const logger_1 = require("../../utils/logger");
const router = (0, express_1.Router)();
/**
 * GET /api/security/sessions
 * Get active sessions for current user
 */
router.get('/sessions', auth_1.authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const sessions = await securityService_1.default.getActiveSessions(userId);
        res.json({ success: true, data: sessions });
    }
    catch (error) {
        logger_1.logger.error('Failed to fetch sessions', { error: error.message });
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});
/**
 * POST /api/security/sessions/:id/revoke
 * Revoke a specific session
 */
router.post('/sessions/:id/revoke', auth_1.authenticate, async (req, res) => {
    try {
        const sessionId = req.params.id;
        const userId = req.user.id;
        // Verify session belongs to user
        const session = await (0, connection_1.query)('SELECT user_id FROM user_sessions WHERE id = ?', [sessionId]);
        if (session.rows.length === 0 || session.rows[0].user_id !== userId) {
            return res.status(403).json({ success: false, error: 'Unauthorized' });
        }
        await securityService_1.default.revokeSession(sessionId);
        await securityService_1.default.logEvent(userId, 'SESSION_REVOKED', req.ip, req.get('user-agent'), { sessionId });
        res.json({ success: true, message: 'Session revoked successfully' });
    }
    catch (error) {
        logger_1.logger.error('Failed to revoke session', { error: error.message });
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});
/**
 * POST /api/security/sessions/revoke-others
 * Revoke all sessions except current
 */
router.post('/sessions/revoke-others', auth_1.authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const authHeader = req.headers.authorization;
        const token = authHeader.substring(7);
        const tokenHash = crypto_1.default.createHash('sha256').update(token).digest('hex');
        await securityService_1.default.revokeAllOtherSessions(userId, tokenHash);
        await securityService_1.default.logEvent(userId, 'SESSIONS_REVOKED_ALL', req.ip, req.get('user-agent'));
        res.json({ success: true, message: 'All other sessions revoked' });
    }
    catch (error) {
        logger_1.logger.error('Failed to revoke other sessions', { error: error.message });
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});
/**
 * GET /api/security/logs
 * Get security audit logs for current user
 */
router.get('/logs', auth_1.authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const result = await (0, connection_1.query)('SELECT * FROM security_logs WHERE user_id = ? ORDER BY created_at DESC LIMIT 50', [userId]);
        res.json({ success: true, data: result.rows });
    }
    catch (error) {
        logger_1.logger.error('Failed to fetch security logs', { error: error.message });
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});
/**
 * POST /api/security/telegram/bot-token
 * Save Telegram Bot Token to system settings
 */
router.post('/telegram/bot-token', auth_1.authenticate, async (req, res) => {
    try {
        const { botToken } = req.body;
        const userId = req.user.id;
        if (!botToken || !botToken.trim()) {
            return res.status(400).json({ success: false, error: 'Bot token is required' });
        }
        // Validate token format (basic check: contains colon, starts with numbers)
        if (!/^\d+:.+$/.test(botToken.trim())) {
            return res.status(400).json({ success: false, error: 'Invalid bot token format. Expected format: 123456789:ABCdef...' });
        }
        // Verify token by calling Telegram getMe API
        try {
            const response = await (await Promise.resolve().then(() => __importStar(require('axios')))).default.get(`https://api.telegram.org/bot${botToken.trim()}/getMe`);
            if (!response.data?.ok) {
                return res.status(400).json({ success: false, error: 'Invalid bot token - Telegram rejected it' });
            }
            const botInfo = response.data.result;
            // Save to system_settings
            await systemSettingsService_1.default.set({
                category: 'telegram',
                key: 'bot_token',
                value: botToken.trim(),
                updated_by: userId
            });
            // Also save bot info for display
            await systemSettingsService_1.default.set({
                category: 'telegram',
                key: 'bot_username',
                value: botInfo.username || '',
                updated_by: userId
            });
            await securityService_1.default.logEvent(userId, 'TELEGRAM_BOT_CONFIGURED', req.ip, req.get('user-agent'), {
                botUsername: botInfo.username
            });
            res.json({
                success: true,
                message: 'Bot token saved successfully',
                data: {
                    botUsername: botInfo.username,
                    botName: botInfo.first_name
                }
            });
        }
        catch (apiError) {
            return res.status(400).json({ success: false, error: 'Invalid bot token - could not verify with Telegram' });
        }
    }
    catch (error) {
        logger_1.logger.error('Failed to save bot token', { error: error.message });
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});
/**
 * DELETE /api/security/telegram/bot-token
 * Remove Telegram Bot Token
 */
router.delete('/telegram/bot-token', auth_1.authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        await systemSettingsService_1.default.delete('telegram', 'bot_token', userId);
        await systemSettingsService_1.default.delete('telegram', 'bot_username', userId);
        await securityService_1.default.logEvent(userId, 'TELEGRAM_BOT_REMOVED', req.ip, req.get('user-agent'));
        // Clear cache so status endpoint reflects immediately
        systemSettingsService_1.default.clearCache();
        res.json({ success: true, message: 'Bot token removed' });
    }
    catch (error) {
        logger_1.logger.error('Failed to remove bot token', { error: error.message });
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});
/**
 * POST /api/security/telegram/setup
 * Update Telegram Chat ID
 */
router.post('/telegram/setup', auth_1.authenticate, async (req, res) => {
    try {
        const { chatId } = req.body;
        const userId = req.user.id;
        await (0, connection_1.query)('UPDATE users SET telegram_chat_id = ? WHERE id = ?', [chatId, userId]);
        await securityService_1.default.sendTelegramAlert(userId, '<b>✅ Telegram Alerts Linked</b>\n\nYou will now receive security notifications here.');
        await securityService_1.default.logEvent(userId, 'TELEGRAM_LINKED', req.ip, req.get('user-agent'), { chatId });
        res.json({ success: true, message: 'Telegram setup successful' });
    }
    catch (error) {
        logger_1.logger.error('Failed to set up Telegram', { error: error.message });
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});
/**
 * GET /api/security/telegram/status
 * Get Telegram connection status
 */
router.get('/telegram/status', auth_1.authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const result = await (0, connection_1.query)('SELECT telegram_chat_id FROM users WHERE id = ?', [userId]);
        const chatId = result.rows[0]?.telegram_chat_id;
        // Check if system bot is configured
        let botToken = await systemSettingsService_1.default.get('telegram', 'bot_token');
        if (!botToken)
            botToken = process.env.TELEGRAM_BOT_TOKEN;
        const botUsername = await systemSettingsService_1.default.get('telegram', 'bot_username');
        res.json({
            success: true,
            data: {
                connected: !!chatId,
                chatId: chatId || null,
                systemConfigured: !!botToken,
                botUsername: botUsername || null
            }
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to get Telegram status', { error: error.message });
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});
/**
 * DELETE /api/security/telegram/setup
 * Remove Telegram Link
 */
router.delete('/telegram/setup', auth_1.authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        await (0, connection_1.query)('UPDATE users SET telegram_chat_id = NULL WHERE id = ?', [userId]);
        await securityService_1.default.logEvent(userId, 'TELEGRAM_UNLINKED', req.ip, req.get('user-agent'));
        res.json({ success: true, message: 'Telegram unlinked successfully' });
    }
    catch (error) {
        logger_1.logger.error('Failed to unlink Telegram', { error: error.message });
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});
/**
 * POST /api/security/telegram/test
 * Send a test alert
 */
router.post('/telegram/test', auth_1.authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const msg = '<b>🔔 Test Alert</b>\n\nThis is a test notification from Sendr Security Center.\nIf you see this, your integration is working perfectly! 🚀';
        await securityService_1.default.sendTelegramAlert(userId, msg);
        res.json({ success: true, message: 'Test alert sent' });
    }
    catch (error) {
        logger_1.logger.error('Failed to send test alert', { error: error.message });
        res.status(500).json({ success: false, error: 'Failed to send alert' });
    }
});
exports.default = router;
//# sourceMappingURL=securityRoutes.js.map