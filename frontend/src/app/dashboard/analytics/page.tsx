'use client'

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

export default function AnalyticsPage() {
    const { data: analytics } = useQuery({
        queryKey: ['analytics'],
        queryFn: async () => {
            const response = await api.analytics.get()
            return response.data.data || {}
        },
    })

    return (
        <div className="p-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Analytics & Metrics</h1>
                <p className="text-gray-600 mt-1">Monitor your platform performance</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <StatCard
                    title="Total Messages"
                    value={analytics?.total_messages || "0"}
                    change="+12%"
                    icon="💬"
                    color="blue"
                />
                <StatCard
                    title="Active Bots"
                    value={analytics?.active_bots || "0"}
                    change="+5%"
                    icon="🤖"
                    color="green"
                />
                <StatCard
                    title="Rules Triggered"
                    value={analytics?.rules_triggered || "0"}
                    change="+23%"
                    icon="⚡"
                    color="purple"
                />
                <StatCard
                    title="Campaign Reach"
                    value={analytics?.campaign_reach || "0"}
                    change="+8%"
                    icon="📢"
                    color="orange"
                />
            </div>

            {/* Charts Placeholder */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Message Activity</h3>
                    <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
                        <p className="text-gray-500">Chart coming soon</p>
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Rules</h3>
                    <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
                        <p className="text-gray-500">Chart coming soon</p>
                    </div>
                </div>
            </div>

            {/* Recent Activity */}
            <div className="mt-6 bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Events</h3>
                <div className="space-y-3">
                    <ActivityItem
                        icon="✅"
                        title="Bot connected"
                        description="Customer Service Bot connected successfully"
                        time="2 minutes ago"
                    />
                    <ActivityItem
                        icon="⚡"
                        title="Rule triggered"
                        description="Greeting rule matched for contact"
                        time="5 minutes ago"
                    />
                    <ActivityItem
                        icon="📢"
                        title="Campaign sent"
                        description="Product Launch campaign completed"
                        time="1 hour ago"
                    />
                </div>
            </div>
        </div>
    )
}

function StatCard({ title, value, change, icon, color }: any) {
    const colors = {
        blue: 'bg-blue-500',
        green: 'bg-green-500',
        purple: 'bg-purple-500',
        orange: 'bg-orange-500',
    }

    return (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
                <div className={`${colors[color]} text-white p-3 rounded-lg text-2xl`}>
                    {icon}
                </div>
                <span className="text-green-600 text-sm font-medium">{change}</span>
            </div>
            <h3 className="text-3xl font-bold text-gray-900">{value}</h3>
            <p className="text-sm text-gray-600 mt-1">{title}</p>
        </div>
    )
}

function ActivityItem({ icon, title, description, time }: any) {
    return (
        <div className="flex items-start space-x-3 p-3 hover:bg-gray-50 rounded-lg transition">
            <span className="text-2xl">{icon}</span>
            <div className="flex-1">
                <h4 className="text-sm font-semibold text-gray-900">{title}</h4>
                <p className="text-sm text-gray-600">{description}</p>
            </div>
            <span className="text-xs text-gray-500">{time}</span>
        </div>
    )
}
