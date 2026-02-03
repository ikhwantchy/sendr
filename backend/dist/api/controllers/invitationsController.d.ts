import { Request, Response } from 'express';
/**
 * Validate invitation token
 * GET /api/invitations/validate/:token
 */
export declare const validateToken: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
/**
 * Accept invitation and create user
 * POST /api/invitations/accept
 */
export declare const acceptInvitation: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=invitationsController.d.ts.map