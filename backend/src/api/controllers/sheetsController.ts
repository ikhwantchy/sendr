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
