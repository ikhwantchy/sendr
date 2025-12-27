'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { toast } from 'sonner'

interface Rule {
    id: string
    trigger: string // This will be mapped from 'keyword'
    reply: string // This will be extracted from 'actions'
    is_active: boolean // This will be converted from 1/0
    match_type: 'equals' | 'contains' | 'regex' // Backend values, but frontend uses these
    created_at: string
    name?: string // New field
}

interface RulesTableProps {
    botId: string
}

export default function RulesTable({ botId }: RulesTableProps) {
    const queryClient = useQueryClient()
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

    const { data: rules, isLoading } = useQuery<Rule[]>({
        queryKey: ['rules', botId],
        queryFn: async () => {
            const response = await api.rules.getByBot(botId)
            const rawRules = response.data.data || response.data || []

            console.log('=== RULES DEBUG ===')
            console.log('Raw rules from API:', rawRules)

            // Transform backend data to frontend format
            return rawRules.map((rule: any) => {
                console.log('Processing rule:', rule.id)
                console.log('  - keyword:', rule.keyword)
                console.log('  - actions (raw):', rule.actions)
                console.log('  - actions type:', typeof rule.actions)

                let replyMessage = ''

                // Parse actions to get reply message
                if (rule.actions) {
                    try {
                        const actions = typeof rule.actions === 'string'
                            ? JSON.parse(rule.actions)
                            : rule.actions

                        console.log('  - actions (parsed):', actions)

                        // Find SEND_TEXT action
                        const sendTextAction = actions.find((a: any) => a.type === 'SEND_TEXT')
                        if (sendTextAction && sendTextAction.config) {
                            replyMessage = sendTextAction.config.message || ''
                            console.log('  - reply message:', replyMessage)
                        }
                    } catch (e) {
                        console.error('Failed to parse actions:', e)
                    }
                }

                const transformed = {
                    ...rule,
                    trigger: rule.keyword || '',  // Map keyword to trigger for display
                    reply: replyMessage,
                    is_active: Boolean(rule.is_active)  // Convert 1/0 to boolean
                }

                console.log('  - transformed:', transformed)
                console.log('==================')

                return transformed
            })
        },
        staleTime: 0, // Always fetch fresh data
        gcTime: 0, // Don't cache (v5 uses gcTime instead of cacheTime)
        refetchOnMount: true,
        refetchOnWindowFocus: true,
    })

    const toggleMutation = useMutation({
        mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
            return await api.rules.update(id, { is_active })
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['rules', botId] })
            toast.success('Rule updated successfully')
        },
        onError: () => {
            toast.error('Failed to update rule')
        },
    })

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            return await api.rules.delete(id)
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['rules', botId] })
            toast.success('Rule deleted successfully')
            setDeleteConfirm(null)
        },
        onError: () => {
            toast.error('Failed to delete rule')
        },
    })

    const getMatchTypeLabel = (type: string) => {
        const labels: Record<string, string> = {
            exact: 'Exact Match',
            contains: 'Contains',
            starts_with: 'Starts With',
            ends_with: 'Ends With',
        }
        return labels[type] || type
    }

    const getMatchTypeColor = (type: string) => {
        const colors: Record<string, string> = {
            exact: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
            contains: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
            starts_with: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
            ends_with: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
        }
        return colors[type] || 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
            </div>
        )
    }

    if (!rules || rules.length === 0) {
        return (
            <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 bg-gray-500/20 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">No Rules Yet</h3>
                <p className="text-gray-400 text-sm">Create your first auto-reply rule to get started</p>
            </div>
        )
    }

    return (
        <div className="space-y-3">
            {rules.map((rule: Rule) => (
                <div
                    key={rule.id}
                    className="glass rounded-xl border border-white/10 p-4 hover:border-white/20 transition-all"
                >
                    <div className="flex items-start justify-between gap-4">
                        {/* Rule Content */}
                        <div className="flex-1 space-y-3">
                            {/* Header */}
                            <div className="flex items-center gap-3">
                                {/* Active Toggle */}
                                <button
                                    onClick={() =>
                                        toggleMutation.mutate({
                                            id: rule.id,
                                            is_active: !rule.is_active,
                                        })
                                    }
                                    className={`relative w-11 h-6 rounded-full transition-colors ${rule.is_active ? 'bg-green-500' : 'bg-gray-600'
                                        }`}
                                >
                                    <div
                                        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${rule.is_active ? 'translate-x-5' : 'translate-x-0'
                                            }`}
                                    />
                                </button>

                                {/* Match Type Badge */}
                                <span
                                    className={`px-3 py-1 rounded-lg text-xs font-medium border ${getMatchTypeColor(
                                        rule.match_type
                                    )}`}
                                >
                                    {getMatchTypeLabel(rule.match_type)}
                                </span>

                                {/* Status */}
                                <span
                                    className={`px-2 py-1 rounded text-xs font-medium ${rule.is_active
                                        ? 'bg-green-500/20 text-green-400'
                                        : 'bg-gray-500/20 text-gray-400'
                                        }`}
                                >
                                    {rule.is_active ? 'Active' : 'Inactive'}
                                </span>
                            </div>

                            {/* Trigger & Reply */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <div className="text-xs text-gray-400 mb-1 flex items-center gap-1">
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                        </svg>
                                        Trigger
                                    </div>
                                    <div className="text-white font-medium break-words">
                                        "{rule.trigger}"
                                    </div>
                                </div>
                                <div>
                                    <div className="text-xs text-gray-400 mb-1 flex items-center gap-1">
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                                        </svg>
                                        Reply
                                    </div>
                                    <div className="text-gray-300 text-sm break-words line-clamp-2">
                                        {rule.reply}
                                    </div>
                                </div>
                            </div>

                            {/* Created Date */}
                            <div className="text-xs text-gray-500">
                                Created {new Date(rule.created_at).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                })}
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                            {/* Edit Button */}
                            <button
                                onClick={() => toast.info('Edit functionality coming soon!')}
                                className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 hover:border-cyan-500 transition-all flex items-center justify-center text-gray-400 hover:text-cyan-400"
                                title="Edit rule"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                            </button>

                            {/* Delete Button */}
                            {deleteConfirm === rule.id ? (
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => deleteMutation.mutate(rule.id)}
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
                                    onClick={() => setDeleteConfirm(rule.id)}
                                    className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 hover:bg-red-500/20 hover:border-red-500 transition-all flex items-center justify-center text-gray-400 hover:text-red-400"
                                    title="Delete rule"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    )
}
