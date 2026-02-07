'use client'

import { useState, useRef, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { Copy, Check, ChevronDown, X, Shield, User } from 'lucide-react'
import { API_URL } from '@/lib/api'
import ModalPortal from '@/components/ModalPortal'

interface CreateUserModalProps {
    isOpen: boolean
    onClose: () => void
}

const ROLE_OPTIONS = [
    { value: 'ADMIN', label: 'Admin', icon: Shield },
    { value: 'USER', label: 'User', icon: User },
]

export default function CreateUserModal({ isOpen, onClose }: CreateUserModalProps) {
    const queryClient = useQueryClient()
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        role: 'USER',
    })
    const [createdUser, setCreatedUser] = useState<any>(null)
    const [copied, setCopied] = useState<string>('')
    const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false)
    const roleDropdownRef = useRef<HTMLDivElement>(null)

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (roleDropdownRef.current && !roleDropdownRef.current.contains(event.target as Node)) {
                setIsRoleDropdownOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const createMutation = useMutation({
        mutationFn: async (data: any) => {
            const token = localStorage.getItem('token')
            const response = await axios.post(
                `${API_URL}/api/admin/users/create`,
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
        })
        setIsRoleDropdownOpen(false)
        setCreatedUser(null)
        onClose()
    }

    // Success screen after user created
    if (createdUser) {
        return (
            <ModalPortal isOpen={isOpen}>
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
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
            </ModalPortal>
        )
    }

    return (
        <ModalPortal isOpen={isOpen}>
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
                <div className="bg-[#111111] rounded-2xl border border-zinc-800 max-w-md w-full shadow-2xl max-h-[90vh] overflow-y-auto">
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
                    </div>

                    <div className="flex gap-3 pt-6">
                        <button
                            type="button"
                            onClick={handleClose}
                            className="flex-1 h-[46px] bg-[#1a1a1a] text-zinc-400 border border-zinc-800 rounded-xl font-semibold text-sm hover:bg-zinc-800 hover:text-white transition-all active:scale-[0.98]"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={createMutation.isPending}
                            className="flex-1 h-[46px] bg-white text-black rounded-xl font-semibold text-sm hover:bg-zinc-200 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {createMutation.isPending ? 'Working...' : 'Create User'}
                        </button>
                    </div>
                </form>
                </div>
            </div>
        </ModalPortal>
    )
}
