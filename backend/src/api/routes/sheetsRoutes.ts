/**
 * Google Sheets Utility Routes
 * Provides endpoints for Google Sheets integration helpers
 */

import express from 'express';
import { getSheetTabs, previewDigest } from '../controllers/sheetsController';
import {
    testFilter,
    testTemplate,
    getFilterPresets,
    previewEnhanced
} from '../controllers/enhancedSheetsController';

const router = express.Router();

/**
 * GET /api/sheets/tabs
 * Detects all available tabs in a Google Sheets document
 * Query params: url (Google Sheets URL)
 */
router.get('/tabs', getSheetTabs);

/**
 * POST /api/sheets/preview-digest
 * Legacy preview endpoint (backward compatible)
 */
router.post('/preview-digest', previewDigest);

/**
 * POST /api/sheets/test-filter
 * Test filter configuration on sheet data
 */
router.post('/test-filter', testFilter);

/**
 * POST /api/sheets/test-template
 * Test template rendering with sample data
 */
router.post('/test-template', testTemplate);

/**
 * GET /api/sheets/filter-presets
 * Get available filter presets and operators
 */
router.get('/filter-presets', getFilterPresets);

/**
 * POST /api/sheets/preview-enhanced
 * Enhanced preview with full filter and template support
 */
router.post('/preview-enhanced', previewEnhanced);

export default router;
