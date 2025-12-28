'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import ChatPreview from '@/components/ChatPreview'

interface FormData {
    name: string
    description: string
    botId: string
    targetType: 'group' | 'contact'
    targetId: string
    scheduleType: 'now' | 'once' | 'daily' | 'weekly' | 'monthly' | 'custom'
    date: string
    time: string
    timezone: string
    cronExpression: string
    dataSourceType: 'google_sheets' | 'none'
    googleSheetsUrl: string
    dataSourceId: string
    template: string
    imageUrl: string
}

export default function EditReminderPage() {
    const router = useRouter()
    const { id } = useParams()

    const [currentStep, setCurrentStep] = useState(1)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [bots, setBots] = useState<any[]>([])
    const [groups, setGroups] = useState<any[]>([])
    const [selectedGroups, setSelectedGroups] = useState<string[]>([])
    const [previewMessage, setPreviewMessage] = useState('')

    const [formData, setFormData] = useState<FormData>({
        name: '',
        description: '',
        botId: '',
        targetType: 'group',
        targetId: '',
        scheduleType: 'daily',
        date: '',
        time: '08:00',
        timezone: 'Asia/Jakarta',
        cronExpression: '',
        dataSourceType: 'none',
        googleSheetsUrl: '',
        dataSourceId: '',
        template: '',
        imageUrl: '',
    })

    useEffect(() => {
        const init = async () => {
            await fetchBots()
            await fetchReminder()
        }
        init()
    }, [id])

    const fetchReminder = async () => {
        try {
            const token = localStorage.getItem('token')
            const response = await fetch(`http://localhost:3001/api/reminders/${id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            const data = await response.json()
            if (data.success) {
                const r = data.data
                const templateConfig = JSON.parse(r.template_config || '{}')

                // Parse schedule
                let scheduleType: any = 'daily'
                let time = '08:00'
                let date = ''

                if (r.schedule === 'now') {
                    scheduleType = 'now'
                } else if (r.schedule.split(' ').length === 5) {
                    const parts = r.schedule.split(' ')
                    // Minute Hour Day Month Year(DOW)
                    // Simplified parsing for now
                    time = `${parts[1].padStart(2, '0')}:${parts[0].padStart(2, '0')}`
                    if (parts[4] !== '*') {
                        scheduleType = 'weekly'
                    } else if (parts[2] !== '*' || parts[3] !== '*') {
                        scheduleType = 'once'
                    } else {
                        scheduleType = 'daily'
                    }
                }

                setFormData({
                    name: r.name,
                    description: r.description || '',
                    botId: r.bot_id,
                    targetType: r.target_type,
                    targetId: r.target_id,
                    scheduleType: scheduleType,
                    date: date,
                    time: time,
                    timezone: r.timezone || 'Asia/Jakarta',
                    cronExpression: r.schedule,
                    dataSourceType: r.data_source_id ? 'google_sheets' : 'none',
                    googleSheetsUrl: '', // Need to fetch from data_sources if needed
                    dataSourceId: r.data_source_id || '',
                    template: templateConfig.body || templateConfig.template || '',
                    imageUrl: templateConfig.image_url || '',
                })

                if (r.target_id) {
                    setSelectedGroups(r.target_id.split(','))
                }

                if (r.bot_id) {
                    await fetchGroups(r.bot_id)
                }
            }
        } catch (error) {
            console.error('Error fetching reminder:', error)
        } finally {
            setLoading(false)
        }
    }

    const fetchBots = async () => {
        try {
            const token = localStorage.getItem('token')
            const response = await fetch('http://localhost:3001/api/bots', {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            const data = await response.json()
            if (data.success) {
                setBots(data.data)
            }
        } catch (error) {
            console.error('Error fetching bots:', error)
        }
    }

    const fetchGroups = async (botId: string) => {
        try {
            const token = localStorage.getItem('token')
            const response = await fetch(`http://localhost:3001/api/bots/${botId}/groups`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            const data = await response.json()
            if (data.success) {
                setGroups(data.data || [])
            }
        } catch (error) {
            console.error('Error fetching groups:', error)
        }
    }

    useEffect(() => {
        generatePreview()
    }, [formData.template])

    const generatePreview = () => {
        if (!formData.template) {
            setPreviewMessage('')
            return
        }
        setPreviewMessage(formData.template)
    }

    const steps = [
        { number: 1, title: 'Basic Info', icon: '📝' },
        { number: 2, title: 'Schedule', icon: '⏰' },
        { number: 3, title: 'Data Source', icon: '📊' },
        { number: 4, title: 'Message Template', icon: '💬' }
    ]

    const handleSubmit = async () => {
        try {
            setSaving(true);
            const token = localStorage.getItem('token');
            const targetId = selectedGroups.join(',');

            let schedule = 'now';
            if (formData.scheduleType !== 'now') {
                const [hour, minute] = formData.time.split(':');
                if (formData.scheduleType === 'daily') {
                    schedule = `${parseInt(minute)} ${parseInt(hour)} * * *`;
                } else if (formData.scheduleType === 'weekly') {
                    const dow = formData.date ? new Date(formData.date).getDay() : 0;
                    schedule = `${parseInt(minute)} ${parseInt(hour)} * * ${dow}`;
                } else if (formData.scheduleType === 'once') {
                    if (formData.date) {
                        const dateObj = new Date(formData.date);
                        schedule = `${parseInt(minute)} ${parseInt(hour)} ${dateObj.getDate()} ${dateObj.getMonth() + 1} *`;
                    } else {
                        // Keep old schedule if date not changed and was already a cron
                        schedule = formData.cronExpression;
                    }
                }
            }

            const payload = {
                name: formData.name,
                description: formData.description,
                botId: formData.botId,
                targetType: formData.targetType,
                targetId: targetId,
                schedule: schedule,
                timezone: formData.timezone,
                dataSourceId: formData.dataSourceId || null,
                templateConfig: {
                    body: formData.template,
                    image_url: formData.imageUrl
                }
            };

            const response = await fetch(`http://localhost:3001/api/reminders/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json();
            if (data.success) {
                router.push('/dashboard/reminders?botId=' + formData.botId);
            } else {
                alert('Error: ' + data.error);
            }
        } catch (error) {
            console.error('Error updating reminder:', error);
            alert('Failed to connect to server');
        } finally {
            setSaving(false);
        }
    }

    if (loading) return <div className="p-10 text-white">Loading...</div>

    return (
        <div className="min-h-screen p-6">
            <div className="max-w-[1800px] mx-auto">
                <button onClick={() => router.push('/dashboard/reminders')} className="flex items-center gap-2 text-gray-400 hover:text-white mb-4">
                    ← Back to Reminders
                </button>
                <h1 className="text-3xl font-bold text-white mb-8">Edit Reminder</h1>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="glass rounded-2xl p-6">
                        <div className="flex gap-4 mb-8 overflow-x-auto pb-4">
                            {steps.map(s => (
                                <button key={s.number} onClick={() => setCurrentStep(s.number)} className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition ${currentStep === s.number ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400' : 'bg-white/5 border-white/10 text-gray-400'}`}>
                                    <span>{s.icon}</span>
                                    <span className="whitespace-nowrap">{s.title}</span>
                                </button>
                            ))}
                        </div>

                        <div className="space-y-6">
                            {currentStep === 1 && (
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-2">Name</label>
                                        <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-500" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
                                        <textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-500" rows={3} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-2">Target Groups</label>
                                        <div className="max-h-60 overflow-y-auto space-y-2 p-4 bg-white/5 border border-white/10 rounded-xl">
                                            {groups.map(g => (
                                                <label key={g.jid} className="flex items-center gap-3 p-2 hover:bg-white/5 cursor-pointer">
                                                    <input type="checkbox" checked={selectedGroups.includes(g.jid)} onChange={() => {
                                                        setSelectedGroups(prev => prev.includes(g.jid) ? prev.filter(x => x !== g.jid) : [...prev, g.jid])
                                                    }} className="w-4 h-4 rounded border-white/20 bg-white/5 text-cyan-500" />
                                                    <span className="text-white text-sm">{g.name}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {currentStep === 2 && (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-3">
                                        {['now', 'once', 'daily', 'weekly'].map(t => (
                                            <button key={t} onClick={() => setFormData({ ...formData, scheduleType: t as any })} className={`p-4 rounded-xl border transition ${formData.scheduleType === t ? 'bg-cyan-500/10 border-cyan-500 text-cyan-400' : 'bg-white/5 border-white/10 text-gray-400'}`}>
                                                {t.charAt(0).toUpperCase() + t.slice(1)}
                                            </button>
                                        ))}
                                    </div>
                                    {formData.scheduleType !== 'now' && (
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs text-gray-400 mb-1">Date</label>
                                                <input type="date" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white" />
                                            </div>
                                            <div>
                                                <label className="block text-xs text-gray-400 mb-1">Time</label>
                                                <input type="time" value={formData.time} onChange={e => setFormData({ ...formData, time: e.target.value })} className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white" />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {currentStep === 3 && (
                                <div className="p-4 bg-white/5 border border-white/10 rounded-xl text-gray-400 text-sm">
                                    Data sources can be managed via the Data Sources menu.
                                </div>
                            )}

                            {currentStep === 4 && (
                                <div className="space-y-4">
                                    <textarea value={formData.template} onChange={e => setFormData({ ...formData, template: e.target.value })} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white font-mono text-sm h-64 focus:outline-none focus:ring-2 focus:ring-cyan-500" />
                                </div>
                            )}
                        </div>

                        <div className="flex gap-4 mt-8 pt-6 border-t border-white/10">
                            {currentStep < 4 ? (
                                <button onClick={() => setCurrentStep(currentStep + 1)} className="flex-1 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl font-bold">Next</button>
                            ) : (
                                <button onClick={handleSubmit} disabled={saving} className="flex-1 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-bold disabled:opacity-50">
                                    {saving ? 'Saving...' : 'Save Changes'}
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="glass rounded-2xl p-6">
                        <h2 className="text-xl font-bold text-white mb-4">Preview</h2>
                        <div className="h-[500px]">
                            <ChatPreview message={previewMessage} senderName={formData.name || 'Bot'} isLoading={false} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
