'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import CreateUserModal from '@/components/CreateUserModal'
import InviteUserModal from '@/components/InviteUserModal'
import EditUserModal from '@/components/EditUserModal'
import DeleteUserModal from '@/components/DeleteUserModal'
import { Users as UsersIcon, User, UserPlus, Mail } from 'lucide-react'

export default function UsersPage() {
    const [showInviteModal, setShowInviteModal] = useState(false)
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [showEditModal, setShowEditModal] = useState(false)
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [selectedUser, setSelectedUser] = useState<any>(null)

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

    const handleEdit = (user: any) => {
        setSelectedUser(user)
        setShowEditModal(true)
    }

    const handleDelete = (user: any) => {
        setSelectedUser(user)
        setShowDeleteModal(true)
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

            {/* Stats Cards - Exact Match to Overview Style */}
            <div className="grid grid-cols-4 gap-4 mb-10">
                {/* Total Users */}
                <div className="bg-[#0e0e11] border border-zinc-800/50 rounded-xl p-5 min-h-[110px] flex flex-col justify-between hover:border-zinc-700/50 transition-all duration-200 group">
                    <div className="flex justify-between items-start">
                        <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Total Users</span>
                        <UsersIcon className="w-3.5 h-3.5 text-zinc-600 opacity-50 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <div className="text-2xl font-medium text-zinc-100 tracking-tight">
                        {stats?.total_users || 0}
                    </div>
                </div>

                {/* Admins */}
                <div className="bg-[#0e0e11] border border-zinc-800/50 rounded-xl p-5 min-h-[110px] flex flex-col justify-between hover:border-zinc-700/50 transition-all duration-200 group">
                    <div className="flex justify-between items-start">
                        <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Admins</span>
                        <User className="w-3.5 h-3.5 text-zinc-600 opacity-50 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <div className="text-2xl font-medium text-zinc-100 tracking-tight">
                        {stats?.admin_count || 0}
                    </div>
                </div>

                {/* Users */}
                <div className="bg-[#0e0e11] border border-zinc-800/50 rounded-xl p-5 min-h-[110px] flex flex-col justify-between hover:border-zinc-700/50 transition-all duration-200 group">
                    <div className="flex justify-between items-start">
                        <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Users</span>
                        <User className="w-3.5 h-3.5 text-zinc-600 opacity-50 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <div className="text-2xl font-medium text-zinc-100 tracking-tight">
                        {stats?.user_count || 0}
                    </div>
                </div>
            </div>

            {/* Users Table */}
            {isLoading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="w-6 h-6 border-2 border-zinc-800 border-t-white rounded-full animate-spin" />
                </div>
            ) : users && users.length > 0 ? (
                <div className="bg-[#0e0e11] border border-zinc-800/50 rounded-xl overflow-hidden">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-zinc-800/50">
                                <th className="px-6 py-4 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Name</th>
                                <th className="px-6 py-4 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Email</th>
                                <th className="px-6 py-4 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Role</th>
                                <th className="px-6 py-4 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Bots</th>
                                <th className="px-6 py-4 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/30">
                            {users.map((user: any) => (
                                <tr key={user.id} className="hover:bg-zinc-900/50 transition-colors">
                                    <td className="px-6 py-4 text-sm text-white">{user.name || 'N/A'}</td>
                                    <td className="px-6 py-4 text-sm text-zinc-400">{user.email}</td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${(user.role === 'ADMIN' || user.role === 'OWNER')
                                            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                            : 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20'
                                            }`}>
                                            {user.role}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-zinc-500">{user.bots_count || 0} bots</td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => handleEdit(user)}
                                                className="px-3 py-1.5 text-xs bg-zinc-800 text-zinc-300 rounded-lg hover:bg-zinc-700 transition-colors border border-zinc-700"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => handleDelete(user)}
                                                className="px-3 py-1.5 text-xs bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors border border-red-500/20"
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
            ) : (
                <div className="bg-[#0e0e11] border border-zinc-800/50 rounded-xl p-16 text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-zinc-900 rounded-full mb-4">
                        <UsersIcon className="w-8 h-8 text-zinc-600" />
                    </div>
                    <h3 className="text-lg font-medium text-white mb-2">No users yet</h3>
                    <p className="text-sm text-zinc-500 mb-6">Create new users to collaborate on your bots</p>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="px-4 py-2.5 bg-white text-black rounded-lg font-medium hover:bg-zinc-200 transition-colors"
                    >
                        Create User
                    </button>
                </div>
            )}

            {/* Modals */}
            <CreateUserModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
            />



            <EditUserModal
                isOpen={showEditModal}
                onClose={() => {
                    setShowEditModal(false)
                    setSelectedUser(null)
                }}
                user={selectedUser}
            />

            <DeleteUserModal
                isOpen={showDeleteModal}
                onClose={() => {
                    setShowDeleteModal(false)
                    setSelectedUser(null)
                }}
                user={selectedUser}
            />
        </div>
    )
}
