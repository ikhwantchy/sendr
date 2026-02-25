'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import Link from 'next/link'
import { usePermissions } from '@/hooks/usePermissions'
import { Bot, Plus, Trash2, Settings, Phone, Calendar, Circle, Search, ArrowRight, RefreshCw, Loader2, Users, Filter, ChevronDown, Check, Clock, AlertTriangle, Shield, User, HelpCircle, X } from 'lucide-react'
import DateOnlyPicker from '@/components/pickers/DateOnlyPicker'

export default function BotsPage() {
    const queryClient = useQueryClient()
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [newBotName, setNewBotName] = useState('')
    const [targetTenantId, setTargetTenantId] = useState('')
    const [expiresAt, setExpiresAt] = useState('') // New: expiration date
    const [expirationPreset, setExpirationPreset] = useState('') // New: preset options
    const [mounted, setMounted] = useState(false)
    const [botToDelete, setBotToDelete] = useState<string | null>(null)
    const [filterByUser, setFilterByUser] = useState<string>('all') // Filter state
    const [showUserDropdown, setShowUserDropdown] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        setMounted(true)
    }, [])

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowUserDropdown(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
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
        mutationFn: async (data: { name: string, target_tenant_id?: string, expires_at?: string }) => {
            return await api.bots.create(data)
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['bots'] })
            setShowCreateModal(false)
            setNewBotName('')
            setTargetTenantId('')
            setExpiresAt('')
            setExpirationPreset('')
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

    // Handle expiration preset change
    const handleExpirationPreset = (preset: string) => {
        setExpirationPreset(preset)
        if (preset === 'none') {
            setExpiresAt('')
        } else if (preset === 'custom') {
            // Keep existing expiresAt or set a default
            if (!expiresAt) {
                const defaultDate = new Date()
                defaultDate.setMonth(defaultDate.getMonth() + 1)
                setExpiresAt(defaultDate.toISOString().split('T')[0])
            }
        } else {
            const now = new Date()
            switch (preset) {
                case '1week':
                    now.setDate(now.getDate() + 7)
                    break
                case '1month':
                    now.setMonth(now.getMonth() + 1)
                    break
                case '3months':
                    now.setMonth(now.getMonth() + 3)
                    break
                case '6months':
                    now.setMonth(now.getMonth() + 6)
                    break
                case '1year':
                    now.setFullYear(now.getFullYear() + 1)
                    break
            }
            setExpiresAt(now.toISOString().split('T')[0])
        }
    }

    const handleCreate = () => {
        if (!newBotName.trim()) {
            toast.error('Please enter a bot name')
            return
        }
        createMutation.mutate({
            name: newBotName,
            target_tenant_id: targetTenantId || undefined,
            expires_at: expiresAt ? new Date(expiresAt).toISOString() : undefined
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

    const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false)
    const clientDropdownRef = useRef<HTMLDivElement>(null)

    // Close client dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (clientDropdownRef.current && !clientDropdownRef.current.contains(event.target as Node)) {
                setIsClientDropdownOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    return (
        <div className="p-4 sm:p-6 lg:p-8 min-h-screen bg-zinc-50 dark:bg-black text-zinc-900 dark:text-zinc-100">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-xl sm:text-2xl font-semibold text-zinc-900 dark:text-white tracking-tight">Bots</h1>
                        {isRefreshing && (
                            <Loader2 className="w-4 h-4 text-blue-500 dark:text-blue-400 animate-spin" />
                        )}
                    </div>

                </div>
                <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                    {/* User Filter Dropdown - Only for Admin/Owner */}
                    {mounted && isAdmin && uniqueOwners.length > 1 && (
                        <div className="relative" ref={dropdownRef}>
                            <button
                                onClick={() => setShowUserDropdown(!showUserDropdown)}
                                className="flex items-center gap-2 px-3 py-2 bg-zinc-900 dark:bg-zinc-900 border border-zinc-700 dark:border-zinc-800 text-white rounded-lg text-sm font-medium hover:bg-zinc-800 dark:hover:bg-zinc-800 transition-colors"
                            >
                                <Bot className="w-4 h-4 text-blue-400" />
                                <span>
                                    {filterByUser === 'all'
                                        ? 'All Bots'
                                        : uniqueOwners.find(o => o.tenant_id === filterByUser)?.email || 'All Bots'}
                                </span>
                                <ChevronDown className={`w-4 h-4 transition-transform ${showUserDropdown ? 'rotate-180' : ''}`} />
                            </button>

                            {showUserDropdown && (
                                <div className="absolute top-full left-0 mt-2 w-56 bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl z-50 py-1 max-h-80 overflow-y-auto">
                                    {/* All Bots option */}
                                    <button
                                        onClick={() => {
                                            setFilterByUser('all')
                                            setShowUserDropdown(false)
                                        }}
                                        className={`w-full flex items-center justify-between px-4 py-2.5 text-sm text-left hover:bg-zinc-800 transition-colors ${filterByUser === 'all' ? 'text-blue-400' : 'text-zinc-300'
                                            }`}
                                    >
                                        <span>All Bots</span>
                                        {filterByUser === 'all' && <Check className="w-4 h-4" />}
                                    </button>

                                    {/* Divider */}
                                    <div className="border-t border-zinc-800 my-1" />

                                    {/* User options */}
                                    {uniqueOwners.map((owner) => (
                                        <button
                                            key={owner.tenant_id}
                                            onClick={() => {
                                                setFilterByUser(owner.tenant_id)
                                                setShowUserDropdown(false)
                                            }}
                                            className={`w-full flex items-center justify-between px-4 py-2.5 text-sm text-left hover:bg-zinc-800 transition-colors ${filterByUser === owner.tenant_id ? 'text-blue-400' : 'text-zinc-300'
                                                }`}
                                        >
                                            <span>{owner.email || owner.name}</span>
                                            {filterByUser === owner.tenant_id && <Check className="w-4 h-4" />}
                                        </button>
                                    ))}
                                </div>
                            )}
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
                            className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-zinc-900 dark:bg-white text-white dark:text-black hover:bg-zinc-800 dark:hover:bg-zinc-200 rounded-lg text-sm font-medium transition-colors"
                        >
                            <Plus className="w-4 h-4" />
                            <span className="hidden sm:inline">Create Bot</span>
                            <span className="sm:hidden">New</span>
                        </button>
                    )}
                </div>
            </div>

            {/* List/Grid */}
            {
                isLoading ? (
                    <div className="space-y-3 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-6 md:space-y-0">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-20 md:h-48 rounded-xl bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800/50 animate-pulse" />
                        ))}
                    </div>
                ) : bots.length > 0 ? (
                    <>
                        {/* Mobile List View - Compact rows */}
                        <div className="md:hidden space-y-2">
                            {bots.map((bot: any) => (
                                <Link
                                    key={bot.id}
                                    href={`/dashboard/bots/${bot.id}`}
                                    className="flex items-center gap-3 p-3 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-900 rounded-xl hover:border-zinc-300 dark:hover:border-zinc-800 transition-all group"
                                >
                                    {/* Status indicator */}
                                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${bot.status === 'connected' ? 'bg-emerald-500' :
                                        bot.status === 'connecting' ? 'bg-amber-500 animate-pulse' :
                                            'bg-zinc-400'
                                        }`} />

                                    {/* Bot info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-sm font-semibold text-zinc-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                                {bot.name}
                                            </h3>
                                            {bot.expires_at && (() => {
                                                const daysRemaining = Math.ceil((new Date(bot.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                                                if (daysRemaining <= 0) {
                                                    return <span className="px-1.5 py-0.5 bg-red-500/10 text-red-500 text-[9px] font-medium rounded">Expired</span>
                                                } else if (daysRemaining <= 7) {
                                                    return <span className="px-1.5 py-0.5 bg-amber-500/10 text-amber-500 text-[9px] font-medium rounded">{daysRemaining}d</span>
                                                }
                                                return null
                                            })()}
                                        </div>
                                        <p className="text-[11px] text-zinc-500 truncate">
                                            {bot.phone_number ? `+${bot.phone_number}` : 'No number'}
                                            {isAdmin && bot.owner_name && ` • ${bot.owner_name}`}
                                        </p>
                                    </div>

                                    {/* Right side: Status badge + delete */}
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        <span className={`text-[10px] font-medium uppercase ${bot.status === 'connected' ? 'text-emerald-500' :
                                            bot.status === 'connecting' ? 'text-amber-500' :
                                                'text-zinc-400'
                                            }`}>
                                            {bot.status === 'connected' ? 'ON' : bot.status === 'connecting' ? '...' : 'OFF'}
                                        </span>
                                        {mounted && isAdmin && (
                                            botToDelete === bot.id ? (
                                                <div className="flex items-center gap-1" onClick={(e) => e.preventDefault()}>
                                                    <button
                                                        onClick={(e) => {
                                                            e.preventDefault()
                                                            e.stopPropagation()
                                                            handleConfirmDelete()
                                                        }}
                                                        disabled={deleteMutation.isPending}
                                                        className="px-2 py-1 text-[10px] font-medium bg-red-500 text-white rounded transition-colors"
                                                    >
                                                        {deleteMutation.isPending ? '...' : 'Yes'}
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.preventDefault()
                                                            e.stopPropagation()
                                                            setBotToDelete(null)
                                                        }}
                                                        className="px-2 py-1 text-[10px] font-medium bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded"
                                                    >
                                                        No
                                                    </button>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={(e) => handleDeleteClick(e, bot.id)}
                                                    className="p-1.5 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            )
                                        )}
                                        <ArrowRight className="w-4 h-4 text-zinc-400 group-hover:text-blue-500 transition-colors" />
                                    </div>
                                </Link>
                            ))}
                        </div>

                        {/* Desktop Card Grid */}
                        <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6">
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
                                            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white tracking-tight mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
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
                                            <div className="flex flex-col gap-1">
                                                <span className="flex items-center gap-1.5">
                                                    <Calendar className="w-3.5 h-3.5" />
                                                    {new Date(bot.created_at).toLocaleDateString()}
                                                </span>
                                                {/* Expiration status */}
                                                {bot.expires_at && (
                                                    <ExpirationBadge expiresAt={bot.expires_at} />
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 transition-colors">
                                                <span className="text-zinc-500 dark:text-zinc-400 font-medium group-hover:text-blue-600 dark:group-hover:text-blue-400">Configure</span>
                                                <ArrowRight className="w-3.5 h-3.5 group-hover:text-blue-600 dark:group-hover:text-blue-400" />
                                            </div>
                                        </div>
                                    </Link>
                                </div>
                            ))}
                        </div>
                    </>
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
                        <div className="w-full max-w-md bg-white dark:bg-[#111111] border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden p-8 space-y-7 animate-in zoom-in-95 duration-200">
                            <div className="flex items-center justify-between">
                                <h3 className="text-[22px] font-bold text-zinc-900 dark:text-white tracking-tight">Create New Bot</h3>
                                <button
                                    onClick={() => setShowCreateModal(false)}
                                    className="p-2 hover:bg-zinc-800/50 rounded-xl text-zinc-500 hover:text-white transition-all"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[13px] font-semibold text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
                                        BOT NAME <span className="text-zinc-600 font-normal">*</span>
                                        <span title="Give your bot a friendly name to identify it.">
                                            <HelpCircle className="w-3.5 h-3.5 text-zinc-600 cursor-help" />
                                        </span>
                                    </label>
                                    <input
                                        type="text"
                                        value={newBotName}
                                        onChange={(e) => setNewBotName(e.target.value)}
                                        placeholder="e.g. Sales Assistant"
                                        className="w-full h-[48px] bg-zinc-50 dark:bg-[#0a0a0a] border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white text-sm rounded-xl px-4 focus:outline-none focus:border-blue-500 dark:focus:border-zinc-700 transition-all font-medium placeholder:text-zinc-400 dark:placeholder:text-zinc-700"
                                        autoFocus
                                    />
                                </div>

                                {isAdmin && users && users.length > 0 && (
                                    <div className="space-y-2">
                                        <label className="text-[13px] font-semibold text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
                                            ASSIGN TO CLIENT (OPTIONAL)
                                            <span title="Leaving this unselected will assign the bot to your admin workspace.">
                                                <HelpCircle className="w-3.5 h-3.5 text-zinc-600 cursor-help" />
                                            </span>
                                        </label>
                                        <div className="relative" ref={clientDropdownRef}>
                                            <button
                                                type="button"
                                                onClick={() => setIsClientDropdownOpen(!isClientDropdownOpen)}
                                                className="w-full h-[48px] px-4 bg-zinc-50 dark:bg-[#0a0a0a] border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-blue-500 dark:focus:border-zinc-700 transition-all font-medium flex items-center justify-between cursor-pointer hover:border-zinc-300 dark:hover:border-zinc-700"
                                            >
                                                <div className="flex items-center gap-3">
                                                    {(() => {
                                                        const selectedClient = users.find((u: any) => u.tenant_id === targetTenantId)
                                                        return (
                                                            <>
                                                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${!targetTenantId ? 'bg-amber-500/10 text-amber-500' : 'bg-blue-500/10 text-blue-500'}`}>
                                                                    {!targetTenantId ? <Shield className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
                                                                </div>
                                                                <span className="text-sm font-medium">
                                                                    {selectedClient ? `${selectedClient.name} (${selectedClient.email})` : 'My Workspace (Admin)'}
                                                                </span>
                                                            </>
                                                        )
                                                    })()}
                                                </div>
                                                <ChevronDown className={`w-4 h-4 text-zinc-500 transition-transform ${isClientDropdownOpen ? 'rotate-180' : ''}`} />
                                            </button>

                                            {isClientDropdownOpen && (
                                                <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-[#0a0a0a] border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-xl z-50 animate-in fade-in slide-in-from-top-2 duration-200 max-h-60 overflow-y-auto">
                                                    {/* My Workspace Option */}
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setTargetTenantId('')
                                                            setIsClientDropdownOpen(false)
                                                        }}
                                                        className={`w-full px-4 py-3 flex items-center gap-3 transition-all ${!targetTenantId ? 'bg-zinc-100 dark:bg-zinc-800/50' : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/30'}`}
                                                    >
                                                        <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-amber-500/10 text-amber-500">
                                                            <Shield className="w-3.5 h-3.5" />
                                                        </div>
                                                        <span className="text-sm font-medium text-left flex-1">My Workspace (Admin)</span>
                                                        {!targetTenantId && (
                                                            <Check className="w-4 h-4 text-emerald-500" />
                                                        )}
                                                    </button>

                                                    {/* Client Options */}
                                                    {users.filter((u: any) => u.role === 'USER').map((u: any) => {
                                                        const isSelected = targetTenantId === u.tenant_id
                                                        return (
                                                            <button
                                                                key={u.id}
                                                                type="button"
                                                                onClick={() => {
                                                                    setTargetTenantId(u.tenant_id)
                                                                    setIsClientDropdownOpen(false)
                                                                }}
                                                                className={`w-full px-4 py-3 flex items-center gap-3 transition-all ${isSelected ? 'bg-zinc-100 dark:bg-zinc-800/50' : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/30'}`}
                                                            >
                                                                <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-blue-500/10 text-blue-500">
                                                                    <User className="w-3.5 h-3.5" />
                                                                </div>
                                                                <div className="flex flex-col text-left flex-1 min-w-0">
                                                                    <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{u.name}</span>
                                                                    <span className="text-[10px] text-zinc-500 truncate">{u.email}</span>
                                                                </div>
                                                                {isSelected && (
                                                                    <Check className="w-4 h-4 text-emerald-500" />
                                                                )}
                                                            </button>
                                                        )
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Bot Expiration - Only for Admin */}
                                {isAdmin && (
                                    <div className="space-y-3">
                                        <label className="text-[13px] font-semibold text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
                                            SUBSCRIPTION PERIOD
                                            <span title="Set a limited duration for this bot instance.">
                                                <HelpCircle className="w-3.5 h-3.5 text-zinc-600 cursor-help" />
                                            </span>
                                        </label>

                                        {/* Quick Presets */}
                                        <div className="flex flex-wrap gap-2">
                                            {[
                                                { value: 'none', label: 'No Limit' },
                                                { value: '1month', label: '1 Month' },
                                                { value: '3months', label: '3 Months' },
                                                { value: '1year', label: '1 Year' },
                                            ].map((opt) => (
                                                <button
                                                    key={opt.value}
                                                    type="button"
                                                    onClick={() => handleExpirationPreset(opt.value)}
                                                    className={`px-4 py-2 text-xs font-bold rounded-xl border transition-all ${expirationPreset === opt.value
                                                        ? 'bg-blue-500/10 border-blue-500/50 text-blue-400'
                                                        : 'bg-zinc-50 dark:bg-[#0a0a0a] border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-700'
                                                        }`}
                                                >
                                                    {opt.label}
                                                </button>
                                            ))}
                                        </div>

                                        {/* Calendar Picker Style Update */}
                                        <div className="pt-2">
                                            <DateOnlyPicker
                                                value={expiresAt}
                                                onChange={(val) => {
                                                    setExpiresAt(val)
                                                    setExpirationPreset(val ? 'custom' : 'none')
                                                }}
                                                placeholder="Or select custom date..."
                                            />
                                        </div>

                                        {expiresAt && (
                                            <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3 flex items-center gap-2">
                                                <AlertTriangle className="w-4 h-4 text-amber-500" />
                                                <p className="text-[11px] text-zinc-400">
                                                    Auto-disconnect on <span className="text-amber-500 font-bold">{new Date(expiresAt + 'T00:00:00').toLocaleDateString('en-US', {
                                                        month: 'long',
                                                        day: 'numeric',
                                                        year: 'numeric'
                                                    })}</span>
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center gap-3 pt-4">
                                <button
                                    onClick={() => setShowCreateModal(false)}
                                    className="flex-1 h-[48px] bg-zinc-100 dark:bg-[#1a1a1a] text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800 rounded-xl font-bold text-[15px] hover:bg-zinc-200 dark:hover:bg-zinc-800 hover:text-white transition-all active:scale-[0.98]"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleCreate}
                                    disabled={createMutation.isPending}
                                    className="flex-1 h-[48px] bg-zinc-900 dark:bg-white text-white dark:text-black rounded-xl font-bold text-[15px] hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-all active:scale-[0.98] disabled:opacity-50"
                                >
                                    {createMutation.isPending ? 'Working...' : 'Create Bot'}
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

function ExpirationBadge({ expiresAt }: { expiresAt: string }) {
    const expirationDate = new Date(expiresAt)
    const now = new Date()
    const daysRemaining = Math.ceil((expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    const isExpired = daysRemaining <= 0
    const isExpiringSoon = daysRemaining > 0 && daysRemaining <= 7

    if (isExpired) {
        return (
            <span className="flex items-center gap-1 text-[10px] font-medium text-red-400">
                <AlertTriangle className="w-3 h-3" />
                Expired
            </span>
        )
    }

    if (isExpiringSoon) {
        return (
            <span className="flex items-center gap-1 text-[10px] font-medium text-amber-400">
                <Clock className="w-3 h-3" />
                Expires in {daysRemaining} day{daysRemaining !== 1 ? 's' : ''}
            </span>
        )
    }

    return (
        <span className="flex items-center gap-1 text-[10px] font-medium text-zinc-500">
            <Clock className="w-3 h-3" />
            Valid until {expirationDate.toLocaleDateString()}
        </span>
    )
}
