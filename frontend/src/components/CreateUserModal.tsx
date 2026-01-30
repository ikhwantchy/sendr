'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { Copy, Check, ChevronDown, ChevronUp, Sparkles, Calendar, Megaphone, Bot, X, BarChart3 } from 'lucide-react'

interface CreateUserModalProps {
    isOpen: boolean
    onClose: () => void
}

export default function CreateUserModal({ isOpen, onClose }: CreateUserModalProps) {
    const queryClient = useQueryClient()
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        role: 'USER',
        permissions: {
            can_use_auto_reply: true,
            can_use_reminders: false,
            can_use_campaigns: false,
            can_use_ai: false,
            can_view_analytics: false
        }
    })
    const [isPermissionsExpanded, setIsPermissionsExpanded] = useState(false)
    const [createdUser, setCreatedUser] = useState<any>(null)
    const [copied, setCopied] = useState<string>('')

    const createMutation = useMutation({
        mutationFn: async (data: any) => {
            const token = localStorage.getItem('token')
            const response = await axios.post(
                `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/admin/users/create`,
                data,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }
            )
            return response.data
        },
        onSuccess: (data) => {
            setCreatedUser(data.user)
            queryClient.invalidateQueries({ queryKey: ['users'] })
            queryClient.invalidateQueries({ queryKey: ['user-stats'] })
        },
        onError: (error: any) => {
            alert(error.response?.data?.message || 'Failed to create user')
        }
    })

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        createMutation.mutate(formData)
    }

    const handleCopy = (text: string, field: string) => {
        navigator.clipboard.writeText(text)
        setCopied(field)
        setTimeout(() => setCopied(''), 2000)
    }

    const handleClose = () => {
        setFormData({
            name: '',
            email: '',
            password: '',
            role: 'USER',
            permissions: {
                can_use_auto_reply: true,
                can_use_reminders: false,
                can_use_campaigns: false,
                can_use_ai: false,
                can_view_analytics: false
            }
        })
        setIsPermissionsExpanded(false)
        setCreatedUser(null)
        onClose()
    }

    if (!isOpen) return null

    // Success screen after user created
    if (createdUser) {
        return (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 overflow-y-auto">
                <div className="min-h-full flex items-center justify-center p-4 py-8">
                    <div className="bg-[#111111] rounded-2xl border border-zinc-800 max-w-md w-full p-6 shadow-2xl">
                        <h2 className="text-xl font-bold text-white mb-2">User Created Successfully</h2>
                        <p className="text-sm text-zinc-400 mb-6 font-medium">User has been added to the system</p>

                        <div className="space-y-3 mb-6">
                            <div className="bg-[#0a0a0a] rounded-xl p-4 border border-zinc-800">
                                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Name</p>
                                <p className="text-sm text-zinc-100 font-medium">{createdUser.name}</p>
                            </div>

                            <div className="bg-[#0a0a0a] rounded-xl p-4 border border-zinc-800">
                                <div className="flex items-center justify-between">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Email</p>
                                        <p className="text-sm text-zinc-100 font-medium truncate">{createdUser.email}</p>
                                    </div>
                                    <button
                                        onClick={() => handleCopy(createdUser.email, 'email')}
                                        className="ml-3 p-2 hover:bg-zinc-800 rounded-lg transition-colors flex-shrink-0"
                                    >
                                        {copied === 'email' ? (
                                            <Check className="w-4 h-4 text-emerald-400" />
                                        ) : (
                                            <Copy className="w-4 h-4 text-zinc-500" />
                                        )}
                                    </button>
                                </div>
                            </div>

                            <div className="bg-emerald-500/5 rounded-xl p-4 border border-emerald-500/20 text-center">
                                <p className="text-sm text-emerald-400 font-bold">Account is ready! 🔥</p>
                                <p className="text-xs text-zinc-500 mt-1">Share the credentials with the user.</p>
                            </div>
                        </div>

                        <button
                            onClick={handleClose}
                            className="w-full h-[48px] bg-white text-black rounded-xl font-bold text-[15px] hover:bg-zinc-200 transition-all active:scale-[0.98]"
                        >
                            Done
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 overflow-y-auto">
            <div className="min-h-full flex items-center justify-center p-4 py-8">
                <div className="bg-[#111111] rounded-2xl border border-zinc-800 max-w-md w-full shadow-2xl">
                    {/* Header */}
                    <div className="p-6 pb-2 flex items-center justify-between">
                        <div>
                            <h2 className="text-[22px] font-bold text-white tracking-tight">Create New User</h2>
                            <p className="text-sm text-zinc-500 mt-1 font-medium">Add a new user to your workspace</p>
                        </div>
                        <button
                            onClick={handleClose}
                            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-zinc-800/50 text-zinc-500 hover:text-white transition-all"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="p-6 pt-2 space-y-5">
                    <div className="grid gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[13px] font-semibold text-zinc-400">
                                FULL NAME <span className="text-zinc-600">*</span>
                            </label>
                            <input
                                type="text"
                                required
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full h-[46px] px-4 bg-[#0a0a0a] border border-zinc-800 rounded-xl text-zinc-100 placeholder-zinc-700 focus:outline-none focus:border-zinc-700 transition-all font-medium"
                                placeholder="e.g. John Doe"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[13px] font-semibold text-zinc-400">
                                EMAIL ADDRESS <span className="text-zinc-600">*</span>
                            </label>
                            <input
                                type="email"
                                required
                                autoComplete="off"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                className="w-full h-[46px] px-4 bg-[#0a0a0a] border border-zinc-800 rounded-xl text-zinc-100 placeholder-zinc-700 focus:outline-none focus:border-zinc-700 transition-all font-medium"
                                placeholder="e.g. john@example.com"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[13px] font-semibold text-zinc-400">
                                PASSWORD <span className="text-zinc-600">*</span>
                            </label>
                            <input
                                type="password"
                                required
                                autoComplete="new-password"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                className="w-full h-[46px] px-4 bg-[#0a0a0a] border border-zinc-800 rounded-xl text-zinc-100 placeholder-zinc-700 focus:outline-none focus:border-zinc-700 transition-all font-medium"
                                placeholder="Set a secure password"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[13px] font-semibold text-zinc-400">
                                ROLE <span className="text-zinc-600">*</span>
                            </label>
                            <div className="relative group">
                                <select
                                    value={formData.role}
                                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                    className="w-full h-[46px] px-4 bg-[#0a0a0a] border border-zinc-800 rounded-xl text-zinc-100 focus:outline-none focus:border-zinc-700 transition-all font-medium appearance-none cursor-pointer"
                                >
                                    <option value="ADMIN">Admin - Full Access</option>
                                    <option value="USER">User - Limited Access</option>
                                </select>
                                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none group-focus-within:text-white transition-colors" />
                            </div>
                        </div>
                    </div>

                    {/* Permissions Section - Only shown for USER role */}
                    {formData.role === 'USER' && (
                        <div className="space-y-3 pt-2">
                            <button
                                type="button"
                                onClick={() => setIsPermissionsExpanded(!isPermissionsExpanded)}
                                className="w-full flex items-center justify-between pt-4 border-t border-zinc-800/50 group"
                            >
                                <span className="text-[13px] font-semibold text-zinc-400 group-hover:text-zinc-200 transition-colors uppercase">
                                    MODULE PERMISSIONS
                                </span>
                                {isPermissionsExpanded ? <ChevronUp className="w-4 h-4 text-zinc-500 group-hover:text-zinc-200" /> : <ChevronDown className="w-4 h-4 text-zinc-500 group-hover:text-zinc-200" />}
                            </button>

                            {isPermissionsExpanded && (
                                <div className="space-y-2.5 animate-in fade-in slide-in-from-top-2 duration-300">
                                    {[
                                        { key: 'can_use_auto_reply', label: 'Auto Reply', desc: 'Manage keywords and auto-responses', icon: Sparkles },
                                        { key: 'can_use_reminders', label: 'Reminders', desc: 'Schedule messages and reminders', icon: Calendar },
                                        { key: 'can_use_campaigns', label: 'Campaigns', desc: 'Broadcast to multiple contacts', icon: Megaphone },
                                        { key: 'can_use_ai', label: 'AI Assistant', desc: 'Enable AI-powered conversations', icon: Bot },
                                        { key: 'can_view_analytics', label: 'View Analytics', desc: 'View performance and usage stats', icon: BarChart3 },
                                    ].map((perm) => {
                                        const isChecked = formData.permissions[perm.key as keyof typeof formData.permissions];
                                        const Icon = perm.icon;
                                        return (
                                            <label
                                                key={perm.key}
                                                className={`flex items-center justify-between p-4 rounded-xl cursor-pointer transition-all border ${isChecked
                                                    ? 'bg-emerald-500/[0.03] border-emerald-500/20 shadow-[inset_0_0_20px_rgba(16,185,129,0.02)]'
                                                    : 'bg-[#0a0a0a] border-zinc-800/60 hover:border-zinc-700'
                                                    }`}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${isChecked ? 'bg-emerald-500/10 text-emerald-400' : 'bg-zinc-800/40 text-zinc-500'
                                                        }`}>
                                                        <Icon className="w-5 h-5" />
                                                    </div>
                                                    <div>
                                                        <p className={`text-[14px] font-bold tracking-tight transition-colors ${isChecked ? 'text-zinc-100' : 'text-zinc-400'}`}>
                                                            {perm.label}
                                                        </p>
                                                        <p className="text-[11px] text-zinc-600 font-medium">
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
                                                    <div className="w-[42px] h-[22px] bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-zinc-400 after:border-zinc-300 after:border after:rounded-full after:h-[18px] after:w-[18px] after:transition-all peer-checked:bg-emerald-500 peer-checked:after:bg-white shadow-lg"></div>
                                                </div>
                                            </label>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    <div className="flex gap-3 pt-6">
                        <button
                            type="button"
                            onClick={handleClose}
                            className="flex-1 h-[48px] bg-[#1a1a1a] text-zinc-400 border border-zinc-800 rounded-xl font-bold text-[15px] hover:bg-zinc-800 hover:text-white transition-all active:scale-[0.98]"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={createMutation.isPending}
                            className="flex-2 h-[48px] px-8 bg-white text-black rounded-xl font-bold text-[15px] hover:bg-zinc-200 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-white/5"
                        >
                            {createMutation.isPending ? 'Working...' : 'Create User'}
                        </button>
                    </div>
                </form>
                </div>
            </div>
        </div>
    )
}
