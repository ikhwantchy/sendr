import { Router } from 'express';
import { botRepository } from '../database/repositories/botRepository';
import { authenticateToken } from '../api/middleware/auth';

const router = Router();

// Get all allowed targets for a bot
router.get('/:botId/llm-targets', authenticateToken, async (req, res) => {
    try {
        const { botId } = req.params;
        const userId = (req as any).user.id;

        // Verify bot ownership
        const bot = db.prepare('SELECT * FROM bots WHERE id = ? AND user_id = ?').get(botId, userId);
        if (!bot) {
            return res.status(404).json({ error: 'Bot not found' });
        }

        const targets = db.prepare(`
            SELECT id, target_type, target_jid, target_name, created_at
            FROM llm_allowed_targets
            WHERE bot_id = ?
            ORDER BY target_type, target_name
        `).all(botId);

        res.json({ data: targets });
    } catch (error) {
        console.error('Error fetching LLM targets:', error);
        res.status(500).json({ error: 'Failed to fetch allowed targets' });
    }
});

// Add allowed target
router.post('/:botId/llm-targets', authenticateToken, async (req, res) => {
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
        const bot = db.prepare('SELECT * FROM bots WHERE id = ? AND user_id = ?').get(botId, userId);
        if (!bot) {
            return res.status(404).json({ error: 'Bot not found' });
        }

        // Insert or ignore if already exists
        const stmt = db.prepare(`
            INSERT INTO llm_allowed_targets (bot_id, target_type, target_jid, target_name)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(bot_id, target_jid) DO UPDATE SET
                target_name = excluded.target_name,
                updated_at = CURRENT_TIMESTAMP
        `);

        const result = stmt.run(botId, target_type, target_jid, target_name || null);

        const newTarget = db.prepare('SELECT * FROM llm_allowed_targets WHERE id = ?').get(result.lastInsertRowid);

        res.status(201).json({
            message: 'Target added successfully',
            data: newTarget
        });
    } catch (error) {
        console.error('Error adding LLM target:', error);
        res.status(500).json({ error: 'Failed to add target' });
    }
});

// Remove allowed target
router.delete('/:botId/llm-targets/:targetId', authenticateToken, async (req, res) => {
    try {
        const { botId, targetId } = req.params;
        const userId = (req as any).user.id;

        // Verify bot ownership
        const bot = db.prepare('SELECT * FROM bots WHERE id = ? AND user_id = ?').get(botId, userId);
        if (!bot) {
            return res.status(404).json({ error: 'Bot not found' });
        }

        // Delete target
        const stmt = db.prepare('DELETE FROM llm_allowed_targets WHERE id = ? AND bot_id = ?');
        const result = stmt.run(targetId, botId);

        if (result.changes === 0) {
            return res.status(404).json({ error: 'Target not found' });
        }

        res.json({ message: 'Target removed successfully' });
    } catch (error) {
        console.error('Error removing LLM target:', error);
        res.status(500).json({ error: 'Failed to remove target' });
    }
});

// Bulk add targets (for convenience)
router.post('/:botId/llm-targets/bulk', authenticateToken, async (req, res) => {
    try {
        const { botId } = req.params;
        const userId = (req as any).user.id;
        const { targets } = req.body; // Array of { target_type, target_jid, target_name }

        if (!Array.isArray(targets) || targets.length === 0) {
            return res.status(400).json({ error: 'targets array is required' });
        }

        // Verify bot ownership
        const bot = db.prepare('SELECT * FROM bots WHERE id = ? AND user_id = ?').get(botId, userId);
        if (!bot) {
            return res.status(404).json({ error: 'Bot not found' });
        }

        const stmt = db.prepare(`
            INSERT INTO llm_allowed_targets (bot_id, target_type, target_jid, target_name)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(bot_id, target_jid) DO UPDATE SET
                target_name = excluded.target_name,
                updated_at = CURRENT_TIMESTAMP
        `);

        const insertMany = db.transaction((items: any[]) => {
            for (const item of items) {
                stmt.run(botId, item.target_type, item.target_jid, item.target_name || null);
            }
        });

        insertMany(targets);

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
