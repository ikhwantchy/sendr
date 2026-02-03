import { Request, Response } from 'express';
/**
 * List all users
 */
export declare const listUsers: (req: Request, res: Response) => Promise<void>;
/**
 * Get user detail with bots and aggregated analytics
 */
export declare const getUserDetail: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
/**
 * Invite user logic
 */
export declare const inviteUser: (req: Request, res: Response) => Promise<void>;
/**
 * Update user
 */
export declare const updateUser: (req: Request, res: Response) => Promise<void>;
/**
 * Delete user
 */
export declare const deleteUser: (req: Request, res: Response) => Promise<void>;
/**
 * Get user stats
 */
export declare const getUserStats: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=usersController.d.ts.map