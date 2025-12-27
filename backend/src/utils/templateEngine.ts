/**
 * Template Engine
 * Renders templates with variable substitution
 * 
 * Supports:
 * - {{variable}} - Simple variable
 * - {{list}} - Array formatting
 * - {{tanggal}} - Date formatting
 */

import { format } from 'date-fns';

class TemplateEngine {
    /**
     * Render template with variables
     */
    public render(template: string, variables: Record<string, any>): string {
        let result = template;

        // Replace all {{variable}} patterns
        const regex = /\{\{([^}]+)\}\}/g;

        result = result.replace(regex, (match, key) => {
            const trimmedKey = key.trim();
            const value = variables[trimmedKey];

            if (value === undefined || value === null) {
                return match; // Keep original if not found
            }

            // Handle arrays (for {{list}})
            if (Array.isArray(value)) {
                return this.formatArray(value);
            }

            // Handle dates (for {{tanggal}})
            if (value instanceof Date || this.isDateString(value)) {
                return this.formatDate(value);
            }

            // Handle objects
            if (typeof value === 'object') {
                return JSON.stringify(value);
            }

            // Return as string
            return String(value);
        });

        return result;
    }

    /**
     * Format array as numbered list
     */
    private formatArray(arr: any[]): string {
        return arr
            .map((item, index) => `${index + 1}. ${item}`)
            .join('\n');
    }

    /**
     * Format date
     */
    private formatDate(date: Date | string): string {
        const dateObj = typeof date === 'string' ? new Date(date) : date;
        return format(dateObj, 'dd/MM/yyyy HH:mm');
    }

    /**
     * Check if string is a date
     */
    private isDateString(value: any): boolean {
        if (typeof value !== 'string') return false;
        const date = new Date(value);
        return !isNaN(date.getTime());
    }

    /**
     * Extract variables from template
     */
    public extractVariables(template: string): string[] {
        const regex = /\{\{([^}]+)\}\}/g;
        const variables: string[] = [];
        let match;

        while ((match = regex.exec(template)) !== null) {
            variables.push(match[1].trim());
        }

        return [...new Set(variables)]; // Remove duplicates
    }

    /**
     * Validate template (check for syntax errors)
     */
    public validate(template: string): { valid: boolean; errors: string[] } {
        const errors: string[] = [];

        // Check for unmatched braces
        const openCount = (template.match(/\{\{/g) || []).length;
        const closeCount = (template.match(/\}\}/g) || []).length;

        if (openCount !== closeCount) {
            errors.push('Unmatched braces in template');
        }

        // Check for empty variables
        const emptyVars = template.match(/\{\{\s*\}\}/g);
        if (emptyVars) {
            errors.push('Empty variable placeholders found');
        }

        return {
            valid: errors.length === 0,
            errors,
        };
    }
}

export const templateEngine = new TemplateEngine();
