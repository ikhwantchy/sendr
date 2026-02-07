/**
 * Google Sheets Write Service
 * Uses Service Account for read/write access to Google Sheets
 *
 * SETUP (Two Options):
 * A) Per-Tenant (Recommended): Configure via Dashboard > Settings > Integrations
 * B) Global Fallback: Set GOOGLE_SERVICE_ACCOUNT_KEY in .env (base64 encoded)
 */
import { sheets_v4 } from 'googleapis';
interface UpdateResult {
    success: boolean;
    updatedRange?: string;
    updatedRows?: number;
    error?: string;
}
interface FindRowResult {
    found: boolean;
    rowIndex?: number;
    rowData?: string[];
}
declare class GoogleSheetsWriteService {
    private sheets;
    private authClient;
    private initialized;
    private initAttempted;
    private credentials;
    private tenantClients;
    private readonly CLIENT_CACHE_TTL;
    constructor();
    /**
     * Ensure service is initialized (lazy initialization)
     */
    private ensureInitialized;
    /**
     * Synchronous initialization for global/fallback credentials
     */
    private initSync;
    /**
     * Get or create a Sheets client for a specific tenant
     */
    getClientForTenant(tenantId: string): Promise<{
        sheets: sheets_v4.Sheets;
        email: string;
    } | null>;
    /**
     * Get the appropriate sheets client (tenant-specific or global fallback)
     * Fallback order: Tenant SA → Default tenant SA → Global .env
     */
    getSheetsClient(tenantId?: string): Promise<{
        sheets: sheets_v4.Sheets;
        email: string;
    } | null>;
    /**
     * Check if service is ready for write operations
     * @param tenantId Optional tenant ID to check tenant-specific credentials
     */
    isReadyForTenant(tenantId?: string): Promise<boolean>;
    /**
     * Check if service is ready (global fallback only, for backward compatibility)
     */
    isReady(): boolean;
    /**
     * Get service account email for a tenant
     */
    getServiceAccountEmailForTenant(tenantId?: string): Promise<string | null>;
    /**
     * Get service account email (global, for backward compatibility)
     */
    getServiceAccountEmail(): string | null;
    /**
     * Clear cached client for a tenant (call after credentials are updated)
     */
    clearTenantCache(tenantId: string): void;
    /**
     * Get service account credentials from environment variables
     */
    private getCredentialsFromEnv;
    /**
     * Extract spreadsheet ID from URL
     */
    extractSpreadsheetId(url: string): string | null;
    /**
     * Get all sheet/tab names in a spreadsheet
     */
    getSheetNames(spreadsheetId: string, tenantId?: string): Promise<string[]>;
    /**
     * Get headers (first row) of a sheet
     */
    getHeaders(spreadsheetId: string, sheetName: string, tenantId?: string): Promise<string[]>;
    /**
     * Read all data from a sheet
     */
    readSheet(spreadsheetId: string, sheetName: string, tenantId?: string): Promise<{
        headers: string[];
        rows: string[][];
        objects: any[];
    }>;
    /**
     * Find a row by matching a column value
     */
    findRowByValue(spreadsheetId: string, sheetName: string, searchColumn: string, searchValue: string): Promise<FindRowResult>;
    /**
     * Update a specific cell
     */
    updateCell(spreadsheetId: string, sheetName: string, row: number, column: string | number, value: string, tenantId?: string): Promise<UpdateResult>;
    /**
     * Update a row by finding it first
     */
    updateRowByMatch(spreadsheetId: string, sheetName: string, matchColumn: string, matchValue: string, updateColumn: string, updateValue: string): Promise<UpdateResult>;
    /**
     * Append a new row to the sheet
     */
    appendRow(spreadsheetId: string, sheetName: string, values: string[], tenantId?: string): Promise<UpdateResult>;
    /**
     * Append a row as object (matches headers - case insensitive)
     */
    appendRowAsObject(spreadsheetId: string, sheetName: string, data: Record<string, string>): Promise<UpdateResult>;
    /**
     * Convert column number to letter (1 = A, 2 = B, etc.)
     */
    private columnNumberToLetter;
    /**
     * Validate if spreadsheet is accessible with write permission
     */
    validateWriteAccess(spreadsheetId: string, tenantId?: string): Promise<{
        valid: boolean;
        message: string;
        sheets?: string[];
    }>;
}
export declare const googleSheetsWriteService: GoogleSheetsWriteService;
export default googleSheetsWriteService;
//# sourceMappingURL=googleSheetsWriteService.d.ts.map