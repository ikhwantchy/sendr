import { Request, Response } from 'express';
import userInviteService from '../../services/userInviteService';
import emailService from '../../services/emailService';

/**
 * Invites Controller
 * Manages user invitation system
 */

/**
 * GET /api/admin/invites
 * Get all invites with filters
 */
export const getInvites = async (req: Request, res: Response) => {
    try {
        const { status, limit, offset } = req.query;

        const filters: any = {};
        if (status) filters.status = status as string;
        if (limit) filters.limit = parseInt(limit as string);
        if (offset) filters.offset = parseInt(offset as string);

        const { invites, total } = await userInviteService.getInvites(filters);

        res.json({
            success: true,
            invites,
            total,
            pagination: {
                limit: filters.limit || 50,
                offset: filters.offset || 0
            }
        });
    } catch (error: any) {
        console.error('[Invites] Get invites error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch invites',
            error: error.message
        });
    }
};

/**
 * POST /api/admin/invites
 * Create a new invite and send email
 */
export const createInvite = async (req: Request, res: Response) => {
    try {
        const { email, role = 'user' } = req.body;
        const invitedBy = req.user!.id;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Email is required'
            });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid email format'
            });
        }

        // Create invite
        const { invite_id, token } = await userInviteService.createInvite(email, role, invitedBy);

        // Send invite email
        try {
            await emailService.sendInviteEmail(email, token, req.user!.name || req.user!.email);
        } catch (emailError) {
            console.error('[Invites] Failed to send email:', emailError);
            // Don't fail the request if email fails
        }

        res.json({
            success: true,
            message: 'Invite created and email sent',
            invite_id
        });
    } catch (error: any) {
        console.error('[Invites] Create invite error:', error);
        res.status(400).json({
            success: false,
            message: error.message || 'Failed to create invite'
        });
    }
};

/**
 * POST /api/admin/invites/:id/resend
 * Resend an invite email
 */
export const resendInvite = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const resentBy = req.user!.id;

        // Get new token
        const newToken = await userInviteService.resendInvite(id, resentBy);

        // Get invite details
        const invite = await userInviteService.getInviteById(id);

        if (!invite) {
            return res.status(404).json({
                success: false,
                message: 'Invite not found'
            });
        }

        // Send email
        try {
            await emailService.sendInviteEmail(invite.email, newToken, req.user!.name || req.user!.email);
        } catch (emailError) {
            console.error('[Invites] Failed to send email:', emailError);
        }

        res.json({
            success: true,
            message: 'Invite resent successfully'
        });
    } catch (error: any) {
        console.error('[Invites] Resend invite error:', error);
        res.status(400).json({
            success: false,
            message: error.message || 'Failed to resend invite'
        });
    }
};

/**
 * POST /api/admin/invites/:id/revoke
 * Revoke an invite
 */
export const revokeInvite = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const revokedBy = req.user!.id;

        await userInviteService.revokeInvite(id, revokedBy);

        res.json({
            success: true,
            message: 'Invite revoked successfully'
        });
    } catch (error: any) {
        console.error('[Invites] Revoke invite error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to revoke invite',
            error: error.message
        });
    }
};

/**
 * DELETE /api/admin/invites/:id
 * Delete an invite
 */
export const deleteInvite = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const deletedBy = req.user!.id;

        await userInviteService.deleteInvite(id, deletedBy);

        res.json({
            success: true,
            message: 'Invite deleted successfully'
        });
    } catch (error: any) {
        console.error('[Invites] Delete invite error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete invite',
            error: error.message
        });
    }
};

/**
 * GET /api/admin/invites/stats
 * Get invite statistics
 */
export const getInviteStats = async (req: Request, res: Response) => {
    try {
        const stats = await userInviteService.getInviteStats();

        res.json({
            success: true,
            stats
        });
    } catch (error: any) {
        console.error('[Invites] Get stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch invite stats',
            error: error.message
        });
    }
};

/**
 * POST /api/invites/validate
 * Validate an invite token (public endpoint)
 */
export const validateInviteToken = async (req: Request, res: Response) => {
    try {
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({
                success: false,
                message: 'Token is required'
            });
        }

        const validation = await userInviteService.validateToken(token);

        if (!validation.valid) {
            return res.status(400).json({
                success: false,
                message: validation.error
            });
        }

        res.json({
            success: true,
            invite: {
                email: validation.invite!.email,
                role: validation.invite!.role
            }
        });
    } catch (error: any) {
        console.error('[Invites] Validate token error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to validate token',
            error: error.message
        });
    }
};
