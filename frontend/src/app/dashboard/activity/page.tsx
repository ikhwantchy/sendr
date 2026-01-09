'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Search, RefreshCw, CheckCircle2, XCircle, AlertTriangle, Activity, Filter, ChevronLeft, ChevronRight, Clock, Bot, Zap, Megaphone, MessageCircle, Play, Pause, Wifi, WifiOff } from 'lucide-react'

interface ActivityLog {
    id: string
    type: 'bot' | 'rule' | 'campaign' | 'reminder' | 'message' | 'error'
    message: string
    timestamp: string
}

export default function ActivityHistoryPage() {
    const router = useRouter()
    const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState<string>('all')
    const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('24h')
    const [searchQuery, setSearchQuery] = useState('')
    const [currentPage, setCurrentPage] = useState(1)
    const [selectedLog, setSelectedLog] = useState<ActivityLog | null>(null)
    const itemsPerPage = 25

    useEffect(() => {
        const token = localStorage.getItem('token')
        if (!token) {
            router.push('/login')
            return
        }

        fetchActivityLogs(token)

        // Auto-refresh every 5 seconds for "Real-time" feel
        const interval = setInterval(() => {
            fetchActivityLogs(token)
        }, 5000)

        return () => clearInterval(interval)
    }, [router, timeRange])

    const fetchActivityLogs = async (token: string) => {
        try {
            // Fetch more logs to allow pagination, with timeRange filter
            const response = await fetch(`http://localhost:3001/api/analytics/activity-logs?limit=500&timeRange=${timeRange}`, {
                cache: 'no-store',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            })

            if (response.ok) {
                const data = await response.json()
                if (data.success && data.data) {
                    setActivityLogs(data.data)
                }
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
            case 'rule': return <Zap className="w-4 h-4 text-amber-500" />
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
            case 'rule': return 'bg-amber-500/10'
            case 'campaign': return 'bg-purple-500/10'
            case 'message': return 'bg-emerald-500/10'
            case 'reminder': return 'bg-cyan-500/10'
            case 'error': return 'bg-red-500/10'
            default: return 'bg-zinc-500/10'
        }
    }

    const renderMessage = (msg: string) => {
        const parts = msg.split(' ')
        return (
            <span className="text-sm text-zinc-200 break-words inline-block">
                {parts.map((part, i) => {
                    const lower = part.toLowerCase()
                    let className = ''
                    if (lower.includes('resumed')) className = 'text-blue-500 font-medium'
                    else if (lower.includes('paused')) className = 'text-yellow-500 font-medium'
                    else if (lower.includes('connected') && !lower.includes('dis')) className = 'text-emerald-400 font-medium'
                    else if (lower.includes('disconnected')) className = 'text-red-400 font-medium'

                    return <span key={i} className={`${className} mr-1`}>{part}</span>
                })}
            </span>
        )
    }

    // "Real" absolute timestamp format: Jan 01, 14:30:45
    // Force UTC interpretation if 'Z' is missing to ensure local conversion
    const formatTimestamp = (timestamp: string) => {
        const timeString = timestamp.endsWith('Z') ? timestamp : `${timestamp}Z`
        const date = new Date(timeString)
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
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
        const token = localStorage.getItem('token')
        if (token) {
            setLoading(true)
            fetchActivityLogs(token)
        }
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
        { value: 'bot', label: 'Bot' },
        { value: 'rule', label: 'Rules' },
        { value: 'campaign', label: 'Campaigns' },
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
                        onClick={() => router.back()}
                        className="group flex items-center gap-2 text-sm text-zinc-500 hover:text-white transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                        Back
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
                    <h1 className="text-2xl font-semibold tracking-tight text-white">Activity History</h1>
                    <p className="text-zinc-500 text-sm mt-1">Real-time audit log of system events and automations.</p>
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
                                        className="group flex items-center gap-4 px-6 py-3.5 hover:bg-zinc-900/50 transition-colors cursor-pointer"
                                    >
                                        {/* Icon */}
                                        <div className={`flex-shrink-0 p-2 rounded-lg ${getColorBg(log)}`}>
                                            {getIcon(log)}
                                        </div>



                                        {/* Content */}
                                        <div className="flex-1">
                                            <div className="flex items-start gap-2 flex-wrap">
                                                {renderMessage(log.message)}
                                                {relTime && (
                                                    <span className="text-[10px] text-emerald-500 bg-emerald-500/10 px-1.5 rounded-sm font-medium flex-shrink-0">
                                                        {relTime}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="text-[10px] uppercase tracking-wider font-semibold text-zinc-500">
                                                    {log.type}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Timestamp */}
                                        <div className="text-right flex-shrink-0">
                                            <div className="text-xs font-mono text-zinc-500 group-hover:text-zinc-300 transition-colors">
                                                {formatTimestamp(log.timestamp)}
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
                    <div className="flex items-center justify-between text-xs text-zinc-500">
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

                {/* Modal for Full Message */}
                {selectedLog && (
                    <div
                        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
                        onClick={() => setSelectedLog(null)}
                    >
                        <div
                            className="bg-[#0e0e11] border border-zinc-800 rounded-xl max-w-2xl w-full p-6 shadow-2xl animate-in zoom-in-95 duration-200"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2.5 rounded-lg ${getColorBg(selectedLog)}`}>
                                        {getIcon(selectedLog)}
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold text-white">Log Details</h3>
                                        <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold mt-0.5">
                                            {selectedLog.type}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setSelectedLog(null)}
                                    className="text-zinc-500 hover:text-white transition-colors"
                                >
                                    <XCircle className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Message Content */}
                            <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 mb-4">
                                <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap break-words">
                                    {selectedLog.message}
                                </p>
                            </div>

                            {/* Timestamp */}
                            <div className="flex items-center gap-2 text-xs text-zinc-500">
                                <Clock className="w-3.5 h-3.5" />
                                <span className="font-mono">{formatTimestamp(selectedLog.timestamp)}</span>
                                {getRelativeTime(selectedLog.timestamp) && (
                                    <span className="text-emerald-500">
                                        ({getRelativeTime(selectedLog.timestamp)})
                                    </span>
                                )}
                            </div>

                            {/* Close Button */}
                            <div className="mt-6 flex justify-end">
                                <button
                                    onClick={() => setSelectedLog(null)}
                                    className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-sm rounded-lg transition-colors"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </div>
    )
}
