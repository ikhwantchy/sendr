'use client'

import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import EditRuleModal from '@/components/modals/EditRuleModal'
import DeleteConfirmationModal from '@/components/modals/DeleteConfirmationModal'
import CampaignsTable from '@/components/tables/CampaignsTable'
import RulesTable from '@/components/tables/RulesTable'
import RemindersTable from '@/components/tables/RemindersTable'
import ActivityChart from '@/components/ActivityChart'
import RecentActivityList from '@/components/RecentActivityList'
import AIAssistantPanel from '@/components/AIAssistantPanel'
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
    Plus,
    RefreshCw,
    Activity,
    Bot
} from 'lucide-react'

export default function BotDetailPage() {
    const params = useParams()
    const router = useRouter()
    if (!params) return null;
    const botId = params?.id as string
    const { hasModuleAccess, isAdmin } = usePermissions()
    
    // Initialize activeTab from hash on first render
    const [activeTab, setActiveTab] = useState<string>(() => {
        if (typeof window === 'undefined') return 'overview'
        const hash = window.location.hash.replace('#', '')
        if (hash && ['overview', 'rules', 'ai-assistant', 'ai-config', 'ai-mappings', 'campaigns', 'reminders', 'settings'].includes(hash)) {
            return hash
        }
        return 'overview'
    })

    // Modal states
    const [showEditRuleModal, setShowEditRuleModal] = useState(false)
    const [selectedRule, setSelectedRule] = useState<any>(null)

    // Delete Confirmation State
    const [ruleToDelete, setRuleToDelete] = useState<string | null>(null)
    const [isDeletingRule, setIsDeletingRule] = useState(false)

    // Handle URL hash for tab switching
    useEffect(() => {
        const handleHashChange = () => {
            const hash = window.location.hash.replace('#', '')
            // Include AI subtabs
            if (hash && ['overview', 'rules', 'ai-assistant', 'ai-config', 'ai-mappings', 'campaigns', 'reminders', 'settings'].includes(hash)) {
                setActiveTab(hash)
            } else {
                setActiveTab('overview')
            }
        }

        handleHashChange()
        window.addEventListener('hashchange', handleHashChange)
        return () => window.removeEventListener('hashchange', handleHashChange)
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
    const [isBotPausing, setIsBotPausing] = useState(false)

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

    // Pause/Resume Bot Handler
    const handleToggleBotPause = async () => {
        setIsBotPausing(true)
        try {
            if (bot.is_paused) {
                await api.bots.resume(botId)
                toast.success('Bot resumed successfully')
            } else {
                await api.bots.pause(botId)
                toast.success('Bot paused successfully')
            }
            // Force immediate refetch
            await queryClient.invalidateQueries({ queryKey: ['bot', botId] })
            await queryClient.refetchQueries({ queryKey: ['bot', botId] })
        } catch (error) {
            toast.error('Failed to update bot status')
        } finally {
            setIsBotPausing(false)
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

    // Fetch Chart Data from /analytics/full endpoint (Real-time: 5s refresh)
    const { data: trafficData, dataUpdatedAt } = useQuery({
        queryKey: ['bot-traffic', botId, chartTimeRange],
        queryFn: async () => {
            const response = await api.analytics.getFull(chartTimeRange, botId)
            return response.data.data?.trafficChart || []
        },
        enabled: !!botId,
        refetchInterval: 5000, // Real-time: Refresh every 5 seconds
        staleTime: 4000, // Consider data stale after 4 seconds
    })

    // Transform trafficChart data to match ActivityChart expected format
    const chartData = useMemo(() => {
        if (!trafficData || !trafficData.length) return []
        return trafficData.map((item: any) => ({
            time: item.date,
            auto_reply: item.auto_replies || 0,
            campaign: item.campaigns || 0,
            reminder: item.reminders || 0,
            received: item.received || 0,
        }))
    }, [trafficData])

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
        );
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
        );
    }

    const isConnected = bot.status === 'connected';

    return (
        <div className="p-4 sm:p-6 md:p-8 min-h-screen bg-black animate-fade-in">
            <div className="space-y-6 sm:space-y-8">
                {activeTab === 'overview' && (
                    <div className="space-y-4 sm:space-y-6">
                        {/* Integrated Hero Section (Overview ONLY) */}
                        <div className="flex flex-col gap-4 sm:gap-6 pb-6 sm:pb-8 border-b border-zinc-900/50 mb-4 sm:mb-6">
                            {/* Top: Bot Name with Icon */}
                            <div className="flex items-center gap-3 sm:gap-4">
                                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-500/10 border border-blue-500/20 rounded-xl sm:rounded-2xl flex items-center justify-center text-blue-500 shadow-lg shadow-blue-500/5">
                                    <Bot className="w-5 h-5 sm:w-6 sm:h-6" />
                                </div>
                                <h1 className="text-xl sm:text-2xl font-bold text-zinc-100 tracking-tight truncate">
                                    {bot.name}
                                </h1>
                            </div>

                            {/* Bottom: Badges & Buttons */}
                            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                                {bot.phone_number && (
                                    <>
                                        <div className="flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-amber-500/5 border border-amber-500/20 rounded-lg sm:rounded-xl text-amber-500 text-[10px] sm:text-xs font-semibold shadow-sm shadow-amber-500/5">
                                            <Phone className="w-3 h-3 sm:w-4 sm:h-4" />
                                            <span className="truncate max-w-[100px] sm:max-w-none">{bot.phone_number}</span>
                                        </div>
                                        <div className="hidden lg:block h-5 w-[1px] bg-zinc-700/80 mx-1" />
                                    </>
                                )}
                                <div className={`inline-flex items-center justify-center gap-2 w-[110px] sm:w-[140px] py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-semibold uppercase tracking-widest border transition-all ${isConnected
                                    ? bot.is_paused
                                        ? 'bg-orange-500/5 border-orange-500/20 text-orange-500'
                                        : 'bg-emerald-500/5 border-emerald-500/20 text-emerald-500'
                                    : 'bg-zinc-500/5 border-zinc-500/20 text-zinc-500'
                                    }`}>
                                    <Circle className={`w-1.5 h-1.5 sm:w-2 sm:h-2 flex-shrink-0 fill-current ${isConnected && !bot.is_paused ? 'animate-pulse' : ''}`} />
                                    <span className="truncate">{isConnected ? (bot.is_paused ? 'PAUSED' : 'CONNECTED') : 'DISCONNECTED'}</span>
                                </div>

                                <div className="hidden lg:block h-5 w-[1px] bg-zinc-700/80 mx-1" />

                                <div className="w-full sm:w-[145px]">
                                    {/* Show Connect Now button when never connected (no phone number) */}
                                    {!isConnected && !bot.phone_number && (
                                        <Link
                                            href={`/dashboard/bots/${botId}/connect`}
                                            className="w-full inline-flex items-center justify-center gap-2 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-semibold border transition-all duration-300 bg-blue-600 border-blue-500 text-white hover:bg-blue-500 shadow-lg shadow-blue-500/25 active:scale-95"
                                        >
                                            <Phone className="w-3 h-3 sm:w-4 sm:h-4" />
                                            <span className="font-semibold tracking-tight uppercase">CONNECT</span>
                                        </Link>
                                    )}
                                    {/* Show Reconnect button when disconnected but has phone number */}
                                    {!isConnected && bot.phone_number && (
                                        <Link
                                            href={`/dashboard/bots/${botId}/connect`}
                                            className="w-full inline-flex items-center justify-center gap-2 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-semibold border transition-all duration-300 bg-blue-600 border-blue-500 text-white hover:bg-blue-500 shadow-lg shadow-blue-500/25 active:scale-95"
                                        >
                                            <RefreshCw className="w-3 h-3 sm:w-4 sm:h-4" />
                                            <span className="font-semibold tracking-tight uppercase">RECONNECT</span>
                                        </Link>
                                    )}
                                    {/* Show Pause/Resume button when connected */}
                                    {isConnected && (
                                        <button
                                            onClick={handleToggleBotPause}
                                            disabled={isBotPausing}
                                            className={`w-full inline-flex items-center justify-center gap-2 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-semibold border transition-all duration-300 ${isBotPausing || bot.is_paused
                                                ? 'bg-blue-600 border-blue-500 text-white hover:bg-blue-500 shadow-lg shadow-blue-500/25'
                                                : 'bg-zinc-900 border-red-500/40 text-red-500 hover:bg-red-500/10 hover:border-red-500/60 shadow-xl'
                                                } active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed`}
                                        >
                                            {isBotPausing ? (
                                                <RefreshCw className="w-3 h-3 sm:w-3.5 sm:h-3.5 animate-spin" />
                                            ) : bot.is_paused ? (
                                                <Play className="w-3 h-3 sm:w-4 sm:h-4 fill-current" />
                                            ) : (
                                                <Pause className="w-3 h-3 sm:w-4 sm:h-4 fill-current" />
                                            )}
                                            <span className="font-semibold tracking-tight uppercase">
                                                {isBotPausing ? 'PROCESSING...' : (bot.is_paused ? 'RESUME' : 'PAUSE')}
                                            </span>
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                            <div className="bg-[#0e0e11] border border-zinc-800/50 rounded-xl p-4 sm:p-6 hover:bg-zinc-900/30 transition-all">
                                <div className="flex items-center justify-between mb-3 sm:mb-4">
                                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-500/10 rounded-lg sm:rounded-xl flex items-center justify-center">
                                        <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />
                                    </div>
                                </div>
                                <div className="text-xl sm:text-3xl font-bold text-zinc-100 mb-1 font-mono tracking-tight">{stats.totalReminders}</div>
                                <div className="text-xs sm:text-sm text-zinc-500">{stats.activeReminders} active reminders</div>
                            </div>
                            {hasModuleAccess('auto_reply', botId) && (
                                <div className="bg-[#0e0e11] border border-zinc-800/50 rounded-xl p-4 sm:p-6 hover:bg-zinc-900/30 transition-all">
                                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-500/10 rounded-lg sm:rounded-xl flex items-center justify-center mb-3 sm:mb-4 text-blue-400"><Zap className="w-4 h-4 sm:w-5 sm:h-5" /></div>
                                    <div className="text-xl sm:text-3xl font-bold text-zinc-100 mb-1 font-mono tracking-tight">{stats.activeRules}</div>
                                    <div className="text-xs sm:text-sm text-zinc-500">{stats.totalRules} total rules</div>
                                </div>
                            )}
                            {hasModuleAccess('campaigns', botId) && (
                                <div className="bg-[#0e0e11] border border-zinc-800/50 rounded-xl p-4 sm:p-6 hover:bg-zinc-900/30 transition-all col-span-2 sm:col-span-1">
                                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-500/10 rounded-lg sm:rounded-xl flex items-center justify-center mb-3 sm:mb-4 text-blue-400"><Megaphone className="w-4 h-4 sm:w-5 sm:h-5" /></div>
                                    <div className="text-xl sm:text-3xl font-bold text-zinc-100 mb-1 font-mono tracking-tight">{stats.totalCampaigns}</div>
                                    <div className="text-xs sm:text-sm text-zinc-500">{stats.activeCampaigns} active broadcasts</div>
                                </div>
                            )}
                        </div>

                        <div className="mt-6 sm:mt-8 space-y-4 sm:space-y-6">
                            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6">
                                <div className={`${isAdmin ? 'xl:col-span-2' : 'xl:col-span-3'}`}>
                                    <ActivityChart title="Bot Traffic & Load" data={chartData} timeRange={chartTimeRange} onTimeRangeChange={setChartTimeRange} lastUpdated={dataUpdatedAt} />
                                </div>
                                {isAdmin && (
                                    <div className="xl:col-span-1">
                                        <RecentActivityList title="LIVE LOGS" botId={botId} logs={activityLogs} className="h-[300px] sm:h-[400px]" />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'rules' && hasModuleAccess('auto_reply', botId) && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                        <RulesTable botId={botId} />
                    </div>
                )}

                {activeTab === 'ai-assistant' && hasModuleAccess('ai_assistant', botId) && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                        <AIAssistantPanel botId={botId} subTab="config" />
                    </div>
                )}

                {activeTab === 'ai-config' && hasModuleAccess('ai_assistant', botId) && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                        <AIAssistantPanel botId={botId} subTab="config" />
                    </div>
                )}

                {activeTab === 'ai-mappings' && hasModuleAccess('ai_assistant', botId) && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                        <AIAssistantPanel botId={botId} subTab="mappings" />
                    </div>
                )}

                {activeTab === 'campaigns' && hasModuleAccess('campaigns', botId) && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                        <CampaignsTable botId={botId} />
                    </div>
                )}

                {activeTab === 'reminders' && hasModuleAccess('reminders', botId) && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                        <RemindersTable botId={botId} />
                    </div>
                )}

                {activeTab === 'settings' && (
                    <div className="max-w-4xl mx-auto py-10 animate-in fade-in slide-in-from-bottom-2 duration-500">
                        <div className="bg-zinc-900/40 border border-zinc-800 p-10 rounded-3xl space-y-8">
                            <h3 className="text-xl font-bold text-white border-b border-zinc-800 pb-6">Bot Settings</h3>
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-3 tracking-widest">Bot Name</label>
                                    <input type="text" defaultValue={bot.name} className="w-full bg-zinc-950 border border-zinc-800 p-4 rounded-2xl text-white outline-none focus:border-blue-500 transition-all font-medium" />
                                </div>
                                <div className="pt-4 flex justify-between items-center">
                                    <div>
                                        <label className="block text-xs font-bold text-zinc-500 uppercase mb-1 tracking-widest">Bot ID</label>
                                        <code className="text-[10px] text-zinc-600 font-mono">{bot.id}</code>
                                    </div>
                                    <button className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-500/20 transition-all">
                                        Save Changes
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

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
        </div>
    )
}
