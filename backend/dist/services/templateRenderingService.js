"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const handlebars_1 = __importDefault(require("handlebars"));
const date_fns_1 = require("date-fns");
const locale_1 = require("date-fns/locale");
/**
 * Template Rendering Service
 * Renders Handlebars templates with Google Sheets data and custom helpers
 */
class TemplateRenderingService {
    handlebars;
    constructor() {
        this.handlebars = handlebars_1.default.create();
        this.registerHelpers();
    }
    /**
     * Register custom Handlebars helpers
     */
    registerHelpers() {
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
            if (!Array.isArray(context))
                return '';
            const groups = {};
            context.forEach(item => {
                const key = item[field] || 'Unknown';
                if (!groups[key])
                    groups[key] = [];
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
            if (!dateStr)
                return '';
            try {
                const date = typeof dateStr === 'string' ? (0, date_fns_1.parseISO)(dateStr) : dateStr;
                return (0, date_fns_1.format)(date, formatStr, { locale: locale_1.id });
            }
            catch {
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
            if (!this[dateField])
                return options.inverse(this);
            try {
                const deadline = (0, date_fns_1.parseISO)(this[dateField]);
                const now = (0, date_fns_1.startOfDay)(new Date());
                const futureLimit = (0, date_fns_1.endOfDay)((0, date_fns_1.addDays)(now, parseInt(days)));
                if ((0, date_fns_1.isWithinInterval)(deadline, { start: now, end: futureLimit })) {
                    return options.fn(this);
                }
            }
            catch (e) {
                console.error('Reach helper error:', e);
            }
            return options.inverse(this);
        });
        // Dosen helper - filter by dosen name
        this.handlebars.registerHelper('dosen', function (context, dosenName, options) {
            if (!Array.isArray(context))
                return '';
            const filtered = context.filter(item => item.dosen === dosenName);
            if (filtered.length === 0)
                return options.inverse(this);
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
    render(template, data) {
        try {
            const compiledTemplate = this.handlebars.compile(template);
            return compiledTemplate(data);
        }
        catch (error) {
            console.error('Template rendering error:', error.message);
            throw new Error(`Failed to render template: ${error.message}`);
        }
    }
    /**
     * Render template with Google Sheets data
     */
    renderWithSheetData(template, sheetData) {
        // Convert array of objects to template-friendly format
        const data = {
            rows: sheetData,
            count: sheetData.length,
            today: (0, date_fns_1.format)(new Date(), 'dd MMMM yyyy', { locale: locale_1.id })
        };
        return this.render(template, data);
    }
}
exports.default = new TemplateRenderingService();
//# sourceMappingURL=templateRenderingService.js.map