'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useMutation } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { toast } from 'sonner'

function InvitationContent() {
    const router = useRouter()
    const searchParams = useSearchParams()

    // Fix: Handle possibly null searchParams
    const token = searchParams ? searchParams.get('token') : null

    const [formData, setFormData] = useState({
        name: '',
        password: '',
        confirmPassword: '',
    })
    const [validating, setValidating] = useState(true)
    const [invitationData, setInvitationData] = useState<any>(null)

    // Validate token on mount
    useEffect(() => {
        if (!token) {
            // Only redirect if we checked and token is missing (checking happens quickly)
            if (searchParams) { // Ensure searchParams loaded
                toast.error('Invalid invitation link')
                router.push('/login')
            }
            return
        }

        // Validate token with backend
        const validateToken = async () => {
            try {
                // Use relative URL or env var in production ideally, but keeping localhost as per original
                const response = await fetch(`http://localhost:3001/api/invitations/validate/${token}`)
                const data = await response.json()

                if (!data.success) {
                    toast.error(data.error || 'Invalid invitation')
                    router.push('/login')
                    return
                }

                setInvitationData(data.data)
                setValidating(false)
            } catch (error) {
                toast.error('Failed to validate invitation')
                router.push('/login')
            }
        }

        validateToken()
    }, [token, router, searchParams])

    const registerMutation = useMutation({
        mutationFn: async (data: any) => {
            const response = await fetch('http://localhost:3001/api/invitations/accept', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    token,
                    name: data.name,
                    password: data.password,
                }),
            })

            const result = await response.json()

            if (!result.success) {
                throw new Error(result.error || 'Failed to create account')
            }

            return result
        },
        onSuccess: (data) => {
            toast.success('Account created successfully!', {
                description: 'You can now login with your credentials',
            })
            router.push('/login')
        },
        onError: (error: any) => {
            toast.error('Failed to create account', {
                description: error.message || 'Please try again',
            })
        },
    })

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()

        if (formData.password !== formData.confirmPassword) {
            toast.error('Passwords do not match')
            return
        }

        if (formData.password.length < 6) {
            toast.error('Password must be at least 6 characters')
            return
        }

        if (!invitationData) return;

        registerMutation.mutate({
            name: formData.name,
            email: invitationData.email,
            password: formData.password,
            role: invitationData.role,
        })
    }

    if (validating && token) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="relative w-16 h-16 mx-auto mb-4">
                        <div className="absolute inset-0 rounded-full border-4 border-cyan-500/20"></div>
                        <div className="absolute inset-0 rounded-full border-4 border-cyan-500 border-t-transparent animate-spin"></div>
                    </div>
                    <p className="text-white text-lg">Validating invitation...</p>
                </div>
            </div>
        )
    }

    // Default loading state handled by Suspense, but if token missing:
    if (!token) {
        return null; // Will redirect in useEffect
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center p-4">
            <div className="glass rounded-2xl max-w-md w-full border border-white/10 p-8">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                        </svg>
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2">Accept Invitation</h1>
                    <p className="text-gray-400">Create your account to get started</p>
                </div>

                {/* Invitation Info */}
                {invitationData && (
                    <div className="glass-strong rounded-xl p-4 mb-6">
                        <div className="flex items-center gap-3 mb-2">
                            <span className="text-gray-400 text-sm">Email:</span>
                            <span className="text-white font-medium">{invitationData.email}</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-gray-400 text-sm">Role:</span>
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${invitationData.role === 'admin'
                                ? 'bg-purple-500/20 text-purple-400'
                                : 'bg-cyan-500/20 text-cyan-400'
                                }`}>
                                {invitationData.role}
                            </span>
                        </div>
                    </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-semibold text-white mb-2">
                            Full Name *
                        </label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="John Doe"
                            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 transition-colors"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-white mb-2">
                            Password *
                        </label>
                        <input
                            type="password"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            placeholder="••••••••"
                            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 transition-colors"
                            required
                            minLength={6}
                        />
                        <p className="text-xs text-gray-400 mt-1">At least 6 characters</p>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-white mb-2">
                            Confirm Password *
                        </label>
                        <input
                            type="password"
                            value={formData.confirmPassword}
                            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                            placeholder="••••••••"
                            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 transition-colors"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={registerMutation.isPending}
                        className="w-full px-6 py-3 bg-gradient-to-r from-cyan-500 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-cyan-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {registerMutation.isPending ? 'Creating Account...' : 'Create Account'}
                    </button>
                </form>

                {/* Footer */}
                <div className="mt-6 text-center">
                    <p className="text-sm text-gray-400">
                        Already have an account?{' '}
                        <button
                            onClick={() => router.push('/login')}
                            className="text-cyan-400 hover:text-cyan-300 font-semibold"
                        >
                            Login
                        </button>
                    </p>
                </div>
            </div>
        </div>
    )
}

export default function AcceptInvitationPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="relative w-16 h-16 mx-auto mb-4">
                        <div className="absolute inset-0 rounded-full border-4 border-cyan-500/20"></div>
                        <div className="absolute inset-0 rounded-full border-4 border-cyan-500 border-t-transparent animate-spin"></div>
                    </div>
                </div>
            </div>
        }>
            <InvitationContent />
        </Suspense>
    )
}
