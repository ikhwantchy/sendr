'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import Link from 'next/link'
import CreateUserModal from '@/components/CreateUserModal'
import EditUserModal from '@/components/EditUserModal'
import DeleteUserModal from '@/components/DeleteUserModal'
import {
    Users as UsersIcon, User, UserPlus, Bot, Plus, X, Settings2,
    RefreshCw, Search, ChevronDown, Shield, Eye, Pencil, Trash2, Loader2
} from 'lucide-react'
import { toast } from 'sonner'

// KPI Card Component - Same as Analytics
interface KPICardProps {
    title: string
    value: number | string
    icon: React.ReactNode
    loading?: boolean
}

function KPICard({ title, value, icon, loading }: KPICardProps) {
    return (
        <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-900 rounded-xl p-6 relative overflow-hidden group hover:border-zinc-300 dark:hover:border-zinc-800 transition-colors shadow-sm dark:shadow-none">
            <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-zinc-100 dark:bg-zinc-900 rounded-lg text-zinc-700 dark:text-zinc-100 group-hover:bg-zinc-200 dark:group-hover:bg-zinc-800 transition-colors">
                    {icon}
                </div>
            </div>

            <div className="space-y-1">
                {loading ? (
                    <div className="h-8 w-24 bg-zinc-200 dark:bg-zinc-900 rounded animate-pulse" />
                ) : (
                    <h3 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white transition-all duration-300">
                        {typeof value === 'number' ? value.toLocaleString() : value}
                    </h3>
                )}
                <p className="text-sm text-zinc-500 font-medium">{title}</p>
            </div>
        </div>
    )
}

export default function UsersPage() {
    const [mounted, setMounted] = useState(false)
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [showEditModal, setShowEditModal] = useState(false)
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [showAddBotModal, setShowAddBotModal] = useState(false)
    const [selectedUser, setSelectedUser] = useState<any>(null)
    const [newBotName, setNewBotName] = useState('')
    const [searchQuery, setSearchQuery] = useState('')
    const [roleFilter, setRoleFilter] = useState('')

    const queryClient = useQueryClient()

    useEffect(() => {
        setMounted(true)
    }, [])

    const { data: users, isLoading, isFetching, refetch } = useQuery({
        queryKey: ['users'],
        queryFn: async () => {
            const response = await api.users.list()
            return response.data.data || []
        },
    })

    const isRefreshing = isFetching && !isLoading

    const { data: stats, isLoading: statsLoading, isFetching: statsFetching } = useQuery({
        queryKey: ['user-stats'],
        queryFn: async () => {
            const response = await api.users.stats()
            return response.data.data || {}
        },
    })

    const createBotMutation = useMutation({
        mutationFn: async (data: { name: string, target_tenant_id: string }) => {
            return await api.bots.create(data)
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] })
            setShowAddBotModal(false)
            setNewBotName('')
            toast.success('Bot created and assigned successfully!')
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.error || 'Failed to create bot')
        }
    })

    const handleEdit = (user: any) => {
        setSelectedUser(user)
        setShowEditModal(true)
    }

    const handleDelete = (user: any) => {
        setSelectedUser(user)
        setShowDeleteModal(true)
    }

    const handleAddBotClick = (user: any) => {
        setSelectedUser(user)
        setShowAddBotModal(true)
    }

    const handleCreateBot = () => {
        if (!newBotName.trim()) {
            toast.error('Bot name is required')
            return
        }
        createBotMutation.mutate({
            name: newBotName,
            target_tenant_id: selectedUser.tenant_id
        })
    }

    // Filter users
    const filteredUsers = (users || []).filter((user: any) => {
        const matchesSearch = !searchQuery ||
            user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.email?.toLowerCase().includes(searchQuery.toLowerCase())
        const matchesRole = !roleFilter || user.role === roleFilter
        return matchesSearch && matchesRole
    })

    if (!mounted) return null

    return (
        <div className="p-8 space-y-8 min-h-screen bg-zinc-50 dark:bg-black text-zinc-900 dark:text-zinc-100 font-sans">
            {/* Header - Same style as Analytics */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white mb-1">
                            User Management
                        </h1>
                        {isRefreshing && (
                            <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                        )}
                    </div>
                    <p className="text-zinc-500 text-sm">
                        Manage user access and permissions
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {/* Role Filter Dropdown */}
                    <div className="relative">
                        <button
                            onClick={() => {
                                const dropdown = document.getElementById('users-role-dropdown')
                                if (dropdown) dropdown.classList.toggle('hidden')
                            }}
                            onBlur={(e) => {
                                setTimeout(() => {
                                    const dropdown = document.getElementById('users-role-dropdown')
                                    if (dropdown && !dropdown.contains(e.relatedTarget as Node)) {
                                        dropdown.classList.add('hidden')
                                    }
                                }, 150)
                            }}
                            className="inline-flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800/50 rounded-lg text-xs font-medium text-zinc-900 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 transition-all"
                        >
                            <Shield className="w-3.5 h-3.5 text-blue-500" />
                            <span>{roleFilter || 'All Roles'}</span>
                            <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
                        </button>

                        <div
                            id="users-role-dropdown"
                            className="hidden absolute top-full right-0 mt-2 w-36 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl z-50 overflow-hidden py-1"
                        >
                            {[
                                { label: 'All Roles', value: '' },
                                { label: 'Owner', value: 'OWNER' },
                                { label: 'Admin', value: 'ADMIN' },
                                { label: 'User', value: 'USER' }
                            ].map((option) => (
                                <button
                                    key={option.value}
                                    onClick={() => {
                                        setRoleFilter(option.value)
                                        document.getElementById('users-role-dropdown')?.classList.add('hidden')
                                    }}
                                    className={`w-full text-left px-4 py-2 text-xs hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors ${roleFilter === option.value ? 'text-blue-500 bg-blue-50 dark:bg-blue-400/5' : 'text-zinc-600 dark:text-zinc-400'}`}
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Refresh Button */}
                    <button
                        onClick={() => refetch()}
                        disabled={isFetching}
                        className={`p-2 bg-white dark:bg-zinc-900 border rounded-lg transition-all ${isFetching
                            ? 'border-blue-500/50 text-blue-500 dark:text-blue-400'
                            : 'border-zinc-200 dark:border-zinc-800/50 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:border-zinc-300 dark:hover:border-zinc-700'
                            }`}
                    >
                        <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
                    </button>

                    {/* Create User Button */}
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-900 dark:bg-white text-white dark:text-black rounded-lg font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
                    >
                        <UserPlus className="w-4 h-4" />
                        Create User
                    </button>
                </div>
            </div>

            {/* KPI Grid - Same style as Analytics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <KPICard
                    title="Total Users"
                    value={stats?.total_users || 0}
                    icon={<UsersIcon className="w-5 h-5" />}
                    loading={statsLoading}
                />
                <KPICard
                    title="Admins / Owners"
                    value={stats?.admin_count || 0}
                    icon={<Shield className="w-5 h-5" />}
                    loading={statsLoading}
                />
                <KPICard
                    title="Clients / Users"
                    value={stats?.user_count || 0}
                    icon={<User className="w-5 h-5" />}
                    loading={statsLoading}
                />
                <KPICard
                    title="Total Bots"
                    value={stats?.total_bots || 0}
                    icon={<Bot className="w-5 h-5" />}
                    loading={statsLoading}
                />
            </div>

            {/* Search Bar */}
            <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-900 rounded-xl p-4 shadow-sm dark:shadow-none">
                <div className="relative">
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search users by name or email..."
                        className="w-full px-4 py-2.5 pl-10 bg-zinc-100 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800/50 rounded-lg text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:border-zinc-300 dark:focus:border-zinc-700 placeholder:text-zinc-500 dark:placeholder:text-zinc-600"
                    />
                    <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
                        >
                            <X size={14} />
                        </button>
                    )}
                </div>
            </div>

            {/* Users Table */}
            <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-900 rounded-xl overflow-hidden shadow-sm dark:shadow-none">
                <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800/50 flex justify-between items-center">
                    <div>
                        <h3 className="text-lg font-medium text-zinc-800 dark:text-zinc-200">Users</h3>
                        <p className="text-xs text-zinc-500 mt-0.5">{filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''} found</p>
                    </div>
                </div>

                {isLoading ? (
                    <div className="flex items-center justify-center py-16">
                        <div className="relative w-12 h-12">
                            <div className="absolute inset-0 rounded-full border-2 border-zinc-800"></div>
                            <div className="absolute inset-0 rounded-full border-2 border-blue-500 border-t-transparent animate-spin"></div>
                        </div>
                    </div>
                ) : filteredUsers.length === 0 ? (
                    <div className="text-center py-16">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-zinc-800/50 rounded-2xl mb-4">
                            <UsersIcon size={32} className="text-zinc-600" />
                        </div>
                        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">No Users Found</h3>
                        <p className="text-zinc-400 text-sm">
                            {searchQuery || roleFilter ? 'Try adjusting your filters' : 'Create your first user to get started'}
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-zinc-200 dark:border-zinc-800/50">
                                    <th className="text-left py-3 px-4 text-sm font-medium text-zinc-600 dark:text-zinc-400">User</th>
                                    <th className="text-left py-3 px-4 text-sm font-medium text-zinc-600 dark:text-zinc-400">Email</th>
                                    <th className="text-left py-3 px-4 text-sm font-medium text-zinc-600 dark:text-zinc-400">Role</th>
                                    <th className="text-left py-3 px-4 text-sm font-medium text-zinc-600 dark:text-zinc-400">Bots</th>
                                    <th className="text-right py-3 px-4 text-sm font-medium text-zinc-600 dark:text-zinc-400">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredUsers.map((user: any) => (
                                    <tr key={user.id} className="border-b border-zinc-200 dark:border-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-900/50 transition-colors">
                                        <td className="py-4 px-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center border border-zinc-700/50 font-medium text-zinc-300 text-sm">
                                                    {(user.name || 'U')[0].toUpperCase()}
                                                </div>
                                                <span className="text-zinc-900 dark:text-zinc-100 font-medium">{user.name || 'N/A'}</span>
                                            </div>
                                        </td>
                                        <td className="py-4 px-4 text-zinc-600 dark:text-zinc-400">{user.email}</td>
                                        <td className="py-4 px-4">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border ${
                                                user.role === 'OWNER'
                                                    ? 'bg-purple-500/10 border-purple-500/20 text-purple-400'
                                                    : user.role === 'ADMIN'
                                                    ? 'bg-blue-500/10 border-blue-500/20 text-blue-400'
                                                    : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                                            }`}>
                                                <Shield className="w-3 h-3" />
                                                {user.role}
                                            </span>
                                        </td>
                                        <td className="py-4 px-4">
                                            <div className="flex items-center gap-2">
                                                <div className="flex items-center gap-1.5 text-sm">
                                                    <Bot className="w-4 h-4 text-zinc-600" />
                                                    <span className="text-zinc-400 font-mono">{user.bots_count || 0}</span>
                                                </div>
                                                {user.role === 'USER' && (
                                                    <button
                                                        onClick={() => handleAddBotClick(user)}
                                                        className="w-6 h-6 rounded-lg bg-blue-500/10 border border-blue-500/30 hover:bg-blue-500/20 transition-all flex items-center justify-center text-blue-400"
                                                        title="Add Bot"
                                                    >
                                                        <Plus className="w-3 h-3" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                        <td className="py-4 px-4">
                                            <div className="flex items-center justify-end gap-2">
                                                <Link
                                                    href={`/dashboard/users/${user.id}`}
                                                    className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/30 hover:bg-blue-500/20 transition-all flex items-center justify-center text-blue-400"
                                                    title="View Details"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </Link>
                                                <button
                                                    onClick={() => handleEdit(user)}
                                                    className="w-8 h-8 rounded-lg bg-zinc-800/50 border border-zinc-700/50 hover:bg-zinc-800 hover:border-amber-500/50 transition-all flex items-center justify-center text-zinc-400 hover:text-amber-400"
                                                    title="Edit"
                                                >
                                                    <Pencil className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(user)}
                                                    className="w-8 h-8 rounded-lg bg-zinc-800/50 border border-zinc-700/50 hover:bg-red-500/10 hover:border-red-500/50 transition-all flex items-center justify-center text-zinc-400 hover:text-red-400"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modals */}
            <CreateUserModal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} />
            <EditUserModal isOpen={showEditModal} onClose={() => { setShowEditModal(false); setSelectedUser(null); }} user={selectedUser} />
            <DeleteUserModal isOpen={showDeleteModal} onClose={() => { setShowDeleteModal(false); setSelectedUser(null); }} user={selectedUser} />

            {/* Add Bot Modal */}
            {showAddBotModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="w-full max-w-md bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-900 rounded-xl overflow-hidden shadow-xl dark:shadow-2xl">
                        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800/50 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-zinc-100 dark:bg-zinc-900 rounded-lg">
                                    <Bot className="w-5 h-5 text-blue-400" />
                                </div>
                                <div>
                                    <h3 className="font-medium text-zinc-900 dark:text-white">Create Bot for Client</h3>
                                    <p className="text-xs text-zinc-500">Assign to {selectedUser?.name}</p>
                                </div>
                            </div>
                            <button onClick={() => setShowAddBotModal(false)} className="p-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-all">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2 block">Bot Name</label>
                                <input
                                    type="text"
                                    value={newBotName}
                                    onChange={(e) => setNewBotName(e.target.value)}
                                    placeholder="Enter bot name"
                                    className="w-full bg-zinc-100 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800/50 text-zinc-900 dark:text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-zinc-300 dark:focus:border-zinc-700"
                                />
                            </div>
                        </div>
                        <div className="px-6 py-4 border-t border-zinc-200 dark:border-zinc-800/50 flex gap-3">
                            <button
                                onClick={() => setShowAddBotModal(false)}
                                className="flex-1 py-2.5 text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded-lg font-medium text-sm transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreateBot}
                                disabled={createBotMutation.isPending || !newBotName.trim()}
                                className="flex-1 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium text-sm transition-colors disabled:opacity-50"
                            >
                                {createBotMutation.isPending ? 'Creating...' : 'Create & Assign'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
