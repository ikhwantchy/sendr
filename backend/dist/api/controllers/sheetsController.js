"use strict";
/**
 * Google Sheets Utility Controller
 * Uses public CSV export (no API key required!)
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderPreview = exports.previewDigest = exports.getSheetTabs = void 0;
const googleSheetsService_1 = __importDefault(require("../../services/googleSheetsService"));
/**
 * GET /api/sheets/tabs
 * Detects all available tabs in a Google Sheets document using HTML scraping
 *
 * Query params:
 *   - url: Google Sheets URL (required)
 *
 * Returns:
 *   - tabs: Array of { name: string, gid: string }
 */
const getSheetTabs = async (req, res) => {
    try {
        const { url } = req.query;
        if (!url || typeof url !== 'string') {
            return res.status(400).json({
                success: false,
                message: 'URL parameter is required'
            });
        }
        // Extract spreadsheet ID from URL
        const spreadsheetId = googleSheetsService_1.default.extractSpreadsheetId(url);
        if (!spreadsheetId) {
            return res.status(400).json({
                success: false,
                message: 'Invalid Google Sheets URL'
            });
        }
        console.log('[Sheets] Fetching tabs for spreadsheet:', spreadsheetId);
        // Use new public sheets service (no API key needed!)
        const sheetNames = await googleSheetsService_1.default.getSheetNames(spreadsheetId);
        if (sheetNames.length === 0) {
            // Return success but with empty array - user can input manually
            return res.json({
                success: true,
                tabs: [],
                message: 'Could not auto-detect tabs. Please enter tab name manually.'
            });
        }
        // Convert to expected format (gid is not available without API, use index)
        const tabs = sheetNames.map((name, index) => ({
            gid: String(index),
            name: name
        }));
        console.log('[Sheets] Successfully extracted tabs:', tabs);
        res.json({
            success: true,
            tabs
        });
    }
    catch (error) {
        console.error('[Sheets] Error fetching sheet tabs:', error);
        // Return success with empty array instead of error
        // This allows user to input tab name manually
        res.json({
            success: true,
            tabs: [],
            message: 'Could not auto-detect tabs. Please enter tab name manually.',
            error: error.message
        });
    }
};
exports.getSheetTabs = getSheetTabs;
/**
 * POST /api/sheets/preview-digest
 * Generates a preview of the digest message using real data from the sheet
 *
 * Body:
 *   - url: string
 *   - selectedSheets: string[]
 *   - template: string
 *   - timezone: string (optional)
 */
const date_fns_1 = require("date-fns");
const templateEngineService_1 = __importDefault(require("../../services/templateEngineService"));
const smartSheetsProcessor_1 = __importDefault(require("../../services/smartSheetsProcessor"));
const enhancedTemplateRenderer_1 = __importDefault(require("../../services/enhancedTemplateRenderer"));
const previewDigest = async (req, res) => {
    try {
        const { url, selectedSheets, template, timezone = 'Asia/Jakarta', triggerColumn, triggerValue, filters, sort, useEnhancedRenderer = true // Flag to use new renderer
         } = req.body;
        if (!url || !selectedSheets || !Array.isArray(selectedSheets) || !template) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: url, selectedSheets, template'
            });
        }
        const spreadsheetId = googleSheetsService_1.default.extractSpreadsheetId(url);
        if (!spreadsheetId) {
            return res.status(400).json({ success: false, message: 'Invalid Google Sheets URL' });
        }
        // Fetch needed sheets
        const sheetsData = await googleSheetsService_1.default.fetchMultipleSheets(spreadsheetId, selectedSheets);
        // Convert to objects
        const dataObjects = sheetsData.map(sheet => ({
            name: sheet.sheetName,
            data: googleSheetsService_1.default.convertToObjects(sheet),
        }));
        let items = dataObjects[0]?.data || [];
        // Apply legacy trigger filtering if provided (backward compatibility)
        if (triggerColumn && triggerValue) {
            const val = String(triggerValue).toLowerCase();
            items = items.filter(item => String(item[triggerColumn] || '').toLowerCase() === val);
        }
        // Apply new filters if provided
        if (filters && Array.isArray(filters) && filters.length > 0) {
            items = smartSheetsProcessor_1.default.processData(items, {
                filters,
                sort
            });
        }
        // Use enhanced renderer if flag is set and template uses new syntax (flexible regex)
        const hasEnhancedSyntax = /{{\s*#each/.test(template) ||
            /{{\s*#if/.test(template) ||
            /{{\s*#group/.test(template);
        if (useEnhancedRenderer && hasEnhancedSyntax) {
            console.log(`🚀 [Preview] Render started. Items: ${items.length}, Template Length: ${template.length}`);
            if (items.length > 0) {
                console.log(`📊 [Preview] Sample Entry Keys: ${Object.keys(items[0]).join(', ')}`);
            }
            const preview = enhancedTemplateRenderer_1.default.render(template, {
                data: items,
                globalVars: {
                    '@today': (0, date_fns_1.format)(new Date(), 'dd/MM/yyyy'),
                    '@today_name': ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'][new Date().getDay()]
                },
                timezone
            });
            console.log(`✅ [Preview] Render complete. Result length: ${preview.length}`);
            return res.json({
                success: true,
                preview,
                itemsCount: items.length,
                renderer: 'enhanced'
            });
        }
        // Legacy rendering (backward compatibility)
        // 1. Process as General Template with Loops if needed
        if (template.includes('{{#LOOP}}') || template.includes('{{')) {
            const preview = templateEngineService_1.default.renderGeneralTemplate(template, items, {
                TODAY: new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })
            });
            return res.json({
                success: true,
                preview,
                itemsCount: items.length,
                renderer: 'legacy'
            });
        }
        // 2. Fallback: Academic Digest (Legacy)
        const scheduleSheet = dataObjects.find(s => s.name.toLowerCase().includes('jadwal') || s.name.toLowerCase().includes('schedule'));
        const tasksSheet = dataObjects.find(s => s.name.toLowerCase().includes('tugas') || s.name.toLowerCase().includes('task'));
        const variables = templateEngineService_1.default.generateAcademicDigestVariables(scheduleSheet?.data || [], tasksSheet?.data || [], timezone);
        const preview = templateEngineService_1.default.processTemplate(template, variables);
        res.json({
            success: true,
            preview,
            variables,
            renderer: 'academic'
        });
    }
    catch (error) {
        console.error('[Sheets] Preview error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate preview',
            error: error.message
        });
    }
};
exports.previewDigest = previewDigest;
/**
 * POST /api/sheets/render-preview
 * Renders a Handlebars template with sample data from Google Sheets
 */
const renderPreview = async (req, res) => {
    try {
        const { url, sheetName, template, sampleSize = 5 } = req.body;
        if (!url || !template) {
            return res.status(400).json({
                success: false,
                message: 'URL and template are required'
            });
        }
        // Extract spreadsheet ID
        const spreadsheetId = googleSheetsService_1.default.extractSpreadsheetId(url);
        if (!spreadsheetId) {
            return res.status(400).json({
                success: false,
                message: 'Invalid Google Sheets URL'
            });
        }
        // Fetch sample data
        const sheetData = await googleSheetsService_1.default.fetchSheetData(spreadsheetId, sheetName || 'Sheet1');
        if (!sheetData) {
            return res.status(404).json({
                success: false,
                message: 'Could not fetch sheet data'
            });
        }
        // Convert to objects
        const objects = googleSheetsService_1.default.convertToObjects(sheetData);
        const sampleData = objects.slice(0, parseInt(sampleSize));
        // Render template
        const templateRenderingService = require('../../services/templateRenderingService').default;
        const rendered = templateRenderingService.renderWithSheetData(template, sampleData);
        res.json({
            success: true,
            rendered,
            sampleData,
            totalRows: objects.length
        });
    }
    catch (error) {
        console.error('[Sheets] Render preview error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to render preview',
            error: error.message
        });
    }
};
exports.renderPreview = renderPreview;
//# sourceMappingURL=sheetsController.js.map