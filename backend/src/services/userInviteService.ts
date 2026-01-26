import crypto from 'crypto';
import { query } from '../database/connection-sqlite';
import auditLogService from './auditLogService';
import systemSettingsService from './systemSettingsService';

/**
 * User Invite Service
 * Manages user invitation system for invite-only platform
 */

export interface UserInvite {
    id?: string;
    email: string;
    token?: string;
    role: string;
    invited_by: string;
    status?: 'pending' | 'accepted' | 'expired' | 'revoked';
    expires_at?: Date;
    accepted_at?: Date;
    created_at?: Date;
}

class UserInviteService {
    /**
     * Create a new user invite
     */
    async createInvite(email: string, role: string, invitedBy: string): Promise<{ invite_id: string; token: string }> {
        // Check if user already exists
        const existingUser = await query(
            `SELECT id FROM users WHERE email = $1`,
            [email]
        );

        if (existingUser.rows.length > 0) {
            throw new Error('User with this email already exists');
        }

        // Check if there's a pending invite
        const existingInvite = await query(
            `SELECT id FROM user_invites WHERE email = $1 AND status = 'pending'`,
            [email]
        );

        if (existingInvite.rows.length > 0) {
            throw new Error('Pending invite already exists for this email');
        }

        // Generate secure token
        const token = this.generateToken();

        // Get expiry days from settings
        const expiryDays = await systemSettingsService.getInviteExpiryDays();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + expiryDays);

        // Create invite
        const result = await query(
            `INSERT INTO user_invites (email, token, role, invited_by, expires_at, status)
             VALUES ($1, $2, $3, $4, $5, 'pending')
             RETURNING id`,
            [email, token, role, invitedBy, expiresAt]
        );

        const inviteId = result.rows[0].id;

        // Log invite creation
        await auditLogService.log({
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
    async validateToken(token: string): Promise<{ valid: boolean; invite?: UserInvite; error?: string }> {
        const result = await query(
            `SELECT * FROM user_invites WHERE token = $1`,
            [token]
        );

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
    async acceptInvite(token: string, userId: string): Promise<void> {
        const validation = await this.validateToken(token);

        if (!validation.valid || !validation.invite) {
            throw new Error(validation.error || 'Invalid invite');
        }

        // Mark invite as accepted
        await query(
            `UPDATE user_invites 
             SET status = 'accepted', accepted_at = NOW(), updated_at = NOW()
             WHERE id = $1`,
            [validation.invite.id]
        );

        // Update user with invite info
        await query(
            `UPDATE users 
             SET invited_by = $1, invite_accepted_at = NOW()
             WHERE id = $2`,
            [validation.invite.invited_by, userId]
        );

        // Log acceptance
        await auditLogService.log({
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
    async revokeInvite(inviteId: string, revokedBy: string): Promise<void> {
        await query(
            `UPDATE user_invites 
             SET status = 'revoked', updated_at = NOW()
             WHERE id = $1 AND status = 'pending'`,
            [inviteId]
        );

        // Log revocation
        await auditLogService.log({
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
    async deleteInvite(inviteId: string, deletedBy: string): Promise<void> {
        const result = await query(
            `SELECT email FROM user_invites WHERE id = $1`,
            [inviteId]
        );

        const email = result.rows[0]?.email || 'Unknown';

        await query(`DELETE FROM user_invites WHERE id = $1`, [inviteId]);

        // Log deletion
        await auditLogService.log({
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
    async getInvites(filters: {
        status?: string;
        invited_by?: string;
        limit?: number;
        offset?: number;
    } = {}): Promise<{ invites: any[]; total: number }> {
        const conditions: string[] = [];
        const params: any[] = [];
        let paramIndex = 1;

        if (filters.status) {
            conditions.push(`status = $${paramIndex++}`);
            params.push(filters.status);
        }

        if (filters.invited_by) {
            conditions.push(`invited_by = $${paramIndex++}`);
            params.push(filters.invited_by);
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        // Get total count
        const countResult = await query(
            `SELECT COUNT(*) as total FROM user_invites ${whereClause}`,
            params
        );
        const total = parseInt(countResult.rows[0].total);

        // Get invites
        const limit = filters.limit || 50;
        const offset = filters.offset || 0;

        const result = await query(
            `SELECT 
                ui.*,
                u.email as inviter_email,
                u.name as inviter_name
             FROM user_invites ui
             LEFT JOIN users u ON ui.invited_by = u.id
             ${whereClause}
             ORDER BY ui.created_at DESC
             LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
            [...params, limit, offset]
        );

        return {
            invites: result.rows,
            total
        };
    }

    /**
     * Get invite by ID
     */
    async getInviteById(inviteId: string): Promise<UserInvite | null> {
        const result = await query(
            `SELECT * FROM user_invites WHERE id = $1`,
            [inviteId]
        );

        return result.rows[0] || null;
    }

    /**
     * Expire old invites (called by cron job)
     */
    async expireOldInvites(): Promise<number> {
        const result = await query(
            `UPDATE user_invites 
             SET status = 'expired', updated_at = NOW()
             WHERE status = 'pending' AND expires_at < NOW()
             RETURNING id`
        );

        const expiredCount = result.rows.length;

        if (expiredCount > 0) {
            console.log(`[Invites] Expired ${expiredCount} old invites`);
        }

        return expiredCount;
    }

    /**
     * Manually expire an invite
     */
    private async expireInvite(inviteId: string): Promise<void> {
        await query(
            `UPDATE user_invites 
             SET status = 'expired', updated_at = NOW()
             WHERE id = $1`,
            [inviteId]
        );
    }

    /**
     * Resend invite (generate new token)
     */
    async resendInvite(inviteId: string, resentBy: string): Promise<string> {
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
        const expiryDays = await systemSettingsService.getInviteExpiryDays();
        const newExpiresAt = new Date();
        newExpiresAt.setDate(newExpiresAt.getDate() + expiryDays);

        await query(
            `UPDATE user_invites 
             SET token = $1, expires_at = $2, updated_at = NOW()
             WHERE id = $3`,
            [newToken, newExpiresAt, inviteId]
        );

        // Log resend
        await auditLogService.log({
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
    private generateToken(): string {
        return crypto.randomBytes(32).toString('hex');
    }

    /**
     * Get invite statistics
     */
    async getInviteStats(): Promise<any> {
        const result = await query(
            `SELECT 
                status,
                COUNT(*) as count
             FROM user_invites
             GROUP BY status`
        );

        const stats: any = {
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

export default new UserInviteService();
