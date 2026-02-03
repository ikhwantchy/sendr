/**
 * Data Source Service
 * Handles fetching data from external sources (Google Sheets, etc.)
 */
declare class DataSourceService {
    private cache;
    /**
     * Fetch data from a data source
     */
    fetchData(tenantId: string, dataSourceId: string, filters?: Record<string, any>): Promise<any>;
    /**
     * Fetch from Google Sheets
     */
    private fetchGoogleSheets;
    /**
     * Fetch from CSV
     */
    private fetchCSV;
    /**
     * Fetch from API
     */
    private fetchAPI;
    /**
     * Apply column mapping
     */
    private applyColumnMapping;
    /**
     * Apply filters to data
     */
    private applyFilters;
    /**
     * Get data source from database
     */
    private getDataSource;
    /**
     * Clear cache
     */
    clearCache(dataSourceId?: string): void;
}
export declare const dataSourceService: DataSourceService;
export {};
//# sourceMappingURL=dataSourceService.d.ts.map