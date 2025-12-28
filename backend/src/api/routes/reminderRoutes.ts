import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../../database/connection-sqlite';
import googleSheetsService from '../../services/googleSheetsService';
import reminderSchedulerService from '../../services/reminderSchedulerService';

const router = Router();

/**
 * GET /api/reminders
 * Get all reminders for the authenticated user
 */
router.get('/', async (req, res) => {
    try {
        const userId = (req as any).user.id;

        const reminders = await query(`
            SELECT r.*, b.name as bot_name, b.phone_number
            FROM reminders r
            LEFT JOIN bots b ON r.bot_id = b.id
            WHERE b.created_by = ?
            ORDER BY r.created_at DESC
        `, [userId]);

        res.json({
            success: true,
            data: reminders,
        });
    } catch (error: any) {
        console.error('Error fetching reminders:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch reminders',
        });
    }
});

/**
 * GET /api/reminders/by-bot/:botId
 * Get reminders for a specific bot
 */
router.get('/by-bot/:botId', async (req, res) => {
    try {
        const { botId } = req.params;
        const userId = (req as any).user.id;

        const reminders = await query(`
            SELECT r.*, b.name as bot_name, b.phone_number
            FROM reminders r
            LEFT JOIN bots b ON r.bot_id = b.id
            WHERE r.bot_id = ? AND b.created_by = ?
            ORDER BY r.created_at DESC
        `, [botId, userId]);

        res.json({
            success: true,
            data: reminders,
        });
    } catch (error: any) {
        console.error('Error fetching reminders:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch reminders',
        });
    }
});

/**
 * GET /api/reminders/:id
 * Get a specific reminder
 */
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const userId = (req as any).user.id;

        const reminderRows = await query(`
            SELECT r.*, b.name as bot_name, b.phone_number
            FROM reminders r
            LEFT JOIN bots b ON r.bot_id = b.id
            WHERE r.id = ? AND b.created_by = ?
        `, [id, userId]);

        if (reminderRows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Reminder not found',
            });
        }

        res.json({
            success: true,
            data: reminderRows[0],
        });
    } catch (error: any) {
        console.error('Error fetching reminder:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch reminder',
        });
    }
});

/**
 * POST /api/reminders
 * Create a new reminder
 */
router.post('/', async (req, res) => {
    try {
        const userId = (req as any).user.id;
        const {
            name,
            description,
            botId,
            targetType,
            targetJid,
            scheduleType,
            date,
            time,
            timezone,
            cronExpression,
            dataSourceId,
            googleSheetsUrl,
            messageTemplate,
            imageUrl,
        } = req.body;

        // Validate required fields
        if (!name || !botId || !targetJid || !messageTemplate) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields',
            });
        }

        // Verify bot ownership
        const botRows = await query(
            'SELECT * FROM bots WHERE id = ? AND created_by = ?',
            [botId, userId]
        );

        if (botRows.length === 0) {
            return res.status(403).json({
                success: false,
                error: 'Bot not found or access denied',
            });
        }

        const reminderId = uuidv4();
        let finalDataSourceId = dataSourceId;

        // Create data source if Google Sheets URL is provided
        if (googleSheetsUrl && !dataSourceId) {
            const validation = await googleSheetsService.validateSheetAccess(googleSheetsUrl);

            if (!validation.valid) {
                return res.status(400).json({
                    success: false,
                    error: validation.message,
                });
            }

            finalDataSourceId = uuidv4();
            await query(`
                INSERT INTO data_sources (id, name, type, source_url, config, created_by, created_at)
                VALUES (?, ?, 'google_sheets', ?, '{}', ?, datetime('now'))
            `, [finalDataSourceId, `Data Source for ${name}`, googleSheetsUrl, userId]);
        }

        // Determine status based on schedule type
        const status = scheduleType === 'now' ? 'completed' : 'pending';

        // Create reminder
        await query(`
            INSERT INTO reminders (
                id, name, description, bot_id, target_type, target_jid,
                schedule_type, cron_expression, timezone, data_source_id,
                message_template, image_url, is_active, status, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, datetime('now'))
        `, [
            reminderId,
            name,
            description || '',
            botId,
            targetType,
            targetJid,
            scheduleType,
            cronExpression || '',
            timezone || 'Asia/Jakarta',
            finalDataSourceId || null,
            messageTemplate,
            imageUrl || null,
            status,
        ]);

        // Schedule or execute immediately
        if (scheduleType === 'now') {
            // Execute immediately
            await reminderSchedulerService.executeImmediately(reminderId);
        } else {
            // Schedule for later
            const reminder = await query('SELECT * FROM reminders WHERE id = ?', [reminderId]);
            await reminderSchedulerService.scheduleReminder(reminder[0]);
        }

        res.status(201).json({
            success: true,
            data: {
                id: reminderId,
                message: scheduleType === 'now' ? 'Reminder sent immediately' : 'Reminder scheduled successfully',
            },
        });
    } catch (error: any) {
        console.error('Error creating reminder:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create reminder',
            details: error.message,
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
        const userId = (req as any).user.id;

        // Verify ownership
        const reminderRows = await query(`
            SELECT r.* FROM reminders r
            LEFT JOIN bots b ON r.bot_id = b.id
            WHERE r.id = ? AND b.created_by = ?
        `, [id, userId]);

        if (reminderRows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Reminder not found',
            });
        }

        const reminder = reminderRows[0];
        const newStatus = reminder.is_active === 1 ? 0 : 1;

        await query('UPDATE reminders SET is_active = ? WHERE id = ?', [newStatus, id]);

        if (newStatus === 1) {
            // Re-schedule
            const updated = await query('SELECT * FROM reminders WHERE id = ?', [id]);
            await reminderSchedulerService.scheduleReminder(updated[0]);
        } else {
            // Unschedule
            reminderSchedulerService.unscheduleReminder(id);
        }

        res.json({
            success: true,
            data: {
                isActive: newStatus === 1,
            },
        });
    } catch (error: any) {
        console.error('Error toggling reminder:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to toggle reminder',
        });
    }
});

/**
 * DELETE /api/reminders/:id
 * Delete a reminder
 */
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const userId = (req as any).user.id;

        // Verify ownership
        const reminderRows = await query(`
            SELECT r.* FROM reminders r
            LEFT JOIN bots b ON r.bot_id = b.id
            WHERE r.id = ? AND b.created_by = ?
        `, [id, userId]);

        if (reminderRows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Reminder not found',
            });
        }

        // Unschedule if active
        reminderSchedulerService.unscheduleReminder(id);

        // Delete reminder
        await query('DELETE FROM reminders WHERE id = ?', [id]);

        res.json({
            success: true,
            message: 'Reminder deleted successfully',
        });
    } catch (error: any) {
        console.error('Error deleting reminder:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete reminder',
        });
    }
});

/**
 * GET /api/reminders/:id/logs
 * Get execution logs for a reminder
 */
router.get('/:id/logs', async (req, res) => {
    try {
        const { id } = req.params;
        const userId = (req as any).user.id;

        // Verify ownership
        const reminderRows = await query(`
            SELECT r.* FROM reminders r
            LEFT JOIN bots b ON r.bot_id = b.id
            WHERE r.id = ? AND b.created_by = ?
        `, [id, userId]);

        if (reminderRows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Reminder not found',
            });
        }

        const logs = await query(`
            SELECT * FROM reminder_logs
            WHERE reminder_id = ?
            ORDER BY executed_at DESC
            LIMIT 50
        `, [id]);

        res.json({
            success: true,
            data: logs,
        });
    } catch (error: any) {
        console.error('Error fetching logs:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch logs',
        });
    }
});

export default router;
