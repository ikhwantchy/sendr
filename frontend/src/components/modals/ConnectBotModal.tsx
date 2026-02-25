'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useState, useEffect, useRef, useCallback } from 'react'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import { X, QrCode, RefreshCw, CheckCircle2, Phone, HelpCircle, Info } from 'lucide-react'

type ConnectMode = 'qr' | 'phone'

interface ConnectBotModalProps {
    botId: string;
    onClose: () => void;
}

function Tooltip({ text }: { text: string }) {
    const [show, setShow] = useState(false)
    return (
        <span className="relative inline-flex items-center">
            <HelpCircle
                className="w-3.5 h-3.5 text-zinc-600 hover:text-zinc-400 cursor-help transition-colors"
                onMouseEnter={() => setShow(true)}
                onMouseLeave={() => setShow(false)}
            />
            {show && (
                <motion.span
                    initial={{ opacity: 0, scale: 0.95, y: 10, x: '-50%' }}
                    animate={{ opacity: 1, scale: 1, y: 0, x: '-50%' }}
                    exit={{ opacity: 0, scale: 0.95, y: 10, x: '-50%' }}
                    className="absolute left-1/2 bottom-full mb-2 z-[110] w-64 p-3 bg-zinc-800 border border-zinc-700 rounded-xl text-[11px] text-zinc-300 shadow-2xl">
                    <span className="block mb-1 font-medium text-zinc-100 flex items-center gap-1">
                        <Info className="w-3 h-3" /> Instructions
                    </span>
                    {text}
                    {/* Arrow */}
                    <span className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-zinc-800" />
                </motion.span>
            )}
        </span>
    )
}

export default function ConnectBotModal({ botId, onClose }: ConnectBotModalProps) {
    const queryClient = useQueryClient()
    const [mode, setMode] = useState<ConnectMode>('qr')
    const [qrCode, setQrCode] = useState<string | null>(null)
    const [pairingCode, setPairingCode] = useState<string | null>(null)
    const [pairingPhone, setPairingPhone] = useState<string | null>(null)
    const [phoneInput, setPhoneInput] = useState('')
    const [countdown, setCountdown] = useState(60)
    const [justConnected, setJustConnected] = useState(false)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)

    const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)
    const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)

    const stopAll = useCallback(() => {
        if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null }
        if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null }
    }, [])

    const startStatusPolling = useCallback(() => {
        if (pollingRef.current) clearInterval(pollingRef.current)
        pollingRef.current = setInterval(async () => {
            try {
                const res = await api.bots.get(botId)
                const bot = res.data.data || res.data
                if (bot?.status === 'connected') {
                    stopAll()
                    setJustConnected(true)
                    queryClient.invalidateQueries({ queryKey: ['bot', botId] })
                    setTimeout(() => onClose(), 2000)
                }
            } catch { }
        }, 2000)
    }, [botId, onClose, stopAll, queryClient])

    const startCountdown = useCallback((secs: number, onExpire: () => void) => {
        if (countdownRef.current) clearInterval(countdownRef.current)
        setCountdown(secs)
        countdownRef.current = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) {
                    clearInterval(countdownRef.current!)
                    countdownRef.current = null
                    onExpire()
                    return 0
                }
                return prev - 1
            })
        }, 1000)
    }, [])

    const connectMutation = useMutation({
        mutationFn: () => api.bots.connect(botId).then(r => r.data),
        onSuccess: (data) => {
            if (data.data?.qr_code) setQrCode(data.data.qr_code)
            startStatusPolling()
            startCountdown(60, () => {
                setQrCode(null)
                toast.warning('QR expired — click Refresh to get a new one.')
            })
        },
        onError: (error: any) => {
            const msg = error.response?.data?.error || error.message || 'Failed to generate QR code'
            setErrorMessage(msg)
        },
    })

    const pairMutation = useMutation({
        mutationFn: (phone: string) => api.bots.pair(botId, phone || undefined).then(r => r.data),
        onSuccess: (data) => {
            setPairingCode(data.data?.code ?? null)
            setPairingPhone(data.data?.phone ?? null)
            startStatusPolling()
            startCountdown(120, () => {
                setPairingCode(null)
                toast.warning('Pairing code expired — click Refresh to get a new one.')
            })
        },
        onError: (error: any) => {
            const msg = error.response?.data?.error || error.message || 'Failed to generate pairing code'
            setErrorMessage(msg)
        },
    })

    useEffect(() => {
        // Stop all timers when modal is closed
        return () => stopAll()
    }, [stopAll])

    const handleSwitchMode = (m: ConnectMode) => {
        setMode(m)
        setQrCode(null)
        setPairingCode(null)
        setPairingPhone(null)
        setErrorMessage(null)
        stopAll()
    }

    const handleQR = () => {
        setQrCode(null); setErrorMessage(null); stopAll()
        connectMutation.mutate()
    }
    const handlePair = () => {
        setPairingCode(null); setPairingPhone(null); setErrorMessage(null); stopAll()
        pairMutation.mutate(phoneInput.trim())
    }

    // Modal Overlay
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop with blur */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="absolute inset-0 bg-black/60 backdrop-blur-md"
                onClick={onClose}
            />

            <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.95 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="relative w-full max-w-[420px]"
            >
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute -top-12 right-0 p-2 text-zinc-500 hover:text-white transition-colors"
                >
                    <X className="w-6 h-6" />
                </button>

                {/* Main Card */}
                <div className="bg-[#0e0e11] border border-zinc-800/50 rounded-2xl flex flex-col w-full h-[580px] overflow-hidden shadow-2xl">

                    {justConnected ? (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="flex-1 flex flex-col items-center justify-center text-center p-8">
                            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                            </div>
                            <p className="text-white font-medium">Connected!</p>
                            <p className="text-zinc-500 text-sm mt-1">Starting bot services...</p>
                        </motion.div>
                    ) : (
                        <>
                            {/* Tabs */}
                            <div className="flex text-sm font-medium border-b border-zinc-800/50 bg-[#0e0e11]">
                                {(['qr', 'phone'] as ConnectMode[]).map(m => (
                                    <button key={m} onClick={() => handleSwitchMode(m)}
                                        className={`flex-1 flex items-center justify-center gap-2 py-4 transition-all relative ${mode === m ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'
                                            }`}>
                                        {m === 'qr' ? <QrCode className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
                                        {m === 'qr' ? 'QR Code' : 'Phone Number'}
                                        {mode === m && (
                                            <motion.span
                                                layoutId="activeTab"
                                                className="absolute bottom-0 left-0 right-0 h-0.5 bg-white"
                                            />
                                        )}
                                    </button>
                                ))}
                            </div>

                            {/* Content Area */}
                            <div className="flex-1 flex flex-col p-8 items-center justify-center text-center overflow-visible">
                                {/* QR Tab */}
                                {mode === 'qr' && (
                                    <motion.div
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -10 }}
                                        className="w-full">
                                        {qrCode ? (
                                            <>
                                                <div className="flex items-center justify-center gap-2 mb-4 text-[13px] text-zinc-400">
                                                    <span>Scan with WhatsApp</span>
                                                    <Tooltip text="Open WhatsApp on your phone → Settings → Linked Devices → Link a Device, then scan this code." />
                                                </div>

                                                <div className="relative bg-white p-5 rounded-2xl inline-block mb-6 shadow-xl">
                                                    <img src={qrCode} alt="QR Code" className="w-56 h-56 block rounded-lg overflow-hidden" />
                                                    {countdown <= 10 && (
                                                        <div className="absolute inset-0 bg-black/80 rounded-2xl flex flex-col items-center justify-center gap-1">
                                                            <span className="text-white text-4xl font-mono font-medium">{countdown}</span>
                                                            <span className="text-white/60 text-[10px] uppercase font-medium">Refreshing</span>
                                                        </div>
                                                    )}
                                                </div>

                                                <button onClick={handleQR} disabled={connectMutation.isPending}
                                                    className="w-full py-3 text-[13px] bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl transition-colors border border-zinc-800 flex items-center justify-center gap-2 disabled:opacity-40">
                                                    <RefreshCw className={`w-3.5 h-3.5 ${connectMutation.isPending ? 'animate-spin' : ''}`} />
                                                    {connectMutation.isPending ? 'Refreshing...' : 'Refresh QR Code'}
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                {errorMessage && (
                                                    <div className="mb-6 p-4 bg-red-500/5 border border-red-500/20 rounded-xl text-left">
                                                        <p className="text-[13px] text-red-400 leading-relaxed">{errorMessage}</p>
                                                    </div>
                                                )}

                                                <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-zinc-900 border border-zinc-800/50 flex items-center justify-center shadow-inner">
                                                    {connectMutation.isPending
                                                        ? <RefreshCw className="w-8 h-8 text-zinc-400 animate-spin" />
                                                        : <QrCode className="w-8 h-8 text-zinc-400" />
                                                    }
                                                </div>

                                                <h2 className="text-xl font-medium text-white mb-2 tracking-tight">QR Authentication</h2>
                                                <p className="text-[14px] text-zinc-500 mb-8 leading-relaxed px-4">
                                                    {connectMutation.isPending ? 'Generating code...' : 'The fastest way to connect. Just scan the code with your phone.'}
                                                </p>

                                                <button onClick={handleQR} disabled={connectMutation.isPending}
                                                    className="w-full py-3.5 text-[14px] bg-white hover:bg-zinc-100 text-black font-medium rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                                                    {connectMutation.isPending
                                                        ? <><RefreshCw className="w-4 h-4 animate-spin" /> Connecting...</>
                                                        : <><QrCode className="w-4 h-4" /> Link with QR Code</>
                                                    }
                                                </button>
                                            </>
                                        )}
                                    </motion.div>
                                )}

                                {/* Phone Tab */}
                                {mode === 'phone' && (
                                    <motion.div
                                        initial={{ opacity: 0, x: 10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 10 }}
                                        className="w-full">
                                        {pairingCode ? (
                                            <>
                                                <div className="flex items-center justify-center gap-2 mb-2 text-zinc-400">
                                                    <h3 className="text-lg font-medium text-white">Enter this code</h3>
                                                    <Tooltip text="Go to WhatsApp → Settings → Linked Devices → Link with Phone Number, then enter this 8-character code." />
                                                </div>
                                                {pairingPhone && (
                                                    <p className="text-[12px] text-emerald-400 font-medium mb-8">Pairing with +{pairingPhone}</p>
                                                )}

                                                <div className="flex items-center justify-center gap-1.5 mb-8">
                                                    {pairingCode.split('-').map((part, i) => (
                                                        <div key={i} className="flex items-center gap-1.5">
                                                            {part.split('').map((char, j) => (
                                                                <div key={j} className="w-9 h-12 sm:w-10 sm:h-14 bg-zinc-900 border border-zinc-800 rounded-lg flex items-center justify-center text-2xl font-mono font-medium text-white">
                                                                    {char}
                                                                </div>
                                                            ))}
                                                            {i === 0 && <span className="text-zinc-700 text-xl font-light mx-0.5">—</span>}
                                                        </div>
                                                    ))}
                                                </div>

                                                <button onClick={() => {
                                                    navigator.clipboard.writeText(pairingCode.replace('-', ''))
                                                    toast.success('Code copied')
                                                }} className="text-[11px] text-zinc-500 hover:text-zinc-400 font-medium uppercase tracking-wider transition-colors mb-8 block mx-auto underline underline-offset-4">
                                                    Copy Code
                                                </button>

                                                <button onClick={handlePair} disabled={pairMutation.isPending}
                                                    className="w-full py-3 text-[13px] bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl transition-colors border border-zinc-800 flex items-center justify-center gap-2 disabled:opacity-40">
                                                    <RefreshCw className={`w-3.5 h-3.5 ${pairMutation.isPending ? 'animate-spin' : ''}`} />
                                                    Regenerate Code
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                {errorMessage && (
                                                    <div className="mb-6 p-4 bg-red-500/5 border border-red-500/20 rounded-xl text-left">
                                                        <p className="text-[13px] text-red-400 leading-relaxed">{errorMessage}</p>
                                                    </div>
                                                )}

                                                <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-zinc-900 border border-zinc-800/50 flex items-center justify-center shadow-inner">
                                                    {pairMutation.isPending
                                                        ? <RefreshCw className="w-8 h-8 text-zinc-500 animate-spin" />
                                                        : <Phone className="w-8 h-8 text-zinc-500" />
                                                    }
                                                </div>

                                                <h2 className="text-xl font-medium text-white mb-2 tracking-tight">Linking with Code</h2>
                                                <p className="text-[14px] text-zinc-500 mb-8 leading-relaxed px-4">
                                                    No camera? Use an 8-digit verification code to link your bot instantly.
                                                </p>

                                                <div className="w-full max-w-[280px] mx-auto mb-8 text-left">
                                                    <label className="block text-[11px] font-medium uppercase tracking-wider text-zinc-500 mb-2 px-1">
                                                        WhatsApp Number
                                                    </label>
                                                    <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden focus-within:border-zinc-700 focus-within:bg-zinc-900/80 transition-all">
                                                        <span className="pl-4 pr-1 py-3 text-zinc-500 text-base font-medium">+</span>
                                                        <input
                                                            id="phone-input"
                                                            type="tel"
                                                            inputMode="numeric"
                                                            placeholder="628123456789"
                                                            value={phoneInput}
                                                            onChange={e => setPhoneInput(e.target.value.replace(/\D/g, ''))}
                                                            className="flex-1 bg-transparent px-2 py-3 text-white text-base font-mono outline-none placeholder-zinc-700"
                                                            disabled={pairMutation.isPending}
                                                            onKeyDown={e => { if (e.key === 'Enter' && phoneInput.trim()) handlePair() }}
                                                        />
                                                    </div>
                                                </div>

                                                <button
                                                    id="get-pairing-code-btn"
                                                    onClick={handlePair}
                                                    disabled={pairMutation.isPending || phoneInput.length < 9}
                                                    className="w-full py-3.5 text-[14px] bg-white hover:bg-zinc-100 text-black font-medium rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                                                    {pairMutation.isPending
                                                        ? <><RefreshCw className="w-4 h-4 animate-spin" /> Generating...</>
                                                        : <><Phone className="w-4 h-4" /> Get Pairing Code</>
                                                    }
                                                </button>
                                            </>
                                        )}
                                    </motion.div>
                                )}
                            </div>

                            {/* Footer Info */}
                            <div className="p-5 bg-zinc-900/30 border-t border-zinc-800/50 text-center">
                                <p className="text-[11px] text-zinc-600 font-medium">
                                    Linked devices are encrypted end-to-end.
                                </p>
                            </div>
                        </>
                    )}
                </div>
            </motion.div>
        </div>
    )
}
