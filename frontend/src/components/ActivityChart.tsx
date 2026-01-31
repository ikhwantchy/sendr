'use client'

import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts'
import { useState } from 'react'
import { ZoomIn, ZoomOut } from 'lucide-react'

// Mock data if none provided
const defaultData = [
    { time: '00:00', value: 12 },
    { time: '04:00', value: 18 },
    { time: '08:00', value: 45 },
    { time: '12:00', value: 92 },
    { time: '16:00', value: 64 },
    { time: '20:00', value: 35 },
    { time: '23:59', value: 20 },
]

interface ActivityChartProps {
    title?: string
    data?: any[]
    className?: string
    timeRange?: string
    onTimeRangeChange?: (range: string) => void
}

// Zoom levels: 30m → 24h → 7d → 30d
const ZOOM_LEVELS = ['30m', '24h', '7d', '30d']

// Custom Tooltip - Exactly like Traffic Volume
const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        // Format label to full datetime YYYY-MM-DD HH:MM
        let formattedLabel = label
        if (label && !label.includes('-')) {
            // If label is just time (e.g., "17:33"), add today's date
            const now = new Date()
            const year = now.getFullYear()
            const month = String(now.getMonth() + 1).padStart(2, '0')
            const day = String(now.getDate()).padStart(2, '0')
            formattedLabel = `${year}-${month}-${day} ${label}`
        }

        return (
            <div className="bg-zinc-900 border border-zinc-800 p-3 rounded-lg shadow-xl">
                <p className="text-zinc-400 text-xs mb-2">
                    {formattedLabel}
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

// Legend Item Component - Exactly like Traffic Volume
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

export default function ActivityChart({
    title = 'Message Volume',
    data = defaultData,
    className,
    timeRange = '24h',
    onTimeRangeChange
}: ActivityChartProps) {
    // State for hidden series - using array like Traffic Volume
    const [hiddenSeries, setHiddenSeries] = useState<string[]>([])

    // Toggle series visibility - exactly like Traffic Volume
    const toggleSeries = (key: string) => {
        setHiddenSeries(prev =>
            prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
        )
    }

    // Zoom functions
    const handleZoomIn = () => {
        if (!onTimeRangeChange) return
        const currentIndex = ZOOM_LEVELS.indexOf(timeRange)
        if (currentIndex > 0) {
            onTimeRangeChange(ZOOM_LEVELS[currentIndex - 1])
        }
    }

    const handleZoomOut = () => {
        if (!onTimeRangeChange) return
        const currentIndex = ZOOM_LEVELS.indexOf(timeRange)
        if (currentIndex < ZOOM_LEVELS.length - 1) {
            onTimeRangeChange(ZOOM_LEVELS[currentIndex + 1])
        }
    }

    const canZoomIn = ZOOM_LEVELS.indexOf(timeRange) > 0
    const canZoomOut = ZOOM_LEVELS.indexOf(timeRange) < ZOOM_LEVELS.length - 1

    return (
        <div className={`bg-[#0e0e11] border border-zinc-800/50 rounded-xl p-6 ${className || ''}`}>
            <div className="flex items-center justify-between mb-6">
                {title && (
                    <h3 className="text-lg font-medium text-zinc-200">{title}</h3>
                )}

                {/* Interactive Legend + Zoom Buttons + Dropdown on the right */}
                <div className="flex flex-wrap items-center gap-4 text-xs">
                    <LegendItem
                        color="bg-blue-500"
                        label="Auto-Replies"
                        onClick={() => toggleSeries('auto_reply')}
                        hidden={hiddenSeries.includes('auto_reply')}
                    />
                    <LegendItem
                        color="bg-orange-500"
                        label="Campaigns"
                        onClick={() => toggleSeries('campaign')}
                        hidden={hiddenSeries.includes('campaign')}
                    />
                    <LegendItem
                        color="bg-purple-500"
                        label="Reminders"
                        onClick={() => toggleSeries('reminder')}
                        hidden={hiddenSeries.includes('reminder')}
                    />
                    <LegendItem
                        color="bg-emerald-500"
                        label="Received"
                        onClick={() => toggleSeries('received')}
                        hidden={hiddenSeries.includes('received')}
                    />

                    {/* Zoom Buttons */}
                    {onTimeRangeChange && (
                        <div className="flex items-center gap-1 ml-2">
                            <button
                                onClick={handleZoomIn}
                                disabled={!canZoomIn}
                                className={`p-1.5 rounded-md transition-all ${canZoomIn
                                    ? 'bg-zinc-900/80 border border-zinc-800/50 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/80'
                                    : 'bg-zinc-900/30 border border-zinc-800/30 text-zinc-700 cursor-not-allowed'
                                    }`}
                                title="Zoom In (More Detail)"
                            >
                                <ZoomIn className="w-3.5 h-3.5" />
                            </button>
                            <button
                                onClick={handleZoomOut}
                                disabled={!canZoomOut}
                                className={`p-1.5 rounded-md transition-all ${canZoomOut
                                    ? 'bg-zinc-900/80 border border-zinc-800/50 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/80'
                                    : 'bg-zinc-900/30 border border-zinc-800/30 text-zinc-700 cursor-not-allowed'
                                    }`}
                                title="Zoom Out (Wider View)"
                            >
                                <ZoomOut className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    )}

                    {/* Time Range Dropdown - After zoom buttons */}
                    {onTimeRangeChange && (
                        <div className="relative">
                            <button
                                onClick={() => {
                                    const dropdown = document.getElementById('chart-time-range-dropdown')
                                    if (dropdown) {
                                        dropdown.classList.toggle('hidden')
                                    }
                                }}
                                onBlur={(e) => {
                                    setTimeout(() => {
                                        const dropdown = document.getElementById('chart-time-range-dropdown')
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
                                id="chart-time-range-dropdown"
                                className="hidden absolute top-full right-0 mt-2 w-28 bg-zinc-900 border border-zinc-800 rounded-lg shadow-lg overflow-hidden z-10"
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
                                            onTimeRangeChange(option.value)
                                            document.getElementById('chart-time-range-dropdown')?.classList.add('hidden')
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
                    )}
                </div>
            </div>

            <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorAutoReply" x1="0" y1="0" x2="0" y2="1">
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
                            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                        <XAxis
                            dataKey="time"
                            stroke="#52525b"
                            tick={{ fill: '#71717a', fontSize: 12 }}
                            tickLine={false}
                            axisLine={false}
                            minTickGap={30}
                        />
                        <YAxis
                            stroke="#52525b"
                            tick={{ fill: '#71717a', fontSize: 12 }}
                            tickLine={false}
                            axisLine={false}
                        />
                        <Tooltip
                            content={<CustomTooltip />}
                            cursor={{ stroke: '#3f3f46', strokeWidth: 1 }}
                        />

                        {/* Render Areas - NO stackId, using hide prop like Traffic Volume */}
                        {data && data.length > 0 && 'received' in data[0] ? (
                            <>
                                <Area
                                    type="monotone"
                                    dataKey="auto_reply"
                                    stroke="#3b82f6"
                                    strokeWidth={2}
                                    fillOpacity={1}
                                    fill="url(#colorAutoReply)"
                                    name="Auto-Replies"
                                    hide={hiddenSeries.includes('auto_reply')}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="campaign"
                                    stroke="#f97316"
                                    strokeWidth={2}
                                    fillOpacity={1}
                                    fill="url(#colorCampaign)"
                                    name="Campaigns"
                                    hide={hiddenSeries.includes('campaign')}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="reminder"
                                    stroke="#a855f7"
                                    strokeWidth={2}
                                    fillOpacity={1}
                                    fill="url(#colorReminder)"
                                    name="Reminders"
                                    hide={hiddenSeries.includes('reminder')}
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
                            </>
                        ) : (
                            <Area
                                type="monotone"
                                dataKey="value"
                                stroke="#3b82f6"
                                strokeWidth={2}
                                fillOpacity={1}
                                fill="url(#colorValue)"
                            />
                        )}
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    )
}
