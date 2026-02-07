'use client'

import { useState } from 'react'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import { Mail, Lock, ArrowRight, Loader2, Github } from 'lucide-react'
import Link from 'next/link'
import { getErrorMessage } from '@/lib/errorUtils'

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

                // All users go to /dashboard - sidebar will adjust based on role
                setTimeout(() => {
                    window.location.replace('/dashboard')
                }, 800)
            }
        } catch (error: any) {
            toast.error(getErrorMessage(error, 'Invalid credentials'))
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#09090b] relative overflow-hidden font-sans text-zinc-100">
            {/* Subtle Grid Background */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>

            {/* Radial Gradient Glow */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_800px_at_50%_-30%,#1f293700,transparent)]"></div>

            {/* Decorative Background Elements */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/10 blur-[120px] rounded-full pointer-events-none"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/10 blur-[120px] rounded-full pointer-events-none"></div>

            <div className="w-full max-w-[440px] mx-4 relative z-10 transition-none">
                <div className="bg-zinc-900/40 border border-zinc-800/50 backdrop-blur-xl rounded-[1.5rem] sm:rounded-[2.5rem] shadow-[0_0_50px_-12px_rgba(0,0,0,0.5)] overflow-hidden min-h-[500px] sm:min-h-[600px] flex flex-col justify-center">
                    <div className="animate-push-slide-in-left p-6 sm:p-8 md:p-12">
                        {/* Brand */}
                        <div className="flex flex-col items-center mb-6 sm:mb-8">
                            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-black rounded-xl sm:rounded-2xl border border-zinc-800 flex items-center justify-center mb-4 sm:mb-6 shadow-2xl overflow-hidden ring-1 ring-zinc-700/50">
                                <img src="/sendr-logo.png" alt="Sendr" className="w-7 h-7 sm:w-10 sm:h-10 object-contain" />
                            </div>
                            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">Welcome back</h1>
                            <p className="text-zinc-500 text-xs sm:text-sm mt-2 text-center opacity-80 font-medium">Enter your credentials to access your workspace</p>
                        </div>

                        {/* Form Content */}
                        <form onSubmit={handleLogin} className="space-y-5">
                            <div className="space-y-5">
                                {/* Email Input */}
                                <div className="space-y-2">
                                    <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 ml-1">Email Address</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                            <Mail className="h-4 w-4 text-zinc-500 group-focus-within:text-blue-400 transition-colors" />
                                        </div>
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            required
                                            className="block w-full pl-11 pr-4 py-3 bg-zinc-950/50 border border-zinc-800/80 rounded-xl text-sm text-zinc-100 placeholder-zinc-700 focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                                            placeholder="name@example.com"
                                        />
                                    </div>
                                </div>

                                {/* Password Input */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between ml-1">
                                        <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Password</label>
                                        <Link href="/forgot-password" prefetch={false} className="text-[10px] font-medium text-zinc-500 hover:text-white transition-colors">
                                            Forgot?
                                        </Link>
                                    </div>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                            <Lock className="h-4 w-4 text-zinc-500 group-focus-within:text-blue-400 transition-colors" />
                                        </div>
                                        <input
                                            type="password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            required
                                            className="block w-full pl-11 pr-4 py-3 bg-zinc-950/50 border border-zinc-800/80 rounded-xl text-sm text-zinc-100 placeholder-zinc-700 focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                                            placeholder="••••••••"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="pt-2">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full flex items-center justify-center gap-2 bg-white text-black hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed py-3 rounded-xl text-sm font-bold transition-all shadow-lg hover:shadow-white/10"
                                >
                                    {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                                    {loading ? 'Signing in...' : 'Sign In'}
                                </button>
                            </div>

                        </form>
                    </div>
                </div>
            </div>
        </div>
    )
}
