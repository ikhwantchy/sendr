"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const crypto_1 = __importDefault(require("crypto"));
const connection_sqlite_1 = require("../database/connection-sqlite");
const auditLogService_1 = __importDefault(require("./auditLogService"));
const systemSettingsService_1 = __importDefault(require("./systemSettingsService"));
class UserInviteService {
    /**
     * Create a new user invite
     */
    async createInvite(email, role, invitedBy) {
        // Check if user already exists
        const existingUser = await (0, connection_sqlite_1.query)(`SELECT id FROM users WHERE email = ?`, [email]);
        if (existingUser.rows.length > 0) {
            throw new Error('User with this email already exists');
        }
        // Check if there's a pending invite
        const existingInvite = await (0, connection_sqlite_1.query)(`SELECT id FROM user_invites WHERE email = ? AND status = 'pending'`, [email]);
        if (existingInvite.rows.length > 0) {
            throw new Error('Pending invite already exists for this email');
        }
        // Generate secure token
        const token = this.generateToken();
        // Get expiry days from settings
        const expiryDays = await systemSettingsService_1.default.getInviteExpiryDays();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + expiryDays);
        // Generate ID
        const inviteId = crypto_1.default.randomUUID();
        // Create invite
        await (0, connection_sqlite_1.query)(`INSERT INTO user_invites (id, email, token, role, invited_by, expires_at, status)
             VALUES (?, ?, ?, ?, ?, ?, 'pending')`, [inviteId, email, token, role, invitedBy, expiresAt.toISOString()]);
        // Log invite creation
        await auditLogService_1.default.log({
            user_id: invitedBy,
            action_type: 'invite.create',
            action_category: 'user',
            resource_type: 'invite',
            resource_id: inviteId,
            description: `Invited user: ${email} as ${role}`,
            metadata: { email, role },
            status: 'success'
        });
        return { invite_id: inviteId, token };
    }
    /**
     * Validate an invite token
     */
    async validateToken(token) {
        const result = await (0, connection_sqlite_1.query)(`SELECT * FROM user_invites WHERE token = ?`, [token]);
        if (result.rows.length === 0) {
            return { valid: false, error: 'Invalid invite token' };
        }
        const invite = result.rows[0];
        // Check status
        if (invite.status !== 'pending') {
            return { valid: false, error: `Invite is ${invite.status}` };
        }
        // Check expiration
        if (new Date(invite.expires_at) < new Date()) {
            // Auto-expire
            await this.expireInvite(invite.id);
            return { valid: false, error: 'Invite has expired' };
        }
        return { valid: true, invite };
    }
    /**
     * Accept an invite (called during signup)
     */
    async acceptInvite(token, userId) {
        const validation = await this.validateToken(token);
        if (!validation.valid || !validation.invite) {
            throw new Error(validation.error || 'Invalid invite');
        }
        // Mark invite as accepted
        await (0, connection_sqlite_1.query)(`UPDATE user_invites 
             SET status = 'accepted', accepted_at = datetime('now'), updated_at = datetime('now')
             WHERE id = ?`, [validation.invite.id]);
        // Update user with invite info
        await (0, connection_sqlite_1.query)(`UPDATE users 
             SET invited_by = ?, invite_accepted_at = datetime('now')
             WHERE id = ?`, [validation.invite.invited_by, userId]);
        // Log acceptance
        await auditLogService_1.default.log({
            user_id: userId,
            action_type: 'invite.accept',
            action_category: 'user',
            resource_type: 'invite',
            resource_id: validation.invite.id,
            description: `Accepted invite`,
            status: 'success'
        });
    }
    /**
     * Revoke an invite
     */
    async revokeInvite(inviteId, revokedBy) {
        await (0, connection_sqlite_1.query)(`UPDATE user_invites 
             SET status = 'revoked', updated_at = datetime('now')
             WHERE id = ? AND status = 'pending'`, [inviteId]);
        // Log revocation
        await auditLogService_1.default.log({
            user_id: revokedBy,
            action_type: 'invite.revoke',
            action_category: 'user',
            resource_type: 'invite',
            resource_id: inviteId,
            description: `Revoked invite`,
            status: 'success'
        });
    }
    /**
     * Delete an invite
     */
    async deleteInvite(inviteId, deletedBy) {
        const result = await (0, connection_sqlite_1.query)(`SELECT email FROM user_invites WHERE id = ?`, [inviteId]);
        const email = result.rows[0]?.email || 'Unknown';
        await (0, connection_sqlite_1.query)(`DELETE FROM user_invites WHERE id = ?`, [inviteId]);
        // Log deletion
        await auditLogService_1.default.log({
            user_id: deletedBy,
            action_type: 'invite.delete',
            action_category: 'user',
            resource_type: 'invite',
            resource_id: inviteId,
            description: `Deleted invite for ${email}`,
            status: 'success'
        });
    }
    /**
     * Get all invites (with filters)
     */
    async getInvites(filters = {}) {
        const conditions = [];
        const params = [];
        let paramIndex = 1;
        if (filters.status) {
            conditions.push(`status = ?`);
            params.push(filters.status);
        }
        if (filters.invited_by) {
            conditions.push(`invited_by = ?`);
            params.push(filters.invited_by);
        }
        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
        // Get total count
        const countResult = await (0, connection_sqlite_1.query)(`SELECT COUNT(*) as total FROM user_invites ${whereClause}`, params);
        const total = parseInt(countResult.rows[0].total);
        // Get invites
        const limit = filters.limit || 50;
        const offset = filters.offset || 0;
        const result = await (0, connection_sqlite_1.query)(`SELECT 
                ui.*,
                u.email as inviter_email,
                u.name as inviter_name
             FROM user_invites ui
             LEFT JOIN users u ON ui.invited_by = u.id
             ${whereClause}
             ORDER BY ui.created_at DESC
             LIMIT ? OFFSET ?`, [...params, limit, offset]);
        return {
            invites: result.rows,
            total
        };
    }
    /**
     * Get invite by ID
     */
    async getInviteById(inviteId) {
        const result = await (0, connection_sqlite_1.query)(`SELECT * FROM user_invites WHERE id = ?`, [inviteId]);
        return result.rows[0] || null;
    }
    /**
     * Expire old invites (called by cron job)
     */
    async expireOldInvites() {
        const result = await (0, connection_sqlite_1.query)(`UPDATE user_invites 
             SET status = 'expired', updated_at = datetime('now')
             WHERE status = 'pending' AND expires_at < datetime('now')`);
        const expiredCount = result.rows.length;
        if (expiredCount > 0) {
            console.log(`[Invites] Expired ${expiredCount} old invites`);
        }
        return expiredCount;
    }
    /**
     * Manually expire an invite
     */
    async expireInvite(inviteId) {
        await (0, connection_sqlite_1.query)(`UPDATE user_invites 
             SET status = 'expired', updated_at = datetime('now')
             WHERE id = ?`, [inviteId]);
    }
    /**
     * Resend invite (generate new token)
     */
    async resendInvite(inviteId, resentBy) {
        // Get invite
        const invite = await this.getInviteById(inviteId);
        if (!invite) {
            throw new Error('Invite not found');
        }
        if (invite.status !== 'pending') {
            throw new Error(`Cannot resend ${invite.status} invite`);
        }
        // Generate new token and extend expiry
        const newToken = this.generateToken();
        const expiryDays = await systemSettingsService_1.default.getInviteExpiryDays();
        const newExpiresAt = new Date();
        newExpiresAt.setDate(newExpiresAt.getDate() + expiryDays);
        await (0, connection_sqlite_1.query)(`UPDATE user_invites 
             SET token = ?, expires_at = ?, updated_at = datetime('now')
             WHERE id = ?`, [newToken, newExpiresAt.toISOString(), inviteId]);
        // Log resend
        await auditLogService_1.default.log({
            user_id: resentBy,
            action_type: 'invite.resend',
            action_category: 'user',
            resource_type: 'invite',
            resource_id: inviteId,
            description: `Resent invite to ${invite.email}`,
            status: 'success'
        });
        return newToken;
    }
    /**
     * Generate secure random token
     */
    generateToken() {
        return crypto_1.default.randomBytes(32).toString('hex');
    }
    /**
     * Get invite statistics
     */
    async getInviteStats() {
        const result = await (0, connection_sqlite_1.query)(`SELECT 
                status,
                COUNT(*) as count
             FROM user_invites
             GROUP BY status`);
        const stats = {
            pending: 0,
            accepted: 0,
            expired: 0,
            revoked: 0,
            total: 0
        };
        result.rows.forEach(row => {
            stats[row.status] = parseInt(row.count);
            stats.total += parseInt(row.count);
        });
        return stats;
    }
}
exports.default = new UserInviteService();
//# sourceMappingURL=userInviteService.js.map