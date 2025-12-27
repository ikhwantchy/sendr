'use client'

import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import Link from 'next/link'
import { usePermissions } from '@/hooks/usePermissions'

export default function BotsPage() {
    const queryClient = useQueryClient()
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [newBotName, setNewBotName] = useState('')

    // Get permissions
    const { filterBots, isOwner, can } = usePermissions()

    // Fetch bots
    const { data: allBots, isLoading } = useQuery({
        queryKey: ['bots'],
        queryFn: async () => {
            const response = await api.bots.list()
            // Backend returns { success: true, data: [...] }
            return response.data.data || response.data || []
        },
    })

    // Filter bots based on permissions
    const bots = useMemo(() => {
        if (!allBots) return []
        return filterBots(allBots)
    }, [allBots, filterBots])

    // Create bot mutation
    const createMutation = useMutation({
        mutationFn: async (name: string) => {
            return await api.bots.create({ name })
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['bots'] })
            setShowCreateModal(false)
            setNewBotName('')
            toast.success('Bot created successfully!')
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.error || 'Failed to create bot')
        },
    })

    // Delete bot mutation
    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            return await api.bots.delete(id)
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['bots'] })
            toast.success('Bot deleted successfully!')
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.error || 'Failed to delete bot')
        },
    })

    const handleCreate = () => {
        if (!newBotName.trim()) {
            toast.error('Please enter a bot name')
            return
        }
        createMutation.mutate(newBotName)
    }

    const handleDelete = (id: string, name: string) => {
        if (confirm(`Are you sure you want to delete "${name}"?`)) {
            deleteMutation.mutate(id)
        }
    }

    return (
        <div className="p-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
                        <span className="w-1.5 h-10 bg-gradient-to-b from-cyan-400 to-blue-600 rounded-full"></span>
                        WhatsApp Bots
                    </h1>
                    <p className="text-gray-400 text-lg">Manage your WhatsApp bot instances</p>
                </div>
                {isOwner && (
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="group px-6 py-3.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl font-bold hover:shadow-2xl hover:shadow-cyan-500/50 transition-all flex items-center gap-2 hover-lift relative overflow-hidden"
                    >
                        <div className="absolute inset-0 shimmer opacity-0 group-hover:opacity-100"></div>
                        <svg className="w-5 h-5 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        <span className="relative z-10">Create Bot</span>
                    </button>
                )}
            </div>

            {/* Bots Grid */}
            {isLoading ? (
                <div className="flex items-center justify-center py-12">
                    <div className="relative w-16 h-16">
                        <div className="absolute inset-0 rounded-full border-4 border-cyan-500/20"></div>
                        <div className="absolute inset-0 rounded-full border-4 border-cyan-500 border-t-transparent animate-spin"></div>
                    </div>
                </div>
            ) : bots && bots.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {bots.map((bot: any) => (
                        <BotCard
                            key={bot.id}
                            bot={bot}
                            onDelete={() => handleDelete(bot.id, bot.name)}
                        />
                    ))}
                </div>
            ) : (
                <div className="text-center py-16 glass rounded-2xl border-2 border-dashed border-white/10">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-2xl mb-6">
                        <svg className="w-10 h-10 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                        </svg>
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">No bots yet</h3>
                    <p className="text-gray-400 mb-6">Create your first WhatsApp bot to get started</p>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-cyan-500/50 transition-all hover-lift"
                    >
                        Create Bot
                    </button>
                </div>
            )}

            {/* Create Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="glass-strong rounded-3xl max-w-md w-full p-8 border border-white/20 shadow-2xl">
                        <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
                            <span className="w-1.5 h-8 bg-gradient-to-b from-cyan-400 to-blue-600 rounded-full"></span>
                            Create New Bot
                        </h2>
                        <div className="mb-6">
                            <label className="block text-sm font-semibold text-gray-300 mb-2">
                                Bot Name
                            </label>
                            <input
                                type="text"
                                value={newBotName}
                                onChange={(e) => setNewBotName(e.target.value)}
                                placeholder="e.g., Customer Service Bot"
                                className="w-full px-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all duration-300 hover:bg-white/10"
                                onKeyPress={(e) => e.key === 'Enter' && handleCreate()}
                            />
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setShowCreateModal(false)
                                    setNewBotName('')
                                }}
                                className="flex-1 px-4 py-3 bg-white/5 border border-white/10 text-gray-300 rounded-xl hover:bg-white/10 transition-all font-semibold"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreate}
                                disabled={createMutation.isPending}
                                className="flex-1 px-4 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl hover:shadow-lg hover:shadow-cyan-500/50 transition-all disabled:opacity-50 font-semibold"
                            >
                                {createMutation.isPending ? 'Creating...' : 'Create'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

function BotCard({ bot, onDelete }: any) {
    const statusColors = {
        disconnected: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
        connecting: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
        connected: 'bg-green-500/20 text-green-400 border-green-500/30',
        error: 'bg-red-500/20 text-red-400 border-red-500/30',
    }

    const statusIcons = {
        disconnected: '⚪',
        connecting: '🟡',
        connected: '🟢',
        error: '🔴',
    }

    return (
        <div className="glass rounded-2xl border border-white/10 p-6 hover-lift group relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative">
                <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                        <h3 className="text-lg font-bold text-white mb-2">{bot.name}</h3>
                        <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold border ${statusColors[bot.status] || statusColors.disconnected}`}>
                            <span className="mr-1.5">{statusIcons[bot.status] || statusIcons.disconnected}</span>
                            {bot.status || 'disconnected'}
                        </span>
                    </div>
                </div>

                <div className="space-y-2 mb-4 text-sm text-gray-400">
                    <div className="flex items-center">
                        <svg className="w-4 h-4 mr-2 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Created {new Date(bot.created_at).toLocaleDateString()}
                    </div>
                </div>

                <div className="flex gap-2">
                    <Link
                        href={`/dashboard/bots/${bot.id}`}
                        className="flex-1 px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-center rounded-xl hover:shadow-lg hover:shadow-cyan-500/50 transition-all text-sm font-semibold"
                    >
                        Manage
                    </Link>
                    <button
                        onClick={onDelete}
                        className="px-4 py-2.5 bg-red-500/20 border border-red-500/30 text-red-400 rounded-xl hover:bg-red-500/30 transition-all text-sm font-semibold"
                    >
                        Delete
                    </button>
                </div>
            </div>
        </div>
    )
}
