interface SheetData {
    sheetName: string;
    headers: string[];
    rows: any[][];
}

/**
 * Google Sheets Service - Public Access Only
 * Fetches data from public Google Sheets using CSV export (no API key required!)
 * 
 * Requirements:
 * - Sheet must be set to "Anyone with the link can view"
 * - No authentication needed
 * - No API key needed
 * - Multi-tenant ready
 */
class GoogleSheetsService {

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
     * Parse CSV text to 2D array
     */
    private parseCSV(csvText: string): string[][] {
        const rows: string[][] = [];
        let currentRow: string[] = [];
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
                } else {
                    // Toggle quote state
                    insideQuotes = !insideQuotes;
                }
            } else if (char === ',' && !insideQuotes) {
                // End of field
                currentRow.push(currentField);
                currentField = '';
            } else if ((char === '\n' || char === '\r') && !insideQuotes) {
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
            } else {
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
                if (!trimmed) return false; // Empty cell
                if (trimmed.startsWith('#')) return false; // Error value (#N/A, #REF!, etc.)
                return true; // Valid data
            });
        });
    }

    /**
     * Fetch data from a specific sheet using public CSV export
     * NO API KEY REQUIRED! 🎉
     */
    async fetchSheetData(spreadsheetId: string, sheetName: string): Promise<SheetData | null> {
        try {
            // Use Google Sheets CSV export URL (works for public sheets!)
            const csvUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;

            const response = await fetch(csvUrl);

            if (!response.ok) {
                if (response.status === 403) {
                    throw new Error('Access denied. Make sure the sheet is set to "Anyone with the link can view"');
                }
                if (response.status === 404) {
                    throw new Error('Sheet not found. Check the URL and sheet name');
                }
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const csvText = await response.text();

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
        } catch (error: any) {
            console.error(`Error fetching sheet data for ${sheetName}:`, error.message);
            throw new Error(`Failed to fetch sheet data: ${error.message}`);
        }
    }

    /**
     * Get all sheet names from a spreadsheet
     * Uses HTML scraping (public access) with multiple fallback strategies
     */
    async getSheetNames(spreadsheetId: string): Promise<string[]> {
        try {
            // Fetch the spreadsheet HTML page
            const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
            const response = await fetch(url);

            if (!response.ok) {
                if (response.status === 403 || response.status === 401) {
                    throw new Error('Access denied. Make sure the sheet is set to "Anyone with the link can view"');
                }
                throw new Error(`HTTP ${response.status}`);
            }

            const html = await response.text();

            // Extract sheet names from HTML
            const sheetNames: string[] = [];

            // Strategy 1: Try to find sheet data in JSON format
            // Pattern: "sheets":[{"properties":{"sheetId":0,"title":"Sheet1"...
            try {
                const sheetsMatch = html.match(/"sheets":\[(.*?)\]/);
                if (sheetsMatch) {
                    const sheetsData = sheetsMatch[1];
                    const titleMatches = sheetsData.matchAll(/"title":"([^"]+)"/g);
                    for (const match of titleMatches) {
                        sheetNames.push(match[1]);
                    }
                }
            } catch (e) {
                console.warn('Strategy 1 failed:', e);
            }

            // Strategy 2: Try another pattern
            if (sheetNames.length === 0) {
                try {
                    const titleMatches = html.matchAll(/"sheetName":"([^"]+)"/g);
                    for (const match of titleMatches) {
                        if (!sheetNames.includes(match[1])) {
                            sheetNames.push(match[1]);
                        }
                    }
                } catch (e) {
                    console.warn('Strategy 2 failed:', e);
                }
            }

            // Strategy 3: Look for sheet tabs in a different format
            if (sheetNames.length === 0) {
                try {
                    // Pattern: data-sheet-name="SheetName"
                    const tabMatches = html.matchAll(/data-sheet-name="([^"]+)"/g);
                    for (const match of tabMatches) {
                        if (!sheetNames.includes(match[1])) {
                            sheetNames.push(match[1]);
                        }
                    }
                } catch (e) {
                    console.warn('Strategy 3 failed:', e);
                }
            }

            // If all strategies fail, return empty array (user can input manually)
            if (sheetNames.length === 0) {
                console.warn('Could not auto-detect sheet names. User will need to input manually.');
            }

            return sheetNames.filter(Boolean);
        } catch (error: any) {
            console.error('Error fetching sheet names:', error.message);
            // Don't throw - return empty array so user can input manually
            return [];
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

        // Clean headers: remove BOM and invisible characters
        const cleanHeaders = headers.map(h =>
            (h || '').trim().replace(/^\uFEFF/g, '').replace(/[^\x20-\x7E]/g, '')
        );

        return rows.map(row => {
            const obj: any = {};
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
    async validateSheetAccess(url: string): Promise<{ valid: boolean; message: string; spreadsheetId?: string }> {
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
        } catch (error: any) {
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

export default new GoogleSheetsService();
