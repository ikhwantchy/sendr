'use client'

import { useState } from 'react'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import { Mail, Lock, User, Loader2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { getErrorMessage } from '@/lib/errorUtils'

export default function RegisterPage() {
    const router = useRouter()
    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)

    // Password Strength Logic
    const getStrength = (pass: string) => {
        let score = 0
        if (!pass) return 0
        if (pass.length > 5) score += 1
        if (pass.length > 7) score += 1
        if (/[A-Z]/.test(pass) && /[0-9]/.test(pass)) score += 1
        return score
    }

    const strength = getStrength(password)

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            // Mock API call or real one if exists
            // const response = await api.auth.register(name, email, password)

            // Simulating success for now if API endpoint uncertain
            await new Promise(r => setTimeout(r, 1000))

            toast.success('Account created! Please sign in.')
            router.push('/login')

        } catch (error: any) {
            toast.error(getErrorMessage(error, 'Registration failed'))
        } finally {
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
                <div className="bg-zinc-900/40 border border-zinc-800/50 backdrop-blur-xl rounded-[2.5rem] shadow-[0_0_50px_-12px_rgba(0,0,0,0.5)] overflow-hidden h-[700px] flex flex-col justify-center">
                    <div className="animate-push-slide-in-right p-8 md:p-12">
                        {/* Back Link */}
                        <div className="mb-6">
                            <Link href="/login" className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-zinc-500 hover:text-white transition-colors group">
                                <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
                                Back to login
                            </Link>
                        </div>

                        {/* Brand/Header */}
                        <div className="mb-8">
                            <h1 className="text-2xl font-bold tracking-tight text-white font-sans">Create Account</h1>
                            <p className="text-zinc-500 text-sm mt-2 opacity-80 font-medium">Join BroBot and automate your workspace.</p>
                        </div>

                        {/* Form Card Content */}
                        <form onSubmit={handleRegister} className="space-y-5">
                            <div className="space-y-5">
                                {/* Name Input */}
                                <div className="space-y-2">
                                    <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 ml-1">Full Name</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                            <User className="h-4 w-4 text-zinc-500 group-focus-within:text-blue-400 transition-colors" />
                                        </div>
                                        <input
                                            type="text"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            required
                                            className="block w-full pl-11 pr-4 py-3 bg-zinc-950/50 border border-zinc-800/80 rounded-xl text-sm text-zinc-100 placeholder-zinc-700 focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                                            placeholder="John Doe"
                                        />
                                    </div>
                                </div>

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
                                    <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 ml-1">Password</label>
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
                                            placeholder="Min. 8 characters"
                                        />
                                    </div>
                                    {/* Strength Indicator */}
                                    <div className="flex gap-1.5 h-1 mt-3 px-1">
                                        <div className={`flex-1 rounded-full transition-all duration-500 ${strength > 0 ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]' : 'bg-zinc-800'}`} />
                                        <div className={`flex-1 rounded-full transition-all duration-500 ${strength > 1 ? 'bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.4)]' : 'bg-zinc-800'}`} />
                                        <div className={`flex-1 rounded-full transition-all duration-500 ${strength > 2 ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 'bg-zinc-800'}`} />
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full flex items-center justify-center gap-2 bg-white text-black hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed py-3 rounded-xl text-sm font-bold transition-all shadow-lg hover:shadow-white/10"
                                >
                                    {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                                    {loading ? 'Creating...' : 'Create Account'}
                                </button>
                            </div>
                        </form>

                        <p className="mt-10 text-center text-xs text-zinc-500 font-medium">
                            Already have an account?{' '}
                            <Link href="/login" className="text-white hover:text-blue-400 font-bold transition-colors">
                                Sign in
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
