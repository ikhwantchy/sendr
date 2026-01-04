'use client'

import { Clock, Bot, Zap, MessageSquare, Activity } from 'lucide-react'
import Link from 'next/link'

interface ActivityLog {
    id: string
    type: string
    message: string
    timestamp: string
}

interface RecentActivityListProps {
    title?: string
    logs?: ActivityLog[]
    botId?: string
    className?: string
}

export default function RecentActivityList({ title = 'Live Activity', logs = [], botId, className }: RecentActivityListProps) {

    const getActivityIcon = (type: string) => {
        switch (type) {
            case 'bot': return <Bot className="w-3.5 h-3.5 text-blue-500" />
            case 'rule': return <Zap className="w-3.5 h-3.5 text-amber-500" />
            case 'campaign': return <MessageSquare className="w-3.5 h-3.5 text-emerald-500" />
            case 'error': return <Activity className="w-3.5 h-3.5 text-red-500" />
            default: return <Clock className="w-3.5 h-3.5 text-zinc-500" />
        }
    }

    const formatTimestamp = (timestamp: string) => {
        try {
            // Handle both ISO strings and other formats if needed
            const timeString = timestamp.endsWith('Z') ? timestamp : `${timestamp}Z`
            const date = new Date(timeString)
            const now = new Date()
            const diff = Math.floor((now.getTime() - date.getTime()) / 1000)

            if (diff < 60) return `${Math.max(0, diff)}s ago`
            if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
            if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
            return `${Math.floor(diff / 86400)}d ago`
        } catch (e) {
            return 'just now'
        }
    }

    // Default logs if none provided (mock for display)
    const displayLogs = logs

    return (
        <div className={`flex flex-col h-full bg-[#0e0e11] border border-zinc-800/50 rounded-xl overflow-hidden ${className}`}>
            <div className="flex items-center justify-between p-6 pb-4">
                <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">{title}</h3>
                <Link href={botId ? `/dashboard/bots/${botId}/activity` : "/dashboard/activity"} className="text-xs text-zinc-500 hover:text-white transition-colors">View All</Link>
            </div>

            <div className="flex-1 min-h-[300px] flex flex-col">
                {displayLogs.length === 0 ? (
                    <div className="p-8 text-center text-zinc-600 text-sm flex flex-col items-center justify-center flex-1">
                        <Clock className="w-8 h-8 mb-3 opacity-20" />
                        Waiting for events...
                    </div>
                ) : (
                    <div className="divide-y divide-zinc-800/30 overflow-y-auto custom-scrollbar">
                        {displayLogs.map((log) => (
                            <div key={log.id} className="group flex items-center gap-3 px-6 py-3 hover:bg-zinc-800/20 transition-colors">
                                <div className="flex-shrink-0 mt-0.5">
                                    {getActivityIcon(log.type)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs text-zinc-300 group-hover:text-zinc-100 transition-colors truncate">
                                        {log.message}
                                    </p>
                                </div>
                                <span className="text-[10px] font-mono text-zinc-600 whitespace-nowrap">
                                    {formatTimestamp(log.timestamp)}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
