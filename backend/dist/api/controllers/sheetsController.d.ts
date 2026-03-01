/**
 * Google Sheets Utility Controller
 * Uses public CSV export (no API key required!)
 */
import { Request, Response } from 'express';
/**
 * GET /api/sheets/tabs
 * Detects all available tabs in a Google Sheets document using HTML scraping
 *
 * Query params:
 *   - url: Google Sheets URL (required)
 *
 * Returns:
 *   - tabs: Array of { name: string, gid: string }
 */
export declare const getSheetTabs: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const previewDigest: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
/**
 * GET /api/sheets/columns
 * Fetch column headers and sample data from a specific sheet tab
 *
 * Query params:
 *   - url: Google Sheets URL (required)
 *   - tab: Sheet tab name (optional, defaults to first tab)
 *
 * Returns:
 *   - columns: string[] (header names)
 *   - sampleData: object[] (first 5 rows as objects)
 *   - totalRows: number
 */
export declare const getSheetColumns: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
/**
 * POST /api/sheets/render-preview
 * Renders a Handlebars template with sample data from Google Sheets
 */
export declare const renderPreview: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=sheetsController.d.ts.map