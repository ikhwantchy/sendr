import { Request, Response } from 'express';
/**
 * Invites Controller
 * Manages user invitation system
 */
/**
 * GET /api/admin/invites
 * Get all invites with filters
 */
export declare const getInvites: (req: Request, res: Response) => Promise<void>;
/**
 * POST /api/admin/invites
 * Create a new invite and send email
 */
export declare const createInvite: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
/**
 * POST /api/admin/invites/:id/resend
 * Resend an invite email
 */
export declare const resendInvite: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
/**
 * POST /api/admin/invites/:id/revoke
 * Revoke an invite
 */
export declare const revokeInvite: (req: Request, res: Response) => Promise<void>;
/**
 * DELETE /api/admin/invites/:id
 * Delete an invite
 */
export declare const deleteInvite: (req: Request, res: Response) => Promise<void>;
/**
 * GET /api/admin/invites/stats
 * Get invite statistics
 */
export declare const getInviteStats: (req: Request, res: Response) => Promise<void>;
/**
 * POST /api/invites/validate
 * Validate an invite token (public endpoint)
 */
export declare const validateInviteToken: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=invitesController.d.ts.map