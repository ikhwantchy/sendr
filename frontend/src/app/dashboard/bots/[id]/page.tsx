'use client'

import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import CreateRuleModal from '@/components/modals/CreateRuleModal'
import EditRuleModal from '@/components/modals/EditRuleModal'
import CreateCampaignModal from '@/components/modals/CreateCampaignModal'
import CampaignsTable from '@/components/tables/CampaignsTable'
import ActivityChart from '@/components/ActivityChart'
import RecentActivityList from '@/components/RecentActivityList'
import {
    ChevronLeft,
    MessageSquare,
    Zap,
    Megaphone,
    Circle,
    Phone,
    Pause,
    Play,
    ArrowRight
} from 'lucide-react'

export default function BotDetailPage() {
    const params = useParams()
    const router = useRouter()
    const botId = params.id as string
    const [activeTab, setActiveTab] = useState('overview')

    // Modal states
    const [showCreateRuleModal, setShowCreateRuleModal] = useState(false)
    const [showEditRuleModal, setShowEditRuleModal] = useState(false)
    const [selectedRule, setSelectedRule] = useState<any>(null)
    const [showCreateCampaignModal, setShowCreateCampaignModal] = useState(false)

    // Fetch bot details
    const { data: bot, isLoading } = useQuery({
        queryKey: ['bot', botId],
        queryFn: async () => {
            const response = await api.bots.get(botId)
            return response.data.data || response.data
        },
        refetchInterval: 3000,
    })

    // Fetch statistics
    const { data: rulesData } = useQuery({
        queryKey: ['rules', botId],
        queryFn: async () => {
            const response = await api.rules.getByBot(botId)
            return response.data.data || response.data || []
        },
        enabled: !!botId,
    })

    const { data: campaignsData } = useQuery({
        queryKey: ['campaigns', botId],
        queryFn: async () => {
            const response = await api.campaigns.getByBot(botId)
            return response.data.data || response.data || []
        },
        enabled: !!botId,
    })

    const { data: remindersData } = useQuery({
        queryKey: ['reminders', botId],
        queryFn: async () => {
            const response = await api.reminders.getByBot(botId)
            return response.data.data || response.data || []
        },
        enabled: !!botId,
    })

    // Real-time Activity Logs (Auto-Refresh)
    const { data: activityLogs = [] } = useQuery({
        queryKey: ['activity', botId],
        queryFn: async () => {
            // Fetch more logs (500) to support dense 1-hour view
            const response = await api.analytics.getActivityLogs(500, botId)
            return response.data.data || []
        },
        enabled: !!botId,
        refetchInterval: 3000,
    })

    const [chartTimeRange, setChartTimeRange] = useState('24h') // Default: 24 hours, Zoom levels: 30m → 24h → 7d → 30d


    // Compute Chart Data
    const chartData = useMemo(() => {
        if (!activityLogs.length) return []

        const buckets = new Map<string, any>()
        const now = new Date()

        if (chartTimeRange === '30m') {
            // 30 Minutes View: Minute-by-minute for last 30 mins
            for (let i = 0; i <= 30; i++) {
                const d = new Date(now.getTime() - (30 - i) * 60 * 1000)
                const timeStr = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
                buckets.set(timeStr, { time: timeStr, received: 0, auto_reply: 0, campaign: 0, reminder: 0 })
            }
        } else if (chartTimeRange === '24h') {
            // 24h View: Hourly buckets
            for (let i = 0; i < 24; i++) {
                const d = new Date(now.getTime() - i * 60 * 60 * 1000)
                const hour = d.getHours().toString().padStart(2, '0')
                const timeStr = `${hour}:00`
                buckets.set(timeStr, { time: timeStr, received: 0, auto_reply: 0, campaign: 0, reminder: 0 })
            }
        } else if (chartTimeRange === '7d') {
            // 7 Days View: Daily buckets
            for (let i = 0; i < 7; i++) {
                const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
                const timeStr = `${d.getMonth() + 1}/${d.getDate()}`
                buckets.set(timeStr, { time: timeStr, received: 0, auto_reply: 0, campaign: 0, reminder: 0 })
            }
        } else if (chartTimeRange === '30d') {
            // 30 Days View: Daily buckets
            for (let i = 0; i < 30; i++) {
                const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
                const timeStr = `${d.getMonth() + 1}/${d.getDate()}`
                buckets.set(timeStr, { time: timeStr, received: 0, auto_reply: 0, campaign: 0, reminder: 0 })
            }
        }

        activityLogs.forEach((log: any) => {
            // Fix: Append Z to ensure UTC parsing if missing
            const timeString = log.timestamp.endsWith('Z') ? log.timestamp : `${log.timestamp}Z`
            const date = new Date(timeString)
            let timeKey = ''

            if (chartTimeRange === '30m') {
                if (now.getTime() - date.getTime() < 30 * 60 * 1000) {
                    timeKey = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
                }
            } else if (chartTimeRange === '24h') {
                if (now.getTime() - date.getTime() < 24 * 60 * 60 * 1000) {
                    timeKey = `${date.getHours().toString().padStart(2, '0')}:00`
                }
            } else if (chartTimeRange === '7d') {
                if (now.getTime() - date.getTime() < 7 * 24 * 60 * 60 * 1000) {
                    timeKey = `${date.getMonth() + 1}/${date.getDate()}`
                }
            } else if (chartTimeRange === '30d') {
                if (now.getTime() - date.getTime() < 30 * 24 * 60 * 60 * 1000) {
                    timeKey = `${date.getMonth() + 1}/${date.getDate()}`
                }
            }

            if (timeKey && buckets.has(timeKey)) {
                const bucket = buckets.get(timeKey)

                // Categorize
                if (log.type === 'message') {
                    if (log.direction === 'inbound' || log.message?.startsWith('Received')) {
                        bucket.received += 1
                    } else if (log.direction === 'outbound' || log.message?.startsWith('Sent')) {
                        bucket.auto_reply += 1
                    }
                } else if (log.type === 'campaign') {
                    bucket.campaign += 1
                } else if (log.type === 'reminder') {
                    bucket.reminder += 1
                } else if (log.type === 'rule') {
                    bucket.auto_reply += 1
                }
            }
        })

        // Output array - reverse for chronological order (oldest to newest)
        const results = Array.from(buckets.values())
        return chartTimeRange === '30m' ? results : results.reverse()
    }, [activityLogs, chartTimeRange])

    // Compute "Live Load" (Messages in last minute)
    const [rateLimit, setRateLimit] = useState('Unlimited')

    const currentLoad = useMemo(() => {
        if (!activityLogs.length) return 0
        const now = new Date().getTime()
        const oneMinuteAgo = now - 60 * 1000

        // Count messages in last minute
        const recentCount = activityLogs.filter((log: any) =>
            (log.type === 'message' || log.type === 'campaign') &&
            new Date(log.timestamp).getTime() > oneMinuteAgo
        ).length

        // Calculate usage based on "limit" (Simulated capacity)
        // If "Unlimited", base it on a theoretical max of 60 msg/min for visualization
        // If limit is set (e.g. 50 msg/s = 3000 msg/min), use that.

        let maxCapacity = 60 // Default 'visual' capacity per minute
        if (rateLimit === '50 msg/s') maxCapacity = 3000
        if (rateLimit === '20 msg/s') maxCapacity = 1200

        return Math.min(100, Math.round((recentCount / maxCapacity) * 100))
    }, [activityLogs, rateLimit])

    // Pause/Resume mutations
    const queryClient = useQueryClient()

    const pauseMutation = useMutation({
        mutationFn: async () => {
            return await api.bots.pause(botId)
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['bot', botId] })
            toast.success('Bot paused successfully')
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.error || 'Failed to pause bot')
        },
    })

    const resumeMutation = useMutation({
        mutationFn: async () => {
            return await api.bots.resume(botId)
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['bot', botId] })
            toast.success('Bot is resuming...')
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.error || 'Failed to resume bot')
        },
    })

    // Calculate statistics
    const stats = {
        totalMessages: bot?.total_messages || 0,
        activeRules: rulesData?.filter((r: any) => r.is_active).length || 0,
        totalRules: rulesData?.length || 0,
        activeCampaigns: campaignsData?.filter((c: any) => c.status === 'sending' || c.status === 'scheduled').length || 0,
        totalCampaigns: campaignsData?.length || 0,
        activeReminders: remindersData?.filter((r: any) => r.is_active === 1).length || 0,
        totalReminders: remindersData?.length || 0,
    }

    const tabs = [
        { id: 'overview', name: 'Overview' },
        { id: 'rules', name: 'Rules' },
        { id: 'campaigns', name: 'Campaigns' },
        { id: 'reminders', name: 'Reminders' },
        { id: 'settings', name: 'Settings' },
    ]

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="relative w-12 h-12">
                    <div className="absolute inset-0 rounded-full border-2 border-zinc-800"></div>
                    <div className="absolute inset-0 rounded-full border-2 border-blue-500 border-t-transparent animate-spin"></div>
                </div>
            </div>
        )
    }

    if (!bot) {
        return (
            <div className="p-6 md:p-8">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-zinc-100 mb-4">Bot not found</h2>
                    <Link href="/dashboard/bots" className="text-blue-500 hover:text-blue-400">
                        ← Back to Bots
                    </Link>
                </div>
            </div>
        )
    }

    const isConnected = bot.status === 'connected'

    return (
        <div className="p-6 md:p-8 min-h-screen bg-black animate-fade-in">
            {/* Back Button */}
            <Link
                href="/dashboard/bots"
                className="inline-flex items-center gap-2 text-zinc-500 hover:text-zinc-100 mb-6 transition-colors text-sm"
            >
                <ChevronLeft className="w-4 h-4" />
                Back to Bots
            </Link>

            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl md:text-4xl font-bold text-zinc-100 mb-3 tracking-tight">
                    {bot.name}
                </h1>
                <div className="flex flex-wrap items-center gap-3">
                    {bot.phone_number && (
                        <div className="flex items-center gap-2 text-zinc-400 text-sm">
                            <Phone className="w-4 h-4 text-zinc-600" />
                            <span className="font-mono">{bot.phone_number}</span>
                        </div>
                    )}
                    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border ${isConnected
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
                        : 'bg-zinc-500/10 border-zinc-500/20 text-zinc-500'
                        }`}>
                        <Circle className="w-2 h-2 fill-current" />
                        <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
                    </div>
                </div>
            </div>

            {/* Tabs - Horizontal Scrollable on Mobile */}
            <div className="mb-8">
                <div className="flex overflow-x-auto no-scrollbar border-b border-zinc-800/50 gap-1">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-all relative ${activeTab === tab.id
                                ? 'text-zinc-100'
                                : 'text-zinc-500 hover:text-zinc-300'
                                }`}
                        >
                            <span>{tab.name}</span>
                            {activeTab === tab.id && (
                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500"></div>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Tab Content */}
            <div>
                {activeTab === 'overview' && (
                    <div className="space-y-6">
                        {/* Connection CTA - Only show if never connected */}
                        {!isConnected && !bot.phone_number && (
                            <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-6 mb-6">
                                <div className="flex flex-col sm:flex-row items-start gap-4">
                                    <div className="flex-1">
                                        <h3 className="text-lg font-semibold text-zinc-100 mb-2 tracking-tight">
                                            Connect WhatsApp
                                        </h3>
                                        <p className="text-zinc-400 text-sm mb-4">
                                            Scan QR code with your WhatsApp to connect this bot
                                        </p>
                                        <Link
                                            href={`/dashboard/bots/${botId}/connect`}
                                            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium transition-all text-sm"
                                        >
                                            Connect Now
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Top Row - EXACTLY 3 Cards (Grid Cols 3) */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Card 1: Total Messages */}
                            <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-6 hover:bg-zinc-900/80 transition-all">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center">
                                        <MessageSquare className="w-5 h-5 text-blue-500" />
                                    </div>
                                </div>
                                <div className="text-3xl font-bold text-zinc-100 mb-1 font-mono tracking-tight">
                                    {stats.totalMessages.toLocaleString()}
                                </div>
                                <div className="text-sm text-zinc-500">
                                    {isConnected ? 'Bot is active' : 'Connect to start tracking'}
                                </div>
                            </div>

                            {/* Card 2: Active Rules */}
                            <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-6 hover:bg-zinc-900/80 transition-all">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="w-10 h-10 bg-zinc-800/50 rounded-xl flex items-center justify-center">
                                        <Zap className="w-5 h-5 text-zinc-400" />
                                    </div>
                                </div>
                                <div className="text-3xl font-bold text-zinc-100 mb-1 font-mono tracking-tight">
                                    {stats.activeRules}
                                </div>
                                <div className="text-sm text-zinc-500">
                                    {stats.totalRules} total rule{stats.totalRules !== 1 ? 's' : ''}
                                </div>
                            </div>

                            {/* Card 3: Campaigns */}
                            <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-6 hover:bg-zinc-900/80 transition-all">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="w-10 h-10 bg-purple-500/10 rounded-xl flex items-center justify-center">
                                        <Megaphone className="w-5 h-5 text-purple-400" />
                                    </div>
                                </div>
                                <div className="text-3xl font-bold text-zinc-100 mb-1 font-mono tracking-tight">
                                    {stats.totalCampaigns}
                                </div>
                                <div className="text-sm text-zinc-500">
                                    {stats.activeCampaigns} active broadcast{stats.activeCampaigns !== 1 ? 's' : ''}
                                </div>
                            </div>
                        </div>

                        {/* Traffic Control & Live Activity */}
                        <div className="mt-8 mb-8 space-y-6">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-bold text-zinc-100 tracking-tight flex items-center gap-2">
                                    Traffic Control
                                </h2>
                            </div>

                            {/* Controls */}
                            <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-6">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                    <div className="flex-1 space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-zinc-400 font-medium">Throttle Status</span>
                                            <span className={`${currentLoad > 80 ? 'text-red-500' : 'text-emerald-500'} font-mono`}>
                                                {currentLoad}% Capacity
                                            </span>
                                        </div>
                                        <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all duration-500 ${currentLoad > 80 ? 'bg-red-500' : 'bg-emerald-500'}`}
                                                style={{ width: `${currentLoad}%` }}
                                            ></div>
                                        </div>
                                        <p className="text-xs text-zinc-500">
                                            {currentLoad > 0
                                                ? `Currently processing traffic. Load is ${currentLoad > 80 ? 'heavy' : 'stable'}.`
                                                : 'No active traffic detected. System is idle.'}
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <div className="flex flex-col gap-1.5 min-w-[200px]">
                                            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Rate Limit</label>
                                            <select
                                                value={rateLimit}
                                                onChange={(e) => setRateLimit(e.target.value)}
                                                className="bg-zinc-900 border border-zinc-800 text-zinc-200 text-sm rounded-lg px-3 py-2 outline-none focus:border-blue-500 transition-all"
                                            >
                                                <option value="Unlimited">Unlimited</option>
                                                <option value="50 msg/s">50 msg/s</option>
                                                <option value="20 msg/s">20 msg/s</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Charts & Logs Grid */}
                            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                                <div className="xl:col-span-2">

                                    <ActivityChart
                                        title="Bot Traffic & Load"
                                        data={chartData}
                                        timeRange={chartTimeRange}
                                        onTimeRangeChange={setChartTimeRange}
                                    />
                                </div>
                                <div className="xl:col-span-1">
                                    <RecentActivityList
                                        title="Bot Live Logs"
                                        botId={botId}
                                        logs={activityLogs}
                                        className="h-[400px]"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Bottom Row - EXACTLY 2 Panels (Grid Cols 2) */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Left Panel: Bot Status */}
                            <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-6">
                                <h3 className="text-lg font-semibold text-zinc-100 mb-4 tracking-tight">
                                    Bot Status
                                </h3>
                                <div className="space-y-3 mb-6">
                                    <div className="flex items-center justify-between">
                                        <span className="text-zinc-500 text-sm">Connection</span>
                                        <div className="flex items-center gap-2">
                                            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'
                                                }`} />
                                            <span className={`text-sm font-medium ${isConnected ? 'text-emerald-400' : 'text-red-400'
                                                }`}>
                                                {isConnected ? 'Connected' : 'Disconnected'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-zinc-500 text-sm">Session</span>
                                        <span className="text-sm text-zinc-100">
                                            {isConnected ? 'Active' : 'Inactive'}
                                        </span>
                                    </div>
                                    {bot?.last_activity && (
                                        <div className="flex items-center justify-between">
                                            <span className="text-zinc-500 text-sm">Last Activity</span>
                                            <span className="text-sm text-zinc-100 font-mono">
                                                {new Date(bot.last_activity).toLocaleString('en-US', {
                                                    month: 'short',
                                                    day: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* Full-width Pause/Resume Button */}
                                {bot?.phone_number && (
                                    <div className="pt-4 border-t border-zinc-800/50">
                                        {isConnected ? (
                                            <button
                                                onClick={() => pauseMutation.mutate()}
                                                disabled={pauseMutation.isPending}
                                                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-yellow-600/10 border border-yellow-600/20 text-yellow-600 rounded-xl hover:bg-yellow-600/20 transition-all font-medium text-sm disabled:opacity-50"
                                            >
                                                <Pause className="w-4 h-4" />
                                                {pauseMutation.isPending ? 'Pausing...' : 'Pause Bot'}
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => resumeMutation.mutate()}
                                                disabled={resumeMutation.isPending}
                                                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-xl hover:bg-emerald-500/20 transition-all font-medium text-sm disabled:opacity-50"
                                            >
                                                <Play className="w-4 h-4" />
                                                {resumeMutation.isPending ? 'Resuming...' : 'Resume Bot'}
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Right Panel: Reminders */}
                            <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-6">
                                <h3 className="text-lg font-semibold text-zinc-100 mb-4 tracking-tight">
                                    Reminders
                                </h3>
                                <div className="space-y-4 mb-6">
                                    <div className="flex items-center justify-between">
                                        <span className="text-zinc-500 text-sm">Active</span>
                                        <span className="text-2xl font-bold text-emerald-500 font-mono tracking-tight">
                                            {stats.activeReminders}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-zinc-500 text-sm">Total</span>
                                        <span className="text-lg font-semibold text-zinc-100 font-mono tracking-tight">
                                            {stats.totalReminders}
                                        </span>
                                    </div>
                                </div>
                                <div className="pt-4 border-t border-zinc-800/50">
                                    <button
                                        onClick={() => setActiveTab('reminders')}
                                        className="flex items-center gap-2 text-sm text-blue-500 hover:text-blue-400 transition-colors"
                                    >
                                        <span>View all reminders</span>
                                        <ArrowRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'rules' && (
                    <div>
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold text-zinc-100 tracking-tight">Auto-Reply Rules</h2>
                            <button
                                onClick={() => setShowCreateRuleModal(true)}
                                className="flex items-center gap-2 px-4 py-2.5 bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 hover:border-zinc-600 text-zinc-100 rounded-lg font-medium transition-all text-sm"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                <span>New Rule</span>
                            </button>
                        </div>

                        {/* Stacked List - Ghost Aesthetic */}
                        {rulesData && rulesData.length > 0 ? (
                            <div className="bg-zinc-900 border border-zinc-800 rounded-xl divide-y divide-zinc-800 overflow-hidden">
                                {rulesData.map((rule: any) => {
                                    const isActive = rule.is_active === 1

                                    return (
                                        <div
                                            key={rule.id}
                                            className={`group flex items-center gap-4 px-4 py-4 hover:bg-zinc-800/50 transition-colors ${!isActive ? 'opacity-50' : ''
                                                }`}
                                        >
                                            {/* Icon Container */}
                                            <div className="w-8 h-8 rounded bg-zinc-900/50 flex items-center justify-center flex-shrink-0">
                                                <svg className="w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                                </svg>
                                            </div>

                                            {/* Content */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h3 className="text-sm font-medium text-zinc-200 truncate">
                                                        {rule.keyword}
                                                    </h3>
                                                    {/* Match Type Badge */}
                                                    <span className="px-2 py-0.5 bg-zinc-900/50 border border-zinc-800/50 rounded text-xs text-zinc-500 font-mono">
                                                        {rule.match_type || 'contains'}
                                                    </span>
                                                    {/* Inactive Badge */}
                                                    {!isActive && (
                                                        <span className="px-2 py-0.5 bg-zinc-800/50 border border-zinc-700/50 rounded text-xs text-zinc-600 font-medium">
                                                            Inactive
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-3 text-xs">
                                                    <span className="text-zinc-500 truncate max-w-[300px]">
                                                        → {rule.reply_message || rule.actions?.[0]?.config?.message || 'No reply set'}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Scope Badge (if not global) */}
                                            {rule.scope && rule.scope !== 'global' && (
                                                <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 bg-zinc-900/50 border border-zinc-800/50 rounded-md">
                                                    <svg className="w-3 h-3 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                                    </svg>
                                                    <span className="text-xs text-zinc-400 capitalize">{rule.scope}</span>
                                                </div>
                                            )}

                                            {/* Priority Badge */}
                                            {rule.priority && rule.priority > 0 && (
                                                <div className="hidden lg:flex items-center gap-1.5 px-2 py-1 bg-zinc-900/30 rounded">
                                                    <svg className="w-3 h-3 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                                                    </svg>
                                                    <span className="text-xs text-zinc-600 font-mono">{rule.priority}</span>
                                                </div>
                                            )}

                                            {/* Ultra-Minimal Toggle Switch */}
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    // Toggle rule
                                                    api.rules.toggle(rule.id).then(() => {
                                                        queryClient.invalidateQueries({ queryKey: ['rules', botId] })
                                                        toast.success(isActive ? 'Rule disabled' : 'Rule enabled')
                                                    }).catch(() => {
                                                        toast.error('Failed to toggle rule')
                                                    })
                                                }}
                                                className={`relative w-11 h-6 rounded-full transition-all flex-shrink-0 ${isActive
                                                    ? 'bg-emerald-500/20'
                                                    : 'bg-zinc-800'
                                                    }`}
                                            >
                                                <div
                                                    className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full transition-all ${isActive
                                                        ? 'translate-x-5 bg-emerald-500'
                                                        : 'translate-x-0 bg-zinc-600'
                                                        }`}
                                                />
                                            </button>

                                            {/* Edit Button */}
                                            <button
                                                onClick={() => {
                                                    setSelectedRule(rule)
                                                    setShowEditRuleModal(true)
                                                }}
                                                className="w-8 h-8 rounded-lg bg-zinc-900/50 hover:bg-zinc-800/50 flex items-center justify-center transition-colors flex-shrink-0"
                                            >
                                                <svg className="w-4 h-4 text-zinc-500 group-hover:text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                </svg>
                                            </button>

                                            {/* Delete Button */}
                                            <button
                                                onClick={() => {
                                                    if (confirm('Are you sure you want to delete this rule?')) {
                                                        api.rules.delete(rule.id).then(() => {
                                                            queryClient.invalidateQueries({ queryKey: ['rules', botId] })
                                                            toast.success('Rule deleted')
                                                        }).catch(() => {
                                                            toast.error('Failed to delete rule')
                                                        })
                                                    }
                                                }}
                                                className="w-8 h-8 rounded-lg bg-zinc-900/50 hover:bg-red-500/10 flex items-center justify-center transition-colors flex-shrink-0"
                                            >
                                                <svg className="w-4 h-4 text-zinc-600 hover:text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        </div>
                                    )
                                })}
                            </div>
                        ) : (
                            <div className="border border-dashed border-zinc-800/50 rounded-xl p-12 text-center">
                                <div className="w-12 h-12 mx-auto mb-4 bg-zinc-900/50 rounded-xl flex items-center justify-center">
                                    <svg className="w-6 h-6 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    </svg>
                                </div>
                                <h3 className="text-zinc-400 font-medium mb-1">No rules yet</h3>
                                <p className="text-zinc-600 text-sm">Create your first auto-reply rule</p>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'campaigns' && (
                    <div>
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold text-zinc-100 tracking-tight">Broadcast Campaigns</h2>
                            <button
                                onClick={() => setShowCreateCampaignModal(true)}
                                className="flex items-center gap-2 px-4 py-2.5 bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 hover:border-zinc-600 text-zinc-100 rounded-lg font-medium transition-all text-sm"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                <span>New Campaign</span>
                            </button>
                        </div>
                        <CampaignsTable botId={botId} />
                    </div>
                )}

                {activeTab === 'reminders' && (
                    <div>
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold text-zinc-100 tracking-tight">Scheduled Reminders</h2>
                            <button
                                onClick={() => router.push(`/dashboard/reminders/create?botId=${botId}`)}
                                className="flex items-center gap-2 px-4 py-2.5 bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 hover:border-zinc-600 text-zinc-100 rounded-lg font-medium transition-all text-sm"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                <span>New Reminder</span>
                            </button>
                        </div>

                        {/* Stacked List - Ghost Aesthetic */}
                        {remindersData && remindersData.length > 0 ? (
                            <div className="bg-zinc-900 border border-zinc-800 rounded-xl divide-y divide-zinc-800 overflow-hidden">
                                {remindersData.map((reminder: any) => {
                                    const isActive = reminder.is_active === 1

                                    // Format schedule
                                    const formatSchedule = (cron: string): string => {
                                        if (cron === 'now') return 'One-time'
                                        const parts = cron.split(' ')
                                        if (parts.length !== 5) return cron
                                        const [minute, hour, dom, month, dow] = parts

                                        if (dow !== '*') {
                                            const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
                                            return `Weekly · ${days[parseInt(dow)]} ${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`
                                        }
                                        if (dom === '*' && month === '*') {
                                            return `Daily · ${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`
                                        }
                                        if (dom !== '*' && month !== '*') {
                                            return `Once · ${dom}/${month} ${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`
                                        }
                                        return cron
                                    }

                                    return (
                                        <div
                                            key={reminder.id}
                                            className="group flex items-center gap-4 px-4 py-4 hover:bg-zinc-800/50 transition-colors cursor-pointer"
                                            onClick={() => router.push(`/dashboard/reminders/${reminder.id}/edit`)}
                                        >
                                            {/* Icon Container */}
                                            <div className="w-8 h-8 rounded bg-zinc-900/50 flex items-center justify-center flex-shrink-0">
                                                <svg className="w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                            </div>

                                            {/* Content */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h3 className="text-sm font-medium text-zinc-200 truncate">
                                                        {reminder.name}
                                                    </h3>
                                                </div>
                                                <div className="flex items-center gap-3 text-xs">
                                                    <span className="text-zinc-500 font-mono">
                                                        {formatSchedule(reminder.schedule)}
                                                    </span>
                                                    {reminder.group_name && (
                                                        <>
                                                            <span className="text-zinc-700">·</span>
                                                            <span className="text-zinc-500 truncate max-w-[200px]">
                                                                {reminder.group_name}
                                                            </span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Next Run Badge (if active) */}
                                            {reminder.next_run_at && isActive && (
                                                <div className="hidden md:flex items-center gap-2 px-2.5 py-1 bg-zinc-900/50 border border-zinc-800/50 rounded-md">
                                                    <svg className="w-3 h-3 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                    <span className="text-xs text-zinc-400 font-mono">
                                                        {new Date(reminder.next_run_at).toLocaleString('en-US', {
                                                            month: 'short',
                                                            day: 'numeric',
                                                            hour: '2-digit',
                                                            minute: '2-digit'
                                                        })}
                                                    </span>
                                                </div>
                                            )}

                                            {/* ID Badge */}
                                            <div className="hidden lg:flex items-center gap-1.5 px-2 py-1 bg-zinc-900/30 rounded">
                                                <svg className="w-3 h-3 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                                                </svg>
                                                <span className="text-xs text-zinc-600 font-mono">{reminder.id.slice(0, 8)}</span>
                                            </div>

                                            {/* Ultra-Minimal Toggle Switch */}
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    // Toggle reminder
                                                    api.reminders.toggle(reminder.id).then(() => {
                                                        queryClient.invalidateQueries({ queryKey: ['reminders', botId] })
                                                        toast.success(isActive ? 'Reminder paused' : 'Reminder activated')
                                                    }).catch(() => {
                                                        toast.error('Failed to toggle reminder')
                                                    })
                                                }}
                                                className={`relative w-11 h-6 rounded-full transition-all flex-shrink-0 ${isActive
                                                    ? 'bg-emerald-500/20'
                                                    : 'bg-zinc-800'
                                                    }`}
                                            >
                                                <div
                                                    className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full transition-all ${isActive
                                                        ? 'translate-x-5 bg-emerald-500'
                                                        : 'translate-x-0 bg-zinc-600'
                                                        }`}
                                                />
                                            </button>

                                            {/* Arrow Icon (visible on hover) */}
                                            <svg className="w-4 h-4 text-zinc-700 group-hover:text-zinc-500 transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                            </svg>
                                        </div>
                                    )
                                })}
                            </div>
                        ) : (
                            <div className="border border-dashed border-zinc-800/50 rounded-xl p-12 text-center">
                                <div className="w-12 h-12 mx-auto mb-4 bg-zinc-900/50 rounded-xl flex items-center justify-center">
                                    <svg className="w-6 h-6 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <h3 className="text-zinc-400 font-medium mb-1">No reminders yet</h3>
                                <p className="text-zinc-600 text-sm">Create your first scheduled reminder</p>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'settings' && (
                    <div>
                        <h2 className="text-2xl font-bold text-zinc-100 mb-6 tracking-tight">Bot Settings</h2>
                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-zinc-400 mb-2">Bot Name</label>
                                <input
                                    type="text"
                                    defaultValue={bot.name}
                                    className="w-full px-4 py-3 bg-zinc-800/50 border border-zinc-700/50 rounded-xl text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-zinc-400 mb-2">Phone Number</label>
                                <input
                                    type="text"
                                    defaultValue={bot.phone_number || ''}
                                    disabled
                                    className="w-full px-4 py-3 bg-zinc-800/50 border border-zinc-700/50 rounded-xl text-zinc-500 cursor-not-allowed"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-zinc-400 mb-2">Status</label>
                                <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border ${isConnected
                                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
                                    : 'bg-zinc-500/10 border-zinc-500/20 text-zinc-500'
                                    }`}>
                                    <Circle className="w-2 h-2 fill-current" />
                                    <span>{bot.status || 'disconnected'}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Modals */}
            {showCreateRuleModal && (
                <CreateRuleModal
                    botId={botId}
                    onClose={() => setShowCreateRuleModal(false)}
                />
            )}

            {showEditRuleModal && selectedRule && (
                <EditRuleModal
                    botId={botId}
                    rule={selectedRule}
                    onClose={() => {
                        setShowEditRuleModal(false)
                        setSelectedRule(null)
                    }}
                />
            )}

            {showCreateCampaignModal && (
                <CreateCampaignModal
                    botId={botId}
                    onClose={() => setShowCreateCampaignModal(false)}
                />
            )}
        </div>
    )
}
