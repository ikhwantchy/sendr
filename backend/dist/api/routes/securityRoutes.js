"use strict";
/**
 * Security Management Routes
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const crypto_1 = __importDefault(require("crypto"));
const axios_1 = __importDefault(require("axios"));
const auth_1 = require("../middleware/auth");
const securityService_1 = __importDefault(require("../../services/securityService"));
const systemSettingsService_1 = __importDefault(require("../../services/systemSettingsService"));
const connection_1 = require("../../database/connection");
const connection_sqlite_1 = require("../../database/connection-sqlite");
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
            logger_1.logger.info('Verifying Telegram bot token...', { tokenPrefix: botToken.trim().substring(0, 10) + '...' });
            const response = await axios_1.default.get(`https://api.telegram.org/bot${botToken.trim()}/getMe`, {
                timeout: 10000
            });
            logger_1.logger.info('Telegram API response:', { ok: response.data?.ok, result: response.data?.result });
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
            logger_1.logger.error('Telegram API verification failed', {
                message: apiError.message,
                status: apiError.response?.status,
                data: apiError.response?.data,
                code: apiError.code
            });
            const detail = apiError.response?.data?.description || apiError.message || 'Unknown error';
            return res.status(400).json({ success: false, error: `Failed to verify bot token: ${detail}` });
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
// ==========================================
// DATABASE BACKUP ENDPOINTS
// ==========================================
/**
 * POST /api/security/backup/create
 * Create a database backup (admin only)
 */
router.post('/backup/create', auth_1.authenticate, async (req, res) => {
    try {
        if (req.user.role !== 'OWNER' && req.user.role !== 'ADMIN') {
            return res.status(403).json({ success: false, error: 'Admin access required' });
        }
        const backupPath = (0, connection_sqlite_1.backupDatabase)();
        if (backupPath) {
            logger_1.logger.info('Manual database backup created', { userId: req.user.id, backupPath });
            res.json({ success: true, message: 'Backup created successfully', path: backupPath });
        }
        else {
            res.status(500).json({ success: false, error: 'Failed to create backup' });
        }
    }
    catch (error) {
        logger_1.logger.error('Backup creation failed', { error: error.message });
        res.status(500).json({ success: false, error: 'Failed to create backup' });
    }
});
/**
 * GET /api/security/backup/list
 * List available backups
 */
router.get('/backup/list', auth_1.authenticate, async (req, res) => {
    try {
        if (req.user.role !== 'OWNER' && req.user.role !== 'ADMIN') {
            return res.status(403).json({ success: false, error: 'Admin access required' });
        }
        const backups = (0, connection_sqlite_1.listBackups)();
        res.json({
            success: true,
            data: backups.map(b => ({
                ...b,
                sizeFormatted: (b.size / 1024 / 1024).toFixed(2) + ' MB'
            }))
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to list backups', { error: error.message });
        res.status(500).json({ success: false, error: 'Failed to list backups' });
    }
});
/**
 * POST /api/security/backup/restore
 * Restore database from a backup (admin only)
 */
router.post('/backup/restore', auth_1.authenticate, async (req, res) => {
    try {
        if (req.user.role !== 'OWNER') {
            return res.status(403).json({ success: false, error: 'Owner access required' });
        }
        const { backupName } = req.body;
        if (!backupName) {
            return res.status(400).json({ success: false, error: 'Backup name is required' });
        }
        const { join, dirname } = require('path');
        const DB_PATH = join(process.cwd(), 'data/database.sqlite');
        const backupPath = join(dirname(DB_PATH), 'backups', backupName);
        // Safety check: prevent path traversal
        if (!backupPath.includes('backups') || backupName.includes('..')) {
            return res.status(400).json({ success: false, error: 'Invalid backup name' });
        }
        // Create a safety backup before restore
        (0, connection_sqlite_1.backupDatabase)();
        const success = (0, connection_sqlite_1.restoreDatabase)(backupPath);
        if (success) {
            logger_1.logger.info('Database restored from backup', { userId: req.user.id, backupName });
            res.json({ success: true, message: 'Database restored. Please restart the server.' });
        }
        else {
            res.status(500).json({ success: false, error: 'Failed to restore backup' });
        }
    }
    catch (error) {
        logger_1.logger.error('Restore failed', { error: error.message });
        res.status(500).json({ success: false, error: 'Failed to restore backup' });
    }
});
exports.default = router;
//# sourceMappingURL=securityRoutes.js.map