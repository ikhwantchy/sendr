/**
 * Google Sheets Utility Routes
 * Provides endpoints for Google Sheets integration helpers
 */

import express from 'express';
import { getSheetTabs } from '../controllers/sheetsController';

const router = express.Router();

/**
 * GET /api/sheets/tabs
 * Detects all available tabs in a Google Sheets document
 * Query params: url (Google Sheets URL)
 */
router.get('/tabs', getSheetTabs);

export default router;
