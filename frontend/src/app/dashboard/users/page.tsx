'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import InviteUserModal from '@/components/InviteUserModal'
import EditUserModal from '@/components/EditUserModal'
import DeleteUserModal from '@/components/DeleteUserModal'

export default function UsersPage() {
    const [showInviteModal, setShowInviteModal] = useState(false)
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
        <div className="p-8">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
                        <span className="w-1.5 h-10 bg-gradient-to-b from-cyan-400 to-purple-600 rounded-full"></span>
                        User Management
                    </h1>
                    <p className="text-gray-400 text-lg">Manage user access and permissions</p>
                </div>
                <button
                    onClick={() => setShowInviteModal(true)}
                    className="group px-6 py-3.5 bg-gradient-to-r from-cyan-500 to-purple-600 text-white rounded-xl font-bold hover:shadow-2xl hover:shadow-cyan-500/50 transition-all flex items-center gap-2 hover-lift relative overflow-hidden"
                >
                    <div className="absolute inset-0 shimmer opacity-0 group-hover:opacity-100"></div>
                    <svg className="w-5 h-5 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <span className="relative z-10">Invite User</span>
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="glass rounded-2xl p-6 border border-white/10">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-cyan-500/20 to-purple-500/20 rounded-xl flex items-center justify-center">
                            <span className="text-2xl">👥</span>
                        </div>
                        <div>
                            <p className="text-3xl font-bold text-white">{stats?.total_users || 0}</p>
                            <p className="text-sm text-gray-400">Total Users</p>
                        </div>
                    </div>
                </div>
                <div className="glass rounded-2xl p-6 border border-white/10">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl flex items-center justify-center">
                            <span className="text-2xl">👨‍💼</span>
                        </div>
                        <div>
                            <p className="text-3xl font-bold text-white">{stats?.admin_count || 0}</p>
                            <p className="text-sm text-gray-400">Admins</p>
                        </div>
                    </div>
                </div>
                <div className="glass rounded-2xl p-6 border border-white/10">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-pink-500/20 to-rose-500/20 rounded-xl flex items-center justify-center">
                            <span className="text-2xl">👤</span>
                        </div>
                        <div>
                            <p className="text-3xl font-bold text-white">{stats?.user_count || 0}</p>
                            <p className="text-sm text-gray-400">Users</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Users Table */}
            {isLoading ? (
                <div className="flex items-center justify-center py-12">
                    <div className="relative w-16 h-16">
                        <div className="absolute inset-0 rounded-full border-4 border-cyan-500/20"></div>
                        <div className="absolute inset-0 rounded-full border-4 border-cyan-500 border-t-transparent animate-spin"></div>
                    </div>
                </div>
            ) : users && users.length > 0 ? (
                <div className="glass rounded-2xl border border-white/10 overflow-hidden">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-white/5 border-b border-white/10">
                                <th className="px-6 py-4 text-left text-sm font-semibold text-white">Name</th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-white">Email</th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-white">Role</th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-white">Bots</th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-white">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map((user: any) => (
                                <tr key={user.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                    <td className="px-6 py-4 text-white">{user.name || 'N/A'}</td>
                                    <td className="px-6 py-4 text-gray-400">{user.email}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${user.role === 'admin'
                                                ? 'bg-purple-500/20 text-purple-400'
                                                : 'bg-cyan-500/20 text-cyan-400'
                                            }`}>
                                            {user.role}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-gray-400">{user.bots_count || 0} bots</td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => handleEdit(user)}
                                                className="px-3 py-1 bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/30 transition-colors text-sm"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => handleDelete(user)}
                                                className="px-3 py-1 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors text-sm"
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
                <div className="text-center py-16 glass rounded-2xl border-2 border-dashed border-white/10">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-cyan-500/20 to-purple-500/20 rounded-2xl mb-6">
                        <svg className="w-10 h-10 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">No users yet</h3>
                    <p className="text-gray-400 mb-6">Invite users to collaborate on your bots</p>
                    <button
                        onClick={() => setShowInviteModal(true)}
                        className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-cyan-500/50 transition-all hover-lift"
                    >
                        Invite User
                    </button>
                </div>
            )}

            {/* Modals */}
            <InviteUserModal
                isOpen={showInviteModal}
                onClose={() => setShowInviteModal(false)}
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
