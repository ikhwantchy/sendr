/**
 * Authentication Middleware
 * JWT-based authentication with RBAC
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { logger } from '../../utils/logger';

const getJwtSecret = () => process.env.JWT_SECRET || 'your-secret-key';

export interface AuthUser {
    id: string;
    tenant_id: string;
    email: string;
    name?: string;
    role: 'OWNER' | 'OPERATOR' | 'VIEWER' | 'ADMIN' | 'USER';
    permissions?: any;
}

declare global {
    namespace Express {
        interface Request {
            user?: AuthUser;
        }
    }
}

/**
 * Authenticate JWT token
 */
export async function authenticate(req: Request, res: Response, next: NextFunction) {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                error: 'No token provided',
            });
        }

        const token = authHeader.substring(7);

        try {
            const decoded = jwt.verify(token, getJwtSecret()) as AuthUser;

            // Persistent Session Validation
            const securityService = (await import('../../services/securityService')).default;
            const isValid = await securityService.validateSession(token);

            if (!isValid) {
                logger.warn('Session revoked or not found', { userId: decoded.id });
                return res.status(401).json({
                    success: false,
                    error: 'Session expired or revoked',
                });
            }

            req.user = decoded;
            next();
        } catch (error: any) {
            logger.warn('Token validation failed', { error: error.message });
            return res.status(401).json({
                success: false,
                error: 'Invalid token',
            });
        }
    } catch (error: any) {
        logger.error('Authentication error', { error: error.message });
        return res.status(500).json({
            success: false,
            error: 'Authentication failed',
        });
    }
}

/**
 * Require specific roles
 */
export function requireRole(roles: string[]) {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'Not authenticated',
            });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                error: 'Insufficient permissions',
            });
        }

        next();
    };
}

/**
 * Generate JWT token
 */
export function generateToken(user: AuthUser): string {
    return jwt.sign(user, getJwtSecret(), {
        expiresIn: (process.env.JWT_EXPIRES_IN as any) || '7d',
    });
}
