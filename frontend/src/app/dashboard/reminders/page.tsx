'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Clock, Users, Play, Pause, Edit, Trash2, TestTube, RefreshCw, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { API_URL } from '@/lib/api'

interface Reminder {
    id: string
    name: string
    description: string
    schedule: string
    scheduleText: string
    targetType: string
    targetName: string
    isActive: boolean
    lastRun: string | null
    nextRun: string
    lastStatus: 'success' | 'failed' | 'skipped' | null
}

export default function RemindersPage() {
    const router = useRouter()
    const [reminders, setReminders] = useState<Reminder[]>([])
    const [loading, setLoading] = useState(true)
    const [isRefreshing, setIsRefreshing] = useState(false)

    useEffect(() => {
        fetchReminders()
    }, [])

    const fetchReminders = async (isBackground = false) => {
        if (!isBackground) setLoading(true)
        if (isBackground) setIsRefreshing(true)
        try {
            const token = localStorage.getItem('token');
            const urlParams = new URLSearchParams(window.location.search);
            const botId = urlParams.get('botId');

            let url = `${API_URL}/api/reminders`;
            if (botId) {
                url = `${API_URL}/api/reminders/bot/${botId}`;
            }

            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();

            if (data.success) {
                setReminders(data.data.map((r: any) => ({
                    id: r.id,
                    name: r.name,
                    description: r.description || '',
                    schedule: r.schedule,
                    scheduleText: formatSchedule(r.schedule),
                    targetType: r.target_type,
                    targetName: r.group_name || (r.target_id?.includes(',') ? `${r.target_id.split(',').length} Groups` : r.target_id) || 'Unknown',
                    isActive: r.is_active === 1,
                    lastRun: r.last_run_at,
                    nextRun: r.next_run_at || 'Not scheduled',
                    lastStatus: r.last_status
                })));
            }
        } catch (error) {
            console.error('Failed to fetch reminders:', error);
            toast.error('Failed to load reminders');
        } finally {
            setLoading(false);
            setIsRefreshing(false);
        }
    };

    const handleRefresh = () => {
        fetchReminders(true);
    };

    const formatSchedule = (cron: string): string => {
        if (cron === 'now') return 'Send immediately';
        const parts = cron.split(' ');
        if (parts.length !== 5) return cron;

        const [minute, hour, dom, month, dow] = parts;

        if (dow !== '*') {
            const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            return `Every ${days[parseInt(dow)]} at ${hour.padStart(2, '0')}:${minute.padStart(2, '0')} WIB`;
        }

        if (dom === '*' && month === '*') {
            return `Every day at ${hour.padStart(2, '0')}:${minute.padStart(2, '0')} WIB`;
        }

        return cron;
    };

    const toggleActive = async (id: string) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/api/reminders/${id}/toggle`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                toast.success('Reminder status updated');
                fetchReminders();
            } else {
                toast.error('Failed to update reminder');
            }
        } catch (error) {
            toast.error('Failed to update reminder');
        }
    };

    const deleteReminder = async (id: string, name: string) => {
        if (!confirm(`Are you sure you want to delete "${name}"?`)) return;

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/api/reminders/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                toast.success('Reminder deleted');
                fetchReminders();
            } else {
                toast.error('Failed to delete reminder');
            }
        } catch (error) {
            toast.error('Failed to delete reminder');
        }
    };

    if (loading) {
        return (
            <div className="p-4 sm:p-6 lg:p-8 min-h-screen bg-[#09090b] flex items-center justify-center">
                <div className="text-center">
                    <div className="w-8 h-8 border-2 border-zinc-700 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-zinc-500 text-sm">Loading reminders...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8 min-h-screen bg-[#09090b] text-zinc-100">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-xl sm:text-2xl font-semibold text-white tracking-tight">Reminders</h1>
                        {isRefreshing && (
                            <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                        )}
                    </div>
                    <p className="text-zinc-500 dark:text-zinc-100 text-xs sm:text-sm mt-1">Schedule automated messages for your contacts</p>
                </div>
                <div className="flex items-center gap-2 sm:gap-3">
                    {/* Refresh Button */}
                    <button
                        onClick={handleRefresh}
                        disabled={isRefreshing}
                        className={`p-2 bg-zinc-900 border rounded-lg transition-all ${isRefreshing
                            ? 'border-blue-500/50 text-blue-400'
                            : 'border-zinc-800/50 text-zinc-400 hover:text-white hover:border-zinc-700'
                            }`}
                    >
                        <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                        onClick={() => router.push('/dashboard/reminders/create')}
                        className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-white text-black hover:bg-zinc-200 rounded-lg text-sm font-medium transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        <span className="hidden sm:inline">Create Reminder</span>
                        <span className="sm:hidden">Create</span>
                    </button>
                </div>
            </div>

            {/* Reminders Grid */}
            {reminders.length === 0 ? (
                <div className="bg-[#18181b] border border-zinc-800 rounded-xl p-8 sm:p-12 text-center">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Clock className="w-6 h-6 sm:w-8 sm:h-8 text-zinc-600" />
                    </div>
                    <h3 className="text-base sm:text-lg font-semibold text-white mb-2">No Reminders Yet</h3>
                    <p className="text-zinc-500 text-xs sm:text-sm mb-6">Create your first reminder to get started</p>
                    <button
                        onClick={() => router.push('/dashboard/reminders/create')}
                        className="px-4 py-2 bg-white text-black hover:bg-zinc-200 rounded-lg text-sm font-medium transition-colors"
                    >
                        Create Reminder
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
                    {reminders.map((reminder) => (
                        <div
                            key={reminder.id}
                            className="bg-[#18181b] border border-zinc-800 rounded-xl p-4 sm:p-6 hover:border-zinc-700 transition-colors"
                        >
                            {/* Header */}
                            <div className="flex items-start justify-between mb-3 sm:mb-4">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 sm:gap-3 mb-1 flex-wrap">
                                        <h3 className="text-base sm:text-lg font-semibold text-white truncate">{reminder.name}</h3>
                                        <span className={`px-2 py-0.5 rounded text-[10px] sm:text-xs font-medium ${reminder.isActive
                                            ? 'bg-green-500/10 text-green-500'
                                            : 'bg-zinc-700 text-zinc-400'
                                            }`}>
                                            {reminder.isActive ? 'Active' : 'Paused'}
                                        </span>
                                    </div>
                                    {reminder.description && (
                                        <p className="text-zinc-500 text-xs sm:text-sm truncate">{reminder.description}</p>
                                    )}
                                </div>
                            </div>

                            {/* Info Grid */}
                            <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-3 sm:mb-4">
                                <div className="bg-[#0d0d0f] border border-zinc-800 rounded-lg p-2 sm:p-3">
                                    <div className="flex items-center gap-1.5 sm:gap-2 mb-1">
                                        <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-zinc-500" />
                                        <span className="text-[10px] sm:text-xs text-zinc-500">Schedule</span>
                                    </div>
                                    <p className="text-xs sm:text-sm text-white font-medium truncate">{reminder.scheduleText}</p>
                                </div>

                                <div className="bg-[#0d0d0f] border border-zinc-800 rounded-lg p-2 sm:p-3">
                                    <div className="flex items-center gap-1.5 sm:gap-2 mb-1">
                                        <Users className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-zinc-500" />
                                        <span className="text-[10px] sm:text-xs text-zinc-500">Target</span>
                                    </div>
                                    <p className="text-xs sm:text-sm text-white font-medium truncate">{reminder.targetName}</p>
                                </div>
                            </div>

                            {/* Execution Info */}
                            <div className="bg-[#0d0d0f] border border-zinc-800 rounded-lg p-2 sm:p-3 mb-3 sm:mb-4">
                                <div className="grid grid-cols-2 gap-2 sm:gap-4">
                                    <div>
                                        <span className="text-[10px] sm:text-xs text-zinc-500 block mb-1">Last Run</span>
                                        <div className="flex items-center gap-1.5 sm:gap-2">
                                            {reminder.lastStatus === 'success' && (
                                                <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 bg-green-500 rounded-full"></div>
                                            )}
                                            {reminder.lastStatus === 'failed' && (
                                                <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 bg-red-500 rounded-full"></div>
                                            )}
                                            <span className="text-xs sm:text-sm text-white">
                                                {reminder.lastRun ? new Date(reminder.lastRun).toLocaleString('id-ID', {
                                                    day: '2-digit',
                                                    month: 'short',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                }) : 'Never'}
                                            </span>
                                        </div>
                                    </div>
                                    <div>
                                        <span className="text-[10px] sm:text-xs text-zinc-500 block mb-1">Next Run</span>
                                        <span className="text-xs sm:text-sm text-white font-medium">
                                            {reminder.nextRun === 'Not scheduled' || !reminder.nextRun || isNaN(Date.parse(reminder.nextRun)) ? 'Not scheduled' :
                                                new Date(reminder.nextRun).toLocaleString('id-ID', {
                                                    day: '2-digit',
                                                    month: 'short',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-1.5 sm:gap-2">
                                <button
                                    onClick={() => toggleActive(reminder.id)}
                                    className={`flex-1 flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${reminder.isActive
                                        ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                                        : 'bg-green-500/10 text-green-500 hover:bg-green-500/20'
                                        }`}
                                >
                                    {reminder.isActive ? (
                                        <>
                                            <Pause className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                            Pause
                                        </>
                                    ) : (
                                        <>
                                            <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                            <span className="hidden sm:inline">Activate</span>
                                            <span className="sm:hidden">Start</span>
                                        </>
                                    )}
                                </button>
                                <button
                                    onClick={() => router.push(`/dashboard/reminders/${reminder.id}/edit`)}
                                    className="px-2 sm:px-3 py-1.5 sm:py-2 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 rounded-lg transition-colors"
                                    title="Edit"
                                >
                                    <Edit className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                </button>
                                <button
                                    onClick={() => deleteReminder(reminder.id, reminder.name)}
                                    className="px-2 sm:px-3 py-1.5 sm:py-2 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-lg transition-colors"
                                    title="Delete"
                                >
                                    <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
