"use strict";
/**
 * Invitations Routes
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const invitationsController_1 = require("../controllers/invitationsController");
const router = (0, express_1.Router)();
/**
 * GET /api/invitations/validate/:token
 * Validate invitation token
 */
router.get('/validate/:token', invitationsController_1.validateToken);
/**
 * POST /api/invitations/accept
 * Accept invitation and create user account
 */
router.post('/accept', invitationsController_1.acceptInvitation);
exports.default = router;
//# sourceMappingURL=invitationsRoutes.js.map