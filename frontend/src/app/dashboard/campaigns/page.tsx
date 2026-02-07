'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
    Plus, Send, Users, Play, Pause, Trash2,
    Clock, CheckCircle2, XCircle, AlertCircle,
    RefreshCw, BarChart3, Shield, Zap, Loader2,
    Eye
} from 'lucide-react'
import { toast } from 'sonner'
import CampaignDetailModal from '@/components/modals/CampaignDetailModal'
import { API_URL } from '@/lib/api'

interface Campaign {
    id: string
    name: string
    status: 'draft' | 'scheduled' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled'
    total_contacts: number
    sent_count: number
    failed_count: number
    delay_preset: string
    scheduled_at: string | null
    started_at: string | null
    completed_at: string | null
    created_at: string
    bot_id: string
    bot_name?: string
    message_template: string // Added to match modal interface
}

export default function CampaignsPage() {
    const router = useRouter()
    const [campaigns, setCampaigns] = useState<Campaign[]>([])
    const [loading, setLoading] = useState(true)
    const [isRefreshing, setIsRefreshing] = useState(false)
    const [actionLoading, setActionLoading] = useState<string | null>(null)
    const [detailModal, setDetailModal] = useState<{ isOpen: boolean; campaign: Campaign | null }>({
        isOpen: false,
        campaign: null
    })

    useEffect(() => {
        fetchCampaigns().then(() => {
            // Check for 'open' param to automatically show detail modal
            const urlParams = new URLSearchParams(window.location.search)
            const openId = urlParams.get('open')
            if (openId) {
                // Find the campaign in the loaded list
                // Note: fetchCampaigns updates state, but we need the data here or wait
            }
        })
    }, [])

    // New effect to handle auto-opening once campaigns are loaded
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search)
        const openId = urlParams.get('open')
        if (openId && campaigns.length > 0) {
            const campaign = campaigns.find(c => c.id === openId)
            if (campaign) {
                setDetailModal({ isOpen: true, campaign })
                // Remove the param from URL to avoid re-opening on manual refresh
                const newUrl = window.location.pathname + (window.location.search.replace(`open=${openId}`, '').replace('&&', '&').replace('?&', '?'))
                window.history.replaceState({}, '', newUrl)
            }
        }
    }, [campaigns])

    const fetchCampaigns = async (isBackground = false) => {
        if (!isBackground) setLoading(true)
        if (isBackground) setIsRefreshing(true)
        try {
            const token = localStorage.getItem('token')
            const urlParams = new URLSearchParams(window.location.search)
            const botId = urlParams.get('botId')

            let url = `${API_URL}/api/campaigns`
            if (botId) {
                url = `${API_URL}/api/campaigns/bot/${botId}`
            }

            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            const data = await response.json()

            if (data.success) {
                setCampaigns(data.data || [])
            }
        } catch (error) {
            console.error('Failed to fetch campaigns:', error)
            toast.error('Failed to load campaigns')
        } finally {
            setLoading(false)
            setIsRefreshing(false)
        }
    }

    const handleRefresh = () => {
        fetchCampaigns(true)
    }

    const startCampaign = async (id: string) => {
        setActionLoading(id)
        try {
            const token = localStorage.getItem('token')
            const response = await fetch(`${API_URL}/api/campaigns/${id}/start`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (response.ok) {
                toast.success('Campaign started')
                fetchCampaigns()
            } else {
                const data = await response.json()
                toast.error(data.error || 'Failed to start campaign')
            }
        } catch (error) {
            toast.error('Failed to start campaign')
        } finally {
            setActionLoading(null)
        }
    }

    const pauseCampaign = async (id: string) => {
        setActionLoading(id)
        try {
            const token = localStorage.getItem('token')
            const response = await fetch(`${API_URL}/api/campaigns/${id}/pause`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (response.ok) {
                toast.success('Campaign paused')
                fetchCampaigns()
            } else {
                toast.error('Failed to pause campaign')
            }
        } catch (error) {
            toast.error('Failed to pause campaign')
        } finally {
            setActionLoading(null)
        }
    }

    const resumeCampaign = async (id: string) => {
        setActionLoading(id)
        try {
            const token = localStorage.getItem('token')
            const response = await fetch(`${API_URL}/api/campaigns/${id}/resume`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (response.ok) {
                toast.success('Campaign resumed')
                fetchCampaigns()
            } else {
                toast.error('Failed to resume campaign')
            }
        } catch (error) {
            toast.error('Failed to resume campaign')
        } finally {
            setActionLoading(null)
        }
    }

    const cancelCampaign = async (id: string, name: string) => {
        if (!confirm('Are you sure you want to cancel this campaign?')) return
        setActionLoading(id)
        try {
            const token = localStorage.getItem('token')
            const response = await fetch(`${API_URL}/api/campaigns/${id}/cancel`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (response.ok) {
                toast.success('Campaign cancelled')
                fetchCampaigns()
            } else {
                toast.error('Failed to cancel campaign')
            }
        } catch (error) {
            toast.error('Failed to cancel campaign')
        } finally {
            setActionLoading(null)
        }
    }

    const retryFailed = async (id: string) => {
        setActionLoading(id)
        try {
            const token = localStorage.getItem('token')
            const response = await fetch(`${API_URL}/api/campaigns/${id}/retry-failed`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            })
            const data = await response.json()
            if (response.ok) {
                toast.success(`Retrying ${data.data?.count || 0} failed recipients`)
                fetchCampaigns()
            } else {
                toast.error('Failed to retry')
            }
        } catch (error) {
            toast.error('Failed to retry failed recipients')
        } finally {
            setActionLoading(null)
        }
    }

    const deleteCampaign = async (id: string, name: string) => {
        if (!confirm(`Are you sure you want to delete "${name}"?`)) return
        try {
            const token = localStorage.getItem('token')
            const response = await fetch(`${API_URL}/api/campaigns/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (response.ok) {
                toast.success('Campaign deleted')
                fetchCampaigns()
            } else {
                toast.error('Failed to delete campaign')
            }
        } catch (error) {
            toast.error('Failed to delete campaign')
        }
    }

    const getStatusConfig = (status: string) => {
        const configs: Record<string, { label: string; color: string; icon: any }> = {
            draft: { label: 'Draft', color: 'bg-zinc-500/10 text-zinc-400', icon: Clock },
            scheduled: { label: 'Scheduled', color: 'bg-purple-500/10 text-purple-500', icon: Clock },
            running: { label: 'Running', color: 'bg-blue-500/10 text-blue-500', icon: Zap },
            paused: { label: 'Paused', color: 'bg-yellow-500/10 text-yellow-500', icon: Pause },
            completed: { label: 'Completed', color: 'bg-green-500/10 text-green-500', icon: CheckCircle2 },
            failed: { label: 'Failed', color: 'bg-red-500/10 text-red-500', icon: XCircle },
            cancelled: { label: 'Cancelled', color: 'bg-zinc-500/10 text-zinc-400', icon: XCircle },
        }
        return configs[status] || configs.draft
    }

    const getDelayPresetInfo = (preset: string) => {
        const presets: Record<string, { label: string; color: string }> = {
            safe: { label: 'Safe Mode', color: 'text-green-500' },
            moderate: { label: 'Moderate', color: 'text-yellow-500' },
            aggressive: { label: 'Fast', color: 'text-orange-500' },
        }
        return presets[preset] || presets.moderate
    }

    const getProgress = (campaign: Campaign) => {
        if (campaign.total_contacts === 0) return 0
        return Math.round((campaign.sent_count / campaign.total_contacts) * 100)
    }

    if (loading) {
        return (
            <div className="p-4 sm:p-6 lg:p-8 min-h-screen bg-zinc-50 dark:bg-[#09090b] flex items-center justify-center">
                <div className="text-center">
                    <div className="w-8 h-8 border-2 border-zinc-300 dark:border-zinc-700 border-t-zinc-600 dark:border-t-white rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-zinc-500 text-sm">Loading campaigns...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8 min-h-screen bg-zinc-50 dark:bg-[#09090b] text-zinc-900 dark:text-zinc-100">
            {/* Header - Same as Reminder */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-xl sm:text-2xl font-semibold text-zinc-900 dark:text-white tracking-tight">Broadcast Campaigns</h1>
                        {isRefreshing && (
                            <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                        )}
                    </div>
                    <p className="text-zinc-500 dark:text-zinc-100 text-xs sm:text-sm mt-1">Send bulk messages to your contacts with anti-spam protection</p>
                </div>
                <div className="flex items-center gap-2 sm:gap-3">
                    {/* Refresh Button */}
                    <button
                        onClick={handleRefresh}
                        disabled={isRefreshing}
                        className={`p-2 bg-white dark:bg-zinc-900 border rounded-lg transition-all ${isRefreshing
                            ? 'border-blue-500/50 text-blue-400'
                            : 'border-zinc-200 dark:border-zinc-800/50 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:border-zinc-300 dark:hover:border-zinc-700'
                            }`}
                    >
                        <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                        onClick={() => router.push('/dashboard/campaigns/create')}
                        className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-zinc-900 dark:bg-white text-white dark:text-black hover:bg-zinc-800 dark:hover:bg-zinc-200 rounded-lg text-sm font-medium transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        <span className="hidden sm:inline">Create Campaign</span>
                        <span className="sm:hidden">Create</span>
                    </button>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
                {[
                    {
                        label: 'Total Campaigns',
                        value: campaigns.length,
                        icon: Send,
                        color: 'text-blue-500'
                    },
                    {
                        label: 'Running Now',
                        value: campaigns.filter(c => c.status === 'running').length,
                        icon: Zap,
                        color: 'text-yellow-500'
                    },
                    {
                        label: 'Messages Sent',
                        value: campaigns.reduce((acc, c) => acc + (c.sent_count || 0), 0),
                        icon: CheckCircle2,
                        color: 'text-green-500'
                    },
                    {
                        label: 'Protected by Anti-Spam',
                        value: '100%',
                        icon: Shield,
                        color: 'text-purple-500'
                    },
                ].map((stat, i) => (
                    <div key={i} className="bg-white dark:bg-[#18181b] border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 sm:p-4 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors shadow-sm dark:shadow-none">
                        <div className="flex items-center justify-between mb-2">
                            <stat.icon className={`w-4 h-4 sm:w-5 sm:h-5 ${stat.color}`} />
                        </div>
                        <div className="text-lg sm:text-2xl font-bold text-zinc-900 dark:text-white">{stat.value}</div>
                        <div className="text-[10px] sm:text-xs text-zinc-500 truncate">{stat.label}</div>
                    </div>
                ))}
            </div>

            {/* Campaigns Grid - Same layout as Reminder */}
            {campaigns.length === 0 ? (
                <div className="bg-white dark:bg-[#18181b] border border-zinc-200 dark:border-zinc-800 rounded-xl p-8 sm:p-12 text-center shadow-sm dark:shadow-none">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Send className="w-6 h-6 sm:w-8 sm:h-8 text-zinc-400 dark:text-zinc-600" />
                    </div>
                    <h3 className="text-base sm:text-lg font-semibold text-zinc-900 dark:text-white mb-2">No Campaigns Yet</h3>
                    <p className="text-zinc-500 text-xs sm:text-sm mb-6">Create your first broadcast campaign to reach your contacts</p>
                    <button
                        onClick={() => router.push('/dashboard/campaigns/create')}
                        className="px-4 py-2 bg-zinc-900 dark:bg-white text-white dark:text-black hover:bg-zinc-800 dark:hover:bg-zinc-200 rounded-lg text-sm font-medium transition-colors"
                    >
                        Create Campaign
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
                    {campaigns.map((campaign) => {
                        const statusConfig = getStatusConfig(campaign.status)
                        const delayInfo = getDelayPresetInfo(campaign.delay_preset)
                        const progress = getProgress(campaign)
                        const StatusIcon = statusConfig.icon
                        const isLoading = actionLoading === campaign.id

                        return (
                            <div
                                key={campaign.id}
                                className="bg-white dark:bg-[#18181b] border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 sm:p-6 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors shadow-sm dark:shadow-none"
                            >
                                {/* Header - Same as Reminder */}
                                <div className="flex items-start justify-between mb-3 sm:mb-4">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 sm:gap-3 mb-1 flex-wrap">
                                            <h3 className="text-base sm:text-lg font-semibold text-zinc-900 dark:text-white truncate">{campaign.name}</h3>
                                            <span className={`px-2 py-0.5 rounded text-[10px] sm:text-xs font-medium flex items-center gap-1 ${statusConfig.color}`}>
                                                <StatusIcon className="w-3 h-3" />
                                                {statusConfig.label}
                                            </span>
                                        </div>
                                        {campaign.bot_name && (
                                            <p className="text-zinc-500 text-xs sm:text-sm">via {campaign.bot_name}</p>
                                        )}
                                    </div>
                                </div>

                                {/* Progress Bar */}
                                {(campaign.status === 'running' || campaign.status === 'paused' || campaign.status === 'completed') && (
                                    <div className="mb-3 sm:mb-4">
                                        <div className="flex items-center justify-between text-[10px] sm:text-xs mb-1">
                                            <span className="text-zinc-500">Progress</span>
                                            <span className="text-zinc-900 dark:text-white font-medium">{campaign.sent_count} / {campaign.total_contacts} ({progress}%)</span>
                                        </div>
                                        <div className="h-1.5 sm:h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full transition-all duration-500 ${campaign.status === 'completed' ? 'bg-green-500' :
                                                    campaign.status === 'paused' ? 'bg-yellow-500' : 'bg-blue-500'
                                                    }`}
                                                style={{ width: `${progress}%` }}
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Info Grid - Same as Reminder */}
                                <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-3 sm:mb-4">
                                    <div className="bg-zinc-50 dark:bg-[#0d0d0f] border border-zinc-200 dark:border-zinc-800 rounded-lg p-2 sm:p-3">
                                        <div className="flex items-center gap-1.5 sm:gap-2 mb-1">
                                            <Users className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-zinc-500" />
                                            <span className="text-[10px] sm:text-xs text-zinc-500">Recipients</span>
                                        </div>
                                        <p className="text-xs sm:text-sm text-zinc-900 dark:text-white font-medium">{campaign.total_contacts} contacts</p>
                                    </div>

                                    <div className="bg-zinc-50 dark:bg-[#0d0d0f] border border-zinc-200 dark:border-zinc-800 rounded-lg p-2 sm:p-3">
                                        <div className="flex items-center gap-1.5 sm:gap-2 mb-1">
                                            <Shield className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-zinc-500" />
                                            <span className="text-[10px] sm:text-xs text-zinc-500">Anti-Spam</span>
                                        </div>
                                        <p className={`text-xs sm:text-sm font-medium ${delayInfo.color}`}>{delayInfo.label}</p>
                                    </div>
                                </div>

                                {/* Execution Info - Same as Reminder */}
                                <div className="bg-zinc-50 dark:bg-[#0d0d0f] border border-zinc-200 dark:border-zinc-800 rounded-lg p-2 sm:p-3 mb-3 sm:mb-4">
                                    <div className="grid grid-cols-3 gap-2 sm:gap-4">
                                        <div>
                                            <span className="text-[10px] sm:text-xs text-zinc-500 block mb-1">Sent</span>
                                            <div className="flex items-center gap-1.5 sm:gap-2">
                                                <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 bg-green-500 rounded-full"></div>
                                                <span className="text-xs sm:text-sm text-zinc-900 dark:text-white font-medium">{campaign.sent_count}</span>
                                            </div>
                                        </div>
                                        <div>
                                            <span className="text-[10px] sm:text-xs text-zinc-500 block mb-1">Failed</span>
                                            <div className="flex items-center gap-1.5 sm:gap-2">
                                                {campaign.failed_count > 0 && (
                                                    <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 bg-red-500 rounded-full"></div>
                                                )}
                                                <span className={`text-xs sm:text-sm font-medium ${campaign.failed_count > 0 ? 'text-red-500 dark:text-red-400' : 'text-zinc-900 dark:text-white'}`}>
                                                    {campaign.failed_count}
                                                </span>
                                            </div>
                                        </div>
                                        <div>
                                            <span className="text-[10px] sm:text-xs text-zinc-500 block mb-1">
                                                {campaign.scheduled_at && campaign.status === 'scheduled' ? 'Scheduled' : 'Created'}
                                            </span>
                                            <span className="text-xs sm:text-sm text-zinc-900 dark:text-white">
                                                {campaign.scheduled_at && campaign.status === 'scheduled'
                                                    ? new Date(campaign.scheduled_at).toLocaleString('id-ID', {
                                                        day: '2-digit',
                                                        month: 'short',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })
                                                    : new Date(campaign.created_at).toLocaleString('id-ID', {
                                                        day: '2-digit',
                                                        month: 'short',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })
                                                }
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Actions - Same pattern as Reminder */}
                                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                                    {/* Primary action based on status */}
                                    {campaign.status === 'draft' && (
                                        <button
                                            onClick={() => startCampaign(campaign.id)}
                                            disabled={isLoading}
                                            className="flex-1 flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 bg-green-500/10 text-green-600 dark:text-green-500 hover:bg-green-500/20 rounded-lg text-xs sm:text-sm font-medium transition-colors disabled:opacity-50"
                                        >
                                            {isLoading ? <RefreshCw className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" /> : <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                                            <span className="hidden sm:inline">Start Now</span>
                                            <span className="sm:hidden">Start</span>
                                        </button>
                                    )}

                                    {campaign.status === 'scheduled' && (
                                        <button
                                            onClick={() => startCampaign(campaign.id)}
                                            disabled={isLoading}
                                            className="flex-1 flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 bg-blue-500/10 text-blue-600 dark:text-blue-500 hover:bg-blue-500/20 rounded-lg text-xs sm:text-sm font-medium transition-colors disabled:opacity-50"
                                        >
                                            {isLoading ? <RefreshCw className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" /> : <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                                            <span className="hidden sm:inline">Start Now</span>
                                            <span className="sm:hidden">Start</span>
                                        </button>
                                    )}

                                    {campaign.status === 'running' && (
                                        <button
                                            onClick={() => pauseCampaign(campaign.id)}
                                            disabled={isLoading}
                                            className="flex-1 flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 bg-yellow-500/10 text-yellow-600 dark:text-yellow-500 hover:bg-yellow-500/20 rounded-lg text-xs sm:text-sm font-medium transition-colors disabled:opacity-50"
                                        >
                                            {isLoading ? <RefreshCw className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" /> : <Pause className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                                            Pause
                                        </button>
                                    )}

                                    {campaign.status === 'paused' && (
                                        <button
                                            onClick={() => resumeCampaign(campaign.id)}
                                            disabled={isLoading}
                                            className="flex-1 flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 bg-green-500/10 text-green-600 dark:text-green-500 hover:bg-green-500/20 rounded-lg text-xs sm:text-sm font-medium transition-colors disabled:opacity-50"
                                        >
                                            {isLoading ? <RefreshCw className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" /> : <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                                            Resume
                                        </button>
                                    )}

                                    {(campaign.status === 'completed' || campaign.status === 'failed') && campaign.failed_count > 0 && (
                                        <button
                                            onClick={() => retryFailed(campaign.id)}
                                            disabled={isLoading}
                                            className="flex-1 flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 bg-orange-500/10 text-orange-600 dark:text-orange-500 hover:bg-orange-500/20 rounded-lg text-xs sm:text-sm font-medium transition-colors disabled:opacity-50"
                                        >
                                            {isLoading ? <RefreshCw className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                                            <span className="hidden sm:inline">Retry Failed ({campaign.failed_count})</span>
                                            <span className="sm:hidden">Retry</span>
                                        </button>
                                    )}

                                    {(campaign.status === 'completed' || campaign.status === 'cancelled') && campaign.failed_count === 0 && (
                                        <button
                                            onClick={() => setDetailModal({ isOpen: true, campaign })}
                                            className="flex-1 flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-blue-500 dark:text-zinc-400 dark:hover:text-blue-400 rounded-lg text-xs sm:text-sm font-medium transition-colors"
                                        >
                                            <BarChart3 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                            <span className="hidden sm:inline">View Report</span>
                                            <span className="sm:hidden">Report</span>
                                        </button>
                                    )}

                                    {/* Eye button for any status */}
                                    <button
                                        onClick={() => setDetailModal({ isOpen: true, campaign })}
                                        className="px-2 sm:px-3 py-1.5 sm:py-2 bg-blue-500/10 text-blue-600 dark:text-blue-500 hover:bg-blue-500/20 rounded-lg transition-colors"
                                        title="View Recipients"
                                    >
                                        <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                    </button>

                                    {/* Cancel button for running/paused */}
                                    {(campaign.status === 'running' || campaign.status === 'paused') && (
                                        <button
                                            onClick={() => cancelCampaign(campaign.id, campaign.name)}
                                            disabled={isLoading}
                                            className="px-2 sm:px-3 py-1.5 sm:py-2 bg-red-500/10 text-red-600 dark:text-red-500 hover:bg-red-500/20 rounded-lg transition-colors disabled:opacity-50"
                                            title="Cancel Campaign"
                                        >
                                            <XCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                        </button>
                                    )}

                                    {/* Delete button */}
                                    <button
                                        onClick={() => deleteCampaign(campaign.id, campaign.name)}
                                        className="px-2 sm:px-3 py-1.5 sm:py-2 bg-red-500/10 text-red-600 dark:text-red-500 hover:bg-red-500/20 rounded-lg transition-colors"
                                        title="Delete"
                                    >
                                        <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                    </button>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
            {/* Campaign Detail Modal */}
            <CampaignDetailModal
                isOpen={detailModal.isOpen}
                onClose={() => setDetailModal({ isOpen: false, campaign: null })}
                campaign={detailModal.campaign}
            />
        </div>
    )
}
