/**
 * Permissions Routes
 * All routes require owner role
 */

import express from 'express';
// @ts-ignore - JS controller
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

// Get user's permissions
router.get('/user/:userId', getUserPermissions);

// Get bot's permissions
router.get('/bot/:botId', requireOwner, getBotPermissions);

// Check access
router.get('/check/:botId/:userId', checkAccess);

// Grant/Update permission (owner only)
router.post('/', requireOwner, grantPermission);

// NEW: Support for granular bot update
router.put('/:userId/:botId', requireOwner, updatePermission);

// LEGACY: Old single param update
router.put('/:id', requireOwner, updatePermission);

// Revoke permission
router.delete('/:id', requireOwner, revokePermission);

export default router;
