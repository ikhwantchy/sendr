/**
 * Security Service
 * Handles session management, security logging, 2FA, and Telegram alerts.
 */
export declare class SecurityService {
    private static instance;
    private constructor();
    static getInstance(): SecurityService;
    /**
     * Hash a token for storage
     */
    private hashToken;
    /**
     * Create a new session
     */
    createSession(userId: string, token: string, ipAddress?: string, userAgent?: string): Promise<string>;
    /**
     * Validate a session token
     */
    validateSession(token: string): Promise<boolean>;
    /**
     * Revoke a session
     */
    revokeSession(sessionId: string): Promise<void>;
    /**
     * Revoke all user sessions except current
     */
    revokeAllOtherSessions(userId: string, currentTokenHash: string): Promise<void>;
    /**
     * Get active sessions for a user
     */
    getActiveSessions(userId: string): Promise<any>;
    /**
     * Log a security event
     */
    logEvent(userId: string | null, eventType: string, ipAddress?: string, userAgent?: string, metadata?: any): Promise<void>;
    /**
     * Send Alert via Telegram
     */
    sendTelegramAlert(userId: string | null, message: string): Promise<void>;
    /**
     * Verify Cloudflare Turnstile Token (Placeholder)
     */
    verifyTurnstile(token: string): Promise<boolean>;
}
declare const _default: SecurityService;
export default _default;
//# sourceMappingURL=securityService.d.ts.map