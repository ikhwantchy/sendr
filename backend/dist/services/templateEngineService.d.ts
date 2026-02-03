interface DataPipelineConfig {
    filter?: {
        column: string;
        operator: 'equals' | 'contains' | 'greater' | 'less' | 'between';
        value: any;
    }[];
    sort?: {
        column: string;
        order: 'asc' | 'desc';
    };
    limit?: number;
}
/**
 * Template Engine Service
 * Handles message template processing and variable replacement
 */
declare class TemplateEngineService {
    /**
     * Replace variables in template with actual values
     * Supports: {VAR}, {{VAR}} - case-insensitive matching
     */
    processTemplate(template: string, variables: Record<string, any>): string;
    /**
     * Render a general template with loop support
     * Format:
     * Header text
     * {{#LOOP}}
     * {{index}}. {{Nama}} - {{Status}}
     * {{/LOOP}}
     * Footer text
     */
    renderGeneralTemplate(template: string, items: any[], globalVars?: Record<string, any>): string;
    /**
     * Generate variables from sheet data for academic digest
     */
    generateAcademicDigestVariables(scheduleData: any[], tasksData: any[], timezone?: string): Record<string, any>;
    /**
     * Filter schedule for today based on day name
     */
    private filterTodaySchedule;
    /**
     * Get value from row with fuzzy column matching
     */
    private getValue;
    /**
     * Format schedule data into readable text
     * Format:
     * 1. {Mata Kuliah}
     * {Waktu}
     * {Dosen}
     */
    private formatSchedule;
    /**
     * Filter tasks with deadline <= 3 days from now
     */
    private filterUrgentTasks;
    /**
     * Format tasks data into readable text
     * Format:
     * 1. {Mata Kuliah} — {Jenis Tugas}
     * {Hari}, {Tanggal}
     * {Deskripsi/Kelompok/Materi}
     */
    private formatTasks;
    /**
     * Apply data pipeline transformations
     */
    applyDataPipeline(data: any[], config: DataPipelineConfig): any[];
    /**
     * Extract variables from template
     */
    extractVariables(template: string): string[];
    /**
     * Validate template (check if all variables can be resolved)
     */
    validateTemplate(template: string, availableVariables: string[]): {
        valid: boolean;
        missingVariables: string[];
    };
}
declare const _default: TemplateEngineService;
export default _default;
//# sourceMappingURL=templateEngineService.d.ts.map