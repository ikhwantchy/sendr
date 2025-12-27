/**
 * Campaign API Routes
 * Handles campaign creation, listing, and management
 */

import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { campaignService } from '../../modules/campaign/campaignService';
import { logger } from '../../utils/logger';

const router = Router();
router.use(authenticate);

/**
 * GET /api/campaigns
 * List all campaigns for tenant
 */
router.get('/', async (req, res) => {
    try {
        const tenantId = req.user?.tenant_id || '00000000-0000-0000-0000-000000000001';
        const botId = req.query.bot_id as string | undefined;

        const campaigns = await campaignService.listCampaigns(tenantId, botId);

        res.json({
            success: true,
            data: campaigns,
        });
    } catch (error: any) {
        logger.error('Failed to list campaigns', { error: error.message });
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});

/**
 * POST /api/campaigns
 * Create a new campaign
 */
router.post('/', async (req, res) => {
    try {
        const tenantId = req.user?.tenant_id || '00000000-0000-0000-0000-000000000001';
        const {
            bot_id,
            name,
            message_template,
            target_type,
            target_contacts,
        } = req.body;

        // Validation
        if (!bot_id || !name || !message_template || !target_type) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: bot_id, name, message_template, target_type',
            });
        }

        // Convert target_contacts array to csv_data format
        let csv_data: Array<{ phone: string; name: string }> = [];

        if (target_type === 'specific' && target_contacts && Array.isArray(target_contacts)) {
            csv_data = target_contacts.map((contact: any) => {
                // If contact is already an object with phone/name
                if (typeof contact === 'object' && contact.phone) {
                    return {
                        phone: contact.phone,
                        name: contact.name || '',
                    };
                }
                // If contact is just a phone number string
                return {
                    phone: String(contact).trim(),
                    name: '',
                };
            });
        }

        logger.info('Creating campaign', {
            bot_id,
            name,
            target_type,
            contacts_count: csv_data.length,
        });

        const campaign = await campaignService.createCampaign({
            tenant_id: tenantId,
            bot_id,
            name,
            message_template,
            csv_data,
        });

        // Auto-start campaign immediately
        if (campaign && campaign.id) {
            logger.info('Auto-starting campaign', { campaign_id: campaign.id });
            await campaignService.startCampaign(campaign.id);
        }

        res.json({
            success: true,
            data: campaign,
            message: 'Campaign created and started successfully',
        });
    } catch (error: any) {
        logger.error('Failed to create campaign', { error: error.message, stack: error.stack });
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});

/**
 * GET /api/campaigns/:id
 * Get campaign status
 */
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const status = await campaignService.getCampaignStatus(id);

        res.json({
            success: true,
            data: status,
        });
    } catch (error: any) {
        logger.error('Failed to get campaign status', { error: error.message });
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});

/**
 * POST /api/campaigns/:id/send
 * Send campaign immediately
 */
router.post('/:id/send', async (req, res) => {
    try {
        const { id } = req.params;
        await campaignService.sendCampaign(id);

        res.json({
            success: true,
            message: 'Campaign sending started',
        });
    } catch (error: any) {
        logger.error('Failed to send campaign', { error: error.message });
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});

/**
 * DELETE /api/campaigns/:id
 * Delete campaign
 */
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await campaignService.deleteCampaign(id);

        res.json({
            success: true,
            message: 'Campaign deleted successfully',
        });
    } catch (error: any) {
        logger.error('Failed to delete campaign', { error: error.message });
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});

export default router;
