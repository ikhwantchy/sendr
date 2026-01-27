'use client'

import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import {
    Shield,
    Smartphone,
    Globe,
    Clock,
    Trash2,
    Send,
    Key,
    AlertCircle,
    CheckCircle2,
    Monitor,
    ShieldCheck,
    Fingerprint,
    History,
    LogOut
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

export default function SecurityPage() {
    const [activeTab, setActiveTab] = useState('sessions')
    const [telegramChatId, setTelegramChatId] = useState('')
    const queryClient = useQueryClient()

    // Fetch Sessions
    const { data: sessions = [], isLoading: sessionsLoading } = useQuery({
        queryKey: ['security', 'sessions'],
        queryFn: async () => {
            const response = await api.get('/security/sessions')
            return response.data.data || []
        }
    })

    // Fetch Security Logs
    const { data: logs = [], isLoading: logsLoading } = useQuery({
        queryKey: ['security', 'logs'],
        queryFn: async () => {
            const response = await api.get('/security/logs')
            return response.data.data || []
        }
    })

    // Fetches Telegram Status
    const { data: telegramStatus, isLoading: telegramStatusLoading } = useQuery({
        queryKey: ['security', 'telegram'],
        queryFn: async () => {
            const response = await api.get('/security/telegram/status')
            return response.data.data
        }
    })

    // Revoke Session Mutation
    const revokeSession = useMutation({
        mutationFn: async (id: string) => {
            await api.post(`/security/sessions/${id}/revoke`)
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['security', 'sessions'] })
            toast.success('Session revoked')
        },
        onError: () => toast.error('Failed to revoke session')
    })

    // Unlink Telegram Mutation
    const unlinkTelegram = useMutation({
        mutationFn: async () => {
            await api.delete('/security/telegram/setup')
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['security', 'telegram'] })
            toast.success('Telegram unlinked')
        },
        onError: () => toast.error('Failed to unlink Telegram')
    })

    // Test Telegram Mutation
    const testTelegram = useMutation({
        mutationFn: async () => {
            await api.post('/security/telegram/test')
        },
        onSuccess: () => toast.success('Test alert sent'),
        onError: () => toast.error('Failed to send test alert')
    })

    // Telegram Setup Mutation
    const setupTelegram = useMutation({
        mutationFn: async (chatId: string) => {
            await api.post('/security/telegram/setup', { chatId })
        },
        onSuccess: () => {
            toast.success('Telegram alerts enabled')
            queryClient.invalidateQueries({ queryKey: ['security', 'telegram'] })
            setTelegramChatId('')
        },
        onError: () => toast.error('Failed to setup Telegram')
    })

    const tabs = [
        { id: 'sessions', name: 'Active Sessions', icon: Monitor },
        { id: '2fa', name: 'Two-Factor Auth', icon: Fingerprint },
        { id: 'alerts', name: 'Security Alerts', icon: Send },
        { id: 'logs', name: 'Security History', icon: History },
    ]

    return (
        <div className="p-6 md:p-8 animate-fade-in max-w-7xl mx-auto min-h-screen bg-black text-zinc-100">
            {/* Header */}
            <div className="mb-10">
                <div className="flex items-center gap-4 mb-3">
                    <div className="p-3 bg-blue-500/10 rounded-2xl border border-blue-500/20 shadow-[0_0_20px_rgba(59,130,246,0.1)]">
                        <Shield className="w-8 h-8 text-blue-500" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Security Center</h1>
                        <p className="text-zinc-500 text-sm mt-1">Manage your account security, active sessions, and proactive alerts.</p>
                    </div>
                </div>
            </div>

            {/* Quick Status Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                <div className="bg-zinc-900/40 border border-zinc-800/50 p-6 rounded-[2rem] backdrop-blur-xl group hover:border-zinc-700/50 transition-all duration-300">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-500 group-hover:scale-110 transition-transform">
                            <ShieldCheck className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-full">Secure</span>
                    </div>
                    <h3 className="text-sm font-semibold mb-1">Account Protection</h3>
                    <p className="text-xs text-zinc-500">Your account is currently protected by session tracking.</p>
                </div>
                <div className="bg-zinc-900/40 border border-zinc-800/50 p-6 rounded-[2rem] backdrop-blur-xl group hover:border-zinc-700/50 transition-all duration-300">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-2 bg-yellow-500/10 rounded-xl text-yellow-500 group-hover:scale-110 transition-transform">
                            <Fingerprint className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-yellow-500 bg-yellow-500/10 px-2 py-1 rounded-full">Recommended</span>
                    </div>
                    <h3 className="text-sm font-semibold mb-1">2FA Status</h3>
                    <p className="text-xs text-zinc-500">Enable 2FA to add an extra layer of security to your login.</p>
                </div>
                <div className="bg-zinc-900/40 border border-zinc-800/50 p-6 rounded-[2rem] backdrop-blur-xl group hover:border-zinc-700/50 transition-all duration-300">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-2 bg-blue-500/10 rounded-xl text-blue-500 group-hover:scale-110 transition-transform">
                            <Send className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 bg-zinc-800 px-2 py-1 rounded-full">Setup Required</span>
                    </div>
                    <h3 className="text-sm font-semibold mb-1">Telegram Alerts</h3>
                    <p className="text-xs text-zinc-500">Link Telegram to get instant notifications on suspicious logins.</p>
                </div>
            </div>

            {/* Main Tabs */}
            <div className="flex flex-col md:flex-row gap-8">
                {/* Tabs Sidebar */}
                <div className="w-full md:w-64 space-y-2">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition-all duration-300 ${activeTab === tab.id
                                ? 'bg-zinc-900 text-white shadow-xl shadow-black/20 border border-zinc-800/50'
                                : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/40'
                                }`}
                        >
                            <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'text-blue-500' : 'text-zinc-600'}`} />
                            {tab.name}
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                <div className="flex-1 min-h-[500px]">
                    {activeTab === 'sessions' && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-500">
                            <div className="flex items-center justify-between mb-2">
                                <h2 className="text-xl font-bold">Active Sessions</h2>
                                <button className="text-xs font-bold text-red-500 hover:text-red-400 bg-red-500/10 px-3 py-1.5 rounded-xl transition-all">
                                    Logout of All Other Devices
                                </button>
                            </div>
                            {sessionsLoading ? (
                                <div className="flex items-center justify-center py-20">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                                </div>
                            ) : sessions.length === 0 ? (
                                <div className="text-center py-20 bg-zinc-900/20 border border-dashed border-zinc-800 rounded-[2rem]">
                                    <Monitor className="w-12 h-12 text-zinc-700 mx-auto mb-4 opacity-50" />
                                    <p className="text-zinc-500 font-medium">No active sessions found.</p>
                                </div>
                            ) : (
                                <div className="grid gap-3">
                                    {sessions.map((session: any) => (
                                        <div key={session.id} className="bg-zinc-900/30 border border-zinc-800/50 rounded-[1.5rem] p-5 flex items-center justify-between group hover:bg-zinc-900/50 transition-all">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 bg-zinc-950/50 rounded-2xl flex items-center justify-center border border-zinc-800 group-hover:border-zinc-700 transition-colors">
                                                    <Globe className="w-6 h-6 text-zinc-500" />
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-semibold text-sm">{session.ip_address || 'Unknown IP'}</span>
                                                        <span className="text-[10px] bg-blue-500/10 text-blue-500 px-2 py-0.5 rounded-full font-bold uppercase tracking-widest">Active Now</span>
                                                    </div>
                                                    <p className="text-xs text-zinc-500 mt-1 max-w-[300px] truncate">{session.user_agent || 'Unknown Device'}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-6">
                                                <div className="text-right hidden sm:block">
                                                    <p className="text-[10px] uppercase font-bold text-zinc-600 tracking-wider">Last Activity</p>
                                                    <p className="text-xs text-zinc-400">{formatDistanceToNow(new Date(session.last_active))} ago</p>
                                                </div>
                                                <button
                                                    onClick={() => revokeSession.mutate(session.id)}
                                                    className="p-3 bg-red-500/5 hover:bg-red-500/10 text-red-500/50 hover:text-red-500 rounded-2xl transition-all"
                                                    title="Revoke Session"
                                                >
                                                    <LogOut className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === '2fa' && (
                        <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                            <div className="bg-zinc-900/40 border border-zinc-800/50 p-8 rounded-[2rem] text-center max-w-2xl mx-auto border-dashed">
                                <Key className="w-16 h-16 text-zinc-700 mx-auto mb-6 opacity-50" />
                                <h2 className="text-2xl font-bold mb-3">Strong Authentication</h2>
                                <p className="text-zinc-500 mb-8 max-w-md mx-auto">Add an extra layer of security to your account by requiring a code from your mobile phone to login.</p>
                                <button className="inline-flex items-center gap-2 px-8 py-3.5 bg-white text-black font-bold rounded-2xl hover:bg-zinc-200 transition-all shadow-xl shadow-white/5">
                                    <Smartphone className="w-5 h-5" />
                                    Setup 2FA Now
                                </button>
                                <div className="mt-8 flex items-center justify-center gap-6 opacity-40">
                                    <span className="text-xs font-medium">Google Authenticator</span>
                                    <span className="text-xs font-medium">Authy</span>
                                    <span className="text-xs font-medium">Microsoft Authenticator</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'alerts' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                            <div className="bg-zinc-900/40 border border-zinc-800/50 p-8 rounded-[2rem]">
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center">
                                        <Send className="w-6 h-6 text-blue-500" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold">Telegram Alerts</h2>
                                        <p className="text-sm text-zinc-500">Get notified via Telegram when security events occur.</p>
                                    </div>
                                </div>

                                {telegramStatus?.systemConfigured === false && (
                                    <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl flex items-start gap-3">
                                        <AlertCircle className="w-5 h-5 text-yellow-500 mt-0.5" />
                                        <div>
                                            <h4 className="font-bold text-yellow-500 text-sm">System Not Configured</h4>
                                            <p className="text-xs text-yellow-500/80 leading-relaxed mt-1">
                                                The Telegram Bot Token is not configured on the server. Alerts will not be sent until the system administrator configures it in System Settings or Environment Variables with properly valid Token.
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {telegramStatusLoading ? (
                                    <div className="flex items-center justify-center py-10">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                                    </div>
                                ) : telegramStatus?.connected ? (
                                    <div className="space-y-6">
                                        <div className="bg-emerald-500/10 border border-emerald-500/20 p-5 rounded-2xl flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                                                    <CheckCircle2 className="w-6 h-6" />
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-emerald-500 text-lg">Connected Active</h4>
                                                    <p className="text-xs text-emerald-500/70 font-mono mt-0.5">Chat ID: {telegramStatus.chatId}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                                                <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-500">Online</span>
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap gap-3">
                                            <button
                                                onClick={() => testTelegram.mutate()}
                                                disabled={testTelegram.isPending}
                                                className="flex items-center gap-2 px-5 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold rounded-xl transition-all disabled:opacity-50"
                                            >
                                                <Send className="w-4 h-4" />
                                                {testTelegram.isPending ? 'Sending...' : 'Send Test Alert'}
                                            </button>
                                            <button
                                                onClick={() => {
                                                    if (confirm('Are you sure you want to unlink Telegram alerts?')) {
                                                        unlinkTelegram.mutate()
                                                    }
                                                }}
                                                disabled={unlinkTelegram.isPending}
                                                className="flex items-center gap-2 px-5 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 font-bold rounded-xl transition-all disabled:opacity-50"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                                {unlinkTelegram.isPending ? 'Unlinking...' : 'Unlink Device'}
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest ml-1">Your Chat ID</label>
                                            <div className="flex gap-3">
                                                <input
                                                    type="text"
                                                    placeholder="Enter your Telegram Chat ID"
                                                    value={telegramChatId}
                                                    onChange={(e) => setTelegramChatId(e.target.value)}
                                                    className="flex-1 bg-zinc-950 border border-zinc-800 rounded-2xl px-4 py-3.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/50 transition-all"
                                                />
                                                <button
                                                    onClick={() => setupTelegram.mutate(telegramChatId)}
                                                    disabled={!telegramChatId || setupTelegram.isPending}
                                                    className="px-6 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white font-bold rounded-2xl transition-all shadow-lg shadow-blue-500/20"
                                                >
                                                    {setupTelegram.isPending ? 'Saving...' : 'Link Chat'}
                                                </button>
                                            </div>
                                        </div>
                                        <div className="p-4 bg-zinc-950/50 border border-zinc-800 rounded-2xl flex items-start gap-3">
                                            <AlertCircle className="w-5 h-5 text-blue-500/50 mt-0.5" />
                                            <p className="text-xs text-zinc-500 leading-relaxed">
                                                To find your Chat ID, send any message to <a href="https://t.me/userinfobot" target="_blank" className="text-blue-500 font-bold hover:underline">@userinfobot</a> on Telegram. Enter the number it provides here.
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="p-5 bg-zinc-900/20 border border-zinc-800/50 rounded-2xl flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <Send className="w-4 h-4 text-zinc-600" />
                                        <span className="text-sm font-medium">New Device Login</span>
                                    </div>
                                    <div className={`w-8 h-4 rounded-full relative transition-colors ${telegramStatus?.connected ? 'bg-blue-500' : 'bg-zinc-700'}`}>
                                        <div className={`absolute top-1 w-2 h-2 bg-white rounded-full transition-all ${telegramStatus?.connected ? 'right-1' : 'left-1'}`}></div>
                                    </div>
                                </div>
                                <div className="p-5 bg-zinc-900/20 border border-zinc-800/50 rounded-2xl flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <Send className="w-4 h-4 text-zinc-600" />
                                        <span className="text-sm font-medium">Failed Login Alert</span>
                                    </div>
                                    <div className={`w-8 h-4 rounded-full relative transition-colors ${telegramStatus?.connected ? 'bg-blue-500' : 'bg-zinc-700'}`}>
                                        <div className={`absolute top-1 w-2 h-2 bg-white rounded-full transition-all ${telegramStatus?.connected ? 'right-1' : 'left-1'}`}></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'logs' && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-500">
                            <div className="flex items-center justify-between mb-2">
                                <h2 className="text-xl font-bold">Security Timeline</h2>
                                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest bg-zinc-800 px-3 py-1 rounded-full">Last 50 events</span>
                            </div>
                            {logsLoading ? (
                                <div className="flex items-center justify-center py-20">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                                </div>
                            ) : logs.length === 0 ? (
                                <div className="text-center py-20 bg-zinc-900/20 border border-dashed border-zinc-800 rounded-[2rem]">
                                    <History className="w-12 h-12 text-zinc-700 mx-auto mb-4 opacity-50" />
                                    <p className="text-zinc-500 font-medium">Security records are clear.</p>
                                </div>
                            ) : (
                                <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-[2rem] overflow-hidden">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="border-b border-zinc-800/50 bg-zinc-900/50">
                                                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Event</th>
                                                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Source IP</th>
                                                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Time</th>
                                                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-zinc-800/30">
                                            {logs.map((log: any) => (
                                                <tr key={log.id} className="hover:bg-zinc-800/10 transition-colors">
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-2 h-2 rounded-full ${log.event_type.includes('FAILED') ? 'bg-red-500' : 'bg-blue-500'
                                                                }`} />
                                                            <span className="text-xs font-semibold text-zinc-300">
                                                                {log.event_type.replace(/_/g, ' ')}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-xs font-mono text-zinc-500">{log.ip_address || 'Internal'}</td>
                                                    <td className="px-6 py-4 text-xs text-zinc-500">{formatDistanceToNow(new Date(log.created_at))} ago</td>
                                                    <td className="px-6 py-4">
                                                        <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${log.event_type.includes('FAILED')
                                                            ? 'bg-red-500/10 text-red-500'
                                                            : 'bg-emerald-500/10 text-emerald-500'
                                                            }`}>
                                                            {log.event_type.includes('FAILED') ? 'Blocked' : 'Verified'}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
