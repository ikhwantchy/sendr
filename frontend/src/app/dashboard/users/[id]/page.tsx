'use client'

import { useState, useEffect, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import AdminGuard from '@/components/AdminGuard'
import {
    ArrowLeft, Bot, MessageSquare, Megaphone,
    Bell, Activity, Shield, Zap, CloudLightning, Loader2,
    Plus, Trash2, X, Check, ChevronDown, ChevronUp, RefreshCw,
    Database, Users as UsersIcon, Sparkles, Calendar, BarChart3
} from 'lucide-react'
import { toast } from 'sonner'
import ModalPortal from '@/components/ModalPortal'

// Permission definitions
const PERMISSION_DEFINITIONS = [
    { key: 'can_view', label: 'Show Bot' },
    { key: 'can_view_analytics', label: 'Analytics' },
    { key: 'can_create_rules', label: 'Auto-Reply' },
    { key: 'can_use_reminders', label: 'Reminders' },
    { key: 'can_create_campaigns', label: 'Campaigns' },
    { key: 'can_use_ai', label: 'AI Assistant' },
    { key: 'can_manage_contacts', label: 'Contacts' },
    { key: 'can_manage_datasources', label: 'Data Sources' },
]

// Module permissions for Create Bot modal
const BOT_PERMISSIONS = [
    { key: 'can_view', label: 'Show Bot', icon: Bot },
    { key: 'can_view_analytics', label: 'Analytics', icon: BarChart3 },
    { key: 'can_create_rules', label: 'Auto-Reply', icon: Sparkles },
    { key: 'can_use_reminders', label: 'Reminders', icon: Calendar },
    { key: 'can_create_campaigns', label: 'Campaigns', icon: Megaphone },
    { key: 'can_use_ai', label: 'AI Assistant', icon: CloudLightning },
]

export default function UserDetailPage() {
    const params = useParams()
    const id = params?.id as string
    const router = useRouter()
    const queryClient = useQueryClient()
    const [mounted, setMounted] = useState(false)
    const [showCreateBotModal, setShowCreateBotModal] = useState(false)
    const [newBotName, setNewBotName] = useState('')
    const [newBotExpiresAt, setNewBotExpiresAt] = useState<Date | null>(null)
    const [showDatePicker, setShowDatePicker] = useState(false)
    const [datePickerMonth, setDatePickerMonth] = useState(new Date())
    const [selectedHour, setSelectedHour] = useState(23)
    const [selectedMinute, setSelectedMinute] = useState(59)
    const [isPermissionsExpanded, setIsPermissionsExpanded] = useState(false)
    const [botPermissions, setBotPermissions] = useState({
        can_view: true,
        can_view_analytics: true,
        can_create_rules: true,
        can_use_reminders: true,
        can_create_campaigns: true,
        can_use_ai: false,
    })

    useEffect(() => { setMounted(true) }, [])

    const { data: detail, isLoading, refetch } = useQuery({
        queryKey: ['user-detail', id],
        queryFn: async () => {
            const response = await api.users.get(id as string)
            return response.data.data
        }
    })

    const updatePermissionMutation = useMutation({
        mutationFn: async ({ botId, data }: { botId: string, data: any }) => {
            return await api.permissions.updateBotPermission(id as string, botId, data)
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['user-detail', id] })
            toast.success('Permissions updated')
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.error || 'Failed to save permissions')
        }
    })

    const createBotMutation = useMutation({
        mutationFn: async (data: { name: string, target_tenant_id: string, permissions?: any, expires_at?: string }) => {
            return await api.bots.create(data)
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['user-detail', id] })
            queryClient.invalidateQueries({ queryKey: ['users'] })
            setShowCreateBotModal(false)
            setNewBotName('')
            setNewBotExpiresAt(null)
            setShowDatePicker(false)
            setBotPermissions({
                can_view: true,
                can_view_analytics: true,
                can_create_rules: true,
                can_use_reminders: true,
                can_create_campaigns: true,
                can_use_ai: false,
            })
            setIsPermissionsExpanded(false)
            toast.success('Bot created successfully!')
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.error || 'Failed to create bot')
        }
    })

    const deleteBotMutation = useMutation({
        mutationFn: async (botId: string) => {
            return await api.bots.delete(botId)
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['user-detail', id] })
            queryClient.invalidateQueries({ queryKey: ['users'] })
            toast.success('Bot deleted successfully!')
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.error || 'Failed to delete bot')
        }
    })

    const handleCreateBot = () => {
        if (!newBotName.trim()) {
            toast.error('Bot name is required')
            return
        }
        createBotMutation.mutate({
            name: newBotName,
            target_tenant_id: detail?.user?.tenant_id,
            permissions: botPermissions,
            expires_at: newBotExpiresAt ? newBotExpiresAt.toISOString() : undefined
        })
    }

    if (!mounted || isLoading) {
        return (
            <AdminGuard>
            <div className="p-8 flex flex-col items-center justify-center min-h-[60vh] text-zinc-500 gap-4">
                <div className="relative w-12 h-12">
                    <div className="absolute inset-0 rounded-full border-2 border-zinc-800"></div>
                    <div className="absolute inset-0 rounded-full border-2 border-blue-500 border-t-transparent animate-spin"></div>
                </div>
                <p className="text-sm font-medium">Loading user details...</p>
            </div>
            </AdminGuard>
        )
    }

    if (!detail) return <AdminGuard><div className="p-8 text-white">User not found</div></AdminGuard>

    const { user, bots, analytics, permissions } = detail

    return (
        <AdminGuard>
        <div className="p-8 min-h-screen bg-black text-white space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.back()}
                        className="p-2.5 hover:bg-zinc-900 rounded-xl transition-all border border-zinc-800 hover:border-zinc-700"
                    >
                        <ArrowLeft className="w-5 h-5 text-zinc-400" />
                    </button>
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center border border-zinc-700 font-medium text-zinc-300">
                                {(user.name || 'U')[0].toUpperCase()}
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold tracking-tight text-white">{user.name}</h1>
                                <p className="text-zinc-500 text-sm">{user.email}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <span className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${user.role === 'OWNER' ? 'bg-purple-500/10 border-purple-500/20 text-purple-400' :
                            user.role === 'ADMIN' ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' :
                                'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                        }`}>
                        <Shield className="w-3 h-3 inline mr-1.5" />
                        {user.role}
                    </span>
                    <span className="text-xs text-zinc-500 bg-zinc-900 px-3 py-1.5 rounded-lg border border-zinc-800">
                        Member since {new Date(user.created_at).toLocaleDateString()}
                    </span>
                    <button
                        onClick={() => refetch()}
                        className="p-2 bg-zinc-900 border border-zinc-800/50 rounded-lg text-zinc-400 hover:text-white hover:border-zinc-700 transition-colors"
                    >
                        <RefreshCw className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Quick Stats Grid - Clean without icons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <KPICard title="TOTAL MESSAGES" value={analytics.total_messages} />
                <KPICard title="AUTO REPLIES" value={analytics.auto_replies} />
                <KPICard title="CAMPAIGNS" value={analytics.campaigns} />
                <KPICard title="REMINDERS" value={analytics.reminders} />
            </div>

            {/* Assigned Bots Header with Create Button */}
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <h3 className="text-lg font-medium text-zinc-200">Assigned Bots</h3>
                    <span className="px-2.5 py-1 bg-zinc-900 border border-zinc-800 rounded-lg text-xs font-medium text-zinc-400 tabular-nums">
                        {bots.length}
                    </span>
                </div>
                <button
                    onClick={() => setShowCreateBotModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-white text-black hover:bg-zinc-200 rounded-lg text-sm font-medium transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    Create Bot
                </button>
            </div>

            {/* Bot List */}
            {bots.length === 0 ? (
                <div className="bg-zinc-950 border border-zinc-900 rounded-xl text-center py-16">
                    <h3 className="text-lg font-semibold text-zinc-100 mb-2">No Bots Assigned</h3>
                    <p className="text-zinc-500 text-sm">Create a bot to get started</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {bots.map((bot: any) => (
                        <BotPermissionRow
                            key={bot.id}
                            bot={bot}
                            permissions={permissions}
                            onUpdate={(data) => updatePermissionMutation.mutate({ botId: bot.id, data })}
                            onDelete={() => {
                                if (confirm(`Are you sure you want to delete "${bot.name}"? This action cannot be undone.`)) {
                                    deleteBotMutation.mutate(bot.id)
                                }
                            }}
                            isUpdating={updatePermissionMutation.isPending && updatePermissionMutation.variables?.botId === bot.id}
                            isDeleting={deleteBotMutation.isPending && deleteBotMutation.variables === bot.id}
                        />
                    ))}
                </div>
            )}

            {/* Create Bot Modal - Same style as CreateUserModal */}
            <ModalPortal isOpen={showCreateBotModal}>
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
                    <div className="bg-[#111111] rounded-2xl border border-zinc-800 max-w-md w-full shadow-2xl max-h-[90vh] overflow-y-auto">
                        {/* Header */}
                        <div className="p-6 pb-2 flex items-center justify-between">
                            <div>
                                <h2 className="text-[22px] font-bold text-white tracking-tight">Create Bot</h2>
                                <p className="text-sm text-zinc-500 mt-1 font-medium">Assign to {user.name}</p>
                            </div>
                            <button
                                onClick={() => setShowCreateBotModal(false)}
                                className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-zinc-800/50 text-zinc-500 hover:text-white transition-all"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 pt-2 space-y-5">
                            <div className="grid gap-4">
                                {/* Bot Name */}
                                <div className="space-y-1.5">
                                    <label className="text-[13px] font-semibold text-zinc-400">
                                        BOT NAME
                                    </label>
                                    <input
                                        type="text"
                                        value={newBotName}
                                        onChange={(e) => setNewBotName(e.target.value)}
                                        className="w-full h-[46px] px-4 bg-[#0a0a0a] border border-zinc-800 rounded-xl text-zinc-100 placeholder-zinc-700 focus:outline-none focus:border-zinc-700 transition-all font-medium"
                                        placeholder="e.g., Customer Support Bot"
                                        autoFocus
                                    />
                                </div>

                                {/* Expiration Date */}
                                <div className="space-y-1.5">
                                    <label className="text-[13px] font-semibold text-zinc-400">
                                        EXPIRATION DATE <span className="text-zinc-600 font-normal">(Optional)</span>
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => setShowDatePicker(!showDatePicker)}
                                        className="w-full h-[46px] px-4 bg-[#0a0a0a] border border-zinc-800 rounded-xl text-left flex items-center justify-between hover:border-zinc-700 transition-colors"
                                    >
                                        <span className={`text-sm font-medium ${newBotExpiresAt ? 'text-zinc-100' : 'text-zinc-500'}`}>
                                            {newBotExpiresAt 
                                                ? `${newBotExpiresAt.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })} at ${String(newBotExpiresAt.getHours()).padStart(2, '0')}:${String(newBotExpiresAt.getMinutes()).padStart(2, '0')}`
                                                : 'Select date & time...'}
                                        </span>
                                        <Calendar className="w-4 h-4 text-zinc-500" />
                                    </button>

                                    {/* Date & Time Picker - Inline */}
                                    {showDatePicker && (
                                        <div className="bg-[#0a0a0a] border border-zinc-800 rounded-xl p-3 shadow-xl animate-in fade-in slide-in-from-top-2 duration-200">
                                            {/* Month Navigation */}
                                            <div className="flex items-center justify-between mb-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setDatePickerMonth(new Date(datePickerMonth.getFullYear(), datePickerMonth.getMonth() - 1))}
                                                    className="w-7 h-7 rounded-lg hover:bg-zinc-800 transition-colors flex items-center justify-center text-zinc-400 hover:text-white"
                                                >
                                                    <ChevronDown className="w-3.5 h-3.5 rotate-90" />
                                                </button>
                                                <div className="text-xs font-semibold text-white">
                                                    {datePickerMonth.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => setDatePickerMonth(new Date(datePickerMonth.getFullYear(), datePickerMonth.getMonth() + 1))}
                                                    className="w-7 h-7 rounded-lg hover:bg-zinc-800 transition-colors flex items-center justify-center text-zinc-400 hover:text-white"
                                                >
                                                    <ChevronDown className="w-3.5 h-3.5 -rotate-90" />
                                                </button>
                                            </div>

                                            {/* Day Names */}
                                            <div className="grid grid-cols-7 gap-0.5 mb-1">
                                                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                                                    <div key={day} className="text-center text-[9px] font-medium text-zinc-600 py-0.5">
                                                        {day}
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Calendar Grid - Compact */}
                                            <div className="grid grid-cols-7 gap-0.5">
                                                {(() => {
                                                    const days = []
                                                    const firstDay = new Date(datePickerMonth.getFullYear(), datePickerMonth.getMonth(), 1).getDay()
                                                    const daysInMonth = new Date(datePickerMonth.getFullYear(), datePickerMonth.getMonth() + 1, 0).getDate()
                                                    const today = new Date()
                                                    today.setHours(0, 0, 0, 0)

                                                    // Empty cells
                                                    for (let i = 0; i < firstDay; i++) {
                                                        days.push(<div key={`empty-${i}`} className="w-8 h-8" />)
                                                    }

                                                    // Days
                                                    for (let day = 1; day <= daysInMonth; day++) {
                                                        const date = new Date(datePickerMonth.getFullYear(), datePickerMonth.getMonth(), day)
                                                        const isPast = date < today
                                                        const isSelected = newBotExpiresAt && 
                                                            date.getDate() === newBotExpiresAt.getDate() && 
                                                            date.getMonth() === newBotExpiresAt.getMonth() && 
                                                            date.getFullYear() === newBotExpiresAt.getFullYear()
                                                        const isToday = date.getTime() === today.getTime()

                                                        days.push(
                                                            <button
                                                                key={day}
                                                                type="button"
                                                                disabled={isPast}
                                                                onClick={() => {
                                                                    const newDate = new Date(date)
                                                                    newDate.setHours(selectedHour, selectedMinute, 0, 0)
                                                                    setNewBotExpiresAt(newDate)
                                                                }}
                                                                className={`w-8 h-8 rounded-md flex items-center justify-center text-[11px] font-medium transition-all ${
                                                                    isPast
                                                                        ? 'text-zinc-700 cursor-not-allowed'
                                                                        : isSelected
                                                                            ? 'bg-white text-black'
                                                                            : isToday
                                                                                ? 'bg-zinc-800 text-white ring-1 ring-zinc-600'
                                                                                : 'text-zinc-300 hover:bg-zinc-800'
                                                                }`}
                                                            >
                                                                {day}
                                                            </button>
                                                        )
                                                    }

                                                    return days
                                                })()}
                                            </div>

                                            {/* Time Picker */}
                                            <div className="mt-3 pt-3 border-t border-zinc-800">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[10px] font-medium text-zinc-500 uppercase">Time</span>
                                                    <div className="flex items-center gap-1">
                                                        {/* Hour Select */}
                                                        <select
                                                            value={selectedHour}
                                                            onChange={(e) => {
                                                                const hour = parseInt(e.target.value)
                                                                setSelectedHour(hour)
                                                                if (newBotExpiresAt) {
                                                                    const newDate = new Date(newBotExpiresAt)
                                                                    newDate.setHours(hour, selectedMinute, 0, 0)
                                                                    setNewBotExpiresAt(newDate)
                                                                }
                                                            }}
                                                            className="bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs font-medium text-white appearance-none cursor-pointer hover:border-zinc-600 focus:outline-none focus:border-zinc-500"
                                                        >
                                                            {Array.from({ length: 24 }, (_, i) => (
                                                                <option key={i} value={i}>{String(i).padStart(2, '0')}</option>
                                                            ))}
                                                        </select>
                                                        <span className="text-zinc-500 text-xs font-bold">:</span>
                                                        {/* Minute Select */}
                                                        <select
                                                            value={selectedMinute}
                                                            onChange={(e) => {
                                                                const minute = parseInt(e.target.value)
                                                                setSelectedMinute(minute)
                                                                if (newBotExpiresAt) {
                                                                    const newDate = new Date(newBotExpiresAt)
                                                                    newDate.setHours(selectedHour, minute, 0, 0)
                                                                    setNewBotExpiresAt(newDate)
                                                                }
                                                            }}
                                                            className="bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs font-medium text-white appearance-none cursor-pointer hover:border-zinc-600 focus:outline-none focus:border-zinc-500"
                                                        >
                                                            {Array.from({ length: 60 }, (_, i) => (
                                                                <option key={i} value={i}>{String(i).padStart(2, '0')}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Action Buttons */}
                                            <div className="flex gap-2 mt-3">
                                                {newBotExpiresAt && (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setNewBotExpiresAt(null)
                                                        }}
                                                        className="flex-1 py-1.5 text-[10px] font-medium text-zinc-400 hover:text-white bg-zinc-800/50 hover:bg-zinc-800 rounded-lg transition-colors"
                                                    >
                                                        Clear
                                                    </button>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={() => setShowDatePicker(false)}
                                                    className={`${newBotExpiresAt ? 'flex-1' : 'w-full'} py-1.5 text-[10px] font-medium text-white bg-zinc-700 hover:bg-zinc-600 rounded-lg transition-colors`}
                                                >
                                                    Done
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Module Permissions */}
                            <div className="space-y-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsPermissionsExpanded(!isPermissionsExpanded)}
                                    className="w-full flex items-center justify-between group"
                                >
                                    <span className="text-[13px] font-semibold text-zinc-400 group-hover:text-zinc-200 transition-colors uppercase">
                                        MODULE PERMISSIONS
                                    </span>
                                    {isPermissionsExpanded ? <ChevronUp className="w-4 h-4 text-zinc-500 group-hover:text-zinc-200" /> : <ChevronDown className="w-4 h-4 text-zinc-500 group-hover:text-zinc-200" />}
                                </button>

                                {isPermissionsExpanded && (
                                    <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-300">
                                        {BOT_PERMISSIONS.map((perm) => {
                                            const isChecked = botPermissions[perm.key as keyof typeof botPermissions];
                                            const Icon = perm.icon;
                                            return (
                                                <button
                                                    type="button"
                                                    key={perm.key}
                                                    onClick={() => setBotPermissions({
                                                        ...botPermissions,
                                                        [perm.key]: !isChecked
                                                    })}
                                                    className={`w-full flex items-center justify-between h-[46px] px-4 rounded-xl cursor-pointer transition-all border ${isChecked
                                                        ? 'bg-emerald-500/[0.03] border-emerald-500/20'
                                                        : 'bg-[#0a0a0a] border-zinc-800 hover:border-zinc-700'
                                                        }`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${isChecked ? 'bg-emerald-500/10 text-emerald-400' : 'bg-zinc-800/40 text-zinc-500'}`}>
                                                            <Icon className="w-3.5 h-3.5" />
                                                        </div>
                                                        <span className={`text-sm font-medium transition-colors ${isChecked ? 'text-zinc-100' : 'text-zinc-400'}`}>
                                                            {perm.label}
                                                        </span>
                                                    </div>
                                                    {isChecked && (
                                                        <Check className="w-4 h-4 text-emerald-400" />
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Footer Buttons */}
                            <div className="flex gap-3 pt-6">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateBotModal(false)}
                                    className="flex-1 h-[46px] bg-[#1a1a1a] text-zinc-400 border border-zinc-800 rounded-xl font-semibold text-sm hover:bg-zinc-800 hover:text-white transition-all active:scale-[0.98]"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleCreateBot}
                                    disabled={createBotMutation.isPending || !newBotName.trim()}
                                    className="flex-1 h-[46px] bg-white text-black rounded-xl font-semibold text-sm hover:bg-zinc-200 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {createBotMutation.isPending ? (
                                        <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</>
                                    ) : (
                                        'Create Bot'
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </ModalPortal>
        </div>
        </AdminGuard>
    )
}

function KPICard({ title, value }: { title: string, value: number }) {
    return (
        <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-6 hover:border-zinc-800 transition-colors">
            <p className="text-zinc-500 text-xs font-medium uppercase tracking-wider mb-3">{title}</p>
            <div className="text-3xl font-bold text-white tabular-nums tracking-tight">{(value || 0).toLocaleString()}</div>
        </div>
    )
}

function BotPermissionRow({ bot, permissions, onUpdate, onDelete, isUpdating, isDeleting }: { bot: any, permissions: any[], onUpdate: (data: any) => void, onDelete: () => void, isUpdating: boolean, isDeleting: boolean }) {
    const initialPerms = useMemo(() => {
        return permissions.find((p: any) => p.bot_id === bot.id) || {
            can_view: 0, can_edit: 0, can_delete: 0, can_view_analytics: 0,
            can_create_rules: 0, can_use_reminders: 0, can_create_campaigns: 0,
            can_use_ai: 0, can_manage_contacts: 0, can_manage_datasources: 0
        }
    }, [permissions, bot.id])

    const [perms, setPerms] = useState(() => ({
        can_view: !!initialPerms.can_view,
        can_edit: !!initialPerms.can_edit,
        can_delete: !!initialPerms.can_delete,
        can_view_analytics: !!initialPerms.can_view_analytics,
        can_create_rules: !!initialPerms.can_create_rules,
        can_use_reminders: !!initialPerms.can_use_reminders,
        can_create_campaigns: !!initialPerms.can_create_campaigns,
        can_use_ai: !!initialPerms.can_use_ai,
        can_manage_contacts: !!initialPerms.can_manage_contacts,
        can_manage_datasources: !!initialPerms.can_manage_datasources,
    }))

    const [expanded, setExpanded] = useState(false)

    useEffect(() => {
        if (!isUpdating) {
            setPerms({
                can_view: !!initialPerms.can_view,
                can_edit: !!initialPerms.can_edit,
                can_delete: !!initialPerms.can_delete,
                can_view_analytics: !!initialPerms.can_view_analytics,
                can_create_rules: !!initialPerms.can_create_rules,
                can_use_reminders: !!initialPerms.can_use_reminders,
                can_create_campaigns: !!initialPerms.can_create_campaigns,
                can_use_ai: !!initialPerms.can_use_ai,
                can_manage_contacts: !!initialPerms.can_manage_contacts,
                can_manage_datasources: !!initialPerms.can_manage_datasources,
            })
        }
    }, [initialPerms, isUpdating])

    const toggle = (key: keyof typeof perms) => {
        if (isUpdating) return
        const newState = { ...perms, [key]: !perms[key] }
        setPerms(newState)
        onUpdate(newState)
    }

    const activeCount = Object.values(perms).filter(Boolean).length
    const activePermLabels = PERMISSION_DEFINITIONS.filter(p => perms[p.key as keyof typeof perms]).map(p => p.label)

    return (
        <div className={`bg-zinc-950 border border-zinc-900 rounded-xl overflow-hidden transition-all duration-300 ${isUpdating || isDeleting ? 'opacity-70' : ''}`}>
            {/* Bot Header Row */}
            <div
                className="px-6 py-4 flex items-center justify-between cursor-pointer hover:bg-zinc-900/30 transition-colors"
                onClick={() => setExpanded(!expanded)}
            >
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-zinc-900 rounded-xl flex items-center justify-center border border-zinc-800">
                        <Bot className="w-5 h-5 text-zinc-500" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h4 className="text-white font-semibold">{bot.name}</h4>
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium ${bot.status === 'connected'
                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                    : 'bg-zinc-800 text-zinc-500 border border-zinc-700'
                                }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${bot.status === 'connected' ? 'bg-emerald-500' : 'bg-zinc-500'}`} />
                                {bot.status === 'connected' ? 'Connected' : 'Disconnected'}
                            </span>
                        </div>
                        <p className="text-xs text-zinc-600 font-mono">ID: {bot.id.substring(0, 12)}...</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="text-right">
                        <p className="text-sm font-medium text-zinc-300">{activeCount} permissions</p>
                        <p className="text-xs text-zinc-600">{perms.can_view ? 'Visible to user' : 'Hidden from user'}</p>
                    </div>
                    {(isUpdating || isDeleting) && <Loader2 className="w-4 h-4 animate-spin text-blue-500" />}
                    <button
                        onClick={(e) => { e.stopPropagation(); onDelete(); }}
                        disabled={isDeleting}
                        className="p-2 text-zinc-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all disabled:opacity-50"
                        title="Delete bot"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                    {expanded ? (
                        <ChevronUp className="w-5 h-5 text-zinc-600" />
                    ) : (
                        <ChevronDown className="w-5 h-5 text-zinc-600" />
                    )}
                </div>
            </div>

            {/* Expanded Permissions */}
            {expanded && (
                <div className="px-6 pb-6 border-t border-zinc-900">
                    <div className="pt-4">
                        <div className="flex items-center gap-2 mb-4">
                            <Shield className="w-4 h-4 text-zinc-600" />
                            <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Feature Access Control</span>
                        </div>
                        
                        {/* Permission Badges */}
                        <div className="flex flex-wrap gap-2 mb-4">
                            {PERMISSION_DEFINITIONS.map((perm) => {
                                const isActive = perms[perm.key as keyof typeof perms]
                                return (
                                    <button
                                        key={perm.key}
                                        onClick={(e) => { e.stopPropagation(); toggle(perm.key as keyof typeof perms) }}
                                        disabled={isUpdating}
                                        className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${isActive
                                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                                                : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'
                                            }`}
                                    >
                                        {perm.label}
                                    </button>
                                )
                            })}
                        </div>

                        {/* Quick Presets */}
                        <div className="flex flex-wrap gap-2">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation()
                                    const allEnabled = {
                                        can_view: true, can_edit: true, can_delete: true,
                                        can_view_analytics: true, can_create_rules: true,
                                        can_use_reminders: true, can_create_campaigns: true,
                                        can_use_ai: true, can_manage_contacts: true, can_manage_datasources: true
                                    }
                                    setPerms(allEnabled)
                                    onUpdate(allEnabled)
                                }}
                                disabled={isUpdating}
                                className="px-3 py-1.5 text-xs font-medium text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-lg transition-colors disabled:opacity-50"
                            >
                                Full Access
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation()
                                    const viewOnly = {
                                        can_view: true, can_edit: false, can_delete: false,
                                        can_view_analytics: true, can_create_rules: false,
                                        can_use_reminders: false, can_create_campaigns: false,
                                        can_use_ai: false, can_manage_contacts: false, can_manage_datasources: false
                                    }
                                    setPerms(viewOnly)
                                    onUpdate(viewOnly)
                                }}
                                disabled={isUpdating}
                                className="px-3 py-1.5 text-xs font-medium text-zinc-400 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg transition-colors disabled:opacity-50"
                            >
                                View Only
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation()
                                    const operator = {
                                        can_view: true, can_edit: false, can_delete: false,
                                        can_view_analytics: true, can_create_rules: true,
                                        can_use_reminders: true, can_create_campaigns: true,
                                        can_use_ai: false, can_manage_contacts: true, can_manage_datasources: false
                                    }
                                    setPerms(operator)
                                    onUpdate(operator)
                                }}
                                disabled={isUpdating}
                                className="px-3 py-1.5 text-xs font-medium text-zinc-400 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg transition-colors disabled:opacity-50"
                            >
                                Operator
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation()
                                    const campaignManager = {
                                        can_view: true, can_edit: false, can_delete: false,
                                        can_view_analytics: true, can_create_rules: false,
                                        can_use_reminders: true, can_create_campaigns: true,
                                        can_use_ai: false, can_manage_contacts: true, can_manage_datasources: true
                                    }
                                    setPerms(campaignManager)
                                    onUpdate(campaignManager)
                                }}
                                disabled={isUpdating}
                                className="px-3 py-1.5 text-xs font-medium text-zinc-400 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg transition-colors disabled:opacity-50"
                            >
                                Campaign Manager
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation()
                                    const allDisabled = {
                                        can_view: false, can_edit: false, can_delete: false,
                                        can_view_analytics: false, can_create_rules: false,
                                        can_use_reminders: false, can_create_campaigns: false,
                                        can_use_ai: false, can_manage_contacts: false, can_manage_datasources: false
                                    }
                                    setPerms(allDisabled)
                                    onUpdate(allDisabled)
                                }}
                                disabled={isUpdating}
                                className="px-3 py-1.5 text-xs font-medium text-red-400 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-lg transition-colors disabled:opacity-50"
                            >
                                Revoke All
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
