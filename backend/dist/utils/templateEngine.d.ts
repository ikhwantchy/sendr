/**
 * Template Engine
 * Renders templates with variable substitution
 *
 * Supports:
 * - {{variable}} - Simple variable
 * - {{list}} - Array formatting
 * - {{tanggal}} - Date formatting
 */
declare class TemplateEngine {
    /**
     * Render template with variables
     */
    render(template: string, variables: Record<string, any>): string;
    /**
     * Format array as numbered list
     */
    private formatArray;
    /**
     * Format date
     */
    private formatDate;
    /**
     * Check if string is a date
     */
    private isDateString;
    /**
     * Extract variables from template
     */
    extractVariables(template: string): string[];
    /**
     * Validate template (check for syntax errors)
     */
    validate(template: string): {
        valid: boolean;
        errors: string[];
    };
}
export declare const templateEngine: TemplateEngine;
export {};
//# sourceMappingURL=templateEngine.d.ts.map