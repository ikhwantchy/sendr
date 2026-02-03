/**
 * Authentication Middleware
 * JWT-based authentication with RBAC
 */
import { Request, Response, NextFunction } from 'express';
export interface AuthUser {
    id: string;
    tenant_id: string;
    email: string;
    name?: string;
    role: 'OWNER' | 'OPERATOR' | 'VIEWER' | 'ADMIN' | 'USER' | 'API';
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
export declare function authenticate(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>>>;
/**
 * Require specific roles
 */
export declare function requireRole(roles: string[]): (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>>;
/**
 * Generate JWT token
 */
export declare function generateToken(user: AuthUser): string;
//# sourceMappingURL=auth.d.ts.map