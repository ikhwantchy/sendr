import { Request, Response } from 'express';
/**
 * Audit Logs Controller
 * Manages audit log viewing and export
 */
/**
 * GET /api/admin/audit-logs
 * Get audit logs with filters
 */
export declare const getAuditLogs: (req: Request, res: Response) => Promise<void>;
/**
 * GET /api/admin/audit-logs/export
 * Export audit logs to CSV
 */
export declare const exportAuditLogs: (req: Request, res: Response) => Promise<void>;
/**
 * GET /api/admin/audit-logs/stats
 * Get audit log statistics
 */
export declare const getAuditLogStats: (req: Request, res: Response) => Promise<void>;
/**
 * GET /api/admin/audit-logs/resource/:type/:id
 * Get logs for a specific resource
 */
export declare const getResourceLogs: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=auditLogsController.d.ts.map