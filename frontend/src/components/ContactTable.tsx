'use client'

import { useState, useCallback } from 'react'
import { Plus, Trash2, GripVertical, X } from 'lucide-react'

export interface ContactRow {
    id: string
    phone: string
    [key: string]: string
}

export interface ContactColumn {
    id: string
    name: string
    required?: boolean
}

interface ContactTableProps {
    contacts: ContactRow[]
    columns: ContactColumn[]
    onChange: (contacts: ContactRow[], columns: ContactColumn[]) => void
    className?: string
}

const generateId = () => Math.random().toString(36).substring(2, 9)

export default function ContactTable({ contacts, columns, onChange, className = '' }: ContactTableProps) {
    const [editingColumnId, setEditingColumnId] = useState<string | null>(null)
    const [newColumnName, setNewColumnName] = useState('')

    // Add a new row
    const addRow = useCallback(() => {
        const newRow: ContactRow = { id: generateId(), phone: '' }
        columns.forEach(col => {
            if (col.id !== 'phone') {
                newRow[col.id] = ''
            }
        })
        onChange([...contacts, newRow], columns)
    }, [contacts, columns, onChange])

    // Remove a row
    const removeRow = useCallback((rowId: string) => {
        onChange(contacts.filter(c => c.id !== rowId), columns)
    }, [contacts, columns, onChange])

    // Update a cell value
    const updateCell = useCallback((rowId: string, columnId: string, value: string) => {
        onChange(
            contacts.map(c => c.id === rowId ? { ...c, [columnId]: value } : c),
            columns
        )
    }, [contacts, columns, onChange])

    // Add a new column
    const addColumn = useCallback(() => {
        const newCol: ContactColumn = { id: generateId(), name: 'New Column' }
        const updatedContacts = contacts.map(c => ({ ...c, [newCol.id]: '' }))
        onChange(updatedContacts, [...columns, newCol])
        setEditingColumnId(newCol.id)
        setNewColumnName('New Column')
    }, [contacts, columns, onChange])

    // Rename a column
    const renameColumn = useCallback((colId: string, newName: string) => {
        onChange(
            contacts,
            columns.map(c => c.id === colId ? { ...c, name: newName } : c)
        )
        setEditingColumnId(null)
        setNewColumnName('')
    }, [contacts, columns, onChange])

    // Remove a column
    const removeColumn = useCallback((colId: string) => {
        const updatedColumns = columns.filter(c => c.id !== colId)
        const updatedContacts = contacts.map(c => {
            const { [colId]: _, ...rest } = c
            return rest as ContactRow
        })
        onChange(updatedContacts, updatedColumns)
    }, [contacts, columns, onChange])

    // Get variable names for use in message templates
    const getVariables = () => columns.map(c => c.name)

    return (
        <div className={`space-y-3 ${className}`}>
            {/* Table Container */}
            <div className="border border-zinc-200 dark:border-zinc-800 overflow-hidden bg-white dark:bg-zinc-900/50">
                {/* Table Header */}
                <div className="flex items-stretch bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-700">
                    {/* Row Number Header */}
                    <div className="w-10 flex-shrink-0 px-2 py-2.5 flex items-center justify-center border-r border-zinc-200 dark:border-zinc-700">
                        <span className="text-xs font-semibold text-zinc-400">#</span>
                    </div>
                    {columns.map((col, idx) => (
                        <div
                            key={col.id}
                            className="flex-1 min-w-[120px] px-3 py-2.5 flex items-center gap-2 border-r border-zinc-200 dark:border-zinc-700"
                        >
                            {editingColumnId === col.id ? (
                                <input
                                    type="text"
                                    autoFocus
                                    value={newColumnName}
                                    onChange={(e) => setNewColumnName(e.target.value)}
                                    onBlur={() => renameColumn(col.id, newColumnName)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') renameColumn(col.id, newColumnName)
                                        if (e.key === 'Escape') { setEditingColumnId(null); setNewColumnName('') }
                                    }}
                                    className="flex-1 px-2 py-1 text-xs font-medium bg-white dark:bg-zinc-800 border border-blue-500 rounded text-zinc-900 dark:text-white outline-none"
                                />
                            ) : (
                                <span
                                    onClick={() => {
                                        if (col.id !== 'phone') {
                                            setEditingColumnId(col.id)
                                            setNewColumnName(col.name)
                                        }
                                    }}
                                    className={`text-xs font-semibold uppercase tracking-wide ${col.id === 'phone' ? 'text-zinc-500 dark:text-zinc-400' : 'text-zinc-600 dark:text-zinc-300 cursor-pointer hover:text-blue-500 dark:hover:text-blue-400'}`}
                                >
                                    {col.name} {col.required && <span className="text-red-500">*</span>}
                                </span>
                            )}
                            {col.id !== 'phone' && !editingColumnId && (
                                <button
                                    type="button"
                                    onClick={() => removeColumn(col.id)}
                                    className="p-1 text-zinc-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                    title="Remove column"
                                >
                                    <X size={12} />
                                </button>
                            )}
                        </div>
                    ))}
                    {/* Add Column Button */}
                    <button
                        type="button"
                        onClick={addColumn}
                        className="w-28 flex-shrink-0 px-3 py-2.5 flex items-center justify-center gap-1.5 text-xs font-medium text-blue-500 hover:text-blue-400 hover:bg-blue-500/5 dark:hover:bg-blue-500/10 transition-all border-r border-zinc-200 dark:border-zinc-700"
                    >
                        <Plus size={14} />
                        <span className="hidden sm:inline">Add Column</span>
                    </button>
                    {/* Actions Column Header */}
                    <div className="w-12 flex-shrink-0" />
                </div>

                {/* Table Body */}
                <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {contacts.length === 0 ? (
                        <div className="px-4 py-8 text-center">
                            <p className="text-sm text-zinc-400 dark:text-zinc-500">No contacts yet. Click "Add Row" to start.</p>
                        </div>
                    ) : (
                        contacts.map((row, rowIdx) => (
                            <div key={row.id} className="flex items-stretch hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors group">
                                {/* Row Number */}
                                <div className="w-10 flex-shrink-0 px-2 py-2.5 flex items-center justify-center border-r border-zinc-200 dark:border-zinc-700">
                                    <span className="text-xs text-zinc-400">{rowIdx + 1}</span>
                                </div>
                                {columns.map((col, colIdx) => (
                                    <div
                                        key={col.id}
                                        className="flex-1 min-w-[120px] border-r border-zinc-200 dark:border-zinc-700"
                                    >
                                        <input
                                            type="text"
                                            value={row[col.id] || ''}
                                            onChange={(e) => updateCell(row.id, col.id, e.target.value)}
                                            placeholder={col.id === 'phone' ? '628xxx' : `Enter ${col.name.toLowerCase()}...`}
                                            className="w-full px-3 py-2.5 bg-transparent text-sm text-zinc-900 dark:text-white placeholder-zinc-300 dark:placeholder-zinc-600 outline-none focus:bg-blue-50/50 dark:focus:bg-blue-500/5 transition-colors"
                                        />
                                    </div>
                                ))}
                                {/* Placeholder for Add Column alignment */}
                                <div className="w-28 flex-shrink-0 border-r border-zinc-200 dark:border-zinc-700" />
                                {/* Delete Row Button */}
                                <div className="w-12 flex-shrink-0 flex items-center justify-center">
                                    <button
                                        type="button"
                                        onClick={() => removeRow(row.id)}
                                        className="p-1.5 text-zinc-300 dark:text-zinc-600 hover:text-red-500 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                                        title="Remove row"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Add Row Button */}
                <div className="border-t border-zinc-200 dark:border-zinc-700">
                    <button
                        type="button"
                        onClick={addRow}
                        className="w-full px-4 py-3 flex items-center justify-center gap-2 text-sm font-medium text-zinc-500 dark:text-zinc-400 hover:text-blue-500 dark:hover:text-blue-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-all"
                    >
                        <Plus size={16} />
                        Add Row
                    </button>
                </div>
            </div>
        </div>
    )
}

// Helper function to convert ContactTable data to the format expected by backend
export function contactTableToString(contacts: ContactRow[], columns: ContactColumn[]): string {
    return contacts
        .filter(c => c.phone?.trim())
        .map(c => {
            const parts = [c.phone]
            columns.forEach(col => {
                if (col.id !== 'phone' && c[col.id]) {
                    parts.push(c[col.id])
                }
            })
            return parts.join(',')
        })
        .join('\n')
}

// Helper function to get parsed contacts with all fields
export function contactTableToParsedContacts(contacts: ContactRow[], columns: ContactColumn[]): Array<{ phone: string; name: string; [key: string]: string }> {
    return contacts
        .filter(c => c.phone?.trim())
        .map(c => {
            const result: { phone: string; name: string; [key: string]: string } = {
                phone: c.phone,
                name: ''
            }
            
            // First pass: find the "Name" column specifically
            const nameColumn = columns.find(col => col.name.toLowerCase() === 'name')
            if (nameColumn && c[nameColumn.id]) {
                result.name = c[nameColumn.id]
            }
            
            // Second pass: add all columns by their display name
            columns.forEach(col => {
                if (col.id !== 'phone') {
                    result[col.name] = c[col.id] || ''
                    
                    // If no name was found and this is first non-empty value, use as fallback name
                    if (!result.name && c[col.id]) {
                        result.name = c[col.id]
                    }
                }
            })
            return result
        })
}

// Helper to get available variables from columns
export function getContactTableVariables(columns: ContactColumn[]): string[] {
    return columns.map(c => c.name)
}
