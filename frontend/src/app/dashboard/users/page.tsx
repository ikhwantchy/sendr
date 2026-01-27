'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import Link from 'next/link'
import CreateUserModal from '@/components/CreateUserModal'
import EditUserModal from '@/components/EditUserModal'
import DeleteUserModal from '@/components/DeleteUserModal'
import { Users as UsersIcon, User, UserPlus, Bot, Plus, X, Settings2 } from 'lucide-react'
import { toast } from 'sonner'

export default function UsersPage() {
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [showEditModal, setShowEditModal] = useState(false)
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [showAddBotModal, setShowAddBotModal] = useState(false)
    const [selectedUser, setSelectedUser] = useState<any>(null)
    const [newBotName, setNewBotName] = useState('')

    const queryClient = useQueryClient()

    const { data: users, isLoading } = useQuery({
        queryKey: ['users'],
        queryFn: async () => {
            const response = await api.users.list()
            return response.data.data || []
        },
    })

    const { data: stats } = useQuery({
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

    return (
        <div className="p-8 min-h-screen bg-[#09090b]">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-medium text-white tracking-tight">User Management</h1>
                    <p className="text-zinc-500 text-sm mt-1">Manage user access and permissions</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-white text-black rounded-lg font-medium hover:bg-zinc-200 transition-colors"
                    >
                        <UserPlus className="w-4 h-4" />
                        Create User
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
                <div className="bg-[#0e0e11] border border-zinc-800/50 rounded-xl p-5 min-h-[110px] flex flex-col justify-between hover:border-zinc-700/50 transition-all duration-200 group">
                    <div className="flex justify-between items-start">
                        <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Total Users</span>
                        <UsersIcon className="w-3.5 h-3.5 text-zinc-600 opacity-50 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <div className="text-2xl font-medium text-zinc-100 tracking-tight">{stats?.total_users || 0}</div>
                </div>
                <div className="bg-[#0e0e11] border border-zinc-800/50 rounded-xl p-5 min-h-[110px] flex flex-col justify-between hover:border-zinc-700/50 transition-all duration-200 group">
                    <div className="flex justify-between items-start">
                        <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Admins / Owners</span>
                        <User className="w-3.5 h-3.5 text-zinc-600 opacity-50 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <div className="text-2xl font-medium text-zinc-100 tracking-tight">{stats?.admin_count || 0}</div>
                </div>
                <div className="bg-[#0e0e11] border border-zinc-800/50 rounded-xl p-5 min-h-[110px] flex flex-col justify-between hover:border-zinc-700/50 transition-all duration-200 group">
                    <div className="flex justify-between items-start">
                        <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Clients / Users</span>
                        <User className="w-3.5 h-3.5 text-zinc-600 opacity-50 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <div className="text-2xl font-medium text-zinc-100 tracking-tight">{stats?.user_count || 0}</div>
                </div>
            </div>

            {/* Users Table */}
            {isLoading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="w-6 h-6 border-2 border-zinc-800 border-t-white rounded-full animate-spin" />
                </div>
            ) : users && users.length > 0 ? (
                <div className="bg-[#0e0e11] border border-zinc-800/50 rounded-xl overflow-hidden shadow-2xl">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-zinc-800/50 bg-zinc-900/20">
                                    <th className="px-6 py-4 text-left text-xs font-bold text-zinc-500 uppercase tracking-wider">Name</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-zinc-500 uppercase tracking-wider">Email</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-zinc-500 uppercase tracking-wider">Role</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-zinc-500 uppercase tracking-wider">Bots</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-zinc-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800/30">
                                {users.map((user: any) => (
                                    <tr key={user.id} className="hover:bg-zinc-900/50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center border border-zinc-700 font-bold text-zinc-400 text-xs">
                                                    {(user.name || 'U')[0].toUpperCase()}
                                                </div>
                                                <span className="text-sm font-medium text-white">{user.name || 'N/A'}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-zinc-400">{user.email}</td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase ${(user.role === 'ADMIN' || user.role === 'OWNER')
                                                ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                                : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                                }`}>
                                                {user.role}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm text-zinc-400 group-hover:text-zinc-200 transition-colors">{user.bots_count || 0} bots</span>
                                                {user.role === 'USER' && (
                                                    <button
                                                        onClick={() => handleAddBotClick(user)}
                                                        className="p-1 rounded-md hover:bg-blue-500/10 text-zinc-600 hover:text-blue-400 transition-all opacity-0 group-hover:opacity-100"
                                                        title="Assign New Bot"
                                                    >
                                                        <Plus className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <Link
                                                    href={`/dashboard/users/${user.id}`}
                                                    className="px-3 py-1.5 text-xs bg-zinc-900 text-zinc-100 rounded-lg hover:bg-zinc-800 transition-colors border border-zinc-800 flex items-center gap-1.5"
                                                >
                                                    <Settings2 className="w-3 h-3" />
                                                    Manage
                                                </Link>
                                                <button
                                                    onClick={() => handleEdit(user)}
                                                    className="px-3 py-1.5 text-xs bg-zinc-900 text-zinc-300 rounded-lg hover:bg-zinc-800 transition-colors border border-zinc-800"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(user)}
                                                    className="px-3 py-1.5 text-xs bg-red-500/5 text-red-500/60 rounded-lg hover:bg-red-500/10 hover:text-red-400 transition-colors border border-red-500/10"
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="bg-[#0e0e11] border border-zinc-800/50 rounded-xl p-16 text-center shadow-2xl">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-zinc-900 rounded-full mb-4 border border-zinc-800">
                        <UsersIcon className="w-8 h-8 text-zinc-600" />
                    </div>
                    <h3 className="text-lg font-medium text-white mb-2">No users yet</h3>
                    <p className="text-sm text-zinc-500 mb-6 max-w-xs mx-auto">Create new client accounts to start providing WhatsApp automation services.</p>
                </div>
            )}

            {/* Modals from before remain same */}
            <CreateUserModal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} />
            <EditUserModal isOpen={showEditModal} onClose={() => { setShowEditModal(false); setSelectedUser(null); }} user={selectedUser} />
            <DeleteUserModal isOpen={showDeleteModal} onClose={() => { setShowDeleteModal(false); setSelectedUser(null); }} user={selectedUser} />

            {/* Add Bot Modal */}
            {showAddBotModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                    <div className="w-full max-w-md bg-[#0e0e11] border border-zinc-800 rounded-2xl p-6 space-y-6">
                        <div className="flex items-center justify-between">
                            <Bot className="w-6 h-6 text-blue-500" />
                            <button onClick={() => setShowAddBotModal(false)} className="text-zinc-500 hover:text-white"><X className="w-5 h-5" /></button>
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-white">Create Bot for Client</h3>
                            <p className="text-sm text-zinc-400 mt-1">Creating bot for {selectedUser?.name}.</p>
                        </div>
                        <input
                            type="text"
                            value={newBotName}
                            onChange={(e) => setNewBotName(e.target.value)}
                            placeholder="Bot Name"
                            className="w-full bg-zinc-900 border border-zinc-800 text-white rounded-xl px-4 py-3.5 outline-none focus:ring-1 ring-blue-500"
                        />
                        <div className="flex gap-3">
                            <button onClick={() => setShowAddBotModal(false)} className="flex-1 py-3 text-zinc-400 border border-zinc-800 rounded-xl">Cancel</button>
                            <button onClick={handleCreateBot} disabled={createBotMutation.isPending} className="flex-1 py-3 bg-blue-500 text-white rounded-xl">
                                {createBotMutation.isPending ? 'Deploying...' : 'Create & Assign'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
