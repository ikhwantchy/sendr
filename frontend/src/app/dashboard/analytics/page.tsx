'use client'

import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, Cell, Brush
} from 'recharts'
import {
    ArrowUpRight, ArrowDownRight, MessageSquare, Megaphone,
    Bell, Activity, Calendar, Download
} from 'lucide-react'
import { format, parseISO } from 'date-fns'

// Types
type TimeRange = '30m' | '24h' | '7d' | '30d'

interface KPICardProps {
    title: string
    value: number | string
    trend?: number
    icon: any
    loading?: boolean
}

// Custom Tooltip for Recharts
const CustomTooltip = ({ active, payload, label, hiddenSeries }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-zinc-900 border border-zinc-800 p-3 rounded-lg shadow-xl">
                <p className="text-zinc-400 text-xs mb-2">
                    {/* Try to format label nicely */}
                    {label}
                </p>
                {payload.map((entry: any, index: number) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                        <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: entry.color }}
                        />
                        <span className="text-zinc-300 capitalize">{entry.name}:</span>
                        <span className="text-zinc-100 font-mono font-medium">
                            {entry.value.toLocaleString()}
                        </span>
                    </div>
                ))}
            </div>
        )
    }
    return null
}

export default function AnalyticsDashboard() {
    const [timeRange, setTimeRange] = useState<TimeRange>('24h')
    const [loading, setLoading] = useState(true)
    const [data, setData] = useState<any>(null)
    const [hiddenSeries, setHiddenSeries] = useState<string[]>([])

    const toggleSeries = (key: string) => {
        setHiddenSeries(prev =>
            prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
        )
    }

    useEffect(() => {
        fetchData() // Initial load

        // Auto-refresh every 3 seconds
        const interval = setInterval(() => {
            fetchData(true) // true = background update (no loading spinner)
        }, 3000)

        return () => clearInterval(interval)
    }, [timeRange])

    const fetchData = async (isBackground = false) => {
        if (!isBackground) setLoading(true)
        try {
            const res = await api.analytics.getFull(timeRange)
            if (res.data.success) {
                setData(res.data.data)
            }
        } catch (error) {
            console.error('Failed to fetch analytics:', error)
        } finally {
            if (!isBackground) setLoading(false)
        }
    }

    const exportData = () => {
        alert('Export functionality coming soon')
    }

    // Default empty state if no data
    const trafficData = data?.trafficChart || []
    const messageDistribution = data?.messageDistribution || []
    const topBots = data?.topBots || []
    const summary = data?.summary || {
        totalMessages: 0,
        trend: 0,
        campaigns: 0,
        reminders: 0,
        activeBots: 0,
        totalBots: 0
    }

    // Format X-Axis ticks based on TimeRange
    const formatXAxis = (tickItem: string) => {
        try {
            if (!tickItem) return ''
            const date = new Date(tickItem)
            if (isNaN(date.getTime())) return tickItem // Fallback if string is weird

            if (timeRange === '30m' || timeRange === '24h') {
                return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            } else if (timeRange === '7d') {
                return date.toLocaleDateString([], { day: 'numeric', month: 'short' })
            } else {
                return date.toLocaleDateString([], { day: 'numeric', month: 'short' })
            }
        } catch (e) {
            return tickItem
        }
    }

    return (
        <div className="p-8 space-y-8 min-h-screen bg-black text-zinc-100">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight text-white mb-1">
                        Analytics Overview
                    </h1>
                    <p className="text-zinc-500 text-sm">
                        Performance metrics and traffic analysis
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    {/* Time Range Filter */}
                    {/* Time Range Filter - Dropdown Style */}
                    <div className="relative">
                        <button
                            onClick={() => {
                                const dropdown = document.getElementById('analytics-time-range-dropdown')
                                if (dropdown) {
                                    dropdown.classList.toggle('hidden')
                                }
                            }}
                            onBlur={(e) => {
                                setTimeout(() => {
                                    const dropdown = document.getElementById('analytics-time-range-dropdown')
                                    if (dropdown && !dropdown.contains(e.relatedTarget as Node)) {
                                        dropdown.classList.add('hidden')
                                    }
                                }, 150)
                            }}
                            className="inline-flex items-center gap-2 px-3 py-1.5 bg-zinc-900/80 border border-zinc-800/50 rounded-lg text-xs font-medium text-zinc-100 hover:bg-zinc-800/80 transition-all"
                        >
                            <span>
                                {timeRange === '30m' ? '30M' :
                                    timeRange === '24h' ? '24H' :
                                        timeRange === '7d' ? '7D' : '30D'}
                            </span>
                            <svg className="w-3 h-3 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>
                        <div
                            id="analytics-time-range-dropdown"
                            className="hidden absolute top-full right-0 mt-2 w-28 bg-zinc-900 border border-zinc-800 rounded-lg shadow-lg overflow-hidden z-20"
                        >
                            {[
                                { label: '30 Minutes', value: '30m' },
                                { label: '24 Hours', value: '24h' },
                                { label: '7 Days', value: '7d' },
                                { label: '30 Days', value: '30d' }
                            ].map((option) => (
                                <button
                                    key={option.value}
                                    onClick={() => {
                                        setTimeRange(option.value as TimeRange)
                                        document.getElementById('analytics-time-range-dropdown')?.classList.add('hidden')
                                    }}
                                    className={`w-full px-4 py-2 text-xs text-left transition-colors ${timeRange === option.value
                                        ? 'bg-zinc-800 text-zinc-100'
                                        : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'
                                        }`}
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <button
                        onClick={exportData}
                        className="p-2 bg-zinc-900 border border-zinc-800/50 rounded-lg text-zinc-400 hover:text-white hover:border-zinc-700 transition-colors"
                    >
                        <Download className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* KPI Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <KPICard
                    title="Total Messages"
                    value={summary.totalMessages}
                    trend={summary.trend}
                    icon={<MessageSquare className="w-5 h-5" />}
                    loading={loading}
                />
                <KPICard
                    title="Campaigns Sent"
                    value={summary.campaigns}
                    icon={<Megaphone className="w-5 h-5" />}
                    loading={loading}
                />
                <KPICard
                    title="Reminders"
                    value={summary.reminders}
                    icon={<Bell className="w-5 h-5" />}
                    loading={loading}
                />
                <KPICard
                    title="Bot Health"
                    value={`${summary.activeBots}/${summary.totalBots}`}
                    icon={<Activity className="w-5 h-5" />}
                    loading={loading}
                />
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Primary Chart: Traffic Volume */}
                <div className="lg:col-span-2 bg-zinc-950 border border-zinc-900 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-medium text-zinc-200">Traffic Volume</h3>
                        <div className="flex flex-wrap items-center gap-4 text-xs">
                            <LegendItem
                                color="bg-blue-500"
                                label="Auto-Replies"
                                onClick={() => toggleSeries('auto_replies')}
                                hidden={hiddenSeries.includes('auto_replies')}
                            />
                            <LegendItem
                                color="bg-orange-500"
                                label="Campaigns"
                                onClick={() => toggleSeries('campaigns')}
                                hidden={hiddenSeries.includes('campaigns')}
                            />
                            <LegendItem
                                color="bg-purple-500"
                                label="Reminders"
                                onClick={() => toggleSeries('reminders')}
                                hidden={hiddenSeries.includes('reminders')}
                            />
                            <LegendItem
                                color="bg-emerald-500"
                                label="Received"
                                onClick={() => toggleSeries('received')}
                                hidden={hiddenSeries.includes('received')}
                            />

                            {/* Zoom Buttons */}
                            <div className="flex items-center gap-1 ml-2">
                                <button
                                    onClick={() => {
                                        const levels: TimeRange[] = ['30m', '24h', '7d', '30d']
                                        const currentIndex = levels.indexOf(timeRange)
                                        if (currentIndex > 0) {
                                            setTimeRange(levels[currentIndex - 1])
                                        }
                                    }}
                                    disabled={timeRange === '30m'}
                                    className={`p-1.5 rounded-md transition-all ${timeRange !== '30m'
                                        ? 'bg-zinc-900/80 border border-zinc-800/50 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/80'
                                        : 'bg-zinc-900/30 border border-zinc-800/30 text-zinc-700 cursor-not-allowed'
                                        }`}
                                    title="Zoom In (More Detail)"
                                >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
                                    </svg>
                                </button>
                                <button
                                    onClick={() => {
                                        const levels: TimeRange[] = ['30m', '24h', '7d', '30d']
                                        const currentIndex = levels.indexOf(timeRange)
                                        if (currentIndex < levels.length - 1) {
                                            setTimeRange(levels[currentIndex + 1])
                                        }
                                    }}
                                    disabled={timeRange === '30d'}
                                    className={`p-1.5 rounded-md transition-all ${timeRange !== '30d'
                                        ? 'bg-zinc-900/80 border border-zinc-800/50 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/80'
                                        : 'bg-zinc-900/30 border border-zinc-800/30 text-zinc-700 cursor-not-allowed'
                                        }`}
                                    title="Zoom Out (Wider View)"
                                >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>

                    <style jsx global>{`
                        .no-scrollbar::-webkit-scrollbar {
                            display: none;
                        }
                        .no-scrollbar {
                            -ms-overflow-style: none;
                            scrollbar-width: none;
                        }
                    `}</style>
                    <div className="h-[300px] w-full overflow-hidden no-scrollbar">
                        {loading && !data ? (
                            <div className="h-full w-full flex items-center justify-center bg-zinc-900/30 rounded-lg">
                                <span className="text-zinc-600 text-sm animate-pulse">Loading data...</span>
                            </div>
                        ) : trafficData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={trafficData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorAuto" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="colorCampaign" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="colorReminder" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="colorReceived" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                                    <XAxis
                                        dataKey="date"
                                        stroke="#52525b"
                                        tick={{ fill: '#71717a', fontSize: 12 }}
                                        tickLine={false}
                                        axisLine={false}
                                        tickFormatter={formatXAxis}
                                        minTickGap={30}
                                    />
                                    <YAxis
                                        stroke="#52525b"
                                        tick={{ fill: '#71717a', fontSize: 12 }}
                                        tickLine={false}
                                        axisLine={false}
                                    />
                                    <Tooltip
                                        content={<CustomTooltip hiddenSeries={hiddenSeries} />}
                                        cursor={{ stroke: '#3f3f46', strokeWidth: 1 }}
                                        labelFormatter={formatXAxis}
                                    />

                                    <Area
                                        type="monotone"
                                        dataKey="auto_replies"
                                        stroke="#3b82f6"
                                        strokeWidth={2}
                                        fillOpacity={1}
                                        fill="url(#colorAuto)"
                                        name="Auto-Replies"
                                        hide={hiddenSeries.includes('auto_replies')}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="campaigns"
                                        stroke="#f97316"
                                        strokeWidth={2}
                                        fillOpacity={1}
                                        fill="url(#colorCampaign)"
                                        name="Campaigns"
                                        hide={hiddenSeries.includes('campaigns')}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="reminders"
                                        stroke="#a855f7"
                                        strokeWidth={2}
                                        fillOpacity={1}
                                        fill="url(#colorReminder)"
                                        name="Reminders"
                                        hide={hiddenSeries.includes('reminders')}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="received"
                                        stroke="#10b981"
                                        strokeWidth={2}
                                        fillOpacity={1}
                                        fill="url(#colorReceived)"
                                        name="Received"
                                        hide={hiddenSeries.includes('received')}
                                    />

                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-zinc-600 text-sm">
                                No traffic data available for this period
                            </div>
                        )}
                    </div>
                </div>

                {/* Secondary Chart: Distribution */}
                <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-6 flex flex-col">
                    <h3 className="text-lg font-medium text-zinc-200 mb-6">Message Type</h3>

                    <div className="flex-1 min-h-[200px]">
                        {loading && !data ? (
                            <div className="h-full w-full flex items-center justify-center bg-zinc-900/30 rounded-lg">
                                <span className="text-zinc-600 text-sm animate-pulse">Loading...</span>
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={messageDistribution} layout="vertical" margin={{ left: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={true} vertical={false} />
                                    <XAxis type="number" hide />
                                    <YAxis
                                        dataKey="type"
                                        type="category"
                                        stroke="#52525b"
                                        tick={{ fill: '#a1a1aa', fontSize: 12 }}
                                        tickLine={false}
                                        axisLine={false}
                                        width={80}
                                    />
                                    <Tooltip
                                        cursor={{ fill: '#27272a' }}
                                        contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', color: '#fff' }}
                                    />
                                    <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={32}>
                                        {messageDistribution.map((entry: any, index: number) => (
                                            <Cell key={`cell-${index}`} fill={['#3b82f6', '#f97316', '#a855f7'][index % 3]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>
            </div>

            {/* Leaderboard Table */}
            <div className="bg-zinc-950 border border-zinc-900 rounded-xl overflow-hidden">
                <div className="px-6 py-4 border-b border-zinc-800/50 flex justify-between items-center">
                    <h3 className="text-lg font-medium text-zinc-200">Top Performing Bots</h3>
                    <div className="text-xs text-zinc-500">Based on processed volume</div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-zinc-900/50 text-zinc-500 font-medium">
                            <tr>
                                <th className="px-6 py-3">Bot Name</th>
                                <th className="px-6 py-3">Status</th>
                                <th className="px-6 py-3">Activity Score</th>
                                <th className="px-6 py-3 text-right">Volume</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/50 text-zinc-300">
                            {loading && !data ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-8 text-center text-zinc-500">
                                        Loading leaderboard...
                                    </td>
                                </tr>
                            ) : topBots.length > 0 ? (
                                topBots.map((bot: any) => (
                                    <tr key={bot.id} className="hover:bg-zinc-900/30 transition-colors">
                                        <td className="px-6 py-4 font-medium text-white">{bot.name}</td>
                                        <td className="px-6 py-4">
                                            <Badge status={bot.status} />
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-24 h-2 bg-zinc-800 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-indigo-500 rounded-full"
                                                        style={{ width: `${bot.activityScore}%` }}
                                                    />
                                                </div>
                                                <span className="text-xs font-mono text-zinc-500">
                                                    {bot.activityScore}/100
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right font-mono text-zinc-400">
                                            {bot.volume.toLocaleString()}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={4} className="px-6 py-8 text-center text-zinc-500">
                                        No active bots found for this period
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}

function LegendItem({ color, label, onClick, hidden }: { color: string, label: string, onClick?: () => void, hidden?: boolean }) {
    return (
        <button
            onClick={onClick}
            className={`flex items-center gap-2 transition-all ${hidden ? 'opacity-40 grayscale' : 'opacity-100'}`}
        >
            <span className={`w-2 h-2 rounded-full ${color}`}></span>
            <span className="text-zinc-500 hover:text-zinc-300">{label}</span>
        </button>
    )
}

function KPICard({ title, value, trend, icon, loading }: KPICardProps) {
    return (
        <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-6 relative overflow-hidden group hover:border-zinc-800 transition-colors">
            <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-zinc-900 rounded-lg text-zinc-100 group-hover:bg-zinc-800 transition-colors">
                    {icon}
                </div>
                {trend !== undefined && (
                    <div className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${trend >= 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'
                        }`}>
                        {trend >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                        {Math.abs(trend)}%
                    </div>
                )}
            </div>

            <div className="space-y-1">
                {loading && value === undefined ? (
                    <div className="h-8 w-24 bg-zinc-900 rounded animate-pulse" />
                ) : (
                    <h3 className="text-3xl font-bold text-white tracking-tight">
                        {typeof value === 'number' ? value.toLocaleString() : value}
                    </h3>
                )}
                <p className="text-sm text-zinc-500 font-medium">{title}</p>
            </div>
        </div>
    )
}

function Badge({ status }: { status: string }) {
    const styles = {
        connected: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
        disconnected: 'bg-red-500/10 text-red-500 border-red-500/20',
        connecting: 'bg-amber-500/10 text-amber-500 border-amber-500/20'
    }
    const style = styles[status as keyof typeof styles] || 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20'

    return (
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${style} capitalize`}>
            {status}
        </span>
    )
}
