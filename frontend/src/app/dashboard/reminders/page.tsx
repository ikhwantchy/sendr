'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

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

    useEffect(() => {
        const fetchReminders = async () => {
            try {
                const token = localStorage.getItem('token');
                const urlParams = new URLSearchParams(window.location.search);
                const botId = urlParams.get('botId');

                let url = 'http://localhost:3001/api/reminders';
                if (botId) {
                    url = `http://localhost:3001/api/reminders/bot/${botId}`;
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
            } finally {
                setLoading(false);
            }
        };

        fetchReminders();
    }, []);

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

    const toggleActive = (id: string) => {
        setReminders(reminders.map(r =>
            r.id === id ? { ...r, isActive: !r.isActive } : r
        ))
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="relative w-16 h-16 mx-auto mb-4">
                        <div className="absolute inset-0 rounded-full border-4 border-cyan-500/20"></div>
                        <div className="absolute inset-0 rounded-full border-4 border-cyan-500 border-t-transparent animate-spin"></div>
                    </div>
                    <p className="text-gray-400 font-medium">Loading reminders...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center justify-between mb-2">
                        <div>
                            <h1 className="text-3xl font-bold text-white mb-2">Reminders</h1>
                            <p className="text-gray-400">Schedule automated messages for your contacts</p>
                        </div>
                        <button
                            onClick={() => router.push('/dashboard/reminders/create')}
                            className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold rounded-xl hover:from-cyan-600 hover:to-blue-700 transition-all duration-300 shadow-lg hover:shadow-cyan-500/50 hover:scale-105"
                        >
                            <span className="flex items-center gap-2">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                Create Reminder
                            </span>
                        </button>
                    </div>
                </div>

                {/* Reminders Grid */}
                {reminders.length === 0 ? (
                    <div className="glass rounded-2xl border border-white/10 p-12 text-center">
                        <div className="w-24 h-24 bg-gradient-to-br from-cyan-500/20 to-purple-600/20 rounded-full flex items-center justify-center mx-auto mb-6">
                            <svg className="w-12 h-12 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">No Reminders Yet</h3>
                        <p className="text-gray-400 mb-6">Create your first reminder to get started</p>
                        <button
                            onClick={() => router.push('/dashboard/reminders/create')}
                            className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold rounded-xl hover:from-cyan-600 hover:to-blue-700 transition-all duration-300"
                        >
                            Create Reminder
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {reminders.map((reminder) => (
                            <ReminderCard
                                key={reminder.id}
                                reminder={reminder}
                                onToggle={() => toggleActive(reminder.id)}
                                onEdit={() => router.push(`/dashboard/reminders/${reminder.id}/edit`)}
                                onDelete={() => {/* TODO */ }}
                                onTest={() => {/* TODO */ }}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}

function ReminderCard({ reminder, onToggle, onEdit, onDelete, onTest }: any) {
    return (
        <div className="glass rounded-2xl border border-white/10 p-6 hover-lift group relative overflow-hidden">
            {/* Status Indicator */}
            <div className={`absolute top-0 left-0 w-1 h-full ${reminder.isActive ? 'bg-green-500' : 'bg-gray-500'}`}></div>

            {/* Header */}
            <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-bold text-white">{reminder.name}</h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${reminder.isActive
                            ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                            : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                            }`}>
                            {reminder.isActive ? 'Active' : 'Inactive'}
                        </span>
                    </div>
                    <p className="text-gray-400 text-sm">{reminder.description}</p>
                </div>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="glass-strong rounded-xl p-3">
                    <div className="flex items-center gap-2 mb-1">
                        <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-xs text-gray-400">Schedule</span>
                    </div>
                    <p className="text-sm text-white font-medium">{reminder.scheduleText}</p>
                </div>

                <div className="glass-strong rounded-xl p-3">
                    <div className="flex items-center gap-2 mb-1">
                        <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        <span className="text-xs text-gray-400">Target</span>
                    </div>
                    <p className="text-sm text-white font-medium">{reminder.targetName}</p>
                </div>
            </div>

            {/* Execution Info */}
            <div className="glass-strong rounded-xl p-3 mb-4">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <span className="text-xs text-gray-400 block mb-1">Last Run</span>
                        <div className="flex items-center gap-2">
                            {reminder.lastStatus === 'success' && (
                                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            )}
                            {reminder.lastStatus === 'failed' && (
                                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                            )}
                            <span className="text-sm text-white">
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
                        <span className="text-xs text-gray-400 block mb-1">Next Run</span>
                        <span className="text-sm text-cyan-400 font-medium">
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
            <div className="flex items-center gap-2">
                <button
                    onClick={onToggle}
                    className={`flex-1 px-4 py-2 rounded-xl font-semibold transition-all duration-300 ${reminder.isActive
                        ? 'bg-gray-500/20 text-gray-300 hover:bg-gray-500/30'
                        : 'bg-green-500/20 text-green-400 hover:bg-green-500/30 border border-green-500/30'
                        }`}
                >
                    {reminder.isActive ? 'Pause' : 'Activate'}
                </button>
                <button
                    onClick={onTest}
                    className="px-4 py-2 bg-cyan-500/20 text-cyan-400 rounded-xl font-semibold hover:bg-cyan-500/30 transition-all duration-300 border border-cyan-500/30"
                >
                    Test
                </button>
                <button
                    onClick={onEdit}
                    className="px-4 py-2 bg-purple-500/20 text-purple-400 rounded-xl font-semibold hover:bg-purple-500/30 transition-all duration-300 border border-purple-500/30"
                >
                    Edit
                </button>
                <button
                    onClick={onDelete}
                    className="px-4 py-2 bg-red-500/20 text-red-400 rounded-xl font-semibold hover:bg-red-500/30 transition-all duration-300 border border-red-500/30"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                </button>
            </div>
        </div>
    )
}
