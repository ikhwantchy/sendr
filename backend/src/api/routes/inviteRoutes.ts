import express from 'express';
import * as invitesController from '../controllers/invitesController';

const router = express.Router();

/**
 * Public invite routes (no authentication required)
 */

// Validate invite token (for signup page)
router.post('/validate', invitesController.validateInviteToken);

export default router;
