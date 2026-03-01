'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import {
    CheckCircle2, AlertCircle, Loader2, Eye, EyeOff,
    ExternalLink, Copy, Check, Zap, Shield, ChevronRight, Share2, Info, ArrowRight, MessageSquare
} from 'lucide-react'

interface MetaConfigPanelProps {
    botId: string
    bot: any
}

interface MetaConfig {
    phone_number_id: string
    access_token: string
    waba_id: string
    app_secret: string
}

export default function MetaConfigPanel({ botId, bot }: MetaConfigPanelProps) {
    const queryClient = useQueryClient()
    const isWaba = bot?.adapter_type === 'meta_cloud'
    const [activating, setActivating] = useState(false)

    const [config, setConfig] = useState<MetaConfig>({
        phone_number_id: bot?.meta_phone_number_id || '',
        access_token: bot?.meta_access_token || '',
        waba_id: bot?.meta_waba_id || '',
        app_secret: bot?.meta_app_secret || '',
    })
    const [showToken, setShowToken] = useState(false)
    const [showSecret, setShowSecret] = useState(false)
    const [testResult, setTestResult] = useState<{ success: boolean; phone?: string; name?: string; error?: string } | null>(null)
    const [isTesting, setIsTesting] = useState(false)
    const [copied, setCopied] = useState(false)

    const webhookUrl = typeof window !== 'undefined'
        ? `${window.location.origin.replace('3000', '3001')}/api/webhooks/meta`
        : '/api/webhooks/meta'

    const saveMutation = useMutation({
        mutationFn: () => api.bots.meta.saveConfig(botId, config),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['bot', botId] })
            toast.success('Konfigurasi WABA berhasil disimpan & terhubung!')
            setTestResult(null)
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.error || 'Gagal menyimpan konfigurasi')
        }
    })

    const handleActivate = async () => {
        setActivating(true)
        try {
            await api.bots.update(botId, { adapter_type: 'meta_cloud' })
            queryClient.invalidateQueries({ queryKey: ['bot', botId] })
            toast.success('WABA Mode aktif! Isi kredensial di form yang tersedia.')
        } catch (err: any) {
            toast.error('Gagal mengaktifkan WABA mode')
        } finally {
            setActivating(false)
        }
    }

    const handleDeactivate = async () => {
        if (!confirm('Nonaktifkan WABA? Bot akan kembali ke mode web (Baileys) dan koneksi Meta Cloud API akan terputus.')) return
        try {
            await api.bots.update(botId, { adapter_type: 'baileys' })
            queryClient.invalidateQueries({ queryKey: ['bot', botId] })
            toast.success('WABA dinonaktifkan. Anda sekarang kembali ke mode Baileys.')
        } catch (err: any) {
            toast.error('Gagal menonaktifkan WABA')
        }
    }

    const handleTest = async () => {
        if (!config.phone_number_id || !config.access_token) {
            toast.error('Phone Number ID dan Access Token wajib diisi')
            return
        }
        setIsTesting(true)
        setTestResult(null)
        try {
            const res = await api.bots.meta.testConnection(botId, config)
            const data = res.data?.data
            setTestResult(data)
            if (data?.success) {
                toast.success(`Terhubung! ${data.phone_number ? `+${data.phone_number}` : ''}`)
            } else {
                toast.error(data?.error || 'Koneksi gagal')
            }
        } catch (err: any) {
            const errMsg = err.response?.data?.error || 'Koneksi gagal'
            setTestResult({ success: false, error: errMsg })
            toast.error(errMsg)
        } finally {
            setIsTesting(false)
        }
    }

    const handleCopyWebhook = () => {
        navigator.clipboard.writeText(webhookUrl)
        setCopied(true)
        toast.success('Webhook URL disalin!')
        setTimeout(() => setCopied(false), 2000)
    }

    const isFormFilled = config.phone_number_id && config.access_token

    return (
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 w-full">
            {/* LEFT COLUMN: FORM / EMPTY STATE */}
            <div className="flex-1 space-y-6">
                <div className="mb-4">
                    <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
                        WhatsApp Business API
                        {isWaba && <div className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] text-emerald-400 font-bold uppercase tracking-wider ml-1">Terverifikasi</div>}
                    </h2>
                    <p className="text-sm text-zinc-400 mt-1">Konfigurasikan integrasi Meta Cloud API ke nomor resmi Anda</p>
                </div>

                {!isWaba ? (
                    // ── Activation Gate: shown when bot is NOT yet in WABA mode ──
                    <div className="flex flex-col items-center text-center py-10 px-6 sm:px-8 bg-zinc-900/40 border border-zinc-800/80 rounded-2xl shadow-xl">
                        <div className="relative">
                            <div className="absolute inset-0 bg-green-500 blur-xl opacity-20 rounded-full"></div>
                            <div className="w-20 h-20 bg-green-500/10 border border-green-500/20 rounded-2xl flex items-center justify-center mb-6 relative z-10">
                                <Shield size={36} className="text-green-400" />
                            </div>
                        </div>
                        <h3 className="text-xl font-bold text-white mb-3">Tingkatkan dengan Meta WABA</h3>
                        <p className="text-sm text-zinc-400 max-w-sm mb-8 leading-relaxed">
                            Beralih menggunakan jalur resmi Facebook/Meta. WABA adalah API cloud WhatsApp resmi dengan fitur kirim blast skala massal tanpa khawatir pemblokiran (banned).
                        </p>

                        <button
                            onClick={handleActivate}
                            disabled={activating}
                            className="group flex items-center gap-3 px-8 py-3.5 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl transition-all shadow-[0_0_20px_rgba(22,163,74,0.3)] hover:shadow-[0_0_25px_rgba(22,163,74,0.5)] disabled:opacity-50"
                        >
                            {activating ? <Loader2 size={18} className="animate-spin" /> : <Zap size={18} className="text-green-100 group-hover:scale-110 transition-transform" />}
                            Iya, Aktifkan WABA Mode
                            {!activating && <ChevronRight size={18} className="text-green-100 group-hover:translate-x-1 transition-transform" />}
                        </button>
                    </div>
                ) : (
                    // ── Config Form: shown when adapter_type = 'meta_cloud' ──
                    <div className="space-y-6">
                        {/* Status bar */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl shadow-lg shadow-emerald-500/5">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                                    <CheckCircle2 size={18} />
                                </div>
                                <div>
                                    <div className="text-sm text-emerald-400 font-semibold">
                                        WABA Mode Aktif
                                    </div>
                                    <div className="text-xs text-zinc-400 mt-0.5">
                                        {bot.phone_number ? `Nomor terhubung: +${bot.phone_number}` : 'Belum ada nomor yang dikonfigurasi'}
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={handleDeactivate}
                                className="text-xs font-medium text-zinc-500 hover:text-red-400 transition-colors bg-zinc-900/50 hover:bg-red-500/10 px-3 py-1.5 rounded-lg border border-transparent hover:border-red-500/20"
                            >
                                Batal / Nonaktifkan
                            </button>
                        </div>

                        {/* Credentials form */}
                        <div className="bg-zinc-900/30 border border-zinc-800 rounded-xl p-5 sm:p-6 space-y-5">
                            <div>
                                <label className="flex items-center justify-between mb-1.5">
                                    <span className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider">Phone Number ID <span className="text-red-400">*</span></span>
                                    <span className="text-[10px] text-zinc-500">Dari Meta App Settings</span>
                                </label>
                                <input
                                    type="text"
                                    value={config.phone_number_id}
                                    onChange={e => setConfig(p => ({ ...p, phone_number_id: e.target.value }))}
                                    placeholder="e.g. 123456789012345"
                                    className="w-full px-4 py-3 bg-black border border-zinc-800 rounded-xl text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-blue-500 transition-all font-mono shadow-inner shadow-black/50"
                                />
                            </div>

                            <div>
                                <label className="flex items-center justify-between mb-1.5">
                                    <span className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider">Access Token <span className="text-red-400">*</span></span>
                                    <span className="text-[10px] text-zinc-500">Temporary atau Permanent Token</span>
                                </label>
                                <div className="relative">
                                    <input
                                        type={showToken ? 'text' : 'password'}
                                        value={config.access_token}
                                        onChange={e => setConfig(p => ({ ...p, access_token: e.target.value }))}
                                        placeholder="EAAQAxC..."
                                        className="w-full px-4 py-3 pr-12 bg-black border border-zinc-800 rounded-xl text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-blue-500 transition-all font-mono shadow-inner shadow-black/50"
                                    />
                                    <button type="button" onClick={() => setShowToken(!showToken)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 p-1.5 rounded-lg hover:bg-zinc-800 transition-colors">
                                        {showToken ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                <div>
                                    <label className="flex flex-col mb-1.5">
                                        <span className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider">WhatsApp Business ID</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={config.waba_id}
                                        onChange={e => setConfig(p => ({ ...p, waba_id: e.target.value }))}
                                        placeholder="e.g. 9876543210"
                                        className="w-full px-4 py-3 bg-black border border-zinc-800 rounded-xl text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-blue-500 transition-all font-mono"
                                    />
                                    <p className="text-[10px] text-zinc-500 mt-1.5 ml-1">Dibutuhkan untuk import template Meta.</p>
                                </div>

                                <div>
                                    <label className="flex flex-col mb-1.5">
                                        <span className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider">App Secret</span>
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showSecret ? 'text' : 'password'}
                                            value={config.app_secret}
                                            onChange={e => setConfig(p => ({ ...p, app_secret: e.target.value }))}
                                            placeholder="Optional"
                                            className="w-full px-4 py-3 pr-10 bg-black border border-zinc-800 rounded-xl text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-blue-500 transition-all font-mono"
                                        />
                                        <button type="button" onClick={() => setShowSecret(!showSecret)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300">
                                            {showSecret ? <EyeOff size={14} /> : <Eye size={14} />}
                                        </button>
                                    </div>
                                    <p className="text-[10px] text-zinc-500 mt-1.5 ml-1">Untuk verifikasi keamanan Webhook.</p>
                                </div>
                            </div>
                        </div>

                        {/* Test result indicator */}
                        {testResult && (
                            <div className={`flex items-start gap-3 px-5 py-3.5 rounded-xl border text-sm ${testResult.success
                                ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400'
                                : 'bg-red-500/5 border-red-500/20 text-red-400'}`}>
                                {testResult.success
                                    ? <CheckCircle2 size={18} className="shrink-0 mt-0.5" />
                                    : <AlertCircle size={18} className="shrink-0 mt-0.5" />}
                                <div className="flex flex-col">
                                    <span className="font-semibold text-[13px]">
                                        {testResult.success ? 'Koneksi Berhasil Diverifikasi' : 'Gagal Menghubungkan'}
                                    </span>
                                    <span className="opacity-90 mt-0.5">
                                        {testResult.success
                                            ? `Akun Meta Cloud siap digunakan. Nomor: +${testResult.phone}${testResult.name ? ` (${testResult.name})` : ''}`
                                            : testResult.error}
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* Action buttons */}
                        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                            <button
                                onClick={handleTest}
                                disabled={!isFormFilled || isTesting || saveMutation.isPending}
                                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-sm font-semibold rounded-xl border border-zinc-700 disabled:opacity-50 transition-all"
                            >
                                {isTesting ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
                                Test Koneksi
                            </button>
                            <button
                                onClick={() => saveMutation.mutate()}
                                disabled={!isFormFilled || saveMutation.isPending || isTesting}
                                className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-xl disabled:opacity-50 transition-all shadow-[0_4px_14px_rgba(37,99,235,0.25)] hover:shadow-[0_6px_20px_rgba(37,99,235,0.4)]"
                            >
                                {saveMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                                Simpan Kredensial
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* RIGHT COLUMN: GUIDE */}
            <div className="hidden lg:block w-[340px] xl:w-[400px] shrink-0">
                <div className="sticky top-6 bg-zinc-900/30 border border-zinc-800 rounded-2xl p-6 shadow-xl">
                    <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 mb-6">
                        <Info size={16} className="text-blue-400" />
                        Panduan Setup WABA
                    </h4>

                    <div className="space-y-6 relative">
                        {/* Vertical line connecting steps */}
                        <div className="absolute left-[15px] top-4 bottom-8 w-px bg-zinc-800"></div>

                        {[
                            {
                                no: 1,
                                title: "Buat Aplikasi Klasik (Meta)",
                                desc: "Buka developers.facebook.com, buat aplikasi tipe WhatsApp di portfolio bisnis Anda."
                            },
                            {
                                no: 2,
                                title: "Setup API WhatsApp",
                                desc: "Dari dashboard app Meta, ke WhatsApp > Persiapan API. Tambahkan dompet/metode pembayaran jika production."
                            },
                            {
                                no: 3,
                                title: "Salin Kredensial",
                                desc: "Salin 'ID Nomor Telepon' (bukan ID Akun WB) dan 'Token Akses Sementara/Permanen' ke form sebelah kiri."
                            },
                            {
                                no: 4,
                                title: "Setup Webhook (Penting!)",
                                desc: "Daftarkan URL di bawah ke konfigurasi Meta Webhook agar bot bisa membalas pesan secara real-time."
                            }
                        ].map((step, i) => (
                            <div key={i} className="flex gap-4 relative z-10">
                                <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center font-bold text-xs shrink-0 ${isWaba && config.phone_number_id && i < 3 ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' : 'bg-black border-zinc-700 text-zinc-400'}`}>
                                    {isWaba && config.phone_number_id && i < 3 ? <Check size={14} /> : step.no}
                                </div>
                                <div className="pt-1.5">
                                    <h5 className="text-[13px] font-bold text-zinc-200 mb-1 leading-none">{step.title}</h5>
                                    <p className="text-[11px] text-zinc-500 leading-relaxed">{step.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {isWaba && (
                        <div className="mt-8 pt-6 border-t border-zinc-800 space-y-3">
                            <label className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider">
                                URL Callback Webhook
                            </label>
                            <div className="flex bg-black border border-zinc-800 rounded-lg p-1">
                                <code className="flex-1 text-[10px] sm:text-xs text-zinc-300 font-mono px-3 py-2 truncate flex items-center">
                                    {webhookUrl}
                                </code>
                                <button
                                    onClick={handleCopyWebhook}
                                    className="p-2 bg-zinc-900 hover:bg-zinc-800 rounded-md text-zinc-400 hover:text-white transition-all shrink-0"
                                    title="Copy Webhook URL"
                                >
                                    {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                                </button>
                            </div>
                            <div className="flex bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-[11px] text-zinc-400 gap-2">
                                <Share2 size={14} className="shrink-0 text-blue-400 mt-0.5" />
                                <p>Pastikan untuk subscribe event <strong className="text-white normal-case">messages</strong> di konfigurasi Meta Anda.</p>
                            </div>
                            <a
                                href="https://developers.facebook.com/docs/whatsapp/cloud-api/guides/set-up-webhooks"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 text-[11px] font-medium text-blue-400 hover:text-blue-300 transition-colors mt-2"
                            >
                                Baca Dokumentasi Resmi Meta API <ExternalLink size={12} />
                            </a>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
