/**
 * Google Sheets Write Service
 * Uses Service Account for read/write access to Google Sheets
 * 
 * SETUP:
 * 1. Create Service Account di Google Cloud Console
 * 2. Download JSON key file
 * 3. Set GOOGLE_SERVICE_ACCOUNT_KEY di .env (base64 encoded) atau path ke file
 * 4. Share spreadsheet ke email service account
 */

import { google, sheets_v4 } from 'googleapis';
import { JWT } from 'google-auth-library';
import { logger } from '../utils/logger';
import path from 'path';
import fs from 'fs';

interface ServiceAccountCredentials {
    client_email: string;
    private_key: string;
    project_id: string;
}

interface UpdateResult {
    success: boolean;
    updatedRange?: string;
    updatedRows?: number;
    error?: string;
}

interface FindRowResult {
    found: boolean;
    rowIndex?: number; // 1-based index (Google Sheets uses 1-based)
    rowData?: string[];
}

class GoogleSheetsWriteService {
    private sheets: sheets_v4.Sheets | null = null;
    private authClient: JWT | null = null;
    private initialized: boolean = false;
    private initAttempted: boolean = false;
    private credentials: ServiceAccountCredentials | null = null;

    constructor() {
        // Don't initialize in constructor - wait for first use
        // This allows dotenv.config() to run first
    }

    /**
     * Ensure service is initialized (lazy initialization)
     */
    private ensureInitialized(): void {
        if (this.initAttempted) return;
        this.initAttempted = true;
        this.initSync();
    }

    /**
     * Synchronous initialization
     */
    private initSync(): void {
        try {
            this.credentials = this.getCredentials();
            
            if (!this.credentials) {
                logger.warn('[SheetsWrite] No service account credentials found. Write features disabled.');
                return;
            }

            this.authClient = new JWT({
                email: this.credentials.client_email,
                key: this.credentials.private_key,
                scopes: ['https://www.googleapis.com/auth/spreadsheets'],
            });

            this.sheets = google.sheets({ version: 'v4', auth: this.authClient });
            this.initialized = true;
            
            logger.info('[SheetsWrite] ✅ Service initialized with service account:', this.credentials.client_email);
        } catch (error: any) {
            logger.error('[SheetsWrite] Failed to initialize:', error.message);
        }
    }

    /**
     * Check if service is ready for write operations
     */
    isReady(): boolean {
        this.ensureInitialized();
        return this.initialized && this.sheets !== null;
    }

    /**
     * Get service account email (for sharing instructions)
     */
    getServiceAccountEmail(): string | null {
        this.ensureInitialized();
        return this.credentials?.client_email || null;
    }

    /**
     * Get service account credentials from env or file
     */
    private getCredentials(): ServiceAccountCredentials | null {
        try {
            // Option 1: Base64 encoded JSON in env variable
            const base64Key = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
            if (base64Key) {
                logger.info('[SheetsWrite] Using base64 encoded key from GOOGLE_SERVICE_ACCOUNT_KEY');
                const decoded = Buffer.from(base64Key, 'base64').toString('utf-8');
                return JSON.parse(decoded);
            }

            // Option 2: JSON string directly in env
            const jsonKey = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
            if (jsonKey) {
                logger.info('[SheetsWrite] Using JSON from GOOGLE_SERVICE_ACCOUNT_JSON');
                return JSON.parse(jsonKey);
            }

            // Option 3: Path to JSON file
            const keyPath = process.env.GOOGLE_SERVICE_ACCOUNT_PATH;
            logger.info('[SheetsWrite] GOOGLE_SERVICE_ACCOUNT_PATH =', keyPath);
            if (keyPath) {
                const resolvedPath = path.resolve(keyPath);
                logger.info('[SheetsWrite] Resolved path:', resolvedPath);
                logger.info('[SheetsWrite] File exists:', fs.existsSync(resolvedPath));
                if (fs.existsSync(resolvedPath)) {
                    const content = fs.readFileSync(resolvedPath, 'utf-8');
                    logger.info('[SheetsWrite] Successfully loaded credentials from file');
                    return JSON.parse(content);
                }
            }

            // Option 4: Default path
            const defaultPath = path.resolve(__dirname, '../../service-account.json');
            if (fs.existsSync(defaultPath)) {
                const content = fs.readFileSync(defaultPath, 'utf-8');
                return JSON.parse(content);
            }

            return null;
        } catch (error: any) {
            logger.error('[SheetsWrite] Error parsing credentials:', error.message);
            return null;
        }
    }

    /**
     * Extract spreadsheet ID from URL
     */
    extractSpreadsheetId(url: string): string | null {
        const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
        return match ? match[1] : null;
    }

    /**
     * Get all sheet/tab names in a spreadsheet
     */
    async getSheetNames(spreadsheetId: string): Promise<string[]> {
        if (!this.isReady()) {
            throw new Error('Service not initialized. Check service account credentials.');
        }

        try {
            const response = await this.sheets!.spreadsheets.get({
                spreadsheetId,
                fields: 'sheets.properties.title',
            });

            return response.data.sheets?.map(sheet => sheet.properties?.title || '') || [];
        } catch (error: any) {
            logger.error('[SheetsWrite] Error getting sheet names:', error.message);
            throw new Error(`Failed to get sheet names: ${error.message}`);
        }
    }

    /**
     * Get headers (first row) of a sheet
     */
    async getHeaders(spreadsheetId: string, sheetName: string): Promise<string[]> {
        if (!this.isReady()) {
            throw new Error('Service not initialized');
        }

        try {
            const response = await this.sheets!.spreadsheets.values.get({
                spreadsheetId,
                range: `'${sheetName}'!1:1`,
            });

            return (response.data.values?.[0] || []) as string[];
        } catch (error: any) {
            logger.error('[SheetsWrite] Error getting headers:', error.message);
            throw new Error(`Failed to get headers: ${error.message}`);
        }
    }

    /**
     * Read all data from a sheet
     */
    async readSheet(spreadsheetId: string, sheetName: string): Promise<{
        headers: string[];
        rows: string[][];
        objects: any[];
    }> {
        if (!this.isReady()) {
            throw new Error('Service not initialized');
        }

        try {
            const response = await this.sheets!.spreadsheets.values.get({
                spreadsheetId,
                range: `'${sheetName}'`,
            });

            const values = response.data.values || [];
            const headers = values[0] || [];
            const rows = values.slice(1);

            // Convert to objects
            const objects = rows.map(row => {
                const obj: any = {};
                headers.forEach((header, index) => {
                    obj[header] = row[index] || '';
                });
                return obj;
            });

            return { headers, rows, objects };
        } catch (error: any) {
            logger.error('[SheetsWrite] Error reading sheet:', error.message);
            throw new Error(`Failed to read sheet: ${error.message}`);
        }
    }

    /**
     * Find a row by matching a column value
     */
    async findRowByValue(
        spreadsheetId: string,
        sheetName: string,
        searchColumn: string,
        searchValue: string
    ): Promise<FindRowResult> {
        try {
            const { headers, rows } = await this.readSheet(spreadsheetId, sheetName);
            
            const columnIndex = headers.findIndex(h => 
                h.toLowerCase().trim() === searchColumn.toLowerCase().trim()
            );

            if (columnIndex === -1) {
                logger.warn(`[SheetsWrite] Column "${searchColumn}" not found in headers`);
                return { found: false };
            }

            // Normalize phone numbers for comparison
            const normalizePhone = (phone: string) => {
                const cleaned = phone.replace(/\D/g, '');
                // Convert 08xxx to 628xxx
                if (cleaned.startsWith('0')) {
                    return '62' + cleaned.substring(1);
                }
                // Already has 62 prefix or is just the local number
                return cleaned;
            };

            const searchNormalized = normalizePhone(searchValue);
            logger.info(`[SheetsWrite] 🔍 Searching for: "${searchValue}" → normalized: "${searchNormalized}"`);
            logger.info(`[SheetsWrite] 📋 Column "${searchColumn}" index: ${columnIndex}, Total rows: ${rows.length}`);

            for (let i = 0; i < rows.length; i++) {
                const cellValue = rows[i][columnIndex] || '';
                const cellNormalized = normalizePhone(cellValue);
                
                // Always log each row to see what's in the spreadsheet
                logger.info(`[SheetsWrite] Row ${i + 2}: cell="${cellValue}" → normalized="${cellNormalized}" | match=${cellNormalized === searchNormalized}`);

                // Match by exact or normalized phone
                if (cellValue === searchValue || cellNormalized === searchNormalized) {
                    logger.info(`[SheetsWrite] ✅ FOUND match at row ${i + 2}!`);
                    return {
                        found: true,
                        rowIndex: i + 2, // +2 because: 1-based index + skip header row
                        rowData: rows[i]
                    };
                }
            }

            logger.warn(`[SheetsWrite] ❌ No match found for "${searchNormalized}"`);
            return { found: false };
        } catch (error: any) {
            logger.error('[SheetsWrite] Error finding row:', error.message);
            return { found: false };
        }
    }

    /**
     * Update a specific cell
     */
    async updateCell(
        spreadsheetId: string,
        sheetName: string,
        row: number,
        column: string | number,
        value: string
    ): Promise<UpdateResult> {
        if (!this.isReady()) {
            return { success: false, error: 'Service not initialized' };
        }

        try {
            // Convert column number to letter if needed
            const columnLetter = typeof column === 'number' 
                ? this.columnNumberToLetter(column)
                : column;

            const range = `'${sheetName}'!${columnLetter}${row}`;

            const response = await this.sheets!.spreadsheets.values.update({
                spreadsheetId,
                range,
                valueInputOption: 'USER_ENTERED',
                requestBody: {
                    values: [[value]]
                }
            });

            logger.info(`[SheetsWrite] ✅ Updated cell ${range} = "${value}"`);

            return {
                success: true,
                updatedRange: response.data.updatedRange || range,
                updatedRows: response.data.updatedRows || 1
            };
        } catch (error: any) {
            logger.error('[SheetsWrite] Error updating cell:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Update a row by finding it first
     */
    async updateRowByMatch(
        spreadsheetId: string,
        sheetName: string,
        matchColumn: string,
        matchValue: string,
        updateColumn: string,
        updateValue: string
    ): Promise<UpdateResult> {
        try {
            // Find the row
            const findResult = await this.findRowByValue(spreadsheetId, sheetName, matchColumn, matchValue);

            if (!findResult.found || !findResult.rowIndex) {
                return { 
                    success: false, 
                    error: `No row found where ${matchColumn} = "${matchValue}"` 
                };
            }

            // Get headers to find update column index
            const headers = await this.getHeaders(spreadsheetId, sheetName);
            const updateColumnIndex = headers.findIndex(h => 
                h.toLowerCase().trim() === updateColumn.toLowerCase().trim()
            );

            if (updateColumnIndex === -1) {
                return { 
                    success: false, 
                    error: `Column "${updateColumn}" not found in sheet` 
                };
            }

            // Update the cell
            return await this.updateCell(
                spreadsheetId,
                sheetName,
                findResult.rowIndex,
                updateColumnIndex + 1, // Convert to 1-based
                updateValue
            );
        } catch (error: any) {
            logger.error('[SheetsWrite] Error updating row:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Append a new row to the sheet
     */
    async appendRow(
        spreadsheetId: string,
        sheetName: string,
        values: string[]
    ): Promise<UpdateResult> {
        if (!this.isReady()) {
            return { success: false, error: 'Service not initialized' };
        }

        try {
            const response = await this.sheets!.spreadsheets.values.append({
                spreadsheetId,
                range: `'${sheetName}'`,
                valueInputOption: 'USER_ENTERED',
                insertDataOption: 'INSERT_ROWS',
                requestBody: {
                    values: [values]
                }
            });

            logger.info(`[SheetsWrite] ✅ Appended row to ${sheetName}`);

            return {
                success: true,
                updatedRange: response.data.updates?.updatedRange || '',
                updatedRows: response.data.updates?.updatedRows || 1
            };
        } catch (error: any) {
            logger.error('[SheetsWrite] Error appending row:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Append a row as object (matches headers)
     */
    async appendRowAsObject(
        spreadsheetId: string,
        sheetName: string,
        data: Record<string, string>
    ): Promise<UpdateResult> {
        try {
            const headers = await this.getHeaders(spreadsheetId, sheetName);
            const values = headers.map(header => data[header] || '');
            return await this.appendRow(spreadsheetId, sheetName, values);
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Convert column number to letter (1 = A, 2 = B, etc.)
     */
    private columnNumberToLetter(column: number): string {
        let result = '';
        while (column > 0) {
            const remainder = (column - 1) % 26;
            result = String.fromCharCode(65 + remainder) + result;
            column = Math.floor((column - 1) / 26);
        }
        return result;
    }

    /**
     * Validate if spreadsheet is accessible with write permission
     */
    async validateWriteAccess(spreadsheetId: string): Promise<{
        valid: boolean;
        message: string;
        sheets?: string[];
    }> {
        if (!this.isReady()) {
            return {
                valid: false,
                message: 'Service account not configured. Please set up Google Service Account credentials.'
            };
        }

        try {
            const sheets = await this.getSheetNames(spreadsheetId);
            
            if (sheets.length === 0) {
                return {
                    valid: false,
                    message: 'No sheets found or access denied. Make sure to share the spreadsheet with: ' + this.getServiceAccountEmail()
                };
            }

            return {
                valid: true,
                message: 'Spreadsheet accessible with write permission',
                sheets
            };
        } catch (error: any) {
            if (error.message.includes('403') || error.message.includes('permission')) {
                return {
                    valid: false,
                    message: `Access denied. Share the spreadsheet with: ${this.getServiceAccountEmail()}`
                };
            }
            return {
                valid: false,
                message: `Error: ${error.message}`
            };
        }
    }
}

export const googleSheetsWriteService = new GoogleSheetsWriteService();
export default googleSheetsWriteService;
