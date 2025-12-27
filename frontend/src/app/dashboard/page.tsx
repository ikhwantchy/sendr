'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface DashboardStats {
    totalBots: number
    activeRules: number
    campaigns: number
    messagesSent: number
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
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        // Check if user is logged in
        const token = localStorage.getItem('token')
        const userData = localStorage.getItem('user')

        if (!token) {
            router.push('/login')
            return
        }

        if (userData) {
            setUser(JSON.parse(userData))
            fetchDashboardStats(token)
        }
    }, [router])

    const fetchDashboardStats = async (token: string) => {
        try {
            const response = await fetch('http://localhost:3001/api/analytics/dashboard-stats', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            })

            if (response.ok) {
                const data = await response.json()
                if (data.success) {
                    setStats(data.data)
                }
            }
        } catch (error) {
            console.error('Failed to fetch dashboard stats:', error)
        } finally {
            setLoading(false)
        }
    }

    if (!user || loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="relative w-16 h-16 mx-auto mb-4">
                        <div className="absolute inset-0 rounded-full border-4 border-cyan-500/20"></div>
                        <div className="absolute inset-0 rounded-full border-4 border-cyan-500 border-t-transparent animate-spin"></div>
                    </div>
                    <p className="text-gray-400 font-medium">Loading your workspace...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen">
            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-6 py-8">
                {/* Welcome Section with Animated Gradient */}
                <div className="relative rounded-3xl overflow-hidden mb-8 group">
                    {/* Animated Background */}
                    <div className="absolute inset-0 animated-gradient opacity-90"></div>

                    {/* Glassmorphism Overlay */}
                    <div className="relative glass-strong p-8 border-0">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
                                    Welcome back, {user.name}!
                                    <span className="inline-block animate-bounce">👋</span>
                                </h2>
                                <p className="text-white/80 text-lg">Your BroBot automation platform is ready to use.</p>
                            </div>
                            <div className="hidden md:block">
                                <div className="w-24 h-24 bg-white/10 rounded-3xl flex items-center justify-center backdrop-blur-sm border border-white/20">
                                    <svg className="w-14 h-14 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    </svg>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <StatCard
                        title="Total Bots"
                        value={stats.totalBots.toString()}
                        icon={
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                            </svg>
                        }
                        gradient="from-cyan-500 to-blue-600"
                        glowColor="cyan"
                    />
                    <StatCard
                        title="Active Rules"
                        value={stats.activeRules.toString()}
                        icon={
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                        }
                        gradient="from-green-500 to-emerald-600"
                        glowColor="green"
                    />
                    <StatCard
                        title="Campaigns"
                        value={stats.campaigns.toString()}
                        icon={
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                            </svg>
                        }
                        gradient="from-purple-500 to-pink-600"
                        glowColor="purple"
                    />
                    <StatCard
                        title="Messages Sent"
                        value={stats.messagesSent.toString()}
                        icon={
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                            </svg>
                        }
                        gradient="from-orange-500 to-red-600"
                        glowColor="orange"
                    />
                </div>

                {/* Quick Actions */}
                <div className="glass rounded-2xl border border-white/10 p-6 hover-lift">
                    <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                        <span className="w-1.5 h-8 bg-gradient-to-b from-cyan-400 to-purple-600 rounded-full"></span>
                        Quick Actions
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <ActionButton
                            title="Create Bot"
                            description="Add a new WhatsApp bot"
                            icon="🤖"
                            gradient="from-cyan-500/20 to-blue-500/20"
                            hoverGradient="from-cyan-500/30 to-blue-500/30"
                            onClick={() => router.push('/dashboard/bots')}
                        />
                        <ActionButton
                            title="Add Rule"
                            description="Create automation rule"
                            icon="⚡"
                            gradient="from-purple-500/20 to-pink-500/20"
                            hoverGradient="from-purple-500/30 to-pink-500/30"
                            onClick={() => router.push('/dashboard/rules')}
                        />
                        <ActionButton
                            title="New Campaign"
                            description="Start a broadcast"
                            icon="📢"
                            gradient="from-orange-500/20 to-red-500/20"
                            hoverGradient="from-orange-500/30 to-red-500/30"
                            onClick={() => router.push('/dashboard/campaigns')}
                        />
                    </div>
                </div>
            </main>
        </div>
    )
}

function StatCard({ title, value, icon, gradient, glowColor }: any) {
    return (
        <div className="glass rounded-2xl border border-white/10 p-6 hover-lift group relative overflow-hidden">
            {/* Hover Glow Effect */}
            <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300`}></div>

            <div className="relative">
                <div className="flex items-center justify-between mb-4">
                    <div className={`bg-gradient-to-br ${gradient} text-white p-3 rounded-xl shadow-lg glow-${glowColor} group-hover:scale-110 transition-transform duration-300`}>
                        {icon}
                    </div>
                </div>
                <h3 className="text-3xl font-bold text-white mb-1 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:${gradient} transition-all duration-300">
                    {value}
                </h3>
                <p className="text-sm text-gray-400 font-medium">{title}</p>
            </div>
        </div>
    )
}

function ActionButton({ title, description, icon, gradient, hoverGradient, onClick }: any) {
    return (
        <button
            onClick={onClick}
            className={`group relative flex items-start gap-4 p-5 rounded-xl bg-gradient-to-br ${gradient} hover:${hoverGradient} border border-white/10 hover:border-white/20 transition-all duration-300 text-left hover-lift overflow-hidden`}
        >
            {/* Shimmer Effect */}
            <div className="absolute inset-0 shimmer opacity-0 group-hover:opacity-100"></div>

            <span className="text-3xl relative z-10 group-hover:scale-110 transition-transform duration-300">{icon}</span>
            <div className="relative z-10">
                <h4 className="font-bold text-white text-lg mb-1 group-hover:text-cyan-300 transition-colors">{title}</h4>
                <p className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors">{description}</p>
            </div>
        </button>
    )
}
