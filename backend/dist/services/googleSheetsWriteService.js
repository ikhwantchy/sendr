"use strict";
/**
 * Google Sheets Write Service
 * Uses Service Account for read/write access to Google Sheets
 *
 * SETUP (Two Options):
 * A) Per-Tenant (Recommended): Configure via Dashboard > Settings > Integrations
 * B) Global Fallback: Set GOOGLE_SERVICE_ACCOUNT_KEY in .env (base64 encoded)
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.googleSheetsWriteService = void 0;
const googleapis_1 = require("googleapis");
const google_auth_library_1 = require("google-auth-library");
const logger_1 = require("../utils/logger");
const connection_1 = require("../database/connection");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
class GoogleSheetsWriteService {
    // Global/fallback client
    sheets = null;
    authClient = null;
    initialized = false;
    initAttempted = false;
    credentials = null;
    // Per-tenant client cache
    tenantClients = new Map();
    CLIENT_CACHE_TTL = 30 * 60 * 1000; // 30 minutes
    constructor() {
        // Don't initialize in constructor - wait for first use
        // This allows dotenv.config() to run first
    }
    /**
     * Ensure service is initialized (lazy initialization)
     */
    ensureInitialized() {
        if (this.initAttempted)
            return;
        this.initAttempted = true;
        this.initSync();
    }
    /**
     * Synchronous initialization for global/fallback credentials
     */
    initSync() {
        try {
            this.credentials = this.getCredentialsFromEnv();
            if (!this.credentials) {
                logger_1.logger.warn('[SheetsWrite] No global service account credentials found. Per-tenant credentials will be used.');
                return;
            }
            this.authClient = new google_auth_library_1.JWT({
                email: this.credentials.client_email,
                key: this.credentials.private_key,
                scopes: ['https://www.googleapis.com/auth/spreadsheets'],
            });
            this.sheets = googleapis_1.google.sheets({ version: 'v4', auth: this.authClient });
            this.initialized = true;
            logger_1.logger.info('[SheetsWrite] ✅ Global service initialized with:', this.credentials.client_email);
        }
        catch (error) {
            logger_1.logger.error('[SheetsWrite] Failed to initialize:', error.message);
        }
    }
    /**
     * Get or create a Sheets client for a specific tenant
     */
    async getClientForTenant(tenantId) {
        // Check cache first
        const cached = this.tenantClients.get(tenantId);
        if (cached && (Date.now() - cached.createdAt) < this.CLIENT_CACHE_TTL) {
            return { sheets: cached.sheets, email: cached.credentials.client_email };
        }
        try {
            // Fetch tenant's service account from database
            const result = await (0, connection_1.query)('SELECT google_service_account FROM tenants WHERE id = ?', [tenantId]);
            if (result.rows.length === 0 || !result.rows[0].google_service_account) {
                logger_1.logger.debug(`[SheetsWrite] No tenant-specific credentials for ${tenantId}, using global fallback`);
                return null;
            }
            const credentials = JSON.parse(result.rows[0].google_service_account);
            if (!credentials.client_email || !credentials.private_key) {
                logger_1.logger.warn(`[SheetsWrite] Invalid credentials for tenant ${tenantId}`);
                return null;
            }
            // Create new JWT client
            const authClient = new google_auth_library_1.JWT({
                email: credentials.client_email,
                key: credentials.private_key,
                scopes: ['https://www.googleapis.com/auth/spreadsheets'],
            });
            const sheets = googleapis_1.google.sheets({ version: 'v4', auth: authClient });
            // Cache the client
            this.tenantClients.set(tenantId, {
                sheets,
                credentials,
                createdAt: Date.now()
            });
            logger_1.logger.info(`[SheetsWrite] ✅ Created client for tenant ${tenantId}: ${credentials.client_email}`);
            return { sheets, email: credentials.client_email };
        }
        catch (error) {
            logger_1.logger.error(`[SheetsWrite] Error creating client for tenant ${tenantId}:`, error.message);
            return null;
        }
    }
    /**
     * Get the appropriate sheets client (tenant-specific or global fallback)
     * Fallback order: Tenant SA → Default tenant SA → Global .env
     */
    async getSheetsClient(tenantId) {
        // Try tenant-specific first
        if (tenantId) {
            const tenantClient = await this.getClientForTenant(tenantId);
            if (tenantClient) {
                return tenantClient;
            }
        }
        // Fallback to default tenant (where admin configures SA)
        // Try both 'default-tenant' (from db) and 'default-tenant-id' (legacy) for compatibility
        if (tenantId !== 'default-tenant' && tenantId !== 'default-tenant-id') {
            const defaultTenantClient = await this.getClientForTenant('default-tenant')
                || await this.getClientForTenant('default-tenant-id');
            if (defaultTenantClient) {
                logger_1.logger.debug(`[SheetsWrite] Using default tenant SA for tenant ${tenantId}`);
                return defaultTenantClient;
            }
        }
        // Fallback to global (.env)
        this.ensureInitialized();
        if (this.initialized && this.sheets && this.credentials) {
            return { sheets: this.sheets, email: this.credentials.client_email };
        }
        return null;
    }
    /**
     * Check if service is ready for write operations
     * @param tenantId Optional tenant ID to check tenant-specific credentials
     */
    async isReadyForTenant(tenantId) {
        const client = await this.getSheetsClient(tenantId);
        return client !== null;
    }
    /**
     * Check if service is ready (global fallback only, for backward compatibility)
     */
    isReady() {
        this.ensureInitialized();
        return this.initialized && this.sheets !== null;
    }
    /**
     * Get service account email for a tenant
     */
    async getServiceAccountEmailForTenant(tenantId) {
        const client = await this.getSheetsClient(tenantId);
        return client?.email || null;
    }
    /**
     * Get service account email (global, for backward compatibility)
     */
    getServiceAccountEmail() {
        this.ensureInitialized();
        return this.credentials?.client_email || null;
    }
    /**
     * Clear cached client for a tenant (call after credentials are updated)
     */
    clearTenantCache(tenantId) {
        this.tenantClients.delete(tenantId);
        logger_1.logger.info(`[SheetsWrite] Cleared cache for tenant ${tenantId}`);
    }
    /**
     * Get service account credentials from environment variables
     */
    getCredentialsFromEnv() {
        try {
            // Option 1: Base64 encoded JSON in env variable
            const base64Key = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
            if (base64Key) {
                logger_1.logger.info('[SheetsWrite] Using base64 encoded key from GOOGLE_SERVICE_ACCOUNT_KEY');
                const decoded = Buffer.from(base64Key, 'base64').toString('utf-8');
                return JSON.parse(decoded);
            }
            // Option 2: JSON string directly in env
            const jsonKey = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
            if (jsonKey) {
                logger_1.logger.info('[SheetsWrite] Using JSON from GOOGLE_SERVICE_ACCOUNT_JSON');
                return JSON.parse(jsonKey);
            }
            // Option 3: Path to JSON file
            const keyPath = process.env.GOOGLE_SERVICE_ACCOUNT_PATH;
            logger_1.logger.info('[SheetsWrite] GOOGLE_SERVICE_ACCOUNT_PATH =', keyPath);
            if (keyPath) {
                const resolvedPath = path_1.default.resolve(keyPath);
                logger_1.logger.info('[SheetsWrite] Resolved path:', resolvedPath);
                logger_1.logger.info('[SheetsWrite] File exists:', fs_1.default.existsSync(resolvedPath));
                if (fs_1.default.existsSync(resolvedPath)) {
                    const content = fs_1.default.readFileSync(resolvedPath, 'utf-8');
                    logger_1.logger.info('[SheetsWrite] Successfully loaded credentials from file');
                    return JSON.parse(content);
                }
            }
            // Option 4: Default path
            const defaultPath = path_1.default.resolve(__dirname, '../../service-account.json');
            if (fs_1.default.existsSync(defaultPath)) {
                const content = fs_1.default.readFileSync(defaultPath, 'utf-8');
                return JSON.parse(content);
            }
            return null;
        }
        catch (error) {
            logger_1.logger.error('[SheetsWrite] Error parsing credentials:', error.message);
            return null;
        }
    }
    /**
     * Extract spreadsheet ID from URL
     */
    extractSpreadsheetId(url) {
        const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
        return match ? match[1] : null;
    }
    /**
     * Get all sheet/tab names in a spreadsheet
     */
    async getSheetNames(spreadsheetId, tenantId) {
        const client = await this.getSheetsClient(tenantId);
        if (!client) {
            throw new Error('Service not initialized. Configure Google Service Account in Settings > Integrations.');
        }
        try {
            const response = await client.sheets.spreadsheets.get({
                spreadsheetId,
                fields: 'sheets.properties.title',
            });
            return response.data.sheets?.map(sheet => sheet.properties?.title || '') || [];
        }
        catch (error) {
            logger_1.logger.error('[SheetsWrite] Error getting sheet names:', error.message);
            throw new Error(`Failed to get sheet names: ${error.message}`);
        }
    }
    /**
     * Get headers (first row) of a sheet
     */
    async getHeaders(spreadsheetId, sheetName, tenantId) {
        const client = await this.getSheetsClient(tenantId);
        if (!client) {
            throw new Error('Service not initialized. Configure Google Service Account in Settings > Integrations.');
        }
        try {
            const response = await client.sheets.spreadsheets.values.get({
                spreadsheetId,
                range: `'${sheetName}'!1:1`,
            });
            return (response.data.values?.[0] || []);
        }
        catch (error) {
            logger_1.logger.error('[SheetsWrite] Error getting headers:', error.message);
            throw new Error(`Failed to get headers: ${error.message}`);
        }
    }
    /**
     * Read all data from a sheet
     */
    async readSheet(spreadsheetId, sheetName, tenantId) {
        const client = await this.getSheetsClient(tenantId);
        if (!client) {
            throw new Error('Service not initialized. Configure Google Service Account in Settings > Integrations.');
        }
        try {
            const response = await client.sheets.spreadsheets.values.get({
                spreadsheetId,
                range: `'${sheetName}'`,
            });
            const values = response.data.values || [];
            const headers = values[0] || [];
            const rows = values.slice(1);
            // Convert to objects
            const objects = rows.map(row => {
                const obj = {};
                headers.forEach((header, index) => {
                    obj[header] = row[index] || '';
                });
                return obj;
            });
            return { headers, rows, objects };
        }
        catch (error) {
            logger_1.logger.error('[SheetsWrite] Error reading sheet:', error.message);
            throw new Error(`Failed to read sheet: ${error.message}`);
        }
    }
    /**
     * Find a row by matching a column value
     */
    async findRowByValue(spreadsheetId, sheetName, searchColumn, searchValue) {
        try {
            const { headers, rows } = await this.readSheet(spreadsheetId, sheetName);
            const columnIndex = headers.findIndex(h => h.toLowerCase().trim() === searchColumn.toLowerCase().trim());
            if (columnIndex === -1) {
                logger_1.logger.warn(`[SheetsWrite] Column "${searchColumn}" not found in headers`);
                return { found: false };
            }
            // Normalize phone numbers for comparison
            const normalizePhone = (phone) => {
                const cleaned = phone.replace(/\D/g, '');
                // Convert 08xxx to 628xxx
                if (cleaned.startsWith('0')) {
                    return '62' + cleaned.substring(1);
                }
                // Already has 62 prefix or is just the local number
                return cleaned;
            };
            const searchNormalized = normalizePhone(searchValue);
            logger_1.logger.info(`[SheetsWrite] 🔍 Searching for: "${searchValue}" → normalized: "${searchNormalized}"`);
            logger_1.logger.info(`[SheetsWrite] 📋 Column "${searchColumn}" index: ${columnIndex}, Total rows: ${rows.length}`);
            for (let i = 0; i < rows.length; i++) {
                const cellValue = rows[i][columnIndex] || '';
                const cellNormalized = normalizePhone(cellValue);
                // Always log each row to see what's in the spreadsheet
                logger_1.logger.info(`[SheetsWrite] Row ${i + 2}: cell="${cellValue}" → normalized="${cellNormalized}" | match=${cellNormalized === searchNormalized}`);
                // Match by exact or normalized phone
                if (cellValue === searchValue || cellNormalized === searchNormalized) {
                    logger_1.logger.info(`[SheetsWrite] ✅ FOUND match at row ${i + 2}!`);
                    return {
                        found: true,
                        rowIndex: i + 2, // +2 because: 1-based index + skip header row
                        rowData: rows[i]
                    };
                }
            }
            logger_1.logger.warn(`[SheetsWrite] ❌ No match found for "${searchNormalized}"`);
            return { found: false };
        }
        catch (error) {
            logger_1.logger.error('[SheetsWrite] Error finding row:', error.message);
            return { found: false };
        }
    }
    /**
     * Update a specific cell
     */
    async updateCell(spreadsheetId, sheetName, row, column, value, tenantId) {
        const client = await this.getSheetsClient(tenantId);
        if (!client) {
            return { success: false, error: 'Service not initialized. Configure Google Service Account in Settings > Integrations.' };
        }
        try {
            // Convert column number to letter if needed
            const columnLetter = typeof column === 'number'
                ? this.columnNumberToLetter(column)
                : column;
            const range = `'${sheetName}'!${columnLetter}${row}`;
            const response = await client.sheets.spreadsheets.values.update({
                spreadsheetId,
                range,
                valueInputOption: 'USER_ENTERED',
                requestBody: {
                    values: [[value]]
                }
            });
            logger_1.logger.info(`[SheetsWrite] ✅ Updated cell ${range} = "${value}"`);
            return {
                success: true,
                updatedRange: response.data.updatedRange || range,
                updatedRows: response.data.updatedRows || 1
            };
        }
        catch (error) {
            logger_1.logger.error('[SheetsWrite] Error updating cell:', error.message);
            return { success: false, error: error.message };
        }
    }
    /**
     * Update a row by finding it first
     */
    async updateRowByMatch(spreadsheetId, sheetName, matchColumn, matchValue, updateColumn, updateValue) {
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
            const updateColumnIndex = headers.findIndex(h => h.toLowerCase().trim() === updateColumn.toLowerCase().trim());
            if (updateColumnIndex === -1) {
                return {
                    success: false,
                    error: `Column "${updateColumn}" not found in sheet`
                };
            }
            // Update the cell
            return await this.updateCell(spreadsheetId, sheetName, findResult.rowIndex, updateColumnIndex + 1, // Convert to 1-based
            updateValue);
        }
        catch (error) {
            logger_1.logger.error('[SheetsWrite] Error updating row:', error.message);
            return { success: false, error: error.message };
        }
    }
    /**
     * Append a new row to the sheet
     */
    async appendRow(spreadsheetId, sheetName, values, tenantId) {
        const client = await this.getSheetsClient(tenantId);
        if (!client) {
            return { success: false, error: 'Service not initialized. Configure Google Service Account in Settings > Integrations.' };
        }
        try {
            const response = await client.sheets.spreadsheets.values.append({
                spreadsheetId,
                range: `'${sheetName}'`,
                valueInputOption: 'USER_ENTERED',
                insertDataOption: 'INSERT_ROWS',
                requestBody: {
                    values: [values]
                }
            });
            logger_1.logger.info(`[SheetsWrite] ✅ Appended row to ${sheetName}`);
            return {
                success: true,
                updatedRange: response.data.updates?.updatedRange || '',
                updatedRows: response.data.updates?.updatedRows || 1
            };
        }
        catch (error) {
            logger_1.logger.error('[SheetsWrite] Error appending row:', error.message);
            return { success: false, error: error.message };
        }
    }
    /**
     * Append a row as object (matches headers - case insensitive)
     */
    async appendRowAsObject(spreadsheetId, sheetName, data) {
        try {
            const headers = await this.getHeaders(spreadsheetId, sheetName);
            // Create lowercase lookup map for case-insensitive matching
            const dataLower = {};
            for (const [key, value] of Object.entries(data)) {
                dataLower[key.toLowerCase().trim()] = value;
            }
            // Map headers to values with case-insensitive matching
            const values = headers.map(header => {
                const headerLower = header.toLowerCase().trim();
                return dataLower[headerLower] || data[header] || '';
            });
            return await this.appendRow(spreadsheetId, sheetName, values);
        }
        catch (error) {
            return { success: false, error: error.message };
        }
    }
    /**
     * Convert column number to letter (1 = A, 2 = B, etc.)
     */
    columnNumberToLetter(column) {
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
    async validateWriteAccess(spreadsheetId, tenantId) {
        const client = await this.getSheetsClient(tenantId);
        if (!client) {
            return {
                valid: false,
                message: 'Service account not configured. Go to Settings > Integrations to set up Google Service Account.'
            };
        }
        try {
            const sheets = await this.getSheetNames(spreadsheetId, tenantId);
            if (sheets.length === 0) {
                return {
                    valid: false,
                    message: 'No sheets found or access denied. Make sure to share the spreadsheet with: ' + client.email
                };
            }
            return {
                valid: true,
                message: 'Spreadsheet accessible with write permission',
                sheets
            };
        }
        catch (error) {
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
exports.googleSheetsWriteService = new GoogleSheetsWriteService();
exports.default = exports.googleSheetsWriteService;
//# sourceMappingURL=googleSheetsWriteService.js.map