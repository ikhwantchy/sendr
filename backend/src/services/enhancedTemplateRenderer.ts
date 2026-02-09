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

import { format } from 'date-fns';
import smartSheetsProcessor from './smartSheetsProcessor';

export interface RenderContext {
    data: any[];
    globalVars?: Record<string, any>;
    timezone?: string;
}

class EnhancedTemplateRenderer {

    /**
     * Render template with data
     */
    render(template: string, context: RenderContext): string {
        if (!template) return '';
        const contextData = context.data || [];
        let result = template;

        // 1. Process in correct order:
        // First: Groups (they contain their own loops/conditionals)
        result = this.processGroups(result, contextData, context);
        
        // Second: Process outer conditionals that wrap loops (like {{#if @length > 0}}...{{#each}}...{{/each}}...{{/if}})
        // We need to handle this specially - extract and process conditional blocks that contain loops
        result = this.processConditionalWithLoops(result, contextData, context);

        // 2. Process Global and Built-in Variables
        // 2. Process Global and Built-in Variables
        const builtIn = {
            '@length': contextData.length,
            '@today': format(new Date(), 'dd/MM/yyyy'),
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

    private processGroups(template: string, data: any[], context: RenderContext): string {
        // More flexible regex: supports by="tipe" or by "tipe" or by=tipe
        const groupRegex = /\{\{\s*#group\s+by\s*=?\s*["']?([^"'\s}]+)["']?\s*\}\}([\s\S]*?)\{\{\s*\/group\s*\}\}/g;

        return template.replace(groupRegex, (match, groupBy, groupContent) => {
            if (!data || data.length === 0) return '';

            const grouped = smartSheetsProcessor.groupData(data, { by: groupBy });

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

    private processLoops(template: string, data: any[]): string {
        // Match {{#each}} or {{#each items}} or {{ #each items }}
        const loopRegex = /\{\{\s*#each(?:\s+([\w.]+))?\s*\}\}([\s\S]*?)\{\{\s*\/each\s*\}\}/g;

        return template.replace(loopRegex, (match, varName, loopContent) => {
            // varName could be "items" or undefined - we ignore it and always use passed data
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
                const loopVars: Record<string, any> = {
                    '@index': index + 1,
                    '@first': index === 0,
                    '@last': index === data.length - 1,
                    '@length': data.length
                };

                // Replace loop vars first
                Object.entries(loopVars).forEach(([key, val]) => {
                    const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    const regex = new RegExp(`\\{\\{\\s*${escapedKey}\\s*\\}\\}`, 'g');
                    rendered = rendered.replace(regex, String(val));
                });

                // Process inline conditionals within the loop (like {{#if Keterangan}})
                rendered = this.processInlineConditionals(rendered, item);

                // Replace item properties
                return this.replaceItemProperties(rendered, item);
            }).join('\n');
        });
    }

    /**
     * Process simple inline conditionals like {{#if PropertyName}}...{{/if}}
     */
    private processInlineConditionals(template: string, item: any): string {
        const inlineIfRegex = /\{\{\s*#if\s+(\w+)\s*\}\}([\s\S]*?)\{\{\s*\/if\s*\}\}/g;
        
        return template.replace(inlineIfRegex, (match, propName, content) => {
            // Check if the property exists and has a truthy value
            const value = item[propName];
            const hasValue = value !== undefined && value !== null && value !== '' && String(value).trim() !== '';
            return hasValue ? content : '';
        });
    }

    /**
     * Process conditionals that may contain loops
     * Handles patterns like: {{#if @length > 0}}{{#each items}}...{{/each}}{{/if}}{{#if @length == 0}}...{{/if}}
     */
    private processConditionalWithLoops(template: string, data: any[], context: RenderContext): string {
        // Match {{#if condition}}...{{/if}} blocks (non-greedy, handles nested content)
        const ifRegex = /\{\{\s*#if\s+([^}]+)\s*\}\}([\s\S]*?)\{\{\s*\/if\s*\}\}/g;
        
        let result = template;
        let lastResult = '';
        
        // Keep processing until no more changes (handles multiple if blocks)
        while (result !== lastResult) {
            lastResult = result;
            result = result.replace(ifRegex, (match, condition, content) => {
                const isTrue = this.evaluateCondition(condition.trim(), context);
                
                if (isTrue) {
                    // Process the content inside - may contain loops
                    let processedContent = content;
                    
                    // Process any loops inside this conditional
                    processedContent = this.processLoops(processedContent, data);
                    
                    // Process any nested conditionals
                    processedContent = this.processConditionalWithLoops(processedContent, data, context);
                    
                    return processedContent;
                } else {
                    // Condition is false - return empty string
                    return '';
                }
            });
        }
        
        // After all conditionals are processed, process any remaining loops not wrapped in conditionals
        result = this.processLoops(result, data);
        
        return result;
    }

    private processConditionals(template: string, context: RenderContext): string {
        const ifElseRegex = /\{\{\s*#if\s+([^}]+)\s*\}\}([\s\S]*?)(?:\{\{\s*else\s*\}\}([\s\S]*?))?\{\{\s*\/if\s*\}\}/g;

        return template.replace(ifElseRegex, (match, condition, ifContent, elseContent) => {
            const isTrue = this.evaluateCondition(condition.trim(), context);
            return isTrue ? (ifContent || '') : (elseContent || '');
        });
    }

    private evaluateCondition(condition: string, context: RenderContext): boolean {
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

    private resolveValue(expr: string, context: RenderContext): any {
        const clean = expr.trim();

        // Literal String
        if ((clean.startsWith('"') && clean.endsWith('"')) || (clean.startsWith("'") && clean.endsWith("'"))) {
            return clean.slice(1, -1);
        }

        // Literal Number
        if (!isNaN(Number(clean)) && clean !== '') return Number(clean);

        // Global/Special Vars
        if (context.globalVars && clean in context.globalVars) {
            return context.globalVars[clean];
        }

        // Built-in aliases
        if (clean === '@length') return (context.data || []).length;
        if (clean === '@today') return format(new Date(), 'dd/MM/yyyy');

        return undefined;
    }

    private replaceItemProperties(text: string, item: any): string {
        if (!item) return text;
        const propRegex = /{{?\s*([^}|#/@]+?)\s*(?:\|\s*([^}]+))?\s*}?}/g;

        return text.replace(propRegex, (match, prop, filter) => {
            const key = prop.trim();

            // Skip block/special variables
            if (['#', '/', '@'].includes(key[0])) return match;

            // Fuzzy column matching (exact -> startsWith -> includes)
            const allKeys = Object.keys(item);
            const searchKey = key.toLowerCase();

            const actualKey = allKeys.find(k => k.toLowerCase() === searchKey) ||
                allKeys.find(k => k.toLowerCase().startsWith(searchKey)) ||
                allKeys.find(k => k.toLowerCase().includes(searchKey));

            let value = actualKey ? item[actualKey] : undefined;

            if (value === undefined || value === null) return '';

            if (filter) {
                value = this.applyFilter(value, filter.trim());
            }

            return String(value);
        });
    }

    /**
     * Apply filter/formatter
     */
    private applyFilter(value: any, filter: string): any {
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
                    const date = smartSheetsProcessor['parseDate'](value);
                    if (!date) return valStr;

                    // Indonesian locale helpers
                    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
                    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

                    let fmt = param || 'dd/MM/yyyy';
                    let renderedDate = format(date, fmt);

                    // Manual replace for Indonesian names if requested
                    if (fmt.includes('EEEE')) {
                        renderedDate = renderedDate.replace(format(date, 'EEEE'), days[date.getDay()]);
                    }
                    if (fmt.includes('MMMM')) {
                        renderedDate = renderedDate.replace(format(date, 'MMMM'), months[date.getMonth()]);
                    }

                    return renderedDate;
                } catch { return valStr; }
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
            case 'urgency':
                // Format deadline with urgency indicator
                try {
                    const deadlineDate = smartSheetsProcessor['parseDate'](value);
                    if (!deadlineDate) return valStr;
                    
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    deadlineDate.setHours(0, 0, 0, 0);
                    
                    const diffTime = deadlineDate.getTime() - today.getTime();
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    
                    const formattedDate = format(deadlineDate, 'dd/MM/yyyy');
                    
                    if (diffDays < 0) {
                        return `⚫ ${formattedDate} (Lewat ${Math.abs(diffDays)} hari)`;
                    } else if (diffDays === 0) {
                        return `🔴 ${formattedDate} (HARI INI!)`;
                    } else if (diffDays === 1) {
                        return `🟠 ${formattedDate} (Besok)`;
                    } else if (diffDays === 2) {
                        return `🟡 ${formattedDate} (Lusa)`;
                    } else if (diffDays <= 3) {
                        return `🟢 ${formattedDate} (${diffDays} hari lagi)`;
                    } else {
                        return `⚪ ${formattedDate} (${diffDays} hari lagi)`;
                    }
                } catch { return valStr; }
            default: return value;
        }
    }

    /**
     * Get built-in variables
     */
    private getBuiltInVars(timezone: string = 'Asia/Jakarta'): Record<string, string> {
        const now = new Date();
        const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
        const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

        return {
            '@today': format(now, 'dd/MM/yyyy'),
            '@today_name': days[now.getDay()],
            '@today_date': String(now.getDate()),
            '@today_month': months[now.getMonth()],
            '@today_year': String(now.getFullYear()),
            '@now': format(now, 'HH:mm'),
            '@datetime': format(now, 'dd/MM/yyyy HH:mm')
        };
    }
}

export default new EnhancedTemplateRenderer();
