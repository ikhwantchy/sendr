/**
 * Enhanced Template Renderer (V2)
 *
 * Provides powerful, robust template rendering with:
 * - Flexible whitespace support: {{ variable }} or {variable}
 * - Conditional rendering: {{#if condition}}...{{else}}...{{/if}}
 * - Loop rendering: {{#each data}}...{{/each}}
 * - Dynamic formatters: {{ date | date:yyyy }}
 * - Built-in variables: {{@today}}, {{@now}}, etc.
 */
export interface RenderContext {
    data: any[];
    globalVars?: Record<string, any>;
    timezone?: string;
}
declare class EnhancedTemplateRenderer {
    /**
     * Render template with data
     */
    render(template: string, context: RenderContext): string;
    private processGroups;
    private processLoops;
    /**
     * Process simple inline conditionals like {{#if PropertyName}}...{{/if}}
     */
    private processInlineConditionals;
    /**
     * Process conditionals that may contain loops
     * Handles patterns like: {{#if @length > 0}}{{#each items}}...{{/each}}{{/if}}{{#if @length == 0}}...{{/if}}
     */
    private processConditionalWithLoops;
    private processConditionals;
    private evaluateCondition;
    private resolveValue;
    private replaceItemProperties;
    /**
     * Apply filter/formatter
     */
    private applyFilter;
    /**
     * Get built-in variables
     */
    private getBuiltInVars;
}
declare const _default: EnhancedTemplateRenderer;
export default _default;
//# sourceMappingURL=enhancedTemplateRenderer.d.ts.map