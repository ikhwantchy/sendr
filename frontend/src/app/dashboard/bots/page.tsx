'use client'

import { useState, useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import Link from 'next/link'
import { usePermissions } from '@/hooks/usePermissions'
import { Bot, Plus, Trash2, Settings, Phone, Calendar, Circle, Search, ArrowRight, MoreHorizontal } from 'lucide-react'

export default function BotsPage() {
    const queryClient = useQueryClient()
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [newBotName, setNewBotName] = useState('')
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    const { filterBots, isOwner } = usePermissions()

    const { data: allBots, isLoading } = useQuery({
        queryKey: ['bots'],
        queryFn: async () => {
            const response = await api.bots.list()
            return response.data.data || response.data || []
        },
    })

    const bots = useMemo(() => {
        if (!allBots) return []
        return filterBots(allBots)
    }, [allBots, filterBots])

    const createMutation = useMutation({
        mutationFn: async (name: string) => {
            // Placeholder: Replace with actual creation API
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
        <div className="p-8 min-h-screen bg-[#09090b] text-zinc-100">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-semibold text-white tracking-tight">Bots</h1>
                    <p className="text-zinc-500 text-sm mt-1">Manage your automation instances</p>
                </div>
                {mounted && isOwner && (
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-white text-black hover:bg-zinc-200 rounded-lg text-sm font-medium transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        Create Bot
                    </button>
                )}
            </div>

            {/* List/Grid */}
            {
                isLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-48 rounded-xl bg-zinc-900/50 border border-zinc-800/50 animate-pulse" />
                        ))}
                    </div>
                ) : bots.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6">
                        {bots.map((bot: any) => (
                            <Link
                                key={bot.id}
                                href={`/dashboard/bots/${bot.id}`}
                                className="group relative flex flex-col p-6 rounded-xl bg-[#0e0e11] border border-zinc-800/50 hover:border-zinc-700 transition-all hover:shadow-[0_0_20px_rgba(0,0,0,0.4)]"
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 group-hover:text-white transition-colors">
                                        <Bot className="w-6 h-6" />
                                    </div>
                                    <StatusBadge status={bot.status} />
                                </div>

                                <div className="mb-4">
                                    <h3 className="text-lg font-semibold text-white tracking-tight mb-1 group-hover:text-blue-400 transition-colors">
                                        {bot.name}
                                    </h3>
                                    <p className="text-zinc-500 text-sm font-mono truncate">
                                        {bot.phone_number ? `+${bot.phone_number}` : 'No number connected'}
                                    </p>
                                </div>

                                <div className="mt-auto pt-4 border-t border-zinc-800/50 flex items-center justify-between text-xs text-zinc-500">
                                    <span className="flex items-center gap-1.5">
                                        <Calendar className="w-3.5 h-3.5" />
                                        {new Date(bot.created_at).toLocaleDateString()}
                                    </span>
                                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <span className="text-zinc-400 font-medium">Configure</span>
                                        <ArrowRight className="w-3.5 h-3.5" />
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-24 text-center border border-dashed border-zinc-800 rounded-2xl bg-zinc-900/20">
                        <div className="p-4 rounded-full bg-zinc-900/50 mb-4">
                            <Bot className="w-8 h-8 text-zinc-500" />
                        </div>
                        <h3 className="text-lg font-medium text-white mb-2">No bots found</h3>
                        <p className="text-zinc-500 max-w-sm mb-6">
                            Get started by creating your first WhatsApp bot instance to handle automation.
                        </p>
                        {mounted && isOwner && (
                            <button
                                onClick={() => setShowCreateModal(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-white text-black hover:bg-zinc-200 rounded-lg text-sm font-medium transition-colors"
                            >
                                <Plus className="w-4 h-4" />
                                Create Bot
                            </button>
                        )
                        }
                    </div >
                )
            }

            {/* Create Modal */}
            {
                showCreateModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="w-full max-w-md bg-[#0e0e11] border border-zinc-800 rounded-xl shadow-2xl overflow-hidden p-6 space-y-6 animate-in zoom-in-95 duration-200">
                            <div>
                                <h3 className="text-lg font-semibold text-white">Create New Bot</h3>
                                <p className="text-sm text-zinc-500 mt-1">Give your bot a friendly name to identify it.</p>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-zinc-400 uppercase tracking-wide">
                                        Bot Name
                                    </label>
                                    <input
                                        type="text"
                                        value={newBotName}
                                        onChange={(e) => setNewBotName(e.target.value)}
                                        placeholder="e.g. Sales Assistant"
                                        className="w-full bg-zinc-900/50 border border-zinc-800 text-white text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-zinc-700 placeholder:text-zinc-600"
                                        autoFocus
                                    />
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-2">
                                <button
                                    onClick={() => setShowCreateModal(false)}
                                    className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleCreate}
                                    disabled={createMutation.isPending}
                                    className="px-4 py-2 text-sm font-medium bg-white text-black hover:bg-zinc-200 rounded-lg transition-colors disabled:opacity-50"
                                >
                                    {createMutation.isPending ? 'Creating...' : 'Create Bot'}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    )
}

function StatusBadge({ status }: { status: string }) {
    const styles: any = {
        connected: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
        disconnected: 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20',
        connecting: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
        error: 'bg-red-500/10 text-red-500 border-red-500/20'
    }

    return (
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border uppercase tracking-wide ${styles[status] || styles.disconnected}`}>
            {status}
        </span>
    )
}
