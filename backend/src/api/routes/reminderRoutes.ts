/**
 * Reminder API Routes
 * Handles reminder creation, listing, and management
 */

import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { reminderService } from '../../modules/reminder/reminderService';
import { logger } from '../../utils/logger';

const router = Router();
router.use(authenticate);

/**
 * GET /api/reminders
 * List all reminders for tenant
 */
router.get('/', async (req, res) => {
    try {
        const tenantId = req.user?.tenant_id || '00000000-0000-0000-0000-000000000001';
        const botId = req.query.bot_id as string | undefined;

        const reminders = await reminderService.listReminders(tenantId, botId);

        res.json({
            success: true,
            data: reminders,
        });
    } catch (error: any) {
        logger.error('Failed to list reminders', { error: error.message });
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});

/**
 * POST /api/reminders
 * Create a new reminder
 */
router.post('/', async (req, res) => {
    try {
        const tenantId = req.user?.tenant_id || '00000000-0000-0000-0000-000000000001';
        const {
            bot_id,
            name,
            message,
            recipient,
            schedule_type,
            schedule_config,
        } = req.body;

        // Validation
        if (!bot_id || !name || !message || !recipient || !schedule_type || !schedule_config) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: bot_id, name, message, recipient, schedule_type, schedule_config',
            });
        }

        const reminder = await reminderService.createReminder({
            tenant_id: tenantId,
            bot_id,
            name,
            message,
            recipient,
            schedule_type,
            schedule_config,
        });

        res.json({
            success: true,
            data: reminder,
            message: 'Reminder created successfully',
        });
    } catch (error: any) {
        logger.error('Failed to create reminder', { error: error.message });
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});

/**
 * GET /api/reminders/:id
 * Get reminder by ID
 */
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const reminder = await reminderService.getReminder(id);

        res.json({
            success: true,
            data: reminder,
        });
    } catch (error: any) {
        logger.error('Failed to get reminder', { error: error.message });
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});

/**
 * PUT /api/reminders/:id
 * Update reminder
 */
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        await reminderService.updateReminder(id, updates);

        res.json({
            success: true,
            message: 'Reminder updated successfully',
        });
    } catch (error: any) {
        logger.error('Failed to update reminder', { error: error.message });
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});

/**
 * PATCH /api/reminders/:id/toggle
 * Toggle reminder active status
 */
router.patch('/:id/toggle', async (req, res) => {
    try {
        const { id } = req.params;
        const { is_active } = req.body;

        if (typeof is_active !== 'boolean') {
            return res.status(400).json({
                success: false,
                error: 'is_active must be a boolean',
            });
        }

        await reminderService.toggleReminder(id, is_active);

        res.json({
            success: true,
            message: `Reminder ${is_active ? 'activated' : 'deactivated'} successfully`,
        });
    } catch (error: any) {
        logger.error('Failed to toggle reminder', { error: error.message });
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});

/**
 * DELETE /api/reminders/:id
 * Delete reminder
 */
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await reminderService.deleteReminder(id);

        res.json({
            success: true,
            message: 'Reminder deleted successfully',
        });
    } catch (error: any) {
        logger.error('Failed to delete reminder', { error: error.message });
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});

export default router;
