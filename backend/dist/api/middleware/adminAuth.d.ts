import { Request, Response, NextFunction } from 'express';
/**
 * Admin Authentication Middleware
 * Ensures only admin users can access certain routes
 */
/**
 * Require admin role
 */
export declare const requireAdmin: (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>>;
/**
 * Require admin or owner (user can access their own resources)
 */
export declare const requireAdminOrOwner: (resourceUserIdField?: string) => (req: Request, res: Response, next: NextFunction) => void | Response<any, Record<string, any>>;
/**
 * Require specific role(s)
 */
export declare const requireRole: (...allowedRoles: string[]) => (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>>;
//# sourceMappingURL=adminAuth.d.ts.map