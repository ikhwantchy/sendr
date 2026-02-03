'use client'

import { useParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { api, API_URL } from '@/lib/api'
import { usePermissions } from '@/hooks/usePermissions'
import { toast } from 'sonner'
import Link from 'next/link'
import {
    ArrowLeft,
    Bell,
    Clock,
    Calendar,
    Users,
    Repeat,
    CheckCircle,
    XCircle,
    Pencil,
    Trash,
    Play,
    Pause
} from '@phosphor-icons/react'

export default function UserReminderDetailPage() {
    const params = useParams()
    const router = useRouter()
    const reminderId = params?.id as string
    const { permissions, isAdmin } = usePermissions()

    const { data: reminder, isLoading, refetch } = useQuery({
        queryKey: ['reminder', reminderId],
        queryFn: async () => {
            const token = localStorage.getItem('token')
            const response = await fetch(`${API_URL}/api/reminders/${reminderId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            const data = await response.json()
            return data.data
        },
        enabled: !!reminderId,
    })

    // Check if user has access to this reminder's bot
    const hasAccess = isAdmin || permissions?.some(
        (p: any) => p.bot_id === reminder?.bot_id && (p.can_use_reminders === 1 || p.can_use_reminders === true)
    )

    const handleToggleActive = async () => {
        try {
            await api.reminders.update(reminderId, { is_active: !reminder.is_active })
            toast.success(reminder.is_active ? 'Reminder paused' : 'Reminder activated')
            refetch()
        } catch (error) {
            toast.error('Failed to update reminder')
        }
    }

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this reminder?')) return
        try {
            await api.reminders.delete(reminderId)
            toast.success('Reminder deleted')
            router.push('/user/reminders')
        } catch (error) {
            toast.error('Failed to delete reminder')
        }
    }

    const getScheduleLabel = () => {
        if (!reminder) return ''
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
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    if (isLoading) {
        return (
            <div className="max-w-3xl mx-auto">
                <div className="animate-pulse">
                    <div className="h-8 w-48 bg-zinc-200 dark:bg-zinc-800 rounded mb-6" />
                    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6">
                        <div className="h-6 w-64 bg-zinc-200 dark:bg-zinc-800 rounded mb-4" />
                        <div className="h-4 w-full bg-zinc-200 dark:bg-zinc-800 rounded mb-2" />
                        <div className="h-4 w-3/4 bg-zinc-200 dark:bg-zinc-800 rounded" />
                    </div>
                </div>
            </div>
        )
    }

    if (!reminder || !hasAccess) {
        return (
            <div className="max-w-2xl mx-auto text-center py-20">
                <Bell size={64} className="mx-auto text-zinc-400 mb-4" />
                <h1 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">
                    {!reminder ? 'Reminder Not Found' : 'Access Denied'}
                </h1>
                <p className="text-zinc-500 mb-6">
                    {!reminder 
                        ? 'The reminder you are looking for does not exist.'
                        : 'You don\'t have permission to view this reminder.'}
                </p>
                <Link
                    href="/user/reminders"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    <ArrowLeft size={16} />
                    Back to Reminders
                </Link>
            </div>
        )
    }

    return (
        <div className="max-w-3xl mx-auto">
            {/* Back Button */}
            <Link
                href="/user/reminders"
                className="inline-flex items-center gap-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-white mb-6 transition-colors"
            >
                <ArrowLeft size={16} />
                <span>Back to Reminders</span>
            </Link>

            {/* Header */}
            <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${
                        reminder.is_active 
                            ? 'bg-emerald-50 dark:bg-emerald-500/10' 
                            : 'bg-zinc-100 dark:bg-zinc-800'
                    }`}>
                        <Bell size={28} className={reminder.is_active ? 'text-emerald-500' : 'text-zinc-400'} weight="fill" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">{reminder.name}</h1>
                        <div className="flex items-center gap-2 mt-1">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                                reminder.is_active 
                                    ? 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'
                            }`}>
                                {reminder.is_active ? (
                                    <><CheckCircle size={12} weight="fill" /> Active</>
                                ) : (
                                    <><XCircle size={12} weight="fill" /> Paused</>
                                )}
                            </span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleToggleActive}
                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                            reminder.is_active
                                ? 'bg-yellow-50 dark:bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-100 dark:hover:bg-yellow-500/20'
                                : 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/20'
                        }`}
                    >
                        {reminder.is_active ? <Pause size={18} /> : <Play size={18} />}
                        {reminder.is_active ? 'Pause' : 'Activate'}
                    </button>
                    <Link
                        href={`/user/reminders/${reminderId}/edit`}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                    >
                        <Pencil size={18} />
                        Edit
                    </Link>
                    <button
                        onClick={handleDelete}
                        className="p-2 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors"
                    >
                        <Trash size={18} />
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="space-y-6">
                {/* Message */}
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6">
                    <h2 className="text-sm font-medium text-zinc-500 mb-3">Message</h2>
                    <p className="text-zinc-900 dark:text-white whitespace-pre-wrap">{reminder.message}</p>
                </div>

                {/* Schedule Info */}
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6">
                    <h2 className="text-sm font-medium text-zinc-500 mb-4">Schedule</h2>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center">
                                <Repeat size={20} className="text-blue-500" />
                            </div>
                            <div>
                                <p className="text-xs text-zinc-500">Frequency</p>
                                <p className="text-sm font-medium text-zinc-900 dark:text-white capitalize">{reminder.schedule_type}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-purple-50 dark:bg-purple-500/10 flex items-center justify-center">
                                <Clock size={20} className="text-purple-500" />
                            </div>
                            <div>
                                <p className="text-xs text-zinc-500">Time</p>
                                <p className="text-sm font-medium text-zinc-900 dark:text-white">{reminder.schedule_time}</p>
                            </div>
                        </div>
                        {reminder.next_run && (
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-green-50 dark:bg-green-500/10 flex items-center justify-center">
                                    <Calendar size={20} className="text-green-500" />
                                </div>
                                <div>
                                    <p className="text-xs text-zinc-500">Next Run</p>
                                    <p className="text-sm font-medium text-zinc-900 dark:text-white">{formatDate(reminder.next_run)}</p>
                                </div>
                            </div>
                        )}
                        {reminder.last_sent && (
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                                    <CheckCircle size={20} className="text-zinc-500" />
                                </div>
                                <div>
                                    <p className="text-xs text-zinc-500">Last Sent</p>
                                    <p className="text-sm font-medium text-zinc-900 dark:text-white">{formatDate(reminder.last_sent)}</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Recipients */}
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6">
                    <h2 className="text-sm font-medium text-zinc-500 mb-4">Recipients</h2>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-orange-50 dark:bg-orange-500/10 flex items-center justify-center">
                            <Users size={20} className="text-orange-500" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-zinc-900 dark:text-white">
                                {reminder.target_ids?.length || 0} {reminder.target_type === 'group' ? 'groups' : 'contacts'}
                            </p>
                            <p className="text-xs text-zinc-500 capitalize">{reminder.target_type}</p>
                        </div>
                    </div>
                </div>

                {/* Meta Info */}
                <div className="text-sm text-zinc-500">
                    <p>Created: {formatDate(reminder.created_at)}</p>
                    {reminder.bot?.name && <p>Bot: {reminder.bot.name}</p>}
                </div>
            </div>
        </div>
    )
}
