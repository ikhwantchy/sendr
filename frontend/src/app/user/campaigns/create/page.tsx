'use client'

import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import CreateCampaignWizard from '@/components/CreateCampaignWizard'
import { usePermissions } from '@/hooks/usePermissions'
import { api } from '@/lib/api'
import { Bot, Loader2, AlertCircle } from 'lucide-react'
import Link from 'next/link'

function CreateCampaignContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const botId = searchParams?.get('botId')
    const { filterBots, permissions, isAdmin } = usePermissions()
    
    const [loading, setLoading] = useState(true)
    const [bots, setBots] = useState<any[]>([])
    const [selectedBotId, setSelectedBotId] = useState<string>(botId || '')

    useEffect(() => {
        fetchBots()
    }, [permissions])

    const fetchBots = async () => {
        try {
            const res = await api.bots.list()
            const allBots = filterBots(res.data.data || [])
            // Admin has full access, otherwise filter by permission
            let userBots = allBots
            if (!isAdmin) {
                userBots = allBots.filter((bot: any) => {
                    const perm = permissions?.find((p: any) => p.bot_id === bot.id)
                    return perm?.can_create_campaigns === 1 || perm?.can_create_campaigns === true
                })
            }
            setBots(userBots)
            
            // If botId is provided, verify user has access
            if (botId && userBots.some((b: any) => b.id === botId)) {
                setSelectedBotId(botId)
            } else if (userBots.length === 1) {
                // Auto-select if only one bot
                setSelectedBotId(userBots[0].id)
            }
        } catch (error) {
            console.error('Failed to fetch bots')
        } finally {
            setLoading(false)
        }
    }

    const handleClose = (campaignId?: string) => {
        if (campaignId) {
            if (selectedBotId) {
                router.push(`/user/bots/${selectedBotId}?openCampaign=${campaignId}`)
            } else {
                router.push(`/user/campaigns?open=${campaignId}`)
            }
            return
        }

        if (selectedBotId) {
            router.push(`/user/bots/${selectedBotId}`)
        } else {
            router.push('/user/campaigns')
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-[#09090b]">
                <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
            </div>
        )
    }

    if (bots.length === 0) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-[#09090b] text-zinc-400">
                <div className="flex flex-col items-center gap-4 text-center max-w-md">
                    <div className="w-16 h-16 rounded-2xl bg-zinc-800/50 flex items-center justify-center">
                        <AlertCircle className="w-8 h-8 text-zinc-500" />
                    </div>
                    <h2 className="text-xl font-semibold text-white">No Access</h2>
                    <p className="text-zinc-500">
                        You don't have permission to create campaigns on any bots.
                        Contact your admin to get access.
                    </p>
                    <Link
                        href="/user/campaigns"
                        className="px-4 py-2 bg-zinc-800 text-white rounded-lg hover:bg-zinc-700 font-medium transition-colors"
                    >
                        Back to Campaigns
                    </Link>
                </div>
            </div>
        )
    }

    // Show bot selector if no bot is selected
    if (!selectedBotId) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-[#09090b]">
                <div className="w-full max-w-md p-6">
                    <div className="text-center mb-8">
                        <h1 className="text-2xl font-bold text-white mb-2">Create Campaign</h1>
                        <p className="text-zinc-500">Select a bot to create a campaign for</p>
                    </div>
                    
                    <div className="space-y-3">
                        {bots.map(bot => (
                            <button
                                key={bot.id}
                                onClick={() => setSelectedBotId(bot.id)}
                                className="w-full flex items-center gap-4 p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl hover:border-zinc-700 transition-colors text-left"
                            >
                                <div className="w-12 h-12 rounded-xl bg-zinc-800 flex items-center justify-center">
                                    <Bot className="w-6 h-6 text-zinc-400" />
                                </div>
                                <div>
                                    <h3 className="font-medium text-white">{bot.name}</h3>
                                    <p className="text-sm text-zinc-500">{bot.phone}</p>
                                </div>
                            </button>
                        ))}
                    </div>

                    <div className="mt-6 text-center">
                        <Link
                            href="/user/campaigns"
                            className="text-sm text-zinc-500 hover:text-white transition-colors"
                        >
                            Cancel
                        </Link>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <CreateCampaignWizard
            initialBotId={selectedBotId}
            onClose={handleClose}
        />
    )
}

export default function UserCreateCampaignPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-screen bg-[#09090b]">
                <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
            </div>
        }>
            <CreateCampaignContent />
        </Suspense>
    )
}
