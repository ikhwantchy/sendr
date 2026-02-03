/**
 * Template Rendering Service
 * Renders Handlebars templates with Google Sheets data and custom helpers
 */
declare class TemplateRenderingService {
    private handlebars;
    constructor();
    /**
     * Register custom Handlebars helpers
     */
    private registerHelpers;
    /**
     * Render a Handlebars template with data
     */
    render(template: string, data: any): string;
    /**
     * Render template with Google Sheets data
     */
    renderWithSheetData(template: string, sheetData: any[]): string;
}
declare const _default: TemplateRenderingService;
export default _default;
//# sourceMappingURL=templateRenderingService.d.ts.map