'use client'

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { usePermissions } from '@/hooks/usePermissions'
import Link from 'next/link'
import { Robot, Megaphone, Bell, ChartLine, ArrowRight } from '@phosphor-icons/react'

export default function UserDashboard() {
    const { user, permissions, filterBots } = usePermissions()

    // Fetch bots
    const { data: allBots, isLoading: botsLoading } = useQuery({
        queryKey: ['bots'],
        queryFn: async () => {
            const res = await api.bots.list()
            return res.data.data || []
        },
    })

    // Filter bots based on permissions
    const bots = filterBots(allBots || [])
    const activeBots = bots.filter((b: any) => b.status === 'connected')

    // Count permissions
    const campaignBots = permissions?.filter((p: any) => p.can_create_campaigns === 1 || p.can_create_campaigns === true).length || 0
    const reminderBots = permissions?.filter((p: any) => p.can_use_reminders === 1 || p.can_use_reminders === true).length || 0

    return (
        <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
                    Welcome back, {user?.name || 'User'}! 👋
                </h1>
                <p className="text-zinc-500 mt-1">
                    Here's an overview of your assigned bots and activities.
                </p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <StatCard
                    title="My Bots"
                    value={bots.length}
                    icon={<Robot size={24} />}
                    color="blue"
                    loading={botsLoading}
                />
                <StatCard
                    title="Active Bots"
                    value={activeBots.length}
                    icon={<ChartLine size={24} />}
                    color="green"
                    loading={botsLoading}
                />
                <StatCard
                    title="Campaign Access"
                    value={campaignBots}
                    icon={<Megaphone size={24} />}
                    color="purple"
                    subtitle="bots"
                />
                <StatCard
                    title="Reminder Access"
                    value={reminderBots}
                    icon={<Bell size={24} />}
                    color="orange"
                    subtitle="bots"
                />
            </div>

            {/* Quick Actions */}
            <div className="mb-8">
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">Quick Actions</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <QuickActionCard
                        title="View My Bots"
                        description="See all bots assigned to you"
                        href="/user/bots"
                        icon={<Robot size={20} />}
                    />
                    {campaignBots > 0 && (
                        <QuickActionCard
                            title="Create Campaign"
                            description="Send messages to your contacts"
                            href="/user/campaigns"
                            icon={<Megaphone size={20} />}
                        />
                    )}
                    {reminderBots > 0 && (
                        <QuickActionCard
                            title="Set Reminders"
                            description="Schedule automated reminders"
                            href="/user/reminders"
                            icon={<Bell size={20} />}
                        />
                    )}
                </div>
            </div>

            {/* My Bots List */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">My Bots</h2>
                    <Link
                        href="/user/bots"
                        className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1"
                    >
                        View all <ArrowRight size={14} />
                    </Link>
                </div>

                {botsLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 animate-pulse">
                                <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-1/2 mb-2" />
                                <div className="h-3 bg-zinc-200 dark:bg-zinc-800 rounded w-3/4" />
                            </div>
                        ))}
                    </div>
                ) : bots.length === 0 ? (
                    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-8 text-center">
                        <Robot size={48} className="mx-auto text-zinc-400 mb-4" />
                        <h3 className="text-lg font-medium text-zinc-900 dark:text-white mb-2">No Bots Assigned</h3>
                        <p className="text-zinc-500">Contact your administrator to get access to bots.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {bots.slice(0, 6).map((bot: any) => (
                            <BotCard key={bot.id} bot={bot} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}

function StatCard({ title, value, icon, color, loading, subtitle }: {
    title: string
    value: number
    icon: React.ReactNode
    color: 'blue' | 'green' | 'purple' | 'orange'
    loading?: boolean
    subtitle?: string
}) {
    const colors = {
        blue: 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400',
        green: 'bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400',
        purple: 'bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400',
        orange: 'bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400',
    }

    return (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5">
            <div className={`w-10 h-10 rounded-lg ${colors[color]} flex items-center justify-center mb-3`}>
                {icon}
            </div>
            {loading ? (
                <div className="h-8 w-16 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
            ) : (
                <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-zinc-900 dark:text-white">{value}</span>
                    {subtitle && <span className="text-sm text-zinc-500">{subtitle}</span>}
                </div>
            )}
            <p className="text-sm text-zinc-500 mt-1">{title}</p>
        </div>
    )
}

function QuickActionCard({ title, description, href, icon }: {
    title: string
    description: string
    href: string
    icon: React.ReactNode
}) {
    return (
        <Link
            href={href}
            className="group bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 hover:border-blue-300 dark:hover:border-blue-600 transition-colors"
        >
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-400 group-hover:bg-blue-50 dark:group-hover:bg-blue-500/10 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {icon}
                </div>
                <div className="flex-1">
                    <h3 className="font-medium text-zinc-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {title}
                    </h3>
                    <p className="text-sm text-zinc-500">{description}</p>
                </div>
                <ArrowRight size={16} className="text-zinc-400 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
            </div>
        </Link>
    )
}

function BotCard({ bot }: { bot: any }) {
    const statusColors: Record<string, string> = {
        connected: 'bg-green-500',
        disconnected: 'bg-zinc-400',
        connecting: 'bg-yellow-500',
        error: 'bg-red-500',
    }

    return (
        <Link
            href={`/user/bots/${bot.id}`}
            className="group bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 hover:border-blue-300 dark:hover:border-blue-600 transition-colors"
        >
            <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold">
                    {bot.name?.charAt(0).toUpperCase() || 'B'}
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-zinc-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {bot.name}
                    </h3>
                    <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${statusColors[bot.status] || 'bg-zinc-400'}`} />
                        <span className="text-xs text-zinc-500 capitalize">{bot.status || 'Unknown'}</span>
                    </div>
                </div>
            </div>
            {bot.phone_number && (
                <p className="text-sm text-zinc-500 truncate">{bot.phone_number}</p>
            )}
        </Link>
    )
}
