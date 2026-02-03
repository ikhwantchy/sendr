'use client'

import { use, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api, API_URL } from '@/lib/api'
import { usePermissions } from '@/hooks/usePermissions'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import Link from 'next/link'
import { 
    ArrowLeft, 
    Robot, 
    Megaphone, 
    Bell, 
    ChartLine,
    Phone,
    Calendar,
    Clock,
    Plus,
    Play,
    Pause,
    Trash,
    Eye,
    CheckCircle,
    XCircle,
    Lightning
} from '@phosphor-icons/react'

type TabType = 'overview' | 'campaigns' | 'reminders'

export default function UserBotDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id: botId } = use(params)
    const router = useRouter()
    const { user, permissions, hasAccess, can, isAdmin } = usePermissions()
    const [activeTab, setActiveTab] = useState<TabType>('overview')

    // Check if user has access to this bot
    const hasViewAccess = hasAccess(botId)

    // Get specific permissions for this bot
    const botPermissions = useMemo(() => {
        if (isAdmin) return {
            canCreateCampaigns: true,
            canUseReminders: true,
            canViewAnalytics: true,
            canEdit: true,
        }
        const p = permissions?.find((p: any) => p.bot_id === botId)
        return {
            canCreateCampaigns: p?.can_create_campaigns === 1 || p?.can_create_campaigns === true,
            canUseReminders: p?.can_use_reminders === 1 || p?.can_use_reminders === true,
            canViewAnalytics: p?.can_view_analytics === 1 || p?.can_view_analytics === true,
            canEdit: p?.can_edit === 1 || p?.can_edit === true,
        }
    }, [permissions, botId, isAdmin])

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
    const { data: campaigns, refetch: refetchCampaigns } = useQuery({
        queryKey: ['campaigns', botId],
        queryFn: async () => {
            const res = await api.campaigns.getByBot(botId)
            return res.data.data || []
        },
        enabled: hasViewAccess && botPermissions.canCreateCampaigns,
    })

    // Fetch reminders for this bot
    const { data: reminders, refetch: refetchReminders } = useQuery({
        queryKey: ['reminders', botId],
        queryFn: async () => {
            const res = await api.reminders.getByBot(botId)
            return res.data.data || []
        },
        enabled: hasViewAccess && botPermissions.canUseReminders,
    })

    // Campaign actions
    const startCampaign = async (id: string) => {
        try {
            const token = localStorage.getItem('token')
            await fetch(`${API_URL}/api/campaigns/${id}/start`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            })
            toast.success('Campaign started')
            refetchCampaigns()
        } catch (error) {
            toast.error('Failed to start campaign')
        }
    }

    const deleteCampaign = async (id: string, name: string) => {
        if (!confirm(`Delete campaign "${name}"?`)) return
        try {
            await api.campaigns.delete(id)
            toast.success('Campaign deleted')
            refetchCampaigns()
        } catch (error) {
            toast.error('Failed to delete campaign')
        }
    }

    // Reminder actions
    const toggleReminder = async (reminder: any) => {
        try {
            await api.reminders.update(reminder.id, { is_active: !reminder.is_active })
            toast.success(reminder.is_active ? 'Reminder paused' : 'Reminder activated')
            refetchReminders()
        } catch (error) {
            toast.error('Failed to update reminder')
        }
    }

    const deleteReminder = async (id: string) => {
        if (!confirm('Delete this reminder?')) return
        try {
            await api.reminders.delete(id)
            toast.success('Reminder deleted')
            refetchReminders()
        } catch (error) {
            toast.error('Failed to delete reminder')
        }
    }

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

    const tabs = [
        { id: 'overview' as TabType, label: 'Overview' },
        ...(botPermissions.canCreateCampaigns ? [{ id: 'campaigns' as TabType, label: `Campaigns (${campaigns?.length || 0})` }] : []),
        ...(botPermissions.canUseReminders ? [{ id: 'reminders' as TabType, label: `Reminders (${reminders?.length || 0})` }] : []),
    ]

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

            {/* Tabs */}
            <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800/50 p-1 rounded-lg mb-6">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                            activeTab === tab.id
                                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm'
                                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            {activeTab === 'overview' && (
                <div className="space-y-6">
                    {/* Quick Actions */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {botPermissions.canCreateCampaigns && (
                            <Link
                                href={`/user/campaigns/create?botId=${botId}`}
                                className="group bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 hover:border-purple-300 dark:hover:border-purple-600 transition-all"
                            >
                                <div className="w-10 h-10 rounded-lg bg-purple-50 dark:bg-purple-500/10 flex items-center justify-center mb-3">
                                    <Megaphone size={20} className="text-purple-600 dark:text-purple-400" />
                                </div>
                                <h3 className="font-semibold text-zinc-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                                    New Campaign
                                </h3>
                                <p className="text-sm text-zinc-500 mt-1">
                                    Create a broadcast campaign
                                </p>
                            </Link>
                        )}

                        {botPermissions.canUseReminders && (
                            <Link
                                href={`/user/reminders/create?botId=${botId}`}
                                className="group bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 hover:border-orange-300 dark:hover:border-orange-600 transition-all"
                            >
                                <div className="w-10 h-10 rounded-lg bg-orange-50 dark:bg-orange-500/10 flex items-center justify-center mb-3">
                                    <Bell size={20} className="text-orange-600 dark:text-orange-400" />
                                </div>
                                <h3 className="font-semibold text-zinc-900 dark:text-white group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                                    New Reminder
                                </h3>
                                <p className="text-sm text-zinc-500 mt-1">
                                    Schedule automated messages
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
            )}

            {activeTab === 'campaigns' && botPermissions.canCreateCampaigns && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Campaigns</h2>
                        <Link
                            href={`/user/campaigns/create?botId=${botId}`}
                            className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
                        >
                            <Plus size={16} />
                            New Campaign
                        </Link>
                    </div>

                    {!campaigns || campaigns.length === 0 ? (
                        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-8 text-center">
                            <Megaphone size={40} className="mx-auto text-zinc-400 mb-3" />
                            <p className="text-zinc-500">No campaigns yet</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {campaigns.map((campaign: any) => (
                                <div
                                    key={campaign.id}
                                    className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                                campaign.status === 'completed' ? 'bg-green-50 dark:bg-green-500/10' :
                                                campaign.status === 'running' ? 'bg-blue-50 dark:bg-blue-500/10' :
                                                'bg-zinc-100 dark:bg-zinc-800'
                                            }`}>
                                                {campaign.status === 'completed' ? (
                                                    <CheckCircle size={16} className="text-green-500" weight="fill" />
                                                ) : campaign.status === 'running' ? (
                                                    <Lightning size={16} className="text-blue-500" weight="fill" />
                                                ) : (
                                                    <Clock size={16} className="text-zinc-400" />
                                                )}
                                            </div>
                                            <div>
                                                <h3 className="font-medium text-zinc-900 dark:text-white">{campaign.name}</h3>
                                                <p className="text-xs text-zinc-500">
                                                    {campaign.sent_count}/{campaign.total_contacts} sent • {campaign.status}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            {(campaign.status === 'draft' || campaign.status === 'scheduled') && (
                                                <button
                                                    onClick={() => startCampaign(campaign.id)}
                                                    className="p-1.5 hover:bg-green-50 dark:hover:bg-green-500/10 rounded-lg text-zinc-400 hover:text-green-500"
                                                >
                                                    <Play size={16} weight="fill" />
                                                </button>
                                            )}
                                            <Link
                                                href={`/user/campaigns?botId=${botId}`}
                                                className="p-1.5 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg text-zinc-400 hover:text-blue-500"
                                            >
                                                <Eye size={16} />
                                            </Link>
                                            <button
                                                onClick={() => deleteCampaign(campaign.id, campaign.name)}
                                                className="p-1.5 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg text-zinc-400 hover:text-red-500"
                                            >
                                                <Trash size={16} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'reminders' && botPermissions.canUseReminders && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Reminders</h2>
                        <Link
                            href={`/user/reminders/create?botId=${botId}`}
                            className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
                        >
                            <Plus size={16} />
                            New Reminder
                        </Link>
                    </div>

                    {!reminders || reminders.length === 0 ? (
                        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-8 text-center">
                            <Bell size={40} className="mx-auto text-zinc-400 mb-3" />
                            <p className="text-zinc-500">No reminders yet</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {reminders.map((reminder: any) => (
                                <div
                                    key={reminder.id}
                                    className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                                reminder.is_active 
                                                    ? 'bg-emerald-50 dark:bg-emerald-500/10' 
                                                    : 'bg-zinc-100 dark:bg-zinc-800'
                                            }`}>
                                                <Bell size={16} className={reminder.is_active ? 'text-emerald-500' : 'text-zinc-400'} weight="fill" />
                                            </div>
                                            <div>
                                                <h3 className="font-medium text-zinc-900 dark:text-white">{reminder.name}</h3>
                                                <p className="text-xs text-zinc-500 capitalize">
                                                    {reminder.schedule_type} at {reminder.schedule_time}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => toggleReminder(reminder)}
                                                className={`p-1.5 rounded-lg ${
                                                    reminder.is_active 
                                                        ? 'hover:bg-yellow-50 dark:hover:bg-yellow-500/10 text-zinc-400 hover:text-yellow-500'
                                                        : 'hover:bg-green-50 dark:hover:bg-green-500/10 text-zinc-400 hover:text-green-500'
                                                }`}
                                            >
                                                {reminder.is_active ? <Pause size={16} weight="fill" /> : <Play size={16} weight="fill" />}
                                            </button>
                                            <Link
                                                href={`/user/reminders/${reminder.id}`}
                                                className="p-1.5 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg text-zinc-400 hover:text-blue-500"
                                            >
                                                <Eye size={16} />
                                            </Link>
                                            <button
                                                onClick={() => deleteReminder(reminder.id)}
                                                className="p-1.5 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg text-zinc-400 hover:text-red-500"
                                            >
                                                <Trash size={16} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
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
