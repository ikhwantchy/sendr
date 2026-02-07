'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import { useRouter, useSearchParams } from 'next/navigation'
import EditRuleModal from '@/components/modals/EditRuleModal'
import {
    Plus, RefreshCw, Loader2, ChevronDown, Bot,
    Zap, Trash2, Pencil, MessageSquare, Search
} from 'lucide-react'

function RulesContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const queryClient = useQueryClient()

    // State
    const [editingRule, setEditingRule] = useState<any>(null)
    const [selectedBotId, setSelectedBotId] = useState<string>('all')

    const botIdParam = searchParams?.get('bot')

    // Fetch rules
    const { data: rules, isLoading: isLoadingRules, isFetching, refetch } = useQuery({
        queryKey: ['rules'],
        queryFn: async () => {
            const response = await api.rules.list()
            return response.data.data || []
        },
    })

    const isRefreshing = isFetching && !isLoadingRules

    // Fetch bots for dropdown
    const { data: bots, isLoading: isLoadingBots } = useQuery({
        queryKey: ['bots'],
        queryFn: async () => {
            const response = await api.bots.list()
            return response.data.data || []
        },
    })

    // Delete mutation
    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            return await api.rules.delete(id)
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['rules'] })
            toast.success('Rule deleted successfully!')
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.error || 'Failed to delete rule')
        },
    })

    const handleDelete = (id: string, name: string) => {
        if (confirm(`Delete rule "${name}"?`)) {
            deleteMutation.mutate(id)
        }
    }

    // Filter rules by selected bot
    const filteredRules = selectedBotId === 'all'
        ? rules
        : rules?.filter((rule: any) => rule.bot_id === selectedBotId)

    // Get bot name by ID
    const getBotName = (botId: string) => {
        const bot = bots?.find((b: any) => b.id === botId)
        return bot?.name || 'Unknown Bot'
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8 min-h-screen bg-zinc-50 dark:bg-[#09090b] text-zinc-900 dark:text-zinc-100">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-xl sm:text-2xl font-semibold text-zinc-900 dark:text-white tracking-tight">Automation Rules</h1>
                        {isRefreshing && (
                            <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                        )}
                    </div>
                    <p className="text-zinc-500 dark:text-zinc-100 text-xs sm:text-sm mt-1">Create keyword-based automation rules</p>
                </div>
                <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                    {/* Bot Filter Dropdown */}
                    <div className="relative">
                        <button
                            onClick={() => {
                                const dropdown = document.getElementById('rules-bot-dropdown')
                                if (dropdown) dropdown.classList.toggle('hidden')
                            }}
                            onBlur={(e) => {
                                setTimeout(() => {
                                    const dropdown = document.getElementById('rules-bot-dropdown')
                                    if (dropdown && !dropdown.contains(e.relatedTarget as Node)) {
                                        dropdown.classList.add('hidden')
                                    }
                                }, 150)
                            }}
                            className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 bg-white dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800/50 rounded-lg text-xs font-medium text-zinc-900 dark:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800/80 transition-all"
                        >
                            <Bot className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-blue-500" />
                            <span className="hidden sm:inline">
                                {selectedBotId === 'all' ? 'All Bots' : (bots?.find((b: any) => b.id === selectedBotId)?.name || 'Selected Bot')}
                            </span>
                            <span className="sm:hidden">
                                {selectedBotId === 'all' ? 'All' : 'Bot'}
                            </span>
                            <ChevronDown className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-zinc-500" />
                        </button>

                        <div
                            id="rules-bot-dropdown"
                            className="hidden absolute top-full right-0 mt-2 w-48 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl z-50 overflow-hidden py-1"
                        >
                            <button
                                onClick={() => {
                                    setSelectedBotId('all')
                                    document.getElementById('rules-bot-dropdown')?.classList.add('hidden')
                                }}
                                className={`w-full text-left px-4 py-2 text-xs hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors ${selectedBotId === 'all' ? 'text-blue-500 dark:text-blue-400 bg-blue-50 dark:bg-blue-400/5' : 'text-zinc-600 dark:text-zinc-400'}`}
                            >
                                All Bots ({rules?.length || 0} rules)
                            </button>
                            {bots?.map((bot: any) => {
                                const botRuleCount = rules?.filter((r: any) => r.bot_id === bot.id).length || 0
                                return (
                                    <button
                                        key={bot.id}
                                        onClick={() => {
                                            setSelectedBotId(bot.id)
                                            document.getElementById('rules-bot-dropdown')?.classList.add('hidden')
                                        }}
                                        className={`w-full text-left px-4 py-2 text-xs hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors ${selectedBotId === bot.id ? 'text-blue-500 dark:text-blue-400 bg-blue-50 dark:bg-blue-400/5' : 'text-zinc-600 dark:text-zinc-400'}`}
                                    >
                                        {bot.name} ({botRuleCount} rules)
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    {/* Refresh Button */}
                    <button
                        onClick={() => refetch()}
                        disabled={isFetching}
                        className={`p-2 bg-white dark:bg-zinc-900 border rounded-lg transition-all ${isFetching
                            ? 'border-blue-500/50 text-blue-400'
                            : 'border-zinc-200 dark:border-zinc-800/50 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:border-zinc-300 dark:hover:border-zinc-700'
                            }`}
                    >
                        <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
                    </button>

                    {/* Create Button */}
                    <button
                        onClick={() => {
                            const botParam = selectedBotId !== 'all' ? selectedBotId : (botIdParam || '')
                            router.push(`/dashboard/rules/create${botParam ? `?botId=${botParam}` : ''}`)
                        }}
                        className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-zinc-900 dark:bg-white text-white dark:text-black hover:bg-zinc-800 dark:hover:bg-zinc-200 rounded-lg text-sm font-medium transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        <span className="hidden sm:inline">Create Rule</span>
                        <span className="sm:hidden">Create</span>
                    </button>
                </div>
            </div>

            {/* Rules Table */}
            {isLoadingRules ? (
                <div className="flex items-center justify-center py-16">
                    <div className="relative w-12 h-12">
                        <div className="absolute inset-0 rounded-full border-2 border-zinc-200 dark:border-zinc-800"></div>
                        <div className="absolute inset-0 rounded-full border-2 border-blue-500 border-t-transparent animate-spin"></div>
                    </div>
                </div>
            ) : filteredRules && filteredRules.length > 0 ? (
                <>
                    {/* Desktop Table View */}
                    <div className="hidden md:block bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-900 rounded-xl overflow-hidden shadow-sm dark:shadow-none">
                        <div className="px-4 sm:px-6 py-4 border-b border-zinc-200 dark:border-zinc-800/50 flex justify-between items-center">
                            <div>
                                <h3 className="text-base sm:text-lg font-medium text-zinc-800 dark:text-zinc-200">Rules</h3>
                                <p className="text-xs text-zinc-500 mt-0.5">{filteredRules.length} rule{filteredRules.length !== 1 ? 's' : ''} found</p>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full table-fixed">
                                <thead>
                                    <tr className="border-b border-zinc-200 dark:border-zinc-800/50 bg-zinc-50 dark:bg-transparent">
                                        <th className="w-[180px] text-left py-3 px-4 text-sm font-medium text-zinc-500 dark:text-zinc-400">Bot</th>
                                        <th className="w-[160px] text-left py-3 px-4 text-sm font-medium text-zinc-500 dark:text-zinc-400">Rule Name</th>
                                        <th className="w-[140px] text-left py-3 px-4 text-sm font-medium text-zinc-500 dark:text-zinc-400">Keyword</th>
                                        <th className="w-[100px] text-left py-3 px-4 text-sm font-medium text-zinc-500 dark:text-zinc-400">Match</th>
                                        <th className="w-[100px] text-left py-3 px-4 text-sm font-medium text-zinc-500 dark:text-zinc-400">Scope</th>
                                        <th className="w-[80px] text-left py-3 px-4 text-sm font-medium text-zinc-500 dark:text-zinc-400">Status</th>
                                        <th className="w-[100px] text-right py-3 px-4 text-sm font-medium text-zinc-500 dark:text-zinc-400">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredRules.map((rule: any) => (
                                        <tr key={rule.id} className="border-b border-zinc-100 dark:border-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors">
                                            <td className="py-4 px-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 flex items-center justify-center">
                                                        <MessageSquare className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                                                    </div>
                                                    <span className="text-zinc-800 dark:text-zinc-100 font-medium truncate">{getBotName(rule.bot_id)}</span>
                                                </div>
                                            </td>
                                            <td className="py-4 px-4">
                                                <span className="text-zinc-800 dark:text-zinc-100 font-medium">{rule.name}</span>
                                            </td>
                                            <td className="py-4 px-4">
                                                <code className="px-2 py-1 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700/50 rounded text-xs text-zinc-700 dark:text-zinc-300 font-mono">
                                                    {rule.keyword}
                                                </code>
                                            </td>
                                            <td className="py-4 px-4">
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20 text-purple-600 dark:text-purple-400">
                                                    {rule.match_type}
                                                </span>
                                            </td>
                                            <td className="py-4 px-4">
                                                <span className="text-zinc-500 dark:text-zinc-400 text-sm capitalize">{rule.scope}</span>
                                            </td>
                                            <td className="py-4 px-4">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${rule.is_active
                                                    ? 'bg-emerald-100 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                                                    : 'bg-zinc-100 dark:bg-zinc-500/10 border border-zinc-200 dark:border-zinc-500/20 text-zinc-500 dark:text-zinc-400'
                                                    }`}>
                                                    {rule.is_active ? 'Active' : 'Inactive'}
                                                </span>
                                            </td>
                                            <td className="py-4 px-4">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => setEditingRule(rule)}
                                                        className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/50 hover:bg-zinc-200 dark:hover:bg-zinc-800 hover:border-amber-300 dark:hover:border-amber-500/50 transition-all flex items-center justify-center text-zinc-500 dark:text-zinc-400 hover:text-amber-500 dark:hover:text-amber-400"
                                                        title="Edit"
                                                    >
                                                        <Pencil className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(rule.id, rule.name)}
                                                        className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/50 hover:bg-red-50 dark:hover:bg-red-500/10 hover:border-red-300 dark:hover:border-red-500/50 transition-all flex items-center justify-center text-zinc-500 dark:text-zinc-400 hover:text-red-500 dark:hover:text-red-400"
                                                        title="Delete"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Mobile Card View */}
                    <div className="md:hidden space-y-3">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-base font-medium text-zinc-800 dark:text-zinc-200">Rules</h3>
                            <p className="text-xs text-zinc-500">{filteredRules.length} rule{filteredRules.length !== 1 ? 's' : ''}</p>
                        </div>
                        {filteredRules.map((rule: any) => (
                            <div key={rule.id} className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-900 rounded-xl p-4 shadow-sm dark:shadow-none">
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-sm font-semibold text-zinc-900 dark:text-white truncate">{rule.name}</span>
                                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${rule.is_active
                                                ? 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'
                                                }`}>
                                                {rule.is_active ? 'Active' : 'Off'}
                                            </span>
                                        </div>
                                        <p className="text-xs text-zinc-500 truncate">{getBotName(rule.bot_id)}</p>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <button
                                            onClick={() => setEditingRule(rule)}
                                            className="w-7 h-7 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 hover:text-amber-500"
                                        >
                                            <Pencil className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(rule.id, rule.name)}
                                            className="w-7 h-7 rounded-lg bg-red-50 dark:bg-red-500/10 flex items-center justify-center text-red-500"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 flex-wrap">
                                    <code className="px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded text-[10px] text-zinc-700 dark:text-zinc-300 font-mono">
                                        {rule.keyword}
                                    </code>
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-100 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400">
                                        {rule.match_type}
                                    </span>
                                    <span className="text-[10px] text-zinc-500 capitalize">{rule.scope}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            ) : (
                <div className="bg-white dark:bg-[#18181b] border border-zinc-200 dark:border-zinc-800 rounded-xl p-8 sm:p-12 text-center shadow-sm dark:shadow-none">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Zap className="w-6 h-6 sm:w-8 sm:h-8 text-zinc-400 dark:text-zinc-600" />
                    </div>
                    <h3 className="text-base sm:text-lg font-semibold text-zinc-900 dark:text-white mb-2">No Rules Yet</h3>
                    <p className="text-zinc-500 text-xs sm:text-sm mb-6">Create your first automation rule to get started</p>
                    <button
                        onClick={() => router.push('/dashboard/rules/create')}
                        className="px-4 py-2 bg-zinc-900 dark:bg-white text-white dark:text-black hover:bg-zinc-800 dark:hover:bg-zinc-200 rounded-lg text-sm font-medium transition-colors"
                    >
                        Create Rule
                    </button>
                </div>
            )}

            {/* Edit Modal */}
            {editingRule && (
                <EditRuleModal
                    botId={editingRule.bot_id}
                    rule={editingRule}
                    onClose={() => {
                        setEditingRule(null)
                        queryClient.invalidateQueries({ queryKey: ['rules'] })
                    }}
                />
            )}
        </div>
    )
}

import { Suspense } from 'react'

export default function RulesPage() {
    return (
        <Suspense fallback={
            <div className="p-8 flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
        }>
            <RulesContent />
        </Suspense>
    )
}
