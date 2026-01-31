'use client'

import { useParams, useRouter } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import {
    ChevronLeft,
    Phone,
    Circle,
    Pause,
    Play,
    RefreshCw
} from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { toast } from 'sonner'
import BotTabsHeader from './BotTabsHeader'

export default function BotDetailTopBar() {
    const params = useParams()
    const router = useRouter()
    const queryClient = useQueryClient()
    const botId = params?.id as string

    const [isBotPausing, setIsBotPausing] = useState(false)

    const { data: bot, isLoading } = useQuery({
        queryKey: ['bot', botId],
        queryFn: async () => {
            const response = await api.bots.get(botId)
            return response.data.data || response.data
        },
        enabled: !!botId
    })

    if (isLoading || !bot) {
        return (
            <div className="w-full h-full flex items-center justify-between px-8 animate-pulse">
                <div className="flex items-center gap-4 flex-1">
                    <div className="w-8 h-8 bg-zinc-800 rounded-lg" />
                    <div className="w-24 h-4 bg-zinc-800 rounded-lg" />
                </div>
                <div className="flex-1 flex justify-center gap-12">
                    {[1, 2, 3].map(i => <div key={i} className="w-16 h-3 bg-zinc-800 rounded-lg" />)}
                </div>
                <div className="flex-1 flex justify-end">
                    <div className="w-20 h-8 bg-zinc-800 rounded-lg" />
                </div>
            </div>
        )
    }

    const isConnected = bot.status === 'connected'

    const handleToggleBotPause = async () => {
        setIsBotPausing(true)
        try {
            if (bot.is_paused) {
                await api.bots.resume(botId)
                toast.success('Bot resumed successfully')
            } else {
                await api.bots.pause(botId)
                toast.success('Bot paused successfully')
            }
            await queryClient.invalidateQueries({ queryKey: ['bot', botId] })
        } catch (error) {
            toast.error('Failed to update bot status')
        } finally {
            setIsBotPausing(false)
        }
    }

    return (
        <div className="w-full h-full flex items-center justify-between px-8">
            {/* Left: Bot Identity */}
            <div className="flex items-center gap-4 flex-1">
                <Link
                    href="/dashboard/bots"
                    className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors text-zinc-500 hover:text-zinc-100"
                >
                    <ChevronLeft className="w-5 h-5" />
                </Link>
                <div className="h-8 w-[1px] bg-zinc-800" />
                <div>
                    <div className="flex items-center gap-2">
                        <span className="font-bold text-zinc-100">{bot.name}</span>
                        <div className={`w-2 h-2 rounded-full ${isConnected ? (bot.is_paused ? 'bg-orange-500' : 'bg-emerald-500') : 'bg-zinc-500'}`} />
                    </div>
                    {bot.phone_number && (
                        <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 font-mono">
                            <Phone className="w-2.5 h-2.5" />
                            <span>{bot.phone_number}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Center: Tabs */}
            <div className="flex-1 flex justify-center">
                <BotTabsHeader botId={botId} />
            </div>

            {/* Right: Actions */}
            <div className="flex-1 flex justify-end items-center gap-3">
                {(isConnected || bot.is_paused) && (
                    <button
                        onClick={handleToggleBotPause}
                        disabled={isBotPausing}
                        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${bot.is_paused
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                            : 'bg-orange-500/10 border-orange-500/30 text-orange-400 hover:bg-orange-500/20'
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                        {isBotPausing ? (
                            <RefreshCw className="w-3 h-3 animate-spin" />
                        ) : bot.is_paused ? (
                            <Play className="w-3 h-3" />
                        ) : (
                            <Pause className="w-3 h-3" />
                        )}
                        <span>{bot.is_paused ? 'Resume' : 'Pause'}</span>
                    </button>
                )}
                {!isConnected && !bot.is_paused && bot.phone_number && (
                    <Link
                        href={`/dashboard/bots/${botId}/connect`}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all bg-blue-500/10 border-blue-500/30 text-blue-400 hover:bg-blue-500/20"
                    >
                        <RefreshCw className="w-3 h-3" />
                        <span>Reconnect</span>
                    </Link>
                )}
            </div>
        </div>
    )
}
