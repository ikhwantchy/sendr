'use client'

import { useState, useEffect } from 'react'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import { ChevronDown, ChevronUp, Sparkles, Calendar, Megaphone, Bot } from 'lucide-react'

interface EditUserModalProps {
    isOpen: boolean
    onClose: () => void
    user: any
}

export default function EditUserModal({ isOpen, onClose, user }: EditUserModalProps) {
    const queryClient = useQueryClient()
    const [formData, setFormData] = useState({
        name: '',
        role: 'USER',
        selectedBots: [] as string[],
        permissions: {
            can_use_auto_reply: true,
            can_use_reminders: false,
            can_use_campaigns: false,
            can_use_ai: false
        }
    })
    const [isPermissionsExpanded, setIsPermissionsExpanded] = useState(false)

    // Fetch bots
    const { data: bots } = useQuery({
        queryKey: ['bots'],
        queryFn: async () => {
            const response = await api.bots.list()
            return response.data.data || []
        },
        enabled: isOpen,
    })

    // Fetch user permissions (for bot assignments)
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
        if (user && isOpen) {
            const userPerms = typeof user.permissions === 'string'
                ? JSON.parse(user.permissions || '{}')
                : (user.permissions || {});

            setFormData(prev => ({
                ...prev,
                name: user.name || '',
                role: user.role || 'USER',
                permissions: {
                    can_use_auto_reply: userPerms.can_use_auto_reply ?? true,
                    can_use_reminders: userPerms.can_use_reminders ?? false,
                    can_use_campaigns: userPerms.can_use_campaigns ?? false,
                    can_use_ai: userPerms.can_use_ai ?? false
                }
            }))
        }

        if (userPermissions && userPermissions.length > 0) {
            const botIds = userPermissions.map((p: any) => p.bot_id)
            setFormData(prev => ({
                ...prev,
                selectedBots: botIds
            }))
        }
    }, [user, userPermissions, isOpen])

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

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-[#1a1a1a] rounded-lg border border-zinc-800 max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-xl font-semibold text-zinc-100 mb-1">Edit User</h2>
                        <p className="text-sm text-zinc-500">Update user details and access</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-500 hover:text-zinc-100 transition-colors"
                    >
                        <ChevronUp className="w-4 h-4 rotate-45" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Name */}
                    <div>
                        <label className="block text-sm text-zinc-400 mb-2 font-medium">FULL NAME</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 focus:outline-none focus:border-zinc-700 transition-colors"
                        />
                    </div>

                    {/* Email (Read-only) */}
                    <div>
                        <label className="block text-sm text-zinc-400 mb-2 font-medium">EMAIL ADDRESS</label>
                        <input
                            type="email"
                            value={user?.email || ''}
                            disabled
                            className="w-full px-4 py-2.5 bg-zinc-900/50 border border-zinc-800/50 rounded-lg text-zinc-500 cursor-not-allowed opacity-60"
                        />
                    </div>

                    {/* Role */}
                    <div>
                        <label className="block text-sm text-zinc-400 mb-2 font-medium">ROLE</label>
                        <select
                            value={formData.role}
                            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                            className="w-full px-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 focus:outline-none focus:border-zinc-700 transition-colors"
                        >
                            <option value="ADMIN">Admin - Full Access</option>
                            <option value="USER">User - Limited Access</option>
                        </select>
                    </div>

                    {/* Bot Selection - Hidden for Admin roles in this simplified view if needed, but keeping for now */}
                    <div className="space-y-2">
                        <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest">
                            ASSIGNED BOTS ({formData.selectedBots.length})
                        </label>
                        <div className="space-y-1 max-h-32 overflow-y-auto bg-zinc-900/30 border border-zinc-800 rounded-xl p-2">
                            {bots?.map((bot: any) => (
                                <label
                                    key={bot.id}
                                    className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${formData.selectedBots.includes(bot.id) ? 'bg-zinc-800/50 text-zinc-100' : 'text-zinc-500 hover:text-zinc-400'}`}
                                >
                                    <input
                                        type="checkbox"
                                        checked={formData.selectedBots.includes(bot.id)}
                                        onChange={() => toggleBot(bot.id)}
                                        className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-emerald-500 focus:ring-emerald-500/20"
                                    />
                                    <span className="text-sm truncate">{bot.name}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Global Module Permissions */}
                    {formData.role === 'USER' && (
                        <div className="space-y-2">
                            <button
                                type="button"
                                onClick={() => setIsPermissionsExpanded(!isPermissionsExpanded)}
                                className="w-full flex items-center justify-between p-3 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-200 transition-colors"
                            >
                                <span className="text-xs font-bold uppercase tracking-widest">
                                    MODULE PERMISSIONS
                                </span>
                                {isPermissionsExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>

                            {isPermissionsExpanded && (
                                <div className="space-y-2">
                                    {[
                                        { key: 'can_use_auto_reply', label: 'Auto Reply', desc: 'Manage keywords and auto-responses', icon: Sparkles },
                                        { key: 'can_use_reminders', label: 'Reminders', desc: 'Schedule messages and reminders', icon: Calendar },
                                        { key: 'can_use_campaigns', label: 'Campaigns', desc: 'Broadcast to multiple contacts', icon: Megaphone },
                                        { key: 'can_use_ai', label: 'AI Assistant', desc: 'Enable AI-powered conversations', icon: Bot },
                                    ].map((perm) => {
                                        const isChecked = formData.permissions[perm.key as keyof typeof formData.permissions];
                                        const Icon = perm.icon;
                                        return (
                                            <label
                                                key={perm.key}
                                                className={`flex items-center justify-between p-4 rounded-xl cursor-pointer transition-all border ${isChecked
                                                    ? 'bg-emerald-500/5 border-emerald-500/20 shadow-[0_0_15px_-5px_rgba(16,185,129,0.1)]'
                                                    : 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-700'
                                                    }`}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${isChecked ? 'bg-emerald-500/10 text-emerald-400' : 'bg-zinc-800 text-zinc-500'
                                                        }`}>
                                                        <Icon className="w-5 h-5" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className={`text-sm font-medium transition-colors ${isChecked ? 'text-zinc-100' : 'text-zinc-400'}`}>
                                                            {perm.label}
                                                        </p>
                                                        <p className="text-xs text-zinc-500 mt-0.5 truncate">
                                                            {perm.desc}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="relative inline-flex items-center cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={isChecked}
                                                        onChange={() => setFormData({
                                                            ...formData,
                                                            permissions: {
                                                                ...formData.permissions,
                                                                [perm.key]: !isChecked
                                                            }
                                                        })}
                                                        className="sr-only peer"
                                                    />
                                                    <div className="w-10 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-zinc-400 after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500 peer-checked:after:bg-white"></div>
                                                </div>
                                            </label>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3 pt-4 border-t border-zinc-800">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2.5 bg-transparent border border-zinc-800 text-zinc-400 rounded-lg font-medium hover:bg-zinc-900 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={updateMutation.isPending}
                            className="flex-1 px-4 py-2.5 bg-white text-black rounded-lg font-medium hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
