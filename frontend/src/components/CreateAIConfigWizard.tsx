'use client'

import { useState, useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import { ChevronLeft, Save, Plus, Eye, EyeOff, X, Maximize2, Users, User, ChevronDown, Search, RefreshCw, AlertTriangle, Settings2, FileSpreadsheet, Trash2, Brain, Copy, Smile, BookOpen, Check, Cpu, Sparkles, Zap } from 'lucide-react'
import { EMOJI_CATEGORIES } from '@/lib/emojiList'

// Quick emoji list for category picker (subset of common emojis)
const QUICK_EMOJIS = ['✅', '❌', '⏳', '🔥', '💰', '👍', '👎', '⭐', '❤️', '💬', '📌', '🎉', '⚠️', '🚀', '💡', '📋']

// Types for Data Collection (Sheet Updater)
type DataCollectionMode = 'update' | 'create' | 'smart'

interface ColumnSchema {
    name: string
    source: 'sender_name' | 'sender_phone' | 'timestamp' | 'ai_extract' | 'ai_classify' | 'static'
    ai_prompt?: string
    static_value?: string
    required?: boolean
}

interface ValueMapping {
    keywords: string[]
    value: string
    emoji?: string
}

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
    const [targetType, setTargetType] = useState<'group' | 'contact' | 'both'>('contact')
    const [manualContactInput, setManualContactInput] = useState('')

    // New UI State
    const [isGroupDropdownOpen, setIsGroupDropdownOpen] = useState(false)
    const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false)
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

    // Data Collection (Sheet Updater) states
    const [enableDataCollection, setEnableDataCollection] = useState(false)
    const [dataCollectionData, setDataCollectionData] = useState({
        spreadsheet_url: '',
        sheet_name: '',
        mode: 'update' as DataCollectionMode,
        match_column: '',
        update_column: '',
        trigger_keywords: [] as string[],
        ai_instructions: '',
        value_mappings: [] as ValueMapping[],
        column_schema: [
            { name: 'Phone', source: 'sender_phone' as const, required: true },
            { name: 'Name', source: 'sender_name' as const },
            { name: 'Timestamp', source: 'timestamp' as const },
            { name: 'Message', source: 'ai_extract' as const, ai_prompt: 'Extract the main content from the message' }
        ] as ColumnSchema[]
    })
    const [sheetInfo, setSheetInfo] = useState<{ sheets: string[], headers: string[] } | null>(null)
    const [isValidatingSheet, setIsValidatingSheet] = useState(false)
    const [sheetUpdaterStatus, setSheetUpdaterStatus] = useState<{ ready: boolean, serviceAccountEmail?: string } | null>(null)
    const [linkedSheetUpdaterId, setLinkedSheetUpdaterId] = useState<string | null>(null) // Track linked sheet updater for edit mode
    const [openEmojiPickerIdx, setOpenEmojiPickerIdx] = useState<number | null>(null) // For emoji picker in response categories
    const [showFullEmojiPicker, setShowFullEmojiPicker] = useState(false) // Show full emoji categories
    const [selectedEmojiCategory, setSelectedEmojiCategory] = useState<string>('Smileys') // Selected category in full picker

    // Knowledge Base states
    const [enableKnowledgeBase, setEnableKnowledgeBase] = useState(false)
    const [kbMode, setKbMode] = useState<'auto' | 'always'>('auto')
    const [kbSheets, setKbSheets] = useState<Array<{ url: string, sheetName: string, label: string }>>([])
    const [kbCustomKeywords, setKbCustomKeywords] = useState<string>('')
    const [kbCacheTTL, setKbCacheTTL] = useState(90)
    const [kbMaxRows, setKbMaxRows] = useState(30)

    // Multi-select targets
    const [selectedTargets, setSelectedTargets] = useState<Array<{ jid: string, name: string, type: 'group' | 'contact' }>>([])
    const [includeAllPersonalChats, setIncludeAllPersonalChats] = useState(false) // Toggle for all personal chats
    const [includeGroups, setIncludeGroups] = useState(false) // Toggle for group selection

    // Fetch groups
    const { data: groupsData, refetch: refetchGroups } = useQuery({
        queryKey: ['groups', botId],
        queryFn: async () => {
            const res = await api.bots.getGroups(botId)
            return res.data.data || []
        },
        enabled: !!botId
    })

    // Fetch sheet updater status
    useEffect(() => {
        const fetchStatus = async () => {
            try {
                const res = await api.sheetUpdater.getStatus()
                setSheetUpdaterStatus(res.data.data)
            } catch (error) {
                console.error('Failed to fetch sheet updater status:', error)
            }
        }
        fetchStatus()
    }, [])

    // Close emoji picker when clicking outside
    useEffect(() => {
        if (openEmojiPickerIdx === null) return
        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as HTMLElement
            if (!target.closest('[data-emoji-picker]')) {
                setOpenEmojiPickerIdx(null)
                setShowFullEmojiPicker(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [openEmojiPickerIdx])

    // Fetch existing config if editing
    const { data: existingConfig } = useQuery({
        queryKey: ['llmTarget', botId, configId],
        queryFn: async () => {
            if (!configId) return null
            const res = await api.bots.llmTargets.list(botId)
            const configs = res.data.data || []
            // Use loose equality to handle string/number comparison
            return configs.find((c: any) => String(c.id) === String(configId)) || null
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

            // Load Knowledge Base config if exists
            if (llmConfig.knowledgeBase && llmConfig.knowledgeBase.sheets && llmConfig.knowledgeBase.sheets.length > 0) {
                setEnableKnowledgeBase(true)
                setKbMode(llmConfig.knowledgeBase.mode || 'auto')
                setKbSheets(llmConfig.knowledgeBase.sheets.map((s: any) => ({
                    url: s.url || '',
                    sheetName: s.sheetName || '',
                    label: s.label || ''
                })))
                setKbCustomKeywords((llmConfig.knowledgeBase.customKeywords || []).join(', '))
                setKbCacheTTL(llmConfig.knowledgeBase.cacheTTLSeconds || 90)
                setKbMaxRows(llmConfig.knowledgeBase.maxRowsPerSheet || 30)
            }

            // Load linked sheet updater config if silent_collection or hybrid_mode is enabled
            if (llmConfig.behavior?.silentCollection || llmConfig.behavior?.hybridMode) {
                const loadLinkedSheetUpdater = async () => {
                    try {
                        const res = await api.sheetUpdater.getConfigsByTarget(botId, existingConfig.target_jid)
                        const configs = res.data.data || []
                        if (configs.length > 0) {
                            const config = configs[0] // Take the first linked config
                            setLinkedSheetUpdaterId(config.id)
                            setEnableDataCollection(true)
                            setDataCollectionData({
                                spreadsheet_url: config.spreadsheet_url || '',
                                sheet_name: config.sheet_name || '',
                                mode: config.mode || 'update',
                                match_column: config.match_column || '',
                                update_column: config.update_column || '',
                                trigger_keywords: config.trigger_keywords || [],
                                ai_instructions: config.ai_instructions || '',
                                value_mappings: config.value_mappings || [],
                                column_schema: config.column_schema || []
                            })
                            // Also validate the sheet to populate sheetInfo
                            if (config.spreadsheet_url) {
                                try {
                                    const sheetRes = await api.sheetUpdater.getSheetInfo(config.spreadsheet_url, config.sheet_name)
                                    if (sheetRes.data.success) {
                                        setSheetInfo({
                                            sheets: sheetRes.data.data.sheets,
                                            headers: sheetRes.data.data.headers
                                        })
                                    }
                                } catch (sheetError) {
                                    console.error('Failed to load sheet info:', sheetError)
                                }
                            }
                        }
                    } catch (error) {
                        console.error('Failed to load linked sheet updater:', error)
                    }
                }
                loadLinkedSheetUpdater()
            }
        }
    }, [existingConfig, botId])

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
                { id: 'meta/llama-3.1-405b-instruct', name: 'Llama 3.1 405B (Very Smart)' },
                { id: 'meta/llama-3.1-70b-instruct', name: 'Llama 3.1 70B (Balanced)' },
                { id: 'meta/llama-3.1-8b-instruct', name: 'Llama 3.1 8B (Fast)' },
                { id: 'nvidia/nemotron-4-340b-instruct', name: 'Nemotron 4 340B' },
                { id: 'mistralai/mistral-large-2-instruct', name: 'Mistral Large 2' },
                { id: 'google/gemma-2-27b-it', name: 'Gemma 2 27B' },
                { id: 'microsoft/phi-3.5-moe-instruct', name: 'Phi 3.5 MoE' }
            ]

        },
        {
            id: 'openrouter',
            name: 'OpenRouter',
            prefix: 'sk-or-',
            baseUrl: 'https://openrouter.ai/api/v1',
            defaultModel: 'google/gemini-2.0-flash-exp:free',
            validateKey: (k: string) => k.startsWith('sk-or-'),
            models: [
                { id: 'openrouter/free', name: 'Auto (Best Free Model - Stable)' },
                { id: 'meta-llama/llama-3.3-70b-instruct:free', name: 'Llama 3.3 70B (Free)' },
                { id: 'deepseek/deepseek-r1:free', name: 'DeepSeek R1 (Free)' },
                { id: 'google/gemini-2.0-flash-exp:free', name: 'Gemini 2.0 Flash (Free)' },
                { id: 'qwen/qwen-3-coder-480b-a3b5:free', name: 'Qwen 3 Coder (Free)' },
                { id: 'mistralai/mixtral-8x7b-instruct:free', name: 'Mixtral 8x7B (Free)' },
                { id: 'nousresearch/nous-hermes-2-mixtral-8x7b-dpo', name: 'Hermes 2 Mixtral 8x7B (DPO)' },
                { id: 'perplexity/llama-3-sonar-large-32k-online', name: 'Perplexity Llama 3 Sonar Large (Online)' }
            ]
        },
        {
            id: 'byteplus',
            name: 'BytePlus (ARK)',
            prefix: '',
            baseUrl: 'https://ark.byteplus.com/api/v3',
            defaultModel: 'doubao-pro-4k',
            validateKey: (k: string) => k.length >= 32, // ARK keys are usually long UUIDs
            models: [
                { id: 'doubao-pro-4k', name: 'Doubao Pro 4K' },
                { id: 'doubao-lite-4k', name: 'Doubao Lite 4K' },
                { id: 'byteplus/ark-pro', name: 'ARK Pro' }
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
            detectedProvider = 'openai'
        } else if (apiKey.length >= 32 && (apiKey.includes('-') || /^[a-z0-9]+$/i.test(apiKey))) {
            // BytePlus ARK keys
            detectedProvider = 'byteplus'
        }

        // Get preset for detected provider
        const preset = providerPresets.find(p => p.id === detectedProvider)

        // Reset custom mode if we detected a known provider
        if (detectedProvider) {
            setIsCustomMode(false)
        }

        // Always update model if provider changed or if model is empty/invalid for that provider
        let newModel = formData.model
        if (preset && (detectedProvider !== formData.provider || !formData.model)) {
            newModel = preset.defaultModel
        }

        setFormData({
            ...formData,
            api_key: apiKey,
            provider: detectedProvider || (isCustomMode ? formData.provider : ''),
            model: newModel,
            base_url: preset?.baseUrl || formData.base_url
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

    // Validate spreadsheet URL
    const validateSheet = async () => {
        if (!dataCollectionData.spreadsheet_url) return
        setIsValidatingSheet(true)
        try {
            const res = await api.sheetUpdater.getSheetInfo(dataCollectionData.spreadsheet_url, dataCollectionData.sheet_name)
            setSheetInfo(res.data.data)
            if (!dataCollectionData.sheet_name && res.data.data.sheets.length > 0) {
                setDataCollectionData(prev => ({ ...prev, sheet_name: res.data.data.sheets[0] }))
            }
            toast.success('Spreadsheet validated!')
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Failed to validate spreadsheet')
            setSheetInfo(null)
        } finally {
            setIsValidatingSheet(false)
        }
    }


    // Preset mappings for data collection

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

        // Validate data collection settings if enabled
        if (enableDataCollection) {
            if (!dataCollectionData.spreadsheet_url || !dataCollectionData.sheet_name) {
                toast.error('Spreadsheet URL and Sheet Name are required for data collection')
                return
            }
            if ((dataCollectionData.mode === 'update' || dataCollectionData.mode === 'smart') &&
                (!dataCollectionData.match_column || !dataCollectionData.update_column)) {
                toast.error('Match Column and Update Column are required for Update mode')
                return
            }
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
                },
                // Knowledge Base config
                ...(enableKnowledgeBase && kbSheets.length > 0 && kbSheets.some(s => s.url) ? {
                    knowledgeBase: {
                        sheets: kbSheets.filter(s => s.url).map(s => ({
                            url: s.url,
                            sheetName: s.sheetName || undefined,
                            label: s.label || undefined
                        })),
                        mode: kbMode,
                        customKeywords: kbCustomKeywords
                            ? kbCustomKeywords.split(',').map(k => k.trim()).filter(Boolean)
                            : undefined,
                        cacheTTLSeconds: kbCacheTTL,
                        maxRowsPerSheet: kbMaxRows
                    }
                } : {})
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

                // Handle sheet updater for edit mode
                if (enableDataCollection && (formData.silent_collection || formData.hybrid_mode)) {
                    const sheetUpdaterPayload = {
                        bot_id: botId,
                        name: `${formData.config_name} - Data Collection`,
                        spreadsheet_url: dataCollectionData.spreadsheet_url,
                        sheet_name: dataCollectionData.sheet_name,
                        match_column: dataCollectionData.match_column,
                        update_column: dataCollectionData.update_column,
                        ai_instructions: dataCollectionData.ai_instructions || formData.system_prompt,
                        value_mappings: dataCollectionData.value_mappings,
                        is_enabled: true,
                        target_jids: [formData.target_jid],
                        mode: dataCollectionData.mode,
                        column_schema: dataCollectionData.column_schema,
                        trigger_keywords: dataCollectionData.trigger_keywords
                    }

                    try {
                        if (linkedSheetUpdaterId) {
                            // Update existing sheet updater
                            await api.sheetUpdater.updateConfig(linkedSheetUpdaterId, sheetUpdaterPayload)
                        } else {
                            // Create new sheet updater
                            const createRes = await api.sheetUpdater.createConfig(sheetUpdaterPayload)
                            if (createRes.data.data?.id) {
                                setLinkedSheetUpdaterId(createRes.data.data.id)
                            }
                        }
                    } catch (sheetError: any) {
                        console.error('Failed to save sheet updater config:', sheetError)
                        toast.warning(`AI config updated, but data collection setup failed: ${sheetError.response?.data?.error || sheetError.message}`)
                    }
                } else if (!enableDataCollection && linkedSheetUpdaterId) {
                    // Data collection was disabled, delete the linked sheet updater
                    try {
                        await api.sheetUpdater.deleteConfig(linkedSheetUpdaterId)
                        setLinkedSheetUpdaterId(null)
                    } catch (deleteError) {
                        console.error('Failed to delete sheet updater config:', deleteError)
                    }
                }

                toast.success('Configuration updated successfully!')
            } else {
                // CREATE mode (Iterate all selected targets)
                const createdTargetJids: string[] = []

                for (const target of selectedTargets) {
                    await api.bots.llmTargets.add(botId, {
                        config_name: selectedTargets.length > 1 ? `${formData.config_name} - ${target.name}` : formData.config_name,
                        target_type: target.type,
                        target_jid: target.jid,
                        target_name: target.name,
                        is_enabled: 1,
                        llm_config: llm_config
                    })
                    createdTargetJids.push(target.jid)
                }

                // Create sheet updater config if data collection is enabled
                if (enableDataCollection && createdTargetJids.length > 0) {
                    try {
                        await api.sheetUpdater.createConfig({
                            bot_id: botId,
                            name: `${formData.config_name} - Data Collection`,
                            spreadsheet_url: dataCollectionData.spreadsheet_url,
                            sheet_name: dataCollectionData.sheet_name,
                            match_column: dataCollectionData.match_column,
                            update_column: dataCollectionData.update_column,
                            ai_instructions: dataCollectionData.ai_instructions || formData.system_prompt,
                            value_mappings: dataCollectionData.value_mappings,
                            is_enabled: true,
                            target_jids: createdTargetJids,
                            mode: dataCollectionData.mode,
                            column_schema: dataCollectionData.column_schema,
                            trigger_keywords: dataCollectionData.trigger_keywords
                        })
                        toast.success(`Created ${selectedTargets.length} AI config(s) with data collection!`)
                    } catch (sheetError: any) {
                        console.error('Failed to create sheet updater config:', sheetError)
                        toast.warning(`AI config created, but data collection setup failed: ${sheetError.response?.data?.error || sheetError.message}`)
                    }
                } else {
                    toast.success(`Created ${selectedTargets.length} configuration(s) successfully!`)
                }
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
                                        {/* Target Type Toggle */}
                                        <div className="flex bg-zinc-800/50 p-1 rounded-lg border border-zinc-700 w-fit mb-4">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setTargetType('group')
                                                    setSelectedTargets([])
                                                }}
                                                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all ${targetType === 'group'
                                                    ? 'bg-blue-600 text-white shadow-sm'
                                                    : 'text-zinc-400 hover:text-zinc-200'
                                                    }`}
                                            >
                                                <Users size={14} /> Groups
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setTargetType('contact')
                                                    setSelectedTargets([])
                                                }}
                                                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all ${targetType === 'contact'
                                                    ? 'bg-blue-600 text-white shadow-sm'
                                                    : 'text-zinc-400 hover:text-zinc-200'
                                                    }`}
                                            >
                                                <User size={14} /> Personal Chat
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setTargetType('both')
                                                    setSelectedTargets([])
                                                }}
                                                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all ${targetType === 'both'
                                                    ? 'bg-blue-600 text-white shadow-sm'
                                                    : 'text-zinc-400 hover:text-zinc-200'
                                                    }`}
                                            >
                                                <Users size={14} /> Both
                                            </button>
                                        </div>

                                        {/* Group Selector - for 'group' or 'both' */}
                                        {(targetType === 'group' || targetType === 'both') && (
                                            <>
                                                <div className="flex justify-between items-center mb-2">
                                                    <label className="text-xs font-medium text-zinc-400">
                                                        Select Groups <span className="text-red-400">*</span>
                                                    </label>
                                                    <button
                                                        type="button"
                                                        onClick={handleSyncGroups}
                                                        disabled={isSyncingGroups}
                                                        className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1 disabled:opacity-50"
                                                    >
                                                        <RefreshCw size={10} className={isSyncingGroups ? "animate-spin" : ""} />
                                                        Sync Groups
                                                    </button>
                                                </div>

                                                {/* Selected Chips */}
                                                {selectedTargets.length > 0 && (
                                                    <div className="flex flex-wrap gap-2 mb-2">
                                                        {selectedTargets.map(target => (
                                                            <div key={target.jid} className="flex items-center gap-2 px-2 py-1 bg-blue-500/10 border border-blue-500/20 rounded text-blue-200 text-xs">
                                                                <span className="max-w-[150px] truncate">{target.name}</span>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => removeTarget(target.jid)}
                                                                    className="hover:text-white"
                                                                >
                                                                    <X size={12} />
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                                {/* Group Dropdown */}
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
                                                                                className={`w-full flex items-center gap-3 p-2 rounded text-left transition-colors ${isSelected ? 'bg-blue-500/10' : 'hover:bg-zinc-700'}`}
                                                                            >
                                                                                <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center flex-shrink-0">
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
                                                                                {isSelected && (
                                                                                    <svg className="w-4 h-4 text-blue-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                                                    </svg>
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

                                        {/* Personal Chat - All personal chats */}
                                        {(targetType === 'contact' || targetType === 'both') && (
                                            <div className={`p-4 bg-zinc-800/50 border border-zinc-700 rounded-lg ${targetType === 'both' ? 'mt-4' : ''}`}>
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                                                        <User size={18} className="text-blue-400" />
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-medium text-white">All Personal Chats</div>
                                                        <div className="text-xs text-zinc-500">AI will respond to all incoming personal messages</div>
                                                    </div>
                                                </div>
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
                                            // 1. PREMIUM CUSTOM DROPDOWN (Matched Size)
                                            <div className="relative">
                                                <div
                                                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-white text-xs flex justify-between items-center cursor-pointer hover:border-zinc-600 transition-all duration-200"
                                                    onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
                                                >
                                                    <span className={formData.model ? "text-white" : "text-zinc-500"}>
                                                        {activeProviderPreset?.models?.find(m => m.id === formData.model)?.name || "Select a model..."}
                                                    </span>
                                                    <ChevronDown size={14} className={`text-zinc-500 transition-transform duration-300 ${isModelDropdownOpen ? 'rotate-180' : ''}`} />
                                                </div>

                                                {isModelDropdownOpen && (
                                                    <>
                                                        <div className="fixed inset-0 z-40" onClick={() => setIsModelDropdownOpen(false)} />
                                                        <div className="absolute top-full left-0 right-0 mt-1 bg-zinc-800 border border-zinc-700 rounded shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                                            <div className="p-1 max-h-[300px] overflow-y-auto custom-scrollbar">
                                                                {activeProviderPreset?.models?.map(model => {
                                                                    const isSelected = formData.model === model.id
                                                                    return (
                                                                        <button
                                                                            key={model.id}
                                                                            type="button"
                                                                            onClick={() => {
                                                                                setFormData({ ...formData, model: model.id })
                                                                                setIsModelDropdownOpen(false)
                                                                            }}
                                                                            className={`w-full flex items-center justify-between px-3 py-2 rounded text-left transition-all ${isSelected ? 'bg-blue-600/10' : 'hover:bg-zinc-700'}`}
                                                                        >
                                                                            <div className="flex flex-col">
                                                                                <span className={`text-xs font-medium ${isSelected ? 'text-white' : 'text-zinc-300'}`}>
                                                                                    {model.name}
                                                                                </span>
                                                                            </div>
                                                                            {isSelected && (
                                                                                <Check size={14} className="text-blue-500" />
                                                                            )}
                                                                        </button>
                                                                    )
                                                                })}
                                                            </div>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        ) : (

                                            // 2. TEXT INPUT (Custom/Manual Mode or Display Only)
                                            <input
                                                type="text"
                                                required
                                                value={formData.model}
                                                onChange={(e) => isCustomMode && setFormData({ ...formData, model: e.target.value })}
                                                readOnly={!isCustomMode}
                                                placeholder={isCustomMode ? "e.g., my-custom-model" : "Auto-filled when API detected"}
                                                className={`w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-white text-xs placeholder-zinc-500 transition-all ${isCustomMode
                                                    ? 'focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-text'
                                                    : 'cursor-not-allowed opacity-70'
                                                    }`}
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
                                <div className="mb-4">
                                    <h3 className="text-sm font-semibold text-white">Behavior Mode</h3>
                                    <p className="text-xs text-zinc-500 mt-0.5">Choose how the AI interacts with messages</p>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    {/* Conversation Mode */}
                                    <button
                                        type="button"
                                        onClick={() => setFormData({
                                            ...formData,
                                            conversation_model: true,
                                            silent_collection: false,
                                            hybrid_mode: false
                                        })}
                                        className={`relative p-4 rounded-xl border-2 text-left transition-all ${formData.conversation_model && !formData.silent_collection && !formData.hybrid_mode
                                            ? 'border-blue-500 bg-blue-500/10'
                                            : 'border-zinc-700 bg-zinc-800/50 hover:border-zinc-600'
                                            }`}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${formData.conversation_model && !formData.silent_collection && !formData.hybrid_mode
                                                ? 'border-blue-500 bg-blue-500'
                                                : 'border-zinc-600'
                                                }`}>
                                                {formData.conversation_model && !formData.silent_collection && !formData.hybrid_mode && (
                                                    <div className="w-2 h-2 rounded-full bg-white" />
                                                )}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-medium text-white">💬 Conversation</span>
                                                </div>
                                                <p className="text-xs text-zinc-500 mt-1">AI responds to all messages</p>
                                            </div>
                                        </div>
                                    </button>

                                    {/* Silent Collection Mode */}
                                    <button
                                        type="button"
                                        onClick={() => setFormData({
                                            ...formData,
                                            conversation_model: false,
                                            silent_collection: true,
                                            hybrid_mode: false
                                        })}
                                        className={`relative p-4 rounded-xl border-2 text-left transition-all ${formData.silent_collection
                                            ? 'border-blue-500 bg-blue-500/10'
                                            : 'border-zinc-700 bg-zinc-800/50 hover:border-zinc-600'
                                            }`}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${formData.silent_collection
                                                ? 'border-blue-500 bg-blue-500'
                                                : 'border-zinc-600'
                                                }`}>
                                                {formData.silent_collection && (
                                                    <div className="w-2 h-2 rounded-full bg-white" />
                                                )}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-medium text-white">📊 Silent Collection</span>
                                                </div>
                                                <p className="text-xs text-zinc-500 mt-1">Collect data without responding</p>
                                            </div>
                                        </div>
                                    </button>

                                    {/* Hybrid Mode */}
                                    <button
                                        type="button"
                                        onClick={() => setFormData({
                                            ...formData,
                                            conversation_model: false,
                                            silent_collection: false,
                                            hybrid_mode: true
                                        })}
                                        className={`relative p-4 rounded-xl border-2 text-left transition-all ${formData.hybrid_mode
                                            ? 'border-purple-500 bg-purple-500/10'
                                            : 'border-zinc-700 bg-zinc-800/50 hover:border-zinc-600'
                                            }`}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${formData.hybrid_mode
                                                ? 'border-purple-500 bg-purple-500'
                                                : 'border-zinc-600'
                                                }`}>
                                                {formData.hybrid_mode && (
                                                    <div className="w-2 h-2 rounded-full bg-white" />
                                                )}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-medium text-white">🔀 Hybrid Mode</span>
                                                </div>
                                                <p className="text-xs text-zinc-500 mt-1">Respond when mentioned (@bot)</p>
                                            </div>
                                        </div>
                                    </button>
                                </div>
                            </section>

                            {/* Knowledge Base Settings - Show for all AI modes */}
                            {(formData.conversation_model || formData.silent_collection || formData.hybrid_mode) && (
                                <section className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 animate-in fade-in slide-in-from-top-2 duration-300">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-emerald-500/10 rounded-lg">
                                                <BookOpen className="w-5 h-5 text-emerald-500" />
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-semibold text-white">Knowledge Base</h3>
                                                <p className="text-xs text-zinc-500">Hubungkan Google Sheets sebagai sumber data AI</p>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setEnableKnowledgeBase(!enableKnowledgeBase)}
                                            className={`relative w-10 h-5 rounded-full transition-colors ${enableKnowledgeBase ? 'bg-emerald-500' : 'bg-zinc-700'}`}
                                        >
                                            <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${enableKnowledgeBase ? 'translate-x-5' : 'translate-x-0.5'}`} />
                                        </button>
                                    </div>

                                    {!enableKnowledgeBase ? (
                                        <p className="text-xs text-zinc-500">
                                            Aktifkan untuk menghubungkan Google Sheets sebagai referensi data AI. AI akan menggunakan data ini untuk menjawab pertanyaan tentang jadwal, tugas, harga, menu, dll.
                                        </p>
                                    ) : (
                                        <div className="space-y-4">
                                            {/* Injection Mode */}
                                            <div>
                                                <label className="block text-xs font-medium text-zinc-400 mb-2">Mode Injeksi Konteks</label>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => setKbMode('auto')}
                                                        className={`p-3 rounded-lg border text-left text-sm transition-all ${kbMode === 'auto'
                                                            ? 'border-emerald-500 bg-emerald-500/10 text-white'
                                                            : 'border-zinc-700 bg-zinc-800/50 text-zinc-400 hover:border-zinc-600'
                                                            }`}
                                                    >
                                                        <span className="font-medium">Auto</span>
                                                        <p className="text-[10px] text-zinc-500 mt-1">Inject data hanya saat pertanyaan relevan (hemat token)</p>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setKbMode('always')}
                                                        className={`p-3 rounded-lg border text-left text-sm transition-all ${kbMode === 'always'
                                                            ? 'border-emerald-500 bg-emerald-500/10 text-white'
                                                            : 'border-zinc-700 bg-zinc-800/50 text-zinc-400 hover:border-zinc-600'
                                                            }`}
                                                    >
                                                        <span className="font-medium">Always</span>
                                                        <p className="text-[10px] text-zinc-500 mt-1">Selalu inject data ke setiap pesan (paling akurat)</p>
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Google Sheets Sources */}
                                            <div>
                                                <label className="block text-xs font-medium text-zinc-400 mb-2">Sumber Data Google Sheets</label>
                                                {kbSheets.map((sheet, idx) => (
                                                    <div key={idx} className="mb-3 p-3 bg-zinc-800/50 rounded-lg border border-zinc-700 space-y-2">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs text-zinc-500 shrink-0">#{idx + 1}</span>
                                                            <input
                                                                type="text"
                                                                value={sheet.url}
                                                                onChange={(e) => {
                                                                    const updated = [...kbSheets]
                                                                    updated[idx].url = e.target.value
                                                                    setKbSheets(updated)
                                                                }}
                                                                placeholder="https://docs.google.com/spreadsheets/d/..."
                                                                className="flex-1 px-3 py-1.5 bg-zinc-900 border border-zinc-700 rounded-lg text-white text-xs placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={() => setKbSheets(kbSheets.filter((_, i) => i !== idx))}
                                                                className="p-1 text-zinc-500 hover:text-red-400 transition-colors"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-2">
                                                            <input
                                                                type="text"
                                                                value={sheet.sheetName}
                                                                onChange={(e) => {
                                                                    const updated = [...kbSheets]
                                                                    updated[idx].sheetName = e.target.value
                                                                    setKbSheets(updated)
                                                                }}
                                                                placeholder="Kosongkan = baca semua tab"
                                                                className="px-3 py-1.5 bg-zinc-900 border border-zinc-700 rounded-lg text-white text-xs placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                                                            />
                                                            <input
                                                                type="text"
                                                                value={sheet.label}
                                                                onChange={(e) => {
                                                                    const updated = [...kbSheets]
                                                                    updated[idx].label = e.target.value
                                                                    setKbSheets(updated)
                                                                }}
                                                                placeholder="Label (opsional, misal: Jadwal Kuliah)"
                                                                className="px-3 py-1.5 bg-zinc-900 border border-zinc-700 rounded-lg text-white text-xs placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                                                            />
                                                        </div>
                                                    </div>
                                                ))}
                                                <button
                                                    type="button"
                                                    onClick={() => setKbSheets([...kbSheets, { url: '', sheetName: '', label: '' }])}
                                                    className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
                                                >
                                                    <Plus className="w-3.5 h-3.5" />
                                                    Tambah Sheet
                                                </button>
                                            </div>

                                            {/* Custom Keywords (only for auto mode) */}
                                            {kbMode === 'auto' && (
                                                <div>
                                                    <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                                                        Keyword Tambahan <span className="text-zinc-600">(opsional, pisahkan dengan koma)</span>
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={kbCustomKeywords}
                                                        onChange={(e) => setKbCustomKeywords(e.target.value)}
                                                        placeholder="misal: cek harga, list menu, info produk"
                                                        className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white text-xs placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                                                    />
                                                    <p className="text-[10px] text-zinc-600 mt-1">Keyword bawaan sudah termasuk: jadwal, tugas, deadline, harga, menu, dll. Tambahkan keyword khusus bisnis Anda di sini.</p>
                                                </div>
                                            )}

                                            {/* Advanced Settings */}
                                            <details className="group">
                                                <summary className="text-xs text-zinc-500 hover:text-zinc-400 cursor-pointer transition-colors">
                                                    Pengaturan Lanjutan
                                                </summary>
                                                <div className="mt-3 grid grid-cols-2 gap-3">
                                                    <div>
                                                        <label className="block text-[10px] font-medium text-zinc-500 mb-1">Cache TTL (detik)</label>
                                                        <input
                                                            type="number"
                                                            value={kbCacheTTL}
                                                            onChange={(e) => setKbCacheTTL(parseInt(e.target.value) || 90)}
                                                            min={10}
                                                            max={600}
                                                            className="w-full px-3 py-1.5 bg-zinc-900 border border-zinc-700 rounded-lg text-white text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                                                        />
                                                        <p className="text-[10px] text-zinc-600 mt-0.5">Berapa lama cache data sheet (default 90 detik)</p>
                                                    </div>
                                                    <div>
                                                        <label className="block text-[10px] font-medium text-zinc-500 mb-1">Max Baris per Sheet</label>
                                                        <input
                                                            type="number"
                                                            value={kbMaxRows}
                                                            onChange={(e) => setKbMaxRows(parseInt(e.target.value) || 30)}
                                                            min={5}
                                                            max={100}
                                                            className="w-full px-3 py-1.5 bg-zinc-900 border border-zinc-700 rounded-lg text-white text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                                                        />
                                                        <p className="text-[10px] text-zinc-600 mt-0.5">Limit baris yang dikirim ke AI (default 30)</p>
                                                    </div>
                                                </div>
                                            </details>
                                        </div>
                                    )}
                                </section>
                            )}

                            {/* Data Collection Settings - Show for all AI modes (Conversation, Silent, Hybrid) */}
                            {(formData.conversation_model || formData.silent_collection || formData.hybrid_mode) && (
                                <section className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 animate-in fade-in slide-in-from-top-2 duration-300">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-blue-500/10 rounded-lg">
                                                <FileSpreadsheet className="w-5 h-5 text-blue-500" />
                                            </div>
                                            <h3 className="text-lg font-semibold text-white">Data Collection</h3>
                                            {linkedSheetUpdaterId && (
                                                <span className="px-2 py-0.5 bg-blue-500/10 border border-blue-500/20 rounded text-[10px] text-blue-400">
                                                    Linked
                                                </span>
                                            )}
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setEnableDataCollection(!enableDataCollection)}
                                            className={`relative w-10 h-5 rounded-full transition-colors ${enableDataCollection ? 'bg-blue-500' : 'bg-zinc-700'}`}
                                        >
                                            <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${enableDataCollection ? 'translate-x-5' : 'translate-x-0.5'}`} />
                                        </button>
                                    </div>

                                    {!enableDataCollection ? (
                                        <p className="text-xs text-zinc-500">
                                            Enable to auto-save message data to Google Sheets.
                                        </p>
                                    ) : !sheetUpdaterStatus?.ready ? (
                                        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-center gap-3">
                                            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                                            <p className="text-xs text-amber-300/70">
                                                Google Service Account not configured. Set up GOOGLE_SERVICE_ACCOUNT_KEY in .env
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            {/* Spreadsheet URL */}
                                            <div>
                                                <label className="block text-xs font-medium text-zinc-400 mb-1">
                                                    Spreadsheet URL <span className="text-red-400">*</span>
                                                </label>
                                                <div className="flex gap-2">
                                                    <div className="relative flex-1">
                                                        <input
                                                            type="text"
                                                            value={dataCollectionData.spreadsheet_url}
                                                            onChange={(e) => {
                                                                setDataCollectionData({ ...dataCollectionData, spreadsheet_url: e.target.value })
                                                                setSheetInfo(null)
                                                            }}
                                                            placeholder="https://docs.google.com/spreadsheets/d/..."
                                                            className={`w-full px-3 py-2 bg-zinc-800 border rounded text-white text-xs placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-blue-500 ${sheetInfo ? 'border-blue-500/50 pr-8' : 'border-zinc-700'
                                                                }`}
                                                        />
                                                        {sheetInfo && (
                                                            <div className="absolute right-2 top-1/2 -translate-y-1/2">
                                                                <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                                </svg>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={validateSheet}
                                                        disabled={isValidatingSheet || !dataCollectionData.spreadsheet_url}
                                                        className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded transition-colors disabled:opacity-50 flex items-center gap-1.5"
                                                    >
                                                        {isValidatingSheet && <RefreshCw className="w-3 h-3 animate-spin" />}
                                                        {sheetInfo ? 'Refresh' : 'Connect'}
                                                    </button>
                                                </div>
                                                {/* Inline Service Account Info */}
                                                {sheetUpdaterStatus.serviceAccountEmail && (
                                                    <div className="flex items-center gap-1.5 mt-1.5 text-[10px] text-zinc-500">
                                                        <span>Share with:</span>
                                                        <code className="text-blue-400 bg-zinc-800 px-1.5 py-0.5 rounded font-mono truncate max-w-[280px]">
                                                            {sheetUpdaterStatus.serviceAccountEmail}
                                                        </code>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                navigator.clipboard.writeText(sheetUpdaterStatus.serviceAccountEmail!)
                                                                toast.success('Copied!')
                                                            }}
                                                            className="p-0.5 hover:bg-zinc-700 rounded transition-colors"
                                                        >
                                                            <Copy className="w-3 h-3 text-zinc-400" />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Sheet Name & Mode - Show after validation */}
                                            {sheetInfo && (
                                                <>
                                                    {/* Sheet Name & Mode in one row */}
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div>
                                                            <label className="block text-xs font-medium text-zinc-400 mb-1">
                                                                Sheet <span className="text-red-400">*</span>
                                                            </label>
                                                            <select
                                                                value={dataCollectionData.sheet_name}
                                                                onChange={(e) => setDataCollectionData({ ...dataCollectionData, sheet_name: e.target.value })}
                                                                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                            >
                                                                {sheetInfo.sheets.map(sheet => (
                                                                    <option key={sheet} value={sheet}>{sheet}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs font-medium text-zinc-400 mb-1">
                                                                Mode <span className="text-red-400">*</span>
                                                            </label>
                                                            <div className="flex gap-2">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setDataCollectionData({ ...dataCollectionData, mode: 'update' })}
                                                                    className={`flex-1 px-3 py-2 rounded text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${dataCollectionData.mode === 'update'
                                                                        ? 'bg-blue-600 text-white'
                                                                        : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                                                                        }`}
                                                                >
                                                                    📋 Update
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setDataCollectionData({
                                                                        ...dataCollectionData,
                                                                        mode: 'create',
                                                                        column_schema: dataCollectionData.column_schema.length === 0 ? [
                                                                            { name: 'Phone', source: 'sender_phone' as const, required: true },
                                                                            { name: 'Name', source: 'sender_name' as const },
                                                                            { name: 'Timestamp', source: 'timestamp' as const },
                                                                            { name: 'Message', source: 'ai_extract' as const, ai_prompt: 'Extract the main content' }
                                                                        ] : dataCollectionData.column_schema
                                                                    })}
                                                                    className={`flex-1 px-3 py-2 rounded text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${dataCollectionData.mode === 'create'
                                                                        ? 'bg-blue-600 text-white'
                                                                        : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                                                                        }`}
                                                                >
                                                                    📝 Log
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Update Mode Config */}
                                                    {dataCollectionData.mode === 'update' && (
                                                        <div className="space-y-4 pt-2">
                                                            {/* Column Mapping */}
                                                            <div className="grid grid-cols-2 gap-4">
                                                                <div>
                                                                    <label className="block text-xs font-medium text-zinc-400 mb-1">
                                                                        Find by Column <span className="text-red-400">*</span>
                                                                    </label>
                                                                    <select
                                                                        value={dataCollectionData.match_column}
                                                                        onChange={(e) => setDataCollectionData({ ...dataCollectionData, match_column: e.target.value })}
                                                                        className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                                    >
                                                                        <option value="">Select column...</option>
                                                                        {sheetInfo.headers.map(header => (
                                                                            <option key={header} value={header}>{header}</option>
                                                                        ))}
                                                                    </select>
                                                                </div>
                                                                <div>
                                                                    <label className="block text-xs font-medium text-zinc-400 mb-1">
                                                                        Update Column <span className="text-red-400">*</span>
                                                                    </label>
                                                                    <select
                                                                        value={dataCollectionData.update_column}
                                                                        onChange={(e) => setDataCollectionData({ ...dataCollectionData, update_column: e.target.value })}
                                                                        className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                                    >
                                                                        <option value="">Select column...</option>
                                                                        {sheetInfo.headers.map(header => (
                                                                            <option key={header} value={header}>{header}</option>
                                                                        ))}
                                                                    </select>
                                                                </div>
                                                            </div>

                                                            {/* Response Categories - Editable */}
                                                            <div>
                                                                <label className="block text-xs font-medium text-zinc-400 mb-2">
                                                                    Response Categories <span className="text-red-400">*</span>
                                                                </label>
                                                                <div className="space-y-2">
                                                                    {dataCollectionData.value_mappings.map((mapping, idx) => (
                                                                        <div key={idx} className="flex items-center gap-2 p-2 bg-zinc-800 border border-zinc-700 rounded-lg">
                                                                            {/* Emoji Picker Button */}
                                                                            <div className="relative" data-emoji-picker>
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => setOpenEmojiPickerIdx(openEmojiPickerIdx === idx ? null : idx)}
                                                                                    className="w-10 h-8 bg-zinc-900 border border-zinc-600 rounded text-center text-lg hover:bg-zinc-800 hover:border-zinc-500 transition-colors flex items-center justify-center"
                                                                                >
                                                                                    {mapping.emoji || <Smile className="w-4 h-4 text-zinc-500" />}
                                                                                </button>
                                                                                {openEmojiPickerIdx === idx && (
                                                                                    <div className="absolute left-0 top-full mt-1 z-50 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl overflow-hidden">
                                                                                        {!showFullEmojiPicker ? (
                                                                                            /* Quick Emojis View */
                                                                                            <div className="p-2 w-[232px]">
                                                                                                <div className="grid grid-cols-8 gap-1 mb-2">
                                                                                                    {QUICK_EMOJIS.map(emoji => (
                                                                                                        <button
                                                                                                            key={emoji}
                                                                                                            type="button"
                                                                                                            onClick={() => {
                                                                                                                const updated = [...dataCollectionData.value_mappings]
                                                                                                                updated[idx] = { ...mapping, emoji }
                                                                                                                setDataCollectionData({ ...dataCollectionData, value_mappings: updated })
                                                                                                                setOpenEmojiPickerIdx(null)
                                                                                                            }}
                                                                                                            className="w-6 h-6 text-lg hover:bg-zinc-700 rounded flex items-center justify-center transition-colors"
                                                                                                        >
                                                                                                            {emoji}
                                                                                                        </button>
                                                                                                    ))}
                                                                                                </div>
                                                                                                <button
                                                                                                    type="button"
                                                                                                    onClick={() => setShowFullEmojiPicker(true)}
                                                                                                    className="w-full py-1.5 text-xs text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors flex items-center justify-center gap-1"
                                                                                                >
                                                                                                    <span>More emojis</span>
                                                                                                    <ChevronDown className="w-3 h-3" />
                                                                                                </button>
                                                                                            </div>
                                                                                        ) : (
                                                                                            /* Full Emoji Picker View */
                                                                                            <div className="w-[232px]">
                                                                                                {/* Category Tabs */}
                                                                                                <div className="flex gap-1 p-1.5 border-b border-zinc-700 overflow-x-auto scrollbar-hide">
                                                                                                    {Object.keys(EMOJI_CATEGORIES).map(cat => (
                                                                                                        <button
                                                                                                            key={cat}
                                                                                                            type="button"
                                                                                                            onClick={() => setSelectedEmojiCategory(cat)}
                                                                                                            className={`px-2 py-1 text-xs rounded whitespace-nowrap transition-colors ${selectedEmojiCategory === cat
                                                                                                                ? 'bg-blue-600 text-white'
                                                                                                                : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                                                                                                                }`}
                                                                                                        >
                                                                                                            {cat.split(' ')[0]}
                                                                                                        </button>
                                                                                                    ))}
                                                                                                </div>
                                                                                                {/* Emoji Grid */}
                                                                                                <div className="p-2 max-h-[200px] overflow-y-auto">
                                                                                                    <div className="grid grid-cols-8 gap-1">
                                                                                                        {EMOJI_CATEGORIES[selectedEmojiCategory as keyof typeof EMOJI_CATEGORIES].map((emoji, i) => (
                                                                                                            <button
                                                                                                                key={i}
                                                                                                                type="button"
                                                                                                                onClick={() => {
                                                                                                                    const updated = [...dataCollectionData.value_mappings]
                                                                                                                    updated[idx] = { ...mapping, emoji }
                                                                                                                    setDataCollectionData({ ...dataCollectionData, value_mappings: updated })
                                                                                                                    setOpenEmojiPickerIdx(null)
                                                                                                                    setShowFullEmojiPicker(false)
                                                                                                                }}
                                                                                                                className="w-6 h-6 text-lg hover:bg-zinc-700 rounded flex items-center justify-center transition-colors"
                                                                                                            >
                                                                                                                {emoji}
                                                                                                            </button>
                                                                                                        ))}
                                                                                                    </div>
                                                                                                </div>
                                                                                                {/* Back Button */}
                                                                                                <div className="p-1.5 border-t border-zinc-700">
                                                                                                    <button
                                                                                                        type="button"
                                                                                                        onClick={() => setShowFullEmojiPicker(false)}
                                                                                                        className="w-full py-1 text-xs text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors"
                                                                                                    >
                                                                                                        ← Back to quick emojis
                                                                                                    </button>
                                                                                                </div>
                                                                                            </div>
                                                                                        )}
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                            <input
                                                                                type="text"
                                                                                value={mapping.value}
                                                                                onChange={(e) => {
                                                                                    const updated = [...dataCollectionData.value_mappings]
                                                                                    updated[idx] = { ...mapping, value: e.target.value }
                                                                                    setDataCollectionData({ ...dataCollectionData, value_mappings: updated })
                                                                                }}
                                                                                placeholder="Value"
                                                                                className="w-24 px-2 py-1.5 bg-zinc-900 border border-zinc-600 rounded text-xs text-white placeholder-zinc-500"
                                                                            />
                                                                            <input
                                                                                type="text"
                                                                                defaultValue={mapping.keywords.join(', ')}
                                                                                onBlur={(e) => {
                                                                                    const updated = [...dataCollectionData.value_mappings]
                                                                                    updated[idx] = {
                                                                                        ...mapping,
                                                                                        keywords: e.target.value.split(',').map(k => k.trim()).filter(k => k)
                                                                                    }
                                                                                    setDataCollectionData({ ...dataCollectionData, value_mappings: updated })
                                                                                }}
                                                                                placeholder="Keywords (comma separated)"
                                                                                className="flex-1 px-2 py-1.5 bg-zinc-900 border border-zinc-600 rounded text-xs text-white placeholder-zinc-500"
                                                                            />
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => {
                                                                                    const updated = dataCollectionData.value_mappings.filter((_, i) => i !== idx)
                                                                                    setDataCollectionData({ ...dataCollectionData, value_mappings: updated })
                                                                                }}
                                                                                className="p-1.5 hover:bg-red-500/10 rounded text-zinc-500 hover:text-red-400"
                                                                            >
                                                                                <Trash2 className="w-3.5 h-3.5" />
                                                                            </button>
                                                                        </div>
                                                                    ))}
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            setDataCollectionData({
                                                                                ...dataCollectionData,
                                                                                value_mappings: [
                                                                                    ...dataCollectionData.value_mappings,
                                                                                    { emoji: '', value: '', keywords: [] }
                                                                                ]
                                                                            })
                                                                        }}
                                                                        className="w-full py-2 border border-dashed border-zinc-700 rounded-lg text-xs text-zinc-500 hover:text-zinc-400 hover:border-zinc-600 transition-colors"
                                                                    >
                                                                        + Add Category
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Step 3b: Create Mode Config */}
                                                    {dataCollectionData.mode === 'create' && (
                                                        <div className="space-y-2 pt-2">
                                                            <label className="block text-xs font-medium text-zinc-400 mb-2">
                                                                Columns <span className="text-red-400">*</span>
                                                            </label>
                                                            {dataCollectionData.column_schema.map((col, idx) => (
                                                                <div key={idx} className="flex items-center gap-2 p-2 bg-zinc-800 border border-zinc-700 rounded-lg">
                                                                    <input
                                                                        type="text"
                                                                        value={col.name}
                                                                        onChange={(e) => {
                                                                            const updated = [...dataCollectionData.column_schema]
                                                                            updated[idx] = { ...col, name: e.target.value }
                                                                            setDataCollectionData({ ...dataCollectionData, column_schema: updated })
                                                                        }}
                                                                        placeholder="Column name"
                                                                        className="w-28 px-2 py-1.5 bg-zinc-900 border border-zinc-600 rounded text-xs text-white"
                                                                    />
                                                                    <select
                                                                        value={col.source}
                                                                        onChange={(e) => {
                                                                            const updated = [...dataCollectionData.column_schema]
                                                                            updated[idx] = { ...col, source: e.target.value as ColumnSchema['source'] }
                                                                            setDataCollectionData({ ...dataCollectionData, column_schema: updated })
                                                                        }}
                                                                        className="px-2 py-1.5 bg-zinc-900 border border-zinc-600 rounded text-xs text-white min-w-[130px]"
                                                                    >
                                                                        <option value="sender_phone">📱 Phone</option>
                                                                        <option value="sender_name">👤 Name</option>
                                                                        <option value="timestamp">🕐 Time</option>
                                                                        <option value="ai_extract">🤖 AI Extract</option>
                                                                        <option value="static">📌 Fixed</option>
                                                                    </select>
                                                                    {col.source === 'ai_extract' && (
                                                                        <input
                                                                            type="text"
                                                                            value={col.ai_prompt || ''}
                                                                            onChange={(e) => {
                                                                                const updated = [...dataCollectionData.column_schema]
                                                                                updated[idx] = { ...col, ai_prompt: e.target.value }
                                                                                setDataCollectionData({ ...dataCollectionData, column_schema: updated })
                                                                            }}
                                                                            placeholder="What to extract?"
                                                                            className="flex-1 px-2 py-1.5 bg-zinc-900 border border-zinc-600 rounded text-xs text-white placeholder-zinc-500"
                                                                        />
                                                                    )}
                                                                    {col.source === 'static' && (
                                                                        <input
                                                                            type="text"
                                                                            value={col.static_value || ''}
                                                                            onChange={(e) => {
                                                                                const updated = [...dataCollectionData.column_schema]
                                                                                updated[idx] = { ...col, static_value: e.target.value }
                                                                                setDataCollectionData({ ...dataCollectionData, column_schema: updated })
                                                                            }}
                                                                            placeholder="Fixed value"
                                                                            className="flex-1 px-2 py-1.5 bg-zinc-900 border border-zinc-600 rounded text-xs text-white placeholder-zinc-500"
                                                                        />
                                                                    )}
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            const updated = dataCollectionData.column_schema.filter((_, i) => i !== idx)
                                                                            setDataCollectionData({ ...dataCollectionData, column_schema: updated })
                                                                        }}
                                                                        className="p-1.5 hover:bg-red-500/10 rounded text-zinc-500 hover:text-red-400"
                                                                    >
                                                                        <Trash2 className="w-3.5 h-3.5" />
                                                                    </button>
                                                                </div>
                                                            ))}
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    const newCol: ColumnSchema = { name: '', source: 'ai_extract', ai_prompt: '' }
                                                                    setDataCollectionData({
                                                                        ...dataCollectionData,
                                                                        column_schema: [...dataCollectionData.column_schema, newCol]
                                                                    })
                                                                }}
                                                                className="w-full py-2 border border-dashed border-zinc-700 rounded-lg text-xs text-zinc-500 hover:text-zinc-400 hover:border-zinc-600 transition-colors"
                                                            >
                                                                + Add Column
                                                            </button>
                                                        </div>
                                                    )}

                                                    {/* Trigger Keywords */}
                                                    <div className="pt-3">
                                                        <label className="block text-xs font-medium text-zinc-400 mb-1">
                                                            Trigger Keywords <span className="text-zinc-600">(Optional)</span>
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={dataCollectionData.trigger_keywords.join(', ')}
                                                            onChange={(e) => setDataCollectionData({
                                                                ...dataCollectionData,
                                                                trigger_keywords: e.target.value ? e.target.value.split(',').map(k => k.trim()).filter(k => k) : []
                                                            })}
                                                            placeholder="Leave empty to process all messages"
                                                            className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-white text-xs placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                        />
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </section>
                            )}

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
