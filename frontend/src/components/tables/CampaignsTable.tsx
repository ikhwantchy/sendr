'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { toast } from 'sonner'

interface Campaign {
    id: string
    name: string
    message: string
    status: 'draft' | 'scheduled' | 'sending' | 'completed' | 'failed'
    schedule_type: 'immediate' | 'scheduled'
    scheduled_at?: string
    total_recipients: number
    sent_count: number
    failed_count: number
    created_at: string
}

interface CampaignsTableProps {
    botId: string
}

export default function CampaignsTable({ botId }: CampaignsTableProps) {
    const queryClient = useQueryClient()
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
    const [expandedId, setExpandedId] = useState<string | null>(null)

    const { data: campaigns, isLoading } = useQuery({
        queryKey: ['campaigns', botId],
        queryFn: async () => {
            const response = await api.campaigns.getByBot(botId)
            return response.data.data || response.data || []
        },
    })

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
        const configs: Record<string, { label: string; color: string; icon: string }> = {
            draft: {
                label: 'Draft',
                color: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
                icon: '📝',
            },
            scheduled: {
                label: 'Scheduled',
                color: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
                icon: '⏰',
            },
            sending: {
                label: 'Sending',
                color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
                icon: '📤',
            },
            completed: {
                label: 'Completed',
                color: 'bg-green-500/20 text-green-400 border-green-500/30',
                icon: '✅',
            },
            failed: {
                label: 'Failed',
                color: 'bg-red-500/20 text-red-400 border-red-500/30',
                icon: '❌',
            },
        }
        return configs[status] || configs.draft
    }

    const getProgress = (campaign: Campaign) => {
        if (campaign.total_recipients === 0) return 0
        return Math.round((campaign.sent_count / campaign.total_recipients) * 100)
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
            </div>
        )
    }

    if (!campaigns || campaigns.length === 0) {
        return (
            <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 bg-gray-500/20 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                    </svg>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">No Campaigns Yet</h3>
                <p className="text-gray-400 text-sm">Create your first broadcast campaign to reach your contacts</p>
            </div>
        )
    }

    return (
        <div className="space-y-3">
            {campaigns.map((campaign: Campaign) => {
                const statusConfig = getStatusConfig(campaign.status)
                const progress = getProgress(campaign)
                const isExpanded = expandedId === campaign.id

                return (
                    <div
                        key={campaign.id}
                        className="glass rounded-xl border border-white/10 overflow-hidden hover:border-white/20 transition-all"
                    >
                        {/* Main Content */}
                        <div className="p-4">
                            <div className="flex items-start justify-between gap-4">
                                {/* Campaign Info */}
                                <div className="flex-1 space-y-3">
                                    {/* Header */}
                                    <div className="flex items-center gap-3">
                                        <h3 className="text-lg font-semibold text-white">{campaign.name}</h3>

                                        {/* Status Badge */}
                                        <span
                                            className={`px-3 py-1 rounded-lg text-xs font-medium border ${statusConfig.color}`}
                                        >
                                            {statusConfig.icon} {statusConfig.label}
                                        </span>

                                        {/* Schedule Type */}
                                        {campaign.schedule_type === 'scheduled' && campaign.scheduled_at && (
                                            <span className="px-2 py-1 rounded bg-blue-500/10 text-blue-400 text-xs">
                                                📅 {new Date(campaign.scheduled_at).toLocaleDateString()}
                                            </span>
                                        )}
                                    </div>

                                    {/* Progress Bar */}
                                    {campaign.status === 'sending' || campaign.status === 'completed' ? (
                                        <div className="space-y-1">
                                            <div className="flex items-center justify-between text-xs">
                                                <span className="text-gray-400">Progress</span>
                                                <span className="text-white font-medium">
                                                    {campaign.sent_count} / {campaign.total_recipients} ({progress}%)
                                                </span>
                                            </div>
                                            <div className="h-2 bg-black/30 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-gradient-to-r from-cyan-500 to-blue-600 transition-all duration-500"
                                                    style={{ width: `${progress}%` }}
                                                />
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-sm text-gray-400">
                                            {campaign.total_recipients} recipient{campaign.total_recipients !== 1 ? 's' : ''}
                                        </div>
                                    )}

                                    {/* Stats */}
                                    <div className="flex items-center gap-4 text-xs">
                                        <div className="flex items-center gap-1 text-green-400">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                            {campaign.sent_count} sent
                                        </div>
                                        {campaign.failed_count > 0 && (
                                            <div className="flex items-center gap-1 text-red-400">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                                {campaign.failed_count} failed
                                            </div>
                                        )}
                                        <div className="text-gray-500">
                                            Created {new Date(campaign.created_at).toLocaleDateString('en-US', {
                                                month: 'short',
                                                day: 'numeric',
                                            })}
                                        </div>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-2">
                                    {/* Expand/Collapse */}
                                    <button
                                        onClick={() => setExpandedId(isExpanded ? null : campaign.id)}
                                        className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 hover:border-cyan-500 transition-all flex items-center justify-center text-gray-400 hover:text-cyan-400"
                                        title={isExpanded ? 'Collapse' : 'Expand'}
                                    >
                                        <svg
                                            className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </button>

                                    {/* Delete Button */}
                                    {deleteConfirm === campaign.id ? (
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => deleteMutation.mutate(campaign.id)}
                                                className="px-3 py-1.5 rounded-lg bg-red-500 text-white text-xs font-medium hover:bg-red-600 transition-colors"
                                            >
                                                Confirm
                                            </button>
                                            <button
                                                onClick={() => setDeleteConfirm(null)}
                                                className="px-3 py-1.5 rounded-lg bg-white/5 text-gray-400 text-xs font-medium hover:bg-white/10 transition-colors"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => setDeleteConfirm(campaign.id)}
                                            className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 hover:bg-red-500/20 hover:border-red-500 transition-all flex items-center justify-center text-gray-400 hover:text-red-400"
                                            title="Delete campaign"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Expanded Content */}
                        {isExpanded && (
                            <div className="border-t border-white/10 p-4 bg-black/20">
                                <div className="space-y-3">
                                    <div>
                                        <div className="text-xs text-gray-400 mb-1">Message Preview</div>
                                        <div className="p-3 bg-white/5 rounded-lg text-sm text-gray-300 whitespace-pre-wrap">
                                            {campaign.message}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )
            })}
        </div>
    )
}
