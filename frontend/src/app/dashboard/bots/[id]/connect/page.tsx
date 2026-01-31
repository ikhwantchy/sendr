'use client'

import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { ArrowLeft, QrCode, RefreshCw } from 'lucide-react'

export default function ConnectBotPage() {
    const params = useParams()
    const router = useRouter()
    const botId = params?.id as string
    const [qrCode, setQrCode] = useState<string | null>(null)
    const [isConnecting, setIsConnecting] = useState(false)
    const [countdown, setCountdown] = useState(30)

    // Fetch bot details
    const { data: bot } = useQuery({
        queryKey: ['bot', botId],
        queryFn: async () => {
            const response = await api.bots.get(botId)
            return response.data.data || response.data
        },
    })

    // Connect mutation
    const connectMutation = useMutation({
        mutationFn: async () => {
            const response = await api.bots.connect(botId)
            return response.data
        },
        onSuccess: (data) => {
            if (data.data?.qr_code || data.data?.qr) {
                setQrCode(data.data.qr_code || data.data.qr)
                setIsConnecting(true)
                setCountdown(30)
                toast.success('QR Code generated! Scan with WhatsApp')

                // Poll for connection status
                startPolling()
            }
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.error || 'Failed to generate QR code')
        },
    })

    // Poll connection status
    const startPolling = () => {
        const interval = setInterval(async () => {
            try {
                const response = await api.bots.status(botId)
                const status = response.data.data?.status || response.data.status

                if (status === 'connected') {
                    clearInterval(interval)
                    toast.success('Bot connected successfully!')
                    setTimeout(() => {
                        router.push(`/dashboard/bots/${botId}`)
                    }, 1500)
                }
            } catch (error) {
                console.error('Polling error:', error)
            }
        }, 3000) // Poll every 3 seconds

        // Stop polling after 5 minutes
        setTimeout(() => clearInterval(interval), 300000)
    }

    // Countdown timer
    useEffect(() => {
        if (qrCode && countdown > 0) {
            const timer = setInterval(() => {
                setCountdown(prev => prev - 1)
            }, 1000)
            return () => clearInterval(timer)
        }
    }, [qrCode, countdown])

    const handleConnect = () => {
        connectMutation.mutate()
    }

    const handleCancel = () => {
        router.push(`/dashboard/bots/${botId}`)
    }

    return (
        <div className="min-h-screen bg-[#09090b] flex items-center justify-center p-8">
            {/* Centered Modal */}
            <div className="w-full max-w-md">
                {/* Cancel Button */}
                <button
                    onClick={handleCancel}
                    className="flex items-center gap-2 text-zinc-500 hover:text-zinc-300 mb-6 transition-colors text-sm"
                >
                    <ArrowLeft className="w-4 h-4" />
                    CANCEL
                </button>

                {/* Modal Card */}
                <div className="bg-[#0e0e11] border border-zinc-800/50 rounded-xl overflow-hidden">
                    {!qrCode ? (
                        // Initial state - Show instructions
                        <div className="p-8 text-center">
                            {/* Icon */}
                            <div className="w-16 h-16 mx-auto mb-6 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                                <QrCode className="w-8 h-8 text-zinc-400" />
                            </div>

                            {/* Title */}
                            <h2 className="text-xl font-semibold text-white mb-2">
                                Connect WhatsApp
                            </h2>
                            <p className="text-sm text-zinc-500 mb-8">
                                Link your device to start automating messages.
                            </p>

                            {/* Instructions */}
                            <div className="mb-8">
                                <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-4">
                                    HOW TO CONNECT
                                </h3>
                                <div className="space-y-3 text-left">
                                    <div className="flex items-start gap-3 text-sm text-zinc-400">
                                        <div className="flex-shrink-0 w-5 h-5 rounded bg-zinc-900 border border-zinc-800 flex items-center justify-center text-xs text-zinc-500">
                                            1
                                        </div>
                                        <span>Open WhatsApp on your phone</span>
                                    </div>
                                    <div className="flex items-start gap-3 text-sm text-zinc-400">
                                        <div className="flex-shrink-0 w-5 h-5 rounded bg-zinc-900 border border-zinc-800 flex items-center justify-center text-xs text-zinc-500">
                                            2
                                        </div>
                                        <span>Go to Settings → Linked Devices</span>
                                    </div>
                                    <div className="flex items-start gap-3 text-sm text-zinc-400">
                                        <div className="flex-shrink-0 w-5 h-5 rounded bg-zinc-900 border border-zinc-800 flex items-center justify-center text-xs text-zinc-500">
                                            3
                                        </div>
                                        <span>Tap on Link a Device</span>
                                    </div>
                                    <div className="flex items-start gap-3 text-sm text-zinc-400">
                                        <div className="flex-shrink-0 w-5 h-5 rounded bg-zinc-900 border border-zinc-800 flex items-center justify-center text-xs text-zinc-500">
                                            4
                                        </div>
                                        <span>Scan the QR code shown here</span>
                                    </div>
                                </div>
                            </div>

                            {/* Generate Button */}
                            <button
                                onClick={handleConnect}
                                disabled={connectMutation.isPending}
                                className="w-full px-4 py-3 bg-white hover:bg-zinc-100 text-black font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {connectMutation.isPending ? (
                                    <>
                                        <RefreshCw className="w-4 h-4 animate-spin" />
                                        Generating...
                                    </>
                                ) : (
                                    <>
                                        <QrCode className="w-4 h-4" />
                                        Generate QR Code
                                    </>
                                )}
                            </button>
                        </div>
                    ) : (
                        // QR Code display
                        <div className="p-8 text-center">
                            {/* Title */}
                            <h2 className="text-xl font-semibold text-white mb-2">
                                Scan QR Code
                            </h2>
                            <p className="text-sm text-zinc-500 mb-8">
                                Point your camera at the code below
                            </p>

                            {/* QR Code */}
                            <div className="bg-white p-6 rounded-xl mx-auto w-fit mb-6">
                                <img
                                    src={qrCode}
                                    alt="QR Code"
                                    className="w-64 h-64"
                                />
                            </div>

                            {/* Countdown */}
                            <div className="flex items-center justify-center gap-2 text-sm text-zinc-500 mb-6">
                                <RefreshCw className="w-4 h-4" />
                                <span>Refresh in {countdown}s</span>
                            </div>

                            {/* Refresh Button */}
                            <button
                                onClick={handleConnect}
                                disabled={connectMutation.isPending}
                                className="w-full px-4 py-3 bg-zinc-900 hover:bg-zinc-800 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {connectMutation.isPending ? (
                                    <>
                                        <RefreshCw className="w-4 h-4 animate-spin" />
                                        Generating...
                                    </>
                                ) : (
                                    <>
                                        <RefreshCw className="w-4 h-4" />
                                        Refresh QR Code
                                    </>
                                )}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
