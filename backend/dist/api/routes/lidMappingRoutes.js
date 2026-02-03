"use strict";
/**
 * LID Phone Mapping Routes
 * API endpoints for managing LID to phone number mappings
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const lidPhoneMappingService_1 = require("../../services/lidPhoneMappingService");
const auth_1 = require("../middleware/auth");
const logger_1 = require("../../utils/logger");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_1.authenticate);
/**
 * GET /api/lid-mappings/:botId
 * Get all LID mappings for a bot
 */
router.get('/:botId', async (req, res) => {
    try {
        const { botId } = req.params;
        const mappings = await lidPhoneMappingService_1.lidPhoneMappingService.getMappingsByBot(botId);
        res.json({
            success: true,
            data: mappings
        });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
/**
 * POST /api/lid-mappings
 * Create or update a LID mapping
 */
router.post('/', async (req, res) => {
    try {
        const { bot_id, lid, phone, name } = req.body;
        if (!bot_id || !lid || !phone) {
            return res.status(400).json({
                success: false,
                error: 'bot_id, lid, and phone are required'
            });
        }
        const result = await lidPhoneMappingService_1.lidPhoneMappingService.upsertMapping({
            bot_id,
            lid,
            phone,
            name
        });
        if (!result.success) {
            return res.status(400).json({ success: false, error: result.error });
        }
        res.json({
            success: true,
            data: { id: result.id }
        });
    }
    catch (error) {
        logger_1.logger.error('[LidMappingRoutes] Error creating mapping:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});
/**
 * POST /api/lid-mappings/bulk
 * Bulk import LID mappings
 */
router.post('/bulk', async (req, res) => {
    try {
        const { bot_id, mappings } = req.body;
        if (!bot_id || !mappings || !Array.isArray(mappings)) {
            return res.status(400).json({
                success: false,
                error: 'bot_id and mappings array are required'
            });
        }
        const result = await lidPhoneMappingService_1.lidPhoneMappingService.bulkImport(bot_id, mappings);
        res.json({
            success: true,
            data: result
        });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
/**
 * DELETE /api/lid-mappings/:id
 * Delete a LID mapping
 */
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await lidPhoneMappingService_1.lidPhoneMappingService.deleteMapping(id);
        if (!result.success) {
            return res.status(400).json({ success: false, error: result.error });
        }
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
/**
 * GET /api/lid-mappings/lookup/:botId/:lid
 * Look up phone by LID
 */
router.get('/lookup/:botId/:lid', async (req, res) => {
    try {
        const { botId, lid } = req.params;
        const phone = await lidPhoneMappingService_1.lidPhoneMappingService.getPhoneByLid(botId, lid);
        res.json({
            success: true,
            data: { phone }
        });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
exports.default = router;
//# sourceMappingURL=lidMappingRoutes.js.map