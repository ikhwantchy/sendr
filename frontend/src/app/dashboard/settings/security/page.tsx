'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, CheckCircle2, XCircle, Key, Eye, Monitor, Shield, Mail, ChevronRight } from 'lucide-react';

export default function SecurityPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [passwordForm, setPasswordForm] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        // Validation
        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            setMessage({ type: 'error', text: 'New passwords do not match' });
            setLoading(false);
            return;
        }

        if (passwordForm.newPassword.length < 6) {
            setMessage({ type: 'error', text: 'Password must be at least 6 characters' });
            setLoading(false);
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
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#09090b] p-8">
            <div className="max-w-4xl mx-auto">
                {/* Back Button */}
                <button
                    onClick={() => router.push('/dashboard')}
                    className="flex items-center gap-2 text-zinc-400 hover:text-zinc-100 mb-6 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    <span className="text-sm">Back</span>
                </button>

                {/* Header */}
                <div className="mb-8">
                    <h2 className="text-lg font-semibold text-white mb-1">Security settings</h2>
                    <p className="text-sm text-zinc-500">Manage your password and account security</p>
                </div>

                {/* Alert Message */}
                {message && (
                    <div className={`mb-6 p-4 rounded-lg border ${message.type === 'success'
                        ? 'bg-green-900/20 border-green-700 text-green-300'
                        : 'bg-red-900/20 border-red-700 text-red-300'
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

                {/* Change Password Card */}
                <div className="bg-[#0e0e11] border border-zinc-800/50 rounded-xl p-6 mb-6">
                    <div className="flex items-center gap-3 mb-6">
                        <Key className="w-5 h-5 text-zinc-400" />
                        <div>
                            <h3 className="text-sm font-semibold text-white">Change password</h3>
                            <p className="text-xs text-zinc-500 mt-0.5">Update your password to keep your account secure</p>
                        </div>
                    </div>

                    <form onSubmit={handleChangePassword} className="space-y-4">
                        <div>
                            <label className="block text-xs text-zinc-400 mb-2">Current password</label>
                            <input
                                type="password"
                                value={passwordForm.currentPassword}
                                onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                                required
                                className="w-full px-3 py-2 bg-zinc-900/50 border border-zinc-800 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                                placeholder="••••••••"
                            />
                        </div>

                        <div>
                            <label className="block text-xs text-zinc-400 mb-2">New password</label>
                            <input
                                type="password"
                                value={passwordForm.newPassword}
                                onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                                required
                                minLength={6}
                                className="w-full px-3 py-2 bg-zinc-900/50 border border-zinc-800 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                                placeholder="••••••••"
                            />
                            <p className="text-[10px] text-zinc-500 mt-1.5">
                                Must be at least 6 characters
                            </p>
                        </div>

                        <div>
                            <label className="block text-xs text-zinc-400 mb-2">Confirm new password</label>
                            <input
                                type="password"
                                value={passwordForm.confirmPassword}
                                onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                                required
                                minLength={6}
                                className="w-full px-3 py-2 bg-zinc-900/50 border border-zinc-800 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                                placeholder="••••••••"
                            />
                        </div>

                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={loading}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
                            >
                                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                                {loading ? 'Updating...' : 'Update password'}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Login Activity Card */}
                <div className="bg-[#0e0e11] border border-zinc-800/50 rounded-xl p-6 mb-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Eye className="w-5 h-5 text-zinc-400" />
                            <div>
                                <h3 className="text-sm font-semibold text-white">Login activity</h3>
                                <p className="text-xs text-zinc-500 mt-0.5">View your recent login history</p>
                            </div>
                        </div>
                        <button className="text-sm text-blue-500 hover:text-blue-400 transition-colors flex items-center gap-1">
                            View
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Active Sessions Card */}
                <div className="bg-[#0e0e11] border border-zinc-800/50 rounded-xl p-6 mb-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Monitor className="w-5 h-5 text-zinc-400" />
                            <div>
                                <h3 className="text-sm font-semibold text-white">Active sessions</h3>
                                <p className="text-xs text-zinc-500 mt-0.5">Manage devices logged into your account</p>
                            </div>
                        </div>
                        <button className="text-sm text-blue-500 hover:text-blue-400 transition-colors flex items-center gap-1">
                            Manage
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Two-Factor Authentication Card */}
                <div className="bg-[#0e0e11] border border-zinc-800/50 rounded-xl p-6 mb-6">
                    <div className="flex items-center gap-3 mb-4">
                        <Shield className="w-5 h-5 text-zinc-400" />
                        <div>
                            <h3 className="text-sm font-semibold text-white">Two-Factor Authentication (2FA)</h3>
                            <p className="text-xs text-zinc-500 mt-0.5">Add an extra layer of security to your account</p>
                        </div>
                    </div>

                    <div className="space-y-3 ml-8">
                        <button className="w-full flex items-center justify-between px-4 py-3 bg-zinc-900/50 hover:bg-zinc-900 border border-zinc-800 rounded-lg transition-colors text-left">
                            <div>
                                <div className="text-sm text-white font-medium">Authenticator app</div>
                                <div className="text-xs text-zinc-500 mt-0.5">Use an authenticator app like Google Authenticator</div>
                            </div>
                            <ChevronRight className="w-4 h-4 text-zinc-500" />
                        </button>

                        <button className="w-full flex items-center justify-between px-4 py-3 bg-zinc-900/50 hover:bg-zinc-900 border border-zinc-800 rounded-lg transition-colors text-left">
                            <div>
                                <div className="text-sm text-white font-medium">Email OTP</div>
                                <div className="text-xs text-zinc-500 mt-0.5">Receive one-time passwords via email</div>
                            </div>
                            <ChevronRight className="w-4 h-4 text-zinc-500" />
                        </button>

                        <button className="w-full flex items-center justify-between px-4 py-3 bg-zinc-900/50 hover:bg-zinc-900 border border-zinc-800 rounded-lg transition-colors text-left">
                            <div>
                                <div className="text-sm text-white font-medium">WhatsApp OTP</div>
                                <div className="text-xs text-zinc-500 mt-0.5">Receive one-time passwords via WhatsApp</div>
                            </div>
                            <ChevronRight className="w-4 h-4 text-zinc-500" />
                        </button>
                    </div>
                </div>

                {/* Change Email Card */}
                <div className="bg-[#0e0e11] border border-zinc-800/50 rounded-xl p-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Mail className="w-5 h-5 text-zinc-400" />
                            <div>
                                <h3 className="text-sm font-semibold text-white">Change email</h3>
                                <p className="text-xs text-zinc-500 mt-0.5">Update your email address with verification</p>
                            </div>
                        </div>
                        <button
                            onClick={() => router.push('/dashboard/settings/security/change-email')}
                            className="text-sm text-blue-500 hover:text-blue-400 transition-colors flex items-center gap-1"
                        >
                            Change
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
