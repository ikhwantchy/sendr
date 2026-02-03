"use strict";
/**
 * Google Sheets Utility Routes
 * Provides endpoints for Google Sheets integration helpers
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const sheetsController_1 = require("../controllers/sheetsController");
const enhancedSheetsController_1 = require("../controllers/enhancedSheetsController");
const router = express_1.default.Router();
/**
 * GET /api/sheets/tabs
 * Detects all available tabs in a Google Sheets document
 * Query params: url (Google Sheets URL)
 */
router.get('/tabs', sheetsController_1.getSheetTabs);
/**
 * POST /api/sheets/preview-digest
 * Legacy preview endpoint (backward compatible)
 */
router.post('/preview-digest', sheetsController_1.previewDigest);
/**
 * POST /api/sheets/test-filter
 * Test filter configuration on sheet data
 */
router.post('/test-filter', enhancedSheetsController_1.testFilter);
/**
 * POST /api/sheets/test-template
 * Test template rendering with sample data
 */
router.post('/test-template', enhancedSheetsController_1.testTemplate);
/**
 * GET /api/sheets/filter-presets
 * Get available filter presets and operators
 */
router.get('/filter-presets', enhancedSheetsController_1.getFilterPresets);
/**
 * POST /api/sheets/preview-enhanced
 * Enhanced preview with full filter and template support
 */
router.post('/preview-enhanced', enhancedSheetsController_1.previewEnhanced);
/**
 * POST /api/sheets/render-preview
 * Render Handlebars template with sample Google Sheets data
 */
router.post('/render-preview', sheetsController_1.renderPreview);
exports.default = router;
//# sourceMappingURL=sheetsRoutes.js.map