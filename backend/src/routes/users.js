/**
 * Users Routes
 * All routes require owner role
 */

const express = require('express');
const router = express.Router();
const usersController = require('../controllers/usersController');
const { requireOwner } = require('../middleware/checkPermission');
const { authenticateToken } = require('../middleware/auth');

// All routes require authentication and owner role
router.use(authenticateToken);
router.use(requireOwner);

// List all users
router.get('/', usersController.listUsers);

// Get user stats
router.get('/stats', usersController.getUserStats);

// Get user detail
router.get('/:id', usersController.getUserDetail);

// Invite user
router.post('/invite', usersController.inviteUser);

// Update user
router.put('/:id', usersController.updateUser);

// Delete user
router.delete('/:id', usersController.deleteUser);

module.exports = router;
