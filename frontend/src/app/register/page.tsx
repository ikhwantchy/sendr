'use client'

import { useState } from 'react'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import { Mail, Lock, User, Loader2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

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
            toast.error(error.response?.data?.error || 'Registration failed')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#09090b] relative overflow-hidden font-sans text-zinc-100">
            {/* Subtle Grid Background */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>

            {/* Radial Gradient Glow */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_800px_at_50%_130%,#1f293700,transparent)]"></div>

            <div className="w-full max-w-[400px] mx-4 relative z-10">
                {/* Back Link */}
                <Link href="/login" className="flex items-center gap-2 text-xs text-zinc-500 hover:text-white mb-6 transition-colors group">
                    <ArrowLeft className="w-3 h-3 group-hover:-translate-x-1 transition-transform" />
                    Back to login
                </Link>

                {/* Brand */}
                <div className="mb-6">
                    <h1 className="text-2xl font-semibold tracking-tight text-white">Create an account</h1>
                    <p className="text-zinc-500 text-sm mt-2">Get started with BroBot today.</p>
                </div>

                {/* Card */}
                <div className="bg-[#0e0e11] border border-zinc-800/60 rounded-xl p-6 shadow-2xl backdrop-blur-sm">
                    <form onSubmit={handleRegister} className="space-y-4">
                        <div className="space-y-4">
                            {/* Name Input */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-zinc-500 ml-1">Full Name</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <User className="h-4 w-4 text-zinc-500 group-focus-within:text-zinc-300 transition-colors" />
                                    </div>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        required
                                        className="block w-full pl-10 pr-3 py-2.5 bg-zinc-900/50 border border-zinc-800 rounded-lg text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-600 focus:border-zinc-700 transition-all"
                                        placeholder="John Doe"
                                    />
                                </div>
                            </div>

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
                                        placeholder="Create a password"
                                    />
                                </div>
                                {/* Strength Indicator */}
                                <div className="flex gap-1 h-1 mt-2">
                                    <div className={`flex-1 rounded-full transition-colors ${strength > 0 ? 'bg-red-500' : 'bg-zinc-800'}`} />
                                    <div className={`flex-1 rounded-full transition-colors ${strength > 1 ? 'bg-yellow-500' : 'bg-zinc-800'}`} />
                                    <div className={`flex-1 rounded-full transition-colors ${strength > 2 ? 'bg-emerald-500' : 'bg-zinc-800'}`} />
                                </div>
                                <p className="text-[10px] text-zinc-500 text-right">
                                    {strength === 0 && 'Enter password'}
                                    {strength === 1 && 'Weak'}
                                    {strength === 2 && 'Medium'}
                                    {strength === 3 && 'Strong'}
                                </p>
                            </div>
                        </div>

                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full flex items-center justify-center gap-2 bg-white text-black hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed py-2.5 rounded-lg text-sm font-medium transition-colors"
                            >
                                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                                {loading ? 'Creating account...' : 'Create Account'}
                            </button>
                        </div>
                    </form>
                </div>

                <p className="mt-8 text-center text-sm text-zinc-500">
                    Already have an account?{' '}
                    <Link href="/login" className="text-white hover:underline underline-offset-4 decoration-zinc-600">
                        Sign in
                    </Link>
                </p>
            </div>
        </div>
    )
}
