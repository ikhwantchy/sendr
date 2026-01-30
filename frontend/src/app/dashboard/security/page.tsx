'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import {
    Shield,
    Smartphone,
    Globe,
    Trash2,
    Send,
    Key,
    AlertCircle,
    CheckCircle2,
    Monitor,
    ShieldCheck,
    Fingerprint,
    History,
    LogOut,
    ChevronDown,
    RefreshCw,
    Laptop,
    Clock,
    MapPin,
    AlertTriangle,
    Check,
    X,
    Copy,
    ExternalLink
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

// KPI Card Component - Same as Analytics
interface KPICardProps {
    title: string
    value: number | string
    icon: React.ReactNode
    loading?: boolean
    color?: string
    onClick?: () => void
    active?: boolean
    badge?: string
    badgeColor?: string
}

function KPICard({ title, value, icon, loading, color = 'text-zinc-900 dark:text-white', onClick, active, badge, badgeColor = 'bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400' }: KPICardProps) {
    return (
        <div
            onClick={onClick}
            className={`bg-white dark:bg-zinc-950 border rounded-xl p-6 relative overflow-hidden group transition-all cursor-pointer shadow-sm dark:shadow-none
                ${active ? 'border-blue-500/50 ring-1 ring-blue-500/20' : 'border-zinc-200 dark:border-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-800'}`}
        >
            <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-zinc-100 dark:bg-zinc-900 rounded-lg text-zinc-700 dark:text-zinc-100 group-hover:bg-zinc-200 dark:group-hover:bg-zinc-800 transition-colors">
                    {icon}
                </div>
                {badge && (
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full ${badgeColor}`}>
                        {badge}
                    </span>
                )}
            </div>

            <div className="space-y-1">
                {loading ? (
                    <div className="h-8 w-24 bg-zinc-200 dark:bg-zinc-900 rounded animate-pulse" />
                ) : (
                    <h3 className={`text-2xl font-bold tracking-tight ${color}`}>
                        {typeof value === 'number' ? value.toLocaleString() : value}
                    </h3>
                )}
                <p className="text-sm text-zinc-500 font-medium">{title}</p>
            </div>
        </div>
    )
}

export default function SecurityPage() {
    const [mounted, setMounted] = useState(false)
    const [activeSection, setActiveSection] = useState<'sessions' | '2fa' | 'alerts' | 'logs'>('sessions')
    const [telegramChatId, setTelegramChatId] = useState('')
    const queryClient = useQueryClient()

    useEffect(() => {
        setMounted(true)
    }, [])

    // Fetch Sessions
    const { data: sessions = [], isLoading: sessionsLoading, refetch: refetchSessions } = useQuery({
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
            toast.success('Session revoked successfully')
        },
        onError: () => toast.error('Failed to revoke session')
    })

    // Revoke All Sessions Mutation
    const revokeAllSessions = useMutation({
        mutationFn: async () => {
            await api.post('/security/sessions/revoke-all')
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['security', 'sessions'] })
            toast.success('All other sessions revoked')
        },
        onError: () => toast.error('Failed to revoke sessions')
    })

    // Unlink Telegram Mutation
    const unlinkTelegram = useMutation({
        mutationFn: async () => {
            await api.delete('/security/telegram/setup')
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['security', 'telegram'] })
            toast.success('Telegram unlinked successfully')
        },
        onError: () => toast.error('Failed to unlink Telegram')
    })

    // Test Telegram Mutation
    const testTelegram = useMutation({
        mutationFn: async () => {
            await api.post('/security/telegram/test')
        },
        onSuccess: () => toast.success('Test alert sent to Telegram'),
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

    // Calculate stats
    const activeSessions = sessions.length
    const failedLogins = logs.filter((l: any) => l.event_type?.includes('FAILED')).length
    const successLogins = logs.filter((l: any) => !l.event_type?.includes('FAILED')).length

    if (!mounted) return null

    return (
        <div className="p-8 space-y-8 min-h-screen bg-zinc-50 dark:bg-black text-zinc-900 dark:text-zinc-100 font-sans">
            {/* Header - Same style as Analytics */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white mb-1">
                        Security Center
                    </h1>
                    <p className="text-zinc-500 text-sm">
                        Manage sessions, authentication, and security alerts
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {/* Section Dropdown */}
                    <div className="relative">
                        <button
                            onClick={() => {
                                const dropdown = document.getElementById('security-section-dropdown')
                                if (dropdown) dropdown.classList.toggle('hidden')
                            }}
                            onBlur={(e) => {
                                setTimeout(() => {
                                    const dropdown = document.getElementById('security-section-dropdown')
                                    if (dropdown && !dropdown.contains(e.relatedTarget as Node)) {
                                        dropdown.classList.add('hidden')
                                    }
                                }, 150)
                            }}
                            className="inline-flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800/50 rounded-lg text-xs font-medium text-zinc-900 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 transition-all"
                        >
                            <Shield className="w-3.5 h-3.5 text-blue-500" />
                            <span>
                                {activeSection === 'sessions' ? 'Active Sessions' :
                                    activeSection === '2fa' ? 'Two-Factor Auth' :
                                        activeSection === 'alerts' ? 'Telegram Alerts' : 'Security Logs'}
                            </span>
                            <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
                        </button>

                        <div
                            id="security-section-dropdown"
                            className="hidden absolute top-full right-0 mt-2 w-48 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl z-50 overflow-hidden py-1"
                        >
                            {[
                                { id: 'sessions', label: 'Active Sessions', icon: Monitor },
                                { id: '2fa', label: 'Two-Factor Auth', icon: Fingerprint },
                                { id: 'alerts', label: 'Telegram Alerts', icon: Send },
                                { id: 'logs', label: 'Security Logs', icon: History }
                            ].map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => {
                                        setActiveSection(item.id as any)
                                        document.getElementById('security-section-dropdown')?.classList.add('hidden')
                                    }}
                                    className={`w-full flex items-center gap-2 text-left px-4 py-2 text-xs hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors ${activeSection === item.id ? 'text-blue-500 bg-blue-50 dark:bg-blue-400/5' : 'text-zinc-600 dark:text-zinc-400'}`}
                                >
                                    <item.icon className="w-3.5 h-3.5" />
                                    {item.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Refresh Button */}
                    <button
                        onClick={() => refetchSessions()}
                        className="p-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/50 rounded-lg text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
                    >
                        <RefreshCw className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* KPI Grid - Same style as Analytics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <KPICard
                    title="Active Sessions"
                    value={activeSessions}
                    icon={<Monitor className="w-5 h-5" />}
                    loading={sessionsLoading}
                    onClick={() => setActiveSection('sessions')}
                    active={activeSection === 'sessions'}
                    badge="Live"
                    badgeColor="bg-blue-500/10 text-blue-400"
                />
                <KPICard
                    title="2FA Status"
                    value="Not Setup"
                    icon={<Fingerprint className="w-5 h-5" />}
                    onClick={() => setActiveSection('2fa')}
                    active={activeSection === '2fa'}
                    badge="Recommended"
                    badgeColor="bg-amber-500/10 text-amber-400"
                />
                <KPICard
                    title="Telegram Alerts"
                    value={telegramStatus?.connected ? 'Connected' : 'Not Linked'}
                    icon={<Send className="w-5 h-5" />}
                    loading={telegramStatusLoading}
                    onClick={() => setActiveSection('alerts')}
                    active={activeSection === 'alerts'}
                    color={telegramStatus?.connected ? 'text-emerald-500' : 'text-zinc-400'}
                    badge={telegramStatus?.connected ? 'Active' : 'Setup'}
                    badgeColor={telegramStatus?.connected ? 'bg-emerald-500/10 text-emerald-400' : 'bg-zinc-800 text-zinc-500'}
                />
                <KPICard
                    title="Failed Logins"
                    value={failedLogins}
                    icon={<AlertTriangle className="w-5 h-5" />}
                    loading={logsLoading}
                    onClick={() => setActiveSection('logs')}
                    active={activeSection === 'logs'}
                    color={failedLogins > 0 ? 'text-red-500' : 'text-emerald-500'}
                />
            </div>

            {/* Content Sections */}
            {activeSection === 'sessions' && (
                <div className="bg-zinc-950 border border-zinc-900 rounded-xl overflow-hidden">
                    <div className="px-6 py-4 border-b border-zinc-800/50 flex justify-between items-center">
                        <div>
                            <h3 className="text-lg font-medium text-zinc-200">Active Sessions</h3>
                            <p className="text-xs text-zinc-500 mt-0.5">Devices currently logged into your account</p>
                        </div>
                        {sessions.length > 1 && (
                            <button
                                onClick={() => {
                                    if (confirm('Logout from all other devices?')) {
                                        revokeAllSessions.mutate()
                                    }
                                }}
                                className="text-xs font-medium text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 px-3 py-1.5 rounded-lg transition-all"
                            >
                                Logout All Others
                            </button>
                        )}
                    </div>

                    {sessionsLoading ? (
                        <div className="flex items-center justify-center py-16">
                            <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
                        </div>
                    ) : sessions.length === 0 ? (
                        <div className="text-center py-16">
                            <div className="p-4 rounded-full bg-zinc-900/50 w-fit mx-auto mb-4">
                                <Monitor size={32} className="text-zinc-600" />
                            </div>
                            <h3 className="text-lg font-medium text-zinc-300 mb-1">No active sessions</h3>
                            <p className="text-zinc-500 text-sm">Session data will appear here</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-zinc-800/50">
                                        <th className="text-left py-3 px-4 text-sm font-medium text-zinc-400">Device</th>
                                        <th className="text-left py-3 px-4 text-sm font-medium text-zinc-400">IP Address</th>
                                        <th className="text-left py-3 px-4 text-sm font-medium text-zinc-400">Browser / User Agent</th>
                                        <th className="text-left py-3 px-4 text-sm font-medium text-zinc-400">Last Active</th>
                                        <th className="text-right py-3 px-4 text-sm font-medium text-zinc-400">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sessions.map((session: any, index: number) => {
                                        // Format IP address
                                        const formatIP = (ip: string) => {
                                            if (!ip) return 'Unknown'
                                            if (ip === '::1' || ip === '127.0.0.1') return 'Localhost'
                                            if (ip.startsWith('::ffff:')) return ip.replace('::ffff:', '')
                                            return ip
                                        }
                                        
                                        // Parse user agent for better display
                                        const parseUserAgent = (ua: string) => {
                                            if (!ua) return 'Unknown Device'
                                            if (ua.includes('Chrome')) return 'Chrome Browser'
                                            if (ua.includes('Firefox')) return 'Firefox Browser'
                                            if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari Browser'
                                            if (ua.includes('Edge')) return 'Edge Browser'
                                            return ua.length > 50 ? ua.substring(0, 50) + '...' : ua
                                        }
                                        
                                        return (
                                            <tr key={session.id} className="border-b border-zinc-800/50 hover:bg-zinc-900/50 transition-colors">
                                                <td className="py-4 px-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-9 h-9 bg-zinc-900 rounded-lg flex items-center justify-center border border-zinc-800">
                                                            {session.user_agent?.includes('Mobile') ? (
                                                                <Smartphone className="w-4 h-4 text-zinc-500" />
                                                            ) : (
                                                                <Laptop className="w-4 h-4 text-zinc-500" />
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-medium text-white">
                                                                {session.user_agent?.includes('Mobile') ? 'Mobile' : 'Desktop'}
                                                            </span>
                                                            {index === 0 && (
                                                                <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full font-medium uppercase tracking-wider">
                                                                    Current
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="py-4 px-4">
                                                    <span className="font-mono text-zinc-300">{formatIP(session.ip_address)}</span>
                                                </td>
                                                <td className="py-4 px-4">
                                                    <span className="text-zinc-400">{parseUserAgent(session.user_agent)}</span>
                                                </td>
                                                <td className="py-4 px-4">
                                                    <span className="text-zinc-400">{formatDistanceToNow(new Date(session.last_active))} ago</span>
                                                </td>
                                                <td className="py-4 px-4 text-right">
                                                    {index !== 0 ? (
                                                        <button
                                                            onClick={() => revokeSession.mutate(session.id)}
                                                            disabled={revokeSession.isPending}
                                                            className="w-8 h-8 rounded-lg bg-zinc-800/50 border border-zinc-700/50 hover:bg-red-500/10 hover:border-red-500/50 transition-all flex items-center justify-center text-zinc-400 hover:text-red-400 ml-auto"
                                                            title="Revoke Session"
                                                        >
                                                            <LogOut className="w-4 h-4" />
                                                        </button>
                                                    ) : (
                                                        <span className="text-xs text-zinc-600">—</span>
                                                    )}
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {activeSection === '2fa' && (
                <div className="bg-zinc-950 border border-zinc-900 rounded-xl overflow-hidden">
                    <div className="px-6 py-4 border-b border-zinc-800/50">
                        <h3 className="text-lg font-medium text-zinc-200">Two-Factor Authentication</h3>
                        <p className="text-xs text-zinc-500 mt-0.5">Add an extra layer of security to your account</p>
                    </div>

                    <div className="p-8 text-center max-w-lg mx-auto">
                        <div className="p-4 rounded-full bg-zinc-900/50 w-fit mx-auto mb-6">
                            <Key size={40} className="text-zinc-600" />
                        </div>
                        <h3 className="text-xl font-semibold text-white mb-2">Protect Your Account</h3>
                        <p className="text-zinc-500 text-sm mb-8 leading-relaxed">
                            Two-factor authentication adds an extra layer of security by requiring a code from your mobile device when you sign in.
                        </p>

                        <button className="inline-flex items-center gap-2 px-6 py-3 bg-white text-black font-medium rounded-lg hover:bg-zinc-200 transition-all">
                            <Smartphone className="w-4 h-4" />
                            Setup 2FA Now
                        </button>

                        <div className="mt-8 flex items-center justify-center gap-6 text-zinc-600">
                            <span className="text-xs">Google Authenticator</span>
                            <span className="text-xs">Authy</span>
                            <span className="text-xs">Microsoft Authenticator</span>
                        </div>
                    </div>
                </div>
            )}

            {activeSection === 'alerts' && (
                <div className="space-y-6">
                    <div className="bg-zinc-950 border border-zinc-900 rounded-xl overflow-hidden">
                        <div className="px-6 py-4 border-b border-zinc-800/50">
                            <h3 className="text-lg font-medium text-zinc-200">Telegram Alerts</h3>
                            <p className="text-xs text-zinc-500 mt-0.5">Get instant notifications for security events</p>
                        </div>

                        <div className="p-6">
                            {telegramStatus?.systemConfigured === false && (
                                <div className="mb-6 p-4 bg-amber-500/5 border border-amber-500/20 rounded-lg flex items-start gap-3">
                                    <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <h4 className="font-medium text-amber-400 text-sm">System Not Configured</h4>
                                        <p className="text-xs text-amber-500/70 leading-relaxed mt-1">
                                            Telegram Bot Token is not configured on the server. Contact your administrator.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {telegramStatusLoading ? (
                                <div className="flex items-center justify-center py-12">
                                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
                                </div>
                            ) : telegramStatus?.connected ? (
                                <div className="space-y-6">
                                    <div className="bg-emerald-500/5 border border-emerald-500/20 p-5 rounded-lg flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                                                <CheckCircle2 className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <h4 className="font-semibold text-emerald-400">Connected & Active</h4>
                                                <p className="text-xs text-emerald-500/60 font-mono mt-0.5">Chat ID: {telegramStatus.chatId}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                                            <span className="text-xs font-medium text-emerald-400">Online</span>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap gap-3">
                                        <button
                                            onClick={() => testTelegram.mutate()}
                                            disabled={testTelegram.isPending}
                                            className="inline-flex items-center gap-2 px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 font-medium rounded-lg transition-all disabled:opacity-50 border border-zinc-800"
                                        >
                                            <Send className="w-4 h-4" />
                                            {testTelegram.isPending ? 'Sending...' : 'Send Test Alert'}
                                        </button>
                                        <button
                                            onClick={() => {
                                                if (confirm('Unlink Telegram alerts?')) {
                                                    unlinkTelegram.mutate()
                                                }
                                            }}
                                            disabled={unlinkTelegram.isPending}
                                            className="inline-flex items-center gap-2 px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-medium rounded-lg transition-all disabled:opacity-50"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                            {unlinkTelegram.isPending ? 'Unlinking...' : 'Unlink'}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2 block">Your Telegram Chat ID</label>
                                        <div className="flex gap-3">
                                            <input
                                                type="text"
                                                placeholder="Enter your Chat ID"
                                                value={telegramChatId}
                                                onChange={(e) => setTelegramChatId(e.target.value)}
                                                className="flex-1 bg-zinc-900/50 border border-zinc-800/50 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-zinc-700 transition-all"
                                            />
                                            <button
                                                onClick={() => setupTelegram.mutate(telegramChatId)}
                                                disabled={!telegramChatId || setupTelegram.isPending}
                                                className="px-5 py-2.5 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white font-medium rounded-lg transition-all"
                                            >
                                                {setupTelegram.isPending ? 'Linking...' : 'Link'}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="p-4 bg-zinc-900/30 border border-zinc-800/50 rounded-lg flex items-start gap-3">
                                        <AlertCircle className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                                        <p className="text-xs text-zinc-500 leading-relaxed">
                                            To find your Chat ID, send any message to{' '}
                                            <a href="https://t.me/userinfobot" target="_blank" className="text-blue-400 hover:underline font-medium">
                                                @userinfobot
                                            </a>{' '}
                                            on Telegram.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Alert Types */}
                    <div className="bg-zinc-950 border border-zinc-900 rounded-xl overflow-hidden">
                        <div className="px-6 py-4 border-b border-zinc-800/50">
                            <h3 className="text-lg font-medium text-zinc-200">Alert Types</h3>
                        </div>
                        <div className="divide-y divide-zinc-800/50">
                            {[
                                { name: 'New Device Login', description: 'Get notified when a new device logs in' },
                                { name: 'Failed Login Attempt', description: 'Alert on failed login attempts' },
                                { name: 'Password Changed', description: 'Notify when password is changed' },
                                { name: 'Session Revoked', description: 'Alert when a session is revoked' }
                            ].map((alert, i) => (
                                <div key={i} className="px-6 py-4 flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-zinc-200">{alert.name}</p>
                                        <p className="text-xs text-zinc-500 mt-0.5">{alert.description}</p>
                                    </div>
                                    <div className={`w-10 h-5 rounded-full relative transition-colors cursor-pointer ${telegramStatus?.connected ? 'bg-blue-500' : 'bg-zinc-800'}`}>
                                        <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${telegramStatus?.connected ? 'right-1' : 'left-1'}`}></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {activeSection === 'logs' && (
                <div className="bg-zinc-950 border border-zinc-900 rounded-xl overflow-hidden">
                    <div className="px-6 py-4 border-b border-zinc-800/50 flex justify-between items-center">
                        <div>
                            <h3 className="text-lg font-medium text-zinc-200">Security Logs</h3>
                            <p className="text-xs text-zinc-500 mt-0.5">Recent security events on your account</p>
                        </div>
                        <span className="text-xs text-zinc-500 bg-zinc-900 px-2 py-1 rounded">Last 50 events</span>
                    </div>

                    {logsLoading ? (
                        <div className="flex items-center justify-center py-16">
                            <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
                        </div>
                    ) : logs.length === 0 ? (
                        <div className="text-center py-16">
                            <div className="p-4 rounded-full bg-zinc-900/50 w-fit mx-auto mb-4">
                                <History size={32} className="text-zinc-600" />
                            </div>
                            <h3 className="text-lg font-medium text-zinc-300 mb-1">No security events</h3>
                            <p className="text-zinc-500 text-sm">Security logs will appear here</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-zinc-800/50">
                                        <th className="text-left py-3 px-4 text-sm font-medium text-zinc-400">Event</th>
                                        <th className="text-left py-3 px-4 text-sm font-medium text-zinc-400">IP Address</th>
                                        <th className="text-left py-3 px-4 text-sm font-medium text-zinc-400">Time</th>
                                        <th className="text-left py-3 px-4 text-sm font-medium text-zinc-400">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {logs.map((log: any) => (
                                        <tr key={log.id} className="border-b border-zinc-800/50 hover:bg-zinc-900/50 transition-colors">
                                            <td className="py-4 px-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-2 h-2 rounded-full ${log.event_type?.includes('FAILED') ? 'bg-red-500' : 'bg-emerald-500'}`} />
                                                    <span className="font-medium text-white">
                                                        {log.event_type?.replace(/_/g, ' ') || 'Unknown'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="py-4 px-4 font-mono text-zinc-500">{log.ip_address || 'Internal'}</td>
                                            <td className="py-4 px-4 text-zinc-500">{formatDistanceToNow(new Date(log.created_at))} ago</td>
                                            <td className="py-4 px-4">
                                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border ${log.event_type?.includes('FAILED')
                                                        ? 'bg-red-500/10 text-red-400 border-red-500/20'
                                                        : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                                    }`}>
                                                    {log.event_type?.includes('FAILED') ? (
                                                        <><X className="w-3 h-3" /> Blocked</>
                                                    ) : (
                                                        <><Check className="w-3 h-3" /> Verified</>
                                                    )}
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
    )
}
