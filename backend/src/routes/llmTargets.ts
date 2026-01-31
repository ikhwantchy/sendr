import { Router } from 'express';
import { authenticate } from '../api/middleware/auth';
import { query } from '../database/connection';

const router = Router();

// Get all allowed targets for a bot
router.get('/:botId/llm-targets', authenticate, async (req, res) => {
    try {
        const { botId } = req.params;
        const userId = (req as any).user.id;

        // Verify bot ownership
        const botRes = await query('SELECT * FROM bots WHERE id = ? AND user_id = ?', [botId, userId]);
        if (!botRes.rows || botRes.rows.length === 0) {
            return res.status(404).json({ error: 'Bot not found' });
        }

        const targets = await query(`
            SELECT id, target_type, target_jid, target_name, created_at
            FROM llm_allowed_targets
            WHERE bot_id = ?
            ORDER BY target_type, target_name
        `, [botId]);

        res.json({ data: targets.rows });
    } catch (error) {
        console.error('Error fetching LLM targets:', error);
        res.status(500).json({ error: 'Failed to fetch allowed targets' });
    }
});

// Add allowed target
router.post('/:botId/llm-targets', authenticate, async (req, res) => {
    try {
        const { botId } = req.params;
        const userId = (req as any).user.id;
        const { target_type, target_jid, target_name } = req.body;

        // Validate input
        if (!target_type || !target_jid) {
            return res.status(400).json({ error: 'target_type and target_jid are required' });
        }

        if (!['group', 'contact'].includes(target_type)) {
            return res.status(400).json({ error: 'target_type must be "group" or "contact"' });
        }

        // Verify bot ownership
        const botRes = await query('SELECT * FROM bots WHERE id = ? AND user_id = ?', [botId, userId]);
        if (!botRes.rows || botRes.rows.length === 0) {
            return res.status(404).json({ error: 'Bot not found' });
        }

        // Insert or ignore if already exists
        // Note: SQLite ON CONFLICT update
        await query(`
            INSERT INTO llm_allowed_targets (bot_id, target_type, target_jid, target_name)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(bot_id, target_jid) DO UPDATE SET
                target_name = excluded.target_name,
                updated_at = CURRENT_TIMESTAMP
        `, [botId, target_type, target_jid, target_name || null]);

        // Get the inserted/updated record
        const newTarget = await query('SELECT * FROM llm_allowed_targets WHERE bot_id = ? AND target_jid = ?', [botId, target_jid]);

        res.status(201).json({
            message: 'Target added successfully',
            data: newTarget.rows[0]
        });
    } catch (error) {
        console.error('Error adding LLM target:', error);
        res.status(500).json({ error: 'Failed to add target' });
    }
});

// Remove allowed target
router.delete('/:botId/llm-targets/:targetId', authenticate, async (req, res) => {
    try {
        const { botId, targetId } = req.params;
        const userId = (req as any).user.id;

        // Verify bot ownership
        const botRes = await query('SELECT * FROM bots WHERE id = ? AND user_id = ?', [botId, userId]);
        if (!botRes.rows || botRes.rows.length === 0) {
            return res.status(404).json({ error: 'Bot not found' });
        }

        // Delete target
        await query('DELETE FROM llm_allowed_targets WHERE id = ? AND bot_id = ?', [targetId, botId]);

        // We can't easily verify changes count with current query wrapper, assuming success if no error
        // Real-world: Check if target existed before delete or enhance wrapper

        res.json({ message: 'Target removed successfully' });
    } catch (error) {
        console.error('Error removing LLM target:', error);
        res.status(500).json({ error: 'Failed to remove target' });
    }
});

// Bulk add targets (for convenience)
router.post('/:botId/llm-targets/bulk', authenticate, async (req, res) => {
    try {
        const { botId } = req.params;
        const userId = (req as any).user.id;
        const { targets } = req.body; // Array of { target_type, target_jid, target_name }

        if (!Array.isArray(targets) || targets.length === 0) {
            return res.status(400).json({ error: 'targets array is required' });
        }

        // Verify bot ownership
        const botRes = await query('SELECT * FROM bots WHERE id = ? AND user_id = ?', [botId, userId]);
        if (!botRes.rows || botRes.rows.length === 0) {
            return res.status(404).json({ error: 'Bot not found' });
        }

        // Sequential insert for simplicity (SQLite handles this fine)
        for (const item of targets) {
            await query(`
                INSERT INTO llm_allowed_targets (bot_id, target_type, target_jid, target_name)
                VALUES (?, ?, ?, ?)
                ON CONFLICT(bot_id, target_jid) DO UPDATE SET
                    target_name = excluded.target_name,
                    updated_at = CURRENT_TIMESTAMP
            `, [botId, item.target_type, item.target_jid, item.target_name || null]);
        }

        res.json({
            message: `${targets.length} targets added successfully`,
            count: targets.length
        });
    } catch (error) {
        console.error('Error bulk adding LLM targets:', error);
        res.status(500).json({ error: 'Failed to add targets' });
    }
});

export default router;
