"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const date_fns_1 = require("date-fns");
const smartSheetsProcessor_1 = __importDefault(require("./smartSheetsProcessor"));
class EnhancedTemplateRenderer {
    /**
     * Render template with data
     */
    render(template, context) {
        if (!template)
            return '';
        const contextData = context.data || [];
        let result = template;
        // 1. Process Loop Blocks (must be before item property replacement)
        // Group -> Conditional -> Loop
        result = this.processGroups(result, contextData, context);
        result = this.processConditionals(result, context);
        result = this.processLoops(result, contextData);
        // 2. Process Global and Built-in Variables
        // 2. Process Global and Built-in Variables
        const builtIn = {
            '@length': contextData.length,
            '@today': (0, date_fns_1.format)(new Date(), 'dd/MM/yyyy'),
            '@today_name': ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'][new Date().getDay()]
        };
        const allVars = {
            ...(context.globalVars || {}),
            ...builtIn
        };
        // Manual replacement for common variables (supports both {{ var }} and {{ @var }})
        Object.entries(allVars).forEach(([key, val]) => {
            const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(`{{\\s*${escapedKey}\\s*}}`, 'gi');
            result = result.replace(regex, String(val));
        });
        // 3. Process any remaining item-like properties (if data has only one item)
        if (context.data && context.data.length > 0) {
            result = this.replaceItemProperties(result, context.data[0]);
        }
        return result.trim();
    }
    processGroups(template, data, context) {
        // More flexible regex: supports by="tipe" or by "tipe" or by=tipe
        const groupRegex = /{{\s*#group\s+by\s*=?\s*["']?([^"'\s}]+)["']?\s*}}([\s\S]*?){{\s*\/group\s*}}/g;
        return template.replace(groupRegex, (match, groupBy, groupContent) => {
            if (!data || data.length === 0)
                return '';
            const grouped = smartSheetsProcessor_1.default.groupData(data, { by: groupBy });
            return Object.entries(grouped).map(([groupName, items]) => {
                // Recursive render with updated context
                return this.render(groupContent, {
                    data: items,
                    globalVars: {
                        ...(context.globalVars || {}),
                        '@groupName': groupName,
                        '@groupCount': items.length
                    },
                    timezone: context.timezone
                });
            }).join('\n\n');
        });
    }
    processLoops(template, data) {
        const loopRegex = /{{\s*#each(?:\s+([\w.]+))?\s*}}([\s\S]*?){{\s*\/each\s*}}/g;
        return template.replace(loopRegex, (match, varName, loopContent) => {
            if (!data || !Array.isArray(data) || data.length === 0) {
                console.log('⚠️ [Loop] No data to iterate');
                return '';
            }
            console.log(`🔄 [Loop] Processing ${data.length} items`);
            if (data.length > 0) {
                console.log(`🔑 [Loop] Item keys: ${Object.keys(data[0]).join(', ')}`);
            }
            return data.map((item, index) => {
                let rendered = loopContent;
                const loopVars = {
                    '@index': index + 1,
                    '@first': index === 0,
                    '@last': index === data.length - 1,
                    '@length': data.length
                };
                // Replace loop vars first
                Object.entries(loopVars).forEach(([key, val]) => {
                    const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
                    rendered = rendered.replace(regex, String(val));
                });
                // Replace item properties
                return this.replaceItemProperties(rendered, item);
            }).join('\n');
        });
    }
    processConditionals(template, context) {
        const ifElseRegex = /{{\s*#if\s+([^}]+)\s*}}([\s\S]*?)(?:{{\s*else\s*}}([\s\S]*?))?{{\s*\/if\s*}}/g;
        return template.replace(ifElseRegex, (match, condition, ifContent, elseContent) => {
            const isTrue = this.evaluateCondition(condition.trim(), context);
            return isTrue ? (ifContent || '') : (elseContent || '');
        });
    }
    evaluateCondition(condition, context) {
        // Regex to match "left operator right"
        const comparisonRegex = /(@?[\w.]+)\s*(==|!=|contains|>|<|>=|<=)\s*(.+)/;
        const match = condition.match(comparisonRegex);
        if (match) {
            const [, leftExpr, operator, rightExpr] = match;
            const leftValue = this.resolveValue(leftExpr, context);
            const rightValue = this.resolveValue(rightExpr, context);
            const left = String(leftValue || '').toLowerCase().trim();
            const right = String(rightValue || '').toLowerCase().trim();
            switch (operator) {
                case '==': return left === right;
                case '!=': return left !== right;
                case 'contains': return left.includes(right);
                case '>': return Number(leftValue) > Number(rightValue);
                case '<': return Number(leftValue) < Number(rightValue);
            }
        }
        // Truthy check
        const val = this.resolveValue(condition, context);
        return !!val && val !== '0' && val !== 'false';
    }
    resolveValue(expr, context) {
        const clean = expr.trim();
        // Literal String
        if ((clean.startsWith('"') && clean.endsWith('"')) || (clean.startsWith("'") && clean.endsWith("'"))) {
            return clean.slice(1, -1);
        }
        // Literal Number
        if (!isNaN(Number(clean)) && clean !== '')
            return Number(clean);
        // Global/Special Vars
        if (context.globalVars && clean in context.globalVars) {
            return context.globalVars[clean];
        }
        // Built-in aliases
        if (clean === '@length')
            return (context.data || []).length;
        if (clean === '@today')
            return (0, date_fns_1.format)(new Date(), 'dd/MM/yyyy');
        return undefined;
    }
    replaceItemProperties(text, item) {
        if (!item)
            return text;
        const propRegex = /{{?\s*([^}|#/@]+?)\s*(?:\|\s*([^}]+))?\s*}?}/g;
        return text.replace(propRegex, (match, prop, filter) => {
            const key = prop.trim();
            // Skip block/special variables
            if (['#', '/', '@'].includes(key[0]))
                return match;
            // Fuzzy column matching (exact -> startsWith -> includes)
            const allKeys = Object.keys(item);
            const searchKey = key.toLowerCase();
            const actualKey = allKeys.find(k => k.toLowerCase() === searchKey) ||
                allKeys.find(k => k.toLowerCase().startsWith(searchKey)) ||
                allKeys.find(k => k.toLowerCase().includes(searchKey));
            let value = actualKey ? item[actualKey] : undefined;
            if (value === undefined || value === null)
                return '';
            if (filter) {
                value = this.applyFilter(value, filter.trim());
            }
            return String(value);
        });
    }
    /**
     * Apply filter/formatter
     */
    applyFilter(value, filter) {
        const [name, ...params] = filter.split(':');
        const param = params.join(':');
        const valStr = String(value || '');
        switch (name.toLowerCase().trim()) {
            case 'upper':
            case 'uppercase': return valStr.toUpperCase();
            case 'lower':
            case 'lowercase': return valStr.toLowerCase();
            case 'cap':
            case 'capitalize': return valStr.charAt(0).toUpperCase() + valStr.slice(1).toLowerCase();
            case 'trim': return valStr.trim();
            case 'date':
                try {
                    const date = smartSheetsProcessor_1.default['parseDate'](value);
                    if (!date)
                        return valStr;
                    // Indonesian locale helpers
                    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
                    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
                    let fmt = param || 'dd/MM/yyyy';
                    let renderedDate = (0, date_fns_1.format)(date, fmt);
                    // Manual replace for Indonesian names if requested
                    if (fmt.includes('EEEE')) {
                        renderedDate = renderedDate.replace((0, date_fns_1.format)(date, 'EEEE'), days[date.getDay()]);
                    }
                    if (fmt.includes('MMMM')) {
                        renderedDate = renderedDate.replace((0, date_fns_1.format)(date, 'MMMM'), months[date.getMonth()]);
                    }
                    return renderedDate;
                }
                catch {
                    return valStr;
                }
            case 'num':
            case 'number':
                const n = Number(value);
                return isNaN(n) ? valStr : n.toLocaleString('id-ID');
            case 'currency':
            case 'rupiah':
                const c = Number(value);
                return isNaN(c) ? valStr : `Rp ${c.toLocaleString('id-ID')}`;
            case 'truncate':
                const len = parseInt(param) || 50;
                return valStr.length > len ? valStr.substring(0, len) + '...' : valStr;
            default: return value;
        }
    }
    /**
     * Get built-in variables
     */
    getBuiltInVars(timezone = 'Asia/Jakarta') {
        const now = new Date();
        const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
        const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
        return {
            '@today': (0, date_fns_1.format)(now, 'dd/MM/yyyy'),
            '@today_name': days[now.getDay()],
            '@today_date': String(now.getDate()),
            '@today_month': months[now.getMonth()],
            '@today_year': String(now.getFullYear()),
            '@now': (0, date_fns_1.format)(now, 'HH:mm'),
            '@datetime': (0, date_fns_1.format)(now, 'dd/MM/yyyy HH:mm')
        };
    }
}
exports.default = new EnhancedTemplateRenderer();
//# sourceMappingURL=enhancedTemplateRenderer.js.map