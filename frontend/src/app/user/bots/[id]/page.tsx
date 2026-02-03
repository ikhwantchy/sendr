'use client'

import { use, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { usePermissions } from '@/hooks/usePermissions'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
    ArrowLeft, 
    Robot, 
    Megaphone, 
    Bell, 
    ChartLine,
    Phone,
    Calendar,
    Clock
} from '@phosphor-icons/react'

export default function UserBotDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id: botId } = use(params)
    const router = useRouter()
    const { user, permissions, hasAccess, can } = usePermissions()

    // Check if user has access to this bot
    const hasViewAccess = hasAccess(botId)

    // Get specific permissions for this bot
    const botPermissions = useMemo(() => {
        const p = permissions?.find((p: any) => p.bot_id === botId)
        return {
            canCreateCampaigns: p?.can_create_campaigns === 1 || p?.can_create_campaigns === true,
            canUseReminders: p?.can_use_reminders === 1 || p?.can_use_reminders === true,
            canViewAnalytics: p?.can_view_analytics === 1 || p?.can_view_analytics === true,
            canEdit: p?.can_edit === 1 || p?.can_edit === true,
        }
    }, [permissions, botId])

    // Fetch bot details
    const { data: bot, isLoading } = useQuery({
        queryKey: ['bot', botId],
        queryFn: async () => {
            const res = await api.bots.get(botId)
            return res.data.data
        },
        enabled: hasViewAccess,
    })

    // Fetch campaigns for this bot
    const { data: campaigns } = useQuery({
        queryKey: ['campaigns', botId],
        queryFn: async () => {
            const res = await api.campaigns.getByBot(botId)
            return res.data.data || []
        },
        enabled: hasViewAccess && botPermissions.canCreateCampaigns,
    })

    // Fetch reminders for this bot
    const { data: reminders } = useQuery({
        queryKey: ['reminders', botId],
        queryFn: async () => {
            const res = await api.reminders.getByBot(botId)
            return res.data.data || []
        },
        enabled: hasViewAccess && botPermissions.canUseReminders,
    })

    if (!hasViewAccess) {
        return (
            <div className="max-w-2xl mx-auto text-center py-20">
                <Robot size={64} className="mx-auto text-zinc-400 mb-4" />
                <h1 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">Access Denied</h1>
                <p className="text-zinc-500 mb-6">You don't have permission to view this bot.</p>
                <Link
                    href="/user/bots"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    <ArrowLeft size={16} />
                    Back to My Bots
                </Link>
            </div>
        )
    }

    if (isLoading) {
        return (
            <div className="max-w-4xl mx-auto">
                <div className="animate-pulse">
                    <div className="h-8 w-48 bg-zinc-200 dark:bg-zinc-800 rounded mb-6" />
                    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-16 h-16 rounded-full bg-zinc-200 dark:bg-zinc-800" />
                            <div className="flex-1">
                                <div className="h-6 w-40 bg-zinc-200 dark:bg-zinc-800 rounded mb-2" />
                                <div className="h-4 w-32 bg-zinc-200 dark:bg-zinc-800 rounded" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    const statusColors: Record<string, string> = {
        connected: 'bg-green-500 text-green-500',
        disconnected: 'bg-zinc-400 text-zinc-500',
        connecting: 'bg-yellow-500 text-yellow-500',
        error: 'bg-red-500 text-red-500',
    }

    return (
        <div className="max-w-4xl mx-auto">
            {/* Back Button */}
            <Link
                href="/user/bots"
                className="inline-flex items-center gap-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-white mb-6 transition-colors"
            >
                <ArrowLeft size={16} />
                <span>Back to My Bots</span>
            </Link>

            {/* Bot Header */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 mb-6">
                <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-2xl font-bold">
                        {bot?.name?.charAt(0).toUpperCase() || 'B'}
                    </div>
                    <div className="flex-1">
                        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">{bot?.name}</h1>
                        <div className="flex items-center gap-3 mt-1">
                            <div className="flex items-center gap-2">
                                <span className={`w-2.5 h-2.5 rounded-full ${statusColors[bot?.status]?.split(' ')[0] || 'bg-zinc-400'}`} />
                                <span className={`text-sm capitalize ${statusColors[bot?.status]?.split(' ')[1] || 'text-zinc-500'}`}>
                                    {bot?.status || 'Unknown'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bot Info */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {bot?.phone_number && (
                        <div className="flex items-center gap-3 p-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
                            <Phone size={18} className="text-zinc-500" />
                            <div>
                                <p className="text-xs text-zinc-500">Phone Number</p>
                                <p className="text-sm font-medium text-zinc-900 dark:text-white">{bot.phone_number}</p>
                            </div>
                        </div>
                    )}
                    <div className="flex items-center gap-3 p-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
                        <Calendar size={18} className="text-zinc-500" />
                        <div>
                            <p className="text-xs text-zinc-500">Created</p>
                            <p className="text-sm font-medium text-zinc-900 dark:text-white">
                                {bot?.created_at ? new Date(bot.created_at).toLocaleDateString() : 'N/A'}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
                        <Clock size={18} className="text-zinc-500" />
                        <div>
                            <p className="text-xs text-zinc-500">Last Activity</p>
                            <p className="text-sm font-medium text-zinc-900 dark:text-white">
                                {bot?.last_activity ? new Date(bot.last_activity).toLocaleString() : 'N/A'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                {botPermissions.canCreateCampaigns && (
                    <Link
                        href={`/user/campaigns?botId=${botId}`}
                        className="group bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 hover:border-purple-300 dark:hover:border-purple-600 transition-all"
                    >
                        <div className="w-10 h-10 rounded-lg bg-purple-50 dark:bg-purple-500/10 flex items-center justify-center mb-3">
                            <Megaphone size={20} className="text-purple-600 dark:text-purple-400" />
                        </div>
                        <h3 className="font-semibold text-zinc-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                            Campaigns
                        </h3>
                        <p className="text-sm text-zinc-500 mt-1">
                            {campaigns?.length || 0} campaigns
                        </p>
                    </Link>
                )}

                {botPermissions.canUseReminders && (
                    <Link
                        href={`/user/reminders?botId=${botId}`}
                        className="group bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 hover:border-orange-300 dark:hover:border-orange-600 transition-all"
                    >
                        <div className="w-10 h-10 rounded-lg bg-orange-50 dark:bg-orange-500/10 flex items-center justify-center mb-3">
                            <Bell size={20} className="text-orange-600 dark:text-orange-400" />
                        </div>
                        <h3 className="font-semibold text-zinc-900 dark:text-white group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                            Reminders
                        </h3>
                        <p className="text-sm text-zinc-500 mt-1">
                            {reminders?.length || 0} active reminders
                        </p>
                    </Link>
                )}

                {botPermissions.canViewAnalytics && (
                    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5">
                        <div className="w-10 h-10 rounded-lg bg-green-50 dark:bg-green-500/10 flex items-center justify-center mb-3">
                            <ChartLine size={20} className="text-green-600 dark:text-green-400" />
                        </div>
                        <h3 className="font-semibold text-zinc-900 dark:text-white">Analytics</h3>
                        <p className="text-sm text-zinc-500 mt-1">View bot performance</p>
                    </div>
                )}
            </div>

            {/* Your Permissions */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6">
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">Your Permissions</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <PermissionBadge label="View Bot" enabled={true} />
                    <PermissionBadge label="Edit Bot" enabled={botPermissions.canEdit} />
                    <PermissionBadge label="Campaigns" enabled={botPermissions.canCreateCampaigns} />
                    <PermissionBadge label="Reminders" enabled={botPermissions.canUseReminders} />
                    <PermissionBadge label="Analytics" enabled={botPermissions.canViewAnalytics} />
                </div>
            </div>
        </div>
    )
}

function PermissionBadge({ label, enabled }: { label: string; enabled: boolean }) {
    return (
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
            enabled 
                ? 'bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400' 
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'
        }`}>
            <span className={`w-2 h-2 rounded-full ${enabled ? 'bg-green-500' : 'bg-zinc-400'}`} />
            <span className="text-sm font-medium">{label}</span>
        </div>
    )
}
