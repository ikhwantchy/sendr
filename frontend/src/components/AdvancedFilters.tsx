/**
 * Advanced Filters Component for Google Sheets Reminder
 * Allows users to build complex filters without coding
 */

import { Plus, X, Calendar, Hash, Type } from 'lucide-react';

export interface FilterCondition {
    column: string;
    operator: string;
    value: any;
    value2?: any;
    caseInsensitive?: boolean;
}

interface AdvancedFiltersProps {
    filters: FilterCondition[];
    onChange: (filters: FilterCondition[]) => void;
    availableColumns?: string[];
}

const FILTER_OPERATORS = [
    // String operators
    { value: 'equals', label: 'Equals', category: 'string', icon: Type },
    { value: 'not_equals', label: 'Not Equals', category: 'string', icon: Type },
    { value: 'contains', label: 'Contains', category: 'string', icon: Type },
    { value: 'not_contains', label: 'Does Not Contain', category: 'string', icon: Type },
    { value: 'starts_with', label: 'Starts With', category: 'string', icon: Type },
    { value: 'ends_with', label: 'Ends With', category: 'string', icon: Type },
    { value: 'is_empty', label: 'Is Empty', category: 'string', icon: Type },
    { value: 'not_empty', label: 'Is Not Empty', category: 'string', icon: Type },

    // Number operators
    { value: 'greater_than', label: 'Greater Than', category: 'number', icon: Hash },
    { value: 'less_than', label: 'Less Than', category: 'number', icon: Hash },
    { value: 'between', label: 'Between', category: 'number', icon: Hash },

    // Date operators
    { value: 'date_equals', label: 'Date Equals', category: 'date', icon: Calendar },
    { value: 'date_before', label: 'Date Before', category: 'date', icon: Calendar },
    { value: 'date_after', label: 'Date After', category: 'date', icon: Calendar },
    { value: 'date_today', label: 'Is Today', category: 'date', icon: Calendar },
    { value: 'date_within_days', label: 'Within X Days', category: 'date', icon: Calendar },
];

const FILTER_PRESETS = [
    {
        name: 'H-3 Deadline',
        description: 'Deadlines within 3 days',
        filters: [
            { column: 'waktu', operator: 'date_within_days', value: 3 },
            { column: 'done', operator: 'equals', value: 'FALSE', caseInsensitive: true }
        ]
    },
    {
        name: 'Today Only',
        description: 'Items for today',
        filters: [
            { column: 'Hari', operator: 'equals', value: '{{@today_name}}' }
        ]
    },
    {
        name: 'Active Items',
        description: 'Status is active',
        filters: [
            { column: 'Status', operator: 'equals', value: 'Active', caseInsensitive: true }
        ]
    }
];

export default function AdvancedFilters({ filters, onChange, availableColumns = [] }: AdvancedFiltersProps) {

    const addFilter = () => {
        onChange([...filters, { column: '', operator: 'equals', value: '' }]);
    };

    const removeFilter = (index: number) => {
        onChange(filters.filter((_, i) => i !== index));
    };

    const updateFilter = (index: number, updates: Partial<FilterCondition>) => {
        const newFilters = [...filters];
        newFilters[index] = { ...newFilters[index], ...updates };
        onChange(newFilters);
    };

    const applyPreset = (preset: typeof FILTER_PRESETS[0]) => {
        onChange(preset.filters);
    };

    const needsValue = (operator: string) => {
        return !['is_empty', 'not_empty', 'date_today'].includes(operator);
    };

    const needsValue2 = (operator: string) => {
        return operator === 'between';
    };

    return (
        <div className="space-y-4">
            {/* Presets */}
            <div className="flex flex-wrap gap-2">
                <span className="text-xs text-zinc-500 font-medium">Quick Presets:</span>
                {FILTER_PRESETS.map((preset, i) => (
                    <button
                        key={i}
                        onClick={() => applyPreset(preset)}
                        className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs rounded-full border border-zinc-700 transition-colors"
                        title={preset.description}
                    >
                        {preset.name}
                    </button>
                ))}
            </div>

            {/* Filters List */}
            <div className="space-y-3">
                {filters.map((filter, index) => (
                    <div key={index} className="flex gap-2 items-start p-3 bg-zinc-900/50 border border-zinc-800 rounded-lg">
                        {/* Column */}
                        <div className="flex-1 space-y-1">
                            <label className="text-[10px] text-zinc-500 uppercase font-medium">Column</label>
                            {availableColumns.length > 0 ? (
                                <select
                                    value={filter.column}
                                    onChange={e => updateFilter(index, { column: e.target.value })}
                                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded text-white text-sm focus:ring-1 focus:ring-emerald-500/50 outline-none"
                                >
                                    <option value="">Select column...</option>
                                    {availableColumns.map(col => (
                                        <option key={col} value={col}>{col}</option>
                                    ))}
                                </select>
                            ) : (
                                <input
                                    type="text"
                                    value={filter.column}
                                    onChange={e => updateFilter(index, { column: e.target.value })}
                                    placeholder="e.g. waktu, done, Status"
                                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded text-white text-sm focus:ring-1 focus:ring-emerald-500/50 outline-none"
                                />
                            )}
                        </div>

                        {/* Operator */}
                        <div className="flex-1 space-y-1">
                            <label className="text-[10px] text-zinc-500 uppercase font-medium">Operator</label>
                            <select
                                value={filter.operator}
                                onChange={e => updateFilter(index, { operator: e.target.value })}
                                className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded text-white text-sm focus:ring-1 focus:ring-emerald-500/50 outline-none"
                            >
                                {FILTER_OPERATORS.map(op => (
                                    <option key={op.value} value={op.value}>
                                        {op.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Value */}
                        {needsValue(filter.operator) && (
                            <div className="flex-1 space-y-1">
                                <label className="text-[10px] text-zinc-500 uppercase font-medium">Value</label>
                                <input
                                    type={filter.operator.startsWith('date_') ? 'number' : 'text'}
                                    value={filter.value}
                                    onChange={e => updateFilter(index, { value: e.target.value })}
                                    placeholder={filter.operator === 'date_within_days' ? '3' : 'FALSE'}
                                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded text-emerald-400 text-sm font-medium focus:ring-1 focus:ring-emerald-500/50 outline-none"
                                />
                            </div>
                        )}

                        {/* Value2 (for between) */}
                        {needsValue2(filter.operator) && (
                            <div className="flex-1 space-y-1">
                                <label className="text-[10px] text-zinc-500 uppercase font-medium">To</label>
                                <input
                                    type="number"
                                    value={filter.value2 || ''}
                                    onChange={e => updateFilter(index, { value2: e.target.value })}
                                    placeholder="100"
                                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded text-emerald-400 text-sm font-medium focus:ring-1 focus:ring-emerald-500/50 outline-none"
                                />
                            </div>
                        )}

                        {/* Case Insensitive Toggle */}
                        {['equals', 'not_equals', 'contains', 'not_contains', 'starts_with', 'ends_with'].includes(filter.operator) && (
                            <div className="flex items-end">
                                <button
                                    onClick={() => updateFilter(index, { caseInsensitive: !filter.caseInsensitive })}
                                    className={`px-2 py-2 text-xs rounded border transition-colors ${filter.caseInsensitive
                                            ? 'bg-blue-500/20 border-blue-500/50 text-blue-400'
                                            : 'bg-zinc-900 border-zinc-800 text-zinc-500'
                                        }`}
                                    title="Case Insensitive"
                                >
                                    Aa
                                </button>
                            </div>
                        )}

                        {/* Remove Button */}
                        <div className="flex items-end">
                            <button
                                onClick={() => removeFilter(index)}
                                className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                                title="Remove filter"
                            >
                                <X size={16} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Add Filter Button */}
            <button
                onClick={addFilter}
                className="w-full px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg border border-zinc-700 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
            >
                <Plus size={16} />
                Add Filter
            </button>

            {/* Info */}
            {filters.length > 0 && (
                <div className="text-xs text-zinc-500 bg-zinc-900/50 border border-zinc-800 rounded p-3">
                    <strong className="text-zinc-400">Note:</strong> All filters are combined with AND logic.
                    Rows must match ALL filters to be included.
                </div>
            )}
        </div>
    );
}
