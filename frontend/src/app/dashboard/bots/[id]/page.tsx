'use client'

import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import CreateRuleModal from '@/components/modals/CreateRuleModal'
import EditRuleModal from '@/components/modals/EditRuleModal'
import DeleteConfirmationModal from '@/components/modals/DeleteConfirmationModal'
import CampaignsTable from '@/components/tables/CampaignsTable'
import RulesTable from '@/components/tables/RulesTable'
import RemindersTable from '@/components/tables/RemindersTable'
import CreateCampaignWizard from '@/components/CreateCampaignWizard'
import ActivityChart from '@/components/ActivityChart'
import RecentActivityList from '@/components/RecentActivityList'
import AIConfigTable from '@/components/AIConfigTable'
import { usePermissions } from '@/hooks/usePermissions'
import {
    ChevronLeft,
    MessageSquare,
    Zap,
    Megaphone,
    Circle,
    Phone,
    Pause,
    Play,
    ArrowRight,
    Edit2,
    Trash2,
    Filter,
    CheckSquare,
    Square,
    X,
    MoreVertical,
    CheckCircle2,
    XCircle,
    Calendar,
    Clock,
    Users,
    ChevronDown,
    Plus
} from 'lucide-react'

export default function BotDetailPage() {
    const params = useParams()
    const router = useRouter()
    if (!params) return null;
    const botId = params.id as string
    const { hasModuleAccess, isAdmin } = usePermissions()
    const [activeTab, setActiveTab] = useState<string>('overview')

    // Modal states
    const [showCreateRuleModal, setShowCreateRuleModal] = useState(false)
    const [showEditRuleModal, setShowEditRuleModal] = useState(false)
    const [selectedRule, setSelectedRule] = useState<any>(null)
    const [showCreateCampaignWizard, setShowCreateCampaignWizard] = useState(false)

    // Delete Confirmation State
    const [ruleToDelete, setRuleToDelete] = useState<string | null>(null)
    const [isDeletingRule, setIsDeletingRule] = useState(false)

    // Handle URL hash for tab switching
    useEffect(() => {
        const hash = window.location.hash.replace('#', '')
        if (hash && ['overview', 'rules', 'ai-assistant', 'campaigns', 'reminders', 'settings'].includes(hash)) {
            setActiveTab(hash)
        }
    }, [])

    // Delete reminder confirmation state
    const [deleteReminderConfirm, setDeleteReminderConfirm] = useState<string | null>(null)
    const [isDeletingReminder, setIsDeletingReminder] = useState(false)

    // Expanded targets state
    const [expandedTargets, setExpandedTargets] = useState<string | null>(null)

    // Selection states
    const [selectedReminders, setSelectedReminders] = useState<string[]>([])
    const [selectedRules, setSelectedRules] = useState<string[]>([])

    // Filter states
    const [reminderFilters, setReminderFilters] = useState({
        status: 'all',
        type: 'all'
    })
    const [ruleFilters, setRuleFilters] = useState({
        status: 'all',
        scope: 'all'
    })

    const [openFilter, setOpenFilter] = useState<string | null>(null)

    const queryClient = useQueryClient()

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

    // Filtered data
    const filteredRules = useMemo(() => {
        if (!rulesData) return []
        return rulesData.filter((rule: any) => {
            const matchesStatus = ruleFilters.status === 'all' ||
                (ruleFilters.status === 'active' ? rule.is_active === 1 : rule.is_active === 0)
            const matchesScope = ruleFilters.scope === 'all' || (rule.scope || 'global') === ruleFilters.scope
            return matchesStatus && matchesScope
        })
    }, [rulesData, ruleFilters])

    const filteredReminders = useMemo(() => {
        if (!remindersData) return []
        return remindersData.filter((reminder: any) => {
            const matchesStatus = reminderFilters.status === 'all' ||
                (reminderFilters.status === 'active' ? reminder.is_active === 1 : reminder.is_active === 0)

            if (reminderFilters.type === 'all') return matchesStatus

            const schedule = reminder.schedule
            if (reminderFilters.type === 'now' && schedule === 'now') return matchesStatus
            if (schedule === 'now') return false

            const parts = schedule.split(' ')
            if (parts.length !== 5) return false
            const [, , dom, month, dow] = parts

            if (reminderFilters.type === 'weekly' && dow !== '*') return matchesStatus
            if (reminderFilters.type === 'daily' && dom === '*' && month === '*') return matchesStatus
            if (reminderFilters.type === 'one-time' && dom !== '*' && month !== '*') return matchesStatus

            return false
        })
    }, [remindersData, reminderFilters])

    const handleDeleteRule = async () => {
        if (!ruleToDelete) return
        setIsDeletingRule(true)
        try {
            await api.rules.delete(ruleToDelete)
            queryClient.invalidateQueries({ queryKey: ['rules', botId] })
            toast.success('Rule deleted successfully')
        } catch (error) {
            toast.error('Failed to delete rule')
        } finally {
            setIsDeletingRule(false)
            setRuleToDelete(null)
        }
    }

    const handleDeleteReminder = async () => {
        if (!deleteReminderConfirm) return
        setIsDeletingReminder(true)
        try {
            await api.reminders.delete(deleteReminderConfirm)
            queryClient.invalidateQueries({ queryKey: ['reminders', botId] })
            toast.success('Reminder deleted successfully')
            setDeleteReminderConfirm(null)
        } catch (error) {
            toast.error('Failed to delete reminder')
        } finally {
            setIsDeletingReminder(false)
        }
    }

    // Real-time Activity Logs (Auto-Refresh)
    const { data: activityLogs = [] } = useQuery({
        queryKey: ['activity', botId],
        queryFn: async () => {
            const response = await api.analytics.getActivityLogs(500, botId)
            return response.data.data || []
        },
        enabled: !!botId,
        refetchInterval: 3000,
    })

    const [chartTimeRange, setChartTimeRange] = useState('24h')

    // Compute Chart Data
    const chartData = useMemo(() => {
        if (!activityLogs.length) return []
        const buckets = new Map<string, any>()
        const now = new Date()

        if (chartTimeRange === '30m') {
            for (let i = 0; i <= 30; i++) {
                const d = new Date(now.getTime() - (30 - i) * 60 * 1000)
                const timeStr = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
                buckets.set(timeStr, { time: timeStr, received: 0, auto_reply: 0, campaign: 0, reminder: 0 })
            }
        } else if (chartTimeRange === '24h') {
            for (let i = 0; i < 24; i++) {
                const d = new Date(now.getTime() - i * 60 * 60 * 1000)
                const hour = d.getHours().toString().padStart(2, '0')
                const timeStr = `${hour}:00`
                buckets.set(timeStr, { time: timeStr, received: 0, auto_reply: 0, campaign: 0, reminder: 0 })
            }
        } else if (chartTimeRange === '7d') {
            for (let i = 0; i < 7; i++) {
                const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
                const timeStr = `${d.getMonth() + 1}/${d.getDate()}`
                buckets.set(timeStr, { time: timeStr, received: 0, auto_reply: 0, campaign: 0, reminder: 0 })
            }
        } else if (chartTimeRange === '30d') {
            for (let i = 0; i < 30; i++) {
                const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
                const timeStr = `${d.getMonth() + 1}/${d.getDate()}`
                buckets.set(timeStr, { time: timeStr, received: 0, auto_reply: 0, campaign: 0, reminder: 0 })
            }
        }

        activityLogs.forEach((log: any) => {
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

        const results = Array.from(buckets.values())
        return chartTimeRange === '30m' ? results : results.reverse()
    }, [activityLogs, chartTimeRange])

    const [rateLimit, setRateLimit] = useState('Unlimited')

    const currentLoad = useMemo(() => {
        if (!activityLogs.length) return 0
        const now = new Date().getTime()
        const oneMinuteAgo = now - 60 * 1000
        const recentCount = activityLogs.filter((log: any) =>
            (log.type === 'message' || log.type === 'campaign') &&
            new Date(log.timestamp).getTime() > oneMinuteAgo
        ).length

        let maxCapacity = 60
        if (rateLimit === '50 msg/s') maxCapacity = 3000
        if (rateLimit === '20 msg/s') maxCapacity = 1200

        return Math.min(100, Math.round((recentCount / maxCapacity) * 100))
    }, [activityLogs, rateLimit])

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
        { id: 'rules', name: 'Auto-Reply', permission: 'auto_reply' },
        { id: 'ai-assistant', name: 'AI Assistant', permission: 'ai_assistant' },
        { id: 'campaigns', name: 'Campaigns', permission: 'campaigns' },
        { id: 'reminders', name: 'Reminders', permission: 'reminders' },
        { id: 'settings', name: 'Settings' },
    ].filter(tab => !tab.permission || hasModuleAccess(tab.permission, botId))

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
            <Link
                href="/dashboard/bots"
                className="inline-flex items-center gap-2 text-zinc-500 hover:text-zinc-100 mb-6 transition-colors text-sm"
            >
                <ChevronLeft className="w-4 h-4" />
                Back to Bots
            </Link>

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

            <div className="mb-8 border-b border-zinc-800/50">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex overflow-x-auto no-scrollbar gap-1">
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

                    {(activeTab === 'rules' || activeTab === 'reminders') && (
                        <div className="flex items-center gap-2 pb-2 md:pb-0 pr-2">
                            {activeTab === 'rules' ? (
                                <>
                                    <div className="relative">
                                        <button
                                            onClick={() => setOpenFilter(openFilter === 'rule-status' ? null : 'rule-status')}
                                            className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs font-medium text-zinc-300 hover:border-zinc-700 transition-all"
                                        >
                                            <div className={`w-1.5 h-1.5 rounded-full ${ruleFilters.status === 'active' ? 'bg-emerald-500' : ruleFilters.status === 'inactive' ? 'bg-zinc-500' : 'bg-blue-500'}`} />
                                            <span>{ruleFilters.status === 'all' ? 'All Status' : ruleFilters.status.charAt(0).toUpperCase() + ruleFilters.status.slice(1)}</span>
                                            <ChevronDown className={`w-3 h-3 transition-transform ${openFilter === 'rule-status' ? 'rotate-180' : ''}`} />
                                        </button>
                                        {openFilter === 'rule-status' && (
                                            <div className="absolute top-full right-0 mt-1 w-32 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                                {['all', 'active', 'inactive'].map((s) => (
                                                    <button
                                                        key={s}
                                                        onClick={() => {
                                                            setRuleFilters({ ...ruleFilters, status: s })
                                                            setOpenFilter(null)
                                                        }}
                                                        className={`w-full px-3 py-2 text-left text-xs font-medium hover:bg-zinc-800 transition-colors ${ruleFilters.status === s ? 'text-blue-400 bg-blue-500/5' : 'text-zinc-400'}`}
                                                    >
                                                        {s === 'all' ? 'All Status' : s.charAt(0).toUpperCase() + s.slice(1)}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <div className="relative">
                                        <button
                                            onClick={() => setOpenFilter(openFilter === 'rule-scope' ? null : 'rule-scope')}
                                            className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs font-medium text-zinc-300 hover:border-zinc-700 transition-all"
                                        >
                                            <Filter className="w-3 h-3 text-zinc-500" />
                                            <span>{ruleFilters.scope === 'all' ? 'All Scopes' : ruleFilters.scope.charAt(0).toUpperCase() + ruleFilters.scope.slice(1)}</span>
                                            <ChevronDown className={`w-3 h-3 transition-transform ${openFilter === 'rule-scope' ? 'rotate-180' : ''}`} />
                                        </button>
                                        {openFilter === 'rule-scope' && (
                                            <div className="absolute top-full right-0 mt-1 w-32 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                                {['all', 'global', 'group'].map((s) => (
                                                    <button
                                                        key={s}
                                                        onClick={() => {
                                                            setRuleFilters({ ...ruleFilters, scope: s })
                                                            setOpenFilter(null)
                                                        }}
                                                        className={`w-full px-3 py-2 text-left text-xs font-medium hover:bg-zinc-800 transition-colors ${ruleFilters.scope === s ? 'text-blue-400 bg-blue-500/5' : 'text-zinc-400'}`}
                                                    >
                                                        {s === 'all' ? 'All Scopes' : s.charAt(0).toUpperCase() + s.slice(1)}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="relative">
                                        <button
                                            onClick={() => setOpenFilter(openFilter === 'rem-status' ? null : 'rem-status')}
                                            className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs font-medium text-zinc-300 hover:border-zinc-700 transition-all"
                                        >
                                            <div className={`w-1.5 h-1.5 rounded-full ${reminderFilters.status === 'active' ? 'bg-emerald-500' : reminderFilters.status === 'inactive' ? 'bg-zinc-500' : 'bg-blue-500'}`} />
                                            <span>{reminderFilters.status === 'all' ? 'All Status' : reminderFilters.status.charAt(0).toUpperCase() + reminderFilters.status.slice(1)}</span>
                                            <ChevronDown className={`w-3 h-3 transition-transform ${openFilter === 'rem-status' ? 'rotate-180' : ''}`} />
                                        </button>
                                        {openFilter === 'rem-status' && (
                                            <div className="absolute top-full right-0 mt-1 w-32 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                                {['all', 'active', 'inactive'].map((s) => (
                                                    <button
                                                        key={s}
                                                        onClick={() => {
                                                            setReminderFilters({ ...reminderFilters, status: s })
                                                            setOpenFilter(null)
                                                        }}
                                                        className={`w-full px-3 py-2 text-left text-xs font-medium hover:bg-zinc-800 transition-colors ${reminderFilters.status === s ? 'text-emerald-400 bg-emerald-500/5' : 'text-zinc-400'}`}
                                                    >
                                                        {s === 'all' ? 'All Status' : s.charAt(0).toUpperCase() + s.slice(1)}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <div className="relative">
                                        <button
                                            onClick={() => setOpenFilter(openFilter === 'rem-type' ? null : 'rem-type')}
                                            className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs font-medium text-zinc-300 hover:border-zinc-700 transition-all"
                                        >
                                            <Clock className="w-3 h-3 text-zinc-500" />
                                            <span>{reminderFilters.type === 'all' ? 'All Types' : reminderFilters.type.split('-').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join('-')}</span>
                                            <ChevronDown className={`w-3 h-3 transition-transform ${openFilter === 'rem-type' ? 'rotate-180' : ''}`} />
                                        </button>
                                        {openFilter === 'rem-type' && (
                                            <div className="absolute top-full right-0 mt-1 w-32 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                                {['all', 'now', 'daily', 'weekly', 'one-time'].map((s) => (
                                                    <button
                                                        key={s}
                                                        onClick={() => {
                                                            setReminderFilters({ ...reminderFilters, type: s })
                                                            setOpenFilter(null)
                                                        }}
                                                        className={`w-full px-3 py-2 text-left text-xs font-medium hover:bg-zinc-800 transition-colors ${reminderFilters.type === s ? 'text-emerald-400 bg-emerald-500/5' : 'text-zinc-400'}`}
                                                    >
                                                        {s === 'all' ? 'All Types' : s.split('-').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join('-')}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <div>
                {activeTab === 'overview' && (
                    <div className="space-y-6">
                        {!isConnected && !bot.phone_number && (
                            <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-6 mb-6">
                                <h3 className="text-lg font-semibold text-zinc-100 mb-2 tracking-tight">Connect WhatsApp</h3>
                                <p className="text-zinc-400 text-sm mb-4">Scan QR code with your WhatsApp to connect this bot</p>
                                <Link href={`/dashboard/bots/${botId}/connect`} className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium transition-all text-sm">
                                    Connect Now
                                </Link>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-6 hover:bg-zinc-900/80 transition-all">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center">
                                        <MessageSquare className="w-5 h-5 text-blue-500" />
                                    </div>
                                </div>
                                <div className="text-3xl font-bold text-zinc-100 mb-1 font-mono tracking-tight">{stats.totalMessages.toLocaleString()}</div>
                                <div className="text-sm text-zinc-500">{isConnected ? 'Bot is active' : 'Connect to start tracking'}</div>
                            </div>
                            {hasModuleAccess('auto_reply', botId) && (
                                <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-6 hover:bg-zinc-900/80 transition-all">
                                    <div className="w-10 h-10 bg-zinc-800/50 rounded-xl flex items-center justify-center mb-4 text-zinc-400"><Zap className="w-5 h-5" /></div>
                                    <div className="text-3xl font-bold text-zinc-100 mb-1 font-mono tracking-tight">{stats.activeRules}</div>
                                    <div className="text-sm text-zinc-500">{stats.totalRules} total rules</div>
                                </div>
                            )}
                            {hasModuleAccess('campaigns', botId) && (
                                <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-6 hover:bg-zinc-900/80 transition-all">
                                    <div className="w-10 h-10 bg-purple-500/10 rounded-xl flex items-center justify-center mb-4 text-purple-400"><Megaphone className="w-5 h-5" /></div>
                                    <div className="text-3xl font-bold text-zinc-100 mb-1 font-mono tracking-tight">{stats.totalCampaigns}</div>
                                    <div className="text-sm text-zinc-500">{stats.activeCampaigns} active broadcasts</div>
                                </div>
                            )}
                        </div>

                        <div className="mt-8 space-y-6">
                            <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-6">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                    <div className="flex-1 space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-zinc-400 font-medium">Throttle Status</span>
                                            <span className={`${currentLoad > 80 ? 'text-red-500' : 'text-emerald-500'} font-mono`}>{currentLoad}% Capacity</span>
                                        </div>
                                        <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
                                            <div className={`h-full rounded-full transition-all duration-500 ${currentLoad > 80 ? 'bg-red-500' : 'bg-emerald-500'}`} style={{ width: `${currentLoad}%` }}></div>
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-1.5 min-w-[200px]">
                                        <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Rate Limit</label>
                                        <select value={rateLimit} onChange={(e) => setRateLimit(e.target.value)} className="bg-zinc-900 border border-zinc-800 text-zinc-200 text-sm rounded-lg px-3 py-2">
                                            <option value="Unlimited">Unlimited</option>
                                            <option value="50 msg/s">50 msg/s</option>
                                            <option value="20 msg/s">20 msg/s</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                                <div className={`${isAdmin ? 'xl:col-span-2' : 'xl:col-span-3'}`}>
                                    <ActivityChart title="Bot Traffic & Load" data={chartData} timeRange={chartTimeRange} onTimeRangeChange={setChartTimeRange} />
                                </div>
                                {isAdmin && (
                                    <div className="xl:col-span-1">
                                        <RecentActivityList title="Bot Live Logs" botId={botId} logs={activityLogs} className="h-[400px]" />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'rules' && hasModuleAccess('auto_reply', botId) && (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <h2 className="text-2xl font-bold text-zinc-100 tracking-tight">Auto-Reply Rules</h2>
                            <button onClick={() => setShowCreateRuleModal(true)} className="flex items-center gap-2 px-4 py-2.5 bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 text-zinc-100 rounded-lg text-sm">
                                <Plus className="w-4 h-4" />
                                New Rule
                            </button>
                        </div>
                        <RulesTable botId={botId} />
                    </div>
                )}

                {activeTab === 'campaigns' && hasModuleAccess('campaigns', botId) && (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <h2 className="text-2xl font-bold text-zinc-100 tracking-tight">Campaigns</h2>
                            <button onClick={() => setShowCreateCampaignWizard(true)} className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm"><Plus className="w-4 h-4" />New Campaign</button>
                        </div>
                        <CampaignsTable botId={botId} />
                    </div>
                )}

                {activeTab === 'reminders' && hasModuleAccess('reminders', botId) && (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <h2 className="text-2xl font-bold text-zinc-100 tracking-tight">Reminders</h2>
                            <button onClick={() => router.push(`/dashboard/reminders/create?botId=${botId}`)} className="flex items-center gap-2 px-4 py-2.5 bg-zinc-800 text-white rounded-lg text-sm">
                                <Plus className="w-4 h-4" />
                                New Reminder
                            </button>
                        </div>
                        <RemindersTable botId={botId} />
                    </div>
                )}

                {activeTab === 'ai-assistant' && hasModuleAccess('ai_assistant', botId) && (
                    <AIConfigTable botId={botId} />
                )}

                {activeTab === 'settings' && (
                    <div className="bg-zinc-900/30 border border-zinc-800 rounded-2xl p-8 max-w-2xl">
                        <h2 className="text-2xl font-bold text-zinc-100 mb-6">Settings</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Bot Name</label>
                                <input type="text" defaultValue={bot.name} className="w-full bg-zinc-950 border border-zinc-800 p-3 rounded-xl text-white outline-none focus:border-blue-500" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Status</label>
                                <div className="p-3 bg-zinc-800 rounded-xl text-zinc-200 capitalize">{bot.status}</div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {showCreateRuleModal && <CreateRuleModal botId={botId} onClose={() => setShowCreateRuleModal(false)} />}
            {showEditRuleModal && selectedRule && <EditRuleModal botId={botId} rule={selectedRule} onClose={() => { setShowEditRuleModal(false); setSelectedRule(null); }} />}
            {showCreateCampaignWizard && <CreateCampaignWizard initialBotId={botId} onClose={() => { setShowCreateCampaignWizard(false); queryClient.invalidateQueries({ queryKey: ['campaigns', botId] }); }} />}
        </div>
    )
}
