'use client'

import { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { usePermissions } from '@/hooks/usePermissions'
import { toast } from 'sonner'
import { User, Envelope, Lock, Eye, EyeSlash } from '@phosphor-icons/react'

export default function UserSettingsPage() {
    const { user } = usePermissions()
    const queryClient = useQueryClient()
    
    const [profileForm, setProfileForm] = useState({
        name: '',
        email: '',
    })
    
    const [passwordForm, setPasswordForm] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    })
    
    const [showPasswords, setShowPasswords] = useState({
        current: false,
        new: false,
        confirm: false,
    })

    useEffect(() => {
        if (user) {
            setProfileForm({
                name: user.name || '',
                email: user.email || '',
            })
        }
    }, [user])

    const updateProfileMutation = useMutation({
        mutationFn: async (data: { name: string; email: string }) => {
            return await api.profile.update(data)
        },
        onSuccess: (response) => {
            // Update localStorage with new user data
            const currentUser = JSON.parse(localStorage.getItem('user') || '{}')
            const updatedUser = { ...currentUser, ...response.data.data }
            localStorage.setItem('user', JSON.stringify(updatedUser))
            queryClient.invalidateQueries({ queryKey: ['user-profile'] })
            toast.success('Profile updated successfully!')
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to update profile')
        },
    })

    const changePasswordMutation = useMutation({
        mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
            return await api.profile.changePassword(data)
        },
        onSuccess: () => {
            setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
            toast.success('Password changed successfully!')
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to change password')
        },
    })

    const handleProfileSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        updateProfileMutation.mutate({ name: profileForm.name, email: profileForm.email })
    }

    const handlePasswordSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        
        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            toast.error('Passwords do not match')
            return
        }
        
        if (passwordForm.newPassword.length < 6) {
            toast.error('Password must be at least 6 characters')
            return
        }
        
        changePasswordMutation.mutate({
            currentPassword: passwordForm.currentPassword,
            newPassword: passwordForm.newPassword,
        })
    }

    return (
        <div className="max-w-2xl mx-auto">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Settings</h1>
                <p className="text-zinc-500 mt-1">Manage your account settings</p>
            </div>

            {/* Profile Section */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 mb-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center">
                        <User size={20} className="text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Profile</h2>
                        <p className="text-sm text-zinc-500">Update your personal information</p>
                    </div>
                </div>

                <form onSubmit={handleProfileSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                            Name
                        </label>
                        <input
                            type="text"
                            value={profileForm.name}
                            onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                            className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Your name"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                            Email
                        </label>
                        <div className="relative">
                            <Envelope className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                            <input
                                type="email"
                                value={profileForm.email}
                                disabled
                                className="w-full pl-10 pr-4 py-2.5 bg-zinc-100 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-500 cursor-not-allowed"
                            />
                        </div>
                        <p className="text-xs text-zinc-500 mt-1">Email cannot be changed. Contact admin if needed.</p>
                    </div>

                    <button
                        type="submit"
                        disabled={updateProfileMutation.isPending}
                        className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                    >
                        {updateProfileMutation.isPending ? 'Saving...' : 'Save Changes'}
                    </button>
                </form>
            </div>

            {/* Password Section */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-lg bg-orange-50 dark:bg-orange-500/10 flex items-center justify-center">
                        <Lock size={20} className="text-orange-600 dark:text-orange-400" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Change Password</h2>
                        <p className="text-sm text-zinc-500">Update your account password</p>
                    </div>
                </div>

                <form onSubmit={handlePasswordSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                            Current Password
                        </label>
                        <div className="relative">
                            <input
                                type={showPasswords.current ? 'text' : 'password'}
                                value={passwordForm.currentPassword}
                                onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                                className="w-full px-4 py-2.5 pr-10 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Enter current password"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                            >
                                {showPasswords.current ? <EyeSlash size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                            New Password
                        </label>
                        <div className="relative">
                            <input
                                type={showPasswords.new ? 'text' : 'password'}
                                value={passwordForm.newPassword}
                                onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                                className="w-full px-4 py-2.5 pr-10 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Enter new password"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                            >
                                {showPasswords.new ? <EyeSlash size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                            Confirm New Password
                        </label>
                        <div className="relative">
                            <input
                                type={showPasswords.confirm ? 'text' : 'password'}
                                value={passwordForm.confirmPassword}
                                onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                                className="w-full px-4 py-2.5 pr-10 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Confirm new password"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                            >
                                {showPasswords.confirm ? <EyeSlash size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={changePasswordMutation.isPending || !passwordForm.currentPassword || !passwordForm.newPassword}
                        className="px-4 py-2.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                    >
                        {changePasswordMutation.isPending ? 'Changing...' : 'Change Password'}
                    </button>
                </form>
            </div>
        </div>
    )
}
