'use client'

import Image from 'next/image'
import { motion } from 'framer-motion'
import { 
    WhatsappLogo,
    ChatCircle,
    Clock,
    ListChecks,
    Gear,
    LockKey,
    UserCircle,
    Leaf
} from '@phosphor-icons/react'

const WHATSAPP_LINK = 'https://wa.me/628561942069'

export default function LandingPage() {
    return (
        <div className="min-h-screen bg-[#09090b] text-white overflow-hidden">
            {/* Subtle Background Gradient */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px]">
                    <div className="absolute inset-0 bg-gradient-to-b from-zinc-800/30 via-zinc-900/20 to-transparent rounded-full blur-[120px] transform -translate-y-1/2" />
                </div>
            </div>

            {/* Navigation - Minimal */}
            <nav className="relative z-50 flex items-center justify-between px-6 lg:px-16 py-8 max-w-[1000px] mx-auto">
                <div className="flex items-center gap-2.5">
                    <Image 
                        src="/sendr-logo.png" 
                        alt="Sendr" 
                        width={28} 
                        height={28} 
                        className="w-7 h-7"
                    />
                    <span className="text-base font-medium tracking-tight text-zinc-300">Sendr</span>
                </div>
            </nav>

            {/* Hero Section */}
            <main className="relative z-10 px-6 lg:px-16 pt-16 lg:pt-24 pb-0 max-w-[1000px] mx-auto">
                {/* Main Headline */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="text-center mb-6"
                >
                    <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[1]">
                        Sending with Sendr
                    </h1>
                </motion.div>

                {/* Subheadline */}
                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.1 }}
                    className="text-center mb-12"
                >
                    <p className="text-zinc-500 text-lg leading-relaxed max-w-md mx-auto">
                        WhatsApp, automated quietly.
                        <br />
                        For those who prefer calm over chaos.
                    </p>
                </motion.div>

                {/* Primary CTA */}
                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    className="flex justify-center mb-24"
                >
                    <a 
                        href={WHATSAPP_LINK}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2.5 px-6 py-3.5 bg-white text-black text-sm font-medium rounded-full hover:bg-zinc-200 transition-all"
                    >
                        <WhatsappLogo weight="fill" className="w-5 h-5" />
                        Chat with us on WhatsApp
                    </a>
                </motion.div>

                {/* Short Statement */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.6, delay: 0.3 }}
                    className="text-center mb-32"
                >
                    <p className="text-zinc-400 text-base max-w-lg mx-auto leading-relaxed">
                        Sendr handles your WhatsApp messages so you don't have to.
                        <br />
                        Simple automations, running in the background.
                    </p>
                </motion.div>
            </main>

            {/* What Sendr Does Section */}
            <section className="relative z-10 px-6 lg:px-16 py-20 max-w-[1000px] mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5 }}
                    className="mb-12"
                >
                    <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-center">
                        What Sendr does
                    </h2>
                </motion.div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
                    {[
                        { icon: ChatCircle, text: 'Replies to messages when you can\'t' },
                        { icon: Clock, text: 'Sends reminders on your schedule' },
                        { icon: ListChecks, text: 'Keeps conversations organized' },
                        { icon: Gear, text: 'Works while you focus on other things' },
                    ].map((item, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 15 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.4, delay: i * 0.08 }}
                            className="flex items-start gap-4 p-5 bg-zinc-900/40 border border-white/5 rounded-xl"
                        >
                            <item.icon weight="regular" className="w-5 h-5 text-zinc-500 mt-0.5 flex-shrink-0" />
                            <p className="text-zinc-300 text-sm leading-relaxed">{item.text}</p>
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* Why It's Private Section */}
            <section className="relative z-10 px-6 lg:px-16 py-20 max-w-[1000px] mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5 }}
                    className="mb-12"
                >
                    <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-center">
                        Why it's private
                    </h2>
                </motion.div>

                <div className="flex flex-col gap-4 max-w-md mx-auto">
                    {[
                        { icon: LockKey, text: 'No public sign up. Invite only.' },
                        { icon: UserCircle, text: 'Each account is set up personally.' },
                        { icon: Leaf, text: 'Small by design. That\'s the point.' },
                    ].map((item, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 15 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.4, delay: i * 0.08 }}
                            className="flex items-center gap-4 p-5 bg-zinc-900/40 border border-white/5 rounded-xl"
                        >
                            <item.icon weight="regular" className="w-5 h-5 text-zinc-500 flex-shrink-0" />
                            <p className="text-zinc-300 text-sm">{item.text}</p>
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* Closing Statement */}
            <section className="relative z-10 px-6 lg:px-16 py-16 max-w-[1000px] mx-auto">
                <motion.div
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5 }}
                    className="text-center"
                >
                    <p className="text-zinc-600 text-sm italic">
                        Built for a few. Not for everyone.
                    </p>
                </motion.div>
            </section>

            {/* Final CTA */}
            <section className="relative z-10 px-6 lg:px-16 py-24 max-w-[1000px] mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5 }}
                    className="text-center"
                >
                    <p className="text-zinc-400 text-lg mb-6">Curious?</p>
                    <a 
                        href={WHATSAPP_LINK}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2.5 px-6 py-3.5 bg-white text-black text-sm font-medium rounded-full hover:bg-zinc-200 transition-all"
                    >
                        <WhatsappLogo weight="fill" className="w-5 h-5" />
                        Let's talk on WhatsApp
                    </a>
                </motion.div>
            </section>

            {/* Footer - Minimal */}
            <footer className="relative z-10 px-6 lg:px-16 py-8 border-t border-white/5">
                <div className="max-w-[1000px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <Image 
                            src="/sendr-logo.png" 
                            alt="Sendr" 
                            width={20} 
                            height={20} 
                            className="w-5 h-5 opacity-50"
                        />
                        <span className="text-xs text-zinc-600">Sendr</span>
                    </div>
                    <p className="text-zinc-700 text-xs">
                        © {new Date().getFullYear()}
                    </p>
                </div>
            </footer>
        </div>
    )
}
