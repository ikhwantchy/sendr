/**
 * Permissions Routes
 * All routes require owner role
 */

const express = require('express');
const router = express.Router();
const permissionsController = require('../controllers/permissionsController');
const { requireOwner } = require('../middleware/checkPermission');
const { authenticateToken } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

// Get user's permissions (user can view their own, owner can view any)
router.get('/user/:userId', permissionsController.getUserPermissions);

// Get bot's permissions (owner only)
router.get('/bot/:botId', requireOwner, permissionsController.getBotPermissions);

// Check access (any authenticated user)
router.get('/check/:botId/:userId', permissionsController.checkAccess);

// Grant permission (owner only)
router.post('/', requireOwner, permissionsController.grantPermission);

// Update permission (owner only)
router.put('/:id', requireOwner, permissionsController.updatePermission);

// Revoke permission (owner only)
router.delete('/:id', requireOwner, permissionsController.revokePermission);

module.exports = router;
