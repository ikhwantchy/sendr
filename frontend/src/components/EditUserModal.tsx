'use client'

import { useState, useEffect } from 'react'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { toast } from 'sonner'

interface EditUserModalProps {
    isOpen: boolean
    onClose: () => void
    user: any
}

export default function EditUserModal({ isOpen, onClose, user }: EditUserModalProps) {
    const queryClient = useQueryClient()
    const [formData, setFormData] = useState({
        name: '',
        role: 'admin',
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

    // Fetch bots
    const { data: bots } = useQuery({
        queryKey: ['bots'],
        queryFn: async () => {
            const response = await api.bots.list()
            return response.data.data || []
        },
    })

    // Fetch user permissions
    const { data: userPermissions } = useQuery({
        queryKey: ['user-permissions', user?.id],
        queryFn: async () => {
            if (!user?.id) return []
            const response = await api.permissions.getUserPermissions(user.id)
            return response.data.data || []
        },
        enabled: !!user?.id && isOpen,
    })

    // Initialize form data when user or permissions change
    useEffect(() => {
        if (user) {
            setFormData(prev => ({
                ...prev,
                name: user.name || '',
                role: user.role || 'admin',
            }))
        }

        if (userPermissions && userPermissions.length > 0) {
            const botIds = userPermissions.map((p: any) => p.bot_id)
            const firstPerm = userPermissions[0]

            setFormData(prev => ({
                ...prev,
                selectedBots: botIds,
                permissions: {
                    can_view: firstPerm.can_view ?? true,
                    can_edit: firstPerm.can_edit ?? false,
                    can_delete: firstPerm.can_delete ?? false,
                    can_create_campaigns: firstPerm.can_create_campaigns ?? true,
                    can_create_rules: firstPerm.can_create_rules ?? false,
                    can_view_analytics: firstPerm.can_view_analytics ?? true,
                },
            }))
        }
    }, [user, userPermissions])

    // Update user mutation
    const updateMutation = useMutation({
        mutationFn: async (data: any) => {
            const response = await api.users.update(user.id, data)
            return response.data
        },
        onSuccess: () => {
            toast.success('User updated successfully!')
            queryClient.invalidateQueries({ queryKey: ['users'] })
            queryClient.invalidateQueries({ queryKey: ['user-permissions'] })
            onClose()
        },
        onError: (error: any) => {
            toast.error('Failed to update user', {
                description: error.response?.data?.error || 'Please try again',
            })
        },
    })

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()

        updateMutation.mutate({
            name: formData.name,
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="glass rounded-2xl max-w-2xl w-full border border-white/10 max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 glass-strong border-b border-white/10 p-6 flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                            <span className="w-1.5 h-8 bg-gradient-to-b from-cyan-400 to-purple-600 rounded-full"></span>
                            Edit User
                        </h2>
                        <p className="text-gray-400 mt-1">Update user details and permissions</p>
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
                    {/* Name */}
                    <div>
                        <label className="block text-sm font-semibold text-white mb-2">
                            Name
                        </label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 transition-colors"
                        />
                    </div>

                    {/* Email (Read-only) */}
                    <div>
                        <label className="block text-sm font-semibold text-white mb-2">
                            Email
                        </label>
                        <input
                            type="email"
                            value={user?.email || ''}
                            disabled
                            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-gray-400 cursor-not-allowed"
                        />
                    </div>

                    {/* Role */}
                    <div>
                        <label className="block text-sm font-semibold text-white mb-2">
                            Role
                        </label>
                        <select
                            value={formData.role}
                            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500 transition-colors"
                        >
                            <option value="admin">Admin</option>
                            <option value="user">User</option>
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
                                            className="w-5 h-5 rounded border-white/20 bg-white/5"
                                        />
                                        <div className="flex-1">
                                            <div className="text-white font-medium">{bot.name}</div>
                                            <div className="text-sm text-gray-400">{bot.phone_number}</div>
                                        </div>
                                    </label>
                                ))
                            ) : (
                                <div className="text-center py-8 text-gray-400">No bots available</div>
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
                                        className="w-5 h-5 rounded border-white/20 bg-white/5"
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
                            disabled={updateMutation.isPending}
                            className="flex-1 px-6 py-3 bg-gradient-to-r from-cyan-500 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-cyan-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {updateMutation.isPending ? 'Updating...' : 'Update User'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
