"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.acceptInvitation = exports.validateToken = void 0;
const connection_1 = require("../../database/connection");
const crypto_1 = __importDefault(require("crypto"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
/**
 * Validate invitation token
 * GET /api/invitations/validate/:token
 */
const validateToken = async (req, res) => {
    try {
        const { token } = req.params;
        const result = await (0, connection_1.query)(`SELECT * FROM user_invitations 
             WHERE token = ? AND status = 'pending' AND expires_at > CURRENT_TIMESTAMP`, [token]);
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Invalid or expired invitation'
            });
        }
        const invitation = result.rows[0];
        res.json({
            success: true,
            data: {
                email: invitation.email,
                role: invitation.role,
                expires_at: invitation.expires_at
            }
        });
    }
    catch (error) {
        console.error('Validate token error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to validate invitation'
        });
    }
};
exports.validateToken = validateToken;
/**
 * Accept invitation and create user
 * POST /api/invitations/accept
 */
const acceptInvitation = async (req, res) => {
    try {
        const { token, name, password } = req.body;
        if (!token || !name || !password) {
            return res.status(400).json({
                success: false,
                error: 'Token, name, and password are required'
            });
        }
        // Get invitation
        const invitationResult = await (0, connection_1.query)(`SELECT * FROM user_invitations 
             WHERE token = ? AND status = 'pending' AND expires_at > CURRENT_TIMESTAMP`, [token]);
        if (invitationResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Invalid or expired invitation'
            });
        }
        const invitation = invitationResult.rows[0];
        // Check if user already exists
        const existingUser = await (0, connection_1.query)('SELECT id FROM users WHERE email = ?', [invitation.email]);
        if (existingUser.rows.length > 0) {
            return res.status(400).json({
                success: false,
                error: 'User already exists'
            });
        }
        // Hash password
        const passwordHash = await bcryptjs_1.default.hash(password, 10);
        // Create user
        const userId = crypto_1.default.randomUUID();
        await (0, connection_1.query)(`INSERT INTO users (id, tenant_id, email, name, password_hash, role, status, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`, [userId, 'default-tenant', invitation.email, name, passwordHash, invitation.role]);
        // Mark invitation as accepted
        await (0, connection_1.query)(`UPDATE user_invitations 
             SET status = 'accepted', accepted_at = CURRENT_TIMESTAMP 
             WHERE id = ?`, [invitation.id]);
        res.json({
            success: true,
            message: 'Account created successfully! You can now login.',
            data: {
                email: invitation.email,
                name: name,
                role: invitation.role
            }
        });
    }
    catch (error) {
        console.error('Accept invitation error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to accept invitation'
        });
    }
};
exports.acceptInvitation = acceptInvitation;
//# sourceMappingURL=invitationsController.js.map