'use client'

import { useState, useEffect, useRef } from 'react'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import { X, Shield, Bot, Check, Loader2, ChevronDown, User, Eye } from 'lucide-react'
import ModalPortal from '@/components/ModalPortal'

interface EditUserModalProps {
    isOpen: boolean
    onClose: () => void
    user: any
}

const ROLE_OPTIONS = [
    { value: 'ADMIN', label: 'Admin', icon: Shield },
    { value: 'USER', label: 'User', icon: User },
]

export default function EditUserModal({ isOpen, onClose, user }: EditUserModalProps) {
    const queryClient = useQueryClient()
    const [showBotDropdown, setShowBotDropdown] = useState(false)
    const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)
    const roleDropdownRef = useRef<HTMLDivElement>(null)
    const [formData, setFormData] = useState({
        name: '',
        role: 'USER',
        password: '',
        currentPasswordPlain: '',
        selectedBots: [] as string[],
    })

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowBotDropdown(false)
            }
            if (roleDropdownRef.current && !roleDropdownRef.current.contains(event.target as Node)) {
                setIsRoleDropdownOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

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
            setFormData(prev => ({
                ...prev,
                name: user.name || '',
                role: user.role || 'USER',
                currentPasswordPlain: user.password_plain || '',
                password: '', // Reset password field on modal open
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
            password: formData.password || undefined,
            bot_ids: formData.selectedBots,
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

    const selectedBotNames = bots?.filter((b: any) => formData.selectedBots.includes(b.id)).map((b: any) => b.name) || []

    return (
        <ModalPortal isOpen={isOpen}>
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
                <div className="bg-[#111111] rounded-2xl border border-zinc-800 max-w-md w-full shadow-2xl max-h-[90vh] overflow-y-auto">
                    {/* Header */}
                    <div className="p-6 pb-2 flex items-center justify-between">
                        <div>
                            <h2 className="text-[22px] font-bold text-white tracking-tight">Edit User</h2>
                            <p className="text-sm text-zinc-500 mt-1 font-medium">{user?.email}</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-zinc-800/50 text-zinc-500 hover:text-white transition-all"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="p-6 pt-2 space-y-5">
                        <div className="grid gap-4">
                            {/* Name Field */}
                            <div className="space-y-1.5">
                                <label className="text-[13px] font-semibold text-zinc-400">
                                    FULL NAME
                                </label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full h-[46px] px-4 bg-[#0a0a0a] border border-zinc-800 rounded-xl text-zinc-100 placeholder-zinc-700 focus:outline-none focus:border-zinc-700 transition-all font-medium"
                                    placeholder="Enter full name"
                                />
                            </div>
                            {/* Password Field - New */}
                            <div className="space-y-1.5">
                                <label className="text-[13px] font-semibold text-zinc-400">
                                    NEW PASSWORD (OPTIONAL)
                                </label>
                                <input
                                    type="password"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    className="w-full h-[46px] px-4 bg-[#0a0a0a] border border-zinc-800 rounded-xl text-zinc-100 placeholder-zinc-700 focus:outline-none focus:border-zinc-700 transition-all font-medium"
                                    placeholder="Leave blank to keep current"
                                    autoComplete="new-password"
                                />
                                <p className="text-[10px] text-zinc-500 font-medium">Reset user password by entering a new one here.</p>
                            </div>
                            {/* Role Selection - Same as CreateUserModal */}
                            <div className="space-y-1.5">
                                <label className="text-[13px] font-semibold text-zinc-400">
                                    ROLE
                                </label>
                                <div className="relative" ref={roleDropdownRef}>
                                    <button
                                        type="button"
                                        onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
                                        className="w-full h-[46px] px-4 bg-[#0a0a0a] border border-zinc-800 rounded-xl text-zinc-100 focus:outline-none focus:border-zinc-700 transition-all font-medium flex items-center justify-between cursor-pointer hover:border-zinc-700"
                                    >
                                        <div className="flex items-center gap-3">
                                            {(() => {
                                                const selected = ROLE_OPTIONS.find(r => r.value === formData.role)
                                                const Icon = selected?.icon || User
                                                return (
                                                    <>
                                                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${formData.role === 'ADMIN' ? 'bg-amber-500/10 text-amber-400' : 'bg-blue-500/10 text-blue-400'}`}>
                                                            <Icon className="w-3.5 h-3.5" />
                                                        </div>
                                                        <span className="text-sm font-medium text-zinc-100">{selected?.label}</span>
                                                    </>
                                                )
                                            })()}
                                        </div>
                                        <ChevronDown className={`w-4 h-4 text-zinc-500 transition-transform ${isRoleDropdownOpen ? 'rotate-180' : ''}`} />
                                    </button>

                                    {isRoleDropdownOpen && (
                                        <div className="absolute top-full left-0 right-0 mt-2 bg-[#0a0a0a] border border-zinc-800 rounded-xl overflow-hidden shadow-xl z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                                            {ROLE_OPTIONS.map((option) => {
                                                const Icon = option.icon
                                                const isSelected = formData.role === option.value
                                                return (
                                                    <button
                                                        key={option.value}
                                                        type="button"
                                                        onClick={() => {
                                                            setFormData({ ...formData, role: option.value })
                                                            setIsRoleDropdownOpen(false)
                                                        }}
                                                        className={`w-full px-4 py-3 flex items-center gap-3 transition-all ${isSelected ? 'bg-zinc-800/50' : 'hover:bg-zinc-800/30'}`}
                                                    >
                                                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${option.value === 'ADMIN' ? 'bg-amber-500/10 text-amber-400' : 'bg-blue-500/10 text-blue-400'}`}>
                                                            <Icon className="w-3.5 h-3.5" />
                                                        </div>
                                                        <span className="text-sm font-medium text-zinc-100 flex-1 text-left">{option.label}</span>
                                                        {isSelected && (
                                                            <Check className="w-4 h-4 text-emerald-400" />
                                                        )}
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Assigned Bots - Same style as CreateUserModal permissions */}
                            <div className="space-y-1.5" ref={dropdownRef}>
                                <div className="flex items-center justify-between">
                                    <label className="text-[13px] font-semibold text-zinc-400">
                                        ASSIGNED BOTS
                                    </label>
                                    <span className="text-[11px] text-zinc-500">{formData.selectedBots.length} selected</span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setShowBotDropdown(!showBotDropdown)}
                                    className="w-full h-[46px] px-4 bg-[#0a0a0a] border border-zinc-800 rounded-xl text-left flex items-center justify-between hover:border-zinc-700 transition-colors"
                                >
                                    <span className={`text-sm font-medium ${selectedBotNames.length > 0 ? 'text-zinc-100' : 'text-zinc-500'}`}>
                                        {selectedBotNames.length > 0
                                            ? selectedBotNames.length <= 2
                                                ? selectedBotNames.join(', ')
                                                : `${selectedBotNames.slice(0, 2).join(', ')} +${selectedBotNames.length - 2} more`
                                            : 'Select bots...'}
                                    </span>
                                    <ChevronDown className={`w-4 h-4 text-zinc-500 transition-transform ${showBotDropdown ? 'rotate-180' : ''}`} />
                                </button>

                                {showBotDropdown && (
                                    <div className="bg-[#0a0a0a] border border-zinc-800 rounded-xl overflow-hidden shadow-xl mt-2 max-h-48 overflow-y-auto">
                                        {bots?.length === 0 ? (
                                            <div className="text-center py-3 text-zinc-500 text-sm">No bots available</div>
                                        ) : (
                                            bots?.map((bot: any) => {
                                                const isSelected = formData.selectedBots.includes(bot.id)
                                                return (
                                                    <button
                                                        key={bot.id}
                                                        type="button"
                                                        onClick={() => toggleBot(bot.id)}
                                                        className={`w-full flex items-center justify-between h-[46px] px-4 transition-all border-b border-zinc-800/50 last:border-b-0 ${isSelected
                                                            ? 'bg-emerald-500/[0.03]'
                                                            : 'hover:bg-zinc-800/30'
                                                            }`}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${isSelected ? 'bg-emerald-500/10 text-emerald-400' : 'bg-zinc-800/40 text-zinc-500'}`}>
                                                                <Bot className="w-3.5 h-3.5" />
                                                            </div>
                                                            <span className={`text-sm font-medium transition-colors ${isSelected ? 'text-zinc-100' : 'text-zinc-400'}`}>
                                                                {bot.name}
                                                            </span>
                                                        </div>
                                                        {isSelected && (
                                                            <Check className="w-4 h-4 text-emerald-400" />
                                                        )}
                                                    </button>
                                                )
                                            })
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Footer Buttons */}
                        <div className="flex gap-3 pt-6">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 h-[46px] bg-[#1a1a1a] text-zinc-400 border border-zinc-800 rounded-xl font-semibold text-sm hover:bg-zinc-800 hover:text-white transition-all active:scale-[0.98]"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={updateMutation.isPending}
                                className="flex-1 h-[46px] bg-white text-black rounded-xl font-semibold text-sm hover:bg-zinc-200 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
        </ModalPortal>
    )
}
