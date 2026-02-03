"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const connection_1 = require("../../database/connection");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_1.authenticate);
// Get all allowed targets for a bot
router.get('/:botId/llm-targets', async (req, res) => {
    try {
        const { botId } = req.params;
        const tenantId = req.user.tenant_id;
        // Verify bot ownership
        const botResult = await (0, connection_1.query)('SELECT * FROM bots WHERE id = ? AND tenant_id = ?', [botId, tenantId]);
        if (!botResult.rows || botResult.rows.length === 0) {
            return res.status(404).json({ error: 'Bot not found' });
        }
        const targets = await (0, connection_1.query)(`
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
    }
    catch (error) {
        console.error('Error fetching LLM targets:', error);
        res.status(500).json({ error: 'Failed to fetch allowed targets' });
    }
});
// Add allowed target
router.post('/:botId/llm-targets', async (req, res) => {
    try {
        const { botId } = req.params;
        const tenantId = req.user.tenant_id;
        const { config_name, target_type, target_jid, target_name, is_enabled = 1, llm_config = '{}' } = req.body;
        // Validate input
        if (!target_type || !target_jid) {
            return res.status(400).json({ error: 'target_type and target_jid are required' });
        }
        if (!['group', 'contact'].includes(target_type)) {
            return res.status(400).json({ error: 'target_type must be "group" or "contact"' });
        }
        // Verify bot ownership
        const botResult = await (0, connection_1.query)('SELECT * FROM bots WHERE id = ? AND tenant_id = ?', [botId, tenantId]);
        if (!botResult.rows || botResult.rows.length === 0) {
            console.log(`Bot not found or tenant mismatch: botId=${botId}, tenantId=${tenantId}`);
            return res.status(404).json({ error: 'Bot not found or you do not have permission' });
        }
        // Always insert as a new configuration
        await (0, connection_1.query)(`
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
        const newTarget = await (0, connection_1.query)('SELECT * FROM llm_allowed_targets WHERE bot_id = ? ORDER BY created_at DESC LIMIT 1', [botId]);
        res.status(201).json({
            message: 'Configuration saved successfully',
            data: newTarget.rows && newTarget.rows.length > 0 ? newTarget.rows[0] : null
        });
    }
    catch (error) {
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
        const tenantId = req.user.tenant_id;
        const { config_name, target_type, target_jid, target_name, is_enabled, llm_config } = req.body;
        // Verify bot ownership
        const botResult = await (0, connection_1.query)('SELECT * FROM bots WHERE id = ? AND tenant_id = ?', [botId, tenantId]);
        if (!botResult.rows || botResult.rows.length === 0) {
            return res.status(404).json({ error: 'Bot not found' });
        }
        // Update record
        await (0, connection_1.query)(`
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
        const updated = await (0, connection_1.query)('SELECT * FROM llm_allowed_targets WHERE id = ?', [targetId]);
        res.json({
            message: 'Configuration updated successfully',
            data: updated.rows && updated.rows.length > 0 ? updated.rows[0] : null
        });
    }
    catch (error) {
        console.error('Error updating LLM target:', error);
        res.status(500).json({ error: 'Failed to update configuration', details: error.message });
    }
});
// Toggle enabled status
router.patch('/:botId/llm-targets/:targetId/toggle', async (req, res) => {
    try {
        const { botId, targetId } = req.params;
        const tenantId = req.user.tenant_id;
        // Verify bot ownership
        const botResult = await (0, connection_1.query)('SELECT * FROM bots WHERE id = ? AND tenant_id = ?', [botId, tenantId]);
        if (!botResult.rows || botResult.rows.length === 0) {
            return res.status(404).json({ error: 'Bot not found' });
        }
        // Toggle status
        await (0, connection_1.query)(`
            UPDATE llm_allowed_targets 
            SET is_enabled = CASE WHEN is_enabled = 1 THEN 0 ELSE 1 END,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ? AND bot_id = ?
        `, [targetId, botId]);
        // Get updated record
        const updated = await (0, connection_1.query)('SELECT * FROM llm_allowed_targets WHERE id = ?', [targetId]);
        res.json({
            message: 'Status updated successfully',
            data: updated.rows && updated.rows.length > 0 ? updated.rows[0] : null
        });
    }
    catch (error) {
        console.error('Error toggling LLM target:', error);
        res.status(500).json({ error: 'Failed to toggle status' });
    }
});
// Remove allowed target
router.delete('/:botId/llm-targets/:targetId', async (req, res) => {
    try {
        const { botId, targetId } = req.params;
        const tenantId = req.user.tenant_id;
        // Verify bot ownership
        const botResult = await (0, connection_1.query)('SELECT * FROM bots WHERE id = ? AND tenant_id = ?', [botId, tenantId]);
        if (!botResult.rows || botResult.rows.length === 0) {
            return res.status(404).json({ error: 'Bot not found' });
        }
        // Delete target
        await (0, connection_1.query)('DELETE FROM llm_allowed_targets WHERE id = ? AND bot_id = ?', [targetId, botId]);
        res.json({ message: 'Target removed successfully' });
    }
    catch (error) {
        console.error('Error removing LLM target:', error);
        res.status(500).json({ error: 'Failed to remove target' });
    }
});
// Bulk add targets (for convenience)
router.post('/:botId/llm-targets/bulk', async (req, res) => {
    try {
        const { botId } = req.params;
        const tenantId = req.user.tenant_id;
        const { targets } = req.body; // Array of { target_type, target_jid, target_name }
        if (!Array.isArray(targets) || targets.length === 0) {
            return res.status(400).json({ error: 'targets array is required' });
        }
        // Verify bot ownership
        const botResult = await (0, connection_1.query)('SELECT * FROM bots WHERE id = ? AND tenant_id = ?', [botId, tenantId]);
        if (!botResult.rows || botResult.rows.length === 0) {
            return res.status(404).json({ error: 'Bot not found' });
        }
        // Insert each target
        for (const item of targets) {
            await (0, connection_1.query)(`
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
    }
    catch (error) {
        console.error('Error bulk adding LLM targets:', error);
        res.status(500).json({ error: 'Failed to add targets' });
    }
});
exports.default = router;
//# sourceMappingURL=llmTargetsRoutes.js.map