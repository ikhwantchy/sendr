/**
 * Google Sheets Utility Controller
 * Uses Google Sheets API v4 to fetch sheet metadata
 */

import { Request, Response } from 'express';

/**
 * GET /api/sheets/tabs
 * Detects all available tabs in a Google Sheets document using Google Sheets API
 * 
 * Query params:
 *   - url: Google Sheets URL (required)
 * 
 * Returns:
 *   - tabs: Array of { name: string, gid: string }
 */
export const getSheetTabs = async (req: Request, res: Response) => {
    try {
        // Read API key at runtime (not at import time) to ensure dotenv has loaded
        const GOOGLE_SHEETS_API_KEY = process.env.GOOGLE_SHEETS_API_KEY;

        const { url } = req.query;

        if (!url || typeof url !== 'string') {
            return res.status(400).json({
                success: false,
                message: 'URL parameter is required'
            });
        }

        // Extract spreadsheet ID from URL
        const match = url.match(/\/d\/([\w-]+)/);
        if (!match || !match[1]) {
            return res.status(400).json({
                success: false,
                message: 'Invalid Google Sheets URL'
            });
        }

        const spreadsheetId = match[1];

        if (!GOOGLE_SHEETS_API_KEY) {
            console.error('[Sheets] GOOGLE_SHEETS_API_KEY not configured');
            return res.status(500).json({
                success: false,
                message: 'Google Sheets API is not configured on the server'
            });
        }

        // Use Google Sheets API v4 to get spreadsheet metadata
        const apiUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?key=${GOOGLE_SHEETS_API_KEY}&fields=sheets.properties`;

        console.log('[Sheets] Fetching from API');

        const response = await fetch(apiUrl);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[Sheets] API error:', response.status, errorText);

            if (response.status === 403) {
                return res.status(403).json({
                    success: false,
                    message: 'Sheet is private or API key is invalid. Ensure the sheet is set to "Anyone with the link can view".'
                });
            }

            return res.status(400).json({
                success: false,
                message: `Failed to fetch sheet metadata (HTTP ${response.status})`
            });
        }

        const data: any = await response.json();

        if (!data.sheets || !Array.isArray(data.sheets)) {
            return res.status(404).json({
                success: false,
                message: 'No sheets found in the spreadsheet'
            });
        }

        // Extract tab names and IDs
        const tabs = data.sheets.map((sheet: any) => ({
            gid: String(sheet.properties.sheetId),
            name: sheet.properties.title
        }));

        console.log('[Sheets] Successfully extracted tabs:', tabs);

        res.json({
            success: true,
            tabs
        });

    } catch (error: any) {
        console.error('[Sheets] Error fetching sheet tabs:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error while fetching tabs',
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
import googleSheetsService from '../../services/googleSheetsService';
import templateEngineService from '../../services/templateEngineService';

export const previewDigest = async (req: Request, res: Response) => {
    try {
        const { url, selectedSheets, template, timezone = 'Asia/Jakarta' } = req.body;

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

        // Fetch needed sheets
        const sheetsData = await googleSheetsService.fetchMultipleSheets(spreadsheetId, selectedSheets);

        // Convert to objects
        const dataObjects = sheetsData.map(sheet => ({
            name: sheet.sheetName,
            data: googleSheetsService.convertToObjects(sheet),
        }));

        // Find schedule and tasks sheets
        const scheduleSheet = dataObjects.find(s =>
            s.name.toLowerCase().includes('jadwal') || s.name.toLowerCase().includes('schedule')
        );
        const tasksSheet = dataObjects.find(s =>
            s.name.toLowerCase().includes('tugas') || s.name.toLowerCase().includes('task')
        );

        // Generate variables
        const variables = templateEngineService.generateAcademicDigestVariables(
            scheduleSheet?.data || [],
            tasksSheet?.data || [],
            timezone
        );

        // Process template
        const preview = templateEngineService.processTemplate(template, variables);

        res.json({
            success: true,
            preview,
            variables // Return raw variables too if needed for debugging
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
