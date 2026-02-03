'use client'

import { useState, useEffect, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import { 
    Users, Trash2, Phone, Link2, RefreshCw, HelpCircle, ChevronLeft, ChevronRight
} from 'lucide-react'
import AIConfigTable from './AIConfigTable'

interface AIAssistantPanelProps {
    botId: string
    subTab?: 'config' | 'mappings'
}

interface LidMapping {
    id: string
    bot_id: string
    lid: string
    phone: string
    name?: string
    created_at?: string
}

const ITEMS_PER_PAGE = 10

export default function AIAssistantPanel({ botId, subTab = 'config' }: AIAssistantPanelProps) {
    const queryClient = useQueryClient()
    const [showAddMapping, setShowAddMapping] = useState(false)
    const [newMapping, setNewMapping] = useState({ lid: '', phone: '', name: '' })
    const [currentPage, setCurrentPage] = useState(1)
    const [showTooltip, setShowTooltip] = useState(false)

    // Listen for openAddMapping event from header button
    useEffect(() => {
        const handleOpenAddMapping = () => setShowAddMapping(true)
        window.addEventListener('openAddMapping', handleOpenAddMapping)
        return () => window.removeEventListener('openAddMapping', handleOpenAddMapping)
    }, [])

    // Fetch LID mappings
    const { data: mappings, isLoading: mappingsLoading } = useQuery({
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

    // Pagination
    const totalItems = mappings?.length || 0
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE)
    const paginatedMappings = useMemo(() => {
        if (!mappings) return []
        const start = (currentPage - 1) * ITEMS_PER_PAGE
        return mappings.slice(start, start + ITEMS_PER_PAGE)
    }, [mappings, currentPage])

    // Reset page when data changes
    useEffect(() => {
        setCurrentPage(1)
    }, [botId])

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

    return (
        <div className="space-y-6">
            {/* Content based on subTab */}
            {subTab === 'config' && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <AIConfigTable botId={botId} />
                </div>
            )}

            {subTab === 'mappings' && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    {/* LID to Phone Mappings */}
                    <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
                        {/* Header with title and tooltip */}
                        <div className="mb-6">
                            <div className="flex items-center gap-2">
                                <Link2 className="w-5 h-5 text-blue-400" />
                                <h3 className="text-lg font-semibold text-white">
                                    LID to Phone Mappings
                                </h3>
                                <div className="relative flex items-center">
                                    <button
                                        onMouseEnter={() => setShowTooltip(true)}
                                        onMouseLeave={() => setShowTooltip(false)}
                                        className="text-zinc-500 hover:text-zinc-300 transition-colors"
                                    >
                                        <HelpCircle className="w-4 h-4" />
                                    </button>
                                    {showTooltip && (
                                        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-50 w-72 p-3 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl text-sm text-zinc-300">
                                            <p className="font-medium text-white mb-1">How it works</p>
                                            <p>When someone messages your bot, WhatsApp sometimes sends a LID (Linked ID) instead of their phone number. Add mappings here so the AI can match LIDs to phone numbers.</p>
                                            <p className="text-zinc-500 mt-2 text-xs">💡 Check the backend logs to see incoming LIDs that need mapping.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
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
                            <>
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
                                            {paginatedMappings.map((mapping: LidMapping) => (
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

                                {/* Pagination */}
                                {totalPages > 1 && (
                                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-zinc-800">
                                        <p className="text-sm text-zinc-500">
                                            Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, totalItems)} of {totalItems}
                                        </p>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                                disabled={currentPage === 1}
                                                className="p-2 text-zinc-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                            >
                                                <ChevronLeft className="w-4 h-4" />
                                            </button>
                                            <span className="text-sm text-zinc-400">
                                                Page {currentPage} of {totalPages}
                                            </span>
                                            <button
                                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                                disabled={currentPage === totalPages}
                                                className="p-2 text-zinc-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                            >
                                                <ChevronRight className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
