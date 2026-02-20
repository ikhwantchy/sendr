'use client'

import { useState, useEffect, useRef } from 'react'
import { Save, Plus, Trash2, Eye, ChevronDown, ChevronUp, GripVertical, Upload, X, Image as ImageIcon } from 'lucide-react'
import { api, apiClient } from '@/lib/api'
import { ICON_LIST, ICON_MAP } from '@/lib/icon-map'

interface FeatureItem {
    title: string
    description: string
    icon?: string
}

interface FeatureSection {
    label?: string
    title: string
    description: string
    visible?: boolean
    mockup_image?: string
    mockup_image_width?: number
    mockup_image_position?: number
    mockup_image_position_y?: number
    items: FeatureItem[]
}

interface FAQItem {
    question: string
    answer: string
}

interface LandingContent {
    hero: {
        title: string
        description: string
        cta_text: string
        cta_link: string
        cta_visible?: boolean
        mockup_image?: string
        mockup_image_width?: number
        mockup_image_position?: number
        mockup_image_position_y?: number
    }
    features: FeatureSection[]
    faq: FAQItem[]
    cta: {
        title: string
        description: string
        button_text: string
        button_link: string
    }
    contact: {
        whatsapp: string
        whatsapp_link: string
        text: string
    }
    typography?: {
        font_heading: string
        font_body: string
    }
    visibility?: {
        faq?: boolean
        cta_section?: boolean
        contact?: boolean
    }
}

const DEFAULT_CONTENT: LandingContent = {
    hero: {
        title: 'Kelola WhatsApp Bisnis\nTanpa Ribet',
        description: 'Dari balas chat otomatis, kirim broadcast, sampai kelola banyak nomor — semua bisa kamu atur dari satu dashboard.',
        cta_text: 'Mulai Pakai Sendr',
        cta_link: 'https://wa.me/6285128017897',
        cta_visible: true,
        mockup_image: '',
    },
    features: [
        {
            label: 'FEATURES',
            title: 'Balas Chat Otomatis, Gak Perlu Standby Terus',
            description: 'Biarkan Sendr bantu jawab chat masuk secara otomatis.',
            mockup_image: '',
            items: [
                { title: 'Auto Reply Pintar', description: 'Balas pesan masuk otomatis berdasarkan keyword.' },
                { title: 'Multi-Device Friendly', description: 'Kelola WhatsApp dari HP atau laptop.' },
                { title: 'Inbox Terpusat', description: 'Semua chat di satu dashboard.' },
            ],
        },
    ],
    faq: [
        { question: 'Apakah Sendr aman dipakai?', answer: 'Ya. Koneksi dan data kamu dijaga dengan sistem keamanan berlapis.' },
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
    typography: {
        font_heading: 'Inter',
        font_body: 'Inter',
    },
}

// ─── Collapsible Section ──────────────────────────────────
function Section({ title, children, defaultOpen = false, visible, onVisibleChange }: {
    title: string; children: React.ReactNode; defaultOpen?: boolean;
    visible?: boolean; onVisibleChange?: (v: boolean) => void
}) {
    const [open, setOpen] = useState(defaultOpen)
    return (
        <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
            <button
                onClick={() => setOpen(!open)}
                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors"
            >
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">{title}</h3>
                <div className="flex items-center gap-3">
                    {onVisibleChange !== undefined && (
                        <div
                            role="switch"
                            aria-checked={visible}
                            onClick={e => { e.stopPropagation(); onVisibleChange!(!visible) }}
                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer ${visible ? 'bg-blue-600' : 'bg-zinc-300 dark:bg-zinc-600'}`}
                        >
                            <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${visible ? 'translate-x-[18px]' : 'translate-x-[3px]'}`} />
                        </div>
                    )}
                    {open ? <ChevronUp className="w-4 h-4 text-zinc-400" /> : <ChevronDown className="w-4 h-4 text-zinc-400" />}
                </div>
            </button>
            {open && <div className="px-5 pb-5 border-t border-zinc-100 dark:border-zinc-800 pt-4">{children}</div>}
        </div>
    )
}

// ─── Input Field ──────────────────────────────────────────
function VisibilityToggle({ label, description, checked, onChange }: {
    label: string; description: string; checked: boolean; onChange: (v: boolean) => void
}) {
    return (
        <div className="flex items-center justify-between py-2 px-3 bg-zinc-100 dark:bg-zinc-800/50 rounded-lg">
            <div>
                <p className="text-sm font-medium text-zinc-900 dark:text-white">{label}</p>
                <p className="text-[11px] text-zinc-500">{description}</p>
            </div>
            <button
                type="button"
                onClick={() => onChange(!checked)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${checked ? 'bg-blue-600' : 'bg-zinc-300 dark:bg-zinc-600'}`}
            >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
        </div>
    )
}

function IconPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
    const [open, setOpen] = useState(false)
    const ref = useRef<HTMLDivElement>(null)
    const CurrentIcon = ICON_MAP[value] || ICON_MAP['Robot']

    useEffect(() => {
        if (!open) return
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [open])

    return (
        <div className="relative" ref={ref}>
            <button
                type="button"
                onClick={() => setOpen(!open)}
                className="flex items-center gap-2 px-2.5 py-1.5 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
            >
                <CurrentIcon weight="duotone" className="w-5 h-5 text-blue-400" />
                <ChevronDown className="w-3 h-3 text-zinc-400" />
            </button>
            {open && (
                <div className="absolute left-0 top-full mt-1 z-50 w-[280px] max-h-[240px] overflow-y-auto bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-xl p-2">
                    <div className="grid grid-cols-7 gap-1">
                        {ICON_LIST.map(([name, IconComp, label]) => (
                            <button
                                key={name}
                                type="button"
                                onClick={() => { onChange(name); setOpen(false) }}
                                title={label}
                                className={`p-2 rounded-lg transition-colors ${value === name ? 'bg-blue-500/20 ring-1 ring-blue-500' : 'hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
                            >
                                <IconComp weight="duotone" className={`w-4.5 h-4.5 ${value === name ? 'text-blue-400' : 'text-zinc-500 dark:text-zinc-400'}`} />
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}

function Field({ label, value, onChange, textarea = false, placeholder = '' }: {
    label: string; value: string; onChange: (v: string) => void; textarea?: boolean; placeholder?: string
}) {
    const cls = "w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
    return (
        <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{label}</label>
            {textarea ? (
                <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={3} className={cls} />
            ) : (
                <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className={cls} />
            )}
        </div>
    )
}

// ─── Image Upload Field ──────────────────────────────────
function ImageUploadField({ label, value, onChange }: {
    label: string; value: string; onChange: (url: string) => void
}) {
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [uploading, setUploading] = useState(false)
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setUploading(true)
        try {
            const formData = new FormData()
            formData.append('image', file)
            const res = await apiClient.post('/admin/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            })
            if (res.data.success) {
                onChange(res.data.url)
            }
        } catch (error: any) {
            alert('Gagal upload gambar: ' + (error.response?.data?.message || error.message))
        } finally {
            setUploading(false)
            if (fileInputRef.current) fileInputRef.current.value = ''
        }
    }

    const handleRemove = async () => {
        if (!value) return
        const filename = value.split('/').pop()
        if (filename) {
            try {
                await apiClient.delete(`/admin/upload/${filename}`)
            } catch (e) {
                // Ignore delete errors
            }
        }
        onChange('')
    }

    return (
        <div className="space-y-2">
            <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{label}</label>

            {value ? (
                <div className="relative group">
                    <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-900">
                        <img
                            src={`${apiUrl}${value}`}
                            alt="Mockup preview"
                            className="w-full max-h-[300px] object-contain"
                        />
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                        >
                            <Upload className="w-3 h-3" />
                            Ganti Gambar
                        </button>
                        <button
                            onClick={handleRemove}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-500 bg-red-500/10 rounded-lg hover:bg-red-500/20 transition-colors"
                        >
                            <X className="w-3 h-3" />
                            Hapus
                        </button>
                    </div>
                </div>
            ) : (
                <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="w-full border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl p-6 text-center hover:border-blue-500/50 hover:bg-blue-500/5 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-wait"
                >
                    <div className="flex flex-col items-center gap-2">
                        {uploading ? (
                            <>
                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500" />
                                <span className="text-xs text-zinc-500">Uploading...</span>
                            </>
                        ) : (
                            <>
                                <ImageIcon className="w-8 h-8 text-zinc-400" />
                                <span className="text-xs text-zinc-500">Klik untuk upload gambar mockup</span>
                                <span className="text-[10px] text-zinc-600">JPG, PNG, WebP (max 5MB)</span>
                            </>
                        )}
                    </div>
                </button>
            )}

            <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleUpload}
                className="hidden"
            />
        </div>
    )
}

// ─── Font List & Selector ─────────────────────────────────
const POPULAR_FONTS = [
    'Inter',
    'Poppins',
    'Plus Jakarta Sans',
    'Space Grotesk',
    'Manrope',
    'Outfit',
    'Sora',
    'Montserrat',
    'Raleway',
    'Nunito Sans',
    'DM Sans',
    'Work Sans',
    'Lato',
    'Open Sans',
    'Roboto',
    'Source Sans 3',
    'Rubik',
    'Lexend',
    'Figtree',
    'Geist',
    'Onest',
    'Albert Sans',
    'General Sans',
    'Satoshi',
    'Cabinet Grotesk',
]

function FontSelector({ label, value, onChange, previewText }: {
    label: string
    value: string
    onChange: (font: string) => void
    previewText: string
}) {
    const [custom, setCustom] = useState(false)
    const [customFont, setCustomFont] = useState('')
    const [fontLoaded, setFontLoaded] = useState(false)

    // Load font for preview
    useEffect(() => {
        if (!value) return
        const link = document.getElementById(`font-preview-${value.replace(/\s/g, '-')}`)
        if (link) { setFontLoaded(true); return }

        const el = document.createElement('link')
        el.id = `font-preview-${value.replace(/\s/g, '-')}`
        el.rel = 'stylesheet'
        el.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(value)}:wght@400;600;700&display=swap`
        el.onload = () => setFontLoaded(true)
        el.onerror = () => setFontLoaded(false)
        document.head.appendChild(el)
    }, [value])

    const isCustom = value && !POPULAR_FONTS.includes(value)

    return (
        <div className="space-y-2">
            <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{label}</label>

            {/* Select from popular */}
            <select
                value={isCustom ? '__custom__' : value}
                onChange={e => {
                    if (e.target.value === '__custom__') {
                        setCustom(true)
                    } else {
                        setCustom(false)
                        onChange(e.target.value)
                    }
                }}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
            >
                {POPULAR_FONTS.map(f => (
                    <option key={f} value={f}>{f}</option>
                ))}
                <option value="__custom__">✏️ Ketik nama font sendiri...</option>
            </select>

            {/* Custom font input */}
            {(custom || isCustom) && (
                <div className="flex gap-2">
                    <input
                        value={isCustom ? value : customFont}
                        onChange={e => {
                            setCustomFont(e.target.value)
                            if (isCustom) onChange(e.target.value)
                        }}
                        onBlur={() => {
                            if (customFont.trim()) onChange(customFont.trim())
                        }}
                        onKeyDown={e => {
                            if (e.key === 'Enter' && customFont.trim()) {
                                onChange(customFont.trim())
                            }
                        }}
                        placeholder="Nama font Google Fonts, misal: Playfair Display"
                        className="flex-1 px-3 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                    />
                    <button
                        onClick={() => {
                            if (customFont.trim()) onChange(customFont.trim())
                        }}
                        className="px-3 py-2 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-500"
                    >
                        Set
                    </button>
                </div>
            )}

            {/* Preview */}
            {value && (
                <div
                    className="p-3 bg-zinc-100 dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800"
                    style={{ fontFamily: `'${value}', sans-serif` }}
                >
                    <p className="text-lg font-bold text-zinc-900 dark:text-white">{previewText}</p>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                        The quick brown fox jumps over the lazy dog — 0123456789
                    </p>
                    <p className="text-[10px] text-zinc-400 mt-2 font-mono" style={{ fontFamily: 'monospace' }}>
                        Font: {value}
                    </p>
                </div>
            )}
        </div>
    )
}

// ─── Image Settings Controls ──────────────────────────────
function ImageSettingsControls({ width, position, positionY, onWidthChange, onPositionChange, onPositionYChange }: {
    width: number
    position: number
    positionY: number
    onWidthChange: (w: number) => void
    onPositionChange: (p: number) => void
    onPositionYChange: (p: number) => void
}) {
    return (
        <div className="mt-3 space-y-3 p-3 bg-zinc-50 dark:bg-zinc-900/50 rounded-lg border border-zinc-200 dark:border-zinc-800">
            {/* Width slider */}
            <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Ukuran Gambar</label>
                    <span className="text-xs font-mono text-zinc-400">{width}%</span>
                </div>
                <input
                    type="range"
                    min={20}
                    max={100}
                    step={5}
                    value={width}
                    onChange={e => onWidthChange(Number(e.target.value))}
                    className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-full appearance-none cursor-pointer accent-blue-500"
                />
                <div className="flex justify-between text-[10px] text-zinc-400">
                    <span>20%</span>
                    <span>100%</span>
                </div>
            </div>

            {/* Horizontal position slider */}
            <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Posisi Horizontal</label>
                    <span className="text-xs font-mono text-zinc-400">{position}%</span>
                </div>
                <input
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={position}
                    onChange={e => onPositionChange(Number(e.target.value))}
                    className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-full appearance-none cursor-pointer accent-blue-500"
                />
                <div className="flex justify-between text-[10px] text-zinc-400">
                    <span>Kiri</span>
                    <span>Tengah</span>
                    <span>Kanan</span>
                </div>
            </div>

            {/* Vertical position slider */}
            <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Posisi Vertikal</label>
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-zinc-400">{positionY}px</span>
                        {positionY !== 0 && (
                            <button
                                onClick={() => onPositionYChange(0)}
                                className="text-[10px] text-blue-500 hover:text-blue-400"
                            >
                                Reset
                            </button>
                        )}
                    </div>
                </div>
                <input
                    type="range"
                    min={-200}
                    max={200}
                    step={5}
                    value={positionY}
                    onChange={e => onPositionYChange(Number(e.target.value))}
                    className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-full appearance-none cursor-pointer accent-blue-500"
                />
                <div className="flex justify-between text-[10px] text-zinc-400">
                    <span>Atas</span>
                    <span>0</span>
                    <span>Bawah</span>
                </div>
            </div>
        </div>
    )
}

// ─── Main Page ────────────────────────────────────────────
export default function LandingPageEditor() {
    const [content, setContent] = useState<LandingContent>(DEFAULT_CONTENT)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

    useEffect(() => {
        fetchContent()
    }, [])

    const fetchContent = async () => {
        setLoading(true)
        try {
            const res = await apiClient.get('/admin/landing-page')
            if (res.data.success && res.data.content && Object.keys(res.data.content).length > 0) {
                setContent(prev => ({ ...prev, ...res.data.content }))
            }
        } catch (error) {
            console.error('Failed to fetch landing page content')
        } finally {
            setLoading(false)
        }
    }

    const handleSave = async () => {
        setSaving(true)
        setMessage(null)
        try {
            await apiClient.put('/admin/landing-page', { content })
            setMessage({ type: 'success', text: 'Konten landing page berhasil disimpan!' })
        } catch (error: any) {
            setMessage({ type: 'error', text: error.response?.data?.message || 'Gagal menyimpan' })
        } finally {
            setSaving(false)
        }
    }

    const updateHero = (key: keyof LandingContent['hero'], value: string) => {
        setContent(prev => ({ ...prev, hero: { ...prev.hero, [key]: value } }))
    }

    const updateCTA = (key: keyof LandingContent['cta'], value: string) => {
        setContent(prev => ({ ...prev, cta: { ...prev.cta, [key]: value } }))
    }

    const updateContact = (key: keyof LandingContent['contact'], value: string) => {
        setContent(prev => ({ ...prev, contact: { ...prev.contact, [key]: value } }))
    }

    const updateFeature = (idx: number, key: keyof FeatureSection, value: any) => {
        setContent(prev => {
            const features = [...prev.features]
            features[idx] = { ...features[idx], [key]: value }
            return { ...prev, features }
        })
    }

    const updateFeatureItem = (fIdx: number, iIdx: number, key: keyof FeatureItem, value: string) => {
        setContent(prev => {
            const features = [...prev.features]
            const items = [...features[fIdx].items]
            items[iIdx] = { ...items[iIdx], [key]: value }
            features[fIdx] = { ...features[fIdx], items }
            return { ...prev, features }
        })
    }

    const addFeatureSection = () => {
        setContent(prev => ({
            ...prev,
            features: [...prev.features, {
                title: 'Judul Fitur Baru',
                description: 'Deskripsi fitur baru.',
                mockup_image: '',
                mockup_image_width: 50,
                mockup_image_position: 50,
                mockup_image_position_y: 0,
                items: [{ title: 'Sub Fitur', description: 'Deskripsi sub fitur.' }],
            }],
        }))
    }

    const removeFeatureSection = (idx: number) => {
        if (!confirm('Hapus section fitur ini?')) return
        setContent(prev => ({ ...prev, features: prev.features.filter((_, i) => i !== idx) }))
    }

    const addFeatureItem = (fIdx: number) => {
        setContent(prev => {
            const features = [...prev.features]
            features[fIdx] = { ...features[fIdx], items: [...features[fIdx].items, { title: 'Item Baru', description: 'Deskripsi item.' }] }
            return { ...prev, features }
        })
    }

    const removeFeatureItem = (fIdx: number, iIdx: number) => {
        setContent(prev => {
            const features = [...prev.features]
            features[fIdx] = { ...features[fIdx], items: features[fIdx].items.filter((_, i) => i !== iIdx) }
            return { ...prev, features }
        })
    }

    const addFAQ = () => {
        setContent(prev => ({ ...prev, faq: [...prev.faq, { question: 'Pertanyaan baru?', answer: 'Jawaban.' }] }))
    }

    const removeFAQ = (idx: number) => {
        setContent(prev => ({ ...prev, faq: prev.faq.filter((_, i) => i !== idx) }))
    }

    const updateFAQ = (idx: number, key: keyof FAQItem, value: string) => {
        setContent(prev => {
            const faq = [...prev.faq]
            faq[idx] = { ...faq[idx], [key]: value }
            return { ...prev, faq }
        })
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-[#0a0a0a]">
            {/* Header */}
            <div className="sticky top-0 z-40 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-lg border-b border-zinc-200 dark:border-zinc-800">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
                    <div>
                        <h1 className="text-lg font-bold text-zinc-900 dark:text-white">Landing Page</h1>
                        <p className="text-xs text-zinc-500">Kelola konten halaman utama</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <a
                            href="/"
                            target="_blank"
                            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                        >
                            <Eye className="w-3.5 h-3.5" />
                            Preview
                        </a>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                        >
                            <Save className="w-3.5 h-3.5" />
                            {saving ? 'Menyimpan...' : 'Simpan'}
                        </button>
                    </div>
                </div>
                {message && (
                    <div className={`max-w-4xl mx-auto px-4 sm:px-6 pb-3`}>
                        <div className={`px-3 py-2 rounded-lg text-sm ${message.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                            {message.text}
                        </div>
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-4">
                {/* Typography */}
                <Section title="Tipografi (Font)">
                    <div className="space-y-5">
                        <FontSelector
                            label="Font Heading (Judul)"
                            value={content.typography?.font_heading || 'Inter'}
                            onChange={f => setContent(prev => ({
                                ...prev,
                                typography: { ...prev.typography || { font_heading: 'Inter', font_body: 'Inter' }, font_heading: f }
                            }))}
                            previewText="Kelola WhatsApp Bisnis"
                        />
                        <FontSelector
                            label="Font Body (Teks)"
                            value={content.typography?.font_body || 'Inter'}
                            onChange={f => setContent(prev => ({
                                ...prev,
                                typography: { ...prev.typography || { font_heading: 'Inter', font_body: 'Inter' }, font_body: f }
                            }))}
                            previewText="Dari balas chat otomatis, kirim broadcast, sampai kelola banyak nomor."
                        />
                        <p className="text-[11px] text-zinc-400">
                            Pilih dari daftar atau ketik nama font dari <a href="https://fonts.google.com" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Google Fonts</a>. Pastikan nama font sesuai dengan yang ada di Google Fonts.
                        </p>
                    </div>
                </Section>

                {/* Hero Section */}
                <Section title="Hero Section" defaultOpen={true}>
                    <div className="space-y-4">
                        <Field label="Judul (gunakan \n untuk baris baru)" value={content.hero.title} onChange={v => updateHero('title', v)} textarea />
                        <Field label="Deskripsi" value={content.hero.description} onChange={v => updateHero('description', v)} textarea />
                        <VisibilityToggle
                            label="Tampilkan Tombol CTA"
                            description="Sembunyikan atau tampilkan tombol CTA di hero"
                            checked={content.hero.cta_visible !== false}
                            onChange={v => setContent(prev => ({ ...prev, hero: { ...prev.hero, cta_visible: v } }))}
                        />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Field label="Teks Tombol CTA" value={content.hero.cta_text} onChange={v => updateHero('cta_text', v)} />
                            <Field label="Link CTA" value={content.hero.cta_link} onChange={v => updateHero('cta_link', v)} placeholder="https://wa.me/..." />
                        </div>
                        <ImageUploadField
                            label="Gambar Mockup Hero (tampil di HP frame)"
                            value={content.hero.mockup_image || ''}
                            onChange={url => updateHero('mockup_image', url)}
                        />
                        {content.hero.mockup_image && (
                            <ImageSettingsControls
                                width={(content.hero as any).mockup_image_width || 50}
                                position={(content.hero as any).mockup_image_position ?? 50}
                                positionY={(content.hero as any).mockup_image_position_y ?? 0}
                                onWidthChange={w => setContent(prev => ({ ...prev, hero: { ...prev.hero, mockup_image_width: w } }))}
                                onPositionChange={p => setContent(prev => ({ ...prev, hero: { ...prev.hero, mockup_image_position: p } }))}
                                onPositionYChange={p => setContent(prev => ({ ...prev, hero: { ...prev.hero, mockup_image_position_y: p } }))}
                            />
                        )}
                    </div>
                </Section>

                {/* Feature Sections */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between px-1">
                        <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">Feature Sections</h3>
                        <button onClick={addFeatureSection} className="inline-flex items-center gap-1 text-xs text-blue-500 hover:text-blue-400 font-medium">
                            <Plus className="w-3.5 h-3.5" /> Tambah Section
                        </button>
                    </div>

                    {content.features.map((feat, fIdx) => (
                        <Section key={fIdx} title={`Feature ${fIdx + 1}: ${feat.title.substring(0, 40)}...`}
                            visible={feat.visible !== false}
                            onVisibleChange={v => updateFeature(fIdx, 'visible' as any, v)}
                        >
                            <div className="space-y-4">
                                <Field label="Label (opsional, misal: FEATURES)" value={feat.label || ''} onChange={v => updateFeature(fIdx, 'label', v)} />
                                <Field label="Judul" value={feat.title} onChange={v => updateFeature(fIdx, 'title', v)} />
                                <Field label="Deskripsi" value={feat.description} onChange={v => updateFeature(fIdx, 'description', v)} textarea />

                                <ImageUploadField
                                    label={`Gambar Mockup Feature ${fIdx + 1}`}
                                    value={feat.mockup_image || ''}
                                    onChange={url => updateFeature(fIdx, 'mockup_image', url)}
                                />
                                {feat.mockup_image && (
                                    <ImageSettingsControls
                                        width={feat.mockup_image_width || 50}
                                        position={feat.mockup_image_position ?? 50}
                                        positionY={feat.mockup_image_position_y ?? 0}
                                        onWidthChange={w => updateFeature(fIdx, 'mockup_image_width' as any, w)}
                                        onPositionChange={p => updateFeature(fIdx, 'mockup_image_position' as any, p)}
                                        onPositionYChange={p => updateFeature(fIdx, 'mockup_image_position_y' as any, p)}
                                    />
                                )}

                                <div className="space-y-3 pt-2">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-medium text-zinc-500">Sub Items</label>
                                        <button onClick={() => addFeatureItem(fIdx)} className="text-xs text-blue-500 hover:text-blue-400">
                                            + Tambah Item
                                        </button>
                                    </div>
                                    {feat.items.map((item, iIdx) => (
                                        <div key={iIdx} className="bg-zinc-50 dark:bg-zinc-900/50 rounded-lg p-3 space-y-2 border border-zinc-100 dark:border-zinc-800">
                                            <div className="flex items-start gap-2">
                                                <div className="flex flex-col items-center gap-1 pt-1.5">
                                                    <IconPicker
                                                        value={item.icon || 'Robot'}
                                                        onChange={v => updateFeatureItem(fIdx, iIdx, 'icon' as any, v)}
                                                    />
                                                </div>
                                                <div className="flex-1 space-y-2">
                                                    <Field label={`Item ${iIdx + 1} - Judul`} value={item.title} onChange={v => updateFeatureItem(fIdx, iIdx, 'title', v)} />
                                                    <Field label="Deskripsi" value={item.description} onChange={v => updateFeatureItem(fIdx, iIdx, 'description', v)} />
                                                </div>
                                                {feat.items.length > 1 && (
                                                    <button onClick={() => removeFeatureItem(fIdx, iIdx)} className="p-1 text-red-400 hover:text-red-300 mt-5">
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {content.features.length > 1 && (
                                    <button onClick={() => removeFeatureSection(fIdx)} className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 pt-2">
                                        <Trash2 className="w-3 h-3" /> Hapus Section Ini
                                    </button>
                                )}
                            </div>
                        </Section>
                    ))}
                </div>

                {/* FAQ */}
                <Section title="FAQ"
                    visible={content.visibility?.faq !== false}
                    onVisibleChange={v => setContent(prev => ({ ...prev, visibility: { ...prev.visibility, faq: v } }))}
                >
                    <div className="space-y-3">
                        {content.faq.map((item, idx) => (
                            <div key={idx} className="bg-zinc-50 dark:bg-zinc-900/50 rounded-lg p-3 space-y-2 border border-zinc-100 dark:border-zinc-800">
                                <div className="flex items-start gap-2">
                                    <div className="flex-1 space-y-2">
                                        <Field label={`Pertanyaan ${idx + 1}`} value={item.question} onChange={v => updateFAQ(idx, 'question', v)} />
                                        <Field label="Jawaban" value={item.answer} onChange={v => updateFAQ(idx, 'answer', v)} textarea />
                                    </div>
                                    {content.faq.length > 1 && (
                                        <button onClick={() => removeFAQ(idx)} className="p-1 text-red-400 hover:text-red-300 mt-5">
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                        <button onClick={addFAQ} className="inline-flex items-center gap-1 text-xs text-blue-500 hover:text-blue-400 font-medium">
                            <Plus className="w-3.5 h-3.5" /> Tambah FAQ
                        </button>
                    </div>
                </Section>

                {/* CTA Section */}
                <Section title="CTA Section"
                    visible={content.visibility?.cta_section !== false}
                    onVisibleChange={v => setContent(prev => ({ ...prev, visibility: { ...prev.visibility, cta_section: v } }))}
                >
                    <div className="space-y-4">
                        <Field label="Judul" value={content.cta.title} onChange={v => updateCTA('title', v)} />
                        <Field label="Deskripsi" value={content.cta.description} onChange={v => updateCTA('description', v)} textarea />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Field label="Teks Tombol" value={content.cta.button_text} onChange={v => updateCTA('button_text', v)} />
                            <Field label="Link Tombol" value={content.cta.button_link} onChange={v => updateCTA('button_link', v)} />
                        </div>
                    </div>
                </Section>

                {/* Contact */}
                <Section title="Kontak WhatsApp"
                    visible={content.visibility?.contact !== false}
                    onVisibleChange={v => setContent(prev => ({ ...prev, visibility: { ...prev.visibility, contact: v } }))}
                >
                    <div className="space-y-4">
                        <Field label="Teks Ajakan" value={content.contact.text} onChange={v => updateContact('text', v)} />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Field label="Nomor WhatsApp (tampilan)" value={content.contact.whatsapp} onChange={v => updateContact('whatsapp', v)} placeholder="+62 812-xxxx-xxxx" />
                            <Field label="Link WhatsApp" value={content.contact.whatsapp_link} onChange={v => updateContact('whatsapp_link', v)} placeholder="https://wa.me/628xxx" />
                        </div>
                    </div>
                </Section>

                {/* Reset to defaults */}
                <div className="text-center py-4">
                    <button
                        onClick={() => { if (confirm('Reset semua konten ke default?')) setContent(DEFAULT_CONTENT) }}
                        className="text-xs text-zinc-500 hover:text-red-400 transition-colors"
                    >
                        Reset ke Default
                    </button>
                </div>
            </div>
        </div>
    )
}
