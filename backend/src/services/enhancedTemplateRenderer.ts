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
import { toZonedTime } from 'date-fns-tz';
import smartSheetsProcessor from './smartSheetsProcessor';

export interface RenderContext {
    data: any[];
    globalVars?: Record<string, any>;
    timezone?: string;
    sheetsData?: Record<string, any[]>; // Multi-sheet data: { 'schedules': [...], 'deadlines': [...] }
}

class EnhancedTemplateRenderer {

    /**
     * Render template with data
     */
    render(template: string, context: RenderContext): string {
        if (!template) return '';
        const contextData = context.data || [];
        let result = template;

        // 0. Process {{#section}} blocks first (multi-sheet support)
        if (context.sheetsData) {
            result = this.processSectionBlocks(result, context);
        }

        // 1. Process in correct order:
        // First: Filter blocks (they filter data inline before looping)
        result = this.processFilterBlocks(result, contextData, context);

        // Second: Groups (they contain their own loops/conditionals)
        result = this.processGroups(result, contextData, context);

        // Third: Process outer conditionals that wrap loops (like {{#if @length > 0}}...{{#each}}...{{/each}}...{{/if}})
        // We need to handle this specially - extract and process conditional blocks that contain loops
        result = this.processConditionalWithLoops(result, contextData, context);

        // 2. Process Global and Built-in Variables
        const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
        const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
        const tz = context.timezone || 'Asia/Jakarta';
        const now = toZonedTime(new Date(), tz);

        const builtIn: Record<string, any> = {
            '@length': contextData.length,
            '@today': format(now, 'dd/MM/yyyy'),
            '@today_name': days[now.getDay()],
            '@todayFull': `${days[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`,
            '@dayName': days[now.getDay()],
            '@time': format(now, 'HH:mm'),
            '@date': format(now, 'dd/MM/yyyy'),
            '@datetime': format(now, 'dd/MM/yyyy HH:mm'),
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

        // 4. Clean up excessive newlines (3+ consecutive newlines → 2 newlines)
        result = result.replace(/\n{3,}/g, '\n\n');

        return result.trim();
    }

    /**
     * Process {{#filter items column="value"}}...{{/filter}} blocks
     * Filters data inline and renders the inner content as a sub-digest
     * Example: {{#filter items tipe="Jadwal"}}{{@index}}. *{{nama}}*{{/filter}}
     */
    private processFilterBlocks(template: string, data: any[], context: RenderContext): string {
        // Match {{#filter items column="value"}} or {{#filter items column=value}}
        const filterRegex = /\{\{\s*#filter\s+\w+\s+(\w+)\s*=\s*"?([^"}\s]+)"?\s*\}\}([\s\S]*?)\{\{\s*\/filter\s*\}\}/g;

        return template.replace(filterRegex, (match, filterColumn, filterValue, innerContent) => {
            if (!data || data.length === 0) return '';

            // Filter data by the specified column=value
            const filtered = data.filter(row => {
                const allKeys = Object.keys(row);
                const searchKey = filterColumn.toLowerCase().trim();
                const actualKey = allKeys.find(k => k.toLowerCase().trim() === searchKey) ||
                    allKeys.find(k => k.toLowerCase().trim().includes(searchKey)) ||
                    filterColumn;
                const cellValue = String(row[actualKey] || '').toLowerCase().trim();
                return cellValue === filterValue.toLowerCase().trim();
            });

            if (filtered.length === 0) return '';

            console.log(`🔍 [Filter Block] ${filterColumn}="${filterValue}" → ${filtered.length} rows`);

            // Render inner content with filtered data as a sub-context
            // The inner content can contain {{#each}}, {{#if}}, etc.
            return this.render(innerContent, {
                data: filtered,
                globalVars: {
                    ...(context.globalVars || {}),
                    '@filterName': filterValue,
                    '@filterCount': filtered.length,
                },
                timezone: context.timezone,
            });
        });
    }

    /**
     * Process {{#section "sheetName"}}...{{/section}} blocks
     * Each section can reference a different sheet and optionally filter data inline
     * 
     * Syntax:
     *   {{#section schedules}}...{{/section}}
     *   {{#section schedules filter:Hari=@dayName}}...{{/section}}
     *   {{#section deadlines filter:Deadline=within3days}}...{{/section}}
     */
    private processSectionBlocks(template: string, context: RenderContext): string {
        // Match {{#section "Sheet Name" [filter:col=val]}}...{{/section}}
        // Group 1: Quoted sheet name
        // Group 2: Unquoted sheet name
        // Group 3: Filter expression (optional)
        // Group 4: Inner content
        const sectionRegex = /\{\{\s*#section\s+(?:["']([^"']+)["']|([^\s"'}]+))(?:\s+filter:([^}]+))?\s*\}\}([\s\S]*?)\{\{\s*\/section\s*\}\}/g;

        const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
        const tz = context.timezone || 'Asia/Jakarta';
        const todayDate = toZonedTime(new Date(), tz);
        const todayDayName = days[todayDate.getDay()].toLowerCase();

        return template.replace(sectionRegex, (match, quotedSheet, unquotedSheet, filterExpr, innerContent) => {
            const sheetName = (quotedSheet || unquotedSheet).trim();
            const sheetsData = context.sheetsData || {};

            // Find sheet data (case-insensitive)
            const sheetKey = Object.keys(sheetsData).find(
                k => k.toLowerCase() === sheetName.toLowerCase()
            );

            if (!sheetKey) {
                console.warn(`⚠️ [Section] Sheet "${sheetName}" not found in sheetsData (available: ${Object.keys(sheetsData).join(', ')})`);
                return `⚠️ Sheet "${sheetName}" not found`;
            }

            let sectionData = [...sheetsData[sheetKey]];

            // Apply inline filter if specified
            if (filterExpr) {
                const filterMatch = filterExpr.trim().match(/([\w][\w\s&]*)=(.+)/);
                if (filterMatch) {
                    const filterCol = filterMatch[1].trim();
                    let filterVal = filterMatch[2].trim();

                    // Resolve special values
                    if (filterVal === '@dayName' || filterVal === '@today_name') {
                        filterVal = todayDayName;
                    }

                    // Special: within_Xdays filter
                    const withinDaysMatch = filterVal.match(/^within(\d+)days$/i);
                    if (withinDaysMatch) {
                        const daysRange = parseInt(withinDaysMatch[1]);
                        sectionData = smartSheetsProcessor.processData(sectionData, {
                            filters: [{ column: filterCol, operator: 'date_within_days', value: daysRange }]
                        });
                    } else {
                        // Regular value filter (case-insensitive)
                        sectionData = sectionData.filter(row => {
                            const allKeys = Object.keys(row);
                            const actualKey = allKeys.find(k => k.toLowerCase().trim() === filterCol.toLowerCase().trim()) ||
                                allKeys.find(k => k.toLowerCase().trim().includes(filterCol.toLowerCase().trim()));
                            if (!actualKey) return false;
                            return String(row[actualKey] || '').toLowerCase().trim() === filterVal.toLowerCase().trim();
                        });
                    }
                }
            }

            console.log(`📋 [Section] Sheet "${sheetKey}"${filterExpr ? ` (filter: ${filterExpr.trim()})` : ''} → ${sectionData.length} items`);

            // Render inner content with section data
            return this.render(innerContent, {
                data: sectionData,
                globalVars: {
                    ...(context.globalVars || {}),
                    '@sectionName': sheetKey,
                    '@sectionCount': sectionData.length,
                },
                timezone: context.timezone,
                // Don't pass sheetsData to avoid infinite recursion
            });
        });
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
     * Supports both single-word and multi-word property names: {{#if Tugas}}, {{#if Mata Kuliah}}
     * Uses fuzzy key matching (case-insensitive) same as replaceItemProperties
     */
    private processInlineConditionals(template: string, item: any): string {
        // Support multi-word property names: {{#if Mata Kuliah}} or {{#if Tugas}}
        const inlineIfRegex = /\{\{\s*#if\s+([\w\s]+?)\s*\}\}([\s\S]*?)\{\{\s*\/if\s*\}\}/g;

        return template.replace(inlineIfRegex, (match, propName, content) => {
            const searchKey = propName.trim().toLowerCase();

            // Fuzzy key matching (same as replaceItemProperties)
            const allKeys = Object.keys(item);
            const actualKey = allKeys.find(k => k.toLowerCase().trim() === searchKey) ||
                allKeys.find(k => k.toLowerCase().trim().startsWith(searchKey)) ||
                allKeys.find(k => k.toLowerCase().trim().includes(searchKey)) ||
                propName.trim();

            const value = item[actualKey];
            const hasValue = value !== undefined && value !== null && value !== '' && String(value).trim() !== '';
            return hasValue ? content : '';
        });
    }

    /**
     * Process conditionals that may contain loops
     * Handles patterns like: {{#if @length > 0}}{{#each items}}...{{/each}}{{/if}}{{#if @length == 0}}...{{/if}}
     */
    private processConditionalWithLoops(template: string, data: any[], context: RenderContext): string {
        let result = template;

        // Process all {{#if ...}}...{{/if}} blocks
        const processIfBlocks = (text: string): string => {
            // Match {{#if condition}}content{{/if}}
            const simpleIfRegex = /\{\{\s*#if\s+([^}]+)\}\}([\s\S]*?)\{\{\s*\/if\s*\}\}/g;

            let processed = text;
            let match;
            let iterations = 0;

            // Keep replacing until no more matches
            while ((match = simpleIfRegex.exec(processed)) !== null && iterations < 20) {
                iterations++;
                const [fullMatch, condition, content] = match;

                const isTrue = this.evaluateCondition(condition.trim(), context);

                let replacement = '';
                if (isTrue) {
                    // Process loops inside this block
                    replacement = this.processLoops(content, data);
                }

                // Replace the match and reset regex
                processed = processed.replace(fullMatch, replacement);
                simpleIfRegex.lastIndex = 0; // Reset to start from beginning
            }

            return processed;
        };

        result = processIfBlocks(result);

        // Process any remaining loops not wrapped in conditionals
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
                case '>=': return Number(leftValue) >= Number(rightValue);
                case '<=': return Number(leftValue) <= Number(rightValue);
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
        const now = toZonedTime(new Date(), timezone);
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
