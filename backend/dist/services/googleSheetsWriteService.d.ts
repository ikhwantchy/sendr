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
    constructor();
    /**
     * Ensure service is initialized (lazy initialization)
     */
    private ensureInitialized;
    /**
     * Synchronous initialization
     */
    private initSync;
    /**
     * Check if service is ready for write operations
     */
    isReady(): boolean;
    /**
     * Get service account email (for sharing instructions)
     */
    getServiceAccountEmail(): string | null;
    /**
     * Get service account credentials from env or file
     */
    private getCredentials;
    /**
     * Extract spreadsheet ID from URL
     */
    extractSpreadsheetId(url: string): string | null;
    /**
     * Get all sheet/tab names in a spreadsheet
     */
    getSheetNames(spreadsheetId: string): Promise<string[]>;
    /**
     * Get headers (first row) of a sheet
     */
    getHeaders(spreadsheetId: string, sheetName: string): Promise<string[]>;
    /**
     * Read all data from a sheet
     */
    readSheet(spreadsheetId: string, sheetName: string): Promise<{
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
    updateCell(spreadsheetId: string, sheetName: string, row: number, column: string | number, value: string): Promise<UpdateResult>;
    /**
     * Update a row by finding it first
     */
    updateRowByMatch(spreadsheetId: string, sheetName: string, matchColumn: string, matchValue: string, updateColumn: string, updateValue: string): Promise<UpdateResult>;
    /**
     * Append a new row to the sheet
     */
    appendRow(spreadsheetId: string, sheetName: string, values: string[]): Promise<UpdateResult>;
    /**
     * Append a row as object (matches headers)
     */
    appendRowAsObject(spreadsheetId: string, sheetName: string, data: Record<string, string>): Promise<UpdateResult>;
    /**
     * Convert column number to letter (1 = A, 2 = B, etc.)
     */
    private columnNumberToLetter;
    /**
     * Validate if spreadsheet is accessible with write permission
     */
    validateWriteAccess(spreadsheetId: string): Promise<{
        valid: boolean;
        message: string;
        sheets?: string[];
    }>;
}
export declare const googleSheetsWriteService: GoogleSheetsWriteService;
export default googleSheetsWriteService;
//# sourceMappingURL=googleSheetsWriteService.d.ts.map