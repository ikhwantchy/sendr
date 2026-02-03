'use client'

import { useState, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'next/navigation'
import { api } from '@/lib/api'
import { usePermissions } from '@/hooks/usePermissions'
import { toast } from 'sonner'
import Link from 'next/link'
import CampaignDetailModal from '@/components/modals/CampaignDetailModal'
import { 
    Megaphone, 
    Plus, 
    MagnifyingGlass, 
    Calendar,
    CheckCircle,
    Clock,
    XCircle,
    PaperPlaneTilt,
    Play,
    Pause,
    Trash,
    Eye,
    Lightning,
    ArrowsClockwise
} from '@phosphor-icons/react'

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
    message_template: string
}

export default function UserCampaignsPage() {
    const searchParams = useSearchParams()
    const botIdParam = searchParams?.get('botId')
    const queryClient = useQueryClient()
    
    const { permissions, filterBots, isAdmin } = usePermissions()
    const [selectedBotId, setSelectedBotId] = useState<string>(botIdParam || '')
    const [searchQuery, setSearchQuery] = useState('')
    const [actionLoading, setActionLoading] = useState<string | null>(null)
    const [detailModal, setDetailModal] = useState<{ isOpen: boolean; campaign: Campaign | null }>({
        isOpen: false,
        campaign: null
    })

    // Get bots that user can create campaigns for
    const campaignBotIds = useMemo(() => {
        if (isAdmin) return null // admin has all access
        return permissions
            ?.filter((p: any) => p.can_create_campaigns === 1 || p.can_create_campaigns === true)
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

    // Filter to only bots user has campaign access to
    const myBots = useMemo(() => {
        const filtered = filterBots(allBots || [])
        if (isAdmin) return filtered
        return filtered.filter((bot: any) => campaignBotIds?.includes(bot.id))
    }, [allBots, filterBots, campaignBotIds, isAdmin])

    // Auto-select first bot if none selected
    useMemo(() => {
        if (!selectedBotId && myBots.length > 0) {
            setSelectedBotId(myBots[0].id)
        }
    }, [myBots, selectedBotId])

    // Fetch campaigns for selected bot
    const { data: campaigns, isLoading, refetch } = useQuery({
        queryKey: ['campaigns', selectedBotId],
        queryFn: async () => {
            if (!selectedBotId) return []
            const res = await api.campaigns.getByBot(selectedBotId)
            return res.data.data || []
        },
        enabled: !!selectedBotId,
    })

    // Filter campaigns by search
    const filteredCampaigns = useMemo(() => {
        if (!searchQuery) return campaigns || []
        return (campaigns || []).filter((c: any) => 
            c.name?.toLowerCase().includes(searchQuery.toLowerCase())
        )
    }, [campaigns, searchQuery])

    const statusConfig: Record<string, { icon: any; color: string; bg: string; label: string }> = {
        draft: { icon: Clock, color: 'text-zinc-500', bg: 'bg-zinc-100 dark:bg-zinc-800', label: 'Draft' },
        scheduled: { icon: Calendar, color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-500/10', label: 'Scheduled' },
        running: { icon: Lightning, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-500/10', label: 'Running' },
        paused: { icon: Pause, color: 'text-yellow-500', bg: 'bg-yellow-50 dark:bg-yellow-500/10', label: 'Paused' },
        completed: { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-500/10', label: 'Completed' },
        failed: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-500/10', label: 'Failed' },
        cancelled: { icon: XCircle, color: 'text-zinc-500', bg: 'bg-zinc-100 dark:bg-zinc-800', label: 'Cancelled' },
    }

    const getProgress = (campaign: Campaign) => {
        if (campaign.total_contacts === 0) return 0
        return Math.round((campaign.sent_count / campaign.total_contacts) * 100)
    }

    // Campaign Actions
    const startCampaign = async (id: string) => {
        setActionLoading(id)
        try {
            const token = localStorage.getItem('token')
            const response = await fetch(`http://localhost:3001/api/campaigns/${id}/start`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (response.ok) {
                toast.success('Campaign started')
                refetch()
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
            const response = await fetch(`http://localhost:3001/api/campaigns/${id}/pause`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (response.ok) {
                toast.success('Campaign paused')
                refetch()
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
            const response = await fetch(`http://localhost:3001/api/campaigns/${id}/resume`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (response.ok) {
                toast.success('Campaign resumed')
                refetch()
            } else {
                toast.error('Failed to resume campaign')
            }
        } catch (error) {
            toast.error('Failed to resume campaign')
        } finally {
            setActionLoading(null)
        }
    }

    const deleteCampaign = async (id: string, name: string) => {
        if (!confirm(`Are you sure you want to delete "${name}"?`)) return
        try {
            await api.campaigns.delete(id)
            toast.success('Campaign deleted')
            refetch()
        } catch (error) {
            toast.error('Failed to delete campaign')
        }
    }

    if (!isAdmin && (!campaignBotIds || campaignBotIds.length === 0)) {
        return (
            <div className="max-w-2xl mx-auto text-center py-20">
                <Megaphone size={64} className="mx-auto text-zinc-400 mb-4" />
                <h1 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">No Campaign Access</h1>
                <p className="text-zinc-500 mb-6">You don't have permission to create campaigns for any bots.</p>
                <Link
                    href="/user"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    Back to Dashboard
                </Link>
            </div>
        )
    }

    return (
        <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Campaigns</h1>
                    <p className="text-zinc-500 mt-1">Manage your message campaigns</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => refetch()}
                        className="p-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
                    >
                        <ArrowsClockwise size={18} className="text-zinc-500" />
                    </button>
                    <Link
                        href={`/user/campaigns/create?botId=${selectedBotId}`}
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                    >
                        <Plus size={18} />
                        New Campaign
                    </Link>
                </div>
            </div>

            {/* Bot Selector & Search */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <select
                    value={selectedBotId}
                    onChange={(e) => setSelectedBotId(e.target.value)}
                    className="px-4 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                    {myBots.map((bot: any) => (
                        <option key={bot.id} value={bot.id}>{bot.name}</option>
                    ))}
                </select>
                <div className="relative flex-1">
                    <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                    <input
                        type="text"
                        placeholder="Search campaigns..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4">
                    <p className="text-2xl font-bold text-zinc-900 dark:text-white">{campaigns?.length || 0}</p>
                    <p className="text-xs text-zinc-500">Total Campaigns</p>
                </div>
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4">
                    <p className="text-2xl font-bold text-blue-500">{campaigns?.filter((c: any) => c.status === 'running').length || 0}</p>
                    <p className="text-xs text-zinc-500">Running</p>
                </div>
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4">
                    <p className="text-2xl font-bold text-green-500">{campaigns?.reduce((acc: number, c: any) => acc + (c.sent_count || 0), 0) || 0}</p>
                    <p className="text-xs text-zinc-500">Messages Sent</p>
                </div>
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4">
                    <p className="text-2xl font-bold text-green-500">{campaigns?.filter((c: any) => c.status === 'completed').length || 0}</p>
                    <p className="text-xs text-zinc-500">Completed</p>
                </div>
            </div>

            {/* Campaigns List */}
            {isLoading ? (
                <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 animate-pulse">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-lg bg-zinc-200 dark:bg-zinc-800" />
                                <div className="flex-1">
                                    <div className="h-4 w-48 bg-zinc-200 dark:bg-zinc-800 rounded mb-2" />
                                    <div className="h-3 w-32 bg-zinc-200 dark:bg-zinc-800 rounded" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : filteredCampaigns.length === 0 ? (
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-12 text-center">
                    <Megaphone size={56} className="mx-auto text-zinc-400 mb-4" />
                    <h3 className="text-lg font-medium text-zinc-900 dark:text-white mb-2">No Campaigns Yet</h3>
                    <p className="text-zinc-500 mb-6">Create your first campaign to start sending messages.</p>
                    <Link
                        href={`/user/campaigns/create?botId=${selectedBotId}`}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        <Plus size={16} />
                        Create Campaign
                    </Link>
                </div>
            ) : (
                <div className="space-y-3">
                    {filteredCampaigns.map((campaign: Campaign) => {
                        const status = statusConfig[campaign.status] || statusConfig.draft
                        const StatusIcon = status.icon
                        const progress = getProgress(campaign)
                        const isLoading = actionLoading === campaign.id
                        
                        return (
                            <div
                                key={campaign.id}
                                className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
                            >
                                <div className="flex items-start gap-4">
                                    <div className={`w-10 h-10 rounded-lg ${status.bg} flex items-center justify-center flex-shrink-0`}>
                                        <StatusIcon size={20} className={status.color} weight="fill" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-3 mb-1">
                                            <h3 className="font-semibold text-zinc-900 dark:text-white truncate">
                                                {campaign.name}
                                            </h3>
                                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${status.bg} ${status.color}`}>
                                                {status.label}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-3 text-sm text-zinc-500">
                                            <span>{campaign.total_contacts || 0} contacts</span>
                                            {campaign.sent_count > 0 && (
                                                <>
                                                    <span>•</span>
                                                    <span className="text-green-500">{campaign.sent_count} sent</span>
                                                </>
                                            )}
                                            {campaign.failed_count > 0 && (
                                                <>
                                                    <span>•</span>
                                                    <span className="text-red-500">{campaign.failed_count} failed</span>
                                                </>
                                            )}
                                        </div>

                                        {/* Progress Bar for running/paused/completed */}
                                        {(campaign.status === 'running' || campaign.status === 'paused' || campaign.status === 'completed') && (
                                            <div className="mt-3">
                                                <div className="flex items-center justify-between text-xs mb-1">
                                                    <span className="text-zinc-500">Progress</span>
                                                    <span className="text-zinc-900 dark:text-white font-medium">{progress}%</span>
                                                </div>
                                                <div className="h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full transition-all duration-500 ${
                                                            campaign.status === 'completed' ? 'bg-green-500' :
                                                            campaign.status === 'paused' ? 'bg-yellow-500' : 'bg-blue-500'
                                                        }`}
                                                        style={{ width: `${progress}%` }}
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        {/* View Details */}
                                        <button
                                            onClick={() => setDetailModal({ isOpen: true, campaign })}
                                            className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors text-zinc-500 hover:text-blue-500"
                                            title="View Details"
                                        >
                                            <Eye size={18} />
                                        </button>

                                        {/* Start (for draft/scheduled) */}
                                        {(campaign.status === 'draft' || campaign.status === 'scheduled') && (
                                            <button
                                                onClick={() => startCampaign(campaign.id)}
                                                disabled={isLoading}
                                                className="p-2 hover:bg-green-50 dark:hover:bg-green-500/10 rounded-lg transition-colors text-zinc-500 hover:text-green-500 disabled:opacity-50"
                                                title="Start Campaign"
                                            >
                                                <Play size={18} weight="fill" />
                                            </button>
                                        )}

                                        {/* Pause (for running) */}
                                        {campaign.status === 'running' && (
                                            <button
                                                onClick={() => pauseCampaign(campaign.id)}
                                                disabled={isLoading}
                                                className="p-2 hover:bg-yellow-50 dark:hover:bg-yellow-500/10 rounded-lg transition-colors text-zinc-500 hover:text-yellow-500 disabled:opacity-50"
                                                title="Pause Campaign"
                                            >
                                                <Pause size={18} weight="fill" />
                                            </button>
                                        )}

                                        {/* Resume (for paused) */}
                                        {campaign.status === 'paused' && (
                                            <button
                                                onClick={() => resumeCampaign(campaign.id)}
                                                disabled={isLoading}
                                                className="p-2 hover:bg-green-50 dark:hover:bg-green-500/10 rounded-lg transition-colors text-zinc-500 hover:text-green-500 disabled:opacity-50"
                                                title="Resume Campaign"
                                            >
                                                <Play size={18} weight="fill" />
                                            </button>
                                        )}

                                        {/* Delete */}
                                        <button
                                            onClick={() => deleteCampaign(campaign.id, campaign.name)}
                                            className="p-2 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors text-zinc-500 hover:text-red-500"
                                            title="Delete Campaign"
                                        >
                                            <Trash size={18} />
                                        </button>
                                    </div>
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
