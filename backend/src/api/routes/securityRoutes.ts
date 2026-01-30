/**
 * Security Management Routes
 */

import { Router } from 'express';
import crypto from 'crypto';
import { authenticate } from '../middleware/auth';
import securityService from '../../services/securityService';
import systemSettingsService from '../../services/systemSettingsService';
import { query } from '../../database/connection';
import { logger } from '../../utils/logger';

const router = Router();

/**
 * GET /api/security/sessions
 * Get active sessions for current user
 */
router.get('/sessions', authenticate, async (req, res) => {
    try {
        const userId = req.user!.id;
        const sessions = await securityService.getActiveSessions(userId);
        res.json({ success: true, data: sessions });
    } catch (error: any) {
        logger.error('Failed to fetch sessions', { error: error.message });
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

/**
 * POST /api/security/sessions/:id/revoke
 * Revoke a specific session
 */
router.post('/sessions/:id/revoke', authenticate, async (req, res) => {
    try {
        const sessionId = req.params.id;
        const userId = req.user!.id;

        // Verify session belongs to user
        const session = await query('SELECT user_id FROM user_sessions WHERE id = ?', [sessionId]);
        if (session.rows.length === 0 || session.rows[0].user_id !== userId) {
            return res.status(403).json({ success: false, error: 'Unauthorized' });
        }

        await securityService.revokeSession(sessionId);
        await securityService.logEvent(userId, 'SESSION_REVOKED', req.ip, req.get('user-agent'), { sessionId });

        res.json({ success: true, message: 'Session revoked successfully' });
    } catch (error: any) {
        logger.error('Failed to revoke session', { error: error.message });
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

/**
 * POST /api/security/sessions/revoke-others
 * Revoke all sessions except current
 */
router.post('/sessions/revoke-others', authenticate, async (req, res) => {
    try {
        const userId = req.user!.id;
        const authHeader = req.headers.authorization!;
        const token = authHeader.substring(7);
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

        await securityService.revokeAllOtherSessions(userId, tokenHash);
        await securityService.logEvent(userId, 'SESSIONS_REVOKED_ALL', req.ip, req.get('user-agent'));

        res.json({ success: true, message: 'All other sessions revoked' });
    } catch (error: any) {
        logger.error('Failed to revoke other sessions', { error: error.message });
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

/**
 * GET /api/security/logs
 * Get security audit logs for current user
 */
router.get('/logs', authenticate, async (req, res) => {
    try {
        const userId = req.user!.id;
        const result = await query(
            'SELECT * FROM security_logs WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
            [userId]
        );
        res.json({ success: true, data: result.rows });
    } catch (error: any) {
        logger.error('Failed to fetch security logs', { error: error.message });
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

/**
 * POST /api/security/telegram/setup
 * Update Telegram Chat ID
 */
router.post('/telegram/setup', authenticate, async (req, res) => {
    try {
        const { chatId } = req.body;
        const userId = req.user!.id;

        await query('UPDATE users SET telegram_chat_id = ? WHERE id = ?', [chatId, userId]);

        await securityService.sendTelegramAlert(userId, '<b>✅ Telegram Alerts Linked</b>\n\nYou will now receive security notifications here.');
        await securityService.logEvent(userId, 'TELEGRAM_LINKED', req.ip, req.get('user-agent'), { chatId });

        res.json({ success: true, message: 'Telegram setup successful' });
    } catch (error: any) {
        logger.error('Failed to set up Telegram', { error: error.message });
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

/**
 * GET /api/security/telegram/status
 * Get Telegram connection status
 */
router.get('/telegram/status', authenticate, async (req, res) => {
    try {
        const userId = req.user!.id;

        const result = await query('SELECT telegram_chat_id FROM users WHERE id = ?', [userId]);
        const chatId = result.rows[0]?.telegram_chat_id;

        // Check if system bot is configured
        let botToken = await systemSettingsService.get('telegram', 'bot_token');
        if (!botToken) botToken = process.env.TELEGRAM_BOT_TOKEN;

        res.json({
            success: true,
            data: {
                connected: !!chatId,
                chatId: chatId || null,
                systemConfigured: !!botToken
            }
        });
    } catch (error: any) {
        logger.error('Failed to get Telegram status', { error: error.message });
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

/**
 * DELETE /api/security/telegram/setup
 * Remove Telegram Link
 */
router.delete('/telegram/setup', authenticate, async (req, res) => {
    try {
        const userId = req.user!.id;
        await query('UPDATE users SET telegram_chat_id = NULL WHERE id = ?', [userId]);
        await securityService.logEvent(userId, 'TELEGRAM_UNLINKED', req.ip, req.get('user-agent'));
        res.json({ success: true, message: 'Telegram unlinked successfully' });
    } catch (error: any) {
        logger.error('Failed to unlink Telegram', { error: error.message });
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

/**
 * POST /api/security/telegram/test
 * Send a test alert
 */
router.post('/telegram/test', authenticate, async (req, res) => {
    try {
        const userId = req.user!.id;
        const msg = '<b>🔔 Test Alert</b>\n\nThis is a test notification from Sendr Security Center.\nIf you see this, your integration is working perfectly! 🚀';

        await securityService.sendTelegramAlert(userId, msg);

        res.json({ success: true, message: 'Test alert sent' });
    } catch (error: any) {
        logger.error('Failed to send test alert', { error: error.message });
        res.status(500).json({ success: false, error: 'Failed to send alert' });
    }
});

export default router;
