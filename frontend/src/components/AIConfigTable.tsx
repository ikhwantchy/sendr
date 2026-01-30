'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import { Bot, Plus, Trash2, Edit2, MoreVertical, X, ChevronDown, Users, ChevronLeft, Save } from 'lucide-react'

interface AIConfigTableProps {
    botId: string
}

export default function AIConfigTable({ botId }: AIConfigTableProps) {
    // Table states
    const [currentPage, setCurrentPage] = useState(1)
    const [itemsPerPage] = useState(10)

    // Modal states
    const [showModal, setShowModal] = useState(false)
    const [editingConfig, setEditingConfig] = useState<any>(null)
    const [showTargetDropdown, setShowTargetDropdown] = useState(false)
    const [dropdownSearchQuery, setDropdownSearchQuery] = useState('')
    const [showApiKey, setShowApiKey] = useState(false)
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

    // Form states
    const [formData, setFormData] = useState({
        config_name: '',
        target_jid: '',
        target_name: '',
        target_type: 'group' as 'group' | 'contact',
        provider: 'gemini',
        api_key: '',
        model: 'gemini-2.0-flash',
        system_prompt: '',
        // Bot Behavior (per-configuration)
        conversation_model: true,
        silent_collection: false,
        hybrid_mode: false,
        is_enabled: 1
    })

    // Multi-select targets (separate state)
    const [selectedTargets, setSelectedTargets] = useState<Array<{ jid: string, name: string, type: 'group' | 'contact' }>>([])

    // Fetch configurations
    const { data: configsData, refetch, isLoading } = useQuery({
        queryKey: ['llmTargets', botId],
        queryFn: async () => {
            const res = await api.bots.llmTargets.list(botId)
            return res.data.data || []
        },
        enabled: !!botId
    })

    const [isSyncingGroups, setIsSyncingGroups] = useState(false)
    const { data: groupsData, refetch: refetchGroups } = useQuery({
        queryKey: ['groups', botId],
        queryFn: async () => {
            const res = await api.bots.getGroups(botId)
            return res.data.data || []
        },
        enabled: !!botId
    })

    const handleSyncGroups = async () => {
        setIsSyncingGroups(true)
        const toastId = toast.loading('Syncing groups from WhatsApp...')
        try {
            const res = await api.bots.syncGroups(botId)
            const count = res.data.count || 0
            // Wait slightly more than the backend delay (5s) to ensure data is likely updated
            await new Promise(resolve => setTimeout(resolve, 6000))
            await refetchGroups()
            toast.success(`Groups synced successfully. Found ${count} groups.`, { id: toastId })
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Failed to sync groups', { id: toastId })
        } finally {
            setIsSyncingGroups(false)
        }
    }

    const configs = configsData || []
    const groups = groupsData || []

    // Model options per provider
    const modelOptions: Record<string, Array<{ id: string; name: string; description: string }>> = {
        gemini: [
            { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', description: 'Fast and efficient' },
            { id: 'gemini-2.0-flash-exp', name: 'Gemini 2.0 Flash Exp', description: 'Experimental features' },
            { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', description: 'Most capable' },
            { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', description: 'Balanced performance' }
        ],
        openai: [
            { id: 'gpt-4o', name: 'GPT-4o', description: 'Most capable, multimodal' },
            { id: 'gpt-4o-mini', name: 'GPT-4o Mini', description: 'Fast and affordable' },
            { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', description: 'Previous generation' }
        ],
        groq: [
            { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B', description: 'Most capable' },
            { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B', description: 'Fastest' },
            { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B', description: 'Large context' }
        ]
    }

    // List of configurations
    const filteredConfigs = configs

    // Pagination
    const totalPages = Math.ceil(filteredConfigs.length / itemsPerPage)
    const paginatedConfigs = useMemo(() => {
        return filteredConfigs.slice(
            (currentPage - 1) * itemsPerPage,
            currentPage * itemsPerPage
        )
    }, [filteredConfigs, currentPage, itemsPerPage])

    // Handlers
    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!editingConfig && selectedTargets.length === 0) {
            toast.error('Please select at least one target')
            return
        }

        try {
            const llm_config = JSON.stringify({
                provider: formData.provider,
                api_key: formData.api_key,
                model: formData.model,
                system_prompt: formData.system_prompt,
                behavior: {
                    conversationModel: formData.conversation_model,
                    silentCollection: formData.silent_collection,
                    hybridMode: formData.hybrid_mode
                }
            })

            if (editingConfig) {
                // UPDATE mode
                await api.bots.llmTargets.update(botId, editingConfig.id, {
                    config_name: formData.config_name,
                    target_type: formData.target_type,
                    target_jid: formData.target_jid,
                    target_name: formData.target_name,
                    is_enabled: formData.is_enabled,
                    llm_config: llm_config
                })
                toast.success('Configuration updated successfully!')
            } else {
                // CREATE mode (Iterate all selected targets)
                for (const target of selectedTargets) {
                    await api.bots.llmTargets.add(botId, {
                        config_name: selectedTargets.length > 1 ? `${formData.config_name} - ${target.name}` : formData.config_name,
                        target_type: target.type,
                        target_jid: target.jid,
                        target_name: target.name,
                        is_enabled: 1,
                        llm_config: llm_config
                    })
                }
                toast.success(`Created ${selectedTargets.length} configuration(s) successfully!`)
            }

            refetch()
            setShowModal(false)
            resetForm()
        } catch (error: any) {
            const errorMsg = error.response?.data?.error || error.response?.data?.details || 'Failed to save configuration'
            toast.error(errorMsg)
        }
    }

    const handleEdit = (config: any) => {
        const llmConfig = parseConfig(config.llm_config)
        setEditingConfig(config)
        setFormData({
            config_name: config.config_name || '',
            target_jid: config.target_jid,
            target_name: config.target_name || '',
            target_type: config.target_type,
            provider: llmConfig.provider || 'gemini',
            api_key: llmConfig.api_key || '',
            model: llmConfig.model || 'gemini-2.0-flash',
            system_prompt: llmConfig.system_prompt || '',
            conversation_model: llmConfig.behavior?.conversationModel ?? true,
            silent_collection: llmConfig.behavior?.silentCollection ?? false,
            hybrid_mode: llmConfig.behavior?.hybridMode ?? false,
            is_enabled: config.is_enabled
        })
        setShowModal(true)
    }

    const handleToggle = async (configId: string) => {
        try {
            await api.bots.llmTargets.toggle(botId, configId)
            refetch()
            toast.success('Status updated!')
        } catch (error) {
            toast.error('Failed to update status')
        }
    }

    const handleDelete = async (configId: string) => {
        setDeleteConfirmId(configId)
    }

    const confirmDelete = async () => {
        if (!deleteConfirmId) return

        try {
            await api.bots.llmTargets.remove(botId, deleteConfirmId)
            refetch()
            toast.success('Configuration deleted!')
            setDeleteConfirmId(null)
        } catch (error) {
            toast.error('Failed to delete configuration')
        }
    }


    const openCreateModal = () => {
        resetForm()
        setEditingConfig(null)
        setShowModal(true)
    }

    const resetForm = () => {
        setFormData({
            config_name: '',
            target_jid: '',
            target_name: '',
            target_type: 'group',
            provider: 'gemini',
            api_key: '',
            model: 'gemini-2.0-flash',
            system_prompt: '',
            conversation_model: true,
            silent_collection: false,
            hybrid_mode: false,
            is_enabled: 1
        })
        setSelectedTargets([])
    }

    const handleTargetChange = (targetJid: string) => {
        const group = groups.find((g: any) => g.id === targetJid)
        setFormData({
            ...formData,
            target_jid: targetJid,
            target_name: group?.subject || group?.name || targetJid
        })
    }

    // Auto-detect provider from API key
    const handleApiKeyChange = (apiKey: string) => {
        let detectedProvider = formData.provider
        let defaultModel = formData.model

        if (apiKey.startsWith('gsk_')) {
            detectedProvider = 'groq'
            defaultModel = 'llama-3.3-70b-versatile'
        } else if (apiKey.startsWith('sk-')) {
            detectedProvider = 'openai'
            defaultModel = 'gpt-4o'
        } else if (apiKey.length > 0) {
            detectedProvider = 'gemini'
            defaultModel = 'gemini-2.0-flash'
        }

        setFormData({
            ...formData,
            api_key: apiKey,
            provider: detectedProvider,
            model: defaultModel
        })
    }

    const getProviderBadgeColor = (provider: string) => {
        switch (provider) {
            case 'openai': return 'bg-green-500/10 text-green-400 border-green-500/20'
            case 'groq': return 'bg-orange-500/10 text-orange-400 border-orange-500/20'
            default: return 'bg-blue-500/10 text-blue-400 border-blue-500/20'
        }
    }

    const parseConfig = (configStr: string) => {
        try {
            return JSON.parse(configStr || '{}')
        } catch {
            return {}
        }
    }

    return (
        <div className="space-y-4">

            {/* Action Bar */}
            <div className="flex items-center justify-end gap-2">
                <button
                    onClick={openCreateModal}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-medium rounded-lg transition-all active:scale-95 border border-zinc-700"
                >
                    <Plus className="w-4 h-4" />
                    Create configuration
                </button>
            </div>

            {/* Table */}
            <div className="border border-zinc-800 rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-zinc-900/30 border-b border-zinc-800">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                                    Name
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                                    Target
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                                    Provider
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                                    Model
                                </th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-zinc-400 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-8 text-center text-sm text-zinc-500">
                                        Loading configurations...
                                    </td>
                                </tr>
                            ) : paginatedConfigs.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-8 text-center">
                                        <div className="flex flex-col items-center gap-2">
                                            <Bot className="w-8 h-8 text-zinc-700" />
                                            <p className="text-sm text-zinc-500">
                                                No configurations yet. Create one to get started.
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                paginatedConfigs.map((config: any) => {
                                    const llmConfig = parseConfig(config.llm_config)
                                    return (
                                        <tr
                                            key={config.id}
                                            className="border-b border-zinc-800/50 hover:bg-zinc-900/30 transition-colors"
                                        >
                                            <td className="px-4 py-3 text-sm text-white font-medium">
                                                {config.config_name || 'Unnamed'}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-3">
                                                    <button
                                                        onClick={() => handleToggle(config.id)}
                                                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${config.is_enabled ? 'bg-emerald-500' : 'bg-zinc-700'
                                                            }`}
                                                    >
                                                        <span
                                                            className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${config.is_enabled ? 'translate-x-5' : 'translate-x-1'
                                                                }`}
                                                        />
                                                    </button>
                                                    <span className={`text-xs font-medium ${config.is_enabled ? 'text-emerald-400' : 'text-zinc-500'}`}>
                                                        {config.is_enabled ? 'Enabled' : 'Disabled'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div>
                                                    <div className="text-sm text-white">
                                                        {config.target_name || config.target_jid}
                                                    </div>
                                                    <div className="text-xs text-zinc-500 capitalize">
                                                        {config.target_type}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="inline-flex px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-medium">
                                                    {(llmConfig.provider || 'gemini').toUpperCase()}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-zinc-400">
                                                {llmConfig.model || '-'}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center justify-end gap-2">
                                                    {deleteConfirmId === config.id ? (
                                                        <>
                                                            <button
                                                                onClick={confirmDelete}
                                                                className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded-lg transition-all"
                                                            >
                                                                Confirm
                                                            </button>
                                                            <button
                                                                onClick={() => setDeleteConfirmId(null)}
                                                                className="px-4 py-1.5 bg-zinc-700 hover:bg-zinc-600 text-white text-xs font-medium rounded-lg transition-all"
                                                            >
                                                                Cancel
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <button
                                                                onClick={() => handleEdit(config)}
                                                                className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-md transition-colors"
                                                                title="Edit"
                                                            >
                                                                <Edit2 className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDelete(config.id)}
                                                                className="px-3 py-1.5 bg-red-600/10 hover:bg-red-600/20 text-red-400 text-xs font-medium rounded-md transition-colors border border-red-600/20"
                                                                title="Delete"
                                                            >
                                                                Delete
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 bg-zinc-900/20 border-t border-zinc-800">
                        <div className="text-sm text-zinc-500">
                            Items {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, filteredConfigs.length)} of {filteredConfigs.length}
                        </div>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm rounded-md disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            >
                                ◀
                            </button>
                            <div className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md font-medium">
                                {currentPage}
                            </div>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm rounded-md disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            >
                                ▶
                            </button>
                            <div className="ml-2 text-sm text-zinc-500">
                                每页条数: {itemsPerPage}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Create/Edit Modal - Full Page */}
            {
                showModal && (
                    <div className="fixed inset-0 z-[100] bg-zinc-950 flex">
                        <div className="flex-1 flex flex-col h-full overflow-hidden">
                            {/* Header */}
                            <div className="shrink-0 bg-zinc-950 z-20 border-b border-zinc-800">
                                <div className="h-16 flex items-center justify-between px-6 lg:px-8">
                                    <div className="flex items-center gap-4">
                                        <button type="button" onClick={() => setShowModal(false)} className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors">
                                            <ChevronLeft size={20} />
                                        </button>
                                        <h1 className="text-xl font-bold text-white tracking-tight">
                                            {editingConfig ? 'Edit' : 'Create'} AI Configuration
                                        </h1>
                                    </div>
                                    <button 
                                        type="submit"
                                        form="ai-config-form"
                                        className="hidden lg:flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg shadow-lg transition-all"
                                    >
                                        Save <Save size={16} />
                                    </button>
                                </div>
                            </div>

                            {/* Scrollable Content */}
                            <div className="flex-1 overflow-y-auto px-6 lg:px-12 py-8 pb-24 lg:pb-8">
                                <div className="max-w-3xl mx-auto">
                            <form id="ai-config-form" onSubmit={handleCreate} className="space-y-6" autoComplete="off" data-lpignore="true" data-form-type="other">
                                
                                {/* Configuration Name */}
                                <section className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
                                    <h3 className="text-lg font-semibold text-white mb-4">Basic Details</h3>
                                    <div>
                                        <label className="block text-sm font-medium text-zinc-300 mb-2">
                                            Configuration Name <span className="text-red-400">*</span>
                                        </label>
                                        <input
                                            name="wa_bot_config_name_unique"
                                            type="text"
                                            required
                                            value={formData.config_name}
                                            onChange={(e) => setFormData({ ...formData, config_name: e.target.value })}
                                            placeholder="e.g., Customer Support, VIP Group"
                                            autoComplete="off"
                                            className="w-full px-4 py-3 bg-zinc-800/50 border border-zinc-700 rounded-lg text-white text-sm placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                                        />
                                    </div>
                                </section>

                                {/* Target Selection */}
                                <section className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
                                    <h3 className="text-lg font-semibold text-white mb-4">Target</h3>
                                    {editingConfig ? (
                                        <div className="p-3 bg-zinc-800/50 border border-zinc-700 rounded-lg">
                                            <label className="block text-xs text-zinc-500 uppercase font-semibold mb-1">
                                                Current Target
                                            </label>
                                            <div className="text-sm text-white font-medium">
                                                {formData.target_name} ({formData.target_jid})
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <label className="block text-sm font-medium text-zinc-300 mb-2">
                                                Target Group/Contact *
                                            </label>

                                            {/* Selected Targets Chips */}
                                            {selectedTargets.length > 0 && (
                                                <div className="flex flex-wrap gap-2 mb-2 p-2 bg-zinc-900/50 border border-zinc-800 rounded-md">
                                                    {selectedTargets.map((target) => (
                                                        <div key={target.jid} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-500/10 border border-blue-500/20 rounded-md text-sm">
                                                            <span className="text-blue-400">{target.name}</span>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setSelectedTargets(selectedTargets.filter(t => t.jid !== target.jid))
                                                                }}
                                                                className="text-blue-400 hover:text-blue-300"
                                                            >
                                                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                                </svg>
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            <div className="relative">
                                                {showTargetDropdown ? (
                                                    <div className="relative animate-in fade-in duration-200">
                                                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                                        </svg>
                                                        <input
                                                            type="text"
                                                            placeholder="Search groups..."
                                                            autoFocus
                                                            value={dropdownSearchQuery}
                                                            onChange={(e) => setDropdownSearchQuery(e.target.value)}
                                                            className="w-full pl-10 pr-10 py-2.5 bg-[#0f0f0f] border border-blue-500/50 rounded-lg text-white text-sm focus:outline-none ring-2 ring-blue-500/20 transition-all"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setShowTargetDropdown(false)
                                                                setDropdownSearchQuery('')
                                                            }}
                                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
                                                        >
                                                            <ChevronDown className="w-4 h-4 rotate-180 transition-transform" />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowTargetDropdown(true)}
                                                        className="w-full px-4 py-2.5 bg-[#0f0f0f] border border-zinc-800/50 rounded-lg text-white text-sm flex items-center justify-between hover:border-zinc-700 transition-all group"
                                                    >
                                                        <span className={selectedTargets.length > 0 ? 'text-white' : 'text-zinc-500'}>
                                                            {selectedTargets.length > 0
                                                                ? `${selectedTargets.length} target(s) selected`
                                                                : 'Select target...'}
                                                        </span>
                                                        <div className="flex items-center gap-2">
                                                            {selectedTargets.length > 0 && (
                                                                <span className="flex items-center justify-center w-5 h-5 bg-blue-500/20 text-blue-400 text-[10px] font-bold rounded-full border border-blue-500/30">
                                                                    {selectedTargets.length}
                                                                </span>
                                                            )}
                                                            <ChevronDown className="w-4 h-4 text-zinc-500 group-hover:text-zinc-300 transition-colors" />
                                                        </div>
                                                    </button>
                                                )}

                                                {showTargetDropdown && (
                                                    <div className="absolute z-50 w-full mt-2 bg-[#0f0f0f] border border-zinc-800 rounded-xl shadow-2xl overflow-hidden animate-in slide-in-from-top-2 duration-200">
                                                        <div className="max-h-60 overflow-y-auto custom-scrollbar">
                                                            {groups.length === 0 ? (
                                                                <div className="px-4 py-10 text-center bg-zinc-900/10">
                                                                    <div className="w-12 h-12 bg-zinc-800/50 rounded-full flex items-center justify-center mx-auto mb-4 border border-zinc-700">
                                                                        <Users className="w-6 h-6 text-zinc-500" />
                                                                    </div>
                                                                    <div className="text-zinc-300 font-medium mb-1">No groups found</div>
                                                                    <div className="text-zinc-500 text-xs mb-6 max-w-[200px] mx-auto">
                                                                        Make sure the bot is connected and has joined some groups.
                                                                    </div>
                                                                    <div className="flex flex-col gap-2 max-w-[180px] mx-auto">
                                                                        <button
                                                                            type="button"
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                handleSyncGroups();
                                                                            }}
                                                                            disabled={isSyncingGroups}
                                                                            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-500 hover:bg-blue-600 disabled:bg-zinc-800 disabled:text-zinc-600 text-white text-xs font-bold rounded-lg transition-all shadow-lg shadow-blue-500/20 active:scale-95"
                                                                        >
                                                                            {isSyncingGroups ? (
                                                                                <>
                                                                                    <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                                                    Syncing...
                                                                                </>
                                                                            ) : (
                                                                                <>
                                                                                    <Plus className="w-3.5 h-3.5" />
                                                                                    Sync Groups Now
                                                                                </>
                                                                            )}
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                refetchGroups();
                                                                            }}
                                                                            className="text-zinc-500 hover:text-zinc-300 text-xs py-1 transition-colors"
                                                                        >
                                                                            Refresh list only
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                (() => {
                                                                    const filtered = groups.filter((g: any) =>
                                                                        (g.subject || g.name || '').toLowerCase().includes(dropdownSearchQuery.toLowerCase()) ||
                                                                        (g.jid || g.id || '').toLowerCase().includes(dropdownSearchQuery.toLowerCase())
                                                                    )

                                                                    if (filtered.length === 0) {
                                                                        return (
                                                                            <div className="px-4 py-8 text-center bg-zinc-900/10">
                                                                                <div className="text-zinc-500 text-sm mb-4">
                                                                                    {dropdownSearchQuery ? `No groups match "${dropdownSearchQuery}"` : 'No groups found in database.'}
                                                                                </div>
                                                                                <div className="flex flex-col gap-2 scale-90">
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={(e) => {
                                                                                            e.stopPropagation();
                                                                                            refetchGroups();
                                                                                        }}
                                                                                        className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold rounded-lg border border-zinc-700 transition-all"
                                                                                    >
                                                                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                                                        </svg>
                                                                                        Refresh List
                                                                                    </button>
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={(e) => {
                                                                                            e.stopPropagation();
                                                                                            handleSyncGroups();
                                                                                        }}
                                                                                        disabled={isSyncingGroups}
                                                                                        className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-zinc-800 disabled:text-zinc-600 text-white text-xs font-bold rounded-lg transition-all shadow-lg shadow-blue-500/10"
                                                                                    >
                                                                                        {isSyncingGroups ? (
                                                                                            <>
                                                                                                <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                                                                Syncing from WA...
                                                                                            </>
                                                                                        ) : (
                                                                                            <>
                                                                                                <Plus className="w-3.5 h-3.5" />
                                                                                                Deep Sync from WA
                                                                                            </>
                                                                                        )}
                                                                                    </button>
                                                                                </div>
                                                                            </div>
                                                                        )
                                                                    }

                                                                    return filtered.map((g: any) => {
                                                                        const isSelected = selectedTargets.some(t => t.jid === g.jid)
                                                                        return (
                                                                            <button
                                                                                key={g.jid}
                                                                                type="button"
                                                                                onClick={() => {
                                                                                    if (isSelected) {
                                                                                        setSelectedTargets(selectedTargets.filter(t => t.jid !== g.jid))
                                                                                    } else {
                                                                                        setSelectedTargets([
                                                                                            ...selectedTargets,
                                                                                            { jid: g.jid, name: g.subject || g.name || 'Unnamed Group', type: 'group' }
                                                                                        ])
                                                                                    }
                                                                                }}
                                                                                className="w-full px-3 py-2.5 hover:bg-zinc-800 transition-colors flex items-center gap-3 text-left border-b border-zinc-800/50 last:border-0"
                                                                            >
                                                                                {/* Avatar */}
                                                                                <div className="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center flex-shrink-0">
                                                                                    <svg className="w-5 h-5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                                                                    </svg>
                                                                                </div>
                                                                                {/* Group Info */}
                                                                                <div className="flex-1 min-w-0">
                                                                                    <div className="text-sm font-medium text-white truncate">
                                                                                        {g.subject || g.name || 'Unnamed Group'}
                                                                                    </div>
                                                                                    <div className="text-xs text-zinc-500 truncate">
                                                                                        {g.jid}
                                                                                    </div>
                                                                                </div>
                                                                                {/* Icon: Plus or Checkmark */}
                                                                                {isSelected ? (
                                                                                    <svg className="w-5 h-5 text-blue-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                                                    </svg>
                                                                                ) : (
                                                                                    <svg className="w-5 h-5 text-zinc-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                                                                    </svg>
                                                                                )}
                                                                            </button>
                                                                        )
                                                                    })
                                                                })()
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </>
                                    )}
                                </section>

                                {/* API Key & Model Selection */}
                                <section className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
                                    <h3 className="text-lg font-semibold text-white mb-4">AI Provider</h3>
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="block text-sm text-zinc-400">
                                            API Authentication
                                        </label>
                                        <a
                                            href="https://console.groq.com/keys"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-sm text-blue-500 hover:text-blue-400 transition-colors"
                                        >
                                            Get API Key
                                        </a>
                                    </div>
                                    <div className="flex gap-2">
                                        <div className="relative flex-1">
                                            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                                            </svg>
                                            <input
                                                name="wa_bot_api_key_secure"
                                                type={showApiKey ? "text" : "password"}
                                                required
                                                value={formData.api_key}
                                                onChange={(e) => handleApiKeyChange(e.target.value)}
                                                placeholder="Place your API here"
                                                autoComplete="new-password"
                                                className="w-full pl-10 pr-10 py-2.5 bg-zinc-900 border border-zinc-800 rounded-md text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowApiKey(!showApiKey)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                                            >
                                                {showApiKey ? (
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.046m4.577-2.236A11.042 11.042 0 0112 5c4.478 0 8.268 2.943 9.542 7a10.028 10.028 0 01-4.438 4.418m-1.93-1.93a3.5 3.5 0 01-4.95-4.95l-1.414-1.414l6.364 6.364l1.414 1.414z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3l18 18" />
                                                    </svg>
                                                ) : (
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                    </svg>
                                                )}
                                            </button>
                                        </div>
                                        <button
                                            type="button"
                                            className="px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-sm font-medium rounded-md transition-colors whitespace-nowrap"
                                        >
                                            Verify Key
                                        </button>
                                    </div>
                                    {formData.api_key && (
                                        <p className="mt-2 text-xs text-zinc-500">
                                            Detected Provider: <span className="text-blue-400 font-medium">{formData.provider.toUpperCase()}</span>
                                        </p>
                                    )}
                                </div>

                                {/* Model Selection - CONDITIONAL */}
                                {formData.api_key && (
                                    <div>
                                        <label className="block text-sm text-zinc-400 mb-2">
                                            Model *
                                        </label>
                                        <select
                                            required
                                            value={formData.model}
                                            onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                                            className="w-full px-3 py-2.5 bg-zinc-900 border border-zinc-800 rounded-md text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                        >
                                            {modelOptions[formData.provider].map((m) => (
                                                <option key={m.id} value={m.id}>
                                                    {m.name} - {m.description}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                                </section>

                                {/* System Prompt */}
                                <section className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
                                    <h3 className="text-lg font-semibold text-white mb-4">System Prompt</h3>
                                <div>
                                    <label className="block text-sm text-zinc-400 mb-2">
                                        System Prompt (Optional)
                                    </label>
                                    <textarea
                                        rows={4}
                                        value={formData.system_prompt}
                                        onChange={(e) => setFormData({ ...formData, system_prompt: e.target.value })}
                                        placeholder="Custom instructions for this configuration..."
                                        className="w-full px-3 py-2.5 bg-zinc-900 border border-zinc-800 rounded-md text-white text-sm placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none"
                                    />
                                </div>
                                </section>

                                {/* Bot Behavior */}
                                <section className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
                                    <h3 className="text-lg font-semibold text-white mb-4">Bot Behavior</h3>
                                    <div className="space-y-2">
                                        {/* Conversation Model */}
                                        <div className={`p-3 rounded-lg border transition-all ${formData.conversation_model ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-[#0f0f0f] border-zinc-800/50'}`}>
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <svg className={`w-4 h-4 ${formData.conversation_model ? 'text-emerald-400' : 'text-zinc-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                                    </svg>
                                                    <div>
                                                        <div className={`text-xs font-medium ${formData.conversation_model ? 'text-white' : 'text-zinc-400'}`}>
                                                            Conversation Model
                                                        </div>
                                                        <div className="text-xs text-zinc-500">
                                                            Responds with full context
                                                        </div>
                                                    </div>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, conversation_model: !formData.conversation_model })}
                                                    className={`relative w-10 h-5 rounded-full transition-colors ${formData.conversation_model ? 'bg-emerald-500' : 'bg-zinc-700'}`}
                                                >
                                                    <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${formData.conversation_model ? 'translate-x-5' : 'translate-x-0.5'}`} />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Silent Collection */}
                                        <div className={`p-3 rounded-lg border transition-all ${formData.silent_collection ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-zinc-900/50 border-zinc-800'}`}>
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <svg className={`w-4 h-4 ${formData.silent_collection ? 'text-emerald-400' : 'text-zinc-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                                                    </svg>
                                                    <div>
                                                        <div className={`text-xs font-medium ${formData.silent_collection ? 'text-white' : 'text-zinc-400'}`}>
                                                            Silent Collection
                                                        </div>
                                                        <div className="text-xs text-zinc-500">
                                                            No replies, background only
                                                        </div>
                                                    </div>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, silent_collection: !formData.silent_collection })}
                                                    className={`relative w-10 h-5 rounded-full transition-colors ${formData.silent_collection ? 'bg-emerald-500' : 'bg-zinc-700'}`}
                                                >
                                                    <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${formData.silent_collection ? 'translate-x-5' : 'translate-x-0.5'}`} />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Hybrid Mode */}
                                        <div className={`p-3 rounded-lg border transition-all ${formData.hybrid_mode ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-zinc-900/50 border-zinc-800'}`}>
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <svg className={`w-4 h-4 ${formData.hybrid_mode ? 'text-emerald-400' : 'text-zinc-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                                    </svg>
                                                    <div>
                                                        <div className={`text-xs font-medium ${formData.hybrid_mode ? 'text-white' : 'text-zinc-400'}`}>
                                                            Hybrid Mode
                                                        </div>
                                                        <div className="text-xs text-zinc-500">
                                                            Reply only if confident
                                                        </div>
                                                    </div>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, hybrid_mode: !formData.hybrid_mode })}
                                                    className={`relative w-10 h-5 rounded-full transition-colors ${formData.hybrid_mode ? 'bg-emerald-500' : 'bg-zinc-700'}`}
                                                >
                                                    <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${formData.hybrid_mode ? 'translate-x-5' : 'translate-x-0.5'}`} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </section>

                                {/* Actions - Hidden on desktop (use header button) */}
                                <div className="lg:hidden flex justify-end gap-2 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setShowModal(false)}
                                        className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 text-sm font-medium rounded-md transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-lg transition-all shadow-lg"
                                    >
                                        {editingConfig ? 'Update' : 'Create'}
                                    </button>
                                </div>
                            </form>
                                </div>
                            </div>

                            {/* Mobile Save Button */}
                            <div className="lg:hidden fixed bottom-0 left-0 right-0 p-4 bg-zinc-950/95 backdrop-blur border-t border-zinc-800 z-30">
                                <button 
                                    type="submit" 
                                    form="ai-config-form"
                                    className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg shadow-lg"
                                >
                                    {editingConfig ? 'Update Configuration' : 'Save Configuration'} <Save size={18} />
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div>
    )
}
