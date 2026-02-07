'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import ModalPortal from '@/components/ModalPortal'

interface InviteUserModalProps {
    isOpen: boolean
    onClose: () => void
}

export default function InviteUserModal({ isOpen, onClose }: InviteUserModalProps) {
    const queryClient = useQueryClient()
    const [formData, setFormData] = useState({
        email: '',
        role: 'USER',
        selectedBots: [] as string[],
        permissions: {
            can_view: true,
            can_edit: false,
            can_delete: false,
            can_create_campaigns: true,
            can_create_rules: false,
            can_view_analytics: true,
        },
    })

    // Fetch bots for selection
    const { data: bots } = useQuery({
        queryKey: ['bots'],
        queryFn: async () => {
            const response = await api.bots.list()
            return response.data.data || []
        },
    })

    // Invite user mutation
    const inviteMutation = useMutation({
        mutationFn: async (data: any) => {
            const response = await api.users.invite(data)
            return response.data
        },
        onSuccess: (data) => {
            toast.success('User invited successfully!', {
                description: `Invitation sent to ${formData.email}`,
            })
            queryClient.invalidateQueries({ queryKey: ['users'] })
            queryClient.invalidateQueries({ queryKey: ['user-stats'] })
            onClose()
            resetForm()
        },
        onError: (error: any) => {
            toast.error('Failed to invite user', {
                description: error.response?.data?.error || 'Please try again',
            })
        },
    })

    const resetForm = () => {
        setFormData({
            email: '',
            role: 'USER',
            selectedBots: [],
            permissions: {
                can_view: true,
                can_edit: false,
                can_delete: false,
                can_create_campaigns: true,
                can_create_rules: false,
                can_view_analytics: true,
            },
        })
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()

        if (!formData.email) {
            toast.error('Email is required')
            return
        }

        inviteMutation.mutate({
            email: formData.email,
            role: formData.role,
            bot_ids: formData.selectedBots,
            permissions: formData.permissions,
        })
    }

    const toggleBot = (botId: string) => {
        setFormData(prev => ({
            ...prev,
            selectedBots: prev.selectedBots.includes(botId)
                ? prev.selectedBots.filter(id => id !== botId)
                : [...prev.selectedBots, botId]
        }))
    }

    const togglePermission = (key: keyof typeof formData.permissions) => {
        setFormData(prev => ({
            ...prev,
            permissions: {
                ...prev.permissions,
                [key]: !prev.permissions[key]
            }
        }))
    }

    if (!isOpen) return null

    return (
        <ModalPortal isOpen={isOpen}>
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
                <div className="glass rounded-2xl max-w-2xl w-full border border-white/10 max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 glass-strong border-b border-white/10 p-6 flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                            <span className="w-1.5 h-8 bg-gradient-to-b from-cyan-400 to-purple-600 rounded-full"></span>
                            Invite User
                        </h2>
                        <p className="text-gray-400 mt-1">Send invitation to collaborate</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
                    >
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Email */}
                    <div>
                        <label className="block text-sm font-semibold text-white mb-2">
                            Email Address *
                        </label>
                        <input
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            placeholder="user@example.com"
                            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 transition-colors"
                            required
                        />
                    </div>

                    {/* Role */}
                    <div>
                        <label className="block text-sm font-semibold text-white mb-2">
                            Role *
                        </label>
                        <select
                            value={formData.role}
                            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500 transition-colors"
                        >
                            <option value="ADMIN">Admin - Can manage assigned bots</option>
                            <option value="USER">User - Limited access</option>
                        </select>
                    </div>

                    {/* Bot Selection */}
                    <div>
                        <label className="block text-sm font-semibold text-white mb-3">
                            Assign Bots ({formData.selectedBots.length} selected)
                        </label>
                        <div className="space-y-2 max-h-48 overflow-y-auto glass-strong rounded-xl p-4">
                            {bots && bots.length > 0 ? (
                                bots.map((bot: any) => (
                                    <label
                                        key={bot.id}
                                        className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 cursor-pointer transition-colors"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={formData.selectedBots.includes(bot.id)}
                                            onChange={() => toggleBot(bot.id)}
                                            className="w-5 h-5 rounded border-white/20 bg-white/5 checked:bg-cyan-500 focus:ring-2 focus:ring-cyan-500"
                                        />
                                        <div className="flex-1">
                                            <div className="text-white font-medium">{bot.name}</div>
                                            <div className="text-sm text-gray-400">{bot.phone_number}</div>
                                        </div>
                                        <div className={`px-2 py-1 rounded-full text-xs font-semibold ${bot.status === 'connected'
                                            ? 'bg-green-500/20 text-green-400'
                                            : 'bg-gray-500/20 text-gray-400'
                                            }`}>
                                            {bot.status}
                                        </div>
                                    </label>
                                ))
                            ) : (
                                <div className="text-center py-8 text-gray-400">
                                    No bots available
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Permissions */}
                    <div>
                        <label className="block text-sm font-semibold text-white mb-3">
                            Permissions
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            {Object.entries({
                                can_view: 'Can View',
                                can_edit: 'Can Edit',
                                can_delete: 'Can Delete',
                                can_create_campaigns: 'Create Campaigns',
                                can_create_rules: 'Create Rules',
                                can_view_analytics: 'View Analytics',
                            }).map(([key, label]) => (
                                <label
                                    key={key}
                                    className="flex items-center gap-3 p-3 glass-strong rounded-lg hover:bg-white/5 cursor-pointer transition-colors"
                                >
                                    <input
                                        type="checkbox"
                                        checked={formData.permissions[key as keyof typeof formData.permissions]}
                                        onChange={() => togglePermission(key as keyof typeof formData.permissions)}
                                        className="w-5 h-5 rounded border-white/20 bg-white/5 checked:bg-cyan-500 focus:ring-2 focus:ring-cyan-500"
                                    />
                                    <span className="text-white text-sm">{label}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-4 border-t border-white/10">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-6 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl font-semibold transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={inviteMutation.isPending}
                            className="flex-1 px-6 py-3 bg-gradient-to-r from-cyan-500 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-cyan-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {inviteMutation.isPending ? 'Sending...' : 'Send Invitation'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
        </ModalPortal>
    )
}
