'use client'

import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'

export default function ConnectBotPage() {
    const params = useParams()
    const router = useRouter()
    const botId = params.id as string
    const [qrCode, setQrCode] = useState<string | null>(null)
    const [isConnecting, setIsConnecting] = useState(false)

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

    const handleConnect = () => {
        connectMutation.mutate()
    }

    return (
        <div className="min-h-screen p-8">
            {/* Header */}
            <div className="mb-8">
                <Link
                    href={`/dashboard/bots/${botId}`}
                    className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-4 transition-colors"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Back to Bot
                </Link>

                <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
                    <span className="w-1.5 h-10 bg-gradient-to-b from-cyan-400 to-blue-600 rounded-full"></span>
                    Connect WhatsApp
                </h1>
                <p className="text-gray-400 text-lg">
                    {bot?.name || 'Bot'}
                </p>
            </div>

            {/* Content */}
            <div className="max-w-2xl mx-auto">
                <div className="glass rounded-2xl border border-white/10 overflow-hidden">
                    {!qrCode ? (
                        // Initial state - Show connect button
                        <div className="p-12 text-center">
                            <div className="w-24 h-24 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                                <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                </svg>
                            </div>

                            <h2 className="text-2xl font-bold text-white mb-4">
                                Ready to Connect
                            </h2>
                            <p className="text-gray-400 mb-8 max-w-md mx-auto">
                                Click the button below to generate a QR code. Then scan it with your WhatsApp to connect this bot.
                            </p>

                            <button
                                onClick={handleConnect}
                                disabled={connectMutation.isPending}
                                className="group px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl font-bold hover:shadow-2xl hover:shadow-cyan-500/50 transition-all disabled:opacity-50 relative overflow-hidden"
                            >
                                <div className="absolute inset-0 shimmer opacity-0 group-hover:opacity-100"></div>
                                <span className="relative z-10 flex items-center gap-2">
                                    {connectMutation.isPending ? (
                                        <>
                                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                            Generating QR Code...
                                        </>
                                    ) : (
                                        <>
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                            </svg>
                                            Generate QR Code
                                        </>
                                    )}
                                </span>
                            </button>

                            {/* Instructions */}
                            <div className="mt-12 pt-8 border-t border-white/10">
                                <h3 className="text-lg font-bold text-white mb-4">How to Connect:</h3>
                                <div className="space-y-3 text-left max-w-md mx-auto">
                                    <div className="flex items-start gap-3">
                                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-sm font-bold">1</div>
                                        <p className="text-gray-400">Click "Generate QR Code" button</p>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-sm font-bold">2</div>
                                        <p className="text-gray-400">Open WhatsApp on your phone</p>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-sm font-bold">3</div>
                                        <p className="text-gray-400">Go to Settings → Linked Devices → Link a Device</p>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-sm font-bold">4</div>
                                        <p className="text-gray-400">Scan the QR code shown on this page</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        // QR Code display
                        <div className="p-12">
                            <div className="text-center mb-8">
                                <h2 className="text-2xl font-bold text-white mb-2">
                                    Scan QR Code
                                </h2>
                                <p className="text-gray-400">
                                    Open WhatsApp and scan this code
                                </p>
                            </div>

                            {/* QR Code */}
                            <div className="bg-white p-8 rounded-2xl mx-auto w-fit mb-8">
                                <img
                                    src={qrCode}
                                    alt="QR Code"
                                    className="w-64 h-64"
                                />
                            </div>

                            {/* Status */}
                            <div className="text-center">
                                <div className="inline-flex items-center gap-3 px-6 py-3 bg-cyan-500/10 border border-cyan-500/30 rounded-xl">
                                    <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></div>
                                    <span className="text-cyan-400 font-medium">
                                        Waiting for scan...
                                    </span>
                                </div>
                            </div>

                            {/* Instructions */}
                            <div className="mt-8 pt-8 border-t border-white/10">
                                <h3 className="text-sm font-bold text-white mb-3 text-center">On your phone:</h3>
                                <div className="space-y-2 text-sm text-gray-400 max-w-md mx-auto">
                                    <p>1. Open WhatsApp</p>
                                    <p>2. Tap Menu (⋮) or Settings</p>
                                    <p>3. Tap Linked Devices → Link a Device</p>
                                    <p>4. Point your phone at this screen to scan the code</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
