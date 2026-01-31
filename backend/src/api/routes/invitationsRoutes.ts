/**
 * Invitations Routes
 */

import { Router } from 'express';

import {
    validateToken,
    acceptInvitation
} from '../controllers/invitationsController';

const router = Router();

/**
 * GET /api/invitations/validate/:token
 * Validate invitation token
 */
router.get('/validate/:token', validateToken);

/**
 * POST /api/invitations/accept
 * Accept invitation and create user account
 */
router.post('/accept', acceptInvitation);

export default router;
