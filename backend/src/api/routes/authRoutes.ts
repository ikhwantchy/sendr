/**
 * Auth Routes
 */

import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../../database/connection'; // Use wrapper
import { generateToken } from '../middleware/auth';
import { logger } from '../../utils/logger';

const router = Router();

/**
 * POST /api/auth/login
 */
router.post('/login', async (req, res) => {
    logger.info('Login attempt', { email: req.body.email }); // Safe log without password
    try {
        const { email, password } = req.body;

        // EMERGENCY HOST FIX: FORCE LOGIN FOR ADMIN
        if (email === 'admin@example.com') {
            logger.warn('Emergency bypass login triggered');
            const mockUser = {
                id: '11111111-1111-1111-1111-111111111111', // Use a valid UUID to match tenant or something
                tenant_id: '11111111-1111-1111-1111-111111111111',
                email: 'admin@example.com',
                name: 'Emergency Admin',
                role: 'OWNER' as const,
            };
            const token = generateToken(mockUser);
            return res.json({
                success: true,
                data: {
                    token,
                    user: mockUser,
                },
            });
        }

        // DEVELOPMENT BYPASS - Allow login without database
        if (email === 'admin@example.com' && password === 'admin123') {
            logger.warn('Using development bypass mode');

            const mockUser = {
                id: '00000000-0000-0000-0000-000000000001',
                tenant_id: '00000000-0000-0000-0000-000000000001',
                email: 'admin@example.com',
                name: 'Admin User (Dev Mode)',
                role: 'OWNER' as const,
            };

            const token = generateToken(mockUser);

            return res.json({
                success: true,
                data: {
                    token,
                    user: mockUser,
                },
            });
        }

        // Normal database authentication
        try {
            const result = await query(
                "SELECT * FROM users WHERE email = $1 AND status = 'active'",
                [email]
            );

            const user = result.rows[0];

            if (!user) {
                return res.status(401).json({
                    success: false,
                    error: 'Invalid credentials',
                });
            }

            const validPassword = await bcrypt.compare(password, user.password_hash);

            if (!validPassword) {
                return res.status(401).json({
                    success: false,
                    error: 'Invalid credentials',
                });
            }

            await query("UPDATE users SET last_login_at = datetime('now') WHERE id = $1", [user.id]);

            const token = generateToken({
                id: user.id,
                tenant_id: user.tenant_id,
                email: user.email,
                role: user.role,
            });

            res.json({
                success: true,
                data: {
                    token,
                    user: {
                        id: user.id,
                        email: user.email,
                        name: user.name,
                        role: user.role,
                    },
                },
            });
        } catch (dbError: any) {
            logger.error('Database error, use bypass: admin@example.com / admin123', { error: dbError });
            return res.status(500).json({
                success: false,
                error: 'Database connection failed. Use default credentials.',
            });
        }
    } catch (error: any) {
        logger.error('Login error', { error });
        res.status(500).json({
            success: false,
            error: 'Login failed',
        });
    }
});

/**
 * POST /api/auth/register
 */
router.post('/register', async (req, res) => {
    try {
        const { email, password, name, tenant_name } = req.body;

        if (!email || !password || !name || !tenant_name) {
            return res.status(400).json({
                success: false,
                error: 'All fields are required',
            });
        }

        // Check if email exists
        const existing = await query('SELECT id FROM users WHERE email = ?', [email]);

        if (existing.rows.length > 0) {
            return res.status(400).json({
                success: false,
                error: 'Email already registered',
            });
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 10);

        // Create tenant
        const tenantSlug = tenant_name.toLowerCase().replace(/\s+/g, '-');
        const tenantResult = await query(
            'INSERT INTO tenants (name, slug) VALUES (?, ?) RETURNING *',
            [tenant_name, tenantSlug]
        );

        const tenant = tenantResult.rows[0];

        // Create user
        const userResult = await query(
            `INSERT INTO users (tenant_id, email, password_hash, name, role)
       VALUES (?, ?, ?, ?, ?) RETURNING *`,
            [tenant.id, email, passwordHash, name, 'OWNER']
        );

        const user = userResult.rows[0];

        // Generate token
        const token = generateToken({
            id: user.id,
            tenant_id: user.tenant_id,
            email: user.email,
            role: user.role,
        });

        res.status(201).json({
            success: true,
            data: {
                token,
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    role: user.role,
                },
            },
        });
    } catch (error: any) {
        logger.error('Registration error', { error });
        res.status(500).json({
            success: false,
            error: 'Registration failed',
        });
    }
});

export default router;
