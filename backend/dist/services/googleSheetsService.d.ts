interface SheetData {
    sheetName: string;
    headers: string[];
    rows: any[][];
}
/**
 * Google Sheets Service - Public Access Only
 * Fetches data from public Google Sheets using CSV export (no API key required!)
 */
declare class GoogleSheetsService {
    /**
     * Extract spreadsheet ID from Google Sheets URL
     */
    extractSpreadsheetId(url: string): string | null;
    /**
     * Parse CSV text to 2D array
     */
    private parseCSV;
    /**
     * Fetch data from a specific sheet using public CSV export
     * NO API KEY REQUIRED! 🎉
     */
    fetchSheetData(spreadsheetId: string, sheetName: string): Promise<SheetData | null>;
    /**
     * Get all sheet names from a spreadsheet
     * Uses HTML scraping (public access) with multiple fallback strategies
     */
    getSheetNames(spreadsheetId: string): Promise<string[]>;
    /**
     * Fetch multiple sheets at once
     */
    fetchMultipleSheets(spreadsheetId: string, sheetNames: string[]): Promise<SheetData[]>;
    /**
     * Convert sheet data to array of objects (with headers as keys)
     */
    convertToObjects(sheetData: SheetData): any[];
    /**
     * Validate if a Google Sheets URL is accessible
     */
    validateSheetAccess(url: string): Promise<{
        valid: boolean;
        message: string;
        spreadsheetId?: string;
    }>;
}
declare const _default: GoogleSheetsService;
export default _default;
//# sourceMappingURL=googleSheetsService.d.ts.map