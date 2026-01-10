'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import { useRouter, useSearchParams } from 'next/navigation'
import CreateRuleModal from '@/components/modals/CreateRuleModal'
import EditRuleModal from '@/components/modals/EditRuleModal'

export default function RulesPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const queryClient = useQueryClient()

    // State
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [editingRule, setEditingRule] = useState<any>(null)
    const [selectedBotId, setSelectedBotId] = useState<string>('all')

    const botIdParam = searchParams.get('bot')

    // Fetch rules
    const { data: rules, isLoading: isLoadingRules } = useQuery({
        queryKey: ['rules'],
        queryFn: async () => {
            const response = await api.rules.list()
            return response.data.data || []
        },
    })

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
        <div className="p-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Automation Rules</h1>
                    <p className="text-gray-600 mt-1">Create keyword-based automation rules</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg font-semibold hover:from-blue-600 hover:to-indigo-700 transition-all flex items-center space-x-2"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <span>Create Rule</span>
                </button>
            </div>

            {/* Bot Filter */}
            <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Filter by Bot
                </label>
                <select
                    value={selectedBotId}
                    onChange={(e) => setSelectedBotId(e.target.value)}
                    className="w-full max-w-md px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                >
                    <option value="all">All Bots ({rules?.length || 0} rules)</option>
                    {bots?.map((bot: any) => {
                        const botRuleCount = rules?.filter((r: any) => r.bot_id === bot.id).length || 0
                        return (
                            <option key={bot.id} value={bot.id}>
                                {bot.name} ({botRuleCount} rules)
                            </option>
                        )
                    })}
                </select>
            </div>

            {/* Rules List */}
            {isLoadingRules ? (
                <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                </div>
            ) : filteredRules && filteredRules.length > 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Bot Name
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Rule Name
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Keyword
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Match Type
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Scope
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredRules.map((rule: any) => (
                                <tr key={rule.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div className="flex-shrink-0 h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                                                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                                                </svg>
                                            </div>
                                            <div className="ml-3">
                                                <div className="text-sm font-medium text-gray-900">{getBotName(rule.bot_id)}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900">{rule.name}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <code className="px-2 py-1 bg-gray-100 rounded text-sm text-gray-700">
                                            {rule.keyword}
                                        </code>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded">
                                            {rule.match_type}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                        {rule.scope}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 py-1 text-xs font-medium rounded ${rule.is_active
                                            ? 'bg-green-100 text-green-700'
                                            : 'bg-gray-100 text-gray-700'
                                            }`}>
                                            {rule.is_active ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                                        <button
                                            onClick={() => setEditingRule(rule)}
                                            className="text-blue-600 hover:text-blue-900"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => handleDelete(rule.id, rule.name)}
                                            className="text-red-600 hover:text-red-900"
                                        >
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="text-center py-12 bg-white rounded-xl border-2 border-dashed border-gray-300">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No rules yet</h3>
                    <p className="text-gray-600 mb-4">Create your first automation rule</p>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
                    >
                        Create Rule
                    </button>
                </div>
            )}

            {/* Create Modal */}
            {showCreateModal && (
                <CreateRuleModal
                    botId={selectedBotId !== 'all' ? selectedBotId : (botIdParam || undefined)}
                    bots={bots || []}
                    onClose={() => setShowCreateModal(false)}
                />
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
