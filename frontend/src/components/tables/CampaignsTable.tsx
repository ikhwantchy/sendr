'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, API_URL } from '@/lib/api'
import { toast } from 'sonner'
import { Megaphone, Trash2, ChevronDown, Circle, Check, X, Calendar, Users, Send, Play, Pause, RefreshCw, Eye, Plus } from 'lucide-react'
import CampaignDetailModal from '@/components/modals/CampaignDetailModal'

interface Campaign {
    id: string
    name: string
    message_template: string
    status: 'draft' | 'scheduled' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled'
    total_contacts: number
    sent_count: number
    failed_count: number
    delay_preset: string
    scheduled_at?: string
    created_at: string
}

interface CampaignsTableProps {
    botId: string
}

export default function CampaignsTable({ botId }: CampaignsTableProps) {
    const queryClient = useQueryClient()
    const router = useRouter()
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
    const [expandedId, setExpandedId] = useState<string | null>(null)
    const [actionLoading, setActionLoading] = useState<string | null>(null)
    const [currentPage, setCurrentPage] = useState(1)
    const itemsPerPage = 10
    const [detailModal, setDetailModal] = useState<{ isOpen: boolean; campaign: Campaign | null }>({
        isOpen: false,
        campaign: null
    })

    const { data: campaigns, isLoading } = useQuery({
        queryKey: ['campaigns', botId],
        queryFn: async () => {
            const response = await api.campaigns.getByBot(botId)
            return response.data.data || response.data || []
        },
        refetchInterval: 3000,
    })

    const paginatedCampaigns = (campaigns || []).slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
    const totalPages = Math.ceil((campaigns || []).length / itemsPerPage)

    // Auto open detail modal if param exists
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search)
        const openId = urlParams.get('openCampaign')
        if (openId && campaigns && campaigns.length > 0) {
            const campaign = campaigns.find((c: any) => c.id === openId)
            if (campaign) {
                setDetailModal({ isOpen: true, campaign })
                // Clean up URL
                const newUrl = window.location.pathname + window.location.hash
                window.history.replaceState({}, '', newUrl)
            }
        }
    }, [campaigns])
    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            return await api.campaigns.delete(id)
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['campaigns', botId] })
            toast.success('Campaign deleted successfully')
            setDeleteConfirm(null)
        },
        onError: () => {
            toast.error('Failed to delete campaign')
        },
    })

    const getStatusConfig = (status: string) => {
        const configs: Record<string, { label: string; color: string; icon: any }> = {
            draft: {
                label: 'Draft',
                color: 'bg-zinc-500/10 border-zinc-500/20 text-zinc-500',
                icon: Circle,
            },
            scheduled: {
                label: 'Scheduled',
                color: 'bg-blue-500/10 border-blue-500/20 text-blue-500',
                icon: Calendar,
            },
            running: {
                label: 'Running',
                color: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-500',
                icon: Send,
            },
            paused: {
                label: 'Paused',
                color: 'bg-orange-500/10 border-orange-500/20 text-orange-500',
                icon: Pause,
            },
            completed: {
                label: 'Completed',
                color: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500',
                icon: Check,
            },
            failed: {
                label: 'Failed',
                color: 'bg-red-500/10 border-red-500/20 text-red-500',
                icon: X,
            },
            cancelled: {
                label: 'Cancelled',
                color: 'bg-zinc-500/10 border-zinc-500/20 text-zinc-400',
                icon: X,
            },
        }
        return configs[status] || configs.draft
    }

    const getProgress = (campaign: Campaign) => {
        const total = campaign.total_contacts || 0
        const processed = (campaign.sent_count || 0) + (campaign.failed_count || 0)
        if (total === 0) return 0
        return Math.min(100, Math.round((processed / total) * 100))
    }

    // Campaign actions
    const handleStart = async (id: string) => {
        setActionLoading(id)
        try {
            const token = localStorage.getItem('token')
            await fetch(`${API_URL}/api/campaigns/${id}/start`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            })
            queryClient.invalidateQueries({ queryKey: ['campaigns', botId] })
            toast.success('Campaign started')
        } catch (error) {
            toast.error('Failed to start campaign')
        } finally {
            setActionLoading(null)
        }
    }

    const handlePause = async (id: string) => {
        setActionLoading(id)
        try {
            const token = localStorage.getItem('token')
            await fetch(`${API_URL}/api/campaigns/${id}/pause`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            })
            queryClient.invalidateQueries({ queryKey: ['campaigns', botId] })
            toast.success('Campaign paused')
        } catch (error) {
            toast.error('Failed to pause campaign')
        } finally {
            setActionLoading(null)
        }
    }

    const handleResume = async (id: string) => {
        setActionLoading(id)
        try {
            const token = localStorage.getItem('token')
            await fetch(`${API_URL}/api/campaigns/${id}/resume`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            })
            queryClient.invalidateQueries({ queryKey: ['campaigns', botId] })
            toast.success('Campaign resumed')
        } catch (error) {
            toast.error('Failed to resume campaign')
        } finally {
            setActionLoading(null)
        }
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-24 bg-zinc-900/30 border border-zinc-800/50 rounded-2xl">
                <div className="relative w-12 h-12">
                    <div className="absolute inset-0 rounded-full border-2 border-zinc-800"></div>
                    <div className="absolute inset-0 rounded-full border-2 border-blue-500 border-t-transparent animate-spin"></div>
                </div>
            </div>
        )
    }

    if (!campaigns || campaigns.length === 0) {
        return (
            <div className="flex flex-col gap-4">
                {/* Create Button */}
                <div className="flex justify-end">
                    <button
                        onClick={() => router.push(`/dashboard/campaigns/create?bot=${botId}`)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium text-sm transition-all shadow-lg shadow-blue-500/25"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Create Campaign</span>
                    </button>
                </div>
                <div className="text-center py-24 sm:py-48 bg-zinc-900/30 border border-dashed border-zinc-800/50 rounded-2xl min-h-[400px] sm:min-h-[600px] flex flex-col items-center justify-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-zinc-800/50 rounded-2xl sm:rounded-3xl mb-4 sm:mb-6 shadow-xl border border-zinc-700/50">
                        <Megaphone className="w-8 h-8 sm:w-10 sm:h-10 text-zinc-500" />
                    </div>
                    <h3 className="text-lg sm:text-xl font-bold text-zinc-100 mb-2 sm:mb-3">No Campaigns Yet</h3>
                    <p className="text-zinc-400 text-xs sm:text-sm max-w-xs mx-auto leading-relaxed px-4">Create your first broadcast campaign to reach your contacts and grow your business.</p>
                </div>
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-4">
            {/* Header with Create Button */}
            <div className="flex justify-end">
                <button
                    onClick={() => router.push(`/dashboard/campaigns/create?bot=${botId}`)}
                    className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium text-xs sm:text-sm transition-all shadow-lg shadow-blue-500/25"
                >
                    <Plus className="w-4 h-4" />
                    <span className="hidden sm:inline">Create Campaign</span>
                    <span className="sm:hidden">New</span>
                </button>
            </div>
            {/* Desktop Table View */}
            <div className="hidden md:block">
                <table className="w-full table-fixed">
                    <thead>
                        <tr className="bg-zinc-800/50 rounded-t-xl">
                            <th className="text-left py-3 px-4 text-sm font-medium text-zinc-400 w-[20%] rounded-tl-xl">Campaign</th>
                            <th className="text-center py-3 px-4 text-sm font-medium text-zinc-400 w-[18%]">Progress</th>
                            <th className="text-center py-3 px-4 text-sm font-medium text-zinc-400 w-[14%]">Status</th>
                            <th className="text-center py-3 px-4 text-sm font-medium text-zinc-400 w-[14%]">Recipients</th>
                            <th className="text-center py-3 px-4 text-sm font-medium text-zinc-400 w-[14%]">Created</th>
                            <th className="text-right py-3 px-4 text-sm font-medium text-zinc-400 w-[20%] rounded-tr-xl">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedCampaigns.map((campaign: Campaign) => {
                            const statusConfig = getStatusConfig(campaign.status)
                            const progress = getProgress(campaign)
                            const StatusIcon = statusConfig.icon
                            const isExpanded = expandedId === campaign.id

                            return (
                                <>
                                    <tr
                                        key={campaign.id}
                                        className="border-b border-zinc-800/50 hover:bg-zinc-900/50 transition-colors h-[52px]"
                                    >
                                        {/* Campaign Name */}
                                        <td className="py-4 px-4 overflow-hidden">
                                            <div className="flex items-center gap-2">
                                                <Megaphone className="w-4 h-4 text-blue-400 flex-shrink-0" />
                                                <span className="text-zinc-100 font-medium truncate" title={campaign.name}>
                                                    {campaign.name}
                                                </span>
                                            </div>
                                        </td>

                                        {/* Progress */}
                                        <td className="py-4 px-4 text-center">
                                            {(campaign.status === 'running' || campaign.status === 'paused' || campaign.status === 'completed') ? (
                                                <div className="w-28 mx-auto">
                                                    <div className="flex items-center justify-between text-xs mb-1">
                                                        <span className="text-zinc-500">{progress}%</span>
                                                        <span className="text-zinc-400 font-mono">{(campaign.sent_count || 0) + (campaign.failed_count || 0)}/{campaign.total_contacts || 0}</span>
                                                    </div>
                                                    <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full transition-all duration-500 ${campaign.status === 'completed' ? 'bg-emerald-500' :
                                                                campaign.status === 'paused' ? 'bg-orange-500' : 'bg-blue-500'
                                                                }`}
                                                            style={{ width: `${progress}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            ) : (
                                                <span className="text-zinc-500 text-sm">-</span>
                                            )}
                                        </td>

                                        {/* Status */}
                                        <td className="py-4 px-4 text-center">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border ${statusConfig.color}`}>
                                                <StatusIcon className="w-3 h-3" />
                                                <span>{statusConfig.label}</span>
                                            </span>
                                        </td>

                                        {/* Recipients */}
                                        <td className="py-4 px-4 text-center">
                                            <div className="flex items-center justify-center gap-2 text-sm">
                                                <Users className="w-4 h-4 text-zinc-600" />
                                                <span className="text-zinc-400 font-mono">{campaign.total_contacts || 0}</span>
                                            </div>
                                        </td>

                                        {/* Created Date */}
                                        <td className="py-4 px-4 text-center">
                                            <div className="text-zinc-500 text-sm font-mono">
                                                {new Date(campaign.created_at).toLocaleDateString('en-US', {
                                                    month: 'short',
                                                    day: 'numeric',
                                                })}
                                            </div>
                                        </td>

                                        {/* Actions */}
                                        <td className="py-4 px-4">
                                            <div className="flex items-center justify-end gap-2">
                                                {/* Start/Pause/Resume buttons based on status */}
                                                {(campaign.status === 'draft' || campaign.status === 'scheduled') && (
                                                    <button
                                                        onClick={() => handleStart(campaign.id)}
                                                        disabled={actionLoading === campaign.id}
                                                        className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 transition-all flex items-center justify-center text-emerald-400 disabled:opacity-50"
                                                        title="Start Campaign"
                                                    >
                                                        {actionLoading === campaign.id ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                                                    </button>
                                                )}
                                                {campaign.status === 'running' && (
                                                    <button
                                                        onClick={() => handlePause(campaign.id)}
                                                        disabled={actionLoading === campaign.id}
                                                        className="w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/30 hover:bg-orange-500/20 transition-all flex items-center justify-center text-orange-400 disabled:opacity-50"
                                                        title="Pause Campaign"
                                                    >
                                                        {actionLoading === campaign.id ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Pause className="w-4 h-4" />}
                                                    </button>
                                                )}
                                                {campaign.status === 'paused' && (
                                                    <button
                                                        onClick={() => handleResume(campaign.id)}
                                                        disabled={actionLoading === campaign.id}
                                                        className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 transition-all flex items-center justify-center text-emerald-400 disabled:opacity-50"
                                                        title="Resume Campaign"
                                                    >
                                                        {actionLoading === campaign.id ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                                                    </button>
                                                )}

                                                <button
                                                    onClick={() => setDetailModal({ isOpen: true, campaign })}
                                                    className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/30 hover:bg-blue-500/20 transition-all flex items-center justify-center text-blue-400"
                                                    title="View Recipients Detail"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </button>

                                                <button
                                                    onClick={() => setExpandedId(isExpanded ? null : campaign.id)}
                                                    className="w-8 h-8 rounded-lg bg-zinc-800/50 border border-zinc-700/50 hover:bg-zinc-800 hover:border-blue-500/50 transition-all flex items-center justify-center text-zinc-400 hover:text-blue-400"
                                                    title={isExpanded ? 'Close' : 'Preview'}
                                                >
                                                    <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                                </button>

                                                {deleteConfirm === campaign.id ? (
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => deleteMutation.mutate(campaign.id)}
                                                            className="px-3 py-1.5 rounded-lg bg-red-500 text-white text-xs font-medium hover:bg-red-600 transition-colors"
                                                        >
                                                            Delete
                                                        </button>
                                                        <button
                                                            onClick={() => setDeleteConfirm(null)}
                                                            className="px-3 py-1.5 rounded-lg bg-zinc-800/50 text-zinc-400 text-xs font-medium hover:bg-zinc-800 transition-colors"
                                                        >
                                                            Cancel
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => setDeleteConfirm(campaign.id)}
                                                        className="w-8 h-8 rounded-lg bg-zinc-800/50 border border-zinc-700/50 hover:bg-red-500/10 hover:border-red-500/50 transition-all flex items-center justify-center text-zinc-400 hover:text-red-400"
                                                        title="Delete campaign"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>

                                    {/* Expanded Row */}
                                    {isExpanded && (
                                        <tr key={`${campaign.id}-expanded`}>
                                            <td colSpan={6} className="border-b border-zinc-800/50">
                                                <div className="p-4 bg-zinc-900/30">
                                                    {/* Stats Grid */}
                                                    <div className="grid grid-cols-4 gap-4 mb-4">
                                                        <div className="bg-zinc-800/30 rounded-lg p-3">
                                                            <div className="text-xs text-zinc-500 mb-1">Total Contacts</div>
                                                            <div className="text-lg font-bold text-white">{campaign.total_contacts || 0}</div>
                                                        </div>
                                                        <div className="bg-zinc-800/30 rounded-lg p-3">
                                                            <div className="text-xs text-zinc-500 mb-1">Sent</div>
                                                            <div className="text-lg font-bold text-emerald-400">{campaign.sent_count || 0}</div>
                                                        </div>
                                                        <div className="bg-zinc-800/30 rounded-lg p-3">
                                                            <div className="text-xs text-zinc-500 mb-1">Failed</div>
                                                            <div className="text-lg font-bold text-red-400">{campaign.failed_count || 0}</div>
                                                        </div>
                                                        <div className="bg-zinc-800/30 rounded-lg p-3">
                                                            <div className="text-xs text-zinc-500 mb-1">Anti-Spam</div>
                                                            <div className="text-sm font-bold text-blue-400 capitalize">{campaign.delay_preset || 'moderate'}</div>
                                                        </div>
                                                    </div>

                                                    <div className="text-xs text-zinc-500 mb-2">Message Preview</div>
                                                    <div className="p-3 bg-zinc-800/50 rounded-lg text-sm text-zinc-300 whitespace-pre-wrap border border-zinc-700/50">
                                                        {campaign.message_template || '-'}
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </>
                            )
                        })}

                        {/* Empty rows to fill up to 10 */}
                        {Array.from({ length: Math.max(0, itemsPerPage - paginatedCampaigns.length) }).map((_, index) => (
                            <tr key={`empty-${index}`} className="border-b border-zinc-800/50 h-[52px]">
                                <td className="py-4 px-4">{'\u00A0'}</td>
                                <td className="py-4 px-4">{'\u00A0'}</td>
                                <td className="py-4 px-4">{'\u00A0'}</td>
                                <td className="py-4 px-4">{'\u00A0'}</td>
                                <td className="py-4 px-4">{'\u00A0'}</td>
                                <td className="py-4 px-4">{'\u00A0'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Pagination - Fixed at bottom - Desktop Only */}
            <div className="hidden md:flex items-center justify-between px-4 py-3 bg-zinc-800/50 rounded-b-xl flex-shrink-0">
                {totalPages > 1 ? (
                    <>
                        <div className="text-sm text-zinc-500">
                            Showing <span className="text-zinc-300 font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="text-zinc-300 font-medium">{Math.min(currentPage * itemsPerPage, (campaigns || []).length)}</span> of <span className="text-zinc-300 font-medium">{(campaigns || []).length}</span> campaigns
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="px-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-400 text-xs font-medium hover:bg-zinc-700 disabled:opacity-50 transition-all"
                            >
                                Previous
                            </button>
                            <div className="flex items-center gap-1">
                                {[...Array(totalPages)].map((_, i) => (
                                    <button
                                        key={i}
                                        onClick={() => setCurrentPage(i + 1)}
                                        className={`w-8 h-8 rounded-lg text-xs font-medium transition-all ${currentPage === i + 1 ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}
                                    >
                                        {i + 1}
                                    </button>
                                ))}
                            </div>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="px-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-400 text-xs font-medium hover:bg-zinc-700 disabled:opacity-50 transition-all"
                            >
                                Next
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="text-sm text-zinc-500">
                        Showing <span className="text-zinc-300 font-medium">{(campaigns || []).length}</span> campaigns
                    </div>
                )}
            </div>

            {/* Mobile Pagination */}
            <div className="md:hidden flex items-center justify-between px-4 py-3 bg-zinc-800/50 rounded-xl mt-3">
                {totalPages > 1 ? (
                    <>
                        <div className="text-xs text-zinc-500">
                            {currentPage}/{totalPages}
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="px-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-400 text-xs font-medium hover:bg-zinc-700 disabled:opacity-50 transition-all"
                            >
                                Prev
                            </button>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="px-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-400 text-xs font-medium hover:bg-zinc-700 disabled:opacity-50 transition-all"
                            >
                                Next
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="text-xs text-zinc-500">
                        {(campaigns || []).length} campaigns
                    </div>
                )}
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-3">
                {paginatedCampaigns.map((campaign: Campaign) => {
                    const statusConfig = getStatusConfig(campaign.status)
                    const progress = getProgress(campaign)
                    const StatusIcon = statusConfig.icon
                    const isExpanded = expandedId === campaign.id

                    return (
                        <div
                            key={campaign.id}
                            className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl overflow-hidden hover:bg-zinc-900/80 transition-all"
                        >
                            <div className="p-4">
                                {/* Top: Name + Status */}
                                <div className="flex items-start justify-between gap-3 mb-3">
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                        <Megaphone className="w-4 h-4 text-blue-400 flex-shrink-0" />
                                        <h3 className="text-zinc-100 font-semibold truncate">{campaign.name}</h3>
                                    </div>
                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border flex-shrink-0 ${statusConfig.color}`}>
                                        <StatusIcon className="w-3 h-3" />
                                        <span>{statusConfig.label}</span>
                                    </span>
                                </div>

                                {/* Progress Bar */}
                                {(campaign.status === 'running' || campaign.status === 'paused' || campaign.status === 'completed') && (
                                    <div className="mb-3">
                                        <div className="flex items-center justify-between text-xs mb-1.5">
                                            <span className="text-zinc-500">Progress</span>
                                            <span className="text-zinc-400 font-mono">{(campaign.sent_count || 0) + (campaign.failed_count || 0)}/{campaign.total_contacts || 0} ({progress}%)</span>
                                        </div>
                                        <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full transition-all duration-500 ${campaign.status === 'completed' ? 'bg-emerald-500' :
                                                    campaign.status === 'paused' ? 'bg-orange-500' : 'bg-blue-500'
                                                    }`}
                                                style={{ width: `${progress}%` }}
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Stats */}
                                <div className="flex items-center gap-4 text-xs mb-3">
                                    <div className="flex items-center gap-1.5 text-zinc-400">
                                        <Users className="w-3.5 h-3.5" />
                                        <span className="font-mono">{campaign.total_contacts || 0} recipients</span>
                                    </div>
                                    {(campaign.sent_count || 0) > 0 && (
                                        <div className="flex items-center gap-1 text-emerald-500">
                                            <Check className="w-3.5 h-3.5" />
                                            <span className="font-mono">{campaign.sent_count}</span>
                                        </div>
                                    )}
                                    {(campaign.failed_count || 0) > 0 && (
                                        <div className="flex items-center gap-1 text-red-400">
                                            <X className="w-3.5 h-3.5" />
                                            <span className="font-mono">{campaign.failed_count}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Bottom: Date + Actions */}
                                <div className="flex items-center justify-between pt-3 border-t border-zinc-800/50">
                                    <div className="text-xs text-zinc-500 font-mono">
                                        {new Date(campaign.created_at).toLocaleDateString('en-US', {
                                            month: 'short',
                                            day: 'numeric',
                                            year: 'numeric',
                                        })}
                                    </div>

                                    <div className="flex items-center gap-2">
                                        {/* Start/Pause/Resume buttons */}
                                        {(campaign.status === 'draft' || campaign.status === 'scheduled') && (
                                            <button
                                                onClick={() => handleStart(campaign.id)}
                                                disabled={actionLoading === campaign.id}
                                                className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 transition-all flex items-center justify-center text-emerald-400 disabled:opacity-50"
                                                title="Start Campaign"
                                            >
                                                {actionLoading === campaign.id ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                                            </button>
                                        )}
                                        {campaign.status === 'running' && (
                                            <button
                                                onClick={() => handlePause(campaign.id)}
                                                disabled={actionLoading === campaign.id}
                                                className="w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/30 hover:bg-orange-500/20 transition-all flex items-center justify-center text-orange-400 disabled:opacity-50"
                                                title="Pause Campaign"
                                            >
                                                {actionLoading === campaign.id ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Pause className="w-4 h-4" />}
                                            </button>
                                        )}
                                        {campaign.status === 'paused' && (
                                            <button
                                                onClick={() => handleResume(campaign.id)}
                                                disabled={actionLoading === campaign.id}
                                                className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 transition-all flex items-center justify-center text-emerald-400 disabled:opacity-50"
                                                title="Resume Campaign"
                                            >
                                                {actionLoading === campaign.id ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                                            </button>
                                        )}

                                        <button
                                            onClick={() => setDetailModal({ isOpen: true, campaign })}
                                            className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/30 hover:bg-blue-500/20 transition-all flex items-center justify-center text-blue-400"
                                            title="View Recipients Detail"
                                        >
                                            <Eye className="w-4 h-4" />
                                        </button>

                                        <button
                                            onClick={() => setExpandedId(isExpanded ? null : campaign.id)}
                                            className="w-8 h-8 rounded-lg bg-zinc-800/50 border border-zinc-700/50 hover:bg-zinc-800 hover:border-blue-500/50 transition-all flex items-center justify-center text-zinc-400 hover:text-blue-400"
                                        >
                                            <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                        </button>

                                        {deleteConfirm === campaign.id ? (
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => deleteMutation.mutate(campaign.id)}
                                                    className="px-3 py-1.5 rounded-lg bg-red-500 text-white text-xs font-medium"
                                                >
                                                    Delete
                                                </button>
                                                <button
                                                    onClick={() => setDeleteConfirm(null)}
                                                    className="px-3 py-1.5 rounded-lg bg-zinc-800/50 text-zinc-400 text-xs font-medium"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => setDeleteConfirm(campaign.id)}
                                                className="w-8 h-8 rounded-lg bg-zinc-800/50 border border-zinc-700/50 hover:bg-red-500/10 hover:border-red-500/50 transition-all flex items-center justify-center text-zinc-400 hover:text-red-400"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Expanded Content */}
                            {isExpanded && (
                                <div className="border-t border-zinc-800/50 p-4 bg-zinc-900/30">
                                    {/* Stats Grid */}
                                    <div className="grid grid-cols-2 gap-3 mb-4">
                                        <div className="bg-zinc-800/30 rounded-lg p-3">
                                            <div className="text-xs text-zinc-500 mb-1">Total Contacts</div>
                                            <div className="text-lg font-bold text-white">{campaign.total_contacts || 0}</div>
                                        </div>
                                        <div className="bg-zinc-800/30 rounded-lg p-3">
                                            <div className="text-xs text-zinc-500 mb-1">Sent</div>
                                            <div className="text-lg font-bold text-emerald-400">{campaign.sent_count || 0}</div>
                                        </div>
                                        <div className="bg-zinc-800/30 rounded-lg p-3">
                                            <div className="text-xs text-zinc-500 mb-1">Failed</div>
                                            <div className="text-lg font-bold text-red-400">{campaign.failed_count || 0}</div>
                                        </div>
                                        <div className="bg-zinc-800/30 rounded-lg p-3">
                                            <div className="text-xs text-zinc-500 mb-1">Anti-Spam</div>
                                            <div className="text-sm font-bold text-blue-400 capitalize">{campaign.delay_preset || 'moderate'}</div>
                                        </div>
                                    </div>

                                    <div className="text-xs text-zinc-500 mb-2">Message Preview</div>
                                    <div className="p-3 bg-zinc-800/50 rounded-lg text-sm text-zinc-300 whitespace-pre-wrap border border-zinc-700/50">
                                        {campaign.message_template || '-'}
                                    </div>
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>

            {/* Campaign Detail Modal */}
            <CampaignDetailModal
                isOpen={detailModal.isOpen}
                onClose={() => setDetailModal({ isOpen: false, campaign: null })}
                campaign={detailModal.campaign}
            />
        </div>
    )
}
