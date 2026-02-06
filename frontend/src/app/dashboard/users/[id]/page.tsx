'use client'

import { useState, useEffect, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import AdminGuard from '@/components/AdminGuard'
import {
    ArrowLeft, Bot, MessageSquare, Megaphone,
    Bell, Activity, Shield, Zap, CloudLightning, Loader2, Eye,
    Plus, Trash2, X, Check, ChevronDown, ChevronUp, RefreshCw,
    Database, Users as UsersIcon
} from 'lucide-react'
import { toast } from 'sonner'

// Permission definitions with descriptions
const PERMISSION_DEFINITIONS = [
    { key: 'can_view', label: 'Show Bot', icon: Eye, description: 'User can see this bot in their dashboard' },
    { key: 'can_view_analytics', label: 'Analytics', icon: Activity, description: 'View bot analytics and statistics' },
    { key: 'can_create_rules', label: 'Auto-Reply', icon: Zap, description: 'Create and manage auto-reply rules' },
    { key: 'can_use_reminders', label: 'Reminders', icon: Bell, description: 'Create and manage scheduled reminders' },
    { key: 'can_create_campaigns', label: 'Campaigns', icon: Megaphone, description: 'Create and run broadcast campaigns' },
    { key: 'can_use_ai', label: 'AI Assistant', icon: CloudLightning, description: 'Use AI-powered assistant features' },
    { key: 'can_manage_contacts', label: 'Contacts', icon: UsersIcon, description: 'View and manage contacts' },
    { key: 'can_manage_datasources', label: 'Data Sources', icon: Database, description: 'Connect Google Sheets and data sources' },
]

export default function UserDetailPage() {
    const params = useParams()
    const id = params?.id as string
    const router = useRouter()
    const queryClient = useQueryClient()
    const [mounted, setMounted] = useState(false)
    const [showCreateBotModal, setShowCreateBotModal] = useState(false)
    const [newBotName, setNewBotName] = useState('')

    useEffect(() => { setMounted(true) }, [])

    const { data: detail, isLoading, refetch } = useQuery({
        queryKey: ['user-detail', id],
        queryFn: async () => {
            const response = await api.users.get(id as string)
            return response.data.data
        }
    })

    const updatePermissionMutation = useMutation({
        mutationFn: async ({ botId, data }: { botId: string, data: any }) => {
            return await api.permissions.updateBotPermission(id as string, botId, data)
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['user-detail', id] })
            toast.success('Permissions updated')
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.error || 'Failed to save permissions')
        }
    })

    const createBotMutation = useMutation({
        mutationFn: async (data: { name: string, target_tenant_id: string }) => {
            return await api.bots.create(data)
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['user-detail', id] })
            queryClient.invalidateQueries({ queryKey: ['users'] })
            setShowCreateBotModal(false)
            setNewBotName('')
            toast.success('Bot created successfully!')
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.error || 'Failed to create bot')
        }
    })

    const deleteBotMutation = useMutation({
        mutationFn: async (botId: string) => {
            return await api.bots.delete(botId)
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['user-detail', id] })
            queryClient.invalidateQueries({ queryKey: ['users'] })
            toast.success('Bot deleted successfully!')
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.error || 'Failed to delete bot')
        }
    })

    const handleCreateBot = () => {
        if (!newBotName.trim()) {
            toast.error('Bot name is required')
            return
        }
        createBotMutation.mutate({
            name: newBotName,
            target_tenant_id: detail?.user?.tenant_id
        })
    }

    if (!mounted || isLoading) {
        return (
            <AdminGuard>
            <div className="p-8 flex flex-col items-center justify-center min-h-[60vh] text-zinc-500 gap-4">
                <div className="relative w-12 h-12">
                    <div className="absolute inset-0 rounded-full border-2 border-zinc-800"></div>
                    <div className="absolute inset-0 rounded-full border-2 border-blue-500 border-t-transparent animate-spin"></div>
                </div>
                <p className="text-sm font-medium">Loading user details...</p>
            </div>
            </AdminGuard>
        )
    }

    if (!detail) return <AdminGuard><div className="p-8 text-white">User not found</div></AdminGuard>

    const { user, bots, analytics, permissions } = detail

    return (
        <AdminGuard>
        <div className="p-8 min-h-screen bg-black text-white space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.back()}
                        className="p-2.5 hover:bg-zinc-900 rounded-xl transition-all border border-zinc-800 hover:border-zinc-700"
                    >
                        <ArrowLeft className="w-5 h-5 text-zinc-400" />
                    </button>
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center border border-zinc-700 font-medium text-zinc-300">
                                {(user.name || 'U')[0].toUpperCase()}
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold tracking-tight text-white">{user.name}</h1>
                                <p className="text-zinc-500 text-sm">{user.email}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <span className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${user.role === 'OWNER' ? 'bg-purple-500/10 border-purple-500/20 text-purple-400' :
                            user.role === 'ADMIN' ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' :
                                'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                        }`}>
                        <Shield className="w-3 h-3 inline mr-1.5" />
                        {user.role}
                    </span>
                    <span className="text-xs text-zinc-500 bg-zinc-900 px-3 py-1.5 rounded-lg border border-zinc-800">
                        Member since {new Date(user.created_at).toLocaleDateString()}
                    </span>
                    <button
                        onClick={() => refetch()}
                        className="p-2 bg-zinc-900 border border-zinc-800/50 rounded-lg text-zinc-400 hover:text-white hover:border-zinc-700 transition-colors"
                    >
                        <RefreshCw className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Quick Stats Grid - Analytics Style */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <KPICard title="TOTAL MESSAGES" value={analytics.total_messages} icon={<MessageSquare className="w-5 h-5" />} />
                <KPICard title="AUTO REPLIES" value={analytics.auto_replies} icon={<Zap className="w-5 h-5" />} />
                <KPICard title="CAMPAIGNS" value={analytics.campaigns} icon={<Megaphone className="w-5 h-5" />} />
                <KPICard title="REMINDERS" value={analytics.reminders} icon={<Bell className="w-5 h-5" />} />
            </div>

            {/* Assigned Bots Header with Create Button */}
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <Bot className="w-5 h-5 text-zinc-500" />
                    <h3 className="text-lg font-medium text-zinc-200">Assigned Bots</h3>
                    <span className="text-xs text-zinc-500">{bots.length} bot{bots.length !== 1 ? 's' : ''} assigned to this user</span>
                </div>
                <button
                    onClick={() => setShowCreateBotModal(true)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium text-sm transition-all shadow-lg shadow-blue-500/20"
                >
                    <Plus className="w-4 h-4" />
                    Create Bot
                </button>
            </div>

            {/* Bot List - Table Style */}
            {bots.length === 0 ? (
                <div className="bg-zinc-950 border border-zinc-900 rounded-xl text-center py-16">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-zinc-800/50 rounded-2xl mb-4">
                        <Bot className="w-8 h-8 text-zinc-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-zinc-100 mb-2">No Bots Assigned</h3>
                    <p className="text-zinc-400 text-sm mb-4">Create a bot to get started</p>
                    <button
                        onClick={() => setShowCreateBotModal(true)}
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium text-sm transition-all shadow-lg shadow-blue-500/20"
                    >
                        <Plus className="w-4 h-4" />
                        Create First Bot
                    </button>
                </div>
            ) : (
                <div className="space-y-3">
                    {bots.map((bot: any) => (
                        <BotPermissionRow
                            key={bot.id}
                            bot={bot}
                            permissions={permissions}
                            onUpdate={(data) => updatePermissionMutation.mutate({ botId: bot.id, data })}
                            onDelete={() => {
                                if (confirm(`Are you sure you want to delete "${bot.name}"? This action cannot be undone.`)) {
                                    deleteBotMutation.mutate(bot.id)
                                }
                            }}
                            isUpdating={updatePermissionMutation.isPending && updatePermissionMutation.variables?.botId === bot.id}
                            isDeleting={deleteBotMutation.isPending && deleteBotMutation.variables === bot.id}
                        />
                    ))}
                </div>
            )}

            {/* Create Bot Modal */}
            {showCreateBotModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="w-full max-w-md bg-zinc-950 border border-zinc-900 rounded-xl overflow-hidden">
                        <div className="px-6 py-4 border-b border-zinc-800/50 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-500/10 rounded-lg">
                                    <Bot className="w-5 h-5 text-blue-400" />
                                </div>
                                <div>
                                    <h3 className="font-medium text-white">Create Bot for User</h3>
                                    <p className="text-xs text-zinc-500">Will be assigned to {user.name}</p>
                                </div>
                            </div>
                            <button onClick={() => setShowCreateBotModal(false)} className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg transition-all">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2 block">Bot Name</label>
                                <input
                                    type="text"
                                    value={newBotName}
                                    onChange={(e) => setNewBotName(e.target.value)}
                                    placeholder="e.g., Customer Support Bot"
                                    className="w-full bg-zinc-900/50 border border-zinc-800/50 text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-zinc-700"
                                    autoFocus
                                />
                            </div>
                            <div className="p-3 bg-zinc-900/30 border border-zinc-800/50 rounded-lg">
                                <p className="text-xs text-zinc-500">
                                    After creation, you can configure the bot's permissions to control what features the user can access.
                                </p>
                            </div>
                        </div>
                        <div className="px-6 py-4 border-t border-zinc-800/50 flex gap-3">
                            <button
                                onClick={() => setShowCreateBotModal(false)}
                                className="flex-1 py-2.5 text-zinc-400 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg font-medium text-sm transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreateBot}
                                disabled={createBotMutation.isPending || !newBotName.trim()}
                                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {createBotMutation.isPending ? (
                                    <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</>
                                ) : (
                                    <><Plus className="w-4 h-4" /> Create Bot</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
        </AdminGuard>
    )
}

function KPICard({ title, value, icon }: { title: string, value: number, icon: React.ReactNode }) {
    return (
        <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-6 hover:border-zinc-800 transition-colors">
            <div className="flex items-center gap-2 text-zinc-500 text-xs font-medium uppercase tracking-wider mb-3">
                <div className="p-1.5 rounded-lg bg-zinc-900 text-zinc-400">{icon}</div>
                {title}
            </div>
            <div className="text-3xl font-bold text-white tabular-nums tracking-tight">{(value || 0).toLocaleString()}</div>
        </div>
    )
}

function BotPermissionRow({ bot, permissions, onUpdate, onDelete, isUpdating, isDeleting }: { bot: any, permissions: any[], onUpdate: (data: any) => void, onDelete: () => void, isUpdating: boolean, isDeleting: boolean }) {
    const initialPerms = useMemo(() => {
        return permissions.find((p: any) => p.bot_id === bot.id) || {
            can_view: 0, can_edit: 0, can_delete: 0, can_view_analytics: 0,
            can_create_rules: 0, can_use_reminders: 0, can_create_campaigns: 0,
            can_use_ai: 0, can_manage_contacts: 0, can_manage_datasources: 0
        }
    }, [permissions, bot.id])

    const [perms, setPerms] = useState(() => ({
        can_view: !!initialPerms.can_view,
        can_edit: !!initialPerms.can_edit,
        can_delete: !!initialPerms.can_delete,
        can_view_analytics: !!initialPerms.can_view_analytics,
        can_create_rules: !!initialPerms.can_create_rules,
        can_use_reminders: !!initialPerms.can_use_reminders,
        can_create_campaigns: !!initialPerms.can_create_campaigns,
        can_use_ai: !!initialPerms.can_use_ai,
        can_manage_contacts: !!initialPerms.can_manage_contacts,
        can_manage_datasources: !!initialPerms.can_manage_datasources,
    }))

    const [expanded, setExpanded] = useState(false)

    useEffect(() => {
        if (!isUpdating) {
            setPerms({
                can_view: !!initialPerms.can_view,
                can_edit: !!initialPerms.can_edit,
                can_delete: !!initialPerms.can_delete,
                can_view_analytics: !!initialPerms.can_view_analytics,
                can_create_rules: !!initialPerms.can_create_rules,
                can_use_reminders: !!initialPerms.can_use_reminders,
                can_create_campaigns: !!initialPerms.can_create_campaigns,
                can_use_ai: !!initialPerms.can_use_ai,
                can_manage_contacts: !!initialPerms.can_manage_contacts,
                can_manage_datasources: !!initialPerms.can_manage_datasources,
            })
        }
    }, [initialPerms, isUpdating])

    const toggle = (key: keyof typeof perms) => {
        if (isUpdating) return
        const newState = { ...perms, [key]: !perms[key] }
        setPerms(newState)
        onUpdate(newState)
    }

    const activeCount = Object.values(perms).filter(Boolean).length
    const activePermLabels = PERMISSION_DEFINITIONS.filter(p => perms[p.key as keyof typeof perms]).map(p => p.label)

    return (
        <div className={`bg-zinc-950 border border-zinc-900 rounded-xl overflow-hidden transition-all duration-300 ${isUpdating || isDeleting ? 'opacity-70' : ''}`}>
            {/* Bot Header Row */}
            <div
                className="px-6 py-4 flex items-center justify-between cursor-pointer hover:bg-zinc-900/30 transition-colors"
                onClick={() => setExpanded(!expanded)}
            >
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-zinc-900 rounded-xl flex items-center justify-center border border-zinc-800">
                        <Bot className="w-5 h-5 text-zinc-500" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h4 className="text-white font-semibold">{bot.name}</h4>
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium ${bot.status === 'connected'
                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                    : 'bg-zinc-800 text-zinc-500 border border-zinc-700'
                                }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${bot.status === 'connected' ? 'bg-emerald-500' : 'bg-zinc-500'}`} />
                                {bot.status === 'connected' ? 'Connected' : 'Disconnected'}
                            </span>
                        </div>
                        <p className="text-xs text-zinc-600 font-mono">ID: {bot.id.substring(0, 12)}...</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="text-right">
                        <p className="text-sm font-medium text-zinc-300">{activeCount} permissions</p>
                        <p className="text-xs text-zinc-600">{perms.can_view ? 'Visible to user' : 'Hidden from user'}</p>
                    </div>
                    {(isUpdating || isDeleting) && <Loader2 className="w-4 h-4 animate-spin text-blue-500" />}
                    <button
                        onClick={(e) => { e.stopPropagation(); onDelete(); }}
                        disabled={isDeleting}
                        className="p-2 text-zinc-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all disabled:opacity-50"
                        title="Delete bot"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                    {expanded ? (
                        <ChevronUp className="w-5 h-5 text-zinc-600" />
                    ) : (
                        <ChevronDown className="w-5 h-5 text-zinc-600" />
                    )}
                </div>
            </div>

            {/* Expanded Permissions */}
            {expanded && (
                <div className="px-6 pb-6 border-t border-zinc-900">
                    <div className="pt-4">
                        <div className="flex items-center gap-2 mb-4">
                            <Shield className="w-4 h-4 text-zinc-600" />
                            <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Feature Access Control</span>
                        </div>
                        
                        {/* Permission Badges */}
                        <div className="flex flex-wrap gap-2 mb-4">
                            {PERMISSION_DEFINITIONS.map((perm) => {
                                const isActive = perms[perm.key as keyof typeof perms]
                                return (
                                    <button
                                        key={perm.key}
                                        onClick={(e) => { e.stopPropagation(); toggle(perm.key as keyof typeof perms) }}
                                        disabled={isUpdating}
                                        className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${isActive
                                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                                                : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'
                                            }`}
                                        title={perm.description}
                                    >
                                        {perm.label}
                                    </button>
                                )
                            })}
                        </div>

                        {/* Quick Presets */}
                        <div className="flex flex-wrap gap-2">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation()
                                    const allEnabled = {
                                        can_view: true, can_edit: true, can_delete: true,
                                        can_view_analytics: true, can_create_rules: true,
                                        can_use_reminders: true, can_create_campaigns: true,
                                        can_use_ai: true, can_manage_contacts: true, can_manage_datasources: true
                                    }
                                    setPerms(allEnabled)
                                    onUpdate(allEnabled)
                                }}
                                disabled={isUpdating}
                                className="px-3 py-1.5 text-xs font-medium text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-lg transition-colors disabled:opacity-50"
                            >
                                Full Access
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation()
                                    const viewOnly = {
                                        can_view: true, can_edit: false, can_delete: false,
                                        can_view_analytics: true, can_create_rules: false,
                                        can_use_reminders: false, can_create_campaigns: false,
                                        can_use_ai: false, can_manage_contacts: false, can_manage_datasources: false
                                    }
                                    setPerms(viewOnly)
                                    onUpdate(viewOnly)
                                }}
                                disabled={isUpdating}
                                className="px-3 py-1.5 text-xs font-medium text-zinc-400 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg transition-colors disabled:opacity-50"
                            >
                                View Only
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation()
                                    const operator = {
                                        can_view: true, can_edit: false, can_delete: false,
                                        can_view_analytics: true, can_create_rules: true,
                                        can_use_reminders: true, can_create_campaigns: true,
                                        can_use_ai: false, can_manage_contacts: true, can_manage_datasources: false
                                    }
                                    setPerms(operator)
                                    onUpdate(operator)
                                }}
                                disabled={isUpdating}
                                className="px-3 py-1.5 text-xs font-medium text-zinc-400 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg transition-colors disabled:opacity-50"
                            >
                                Operator
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation()
                                    const campaignManager = {
                                        can_view: true, can_edit: false, can_delete: false,
                                        can_view_analytics: true, can_create_rules: false,
                                        can_use_reminders: true, can_create_campaigns: true,
                                        can_use_ai: false, can_manage_contacts: true, can_manage_datasources: true
                                    }
                                    setPerms(campaignManager)
                                    onUpdate(campaignManager)
                                }}
                                disabled={isUpdating}
                                className="px-3 py-1.5 text-xs font-medium text-zinc-400 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg transition-colors disabled:opacity-50"
                            >
                                Campaign Manager
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation()
                                    const allDisabled = {
                                        can_view: false, can_edit: false, can_delete: false,
                                        can_view_analytics: false, can_create_rules: false,
                                        can_use_reminders: false, can_create_campaigns: false,
                                        can_use_ai: false, can_manage_contacts: false, can_manage_datasources: false
                                    }
                                    setPerms(allDisabled)
                                    onUpdate(allDisabled)
                                }}
                                disabled={isUpdating}
                                className="px-3 py-1.5 text-xs font-medium text-red-400 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-lg transition-colors disabled:opacity-50"
                            >
                                Revoke All
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
