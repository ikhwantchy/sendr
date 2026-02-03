import { Request, Response } from 'express';
/**
 * Admin Controller
 * Handles admin-specific endpoints (settings, dashboard, user management, etc.)
 */
/**
 * POST /api/admin/users/create
 * Create a new user directly (without invite)
 */
export declare const createUser: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
/**
 * GET /api/admin/dashboard/stats
 * Get dashboard statistics
 */
export declare const getDashboardStats: (req: Request, res: Response) => Promise<void>;
/**
 * GET /api/admin/settings/:category
 * Get settings for a category
 */
export declare const getSettings: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
/**
 * GET /api/admin/settings
 * Get all settings
 */
export declare const getAllSettings: (req: Request, res: Response) => Promise<void>;
/**
 * PUT /api/admin/settings
 * Update multiple settings at once
 */
export declare const bulkUpdateSettings: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
/**
 * PUT /api/admin/settings/:category
 * Update settings for a category
 */
export declare const updateSettings: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
/**
 * POST /api/admin/settings/test-email
 * Send test email to verify SMTP settings
 */
export declare const testEmail: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
/**
 * POST /api/admin/cache/clear
 * Clear system cache
 */
export declare const clearCache: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=adminController.d.ts.map