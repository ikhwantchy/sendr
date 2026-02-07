'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import ModalPortal from '@/components/ModalPortal'

interface DeleteUserModalProps {
    isOpen: boolean
    onClose: () => void
    user: any
}

export default function DeleteUserModal({ isOpen, onClose, user }: DeleteUserModalProps) {
    const queryClient = useQueryClient()

    const deleteMutation = useMutation({
        mutationFn: async () => {
            const response = await api.users.delete(user.id)
            return response.data
        },
        onSuccess: () => {
            toast.success('User deleted successfully!')
            queryClient.invalidateQueries({ queryKey: ['users'] })
            queryClient.invalidateQueries({ queryKey: ['user-stats'] })
            onClose()
        },
        onError: (error: any) => {
            toast.error('Failed to delete user', {
                description: error.response?.data?.error || 'Please try again',
            })
        },
    })

    const handleDelete = () => {
        deleteMutation.mutate()
    }

    if (!isOpen) return null

    return (
        <ModalPortal isOpen={isOpen}>
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
                <div className="glass rounded-2xl max-w-md w-full border border-white/10 p-6">
                {/* Icon */}
                <div className="w-16 h-16 bg-red-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                </div>

                {/* Content */}
                <div className="text-center mb-6">
                    <h2 className="text-2xl font-bold text-white mb-2">Delete User?</h2>
                    <p className="text-gray-400 mb-4">
                        Are you sure you want to delete <span className="text-white font-semibold">{user?.name || user?.email}</span>?
                    </p>
                    <div className="glass-strong rounded-xl p-4 text-left space-y-2">
                        <p className="text-sm text-gray-400">This action will:</p>
                        <ul className="text-sm text-gray-300 space-y-1 ml-4">
                            <li>• Remove user access to all bots</li>
                            <li>• Delete all user permissions</li>
                            <li>• Cannot be undone</li>
                        </ul>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        disabled={deleteMutation.isPending}
                        className="flex-1 px-6 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl font-semibold transition-colors disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleDelete}
                        disabled={deleteMutation.isPending}
                        className="flex-1 px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-red-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {deleteMutation.isPending ? 'Deleting...' : 'Delete User'}
                    </button>
                </div>
            </div>
        </div>
        </ModalPortal>
    )
}
