'use client'

import { useState } from 'react'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import { Mail, Lock, ArrowRight, Loader2, Github } from 'lucide-react'
import Link from 'next/link'

export default function LoginPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const response = await api.auth.login(email, password)

            if (response.data.success) {
                localStorage.setItem('token', response.data.data.token)
                localStorage.setItem('user', JSON.stringify(response.data.data.user))
                toast.success('Welcome back')

                setTimeout(() => {
                    window.location.replace('/dashboard')
                }, 800)
            }
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Invalid credentials')
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#09090b] relative overflow-hidden font-sans text-zinc-100">
            {/* Subtle Grid Background */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>

            {/* Radial Gradient Glow */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_800px_at_50%_-30%,#1f293700,transparent)]"></div>

            <div className="w-full max-w-[400px] mx-4 relative z-10">
                {/* Brand */}
                <div className="flex flex-col items-center mb-8">
                    <div className="w-16 h-16 bg-black rounded-2xl border border-zinc-800 flex items-center justify-center mb-6 shadow-2xl overflow-hidden">
                        <img src="/brobot-logo.png" alt="BroBot" className="w-10 h-10 object-contain" />
                    </div>
                    <h1 className="text-2xl font-semibold tracking-tight text-white">Welcome back</h1>
                    <p className="text-zinc-500 text-sm mt-2">Enter your credentials to access your workspace</p>
                </div>

                {/* Card */}
                <div className="bg-[#0e0e11] border border-zinc-800/60 rounded-xl p-6 shadow-2xl backdrop-blur-sm">
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div className="space-y-4">
                            {/* Email Input */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-zinc-500 ml-1">Email</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Mail className="h-4 w-4 text-zinc-500 group-focus-within:text-zinc-300 transition-colors" />
                                    </div>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        className="block w-full pl-10 pr-3 py-2.5 bg-zinc-900/50 border border-zinc-800 rounded-lg text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-600 focus:border-zinc-700 transition-all"
                                        placeholder="name@example.com"
                                    />
                                </div>
                            </div>

                            {/* Password Input */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-zinc-500 ml-1">Password</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Lock className="h-4 w-4 text-zinc-500 group-focus-within:text-zinc-300 transition-colors" />
                                    </div>
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        className="block w-full pl-10 pr-3 py-2.5 bg-zinc-900/50 border border-zinc-800 rounded-lg text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-600 focus:border-zinc-700 transition-all"
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full flex items-center justify-center gap-2 bg-white text-black hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed py-2.5 rounded-lg text-sm font-medium transition-colors"
                            >
                                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                                {loading ? 'Signing in...' : 'Sign In'}
                            </button>
                        </div>

                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t border-zinc-800" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-[#0e0e11] px-2 text-zinc-600">Or continue with</span>
                            </div>
                        </div>

                        <button
                            type="button"
                            className="w-full flex items-center justify-center gap-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 py-2.5 rounded-lg text-sm font-medium transition-colors"
                        >
                            <svg className="w-4 h-4" viewBox="0 0 24 24">
                                <path
                                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                    fill="#4285F4"
                                />
                                <path
                                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                    fill="#34A853"
                                />
                                <path
                                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                    fill="#FBBC05"
                                />
                                <path
                                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                    fill="#EA4335"
                                />
                            </svg>
                            Google
                        </button>
                    </form>
                </div>

                <p className="mt-8 text-center text-sm text-zinc-500">
                    Don't have an account?{' '}
                    <Link href="/register" className="text-white hover:underline underline-offset-4 decoration-zinc-600">
                        Sign up
                    </Link>
                </p>

                {/* Default Credentials Hint (Dev only) */}
                <div className="mt-8 flex items-center justify-center gap-4 text-xs text-zinc-600 font-mono opacity-50 hover:opacity-100 transition-opacity">
                    <span>admin@example.com</span>
                    <span>•</span>
                    <span>admin123</span>
                </div>
            </div>
        </div>
    )
}
