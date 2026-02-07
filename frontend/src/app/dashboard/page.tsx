'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import {
    Bot, MessageSquare, Zap, Clock, Plus, Activity,
    ArrowUpRight, Server, Cpu, HardDrive, HelpCircle, MessageCircle,
    Layout, Smartphone, FileText, UserPlus, Users, UserCheck, Bell
} from 'lucide-react'
import Link from 'next/link'
import RecentActivityList from '@/components/RecentActivityList'

interface DashboardStats {
    totalBots: number
    activeRules: number
    campaigns: number
    messagesSent: number
    totalUsers: number
    activeUsers: number
    activeReminders: number
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
        messagesSent: 0,
        totalUsers: 0,
        activeUsers: 0,
        activeReminders: 0
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



    if (!user || loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-black">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-6 h-6 border-2 border-zinc-300 dark:border-zinc-800 border-t-zinc-600 dark:border-t-white rounded-full animate-spin" />
                    <p className="text-zinc-500 text-xs font-mono uppercase tracking-widest">Loading Workspace</p>
                </div>
            </div>
        )
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8 min-h-screen bg-zinc-50 dark:bg-black text-zinc-900 dark:text-zinc-100 font-sans">
            {/* Header */}
            <div className="flex justify-between items-end border-b border-zinc-200 dark:border-zinc-800/10 pb-4 sm:pb-6">
                <div>
                    <h1 className="text-xl sm:text-2xl font-medium text-zinc-900 dark:text-white tracking-tight">Overview</h1>

                </div>
            </div>

            {/* KPI Grid */}
            <div className="grid grid-cols-2 md:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
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
                {/* Admin-only stats */}
                {(user?.role === 'ADMIN' || user?.role === 'OWNER') ? (
                    <>
                        <StatCard
                            label="Total Users"
                            value={stats.totalUsers}
                            icon={<Users className="w-4 h-4 text-zinc-500" />}
                        />
                        <StatCard
                            label="Active Users"
                            value={stats.activeUsers}
                            icon={<UserCheck className="w-4 h-4 text-zinc-500" />}
                        />
                    </>
                ) : (
                    <>
                        {/* User-only stats */}
                        <StatCard
                            label="Active Rules"
                            value={stats.activeRules}
                            icon={<Zap className="w-4 h-4 text-zinc-500" />}
                        />
                        <StatCard
                            label="Active Reminders"
                            value={stats.activeReminders}
                            icon={<Bell className="w-4 h-4 text-zinc-500" />}
                        />
                    </>
                )}
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">

                {/* Left Column: Quick Actions & Activity */}
                <div className={`${user?.role === 'ADMIN' || user?.role === 'OWNER' ? 'lg:col-span-2' : 'lg:col-span-3'} space-y-4 sm:space-y-8`}

>

                    {/* Quick Start Features */}
                    <div className="space-y-3 sm:space-y-4">
                        <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Start Building</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                            {user?.role === 'ADMIN' || user?.role === 'OWNER' ? (
                                <>
                                    <FeatureCard
                                        icon={<Bot className="w-5 h-5 text-white" />}
                                        title="Create Bot"
                                        description="Create a new automation bot instance."
                                        onClick={() => router.push('/dashboard/bots')}
                                    />
                                    <FeatureCard
                                        icon={<UserPlus className="w-5 h-5 text-white" />}
                                        title="Create User"
                                        description="Add a new user to the platform."
                                        onClick={() => router.push('/dashboard/users')}
                                    />
                                </>
                            ) : (
                                <>
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
                                </>
                            )}
</div>
                    </div>

                    {/* Recent Activity - Hidden for USER */}
                    {(user?.role === 'ADMIN' || user?.role === 'OWNER') && (
                        <RecentActivityList
                            title="RECENT ACTIVITY"
                            logs={activityLogs}
                            className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-900"
                        />
                    )}
                </div>

                {/* Right Column: System Status - Hidden for USER */}
                {(user?.role === 'ADMIN' || user?.role === 'OWNER') && (
                    <div className="space-y-4">
                        <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">System Status</h3>
                        <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-900 rounded-xl p-5 space-y-6">

                            {/* Metrics */}
                            <div className="space-y-5">
                                <SystemMetric label="CPU Usage" value={systemStatus.cpu} />
                                <SystemMetric label="Memory" value={systemStatus.memory} />

                                <div className="flex items-center justify-between text-sm pt-2">
                                    <span className="text-zinc-500">Latency</span>
                                    <span className="font-mono text-zinc-700 dark:text-zinc-300">{systemStatus.latency || 14}ms</span>
                                </div>
                            </div>

                            {/* Divider */}
                            <div className="h-px bg-zinc-200 dark:bg-zinc-800/50" />

                            {/* Service Health */}
                            <div className="space-y-3">
                                <ServiceStatus name="API Gateway" status="operational" />
                                <ServiceStatus name="WhatsApp Engine" status="operational" />
                                <ServiceStatus name="Database" status="operational" />
                            </div>
                        </div>

                        {/* Pro Tip or Promo */}
                        <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-900 rounded-xl p-5 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 dark:bg-white/5 blur-3xl rounded-full -mr-16 -mt-16 transition-opacity opacity-50 group-hover:opacity-80" />
                            <h4 className="text-sm font-medium text-zinc-900 dark:text-white mb-2 relative z-10">Need help automating?</h4>
                            <p className="text-xs text-zinc-500 mb-4 relative z-10 leading-relaxed">
                                Check out our documentation to learn how to build complex flows with Sendr.
                            </p>
                            <a href="#" className="inline-flex items-center gap-2 text-xs font-medium text-zinc-900 dark:text-white hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors relative z-10">
                                Read Docs <ArrowUpRight className="w-3 h-3" />
                            </a>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

// --- Subcomponents ---

function StatCard({ label, value, icon }: { label: string, value: string | number, icon: any }) {
    return (
        <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-900 p-4 sm:p-6 rounded-xl hover:border-zinc-300 dark:hover:border-zinc-800 transition-all duration-200 group shadow-sm dark:shadow-none">
            <div className="flex justify-between items-start mb-3 sm:mb-4">
                <div className="p-1.5 sm:p-2 bg-zinc-100 dark:bg-zinc-900 rounded-lg text-zinc-600 dark:text-zinc-100 group-hover:bg-zinc-200 dark:group-hover:bg-zinc-800 transition-colors">
                    {icon}
                </div>
            </div>
            <div className="space-y-1">
                <h3 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-white tracking-tight">
                    {value}
                </h3>
                <p className="text-xs sm:text-sm text-zinc-500 font-medium">{label}</p>
            </div>
        </div>
    )
}

function FeatureCard({ icon, title, description, onClick }: any) {
    return (
        <button
            onClick={onClick}
            className="flex flex-col items-start p-4 sm:p-6 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-800 transition-all text-left group w-full shadow-sm dark:shadow-none"
        >
            <div className="mb-3 sm:mb-4 p-1.5 sm:p-2 rounded-lg bg-zinc-100 dark:bg-zinc-900 group-hover:bg-zinc-200 dark:group-hover:bg-zinc-800 transition-colors">
                {icon}
            </div>
            <h4 className="text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-1">{title}</h4>
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
                <span className={`font-mono ${value >= 80 ? 'text-red-500 dark:text-red-400' : 'text-zinc-700 dark:text-zinc-300'}`}>{value}%</span>
            </div>
            <div className="h-1 w-full bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
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
            <span className="text-zinc-600 dark:text-zinc-400">{name}</span>
            <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
                <span className="text-zinc-500 capitalize">{status}</span>
            </div>
        </div>
    )
}
