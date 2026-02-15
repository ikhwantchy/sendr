/**
 * Google Sheets Utility Controller
 * Uses public CSV export (no API key required!)
 */

import { Request, Response } from 'express';
import googleSheetsService from '../../services/googleSheetsService';

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
export const getSheetTabs = async (req: Request, res: Response) => {
    try {
        const { url } = req.query;

        if (!url || typeof url !== 'string') {
            return res.status(400).json({
                success: false,
                message: 'URL parameter is required'
            });
        }

        // Extract spreadsheet ID from URL
        const spreadsheetId = googleSheetsService.extractSpreadsheetId(url);
        if (!spreadsheetId) {
            return res.status(400).json({
                success: false,
                message: 'Invalid Google Sheets URL'
            });
        }

        console.log('[Sheets] Fetching tabs for spreadsheet:', spreadsheetId);

        // Use new public sheets service (no API key needed!)
        const sheetNames = await googleSheetsService.getSheetNames(spreadsheetId);

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

    } catch (error: any) {
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
import { format } from 'date-fns';
import templateEngineService from '../../services/templateEngineService';
import smartSheetsProcessor from '../../services/smartSheetsProcessor';
import enhancedTemplateRenderer from '../../services/enhancedTemplateRenderer';

export const previewDigest = async (req: Request, res: Response) => {
    try {
        const {
            url,
            selectedSheets,
            template,
            timezone = 'Asia/Jakarta',
            triggerColumn,
            triggerValue,
            filters,
            sort,
            useEnhancedRenderer = true
        } = req.body;

        if (!url || !selectedSheets || !Array.isArray(selectedSheets) || !template) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: url, selectedSheets, template'
            });
        }

        const spreadsheetId = googleSheetsService.extractSpreadsheetId(url);
        if (!spreadsheetId) {
            return res.status(400).json({ success: false, message: 'Invalid Google Sheets URL' });
        }

        // Check if template uses multi-sheet sections
        const hasSections = /\{\{\s*#section/.test(template);

        // Determine which sheets to fetch
        let sheetsToFetch = [...selectedSheets];
        if (hasSections) {
            // Extract section sheet names from template
            // Extract section sheet names from template
            // Matches {{#section "Sheet Name"}} or {{#section SheetName filter:...}}
            // Group 1 captures the sheet name. It stops at the first unquoted space or quote.
            const sectionNameRegex = /\{\{\s*#section\s+(?:["']([^"']+)["']|([^\s"'}]+))/g;
            let sMatch;
            while ((sMatch = sectionNameRegex.exec(template)) !== null) {
                // if quoted match (group 1) usually has spaces, otherwise group 2
                const sectionSheet = (sMatch[1] || sMatch[2]).trim();
                if (!sheetsToFetch.find(s => s.toLowerCase() === sectionSheet.toLowerCase())) {
                    sheetsToFetch.push(sectionSheet);
                }
            }
            console.log(`📋 [Preview] Multi-section detected. Fetching sheets: ${sheetsToFetch.join(', ')}`);
        }

        // Fetch needed sheets
        const sheetsData = await googleSheetsService.fetchMultipleSheets(spreadsheetId, sheetsToFetch);

        // Convert to objects
        const dataObjects = sheetsData.map(sheet => ({
            name: sheet.sheetName,
            data: googleSheetsService.convertToObjects(sheet),
        }));

        let items = dataObjects[0]?.data || [];

        // Apply legacy trigger filtering if provided (backward compatibility)
        if (triggerColumn && triggerValue) {
            const val = String(triggerValue).toLowerCase();
            items = items.filter(item => String(item[triggerColumn] || '').toLowerCase() === val);
        }

        // Apply new filters if provided
        if (filters && Array.isArray(filters) && filters.length > 0) {
            items = smartSheetsProcessor.processData(items, {
                filters,
                sort
            });
        }

        // Use enhanced renderer if flag is set and template uses new syntax
        const hasEnhancedSyntax = /\{\{\s*#each/.test(template) ||
            /\{\{\s*#if/.test(template) ||
            /\{\{\s*#group/.test(template) ||
            hasSections;

        if (useEnhancedRenderer && hasEnhancedSyntax) {
            // Build sheetsData map for multi-section templates
            let sheetsDataMap: Record<string, any[]> | undefined;
            if (hasSections) {
                sheetsDataMap = {};
                for (const obj of dataObjects) {
                    sheetsDataMap[obj.name] = obj.data;
                }
                console.log(`📊 [Preview] SheetsData loaded: ${Object.entries(sheetsDataMap).map(([k, v]) => `${k}(${v.length})`).join(', ')}`);
            }

            console.log(`🚀 [Preview] Render started. Items: ${items.length}, Template Length: ${template.length}, HasSections: ${hasSections}`);

            const preview = enhancedTemplateRenderer.render(template, {
                data: items,
                globalVars: {
                    '@today': format(new Date(), 'dd/MM/yyyy'),
                    '@today_name': ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'][new Date().getDay()]
                },
                timezone,
                sheetsData: sheetsDataMap
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
        if (template.includes('{{#LOOP}}') || template.includes('{{')) {
            const preview = templateEngineService.renderGeneralTemplate(template, items, {
                TODAY: new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })
            });

            return res.json({
                success: true,
                preview,
                itemsCount: items.length,
                renderer: 'legacy'
            });
        }

        // Fallback: Academic Digest (Legacy)
        const scheduleSheet = dataObjects.find(s =>
            s.name.toLowerCase().includes('jadwal') || s.name.toLowerCase().includes('schedule')
        );
        const tasksSheet = dataObjects.find(s =>
            s.name.toLowerCase().includes('tugas') || s.name.toLowerCase().includes('task')
        );

        const variables = templateEngineService.generateAcademicDigestVariables(
            scheduleSheet?.data || [],
            tasksSheet?.data || [],
            timezone
        );

        const preview = templateEngineService.processTemplate(template, variables);

        res.json({
            success: true,
            preview,
            variables,
            renderer: 'academic'
        });

    } catch (error: any) {
        console.error('[Sheets] Preview error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate preview',
            error: error.message
        });
    }
};

/**
 * GET /api/sheets/columns
 * Fetch column headers and sample data from a specific sheet tab
 * 
 * Query params:
 *   - url: Google Sheets URL (required)
 *   - tab: Sheet tab name (optional, defaults to first tab)
 * 
 * Returns:
 *   - columns: string[] (header names)
 *   - sampleData: object[] (first 5 rows as objects)
 *   - totalRows: number
 */
export const getSheetColumns = async (req: Request, res: Response) => {
    try {
        const { url, tab } = req.query;

        if (!url || typeof url !== 'string') {
            return res.status(400).json({
                success: false,
                message: 'URL parameter is required'
            });
        }

        const spreadsheetId = googleSheetsService.extractSpreadsheetId(url);
        if (!spreadsheetId) {
            return res.status(400).json({
                success: false,
                message: 'Invalid Google Sheets URL'
            });
        }

        const sheetName = (tab as string) || 'Sheet1';
        const sheetData = await googleSheetsService.fetchSheetData(spreadsheetId, sheetName);

        if (!sheetData) {
            return res.status(404).json({
                success: false,
                message: 'Could not fetch sheet data. Check URL and tab name.'
            });
        }

        const objects = googleSheetsService.convertToObjects(sheetData);

        res.json({
            success: true,
            columns: sheetData.headers.map(h => h.trim()).filter(h => h),
            sampleData: objects.slice(0, 5),
            totalRows: objects.length
        });

    } catch (error: any) {
        console.error('[Sheets] Columns error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch columns',
            error: error.message
        });
    }
};

/**
 * POST /api/sheets/render-preview
 * Renders a Handlebars template with sample data from Google Sheets
 */
export const renderPreview = async (req: Request, res: Response) => {
    try {
        const { url, sheetName, template, sampleSize = 5 } = req.body;

        if (!url || !template) {
            return res.status(400).json({
                success: false,
                message: 'URL and template are required'
            });
        }

        // Extract spreadsheet ID
        const spreadsheetId = googleSheetsService.extractSpreadsheetId(url);
        if (!spreadsheetId) {
            return res.status(400).json({
                success: false,
                message: 'Invalid Google Sheets URL'
            });
        }

        // Fetch sample data
        const sheetData = await googleSheetsService.fetchSheetData(spreadsheetId, sheetName || 'Sheet1');
        if (!sheetData) {
            return res.status(404).json({
                success: false,
                message: 'Could not fetch sheet data'
            });
        }

        // Convert to objects
        const objects = googleSheetsService.convertToObjects(sheetData);
        const sampleData = objects.slice(0, parseInt(sampleSize as any));

        // Render template
        const templateRenderingService = require('../../services/templateRenderingService').default;
        const rendered = templateRenderingService.renderWithSheetData(template, sampleData);

        res.json({
            success: true,
            rendered,
            sampleData,
            totalRows: objects.length
        });

    } catch (error: any) {
        console.error('[Sheets] Render preview error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to render preview',
            error: error.message
        });
    }
};
