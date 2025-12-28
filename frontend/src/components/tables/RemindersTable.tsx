'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

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

    const { data: reminders, isLoading } = useQuery({
        queryKey: ['reminders', botId],
        queryFn: async () => {
            const response = await api.reminders.getByBot(botId)
            return response.data.data || response.data || []
        },
    })

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
        if (cron === 'now') return 'One-time (Now)'
        const parts = cron.split(' ')
        if (parts.length !== 5) return cron

        const [minute, hour, dom, month, dow] = parts

        if (dow !== '*') {
            const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
            return `Weekly (Every ${days[parseInt(dow)]} ${hour.padStart(2, '0')}:${minute.padStart(2, '0')})`
        }

        if (dom === '*' && month === '*') {
            return `Daily (${hour.padStart(2, '0')}:${minute.padStart(2, '0')})`
        }

        if (dom !== '*' && month !== '*') {
            return `Once (${dom}/${month} ${hour.padStart(2, '0')}:${minute.padStart(2, '0')})`
        }

        return cron
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
            </div>
        )
    }

    if (!reminders || reminders.length === 0) {
        return (
            <div className="text-center py-12 glass rounded-2xl border border-white/10">
                <div className="w-16 h-16 mx-auto mb-4 bg-gray-500/20 rounded-full flex items-center justify-center text-3xl">
                    ⏰
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">No Reminders Yet</h3>
                <p className="text-gray-400 text-sm">Schedule your first automated message for this bot</p>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            {reminders.map((reminder: Reminder) => {
                const isExpanded = expandedId === reminder.id
                const templateConfig = JSON.parse(reminder.template_config || '{}')
                const isActive = reminder.is_active === 1

                return (
                    <div
                        key={reminder.id}
                        className="glass rounded-xl border border-white/10 overflow-hidden hover:border-white/20 transition-all"
                    >
                        <div className="p-5">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                {/* Reminder Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-3 mb-2">
                                        <button
                                            onClick={() => toggleMutation.mutate(reminder.id)}
                                            disabled={toggleMutation.isPending}
                                            className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${isActive ? 'bg-green-500' : 'bg-gray-600'}`}
                                        >
                                            <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${isActive ? 'translate-x-5' : 'translate-x-0'}`} />
                                        </button>
                                        <h3 className="text-lg font-bold text-white truncate">{reminder.name}</h3>
                                        <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${isActive ? 'bg-green-500/20 text-green-400 border border-green-500/50' : 'bg-gray-500/20 text-gray-400 border border-gray-500/50'}`}>
                                            {isActive ? 'Active' : 'Paused'}
                                        </span>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-sm text-gray-400">
                                        <div className="flex items-center gap-1.5">
                                            <span>📅</span>
                                            <span>{formatSchedule(reminder.schedule)}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 min-w-0">
                                            <span>🎯</span>
                                            <span className="truncate max-w-[200px]">{reminder.group_name || reminder.target_id || 'Unknown'}</span>
                                        </div>
                                        {reminder.next_run_at && isActive && (
                                            <div className="flex items-center gap-1.5 text-cyan-400">
                                                <span>⏳ Next:</span>
                                                <span>{new Date(reminder.next_run_at).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-2 border-t md:border-t-0 pt-3 md:pt-0 border-white/5">
                                    <button
                                        onClick={() => router.push(`/dashboard/reminders/${reminder.id}/edit`)}
                                        className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 hover:border-cyan-500 transition-all flex items-center justify-center text-gray-400 hover:text-cyan-400"
                                        title="Edit"
                                    >
                                        ✏️
                                    </button>

                                    <button
                                        onClick={() => setExpandedId(isExpanded ? null : reminder.id)}
                                        className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 hover:border-purple-500 transition-all flex items-center justify-center text-gray-400 hover:text-purple-400 text-xs"
                                        title="Preview Message"
                                    >
                                        👁️
                                    </button>

                                    {deleteConfirm === reminder.id ? (
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => deleteMutation.mutate(reminder.id)}
                                                className="px-2 py-1.5 rounded-lg bg-red-500 text-white text-[10px] font-bold hover:bg-red-600 transition-colors"
                                            >
                                                Confirm
                                            </button>
                                            <button
                                                onClick={() => setDeleteConfirm(null)}
                                                className="px-2 py-1.5 rounded-lg bg-white/5 text-gray-400 text-[10px] font-bold"
                                            >
                                                X
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => setDeleteConfirm(reminder.id)}
                                            className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 hover:border-red-500 transition-all flex items-center justify-center text-gray-400 hover:text-red-400"
                                            title="Delete"
                                        >
                                            🗑️
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Preview Section */}
                        {isExpanded && (
                            <div className="border-t border-white/10 p-5 bg-white/5 space-y-4">
                                <div>
                                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Message Content</h4>
                                    <div className="p-4 bg-black/40 rounded-xl text-sm text-gray-300 whitespace-pre-wrap border border-white/5 font-mono">
                                        {templateConfig.body || templateConfig.template || 'No content'}
                                    </div>
                                </div>
                                {reminder.description && (
                                    <div>
                                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Description</h4>
                                        <p className="text-sm text-gray-400">{reminder.description}</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )
            })}
        </div>
    )
}
