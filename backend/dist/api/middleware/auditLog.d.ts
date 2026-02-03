import { Request, Response, NextFunction } from 'express';
/**
 * Audit Log Middleware
 * Automatically logs all requests to audit_logs table
 */
/**
 * Audit log middleware - logs all requests
 */
export declare const auditLogMiddleware: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Audit log for specific actions (use in controllers)
 */
export declare const logAction: (req: Request, actionType: string, actionCategory: string, description: string, metadata?: any, resourceType?: string, resourceId?: string) => Promise<void>;
//# sourceMappingURL=auditLog.d.ts.map