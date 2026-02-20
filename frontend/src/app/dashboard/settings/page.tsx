'use client'

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { User, Lock, Loader2, CheckCircle2, XCircle, Key, Monitor, ChevronRight, Shield } from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions';

interface UserProfile {
    id: string;
    email: string;
    name: string;
    role: string;
    status: string;
}

export default function SettingsPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { isAdmin } = usePermissions();
    
    const initialTab = searchParams?.get('tab') || 'profile';
    const [activeTab, setActiveTab] = useState(initialTab);
    
    // Profile state
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    
    // Password state
    const [passwordForm, setPasswordForm] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    
    // Common state
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    useEffect(() => {
        if (activeTab === 'profile') {
            fetchProfile();
        }
    }, [activeTab]);

    useEffect(() => {
        const url = new URL(window.location.href);
        url.searchParams.set('tab', activeTab);
        window.history.replaceState({}, '', url.toString());
    }, [activeTab]);

    const fetchProfile = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/profile/profile`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();

            if (data.success) {
                setProfile(data.data);
                const nameParts = data.data.name.split(' ');
                setFirstName(nameParts[0] || '');
                setLastName(nameParts.slice(1).join(' ') || '');
                setEmail(data.data.email);
            }
        } catch (error) {
            console.error('Failed to fetch profile:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveProfile = async () => {
        setSaving(true);
        setMessage(null);

        try {
            const token = localStorage.getItem('token');
            const fullName = `${firstName} ${lastName}`.trim();

            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/profile/profile`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ name: fullName, email })
            });

            const data = await res.json();

            if (data.success) {
                setMessage({ type: 'success', text: 'Profile updated successfully!' });
                setProfile(data.data);
                setIsEditing(false);
                
                const storedUser = localStorage.getItem('user');
                if (storedUser) {
                    const user = JSON.parse(storedUser);
                    user.name = fullName;
                    user.email = email;
                    localStorage.setItem('user', JSON.stringify(user));
                }
            } else {
                setMessage({ type: 'error', text: data.message || 'Failed to update profile' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'An error occurred. Please try again.' });
        } finally {
            setSaving(false);
        }
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setMessage(null);

        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            setMessage({ type: 'error', text: 'New passwords do not match' });
            setSaving(false);
            return;
        }

        if (passwordForm.newPassword.length < 6) {
            setMessage({ type: 'error', text: 'Password must be at least 6 characters' });
            setSaving(false);
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/profile/password`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    currentPassword: passwordForm.currentPassword,
                    newPassword: passwordForm.newPassword
                })
            });

            const data = await res.json();

            if (data.success) {
                setMessage({ type: 'success', text: 'Password changed successfully!' });
                setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
            } else {
                setMessage({ type: 'error', text: data.message || 'Failed to change password' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'An error occurred. Please try again.' });
        } finally {
            setSaving(false);
        }
    };

    const tabs = [
        { id: 'profile', label: 'Profile', icon: User },
        { id: 'security', label: 'Security', icon: Lock },
    ];

    if (loading && !profile && activeTab === 'profile') {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 max-w-5xl mx-auto min-h-screen bg-zinc-50 dark:bg-black">
            {/* Header */}
            <div className="mb-4 sm:mb-6">
                <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-100">Settings</h1>
                <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">Manage your account settings and preferences</p>
            </div>

            {/* Alert Message */}
            {message && (
                <div className={`mb-6 p-4 rounded-lg border ${message.type === 'success'
                    ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700 text-green-700 dark:text-green-300'
                    : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700 text-red-700 dark:text-red-300'
                    }`}>
                    <div className="flex items-center gap-2">
                        {message.type === 'success' ? (
                            <CheckCircle2 className="h-4 w-4" />
                        ) : (
                            <XCircle className="h-4 w-4" />
                        )}
                        <span className="text-sm">{message.text}</span>
                    </div>
                </div>
            )}

            {/* Tabs */}
            <div className="flex gap-1 sm:gap-2 mb-4 sm:mb-6 border-b border-zinc-200 dark:border-zinc-800 overflow-x-auto">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => {
                                setActiveTab(tab.id);
                                setMessage(null);
                            }}
                            className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 font-medium transition-colors whitespace-nowrap text-sm ${activeTab === tab.id
                                ? 'text-blue-500 dark:text-blue-400 border-b-2 border-blue-500 dark:border-blue-400'
                                : 'text-zinc-600 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300'
                                }`}
                        >
                            <Icon size={16} className="sm:w-[18px] sm:h-[18px]" />
                            <span className="hidden sm:inline">{tab.label}</span>
                        </button>
                    );
                })}
            </div>

            {/* Profile Tab */}
            {activeTab === 'profile' && (
                <div className="space-y-6">
                    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 sm:p-6">
                        <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-6 sm:gap-8">
                            {/* Left Side - Profile Photo */}
                            <div className="flex flex-col items-center md:items-start">
                                <h3 className="text-sm font-semibold text-zinc-900 dark:text-white mb-3 sm:mb-4">Profile photo</h3>
                                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-zinc-100 dark:bg-zinc-800 border-2 border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-zinc-600 dark:text-zinc-300 text-xl sm:text-2xl font-semibold overflow-hidden mb-3 mx-auto md:mx-0">
                                    {profile?.name ? (
                                        <span>{profile.name.charAt(0).toUpperCase()}</span>
                                    ) : (
                                        <span>U</span>
                                    )}
                                </div>
                                <div className="space-y-2 mb-3">
                                    <label className="block cursor-pointer">
                                        <input type="file" accept="image/*" className="hidden" />
                                        <span className="block w-full text-center px-3 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white text-xs font-medium rounded-lg transition-colors">
                                            Upload photo
                                        </span>
                                    </label>
                                </div>
                                <p className="text-[10px] text-zinc-500 text-center leading-tight">
                                    Recommended: Square image, at least 400x400px
                                </p>
                            </div>

                            {/* Right Side - Profile Details */}
                            <div>
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">Profile details</h3>
                                    {!isEditing ? (
                                        <button
                                            onClick={() => setIsEditing(true)}
                                            className="text-sm text-blue-500 hover:text-blue-400 transition-colors"
                                        >
                                            Edit
                                        </button>
                                    ) : (
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => {
                                                    setIsEditing(false);
                                                    fetchProfile();
                                                }}
                                                className="text-sm text-zinc-500 hover:text-zinc-400 transition-colors px-3 py-1"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={handleSaveProfile}
                                                disabled={saving}
                                                className="text-sm text-blue-500 hover:text-blue-400 transition-colors px-3 py-1 disabled:opacity-50"
                                            >
                                                {saving ? 'Saving...' : 'Save'}
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                                    <div>
                                        <label className="block text-xs text-zinc-500 dark:text-zinc-400 mb-2">First name</label>
                                        <input
                                            type="text"
                                            value={firstName}
                                            onChange={(e) => setFirstName(e.target.value)}
                                            disabled={!isEditing}
                                            className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-900 dark:text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-zinc-500 dark:text-zinc-400 mb-2">Last name</label>
                                        <input
                                            type="text"
                                            value={lastName}
                                            onChange={(e) => setLastName(e.target.value)}
                                            disabled={!isEditing}
                                            className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-900 dark:text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed"
                                        />
                                    </div>
                                </div>

                                <div className="mb-4">
                                    <label className="block text-xs text-zinc-500 dark:text-zinc-400 mb-2">Email address</label>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        disabled={!isEditing}
                                        className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-900 dark:text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs text-zinc-500 dark:text-zinc-400 mb-2">Role</label>
                                    <span className="inline-flex items-center px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-xs font-medium rounded-lg border border-blue-200 dark:border-blue-800">
                                        {profile?.role || 'USER'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Security Tab */}
            {activeTab === 'security' && (
                <div className="space-y-6">
                    {/* Change Password */}
                    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <Key className="w-5 h-5 text-zinc-500 dark:text-zinc-400" />
                            <div>
                                <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">Change password</h3>
                                <p className="text-xs text-zinc-500 mt-0.5">Update your password to keep your account secure</p>
                            </div>
                        </div>

                        <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
                            <div>
                                <label className="block text-xs text-zinc-500 dark:text-zinc-400 mb-2">Current password</label>
                                <input
                                    type="password"
                                    value={passwordForm.currentPassword}
                                    onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                                    required
                                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-900 dark:text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    placeholder="••••••••"
                                />
                            </div>

                            <div>
                                <label className="block text-xs text-zinc-500 dark:text-zinc-400 mb-2">New password</label>
                                <input
                                    type="password"
                                    value={passwordForm.newPassword}
                                    onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                                    required
                                    minLength={6}
                                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-900 dark:text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    placeholder="••••••••"
                                />
                                <p className="text-[10px] text-zinc-500 mt-1.5">Must be at least 6 characters</p>
                            </div>

                            <div>
                                <label className="block text-xs text-zinc-500 dark:text-zinc-400 mb-2">Confirm new password</label>
                                <input
                                    type="password"
                                    value={passwordForm.confirmPassword}
                                    onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                                    required
                                    minLength={6}
                                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-900 dark:text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    placeholder="••••••••"
                                />
                            </div>

                            <div className="pt-2">
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
                                >
                                    {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                                    {saving ? 'Updating...' : 'Update password'}
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* Active Sessions */}
                    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Monitor className="w-5 h-5 text-zinc-500 dark:text-zinc-400" />
                                <div>
                                    <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">Active sessions</h3>
                                    <p className="text-xs text-zinc-500 mt-0.5">Manage devices logged into your account</p>
                                </div>
                            </div>
                            <button className="text-sm text-blue-500 hover:text-blue-400 transition-colors flex items-center gap-1">
                                Manage
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Two-Factor Authentication */}
                    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <Shield className="w-5 h-5 text-zinc-500 dark:text-zinc-400" />
                            <div>
                                <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">Two-Factor Authentication (2FA)</h3>
                                <p className="text-xs text-zinc-500 mt-0.5">Add an extra layer of security to your account</p>
                            </div>
                        </div>

                        <div className="space-y-3 ml-8">
                            <button className="w-full flex items-center justify-between px-4 py-3 bg-zinc-50 dark:bg-zinc-900/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded-lg transition-colors text-left">
                                <div>
                                    <div className="text-sm text-zinc-900 dark:text-white font-medium">Authenticator app</div>
                                    <div className="text-xs text-zinc-500 mt-0.5">Use an authenticator app like Google Authenticator</div>
                                </div>
                                <ChevronRight className="w-4 h-4 text-zinc-400" />
                            </button>

                            <button className="w-full flex items-center justify-between px-4 py-3 bg-zinc-50 dark:bg-zinc-900/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded-lg transition-colors text-left">
                                <div>
                                    <div className="text-sm text-zinc-900 dark:text-white font-medium">Email OTP</div>
                                    <div className="text-xs text-zinc-500 mt-0.5">Receive one-time passwords via email</div>
                                </div>
                                <ChevronRight className="w-4 h-4 text-zinc-400" />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
