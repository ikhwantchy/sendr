'use client'

import { useState, useEffect, useRef } from 'react'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import { usePermissions } from '@/hooks/usePermissions'
import { 
    Bell, 
    Plus, 
    Search, 
    Clock,
    Repeat,
    Users,
    Trash2,
    Edit3,
    Loader2,
    CheckCircle2,
    XCircle,
    Bot
} from 'lucide-react'
import Link from 'next/link'

interface Reminder {
    id: string
    bot_id: string
    bot?: { name: string; phone: string }
    name: string
    message: string
    schedule_type: 'once' | 'daily' | 'weekly' | 'monthly' | 'custom'
    schedule_time: string
    schedule_date?: string
    schedule_days?: string[]
    target_type: 'group' | 'contact' | 'broadcast'
    target_ids: string[]
    is_active: boolean
    last_sent?: string
    next_run?: string
    created_at: string
}

export default function UserRemindersPage() {
    const [reminders, setReminders] = useState<Reminder[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [filterBot, setFilterBot] = useState<string>('all')
    const [filterStatus, setFilterStatus] = useState<string>('all')
    const { user, filterBots, permissions, isAdmin } = usePermissions()
    const [bots, setBots] = useState<any[]>([])

    useEffect(() => {
        fetchData()
    }, [permissions])

    const fetchData = async () => {
        try {
            setLoading(true)
            
            // Fetch bots that user has access to
            const botsRes = await api.bots.list()
            const allBots = filterBots(botsRes.data.data || [])
            // Admin has full access, otherwise filter by permission
            let userBots = allBots
            if (!isAdmin) {
                userBots = allBots.filter((bot: any) => {
                    const perm = permissions?.find((p: any) => p.bot_id === bot.id)
                    return perm?.can_use_reminders === 1 || perm?.can_use_reminders === true
                })
            }
            setBots(userBots)
            
            // Fetch reminders for accessible bots
            const botIds = userBots.map((b: any) => b.id)
            if (botIds.length > 0) {
                const remindersRes = await api.reminders.list()
                const userReminders = (remindersRes.data.data || []).filter(
                    (r: Reminder) => botIds.includes(r.bot_id)
                )
                setReminders(userReminders)
            }
        } catch (error) {
            toast.error('Failed to load reminders')
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this reminder?')) return
        
        try {
            await api.reminders.delete(id)
            toast.success('Reminder deleted')
            setReminders(reminders.filter(r => r.id !== id))
        } catch (error) {
            toast.error('Failed to delete reminder')
        }
    }

    const handleToggleActive = async (reminder: Reminder) => {
        try {
            await api.reminders.update(reminder.id, { is_active: !reminder.is_active })
            setReminders(reminders.map(r => 
                r.id === reminder.id ? { ...r, is_active: !r.is_active } : r
            ))
            toast.success(reminder.is_active ? 'Reminder paused' : 'Reminder activated')
        } catch (error) {
            toast.error('Failed to update reminder')
        }
    }

    const filteredReminders = reminders.filter(reminder => {
        const matchesSearch = reminder.name.toLowerCase().includes(search.toLowerCase()) ||
            reminder.message.toLowerCase().includes(search.toLowerCase())
        const matchesBot = filterBot === 'all' || reminder.bot_id === filterBot
        const matchesStatus = filterStatus === 'all' || 
            (filterStatus === 'active' && reminder.is_active) ||
            (filterStatus === 'paused' && !reminder.is_active)
        return matchesSearch && matchesBot && matchesStatus
    })

    const getScheduleLabel = (reminder: Reminder) => {
        switch (reminder.schedule_type) {
            case 'once': return `Once at ${reminder.schedule_time}`
            case 'daily': return `Daily at ${reminder.schedule_time}`
            case 'weekly': return `Weekly at ${reminder.schedule_time}`
            case 'monthly': return `Monthly at ${reminder.schedule_time}`
            case 'custom': return `Custom schedule`
            default: return reminder.schedule_type
        }
    }

    const formatDate = (date: string) => {
        return new Date(date).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
            </div>
        )
    }

    if (bots.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
                <div className="w-16 h-16 rounded-2xl bg-zinc-800/50 flex items-center justify-center mb-4">
                    <Bell className="w-8 h-8 text-zinc-500" />
                </div>
                <h2 className="text-xl font-semibold text-white mb-2">No Access to Reminders</h2>
                <p className="text-zinc-500 max-w-md">
                    You don't have permission to use reminders on any bots. Contact your admin to get access.
                </p>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white">Reminders</h1>
                    <p className="text-zinc-500 text-sm mt-1">Schedule automated messages</p>
                </div>
                <Link
                    href="/user/reminders/create"
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    Create Reminder
                </Link>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <input
                        type="text"
                        placeholder="Search reminders..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-zinc-900/50 border border-zinc-800 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                    />
                </div>
                <select
                    value={filterBot}
                    onChange={(e) => setFilterBot(e.target.value)}
                    className="px-4 py-2.5 bg-zinc-900/50 border border-zinc-800 rounded-xl text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                >
                    <option value="all">All Bots</option>
                    {bots.map(bot => (
                        <option key={bot.id} value={bot.id}>{bot.name}</option>
                    ))}
                </select>
                <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="px-4 py-2.5 bg-zinc-900/50 border border-zinc-800 rounded-xl text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="paused">Paused</option>
                </select>
            </div>

            {/* Reminders List */}
            {filteredReminders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-zinc-800/50 flex items-center justify-center mb-4">
                        <Bell className="w-8 h-8 text-zinc-500" />
                    </div>
                    <h3 className="text-lg font-medium text-white mb-2">No reminders found</h3>
                    <p className="text-zinc-500 text-sm mb-6">
                        {search || filterBot !== 'all' || filterStatus !== 'all' 
                            ? 'Try adjusting your filters'
                            : 'Create your first reminder to get started'}
                    </p>
                    {!search && filterBot === 'all' && filterStatus === 'all' && (
                        <Link
                            href="/user/reminders/create"
                            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                        >
                            <Plus className="w-4 h-4" />
                            Create Reminder
                        </Link>
                    )}
                </div>
            ) : (
                <div className="grid gap-4">
                    {filteredReminders.map(reminder => (
                        <div
                            key={reminder.id}
                            className="bg-zinc-900/50 border border-zinc-800/50 rounded-2xl p-5 hover:border-zinc-700/50 transition-colors"
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-3 mb-2">
                                        <h3 className="font-semibold text-white truncate">{reminder.name}</h3>
                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                                            reminder.is_active 
                                                ? 'bg-emerald-500/10 text-emerald-400'
                                                : 'bg-zinc-500/10 text-zinc-400'
                                        }`}>
                                            {reminder.is_active ? (
                                                <><CheckCircle2 className="w-3 h-3" /> Active</>
                                            ) : (
                                                <><XCircle className="w-3 h-3" /> Paused</>
                                            )}
                                        </span>
                                    </div>
                                    
                                    <p className="text-zinc-400 text-sm line-clamp-2 mb-3">{reminder.message}</p>
                                    
                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-zinc-500">
                                        <div className="flex items-center gap-1.5">
                                            <Bot className="w-3.5 h-3.5" />
                                            <span>{reminder.bot?.name || 'Unknown Bot'}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <Repeat className="w-3.5 h-3.5" />
                                            <span>{getScheduleLabel(reminder)}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <Users className="w-3.5 h-3.5" />
                                            <span>{reminder.target_ids?.length || 0} recipients</span>
                                        </div>
                                        {reminder.next_run && (
                                            <div className="flex items-center gap-1.5">
                                                <Clock className="w-3.5 h-3.5" />
                                                <span>Next: {formatDate(reminder.next_run)}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => handleToggleActive(reminder)}
                                        className={`p-2 rounded-lg transition-colors ${
                                            reminder.is_active 
                                                ? 'hover:bg-zinc-800 text-zinc-400 hover:text-yellow-400'
                                                : 'hover:bg-zinc-800 text-zinc-400 hover:text-emerald-400'
                                        }`}
                                        title={reminder.is_active ? 'Pause' : 'Activate'}
                                    >
                                        {reminder.is_active ? (
                                            <XCircle className="w-4 h-4" />
                                        ) : (
                                            <CheckCircle2 className="w-4 h-4" />
                                        )}
                                    </button>
                                    <Link
                                        href={`/user/reminders/${reminder.id}/edit`}
                                        className="p-2 hover:bg-zinc-800 rounded-lg transition-colors text-zinc-400 hover:text-blue-400"
                                        title="Edit"
                                    >
                                        <Edit3 className="w-4 h-4" />
                                    </Link>
                                    <button
                                        onClick={() => handleDelete(reminder.id)}
                                        className="p-2 hover:bg-zinc-800 rounded-lg transition-colors text-zinc-400 hover:text-red-400"
                                        title="Delete"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
