'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import { Megaphone, Trash2, ChevronDown, Circle, Check, X, Calendar, Users, Send } from 'lucide-react'

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
            sending: {
                label: 'Sending',
                color: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-500',
                icon: Send,
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
                <div className="relative w-12 h-12">
                    <div className="absolute inset-0 rounded-full border-2 border-zinc-800"></div>
                    <div className="absolute inset-0 rounded-full border-2 border-blue-500 border-t-transparent animate-spin"></div>
                </div>
            </div>
        )
    }

    if (!campaigns || campaigns.length === 0) {
        return (
            <div className="text-center py-16 bg-zinc-900/50 border border-dashed border-zinc-800/50 rounded-2xl">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-zinc-800/50 rounded-2xl mb-4">
                    <Megaphone className="w-8 h-8 text-zinc-600" />
                </div>
                <h3 className="text-lg font-semibold text-zinc-100 mb-2">No Campaigns Yet</h3>
                <p className="text-zinc-400 text-sm">Create your first broadcast campaign to reach your contacts</p>
            </div>
        )
    }

    return (
        <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-zinc-800/50">
                            <th className="text-left py-3 px-4 text-sm font-medium text-zinc-400">Campaign</th>
                            <th className="text-left py-3 px-4 text-sm font-medium text-zinc-400">Status</th>
                            <th className="text-left py-3 px-4 text-sm font-medium text-zinc-400">Progress</th>
                            <th className="text-left py-3 px-4 text-sm font-medium text-zinc-400">Recipients</th>
                            <th className="text-left py-3 px-4 text-sm font-medium text-zinc-400">Created</th>
                            <th className="text-right py-3 px-4 text-sm font-medium text-zinc-400">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {campaigns.map((campaign: Campaign) => {
                            const statusConfig = getStatusConfig(campaign.status)
                            const progress = getProgress(campaign)
                            const StatusIcon = statusConfig.icon
                            const isExpanded = expandedId === campaign.id

                            return (
                                <>
                                    <tr
                                        key={campaign.id}
                                        className="border-b border-zinc-800/50 hover:bg-zinc-900/50 transition-colors"
                                    >
                                        {/* Campaign Name */}
                                        <td className="py-4 px-4">
                                            <div className="flex items-center gap-2">
                                                <Megaphone className="w-4 h-4 text-purple-400 flex-shrink-0" />
                                                <span className="text-zinc-100 font-medium truncate max-w-[200px]">
                                                    {campaign.name}
                                                </span>
                                            </div>
                                        </td>

                                        {/* Status */}
                                        <td className="py-4 px-4">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border ${statusConfig.color}`}>
                                                <StatusIcon className="w-3 h-3" />
                                                <span>{statusConfig.label}</span>
                                            </span>
                                        </td>

                                        {/* Progress */}
                                        <td className="py-4 px-4">
                                            {campaign.status === 'sending' || campaign.status === 'completed' ? (
                                                <div className="w-32">
                                                    <div className="flex items-center justify-between text-xs mb-1">
                                                        <span className="text-zinc-500">{progress}%</span>
                                                        <span className="text-zinc-400 font-mono">{campaign.sent_count}/{campaign.total_recipients}</span>
                                                    </div>
                                                    <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-blue-500 transition-all duration-500"
                                                            style={{ width: `${progress}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            ) : (
                                                <span className="text-zinc-500 text-sm">-</span>
                                            )}
                                        </td>

                                        {/* Recipients */}
                                        <td className="py-4 px-4">
                                            <div className="flex items-center gap-2 text-sm">
                                                <Users className="w-4 h-4 text-zinc-600" />
                                                <span className="text-zinc-400 font-mono">{campaign.total_recipients}</span>
                                            </div>
                                        </td>

                                        {/* Created Date */}
                                        <td className="py-4 px-4">
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
                                                <button
                                                    onClick={() => setExpandedId(isExpanded ? null : campaign.id)}
                                                    className="w-8 h-8 rounded-lg bg-zinc-800/50 border border-zinc-700/50 hover:bg-zinc-800 hover:border-blue-500/50 transition-all flex items-center justify-center text-zinc-400 hover:text-blue-400"
                                                    title={isExpanded ? 'Collapse' : 'Expand'}
                                                >
                                                    <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                                </button>

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
                                        <tr>
                                            <td colSpan={6} className="border-b border-zinc-800/50">
                                                <div className="p-4 bg-zinc-900/30">
                                                    <div className="text-xs text-zinc-500 mb-2">Message Preview</div>
                                                    <div className="p-3 bg-zinc-800/50 rounded-lg text-sm text-zinc-300 whitespace-pre-wrap border border-zinc-700/50">
                                                        {campaign.message}
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </>
                            )
                        })}
                    </tbody>
                </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-3">
                {campaigns.map((campaign: Campaign) => {
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
                                        <Megaphone className="w-4 h-4 text-purple-400 flex-shrink-0" />
                                        <h3 className="text-zinc-100 font-semibold truncate">{campaign.name}</h3>
                                    </div>
                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border flex-shrink-0 ${statusConfig.color}`}>
                                        <StatusIcon className="w-3 h-3" />
                                        <span>{statusConfig.label}</span>
                                    </span>
                                </div>

                                {/* Progress Bar */}
                                {(campaign.status === 'sending' || campaign.status === 'completed') && (
                                    <div className="mb-3">
                                        <div className="flex items-center justify-between text-xs mb-1.5">
                                            <span className="text-zinc-500">Progress</span>
                                            <span className="text-zinc-400 font-mono">{campaign.sent_count}/{campaign.total_recipients} ({progress}%)</span>
                                        </div>
                                        <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-blue-500 transition-all duration-500"
                                                style={{ width: `${progress}%` }}
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Stats */}
                                <div className="flex items-center gap-4 text-xs mb-3">
                                    <div className="flex items-center gap-1.5 text-zinc-400">
                                        <Users className="w-3.5 h-3.5" />
                                        <span className="font-mono">{campaign.total_recipients} recipients</span>
                                    </div>
                                    {campaign.sent_count > 0 && (
                                        <div className="flex items-center gap-1 text-emerald-500">
                                            <Check className="w-3.5 h-3.5" />
                                            <span className="font-mono">{campaign.sent_count}</span>
                                        </div>
                                    )}
                                    {campaign.failed_count > 0 && (
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
                                                    Confirm
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
                                    <div className="text-xs text-zinc-500 mb-2">Message Preview</div>
                                    <div className="p-3 bg-zinc-800/50 rounded-lg text-sm text-zinc-300 whitespace-pre-wrap border border-zinc-700/50">
                                        {campaign.message}
                                    </div>
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>
        </>
    )
}
