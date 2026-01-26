'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
    Plus, Search, Filter, MoreHorizontal,
    Send, CheckCircle2, AlertCircle, Clock,
    MessageSquare, Users, BarChart3, Trash2,
    Play, Pause, ExternalLink, Calendar
} from 'lucide-react'
import { toast } from 'sonner'
import CreateCampaignWizard from '@/components/CreateCampaignWizard'

interface Campaign {
    id: string
    name: string
    status: 'draft' | 'running' | 'completed' | 'failed' | 'scheduled'
    total_contacts: number
    sent_count: number
    failed_count: number
    created_at: string
    scheduled_at: string | null
    bot_id: string
}

export default function CampaignsPage() {
    const router = useRouter()
    const [campaigns, setCampaigns] = useState<Campaign[]>([])
    const [loading, setLoading] = useState(true)
    const [showWizard, setShowWizard] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedBotId, setSelectedBotId] = useState<string>('all')
    const [bots, setBots] = useState<any[]>([])

    useEffect(() => {
        fetchCampaigns()
        fetchBots()
    }, [])

    const fetchCampaigns = async () => {
        try {
            const token = localStorage.getItem('token')
            const response = await fetch('http://localhost:3001/api/campaigns', {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            const data = await response.json()
            if (data.success) {
                setCampaigns(data.data)
            }
        } catch (error) {
            console.error('Failed to fetch campaigns:', error)
            toast.error('Failed to load campaigns')
        } finally {
            setLoading(false)
        }
    }

    const fetchBots = async () => {
        try {
            const token = localStorage.getItem('token')
            const response = await fetch('http://localhost:3001/api/bots', {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            const data = await response.json()
            if (data.success) {
                setBots(data.data)
            }
        } catch (error) {
            console.error('Failed to fetch bots:', error)
        }
    }

    const deleteCampaign = async (id: string) => {
        if (!confirm('Are you sure you want to delete this campaign?')) return
        try {
            const token = localStorage.getItem('token')
            const response = await fetch(`http://localhost:3001/api/campaigns/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (response.ok) {
                toast.success('Campaign deleted')
                fetchCampaigns()
            }
        } catch (error) {
            toast.error('Failed to delete campaign')
        }
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
            case 'running': return 'bg-blue-500/10 text-blue-500 border-blue-500/20'
            case 'failed': return 'bg-red-500/10 text-red-500 border-red-500/20'
            case 'scheduled': return 'bg-purple-500/10 text-purple-500 border-purple-500/20'
            default: return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
        }
    }

    const filteredCampaigns = campaigns.filter(c => {
        const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase())
        const matchesBot = selectedBotId === 'all' || c.bot_id === selectedBotId
        return matchesSearch && matchesBot
    })

    const stats = {
        total: campaigns.length,
        sent: campaigns.reduce((acc, c) => acc + (c.sent_count || 0), 0),
        running: campaigns.filter(c => c.status === 'running').length,
        completed: campaigns.filter(c => c.status === 'completed').length
    }

    return (
        <div className="p-8 min-h-screen bg-[#09090b] text-zinc-100">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">Campaign Blasts</h1>
                    <p className="text-zinc-500 text-sm mt-1">Manage your mass message broadcasts and analytics</p>
                </div>
                <button
                    onClick={() => setShowWizard(true)}
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-white text-black hover:bg-zinc-200 rounded-xl font-bold transition-all shadow-xl shadow-white/5 active:scale-95"
                >
                    <Plus size={20} />
                    Create Campaign
                </button>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                {[
                    { label: 'Total Campaigns', value: stats.total, icon: Send, color: 'text-blue-500' },
                    { label: 'Messages Sent', value: stats.sent, icon: MessageSquare, color: 'text-emerald-500' },
                    { label: 'Active Running', value: stats.running, icon: Play, color: 'text-amber-500' },
                    { label: 'Completed', value: stats.completed, icon: CheckCircle2, color: 'text-cyan-500' },
                ].map((stat, i) => (
                    <div key={i} className="bg-[#18181b] border border-white/5 rounded-2xl p-5 hover:border-white/10 transition-colors group">
                        <div className="flex items-center justify-between mb-3">
                            <div className={`p-2 rounded-lg bg-zinc-900 border border-white/5 ${stat.color} group-hover:scale-110 transition-transform`}>
                                <stat.icon size={20} />
                            </div>
                        </div>
                        <div className="text-2xl font-bold text-white mb-1">{stat.value}</div>
                        <div className="text-xs text-zinc-500 font-medium uppercase tracking-wider">{stat.label}</div>
                    </div>
                ))}
            </div>

            {/* Filters & Search */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                    <input
                        type="text"
                        placeholder="Search campaigns..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-[#18181b] border border-white/5 rounded-xl text-white placeholder-zinc-600 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 outline-none transition-all"
                    />
                </div>
                <div className="flex gap-4">
                    <select
                        value={selectedBotId}
                        onChange={e => setSelectedBotId(e.target.value)}
                        className="px-4 py-3 bg-[#18181b] border border-white/5 rounded-xl text-white outline-none focus:ring-2 focus:ring-blue-500/20"
                    >
                        <option value="all">All Bots</option>
                        {bots.map(bot => <option key={bot.id} value={bot.id}>{bot.name}</option>)}
                    </select>
                </div>
            </div>

            {/* Campaign Grid */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-20">
                    <div className="w-10 h-10 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mb-4" />
                    <p className="text-zinc-500">Loading campaigns...</p>
                </div>
            ) : filteredCampaigns.length === 0 ? (
                <div className="bg-[#18181b] border border-dashed border-white/10 rounded-3xl p-16 text-center">
                    <div className="w-20 h-20 bg-zinc-900 border border-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Send className="text-zinc-700" size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">No campaigns found</h3>
                    <p className="text-zinc-500 max-w-sm mx-auto mb-8 font-medium">Create your first blast campaign to reach your customers at scale.</p>
                    <button
                        onClick={() => setShowWizard(true)}
                        className="px-8 py-3 bg-white text-black hover:bg-zinc-200 rounded-xl font-bold transition-all"
                    >
                        Start First Campaign
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {filteredCampaigns.map((campaign) => (
                        <div
                            key={campaign.id}
                            className="bg-[#18181b] border border-white/5 rounded-3xl p-6 hover:border-white/20 transition-all group relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => deleteCampaign(campaign.id)} className="p-2 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-xl transition-colors">
                                    <Trash2 size={16} />
                                </button>
                            </div>

                            <div className="flex items-start gap-4 mb-6">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center bg-zinc-900 border border-white/5 text-blue-500`}>
                                    <Send size={24} />
                                </div>
                                <div className="pr-8">
                                    <h3 className="font-bold text-white text-lg leading-tight mb-1 truncate">{campaign.name}</h3>
                                    <div className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getStatusColor(campaign.status)}`}>
                                        {campaign.status}
                                    </div>
                                </div>
                            </div>

                            {/* Progress */}
                            <div className="space-y-3 mb-6">
                                <div className="flex justify-between text-xs font-medium">
                                    <span className="text-zinc-500">Progress</span>
                                    <span className="text-white">{campaign.sent_count || 0} / {campaign.total_contacts || 0}</span>
                                </div>
                                <div className="h-2 bg-zinc-900 rounded-full overflow-hidden border border-white/5">
                                    <div
                                        className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-1000"
                                        style={{ width: `${(campaign.sent_count / (campaign.total_contacts || 1)) * 100}%` }}
                                    />
                                </div>
                            </div>

                            {/* Details Grid */}
                            <div className="grid grid-cols-2 gap-3 mb-6">
                                <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-3">
                                    <div className="flex items-center gap-2 text-zinc-500 mb-1">
                                        <Users size={12} />
                                        <span className="text-[10px] font-bold uppercase tracking-tighter">Reach</span>
                                    </div>
                                    <div className="text-sm font-bold text-white">{campaign.total_contacts} <span className="text-[10px] font-normal text-zinc-500">contacts</span></div>
                                </div>
                                <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-3">
                                    <div className="flex items-center gap-2 text-zinc-500 mb-1">
                                        <Calendar size={12} />
                                        <span className="text-[10px] font-bold uppercase tracking-tighter">Created</span>
                                    </div>
                                    <div className="text-sm font-bold text-white">{new Date(campaign.created_at).toLocaleDateString()}</div>
                                </div>
                            </div>

                            {/* Footer Actions */}
                            <div className="flex items-center justify-between pt-4 border-t border-white/5">
                                <div className="flex items-center gap-2">
                                    {campaign.scheduled_at && (
                                        <div className="flex items-center gap-1.5 text-xs text-purple-400 font-medium">
                                            <Clock size={14} />
                                            {new Date(campaign.scheduled_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    )}
                                </div>
                                <button
                                    onClick={() => {/* View Details or Log */ }}
                                    className="flex items-center gap-1.5 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-bold transition-all"
                                >
                                    View Report
                                    <ExternalLink size={14} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Campaign Creator Wizard */}
            {showWizard && (
                <CreateCampaignWizard
                    initialBotId={bots[0]?.id}
                    onClose={() => {
                        setShowWizard(false)
                        fetchCampaigns()
                    }}
                />
            )}
        </div>
    )
}
