'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export default function RemindersPage() {
    const [showCreateModal, setShowCreateModal] = useState(false)
    const queryClient = useQueryClient()

    const { data: reminders, isLoading } = useQuery({
        queryKey: ['reminders'],
        queryFn: async () => {
            const response = await api.reminders.list()
            return response.data.data || []
        },
    })

    return (
        <div className="p-8">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Reminders</h1>
                    <p className="text-gray-600 mt-1">Schedule automated reminder messages</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-600 text-white rounded-lg font-semibold hover:from-blue-600 hover:to-cyan-700 transition-all flex items-center space-x-2"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <span>New Reminder</span>
                </button>
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                </div>
            ) : reminders && reminders.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {reminders.map((reminder: any) => (
                        <ReminderCard key={reminder.id} reminder={reminder} />
                    ))}
                </div>
            ) : (
                <div className="text-center py-12 bg-white rounded-xl border-2 border-dashed border-gray-300">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No reminders yet</h3>
                    <p className="text-gray-600 mb-4">Create your first automated reminder</p>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
                    >
                        New Reminder
                    </button>
                </div>
            )}

            {showCreateModal && (
                <CreateReminderModal
                    onClose={() => setShowCreateModal(false)}
                    onSuccess={() => {
                        setShowCreateModal(false)
                        queryClient.invalidateQueries({ queryKey: ['reminders'] })
                    }}
                />
            )}
        </div>
    )
}

function CreateReminderModal({ onClose, onSuccess }: any) {
    const [formData, setFormData] = useState({
        bot_id: '',
        name: '',
        message: '',
        recipient: '',
        schedule_type: 'once' as 'once' | 'daily' | 'weekly',
        time: '09:00',
        datetime: '',
        days: [] as number[],
    })

    const { data: bots } = useQuery({
        queryKey: ['bots'],
        queryFn: async () => {
            const response = await api.bots.list()
            return response.data.data || []
        },
    })

    const createMutation = useMutation({
        mutationFn: async (data: any) => {
            let schedule_config: any = {}

            if (data.schedule_type === 'once') {
                schedule_config = { datetime: data.datetime }
            } else if (data.schedule_type === 'daily') {
                schedule_config = { time: data.time }
            } else if (data.schedule_type === 'weekly') {
                schedule_config = { time: data.time, days: data.days }
            }

            const payload = {
                bot_id: data.bot_id,
                name: data.name,
                message: data.message,
                recipient: data.recipient,
                schedule_type: data.schedule_type,
                schedule_config,
            }

            return await api.reminders.create(payload)
        },
        onSuccess,
    })

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        createMutation.mutate(formData)
    }

    const toggleDay = (day: number) => {
        setFormData({
            ...formData,
            days: formData.days.includes(day)
                ? formData.days.filter(d => d !== day)
                : [...formData.days, day]
        })
    }

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Create Reminder</h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Bot Selection */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Select Bot
                        </label>
                        <select
                            required
                            value={formData.bot_id}
                            onChange={(e) => setFormData({ ...formData, bot_id: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="">Choose a bot...</option>
                            {bots?.map((bot: any) => (
                                <option key={bot.id} value={bot.id}>
                                    {bot.name} ({bot.phone_number || 'Not connected'})
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Reminder Name */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Reminder Name
                        </label>
                        <input
                            type="text"
                            required
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="e.g., Daily Good Morning"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>

                    {/* Message */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Message
                        </label>
                        <textarea
                            required
                            value={formData.message}
                            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                            placeholder="Enter reminder message..."
                            rows={3}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>

                    {/* Recipient */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Recipient Phone Number
                        </label>
                        <input
                            type="text"
                            required
                            value={formData.recipient}
                            onChange={(e) => setFormData({ ...formData, recipient: e.target.value })}
                            placeholder="6281234567890"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>

                    {/* Schedule Type */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Schedule Type
                        </label>
                        <div className="flex space-x-4">
                            <label className="flex items-center">
                                <input
                                    type="radio"
                                    value="once"
                                    checked={formData.schedule_type === 'once'}
                                    onChange={(e) => setFormData({ ...formData, schedule_type: e.target.value as any })}
                                    className="mr-2"
                                />
                                One Time
                            </label>
                            <label className="flex items-center">
                                <input
                                    type="radio"
                                    value="daily"
                                    checked={formData.schedule_type === 'daily'}
                                    onChange={(e) => setFormData({ ...formData, schedule_type: e.target.value as any })}
                                    className="mr-2"
                                />
                                Daily
                            </label>
                            <label className="flex items-center">
                                <input
                                    type="radio"
                                    value="weekly"
                                    checked={formData.schedule_type === 'weekly'}
                                    onChange={(e) => setFormData({ ...formData, schedule_type: e.target.value as any })}
                                    className="mr-2"
                                />
                                Weekly
                            </label>
                        </div>
                    </div>

                    {/* One-time datetime */}
                    {formData.schedule_type === 'once' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Date & Time
                            </label>
                            <input
                                type="datetime-local"
                                required
                                value={formData.datetime}
                                onChange={(e) => setFormData({ ...formData, datetime: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                    )}

                    {/* Daily/Weekly time */}
                    {(formData.schedule_type === 'daily' || formData.schedule_type === 'weekly') && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Time
                            </label>
                            <input
                                type="time"
                                required
                                value={formData.time}
                                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                    )}

                    {/* Weekly days */}
                    {formData.schedule_type === 'weekly' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Days of Week
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {dayNames.map((day, index) => (
                                    <button
                                        key={index}
                                        type="button"
                                        onClick={() => toggleDay(index)}
                                        className={`px-4 py-2 rounded-lg font-medium transition ${formData.days.includes(index)
                                                ? 'bg-blue-500 text-white'
                                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                            }`}
                                    >
                                        {day}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Buttons */}
                    <div className="flex space-x-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={createMutation.isPending}
                            className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-cyan-600 text-white rounded-lg hover:from-blue-600 hover:to-cyan-700 transition disabled:opacity-50"
                        >
                            {createMutation.isPending ? 'Creating...' : 'Create Reminder'}
                        </button>
                    </div>

                    {createMutation.isError && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                            Failed to create reminder. Please try again.
                        </div>
                    )}
                </form>
            </div>
        </div>
    )
}

function ReminderCard({ reminder }: any) {
    const getTypeColor = (type: string) => {
        switch (type) {
            case 'once': return 'bg-purple-100 text-purple-800'
            case 'daily': return 'bg-blue-100 text-blue-800'
            case 'weekly': return 'bg-green-100 text-green-800'
            default: return 'bg-gray-100 text-gray-800'
        }
    }

    return (
        <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition">
            <div className="flex items-start justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">{reminder.name}</h3>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getTypeColor(reminder.schedule_type)}`}>
                    {reminder.schedule_type}
                </span>
            </div>

            <p className="text-sm text-gray-600 mb-4 line-clamp-2">{reminder.message}</p>

            <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                    <span className="text-gray-600">Recipient:</span>
                    <span className="font-medium text-gray-900">{reminder.recipient}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-gray-600">Next Run:</span>
                    <span className="font-medium text-gray-900">
                        {new Date(reminder.next_run_at).toLocaleString()}
                    </span>
                </div>
                <div className="flex justify-between">
                    <span className="text-gray-600">Status:</span>
                    <span className={`font-medium ${reminder.is_active ? 'text-green-600' : 'text-gray-400'}`}>
                        {reminder.is_active ? 'Active' : 'Inactive'}
                    </span>
                </div>
            </div>
        </div>
    )
}
