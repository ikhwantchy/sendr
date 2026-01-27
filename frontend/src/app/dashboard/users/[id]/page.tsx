'use client'

import { useState, useEffect, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import {
    ArrowLeft, Bot, MessageSquare, Megaphone,
    Bell, Activity, Shield, Info, ExternalLink,
    ChevronRight, Zap, CloudLightning, Loader2, Eye
} from 'lucide-react'
import { toast } from 'sonner'

export default function UserDetailPage() {
    const { id } = useParams()
    const router = useRouter()
    const queryClient = useQueryClient()
    const [mounted, setMounted] = useState(false)

    useEffect(() => { setMounted(true) }, [])

    const { data: detail, isLoading } = useQuery({
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
            toast.success('Permissions saved')
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.error || 'Failed to save permissions')
        }
    })

    if (!mounted || isLoading) {
        return (
            <div className="p-8 flex flex-col items-center justify-center min-h-[60vh] text-zinc-500 gap-4">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                <p className="text-sm font-medium">Initializing Control Center...</p>
            </div>
        )
    }

    if (!detail) return <div className="p-8 text-white">User not found</div>

    const { user, bots, analytics, permissions } = detail

    return (
        <div className="p-8 min-h-screen bg-black text-white space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.back()}
                        className="p-2.5 hover:bg-zinc-900 rounded-xl transition-all border border-zinc-800 hover:border-zinc-700 active:scale-95"
                    >
                        <ArrowLeft className="w-5 h-5 text-zinc-400" />
                    </button>
                    <div>
                        <div className="flex items-center gap-2 mb-0.5">
                            <h1 className="text-2xl font-bold tracking-tight text-white">{user.name}</h1>
                            <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 text-[10px] font-bold rounded-md border border-blue-500/20 uppercase tracking-wider">
                                {user.role}
                            </span>
                        </div>
                        <p className="text-zinc-500 text-sm">{user.email}</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="px-4 py-2 bg-zinc-900/50 border border-zinc-800 rounded-xl flex items-center gap-3">
                        <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-zinc-500 uppercase">Status</span>
                            <span className="text-xs font-semibold text-emerald-500">Active Account</span>
                        </div>
                        <div className="w-px h-8 bg-zinc-800" />
                        <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-zinc-500 uppercase">Member Since</span>
                            <span className="text-xs font-semibold text-zinc-300">{new Date(user.created_at).toLocaleDateString()}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard title="Total Traffic" value={analytics.total_messages} icon={<MessageSquare className="w-4 h-4" />} color="text-blue-500" />
                <StatCard title="Auto Replies" value={analytics.auto_replies} icon={<Zap className="w-4 h-4" />} color="text-yellow-500" />
                <StatCard title="Campaigns" value={analytics.campaigns} icon={<Megaphone className="w-4 h-4" />} color="text-orange-500" />
                <StatCard title="Reminders" value={analytics.reminders} icon={<Bell className="w-4 h-4" />} color="text-purple-500" />
            </div>

            {/* Bot List Section */}
            <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-zinc-900 pb-4">
                    <h2 className="text-lg font-bold text-zinc-100 flex items-center gap-2.5">
                        <div className="p-1.5 bg-zinc-900 rounded-lg">
                            <Bot className="w-5 h-5 text-zinc-400" />
                        </div>
                        Assigned Bots ({bots.length})
                    </h2>
                </div>

                <div className="grid grid-cols-1 gap-6">
                    {bots.map((bot: any) => (
                        <MemoizedBotCard
                            key={bot.id}
                            bot={bot}
                            permissions={permissions}
                            onUpdate={(data) => updatePermissionMutation.mutate({ botId: bot.id, data })}
                            isUpdating={updatePermissionMutation.isPending && updatePermissionMutation.variables?.botId === bot.id}
                        />
                    ))}

                    {bots.length === 0 && (
                        <div className="p-20 text-center bg-zinc-950/50 border border-dashed border-zinc-800 rounded-3xl">
                            <Bot className="w-12 h-12 text-zinc-800 mx-auto mb-4" />
                            <p className="text-zinc-500">No bots assigned to this user yet.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

function MemoizedBotCard({ bot, permissions, onUpdate, isUpdating }: any) {
    const initialPerms = useMemo(() => {
        return permissions.find((p: any) => p.bot_id === bot.id) || {
            can_view: 0, can_edit: 0, can_delete: 0, can_view_analytics: 0,
            can_create_rules: 0, can_use_reminders: 0, can_create_campaigns: 0, can_use_ai: 0
        }
    }, [permissions, bot.id]);

    return (
        <BotControlCard
            bot={bot}
            initialPerms={initialPerms}
            onUpdate={onUpdate}
            isUpdating={isUpdating}
        />
    )
}

function StatCard({ title, value, icon, color }: any) {
    return (
        <div className="bg-[#0e0e11] border border-zinc-800/50 p-6 rounded-2xl group">
            <div className="flex items-center gap-2 text-zinc-500 text-[10px] font-bold uppercase tracking-widest mb-3">
                <div className={`p-1.5 rounded-lg bg-zinc-900 ${color}`}>{icon}</div>
                {title}
            </div>
            <div className="text-3xl font-bold text-white tabular-nums tracking-tight">{value.toLocaleString()}</div>
        </div>
    )
}

function BotControlCard({ bot, initialPerms, onUpdate, isUpdating }: { bot: any, initialPerms: any, onUpdate: (data: any) => void, isUpdating: boolean }) {
    const [perms, setPerms] = useState(() => ({
        can_view: !!initialPerms.can_view,
        can_edit: !!initialPerms.can_edit,
        can_delete: !!initialPerms.can_delete,
        can_view_analytics: !!initialPerms.can_view_analytics,
        can_create_rules: !!initialPerms.can_create_rules,
        can_use_reminders: !!initialPerms.can_use_reminders,
        can_create_campaigns: !!initialPerms.can_create_campaigns,
        can_use_ai: !!initialPerms.can_use_ai,
    }))

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
            })
        }
    }, [initialPerms, isUpdating])

    const toggle = (key: keyof typeof perms) => {
        if (isUpdating) return
        const newState = { ...perms, [key]: !perms[key] }
        setPerms(newState)
        onUpdate(newState)
    }

    return (
        <div className={`bg-[#0e0e11] border border-zinc-800 rounded-2xl transition-all duration-300 ${isUpdating ? 'opacity-70 grayscale-[0.5]' : 'hover:border-zinc-700'} ${!perms.can_view ? 'border-dashed opacity-60' : ''}`}>
            <div className="p-6 flex flex-col lg:flex-row justify-between gap-8">
                {/* Bot Identity */}
                <div className="flex gap-5 min-w-[260px]">
                    <div className="w-16 h-16 bg-zinc-900 rounded-2xl flex items-center justify-center border border-zinc-800 shrink-0">
                        <Bot className="w-8 h-8 text-zinc-400" />
                    </div>
                    <div className="space-y-1">
                        <h3 className="text-xl font-bold text-white tracking-tight">{bot.name}</h3>
                        <div className="flex items-center gap-2">
                            <div className={`w-1.5 h-1.5 rounded-full ${bot.status === 'connected' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">{bot.status}</span>
                        </div>
                        <p className="text-[10px] font-mono text-zinc-700">ID: {bot.id.substring(0, 13)}...</p>
                    </div>
                </div>

                {/* Feature Grid */}
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-4">
                        <Shield className="w-3.5 h-3.5 text-blue-500" />
                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Bot Access & Features</span>
                        {isUpdating && <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500 ml-auto" />}
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                        {/* THE CRITICAL FIRST TOGGLE: Visibility */}
                        <FeatureToggle
                            icon={<Eye className="w-4 h-4" />}
                            label="Show Bot"
                            active={perms.can_view}
                            onToggle={() => toggle('can_view')}
                            highlight="border-emerald-500/40 text-emerald-400 bg-emerald-500/10"
                        />
                        <FeatureToggle icon={<Activity className="w-4 h-4" />} label="Analytics" active={perms.can_view_analytics} onToggle={() => toggle('can_view_analytics')} />
                        <FeatureToggle icon={<Zap className="w-4 h-4" />} label="Auto-Reply" active={perms.can_create_rules} onToggle={() => toggle('can_create_rules')} />
                        <FeatureToggle icon={<Bell className="w-4 h-4" />} label="Reminders" active={perms.can_use_reminders} onToggle={() => toggle('can_use_reminders')} />
                        <FeatureToggle icon={<Megaphone className="w-4 h-4" />} label="Campaigns" active={perms.can_create_campaigns} onToggle={() => toggle('can_create_campaigns')} />
                        <FeatureToggle icon={<CloudLightning className="w-4 h-4" />} label="AI Assistant" active={perms.can_use_ai} onToggle={() => toggle('can_use_ai')} />
                    </div>
                </div>
            </div>
        </div>
    )
}

function FeatureToggle({ icon, label, active, onToggle, highlight }: any) {
    const activeClass = highlight || 'bg-blue-600/10 border-blue-500/40 text-blue-400'

    return (
        <button
            onClick={onToggle}
            className={`group relative flex flex-col items-center justify-center gap-2.5 p-4 rounded-2xl border transition-all duration-300 ${active
                    ? `${activeClass} shadow-[0_0_20px_rgba(59,130,246,0.1)]`
                    : 'bg-zinc-900/40 border-zinc-800 text-zinc-600 hover:border-zinc-700'
                }`}
        >
            <div className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-300 ${active ? 'bg-current opacity-20' : 'bg-zinc-800 text-zinc-500'
                }`}>
                {/* Overlay for color but keeping opacity low for icon visibility */}
            </div>
            <div className={`absolute top-4 w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-300 ${active ? '' : 'text-zinc-500'
                }`}>
                {icon}
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
        </button>
    )
}
