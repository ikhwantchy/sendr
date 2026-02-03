"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
/**
 * Google Sheets Service - Public Access Only
 * Fetches data from public Google Sheets using CSV export (no API key required!)
 */
class GoogleSheetsService {
    /**
     * Extract spreadsheet ID from Google Sheets URL
     */
    extractSpreadsheetId(url) {
        try {
            // Format: https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}/edit...
            const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
            return match ? match[1] : null;
        }
        catch (error) {
            console.error('Error extracting spreadsheet ID:', error);
            return null;
        }
    }
    /**
     * Parse CSV text to 2D array
     */
    parseCSV(csvText) {
        const rows = [];
        let currentRow = [];
        let currentField = '';
        let insideQuotes = false;
        for (let i = 0; i < csvText.length; i++) {
            const char = csvText[i];
            const nextChar = csvText[i + 1];
            if (char === '"') {
                if (insideQuotes && nextChar === '"') {
                    // Escaped quote
                    currentField += '"';
                    i++; // Skip next quote
                }
                else {
                    // Toggle quote state
                    insideQuotes = !insideQuotes;
                }
            }
            else if (char === ',' && !insideQuotes) {
                // End of field
                currentRow.push(currentField);
                currentField = '';
            }
            else if ((char === '\n' || char === '\r') && !insideQuotes) {
                // End of row
                if (currentField || currentRow.length > 0) {
                    currentRow.push(currentField);
                    rows.push(currentRow);
                    currentRow = [];
                    currentField = '';
                }
                // Skip \r\n
                if (char === '\r' && nextChar === '\n') {
                    i++;
                }
            }
            else {
                currentField += char;
            }
        }
        // Add last field and row if exists
        if (currentField || currentRow.length > 0) {
            currentRow.push(currentField);
            rows.push(currentRow);
        }
        // Filter out rows that:
        // 1. Are completely empty
        // 2. Only contain error values (#N/A, #REF!, #VALUE!, etc.)
        // 3. Only contain whitespace
        return rows.filter(row => {
            // Check if row has at least one non-empty, non-error cell
            return row.some(cell => {
                const trimmed = cell.trim();
                if (!trimmed)
                    return false; // Empty cell
                if (trimmed.startsWith('#'))
                    return false; // Error value (#N/A, #REF!, etc.)
                return true; // Valid data
            });
        });
    }
    /**
     * Fetch data from a specific sheet using public CSV export
     * NO API KEY REQUIRED! 🎉
     */
    async fetchSheetData(spreadsheetId, sheetName) {
        try {
            // Use Google Sheets CSV export URL (works for public sheets!)
            const csvUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
            const response = await axios_1.default.get(csvUrl, {
                responseType: 'text',
                validateStatus: (status) => status < 500
            });
            if (response.status !== 200) {
                if (response.status === 403) {
                    throw new Error('Access denied. Make sure the sheet is set to "Anyone with the link can view"');
                }
                if (response.status === 404) {
                    throw new Error('Sheet not found. Check the URL and sheet name');
                }
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            const csvText = response.data;
            if (!csvText || csvText.trim() === '') {
                return null;
            }
            // Parse CSV
            const rows = this.parseCSV(csvText);
            console.log(`📊 [Sheets] Fetched ${rows.length} total rows from CSV (including header)`);
            if (rows.length === 0) {
                return null;
            }
            // First row is headers
            const headers = rows[0];
            const dataRows = rows.slice(1);
            console.log(`📊 [Sheets] Headers: ${headers.join(', ')}`);
            console.log(`📊 [Sheets] Data rows: ${dataRows.length}`);
            return {
                sheetName,
                headers,
                rows: dataRows,
            };
        }
        catch (error) {
            console.error(`Error fetching sheet data for ${sheetName}:`, error.message);
            throw new Error(`Failed to fetch sheet data: ${error.message}`);
        }
    }
    /**
     * Get all sheet names from a spreadsheet
     * Uses HTML scraping (public access) with multiple fallback strategies
     */
    async getSheetNames(spreadsheetId) {
        const sheetNames = [];
        const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/htmlview`;
        try {
            console.log(`[Sheets] Fetching tabs from: ${url}`);
            const response = await axios_1.default.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                },
                timeout: 10000
            });
            const html = response.data;
            if (!html || typeof html !== 'string')
                return [];
            // STRATEGY 1: JavaScript items.push() format (MOST COMMON in htmlview)
            // Example: items.push({name: "Bot_Digest", pageUrl: "...", gid: "1836066351"});
            const itemsPushRegex = /items\.push\(\{name:\s*"([^"]+)"/g;
            let match;
            while ((match = itemsPushRegex.exec(html)) !== null) {
                const name = match[1].trim();
                if (name && !sheetNames.includes(name)) {
                    sheetNames.push(name);
                }
            }
            // STRATEGY 2: JSON Metadata format (fallback)
            // Example: {"sheetId":12345,"title":"Bot_Digest"}
            if (sheetNames.length === 0) {
                const metadataRegex = /\{"sheetId":\d+,"title":"([^"]+)"/g;
                while ((match = metadataRegex.exec(html)) !== null) {
                    const name = match[1].trim();
                    if (name && !sheetNames.includes(name)) {
                        sheetNames.push(name);
                    }
                }
            }
            // STRATEGY 3: data-sheet-name attribute (fallback)
            if (sheetNames.length === 0) {
                const footerRegex = /data-sheet-name="([^"]+)"/g;
                while ((match = footerRegex.exec(html)) !== null) {
                    const name = match[1].trim();
                    if (name && !sheetNames.includes(name)) {
                        sheetNames.push(name);
                    }
                }
            }
            // FINAL FILTER: Remove Google UI boilerplate
            const blacklist = [
                'Google Sheets', 'Spreadsheet', 'Untitled', 'Draft', 'true', 'false',
                'Templates', 'Feedback', 'Bantuan', 'Help',
                'Dasar-dasar', 'Kontrak', 'Pelacak', 'Surat', 'Tidak dikategorikan',
                'Kontrak, orientasi, dan formulir lainnya', 'Polacak'
            ];
            const final = sheetNames.filter(name => name &&
                !blacklist.includes(name) &&
                !name.startsWith('http') &&
                !name.includes('{') &&
                name.trim().length > 0);
            console.log(`[Sheets] ✅ Found ${final.length} tabs:`, final);
            return final;
        }
        catch (err) {
            console.error(`[Sheets] ❌ Failed to fetch tabs:`, err.message);
            return [];
        }
    }
    /**
     * Fetch multiple sheets at once
     */
    async fetchMultipleSheets(spreadsheetId, sheetNames) {
        try {
            const promises = sheetNames.map(name => this.fetchSheetData(spreadsheetId, name));
            const results = await Promise.all(promises);
            return results.filter((data) => data !== null);
        }
        catch (error) {
            console.error('Error fetching multiple sheets:', error.message);
            throw new Error(`Failed to fetch multiple sheets: ${error.message}`);
        }
    }
    /**
     * Convert sheet data to array of objects (with headers as keys)
     */
    convertToObjects(sheetData) {
        const { headers, rows } = sheetData;
        // Clean headers: remove BOM and invisible characters
        const cleanHeaders = headers.map(h => (h || '').trim().replace(/^\uFEFF/g, '').replace(/[^\x20-\x7E]/g, ''));
        return rows.map(row => {
            const obj = {};
            cleanHeaders.forEach((header, index) => {
                if (header) {
                    obj[header] = (row[index] || '').trim();
                }
            });
            return obj;
        });
    }
    /**
     * Validate if a Google Sheets URL is accessible
     */
    async validateSheetAccess(url) {
        try {
            const spreadsheetId = this.extractSpreadsheetId(url);
            if (!spreadsheetId) {
                return { valid: false, message: 'Invalid Google Sheets URL format' };
            }
            // Try to fetch sheet names to validate access
            const sheetNames = await this.getSheetNames(spreadsheetId);
            if (sheetNames.length === 0) {
                return { valid: false, message: 'No sheets found or unable to access. Make sure the sheet is public.' };
            }
            return {
                valid: true,
                message: 'Spreadsheet is accessible',
                spreadsheetId,
            };
        }
        catch (error) {
            if (error.message.includes('403') || error.message.includes('Access denied')) {
                return {
                    valid: false,
                    message: 'Access denied. Set sharing to "Anyone with the link can view"'
                };
            }
            if (error.message.includes('404')) {
                return { valid: false, message: 'Spreadsheet not found. Check the URL.' };
            }
            return { valid: false, message: `Error: ${error.message}` };
        }
    }
}
exports.default = new GoogleSheetsService();
//# sourceMappingURL=googleSheetsService.js.map