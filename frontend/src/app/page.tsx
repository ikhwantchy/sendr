'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { 
    Lightning, 
    Robot, 
    ChartLineUp, 
    ShieldCheck, 
    WhatsappLogo,
    ArrowRight,
    Sparkle,
    Users,
    Clock,
    ChatCircleDots,
    Broadcast,
    CalendarCheck
} from '@phosphor-icons/react'

export default function LandingPage() {
    return (
        <div className="min-h-screen bg-[#0a0a0f] text-white overflow-hidden">
            {/* Background Gradient Effects */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-gradient-to-b from-indigo-600/20 via-purple-600/10 to-transparent rounded-full blur-3xl" />
                <div className="absolute top-20 left-1/4 w-[400px] h-[400px] bg-blue-600/10 rounded-full blur-3xl" />
                <div className="absolute top-40 right-1/4 w-[300px] h-[300px] bg-violet-600/10 rounded-full blur-3xl" />
            </div>

            {/* Navigation */}
            <nav className="relative z-50 flex items-center justify-between px-6 lg:px-12 py-5 max-w-7xl mx-auto">
                <div className="flex items-center gap-8">
                    <Link href="/" className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-lime-400 to-green-500 flex items-center justify-center">
                            <WhatsappLogo weight="fill" className="w-5 h-5 text-black" />
                        </div>
                        <span className="text-xl font-semibold tracking-tight">Sendr</span>
                    </Link>
                    <div className="hidden md:flex items-center gap-6 text-sm text-zinc-400">
                        <Link href="#features" className="hover:text-white transition-colors">Features</Link>
                        <Link href="#pricing" className="hover:text-white transition-colors">Pricing</Link>
                        <Link href="#docs" className="hover:text-white transition-colors">Docs</Link>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <Link href="/login" className="text-sm text-zinc-400 hover:text-white transition-colors">
                        Sign In
                    </Link>
                    <Link 
                        href="/login" 
                        className="hidden sm:flex items-center gap-2 px-4 py-2 bg-lime-400 hover:bg-lime-300 text-black text-sm font-medium rounded-full transition-colors"
                    >
                        Get Started
                        <ArrowRight weight="bold" className="w-4 h-4" />
                    </Link>
                </div>
            </nav>

            {/* Hero Section */}
            <main className="relative z-10 px-6 lg:px-12 pt-16 pb-24 max-w-7xl mx-auto">
                {/* Badge */}
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="flex justify-center mb-8"
                >
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-full text-sm">
                        <Sparkle weight="fill" className="w-4 h-4 text-lime-400" />
                        <span className="text-zinc-300">AI-Powered Automation</span>
                    </div>
                </motion.div>

                {/* Main Headline */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.1 }}
                    className="text-center mb-6"
                >
                    <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-semibold tracking-tight leading-[1.1]">
                        <span className="text-white">Unlock the </span>
                        <span className="inline-flex items-center gap-2">
                            <Lightning weight="fill" className="w-10 h-10 lg:w-14 lg:h-14 text-lime-400" />
                            <span className="bg-gradient-to-r from-lime-300 to-green-400 bg-clip-text text-transparent">Future</span>
                        </span>
                        <span className="text-white"> of</span>
                        <br />
                        <span className="text-white">WhatsApp with </span>
                        <span className="inline-flex items-center gap-2">
                            <span className="text-lime-400">::</span>
                            <span className="bg-gradient-to-r from-lime-300 to-green-400 bg-clip-text text-transparent">Sendr</span>
                        </span>
                    </h1>
                </motion.div>

                {/* Subtitle */}
                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    className="text-center text-zinc-400 text-base sm:text-lg lg:text-xl max-w-2xl mx-auto mb-10 leading-relaxed"
                >
                    Experience powerful, AI-driven WhatsApp automation. 
                    Manage campaigns, auto-replies, and smart bots anytime, anywhere.
                </motion.p>

                {/* CTA Buttons */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.3 }}
                    className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20"
                >
                    <Link 
                        href="/login"
                        className="flex items-center gap-2 px-6 py-3 bg-lime-400 hover:bg-lime-300 text-black font-medium rounded-full transition-all hover:scale-105"
                    >
                        Start Free Trial
                        <ArrowRight weight="bold" className="w-5 h-5" />
                    </Link>
                    <Link 
                        href="#features"
                        className="flex items-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium rounded-full transition-all"
                    >
                        Learn More
                        <ArrowRight weight="bold" className="w-5 h-5" />
                    </Link>
                </motion.div>

                {/* Feature Cards */}
                <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7, delay: 0.4 }}
                    className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6"
                >
                    {/* Card 1 - AI Bot */}
                    <div className="group relative p-6 bg-gradient-to-b from-white/[0.08] to-white/[0.02] border border-white/10 rounded-2xl hover:border-lime-400/30 transition-all duration-300">
                        <div className="flex items-start justify-between mb-4">
                            <div>
                                <h3 className="text-white font-medium mb-1">AI Assistant</h3>
                                <p className="text-zinc-500 text-sm">Smart auto-replies</p>
                            </div>
                            <div className="p-2 bg-lime-400/10 rounded-lg">
                                <Robot weight="duotone" className="w-6 h-6 text-lime-400" />
                            </div>
                        </div>
                        <div className="space-y-3">
                            <div className="flex items-center gap-3">
                                <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                                    <div className="h-full w-[85%] bg-gradient-to-r from-lime-400 to-green-500 rounded-full" />
                                </div>
                                <span className="text-sm text-zinc-400">85%</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                                    <div className="h-full w-[92%] bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full" />
                                </div>
                                <span className="text-sm text-zinc-400">92%</span>
                            </div>
                        </div>
                    </div>

                    {/* Card 2 - Campaigns */}
                    <div className="group relative p-6 bg-gradient-to-b from-white/[0.08] to-white/[0.02] border border-white/10 rounded-2xl hover:border-lime-400/30 transition-all duration-300">
                        <div className="flex items-start justify-between mb-4">
                            <div>
                                <h3 className="text-white font-medium mb-1">Bulk Campaigns</h3>
                                <p className="text-zinc-500 text-sm">Mass messaging</p>
                            </div>
                        </div>
                        <div className="flex items-center justify-center py-4">
                            <div className="relative">
                                <Broadcast weight="duotone" className="w-16 h-16 text-indigo-400" />
                                <div className="absolute -top-1 -right-1 w-4 h-4 bg-lime-400 rounded-full flex items-center justify-center">
                                    <span className="text-[10px] text-black font-bold">✓</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-zinc-500">Sent</span>
                            <span className="text-zinc-500">Delivered</span>
                            <span className="text-zinc-500">Read</span>
                        </div>
                        <div className="flex items-center justify-between text-sm font-medium mt-1">
                            <span className="text-white">1,535</span>
                            <span className="text-lime-400">1,498</span>
                            <span className="text-blue-400">892</span>
                        </div>
                    </div>

                    {/* Card 3 - Analytics */}
                    <div className="group relative p-6 bg-gradient-to-b from-white/[0.08] to-white/[0.02] border border-white/10 rounded-2xl hover:border-lime-400/30 transition-all duration-300">
                        <div className="flex items-start justify-between mb-4">
                            <div>
                                <h3 className="text-white font-medium mb-1">Real-time Analytics</h3>
                                <p className="text-zinc-500 text-sm">Track performance</p>
                            </div>
                            <span className="text-xs text-zinc-500">Today</span>
                        </div>
                        <div className="flex items-end justify-between h-20 gap-1">
                            {[40, 65, 45, 80, 55, 90, 70, 85, 60, 75].map((height, i) => (
                                <div key={i} className="flex-1 bg-gradient-to-t from-lime-400/20 to-lime-400/60 rounded-sm" style={{ height: `${height}%` }} />
                            ))}
                        </div>
                        <div className="flex items-center justify-between mt-4">
                            <span className="text-2xl font-semibold text-white">2,847</span>
                            <span className="text-xs text-lime-400 bg-lime-400/10 px-2 py-1 rounded-full">+12.5%</span>
                        </div>
                    </div>
                </motion.div>

                {/* Social Proof */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.6, delay: 0.6 }}
                    className="flex flex-col sm:flex-row items-center justify-between mt-12 pt-8 border-t border-white/5"
                >
                    <div className="flex items-center gap-3 mb-4 sm:mb-0">
                        <div className="flex -space-x-2">
                            {[1, 2, 3, 4].map((i) => (
                                <div 
                                    key={i} 
                                    className="w-8 h-8 rounded-full bg-gradient-to-br from-zinc-700 to-zinc-800 border-2 border-[#0a0a0f] flex items-center justify-center"
                                >
                                    <Users weight="fill" className="w-4 h-4 text-zinc-400" />
                                </div>
                            ))}
                        </div>
                        <div>
                            <span className="text-lime-400 font-semibold">500+</span>
                            <span className="text-zinc-500 text-sm ml-1">businesses trust Sendr</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-6">
                        <Link 
                            href="/login"
                            className="text-sm text-zinc-400 hover:text-white transition-colors px-4 py-2 rounded-full border border-transparent hover:border-white/10"
                        >
                            Personal
                        </Link>
                        <Link 
                            href="/login"
                            className="text-sm text-black bg-lime-400 hover:bg-lime-300 px-4 py-2 rounded-full font-medium transition-colors"
                        >
                            Business
                        </Link>
                    </div>
                </motion.div>
            </main>

            {/* Features Section */}
            <section id="features" className="relative z-10 px-6 lg:px-12 py-24 max-w-7xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                    className="text-center mb-16"
                >
                    <h2 className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight mb-4">
                        Everything you need to
                        <br />
                        <span className="bg-gradient-to-r from-lime-300 to-green-400 bg-clip-text text-transparent">automate WhatsApp</span>
                    </h2>
                    <p className="text-zinc-400 text-lg max-w-xl mx-auto">
                        Powerful features designed for modern businesses
                    </p>
                </motion.div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[
                        { icon: Robot, title: 'AI-Powered Replies', desc: 'Smart responses using advanced AI models like Gemini & GPT' },
                        { icon: Broadcast, title: 'Bulk Campaigns', desc: 'Send personalized messages to thousands with anti-spam protection' },
                        { icon: CalendarCheck, title: 'Smart Reminders', desc: 'Schedule recurring messages with template variables' },
                        { icon: ChatCircleDots, title: 'Auto-Reply Rules', desc: 'Keyword-based triggers with regex support' },
                        { icon: ChartLineUp, title: 'Analytics Dashboard', desc: 'Track message delivery, read rates, and engagement' },
                        { icon: ShieldCheck, title: 'Enterprise Security', desc: 'Multi-tenant, role-based access with audit logs' },
                    ].map((feature, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: i * 0.1 }}
                            className="p-6 bg-white/[0.03] border border-white/5 rounded-2xl hover:border-lime-400/20 transition-all duration-300 group"
                        >
                            <div className="w-12 h-12 bg-lime-400/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-lime-400/20 transition-colors">
                                <feature.icon weight="duotone" className="w-6 h-6 text-lime-400" />
                            </div>
                            <h3 className="text-lg font-medium text-white mb-2">{feature.title}</h3>
                            <p className="text-zinc-500 text-sm leading-relaxed">{feature.desc}</p>
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* CTA Section */}
            <section className="relative z-10 px-6 lg:px-12 py-24 max-w-7xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                    className="relative p-12 bg-gradient-to-b from-white/[0.08] to-white/[0.02] border border-white/10 rounded-3xl text-center overflow-hidden"
                >
                    <div className="absolute inset-0 bg-gradient-to-r from-lime-400/5 via-transparent to-lime-400/5" />
                    <div className="relative z-10">
                        <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight mb-4">
                            Ready to transform your
                            <br />
                            <span className="bg-gradient-to-r from-lime-300 to-green-400 bg-clip-text text-transparent">WhatsApp communication?</span>
                        </h2>
                        <p className="text-zinc-400 text-lg mb-8 max-w-lg mx-auto">
                            Start your free trial today. No credit card required.
                        </p>
                        <Link 
                            href="/login"
                            className="inline-flex items-center gap-2 px-8 py-4 bg-lime-400 hover:bg-lime-300 text-black font-medium rounded-full transition-all hover:scale-105"
                        >
                            Get Started Now
                            <ArrowRight weight="bold" className="w-5 h-5" />
                        </Link>
                    </div>
                </motion.div>
            </section>

            {/* Footer */}
            <footer className="relative z-10 px-6 lg:px-12 py-12 border-t border-white/5">
                <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-lime-400 to-green-500 flex items-center justify-center">
                            <WhatsappLogo weight="fill" className="w-4 h-4 text-black" />
                        </div>
                        <span className="text-lg font-semibold tracking-tight">Sendr</span>
                    </div>
                    <p className="text-zinc-500 text-sm">
                        © {new Date().getFullYear()} Sendr. All rights reserved.
                    </p>
                    <div className="flex items-center gap-6 text-sm text-zinc-500">
                        <Link href="#" className="hover:text-white transition-colors">Privacy</Link>
                        <Link href="#" className="hover:text-white transition-colors">Terms</Link>
                        <Link href="#" className="hover:text-white transition-colors">Contact</Link>
                    </div>
                </div>
            </footer>
        </div>
    )
}
