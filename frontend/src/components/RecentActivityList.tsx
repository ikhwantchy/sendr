'use client'

import { Info, ArrowUpRight, ArrowDownLeft, ExternalLink, Circle } from 'lucide-react'
import Link from 'next/link'

interface ActivityLog {
    id: string
    type: string
    direction?: 'inbound' | 'outbound'
    message: string
    timestamp: string
    metadata?: any
}

interface RecentActivityListProps {
    title?: string
    logs?: ActivityLog[]
    botId?: string
    className?: string
}

export default function RecentActivityList({ title = 'LIVE LOGS', logs = [], botId, className }: RecentActivityListProps) {

    const getLogDetails = (log: ActivityLog) => {
        // SYSTEM
        if (log.type === 'system' || log.type === 'bot') {
            return {
                label: 'SYSTEM',
                icon: <Info className="w-4 h-4 text-zinc-500" />,
                labelColor: 'text-zinc-500'
            }
        }

        // SENT / OUTBOUND
        if (log.direction === 'outbound' || log.type === 'campaign' || log.type === 'reminder' || log.type === 'rule' || log.message?.startsWith('Sent')) {
            return {
                label: 'SENT',
                icon: <ArrowUpRight className="w-4 h-4 text-blue-500" />,
                labelColor: 'text-blue-500'
            }
        }

        // RECEIVED / INBOUND
        return {
            label: 'RECEIVED',
            icon: <ArrowDownLeft className="w-4 h-4 text-emerald-500" />,
            labelColor: 'text-emerald-500'
        }
    }

    const formatTimestamp = (timestamp: string) => {
        try {
            const timeString = timestamp.endsWith('Z') ? timestamp : `${timestamp}Z`
            const date = new Date(timeString)
            const now = new Date()
            const diff = Math.floor((now.getTime() - date.getTime()) / 1000)

            if (diff < 60) return `${Math.max(0, diff)}s ago`
            if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
            if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
            return `${Math.floor(diff / 86400)}d ago`
        } catch (e) {
            return '-- ago'
        }
    }

    return (
        <div className={`flex flex-col bg-[#0e0e11] border border-zinc-800/50 rounded-2xl overflow-hidden ${className}`}>
            <div className="flex items-center justify-between p-6">
                <div className="space-y-1">
                    <h3 className="text-sm font-bold text-white tracking-tight uppercase">{title}</h3>
                    <div className="flex items-center gap-2">
                        <Circle className="w-2 h-2 fill-emerald-500 text-emerald-500 animate-pulse" />
                        <span className="text-[10px] text-zinc-500 font-medium">Real-time updates</span>
                    </div>
                </div>
                <Link
                    href={botId ? `/dashboard/bots/${botId}/activity` : "/dashboard/activity"}
                    className="flex items-center gap-1.5 text-xs text-blue-500 hover:text-blue-400 font-bold transition-colors"
                >
                    View All
                    <ExternalLink className="w-3.5 h-3.5" />
                </Link>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-zinc-800/50">
                {logs.length === 0 ? (
                    <div className="p-12 text-center">
                        <div className="inline-flex p-4 rounded-2xl bg-zinc-900 mb-4">
                            <Info className="w-6 h-6 text-zinc-700" />
                        </div>
                        <p className="text-sm text-zinc-500 font-medium">Waiting for bot activity...</p>
                    </div>
                ) : (
                    logs.map((log) => {
                        const { label, icon, labelColor } = getLogDetails(log)
                        const campaignId = log.metadata?.campaign_id || (log.type === 'campaign' ? log.id.slice(0, 4) : null)

                        return (
                            <div key={log.id} className="p-5 hover:bg-zinc-800/20 transition-all duration-200 group">
                                <div className="flex items-start gap-4">
                                    <div className="mt-1 flex-shrink-0">
                                        {icon}
                                    </div>
                                    <div className="flex-1 min-w-0 space-y-1">
                                        <div className="flex items-center justify-between">
                                            <span className={`text-[10px] font-bold tracking-widest ${labelColor}`}>{label}</span>
                                            <span className="text-[10px] text-zinc-600 font-medium">{formatTimestamp(log.timestamp)}</span>
                                        </div>
                                        <p className="text-sm text-zinc-300 font-medium leading-relaxed break-words">
                                            {log.message}
                                        </p>

                                        {/* Optional Tags (Campaigns, etc) */}
                                        {campaignId && log.type === 'campaign' && (
                                            <div className="pt-2">
                                                <span className="inline-flex items-center px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-[10px] text-zinc-500 font-medium">
                                                    Campaign #{campaignId}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )
                    })
                )}
            </div>
        </div>
    )
}
