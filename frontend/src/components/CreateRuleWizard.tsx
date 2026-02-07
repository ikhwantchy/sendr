'use client'

import { useState, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import SharedMessageEditor from '@/components/SharedMessageEditor'
import { X, Image as ImageIcon, Trash2, MessageSquare, Zap, Globe, Users, User, Plus, Search, ArrowRight, Upload, Save, ChevronLeft, Eye, RefreshCw, Check, ChevronDown } from 'lucide-react'

interface CreateRuleWizardProps {
    botId?: string
    ruleId?: string // For edit mode
    onClose: () => void
}

interface Group {
    id?: string
    jid: string
    name: string
    participant_count?: number
}

export default function CreateRuleWizard({ botId, ruleId, onClose }: CreateRuleWizardProps) {
    const queryClient = useQueryClient()

    // Fetch bots for selection
    const { data: botsData } = useQuery({
        queryKey: ['bots'],
        queryFn: () => api.bots.list().then(res => res.data.data),
        enabled: !botId
    })

    // State for universal usage
    const [selectedBotId, setSelectedBotId] = useState<string>(botId || '')
    const [isEditorExpanded, setIsEditorExpanded] = useState(false)

    // Preview panel state
    const [isPreviewOpen, setIsPreviewOpen] = useState(false)

    // Update selectedBotId if prop changes
    useEffect(() => {
        if (botId) setSelectedBotId(botId)
        else if (botsData && botsData.length > 0 && !selectedBotId) {
            setSelectedBotId(botsData[0].id)
        }
    }, [botId, botsData])

    // Core Form State
    const [formData, setFormData] = useState({
        trigger: '',
        reply: '',
        match_type: 'contains' as 'exact' | 'contains' | 'starts_with' | 'ends_with',
        is_active: true,
        media: null as File | null
    })

    // Target Audience State
    const [targetType, setTargetType] = useState<'global' | 'group' | 'contact'>('global')
    const [selectedGroups, setSelectedGroups] = useState<string[]>([])
    const [specificContacts, setSpecificContacts] = useState('')
    const [isGroupSelectorOpen, setIsGroupSelectorOpen] = useState(false)
    const [groupSearchQuery, setGroupSearchQuery] = useState('')
    const [isSyncingGroups, setIsSyncingGroups] = useState(false)

    const handleSyncGroups = async () => {
        setIsSyncingGroups(true)
        try {
            await queryClient.invalidateQueries({ queryKey: ['groups', selectedBotId] })
            toast.success('Groups synced')
        } catch (error) {
            toast.error('Failed to sync groups')
        } finally {
            setIsSyncingGroups(false)
        }
    }

    // Global Config State (Everyone)
    const [globalConfig, setGlobalConfig] = useState({ private: true, group: true })

    // UI Helper State
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)

    // Fetch Groups for Selector (depend on selectedBotId)
    const { data: groupsData } = useQuery({
        queryKey: ['groups', selectedBotId],
        queryFn: async () => {
            if (!selectedBotId) return []
            try {
                const res = await api.bots.getGroups(selectedBotId)
                return res.data.data as Group[] || []
            } catch (e) {
                console.error('Failed to fetch groups', e)
                return []
            }
        },
        enabled: targetType === 'group' && !!selectedBotId
    })

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            setFormData({ ...formData, media: file })
            const url = URL.createObjectURL(file)
            setPreviewUrl(url)
        }
    }



    // Populate data if in edit mode
    const { data: ruleData, isLoading: isLoadingRule } = useQuery({
        queryKey: ['rule', ruleId],
        queryFn: async () => {
            if (!ruleId) return null
            const res = await api.rules.get(ruleId)
            return res.data.data
        },
        enabled: !!ruleId
    })

    useEffect(() => {
        if (ruleData) {
            // Match type mapping if needed
            const matchType = ruleData.match_type === 'equals' ? 'exact' : (ruleData.match_type || 'contains')

            // Action parsing
            let replyMessage = ''
            let mediaUrl = null
            if (ruleData.actions) {
                try {
                    const actions = typeof ruleData.actions === 'string'
                        ? JSON.parse(ruleData.actions)
                        : ruleData.actions

                    const sendAction = actions.find((a: any) => a.type === 'SEND_TEXT' || a.type === 'SEND_IMAGE')
                    if (sendAction && sendAction.config) {
                        replyMessage = sendAction.config.message || ''
                        mediaUrl = sendAction.config.url || null
                    }
                } catch (e) {
                    console.error('Failed to parse actions into wizard:', e)
                }
            }

            setFormData({
                trigger: ruleData.keyword || '',
                reply: replyMessage,
                match_type: matchType as any,
                is_active: ruleData.is_active === 1,
                media: null
            })

            if (mediaUrl) setPreviewUrl(mediaUrl)

            // Scope parsing
            setTargetType(ruleData.scope || 'global')
            if (ruleData.scope === 'group') {
                setSelectedGroups(ruleData.scope_target ? ruleData.scope_target.split(',') : [])
            } else if (ruleData.scope === 'contact') {
                setSpecificContacts(ruleData.scope_target || '')
            }

            // Global config parsing
            if (ruleData.metadata) {
                try {
                    const meta = typeof ruleData.metadata === 'string' ? JSON.parse(ruleData.metadata) : ruleData.metadata
                    setGlobalConfig({
                        private: meta.reply_in_private !== false,
                        group: meta.reply_in_group !== false
                    })
                } catch (e) { }
            }

            if (ruleData.bot_id) setSelectedBotId(ruleData.bot_id)
        }
    }, [ruleData])

    const fileToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = error => reject(error);
        });
    }

    const createMutation = useMutation({
        mutationFn: async (data: any) => {
            if (!selectedBotId) throw new Error('Please select a bot')

            let mediaUrl = null;
            if (data.media) {
                mediaUrl = await fileToBase64(data.media);
            }

            // Determine Scope Target Logic
            let scope = targetType
            let scopeTarget = null

            if (targetType === 'group') {
                if (selectedGroups.length === 0) throw new Error('Please select at least one group')
                scopeTarget = selectedGroups.join(',')
            } else if (targetType === 'contact') {
                if (!specificContacts.trim()) throw new Error('Please enter at least one contact number')
                scopeTarget = specificContacts.trim()
            } else {
                scope = 'global'
            }

            const backendData = {
                bot_id: selectedBotId,
                name: `Auto-reply: ${data.trigger}`,
                keyword: data.trigger,
                match_type: data.match_type,
                scope: scope,
                scope_target: scopeTarget,
                priority: 10, // Default priority
                actions: [{
                    type: mediaUrl ? 'SEND_IMAGE' : 'SEND_TEXT',
                    config: {
                        message: data.reply,
                        url: mediaUrl,
                        variables: {}
                    }
                }],
                metadata: {
                    reply_in_private: globalConfig.private,
                    reply_in_group: globalConfig.group
                },
                is_active: data.is_active ? 1 : 0
            }

            return await api.rules.create(backendData)
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['rules', selectedBotId] })
            queryClient.invalidateQueries({ queryKey: ['rules'] })
            toast.success('Rule created successfully!')
            onClose()
        },
        onError: (error: any) => {
            const errorMessage = error.message || error.response?.data?.message || 'Failed to create rule'
            toast.error(errorMessage)
        },
    })

    const updateMutation = useMutation({
        mutationFn: async (data: any) => {
            if (!ruleId) return

            let mediaUrl = previewUrl // Default to existing
            if (data.media) {
                mediaUrl = await fileToBase64(data.media)
            } else if (previewUrl === null) {
                mediaUrl = null
            }

            let scope = targetType
            let scopeTarget = null

            if (targetType === 'group') {
                if (selectedGroups.length === 0) throw new Error('Please select at least one group')
                scopeTarget = selectedGroups.join(',')
            } else if (targetType === 'contact') {
                if (!specificContacts.trim()) throw new Error('Please enter at least one contact number')
                scopeTarget = specificContacts.trim()
            } else {
                scope = 'global'
            }

            const backendData = {
                bot_id: selectedBotId,
                name: `Auto-reply: ${data.trigger}`,
                keyword: data.trigger,
                match_type: data.match_type === 'exact' ? 'equals' : data.match_type,
                scope: scope,
                scope_target: scopeTarget,
                actions: [{
                    type: mediaUrl ? 'SEND_IMAGE' : 'SEND_TEXT',
                    config: {
                        message: data.reply,
                        url: mediaUrl,
                        variables: {}
                    }
                }],
                metadata: {
                    reply_in_private: globalConfig.private,
                    reply_in_group: globalConfig.group
                },
                is_active: data.is_active ? 1 : 0
            }

            return await api.rules.update(ruleId, backendData)
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['rules', selectedBotId] })
            queryClient.invalidateQueries({ queryKey: ['rules'] })
            queryClient.invalidateQueries({ queryKey: ['rule', ruleId] })
            toast.success('Rule updated successfully!')
            onClose()
        },
        onError: (error: any) => {
            const errorMessage = error.message || error.response?.data?.message || 'Failed to update rule'
            toast.error(errorMessage)
        },
    })

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!formData.trigger || !formData.reply) {
            toast.error('Trigger and Reply message are required')
            return
        }
        if (ruleId) {
            updateMutation.mutate(formData)
        } else {
            createMutation.mutate(formData)
        }
    }

    const SectionHeader = ({ title, desc, step }: { title: string, desc: string, step?: number }) => (
        <div className="mb-6">
            <div className="flex items-center gap-3 mb-2">
                {step && (
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 font-bold text-sm shrink-0">
                        {step}
                    </div>
                )}
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">{title}</h3>
            </div>
            <p className="text-sm text-zinc-500 ml-11">{desc}</p>
        </div>
    )

    if (isLoadingRule) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-zinc-50 dark:bg-black w-full">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 rounded-full border-4 border-blue-500/20 border-t-blue-500 animate-spin" />
                    <p className="text-zinc-500 animate-pulse">Loading rule details...</p>
                </div>
            </div>
        )
    }

    // Derived Preview Logic
    const getPreviewBotName = () => {
        if (!selectedBotId || !botsData) return 'Sendr Assistant'
        const bot = botsData.find((b: any) => b.id === selectedBotId)
        return bot ? bot.name : 'Sendr Assistant'
    }

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-black flex" >

            {/* --- Left Panel: Scrollable Form --- */}
            < div className="flex-1 flex flex-col h-screen border-r border-zinc-200 dark:border-zinc-800 relative bg-zinc-50 dark:bg-black overflow-hidden" >
                {/* Header */}
                < div className="shrink-0 bg-zinc-50 dark:bg-black z-20 border-b border-zinc-200 dark:border-zinc-800" >
                    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 sm:gap-4">
                                <button onClick={onClose} className="p-1.5 sm:p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors group">
                                    <ChevronLeft size={18} className="sm:w-5 sm:h-5 transition-transform duration-300 group-hover:-translate-x-1" />
                                </button>
                                <div>
                                    <h1 className="text-base sm:text-xl font-semibold text-zinc-900 dark:text-white">{ruleId ? 'Edit Auto-Reply' : 'Create Auto-Reply'}</h1>
                                    <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 hidden sm:block">Configure automated responses for incoming messages</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 sm:gap-3">
                                <button
                                    onClick={() => setIsPreviewOpen(!isPreviewOpen)}
                                    className={`hidden lg:flex items-center gap-2 px-4 py-2.5 border rounded-lg font-medium transition-all group ${isPreviewOpen
                                        ? 'bg-zinc-200 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white'
                                        : 'border-zinc-300 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:border-zinc-400 dark:hover:border-zinc-600'
                                        }`}
                                >
                                    <Eye size={16} className="transition-transform duration-300 group-hover:scale-110" />
                                    Preview
                                </button>
                                <button
                                    onClick={handleSubmit}
                                    disabled={createMutation.isPending || updateMutation.isPending}
                                    className="hidden lg:flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg shadow-lg disabled:opacity-50 transition-all"
                                >
                                    {createMutation.isPending || updateMutation.isPending ? (
                                        <><Zap size={16} className="animate-spin" /> Saving...</>
                                    ) : (
                                        <><Save size={16} /> Save</>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div >

                {/* Scrollable Content */}
                < div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-12 py-6 sm:py-8 pb-24 lg:pb-8" >
                    <div className="max-w-3xl mx-auto space-y-6 sm:space-y-8">

                        {/* Bot Selection - Only show if botId is NOT provided */}
                        {!botId && (
                            <section className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 sm:p-6 shadow-sm dark:shadow-none">
                                <SectionHeader step={1} title="Basic Details" desc="Select which bot this rule applies to." />
                                <div className="space-y-4">
                                    <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">Target Bot *</label>
                                    <select
                                        value={selectedBotId}
                                        onChange={(e) => setSelectedBotId(e.target.value)}
                                        className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded text-zinc-900 dark:text-white text-xs placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                                    >
                                        <option value="">Select a Bot...</option>
                                        {botsData?.map((b: any) => (
                                            <option key={b.id} value={b.id}>{b.name} ({b.status})</option>
                                        ))}
                                    </select>
                                </div>
                            </section>
                        )}

                        {/* Trigger & Scope */}
                        <section className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 sm:p-6 shadow-sm dark:shadow-none">
                            <SectionHeader step={botId ? 1 : 2} title="Trigger Condition" desc="Define the keywords that trigger this rule." />

                            <div className="space-y-6">
                                {/* Keyword */}
                                <div>
                                    <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">Keyword (Trigger) *</label>
                                    <input
                                        type="text"
                                        value={formData.trigger}
                                        onChange={(e) => setFormData({ ...formData, trigger: e.target.value })}
                                        placeholder="e.g. /price, hello, !help"
                                        className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded text-zinc-900 dark:text-white text-xs placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                                    />
                                    <p className="text-xs text-zinc-500 mt-2">💡 Use a descriptive keyword like "/info" or "harga"</p>
                                </div>

                                {/* Match Type */}
                                <div>
                                    <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">Match Logic</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {[
                                            { id: 'contains', label: 'Contains Keyword' },
                                            { id: 'exact', label: 'Exact Match' },
                                            { id: 'starts_with', label: 'Starts With' }
                                        ].map(type => (
                                            <button
                                                key={type.id}
                                                type="button"
                                                onClick={() => setFormData({ ...formData, match_type: type.id as any })}
                                                className={`px-3 py-2 rounded-lg border text-xs font-medium transition-all hover:scale-105 active:scale-95 ${formData.match_type === type.id
                                                    ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/20'
                                                    : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600'
                                                    }`}
                                            >
                                                {type.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </section>

                        <section className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 sm:p-6 shadow-sm dark:shadow-none">
                            <SectionHeader step={botId ? 2 : 3} title="Target Audience" desc="Who should be able to trigger this rule?" />

                            <div className="flex bg-zinc-800/50 p-1 rounded-lg border border-zinc-700 w-fit mb-4">
                                {[
                                    { id: 'global', label: 'Everyone', icon: Globe },
                                    { id: 'group', label: 'Specific Groups', icon: Users },
                                    { id: 'contact', label: 'Specific Contacts', icon: User }
                                ].map(t => (
                                    <button
                                        key={t.id}
                                        type="button"
                                        onClick={() => setTargetType(t.id as any)}
                                        className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-all group ${targetType === t.id
                                            ? 'bg-blue-600 text-white shadow-sm'
                                            : 'text-zinc-400 hover:text-zinc-200'
                                            }`}
                                    >
                                        <t.icon size={14} className="transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6" /> {t.label}
                                    </button>
                                ))}
                            </div>

                            {/* Global Config Options */}
                            {targetType === 'global' && (
                                <div className="mt-4 flex flex-col sm:flex-row gap-4 animate-in fade-in p-3 bg-zinc-900/50 rounded-lg border border-zinc-800">
                                    <label className="flex items-center gap-3 text-xs text-zinc-400 cursor-pointer hover:text-white transition-colors group">
                                        <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all group-hover:scale-110 ${globalConfig.private ? 'bg-blue-600 border-blue-600' : 'border-zinc-400 dark:border-zinc-600 bg-white dark:bg-zinc-800'}`}>
                                            {globalConfig.private && <Zap size={12} className="text-white fill-current" />}
                                        </div>
                                        <input
                                            type="checkbox"
                                            checked={globalConfig.private}
                                            onChange={e => setGlobalConfig({ ...globalConfig, private: e.target.checked })}
                                            className="hidden"
                                        />
                                        <span>Allow Private Chat</span>
                                    </label>
                                    <label className="flex items-center gap-3 text-xs text-zinc-400 cursor-pointer hover:text-white transition-colors group">
                                        <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all group-hover:scale-110 ${globalConfig.group ? 'bg-blue-600 border-blue-600' : 'border-zinc-400 dark:border-zinc-600 bg-white dark:bg-zinc-800'}`}>
                                            {globalConfig.group && <Users size={12} className="text-white fill-current" />}
                                        </div>
                                        <input
                                            type="checkbox"
                                            checked={globalConfig.group}
                                            onChange={e => setGlobalConfig({ ...globalConfig, group: e.target.checked })}
                                            className="hidden"
                                        />
                                        <span>Allow Group Chat</span>
                                    </label>
                                </div>
                            )}

                            {/* Dynamic Target Inputs */}
                            {targetType === 'group' && (
                                <div className="space-y-4 animate-in fade-in">
                                    <div className="flex justify-between items-center mb-1">
                                        <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                                            Select Groups <span className="text-red-400">*</span>
                                        </label>
                                        <button
                                            type="button"
                                            onClick={handleSyncGroups}
                                            disabled={isSyncingGroups}
                                            className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1 disabled:opacity-50 group"
                                        >
                                            <RefreshCw size={10} className={`transition-transform duration-500 ${isSyncingGroups ? "animate-spin" : "group-hover:rotate-180"}`} />
                                            Sync Groups
                                        </button>
                                    </div>

                                    {/* Selected Groups Chips */}
                                    <div className="flex flex-wrap gap-2 mb-2">
                                        {selectedGroups.map(id => {
                                            const group = groupsData?.find(g => g.jid === id)
                                            return (
                                                <div key={id} className="flex items-center gap-2 px-2 py-1 bg-blue-500/10 border border-blue-500/20 rounded text-blue-200 text-xs">
                                                    <span className="max-w-[150px] truncate">{group?.name || id}</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => setSelectedGroups(selectedGroups.filter(g => g !== id))}
                                                        className="hover:text-white group"
                                                    >
                                                        <X size={12} className="transition-transform duration-200 group-hover:rotate-90 group-hover:scale-110" />
                                                    </button>
                                                </div>
                                            )
                                        })}
                                    </div>

                                    {/* Group Search Dropdown */}
                                    <div className="relative">
                                        <div
                                            className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-white text-xs flex justify-between items-center cursor-pointer hover:border-zinc-600 transition-colors"
                                            onClick={() => setIsGroupSelectorOpen(!isGroupSelectorOpen)}
                                        >
                                            <span className={selectedGroups.length ? "text-zinc-900 dark:text-white" : "text-zinc-500 dark:text-zinc-500"}>
                                                {selectedGroups.length
                                                    ? `${selectedGroups.length} group(s) selected`
                                                    : "Select groups..."}
                                            </span>
                                            <ChevronDown size={14} className={`text-zinc-500 transition-transform ${isGroupSelectorOpen ? 'rotate-180' : ''}`} />
                                        </div>

                                        {isGroupSelectorOpen && (
                                            <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded shadow-xl z-50 max-h-[300px] flex flex-col overflow-hidden animate-in zoom-in-95">
                                                <div className="p-2 border-b border-zinc-200 dark:border-zinc-800">
                                                    <div className="relative">
                                                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-400" />
                                                        <input
                                                            type="text"
                                                            value={groupSearchQuery}
                                                            onChange={(e) => setGroupSearchQuery(e.target.value)}
                                                            placeholder="Search groups..."
                                                            className="w-full pl-8 pr-3 py-1.5 bg-zinc-900 rounded text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-blue-500/50 border border-zinc-800 focus:border-blue-500/50"
                                                            autoFocus
                                                        />
                                                    </div>
                                                </div>
                                                <div className="flex-1 overflow-y-auto p-1">
                                                    {(() => {
                                                        const filtered = groupsData?.filter(g =>
                                                            (g.name || '').toLowerCase().includes(groupSearchQuery.toLowerCase()) ||
                                                            (g.jid || '').toLowerCase().includes(groupSearchQuery.toLowerCase())
                                                        ) || []

                                                        if (filtered.length === 0) {
                                                            return <div className="p-3 text-center text-zinc-500 text-xs">No groups found</div>
                                                        }

                                                        return filtered.map(g => {
                                                            const isSelected = selectedGroups.includes(g.jid)
                                                            return (
                                                                <button
                                                                    key={g.jid}
                                                                    type="button"
                                                                    onClick={() => {
                                                                        if (isSelected) {
                                                                            setSelectedGroups(selectedGroups.filter(id => id !== g.jid))
                                                                        } else {
                                                                            setSelectedGroups([...selectedGroups, g.jid])
                                                                        }
                                                                    }}
                                                                    className={`w-full flex items-center gap-3 p-2 rounded text-left transition-colors group ${isSelected ? 'bg-blue-500/10' : 'hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
                                                                >
                                                                    <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 flex items-center justify-center flex-shrink-0">
                                                                        <Users size={14} className="text-zinc-500 dark:text-zinc-400" />
                                                                    </div>
                                                                    <div className="flex-1 min-w-0">
                                                                        <div className="text-xs font-medium text-zinc-900 dark:text-zinc-200 truncate">
                                                                            {g.name || 'Unnamed Group'}
                                                                        </div>
                                                                        <div className="text-[10px] text-zinc-500 truncate">
                                                                            {g.jid}
                                                                        </div>
                                                                    </div>
                                                                    {isSelected ? (
                                                                        <div className="w-4 h-4 flex items-center justify-center text-blue-500">
                                                                            <Check size={12} strokeWidth={3} />
                                                                        </div>
                                                                    ) : (
                                                                        <Plus size={14} className="text-zinc-400 dark:text-zinc-500 group-hover:text-zinc-600 dark:group-hover:text-white transition-colors" />
                                                                    )}
                                                                </button>
                                                            )
                                                        })
                                                    })()}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <div className="text-[10px] text-zinc-500 px-1">
                                        Auto-filled when API detected
                                    </div>
                                </div>
                            )}

                            {targetType === 'contact' && (
                                <div className="animate-in fade-in space-y-4">
                                    <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">Phone Numbers</label>
                                    <textarea
                                        value={specificContacts}
                                        onChange={(e) => setSpecificContacts(e.target.value)}
                                        placeholder="Enter phone numbers (e.g. 628123456789), one per line or comma separated..."
                                        rows={3}
                                        className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded text-zinc-900 dark:text-white text-xs placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all font-mono"
                                    />
                                </div>
                            )}
                        </section>

                        {/* Response Action */}
                        <section className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 sm:p-6 shadow-sm dark:shadow-none">
                            <SectionHeader step={botId ? 3 : 4} title="Response Message" desc="What should the bot reply when triggered?" />

                            <div className="space-y-4">
                                <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">Reply Message *</label>

                                <div className="relative">
                                    <SharedMessageEditor
                                        value={formData.reply}
                                        onChange={(val) => setFormData({ ...formData, reply: val })}
                                        variables={[]}
                                        isExpanded={false}
                                        onToggleExpand={() => setIsEditorExpanded(true)}
                                        placeholder="Type your automated reply here..."
                                    />
                                    {isEditorExpanded && (
                                        <>
                                            <div
                                                className="fixed inset-0 z-[150] bg-black/90 backdrop-blur-sm animate-in fade-in duration-300"
                                                onClick={() => setIsEditorExpanded(false)}
                                            />
                                            <div className="fixed top-[5vh] bottom-[5vh] left-1/2 -translate-x-1/2 w-[95vw] max-w-5xl z-[200] flex flex-col animate-in zoom-in-95 duration-300">
                                                <SharedMessageEditor
                                                    value={formData.reply}
                                                    onChange={(val) => setFormData({ ...formData, reply: val })}
                                                    variables={[]}
                                                    isExpanded={true}
                                                    onToggleExpand={() => setIsEditorExpanded(false)}
                                                    placeholder="Type your automated reply here..."
                                                />
                                            </div>
                                        </>
                                    )}
                                </div>

                                {/* Image Attachment */}
                                <div className="mt-4">
                                    {!previewUrl ? (
                                        <label className="flex items-center justify-center gap-3 w-full py-4 bg-zinc-900/30 border-2 border-dashed border-zinc-800 rounded-2xl cursor-pointer hover:bg-zinc-900/50 transition-all group hover:border-blue-500/40">
                                            <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center group-hover:bg-blue-500/10 transition-colors">
                                                <ImageIcon size={20} className="text-zinc-500 group-hover:text-blue-500 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-[-10deg]" />
                                            </div>
                                            <div className="text-left">
                                                <span className="text-sm font-bold text-zinc-300 group-hover:text-white block">Attach Media</span>
                                                <span className="text-[10px] text-zinc-500 uppercase tracking-tighter">Images, flyers, or promo banners</span>
                                            </div>
                                            <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                                        </label>
                                    ) : (
                                        <div className="flex items-center justify-between p-4 bg-zinc-950 border border-zinc-800 rounded-2xl group animate-in slide-in-from-top-2 duration-300">
                                            <div className="flex items-center gap-4">
                                                <div className="w-14 h-14 rounded-xl border border-zinc-800 overflow-hidden cursor-pointer hover:border-blue-500/50 transition-colors shrink-0">
                                                    <img src={previewUrl} className="w-full h-full object-cover" />
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2 mb-0.5">
                                                        <div className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 text-[9px] font-bold rounded uppercase tracking-wider border border-emerald-500/20">Media Attached</div>
                                                        <span className="text-xs font-bold text-zinc-300">Image file selected</span>
                                                    </div>
                                                    <p className="text-[10px] text-zinc-500">This media will be sent as a caption.</p>
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setPreviewUrl(null);
                                                    setFormData({ ...formData, media: null });
                                                    // Also reset file input if possible (via ref), but not critical as onChange handles new files
                                                }}
                                                className="p-2 bg-zinc-900 hover:bg-red-500/10 text-zinc-400 hover:text-red-400 rounded-lg transition-colors border border-zinc-800 hover:border-red-500/50"
                                            >
                                                <X size={16} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </section>
                    </div>
                </div >

                {/* Mobile Save Button */}
                < div className="lg:hidden fixed bottom-0 left-0 right-0 p-4 bg-white/95 dark:bg-black/95 backdrop-blur border-t border-zinc-200 dark:border-zinc-800 z-30" >
                    <button
                        onClick={handleSubmit}
                        disabled={createMutation.isPending || updateMutation.isPending}
                        className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg shadow-lg disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                    >
                        {createMutation.isPending || updateMutation.isPending ? (
                            <><Zap size={18} className="animate-spin" /> Saving...</>
                        ) : (
                            <><Save size={18} /> Save</>
                        )}
                    </button>
                </div >
            </div >

            {/* --- Right Panel: Preview (conditional) --- */}
            {
                isPreviewOpen && (
                    <div className="w-[400px] bg-[#0b141a] relative flex flex-col h-screen border-l border-zinc-800 hidden lg:flex">
                        {/* Preview Header */}
                        <div className="h-16 bg-[#202c33] flex items-center px-4 gap-3 border-b border-[#2a3942] z-10 shrink-0">
                            <div className="w-10 h-10 rounded-full bg-black/20 flex items-center justify-center overflow-hidden">
                                <img src="/sendr-logo.png" alt="Sendr" className="w-full h-full object-cover" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-[#e9edef] text-sm font-medium truncate">{getPreviewBotName()}</div>
                                <div className="text-[#8696a0] text-xs">Business Account</div>
                            </div>
                            <Search size={20} className="text-[#aebac1]" />
                        </div>

                        {/* Preview Body */}
                        <div className="flex-1 relative flex flex-col min-h-0 bg-[#0b141a]">
                            <div className="absolute inset-0 bg-[url('https://static.whatsapp.net/rsrc.php/v3/yl/r/gi_DckOUM5a.png')] bg-repeat opacity-[0.06] pointer-events-none mix-blend-overlay"></div>

                            <div className="relative z-10 flex-1 p-6 flex flex-col justify-end gap-3 overflow-y-auto">
                                <div className="flex justify-center mb-4"><span className="bg-[#182229] text-[#8696a0] text-xs px-3 py-1.5 rounded-lg shadow-sm font-medium">TODAY</span></div>

                                {/* User Message Simulation */}
                                <div className="self-end max-w-[80%] bg-[#005c4b] p-2 rounded-lg rounded-tr-none shadow text-[#e9edef] text-sm mb-4 animate-in fade-in slide-in-from-right-4">
                                    <p>{formData.trigger || 'hello'}</p>
                                    <div className="text-[10px] text-[#8696a0] text-right mt-1 flex items-center justify-end gap-1">
                                        09:41 <div className="text-[#53bdeb]"><Zap size={10} fill="currentColor" /></div>
                                    </div>
                                </div>

                                {/* Bot Reply Preview */}
                                <div className="self-start max-w-[90%] relative group animate-in slide-in-from-left-2 transition-all">
                                    <div className="bg-[#202c33] p-1 rounded-lg rounded-tl-none shadow border border-white/5 text-[#e9edef] text-sm relative min-w-[120px]">

                                        {/* Image in Preview */}
                                        {previewUrl && (
                                            <div className="mb-1 rounded-lg overflow-hidden">
                                                <img src={previewUrl} alt="Preview" className="w-full h-auto object-cover max-h-60" />
                                            </div>
                                        )}

                                        {/* Text Content */}
                                        <div className="px-2 pt-1 pb-6 whitespace-pre-wrap leading-relaxed">
                                            {(() => {
                                                if (!formData.reply) {
                                                    return <span className="text-white/30 italic text-xs">Start typing to preview...</span>
                                                }

                                                // 1. Variable Substitution
                                                const text = formData.reply
                                                    .replace(/{name}/gi, 'John Doe')
                                                    .replace(/{tanggal}/gi, new Date().toLocaleDateString())
                                                    .replace(/{phone}/gi, '+62812345678')

                                                // Recursive formatting function
                                                const formatWaText = (input: string): React.ReactNode => {
                                                    const parts = input.split(/(```.+?```|\*.+?\*|_.+?_|~.+?~)/g);

                                                    return parts.map((part, index) => {
                                                        if (part.startsWith('```') && part.endsWith('```') && part.length >= 6) {
                                                            return <code key={index} className="font-mono bg-black/20 px-1 rounded text-[#53bdeb] text-xs">{part.slice(3, -3)}</code>;
                                                        }
                                                        if (part.startsWith('*') && part.endsWith('*') && part.length >= 2) {
                                                            return <strong key={index} className="font-bold">{formatWaText(part.slice(1, -1))}</strong>;
                                                        }
                                                        if (part.startsWith('_') && part.endsWith('_') && part.length >= 2) {
                                                            return <em key={index} className="italic">{formatWaText(part.slice(1, -1))}</em>;
                                                        }
                                                        if (part.startsWith('~') && part.endsWith('~') && part.length >= 2) {
                                                            return <s key={index} className="line-through decoration-white/50">{formatWaText(part.slice(1, -1))}</s>;
                                                        }
                                                        return <span key={index}>{part}</span>;
                                                    });
                                                };

                                                return text.split('\n').map((line, i) => (
                                                    <div key={i} className="min-h-[1.25em] whitespace-pre-wrap">
                                                        {formatWaText(line)}
                                                    </div>
                                                ));
                                            })()}
                                        </div>

                                        <div className="absolute right-2 bottom-1 text-[10px] text-[#8696a0]">09:41</div>
                                    </div>
                                    <div className="absolute top-0 -left-2 w-0 h-0 border-t-[10px] border-t-[#202c33] border-l-[10px] border-l-transparent transform scale-x-[-1]"></div>
                                </div>
                            </div>
                        </div>

                        {/* Preview Footer (Input Mock) */}
                        <div className="h-[62px] bg-[#202c33] px-3 flex items-center gap-3 shrink-0 border-t border-[#2a3942] z-20">
                            <Upload size={24} className="text-[#8696a0]" />
                            <div className="flex-1 bg-[#2a3942] rounded-lg h-9 px-3 flex items-center text-[#8696a0] text-sm">Type a message</div>
                            <div className="w-8 h-8 rounded-full bg-[#00a884] flex items-center justify-center text-white cursor-not-allowed">
                                <ArrowRight size={16} />
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    )
}
