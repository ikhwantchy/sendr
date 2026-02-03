"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const connection_1 = require("../../database/connection");
const checkPermission_1 = require("../middleware/checkPermission");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
/**
 * GET /api/datasources
 * Get all data sources for the user's tenant
 */
router.get('/', async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;
        const result = await (0, connection_1.query)('SELECT * FROM data_sources WHERE tenant_id = ? ORDER BY created_at DESC', [tenantId]);
        res.json({ success: true, data: result.rows });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
/**
 * GET /api/datasources/bot/:botId
 * Get data sources for a specific bot (requires manage_datasources permission)
 */
router.get('/bot/:botId', (0, checkPermission_1.checkBotAccess)('manage_datasources'), async (req, res) => {
    try {
        const { botId } = req.params;
        const result = await (0, connection_1.query)('SELECT * FROM data_sources WHERE bot_id = ? ORDER BY created_at DESC', [botId]);
        res.json({ success: true, data: result.rows });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
exports.default = router;
//# sourceMappingURL=dataSourceRoutes.js.map