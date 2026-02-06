'use client'

import { useState, useEffect } from 'react'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import { X, User, Mail, Shield, Bot, Check, Loader2, Zap, Bell, Megaphone, Sparkles } from 'lucide-react'

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

    const permissionItems = [
        { key: 'can_use_auto_reply' as const, label: 'Auto Reply', icon: Zap, color: 'yellow' },
        { key: 'can_use_reminders' as const, label: 'Reminders', icon: Bell, color: 'purple' },
        { key: 'can_use_campaigns' as const, label: 'Campaigns', icon: Megaphone, color: 'orange' },
        { key: 'can_use_ai' as const, label: 'AI Assistant', icon: Sparkles, color: 'pink' },
    ]

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-zinc-950 rounded-2xl border border-zinc-800 w-full max-w-lg overflow-hidden shadow-2xl">
                {/* Header */}
                <div className="px-6 py-5 border-b border-zinc-800/50 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-zinc-800 flex items-center justify-center text-zinc-300 font-semibold text-lg">
                            {(user?.name || 'U')[0].toUpperCase()}
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-white">Edit User</h2>
                            <p className="text-sm text-zinc-500">{user?.email}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg transition-all"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="p-6 space-y-5 max-h-[60vh] overflow-y-auto">
                        {/* Name Field */}
                        <div>
                            <label className="flex items-center gap-2 text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">
                                <User className="w-3.5 h-3.5" />
                                Full Name
                            </label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white text-sm focus:outline-none focus:border-zinc-700 transition-colors"
                                placeholder="Enter full name"
                            />
                        </div>

                        {/* Role Selection */}
                        <div>
                            <label className="flex items-center gap-2 text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">
                                <Shield className="w-3.5 h-3.5" />
                                Role
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                {[
                                    { value: 'ADMIN', label: 'Admin', desc: 'Full Access' },
                                    { value: 'USER', label: 'User', desc: 'Limited Access' }
                                ].map((role) => (
                                    <button
                                        key={role.value}
                                        type="button"
                                        onClick={() => setFormData({ ...formData, role: role.value })}
                                        className={`p-4 rounded-xl border text-left transition-all ${formData.role === role.value
                                            ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                                            : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                                            }`}
                                    >
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="font-medium text-sm">{role.label}</span>
                                            {formData.role === role.value && <Check className="w-4 h-4" />}
                                        </div>
                                        <span className="text-xs text-zinc-500">{role.desc}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Bot Assignment */}
                        <div>
                            <label className="flex items-center gap-2 text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">
                                <Bot className="w-3.5 h-3.5" />
                                Assigned Bots
                                <span className="ml-auto text-zinc-600">{formData.selectedBots.length} selected</span>
                            </label>
                            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-2 max-h-40 overflow-y-auto space-y-1">
                                {bots?.length === 0 ? (
                                    <div className="text-center py-4 text-zinc-500 text-sm">No bots available</div>
                                ) : (
                                    bots?.map((bot: any) => {
                                        const isSelected = formData.selectedBots.includes(bot.id)
                                        return (
                                            <button
                                                key={bot.id}
                                                type="button"
                                                onClick={() => toggleBot(bot.id)}
                                                className={`w-full flex items-center justify-between p-3 rounded-lg transition-all ${isSelected
                                                    ? 'bg-emerald-500/10 text-emerald-400'
                                                    : 'text-zinc-400 hover:bg-zinc-800'
                                                    }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isSelected ? 'bg-emerald-500/20' : 'bg-zinc-800'}`}>
                                                        <Bot className="w-4 h-4" />
                                                    </div>
                                                    <span className="text-sm font-medium">{bot.name}</span>
                                                </div>
                                                <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-emerald-500 border-emerald-500' : 'border-zinc-700'}`}>
                                                    {isSelected && <Check className="w-3 h-3 text-white" />}
                                                </div>
                                            </button>
                                        )
                                    })
                                )}
                            </div>
                        </div>

                        {/* Module Permissions - Only for USER role */}
                        {formData.role === 'USER' && (
                            <div>
                                <label className="flex items-center gap-2 text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">
                                    <Sparkles className="w-3.5 h-3.5" />
                                    Module Permissions
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    {permissionItems.map((perm) => {
                                        const Icon = perm.icon
                                        const isEnabled = formData.permissions[perm.key]
                                        return (
                                            <button
                                                key={perm.key}
                                                type="button"
                                                onClick={() => togglePermission(perm.key)}
                                                className={`p-3 rounded-xl border flex items-center gap-3 transition-all ${isEnabled
                                                    ? 'bg-emerald-500/10 border-emerald-500/30'
                                                    : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'
                                                    }`}
                                            >
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isEnabled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-800 text-zinc-500'}`}>
                                                    <Icon className="w-4 h-4" />
                                                </div>
                                                <span className={`text-sm font-medium ${isEnabled ? 'text-emerald-400' : 'text-zinc-400'}`}>{perm.label}</span>
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="px-6 py-4 border-t border-zinc-800/50 flex gap-3 bg-zinc-900/50">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl font-medium text-sm transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={updateMutation.isPending}
                            className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {updateMutation.isPending ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                'Save Changes'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
