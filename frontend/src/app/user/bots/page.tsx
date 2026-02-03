'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { usePermissions } from '@/hooks/usePermissions'
import Link from 'next/link'
import { Robot, MagnifyingGlass, Funnel } from '@phosphor-icons/react'

export default function UserBotsPage() {
    const { filterBots } = usePermissions()
    const [searchQuery, setSearchQuery] = useState('')
    const [statusFilter, setStatusFilter] = useState<string>('')

    // Fetch bots
    const { data: allBots, isLoading } = useQuery({
        queryKey: ['bots'],
        queryFn: async () => {
            const res = await api.bots.list()
            return res.data.data || []
        },
    })

    // Filter bots based on permissions
    const myBots = filterBots(allBots || [])

    // Apply search and status filters
    const filteredBots = myBots.filter((bot: any) => {
        const matchesSearch = !searchQuery || 
            bot.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            bot.phone_number?.includes(searchQuery)
        const matchesStatus = !statusFilter || bot.status === statusFilter
        return matchesSearch && matchesStatus
    })

    const statusColors: Record<string, string> = {
        connected: 'bg-green-500',
        disconnected: 'bg-zinc-400',
        connecting: 'bg-yellow-500',
        error: 'bg-red-500',
    }

    return (
        <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">My Bots</h1>
                    <p className="text-zinc-500 mt-1">Bots assigned to you by your administrator</p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <div className="relative flex-1">
                    <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                    <input
                        type="text"
                        placeholder="Search bots..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                </div>
                <div className="relative">
                    <Funnel className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="pl-10 pr-8 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer"
                    >
                        <option value="">All Status</option>
                        <option value="connected">Connected</option>
                        <option value="disconnected">Disconnected</option>
                        <option value="connecting">Connecting</option>
                    </select>
                </div>
            </div>

            {/* Bots Grid */}
            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 animate-pulse">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-12 h-12 rounded-full bg-zinc-200 dark:bg-zinc-800" />
                                <div className="flex-1">
                                    <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-2/3 mb-2" />
                                    <div className="h-3 bg-zinc-200 dark:bg-zinc-800 rounded w-1/2" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : filteredBots.length === 0 ? (
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-12 text-center">
                    <Robot size={56} className="mx-auto text-zinc-400 mb-4" />
                    <h3 className="text-lg font-medium text-zinc-900 dark:text-white mb-2">
                        {myBots.length === 0 ? 'No Bots Assigned' : 'No Bots Found'}
                    </h3>
                    <p className="text-zinc-500 max-w-md mx-auto">
                        {myBots.length === 0 
                            ? 'Contact your administrator to get access to bots.'
                            : 'Try adjusting your search or filter criteria.'}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredBots.map((bot: any) => (
                        <BotCard key={bot.id} bot={bot} statusColors={statusColors} />
                    ))}
                </div>
            )}
        </div>
    )
}

function BotCard({ bot, statusColors }: { bot: any, statusColors: Record<string, string> }) {
    return (
        <Link
            href={`/user/bots/${bot.id}`}
            className="group bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-lg dark:hover:shadow-blue-500/5 transition-all"
        >
            <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-lg font-bold flex-shrink-0">
                    {bot.name?.charAt(0).toUpperCase() || 'B'}
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-zinc-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {bot.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                        <span className={`w-2 h-2 rounded-full ${statusColors[bot.status] || 'bg-zinc-400'}`} />
                        <span className="text-sm text-zinc-500 capitalize">{bot.status || 'Unknown'}</span>
                    </div>
                </div>
            </div>

            {bot.phone_number && (
                <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400 mb-3">
                    <span>📱</span>
                    <span>{bot.phone_number}</span>
                </div>
            )}

            <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800">
                <span className="text-xs text-blue-600 dark:text-blue-400 font-medium group-hover:underline">
                    View Details →
                </span>
            </div>
        </Link>
    )
}
