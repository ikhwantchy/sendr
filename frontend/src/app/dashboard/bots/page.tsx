'use client'

import { useState, useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import Link from 'next/link'
import { usePermissions } from '@/hooks/usePermissions'
import { Bot, Plus, Trash2, Settings, Phone, Calendar, Circle, Search, ArrowRight, RefreshCw, Loader2, Users, Filter } from 'lucide-react'

export default function BotsPage() {
    const queryClient = useQueryClient()
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [newBotName, setNewBotName] = useState('')
    const [targetTenantId, setTargetTenantId] = useState('')
    const [mounted, setMounted] = useState(false)
    const [botToDelete, setBotToDelete] = useState<string | null>(null)
    const [filterByUser, setFilterByUser] = useState<string>('all') // Filter state

    useEffect(() => {
        setMounted(true)
    }, [])

    const { filterBots, isAdmin } = usePermissions()

    const { data: allBots, isLoading, isFetching, refetch } = useQuery({
        queryKey: ['bots'],
        queryFn: async () => {
            const response = await api.bots.list()
            return response.data.data || response.data || []
        },
    })

    const isRefreshing = isFetching && !isLoading

    // Get unique owners for filter dropdown (only for admin)
    const uniqueOwners = useMemo(() => {
        if (!allBots || !isAdmin) return []
        const owners = new Map<string, { tenant_id: string; name: string; email: string }>()
        allBots.forEach((bot: any) => {
            if (bot.tenant_id && !owners.has(bot.tenant_id)) {
                owners.set(bot.tenant_id, {
                    tenant_id: bot.tenant_id,
                    name: bot.owner_name || 'Unknown',
                    email: bot.owner_email || ''
                })
            }
        })
        return Array.from(owners.values())
    }, [allBots, isAdmin])

    const bots = useMemo(() => {
        if (!allBots) return []
        let filtered = filterBots(allBots)
        
        // Apply user filter for admin
        if (isAdmin && filterByUser !== 'all') {
            filtered = filtered.filter((bot: any) => bot.tenant_id === filterByUser)
        }
        
        return filtered
    }, [allBots, filterBots, isAdmin, filterByUser])

    // Fetch users for tenant selection (only for Admins)
    const { data: users } = useQuery({
        queryKey: ['users'],
        queryFn: async () => {
            const response = await api.users.list()
            return response.data.data || []
        },
        enabled: mounted && isAdmin
    })

    const createMutation = useMutation({
        mutationFn: async (data: { name: string, target_tenant_id?: string }) => {
            return await api.bots.create(data)
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['bots'] })
            setShowCreateModal(false)
            setNewBotName('')
            setTargetTenantId('')
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
            setBotToDelete(null)
            toast.success('Bot deleted successfully!')
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.error || 'Failed to delete bot')
            setBotToDelete(null)
        },
    })

    const handleCreate = () => {
        if (!newBotName.trim()) {
            toast.error('Please enter a bot name')
            return
        }
        createMutation.mutate({
            name: newBotName,
            target_tenant_id: targetTenantId || undefined
        })
    }

    const handleDeleteClick = (e: React.MouseEvent, botId: string) => {
        e.preventDefault()
        e.stopPropagation()
        setBotToDelete(botId)
    }

    const handleConfirmDelete = () => {
        if (botToDelete) {
            deleteMutation.mutate(botToDelete)
        }
    }

    return (
        <div className="p-8 min-h-screen bg-zinc-50 dark:bg-black text-zinc-900 dark:text-zinc-100">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-white tracking-tight">Bots</h1>
                        {isRefreshing && (
                            <Loader2 className="w-4 h-4 text-blue-500 dark:text-blue-400 animate-spin" />
                        )}
                    </div>

                </div>
                <div className="flex items-center gap-3">
                    {/* User Filter - Only for Admin/Owner */}
                    {mounted && isAdmin && uniqueOwners.length > 1 && (
                        <div className="flex items-center gap-2">
                            <Filter className="w-4 h-4 text-zinc-400" />
                            <select
                                value={filterByUser}
                                onChange={(e) => setFilterByUser(e.target.value)}
                                className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-zinc-700 min-w-[180px]"
                            >
                                <option value="all">All Users ({allBots?.length || 0})</option>
                                {uniqueOwners.map((owner) => (
                                    <option key={owner.tenant_id} value={owner.tenant_id}>
                                        {owner.name} {owner.email ? `(${owner.email})` : ''}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                    {/* Refresh Button */}
                    <button
                        onClick={() => refetch()}
                        disabled={isFetching}
                        className={`p-2 bg-white dark:bg-zinc-900 border rounded-lg transition-all ${isFetching
                            ? 'border-blue-500/50 text-blue-500 dark:text-blue-400'
                            : 'border-zinc-200 dark:border-zinc-800/50 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:border-zinc-300 dark:hover:border-zinc-700'
                            }`}
                    >
                        <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
                    </button>
                    {mounted && isAdmin && (
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-zinc-900 dark:bg-white text-white dark:text-black hover:bg-zinc-800 dark:hover:bg-zinc-200 rounded-lg text-sm font-medium transition-colors"
                        >
                            <Plus className="w-4 h-4" />
                            Create Bot
                        </button>
                    )}
                </div>
            </div>

            {/* List/Grid */}
            {
                isLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-48 rounded-xl bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800/50 animate-pulse" />
                        ))}
                    </div>
                ) : bots.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6">
                        {bots.map((bot: any) => (
                            <div
                                key={bot.id}
                                className="group relative flex flex-col p-6 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-800 transition-all shadow-sm dark:shadow-none"
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <Link
                                        href={`/dashboard/bots/${bot.id}`}
                                        className="p-3 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors"
                                    >
                                        <Bot className="w-6 h-6" />
                                    </Link>
                                    <div className="flex items-center gap-2">
                                        <StatusBadge status={bot.status} />
                                        {mounted && isAdmin && (
                                            botToDelete === bot.id ? (
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={(e) => {
                                                            e.preventDefault()
                                                            e.stopPropagation()
                                                            handleConfirmDelete()
                                                        }}
                                                        disabled={deleteMutation.isPending}
                                                        className="px-3 py-1.5 text-xs font-medium bg-red-500 hover:bg-red-600 text-white rounded-md transition-colors disabled:opacity-50"
                                                    >
                                                        {deleteMutation.isPending ? 'Deleting...' : 'Confirm'}
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.preventDefault()
                                                            e.stopPropagation()
                                                            setBotToDelete(null)
                                                        }}
                                                        disabled={deleteMutation.isPending}
                                                        className="px-3 py-1.5 text-xs font-medium bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-md transition-colors disabled:opacity-50"
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={(e) => handleDeleteClick(e, bot.id)}
                                                    className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-zinc-400 dark:text-zinc-500 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                                                    title="Delete bot"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )
                                        )}
                                    </div>
                                </div>

                                <Link href={`/dashboard/bots/${bot.id}`} className="flex-1">
                                    <div className="mb-4">
                                        <h3 className="text-lg font-semibold text-zinc-900 dark:text-white tracking-tight mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                            {bot.name}
                                        </h3>
                                        <p className="text-zinc-500 text-sm font-mono truncate">
                                            {bot.phone_number ? `+${bot.phone_number}` : 'No number connected'}
                                        </p>
                                        {/* Show owner for admin */}
                                        {isAdmin && bot.owner_name && (
                                            <p className="text-zinc-400 dark:text-zinc-600 text-xs mt-1 flex items-center gap-1">
                                                <Users className="w-3 h-3" />
                                                {bot.owner_name}
                                            </p>
                                        )}
                                    </div>

                                    <div className="mt-auto pt-4 border-t border-zinc-100 dark:border-zinc-800/50 flex items-center justify-between text-xs text-zinc-500">
                                        <span className="flex items-center gap-1.5">
                                            <Calendar className="w-3.5 h-3.5" />
                                            {new Date(bot.created_at).toLocaleDateString()}
                                        </span>
                                        <div className="flex items-center gap-2 transition-colors">
                                            <span className="text-zinc-500 dark:text-zinc-400 font-medium group-hover:text-blue-600 dark:group-hover:text-blue-400">Configure</span>
                                            <ArrowRight className="w-3.5 h-3.5 group-hover:text-blue-600 dark:group-hover:text-blue-400" />
                                        </div>
                                    </div>
                                </Link>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-24 text-center border border-dashed border-zinc-300 dark:border-zinc-800 rounded-2xl bg-zinc-100/50 dark:bg-zinc-900/20">
                        <div className="p-4 rounded-full bg-zinc-200 dark:bg-zinc-900/50 mb-4">
                            <Bot className="w-8 h-8 text-zinc-500" />
                        </div>
                        <h3 className="text-lg font-medium text-zinc-900 dark:text-white mb-2">No bots found</h3>
                        <p className="text-zinc-500 max-w-sm mb-6">
                            Get started by creating your first WhatsApp bot instance to handle automation.
                        </p>
                        {mounted && isAdmin && (
                            <button
                                onClick={() => setShowCreateModal(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-zinc-900 dark:bg-white text-white dark:text-black hover:bg-zinc-800 dark:hover:bg-zinc-200 rounded-lg text-sm font-medium transition-colors"
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
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 dark:bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="w-full max-w-md bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-900 rounded-xl shadow-2xl overflow-hidden p-6 space-y-6 animate-in zoom-in-95 duration-200">
                            <div>
                                <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">Create New Bot</h3>
                                <p className="text-sm text-zinc-500 mt-1">Give your bot a friendly name to identify it.</p>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                                        Bot Name
                                    </label>
                                    <input
                                        type="text"
                                        value={newBotName}
                                        onChange={(e) => setNewBotName(e.target.value)}
                                        placeholder="e.g. Sales Assistant"
                                        className="w-full bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-zinc-700 placeholder:text-zinc-400 dark:placeholder:text-zinc-600"
                                        autoFocus
                                    />
                                </div>

                                {isAdmin && users && users.length > 0 && (
                                    <div className="space-y-2">
                                        <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                                            Assign to Client (Optional)
                                        </label>
                                        <select
                                            value={targetTenantId}
                                            onChange={(e) => setTargetTenantId(e.target.value)}
                                            className="w-full bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-zinc-700"
                                        >
                                            <option value="">My Workspace (Admin)</option>
                                            {users.filter((u: any) => u.role === 'USER').map((u: any) => (
                                                <option key={u.id} value={u.tenant_id}>
                                                    {u.name} ({u.email})
                                                </option>
                                            ))}
                                        </select>
                                        <p className="text-[10px] text-zinc-500">Leaving this unselected will assign the bot to your admin workspace.</p>
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-2">
                                <button
                                    onClick={() => setShowCreateModal(false)}
                                    className="px-4 py-2 text-sm font-medium text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleCreate}
                                    disabled={createMutation.isPending}
                                    className="px-4 py-2 text-sm font-medium bg-zinc-900 dark:bg-white text-white dark:text-black hover:bg-zinc-800 dark:hover:bg-zinc-200 rounded-lg transition-colors disabled:opacity-50"
                                >
                                    {createMutation.isPending ? 'Creating...' : 'Create Bot'}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div>
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
        <span className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium border uppercase tracking-wide ${styles[status] || styles.disconnected}`}>
            {status === 'connected' && (
                <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                </span>
            )}
            {status === 'connecting' && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />}
            {status === 'disconnected' && <span className="w-1.5 h-1.5 rounded-full bg-zinc-500" />}
            {status === 'error' && <span className="w-1.5 h-1.5 rounded-full bg-red-500" />}
            {status}
        </span>
    )
}
