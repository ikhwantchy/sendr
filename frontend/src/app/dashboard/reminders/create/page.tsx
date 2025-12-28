'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import ChatPreview from '@/components/ChatPreview'

interface FormData {
    // Step 1: Basic Info
    name: string
    description: string
    botId: string
    targetType: 'group' | 'contact'
    targetId: string

    // Step 2: Schedule
    scheduleType: 'now' | 'once' | 'daily' | 'weekly' | 'monthly' | 'custom'
    date: string
    time: string
    timezone: string
    cronExpression: string

    // Step 3: Data Source
    dataSourceType: 'google_sheets' | 'none'
    googleSheetsUrl: string
    dataSourceId: string
    dataSourceName: string
    selectedSheets: string[]

    // Step 4: Message Template
    template: string
    imageUrl: string
    imageFile: File | null
}

export default function CreateReminderPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const botIdFromUrl = searchParams.get('botId')

    const [currentStep, setCurrentStep] = useState(1)
    const [formData, setFormData] = useState<FormData>({
        name: '',
        description: '',
        botId: botIdFromUrl || '',
        targetType: 'group',
        targetId: '',
        scheduleType: 'daily',
        date: '',
        time: '08:00',
        timezone: 'Asia/Jakarta',
        cronExpression: '0 8 * * *',
        dataSourceType: 'none',
        googleSheetsUrl: '',
        dataSourceId: '',
        dataSourceName: '',
        selectedSheets: [],
        template: '',
        imageUrl: '',
        imageFile: null
    })

    // Fetch bots and groups
    const [bots, setBots] = useState<any[]>([])
    const [groups, setGroups] = useState<any[]>([])
    const [selectedGroups, setSelectedGroups] = useState<string[]>([])
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        fetchBots()
    }, [])

    useEffect(() => {
        // Auto-set botId from URL
        if (botIdFromUrl && bots.length > 0) {
            setFormData(prev => ({ ...prev, botId: botIdFromUrl }))
        }
    }, [botIdFromUrl, bots])

    useEffect(() => {
        if (formData.botId) {
            fetchGroups(formData.botId)
        }
    }, [formData.botId])

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
            setLoading(true)
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
        } finally {
            setLoading(false)
        }
    }

    const toggleGroupSelection = (groupJid: string) => {
        setSelectedGroups(prev => {
            if (prev.includes(groupJid)) {
                return prev.filter(jid => jid !== groupJid)
            } else {
                return [...prev, groupJid]
            }
        })
    }

    // Generate preview message
    const [previewMessage, setPreviewMessage] = useState('')

    useEffect(() => {
        generatePreview()
    }, [formData.template])

    const generatePreview = () => {
        if (!formData.template) {
            setPreviewMessage('')
            return
        }

        // Mock data for preview
        const mockData = {
            TODAY_DATE: new Date().toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' }),
            TODAY_NAME: ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'][new Date().getDay()],
            SCHEDULE_TODAY: `1. Technopreneurship\n   18:20-20:00\n   Muhammad Nur Fitrianto\n\n2. Metodologi Riset\n   20:00-21:00\n   Samso Supriyatna`,
            TASKS_URGENT: `1. MPPL — Presentasi\n   Rabu, 12/10/2025\n   Kelompok 4\n\n2. Technopreneurship — Presentasi\n   Rabu, 12/10/2025\n   Kelompok 10 - Materi 10`
        }

        let preview = formData.template
        Object.entries(mockData).forEach(([key, value]) => {
            preview = preview.replace(new RegExp(`{${key}}`, 'g'), value)
        })

        setPreviewMessage(preview)
    }

    const steps = [
        { number: 1, title: 'Basic Info', icon: '📝' },
        { number: 2, title: 'Schedule', icon: '⏰' },
        { number: 3, title: 'Data Source', icon: '📊' },
        { number: 4, title: 'Message Template', icon: '💬' }
    ]

    const nextStep = () => {
        if (currentStep < 4) setCurrentStep(currentStep + 1)
    }

    const prevStep = () => {
        if (currentStep > 1) setCurrentStep(currentStep - 1)
    }

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            setFormData({ ...formData, imageFile: file, imageUrl: URL.createObjectURL(file) })
        }
    }

    const handleSubmit = () => {
        console.log('Creating reminder:', formData)
        // TODO: API call
        router.push('/dashboard/reminders')
    }

    // Get today's date in YYYY-MM-DD format for min date
    const today = new Date().toISOString().split('T')[0]

    return (
        <div className="min-h-screen p-6">
            <div className="max-w-[1800px] mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <button
                        onClick={() => router.push('/dashboard/reminders')}
                        className="flex items-center gap-2 text-gray-400 hover:text-white transition mb-4"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Back to Reminders
                    </button>
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-white mb-2">Create New Reminder</h1>
                            <p className="text-gray-400">Set up automated messages with data from your spreadsheets</p>
                        </div>
                        {botIdFromUrl && (
                            <div className="glass rounded-xl px-4 py-3 border border-cyan-500/30 bg-cyan-500/10">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-400">Using Bot</p>
                                        <p className="text-sm font-semibold text-white">{bots.find(b => b.id === botIdFromUrl)?.phone_number || 'Loading...'}</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Step Indicator */}
                <div className="glass rounded-2xl border border-white/10 p-6 mb-6">
                    <div className="flex items-center justify-between">
                        {steps.map((step, index) => (
                            <div key={step.number} className="flex items-center flex-1">
                                <div className="flex items-center gap-3">
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl transition-all duration-300 ${currentStep === step.number
                                        ? 'bg-gradient-to-r from-cyan-500 to-blue-600 scale-110 shadow-lg shadow-cyan-500/50'
                                        : currentStep > step.number
                                            ? 'bg-green-500/20 border-2 border-green-500'
                                            : 'bg-white/5 border-2 border-white/10'
                                        }`}>
                                        {currentStep > step.number ? '✓' : step.icon}
                                    </div>
                                    <div>
                                        <p className={`font-semibold ${currentStep >= step.number ? 'text-white' : 'text-gray-500'}`}>
                                            {step.title}
                                        </p>
                                        <p className="text-xs text-gray-500">Step {step.number}</p>
                                    </div>
                                </div>
                                {index < steps.length - 1 && (
                                    <div className={`flex-1 h-1 mx-4 rounded-full transition-all duration-300 ${currentStep > step.number ? 'bg-green-500' : 'bg-white/10'
                                        }`}></div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Main Content - Split View */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Left: Form */}
                    <div className="glass rounded-2xl border border-white/10 p-6">
                        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                            <span className="text-3xl">{steps[currentStep - 1].icon}</span>
                            {steps[currentStep - 1].title}
                        </h2>

                        {/* Step 1: Basic Info */}
                        {currentStep === 1 && (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Reminder Name *
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="e.g., Daily Digest Kuliah"
                                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Description
                                    </label>
                                    <textarea
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        placeholder="Brief description of this reminder..."
                                        rows={3}
                                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition resize-none"
                                    />
                                </div>



                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Target Type *
                                    </label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, targetType: 'group' })}
                                            className={`px-4 py-3 rounded-xl font-semibold transition-all duration-300 ${formData.targetType === 'group'
                                                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/30'
                                                : 'bg-white/5 text-gray-400 hover:bg-white/10'
                                                }`}
                                        >
                                            <svg className="w-5 h-5 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                            </svg>
                                            Group
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, targetType: 'contact' })}
                                            className={`px-4 py-3 rounded-xl font-semibold transition-all duration-300 ${formData.targetType === 'contact'
                                                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/30'
                                                : 'bg-white/5 text-gray-400 hover:bg-white/10'
                                                }`}
                                        >
                                            <svg className="w-5 h-5 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                            </svg>
                                            Contact
                                        </button>
                                    </div>
                                </div>

                                {formData.targetType === 'group' && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-2">
                                            Select Groups * ({selectedGroups.length} selected)
                                        </label>
                                        {loading ? (
                                            <div className="text-center py-4 text-gray-400">Loading groups...</div>
                                        ) : groups.length === 0 ? (
                                            <div className="text-center py-4 text-gray-400">
                                                No groups found. Make sure the bot is connected.
                                            </div>
                                        ) : (
                                            <div className="max-h-60 overflow-y-auto space-y-2 p-4 bg-white/5 border border-white/10 rounded-xl">
                                                {groups.map(group => (
                                                    <label
                                                        key={group.jid}
                                                        className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 cursor-pointer transition"
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedGroups.includes(group.jid)}
                                                            onChange={() => toggleGroupSelection(group.jid)}
                                                            className="w-5 h-5 rounded border-white/20 bg-white/5 text-cyan-500 focus:ring-2 focus:ring-cyan-500"
                                                        />
                                                        <div className="flex-1">
                                                            <p className="text-white font-medium">{group.name}</p>
                                                            <p className="text-xs text-gray-400">{group.jid}</p>
                                                        </div>
                                                    </label>
                                                ))}
                                            </div>
                                        )}
                                        {selectedGroups.length === 0 && (
                                            <p className="text-xs text-red-400 mt-1">Please select at least one group</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Step 2: Schedule */}
                        {currentStep === 2 && (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-3">
                                        When to send? *
                                    </label>
                                    <div className="grid grid-cols-2 gap-3 mb-4">
                                        {[
                                            { value: 'now', label: 'Send Now', icon: '⚡' },
                                            { value: 'once', label: 'One Time', icon: '📅' },
                                            { value: 'daily', label: 'Daily', icon: '🔄' },
                                            { value: 'weekly', label: 'Weekly', icon: '📆' }
                                        ].map(option => (
                                            <button
                                                key={option.value}
                                                type="button"
                                                onClick={() => setFormData({ ...formData, scheduleType: option.value as any })}
                                                className={`px-4 py-3 rounded-xl font-semibold transition-all duration-300 ${formData.scheduleType === option.value
                                                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/30'
                                                    : 'bg-white/5 text-gray-400 hover:bg-white/10'
                                                    }`}
                                            >
                                                <span className="text-2xl block mb-1">{option.icon}</span>
                                                {option.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {formData.scheduleType !== 'now' && (
                                    <>
                                        {(formData.scheduleType === 'once' || formData.scheduleType === 'daily' || formData.scheduleType === 'weekly') && (
                                            <div>
                                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                                    Select Date *
                                                </label>
                                                <input
                                                    type="date"
                                                    value={formData.date}
                                                    min={today}
                                                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition"
                                                />
                                                {formData.scheduleType !== 'once' && (
                                                    <p className="text-xs text-gray-400 mt-1">
                                                        Reminder will start from this date
                                                    </p>
                                                )}
                                            </div>
                                        )}

                                        <div>
                                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                                Time *
                                            </label>
                                            <input
                                                type="time"
                                                value={formData.time}
                                                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                                                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                                Timezone
                                            </label>
                                            <select
                                                value={formData.timezone}
                                                onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                                                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition"
                                            >
                                                <option value="Asia/Jakarta" className="bg-[#1a1f2e]">WIB (Asia/Jakarta)</option>
                                                <option value="Asia/Makassar" className="bg-[#1a1f2e]">WITA (Asia/Makassar)</option>
                                                <option value="Asia/Jayapura" className="bg-[#1a1f2e]">WIT (Asia/Jayapura)</option>
                                            </select>
                                        </div>

                                        <div className="glass-strong rounded-xl p-4 border border-cyan-500/20">
                                            <p className="text-sm text-gray-300">
                                                <span className="font-semibold text-cyan-400">Preview:</span> {' '}
                                                {formData.scheduleType === 'now' && 'Send immediately after creation'}
                                                {formData.scheduleType === 'once' && formData.date && `Send once on ${new Date(formData.date).toLocaleDateString('id-ID')} at ${formData.time}`}
                                                {formData.scheduleType === 'daily' && formData.date && `Every day at ${formData.time} ${formData.timezone.split('/')[1]}, starting from ${new Date(formData.date).toLocaleDateString('id-ID')}`}
                                                {formData.scheduleType === 'daily' && !formData.date && `Every day at ${formData.time} ${formData.timezone.split('/')[1]}`}
                                                {formData.scheduleType === 'weekly' && formData.date && `Every week at ${formData.time} ${formData.timezone.split('/')[1]}, starting from ${new Date(formData.date).toLocaleDateString('id-ID')}`}
                                                {formData.scheduleType === 'weekly' && !formData.date && `Every week at ${formData.time} ${formData.timezone.split('/')[1]}`}
                                            </p>
                                        </div>
                                    </>
                                )}

                                {formData.scheduleType === 'now' && (
                                    <div className="glass-strong rounded-xl p-4 border border-yellow-500/20 bg-yellow-500/5">
                                        <div className="flex items-start gap-3">
                                            <span className="text-2xl">⚡</span>
                                            <div>
                                                <p className="text-sm font-semibold text-yellow-400 mb-1">Send Immediately</p>
                                                <p className="text-xs text-gray-400">
                                                    This message will be sent right after you create the reminder. Make sure your message template is ready!
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Step 3: Data Source */}
                        {currentStep === 3 && (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Data Source Type
                                    </label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, dataSourceType: 'none' })}
                                            className={`px-4 py-3 rounded-xl font-semibold transition-all duration-300 ${formData.dataSourceType === 'none'
                                                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/30'
                                                : 'bg-white/5 text-gray-400 hover:bg-white/10'
                                                }`}
                                        >
                                            <span className="text-2xl block mb-1">📝</span>
                                            Static Message
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, dataSourceType: 'google_sheets' })}
                                            className={`px-4 py-3 rounded-xl font-semibold transition-all duration-300 ${formData.dataSourceType === 'google_sheets'
                                                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/30'
                                                : 'bg-white/5 text-gray-400 hover:bg-white/10'
                                                }`}
                                        >
                                            <span className="text-2xl block mb-1">📊</span>
                                            Google Sheets
                                        </button>
                                    </div>
                                </div>

                                {formData.dataSourceType === 'google_sheets' && (
                                    <>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                                Google Sheets URL *
                                            </label>
                                            <input
                                                type="url"
                                                value={formData.googleSheetsUrl}
                                                onChange={(e) => setFormData({ ...formData, googleSheetsUrl: e.target.value })}
                                                placeholder="https://docs.google.com/spreadsheets/d/..."
                                                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition"
                                            />
                                            <p className="text-xs text-gray-400 mt-1">
                                                Make sure the spreadsheet is shared with "Anyone with the link can view"
                                            </p>
                                        </div>

                                        <div className="glass-strong rounded-xl p-4 border border-blue-500/20">
                                            <p className="text-sm font-semibold text-blue-400 mb-2">💡 How to get the URL:</p>
                                            <ol className="text-xs text-gray-400 space-y-1 list-decimal list-inside">
                                                <li>Open your Google Sheets</li>
                                                <li>Click "Share" button</li>
                                                <li>Set to "Anyone with the link can view"</li>
                                                <li>Copy the link and paste it here</li>
                                            </ol>
                                        </div>
                                    </>
                                )}

                                {formData.dataSourceType === 'none' && (
                                    <div className="glass-strong rounded-xl p-4 border border-gray-500/20">
                                        <p className="text-sm text-gray-400">
                                            You'll send a static message without dynamic data. Perfect for simple reminders!
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Step 4: Message Template */}
                        {currentStep === 4 && (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Message Template *
                                    </label>
                                    <textarea
                                        value={formData.template}
                                        onChange={(e) => setFormData({ ...formData, template: e.target.value })}
                                        placeholder="Enter your message template..."
                                        rows={10}
                                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition resize-none font-mono text-sm"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Attach Image (Optional)
                                    </label>
                                    <div className="flex items-center gap-3">
                                        <label className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-gray-400 hover:bg-white/10 transition cursor-pointer flex items-center justify-center gap-2">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                            {formData.imageFile ? formData.imageFile.name : 'Choose Image'}
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={handleImageUpload}
                                                className="hidden"
                                            />
                                        </label>
                                        {formData.imageFile && (
                                            <button
                                                type="button"
                                                onClick={() => setFormData({ ...formData, imageFile: null, imageUrl: '' })}
                                                className="px-4 py-3 bg-red-500/20 text-red-400 rounded-xl hover:bg-red-500/30 transition"
                                            >
                                                Remove
                                            </button>
                                        )}
                                    </div>
                                    {formData.imageUrl && (
                                        <div className="mt-3">
                                            <img src={formData.imageUrl} alt="Preview" className="w-full h-40 object-cover rounded-xl" />
                                        </div>
                                    )}
                                </div>

                                {formData.dataSourceType === 'google_sheets' && (
                                    <div className="glass-strong rounded-xl p-4 border border-purple-500/20">
                                        <p className="text-sm font-semibold text-purple-400 mb-2">💡 Available Variables:</p>
                                        <div className="grid grid-cols-2 gap-2 text-xs">
                                            <code className="text-cyan-400">{'{TODAY_DATE}'}</code>
                                            <code className="text-cyan-400">{'{TODAY_NAME}'}</code>
                                            <code className="text-cyan-400">{'{SCHEDULE_TODAY}'}</code>
                                            <code className="text-cyan-400">{'{TASKS_URGENT}'}</code>
                                        </div>
                                    </div>
                                )}

                                <button
                                    type="button"
                                    onClick={() => {
                                        setFormData({
                                            ...formData,
                                            template: `📰 DAILY DIGEST ({TODAY_DATE})

📅 Jadwal Hari Ini ({TODAY_NAME}):
{SCHEDULE_TODAY}

📝 Deadline ≤ 3 Hari
{TASKS_URGENT}`
                                        })
                                    }}
                                    className="w-full px-4 py-2 bg-purple-500/20 text-purple-400 rounded-xl font-semibold hover:bg-purple-500/30 transition border border-purple-500/30"
                                >
                                    Use Daily Digest Template
                                </button>
                            </div>
                        )}

                        {/* Navigation Buttons */}
                        <div className="flex items-center gap-3 mt-8 pt-6 border-t border-white/10">
                            {currentStep > 1 && (
                                <button
                                    onClick={prevStep}
                                    className="flex-1 px-6 py-3 bg-white/5 text-white rounded-xl font-semibold hover:bg-white/10 transition"
                                >
                                    ← Previous
                                </button>
                            )}
                            {currentStep < 4 ? (
                                <button
                                    onClick={nextStep}
                                    className="flex-1 px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl font-semibold hover:from-cyan-600 hover:to-blue-700 transition shadow-lg shadow-cyan-500/30"
                                >
                                    Next →
                                </button>
                            ) : (
                                <button
                                    onClick={handleSubmit}
                                    className="flex-1 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-semibold hover:from-green-600 hover:to-emerald-700 transition shadow-lg shadow-green-500/30"
                                >
                                    ✓ Create Reminder
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Right: Live Preview */}
                    <div className="glass rounded-2xl border border-white/10 p-6">
                        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                            <span className="text-2xl">👁️</span>
                            Live Preview
                        </h2>
                        <div className="h-[600px]">
                            <ChatPreview
                                message={previewMessage}
                                senderName={formData.name || 'WhatsApp Bot'}
                                isLoading={false}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
