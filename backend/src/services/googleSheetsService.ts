import { google } from 'googleapis';

interface SheetData {
    sheetName: string;
    headers: string[];
    rows: any[][];
}

interface GoogleSheetsConfig {
    spreadsheetId: string;
    apiKey?: string;
}

/**
 * Google Sheets Service
 * Handles fetching data from Google Sheets using public access (no OAuth required for public sheets)
 */
class GoogleSheetsService {
    private sheets;

    constructor() {
        // Initialize Google Sheets API
        this.sheets = google.sheets('v4');
    }

    /**
     * Extract spreadsheet ID from Google Sheets URL
     */
    extractSpreadsheetId(url: string): string | null {
        try {
            // Format: https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}/edit...
            const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
            return match ? match[1] : null;
        } catch (error) {
            console.error('Error extracting spreadsheet ID:', error);
            return null;
        }
    }

    /**
     * Fetch data from a specific sheet
     */
    async fetchSheetData(spreadsheetId: string, sheetName: string): Promise<SheetData | null> {
        try {
            const response = await this.sheets.spreadsheets.values.get({
                spreadsheetId,
                range: `${sheetName}!A:Z`, // Fetch columns A to Z
                key: process.env.GOOGLE_API_KEY, // API key for public sheets
            });

            const rows = response.data.values || [];

            if (rows.length === 0) {
                return null;
            }

            // First row is headers
            const headers = rows[0] as string[];
            const dataRows = rows.slice(1);

            return {
                sheetName,
                headers,
                rows: dataRows,
            };
        } catch (error: any) {
            console.error(`Error fetching sheet data for ${sheetName}:`, error.message);
            throw new Error(`Failed to fetch sheet data: ${error.message}`);
        }
    }

    /**
     * Get all sheet names from a spreadsheet
     */
    async getSheetNames(spreadsheetId: string): Promise<string[]> {
        try {
            const response = await this.sheets.spreadsheets.get({
                spreadsheetId,
                key: process.env.GOOGLE_API_KEY,
            });

            const sheets = response.data.sheets || [];
            return sheets.map(sheet => sheet.properties?.title || '').filter(Boolean);
        } catch (error: any) {
            console.error('Error fetching sheet names:', error.message);
            throw new Error(`Failed to fetch sheet names: ${error.message}`);
        }
    }

    /**
     * Fetch multiple sheets at once
     */
    async fetchMultipleSheets(spreadsheetId: string, sheetNames: string[]): Promise<SheetData[]> {
        try {
            const promises = sheetNames.map(name => this.fetchSheetData(spreadsheetId, name));
            const results = await Promise.all(promises);
            return results.filter((data): data is SheetData => data !== null);
        } catch (error: any) {
            console.error('Error fetching multiple sheets:', error.message);
            throw new Error(`Failed to fetch multiple sheets: ${error.message}`);
        }
    }

    /**
     * Convert sheet data to array of objects (with headers as keys)
     */
    convertToObjects(sheetData: SheetData): any[] {
        const { headers, rows } = sheetData;

        return rows.map(row => {
            const obj: any = {};
            headers.forEach((header, index) => {
                obj[header] = row[index] || '';
            });
            return obj;
        });
    }

    /**
     * Validate if a Google Sheets URL is accessible
     */
    async validateSheetAccess(url: string): Promise<{ valid: boolean; message: string; spreadsheetId?: string }> {
        try {
            const spreadsheetId = this.extractSpreadsheetId(url);

            if (!spreadsheetId) {
                return { valid: false, message: 'Invalid Google Sheets URL format' };
            }

            // Try to fetch sheet names to validate access
            const sheetNames = await this.getSheetNames(spreadsheetId);

            if (sheetNames.length === 0) {
                return { valid: false, message: 'No sheets found in the spreadsheet' };
            }

            return {
                valid: true,
                message: 'Spreadsheet is accessible',
                spreadsheetId,
            };
        } catch (error: any) {
            if (error.message.includes('403')) {
                return { valid: false, message: 'Access denied. Make sure the spreadsheet is shared publicly.' };
            }
            if (error.message.includes('404')) {
                return { valid: false, message: 'Spreadsheet not found. Check the URL.' };
            }
            return { valid: false, message: `Error: ${error.message}` };
        }
    }
}

export default new GoogleSheetsService();
