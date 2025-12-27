'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { toast } from 'sonner'

interface Reminder {
    id: string
    title: string
    message: string
    scheduled_at: string
    is_active: boolean
    category?: 'once' | 'daily' | 'weekly' | 'monthly'
    status: 'pending' | 'sent' | 'failed'
    created_at: string
}

interface RemindersTableProps {
    botId: string
}

export default function RemindersTable({ botId }: RemindersTableProps) {
    const queryClient = useQueryClient()
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
        mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
            return await api.reminders.update(id, { is_active })
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['reminders', botId] })
            toast.success('Reminder updated successfully')
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

    const getCategoryConfig = (category?: string) => {
        const configs: Record<string, { label: string; icon: string; color: string }> = {
            once: { label: 'One Time', icon: '📅', color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' },
            daily: { label: 'Daily', icon: '🔄', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
            weekly: { label: 'Weekly', icon: '📆', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
            monthly: { label: 'Monthly', icon: '🗓️', color: 'bg-pink-500/20 text-pink-400 border-pink-500/30' },
        }
        return configs[category || 'once'] || configs.once
    }

    const getStatusConfig = (status: string) => {
        const configs: Record<string, { label: string; color: string }> = {
            pending: { label: 'Pending', color: 'bg-yellow-500/20 text-yellow-400' },
            sent: { label: 'Sent', color: 'bg-green-500/20 text-green-400' },
            failed: { label: 'Failed', color: 'bg-red-500/20 text-red-400' },
        }
        return configs[status] || configs.pending
    }

    const isPast = (date: string) => {
        return new Date(date) < new Date()
    }

    const getTimeUntil = (date: string) => {
        const now = new Date()
        const scheduled = new Date(date)
        const diff = scheduled.getTime() - now.getTime()

        if (diff < 0) return 'Past due'

        const days = Math.floor(diff / (1000 * 60 * 60 * 24))
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

        if (days > 0) return `in ${days}d ${hours}h`
        if (hours > 0) return `in ${hours}h ${minutes}m`
        return `in ${minutes}m`
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
            <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 bg-gray-500/20 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">No Reminders Yet</h3>
                <p className="text-gray-400 text-sm">Schedule your first reminder to stay on top of things</p>
            </div>
        )
    }

    return (
        <div className="space-y-3">
            {reminders.map((reminder: Reminder) => {
                const categoryConfig = getCategoryConfig(reminder.category)
                const statusConfig = getStatusConfig(reminder.status)
                const isExpanded = expandedId === reminder.id
                const past = isPast(reminder.scheduled_at)

                return (
                    <div
                        key={reminder.id}
                        className="glass rounded-xl border border-white/10 overflow-hidden hover:border-white/20 transition-all"
                    >
                        {/* Main Content */}
                        <div className="p-4">
                            <div className="flex items-start justify-between gap-4">
                                {/* Reminder Info */}
                                <div className="flex-1 space-y-3">
                                    {/* Header */}
                                    <div className="flex items-center gap-3">
                                        {/* Active Toggle */}
                                        <button
                                            onClick={() =>
                                                toggleMutation.mutate({
                                                    id: reminder.id,
                                                    is_active: !reminder.is_active,
                                                })
                                            }
                                            className={`relative w-11 h-6 rounded-full transition-colors ${reminder.is_active ? 'bg-green-500' : 'bg-gray-600'
                                                }`}
                                        >
                                            <div
                                                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${reminder.is_active ? 'translate-x-5' : 'translate-x-0'
                                                    }`}
                                            />
                                        </button>

                                        <h3 className="text-lg font-semibold text-white">{reminder.title}</h3>

                                        {/* Category Badge */}
                                        <span
                                            className={`px-3 py-1 rounded-lg text-xs font-medium border ${categoryConfig.color}`}
                                        >
                                            {categoryConfig.icon} {categoryConfig.label}
                                        </span>

                                        {/* Status Badge */}
                                        <span className={`px-2 py-1 rounded text-xs font-medium ${statusConfig.color}`}>
                                            {statusConfig.label}
                                        </span>
                                    </div>

                                    {/* Schedule Info */}
                                    <div className="flex items-center gap-4 text-sm">
                                        <div className="flex items-center gap-2">
                                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                            <span className="text-white">
                                                {new Date(reminder.scheduled_at).toLocaleDateString('en-US', {
                                                    weekday: 'short',
                                                    year: 'numeric',
                                                    month: 'short',
                                                    day: 'numeric',
                                                })}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            <span className="text-white">
                                                {new Date(reminder.scheduled_at).toLocaleTimeString('en-US', {
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                })}
                                            </span>
                                        </div>

                                        {!past && reminder.status === 'pending' && (
                                            <span className="px-2 py-1 rounded bg-cyan-500/10 text-cyan-400 text-xs font-medium">
                                                {getTimeUntil(reminder.scheduled_at)}
                                            </span>
                                        )}

                                        {past && reminder.status === 'pending' && (
                                            <span className="px-2 py-1 rounded bg-red-500/10 text-red-400 text-xs font-medium">
                                                ⚠️ Past due
                                            </span>
                                        )}
                                    </div>

                                    {/* Created Date */}
                                    <div className="text-xs text-gray-500">
                                        Created {new Date(reminder.created_at).toLocaleDateString('en-US', {
                                            month: 'short',
                                            day: 'numeric',
                                            year: 'numeric',
                                        })}
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-2">
                                    {/* Expand/Collapse */}
                                    <button
                                        onClick={() => setExpandedId(isExpanded ? null : reminder.id)}
                                        className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 hover:border-cyan-500 transition-all flex items-center justify-center text-gray-400 hover:text-cyan-400"
                                        title={isExpanded ? 'Collapse' : 'Expand'}
                                    >
                                        <svg
                                            className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </button>

                                    {/* Delete Button */}
                                    {deleteConfirm === reminder.id ? (
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => deleteMutation.mutate(reminder.id)}
                                                className="px-3 py-1.5 rounded-lg bg-red-500 text-white text-xs font-medium hover:bg-red-600 transition-colors"
                                            >
                                                Confirm
                                            </button>
                                            <button
                                                onClick={() => setDeleteConfirm(null)}
                                                className="px-3 py-1.5 rounded-lg bg-white/5 text-gray-400 text-xs font-medium hover:bg-white/10 transition-colors"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => setDeleteConfirm(reminder.id)}
                                            className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 hover:bg-red-500/20 hover:border-red-500 transition-all flex items-center justify-center text-gray-400 hover:text-red-400"
                                            title="Delete reminder"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Expanded Content */}
                        {isExpanded && (
                            <div className="border-t border-white/10 p-4 bg-black/20">
                                <div className="space-y-3">
                                    <div>
                                        <div className="text-xs text-gray-400 mb-1">Message Preview</div>
                                        <div className="p-3 bg-white/5 rounded-lg text-sm text-gray-300 whitespace-pre-wrap">
                                            {reminder.message}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )
            })}
        </div>
    )
}
