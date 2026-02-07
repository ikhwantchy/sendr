'use client'

import { motion } from 'framer-motion'
import {
    ArrowUpRight,
    Robot,
    CalendarCheck,
    ChatsCircle,
    Gear,
    ShieldCheck,
    Users,
    Lightning
} from '@phosphor-icons/react'

const WHATSAPP_LINK = 'https://wa.me/628561942069'

export default function LandingPage() {
    return (
        <div className="min-h-screen bg-[#0c0c0c] text-white overflow-hidden">
            {/* Grid Background */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute inset-0 bg-[#0a0a0a]" />
                <div
                    className="absolute inset-0 opacity-[0.4]"
                    style={{
                        backgroundImage: `linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)`,
                        backgroundSize: '64px 64px'
                    }}
                />
            </div>

            {/* Hero Section */}
            <section className="relative z-10 px-4 sm:px-6 lg:px-12 pt-12 sm:pt-16 lg:pt-24 pb-12 sm:pb-20 max-w-[1400px] mx-auto">
                <div className="grid lg:grid-cols-2 gap-8 lg:gap-8 items-start">
                    {/* Left: Text Content */}
                    <div className="max-w-xl">
                        {/* Badge */}
                        <motion.a
                            href={WHATSAPP_LINK}
                            target="_blank"
                            rel="noopener noreferrer"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4 }}
                            className="inline-flex items-center gap-1.5 text-[12px] sm:text-[13px] text-zinc-300 hover:text-white transition-colors mb-6 sm:mb-8"
                        >
                            <span className="text-cyan-400">●</span>
                            Sending with Sendr
                            <ArrowUpRight weight="bold" className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                        </motion.a>

                        {/* Headline */}
                        <motion.h1
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.1 }}
                            className="text-[32px] sm:text-[42px] lg:text-[58px] font-semibold leading-[1.1] tracking-[-0.02em] mb-4 sm:mb-6"
                        >
                            A simpler way to automate conversations.
                        </motion.h1>

                        {/* Description */}
                        <motion.p
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.2 }}
                            className="text-[14px] sm:text-[15px] text-zinc-300 leading-relaxed mb-8 sm:mb-10 max-w-md"
                        >
                            Handle replies, reminders, and broadcasts without turning messages into noise.
                        </motion.p>

                        {/* CTA Button */}
                        <motion.div
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.3 }}
                        >
                            <a
                                href={WHATSAPP_LINK}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-between w-full sm:w-[180px] px-5 py-3.5 bg-[#141414] border border-zinc-800 rounded-[4px] hover:border-zinc-600 hover:bg-zinc-800/50 transition-all group"
                            >
                                <span className="text-[14px] text-white font-medium">Chat with us</span>
                                <ArrowUpRight weight="bold" className="w-4 h-4 text-zinc-500 group-hover:text-white transition-colors" />
                            </a>
                        </motion.div>
                    </div>

                    {/* Right: Mockup/Visual */}
                    <motion.div
                        initial={{ opacity: 0, x: 30 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.7, delay: 0.2 }}
                        className="relative mt-4 lg:mt-8 hidden sm:block"
                    >
                        <div className="relative">
                            <div className="relative bg-gradient-to-br from-zinc-800 to-zinc-900 rounded-xl p-1 shadow-2xl shadow-black/50">
                                <div className="bg-[#111] rounded-lg overflow-hidden">
                                    <div className="flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-3 bg-zinc-900/80 border-b border-zinc-800">
                                        <div className="flex gap-1 sm:gap-1.5">
                                            <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-zinc-700" />
                                            <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-zinc-700" />
                                            <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-zinc-700" />
                                        </div>
                                        <div className="flex-1 flex justify-center">
                                            <div className="px-3 sm:px-4 py-1 bg-zinc-800 rounded text-[10px] sm:text-[11px] text-zinc-300">
                                                sendr.web.id
                                            </div>
                                        </div>
                                    </div>
                                    <div className="aspect-[16/10] bg-gradient-to-br from-[#0a0a0a] to-[#111] p-4 sm:p-8 flex flex-col items-center justify-center">
                                        <div className="text-center">
                                            <h2 className="text-xl sm:text-3xl lg:text-4xl font-bold text-white mb-1 sm:mb-2 tracking-tight">
                                                SENDING WITH
                                            </h2>
                                            <h2 className="text-xl sm:text-3xl lg:text-4xl font-bold text-white tracking-tight">
                                                SENDR.
                                            </h2>
                                            <p className="text-zinc-400 text-xs sm:text-sm mt-2 sm:mt-4 italic">
                                                Automate anything you can imagine.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="absolute -inset-4 sm:-inset-8 bg-gradient-to-r from-cyan-500/20 via-blue-500/10 to-transparent rounded-3xl blur-3xl -z-10" />
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* Features Icons Section */}
            <section className="relative z-10 px-4 sm:px-6 lg:px-12 py-12 sm:py-20 max-w-[1400px] mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                    className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4"
                >
                    {[
                        { icon: Robot, label: 'Auto Replies' },
                        { icon: CalendarCheck, label: 'Scheduling' },
                        { icon: ChatsCircle, label: 'Multi-chat' },
                        { icon: Lightning, label: 'Fast Setup' },
                        { icon: ShieldCheck, label: 'Secure' },
                        { icon: Gear, label: 'Customizable' },
                    ].map((item, i) => (
                        <div
                            key={i}
                            className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 bg-zinc-900/50 border border-zinc-800/50 rounded-lg"
                        >
                            <item.icon weight="regular" className="w-4 h-4 sm:w-5 sm:h-5 text-zinc-400 flex-shrink-0" />
                            <span className="text-[11px] sm:text-[13px] text-zinc-300 font-medium">{item.label}</span>
                        </div>
                    ))}
                </motion.div>
            </section>

            {/* Three Cards Section */}
            <section id="use-cases" className="relative z-10 px-4 sm:px-6 lg:px-12 py-12 sm:py-16 max-w-[1400px] mx-auto">
                <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
                    {[
                        {
                            num: '01',
                            title: 'For Business',
                            desc: 'Send promotions, updates, and announcements to your customers — without doing it one by one.'
                        },
                        {
                            num: '02',
                            title: 'For Personal Use',
                            desc: "Handle reminders, quick replies, and small routines you don't want to manage manually."
                        },
                        {
                            num: '03',
                            title: 'For Study & Classes',
                            desc: 'Create schedules, manage classes, and send updates to students — automatically.'
                        }
                    ].map((item, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: i * 0.1 }}
                            className="p-4 sm:p-6 border-t border-zinc-800"
                        >
                            <span className="text-[11px] sm:text-[12px] text-zinc-400 font-mono">{item.num}</span>
                            <h3 className="text-[18px] sm:text-[20px] font-semibold text-white mt-4 sm:mt-6 mb-2 sm:mb-3">{item.title}</h3>
                            <p className="text-[13px] sm:text-[14px] text-zinc-400 leading-relaxed">{item.desc}</p>
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* Features Grid */}
            <section id="features" className="relative z-10 px-4 sm:px-6 lg:px-12 py-16 sm:py-24 max-w-[1400px] mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5 }}
                    className="mb-8 sm:mb-12"
                >
                    <h2 className="text-[24px] sm:text-[28px] lg:text-[32px] font-semibold tracking-[-0.01em] mb-4">
                        Tools to handle messages, simply and intentionally.
                    </h2>
                </motion.div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                    {[
                        {
                            icon: Robot,
                            title: 'AI-Powered Replies',
                            desc: 'Natural replies, handled automatically.'
                        },
                        {
                            icon: CalendarCheck,
                            title: 'Scheduled Messages',
                            desc: 'Messages sent on your schedule.'
                        },
                        {
                            icon: ChatsCircle,
                            title: 'Multi-Account',
                            desc: 'Multiple accounts, one view.'
                        },
                        {
                            icon: Users,
                            title: 'Work Together',
                            desc: 'Controlled access, when needed.'
                        },
                    ].map((item, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.4, delay: i * 0.05 }}
                            className="p-4 sm:p-6 bg-zinc-900/30 border border-zinc-800/50 rounded-lg hover:border-zinc-700/50 transition-colors"
                        >
                            <item.icon weight="regular" className="w-5 h-5 sm:w-6 sm:h-6 text-zinc-400 mb-3 sm:mb-4" />
                            <h3 className="text-[13px] sm:text-[15px] font-semibold text-white mb-1 sm:mb-2">{item.title}</h3>
                            <p className="text-[11px] sm:text-[13px] text-zinc-400 leading-relaxed">{item.desc}</p>
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* Final CTA */}
            <section className="relative z-10 px-4 sm:px-6 lg:px-12 py-20 sm:py-32 max-w-[1400px] mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5 }}
                    className="text-center"
                >
                    <p className="text-zinc-500 text-[12px] sm:text-[13px] mb-3 sm:mb-4">Ready to automate?</p>
                    <h2 className="text-[28px] sm:text-[32px] lg:text-[40px] font-semibold tracking-[-0.02em]">
                        Let&apos;s get you started.
                    </h2>
                </motion.div>
            </section>

            {/* Footer */}
            <footer className="relative z-10 px-6 lg:px-12 py-8">
                <div className="max-w-[1400px] mx-auto flex justify-center">
                    <p className="text-zinc-500 text-[12px]">
                        © 2026 sendr.web.id
                    </p>
                </div>
            </footer>
        </div>
    )
}
