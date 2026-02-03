"use strict";
/**
 * Template Engine
 * Renders templates with variable substitution
 *
 * Supports:
 * - {{variable}} - Simple variable
 * - {{list}} - Array formatting
 * - {{tanggal}} - Date formatting
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.templateEngine = void 0;
const date_fns_1 = require("date-fns");
class TemplateEngine {
    /**
     * Render template with variables
     */
    render(template, variables) {
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
    formatArray(arr) {
        return arr
            .map((item, index) => `${index + 1}. ${item}`)
            .join('\n');
    }
    /**
     * Format date
     */
    formatDate(date) {
        const dateObj = typeof date === 'string' ? new Date(date) : date;
        return (0, date_fns_1.format)(dateObj, 'dd/MM/yyyy HH:mm');
    }
    /**
     * Check if string is a date
     */
    isDateString(value) {
        if (typeof value !== 'string')
            return false;
        const date = new Date(value);
        return !isNaN(date.getTime());
    }
    /**
     * Extract variables from template
     */
    extractVariables(template) {
        const regex = /\{\{([^}]+)\}\}/g;
        const variables = [];
        let match;
        while ((match = regex.exec(template)) !== null) {
            variables.push(match[1].trim());
        }
        return [...new Set(variables)]; // Remove duplicates
    }
    /**
     * Validate template (check for syntax errors)
     */
    validate(template) {
        const errors = [];
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
exports.templateEngine = new TemplateEngine();
//# sourceMappingURL=templateEngine.js.map