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

        // DEVELOPMENT BYPASS - Strict check for admin credentials
        if (email === 'admin@example.com' && password === 'admin123') {
            logger.warn('Using development bypass mode');

            const mockUser = {
                id: '11111111-1111-1111-1111-111111111111',
                tenant_id: '11111111-1111-1111-1111-111111111111',
                email: 'admin@example.com',
                name: 'System Admin',
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
            // Using ? syntax which works for SQLite and is auto-converted to $n for Postgres
            const result = await query(
                "SELECT * FROM users WHERE email = ? AND status = 'active'",
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

            await query("UPDATE users SET last_login_at = datetime('now') WHERE id = ?", [user.id]);

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
            logger.error('Database login error', { error: dbError });
            return res.status(500).json({
                success: false,
                error: 'Database error during login',
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

        // Create tenant and user in transaction
        // Note: We need transaction support in connection wrapper to do this properly
        // For now, sequentially

        const tenantSlug = tenant_name.toLowerCase().replace(/\s+/g, '-');

        // Postgres uses RETURNING *, SQLite needs workaround usually but sql.js might return rows
        // We assume RETURNING Works or we fetch ID
        let tenantId = require('uuid').v4(); // Generate ID here to be safe across DBs

        // Using Postgres syntax for RETURNING which might fail on some SQLite versions
        // Better to separate logic or use a query builder. 
        // For now, simplified for SQLite local dev which usually doesn't need complex register logic

        // Simplified Register Logic (Mock-ish for safety)
        // If real implementation needed, we need conditional queries

        await query(
            'INSERT INTO tenants (id, name, slug, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
            [tenantId, tenant_name, tenantSlug, new Date(), new Date()]
        );

        let userId = require('uuid').v4();
        await query(
            `INSERT INTO users (id, tenant_id, email, password_hash, name, role, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [userId, tenantId, email, passwordHash, name, 'OWNER', new Date(), new Date()]
        );

        // Generate token
        const token = generateToken({
            id: userId,
            tenant_id: tenantId,
            email: email,
            role: 'OWNER',
        });

        res.status(201).json({
            success: true,
            data: {
                token,
                user: {
                    id: userId,
                    email: email,
                    name: name,
                    role: 'OWNER',
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
