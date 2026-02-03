"use strict";
/**
 * Security Service
 * Handles session management, security logging, 2FA, and Telegram alerts.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SecurityService = void 0;
const uuid_1 = require("uuid");
const connection_1 = require("../database/connection");
const logger_1 = require("../utils/logger");
const axios_1 = __importDefault(require("axios"));
const crypto_1 = __importDefault(require("crypto"));
const auditLogService_1 = __importDefault(require("./auditLogService"));
const systemSettingsService_1 = __importDefault(require("./systemSettingsService"));
class SecurityService {
    static instance;
    constructor() { }
    static getInstance() {
        if (!SecurityService.instance) {
            SecurityService.instance = new SecurityService();
        }
        return SecurityService.instance;
    }
    /**
     * Hash a token for storage
     */
    hashToken(token) {
        return crypto_1.default.createHash('sha256').update(token).digest('hex');
    }
    /**
     * Create a new session
     */
    async createSession(userId, token, ipAddress, userAgent) {
        try {
            const id = (0, uuid_1.v4)();
            const tokenHash = this.hashToken(token);
            await (0, connection_1.query)('INSERT INTO user_sessions (id, user_id, token_hash, ip_address, user_agent, last_active, is_revoked) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, 0)', [id, userId, tokenHash, ipAddress, userAgent]);
            await this.logEvent(userId, 'LOGIN_SUCCESS', ipAddress, userAgent);
            // Global Audit Log
            try {
                const userResult = await (0, connection_1.query)('SELECT tenant_id FROM users WHERE id = ?', [userId]);
                const tenantId = userResult.rows[0]?.tenant_id;
                await auditLogService_1.default.logUserLogin(userId, tenantId, ipAddress, userAgent);
            }
            catch (err) {
                logger_1.logger.error('Failed to log login in global audit log', { error: err.message });
            }
            // Send Alert
            const userDetails = await (0, connection_1.query)('SELECT name, email FROM users WHERE id = ?', [userId]);
            const userName = userDetails.rows[0]?.name || 'Unknown User';
            const userEmail = userDetails.rows[0]?.email || '';
            const safeIP = ipAddress || 'Unknown';
            const safeUA = userAgent || 'Unknown';
            await this.sendTelegramAlert(userId, `<b>🔔 Login Alert</b>\n\n` +
                `👤 <b>User:</b> ${userName} (${userEmail})\n` +
                `🌐 <b>IP:</b> <code>${safeIP}</code>\n` +
                `📱 <b>Device:</b> <i>${safeUA}</i>`);
            return id;
        }
        catch (error) {
            logger_1.logger.error('Failed to create session', { error: error.message });
            throw error;
        }
    }
    /**
     * Validate a session token
     */
    async validateSession(token) {
        try {
            const tokenHash = this.hashToken(token);
            const result = await (0, connection_1.query)('SELECT * FROM user_sessions WHERE token_hash = ? AND is_revoked = 0', [tokenHash]);
            if (result.rows.length === 0)
                return false;
            // Update last active
            await (0, connection_1.query)('UPDATE user_sessions SET last_active = CURRENT_TIMESTAMP WHERE token_hash = ?', [tokenHash]);
            return true;
        }
        catch (error) {
            logger_1.logger.error('Session validation error', { error: error.message });
            return false;
        }
    }
    /**
     * Revoke a session
     */
    async revokeSession(sessionId) {
        await (0, connection_1.query)('UPDATE user_sessions SET is_revoked = 1 WHERE id = ?', [sessionId]);
    }
    /**
     * Revoke all user sessions except current
     */
    async revokeAllOtherSessions(userId, currentTokenHash) {
        await (0, connection_1.query)('UPDATE user_sessions SET is_revoked = 1 WHERE user_id = ? AND token_hash != ?', [userId, currentTokenHash]);
    }
    /**
     * Get active sessions for a user
     */
    async getActiveSessions(userId) {
        const result = await (0, connection_1.query)('SELECT id, ip_address, user_agent, last_active FROM user_sessions WHERE user_id = ? AND is_revoked = 0 ORDER BY last_active DESC', [userId]);
        return result.rows;
    }
    /**
     * Log a security event
     */
    async logEvent(userId, eventType, ipAddress, userAgent, metadata = {}) {
        try {
            const id = (0, uuid_1.v4)();
            await (0, connection_1.query)('INSERT INTO security_logs (id, user_id, event_type, ip_address, user_agent, metadata, created_at) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)', [id, userId, eventType, ipAddress, userAgent, JSON.stringify(metadata)]);
            // Also log to global audit log for admin visibility
            if (eventType === 'LOGIN_FAILED') {
                await auditLogService_1.default.log({
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
        }
        catch (error) {
            logger_1.logger.error('Failed to log security event', { error: error.message });
        }
    }
    /**
     * Send Alert via Telegram
     */
    async sendTelegramAlert(userId, message) {
        try {
            // Priority 1: Fetch from database (System Settings)
            // Priority 2: Fallback to environment variables
            let botToken = await systemSettingsService_1.default.get('telegram', 'bot_token');
            if (!botToken)
                botToken = process.env.TELEGRAM_BOT_TOKEN;
            if (!botToken) {
                logger_1.logger.warn('Telegram Bot Token not configured (Settings or ENV)');
                return;
            }
            let chatId = await systemSettingsService_1.default.get('telegram', 'admin_chat_id');
            if (!chatId)
                chatId = process.env.ADMIN_TELEGRAM_CHAT_ID;
            // If no global admin ID, check user-specific ID
            if (!chatId && userId) {
                const userResult = await (0, connection_1.query)('SELECT telegram_chat_id FROM users WHERE id = ?', [userId]);
                chatId = userResult.rows[0]?.telegram_chat_id;
                if (chatId) {
                    logger_1.logger.debug('Using User-specific Chat ID', { chatId });
                }
            }
            if (!chatId) {
                logger_1.logger.warn('Skipping Telegram alert: No Telegram Chat ID found (Admin or User)', { userId });
                return;
            }
            // Check if alerts are enabled
            const enabled = await systemSettingsService_1.default.get('telegram', 'enable_alerts', true);
            if (!enabled) {
                logger_1.logger.debug('Telegram alerts are disabled in settings');
                return;
            }
            logger_1.logger.debug('Attempting to send Telegram alert', { chatId });
            const escapeHTML = (str) => str.replace(/[&<>"']/g, (m) => ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;'
            }[m] || m));
            await axios_1.default.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                chat_id: chatId,
                text: message,
                parse_mode: 'HTML'
            });
            logger_1.logger.info('Security alert sent via Telegram', { userId, chatId });
        }
        catch (error) {
            logger_1.logger.error('Failed to send Telegram alert', { error: error.message });
        }
    }
    /**
     * Verify Cloudflare Turnstile Token (Placeholder)
     */
    async verifyTurnstile(token) {
        if (!token)
            return false;
        // In local development or if keys are placeholders, allow
        if (process.env.CF_TURNSTILE_SECRET_KEY === 'placeholder_secret') {
            logger_1.logger.debug('Skipping Turnstile verification (placeholder key)');
            return true;
        }
        try {
            const response = await axios_1.default.post('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
                secret: process.env.CF_TURNSTILE_SECRET_KEY,
                response: token,
            });
            return response.data.success;
        }
        catch (error) {
            logger_1.logger.error('Turnstile verification failed', { error: error.message });
            return false;
        }
    }
}
exports.SecurityService = SecurityService;
exports.default = SecurityService.getInstance();
//# sourceMappingURL=securityService.js.map