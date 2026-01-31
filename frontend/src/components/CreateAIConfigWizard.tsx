'use client'

import { useState, useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import { ChevronLeft, Save, Plus, Eye, EyeOff, X, Maximize2, Users, User, ChevronDown, Search, RefreshCw, AlertTriangle, Settings2 } from 'lucide-react'

interface CreateAIConfigWizardProps {
    botId: string
    configId?: string
    onClose: () => void
}

export default function CreateAIConfigWizard({ botId, configId, onClose }: CreateAIConfigWizardProps) {
    const [showApiKey, setShowApiKey] = useState(false)
    const [showTargetDropdown, setShowTargetDropdown] = useState(false) // Deprecated by new UI but keeping for safety
    const [dropdownSearchQuery, setDropdownSearchQuery] = useState('') // Deprecated
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isSyncingGroups, setIsSyncingGroups] = useState(false)
    const [showPromptModal, setShowPromptModal] = useState(false)
    const [targetType, setTargetType] = useState<'group' | 'contact'>('group')
    const [manualContactInput, setManualContactInput] = useState('')

    // New UI State
    const [isGroupDropdownOpen, setIsGroupDropdownOpen] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')

    const promptTextareaRef = useRef<HTMLTextAreaElement>(null)

    // Form states
    const [formData, setFormData] = useState({
        config_name: '',
        target_jid: '',
        target_name: '',
        target_type: 'group' as 'group' | 'contact',
        provider: '',
        api_key: '',
        model: '',
        base_url: '',
        system_prompt: '',
        conversation_model: true,
        silent_collection: false,
        hybrid_mode: false,
        is_enabled: 1
    })

    // Multi-select targets
    const [selectedTargets, setSelectedTargets] = useState<Array<{ jid: string, name: string, type: 'group' | 'contact' }>>([])

    // Fetch groups
    const { data: groupsData, refetch: refetchGroups } = useQuery({
        queryKey: ['groups', botId],
        queryFn: async () => {
            const res = await api.bots.getGroups(botId)
            return res.data.data || []
        },
        enabled: !!botId
    })

    // Fetch existing config if editing
    const { data: existingConfig } = useQuery({
        queryKey: ['llmTarget', botId, configId],
        queryFn: async () => {
            if (!configId) return null
            const res = await api.bots.llmTargets.list(botId)
            const configs = res.data.data || []
            return configs.find((c: any) => c.id === configId) || null
        },
        enabled: !!botId && !!configId
    })

    // Load existing config data
    useEffect(() => {
        if (existingConfig) {
            const llmConfig = parseConfig(existingConfig.llm_config)
            setFormData({
                config_name: existingConfig.config_name || '',
                target_jid: existingConfig.target_jid,
                target_name: existingConfig.target_name || '',
                target_type: existingConfig.target_type,
                provider: llmConfig.provider || '',
                api_key: llmConfig.api_key || '',
                model: llmConfig.model || '',
                base_url: llmConfig.base_url || '',
                system_prompt: llmConfig.system_prompt || '',
                conversation_model: llmConfig.behavior?.conversationModel ?? true,
                silent_collection: llmConfig.behavior?.silentCollection ?? false,
                hybrid_mode: llmConfig.behavior?.hybridMode ?? false,
                is_enabled: existingConfig.is_enabled
            })
            setTargetType(existingConfig.target_type)
        }
    }, [existingConfig])

    const groups = groupsData || []

    const [isCustomMode, setIsCustomMode] = useState(false)

    // Provider presets with default models and validation
    const providerPresets = [
        {
            id: 'gemini',
            name: 'Google Gemini',
            prefix: 'AIza',
            baseUrl: '',
            defaultModel: 'gemini-2.0-flash',
            validateKey: (k: string) => k.startsWith('AIza'),
            models: [
                { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash (Fastest)' },
                { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro (Capable)' },
                { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash (Balanced)' }
            ]
        },
        {
            id: 'openai',
            name: 'OpenAI',
            prefix: 'sk-',
            baseUrl: 'https://api.openai.com/v1',
            defaultModel: 'gpt-4o',
            validateKey: (k: string) => k.startsWith('sk-proj-') || k.startsWith('sk-'),
            models: [
                { id: 'gpt-4o', name: 'GPT-4o (Best Overall)' },
                { id: 'gpt-4o-mini', name: 'GPT-4o Mini (Fast & Cheap)' },
                { id: 'gpt-4-turbo', name: 'GPT-4 Turbo (Legacy High-End)' }
            ]
        },
        {
            id: 'groq',
            name: 'Groq',
            prefix: 'gsk_',
            baseUrl: 'https://api.groq.com/openai/v1',
            defaultModel: 'llama-3.3-70b-versatile',
            validateKey: (k: string) => k.startsWith('gsk_'),
            models: [
                { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B (Versatile)' },
                { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B (Instant)' },
                { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B (Large Context)' }
            ]
        },
        {
            id: 'anthropic',
            name: 'Anthropic',
            prefix: 'sk-ant-',
            baseUrl: 'https://api.anthropic.com/v1',
            defaultModel: 'claude-3-5-sonnet-20241022',
            validateKey: (k: string) => k.startsWith('sk-ant-'),
            models: [
                { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet (Best Coding/Reasoning)' },
                { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku (Fast)' },
                { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus (Most Powerful)' }
            ]
        },
        {
            id: 'deepseek',
            name: 'DeepSeek',
            prefix: 'sk-',
            baseUrl: 'https://api.deepseek.com/v1',
            defaultModel: 'deepseek-chat',
            validateKey: (k: string) => k.startsWith('sk-'),
            models: [
                { id: 'deepseek-chat', name: 'DeepSeek V3 (Chat)' },
                { id: 'deepseek-coder', name: 'DeepSeek Coder (Coding)' }
            ]
        },
        {
            id: 'nvidia',
            name: 'NVIDIA NIM',
            prefix: 'nvapi-',
            baseUrl: 'https://integrate.api.nvidia.com/v1',
            defaultModel: 'meta/llama-3.1-405b-instruct',
            validateKey: (k: string) => k.startsWith('nvapi-'),
            models: [
                { id: 'meta/llama-3.1-405b-instruct', name: 'Llama 3.1 405B' },
                { id: 'nvidia/nemotron-4-340b-instruct', name: 'Nemotron 4 340B' }
            ]
        },
        {
            id: 'openrouter',
            name: 'OpenRouter',
            prefix: 'sk-or-',
            baseUrl: 'https://openrouter.ai/api/v1',
            defaultModel: 'openai/gpt-4o',
            validateKey: (k: string) => k.startsWith('sk-or-'),
            models: [
                { id: 'openai/gpt-4o', name: 'GPT-4o (via OpenRouter)' },
                { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet (via OpenRouter)' },
                { id: 'google/gemini-pro-1.5', name: 'Gemini Pro 1.5 (via OpenRouter)' }
            ]
        },
        {
            id: 'byteplus',
            name: 'BytePlus (Doubao)',
            prefix: '',
            baseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
            defaultModel: 'doubao-pro-4k',
            validateKey: (k: string) => k.length === 36 && k.split('-').length === 5, // Basic UUID format check
            models: [
                { id: 'doubao-pro-4k', name: 'Doubao Pro 4k' },
                { id: 'doubao-lite-4k', name: 'Doubao Lite 4k' },
                { id: 'doubao-pro-32k', name: 'Doubao Pro 32k' }
            ]
        },
        {
            id: 'together',
            name: 'Together AI',
            prefix: '',
            baseUrl: 'https://api.together.xyz/v1',
            defaultModel: 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo',
            validateKey: (k: string) => true, // Flexible
            models: [
                { id: 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo', name: 'Llama 3.1 70B Turbo' },
                { id: 'meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo', name: 'Llama 3.1 405B Turbo' },
                { id: 'Qwen/Qwen2.5-72B-Instruct-Turbo', name: 'Qwen 2.5 72B Turbo' }
            ]
        },
        {
            id: 'custom',
            name: 'Other / Custom Provider',
            prefix: '',
            baseUrl: '',
            defaultModel: '',
            validateKey: (k: string) => true,
            models: []
        }
    ]

    const parseConfig = (configStr: string) => {
        try {
            return JSON.parse(configStr || '{}')
        } catch {
            return {}
        }
    }

    // Auto-detect provider from API key and set defaults
    const handleApiKeyChange = (apiKey: string) => {
        let detectedProvider = ''

        // Auto-detect based on key prefix (order matters - specific prefixes first)
        if (apiKey.startsWith('gsk_')) {
            detectedProvider = 'groq'
        } else if (apiKey.startsWith('sk-ant-')) {
            detectedProvider = 'anthropic'
        } else if (apiKey.startsWith('sk-or-')) {
            detectedProvider = 'openrouter'
        } else if (apiKey.startsWith('AIza')) {
            detectedProvider = 'gemini'
        } else if (apiKey.startsWith('nvapi-')) {
            detectedProvider = 'nvidia'
        } else if (apiKey.startsWith('sk-')) {
            // Check if it's deepseek
            detectedProvider = 'openai' // default for sk-, but could be DeepSeek
        }

        // Get preset for detected provider
        const preset = providerPresets.find(p => p.id === detectedProvider)

        // Only auto-fill model if we detected a known provider AND model is currently empty
        const newModel = (preset && !formData.model) ? preset.defaultModel : formData.model
        const newBaseUrl = preset?.baseUrl || formData.base_url

        // If we detected a valid provider, turn off custom mode
        if (detectedProvider) {
            setIsCustomMode(false)
        }

        setFormData({
            ...formData,
            api_key: apiKey,
            provider: detectedProvider || (isCustomMode ? formData.provider : ''), // Keep existing if custom logic is active
            model: newModel,
            base_url: newBaseUrl
        })
    }

    const handleSyncGroups = async () => {
        setIsSyncingGroups(true)
        try {
            await refetchGroups()
            toast.success('Groups synced successfully')
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Failed to sync groups')
        } finally {
            setIsSyncingGroups(false)
        }
    }

    const removeTarget = (jid: string) => {
        setSelectedTargets(prev => prev.filter(t => t.jid !== jid))
    }

    const formatPhoneToJID = (phone: string): string => {
        let cleaned = phone.replace(/\D/g, '')
        if (cleaned.startsWith('0')) {
            cleaned = '62' + cleaned.substring(1)
        }
        if (!cleaned.startsWith('62')) {
            cleaned = '62' + cleaned
        }
        return cleaned + '@s.whatsapp.net'
    }

    const addManualContact = () => {
        if (!manualContactInput.trim()) return

        const jid = formatPhoneToJID(manualContactInput)
        const name = manualContactInput.trim()

        // Check if already exists
        if (selectedTargets.some(t => t.jid === jid)) {
            toast.error('This contact is already added')
            return
        }

        setSelectedTargets([...selectedTargets, { jid, name, type: 'contact' }])
        setManualContactInput('')
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!configId && selectedTargets.length === 0) {
            toast.error('Please select at least one target')
            return
        }

        if (!formData.api_key) {
            toast.error('API Key is required')
            return
        }

        if (!formData.model) {
            toast.error('Model name is required')
            return
        }

        setIsSubmitting(true)

        try {
            const llm_config = JSON.stringify({
                provider: formData.provider || 'custom',
                api_key: formData.api_key,
                model: formData.model,
                base_url: formData.base_url,
                system_prompt: formData.system_prompt,
                behavior: {
                    conversationModel: formData.conversation_model,
                    silentCollection: formData.silent_collection,
                    hybridMode: formData.hybrid_mode
                }
            })

            if (configId) {
                // UPDATE mode
                await api.bots.llmTargets.update(botId, configId, {
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

            onClose()
        } catch (error: any) {
            const errorMsg = error.response?.data?.error || error.response?.data?.details || 'Failed to save configuration'
            toast.error(errorMsg)
        } finally {
            setIsSubmitting(false)
        }
    }

    const getProviderBadgeColor = (provider: string) => {
        switch (provider) {
            case 'openai': return 'bg-green-500/10 text-green-400 border-green-500/20'
            case 'groq': return 'bg-orange-500/10 text-orange-400 border-orange-500/20'
            case 'anthropic': return 'bg-purple-500/10 text-purple-400 border-purple-500/20'
            case 'nvidia': return 'bg-lime-500/10 text-lime-400 border-lime-500/20'
            case 'deepseek': return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
            case 'openrouter': return 'bg-pink-500/10 text-pink-400 border-pink-500/20'
            case 'byteplus': return 'bg-red-500/10 text-red-400 border-red-500/20'
            case 'together': return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
            default: return 'bg-blue-500/10 text-blue-400 border-blue-500/20'
        }
    }

    // Check if we should show dropdown (if provider is known and has models)
    const activeProviderPreset = providerPresets.find(p => p.id === formData.provider)
    const shouldShowModelDropdown = activeProviderPreset && activeProviderPreset.models && activeProviderPreset.models.length > 0

    // VALIDATION: Check if current key matches selected provider format
    const isKeyInvalidComponents = () => {
        if (!formData.provider || !formData.api_key) return null;
        if (isCustomMode) {
            const preset = providerPresets.find(p => p.id === formData.provider)
            if (preset && preset.validateKey && !preset.validateKey(formData.api_key)) {
                return (
                    <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-2.5">
                        <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                        <span className="text-xs text-red-400 leading-relaxed">
                            <strong>Warning:</strong> This API Key format doesn't look like a valid {preset.name} key.
                            {formData.provider === 'byteplus' && " Expected UUID format (36 chars)."}
                            {formData.provider === 'gemini' && " Should start with 'AIza'."}
                            {formData.provider === 'openai' && " Should start with 'sk-'."}
                        </span>
                    </div>
                )
            }
        }
        return null;
    }

    return (
        <div className="fixed inset-0 z-[100] bg-black flex">
            <div className="flex-1 flex flex-col h-full overflow-hidden">
                {/* Header - Matched with Reminder/Campaign layout */}
                <div className="shrink-0 bg-black/95 backdrop-blur-sm z-20 border-b border-zinc-800">
                    <div className="max-w-6xl mx-auto px-6 py-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="p-2 hover:bg-zinc-800 rounded-full transition-colors group"
                                >
                                    <ChevronLeft size={20} className="text-zinc-400 group-hover:text-white transition-transform duration-300 group-hover:-translate-x-1" />
                                </button>
                                <div>
                                    <h1 className="text-xl font-semibold text-white">
                                        {configId ? 'Edit AI Configuration' : 'Create AI Configuration'}
                                    </h1>
                                    <p className="text-sm text-zinc-500">Configure AI personas and behaviors for specific groups or contacts</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    type="submit"
                                    form="ai-config-form"
                                    disabled={isSubmitting}
                                    className="flex items-center gap-2 px-5 py-2 text-sm bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg disabled:opacity-50 transition-all"
                                >
                                    <Save size={16} />
                                    {isSubmitting ? 'Saving...' : (configId ? 'Update' : 'Save')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto px-6 lg:px-12 py-8 pb-24 lg:pb-8">
                    <div className="max-w-3xl mx-auto space-y-8">
                        <form id="ai-config-form" onSubmit={handleSubmit} className="space-y-6" autoComplete="off">

                            {/* Configuration Name */}
                            <section className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
                                <h3 className="text-lg font-semibold text-white mb-4">Basic Details</h3>
                                {/* Name Input */}
                                <div>
                                    <label className="block text-xs font-medium text-zinc-400 mb-1">
                                        Configuration Name <span className="text-red-400">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.config_name}
                                        onChange={(e) => setFormData({ ...formData, config_name: e.target.value })}
                                        placeholder="e.g., Customer Support, VIP Group"
                                        className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-white text-xs placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                                    />
                                </div>
                            </section>

                            {/* Target Selection */}
                            <section className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
                                <h3 className="text-lg font-semibold text-white mb-4">Target</h3>

                                {configId ? (
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
                                        <div className="flex bg-zinc-800/50 p-1 rounded-lg border border-zinc-700 w-fit mb-4">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setTargetType('group')
                                                    setSelectedTargets([])
                                                }}
                                                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all group ${targetType === 'group'
                                                    ? 'bg-blue-600 text-white shadow-sm'
                                                    : 'text-zinc-400 hover:text-zinc-200'
                                                    }`}
                                            >
                                                <Users size={14} className="transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6" /> Groups
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setTargetType('contact')
                                                    setSelectedTargets([])
                                                }}
                                                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all group ${targetType === 'contact'
                                                    ? 'bg-blue-600 text-white shadow-sm'
                                                    : 'text-zinc-400 hover:text-zinc-200'
                                                    }`}
                                            >
                                                <User size={14} className="transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6" /> Personal Chat
                                            </button>
                                        </div>





                                        {/* Group Selector */}
                                        {targetType === 'group' && (
                                            <>

                                                <div className="flex justify-between items-center mb-1">
                                                    <label className="text-xs font-medium text-zinc-400">
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

                                                {/* Selected Chips */}
                                                <div className="flex flex-wrap gap-2 mb-2">
                                                    {selectedTargets.map(target => (
                                                        <div key={target.jid} className="flex items-center gap-2 px-2 py-1 bg-blue-500/10 border border-blue-500/20 rounded text-blue-200 text-xs">
                                                            <span className="max-w-[150px] truncate">{target.name}</span>
                                                            <button
                                                                type="button"
                                                                onClick={() => removeTarget(target.jid)}
                                                                className="hover:text-white group"
                                                            >
                                                                <X size={12} className="transition-transform duration-200 group-hover:rotate-90 group-hover:scale-110" />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>

                                                {/* Group Search Dropdown */}
                                                <div className="relative">
                                                    <div
                                                        className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-white text-xs flex justify-between items-center cursor-pointer hover:border-zinc-600 transition-colors"
                                                        onClick={() => setIsGroupDropdownOpen(!isGroupDropdownOpen)}
                                                    >
                                                        <span className={selectedTargets.length ? "text-white" : "text-zinc-500"}>
                                                            {selectedTargets.length
                                                                ? `${selectedTargets.length} group(s) selected`
                                                                : "Select groups..."}
                                                        </span>
                                                        <ChevronDown size={14} className={`text-zinc-500 transition-transform ${isGroupDropdownOpen ? 'rotate-180' : ''}`} />
                                                    </div>

                                                    {isGroupDropdownOpen && (
                                                        <div className="absolute top-full left-0 right-0 mt-1 bg-zinc-800 border border-zinc-700 rounded shadow-xl z-50 max-h-[300px] flex flex-col overflow-hidden">
                                                            <div className="p-2 border-b border-zinc-700">
                                                                <div className="relative">
                                                                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-500" />
                                                                    <input
                                                                        type="text"
                                                                        value={searchTerm}
                                                                        onChange={(e) => setSearchTerm(e.target.value)}
                                                                        placeholder="Search groups..."
                                                                        className="w-full pl-8 pr-3 py-1.5 bg-zinc-900 rounded text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                                        autoFocus
                                                                    />
                                                                </div>
                                                            </div>
                                                            <div className="flex-1 overflow-y-auto p-1">
                                                                {(() => {
                                                                    const filtered = groups.filter((g: any) =>
                                                                        g.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                                                        g.name?.toLowerCase().includes(searchTerm.toLowerCase())
                                                                    )

                                                                    if (filtered.length === 0) {
                                                                        return <div className="p-3 text-center text-zinc-500 text-xs">No groups found</div>
                                                                    }

                                                                    return filtered.map((g: any) => {
                                                                        const isSelected = selectedTargets.some(t => t.jid === g.jid)
                                                                        return (
                                                                            <button
                                                                                key={g.jid}
                                                                                type="button"
                                                                                onClick={() => {
                                                                                    if (isSelected) {
                                                                                        removeTarget(g.jid)
                                                                                    } else {
                                                                                        setSelectedTargets([...selectedTargets, {
                                                                                            jid: g.jid,
                                                                                            name: g.subject || g.name || 'Group',
                                                                                            type: 'group'
                                                                                        }])
                                                                                    }
                                                                                }}
                                                                                className={`w-full flex items-center gap-3 p-2 rounded text-left transition-colors ${isSelected ? 'bg-blue-500/10' : 'hover:bg-zinc-700'
                                                                                    }`}
                                                                            >
                                                                                <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center flex-shrink-0">
                                                                                    <Users size={14} className="text-zinc-400" />
                                                                                </div>
                                                                                <div className="flex-1 min-w-0">
                                                                                    <div className="text-xs font-medium text-white truncate">
                                                                                        {g.subject || g.name || 'Unnamed Group'}
                                                                                    </div>
                                                                                    <div className="text-[10px] text-zinc-500 truncate">
                                                                                        {g.jid}
                                                                                    </div>
                                                                                </div>
                                                                                {isSelected ? (
                                                                                    <svg className="w-4 h-4 text-blue-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                                                    </svg>
                                                                                ) : (
                                                                                    <Plus size={14} className="text-zinc-500 group-hover:text-white transition-colors" />
                                                                                )}
                                                                            </button>
                                                                        )
                                                                    })
                                                                })()}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </>
                                        )}

                                        {/* Personal Contact Input */}
                                        {targetType === 'contact' && (
                                            <div className="space-y-2">
                                                <div className="flex gap-2">
                                                    <input
                                                        type="text"
                                                        value={manualContactInput}
                                                        onChange={(e) => setManualContactInput(e.target.value)}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') {
                                                                e.preventDefault()
                                                                addManualContact()
                                                            }
                                                        }}
                                                        placeholder="Enter phone number (e.g., 08123456789)"
                                                        className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-white text-xs placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={addManualContact}
                                                        className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded transition-colors"
                                                    >
                                                        <Plus size={16} />
                                                    </button>
                                                </div>
                                                <p className="text-[10px] text-zinc-500">
                                                    Enter phone numbers to add personal chat targets. Press Enter or click + to add.
                                                </p>
                                            </div>
                                        )}
                                    </>
                                )}
                            </section>

                            {/* AI Provider - Simplified */}
                            <section className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
                                <h3 className="text-lg font-semibold text-white mb-4">AI Provider</h3>
                                <div className="space-y-4">
                                    {/* API Key with Detected Badge */}
                                    <div>
                                        <label className="block text-xs font-medium text-zinc-400 mb-1">
                                            API Key <span className="text-red-400">*</span>
                                        </label>
                                        <div className="relative">
                                            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                                            </svg>
                                            <input
                                                type={showApiKey ? "text" : "password"}
                                                required
                                                value={formData.api_key}
                                                onChange={(e) => handleApiKeyChange(e.target.value)}
                                                placeholder="Paste your API key here"
                                                autoComplete="new-password"
                                                className="w-full pl-9 pr-9 py-2 bg-zinc-800 border border-zinc-700 rounded text-white text-xs placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all font-mono"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowApiKey(!showApiKey)}
                                                className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-400"
                                            >
                                                {showApiKey ? <EyeOff size={14} /> : <Eye size={14} />}
                                            </button>
                                        </div>

                                        {/* Auto-detected Provider Badge */}
                                        {formData.provider && (
                                            <div className="mt-2 flex items-center gap-2">
                                                <span className="text-xs text-zinc-500">Detected:</span>
                                                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${getProviderBadgeColor(formData.provider)}`}>
                                                    {providerPresets.find(p => p.id === formData.provider)?.name || formData.provider.toUpperCase()}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Model Selection - Dropdown or Manual Input */}
                                    <div>
                                        <label className="block text-xs font-medium text-zinc-400 mb-1">
                                            Model <span className="text-red-400">*</span>
                                        </label>

                                        {shouldShowModelDropdown ? (
                                            // 1. DROPDOWN (Smart Mode - detected OR manually selected provider)
                                            <div className="relative">
                                                <select
                                                    required
                                                    value={formData.model}
                                                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                                                    className="w-full appearance-none px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
                                                >
                                                    <option value="" disabled>Select a model...</option>
                                                    {activeProviderPreset?.models?.map(model => (
                                                        <option key={model.id} value={model.id}>
                                                            {model.name}
                                                        </option>
                                                    ))}
                                                </select>
                                                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                                    <svg className="w-3 h-3 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                    </svg>
                                                </div>
                                            </div>
                                        ) : (
                                            // 2. TEXT INPUT (Custom/Manual Mode)
                                            <input
                                                type="text"
                                                required
                                                value={formData.model}
                                                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                                                placeholder={isCustomMode ? "e.g., my-custom-model" : "Auto-filled when API detected"}
                                                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-white text-xs placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                                            />
                                        )}
                                    </div>

                                    {/* Custom Provider Toggle & Advanced Settings */}
                                    <div className="pt-2">
                                        <button
                                            type="button"
                                            onClick={() => setIsCustomMode(!isCustomMode)}
                                            className="group flex items-center gap-2 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                                        >
                                            <Settings2 size={14} className="group-hover:rotate-45 transition-transform duration-300" />
                                            <span className="font-medium">Manual Configuration</span>
                                            <ChevronDown size={14} className={`transition-transform duration-200 ${isCustomMode ? 'rotate-180' : ''}`} />
                                        </button>

                                        {isCustomMode && (
                                            <div className="mt-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                                                {/* Provider Selection Dropdown */}
                                                <div>
                                                    <label className="block text-xs font-medium text-zinc-400 mb-1">
                                                        Provider <span className="text-zinc-500">(Required for auto-settings)</span>
                                                    </label>
                                                    <div className="relative">
                                                        <select
                                                            value={formData.provider}
                                                            onChange={(e) => {
                                                                const newProviderId = e.target.value
                                                                const preset = providerPresets.find(p => p.id === newProviderId)
                                                                setFormData({
                                                                    ...formData,
                                                                    provider: newProviderId,
                                                                    base_url: preset?.baseUrl || '',
                                                                    model: preset?.defaultModel || ''
                                                                })
                                                            }}
                                                            className="w-full appearance-none px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                        >
                                                            <option value="">Select a provider...</option>
                                                            {providerPresets.map(p => (
                                                                <option key={p.id} value={p.id}>{p.name}</option>
                                                            ))}
                                                        </select>
                                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                                            <svg className="w-3 h-3 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                            </svg>
                                                        </div>
                                                    </div>
                                                    {isKeyInvalidComponents()}
                                                </div>

                                                <div>
                                                    <label className="block text-xs font-medium text-zinc-400 mb-1">
                                                        Base URL <span className="text-red-400">*</span>
                                                    </label>
                                                    <input
                                                        type="text"
                                                        required={isCustomMode}
                                                        value={formData.base_url}
                                                        onChange={(e) => setFormData({ ...formData, base_url: e.target.value })}
                                                        placeholder="e.g., https://api.openai.com/v1"
                                                        className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                    />
                                                    <p className="mt-1 text-[10px] text-zinc-500">
                                                        Endpoint URL for the selected provider
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </section>

                            {/* System Prompt with Full Page Modal */}
                            <section className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-sm font-semibold text-white">System Prompt</h3>
                                    <button
                                        type="button"
                                        onClick={() => setShowPromptModal(true)}
                                        className="flex items-center gap-1.5 px-2 py-1 hover:bg-zinc-800 rounded text-[10px] font-medium text-blue-400 hover:text-blue-300 transition-colors group"
                                    >
                                        <Maximize2 size={10} className="transition-transform duration-300 group-hover:scale-110 group-hover:rotate-45" />
                                        Expand
                                    </button>
                                </div>
                                <div>
                                    <textarea
                                        value={formData.system_prompt}
                                        onChange={(e) => setFormData({ ...formData, system_prompt: e.target.value })}
                                        rows={5}
                                        placeholder="You are a helpful assistant..."
                                        className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-white text-xs placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all resize-y font-mono"
                                    />
                                    <p className="mt-1.5 text-[10px] text-zinc-500">
                                        Define how the AI should behave, speak, and what knowledge it has.
                                    </p>
                                </div>
                            </section>

                            {/* Behavior Settings */}
                            <section className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
                                <h3 className="text-lg font-semibold text-white mb-4">Behavior Settings</h3>
                                <div className="space-y-4">
                                    <label className="flex items-center gap-3 cursor-pointer group">
                                        <input
                                            type="checkbox"
                                            checked={formData.conversation_model}
                                            onChange={(e) => setFormData({ ...formData, conversation_model: e.target.checked })}
                                            className="w-5 h-5 bg-zinc-800 border-zinc-700 rounded text-blue-500 focus:ring-blue-500/20"
                                        />
                                        <div>
                                            <span className="text-sm font-medium text-white">Conversation Mode</span>
                                            <p className="text-xs text-zinc-500">AI responds to all messages in the target</p>
                                        </div>
                                    </label>
                                    <label className="flex items-center gap-3 cursor-pointer group">
                                        <input
                                            type="checkbox"
                                            checked={formData.silent_collection}
                                            onChange={(e) => setFormData({ ...formData, silent_collection: e.target.checked })}
                                            className="w-5 h-5 bg-zinc-800 border-zinc-700 rounded text-blue-500 focus:ring-blue-500/20"
                                        />
                                        <div>
                                            <span className="text-sm font-medium text-white">Silent Collection</span>
                                            <p className="text-xs text-zinc-500">Collect data without responding</p>
                                        </div>
                                    </label>
                                    <label className="flex items-center gap-3 cursor-pointer group">
                                        <input
                                            type="checkbox"
                                            checked={formData.hybrid_mode}
                                            onChange={(e) => setFormData({ ...formData, hybrid_mode: e.target.checked })}
                                            className="w-5 h-5 bg-zinc-800 border-zinc-700 rounded text-blue-500 focus:ring-blue-500/20"
                                        />
                                        <div>
                                            <span className="text-sm font-medium text-white">Hybrid Mode</span>
                                            <p className="text-xs text-zinc-500">Only respond when mentioned (@bot)</p>
                                        </div>
                                    </label>
                                </div>
                            </section>

                        </form>
                    </div>
                </div>

                {/* Mobile Save Button */}
                <div className="lg:hidden fixed bottom-0 left-0 right-0 p-4 bg-black/90 backdrop-blur-sm border-t border-zinc-800">
                    <button
                        type="submit"
                        form="ai-config-form"
                        disabled={isSubmitting}
                        className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold rounded-lg transition-all"
                    >
                        <Save size={16} />
                        {isSubmitting ? 'Saving...' : (configId ? 'Update' : 'Save')}
                    </button>
                </div>
            </div>

            {/* Full Page System Prompt Modal */}
            {
                showPromptModal && (
                    <div className="fixed inset-0 z-[200] bg-black flex flex-col">
                        {/* Modal Header */}
                        <div className="shrink-0 bg-black border-b border-zinc-800 px-6 py-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <button
                                        type="button"
                                        onClick={() => setShowPromptModal(false)}
                                        className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                                    >
                                        <ChevronLeft size={20} />
                                    </button>
                                    <div>
                                        <h2 className="text-lg font-semibold text-white">System Prompt Editor</h2>
                                        <p className="text-sm text-zinc-500">{formData.system_prompt.length} characters</p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setShowPromptModal(false)}
                                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors"
                                >
                                    Done
                                </button>
                            </div>
                        </div>

                        {/* Modal Content */}
                        <div className="flex-1 p-6 overflow-hidden">
                            <textarea
                                ref={promptTextareaRef}
                                value={formData.system_prompt}
                                onChange={(e) => setFormData({ ...formData, system_prompt: e.target.value })}
                                placeholder="Write your system prompt here...

Example:
You are a helpful customer support assistant for [Company Name]. Your role is to:
- Answer customer questions politely and professionally
- Provide accurate information about products and services
- Escalate complex issues to human agents when needed

Always maintain a friendly and helpful tone. If you don't know the answer, admit it and offer to connect the customer with a human agent."
                                className="w-full h-full px-4 py-4 bg-zinc-900 border border-zinc-800 rounded-xl text-white text-sm placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all resize-none font-mono leading-relaxed"
                                autoFocus
                            />
                        </div>
                    </div>
                )
            }
        </div >
    )
}
