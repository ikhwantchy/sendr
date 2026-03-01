import { Request, Response } from 'express';
/**
 * System Controller
 * Handles system maintenance, backup, and health checks
 */
/**
 * GET /api/admin/system/health
 * Get system health status
 */
export declare const getSystemHealth: (req: Request, res: Response) => Promise<void>;
/**
 * POST /api/admin/system/backup
 * Create a database backup (SQLite)
 */
export declare const createBackup: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
/**
 * GET /api/admin/system/backups
 * Get list of backups (SQLite)
 */
export declare const getBackups: (req: Request, res: Response) => Promise<void>;
/**
 * GET /api/admin/system/backups/download/:filename
 * Download a backup file
 */
export declare const downloadBackup: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
/**
 * POST /api/admin/system/maintenance/optimize-db
 * Optimize database (vacuum, analyze)
 */
export declare const optimizeDatabase: (req: Request, res: Response) => Promise<void>;
/**
 * POST /api/admin/system/maintenance/cleanup-logs
 * Clean up old audit logs
 */
export declare const cleanupLogs: (req: Request, res: Response) => Promise<void>;
/**
 * GET /api/admin/system/stats
 * Get system statistics
 */
export declare const getSystemStats: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=systemController.d.ts.map