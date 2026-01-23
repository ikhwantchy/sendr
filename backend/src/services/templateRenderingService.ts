import Handlebars from 'handlebars';
import { format, parseISO, isWithinInterval, addDays, startOfDay, endOfDay } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

/**
 * Template Rendering Service
 * Renders Handlebars templates with Google Sheets data and custom helpers
 */
class TemplateRenderingService {
    private handlebars: typeof Handlebars;

    constructor() {
        this.handlebars = Handlebars.create();
        this.registerHelpers();
    }

    /**
     * Register custom Handlebars helpers
     */
    private registerHelpers() {
        // Loop helper for iterating arrays
        this.handlebars.registerHelper('loop', function (context, options) {
            if (!Array.isArray(context) || context.length === 0) {
                return options.inverse(this);
            }
            let result = '';
            for (let i = 0; i < context.length; i++) {
                result += options.fn(context[i]);
            }
            return result;
        });

        // Group helper for grouping by field
        this.handlebars.registerHelper('group', function (context, field, options) {
            if (!Array.isArray(context)) return '';

            const groups: Record<string, any[]> = {};
            context.forEach(item => {
                const key = item[field] || 'Unknown';
                if (!groups[key]) groups[key] = [];
                groups[key].push(item);
            });

            let result = '';
            Object.keys(groups).forEach(groupName => {
                result += options.fn({ groupName, items: groups[groupName] });
            });
            return result;
        });

        // Date formatting helper
        this.handlebars.registerHelper('dateFormat', function (dateStr, formatStr = 'dd/MM/yyyy') {
            if (!dateStr) return '';
            try {
                const date = typeof dateStr === 'string' ? parseISO(dateStr) : dateStr;
                return format(date, formatStr, { locale: localeId });
            } catch {
                return dateStr;
            }
        });

        // Index helper (1-indexed)
        this.handlebars.registerHelper('index', function (options) {
            return options.data.index + 1;
        });

        // Conditional helpers
        this.handlebars.registerHelper('eq', (a, b) => a === b);
        this.handlebars.registerHelper('ne', (a, b) => a !== b);
        this.handlebars.registerHelper('lt', (a, b) => a < b);
        this.handlebars.registerHelper('gt', (a, b) => a > b);
        this.handlebars.registerHelper('lte', (a, b) => a <= b);
        this.handlebars.registerHelper('gte', (a, b) => a >= b);

        // Reach helper - check if deadline is within N days
        this.handlebars.registerHelper('reach', function (dateField, days, options) {
            if (!this[dateField]) return options.inverse(this);

            try {
                const deadline = parseISO(this[dateField]);
                const now = startOfDay(new Date());
                const futureLimit = endOfDay(addDays(now, parseInt(days)));

                if (isWithinInterval(deadline, { start: now, end: futureLimit })) {
                    return options.fn(this);
                }
            } catch (e) {
                console.error('Reach helper error:', e);
            }
            return options.inverse(this);
        });

        // Dosen helper - filter by dosen name
        this.handlebars.registerHelper('dosen', function (context, dosenName, options) {
            if (!Array.isArray(context)) return '';
            const filtered = context.filter(item => item.dosen === dosenName);
            if (filtered.length === 0) return options.inverse(this);

            let result = '';
            filtered.forEach(item => {
                result += options.fn(item);
            });
            return result;
        });
    }

    /**
     * Render a Handlebars template with data
     */
    render(template: string, data: any): string {
        try {
            const compiledTemplate = this.handlebars.compile(template);
            return compiledTemplate(data);
        } catch (error: any) {
            console.error('Template rendering error:', error.message);
            throw new Error(`Failed to render template: ${error.message}`);
        }
    }

    /**
     * Render template with Google Sheets data
     */
    renderWithSheetData(template: string, sheetData: any[]): string {
        // Convert array of objects to template-friendly format
        const data = {
            rows: sheetData,
            count: sheetData.length,
            today: format(new Date(), 'dd MMMM yyyy', { locale: localeId })
        };

        return this.render(template, data);
    }
}

export default new TemplateRenderingService();
