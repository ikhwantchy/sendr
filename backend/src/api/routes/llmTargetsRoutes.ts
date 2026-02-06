import { Router } from 'express';
import { query } from '../../database/connection';
import { authenticate } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Helper: Verify bot access (OWNER and ADMIN can access all bots)
async function verifyBotAccess(botId: string, tenantId: string, userRole: string): Promise<boolean> {
    const isGlobalAdmin = userRole === 'OWNER' || userRole === 'ADMIN';
    const botQuery = isGlobalAdmin 
        ? 'SELECT * FROM bots WHERE id = ?'
        : 'SELECT * FROM bots WHERE id = ? AND tenant_id = ?';
    const botParams = isGlobalAdmin ? [botId] : [botId, tenantId];
    const botResult = await query(botQuery, botParams);
    return botResult.rows && botResult.rows.length > 0;
}

// Get all allowed targets for a bot
router.get('/:botId/llm-targets', async (req, res) => {
    try {
        const { botId } = req.params;
        const tenantId = (req as any).user.tenant_id;
        const userRole = (req as any).user.role;

        // Verify bot ownership (OWNER/ADMIN can access all bots)
        const isGlobalAdmin = userRole === 'OWNER' || userRole === 'ADMIN';
        const botQuery = isGlobalAdmin 
            ? 'SELECT * FROM bots WHERE id = ?'
            : 'SELECT * FROM bots WHERE id = ? AND tenant_id = ?';
        const botParams = isGlobalAdmin ? [botId] : [botId, tenantId];
        
        const botResult = await query(botQuery, botParams);
        if (!botResult.rows || botResult.rows.length === 0) {
            return res.status(404).json({ error: 'Bot not found' });
        }

        const targets = await query(`
            SELECT 
                id, 
                config_name,
                target_type, 
                target_jid, 
                target_name, 
                is_enabled,
                llm_config,
                last_used_at,
                created_at
            FROM llm_allowed_targets
            WHERE bot_id = ?
            ORDER BY created_at DESC
        `, [botId]);

        res.json({ data: targets.rows || [] });
    } catch (error) {
        console.error('Error fetching LLM targets:', error);
        res.status(500).json({ error: 'Failed to fetch allowed targets' });
    }
});

// Add allowed target
router.post('/:botId/llm-targets', async (req, res) => {
    try {
        const { botId } = req.params;
        const tenantId = (req as any).user.tenant_id;
        const userRole = (req as any).user.role;
        const { config_name, target_type, target_jid, target_name, is_enabled = 1, llm_config = '{}' } = req.body;

        // Validate input
        if (!target_type || !target_jid) {
            return res.status(400).json({ error: 'target_type and target_jid are required' });
        }

        if (!['group', 'contact'].includes(target_type)) {
            return res.status(400).json({ error: 'target_type must be "group" or "contact"' });
        }

        // Verify bot ownership (OWNER can access all bots)
        if (!await verifyBotAccess(botId, tenantId, userRole)) {
            console.log(`Bot not found or tenant mismatch: botId=${botId}, tenantId=${tenantId}`);
            return res.status(404).json({ error: 'Bot not found or you do not have permission' });
        }

        // Always insert as a new configuration
        await query(`
            INSERT INTO llm_allowed_targets (
                bot_id, 
                config_name,
                target_type, 
                target_jid, 
                target_name,
                is_enabled,
                llm_config
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [botId, config_name, target_type, target_jid, target_name || null, is_enabled, llm_config]);

        // Get the latest inserted record for this bot
        const newTarget = await query(
            'SELECT * FROM llm_allowed_targets WHERE bot_id = ? ORDER BY created_at DESC LIMIT 1',
            [botId]
        );

        res.status(201).json({
            message: 'Configuration saved successfully',
            data: newTarget.rows && newTarget.rows.length > 0 ? newTarget.rows[0] : null
        });
    } catch (error: any) {
        console.error('Error adding LLM target:', error);
        res.status(500).json({
            error: 'Failed to save configuration',
            details: error.message
        });
    }
});

// Update allowed target
router.put('/:botId/llm-targets/:targetId', async (req, res) => {
    try {
        const { botId, targetId } = req.params;
        const tenantId = (req as any).user.tenant_id;
        const userRole = (req as any).user.role;
        const { config_name, target_type, target_jid, target_name, is_enabled, llm_config } = req.body;

        // Verify bot ownership (OWNER can access all bots)
        if (!await verifyBotAccess(botId, tenantId, userRole)) {
            return res.status(404).json({ error: 'Bot not found' });
        }

        // Update record
        await query(`
            UPDATE llm_allowed_targets 
            SET config_name = ?,
                target_type = ?,
                target_jid = ?,
                target_name = ?,
                is_enabled = ?,
                llm_config = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ? AND bot_id = ?
        `, [config_name, target_type, target_jid, target_name, is_enabled, llm_config, targetId, botId]);

        const updated = await query('SELECT * FROM llm_allowed_targets WHERE id = ?', [targetId]);

        res.json({
            message: 'Configuration updated successfully',
            data: updated.rows && updated.rows.length > 0 ? updated.rows[0] : null
        });
    } catch (error: any) {
        console.error('Error updating LLM target:', error);
        res.status(500).json({ error: 'Failed to update configuration', details: error.message });
    }
});

// Toggle enabled status
router.patch('/:botId/llm-targets/:targetId/toggle', async (req, res) => {
    try {
        const { botId, targetId } = req.params;
        const tenantId = (req as any).user.tenant_id;
        const userRole = (req as any).user.role;

        // Verify bot ownership (OWNER can access all bots)
        if (!await verifyBotAccess(botId, tenantId, userRole)) {
            return res.status(404).json({ error: 'Bot not found' });
        }

        // Toggle status
        await query(`
            UPDATE llm_allowed_targets 
            SET is_enabled = CASE WHEN is_enabled = 1 THEN 0 ELSE 1 END,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ? AND bot_id = ?
        `, [targetId, botId]);

        // Get updated record
        const updated = await query('SELECT * FROM llm_allowed_targets WHERE id = ?', [targetId]);

        res.json({
            message: 'Status updated successfully',
            data: updated.rows && updated.rows.length > 0 ? updated.rows[0] : null
        });
    } catch (error) {
        console.error('Error toggling LLM target:', error);
        res.status(500).json({ error: 'Failed to toggle status' });
    }
});

// Remove allowed target
router.delete('/:botId/llm-targets/:targetId', async (req, res) => {
    try {
        const { botId, targetId } = req.params;
        const tenantId = (req as any).user.tenant_id;
        const userRole = (req as any).user.role;

        // Verify bot ownership (OWNER can access all bots)
        if (!await verifyBotAccess(botId, tenantId, userRole)) {
            return res.status(404).json({ error: 'Bot not found' });
        }

        // Delete target
        await query('DELETE FROM llm_allowed_targets WHERE id = ? AND bot_id = ?', [targetId, botId]);

        res.json({ message: 'Target removed successfully' });
    } catch (error) {
        console.error('Error removing LLM target:', error);
        res.status(500).json({ error: 'Failed to remove target' });
    }
});

// Bulk add targets (for convenience)
router.post('/:botId/llm-targets/bulk', async (req, res) => {
    try {
        const { botId } = req.params;
        const tenantId = (req as any).user.tenant_id;
        const userRole = (req as any).user.role;
        const { targets } = req.body; // Array of { target_type, target_jid, target_name }

        if (!Array.isArray(targets) || targets.length === 0) {
            return res.status(400).json({ error: 'targets array is required' });
        }

        // Verify bot ownership (OWNER can access all bots)
        if (!await verifyBotAccess(botId, tenantId, userRole)) {
            return res.status(404).json({ error: 'Bot not found' });
        }

        // Insert each target
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
