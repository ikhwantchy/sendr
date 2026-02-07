'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import { Zap, Edit2, Trash2, Circle, Plus } from 'lucide-react'

interface Rule {
    id: string
    trigger: string
    reply: string
    is_active: boolean
    match_type: 'equals' | 'contains' | 'regex'
    created_at: string
    name?: string
}

interface RulesTableProps {
    botId: string
}

export default function RulesTable({ botId }: RulesTableProps) {
    const router = useRouter()
    const queryClient = useQueryClient()
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
    const [currentPage, setCurrentPage] = useState(1)
    const itemsPerPage = 10

    const { data: rules, isLoading } = useQuery<Rule[]>({
        queryKey: ['rules', botId],
        queryFn: async () => {
            const response = await api.rules.getByBot(botId)
            const rawRules = response.data.data || response.data || []

            return rawRules.map((rule: any) => {
                let replyMessage = ''

                if (rule.actions) {
                    try {
                        const actions = typeof rule.actions === 'string'
                            ? JSON.parse(rule.actions)
                            : rule.actions

                        const sendTextAction = actions.find((a: any) => a.type === 'SEND_TEXT')
                        if (sendTextAction && sendTextAction.config) {
                            replyMessage = sendTextAction.config.message || ''
                        }
                    } catch (e) {
                        console.error('Failed to parse actions:', e)
                    }
                }

                return {
                    ...rule,
                    trigger: rule.keyword || '',
                    reply: replyMessage,
                    is_active: Boolean(rule.is_active)
                }
            })
        },
        staleTime: 0,
        gcTime: 0,
        refetchOnMount: true,
        refetchOnWindowFocus: true,
    })

    const paginatedRules = (rules || []).slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
    const totalPages = Math.ceil((rules || []).length / itemsPerPage)

    const toggleMutation = useMutation({
        mutationFn: async ({ id }: { id: string; is_active: boolean }) => {
            return await api.rules.toggle(id)
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
            exact: 'Exact',
            contains: 'Contains',
            starts_with: 'Starts',
            ends_with: 'Ends',
        }
        return labels[type] || type
    }

    if (isLoading) {
        return (
            <div className="flex flex-col gap-6">
                <div className="flex justify-end">
                    <div className="w-24 h-10 bg-zinc-800 animate-pulse rounded-lg" />
                </div>
                <div className="flex items-center justify-center py-24 bg-zinc-900/30 border border-zinc-800/50 rounded-2xl">
                    <div className="relative w-12 h-12">
                        <div className="absolute inset-0 rounded-full border-2 border-zinc-800"></div>
                        <div className="absolute inset-0 rounded-full border-2 border-blue-500 border-t-transparent animate-spin"></div>
                    </div>
                </div>
            </div>
        )
    }

    if (!rules || rules.length === 0) {
        return (
            <div className="text-center py-48 bg-zinc-900/30 border border-dashed border-zinc-800/50 rounded-2xl min-h-[600px] flex flex-col items-center justify-center">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-zinc-800/50 rounded-3xl mb-6 shadow-xl border border-zinc-700/50">
                    <Zap className="w-10 h-10 text-zinc-500" />
                </div>
                <h3 className="text-xl font-bold text-zinc-100 mb-3">No Rules Yet</h3>
                <p className="text-zinc-400 text-sm max-w-xs mx-auto leading-relaxed">Create your first auto-reply rule to automate your customer communication.</p>
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
                            <th className="text-left py-3 px-4 text-sm font-medium text-zinc-400 w-[22%] rounded-tl-xl">Trigger</th>
                            <th className="text-center py-3 px-4 text-sm font-medium text-zinc-400 w-[25%]">Reply</th>
                            <th className="text-center py-3 px-4 text-sm font-medium text-zinc-400 w-[13%]">Status</th>
                            <th className="text-center py-3 px-4 text-sm font-medium text-zinc-400 w-[12%]">Type</th>
                            <th className="text-center py-3 px-4 text-sm font-medium text-zinc-400 w-[12%]">Created</th>
                            <th className="text-right py-3 px-4 text-sm font-medium text-zinc-400 w-[16%] rounded-tr-xl">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedRules.map((rule: Rule) => (
                            <tr
                                key={rule.id}
                                className="border-b border-zinc-800/50 hover:bg-zinc-900/50 transition-colors h-[52px]"
                            >
                                {/* Trigger */}
                                <td className="py-4 px-4">
                                    <div className="flex items-center gap-2">
                                        <Zap className="w-4 h-4 text-blue-400 flex-shrink-0" />
                                        <span className="text-zinc-100 font-medium truncate max-w-[180px]">
                                            "{rule.trigger}"
                                        </span>
                                    </div>
                                </td>

                                {/* Reply */}
                                <td className="py-4 px-4 text-center">
                                    <div className="text-zinc-400 text-sm truncate max-w-[240px] mx-auto">
                                        {rule.reply}
                                    </div>
                                </td>

                                {/* Status */}
                                <td className="py-4 px-4 text-center">
                                    <div className="flex items-center justify-center gap-2">
                                        <button
                                            onClick={() =>
                                                toggleMutation.mutate({
                                                    id: rule.id,
                                                    is_active: !rule.is_active,
                                                })
                                            }
                                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${rule.is_active ? 'bg-emerald-500' : 'bg-zinc-700'
                                                }`}
                                        >
                                            <span
                                                className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${rule.is_active ? 'translate-x-5' : 'translate-x-1'
                                                    }`}
                                            />
                                        </button>
                                        <span className={`text-xs font-medium ${rule.is_active ? 'text-emerald-400' : 'text-zinc-500'}`}>
                                            {rule.is_active ? 'On' : 'Off'}
                                        </span>
                                    </div>
                                </td>

                                {/* Match Type */}
                                <td className="py-4 px-4 text-center">
                                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-zinc-800/50 text-zinc-400 border border-zinc-700/50">
                                        {getMatchTypeLabel(rule.match_type)}
                                    </span>
                                </td>

                                {/* Created Date */}
                                <td className="py-4 px-4 text-center">
                                    <div className="text-zinc-500 text-sm font-mono">
                                        {new Date(rule.created_at).toLocaleDateString('en-US', {
                                            month: 'short',
                                            day: 'numeric',
                                        })}
                                    </div>
                                </td>

                                {/* Actions */}
                                <td className="py-4 px-4">
                                    <div className="flex items-center justify-end gap-2">
                                        {deleteConfirm === rule.id ? (
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => deleteMutation.mutate(rule.id)}
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
                                                    onClick={() => router.push(`/dashboard/rules/create?botId=${botId}&edit=${rule.id}`)}
                                                    className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/30 hover:bg-blue-500/20 transition-all flex items-center justify-center text-blue-400"
                                                    title="Edit rule"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => setDeleteConfirm(rule.id)}
                                                    className="w-8 h-8 rounded-lg bg-zinc-800/50 border border-zinc-700/50 hover:bg-red-500/10 hover:border-red-500/50 transition-all flex items-center justify-center text-zinc-400 hover:text-red-400"
                                                    title="Delete rule"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}

                        {/* Empty rows to fill up to 10 */}
                        {Array.from({ length: Math.max(0, itemsPerPage - paginatedRules.length) }).map((_, index) => (
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

            {/* Pagination - Fixed at bottom */}
            <div className="hidden md:flex items-center justify-between px-4 py-3 bg-zinc-800/50 rounded-b-xl flex-shrink-0">
                {totalPages > 1 ? (
                    <>
                        <div className="text-sm text-zinc-500">
                            Showing <span className="text-zinc-300 font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="text-zinc-300 font-medium">{Math.min(currentPage * itemsPerPage, (rules || []).length)}</span> of <span className="text-zinc-300 font-medium">{(rules || []).length}</span> rules
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
                        Showing <span className="text-zinc-300 font-medium">{(rules || []).length}</span> rules
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
                        {(rules || []).length} rules
                    </div>
                )}
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-3">
                {paginatedRules.map((rule: Rule) => (
                    <div
                        key={rule.id}
                        className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-4 hover:bg-zinc-900/80 transition-all"
                    >
                        {/* Top: Toggle + Status Badge */}
                        <div className="flex items-center justify-between mb-4">
                            <button
                                onClick={() =>
                                    toggleMutation.mutate({
                                        id: rule.id,
                                        is_active: !rule.is_active,
                                    })
                                }
                                className={`relative w-11 h-6 rounded-full transition-colors ${rule.is_active ? 'bg-emerald-500' : 'bg-zinc-700'
                                    }`}
                            >
                                <div
                                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${rule.is_active ? 'translate-x-5' : 'translate-x-0'
                                        }`}
                                />
                            </button>

                            <div className="flex items-center gap-2">
                                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border ${rule.is_active
                                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
                                    : 'bg-zinc-500/10 border-zinc-500/20 text-zinc-500'
                                    }`}>
                                    <Circle className="w-2 h-2 fill-current" />
                                    <span>{rule.is_active ? 'Active' : 'Inactive'}</span>
                                </span>
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-zinc-800/50 text-zinc-400 border border-zinc-700/50">
                                    {getMatchTypeLabel(rule.match_type)}
                                </span>
                            </div>
                        </div>

                        {/* Middle: Trigger + Reply */}
                        <div className="space-y-3 mb-4">
                            <div>
                                <div className="flex items-center gap-2 text-xs text-zinc-500 mb-1">
                                    <Zap className="w-3 h-3" />
                                    <span>Trigger</span>
                                </div>
                                <div className="text-zinc-100 font-medium break-words">
                                    "{rule.trigger}"
                                </div>
                            </div>
                            <div>
                                <div className="text-xs text-zinc-500 mb-1">Reply</div>
                                <div className="text-zinc-400 text-sm break-words line-clamp-2">
                                    {rule.reply}
                                </div>
                            </div>
                        </div>

                        {/* Bottom: Date + Actions */}
                        <div className="flex items-center justify-between pt-3 border-t border-zinc-800/50">
                            <div className="text-xs text-zinc-500 font-mono">
                                {new Date(rule.created_at).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                })}
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => router.push(`/dashboard/rules/create?botId=${botId}&edit=${rule.id}`)}
                                    className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/30 hover:bg-blue-500/20 transition-all flex items-center justify-center text-blue-400"
                                    title="Edit rule"
                                >
                                    <Edit2 className="w-4 h-4" />
                                </button>

                                {deleteConfirm === rule.id ? (
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => deleteMutation.mutate(rule.id)}
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
                                        onClick={() => setDeleteConfirm(rule.id)}
                                        className="w-8 h-8 rounded-lg bg-zinc-800/50 border border-zinc-700/50 hover:bg-red-500/10 hover:border-red-500/50 transition-all flex items-center justify-center text-zinc-400 hover:text-red-400"
                                        title="Delete rule"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div >
    )
}
