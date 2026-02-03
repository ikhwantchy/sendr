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
declare class UserInviteService {
    /**
     * Create a new user invite
     */
    createInvite(email: string, role: string, invitedBy: string): Promise<{
        invite_id: string;
        token: string;
    }>;
    /**
     * Validate an invite token
     */
    validateToken(token: string): Promise<{
        valid: boolean;
        invite?: UserInvite;
        error?: string;
    }>;
    /**
     * Accept an invite (called during signup)
     */
    acceptInvite(token: string, userId: string): Promise<void>;
    /**
     * Revoke an invite
     */
    revokeInvite(inviteId: string, revokedBy: string): Promise<void>;
    /**
     * Delete an invite
     */
    deleteInvite(inviteId: string, deletedBy: string): Promise<void>;
    /**
     * Get all invites (with filters)
     */
    getInvites(filters?: {
        status?: string;
        invited_by?: string;
        limit?: number;
        offset?: number;
    }): Promise<{
        invites: any[];
        total: number;
    }>;
    /**
     * Get invite by ID
     */
    getInviteById(inviteId: string): Promise<UserInvite | null>;
    /**
     * Expire old invites (called by cron job)
     */
    expireOldInvites(): Promise<number>;
    /**
     * Manually expire an invite
     */
    private expireInvite;
    /**
     * Resend invite (generate new token)
     */
    resendInvite(inviteId: string, resentBy: string): Promise<string>;
    /**
     * Generate secure random token
     */
    private generateToken;
    /**
     * Get invite statistics
     */
    getInviteStats(): Promise<any>;
}
declare const _default: UserInviteService;
export default _default;
//# sourceMappingURL=userInviteService.d.ts.map