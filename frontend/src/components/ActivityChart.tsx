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
import { useState, useEffect } from 'react'
import { ZoomIn, ZoomOut, ChevronDown } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'

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
    lastUpdated?: number // Timestamp from react-query dataUpdatedAt
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
            <div className="bg-[#16161a] border border-zinc-800 p-3 rounded-xl shadow-2xl backdrop-blur-md">
                <p className="text-zinc-500 text-[10px] uppercase font-bold tracking-wider mb-2">
                    {formattedLabel}
                </p>
                <div className="space-y-1.5">
                    {payload.map((entry: any, index: number) => (
                        <div key={index} className="flex items-center gap-3 text-sm">
                            <div
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: entry.color }}
                            />
                            <span className="text-zinc-400 text-xs">{entry.name}:</span>
                            <span className="text-zinc-100 font-mono font-bold ml-auto">
                                {entry.value.toLocaleString()}
                            </span>
                        </div>
                    ))}
                </div>
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
            className={`flex items-center gap-2 transition-all group ${hidden ? 'opacity-30 grayscale' : 'opacity-100'}`}
        >
            <span className={`w-2 h-2 rounded-full ${color} shadow-sm group-hover:scale-110 transition-transform`}></span>
            <span className="text-zinc-500 group-hover:text-zinc-300 transition-colors tracking-tight font-medium whitespace-nowrap">{label}</span>
        </button>
    )
}

export default function ActivityChart({
    title = 'Message Volume',
    data = defaultData,
    className,
    timeRange = '24h',
    onTimeRangeChange,
    lastUpdated
}: ActivityChartProps) {
    // State for hidden series - using array like Traffic Volume
    const [hiddenSeries, setHiddenSeries] = useState<string[]>([])
    const [showRangeDropdown, setShowRangeDropdown] = useState(false)

    // State for "ago" timer
    const [lastUpdatedText, setLastUpdatedText] = useState('just now')

    // Update "ago" text every second
    useEffect(() => {
        if (!lastUpdated) return

        const updateText = () => {
            const seconds = Math.floor((Date.now() - lastUpdated) / 1000)
            if (seconds < 5) {
                setLastUpdatedText('just now')
            } else if (seconds < 60) {
                setLastUpdatedText(`${seconds}s ago`)
            } else {
                setLastUpdatedText(`${Math.floor(seconds / 60)}m ago`)
            }
        }

        updateText()
        const interval = setInterval(updateText, 1000)
        return () => clearInterval(interval)
    }, [lastUpdated])

    // Toggle series visibility - exactly like Traffic Volume
    const toggleSeries = (key: string) => {
        setHiddenSeries((prev: string[]) =>
            prev.includes(key) ? prev.filter((k: string) => k !== key) : [...prev, key]
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
        <div className={`bg-[#0e0e11] border border-zinc-800/50 rounded-2xl p-4 sm:p-7 ${className || ''} shadow-sm overflow-visible`}>
            {/* Header: Title + Controls */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6 sm:mb-8 overflow-visible">
                {/* Title + Real-time indicator */}
                <div className="flex items-center gap-2 sm:gap-4 min-w-0">
                    {title && (
                        <h3 className="text-sm sm:text-lg font-bold text-white tracking-tight shrink-0">{title}</h3>
                    )}
                    {/* Real-time indicator */}
                    {lastUpdated && (
                        <div className="flex items-center gap-2 text-[10px] sm:text-xs text-zinc-500 font-medium whitespace-nowrap">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500/40 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                            <span className="hidden sm:inline lowercase text-zinc-600">{lastUpdatedText}</span>
                        </div>
                    )}
                </div>

                {/* Right Controls Container */}
                <div className="flex items-center gap-3 sm:gap-5 overflow-visible">
                    {/* Interactive Legend - Self-contained scroll on mobile */}
                    <div className="flex items-center gap-3 sm:gap-6 text-[10px] sm:text-[11px] overflow-x-auto scrollbar-hide pb-1 sm:pb-0">
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
                    </div>

                    {/* Static Controls (Zoom + Dropdown) */}
                    <div className="flex items-center gap-3 shrink-0 overflow-visible">
                        {/* Zoom Buttons */}
                        {onTimeRangeChange && (
                            <div className="flex items-center gap-1.5">
                                <button
                                    onClick={handleZoomIn}
                                    disabled={!canZoomIn}
                                    className={`p-1.5 sm:p-2 rounded-lg transition-all ${canZoomIn
                                        ? 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800'
                                        : 'bg-zinc-900/40 border border-zinc-800/40 text-zinc-800 cursor-not-allowed'
                                        }`}
                                    title="Zoom In"
                                >
                                    <ZoomIn className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                </button>
                                <button
                                    onClick={handleZoomOut}
                                    disabled={!canZoomOut}
                                    className={`p-1.5 sm:p-2 rounded-lg transition-all ${canZoomOut
                                        ? 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800'
                                        : 'bg-zinc-900/40 border border-zinc-800/40 text-zinc-800 cursor-not-allowed'
                                        }`}
                                    title="Zoom Out"
                                >
                                    <ZoomOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                </button>
                            </div>
                        )}

                        {/* Time Range Dropdown - MATCHING ANALYTICS UI */}
                        {onTimeRangeChange && (
                            <div className="relative">
                                <button
                                    id="chart-time-range-button"
                                    onClick={() => setShowRangeDropdown(!showRangeDropdown)}
                                    onBlur={(e) => {
                                        // Delay closure to allow for item clicks
                                        setTimeout(() => {
                                            if (!document.activeElement?.closest('#chart-time-range-dropdown')) {
                                                setShowRangeDropdown(false)
                                            }
                                        }, 150)
                                    }}
                                    className="inline-flex items-center gap-2.5 px-3 py-1.5 sm:py-2 bg-zinc-900 border border-zinc-800 rounded-full text-xs font-semibold text-white hover:bg-zinc-800 transition-all shadow-sm"
                                >
                                    <span className="whitespace-nowrap">
                                        Last {timeRange === '30m' ? '30m' :
                                            timeRange === '24h' ? '24h' :
                                                timeRange === '7d' ? '7d' : '30d'}
                                    </span>
                                    <ChevronDown className={`w-3.5 h-3.5 text-zinc-500 transition-transform duration-300 ${showRangeDropdown ? 'rotate-180 text-white' : ''}`} />
                                </button>

                                <AnimatePresence>
                                    {showRangeDropdown && (
                                        <motion.div
                                            id="chart-time-range-dropdown"
                                            initial={{ opacity: 0, scale: 0.96 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.96 }}
                                            transition={{ duration: 0.1 }}
                                            className="absolute top-full right-0 mt-2 w-36 bg-[#18181b] border border-zinc-800/80 rounded-2xl shadow-2xl overflow-hidden z-[150]"
                                        >
                                            <div className="py-2">
                                                {[
                                                    { label: 'Last 30m', value: '30m' },
                                                    { label: 'Last 24h', value: '24h' },
                                                    { label: 'Last 7d', value: '7d' },
                                                    { label: 'Last 30d', value: '30d' }
                                                ].map((option) => (
                                                    <button
                                                        key={option.value}
                                                        onClick={() => {
                                                            onTimeRangeChange(option.value)
                                                            setShowRangeDropdown(false)
                                                        }}
                                                        className={`w-full px-5 py-2.5 text-[13px] text-left transition-all ${timeRange === option.value
                                                            ? 'bg-zinc-800/80 text-white font-semibold'
                                                            : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/20'
                                                            }`}
                                                    >
                                                        {option.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="h-[220px] sm:h-[320px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorAutoReply" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="colorCampaign" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#f97316" stopOpacity={0.25} />
                                <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="colorReminder" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#a855f7" stopOpacity={0.25} />
                                <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="colorReceived" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} opacity={0.4} />
                        <XAxis
                            dataKey="time"
                            stroke="#52525b"
                            tick={{ fill: '#52525b', fontSize: 10, fontWeight: 500 }}
                            tickLine={false}
                            axisLine={false}
                            minTickGap={40}
                            dy={10}
                        />
                        <YAxis
                            stroke="#52525b"
                            tick={{ fill: '#52525b', fontSize: 10, fontWeight: 500 }}
                            tickLine={false}
                            axisLine={false}
                            dx={-10}
                        />
                        <Tooltip
                            content={<CustomTooltip />}
                            cursor={{ stroke: '#3f3f46', strokeWidth: 1.5, strokeDasharray: '4 4' }}
                        />

                        {/* Render Areas - NO stackId, using hide prop like Traffic Volume */}
                        {data && data.length > 0 && ('received' in data[0] || 'auto_reply' in data[0]) ? (
                            <>
                                <Area
                                    type="monotone"
                                    dataKey="auto_reply"
                                    stroke="#3b82f6"
                                    strokeWidth={2.5}
                                    fillOpacity={1}
                                    fill="url(#colorAutoReply)"
                                    name="Auto-Replies"
                                    hide={hiddenSeries.includes('auto_reply')}
                                    animationDuration={1000}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="campaign"
                                    stroke="#f97316"
                                    strokeWidth={2.5}
                                    fillOpacity={1}
                                    fill="url(#colorCampaign)"
                                    name="Campaigns"
                                    hide={hiddenSeries.includes('campaign')}
                                    animationDuration={1000}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="reminder"
                                    stroke="#a855f7"
                                    strokeWidth={2.5}
                                    fillOpacity={1}
                                    fill="url(#colorReminder)"
                                    name="Reminders"
                                    hide={hiddenSeries.includes('reminder')}
                                    animationDuration={1000}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="received"
                                    stroke="#10b981"
                                    strokeWidth={2.5}
                                    fillOpacity={1}
                                    fill="url(#colorReceived)"
                                    name="Received"
                                    hide={hiddenSeries.includes('received')}
                                    animationDuration={1000}
                                />
                            </>
                        ) : (
                            <Area
                                type="monotone"
                                dataKey="value"
                                stroke="#3b82f6"
                                strokeWidth={2.5}
                                fillOpacity={1}
                                fill="url(#colorValue)"
                                animationDuration={1000}
                            />
                        )}
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    )
}
