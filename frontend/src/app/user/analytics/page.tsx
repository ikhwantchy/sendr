'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { usePermissions } from '@/hooks/usePermissions'
import Link from 'next/link'
import { 
    ChartLine, 
    Megaphone, 
    Bell, 
    CheckCircle,
    XCircle,
    PaperPlaneTilt,
    Users,
    Robot,
    ArrowUp,
    ArrowDown
} from '@phosphor-icons/react'

export default function UserAnalyticsPage() {
    const { permissions, filterBots, isAdmin } = usePermissions()
    const [selectedBotId, setSelectedBotId] = useState<string>('')

    // Get bots that user can view analytics for
    const analyticsBotIds = useMemo(() => {
        if (isAdmin) return null
        return permissions
            ?.filter((p: any) => p.can_view_analytics === 1 || p.can_view_analytics === true)
            .map((p: any) => p.bot_id) || []
    }, [permissions, isAdmin])

    // Fetch all bots
    const { data: allBots } = useQuery({
        queryKey: ['bots'],
        queryFn: async () => {
            const res = await api.bots.list()
            return res.data.data || []
        },
    })

    // Filter to only bots user has analytics access to
    const myBots = useMemo(() => {
        const filtered = filterBots(allBots || [])
        if (isAdmin) return filtered
        return filtered.filter((bot: any) => analyticsBotIds?.includes(bot.id))
    }, [allBots, filterBots, analyticsBotIds, isAdmin])

    // Auto-select first bot
    useMemo(() => {
        if (!selectedBotId && myBots.length > 0) {
            setSelectedBotId(myBots[0].id)
        }
    }, [myBots, selectedBotId])

    // Fetch campaigns for selected bot
    const { data: campaigns } = useQuery({
        queryKey: ['campaigns', selectedBotId],
        queryFn: async () => {
            if (!selectedBotId) return []
            const res = await api.campaigns.getByBot(selectedBotId)
            return res.data.data || []
        },
        enabled: !!selectedBotId,
    })

    // Fetch reminders for selected bot
    const { data: reminders } = useQuery({
        queryKey: ['reminders', selectedBotId],
        queryFn: async () => {
            if (!selectedBotId) return []
            const res = await api.reminders.getByBot(selectedBotId)
            return res.data.data || []
        },
        enabled: !!selectedBotId,
    })

    // Calculate stats
    const stats = useMemo(() => {
        const totalCampaigns = campaigns?.length || 0
        const completedCampaigns = campaigns?.filter((c: any) => c.status === 'completed').length || 0
        const totalSent = campaigns?.reduce((acc: number, c: any) => acc + (c.sent_count || 0), 0) || 0
        const totalFailed = campaigns?.reduce((acc: number, c: any) => acc + (c.failed_count || 0), 0) || 0
        const totalContacts = campaigns?.reduce((acc: number, c: any) => acc + (c.total_contacts || 0), 0) || 0
        const successRate = totalContacts > 0 ? Math.round((totalSent / totalContacts) * 100) : 0
        const activeReminders = reminders?.filter((r: any) => r.is_active).length || 0
        const totalReminders = reminders?.length || 0

        return {
            totalCampaigns,
            completedCampaigns,
            totalSent,
            totalFailed,
            successRate,
            activeReminders,
            totalReminders
        }
    }, [campaigns, reminders])

    if (!isAdmin && (!analyticsBotIds || analyticsBotIds.length === 0)) {
        return (
            <div className="max-w-2xl mx-auto text-center py-20">
                <ChartLine size={64} className="mx-auto text-zinc-400 mb-4" />
                <h1 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">No Analytics Access</h1>
                <p className="text-zinc-500 mb-6">You don't have permission to view analytics for any bots.</p>
                <Link
                    href="/user"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    Back to Dashboard
                </Link>
            </div>
        )
    }

    const selectedBot = myBots.find((b: any) => b.id === selectedBotId)

    return (
        <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Analytics</h1>
                    <p className="text-zinc-500 mt-1">View your bot performance metrics</p>
                </div>
                <select
                    value={selectedBotId}
                    onChange={(e) => setSelectedBotId(e.target.value)}
                    className="px-4 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                    {myBots.map((bot: any) => (
                        <option key={bot.id} value={bot.id}>{bot.name}</option>
                    ))}
                </select>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <StatCard
                    icon={Megaphone}
                    label="Total Campaigns"
                    value={stats.totalCampaigns}
                    color="purple"
                />
                <StatCard
                    icon={PaperPlaneTilt}
                    label="Messages Sent"
                    value={stats.totalSent}
                    color="blue"
                />
                <StatCard
                    icon={CheckCircle}
                    label="Success Rate"
                    value={`${stats.successRate}%`}
                    color="green"
                />
                <StatCard
                    icon={Bell}
                    label="Active Reminders"
                    value={`${stats.activeReminders}/${stats.totalReminders}`}
                    color="orange"
                />
            </div>

            {/* Detailed Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Campaign Stats */}
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6">
                    <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">Campaign Performance</h2>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-green-50 dark:bg-green-500/10 flex items-center justify-center">
                                    <CheckCircle size={16} className="text-green-500" weight="fill" />
                                </div>
                                <span className="text-sm text-zinc-600 dark:text-zinc-400">Completed Campaigns</span>
                            </div>
                            <span className="font-semibold text-zinc-900 dark:text-white">{stats.completedCampaigns}</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center">
                                    <PaperPlaneTilt size={16} className="text-blue-500" weight="fill" />
                                </div>
                                <span className="text-sm text-zinc-600 dark:text-zinc-400">Messages Sent</span>
                            </div>
                            <span className="font-semibold text-zinc-900 dark:text-white">{stats.totalSent}</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-500/10 flex items-center justify-center">
                                    <XCircle size={16} className="text-red-500" weight="fill" />
                                </div>
                                <span className="text-sm text-zinc-600 dark:text-zinc-400">Failed Messages</span>
                            </div>
                            <span className="font-semibold text-red-500">{stats.totalFailed}</span>
                        </div>
                    </div>
                </div>

                {/* Recent Campaigns */}
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6">
                    <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">Recent Campaigns</h2>
                    {!campaigns || campaigns.length === 0 ? (
                        <div className="text-center py-8">
                            <Megaphone size={32} className="mx-auto text-zinc-400 mb-2" />
                            <p className="text-zinc-500 text-sm">No campaigns yet</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {campaigns.slice(0, 5).map((campaign: any) => (
                                <div key={campaign.id} className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
                                    <div>
                                        <p className="font-medium text-zinc-900 dark:text-white text-sm">{campaign.name}</p>
                                        <p className="text-xs text-zinc-500">{campaign.sent_count}/{campaign.total_contacts} sent</p>
                                    </div>
                                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                                        campaign.status === 'completed' ? 'bg-green-100 dark:bg-green-500/10 text-green-600 dark:text-green-400' :
                                        campaign.status === 'running' ? 'bg-blue-100 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400' :
                                        'bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400'
                                    }`}>
                                        {campaign.status}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

function StatCard({ 
    icon: Icon, 
    label, 
    value, 
    color 
}: { 
    icon: any; 
    label: string; 
    value: string | number; 
    color: 'purple' | 'blue' | 'green' | 'orange' 
}) {
    const colors = {
        purple: 'bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400',
        blue: 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400',
        green: 'bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400',
        orange: 'bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400',
    }

    return (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5">
            <div className={`w-10 h-10 rounded-lg ${colors[color]} flex items-center justify-center mb-3`}>
                <Icon size={20} weight="fill" />
            </div>
            <p className="text-2xl font-bold text-zinc-900 dark:text-white">{value}</p>
            <p className="text-xs text-zinc-500 mt-1">{label}</p>
        </div>
    )
}
