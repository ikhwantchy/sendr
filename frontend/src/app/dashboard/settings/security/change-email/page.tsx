'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Mail, Loader2, CheckCircle2, XCircle } from 'lucide-react';

export default function ChangeEmailPage() {
    const router = useRouter();
    const [step, setStep] = useState<'input' | 'verify'>('input');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const [newEmail, setNewEmail] = useState('');
    const [password, setPassword] = useState('');
    const [oldEmailOtp, setOldEmailOtp] = useState('');
    const [newEmailOtp, setNewEmailOtp] = useState('');

    const handleRequestOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/profile/email/request-change`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    newEmail,
                    password
                })
            });

            const data = await res.json();

            if (data.success) {
                setMessage({
                    type: 'success',
                    text: 'OTP codes sent to both email addresses. Please check your inbox.'
                });
                setStep('verify');
            } else {
                setMessage({ type: 'error', text: data.message || 'Failed to send OTP' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'An error occurred. Please try again.' });
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyAndChange = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/profile/email/verify-change`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    newEmail,
                    oldEmailOtp,
                    newEmailOtp
                })
            });

            const data = await res.json();

            if (data.success) {
                setMessage({ type: 'success', text: 'Email changed successfully!' });
                setTimeout(() => {
                    router.push('/dashboard/settings/security');
                }, 2000);
            } else {
                setMessage({ type: 'error', text: data.message || 'Invalid OTP codes' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'An error occurred. Please try again.' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#09090b] p-8">
            <div className="max-w-2xl mx-auto">
                {/* Back Button */}
                <button
                    onClick={() => router.push('/dashboard/settings/security')}
                    className="flex items-center gap-2 text-zinc-400 hover:text-zinc-100 mb-6 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    <span className="text-sm">Back to Security</span>
                </button>

                {/* Header */}
                <div className="mb-8">
                    <h2 className="text-lg font-semibold text-white mb-1">Change email address</h2>
                    <p className="text-sm text-zinc-500">Update your email with two-step verification</p>
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

                {/* Main Card */}
                <div className="bg-[#0e0e11] border border-zinc-800/50 rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <Mail className="w-5 h-5 text-zinc-400" />
                        <div>
                            <h3 className="text-sm font-semibold text-white">
                                {step === 'input' ? 'Step 1: Enter new email' : 'Step 2: Verify with OTP'}
                            </h3>
                            <p className="text-xs text-zinc-500 mt-0.5">
                                {step === 'input'
                                    ? 'We will send verification codes to both email addresses'
                                    : 'Enter the OTP codes sent to your email addresses'}
                            </p>
                        </div>
                    </div>

                    {step === 'input' ? (
                        <form onSubmit={handleRequestOtp} className="space-y-4">
                            <div>
                                <label className="block text-xs text-zinc-400 mb-2">New email address</label>
                                <input
                                    type="email"
                                    value={newEmail}
                                    onChange={(e) => setNewEmail(e.target.value)}
                                    required
                                    className="w-full px-3 py-2 bg-zinc-900/50 border border-zinc-800 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    placeholder="newemail@example.com"
                                />
                            </div>

                            <div>
                                <label className="block text-xs text-zinc-400 mb-2">Confirm your password</label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    className="w-full px-3 py-2 bg-zinc-900/50 border border-zinc-800 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    placeholder="••••••••"
                                />
                                <p className="text-[10px] text-zinc-500 mt-1.5">
                                    Enter your current password to verify it's you
                                </p>
                            </div>

                            <div className="pt-2">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
                                >
                                    {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                                    {loading ? 'Sending OTP...' : 'Send verification codes'}
                                </button>
                            </div>
                        </form>
                    ) : (
                        <form onSubmit={handleVerifyAndChange} className="space-y-4">
                            <div>
                                <label className="block text-xs text-zinc-400 mb-2">OTP from current email</label>
                                <input
                                    type="text"
                                    value={oldEmailOtp}
                                    onChange={(e) => setOldEmailOtp(e.target.value)}
                                    required
                                    maxLength={6}
                                    className="w-full px-3 py-2 bg-zinc-900/50 border border-zinc-800 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono tracking-wider"
                                    placeholder="000000"
                                />
                                <p className="text-[10px] text-zinc-500 mt-1.5">
                                    Check your current email inbox
                                </p>
                            </div>

                            <div>
                                <label className="block text-xs text-zinc-400 mb-2">OTP from new email</label>
                                <input
                                    type="text"
                                    value={newEmailOtp}
                                    onChange={(e) => setNewEmailOtp(e.target.value)}
                                    required
                                    maxLength={6}
                                    className="w-full px-3 py-2 bg-zinc-900/50 border border-zinc-800 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono tracking-wider"
                                    placeholder="000000"
                                />
                                <p className="text-[10px] text-zinc-500 mt-1.5">
                                    Check {newEmail} inbox
                                </p>
                            </div>

                            <div className="pt-2 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setStep('input')}
                                    className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-medium rounded-lg transition-colors"
                                >
                                    Back
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
                                >
                                    {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                                    {loading ? 'Verifying...' : 'Verify and change email'}
                                </button>
                            </div>
                        </form>
                    )}
                </div>

                {/* Security Notice */}
                <div className="mt-6 p-4 bg-blue-900/10 border border-blue-800/30 rounded-lg">
                    <div className="flex gap-3">
                        <div className="text-blue-400 mt-0.5">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div>
                            <h4 className="text-sm font-medium text-blue-300 mb-1">Security Notice</h4>
                            <p className="text-xs text-blue-400/80 leading-relaxed">
                                For your security, we will send verification codes to both your current and new email addresses.
                                You must verify both to complete the email change. This ensures that only you can change your account email.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
