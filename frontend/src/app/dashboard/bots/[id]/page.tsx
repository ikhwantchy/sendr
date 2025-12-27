'use client'

import { useParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useState } from 'react'
import Link from 'next/link'
import CreateRuleModal from '@/components/modals/CreateRuleModal'
import CreateCampaignModal from '@/components/modals/CreateCampaignModal'
import CreateReminderModal from '@/components/modals/CreateReminderModal'
import RulesTable from '@/components/tables/RulesTable'
import CampaignsTable from '@/components/tables/CampaignsTable'
import RemindersTable from '@/components/tables/RemindersTable'

export default function BotDetailPage() {
    const params = useParams()
    const router = useRouter()
    const botId = params.id as string
    const [activeTab, setActiveTab] = useState('overview')

    // Modal states
    const [showCreateRuleModal, setShowCreateRuleModal] = useState(false)
    const [showCreateCampaignModal, setShowCreateCampaignModal] = useState(false)
    const [showCreateReminderModal, setShowCreateReminderModal] = useState(false)

    // Fetch bot details
    const { data: bot, isLoading } = useQuery({
        queryKey: ['bot', botId],
        queryFn: async () => {
            const response = await api.bots.get(botId)
            return response.data.data || response.data
        },
    })

    // Fetch statistics
    const { data: rulesData } = useQuery({
        queryKey: ['rules', botId],
        queryFn: async () => {
            const response = await api.rules.getByBot(botId)
            return response.data.data || response.data || []
        },
        enabled: !!botId,
    })

    const { data: campaignsData } = useQuery({
        queryKey: ['campaigns', botId],
        queryFn: async () => {
            const response = await api.campaigns.getByBot(botId)
            return response.data.data || response.data || []
        },
        enabled: !!botId,
    })

    const { data: remindersData } = useQuery({
        queryKey: ['reminders', botId],
        queryFn: async () => {
            const response = await api.reminders.getByBot(botId)
            return response.data.data || response.data || []
        },
        enabled: !!botId,
    })

    // Calculate statistics
    const stats = {
        totalMessages: bot?.total_messages || 0,
        activeRules: rulesData?.filter((r: any) => r.is_active).length || 0,
        totalRules: rulesData?.length || 0,
        activeCampaigns: campaignsData?.filter((c: any) => c.status === 'sending' || c.status === 'scheduled').length || 0,
        totalCampaigns: campaignsData?.length || 0,
        activeReminders: remindersData?.filter((r: any) => r.is_active && r.status === 'pending').length || 0,
        totalReminders: remindersData?.length || 0,
    }

    const tabs = [
        { id: 'overview', name: 'Overview', icon: '📊' },
        { id: 'rules', name: 'Rules', icon: '📋' },
        { id: 'campaigns', name: 'Campaigns', icon: '📢' },
        { id: 'reminders', name: 'Reminders', icon: '⏰' },
        { id: 'settings', name: 'Settings', icon: '⚙️' },
    ]

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="relative w-16 h-16">
                    <div className="absolute inset-0 rounded-full border-4 border-cyan-500/20"></div>
                    <div className="absolute inset-0 rounded-full border-4 border-cyan-500 border-t-transparent animate-spin"></div>
                </div>
            </div>
        )
    }

    if (!bot) {
        return (
            <div className="p-8">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-white mb-4">Bot not found</h2>
                    <Link href="/dashboard/bots" className="text-cyan-400 hover:text-cyan-300">
                        ← Back to Bots
                    </Link>
                </div>
            </div>
        )
    }

    const statusColors = {
        connected: 'bg-green-500/20 text-green-400 border-green-500/30',
        connecting: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
        disconnected: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
        error: 'bg-red-500/20 text-red-400 border-red-500/30',
    }

    return (
        <div className="p-8">
            {/* Header */}
            <div className="mb-8">
                <Link
                    href="/dashboard/bots"
                    className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-4 transition-colors"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Back to Bots
                </Link>

                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
                            <span className="w-1.5 h-10 bg-gradient-to-b from-cyan-400 to-blue-600 rounded-full"></span>
                            {bot.name}
                        </h1>
                        <div className="flex items-center gap-4 text-gray-400">
                            <span className="flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                </svg>
                                {bot.phone_number || 'Not connected'}
                            </span>
                            <span className={`px-3 py-1 rounded-full text-xs font-medium border ${statusColors[bot.status as keyof typeof statusColors] || statusColors.disconnected}`}>
                                {bot.status || 'disconnected'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="glass rounded-2xl border border-white/10 overflow-hidden">
                {/* Tab Navigation */}
                <div className="flex border-b border-white/10 bg-black/20">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex-1 px-6 py-4 text-sm font-medium transition-all relative ${activeTab === tab.id
                                ? 'text-cyan-400 bg-cyan-500/10'
                                : 'text-gray-400 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            <span className="flex items-center justify-center gap-2">
                                <span className="text-lg">{tab.icon}</span>
                                {tab.name}
                            </span>
                            {activeTab === tab.id && (
                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-cyan-400 to-blue-600"></div>
                            )}
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                <div className="p-8">
                    {activeTab === 'overview' && (
                        <div className="space-y-8">
                            <div>
                                <h2 className="text-2xl font-bold text-white mb-6">Bot Overview</h2>

                                {/* Connection Section - Prominent if not connected */}
                                {bot.status !== 'connected' && (
                                    <div className="glass rounded-2xl p-8 border-2 border-cyan-500/30 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 mb-8">
                                        <div className="flex items-start gap-6">
                                            <div className="flex-shrink-0">
                                                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                                                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                                    </svg>
                                                </div>
                                            </div>
                                            <div className="flex-1">
                                                <h3 className="text-xl font-bold text-white mb-2">Connect WhatsApp</h3>
                                                <p className="text-gray-400 mb-4">
                                                    Scan QR code with your WhatsApp to connect this bot
                                                </p>
                                                <Link
                                                    href={`/dashboard/bots/${botId}/connect`}
                                                    className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl font-bold hover:shadow-2xl hover:shadow-cyan-500/50 transition-all"
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                                    </svg>
                                                    Connect Now
                                                </Link>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Stats Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="glass rounded-xl p-6 border border-white/10 hover-lift">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="text-gray-400 text-sm">Total Messages</div>
                                            <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                                                <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                                                </svg>
                                            </div>
                                        </div>
                                        <div className="text-3xl font-bold text-white">{stats.totalMessages.toLocaleString()}</div>
                                        <div className="text-xs text-gray-400 mt-2">
                                            {bot?.status === 'connected' ? 'Bot is active' : 'Connect to start tracking'}
                                        </div>
                                    </div>

                                    <div className="glass rounded-xl p-6 border border-white/10 hover-lift">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="text-gray-400 text-sm">Active Rules</div>
                                            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                                                <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                                </svg>
                                            </div>
                                        </div>
                                        <div className="text-3xl font-bold text-white">{stats.activeRules}</div>
                                        <div className="text-xs text-gray-400 mt-2">
                                            {stats.totalRules} total rule{stats.totalRules !== 1 ? 's' : ''}
                                        </div>
                                    </div>

                                    <div className="glass rounded-xl p-6 border border-white/10 hover-lift">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="text-gray-400 text-sm">Campaigns</div>
                                            <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                                                <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                                                </svg>
                                            </div>
                                        </div>
                                        <div className="text-3xl font-bold text-white">{stats.totalCampaigns}</div>
                                        <div className="text-xs text-gray-400 mt-2">
                                            {stats.activeCampaigns} active broadcast{stats.activeCampaigns !== 1 ? 's' : ''}
                                        </div>
                                    </div>
                                </div>

                                {/* Bot Status & Additional Stats */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                                    {/* Real-time Status */}
                                    <div className="glass rounded-xl p-6 border border-white/10">
                                        <h3 className="text-lg font-semibold text-white mb-4">Bot Status</h3>
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <span className="text-gray-400 text-sm">Connection</span>
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-2 h-2 rounded-full ${bot?.status === 'connected' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                                                    <span className={`text-sm font-medium ${bot?.status === 'connected' ? 'text-green-400' : 'text-red-400'}`}>
                                                        {bot?.status === 'connected' ? 'Connected' : 'Disconnected'}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-gray-400 text-sm">Session</span>
                                                <span className="text-sm text-white">
                                                    {bot?.status === 'connected' ? 'Active' : 'Inactive'}
                                                </span>
                                            </div>
                                            {bot?.last_activity && (
                                                <div className="flex items-center justify-between">
                                                    <span className="text-gray-400 text-sm">Last Activity</span>
                                                    <span className="text-sm text-white">
                                                        {new Date(bot.last_activity).toLocaleString('en-US', {
                                                            month: 'short',
                                                            day: 'numeric',
                                                            hour: '2-digit',
                                                            minute: '2-digit'
                                                        })}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Reminders Stats */}
                                    <div className="glass rounded-xl p-6 border border-white/10">
                                        <h3 className="text-lg font-semibold text-white mb-4">Reminders</h3>
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <span className="text-gray-400 text-sm">Active</span>
                                                <span className="text-2xl font-bold text-green-400">{stats.activeReminders}</span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-gray-400 text-sm">Total</span>
                                                <span className="text-lg font-semibold text-white">{stats.totalReminders}</span>
                                            </div>
                                            <div className="pt-2 border-t border-white/10">
                                                <button
                                                    onClick={() => setActiveTab('reminders')}
                                                    className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
                                                >
                                                    View all reminders →
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'rules' && (
                        <div>
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-2xl font-bold text-white">Auto-Reply Rules</h2>
                                <button
                                    onClick={() => setShowCreateRuleModal(true)}
                                    className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg font-medium hover:shadow-lg hover:shadow-cyan-500/50 transition-all"
                                >
                                    + Create Rule
                                </button>
                            </div>
                            <RulesTable botId={botId} />
                        </div>
                    )}

                    {activeTab === 'campaigns' && (
                        <div>
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-2xl font-bold text-white">Broadcast Campaigns</h2>
                                <button
                                    onClick={() => setShowCreateCampaignModal(true)}
                                    className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg font-medium hover:shadow-lg hover:shadow-cyan-500/50 transition-all"
                                >
                                    + Create Campaign
                                </button>
                            </div>
                            <CampaignsTable botId={botId} />
                        </div>
                    )}

                    {activeTab === 'reminders' && (
                        <div>
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-2xl font-bold text-white">Scheduled Reminders</h2>
                                <button
                                    onClick={() => setShowCreateReminderModal(true)}
                                    className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg font-medium hover:shadow-lg hover:shadow-cyan-500/50 transition-all"
                                >
                                    + Create Reminder
                                </button>
                            </div>
                            <RemindersTable botId={botId} />
                        </div>
                    )}

                    {activeTab === 'settings' && (
                        <div>
                            <h2 className="text-2xl font-bold text-white mb-6">Bot Settings</h2>
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2">Bot Name</label>
                                    <input
                                        type="text"
                                        defaultValue={bot.name}
                                        className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2">Phone Number</label>
                                    <input
                                        type="text"
                                        defaultValue={bot.phone_number || ''}
                                        disabled
                                        className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-lg text-gray-500 cursor-not-allowed"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2">Status</label>
                                    <div className={`inline-block px-4 py-2 rounded-lg ${statusColors[bot.status as keyof typeof statusColors] || statusColors.disconnected}`}>
                                        {bot.status || 'disconnected'}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Modals */}
            {showCreateRuleModal && (
                <CreateRuleModal
                    botId={botId}
                    onClose={() => setShowCreateRuleModal(false)}
                />
            )}

            {showCreateCampaignModal && (
                <CreateCampaignModal
                    botId={botId}
                    onClose={() => setShowCreateCampaignModal(false)}
                />
            )}

            {showCreateReminderModal && (
                <CreateReminderModal
                    botId={botId}
                    onClose={() => setShowCreateReminderModal(false)}
                />
            )}
        </div>
    )
}
