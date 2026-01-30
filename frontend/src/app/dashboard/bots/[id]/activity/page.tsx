'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { api } from '@/lib/api'
import LogDetailModal from '@/components/modals/LogDetailModal'
import {
    ArrowLeft, Search, RefreshCw, Activity,
    ChevronLeft, ChevronRight, Clock, Bot, Zap,
    Megaphone, MessageCircle, Play, Pause, Wifi, WifiOff, XCircle, Eye
} from 'lucide-react'

interface ActivityLog {
    id: string
    type: 'bot' | 'rule' | 'campaign' | 'reminder' | 'message' | 'error'
    message: string
    timestamp: string
    is_deleted?: boolean
}

export default function BotActivityPage() {
    const router = useRouter()
    const params = useParams()
    const botId = params.id as string

    const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState<string>('all')
    const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('24h')
    const [searchQuery, setSearchQuery] = useState('')
    const [currentPage, setCurrentPage] = useState(1)
    const [botName, setBotName] = useState<string>('Bot')
    const [selectedLog, setSelectedLog] = useState<ActivityLog | null>(null)
    const itemsPerPage = 25

    useEffect(() => {
        const token = localStorage.getItem('token')
        if (!token) {
            router.push('/login')
            return
        }

        // Fetch Bot Details for Title
        api.bots.get(botId).then(res => {
            if (res.data.success) {
                setBotName(res.data.data.name)
            }
        }).catch(() => { })

        fetchActivityLogs()

        // Auto-refresh every 5 seconds
        const interval = setInterval(() => {
            fetchActivityLogs()
        }, 5000)

        return () => clearInterval(interval)
    }, [router, timeRange, botId])

    const fetchActivityLogs = async () => {
        try {
            // Using the updated API method that supports botId
            const response = await api.analytics.getActivityLogs(500, botId) // Fetch 500 for pagination

            if (response.data.success && response.data.data) {
                setActivityLogs(response.data.data)
            }
        } catch (error) {
            console.error('Failed to fetch activity logs:', error)
        } finally {
            setLoading(false)
        }
    }

    const getIcon = (log: ActivityLog) => {
        if (log.type === 'bot') {
            const msg = log.message.toLowerCase()
            if (msg.includes('resumed')) return <Play className="w-4 h-4 text-blue-500" />
            if (msg.includes('paused')) return <Pause className="w-4 h-4 text-yellow-500" />
            if (msg.includes('connected') && !msg.includes('dis')) return <Wifi className="w-4 h-4 text-emerald-500" />
            if (msg.includes('disconnected')) return <WifiOff className="w-4 h-4 text-red-500" />
            return <Bot className="w-4 h-4 text-zinc-500" />
        }

        switch (log.type) {
            case 'rule': return <Zap className="w-4 h-4 text-yellow-400" />
            case 'campaign': return <Megaphone className="w-4 h-4 text-purple-500" />
            case 'message': return <MessageCircle className="w-4 h-4 text-emerald-500" />
            case 'reminder': return <Clock className="w-4 h-4 text-cyan-500" />
            case 'error': return <XCircle className="w-4 h-4 text-red-500" />
            default: return <Activity className="w-4 h-4 text-zinc-500" />
        }
    }

    const getColorBg = (log: ActivityLog) => {
        if (log.type === 'bot') {
            const msg = log.message.toLowerCase()
            if (msg.includes('resumed')) return 'bg-blue-500/10'
            if (msg.includes('paused')) return 'bg-yellow-500/10'
            if (msg.includes('connected') && !msg.includes('dis')) return 'bg-emerald-500/10'
            if (msg.includes('disconnected')) return 'bg-red-500/10'
            return 'bg-zinc-500/10'
        }

        switch (log.type) {
            case 'rule': return 'bg-yellow-500/10'
            case 'campaign': return 'bg-purple-500/10'
            case 'message': return 'bg-emerald-500/10'
            case 'reminder': return 'bg-cyan-500/10'
            case 'error': return 'bg-red-500/10'
            default: return 'bg-zinc-500/10'
        }
    }

    const renderMessage = (log: ActivityLog) => {
        const msg = log.message;
        const isDeleted = log.is_deleted;
        const isBotEvent = log.type === 'bot';

        return (
            <div className="flex flex-col gap-0.5 min-w-0 w-full relative notranslate">
                <div className="flex items-center gap-2">
                    {/* Status Dot for Deleted */}
                    {isDeleted && (
                        <div className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_5px_rgba(239,68,68,0.5)]" title="Deleted Message" />
                    )}

                    <span className={`text-sm truncate select-none ${isDeleted ? 'text-zinc-500 line-through decoration-zinc-700' : 'text-zinc-200'} ${isBotEvent ? 'font-medium' : ''}`}>
                        {msg}
                    </span>
                </div>

                <div className="flex items-center gap-2 h-4">
                    {isDeleted ? (
                        <span className="text-[10px] font-bold text-red-500/80 tracking-wider flex items-center gap-1.5">
                            DELETED
                            <span className="w-0.5 h-0.5 rounded-full bg-zinc-700" />
                            <span className="font-normal text-zinc-500 normal-case tracking-normal">Click to view content</span>
                        </span>
                    ) : (
                        <span className="text-[10px] text-zinc-500 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                            Click to view details
                        </span>
                    )}
                </div>
            </div>
        )
    }

    // "Real" absolute timestamp format: Jan 01, 14:30:45
    // "Real" absolute timestamp format: HH:mm:ss for today, Jan 01 14:30 for others
    const formatTimestamp = (timestamp: string) => {
        const timeString = timestamp.endsWith('Z') ? timestamp : `${timestamp}Z`
        const date = new Date(timeString)
        const now = new Date()
        const isToday = date.getDate() === now.getDate() && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()

        if (isToday) {
            return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
        }

        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        })
    }

    // Relative time for context
    const getRelativeTime = (timestamp: string) => {
        const timeString = timestamp.endsWith('Z') ? timestamp : `${timestamp}Z`
        const date = new Date(timeString)
        const now = new Date()
        const diff = Math.floor((now.getTime() - date.getTime()) / 1000)

        if (diff < 60) return `${Math.max(0, diff)}s ago`
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
        return ''
    }

    const handleRefresh = () => {
        setLoading(true)
        fetchActivityLogs()
    }

    // Filter and search
    const filteredLogs = activityLogs
        .filter(log => filter === 'all' || log.type === filter)
        .filter(log =>
            searchQuery === '' ||
            log.message.toLowerCase().includes(searchQuery.toLowerCase())
        )

    // Pagination
    const totalPages = Math.ceil(filteredLogs.length / itemsPerPage)
    const startIndex = (currentPage - 1) * itemsPerPage
    const paginatedLogs = filteredLogs.slice(startIndex, startIndex + itemsPerPage)

    const filterTabs = [
        { value: 'all', label: 'All Events' },
        { value: 'bot', label: 'Bot Status' },
        { value: 'rule', label: 'Auto-Replies' },
        { value: 'campaign', label: 'Broadcasts' },
        { value: 'reminder', label: 'Reminders' },
        { value: 'message', label: 'Messages' },
        { value: 'error', label: 'Errors' },
    ]

    return (
        <div className="min-h-screen bg-[#09090b] text-zinc-100 font-sans p-8 animate-in fade-in duration-500">
            {/* Header Area */}
            <div className="max-w-7xl mx-auto space-y-6">

                {/* Navigation & Actions */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <button
                        onClick={() => router.push(`/dashboard/bots/${botId}`)}
                        className="group flex items-center gap-2 text-sm text-zinc-500 hover:text-white transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                        Back to Bot
                    </button>

                    <div className="flex items-center gap-3">
                        {/* Time Range Selector */}
                        <div className="bg-[#0e0e11] border border-zinc-800 rounded-lg p-1 flex items-center">
                            {(['24h', '7d', '30d'] as const).map(range => (
                                <button
                                    key={range}
                                    onClick={() => setTimeRange(range)}
                                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${timeRange === range
                                        ? 'bg-zinc-800 text-white shadow-sm'
                                        : 'text-zinc-500 hover:text-zinc-300'
                                        }`}
                                >
                                    {range.toUpperCase()}
                                </button>
                            ))}
                        </div>

                        {/* Search */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                            <input
                                type="text"
                                placeholder="Search logs..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 pr-4 py-2 bg-[#0e0e11] border border-zinc-800 rounded-lg text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-700 w-64 transition-all"
                            />
                        </div>

                        <button
                            onClick={handleRefresh}
                            className={`p-2 bg-[#0e0e11] border border-zinc-800 rounded-lg text-zinc-400 hover:text-white hover:border-zinc-700 transition-all ${loading ? 'animate-spin' : ''}`}
                        >
                            <RefreshCw className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Title Section */}
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight text-white flex items-center gap-2">
                        {botName} Activity
                        <span className="text-zinc-500 text-lg font-normal">/ History</span>
                    </h1>
                    <p className="text-zinc-500 text-sm mt-1">Detailed log of all automated actions and messages for this bot.</p>
                </div>

                {/* Filters */}
                <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar border-b border-zinc-800/50">
                    {filterTabs.map((tab) => (
                        <button
                            key={tab.value}
                            onClick={() => {
                                setFilter(tab.value)
                                setCurrentPage(1)
                            }}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${filter === tab.value
                                ? 'bg-zinc-100 text-black'
                                : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900'
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Main List */}
                <div className="bg-[#0e0e11] border border-zinc-800/50 rounded-xl overflow-hidden shadow-sm">
                    {loading && activityLogs.length === 0 ? (
                        <div className="h-64 flex flex-col items-center justify-center text-zinc-500 gap-2">
                            <div className="w-5 h-5 border-2 border-zinc-700 border-t-zinc-400 rounded-full animate-spin" />
                            <span className="text-xs">Loading history...</span>
                        </div>
                    ) : paginatedLogs.length > 0 ? (
                        <div className="divide-y divide-zinc-800/30">
                            {paginatedLogs.map((log) => {
                                const relTime = getRelativeTime(log.timestamp)

                                return (
                                    <div
                                        key={log.id}
                                        onClick={() => setSelectedLog(log)}
                                        className="group flex items-start gap-4 px-6 py-4 hover:bg-zinc-900/50 hover:bg-[#131317] bg-transparent border-b border-zinc-800/30 last:border-0 border-l-2 border-l-transparent hover:border-l-blue-500 transition-all cursor-pointer"
                                    >
                                        {/* Icon */}
                                        <div className={`flex-shrink-0 p-2.5 rounded-xl ${getColorBg(log)} mt-0.5 transition-colors`}>
                                            {getIcon(log)}
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0 pt-1">
                                            {renderMessage(log)}
                                        </div>

                                        {/* Timestamp & Meta */}
                                        <div className="text-right flex-shrink-0 flex flex-col items-end gap-1.5 ml-4 pt-1">
                                            <div className="flex items-center gap-2">
                                                {relTime && (
                                                    <span className="text-[10px] font-medium text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                                                        {relTime}
                                                    </span>
                                                )}
                                                <div className="text-xs font-mono text-zinc-500 group-hover:text-zinc-300 transition-colors">
                                                    {formatTimestamp(log.timestamp)}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    ) : (
                        <div className="h-64 flex flex-col items-center justify-center text-zinc-500 gap-2">
                            <Activity className="w-8 h-8 opacity-20" />
                            <p className="text-sm">No activity found for this filter.</p>
                        </div>
                    )}
                </div>

                {/* Pagination */}
                {filteredLogs.length > 0 && (
                    <div className="flex items-center justify-between text-xs text-zinc-500 p-4 border-t border-zinc-800">
                        <div>
                            Showing {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredLogs.length)} of {filteredLogs.length}
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="p-1 hover:text-white disabled:opacity-30 disabled:hover:text-zinc-500 transition-colors"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <span className="font-mono text-zinc-400">{currentPage}</span>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="p-1 hover:text-white disabled:opacity-30 disabled:hover:text-zinc-500 transition-colors"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}

                <LogDetailModal
                    isOpen={!!selectedLog}
                    onClose={() => setSelectedLog(null)}
                    log={selectedLog}
                />

            </div>
        </div>
    )
}
