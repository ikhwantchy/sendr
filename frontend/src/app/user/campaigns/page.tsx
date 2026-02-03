'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'next/navigation'
import { api } from '@/lib/api'
import { usePermissions } from '@/hooks/usePermissions'
import Link from 'next/link'
import { 
    Megaphone, 
    Plus, 
    MagnifyingGlass, 
    Calendar,
    CheckCircle,
    Clock,
    XCircle,
    PaperPlaneTilt
} from '@phosphor-icons/react'

export default function UserCampaignsPage() {
    const searchParams = useSearchParams()
    const botIdParam = searchParams?.get('botId')
    
    const { permissions, filterBots } = usePermissions()
    const [selectedBotId, setSelectedBotId] = useState<string>(botIdParam || '')
    const [searchQuery, setSearchQuery] = useState('')

    // Get bots that user can create campaigns for
    const campaignBotIds = useMemo(() => {
        return permissions
            ?.filter((p: any) => p.can_create_campaigns === 1 || p.can_create_campaigns === true)
            .map((p: any) => p.bot_id) || []
    }, [permissions])

    // Fetch all bots
    const { data: allBots } = useQuery({
        queryKey: ['bots'],
        queryFn: async () => {
            const res = await api.bots.list()
            return res.data.data || []
        },
    })

    // Filter to only bots user has campaign access to
    const myBots = useMemo(() => {
        const filtered = filterBots(allBots || [])
        return filtered.filter((bot: any) => campaignBotIds.includes(bot.id))
    }, [allBots, filterBots, campaignBotIds])

    // Auto-select first bot if none selected
    useMemo(() => {
        if (!selectedBotId && myBots.length > 0) {
            setSelectedBotId(myBots[0].id)
        }
    }, [myBots, selectedBotId])

    // Fetch campaigns for selected bot
    const { data: campaigns, isLoading } = useQuery({
        queryKey: ['campaigns', selectedBotId],
        queryFn: async () => {
            if (!selectedBotId) return []
            const res = await api.campaigns.getByBot(selectedBotId)
            return res.data.data || []
        },
        enabled: !!selectedBotId,
    })

    // Filter campaigns by search
    const filteredCampaigns = useMemo(() => {
        if (!searchQuery) return campaigns || []
        return (campaigns || []).filter((c: any) => 
            c.name?.toLowerCase().includes(searchQuery.toLowerCase())
        )
    }, [campaigns, searchQuery])

    const statusConfig: Record<string, { icon: any; color: string; bg: string }> = {
        draft: { icon: Clock, color: 'text-zinc-500', bg: 'bg-zinc-100 dark:bg-zinc-800' },
        scheduled: { icon: Calendar, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-500/10' },
        sending: { icon: PaperPlaneTilt, color: 'text-yellow-500', bg: 'bg-yellow-50 dark:bg-yellow-500/10' },
        completed: { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-500/10' },
        failed: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-500/10' },
    }

    if (campaignBotIds.length === 0) {
        return (
            <div className="max-w-2xl mx-auto text-center py-20">
                <Megaphone size={64} className="mx-auto text-zinc-400 mb-4" />
                <h1 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">No Campaign Access</h1>
                <p className="text-zinc-500 mb-6">You don't have permission to create campaigns for any bots.</p>
                <Link
                    href="/user"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    Back to Dashboard
                </Link>
            </div>
        )
    }

    return (
        <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Campaigns</h1>
                    <p className="text-zinc-500 mt-1">Manage your message campaigns</p>
                </div>
                <Link
                    href={`/user/campaigns/create?botId=${selectedBotId}`}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                    <Plus size={18} />
                    New Campaign
                </Link>
            </div>

            {/* Bot Selector & Search */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <select
                    value={selectedBotId}
                    onChange={(e) => setSelectedBotId(e.target.value)}
                    className="px-4 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                    {myBots.map((bot: any) => (
                        <option key={bot.id} value={bot.id}>{bot.name}</option>
                    ))}
                </select>
                <div className="relative flex-1">
                    <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                    <input
                        type="text"
                        placeholder="Search campaigns..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
            </div>

            {/* Campaigns List */}
            {isLoading ? (
                <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 animate-pulse">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-lg bg-zinc-200 dark:bg-zinc-800" />
                                <div className="flex-1">
                                    <div className="h-4 w-48 bg-zinc-200 dark:bg-zinc-800 rounded mb-2" />
                                    <div className="h-3 w-32 bg-zinc-200 dark:bg-zinc-800 rounded" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : filteredCampaigns.length === 0 ? (
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-12 text-center">
                    <Megaphone size={56} className="mx-auto text-zinc-400 mb-4" />
                    <h3 className="text-lg font-medium text-zinc-900 dark:text-white mb-2">No Campaigns Yet</h3>
                    <p className="text-zinc-500 mb-6">Create your first campaign to start sending messages.</p>
                    <Link
                        href={`/user/campaigns/create?botId=${selectedBotId}`}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        <Plus size={16} />
                        Create Campaign
                    </Link>
                </div>
            ) : (
                <div className="space-y-3">
                    {filteredCampaigns.map((campaign: any) => {
                        const status = statusConfig[campaign.status] || statusConfig.draft
                        const StatusIcon = status.icon
                        
                        return (
                            <div
                                key={campaign.id}
                                className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded-lg ${status.bg} flex items-center justify-center`}>
                                        <StatusIcon size={20} className={status.color} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-semibold text-zinc-900 dark:text-white truncate">
                                            {campaign.name}
                                        </h3>
                                        <div className="flex items-center gap-3 mt-1 text-sm text-zinc-500">
                                            <span className="capitalize">{campaign.status}</span>
                                            <span>•</span>
                                            <span>{campaign.total_contacts || 0} contacts</span>
                                            {campaign.scheduled_at && (
                                                <>
                                                    <span>•</span>
                                                    <span>{new Date(campaign.scheduled_at).toLocaleDateString()}</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        {campaign.sent_count !== undefined && (
                                            <p className="text-sm font-medium text-zinc-900 dark:text-white">
                                                {campaign.sent_count}/{campaign.total_contacts || 0}
                                            </p>
                                        )}
                                        <p className="text-xs text-zinc-500">Sent</p>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
