'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import { 
    Bot, MessageSquare, FileSpreadsheet, Users, 
    Plus, Trash2, Phone, Link2, RefreshCw
} from 'lucide-react'
import AIConfigTable from './AIConfigTable'
import AISheetUpdater from './AISheetUpdater'

interface AIAssistantPanelProps {
    botId: string
}

interface LidMapping {
    id: string
    bot_id: string
    lid: string
    phone: string
    name?: string
    created_at?: string
}

export default function AIAssistantPanel({ botId }: AIAssistantPanelProps) {
    const queryClient = useQueryClient()
    const [activeSubTab, setActiveSubTab] = useState<'chat' | 'sheet' | 'contacts'>('chat')
    const [showAddMapping, setShowAddMapping] = useState(false)
    const [newMapping, setNewMapping] = useState({ lid: '', phone: '', name: '' })

    // Fetch LID mappings
    const { data: mappings, isLoading: mappingsLoading, refetch: refetchMappings } = useQuery({
        queryKey: ['lid-mappings', botId],
        queryFn: async () => {
            try {
                const res = await api.lidMappings.list(botId)
                return res.data.data || []
            } catch (e) {
                return []
            }
        },
        enabled: !!botId
    })

    // Add mapping mutation
    const addMappingMutation = useMutation({
        mutationFn: async (data: { bot_id: string; lid: string; phone: string; name?: string }) => {
            return await api.lidMappings.create(data)
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['lid-mappings', botId] })
            toast.success('Mapping added successfully')
            setShowAddMapping(false)
            setNewMapping({ lid: '', phone: '', name: '' })
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.error || 'Failed to add mapping')
        }
    })

    // Delete mapping mutation
    const deleteMappingMutation = useMutation({
        mutationFn: async (id: string) => {
            return await api.lidMappings.delete(id)
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['lid-mappings', botId] })
            toast.success('Mapping deleted')
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.error || 'Failed to delete mapping')
        }
    })

    const handleAddMapping = () => {
        if (!newMapping.lid || !newMapping.phone) {
            toast.error('LID and Phone are required')
            return
        }
        addMappingMutation.mutate({
            bot_id: botId,
            lid: newMapping.lid,
            phone: newMapping.phone,
            name: newMapping.name || undefined
        })
    }

    const subTabs = [
        { id: 'chat', label: 'Conversational AI', icon: MessageSquare },
        { id: 'sheet', label: 'Sheet Updater', icon: FileSpreadsheet },
        { id: 'contacts', label: 'Contact Mappings', icon: Users },
    ]

    return (
        <div className="space-y-6">
            {/* Sub-tabs */}
            <div className="flex items-center gap-2 border-b border-zinc-800 pb-4">
                {subTabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveSubTab(tab.id as any)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                            activeSubTab === tab.id
                                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                        }`}
                    >
                        <tab.icon className="w-4 h-4" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Sub-tab content */}
            {activeSubTab === 'chat' && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <AIConfigTable botId={botId} />
                </div>
            )}

            {activeSubTab === 'sheet' && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <AISheetUpdater botId={botId} />
                </div>
            )}

            {activeSubTab === 'contacts' && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    {/* LID to Phone Mappings */}
                    <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                                    <Link2 className="w-5 h-5 text-blue-400" />
                                    LID to Phone Mappings
                                </h3>
                                <p className="text-sm text-zinc-500 mt-1">
                                    Map WhatsApp LID identifiers to phone numbers for Sheet Updater
                                </p>
                            </div>
                            <button
                                onClick={() => setShowAddMapping(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-sm font-medium transition-all"
                            >
                                <Plus className="w-4 h-4" />
                                Add Mapping
                            </button>
                        </div>

                        {/* Info box */}
                        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 mb-6">
                            <p className="text-sm text-blue-300">
                                <strong>How it works:</strong> When someone messages your bot, WhatsApp sometimes sends a LID (Linked ID) instead of their phone number. 
                                Add mappings here so the Sheet Updater can match LIDs to phone numbers in your spreadsheet.
                            </p>
                            <p className="text-sm text-blue-300/70 mt-2">
                                💡 Check the backend logs to see incoming LIDs that need mapping.
                            </p>
                        </div>

                        {/* Add Mapping Form */}
                        {showAddMapping && (
                            <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-4 mb-6">
                                <h4 className="text-sm font-medium text-white mb-4">Add New Mapping</h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-xs text-zinc-500 mb-1.5">LID (from logs)</label>
                                        <input
                                            type="text"
                                            value={newMapping.lid}
                                            onChange={(e) => setNewMapping(prev => ({ ...prev, lid: e.target.value }))}
                                            placeholder="e.g. 26985329873067"
                                            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:border-blue-500 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-zinc-500 mb-1.5">Phone Number</label>
                                        <input
                                            type="text"
                                            value={newMapping.phone}
                                            onChange={(e) => setNewMapping(prev => ({ ...prev, phone: e.target.value }))}
                                            placeholder="e.g. 628571056956"
                                            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:border-blue-500 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-zinc-500 mb-1.5">Name (optional)</label>
                                        <input
                                            type="text"
                                            value={newMapping.name}
                                            onChange={(e) => setNewMapping(prev => ({ ...prev, name: e.target.value }))}
                                            placeholder="e.g. Ikhwan"
                                            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:border-blue-500 outline-none"
                                        />
                                    </div>
                                </div>
                                <div className="flex justify-end gap-2 mt-4">
                                    <button
                                        onClick={() => setShowAddMapping(false)}
                                        className="px-4 py-2 text-zinc-400 hover:text-white text-sm"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleAddMapping}
                                        disabled={addMappingMutation.isPending}
                                        className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-50"
                                    >
                                        {addMappingMutation.isPending ? 'Adding...' : 'Add Mapping'}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Mappings Table */}
                        {mappingsLoading ? (
                            <div className="flex items-center justify-center py-12">
                                <RefreshCw className="w-6 h-6 text-zinc-500 animate-spin" />
                            </div>
                        ) : (mappings || []).length === 0 ? (
                            <div className="text-center py-12 text-zinc-500">
                                <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                <p>No mappings yet</p>
                                <p className="text-sm mt-1">Add a mapping when you see unknown LIDs in the logs</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-zinc-800">
                                            <th className="text-left py-3 px-4 text-xs font-medium text-zinc-500 uppercase">LID</th>
                                            <th className="text-left py-3 px-4 text-xs font-medium text-zinc-500 uppercase">Phone</th>
                                            <th className="text-left py-3 px-4 text-xs font-medium text-zinc-500 uppercase">Name</th>
                                            <th className="text-left py-3 px-4 text-xs font-medium text-zinc-500 uppercase">Created</th>
                                            <th className="text-right py-3 px-4 text-xs font-medium text-zinc-500 uppercase">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(mappings || []).map((mapping: LidMapping) => (
                                            <tr key={mapping.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                                                <td className="py-3 px-4">
                                                    <code className="text-sm text-zinc-300 bg-zinc-800 px-2 py-0.5 rounded">
                                                        {mapping.lid}
                                                    </code>
                                                </td>
                                                <td className="py-3 px-4">
                                                    <span className="text-sm text-white flex items-center gap-1.5">
                                                        <Phone className="w-3.5 h-3.5 text-green-500" />
                                                        {mapping.phone}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4 text-sm text-zinc-400">
                                                    {mapping.name || '-'}
                                                </td>
                                                <td className="py-3 px-4 text-sm text-zinc-500">
                                                    {mapping.created_at ? new Date(mapping.created_at).toLocaleDateString() : '-'}
                                                </td>
                                                <td className="py-3 px-4 text-right">
                                                    <button
                                                        onClick={() => deleteMappingMutation.mutate(mapping.id)}
                                                        className="p-1.5 text-zinc-500 hover:text-red-400 transition-colors"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
