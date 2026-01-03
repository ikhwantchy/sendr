'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import {
    Bot, MessageSquare, Zap, Clock, Plus, Activity,
    ArrowUpRight, Server, Cpu, HardDrive, HelpCircle, MessageCircle,
    Layout, Smartphone, FileText
} from 'lucide-react'
import Link from 'next/link'

interface DashboardStats {
    totalBots: number
    activeRules: number
    campaigns: number
    messagesSent: number
}

interface ActivityLog {
    id: string
    type: 'bot' | 'rule' | 'campaign' | 'message' | 'error'
    message: string
    timestamp: string
}

interface SystemStatus {
    cpu: number
    memory: number
    status: 'operational' | 'warning' | 'error'
    latency?: number
}

export default function DashboardPage() {
    const router = useRouter()
    const [user, setUser] = useState<any>(null)
    const [stats, setStats] = useState<DashboardStats>({
        totalBots: 0,
        activeRules: 0,
        campaigns: 0,
        messagesSent: 0
    })
    const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([])
    const [systemStatus, setSystemStatus] = useState<SystemStatus>({
        cpu: 0,
        memory: 0,
        status: 'operational',
        latency: 14
    })
    const [loading, setLoading] = useState(true)

    // Data Fetching
    const fetchData = async (isBackground = false) => {
        try {
            // Stats
            const statsRes = await api.analytics.getDashboardStats()
            if (statsRes.data.success) setStats(statsRes.data.data)

            // Activity
            const logsRes = await api.analytics.getActivityLogs(8)
            if (logsRes.data.success) setActivityLogs(logsRes.data.data)

            // System
            const sysRes = await api.analytics.getSystemStatus()
            if (sysRes.data.success) setSystemStatus(sysRes.data.data)

        } catch (error) {
            console.error('Data fetch error:', error)
        } finally {
            if (!isBackground) setLoading(false)
        }
    }

    useEffect(() => {
        const token = localStorage.getItem('token')
        const userData = localStorage.getItem('user')

        if (!token) {
            router.push('/login')
            return
        }

        if (userData) setUser(JSON.parse(userData))

        // Initial fetch
        fetchData()

        // Real-time updates
        const interval = setInterval(() => {
            fetchData(true)
        }, 3000)

        return () => clearInterval(interval)
    }, [router])

    const formatTimestamp = (timestamp: string) => {
        const timeString = timestamp.endsWith('Z') ? timestamp : `${timestamp}Z`
        const date = new Date(timeString)
        const now = new Date()
        const diff = Math.floor((now.getTime() - date.getTime()) / 1000)

        if (diff < 60) return `${Math.max(0, diff)}s ago`
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
        return `${Math.floor(diff / 86400)}d ago`
    }

    const getActivityIcon = (type: string) => {
        switch (type) {
            case 'bot': return <Bot className="w-3.5 h-3.5 text-blue-500" />
            case 'rule': return <Zap className="w-3.5 h-3.5 text-amber-500" />
            case 'campaign': return <MessageSquare className="w-3.5 h-3.5 text-emerald-500" />
            case 'error': return <Activity className="w-3.5 h-3.5 text-red-500" />
            default: return <Clock className="w-3.5 h-3.5 text-zinc-500" />
        }
    }

    if (!user || loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#09090b]">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-6 h-6 border-2 border-zinc-800 border-t-white rounded-full animate-spin" />
                    <p className="text-zinc-500 text-xs font-mono uppercase tracking-widest">Loading Workspace</p>
                </div>
            </div>
        )
    }

    return (
        <div className="p-8 space-y-8 min-h-screen bg-[#09090b] text-zinc-100 font-sans">
            {/* Header */}
            <div className="flex justify-between items-end border-b border-zinc-800/10 pb-6">
                <div>
                    <h1 className="text-2xl font-medium text-white tracking-tight">Overview</h1>
                    <p className="text-zinc-500 text-sm mt-1">Welcome back, {user.name.split(' ')[0]}</p>
                </div>

                <div className="flex items-center gap-6 text-sm text-zinc-500">
                    <button className="hover:text-white transition-colors">Feedback</button>
                    <button className="hover:text-white transition-colors">Help</button>
                    <div className="h-4 w-[1px] bg-zinc-800" />
                    <div className="flex items-center gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full ${systemStatus.status === 'operational' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                        <span className="font-medium text-zinc-400">System {systemStatus.status === 'operational' ? 'Normal' : systemStatus.status}</span>
                    </div>
                </div>
            </div>

            {/* KPI Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                <StatCard
                    label="Connected Bots"
                    value={stats.totalBots}
                    icon={<Bot className="w-4 h-4 text-zinc-500" />}
                />
                <StatCard
                    label="Total Messages"
                    value={stats.messagesSent.toLocaleString()}
                    icon={<MessageCircle className="w-4 h-4 text-zinc-500" />}
                />
                <StatCard
                    label="Active Rules"
                    value={stats.activeRules}
                    icon={<Zap className="w-4 h-4 text-zinc-500" />}
                />
                <StatCard
                    label="Uptime"
                    value="99.9%"
                    icon={<Activity className="w-4 h-4 text-zinc-500" />}
                />
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Left Column: Quick Actions & Activity */}
                <div className="lg:col-span-2 space-y-8">

                    {/* Quick Start Features */}
                    <div className="space-y-4">
                        <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Start Building</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <FeatureCard
                                icon={<Plus className="w-5 h-5 text-white" />}
                                title="Connect a Bot"
                                description="Link a new WhatsApp number to start automating."
                                onClick={() => router.push('/dashboard/bots')}
                            />
                            <FeatureCard
                                icon={<Layout className="w-5 h-5 text-white" />}
                                title="Create Campaign"
                                description="Send a broadcast message to multiple contacts."
                                onClick={() => router.push('/dashboard/bots')}
                            />
                        </div>
                    </div>

                    {/* Recent Activity */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Recent Activity</h3>
                            <Link href="/dashboard/activity" className="text-xs text-zinc-500 hover:text-white transition-colors">View All</Link>
                        </div>

                        <div className="bg-[#0e0e11] border border-zinc-800/50 rounded-xl overflow-hidden min-h-[300px]">
                            {activityLogs.length === 0 ? (
                                <div className="p-8 text-center text-zinc-600 text-sm flex flex-col items-center justify-center h-full">
                                    <Clock className="w-8 h-8 mb-3 opacity-20" />
                                    No recent activity
                                </div>
                            ) : (
                                <div className="divide-y divide-zinc-800/30">
                                    {activityLogs.map((log) => (
                                        <div key={log.id} className="group flex items-center gap-4 px-5 py-3 hover:bg-zinc-800/20 transition-colors">
                                            <div className="flex-shrink-0 mt-0.5">
                                                {getActivityIcon(log.type)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm text-zinc-300 group-hover:text-zinc-100 transition-colors truncate">
                                                    {log.message}
                                                </p>
                                            </div>
                                            <span className="text-xs font-mono text-zinc-600 whitespace-nowrap">
                                                {formatTimestamp(log.timestamp)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Column: System Status */}
                <div className="space-y-4">
                    <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">System Status</h3>
                    <div className="bg-[#0e0e11] border border-zinc-800/50 rounded-xl p-5 space-y-6">

                        {/* Metrics */}
                        <div className="space-y-5">
                            <SystemMetric label="CPU Usage" value={systemStatus.cpu} />
                            <SystemMetric label="Memory" value={systemStatus.memory} />

                            <div className="flex items-center justify-between text-sm pt-2">
                                <span className="text-zinc-500">Latency</span>
                                <span className="font-mono text-zinc-300">{systemStatus.latency || 14}ms</span>
                            </div>
                        </div>

                        {/* Divider */}
                        <div className="h-px bg-zinc-800/50" />

                        {/* Service Health */}
                        <div className="space-y-3">
                            <ServiceStatus name="API Gateway" status="operational" />
                            <ServiceStatus name="WhatsApp Engine" status="operational" />
                            <ServiceStatus name="Database" status="operational" />
                        </div>
                    </div>

                    {/* Pro Tip or Promo */}
                    <div className="bg-gradient-to-br from-zinc-900 to-black border border-zinc-800/50 rounded-xl p-5 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 blur-3xl rounded-full -mr-16 -mt-16 transition-opacity opacity-50 group-hover:opacity-80" />
                        <h4 className="text-sm font-medium text-white mb-2 relative z-10">Need help automating?</h4>
                        <p className="text-xs text-zinc-500 mb-4 relative z-10 leading-relaxed">
                            Check out our documentation to learn how to build complex flows with BroBot.
                        </p>
                        <a href="#" className="inline-flex items-center gap-2 text-xs font-medium text-white hover:text-zinc-300 transition-colors relative z-10">
                            Read Docs <ArrowUpRight className="w-3 h-3" />
                        </a>
                    </div>
                </div>
            </div>
        </div>
    )
}

// --- Subcomponents ---

function StatCard({ label, value, icon }: { label: string, value: string | number, icon: any }) {
    return (
        <div className="bg-[#0e0e11] border border-zinc-800/50 p-5 rounded-xl hover:border-zinc-700/50 transition-all duration-200 group">
            <div className="flex justify-between items-start mb-3">
                <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">{label}</span>
                <div className="opacity-50 group-hover:opacity-100 transition-opacity">
                    {icon}
                </div>
            </div>
            <div className="text-2xl font-medium text-zinc-100 tracking-tight font-sans">
                {value}
            </div>
        </div>
    )
}

function FeatureCard({ icon, title, description, onClick }: any) {
    return (
        <button
            onClick={onClick}
            className="flex flex-col items-start p-5 rounded-xl bg-[#0e0e11] border border-zinc-800/50 hover:bg-zinc-900 hover:border-zinc-700 transition-all text-left group w-full"
        >
            <div className="mb-3 p-2 rounded-lg bg-zinc-900 border border-zinc-800 group-hover:bg-black group-hover:border-zinc-700 transition-colors">
                {icon}
            </div>
            <h4 className="text-sm font-medium text-zinc-100 mb-1">{title}</h4>
            <p className="text-xs text-zinc-500 leading-relaxed">{description}</p>
        </button>
    )
}

function SystemMetric({ label, value }: { label: string, value: number }) {
    let color = 'bg-emerald-500'
    if (value >= 50) color = 'bg-amber-500'
    if (value >= 80) color = 'bg-red-500'

    return (
        <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
                <span className="text-zinc-500">{label}</span>
                <span className={`font-mono ${value >= 80 ? 'text-red-400' : 'text-zinc-300'}`}>{value}%</span>
            </div>
            <div className="h-1 w-full bg-zinc-800 rounded-full overflow-hidden">
                <div
                    className={`h-full ${color} rounded-full transition-all duration-500`}
                    style={{ width: `${value}%` }}
                />
            </div>
        </div>
    )
}

function ServiceStatus({ name, status }: { name: string, status: string }) {
    return (
        <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-400">{name}</span>
            <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
                <span className="text-zinc-500 capitalize">{status}</span>
            </div>
        </div>
    )
}
