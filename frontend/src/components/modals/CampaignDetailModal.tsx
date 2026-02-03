'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useQuery } from '@tanstack/react-query'
import {
    X, Megaphone, Clock, Users, Check, AlertCircle,
    Send, Pause, RefreshCw, ChevronLeft, ChevronRight,
    Phone, User, CheckCircle2, XCircle, Loader2
} from 'lucide-react'
import { API_URL } from '@/lib/api'

interface Recipient {
    id: string
    phone: string
    name: string
    status: 'pending' | 'sent' | 'failed'
    sent_at: string | null
    error: string | null
}

interface Campaign {
    id: string
    name: string
    message_template: string
    status: string
    total_contacts: number
    sent_count: number
    failed_count: number
    delay_preset: string
    created_at: string
}

interface CampaignDetailModalProps {
    isOpen: boolean
    onClose: () => void
    campaign: Campaign | null
}

export default function CampaignDetailModal({
    isOpen,
    onClose,
    campaign
}: CampaignDetailModalProps) {
    const [isVisible, setIsVisible] = useState(false)
    const [statusFilter, setStatusFilter] = useState<string>('all')
    const [page, setPage] = useState(0)
    const limit = 5

    useEffect(() => {
        if (isOpen) {
            setIsVisible(true)
            setPage(0)
            setStatusFilter('all')
        } else {
            const timer = setTimeout(() => setIsVisible(false), 300)
            return () => clearTimeout(timer)
        }
    }, [isOpen])

    const { data: campaignResponse, refetch: refetchCampaign } = useQuery({
        queryKey: ['campaign', campaign?.id],
        queryFn: async () => {
            if (!campaign?.id) return null
            const token = localStorage.getItem('token')
            const response = await fetch(`${API_URL}/api/campaigns/${campaign.id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            return response.json()
        },
        enabled: isOpen && !!campaign?.id,
        refetchInterval: (data: any) => {
            const c = data?.data || campaign;
            return (c?.status === 'running' ||
                ((c?.sent_count || 0) + (c?.failed_count || 0) < (c?.total_contacts || 0)))
                ? 2000 : 10000;
        },
    })

    const currentCampaign = campaignResponse?.data || campaign

    const { data: recipientsData, isLoading, refetch: refetchRecipients } = useQuery({
        queryKey: ['campaign-recipients', campaign?.id, statusFilter, page],
        queryFn: async () => {
            if (!campaign?.id) return null
            const token = localStorage.getItem('token')
            const statusParam = statusFilter !== 'all' ? `&status=${statusFilter}` : ''
            const response = await fetch(
                `${API_URL}/api/campaigns/${campaign.id}/recipients?limit=${limit}&offset=${page * limit}${statusParam}`,
                {
                    headers: { 'Authorization': `Bearer ${token}` }
                }
            )
            return response.json()
        },
        enabled: isOpen && !!campaign?.id,
        // Poll every 2 seconds if running OR if numbers don't match yet
        refetchInterval: (data: any) => {
            const c = campaignResponse?.data || campaign;
            return (c?.status === 'running' ||
                ((c?.sent_count || 0) + (c?.failed_count || 0) < (c?.total_contacts || 0)))
                ? 2000 : 10000;
        },
    })

    const recipients: Recipient[] = recipientsData?.data || []
    const total = recipientsData?.total || 0
    const totalPages = Math.ceil(total / limit)

    // Auto-pagination logic: If all items on current page are processed, move to next page
    useEffect(() => {
        if (recipients.length > 0 && currentCampaign?.status === 'running') {
            const allProcessed = recipients.every(r => r.status === 'sent' || r.status === 'failed');
            if (allProcessed && page < totalPages - 1) {
                // Add a small delay so user can see the last item mark as sent
                const timer = setTimeout(() => {
                    setPage(prev => prev + 1);
                }, 1500);
                return () => clearTimeout(timer);
            }
        }
    }, [recipients, page, totalPages, currentCampaign?.status])

    const refetchAll = () => {
        refetchCampaign()
        refetchRecipients()
    }

    if (!isVisible || !campaign) return null


    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'sent': return <CheckCircle2 size={14} className="text-emerald-500" />
            case 'failed': return <XCircle size={14} className="text-red-500" />
            case 'pending': return <Loader2 size={14} className="text-yellow-500 animate-spin" />
            default: return <Clock size={14} className="text-zinc-500" />
        }
    }

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'sent': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
            case 'failed': return 'bg-red-500/10 text-red-500 border-red-500/30'
            case 'pending': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30'
            default: return 'bg-zinc-500/10 text-zinc-500 border-zinc-500/30'
        }
    }

    const progress = currentCampaign.total_contacts > 0
        ? Math.round(((currentCampaign.sent_count + currentCampaign.failed_count) / currentCampaign.total_contacts) * 100)
        : 0

    const modalContent = (
        <div className={`fixed inset-0 z-[100] flex items-center justify-center transition-all duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}>
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Modal Content */}
            <div className={`
                relative w-full max-w-4xl mx-4 
                bg-[#09090b] border border-zinc-800 rounded-2xl shadow-2xl 
                transform transition-all duration-300 flex flex-col max-h-[90vh]
                ${isOpen ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'}
            `}>
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-purple-500/10 text-purple-500">
                            <Megaphone size={20} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-zinc-100">
                                {currentCampaign.name}
                            </h3>
                            <div className="flex items-center gap-2 text-xs text-zinc-500 font-mono mt-0.5">
                                <Clock size={12} />
                                {(() => {
                                    if (!currentCampaign.created_at) return '-';
                                    const dateStr = currentCampaign.created_at.includes('T') ? currentCampaign.created_at : currentCampaign.created_at.replace(' ', 'T') + 'Z';
                                    return new Date(dateStr).toLocaleString('id-ID', {
                                        day: '2-digit',
                                        month: '2-digit',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                        hour12: true
                                    });
                                })()}
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-zinc-500 hover:text-zinc-300 p-2 rounded-full hover:bg-zinc-800/50 transition-all"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Stats Bar */}
                <div className="px-6 py-4 border-b border-zinc-800 bg-zinc-900/50">
                    <div className="grid grid-cols-4 gap-4 mb-4">
                        <div className="bg-zinc-800/50 rounded-xl p-3">
                            <div className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Total</div>
                            <div className="text-xl font-bold text-white">{currentCampaign.total_contacts}</div>
                        </div>
                        <div className="bg-zinc-800/50 rounded-xl p-3">
                            <div className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Sent</div>
                            <div className="text-xl font-bold text-emerald-400">{currentCampaign.sent_count}</div>
                        </div>
                        <div className="bg-zinc-800/50 rounded-xl p-3">
                            <div className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Failed</div>
                            <div className="text-xl font-bold text-red-400">{currentCampaign.failed_count}</div>
                        </div>
                        <div className="bg-zinc-800/50 rounded-xl p-3">
                            <div className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Pending</div>
                            <div className="text-xl font-bold text-yellow-400">
                                {currentCampaign.total_contacts - currentCampaign.sent_count - currentCampaign.failed_count}
                            </div>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div>
                        <div className="flex items-center justify-between text-xs mb-2">
                            <span className="text-zinc-500">Progress</span>
                            <span className="text-zinc-400 font-mono font-bold">{progress}%</span>
                        </div>
                        <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                            <div
                                className={`h-full transition-all duration-500 ${currentCampaign.status === 'completed' ? 'bg-emerald-500' :
                                    currentCampaign.status === 'paused' ? 'bg-orange-500' : 'bg-blue-500'
                                    }`}
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    </div>
                </div>

                {/* Filter Tabs */}
                <div className="px-6 py-3 border-b border-zinc-800 flex items-center justify-between">
                    <div className="flex gap-2">
                        {[
                            { id: 'all', label: 'All' },
                            { id: 'sent', label: 'Sent' },
                            { id: 'pending', label: 'Pending' },
                            { id: 'failed', label: 'Failed' },
                        ].map(filter => (
                            <button
                                key={filter.id}
                                onClick={() => { setStatusFilter(filter.id); setPage(0); }}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${statusFilter === filter.id
                                    ? 'bg-blue-500 text-white'
                                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                                    }`}
                            >
                                {filter.label}
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={() => refetchAll()}
                        className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-all"
                        title="Refresh"
                    >
                        <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
                    </button>
                </div>

                {/* Recipients List */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="relative w-10 h-10">
                                <div className="absolute inset-0 rounded-full border-2 border-zinc-800"></div>
                                <div className="absolute inset-0 rounded-full border-2 border-blue-500 border-t-transparent animate-spin"></div>
                            </div>
                        </div>
                    ) : recipients.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-zinc-500">
                            <Users size={40} className="mb-3 opacity-50" />
                            <p className="text-sm">No recipient data found</p>
                        </div>
                    ) : (
                        <table className="w-full">
                            <thead className="sticky top-0 bg-zinc-900/95 backdrop-blur-sm">
                                <tr className="border-b border-zinc-800">
                                    <th className="text-center py-3 px-6 text-xs font-bold text-zinc-500 uppercase w-16">#</th>
                                    <th className="text-left py-3 px-4 text-xs font-bold text-zinc-500 uppercase">Name</th>
                                    <th className="text-center py-3 px-4 text-xs font-bold text-zinc-500 uppercase">Phone</th>
                                    <th className="text-center py-3 px-4 text-xs font-bold text-zinc-500 uppercase">Status</th>
                                    <th className="text-right py-3 px-6 text-xs font-bold text-zinc-500 uppercase">Sent Time</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recipients.map((recipient, index) => (
                                    <tr
                                        key={recipient.id}
                                        className="border-b border-zinc-800/50 hover:bg-zinc-900/50 transition-colors"
                                    >
                                        <td className="py-3 px-6 text-xs text-zinc-600 font-mono text-center">
                                            {page * limit + index + 1}
                                        </td>
                                        <td className="py-3 px-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-7 h-7 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-500 uppercase">
                                                    {recipient.name ? recipient.name.substring(0, 2) : '??'}
                                                </div>
                                                <span className="text-sm text-zinc-200 font-medium truncate max-w-[150px]">
                                                    {recipient.name || '-'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            <span className="text-sm text-zinc-400 font-mono">{recipient.phone}</span>
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-bold border ${getStatusBadge(recipient.status)}`}>
                                                {getStatusIcon(recipient.status)}
                                                <span className="capitalize">{recipient.status}</span>
                                            </span>
                                            {recipient.error && (
                                                <p className="text-[10px] text-red-400 mt-1 truncate max-w-[150px]" title={recipient.error}>
                                                    {recipient.error}
                                                </p>
                                            )}
                                        </td>
                                        <td className="py-3 px-6 text-right">
                                            <span className="text-xs text-zinc-500 font-mono">
                                                {recipient.sent_at
                                                    ? (() => {
                                                        const dateStr = recipient.sent_at.includes('T') ? recipient.sent_at : recipient.sent_at.replace(' ', 'T') + 'Z';
                                                        return new Date(dateStr).toLocaleTimeString('id-ID', {
                                                            hour: '2-digit',
                                                            minute: '2-digit',
                                                            second: '2-digit',
                                                            hour12: true
                                                        });
                                                    })()
                                                    : '-'
                                                }
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Pagination Footer */}
                <div className="px-6 py-4 border-t border-zinc-800 flex items-center justify-between bg-zinc-900/50">
                    <div className="text-xs text-zinc-500">
                        Showing {recipients.length} of {total} recipients
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setPage(p => Math.max(0, p - 1))}
                            disabled={page === 0}
                            className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <span className="text-xs text-zinc-400 font-mono px-3">
                            {page + 1} / {Math.max(1, totalPages)}
                        </span>
                        <button
                            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                            disabled={page >= totalPages - 1}
                            className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )

    return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null
}
