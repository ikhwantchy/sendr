/**
 * LID Phone Mapping Routes
 * API endpoints for managing LID to phone number mappings
 */

import { Router, Request, Response } from 'express';
import { lidPhoneMappingService } from '../../services/lidPhoneMappingService';
import { authenticate } from '../middleware/auth';
import { logger } from '../../utils/logger';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/lid-mappings/:botId
 * Get all LID mappings for a bot
 */
router.get('/:botId', async (req: Request, res: Response) => {
    try {
        const { botId } = req.params;
        const mappings = await lidPhoneMappingService.getMappingsByBot(botId);

        res.json({
            success: true,
            data: mappings
        });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/lid-mappings
 * Create or update a LID mapping
 */
router.post('/', async (req: Request, res: Response) => {
    try {
        const { bot_id, lid, phone, name } = req.body;

        if (!bot_id || !lid || !phone) {
            return res.status(400).json({ 
                success: false, 
                error: 'bot_id, lid, and phone are required' 
            });
        }

        const result = await lidPhoneMappingService.upsertMapping({
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
    } catch (error: any) {
        logger.error('[LidMappingRoutes] Error creating mapping:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/lid-mappings/bulk
 * Bulk import LID mappings
 */
router.post('/bulk', async (req: Request, res: Response) => {
    try {
        const { bot_id, mappings } = req.body;

        if (!bot_id || !mappings || !Array.isArray(mappings)) {
            return res.status(400).json({ 
                success: false, 
                error: 'bot_id and mappings array are required' 
            });
        }

        const result = await lidPhoneMappingService.bulkImport(bot_id, mappings);

        res.json({
            success: true,
            data: result
        });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * DELETE /api/lid-mappings/:id
 * Delete a LID mapping
 */
router.delete('/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const result = await lidPhoneMappingService.deleteMapping(id);

        if (!result.success) {
            return res.status(400).json({ success: false, error: result.error });
        }

        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/lid-mappings/lookup/:botId/:lid
 * Look up phone by LID
 */
router.get('/lookup/:botId/:lid', async (req: Request, res: Response) => {
    try {
        const { botId, lid } = req.params;
        const phone = await lidPhoneMappingService.getPhoneByLid(botId, lid);

        res.json({
            success: true,
            data: { phone }
        });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;
