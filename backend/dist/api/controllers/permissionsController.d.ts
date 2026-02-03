import { Request, Response } from 'express';
/**
 * Get all bot permissions for a specific user
 */
export declare const getUserPermissions: (req: Request, res: Response) => Promise<void>;
/**
 * Update or Create permission for a specific user and bot
 */
export declare const updatePermission: (req: Request, res: Response) => Promise<void>;
/**
 * Check access
 */
export declare const checkAccess: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getBotPermissions: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const grantPermission: (req: Request, res: Response) => Promise<void>;
export declare const revokePermission: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=permissionsController.d.ts.map