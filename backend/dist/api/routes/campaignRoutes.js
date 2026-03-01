"use strict";
/**
 * Campaign API Routes
 * ============================================
 * Complete CRUD + management for campaigns
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const campaignService_1 = require("../../modules/campaign/campaignService");
const campaignSchedulerService_1 = __importDefault(require("../../services/campaignSchedulerService"));
const logger_1 = require("../../utils/logger");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
/**
 * GET /api/campaigns
 * List all campaigns for tenant
 */
router.get('/', async (req, res) => {
    try {
        const tenantId = req.user?.tenant_id || '00000000-0000-0000-0000-000000000001';
        const { bot_id, status, limit = '50', offset = '0' } = req.query;
        const campaigns = await campaignService_1.campaignService.listCampaigns(tenantId, bot_id, status, parseInt(limit), parseInt(offset));
        res.json({
            success: true,
            data: campaigns,
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to list campaigns', { error: error.message });
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});
/**
 * GET /api/campaigns/stats
 * Get campaign statistics
 */
router.get('/stats', async (req, res) => {
    try {
        const tenantId = req.user?.tenant_id || '00000000-0000-0000-0000-000000000001';
        const { bot_id } = req.query;
        const stats = await campaignService_1.campaignService.getCampaignStats(tenantId, bot_id);
        res.json({
            success: true,
            data: stats,
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to get campaign stats', { error: error.message });
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});
/**
 * GET /api/campaigns/variables
 * Get available template variables
 */
router.get('/variables', async (req, res) => {
    try {
        const variables = campaignService_1.campaignService.getAvailableVariables();
        res.json({
            success: true,
            data: variables,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});
/**
 * GET /api/campaigns/anti-spam-presets
 * Get anti-spam configuration presets
 */
router.get('/anti-spam-presets', async (req, res) => {
    try {
        const presets = campaignSchedulerService_1.default.getAntiSpamPresets();
        res.json({
            success: true,
            data: presets,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});
/**
 * GET /api/campaigns/bot/:botId
 * List campaigns for a specific bot
 */
router.get('/bot/:botId', async (req, res) => {
    const { botId } = req.params;
    try {
        const tenantId = req.user?.tenant_id;
        const campaigns = await campaignService_1.campaignService.listCampaigns(tenantId, botId);
        res.json({
            success: true,
            data: campaigns,
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to list bot campaigns', { bot_id: botId, error: error.message });
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
        const { bot_id, name, message_template, contact_source, contacts, // For manual/csv
        manual_contacts, // Manual text input
        csv_data, // CSV text data
        sheets_url, // Google Sheets URL
        sheets_tab, // Sheet tab name
        delay_preset, custom_delay_config, image_url, scheduled_at, start_immediately, 
        // WABA fields
        campaign_type, template_name, template_language, template_components_json, } = req.body;
        // Validation: for freetext campaigns require message_template; for template campaigns require template_name
        const isFreetext = !campaign_type || campaign_type === 'freetext';
        if (!bot_id || !name) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: bot_id, name',
            });
        }
        if (isFreetext && !message_template) {
            return res.status(400).json({ success: false, error: 'message_template is required for freetext campaigns' });
        }
        if (!isFreetext && !template_name) {
            return res.status(400).json({ success: false, error: 'template_name is required for template campaigns' });
        }
        // Parse contacts based on source
        let finalContacts = contacts || [];
        let detectedHeaders = [];
        if (contact_source === 'manual' && manual_contacts) {
            const result = campaignService_1.campaignService.parseManualContacts(manual_contacts);
            finalContacts = result.contacts;
            detectedHeaders = result.headers;
        }
        else if (contact_source === 'csv' && csv_data) {
            const result = campaignService_1.campaignService.parseCSVContacts(csv_data);
            finalContacts = result.contacts;
            detectedHeaders = result.headers;
        }
        // For sheets, contacts will be fetched in service if not provided in 'contacts'
        const campaign = await campaignService_1.campaignService.createCampaign({
            tenant_id: tenantId,
            bot_id,
            name,
            message_template: message_template || ' ',
            contact_source: contact_source || 'manual',
            contacts: finalContacts,
            sheets_url,
            sheets_tab,
            delay_preset: delay_preset || 'moderate',
            custom_delay_config,
            image_url,
            scheduled_at,
            campaign_type: campaign_type || 'freetext',
            template_name: template_name || undefined,
            template_language: template_language || 'id',
            template_components_json: template_components_json || undefined,
        });
        // Start immediately if requested and not scheduled
        if (start_immediately && !scheduled_at) {
            await campaignSchedulerService_1.default.startCampaign(campaign.id);
            campaign.status = 'running';
        }
        res.json({
            success: true,
            data: campaign,
            message: start_immediately ? 'Campaign created and started' : 'Campaign created successfully',
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to create campaign', { error: error.message, stack: error.stack });
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});
/**
 * POST /api/campaigns/preview-contacts
 * Preview contacts from various sources before creating campaign
 */
router.post('/preview-contacts', async (req, res) => {
    try {
        const { source, data, sheets_url, sheets_tab } = req.body;
        let contacts = [];
        let headers = [];
        if (source === 'manual') {
            const result = campaignService_1.campaignService.parseManualContacts(data || '');
            contacts = result.contacts;
            headers = result.headers;
        }
        else if (source === 'csv') {
            const result = campaignService_1.campaignService.parseCSVContacts(data || '');
            contacts = result.contacts;
            headers = result.headers;
        }
        else if (source === 'sheets' && sheets_url) {
            const result = await campaignService_1.campaignService.fetchSheetsContacts(sheets_url, sheets_tab);
            contacts = result.contacts;
            headers = result.headers;
        }
        // Return preview (limit to 10 for preview)
        res.json({
            success: true,
            data: {
                total: contacts.length,
                preview: contacts.slice(0, 10),
                columns: headers.length > 0 ? headers : (contacts.length > 0 ? Object.keys(contacts[0]) : []),
                headers: headers
            },
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});
/**
 * GET /api/campaigns/:id
 * Get campaign details
 */
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const campaign = await campaignService_1.campaignService.getCampaign(id);
        if (!campaign) {
            return res.status(404).json({
                success: false,
                error: 'Campaign not found',
            });
        }
        res.json({
            success: true,
            data: campaign,
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to get campaign', { error: error.message });
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});
/**
 * GET /api/campaigns/:id/recipients
 * Get campaign recipients with pagination
 */
router.get('/:id/recipients', async (req, res) => {
    try {
        const { id } = req.params;
        const { status, limit = '50', offset = '0' } = req.query;
        const result = await campaignService_1.campaignService.getCampaignRecipients(id, status, parseInt(limit), parseInt(offset));
        res.json({
            success: true,
            ...result,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});
/**
 * POST /api/campaigns/:id/start
 * Start campaign immediately
 */
router.post('/:id/start', async (req, res) => {
    try {
        const { id } = req.params;
        await campaignSchedulerService_1.default.startCampaign(id);
        res.json({
            success: true,
            message: 'Campaign started',
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to start campaign', { error: error.message });
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});
/**
 * POST /api/campaigns/:id/pause
 * Pause running campaign
 */
router.post('/:id/pause', async (req, res) => {
    try {
        const { id } = req.params;
        await campaignSchedulerService_1.default.pauseCampaign(id);
        res.json({
            success: true,
            message: 'Campaign paused',
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to pause campaign', { error: error.message });
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});
/**
 * POST /api/campaigns/:id/resume
 * Resume paused campaign
 */
router.post('/:id/resume', async (req, res) => {
    try {
        const { id } = req.params;
        await campaignSchedulerService_1.default.resumeCampaign(id);
        res.json({
            success: true,
            message: 'Campaign resumed',
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to resume campaign', { error: error.message });
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});
/**
 * POST /api/campaigns/:id/cancel
 * Cancel campaign
 */
router.post('/:id/cancel', async (req, res) => {
    try {
        const { id } = req.params;
        await campaignSchedulerService_1.default.cancelCampaign(id);
        res.json({
            success: true,
            message: 'Campaign cancelled',
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to cancel campaign', { error: error.message });
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});
/**
 * POST /api/campaigns/:id/retry-failed
 * Retry failed recipients
 */
router.post('/:id/retry-failed', async (req, res) => {
    try {
        const { id } = req.params;
        const count = await campaignService_1.campaignService.retryFailedRecipients(id);
        res.json({
            success: true,
            message: `Retrying ${count} failed recipients`,
            data: { count },
        });
    }
    catch (error) {
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
        await campaignService_1.campaignService.deleteCampaign(id);
        res.json({
            success: true,
            message: 'Campaign deleted successfully',
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to delete campaign', { error: error.message });
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});
// Legacy route for backward compatibility
router.post('/:id/send', async (req, res) => {
    try {
        const { id } = req.params;
        await campaignSchedulerService_1.default.startCampaign(id);
        res.json({
            success: true,
            message: 'Campaign sending started',
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});
exports.default = router;
//# sourceMappingURL=campaignRoutes.js.map