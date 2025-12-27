/**
 * Permissions Routes
 * All routes require owner role
 */

import express from 'express';
import {
    getUserPermissions,
    getBotPermissions,
    grantPermission,
    updatePermission,
    revokePermission,
    checkAccess
} from '../../controllers/permissionsController';
import { requireOwner } from '../../middleware/checkPermission';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get user's permissions (user can view their own, owner can view any)
router.get('/user/:userId', getUserPermissions);

// Get bot's permissions (owner only)
router.get('/bot/:botId', requireOwner, getBotPermissions);

// Check access (any authenticated user)
router.get('/check/:botId/:userId', checkAccess);

// Grant permission (owner only)
router.post('/', requireOwner, grantPermission);

// Update permission (owner only)
router.put('/:id', requireOwner, updatePermission);

// Revoke permission (owner only)
router.delete('/:id', requireOwner, revokePermission);

export default router;
