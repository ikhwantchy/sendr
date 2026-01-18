/**
 * Enhanced Sheets Helper Endpoints
 * Provides utilities for testing and working with the enhanced sheets system
 */

import { Request, Response } from 'express';
import googleSheetsService from '../../services/googleSheetsService';
import smartSheetsProcessor, { FilterCondition } from '../../services/smartSheetsProcessor';
import enhancedTemplateRenderer from '../../services/enhancedTemplateRenderer';

/**
 * POST /api/sheets/test-filter
 * Test filter configuration on sheet data
 */
export const testFilter = async (req: Request, res: Response) => {
    try {
        const { url, sheetName, filters, sort, limit } = req.body;

        if (!url || !sheetName) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: url, sheetName'
            });
        }

        const spreadsheetId = googleSheetsService.extractSpreadsheetId(url);
        if (!spreadsheetId) {
            return res.status(400).json({ success: false, message: 'Invalid Google Sheets URL' });
        }

        // Fetch sheet data
        const sheetData = await googleSheetsService.fetchSheetData(spreadsheetId, sheetName);
        if (!sheetData) {
            return res.status(404).json({ success: false, message: 'Sheet not found' });
        }

        const allData = googleSheetsService.convertToObjects(sheetData);
        const totalRows = allData.length;

        // Apply filters
        const filtered = smartSheetsProcessor.processData(allData, {
            filters,
            sort,
            limit
        });

        res.json({
            success: true,
            totalRows,
            filteredRows: filtered.length,
            data: filtered,
            columns: sheetData.headers
        });

    } catch (error: any) {
        console.error('[Sheets] Test filter error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to test filter',
            error: error.message
        });
    }
};

/**
 * POST /api/sheets/test-template
 * Test template rendering with sample data
 */
export const testTemplate = async (req: Request, res: Response) => {
    try {
        const { template, sampleData, globalVars } = req.body;

        if (!template) {
            return res.status(400).json({
                success: false,
                message: 'Missing required field: template'
            });
        }

        const data = sampleData || [];
        const rendered = enhancedTemplateRenderer.render(template, {
            data,
            globalVars: globalVars || {}
        });

        res.json({
            success: true,
            rendered,
            dataCount: data.length
        });

    } catch (error: any) {
        console.error('[Sheets] Test template error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to test template',
            error: error.message
        });
    }
};

/**
 * GET /api/sheets/filter-presets
 * Get available filter presets
 */
export const getFilterPresets = async (req: Request, res: Response) => {
    try {
        const presets = {
            today: {
                name: 'Today\'s Items',
                description: 'Filter items for today (by day name)',
                example: {
                    column: 'Hari',
                    operator: 'equals',
                    value: '{{@today_name}}'
                }
            },
            urgentDeadline: {
                name: 'Urgent Deadlines',
                description: 'Items with deadline within X days',
                example: {
                    column: 'Deadline',
                    operator: 'date_within_days',
                    value: 3
                }
            },
            active: {
                name: 'Active Items',
                description: 'Filter by active status',
                example: {
                    column: 'Status',
                    operator: 'equals',
                    value: 'Active'
                }
            },
            notEmpty: {
                name: 'Non-Empty Values',
                description: 'Filter rows with non-empty values in specific column',
                example: {
                    column: 'ColumnName',
                    operator: 'not_empty'
                }
            }
        };

        const operators = [
            { value: 'equals', label: 'Equals', category: 'string' },
            { value: 'not_equals', label: 'Not Equals', category: 'string' },
            { value: 'contains', label: 'Contains', category: 'string' },
            { value: 'not_contains', label: 'Does Not Contain', category: 'string' },
            { value: 'starts_with', label: 'Starts With', category: 'string' },
            { value: 'ends_with', label: 'Ends With', category: 'string' },
            { value: 'is_empty', label: 'Is Empty', category: 'string' },
            { value: 'not_empty', label: 'Is Not Empty', category: 'string' },
            { value: 'greater_than', label: 'Greater Than', category: 'number' },
            { value: 'less_than', label: 'Less Than', category: 'number' },
            { value: 'between', label: 'Between', category: 'number' },
            { value: 'date_equals', label: 'Date Equals', category: 'date' },
            { value: 'date_before', label: 'Date Before', category: 'date' },
            { value: 'date_after', label: 'Date After', category: 'date' },
            { value: 'date_today', label: 'Is Today', category: 'date' },
            { value: 'date_within_days', label: 'Within X Days', category: 'date' }
        ];

        const formatters = [
            { value: 'uppercase', label: 'UPPERCASE', example: '{{Name | uppercase}}' },
            { value: 'lowercase', label: 'lowercase', example: '{{Name | lowercase}}' },
            { value: 'capitalize', label: 'Capitalize', example: '{{Name | capitalize}}' },
            { value: 'number', label: 'Number Format', example: '{{Price | number}}' },
            { value: 'currency', label: 'Currency (Rupiah)', example: '{{Price | currency}}' },
            { value: 'date', label: 'Date Format', example: '{{Deadline | date:dd/MM/yyyy}}' },
            { value: 'default', label: 'Default Value', example: '{{Value | default:N/A}}' },
            { value: 'truncate', label: 'Truncate', example: '{{Text | truncate:50}}' }
        ];

        res.json({
            success: true,
            presets,
            operators,
            formatters
        });

    } catch (error: any) {
        res.status(500).json({
            success: false,
            message: 'Failed to get presets',
            error: error.message
        });
    }
};

/**
 * POST /api/sheets/preview-enhanced
 * Enhanced preview with full filter and template support
 */
export const previewEnhanced = async (req: Request, res: Response) => {
    try {
        const { url, sheetName, filters, sort, limit, template, globalVars } = req.body;

        if (!url || !sheetName || !template) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: url, sheetName, template'
            });
        }

        const spreadsheetId = googleSheetsService.extractSpreadsheetId(url);
        if (!spreadsheetId) {
            return res.status(400).json({ success: false, message: 'Invalid Google Sheets URL' });
        }

        // Fetch and process data
        const sheetData = await googleSheetsService.fetchSheetData(spreadsheetId, sheetName);
        if (!sheetData) {
            return res.status(404).json({ success: false, message: 'Sheet not found' });
        }

        let data = googleSheetsService.convertToObjects(sheetData);
        const totalRows = data.length;

        // Apply filters
        if (filters && Array.isArray(filters) && filters.length > 0) {
            data = smartSheetsProcessor.processData(data, {
                filters,
                sort,
                limit
            });
        }

        // Render template
        const rendered = enhancedTemplateRenderer.render(template, {
            data,
            globalVars: globalVars || {}
        });

        res.json({
            success: true,
            preview: rendered,
            totalRows,
            filteredRows: data.length,
            columns: sheetData.headers
        });

    } catch (error: any) {
        console.error('[Sheets] Enhanced preview error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate preview',
            error: error.message
        });
    }
};
