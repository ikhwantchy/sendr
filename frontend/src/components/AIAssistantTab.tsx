/**
 * AI Assistant Tab Component
 * Manages AI configuration, multi-provider selection, and data collection settings
 */

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import {
    Cpu,
    Sparkles,
    Database,
    MessageSquare,
    Settings,
    Save,
    RefreshCw,
    ExternalLink,
    CheckCircle2,
    XCircle,
    Info,
    Layout,
    Plus,
    X,
    ClipboardList,
    Zap,
    Brain,
    Globe,
    Layers,
    Shield
} from 'lucide-react'

interface AIAssistantTabProps {
    botId: string;
    botData: any;
}

export default function AIAssistantTab({ botId, botData }: AIAssistantTabProps) {
    const queryClient = useQueryClient()
    const [config, setConfig] = useState<any>({
        enabled: false,
        provider: 'google',
        model: 'gemini-1.5-flash',
        apiKey: '',
        systemPrompt: '',
        mode: 'chat',
        dataSchema: {
            enabled: false,
            sheetUrl: '',
            fields: []
        }
    })

    const [isTesting, setIsTesting] = useState(false)
    const [showAdvanced, setShowAdvanced] = useState(false)

    // Load existing config
    useEffect(() => {
        if (botData?.ai_config) {
            try {
                const parsedConfig = typeof botData.ai_config === 'string'
                    ? JSON.parse(botData.ai_config)
                    : botData.ai_config
                setConfig((prev: any) => ({ ...prev, ...parsedConfig }))
            } catch (e) {
                console.error('Failed to parse AI config', e)
            }
        }
    }, [botData])



    // Fetch providers
    const { data: providers = [] } = useQuery({
        queryKey: ['ai-providers'],
        queryFn: async () => {
            const response = await api.ai.getProviders()
            return response.data.data || []
        }
    })

    // Auto-detect provider from API Key
    useEffect(() => {
        if (!config.apiKey) return;

        const key = config.apiKey.trim();
        let detectedProvider = '';

        if (key.startsWith('AIza')) {
            detectedProvider = 'google';
        } else if (key.startsWith('sk-')) {
            detectedProvider = 'openai';
        } else if (key.startsWith('gsk_')) {
            detectedProvider = 'groq';
        }

        if (detectedProvider && detectedProvider !== config.provider) {
            const providerData = providers.find((p: any) => p.name === detectedProvider);
            if (providerData) {
                setConfig((prev: any) => ({
                    ...prev,
                    provider: detectedProvider,
                    model: providerData.models[0]
                }));
                const providerName = detectedProvider === 'google' ? 'Google Gemini' : detectedProvider === 'openai' ? 'OpenAI GPT' : 'Groq Llama';
                toast.info(`Detected ${providerName} key, switching...`, {
                    duration: 2000,
                    id: 'provider-detect'
                });
            }
        }
    }, [config.apiKey, providers]);

    // Mutations
    const updateMutation = useMutation({
        mutationFn: async (newConfig: any) => {
            return await api.bots.update(botId, {
                ai_config: JSON.stringify(newConfig)
            })
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['bot', botId] })
            toast.success('AI configuration updated successfully')
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.error || 'Failed to update AI configuration')
        }
    })

    const testConnection = async () => {
        if (!config.apiKey) {
            toast.error('API Key is required to test connection')
            return
        }
        setIsTesting(true)
        try {
            const response = await api.ai.testConnection({
                provider: config.provider,
                apiKey: config.apiKey
            })
            if (response.data.data.isValid) {
                toast.success('Connection successful! AI is ready.')
            } else {
                toast.error('Connection failed. Please check your API key.')
            }
        } catch (error) {
            toast.error('Test failed. Check API key and provider.')
        } finally {
            setIsTesting(false)
        }
    }

    const handleSave = () => {
        updateMutation.mutate(config)
    }

    const addField = () => {
        const newFields = [...(config.dataSchema?.fields || []), { name: '', type: 'string', required: true, column: '' }]
        setConfig({ ...config, dataSchema: { ...config.dataSchema, fields: newFields } })
    }

    const updateField = (index: number, field: any) => {
        const newFields = [...(config.dataSchema?.fields || [])]
        newFields[index] = field
        setConfig({ ...config, dataSchema: { ...config.dataSchema, fields: newFields } })
    }

    const removeField = (index: number) => {
        const newFields = config.dataSchema?.fields.filter((_: any, i: number) => i !== index)
        setConfig({ ...config, dataSchema: { ...config.dataSchema, fields: newFields } })
    }

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* AI Assistant Banner - Overview Style */}
            <div className="mb-8 p-6 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500">
                        <Cpu className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-zinc-100 tracking-tight">AI Assistant</h2>
                        <p className="text-sm text-zinc-500 mt-1 max-w-lg">
                            Supercharge your bot with LLM intelligence. Handle complex queries and collect data automatically.
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex flex-col items-end gap-1">
                        <span className={`text-[10px] font-bold uppercase tracking-widest ${config.enabled ? 'text-emerald-500' : 'text-zinc-600'}`}>
                            {config.enabled ? 'System Online' : 'System Offline'}
                        </span>
                        <button
                            onClick={() => setConfig({ ...config, enabled: !config.enabled })}
                            className={`relative w-11 h-6 rounded-full transition-all ${config.enabled ? 'bg-emerald-500/20' : 'bg-zinc-800'}`}
                        >
                            <div className={`absolute top-1 left-1 w-4 h-4 rounded-full transition-all ${config.enabled ? 'translate-x-5 bg-emerald-500' : 'translate-x-0 bg-zinc-600'}`} />
                        </button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Provider Configuration */}
                <div className="space-y-6">
                    <section className="p-6 rounded-xl bg-zinc-900/50 border border-zinc-800/50">
                        <h3 className="text-lg font-semibold text-zinc-100 mb-4 tracking-tight">LLM Provider</h3>

                        <div className="space-y-6">
                            {/* Primary API Key Input */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Authentication</label>
                                    {config.apiKey && (
                                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20">
                                            <CheckCircle2 className="w-3 h-3 text-blue-500" />
                                            <span className="text-[10px] font-bold text-blue-400 uppercase tracking-tight">{config.provider} Detected</span>
                                        </div>
                                    )}
                                </div>
                                <div className="flex gap-2">
                                    <input
                                        type="password"
                                        placeholder="Paste your API Key..."
                                        className="flex-1 px-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-200 text-sm focus:outline-none focus:border-blue-500 transition-all font-mono"
                                        value={config.apiKey}
                                        onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                                    />
                                    <button
                                        onClick={testConnection}
                                        disabled={isTesting || !config.apiKey}
                                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-semibold transition-all shadow-lg shadow-blue-500/10 disabled:opacity-50"
                                    >
                                        {isTesting ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Test'}
                                    </button>
                                </div>
                            </div>

                            {/* Detected Info & Quick Toggle */}
                            {config.apiKey && (
                                <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-900/50 border border-zinc-800/50">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded bg-zinc-900 flex items-center justify-center ${config.provider === 'google' ? 'text-blue-400' : config.provider === 'openai' ? 'text-emerald-400' : 'text-orange-400'}`}>
                                            {config.provider === 'google' ? <Sparkles className="w-4 h-4" /> : config.provider === 'openai' ? <Brain className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
                                        </div>
                                        <div>
                                            <p className="text-xs font-semibold text-zinc-100 uppercase tracking-tight">{config.provider === 'google' ? 'Google Gemini' : config.provider === 'openai' ? 'OpenAI GPT' : 'Groq Llama'}</p>
                                            <p className="text-[10px] text-zinc-500 font-mono">{config.model}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setShowAdvanced(!showAdvanced)}
                                        className="text-[10px] font-bold text-zinc-500 hover:text-blue-500 transition-colors uppercase tracking-wider"
                                    >
                                        {showAdvanced ? 'Hide Settings' : 'Advanced'}
                                    </button>
                                </div>
                            )}

                            {/* Advanced Selection - Overview style list */}
                            {(showAdvanced || !config.apiKey) && (
                                <div className="space-y-4 pt-4 border-t border-zinc-800/50">
                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Select Provider</label>
                                        <div className="grid grid-cols-3 gap-2">
                                            {['google', 'openai', 'groq'].map((p) => (
                                                <button
                                                    key={p}
                                                    onClick={() => {
                                                        const firstModel = providers.find((pr: any) => pr.name === p)?.models[0] || '';
                                                        setConfig({ ...config, provider: p, model: firstModel });
                                                    }}
                                                    className={`py-2 px-3 rounded-lg border text-xs font-bold transition-all ${config.provider === p
                                                        ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                                                        : 'bg-zinc-900/50 border-zinc-800 text-zinc-500 hover:border-zinc-700'
                                                        }`}
                                                >
                                                    {p.toUpperCase()}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Target Model</label>
                                        <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden divide-y divide-zinc-800">
                                            {providers.find((p: any) => p.name === config.provider)?.models.map((m: string) => (
                                                <button
                                                    key={m}
                                                    onClick={() => setConfig({ ...config, model: m })}
                                                    className={`w-full flex items-center justify-between px-4 py-2.5 text-[11px] transition-all ${config.model === m
                                                        ? 'bg-blue-500/5 text-zinc-100'
                                                        : 'text-zinc-500 hover:bg-zinc-800/50 hover:text-zinc-300'
                                                        }`}
                                                >
                                                    <span className="font-mono">{m}</span>
                                                    {config.model === m && <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </section>

                    <section className="p-6 rounded-xl bg-zinc-900/50 border border-zinc-800/50">
                        <h3 className="text-lg font-semibold text-zinc-100 mb-4 tracking-tight">AI Personality</h3>
                        <div className="space-y-4">
                            <textarea
                                rows={6}
                                placeholder="Describe how the AI should behave..."
                                className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-200 text-sm focus:outline-none focus:border-blue-500 transition-all resize-none"
                                value={config.systemPrompt}
                                onChange={(e) => setConfig({ ...config, systemPrompt: e.target.value })}
                            />
                            <div className="flex flex-wrap gap-2">
                                {[
                                    { id: 'cs', label: 'Customer Service', prompt: 'You are a professional customer service assistant. Be helpful, friendly, and brief.' },
                                    { id: 'tech', label: 'Tech Support', prompt: 'You are an expert technical support engineer. Provide step-by-step solutions.' }
                                ].map((preset) => (
                                    <button
                                        key={preset.id}
                                        onClick={() => setConfig({ ...config, systemPrompt: preset.prompt })}
                                        className="px-3 py-1.5 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-[10px] font-bold text-zinc-500 hover:text-zinc-300 rounded-lg transition-all"
                                    >
                                        {preset.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </section>
                </div>

                {/* Behavior & Data Extraction */}
                <div className="space-y-6">
                    <section className="p-6 rounded-xl bg-zinc-900/50 border border-zinc-800/50">
                        <h3 className="text-lg font-semibold text-zinc-100 mb-4 tracking-tight">Bot Behavior</h3>
                        <div className="space-y-2">
                            {[
                                { id: 'chat', title: 'Conversation Model', desc: 'Responds to mentions (@bot or reply)' },
                                { id: 'data_collection', title: 'Silent Collection', desc: 'No replies, just background extraction.' },
                                { id: 'hybrid', title: 'Hybrid Mode', desc: 'Mentions + Silent data extraction.' }
                            ].map((mode) => (
                                <button
                                    key={mode.id}
                                    onClick={() => setConfig({ ...config, mode: mode.id })}
                                    className={`w-full group flex items-center gap-4 px-4 py-3 rounded-lg border transition-all ${config.mode === mode.id
                                        ? 'bg-emerald-500/5 border-emerald-500/20'
                                        : 'bg-zinc-900/30 border-zinc-800/50 hover:border-zinc-700'}`}
                                >
                                    <div className={`w-8 h-8 rounded bg-zinc-900 flex items-center justify-center flex-shrink-0 ${config.mode === mode.id ? 'text-emerald-400' : 'text-zinc-600'}`}>
                                        <Layout className="w-4 h-4" />
                                    </div>
                                    <div className="text-left flex-1 min-w-0">
                                        <p className={`text-sm font-semibold ${config.mode === mode.id ? 'text-zinc-100' : 'text-zinc-400'}`}>{mode.title}</p>
                                        <p className="text-[10px] text-zinc-600 truncate">{mode.desc}</p>
                                    </div>
                                    {config.mode === mode.id && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                                </button>
                            ))}
                        </div>
                    </section>

                    {(config.mode === 'data_collection' || config.mode === 'hybrid') && (
                        <section className="p-6 rounded-xl bg-zinc-900/50 border border-zinc-800/50 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold text-zinc-100 tracking-tight">Data Extraction</h3>
                                <button
                                    onClick={() => setConfig({ ...config, dataSchema: { ...config.dataSchema, enabled: !config.dataSchema.enabled } })}
                                    className={`relative w-9 h-5 rounded-full transition-all ${config.dataSchema.enabled ? 'bg-emerald-500/20' : 'bg-zinc-800'}`}
                                >
                                    <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full transition-all ${config.dataSchema.enabled ? 'translate-x-4 bg-emerald-500' : 'translate-x-0 bg-zinc-600'}`} />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Spreadsheet URL</label>
                                    <input
                                        type="url"
                                        placeholder="https://docs.google.com/spreadsheets/..."
                                        className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-200 text-xs focus:outline-none focus:border-emerald-500 transition-all"
                                        value={config.dataSchema.sheetUrl}
                                        onChange={(e) => setConfig({ ...config, dataSchema: { ...config.dataSchema, sheetUrl: e.target.value } })}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Extraction Fields</label>
                                        <button onClick={addField} className="text-[10px] font-bold text-emerald-400 hover:text-emerald-300 uppercase tracking-widest">+ Add Field</button>
                                    </div>
                                    <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1 no-scrollbar">
                                        {config.dataSchema.fields.map((field: any, i: number) => (
                                            <div key={i} className="flex gap-2 items-center">
                                                <input
                                                    className="flex-1 px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded text-[11px] text-zinc-100"
                                                    placeholder="Field Name"
                                                    value={field.name}
                                                    onChange={(e) => updateField(i, { ...field, name: e.target.value })}
                                                />
                                                <input
                                                    className="w-12 px-2 py-1.5 bg-zinc-900 border border-zinc-800 rounded text-[11px] text-zinc-100 text-center uppercase font-mono"
                                                    placeholder="A"
                                                    value={field.column}
                                                    onChange={(e) => updateField(i, { ...field, column: e.target.value.toUpperCase() })}
                                                />
                                                <button onClick={() => removeField(i)} className="text-zinc-600 hover:text-red-400">
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </section>
                    )}
                </div>
            </div>

            {/* Bottom Actions - Overview Style */}
            <div className="mt-8 flex items-center justify-end border-t border-zinc-800 pt-6 pb-12">
                <button
                    onClick={handleSave}
                    disabled={updateMutation.isPending}
                    className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg shadow-blue-500/10 transition-all disabled:opacity-50"
                >
                    {updateMutation.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    <span>Save Configuration</span>
                </button>
            </div>
        </div>
    )
}
