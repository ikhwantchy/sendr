'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { Clock, Edit2, Trash2, ChevronDown, Circle, Calendar, Target, Plus } from 'lucide-react'

interface Reminder {
    id: string
    name: string
    description: string
    schedule: string
    is_active: number
    target_id: string
    target_type: string
    group_name?: string
    last_run_at?: string
    next_run_at?: string
    last_status?: string
    template_config: string
    created_at: string
}

interface RemindersTableProps {
    botId: string
}

export default function RemindersTable({ botId }: RemindersTableProps) {
    const queryClient = useQueryClient()
    const router = useRouter()
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
    const [expandedId, setExpandedId] = useState<string | null>(null)
    const [currentPage, setCurrentPage] = useState(1)
    const itemsPerPage = 10

    const { data: reminders, isLoading } = useQuery({
        queryKey: ['reminders', botId],
        queryFn: async () => {
            const response = await api.reminders.getByBot(botId)
            return response.data.data || response.data || []
        },
    })

    const paginatedReminders = (reminders || []).slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
    const totalPages = Math.ceil((reminders || []).length / itemsPerPage)

    const toggleMutation = useMutation({
        mutationFn: async (id: string) => {
            return await api.reminders.toggle(id)
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['reminders', botId] })
            toast.success('Reminder status updated')
        },
        onError: () => {
            toast.error('Failed to update reminder')
        },
    })

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            return await api.reminders.delete(id)
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['reminders', botId] })
            toast.success('Reminder deleted successfully')
            setDeleteConfirm(null)
        },
        onError: () => {
            toast.error('Failed to delete reminder')
        },
    })

    const formatSchedule = (cron: string): string => {
        if (cron === 'now') return 'Send Now'
        const parts = cron.split(' ')
        if (parts.length !== 5) return cron

        const [minute, hour, dom, month, dow] = parts

        // Weekly schedule
        if (dow !== '*') {
            const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
            return `Weekly · ${days[parseInt(dow)]} ${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`
        }

        // Daily schedule
        if (dom === '*' && month === '*') {
            return `Daily · ${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`
        }

        // Once schedule
        if (dom !== '*' && month !== '*') {
            return `Once · ${dom}/${month} ${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`
        }

        return cron
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-24 bg-zinc-900/30 border border-zinc-800/50 rounded-2xl">
                <div className="relative w-12 h-12">
                    <div className="absolute inset-0 rounded-full border-2 border-zinc-800"></div>
                    <div className="absolute inset-0 rounded-full border-2 border-blue-500 border-t-transparent animate-spin"></div>
                </div>
            </div>
        )
    }

    if (!reminders || reminders.length === 0) {
        return (
            <div className="text-center py-48 bg-zinc-900/30 border border-dashed border-zinc-800/50 rounded-2xl min-h-[600px] flex flex-col items-center justify-center">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-zinc-800/50 rounded-3xl mb-6 shadow-xl border border-zinc-700/50">
                    <Clock className="w-10 h-10 text-zinc-500" />
                </div>
                <h3 className="text-xl font-bold text-zinc-100 mb-3">No Reminders Yet</h3>
                <p className="text-zinc-400 text-sm max-w-xs mx-auto leading-relaxed">Schedule your first automated reminder to keep your customers engaged.</p>
            </div>
        )
    }

    return (
        <div className="flex flex-col">
            {/* Desktop Table View */}
            <div className="hidden md:block">
                <table className="w-full table-fixed">
                    <thead>
                        <tr className="bg-zinc-800/50 rounded-t-xl">
                            <th className="text-left py-3 px-4 text-sm font-medium text-zinc-400 w-[20%] rounded-tl-xl">Reminder</th>
                            <th className="text-center py-3 px-4 text-sm font-medium text-zinc-400 w-[16%]">Schedule</th>
                            <th className="text-center py-3 px-4 text-sm font-medium text-zinc-400 w-[13%]">Status</th>
                            <th className="text-center py-3 px-4 text-sm font-medium text-zinc-400 w-[15%]">Target</th>
                            <th className="text-center py-3 px-4 text-sm font-medium text-zinc-400 w-[16%]">Next Run</th>
                            <th className="text-right py-3 px-4 text-sm font-medium text-zinc-400 w-[20%] rounded-tr-xl">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedReminders.map((reminder: Reminder) => {
                            const isActive = reminder.is_active === 1
                            const isExpanded = expandedId === reminder.id
                            const templateConfig = JSON.parse(reminder.template_config || '{}')

                            return (
                                <>
                                    <tr
                                        key={reminder.id}
                                        className="border-b border-zinc-800/50 hover:bg-zinc-900/50 transition-colors h-[52px]"
                                    >
                                        {/* Name */}
                                        <td className="py-4 px-4">
                                            <div className="flex items-center gap-2">
                                                <Clock className="w-4 h-4 text-blue-400 flex-shrink-0" />
                                                <span className="text-zinc-100 font-medium truncate max-w-[180px]">
                                                    {reminder.name}
                                                </span>
                                            </div>
                                        </td>

                                        {/* Schedule */}
                                        <td className="py-4 px-4 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <Calendar className="w-3.5 h-3.5 text-zinc-600" />
                                                <span className="text-zinc-400 text-sm">
                                                    {formatSchedule(reminder.schedule)}
                                                </span>
                                            </div>
                                        </td>

                                        {/* Status Toggle */}
                                        <td className="py-4 px-4 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <button
                                                    onClick={() => toggleMutation.mutate(reminder.id)}
                                                    disabled={toggleMutation.isPending}
                                                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${isActive ? 'bg-emerald-500' : 'bg-zinc-700'
                                                        }`}
                                                >
                                                    <span
                                                        className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${isActive ? 'translate-x-5' : 'translate-x-1'
                                                            }`}
                                                    />
                                                </button>
                                                <span className={`text-xs font-medium ${isActive ? 'text-emerald-400' : 'text-zinc-500'}`}>
                                                    {isActive ? 'On' : 'Off'}
                                                </span>
                                            </div>
                                        </td>

                                        {/* Target */}
                                        <td className="py-4 px-4 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <Target className="w-3.5 h-3.5 text-zinc-600" />
                                                <span className="text-zinc-400 text-sm truncate max-w-[120px]">
                                                    {reminder.group_name || reminder.target_id || 'Unknown'}
                                                </span>
                                            </div>
                                        </td>

                                        {/* Next Run */}
                                        <td className="py-4 px-4 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                {reminder.next_run_at && isActive ? (
                                                    <span className="text-zinc-400 text-sm">
                                                        {new Date(reminder.next_run_at).toLocaleDateString('en-GB', {
                                                            day: '2-digit',
                                                            month: '2-digit',
                                                        })} · {new Date(reminder.next_run_at).toLocaleTimeString('en-GB', {
                                                            hour: '2-digit',
                                                            minute: '2-digit',
                                                            hour12: false
                                                        })}
                                                    </span>
                                                ) : (
                                                    <span className="text-zinc-600 text-sm">-</span>
                                                )}
                                            </div>
                                        </td>

                                        {/* Actions */}
                                        <td className="py-4 px-4">
                                            <div className="flex items-center justify-end gap-2">
                                                {deleteConfirm === reminder.id ? (
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => deleteMutation.mutate(reminder.id)}
                                                            className="px-3 py-1.5 rounded-lg bg-red-500 text-white text-xs font-medium hover:bg-red-600 transition-colors"
                                                        >
                                                            Delete
                                                        </button>
                                                        <button
                                                            onClick={() => setDeleteConfirm(null)}
                                                            className="px-3 py-1.5 rounded-lg bg-zinc-800/50 text-zinc-400 text-xs font-medium hover:bg-zinc-800 transition-colors"
                                                        >
                                                            Cancel
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <button
                                                            onClick={() => router.push(`/dashboard/reminders/create?botId=${botId}&edit=${reminder.id}`)}
                                                            className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/30 hover:bg-blue-500/20 transition-all flex items-center justify-center text-blue-400"
                                                            title="Edit reminder"
                                                        >
                                                            <Edit2 className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => setExpandedId(isExpanded ? null : reminder.id)}
                                                            className="w-8 h-8 rounded-lg bg-zinc-800/50 border border-zinc-700/50 hover:bg-zinc-800 hover:border-blue-500/50 transition-all flex items-center justify-center text-zinc-400 hover:text-blue-400"
                                                            title={isExpanded ? 'Collapse' : 'Expand'}
                                                        >
                                                            <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                                        </button>
                                                        <button
                                                            onClick={() => setDeleteConfirm(reminder.id)}
                                                            className="w-8 h-8 rounded-lg bg-zinc-800/50 border border-zinc-700/50 hover:bg-red-500/10 hover:border-red-500/50 transition-all flex items-center justify-center text-zinc-400 hover:text-red-400"
                                                            title="Delete reminder"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>

                                    {/* Expanded Row */}
                                    {isExpanded && (
                                        <tr>
                                            <td colSpan={6} className="border-b border-zinc-800/50">
                                                <div className="p-4 bg-zinc-900/30 space-y-3">
                                                    <div>
                                                        <div className="text-xs text-zinc-500 mb-2">Message Content</div>
                                                        <div className="p-3 bg-zinc-800/50 rounded-lg text-sm text-zinc-300 whitespace-pre-wrap border border-zinc-700/50 font-mono">
                                                            {templateConfig.body || templateConfig.template || 'No content'}
                                                        </div>
                                                    </div>
                                                    {reminder.description && (
                                                        <div>
                                                            <div className="text-xs text-zinc-500 mb-1">Description</div>
                                                            <p className="text-sm text-zinc-400">{reminder.description}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </>
                            )
                        })}

                        {/* Empty rows to fill up to 10 */}
                        {Array.from({ length: Math.max(0, itemsPerPage - paginatedReminders.length) }).map((_, index) => (
                            <tr key={`empty-${index}`} className="border-b border-zinc-800/50 h-[52px]">
                                <td className="py-4 px-4">{'\u00A0'}</td>
                                <td className="py-4 px-4">{'\u00A0'}</td>
                                <td className="py-4 px-4">{'\u00A0'}</td>
                                <td className="py-4 px-4">{'\u00A0'}</td>
                                <td className="py-4 px-4">{'\u00A0'}</td>
                                <td className="py-4 px-4">{'\u00A0'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Pagination - Desktop Only */}
            <div className="hidden md:flex items-center justify-between px-4 py-3 bg-zinc-800/50 rounded-b-xl">
                {totalPages > 1 ? (
                    <>
                        <div className="text-sm text-zinc-500">
                            Showing <span className="text-zinc-300 font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="text-zinc-300 font-medium">{Math.min(currentPage * itemsPerPage, (reminders || []).length)}</span> of <span className="text-zinc-300 font-medium">{(reminders || []).length}</span> reminders
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="px-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-400 text-xs font-medium hover:bg-zinc-700 disabled:opacity-50 transition-all"
                            >
                                Previous
                            </button>
                            <div className="flex items-center gap-1">
                                {[...Array(totalPages)].map((_, i) => (
                                    <button
                                        key={i}
                                        onClick={() => setCurrentPage(i + 1)}
                                        className={`w-8 h-8 rounded-lg text-xs font-medium transition-all ${currentPage === i + 1 ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}
                                    >
                                        {i + 1}
                                    </button>
                                ))}
                            </div>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="px-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-400 text-xs font-medium hover:bg-zinc-700 disabled:opacity-50 transition-all"
                            >
                                Next
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="text-sm text-zinc-500">
                        Showing <span className="text-zinc-300 font-medium">{(reminders || []).length}</span> reminders
                    </div>
                )}
            </div>

            {/* Mobile Pagination */}
            <div className="md:hidden flex items-center justify-between px-4 py-3 bg-zinc-800/50 rounded-xl mt-3">
                {totalPages > 1 ? (
                    <>
                        <div className="text-xs text-zinc-500">
                            {currentPage}/{totalPages}
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="px-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-400 text-xs font-medium hover:bg-zinc-700 disabled:opacity-50 transition-all"
                            >
                                Prev
                            </button>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="px-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-400 text-xs font-medium hover:bg-zinc-700 disabled:opacity-50 transition-all"
                            >
                                Next
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="text-xs text-zinc-500">
                        {(reminders || []).length} reminders
                    </div>
                )}
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-3">
                {paginatedReminders.map((reminder: Reminder) => {
                    const isActive = reminder.is_active === 1
                    const isExpanded = expandedId === reminder.id
                    const templateConfig = JSON.parse(reminder.template_config || '{}')

                    return (
                        <div
                            key={reminder.id}
                            className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl overflow-hidden hover:bg-zinc-900/80 transition-all"
                        >
                            <div className="p-4">
                                {/* Top: Toggle + Name + Status */}
                                <div className="flex items-center gap-3 mb-3">
                                    <button
                                        onClick={() => toggleMutation.mutate(reminder.id)}
                                        disabled={toggleMutation.isPending}
                                        className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${isActive ? 'bg-emerald-500' : 'bg-zinc-700'
                                            }`}
                                    >
                                        <div
                                            className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${isActive ? 'translate-x-5' : 'translate-x-0'
                                                }`}
                                        />
                                    </button>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Clock className="w-4 h-4 text-blue-400 flex-shrink-0" />
                                            <h3 className="text-zinc-100 font-semibold truncate">{reminder.name}</h3>
                                        </div>
                                    </div>

                                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border flex-shrink-0 ${isActive
                                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
                                        : 'bg-zinc-500/10 border-zinc-500/20 text-zinc-500'
                                        }`}>
                                        <Circle className="w-2 h-2 fill-current" />
                                        <span>{isActive ? 'Active' : 'Paused'}</span>
                                    </span>
                                </div>

                                {/* Middle: Schedule + Target */}
                                <div className="space-y-2 mb-3">
                                    <div className="flex items-center gap-2 text-sm">
                                        <Calendar className="w-3.5 h-3.5 text-zinc-600" />
                                        <span className="text-zinc-400">{formatSchedule(reminder.schedule)}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm">
                                        <Target className="w-3.5 h-3.5 text-zinc-600" />
                                        <span className="text-zinc-400 truncate">
                                            {reminder.group_name || reminder.target_id || 'Unknown'}
                                        </span>
                                    </div>
                                    {reminder.next_run_at && isActive && (
                                        <div className="flex items-center gap-2 text-sm">
                                            <Clock className="w-3.5 h-3.5 text-zinc-600" />
                                            <span className="text-zinc-400">
                                                Next: {new Date(reminder.next_run_at).toLocaleDateString('en-GB', {
                                                    day: '2-digit',
                                                    month: '2-digit',
                                                })} · {new Date(reminder.next_run_at).toLocaleTimeString('en-GB', {
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                    hour12: false
                                                })}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* Bottom: Actions */}
                                <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800/50">
                                    <button
                                        onClick={() => router.push(`/dashboard/reminders/create?botId=${botId}&edit=${reminder.id}`)}
                                        className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/30 hover:bg-blue-500/20 transition-all flex items-center justify-center text-blue-400"
                                        title="Edit reminder"
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </button>

                                    <button
                                        onClick={() => setExpandedId(isExpanded ? null : reminder.id)}
                                        className="w-8 h-8 rounded-lg bg-zinc-800/50 border border-zinc-700/50 hover:bg-zinc-800 hover:border-blue-500/50 transition-all flex items-center justify-center text-zinc-400 hover:text-blue-400"
                                        title={isExpanded ? 'Collapse' : 'Expand'}
                                    >
                                        <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                    </button>

                                    {deleteConfirm === reminder.id ? (
                                        <div className="flex items-center gap-2 text-right">
                                            <button
                                                onClick={() => deleteMutation.mutate(reminder.id)}
                                                className="px-3 py-1.5 rounded-lg bg-red-500 text-white text-xs font-medium hover:bg-red-600 transition-colors"
                                            >
                                                Delete
                                            </button>
                                            <button
                                                onClick={() => setDeleteConfirm(null)}
                                                className="px-3 py-1.5 rounded-lg bg-zinc-800/50 text-zinc-400 text-xs font-medium hover:bg-zinc-800 transition-colors"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => setDeleteConfirm(reminder.id)}
                                            className="w-8 h-8 rounded-lg bg-zinc-800/50 border border-zinc-700/50 hover:bg-red-500/10 hover:border-red-500/50 transition-all flex items-center justify-center text-zinc-400 hover:text-red-400"
                                            title="Delete reminder"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Expanded Content */}
                            {isExpanded && (
                                <div className="border-t border-zinc-800/50 p-4 bg-zinc-900/30 space-y-3">
                                    <div>
                                        <div className="text-xs text-zinc-500 mb-2">Message Content</div>
                                        <div className="p-3 bg-zinc-800/50 rounded-lg text-sm text-zinc-300 whitespace-pre-wrap border border-zinc-700/50 font-mono">
                                            {templateConfig.body || templateConfig.template || 'No content'}
                                        </div>
                                    </div>
                                    {reminder.description && (
                                        <div>
                                            <div className="text-xs text-zinc-500 mb-1">Description</div>
                                            <p className="text-sm text-zinc-400">{reminder.description}</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>
        </div >
    )
}
