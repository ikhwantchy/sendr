/**
 * Auth Routes
 */

import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../../database/connection';
import { generateToken, authenticate } from '../middleware/auth';
import { logger } from '../../utils/logger';
import securityService from '../../services/securityService';

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
            const { turnstileToken } = req.body;

            // Turnstile Verification
            const isHuman = await securityService.verifyTurnstile(turnstileToken);
            if (!isHuman && process.env.NODE_ENV === 'production' && process.env.CF_TURNSTILE_SECRET_KEY !== 'placeholder_secret') {
                return res.status(403).json({
                    success: false,
                    error: 'Security verification failed',
                });
            }

            logger.debug('Database query for user', { email });
            const result = await query(
                "SELECT * FROM users WHERE email = ? AND status = 'active'",
                [email]
            );

            const user = result.rows[0];

            if (!user) {
                await securityService.logEvent(null, 'LOGIN_FAILED', req.ip, req.get('user-agent'), { email, reason: 'user_not_found' });
                logger.warn('User login failed: Not found or inactive', { email });
                return res.status(401).json({
                    success: false,
                    error: 'Invalid credentials',
                });
            }

            logger.debug('Checking password hash');
            const validPassword = await bcrypt.compare(password, user.password_hash);

            if (!validPassword) {
                await securityService.logEvent(user.id, 'LOGIN_FAILED', req.ip, req.get('user-agent'), { email, reason: 'invalid_password' });
                logger.warn('User login failed: Password mismatch', { email });
                return res.status(401).json({
                    success: false,
                    error: 'Invalid credentials',
                });
            }

            // Check if 2FA is required
            if (user.two_factor_enabled && !req.body.twoFactorCode) {
                return res.json({
                    success: true,
                    requires2FA: true,
                    userId: user.id
                });
            }

            // If 2FA code is provided, verify it here (skipped for now, will implement in security dashboard first)

            logger.debug('Updating last login time');
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

            // Create Session Tracking
            await securityService.createSession(user.id, token, req.ip, req.get('user-agent'));

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
    return res.status(403).json({
        success: false,
        error: 'Registration is currently disabled.'
    });
});

/**
 * GET /api/auth/profile
 * Get current user profile and permissions
 */
router.get('/profile', authenticate, async (req, res) => {
    try {
        const userId = (req as any).user.id;
        const result = await query('SELECT id, email, name, role, tenant_id, permissions FROM users WHERE id = ?', [userId]);

        const user = result.rows[0];
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        const permissions = typeof user.permissions === 'string'
            ? JSON.parse(user.permissions || '{}')
            : (user.permissions || {});

        res.json({
            success: true,
            data: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                tenant_id: user.tenant_id,
                permissions
            }
        });
    } catch (error: any) {
        logger.error('Profile fetch error', { error: error.message });
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

export default router;
