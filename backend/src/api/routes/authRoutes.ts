/**
 * Auth Routes
 */

import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../../database/connection';
import { generateToken } from '../middleware/auth';
import { logger } from '../../utils/logger';

const router = Router();

/**
 * POST /api/auth/login
 */
router.post('/login', async (req, res) => {
    logger.info('Login attempt', { email: req.body.email });
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                error: 'Email and password are required',
            });
        }

        // Normal database authentication
        try {
            logger.debug('Database query for user', { email });
            const result = await query(
                "SELECT * FROM users WHERE email = ? AND status = 'active'",
                [email]
            );

            const user = result.rows[0];

            if (!user) {
                logger.warn('User login failed: Not found or inactive', { email });
                return res.status(401).json({
                    success: false,
                    error: 'Invalid credentials',
                });
            }

            logger.debug('Checking password hash');
            const validPassword = await bcrypt.compare(password, user.password_hash);

            if (!validPassword) {
                logger.warn('User login failed: Password mismatch', { email });
                return res.status(401).json({
                    success: false,
                    error: 'Invalid credentials',
                });
            }

            logger.debug('Updating last login time');
            // Compatibility: SQLite uses datetime('now'), Postgres uses CURRENT_TIMESTAMP
            // However, our query helper handles some transformations. Let's use a standard one.
            try {
                await query("UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?", [user.id]);
            } catch (err) {
                logger.error('Failed to update last_login_at', { error: err.message });
            }

            logger.debug('Generating JWT token');
            const permissions = typeof user.permissions === 'string'
                ? JSON.parse(user.permissions || '{}')
                : (user.permissions || {});

            const token = generateToken({
                id: user.id,
                tenant_id: user.tenant_id,
                email: user.email,
                role: user.role,
                permissions
            });

            logger.info('Login successful', { email: user.email, id: user.id });

            return res.json({
                success: true,
                data: {
                    token,
                    user: {
                        id: user.id,
                        email: user.email,
                        name: user.name,
                        role: user.role,
                        tenant_id: user.tenant_id,
                        permissions
                    },
                },
            });

        } catch (dbError: any) {
            logger.error('Database error during login', { error: dbError.message });
            return res.status(500).json({
                success: false,
                error: 'Database error',
            });
        }
    } catch (error: any) {
        logger.error('Login route error', { error: error.message });
        res.status(500).json({
            success: false,
            error: 'Internal server error',
        });
    }
});

/**
 * POST /api/auth/register
 */
router.post('/register', async (req, res) => {
    try {
        const { email, password, name, tenant_name, inviteToken } = req.body;

        if (!email || !password || !name) {
            return res.status(400).json({
                success: false,
                error: 'Email, password, and name are required',
            });
        }

        // Check if user exists
        const existingUser = await query('SELECT * FROM users WHERE email = ?', [email]);
        if (existingUser.rows.length > 0) {
            return res.status(400).json({
                success: false,
                error: 'Email already registered',
            });
        }

        // Create tenant first
        const tenantId = require('uuid').v4();
        await query(
            'INSERT INTO tenants (id, name, slug) VALUES (?, ?, ?)',
            [tenantId, tenant_name || `${name}'s Workspace`, email.split('@')[0]]
        );

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        // Create user
        const userId = require('uuid').v4();
        await query(
            'INSERT INTO users (id, tenant_id, email, password_hash, name, role) VALUES (?, ?, ?, ?, ?, ?)',
            [userId, tenantId, email, passwordHash, name, 'OWNER']
        );

        // Accept invite if token provided
        if (inviteToken) {
            try {
                const userInviteService = (await import('../../services/userInviteService')).default;
                await userInviteService.acceptInvite(inviteToken, userId);
                logger.info('Invite accepted during registration', { userId, email });
            } catch (inviteError: any) {
                logger.error('Failed to accept invite during registration', {
                    error: inviteError.message,
                    userId,
                    email
                });
                // Don't fail registration if invite acceptance fails
            }
        }

        res.json({
            success: true,
            message: 'User registered successfully',
        });
    } catch (error: any) {
        logger.error('Registration error', { error: error.message });
        res.status(500).json({
            success: false,
            error: 'Registration failed',
        });
    }
});

export default router;
