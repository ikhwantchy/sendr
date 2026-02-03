"use strict";
/**
 * Data Source Service
 * Handles fetching data from external sources (Google Sheets, etc.)
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.dataSourceService = void 0;
const axios_1 = __importDefault(require("axios"));
const logger_1 = require("../../utils/logger");
const connection_1 = require("../../database/connection");
class DataSourceService {
    cache = new Map();
    /**
     * Fetch data from a data source
     */
    async fetchData(tenantId, dataSourceId, filters = {}) {
        // Get data source config
        const dataSource = await this.getDataSource(tenantId, dataSourceId);
        if (!dataSource) {
            throw new Error(`Data source not found: ${dataSourceId}`);
        }
        // Check cache
        const cacheKey = `${dataSourceId}:${JSON.stringify(filters)}`;
        const cached = this.cache.get(cacheKey);
        if (cached && cached.expires_at > Date.now()) {
            logger_1.logger.debug('Data source cache hit', { data_source_id: dataSourceId });
            return cached.data;
        }
        // Fetch data based on type
        let rawData;
        switch (dataSource.type) {
            case 'google_sheets':
                rawData = await this.fetchGoogleSheets(dataSource);
                break;
            case 'csv':
                rawData = await this.fetchCSV(dataSource);
                break;
            case 'api':
                rawData = await this.fetchAPI(dataSource);
                break;
            default:
                throw new Error(`Unsupported data source type: ${dataSource.type}`);
        }
        // Apply column mapping
        const mappedData = this.applyColumnMapping(rawData, dataSource.column_mapping);
        // Apply filters
        const filteredData = this.applyFilters(mappedData, filters);
        // Update cache
        this.cache.set(cacheKey, {
            data: filteredData,
            expires_at: Date.now() + (dataSource.cache_ttl * 1000),
        });
        // Update last_fetched_at
        await (0, connection_1.query)("UPDATE data_sources SET last_fetched_at = CURRENT_TIMESTAMP WHERE id = ?", [dataSourceId]);
        return filteredData;
    }
    /**
     * Fetch from Google Sheets
     */
    async fetchGoogleSheets(dataSource) {
        const { spreadsheet_id, sheet_name, range } = dataSource.connection_config;
        // Using Google Sheets API v4
        const apiKey = process.env.GOOGLE_SHEETS_API_KEY;
        if (!apiKey) {
            throw new Error('Google Sheets API key not configured');
        }
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheet_id}/values/${sheet_name}!${range || 'A:Z'}?key=${apiKey}`;
        try {
            const response = await axios_1.default.get(url);
            const rows = response.data.values || [];
            if (rows.length === 0) {
                return [];
            }
            // First row is headers
            const headers = rows[0];
            const data = rows.slice(1).map((row) => {
                const obj = {};
                headers.forEach((header, index) => {
                    obj[header] = row[index] || '';
                });
                return obj;
            });
            logger_1.logger.info('Google Sheets data fetched', {
                data_source_id: dataSource.id,
                rows: data.length,
            });
            return data;
        }
        catch (error) {
            logger_1.logger.error('Failed to fetch Google Sheets', {
                error: error.message,
                data_source_id: dataSource.id,
            });
            throw new Error(`Failed to fetch Google Sheets: ${error.message}`);
        }
    }
    /**
     * Fetch from CSV
     */
    async fetchCSV(dataSource) {
        const { url } = dataSource.connection_config;
        try {
            const response = await axios_1.default.get(url);
            const csvData = response.data;
            // Simple CSV parsing (for production, use a proper CSV library)
            const lines = csvData.split('\n');
            const headers = lines[0].split(',').map((h) => h.trim());
            const data = lines.slice(1).map((line) => {
                const values = line.split(',').map((v) => v.trim());
                const obj = {};
                headers.forEach((header, index) => {
                    obj[header] = values[index] || '';
                });
                return obj;
            });
            return data.filter((row) => Object.keys(row).length > 0);
        }
        catch (error) {
            logger_1.logger.error('Failed to fetch CSV', {
                error: error.message,
                data_source_id: dataSource.id,
            });
            throw new Error(`Failed to fetch CSV: ${error.message}`);
        }
    }
    /**
     * Fetch from API
     */
    async fetchAPI(dataSource) {
        const { url, method, headers, body } = dataSource.connection_config;
        try {
            const response = await (0, axios_1.default)({
                url,
                method: method || 'GET',
                headers: headers || {},
                data: body,
            });
            return Array.isArray(response.data) ? response.data : [response.data];
        }
        catch (error) {
            logger_1.logger.error('Failed to fetch API', {
                error: error.message,
                data_source_id: dataSource.id,
            });
            throw new Error(`Failed to fetch API: ${error.message}`);
        }
    }
    /**
     * Apply column mapping
     */
    applyColumnMapping(data, mapping) {
        if (!mapping || Object.keys(mapping).length === 0) {
            return data;
        }
        return data.map((row) => {
            const mapped = {};
            for (const [targetKey, sourceKey] of Object.entries(mapping)) {
                mapped[targetKey] = row[sourceKey];
            }
            return mapped;
        });
    }
    /**
     * Apply filters to data
     */
    applyFilters(data, filters) {
        if (!filters || Object.keys(filters).length === 0) {
            return data;
        }
        return data.filter((row) => {
            for (const [key, value] of Object.entries(filters)) {
                if (row[key] !== value) {
                    return false;
                }
            }
            return true;
        });
    }
    /**
     * Get data source from database
     */
    async getDataSource(tenantId, dataSourceId) {
        const result = await (0, connection_1.query)('SELECT * FROM data_sources WHERE id = ? AND tenant_id = ? AND is_active = true', [dataSourceId, tenantId]);
        return result.rows[0] || null;
    }
    /**
     * Clear cache
     */
    clearCache(dataSourceId) {
        if (dataSourceId) {
            // Clear specific data source cache
            for (const key of this.cache.keys()) {
                if (key.startsWith(dataSourceId)) {
                    this.cache.delete(key);
                }
            }
        }
        else {
            // Clear all cache
            this.cache.clear();
        }
        logger_1.logger.info('Data source cache cleared', { data_source_id: dataSourceId });
    }
}
exports.dataSourceService = new DataSourceService();
//# sourceMappingURL=dataSourceService.js.map