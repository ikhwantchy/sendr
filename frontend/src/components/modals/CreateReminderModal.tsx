'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import RichTextEditor from '@/components/editors/RichTextEditor'
import WhatsAppPreview from '@/components/previews/WhatsAppPreview'
import ModernDateTimePicker from '@/components/pickers/ModernDateTimePicker'

interface CreateReminderModalProps {
    botId: string
    onClose: () => void
}

type ReminderCategory = 'once' | 'daily' | 'weekly' | 'monthly' | 'custom'

export default function CreateReminderModal({ botId, onClose }: CreateReminderModalProps) {
    const queryClient = useQueryClient()
    const [category, setCategory] = useState<ReminderCategory>('once')
    const [selectedDate, setSelectedDate] = useState<Date | null>(null)

    const [formData, setFormData] = useState({
        title: '',
        message: '',
        scheduled_at: '',
        is_active: true,
        repeat_interval: '',
    })

    const createMutation = useMutation({
        mutationFn: async (data: any) => {
            return await api.reminders.create({
                ...data,
                bot_id: botId,
            })
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['reminders', botId] })
            toast.success('Reminder created successfully!')
            onClose()
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.error || 'Failed to create reminder')
        },
    })

    const handleDateChange = (date: Date) => {
        setSelectedDate(date)
        setFormData({
            ...formData,
            scheduled_at: date.toISOString()
        })
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()

        if (!formData.title || !formData.message || !formData.scheduled_at) {
            toast.error('Please fill all required fields')
            return
        }

        createMutation.mutate({
            ...formData,
            category,
        })
    }

    const categories = [
        {
            id: 'once' as ReminderCategory,
            name: 'One Time',
            icon: '📅',
            description: 'Send once at specific time',
            color: 'cyan'
        },
        {
            id: 'daily' as ReminderCategory,
            name: 'Daily',
            icon: '🔄',
            description: 'Repeat every day',
            color: 'blue'
        },
        {
            id: 'weekly' as ReminderCategory,
            name: 'Weekly',
            icon: '📆',
            description: 'Repeat every week',
            color: 'purple'
        },
        {
            id: 'monthly' as ReminderCategory,
            name: 'Monthly',
            icon: '🗓️',
            description: 'Repeat every month',
            color: 'pink'
        },
    ]

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="glass rounded-2xl border border-white/10 max-w-6xl w-full max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="p-6 border-b border-white/10">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-bold text-white">Schedule Reminder</h2>
                            <p className="text-sm text-gray-400 mt-1">
                                Set up automated reminders for your contacts
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-8 h-8 rounded-lg hover:bg-white/10 transition-colors flex items-center justify-center text-gray-400 hover:text-white"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
                    <div className="grid grid-cols-2 gap-6">
                        {/* Left: Form */}
                        <div className="space-y-6">
                            {/* Title */}
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">
                                    Reminder Title <span className="text-red-400">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    placeholder="e.g., Follow-up with customer"
                                    className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 transition-colors"
                                />
                            </div>

                            {/* Category Selection */}
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">
                                    Reminder Type
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    {categories.map((cat) => (
                                        <button
                                            key={cat.id}
                                            type="button"
                                            onClick={() => setCategory(cat.id)}
                                            className={`p-4 rounded-lg border transition-all text-left ${category === cat.id
                                                ? `bg-${cat.color}-500/20 border-${cat.color}-500 text-${cat.color}-400`
                                                : 'bg-black/20 border-white/10 text-gray-400 hover:border-white/20'
                                                }`}
                                        >
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-xl">{cat.icon}</span>
                                                <span className="font-semibold text-sm">{cat.name}</span>
                                            </div>
                                            <div className="text-xs opacity-80">{cat.description}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Message Editor */}
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">
                                    Reminder Message <span className="text-red-400">*</span>
                                </label>
                                <RichTextEditor
                                    value={formData.message}
                                    onChange={(value) => setFormData({ ...formData, message: value })}
                                    placeholder="Type your reminder message..."
                                    maxLength={500}
                                />
                            </div>

                            {/* Date Time Picker */}
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">
                                    Schedule Date & Time <span className="text-red-400">*</span>
                                </label>
                                <ModernDateTimePicker
                                    value={selectedDate}
                                    onChange={handleDateChange}
                                />
                            </div>

                            {/* Repeat Interval (for recurring reminders) */}
                            {category !== 'once' && (
                                <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                                    <div className="flex items-start gap-3">
                                        <svg className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <div className="text-sm text-purple-300">
                                            <div className="font-semibold mb-1">Recurring Reminder</div>
                                            <div className="text-purple-200/80">
                                                This reminder will repeat <span className="font-semibold">{category}</span> starting from the selected date and time.
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Active Toggle */}
                            <div className="flex items-center justify-between p-4 bg-black/20 rounded-lg border border-white/10">
                                <div>
                                    <div className="font-medium text-white">Active</div>
                                    <div className="text-sm text-gray-400">Enable this reminder</div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}
                                    className={`relative w-12 h-6 rounded-full transition-colors ${formData.is_active ? 'bg-cyan-500' : 'bg-gray-600'
                                        }`}
                                >
                                    <div
                                        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${formData.is_active ? 'translate-x-6' : 'translate-x-0'
                                            }`}
                                    />
                                </button>
                            </div>
                        </div>

                        {/* Right: Preview */}
                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">
                                    Preview
                                </label>
                                <WhatsAppPreview
                                    message={formData.message}
                                    timestamp={(selectedDate || new Date()).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                />
                            </div>

                            {/* Reminder Summary */}
                            <div className="p-4 bg-cyan-500/10 border border-cyan-500/30 rounded-lg space-y-3">
                                <div className="font-semibold text-cyan-400">Reminder Summary</div>

                                <div className="space-y-2 text-sm">
                                    <div className="flex items-center gap-2">
                                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                        </svg>
                                        <span className="text-gray-400">Type:</span>
                                        <span className="text-white font-medium">
                                            {categories.find(c => c.id === category)?.name}
                                        </span>
                                    </div>

                                    {selectedDate && (
                                        <>
                                            <div className="flex items-center gap-2">
                                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                </svg>
                                                <span className="text-gray-400">Date:</span>
                                                <span className="text-white font-medium">
                                                    {selectedDate.toLocaleDateString('en-US', {
                                                        weekday: 'short',
                                                        year: 'numeric',
                                                        month: 'short',
                                                        day: 'numeric'
                                                    })}
                                                </span>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                <span className="text-gray-400">Time:</span>
                                                <span className="text-white font-medium">
                                                    {selectedDate.toLocaleTimeString('en-US', {
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                </span>
                                            </div>
                                        </>
                                    )}

                                    <div className="flex items-center gap-2">
                                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <span className="text-gray-400">Status:</span>
                                        <span className={`font-medium ${formData.is_active ? 'text-green-400' : 'text-red-400'}`}>
                                            {formData.is_active ? 'Active' : 'Inactive'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Tips */}
                            <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                                <div className="flex gap-3">
                                    <svg className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <div className="text-sm text-blue-300">
                                        <div className="font-semibold mb-1">Reminder Tips</div>
                                        <ul className="space-y-1 text-blue-200/80">
                                            <li>• Set clear and specific messages</li>
                                            <li>• Check your timezone settings</li>
                                            <li>• Test with yourself first</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </form>

                {/* Footer */}
                <div className="p-6 border-t border-white/10 flex gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 px-4 py-3 bg-white/5 border border-white/10 text-gray-300 rounded-xl hover:bg-white/10 transition-all font-semibold"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={createMutation.isPending}
                        className="flex-1 px-4 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl hover:shadow-lg hover:shadow-cyan-500/50 transition-all disabled:opacity-50 font-semibold"
                    >
                        {createMutation.isPending ? 'Creating...' : 'Schedule Reminder'}
                    </button>
                </div>
            </div>
        </div>
    )
}
