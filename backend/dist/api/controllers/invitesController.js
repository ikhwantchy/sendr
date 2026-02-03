"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateInviteToken = exports.getInviteStats = exports.deleteInvite = exports.revokeInvite = exports.resendInvite = exports.createInvite = exports.getInvites = void 0;
const userInviteService_1 = __importDefault(require("../../services/userInviteService"));
const emailService_1 = __importDefault(require("../../services/emailService"));
/**
 * Invites Controller
 * Manages user invitation system
 */
/**
 * GET /api/admin/invites
 * Get all invites with filters
 */
const getInvites = async (req, res) => {
    try {
        const { status, limit, offset } = req.query;
        const filters = {};
        if (status)
            filters.status = status;
        if (limit)
            filters.limit = parseInt(limit);
        if (offset)
            filters.offset = parseInt(offset);
        const { invites, total } = await userInviteService_1.default.getInvites(filters);
        res.json({
            success: true,
            invites,
            total,
            pagination: {
                limit: filters.limit || 50,
                offset: filters.offset || 0
            }
        });
    }
    catch (error) {
        console.error('[Invites] Get invites error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch invites',
            error: error.message
        });
    }
};
exports.getInvites = getInvites;
/**
 * POST /api/admin/invites
 * Create a new invite and send email
 */
const createInvite = async (req, res) => {
    try {
        const { email, role = 'user' } = req.body;
        const invitedBy = req.user.id;
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
        const { invite_id, token } = await userInviteService_1.default.createInvite(email, role, invitedBy);
        // Send invite email
        try {
            await emailService_1.default.sendInviteEmail(email, token, req.user.name || req.user.email);
        }
        catch (emailError) {
            console.error('[Invites] Failed to send email:', emailError);
            // Don't fail the request if email fails
        }
        res.json({
            success: true,
            message: 'Invite created and email sent',
            invite_id
        });
    }
    catch (error) {
        console.error('[Invites] Create invite error:', error);
        res.status(400).json({
            success: false,
            message: error.message || 'Failed to create invite'
        });
    }
};
exports.createInvite = createInvite;
/**
 * POST /api/admin/invites/:id/resend
 * Resend an invite email
 */
const resendInvite = async (req, res) => {
    try {
        const { id } = req.params;
        const resentBy = req.user.id;
        // Get new token
        const newToken = await userInviteService_1.default.resendInvite(id, resentBy);
        // Get invite details
        const invite = await userInviteService_1.default.getInviteById(id);
        if (!invite) {
            return res.status(404).json({
                success: false,
                message: 'Invite not found'
            });
        }
        // Send email
        try {
            await emailService_1.default.sendInviteEmail(invite.email, newToken, req.user.name || req.user.email);
        }
        catch (emailError) {
            console.error('[Invites] Failed to send email:', emailError);
        }
        res.json({
            success: true,
            message: 'Invite resent successfully'
        });
    }
    catch (error) {
        console.error('[Invites] Resend invite error:', error);
        res.status(400).json({
            success: false,
            message: error.message || 'Failed to resend invite'
        });
    }
};
exports.resendInvite = resendInvite;
/**
 * POST /api/admin/invites/:id/revoke
 * Revoke an invite
 */
const revokeInvite = async (req, res) => {
    try {
        const { id } = req.params;
        const revokedBy = req.user.id;
        await userInviteService_1.default.revokeInvite(id, revokedBy);
        res.json({
            success: true,
            message: 'Invite revoked successfully'
        });
    }
    catch (error) {
        console.error('[Invites] Revoke invite error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to revoke invite',
            error: error.message
        });
    }
};
exports.revokeInvite = revokeInvite;
/**
 * DELETE /api/admin/invites/:id
 * Delete an invite
 */
const deleteInvite = async (req, res) => {
    try {
        const { id } = req.params;
        const deletedBy = req.user.id;
        await userInviteService_1.default.deleteInvite(id, deletedBy);
        res.json({
            success: true,
            message: 'Invite deleted successfully'
        });
    }
    catch (error) {
        console.error('[Invites] Delete invite error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete invite',
            error: error.message
        });
    }
};
exports.deleteInvite = deleteInvite;
/**
 * GET /api/admin/invites/stats
 * Get invite statistics
 */
const getInviteStats = async (req, res) => {
    try {
        const stats = await userInviteService_1.default.getInviteStats();
        res.json({
            success: true,
            stats
        });
    }
    catch (error) {
        console.error('[Invites] Get stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch invite stats',
            error: error.message
        });
    }
};
exports.getInviteStats = getInviteStats;
/**
 * POST /api/invites/validate
 * Validate an invite token (public endpoint)
 */
const validateInviteToken = async (req, res) => {
    try {
        const { token } = req.body;
        if (!token) {
            return res.status(400).json({
                success: false,
                message: 'Token is required'
            });
        }
        const validation = await userInviteService_1.default.validateToken(token);
        if (!validation.valid) {
            return res.status(400).json({
                success: false,
                message: validation.error
            });
        }
        res.json({
            success: true,
            invite: {
                email: validation.invite.email,
                role: validation.invite.role
            }
        });
    }
    catch (error) {
        console.error('[Invites] Validate token error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to validate token',
            error: error.message
        });
    }
};
exports.validateInviteToken = validateInviteToken;
//# sourceMappingURL=invitesController.js.map