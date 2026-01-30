import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { query } from '../../database/connection';
const { checkBotAccess } = require('../../middleware/checkPermission');

const router = Router();
router.use(authenticate);

/**
 * GET /api/datasources
 * Get all data sources for the user's tenant
 */
router.get('/', async (req, res) => {
    try {
        const tenantId = (req as any).user.tenant_id;
        const result = await query(
            'SELECT * FROM data_sources WHERE tenant_id = ? ORDER BY created_at DESC',
            [tenantId]
        );
        res.json({ success: true, data: result.rows });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/datasources/bot/:botId
 * Get data sources for a specific bot (requires manage_datasources permission)
 */
router.get('/bot/:botId', checkBotAccess('manage_datasources'), async (req, res) => {
    try {
        const { botId } = req.params;
        const result = await query(
            'SELECT * FROM data_sources WHERE bot_id = ? ORDER BY created_at DESC',
            [botId]
        );
        res.json({ success: true, data: result.rows });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;
