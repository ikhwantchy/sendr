/**
 * Security Service
 * Handles session management, security logging, 2FA, and Telegram alerts.
 */

import { v4 as uuidv4 } from 'uuid';
import { query } from '../database/connection';
import { logger } from '../utils/logger';
import axios from 'axios';
import crypto from 'crypto';
import auditLogService from './auditLogService';
import systemSettingsService from './systemSettingsService';

export class SecurityService {
    private static instance: SecurityService;

    private constructor() { }

    public static getInstance(): SecurityService {
        if (!SecurityService.instance) {
            SecurityService.instance = new SecurityService();
        }
        return SecurityService.instance;
    }

    /**
     * Hash a token for storage
     */
    private hashToken(token: string): string {
        return crypto.createHash('sha256').update(token).digest('hex');
    }

    /**
     * Create a new session
     */
    async createSession(userId: string, token: string, ipAddress?: string, userAgent?: string) {
        try {
            const id = uuidv4();
            const tokenHash = this.hashToken(token);

            await query(
                'INSERT INTO user_sessions (id, user_id, token_hash, ip_address, user_agent, last_active, is_revoked) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, 0)',
                [id, userId, tokenHash, ipAddress, userAgent]
            );

            await this.logEvent(userId, 'LOGIN_SUCCESS', ipAddress, userAgent);

            // Global Audit Log
            try {
                const userResult = await query('SELECT tenant_id FROM users WHERE id = ?', [userId]);
                const tenantId = userResult.rows[0]?.tenant_id;
                await auditLogService.logUserLogin(userId, tenantId, ipAddress, userAgent);
            } catch (err: any) {
                logger.error('Failed to log login in global audit log', { error: err.message });
            }

            // Telegram alert is now handled in authRoutes.ts to ensure it fires reliably

            return id;
        } catch (error: any) {
            logger.error('Failed to create session', { error: error.message });
            throw error;
        }
    }

    /**
     * Validate a session token
     */
    async validateSession(token: string): Promise<boolean> {
        try {
            const tokenHash = this.hashToken(token);
            const result = await query(
                'SELECT * FROM user_sessions WHERE token_hash = ? AND is_revoked = 0',
                [tokenHash]
            );

            if (result.rows.length === 0) return false;

            // Update last active
            await query(
                'UPDATE user_sessions SET last_active = CURRENT_TIMESTAMP WHERE token_hash = ?',
                [tokenHash]
            );

            return true;
        } catch (error: any) {
            logger.error('Session validation error', { error: error.message });
            return false;
        }
    }

    /**
     * Revoke a session
     */
    async revokeSession(sessionId: string) {
        await query('UPDATE user_sessions SET is_revoked = 1 WHERE id = ?', [sessionId]);
    }

    /**
     * Revoke all user sessions except current
     */
    async revokeAllOtherSessions(userId: string, currentTokenHash: string) {
        await query(
            'UPDATE user_sessions SET is_revoked = 1 WHERE user_id = ? AND token_hash != ?',
            [userId, currentTokenHash]
        );
    }

    /**
     * Get active sessions for a user
     */
    async getActiveSessions(userId: string) {
        const result = await query(
            'SELECT id, ip_address, user_agent, last_active FROM user_sessions WHERE user_id = ? AND is_revoked = 0 ORDER BY last_active DESC',
            [userId]
        );
        return result.rows;
    }

    /**
     * Log a security event
     */
    async logEvent(userId: string | null, eventType: string, ipAddress?: string, userAgent?: string, metadata: any = {}) {
        try {
            const id = uuidv4();
            await query(
                'INSERT INTO security_logs (id, user_id, event_type, ip_address, user_agent, metadata, created_at) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)',
                [id, userId, eventType, ipAddress, userAgent, JSON.stringify(metadata)]
            );

            // Also log to global audit log for admin visibility
            if (eventType === 'LOGIN_FAILED') {
                await auditLogService.log({
                    user_id: userId || undefined,
                    action_type: 'user.login_failed',
                    action_category: 'user',
                    description: `Failed login attempt: ${metadata.reason || 'unknown'}`,
                    ip_address: ipAddress,
                    user_agent: userAgent,
                    status: 'failed',
                    metadata
                });
            }
        } catch (error: any) {
            logger.error('Failed to log security event', { error: error.message });
        }
    }

    /**
     * Send Alert via Telegram
     */
    async sendTelegramAlert(userId: string | null, message: string) {
        try {
            // Priority 1: Fetch from database (System Settings)
            // Priority 2: Fallback to environment variables
            let botToken = await systemSettingsService.get('telegram', 'bot_token');
            if (!botToken) botToken = process.env.TELEGRAM_BOT_TOKEN;

            if (!botToken) {
                logger.warn('Telegram Bot Token not configured (Settings or ENV)');
                return;
            }

            let chatId = await systemSettingsService.get('telegram', 'admin_chat_id');
            if (!chatId) chatId = process.env.ADMIN_TELEGRAM_CHAT_ID;

            // If no global admin ID, check user-specific ID
            if (!chatId && userId) {
                const userResult = await query('SELECT telegram_chat_id FROM users WHERE id = ?', [userId]);
                chatId = userResult.rows[0]?.telegram_chat_id;

                if (chatId) {
                    logger.debug('Using User-specific Chat ID', { chatId });
                }
            }

            // Last resort: find ANY admin/owner with a telegram_chat_id
            if (!chatId) {
                const adminResult = await query(
                    "SELECT telegram_chat_id FROM users WHERE role IN ('OWNER', 'ADMIN') AND telegram_chat_id IS NOT NULL AND telegram_chat_id != '' LIMIT 1"
                );
                chatId = adminResult.rows[0]?.telegram_chat_id;

                if (chatId) {
                    logger.debug('Using Admin/Owner fallback Chat ID', { chatId });
                }
            }

            if (!chatId) {
                logger.warn('Skipping Telegram alert: No Telegram Chat ID found anywhere', { userId });
                return;
            }

            // Check if alerts are enabled
            const enabled = await systemSettingsService.get('telegram', 'enable_alerts', true);
            if (!enabled) {
                logger.debug('Telegram alerts are disabled in settings');
                return;
            }

            logger.debug('Attempting to send Telegram alert', { chatId });

            const escapeHTML = (str: string) => str.replace(/[&<>"']/g, (m) => ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;'
            }[m] || m));

            await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                chat_id: chatId,
                text: message,
                parse_mode: 'HTML'
            });

            logger.info('Security alert sent via Telegram', { userId, chatId });
        } catch (error: any) {
            logger.error('Failed to send Telegram alert', { error: error.message });
        }
    }

    /**
     * Verify Cloudflare Turnstile Token (Placeholder)
     */
    async verifyTurnstile(token: string): Promise<boolean> {
        if (!token) return false;

        // In local development or if keys are placeholders, allow
        if (process.env.CF_TURNSTILE_SECRET_KEY === 'placeholder_secret') {
            logger.debug('Skipping Turnstile verification (placeholder key)');
            return true;
        }

        try {
            const response = await axios.post('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
                secret: process.env.CF_TURNSTILE_SECRET_KEY,
                response: token,
            });

            return response.data.success;
        } catch (error: any) {
            logger.error('Turnstile verification failed', { error: error.message });
            return false;
        }
    }
}

export default SecurityService.getInstance();
