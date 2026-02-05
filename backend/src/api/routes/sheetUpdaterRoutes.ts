/**
 * AI Sheet Updater Routes
 * API endpoints for managing AI-powered spreadsheet updates
 */

import { Router, Request, Response } from 'express';
import { aiSheetUpdaterService, SheetUpdaterConfig, ValueMapping } from '../../services/aiSheetUpdaterService';
import { googleSheetsWriteService } from '../../services/googleSheetsWriteService';
import { authenticate } from '../middleware/auth';
import { logger } from '../../utils/logger';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/sheet-updater/status
 * Check if sheet write service is ready (checks tenant-specific first, then global fallback)
 */
router.get('/status', async (req: Request, res: Response) => {
    try {
        const tenantId = req.user?.tenant_id;
        
        // Check tenant-specific credentials first
        const isReady = await googleSheetsWriteService.isReadyForTenant(tenantId);
        const serviceEmail = await googleSheetsWriteService.getServiceAccountEmailForTenant(tenantId);

        res.json({
            success: true,
            data: {
                ready: isReady,
                serviceAccountEmail: serviceEmail,
                message: isReady 
                    ? 'Service is ready. Share your spreadsheet with the service account email.'
                    : 'Google Service Account not configured. Go to Settings > Integrations to set up.'
            }
        });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/sheet-updater/validate-sheet
 * Validate if a spreadsheet is accessible for writing
 */
router.post('/validate-sheet', async (req: Request, res: Response) => {
    try {
        const { spreadsheetUrl } = req.body;
        const tenantId = req.user?.tenant_id;

        if (!spreadsheetUrl) {
            return res.status(400).json({ success: false, error: 'spreadsheetUrl is required' });
        }

        const spreadsheetId = googleSheetsWriteService.extractSpreadsheetId(spreadsheetUrl);
        if (!spreadsheetId) {
            return res.status(400).json({ success: false, error: 'Invalid spreadsheet URL' });
        }

        const validation = await googleSheetsWriteService.validateWriteAccess(spreadsheetId, tenantId);

        res.json({
            success: validation.valid,
            data: validation
        });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/sheet-updater/sheet-info
 * Get sheet names and headers for a spreadsheet
 */
router.get('/sheet-info', async (req: Request, res: Response) => {
    try {
        const { spreadsheetUrl, sheetName } = req.query;
        const tenantId = req.user?.tenant_id;

        if (!spreadsheetUrl) {
            return res.status(400).json({ success: false, error: 'spreadsheetUrl is required' });
        }

        const spreadsheetId = googleSheetsWriteService.extractSpreadsheetId(spreadsheetUrl as string);
        if (!spreadsheetId) {
            return res.status(400).json({ success: false, error: 'Invalid spreadsheet URL' });
        }

        const sheets = await googleSheetsWriteService.getSheetNames(spreadsheetId, tenantId);
        
        let headers: string[] = [];
        if (sheetName && sheets.includes(sheetName as string)) {
            headers = await googleSheetsWriteService.getHeaders(spreadsheetId, sheetName as string, tenantId);
        } else if (sheets.length > 0) {
            headers = await googleSheetsWriteService.getHeaders(spreadsheetId, sheets[0], tenantId);
        }

        res.json({
            success: true,
            data: {
                spreadsheetId,
                sheets,
                headers,
                selectedSheet: sheetName || sheets[0]
            }
        });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/sheet-updater/configs/:botId
 * Get all sheet updater configs for a bot
 */
router.get('/configs/:botId', async (req: Request, res: Response) => {
    try {
        const { botId } = req.params;
        const configs = await aiSheetUpdaterService.getConfigsByBot(botId);

        res.json({
            success: true,
            data: configs
        });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/sheet-updater/configs/:botId/by-target/:targetJid
 * Get sheet updater configs linked to a specific target JID
 */
router.get('/configs/:botId/by-target/:targetJid', async (req: Request, res: Response) => {
    try {
        const { botId, targetJid } = req.params;
        const configs = await aiSheetUpdaterService.getConfigsByTargetJid(botId, decodeURIComponent(targetJid));

        res.json({
            success: true,
            data: configs
        });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * DELETE /api/sheet-updater/configs/:botId/by-target/:targetJid
 * Delete sheet updater configs linked to a specific target JID (cascade delete)
 */
router.delete('/configs/:botId/by-target/:targetJid', async (req: Request, res: Response) => {
    try {
        const { botId, targetJid } = req.params;
        const result = await aiSheetUpdaterService.deleteConfigsByTargetJid(botId, decodeURIComponent(targetJid));

        if (!result.success) {
            return res.status(400).json({ success: false, error: result.error });
        }

        res.json({
            success: true,
            data: { deleted: result.deleted }
        });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/sheet-updater/config/:configId
 * Get a single config by ID
 */
router.get('/config/:configId', async (req: Request, res: Response) => {
    try {
        const { configId } = req.params;
        const config = await aiSheetUpdaterService.getConfig(configId);

        if (!config) {
            return res.status(404).json({ success: false, error: 'Config not found' });
        }

        res.json({
            success: true,
            data: config
        });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/sheet-updater/configs
 * Create a new sheet updater config
 */
router.post('/configs', async (req: Request, res: Response) => {
    try {
        const config: SheetUpdaterConfig = req.body;

        if (!config.bot_id || !config.name || !config.spreadsheet_url || 
            !config.sheet_name || !config.match_column || !config.update_column) {
            return res.status(400).json({ 
                success: false, 
                error: 'Missing required fields: bot_id, name, spreadsheet_url, sheet_name, match_column, update_column' 
            });
        }

        // Use default mappings if not provided
        if (!config.value_mappings || config.value_mappings.length === 0) {
            config.value_mappings = aiSheetUpdaterService.constructor.prototype.constructor['DEFAULT_EVENT_MAPPINGS'] 
                || [
                    { keywords: ['hadir', 'datang', 'bisa', 'oke', 'siap', 'yes', 'iya'], value: 'CONFIRMED', emoji: '✅' },
                    { keywords: ['tidak', 'gabisa', 'cancel', 'no', 'izin'], value: 'DECLINED', emoji: '❌' },
                    { keywords: ['mungkin', 'maybe', 'belum tau', 'nanti'], value: 'MAYBE', emoji: '⏳' }
                ];
        }

        if (config.is_enabled === undefined) {
            config.is_enabled = true;
        }

        const result = await aiSheetUpdaterService.createConfig(config);

        if (!result.success) {
            return res.status(400).json({ success: false, error: result.error });
        }

        res.json({
            success: true,
            data: { id: result.id }
        });
    } catch (error: any) {
        logger.error('[SheetUpdaterRoutes] Error creating config:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * PUT /api/sheet-updater/config/:configId
 * Update an existing config
 */
router.put('/config/:configId', async (req: Request, res: Response) => {
    try {
        const { configId } = req.params;
        const updates: Partial<SheetUpdaterConfig> = req.body;

        const result = await aiSheetUpdaterService.updateConfig(configId, updates);

        if (!result.success) {
            return res.status(400).json({ success: false, error: result.error });
        }

        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * DELETE /api/sheet-updater/config/:configId
 * Delete a config
 */
router.delete('/config/:configId', async (req: Request, res: Response) => {
    try {
        const { configId } = req.params;
        const result = await aiSheetUpdaterService.deleteConfig(configId);

        if (!result.success) {
            return res.status(400).json({ success: false, error: result.error });
        }

        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * PATCH /api/sheet-updater/config/:configId/toggle
 * Toggle config enabled/disabled
 */
router.patch('/config/:configId/toggle', async (req: Request, res: Response) => {
    try {
        const { configId } = req.params;
        const result = await aiSheetUpdaterService.toggleConfig(configId);

        if (!result.success) {
            return res.status(400).json({ success: false, error: 'Failed to toggle' });
        }

        res.json({ 
            success: true, 
            data: { is_enabled: result.is_enabled } 
        });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/sheet-updater/test-classify
 * Test message classification without updating sheet
 */
router.post('/test-classify', async (req: Request, res: Response) => {
    try {
        const { message, valueMappings, aiInstructions } = req.body;

        if (!message) {
            return res.status(400).json({ success: false, error: 'message is required' });
        }

        const mappings = valueMappings || [
            { keywords: ['hadir', 'datang', 'bisa', 'oke', 'siap', 'yes', 'iya'], value: 'CONFIRMED', emoji: '✅' },
            { keywords: ['tidak', 'gabisa', 'cancel', 'no', 'izin'], value: 'DECLINED', emoji: '❌' },
            { keywords: ['mungkin', 'maybe', 'belum tau', 'nanti'], value: 'MAYBE', emoji: '⏳' }
        ];

        const result = await aiSheetUpdaterService.classifyMessage(
            message,
            mappings,
            aiInstructions
        );

        res.json({
            success: true,
            data: result
        });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/sheet-updater/test-update
 * Test the full flow: classify + find row + update
 */
router.post('/test-update', async (req: Request, res: Response) => {
    try {
        const { botId, phone, message } = req.body;

        if (!botId || !phone || !message) {
            return res.status(400).json({ 
                success: false, 
                error: 'botId, phone, and message are required' 
            });
        }

        const result = await aiSheetUpdaterService.processMessage(botId, phone, message);

        res.json({
            success: result.success,
            data: result
        });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/sheet-updater/logs/:configId
 * Get update logs for a config
 */
router.get('/logs/:configId', async (req: Request, res: Response) => {
    try {
        const { configId } = req.params;
        const limit = parseInt(req.query.limit as string) || 50;

        const logs = await aiSheetUpdaterService.getUpdateLogs(configId, limit);

        res.json({
            success: true,
            data: logs
        });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/sheet-updater/default-mappings
 * Get default value mappings for different use cases
 */
router.get('/default-mappings', (req: Request, res: Response) => {
    res.json({
        success: true,
        data: {
            event: [
                { keywords: ['hadir', 'datang', 'bisa', 'oke', 'siap', 'gas', 'ikut', 'join', 'yes', 'iya', 'yoi', 'confirm', 'acc'], value: 'CONFIRMED', emoji: '✅' },
                { keywords: ['tidak', 'gabisa', 'ga bisa', 'gak bisa', 'cancel', 'batal', 'skip', 'no', 'nope', 'absent', 'izin', 'halangan'], value: 'DECLINED', emoji: '❌' },
                { keywords: ['mungkin', 'maybe', 'belum tau', 'belum tahu', 'nanti', 'liat nanti', 'tentative', 'pending'], value: 'MAYBE', emoji: '⏳' }
            ],
            order: [
                { keywords: ['sudah bayar', 'sudah transfer', 'udah tf', 'done', 'paid', 'lunas'], value: 'PAID', emoji: '💰' },
                { keywords: ['belum', 'nanti', 'pending'], value: 'PENDING', emoji: '⏳' },
                { keywords: ['cancel', 'batal', 'ga jadi'], value: 'CANCELLED', emoji: '❌' }
            ],
            survey: [
                { keywords: ['bagus', 'puas', 'mantap', 'oke', 'good', 'great', 'excellent'], value: 'POSITIVE', emoji: '👍' },
                { keywords: ['biasa', 'lumayan', 'cukup', 'so so'], value: 'NEUTRAL', emoji: '😐' },
                { keywords: ['kurang', 'jelek', 'bad', 'buruk', 'kecewa'], value: 'NEGATIVE', emoji: '👎' }
            ],
            lead: [
                { keywords: ['tertarik', 'mau', 'berminat', 'interested', 'yes'], value: 'HOT', emoji: '🔥' },
                { keywords: ['nanti', 'pikir dulu', 'maybe', 'belum yakin'], value: 'WARM', emoji: '🌡️' },
                { keywords: ['tidak', 'no', 'ga', 'skip'], value: 'COLD', emoji: '❄️' }
            ]
        }
    });
});

export default router;
