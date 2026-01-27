/**
 * Users Routes
 * All routes require owner role
 */

import express from 'express';
import {
    listUsers,
    getUserDetail,
    inviteUser,
    updateUser,
    deleteUser,
    getUserStats
} from '../../controllers/usersController';
import { requireAdmin } from '../middleware/adminAuth';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// All routes require authentication and admin/owner role
router.use(authenticate);
router.use(requireAdmin);

// List all users
router.get('/', listUsers);

// Get user stats
router.get('/stats', getUserStats);

// Get user detail
router.get('/:id', getUserDetail);

// Invite user
router.post('/invite', inviteUser);

// Update user
router.put('/:id', updateUser);

// Delete user
router.delete('/:id', deleteUser);

export default router;
