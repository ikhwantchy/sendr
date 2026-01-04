const express = require('express');
const router = express.Router();
const sheetsController = require('../controllers/sheets.controller');

// GET /api/sheets/tabs?url=<google_sheets_url>
router.get('/tabs', sheetsController.getSheetTabs);

module.exports = router;
