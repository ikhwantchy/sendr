/**
 * Permission Middleware
 * Checks if user has required permissions for bot operations
 */
import { Request, Response, NextFunction } from 'express';
/**
 * Check if user is owner
 */
export declare const requireOwner: (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>>;
/**
 * Check if user has access to bot
 * @param {string} action - Required action (view, edit, delete, create_campaign, create_rule, view_analytics)
 */
export declare const checkBotAccess: (action: string) => (req: Request, res: Response, next: NextFunction) => Promise<void | Response<any, Record<string, any>>>;
/**
 * Get user's accessible bot IDs
 */
export declare const getUserBotIds: (userId: string, userRole: string) => Promise<any>;
//# sourceMappingURL=checkPermission.d.ts.map