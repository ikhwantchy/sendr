'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Robot,
    DeviceMobile,
    ChatDots,
    Broadcast,
    CalendarCheck,
    ArrowClockwise,
    MonitorPlay,
    Pulse,
    TrendUp,
    CaretDown,
    WhatsappLogo,
    ArrowRight
} from '@phosphor-icons/react'
import { ICON_MAP } from '@/lib/icon-map'

// ─── Section Grid Background ──────────────────────────────
function SectionGrid({ children, className = '' }: { children: React.ReactNode; className?: string }) {
    return (
        <div className={`relative overflow-hidden ${className}`}>
            {/* Grid */}
            <div
                className="absolute inset-0 z-0 pointer-events-none"
                style={{
                    backgroundImage: `linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)`,
                    backgroundSize: '60px 60px',
                }}
            />
            {/* Fade edges top & bottom */}
            <div className="absolute inset-0 z-[1] pointer-events-none bg-gradient-to-b from-[#0a0a0a] via-transparent to-[#0a0a0a]" style={{ backgroundSize: '100% 100%' }} />
            {/* Content */}
            <div className="relative z-[2]">{children}</div>
        </div>
    )
}

// ─── Phone Mockup Component ───────────────────────────────
function PhoneMockup({ children, className = '' }: { children?: React.ReactNode; className?: string }) {
    return (
        <div className={`relative mx-auto ${className}`}>
            {/* Phone Frame */}
            <div className="relative bg-zinc-900 rounded-[2.5rem] p-2 shadow-2xl shadow-black/60 border border-zinc-700/50">
                {/* Notch */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[120px] h-[28px] bg-zinc-900 rounded-b-2xl z-20" />
                {/* Screen */}
                <div className="relative bg-zinc-800 rounded-[2rem] overflow-hidden aspect-[9/19.5]">
                    {/* Status bar */}
                    <div className="flex items-center justify-between px-6 pt-3 pb-1 text-[10px] text-zinc-400 relative z-10">
                        <span>9:41</span>
                        <div className="flex items-center gap-1">
                            <div className="w-3.5 h-2 border border-zinc-500 rounded-sm">
                                <div className="w-2/3 h-full bg-zinc-400 rounded-sm" />
                            </div>
                        </div>
                    </div>
                    {/* Content */}
                    <div className="relative z-10 h-full">
                        {children || (
                            <div className="flex items-center justify-center h-full pb-10">
                                <div className="text-center">
                                    <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
                                        <MonitorPlay weight="fill" className="w-8 h-8 text-white" />
                                    </div>
                                    <p className="text-zinc-500 text-xs">App Preview</p>
                                </div>
                            </div>
                        )}
                    </div>
                    {/* Home indicator */}
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-1 bg-zinc-600 rounded-full z-20" />
                </div>
            </div>
        </div>
    )
}

// ─── Dashboard Mockup (Hero) ──────────────────────────────
function DashboardMockup() {
    return (
        <div className="p-4 space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-[11px] text-zinc-300 font-medium">Halo, Admin</p>
                    <p className="text-[9px] text-zinc-500">Selamat datang di Sendr</p>
                </div>
                <div className="w-7 h-7 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <ChatDots weight="fill" className="w-3.5 h-3.5 text-blue-400" />
                </div>
            </div>
            {/* Stats */}
            <div className="grid grid-cols-2 gap-2">
                <div className="bg-zinc-700/50 rounded-xl p-2.5 border border-zinc-600/30">
                    <p className="text-[8px] text-zinc-400">Pesan Terkirim</p>
                    <p className="text-[15px] font-bold text-white">1,247</p>
                    <p className="text-[7px] text-emerald-400">+12% minggu ini</p>
                </div>
                <div className="bg-zinc-700/50 rounded-xl p-2.5 border border-zinc-600/30">
                    <p className="text-[8px] text-zinc-400">Bot Aktif</p>
                    <p className="text-[15px] font-bold text-white">3</p>
                    <p className="text-[7px] text-blue-400">Semua terhubung</p>
                </div>
            </div>
            {/* Recent */}
            <div className="bg-zinc-700/30 rounded-xl p-2.5 border border-zinc-600/20">
                <p className="text-[9px] text-zinc-400 mb-2">Chat Terbaru</p>
                {['Rudi - "Kapan jadwal berikutnya?"', 'Ani - "Terima kasih infonya"', 'Budi - "Mau order lagi"'].map((msg, i) => (
                    <div key={i} className="flex items-center gap-2 py-1.5 border-b border-zinc-700/50 last:border-0">
                        <div className="w-5 h-5 rounded-full bg-zinc-600 flex-shrink-0" />
                        <p className="text-[8px] text-zinc-300 truncate">{msg}</p>
                    </div>
                ))}
            </div>
            {/* Quick actions */}
            <div className="grid grid-cols-3 gap-1.5">
                {['Broadcast', 'Auto Reply', 'Reminder'].map((a, i) => (
                    <div key={i} className="bg-blue-500/10 rounded-lg p-2 text-center border border-blue-500/20">
                        <p className="text-[7px] text-blue-400 font-medium">{a}</p>
                    </div>
                ))}
            </div>
        </div>
    )
}

// ─── Auto Reply Mockup ────────────────────────────────────
function AutoReplyMockup() {
    return (
        <div className="p-4 space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-zinc-700/50">
                <Robot weight="fill" className="w-5 h-5 text-blue-400" />
                <div>
                    <p className="text-[11px] text-white font-medium">Auto Reply Bot</p>
                    <p className="text-[8px] text-emerald-400">Online</p>
                </div>
            </div>
            {/* Chat bubbles */}
            <div className="space-y-2">
                <div className="flex justify-end">
                    <div className="bg-blue-500 rounded-2xl rounded-tr-md px-3 py-1.5 max-w-[75%]">
                        <p className="text-[9px] text-white">Halo, mau tanya soal harga paket</p>
                    </div>
                </div>
                <div className="flex justify-start">
                    <div className="bg-zinc-700 rounded-2xl rounded-tl-md px-3 py-1.5 max-w-[75%]">
                        <p className="text-[9px] text-zinc-200">Hai! Terima kasih sudah menghubungi kami. Berikut daftar paket kami:</p>
                    </div>
                </div>
                <div className="flex justify-start">
                    <div className="bg-zinc-700 rounded-2xl rounded-tl-md px-3 py-1.5 max-w-[80%]">
                        <p className="text-[9px] text-zinc-200 font-medium mb-1">Paket Sendr:</p>
                        <p className="text-[8px] text-zinc-300">Basic - Rp99rb/bln</p>
                        <p className="text-[8px] text-zinc-300">Pro - Rp199rb/bln</p>
                        <p className="text-[8px] text-zinc-300">Enterprise - Custom</p>
                    </div>
                </div>
                <div className="flex justify-end">
                    <div className="bg-blue-500 rounded-2xl rounded-tr-md px-3 py-1.5 max-w-[75%]">
                        <p className="text-[9px] text-white">Paket Pro bisa untuk berapa nomor?</p>
                    </div>
                </div>
                <div className="flex justify-start">
                    <div className="bg-zinc-700 rounded-2xl rounded-tl-md px-3 py-1.5 max-w-[75%]">
                        <p className="text-[9px] text-zinc-200">Paket Pro mendukung hingga 5 nomor WhatsApp dengan fitur auto reply & broadcast unlimited!</p>
                    </div>
                </div>
            </div>
            <div className="flex items-center gap-1 pt-1">
                <div className="text-[7px] text-zinc-500 bg-zinc-700/50 px-2 py-0.5 rounded-full">Auto-replied by Sendr Bot</div>
            </div>
        </div>
    )
}

// ─── Broadcast Mockup ─────────────────────────────────────
function BroadcastMockup() {
    return (
        <div className="p-4 space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-zinc-700/50">
                <Broadcast weight="fill" className="w-5 h-5 text-blue-400" />
                <div>
                    <p className="text-[11px] text-white font-medium">Broadcast Center</p>
                    <p className="text-[8px] text-zinc-400">Kirim ke 150 kontak</p>
                </div>
            </div>
            {/* Broadcast card */}
            <div className="bg-zinc-700/40 rounded-xl p-3 border border-zinc-600/30">
                <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] text-white font-medium">Promo Akhir Tahun</p>
                    <span className="text-[7px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-full">Terkirim</span>
                </div>
                <p className="text-[8px] text-zinc-400 mb-2">Hai {'{{nama}}'}, jangan lewatkan promo spesial kami...</p>
                <div className="flex items-center gap-3 text-[8px]">
                    <span className="text-emerald-400">142 delivered</span>
                    <span className="text-blue-400">98 read</span>
                    <span className="text-zinc-500">8 failed</span>
                </div>
            </div>
            {/* Scheduled */}
            <div className="bg-zinc-700/40 rounded-xl p-3 border border-zinc-600/30">
                <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] text-white font-medium">Reminder Minggu Ini</p>
                    <span className="text-[7px] bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded-full">Dijadwalkan</span>
                </div>
                <p className="text-[8px] text-zinc-400 mb-2">Reminder tugas untuk mahasiswa kelas A...</p>
                <div className="flex items-center gap-2 text-[8px] text-zinc-500">
                    <CalendarCheck className="w-3 h-3" />
                    <span>Senin, 09:00 WIB</span>
                </div>
            </div>
            {/* Stats */}
            <div className="grid grid-cols-3 gap-1.5">
                {[{ label: 'Total Kirim', val: '1.2K' }, { label: 'Success Rate', val: '94%' }, { label: 'Response', val: '67%' }].map((s, i) => (
                    <div key={i} className="bg-zinc-700/30 rounded-lg p-2 text-center">
                        <p className="text-[12px] font-bold text-white">{s.val}</p>
                        <p className="text-[7px] text-zinc-500">{s.label}</p>
                    </div>
                ))}
            </div>
        </div>
    )
}

// ─── Multi Bot Mockup ─────────────────────────────────────
function MultiBotMockup() {
    return (
        <div className="p-4 space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-zinc-700/50">
                <Pulse weight="fill" className="w-5 h-5 text-blue-400" />
                <div>
                    <p className="text-[11px] text-white font-medium">Bot Manager</p>
                    <p className="text-[8px] text-zinc-400">3 bot aktif</p>
                </div>
            </div>
            {[
                { name: 'CS Bot Utama', phone: '+62 812-xxxx', status: 'online', msgs: '847' },
                { name: 'Bot Promo', phone: '+62 851-xxxx', status: 'online', msgs: '312' },
                { name: 'Bot Support', phone: '+62 878-xxxx', status: 'online', msgs: '156' }
            ].map((bot, i) => (
                <div key={i} className="bg-zinc-700/40 rounded-xl p-2.5 border border-zinc-600/30 flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center flex-shrink-0">
                        <Robot weight="fill" className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                            <p className="text-[10px] text-white font-medium truncate">{bot.name}</p>
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
                        </div>
                        <p className="text-[8px] text-zinc-500">{bot.phone}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                        <p className="text-[10px] text-white font-medium">{bot.msgs}</p>
                        <p className="text-[7px] text-zinc-500">pesan</p>
                    </div>
                </div>
            ))}
            <div className="bg-blue-500/10 rounded-xl p-2.5 border border-blue-500/20 text-center">
                <p className="text-[9px] text-blue-400 font-medium">+ Tambah Bot Baru</p>
            </div>
        </div>
    )
}

// ─── FAQ Item ─────────────────────────────────────────────
function FAQItem({ question, answer }: { question: string; answer: string }) {
    const [open, setOpen] = useState(false)
    return (
        <div className="border-b border-zinc-800/80">
            <button
                onClick={() => setOpen(!open)}
                className="w-full flex items-center justify-between py-5 text-left group"
            >
                <span className="text-[14px] sm:text-[16px] font-medium text-zinc-200 group-hover:text-white transition-colors pr-4">
                    {question}
                </span>
                <CaretDown
                    weight="bold"
                    className={`w-4 h-4 text-zinc-500 flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
                />
            </button>
            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        <p className="text-[13px] sm:text-[14px] text-zinc-400 leading-relaxed pb-5">
                            {answer}
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

// ─── Feature Section ──────────────────────────────────────
function FeatureSection({
    title,
    description,
    items,
    mockup,
    mockupImage,
    mockupImageWidth,
    mockupImagePosition,
    mockupImagePositionY,
    reverse = false,
    label,
    headingFont,
}: {
    title: string
    description: string
    items: { icon: React.ElementType; title: string; description: string }[]
    mockup: React.ReactNode
    mockupImage?: string
    mockupImageWidth?: number
    mockupImagePosition?: number
    mockupImagePositionY?: number
    reverse?: boolean
    label?: string
    headingFont?: string
}) {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
    const imgScale = (mockupImageWidth || 100) / 100
    const imgPosX = ((mockupImagePosition ?? 50) - 50) * 4 // 0→-200px, 50→0px, 100→+200px
    const imgPosY = mockupImagePositionY ?? 0

    return (
        <div className={`grid lg:grid-cols-2 gap-8 lg:gap-16 items-center ${reverse ? 'lg:flex-row-reverse' : ''}`}>
            {/* Mockup */}
            <motion.div
                initial={{ opacity: 0, x: reverse ? 30 : -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className={`${reverse ? 'lg:order-2' : 'lg:order-1'}`}
            >
                {mockupImage ? (
                    <div
                        className="relative cms-mockup"
                        style={{ transform: `scale(${imgScale}) translateX(${imgPosX}px) translateY(${imgPosY}px)`, transformOrigin: 'center top' }}
                    >
                        <img
                            src={`${apiUrl}${mockupImage}`}
                            alt={title}
                            className="w-full h-auto rounded-2xl"
                        />
                    </div>
                ) : (
                    <PhoneMockup className="w-[240px] sm:w-[280px]">
                        {mockup}
                    </PhoneMockup>
                )}
            </motion.div>

            {/* Text */}
            <motion.div
                initial={{ opacity: 0, x: reverse ? -30 : 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className={`${reverse ? 'lg:order-1' : 'lg:order-2'}`}
            >
                {label && (
                    <span className="text-[11px] sm:text-[12px] text-blue-400 font-semibold tracking-widest uppercase mb-3 block">
                        {label}
                    </span>
                )}
                <h3
                    className="text-[24px] sm:text-[30px] lg:text-[36px] font-bold text-white leading-[1.15] tracking-tight mb-4"
                    style={headingFont ? { fontFamily: `'${headingFont}', sans-serif` } : undefined}
                >
                    {title}
                </h3>
                <p className="text-[14px] sm:text-[15px] text-zinc-400 leading-relaxed mb-8 max-w-lg">
                    {description}
                </p>
                <div className="space-y-5">
                    {items.map((item, i) => (
                        <div key={i} className="flex items-start gap-4">
                            <div className="w-10 h-10 rounded-xl bg-zinc-800 border border-zinc-700/50 flex items-center justify-center flex-shrink-0">
                                <item.icon weight="duotone" className="w-5 h-5 text-blue-400" />
                            </div>
                            <div>
                                <h4 className="text-[14px] sm:text-[15px] font-semibold text-white mb-1">{item.title}</h4>
                                <p className="text-[12px] sm:text-[13px] text-zinc-500 leading-relaxed">{item.description}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </motion.div>
        </div>
    )
}

// ─── Feature Mockups & Icons ──────────────────────────────
const FEATURE_MOCKUPS: React.ReactNode[] = [
    <AutoReplyMockup key="ar" />,
    <BroadcastMockup key="bc" />,
    <MultiBotMockup key="mb" />,
    <DashboardMockup key="dm" />,
]

const FEATURE_ICONS: React.ElementType[][] = [
    [Robot, DeviceMobile, ChatDots],
    [Broadcast, CalendarCheck, ArrowClockwise],
    [Pulse, TrendUp, MonitorPlay],
    [Robot, ChatDots, DeviceMobile],
]

const DEFAULT_CONTENT = {
    hero: {
        title: 'Kelola WhatsApp Bisnis\nTanpa Ribet',
        description: 'Dari balas chat otomatis, kirim broadcast, sampai kelola banyak nomor — semua bisa kamu atur dari satu dashboard.',
        cta_text: 'Mulai Pakai Sendr',
        cta_link: 'https://wa.me/6285128017897',
        cta_visible: true,
        mockup_image: '',
        mockup_image_width: 50,
        mockup_image_position: 50,
        mockup_image_position_y: 0,
    },
    features: [
        {
            label: 'FEATURES',
            title: 'Balas Chat Otomatis, Gak Perlu Standby Terus',
            description: 'Biarkan Sendr bantu jawab chat masuk secara otomatis.',
            items: [
                { title: 'Auto Reply Pintar', description: 'Balas pesan masuk otomatis berdasarkan keyword.' },
                { title: 'Multi-Device Friendly', description: 'Kelola WhatsApp dari HP atau laptop.' },
                { title: 'Inbox Terpusat', description: 'Semua chat di satu dashboard.' },
            ],
        },
    ],
    faq: [
        { question: 'Apakah Sendr aman dipakai?', answer: 'Ya. Koneksi dan data kamu dijaga dengan sistem keamanan berlapis.' },
        { question: 'Bisa untuk berapa nomor?', answer: 'Tergantung paket. Mulai dari 1 sampai unlimited nomor WhatsApp.' },
    ],
    cta: {
        title: 'Otomatiskan WhatsApp Bisnis Kamu',
        description: 'Ribuan chat bukan lagi masalah.',
        button_text: 'Mulai Sekarang',
        button_link: 'https://wa.me/6285128017897',
    },
    contact: {
        whatsapp: '+62 851-2801-7897',
        whatsapp_link: 'https://wa.me/6285128017897',
        text: 'Ada yang mau ditanyain? Langsung WhatsApp aja',
    },
}

// ─── Main Page Component ──────────────────────────────────
export default function LandingPage() {
    const [content, setContent] = useState<any>(DEFAULT_CONTENT)
    const [loading, setLoading] = useState(true)
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

    useEffect(() => {
        const fetchContent = async () => {
            try {
                const res = await fetch(`${apiUrl}/api/public/landing-page`)
                const data = await res.json()
                if (data.success && data.content && Object.keys(data.content).length > 0) {
                    setContent((prev: any) => ({ ...prev, ...data.content }))
                }
            } catch (error) {
                console.error('Failed to fetch landing page content')
            } finally {
                setLoading(false)
            }
        }
        fetchContent()
    }, [apiUrl])

    // ─── Load Google Fonts dynamically from CMS typography settings ───
    useEffect(() => {
        const fontHeading = content.typography?.font_heading
        const fontBody = content.typography?.font_body
        const fontsToLoad = new Set<string>()

        if (fontHeading && fontHeading !== 'Inter') fontsToLoad.add(fontHeading)
        if (fontBody && fontBody !== 'Inter') fontsToLoad.add(fontBody)

        fontsToLoad.forEach(font => {
            const linkId = `gfont-${font.replace(/\s/g, '-')}`
            if (!document.getElementById(linkId)) {
                const link = document.createElement('link')
                link.id = linkId
                link.rel = 'stylesheet'
                link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(font)}:wght@400;500;600;700;800&display=swap`
                document.head.appendChild(link)
            }
        })
    }, [content.typography])

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
        )
    }

    const heroImgWidth = (content.hero as any)?.mockup_image_width || 50
    const heroImgPos = (content.hero as any)?.mockup_image_position ?? 50
    const heroImgPosY = (content.hero as any)?.mockup_image_position_y ?? 0
    const heroMarginLeft = heroImgWidth < 100 ? (heroImgPos / 100) * (100 - heroImgWidth) : 0

    const fontHeading = content.typography?.font_heading || 'Inter'
    const fontBody = content.typography?.font_body || 'Inter'

    return (
        <div
            className="min-h-screen bg-[#0a0a0a] text-white overflow-x-hidden"
            style={{ fontFamily: `'${fontBody}', sans-serif` }}
        >            {/* ─── Hero Section ─────────────────────────────── */}
            <div className="relative h-[700px] sm:h-[800px] lg:h-[900px] overflow-hidden">
                <SectionGrid className="bg-[#0a0a0a]">
                    <section className="px-4 sm:px-6 pt-8 sm:pt-12 lg:pt-16 pb-0 max-w-6xl mx-auto">
                        {/* Text — centered */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6 }}
                            className="text-center"
                        >
                            {/* Sendr Logo */}
                            <img
                                src="/sendr-logo.png"
                                alt="Sendr"
                                className="h-[80px] sm:h-[100px] lg:h-[120px] w-auto mx-auto mb-10 sm:mb-12"
                            />
                            <h1
                                className="text-[28px] sm:text-[40px] lg:text-[52px] font-bold text-white leading-[1.1] tracking-tight mb-4 sm:mb-5 whitespace-pre-line max-w-3xl mx-auto"
                                style={{ fontFamily: `'${fontHeading}', sans-serif` }}
                            >
                                {content.hero.title}
                            </h1>
                            <p className="text-[13px] sm:text-[15px] lg:text-[17px] text-zinc-400 leading-relaxed mb-6 sm:mb-8 max-w-2xl mx-auto px-2">
                                {content.hero.description}
                            </p>
                            {content.hero.cta_visible !== false && (
                                <a
                                    href={content.hero.cta_link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 px-6 sm:px-8 py-3 sm:py-4 bg-blue-600 hover:bg-blue-500 text-white text-[14px] sm:text-[15px] font-semibold rounded-xl transition-all hover:shadow-lg hover:shadow-blue-500/25"
                                >
                                    <WhatsappLogo weight="fill" className="w-5 h-5" />
                                    {content.hero.cta_text}
                                </a>
                            )}
                        </motion.div>

                        {/* Mockup — centered below, clips at hero boundary */}
                        <motion.div
                            initial={{ opacity: 0, y: 40 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.7, delay: 0.2 }}
                            className="flex justify-center mt-10 sm:mt-14"
                        >
                            {(content.hero as any)?.mockup_image ? (
                                <div
                                    className="relative cms-mockup flex-shrink-0"
                                    style={{ width: `${heroImgWidth}%`, marginLeft: `${heroMarginLeft}%`, transform: `translateY(${heroImgPosY}px)` }}
                                >
                                    <img
                                        src={`${apiUrl}${(content.hero as any).mockup_image}`}
                                        alt="Hero"
                                        className="w-full h-auto"
                                    />
                                </div>
                            ) : (
                                <PhoneMockup className="w-[280px] sm:w-[320px] lg:w-[340px]">
                                    <DashboardMockup />
                                </PhoneMockup>
                            )}
                        </motion.div>
                    </section>
                </SectionGrid>

                {/* Bottom fade — clips mockup smoothly */}
                <div className="absolute bottom-0 left-0 right-0 h-32 sm:h-40 bg-gradient-to-t from-[#0a0a0a] to-transparent z-20 pointer-events-none" />
            </div>

            {/* ─── Hero / Body Divider ───────────────────────── */}
            <div className="relative section-divider">
                <div className="h-8 sm:h-12 bg-gradient-to-t from-blue-500/5 to-transparent" />
                <div className="h-px bg-gradient-to-r from-transparent via-blue-500/40 to-transparent" />
            </div>

            {/* ─── Feature Sections (Dynamic) ────────────── */}
            {content.features.map((feat: any, idx: number) => (
                (feat as any).visible !== false && (
                <div key={idx}>
                    <section id={idx === 0 ? 'features' : undefined} className="px-4 sm:px-6 py-16 sm:py-24 max-w-6xl mx-auto bg-[#0a0a0a] overflow-y-clip">
                        <FeatureSection
                            label={feat.label}
                            title={feat.title}
                            description={feat.description}
                            reverse={idx % 2 === 1}
                            mockup={FEATURE_MOCKUPS[idx] || FEATURE_MOCKUPS[0]}
                            mockupImage={(feat as any).mockup_image || ''}
                            mockupImageWidth={(feat as any).mockup_image_width}
                            mockupImagePosition={(feat as any).mockup_image_position}
                            mockupImagePositionY={(feat as any).mockup_image_position_y}
                            headingFont={fontHeading}
                            items={feat.items.map((item: any, i: number) => ({
                                icon: (item as any).icon ? (ICON_MAP[(item as any).icon] || Robot) : (FEATURE_ICONS[idx]?.[i] || Robot),
                                title: item.title,
                                description: item.description,
                            }))}
                        />
                    </section>
                    {/* Section Divider */}
                    <div className="relative section-divider">
                        <div className="h-8 sm:h-12 bg-gradient-to-t from-blue-500/5 to-transparent" />
                        <div className="h-px bg-gradient-to-r from-transparent via-blue-500/40 to-transparent" />
                    </div>
                </div>
                )
            ))}

            {/* ─── FAQ Section ────────────────────────────── */}
            {((content as any).visibility?.faq !== false || (content as any).visibility?.contact !== false) && (
            <section id="faq" className="px-4 sm:px-6 py-16 sm:py-24 max-w-3xl mx-auto bg-[#0a0a0a]">
                {(content as any).visibility?.faq !== false && (
                <>
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5 }}
                    className="text-center mb-10 sm:mb-12"
                >
                    <span className="text-[11px] sm:text-[12px] text-blue-400 font-semibold tracking-widest uppercase mb-3 block">FAQ</span>
                    <h2
                        className="text-[24px] sm:text-[32px] font-bold tracking-tight"
                        style={{ fontFamily: `'${fontHeading}', sans-serif` }}
                    >
                        Frequently Asked Questions
                    </h2>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                >
                    {content.faq.map((item: any, i: number) => (
                        <FAQItem key={i} question={item.question} answer={item.answer} />
                    ))}
                </motion.div>
                </>
                )}

                {/* WhatsApp Contact */}
                {(content as any).visibility?.contact !== false && (
                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className="mt-10 text-center"
                >
                    <p className="text-[13px] text-zinc-500 mb-3">{content.contact.text}</p>
                    <a
                        href={content.contact.whatsapp_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-[14px] text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
                    >
                        <WhatsappLogo weight="fill" className="w-5 h-5" />
                        {content.contact.whatsapp}
                    </a>
                </motion.div>
                )}
            </section>
            )}

            {/* ─── CTA Section ────────────────────────────── */}
            {(content as any).visibility?.cta_section !== false && (
            <section className="px-4 sm:px-6 py-20 sm:py-28 bg-[#0a0a0a]">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5 }}
                    className="max-w-3xl mx-auto text-center"
                >
                    <h2
                        className="text-[28px] sm:text-[36px] lg:text-[44px] font-bold tracking-tight mb-4 sm:mb-5"
                        style={{ fontFamily: `'${fontHeading}', sans-serif` }}
                    >
                        {content.cta.title}
                    </h2>
                    <p className="text-[14px] sm:text-[16px] text-zinc-400 mb-8 sm:mb-10 max-w-xl mx-auto">
                        {content.cta.description}
                    </p>
                    <a
                        href={content.cta.button_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white text-[15px] font-semibold rounded-xl transition-all hover:shadow-lg hover:shadow-blue-500/25"
                    >
                        {content.cta.button_text}
                        <ArrowRight weight="bold" className="w-4 h-4" />
                    </a>
                </motion.div>
            </section>
            )}

            {/* ─── Footer ─────────────────────────────────── */}
            <footer className="px-4 sm:px-6 py-8 border-t border-zinc-800/50">
                <p className="text-zinc-600 text-[12px] text-center">
                    &copy; {new Date().getFullYear()} sendr.web.id &mdash; All rights reserved.
                </p>
            </footer>
        </div>
    )
}
