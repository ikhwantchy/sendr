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

// Get user's permissions
router.get('/user/:userId', permissionsController.getUserPermissions);

// Get bot's permissions
router.get('/bot/:botId', permissionsController.getBotPermissions);

// Check access
router.get('/check/:botId/:userId', permissionsController.checkAccess);

// Grant/Update permission (owner only)
router.post('/', requireOwner, permissionsController.grantPermission);
router.put('/:userId/:botId', requireOwner, permissionsController.updatePermission);

// Revoke permission
router.delete('/:id', requireOwner, permissionsController.revokePermission);

module.exports = router;
