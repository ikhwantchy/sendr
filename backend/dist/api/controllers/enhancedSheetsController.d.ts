/**
 * Enhanced Sheets Helper Endpoints
 * Provides utilities for testing and working with the enhanced sheets system
 */
import { Request, Response } from 'express';
/**
 * POST /api/sheets/test-filter
 * Test filter configuration on sheet data
 */
export declare const testFilter: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
/**
 * POST /api/sheets/test-template
 * Test template rendering with sample data
 */
export declare const testTemplate: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
/**
 * GET /api/sheets/filter-presets
 * Get available filter presets
 */
export declare const getFilterPresets: (req: Request, res: Response) => Promise<void>;
/**
 * POST /api/sheets/preview-enhanced
 * Enhanced preview with full filter and template support
 */
export declare const previewEnhanced: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=enhancedSheetsController.d.ts.map