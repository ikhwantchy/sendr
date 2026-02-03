'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import {
    Plus, Trash2, Settings, FileSpreadsheet, RefreshCw, ChevronDown,
    CheckCircle2, XCircle, Clock, AlertTriangle, Eye, EyeOff,
    Zap, TestTube, ArrowRight, Info, Copy, ExternalLink, Sparkles, PenLine, Brain
} from 'lucide-react'

// Mode types for AI Assistant
type AIAssistantMode = 'update' | 'create' | 'smart'

// Column schema for Create mode
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

interface SheetUpdaterConfig {
    id?: string
    bot_id: string
    name: string
    spreadsheet_url: string
    spreadsheet_id?: string
    sheet_name: string
    match_column: string
    update_column: string
    ai_instructions?: string
    value_mappings: ValueMapping[]
    is_enabled: boolean
    target_jids?: string[]
    // New fields for extended modes
    mode?: AIAssistantMode
    column_schema?: ColumnSchema[]
    trigger_keywords?: string[]
}

interface AISheetUpdaterProps {
    botId: string
}

export default function AISheetUpdater({ botId }: AISheetUpdaterProps) {
    const queryClient = useQueryClient()
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [editingConfig, setEditingConfig] = useState<SheetUpdaterConfig | null>(null)
    const [testMessage, setTestMessage] = useState('')
    const [testResult, setTestResult] = useState<any>(null)

    // Fetch service status
    const { data: statusData } = useQuery({
        queryKey: ['sheet-updater-status'],
        queryFn: async () => {
            const res = await api.sheetUpdater.getStatus()
            return res.data.data
        }
    })

    // Fetch configs for this bot
    const { data: configs, isLoading } = useQuery({
        queryKey: ['sheet-updater-configs', botId],
        queryFn: async () => {
            const res = await api.sheetUpdater.getConfigs(botId)
            return res.data.data || []
        }
    })

    // Delete mutation
    const deleteMutation = useMutation({
        mutationFn: async (configId: string) => {
            return await api.sheetUpdater.deleteConfig(configId)
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['sheet-updater-configs', botId] })
            toast.success('Config deleted')
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.error || 'Failed to delete')
        }
    })

    // Toggle mutation
    const toggleMutation = useMutation({
        mutationFn: async (configId: string) => {
            return await api.sheetUpdater.toggleConfig(configId)
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['sheet-updater-configs', botId] })
        }
    })

    // Test classify
    const testClassify = async () => {
        if (!testMessage.trim()) return
        try {
            const res = await api.sheetUpdater.testClassify(testMessage)
            setTestResult(res.data.data)
        } catch (error: any) {
            toast.error('Test failed: ' + error.message)
        }
    }

    if (!statusData?.ready) {
        return (
            <div className="p-6 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                        <h3 className="text-sm font-medium text-amber-400 mb-1">Setup Required</h3>
                        <p className="text-xs text-amber-300/70 mb-3">
                            Google Service Account not configured. To enable AI Sheet updates:
                        </p>
                        <ol className="text-xs text-zinc-400 space-y-1 list-decimal list-inside">
                            <li>Create a Service Account in Google Cloud Console</li>
                            <li>Download the JSON key file</li>
                            <li>Set <code className="bg-zinc-800 px-1 rounded">GOOGLE_SERVICE_ACCOUNT_KEY</code> in .env (base64 encoded)</li>
                            <li>Restart the backend server</li>
                        </ol>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-green-500" />
                        AI Assistant
                    </h3>
                    <p className="text-xs text-zinc-500 mt-1">
                        Automatically update or create spreadsheet rows based on AI-classified responses
                    </p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-sm font-medium rounded-lg transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    Add Config
                </button>
            </div>

            {/* Service Account Info */}
            {statusData?.serviceAccountEmail && (
                <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                    <div className="flex items-center gap-2 text-xs text-blue-400 mb-1">
                        <Info className="w-4 h-4" />
                        Share your spreadsheet with this email:
                    </div>
                    <div className="flex items-center gap-2">
                        <code className="text-sm text-blue-300 bg-blue-500/10 px-3 py-1 rounded">
                            {statusData.serviceAccountEmail}
                        </code>
                        <button
                            onClick={() => {
                                navigator.clipboard.writeText(statusData.serviceAccountEmail)
                                toast.success('Copied to clipboard')
                            }}
                            className="p-1.5 hover:bg-blue-500/20 rounded transition-colors"
                        >
                            <Copy className="w-4 h-4 text-blue-400" />
                        </button>
                    </div>
                </div>
            )}

            {/* Configs List */}
            {isLoading ? (
                <div className="flex justify-center py-12">
                    <RefreshCw className="w-6 h-6 text-zinc-500 animate-spin" />
                </div>
            ) : configs?.length > 0 ? (
                <div className="space-y-3">
                    {configs.map((config: SheetUpdaterConfig) => (
                        <div
                            key={config.id}
                            className={`p-4 rounded-xl border transition-all ${
                                config.is_enabled
                                    ? 'bg-zinc-900/50 border-zinc-800'
                                    : 'bg-zinc-900/30 border-zinc-800/50 opacity-60'
                            }`}
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h4 className="text-sm font-medium text-white">{config.name}</h4>
                                        {/* Mode Badge */}
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium flex items-center gap-1 ${
                                            config.mode === 'create' 
                                                ? 'bg-blue-500/10 text-blue-400'
                                                : config.mode === 'smart'
                                                ? 'bg-purple-500/10 text-purple-400'
                                                : 'bg-green-500/10 text-green-400'
                                        }`}>
                                            {config.mode === 'create' && <PenLine className="w-3 h-3" />}
                                            {config.mode === 'smart' && <Brain className="w-3 h-3" />}
                                            {(!config.mode || config.mode === 'update') && <RefreshCw className="w-3 h-3" />}
                                            {config.mode || 'update'}
                                        </span>
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                                            config.is_enabled
                                                ? 'bg-emerald-500/10 text-emerald-400'
                                                : 'bg-zinc-500/10 text-zinc-500'
                                        }`}>
                                            {config.is_enabled ? 'Active' : 'Disabled'}
                                        </span>
                                    </div>
                                    <p className="text-xs text-zinc-500 mb-2">
                                        {config.mode === 'create' ? (
                                            <>Columns: <span className="text-zinc-400">{config.column_schema?.length || 0} fields</span></>
                                        ) : (
                                            <>Match: <span className="text-zinc-400">{config.match_column}</span> → 
                                            Update: <span className="text-zinc-400">{config.update_column}</span></>
                                        )}
                                    </p>
                                    <div className="flex items-center gap-2 text-xs text-zinc-600">
                                        <FileSpreadsheet className="w-3 h-3" />
                                        <span className="truncate max-w-[300px]">{config.sheet_name}</span>
                                    </div>
                                    
                                    {/* Value Mappings */}
                                    <div className="flex flex-wrap gap-2 mt-3">
                                        {config.value_mappings.slice(0, 4).map((mapping, idx) => (
                                            <span
                                                key={idx}
                                                className="px-2 py-1 bg-zinc-800 rounded text-[10px] text-zinc-400"
                                            >
                                                {mapping.emoji} {mapping.value}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => toggleMutation.mutate(config.id!)}
                                        className={`p-2 rounded-lg transition-colors ${
                                            config.is_enabled
                                                ? 'hover:bg-amber-500/10 text-amber-500'
                                                : 'hover:bg-green-500/10 text-green-500'
                                        }`}
                                        title={config.is_enabled ? 'Disable' : 'Enable'}
                                    >
                                        {config.is_enabled ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                    <button
                                        onClick={() => setEditingConfig(config)}
                                        className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors"
                                        title="Edit"
                                    >
                                        <Settings className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (confirm('Delete this config?')) {
                                                deleteMutation.mutate(config.id!)
                                            }
                                        }}
                                        className="p-2 hover:bg-red-500/10 rounded-lg text-zinc-400 hover:text-red-500 transition-colors"
                                        title="Delete"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-12 border border-dashed border-zinc-800 rounded-xl">
                    <FileSpreadsheet className="w-10 h-10 text-zinc-700 mb-3" />
                    <p className="text-sm text-zinc-500 mb-1">No sheet updaters configured</p>
                    <p className="text-xs text-zinc-600 mb-4">Create one to automatically update spreadsheets based on responses</p>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-sm rounded-lg transition-colors"
                    >
                        Create First Config
                    </button>
                </div>
            )}

            {/* Test Section */}
            <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl">
                <h4 className="text-sm font-medium text-zinc-400 mb-3 flex items-center gap-2">
                    <TestTube className="w-4 h-4" />
                    Test Classification
                </h4>
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={testMessage}
                        onChange={(e) => setTestMessage(e.target.value)}
                        placeholder="Type a test message (e.g., 'Hadir gan!')"
                        className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                        onKeyDown={(e) => e.key === 'Enter' && testClassify()}
                    />
                    <button
                        onClick={testClassify}
                        className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                        Test
                    </button>
                </div>
                {testResult && (
                    <div className="mt-3 p-3 bg-zinc-800 rounded-lg">
                        <div className="flex items-center gap-2 text-sm">
                            <span className="text-zinc-500">Result:</span>
                            <span className="font-medium text-white">{testResult.mappedValue}</span>
                            <span className="text-xs text-zinc-500">
                                (confidence: {Math.round(testResult.confidence * 100)}%)
                            </span>
                        </div>
                    </div>
                )}
            </div>

            {/* Create/Edit Modal */}
            {(showCreateModal || editingConfig) && (
                <SheetUpdaterModal
                    botId={botId}
                    config={editingConfig}
                    onClose={() => {
                        setShowCreateModal(false)
                        setEditingConfig(null)
                    }}
                    onSaved={() => {
                        setShowCreateModal(false)
                        setEditingConfig(null)
                        queryClient.invalidateQueries({ queryKey: ['sheet-updater-configs', botId] })
                    }}
                />
            )}
        </div>
    )
}

// Modal Component
function SheetUpdaterModal({
    botId,
    config,
    onClose,
    onSaved
}: {
    botId: string
    config: SheetUpdaterConfig | null
    onClose: () => void
    onSaved: () => void
}) {
    const isEdit = !!config

    const [formData, setFormData] = useState<Partial<SheetUpdaterConfig>>({
        bot_id: botId,
        name: config?.name || '',
        spreadsheet_url: config?.spreadsheet_url || '',
        sheet_name: config?.sheet_name || '',
        match_column: config?.match_column || '',
        update_column: config?.update_column || '',
        ai_instructions: config?.ai_instructions || '',
        value_mappings: config?.value_mappings || [
            { keywords: ['hadir', 'datang', 'bisa', 'oke', 'siap', 'yes', 'iya'], value: 'CONFIRMED', emoji: '✅' },
            { keywords: ['tidak', 'gabisa', 'cancel', 'no', 'izin'], value: 'DECLINED', emoji: '❌' },
            { keywords: ['mungkin', 'maybe', 'belum tau', 'nanti'], value: 'MAYBE', emoji: '⏳' }
        ],
        is_enabled: config?.is_enabled ?? true,
        // New fields
        mode: config?.mode || 'update',
        column_schema: config?.column_schema || [
            { name: 'Phone', source: 'sender_phone', required: true },
            { name: 'Name', source: 'sender_name' },
            { name: 'Timestamp', source: 'timestamp' },
            { name: 'Message', source: 'ai_extract', ai_prompt: 'Extract the main content or request from the message' }
        ],
        trigger_keywords: config?.trigger_keywords || []
    })

    const [sheetInfo, setSheetInfo] = useState<{ sheets: string[], headers: string[] } | null>(null)
    const [isValidating, setIsValidating] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [selectedPreset, setSelectedPreset] = useState<string>('event')

    // Default mappings
    const presets: Record<string, ValueMapping[]> = {
        event: [
            { keywords: ['hadir', 'datang', 'bisa', 'oke', 'siap', 'gas', 'ikut', 'join', 'yes', 'iya', 'yoi', 'confirm', 'acc'], value: 'CONFIRMED', emoji: '✅' },
            { keywords: ['tidak', 'gabisa', 'ga bisa', 'gak bisa', 'cancel', 'batal', 'skip', 'no', 'nope', 'absent', 'izin', 'halangan'], value: 'DECLINED', emoji: '❌' },
            { keywords: ['mungkin', 'maybe', 'belum tau', 'belum tahu', 'nanti', 'liat nanti', 'tentative', 'pending'], value: 'MAYBE', emoji: '⏳' }
        ],
        order: [
            { keywords: ['sudah bayar', 'sudah transfer', 'udah tf', 'done', 'paid', 'lunas'], value: 'PAID', emoji: '💰' },
            { keywords: ['belum', 'nanti', 'pending'], value: 'PENDING', emoji: '⏳' },
            { keywords: ['cancel', 'batal', 'ga jadi'], value: 'CANCELLED', emoji: '❌' }
        ],
        survey: [
            { keywords: ['bagus', 'puas', 'mantap', 'oke', 'good', 'great', 'excellent'], value: 'POSITIVE', emoji: '👍' },
            { keywords: ['biasa', 'lumayan', 'cukup', 'so so'], value: 'NEUTRAL', emoji: '😐' },
            { keywords: ['kurang', 'jelek', 'bad', 'buruk', 'kecewa'], value: 'NEGATIVE', emoji: '👎' }
        ],
        lead: [
            { keywords: ['tertarik', 'mau', 'berminat', 'interested', 'yes'], value: 'HOT', emoji: '🔥' },
            { keywords: ['nanti', 'pikir dulu', 'maybe', 'belum yakin'], value: 'WARM', emoji: '🌡️' },
            { keywords: ['tidak', 'no', 'ga', 'skip'], value: 'COLD', emoji: '❄️' }
        ]
    }

    // Validate sheet URL
    const validateSheet = async () => {
        if (!formData.spreadsheet_url) return
        setIsValidating(true)
        try {
            const res = await api.sheetUpdater.getSheetInfo(formData.spreadsheet_url, formData.sheet_name)
            setSheetInfo(res.data.data)
            if (!formData.sheet_name && res.data.data.sheets.length > 0) {
                setFormData(prev => ({ ...prev, sheet_name: res.data.data.sheets[0] }))
            }
            toast.success('Spreadsheet validated!')
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Failed to validate spreadsheet')
            setSheetInfo(null)
        } finally {
            setIsValidating(false)
        }
    }

    // Submit
    const handleSubmit = async () => {
        // Base validation
        if (!formData.name || !formData.spreadsheet_url || !formData.sheet_name) {
            toast.error('Please fill all required fields (name, spreadsheet, sheet)')
            return
        }

        // Mode-specific validation
        if (formData.mode === 'update' || formData.mode === 'smart') {
            if (!formData.match_column || !formData.update_column) {
                toast.error('Please select match and update columns')
                return
            }
        }

        if (formData.mode === 'create') {
            if (!formData.column_schema || formData.column_schema.length === 0) {
                toast.error('Please define at least one column in the schema')
                return
            }
        }

        setIsSubmitting(true)
        try {
            if (isEdit && config?.id) {
                await api.sheetUpdater.updateConfig(config.id, formData)
                toast.success('Config updated!')
            } else {
                await api.sheetUpdater.createConfig(formData)
                toast.success('Config created!')
            }
            onSaved()
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Failed to save')
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="w-full max-w-2xl bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-zinc-950 border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-green-500" />
                        {isEdit ? 'Edit AI Assistant Config' : 'Create AI Assistant Config'}
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors"
                    >
                        ✕
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* Mode Selector */}
                    <div>
                        <label className="block text-xs font-medium text-zinc-400 mb-2">Mode</label>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, mode: 'update' })}
                                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border transition-all ${
                                    formData.mode === 'update'
                                        ? 'bg-green-600/20 border-green-500 text-green-400'
                                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                                }`}
                            >
                                <RefreshCw className="w-4 h-4" />
                                <div className="text-left">
                                    <div className="text-sm font-medium">Update</div>
                                    <div className="text-[10px] opacity-70">Update existing rows</div>
                                </div>
                            </button>
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, mode: 'create' })}
                                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border transition-all ${
                                    formData.mode === 'create'
                                        ? 'bg-blue-600/20 border-blue-500 text-blue-400'
                                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                                }`}
                            >
                                <PenLine className="w-4 h-4" />
                                <div className="text-left">
                                    <div className="text-sm font-medium">Create</div>
                                    <div className="text-[10px] opacity-70">Add new rows</div>
                                </div>
                            </button>
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, mode: 'smart' })}
                                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border transition-all ${
                                    formData.mode === 'smart'
                                        ? 'bg-purple-600/20 border-purple-500 text-purple-400'
                                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                                }`}
                            >
                                <Brain className="w-4 h-4" />
                                <div className="text-left">
                                    <div className="text-sm font-medium">Smart</div>
                                    <div className="text-[10px] opacity-70">AI decides</div>
                                </div>
                            </button>
                        </div>
                    </div>

                    {/* Name */}
                    <div>
                        <label className="block text-xs font-medium text-zinc-400 mb-1">
                            Configuration Name <span className="text-red-400">*</span>
                        </label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder={formData.mode === 'create' ? 'e.g., Order Collector' : 'e.g., Event RSVP Tracker'}
                            className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white text-sm placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-green-500"
                        />
                    </div>

                    {/* Spreadsheet URL */}
                    <div>
                        <label className="block text-xs font-medium text-zinc-400 mb-1">
                            Spreadsheet URL <span className="text-red-400">*</span>
                        </label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={formData.spreadsheet_url}
                                onChange={(e) => setFormData({ ...formData, spreadsheet_url: e.target.value })}
                                placeholder="https://docs.google.com/spreadsheets/d/..."
                                className="flex-1 px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white text-sm placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-green-500"
                            />
                            <button
                                onClick={validateSheet}
                                disabled={isValidating || !formData.spreadsheet_url}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                            >
                                {isValidating ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Validate'}
                            </button>
                        </div>
                    </div>

                    {/* Sheet & Columns - Conditional based on mode */}
                    {sheetInfo && (
                        <>
                            {/* Sheet Name - Always shown */}
                            <div>
                                <label className="block text-xs font-medium text-zinc-400 mb-1">
                                    Sheet Name <span className="text-red-400">*</span>
                                </label>
                                <select
                                    value={formData.sheet_name}
                                    onChange={(e) => setFormData({ ...formData, sheet_name: e.target.value })}
                                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
                                >
                                    {sheetInfo.sheets.map(sheet => (
                                        <option key={sheet} value={sheet}>{sheet}</option>
                                    ))}
                                </select>
                            </div>

                            {/* UPDATE/SMART Mode: Match & Update Columns */}
                            {(formData.mode === 'update' || formData.mode === 'smart') && (
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-medium text-zinc-400 mb-1">
                                            Match Column <span className="text-red-400">*</span>
                                        </label>
                                        <select
                                            value={formData.match_column}
                                            onChange={(e) => setFormData({ ...formData, match_column: e.target.value })}
                                            className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
                                        >
                                            <option value="">Select...</option>
                                            {sheetInfo.headers.map(header => (
                                                <option key={header} value={header}>{header}</option>
                                            ))}
                                        </select>
                                        <p className="text-[10px] text-zinc-500 mt-1">Column with phone numbers</p>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-zinc-400 mb-1">
                                            Update Column <span className="text-red-400">*</span>
                                        </label>
                                        <select
                                            value={formData.update_column}
                                            onChange={(e) => setFormData({ ...formData, update_column: e.target.value })}
                                            className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
                                        >
                                            <option value="">Select...</option>
                                            {sheetInfo.headers.map(header => (
                                                <option key={header} value={header}>{header}</option>
                                            ))}
                                        </select>
                                        <p className="text-[10px] text-zinc-500 mt-1">Column to write status</p>
                                    </div>
                                </div>
                            )}

                            {/* CREATE/SMART Mode: Column Schema Builder */}
                            {(formData.mode === 'create' || formData.mode === 'smart') && (
                                <div>
                                    <label className="block text-xs font-medium text-zinc-400 mb-2">
                                        Column Schema {formData.mode === 'create' && <span className="text-red-400">*</span>}
                                    </label>
                                    <p className="text-[10px] text-zinc-500 mb-3">
                                        Define which columns to fill when creating new rows
                                    </p>
                                    <div className="space-y-2">
                                        {formData.column_schema?.map((col, idx) => (
                                            <div key={idx} className="flex items-start gap-2 p-3 bg-zinc-900 border border-zinc-800 rounded-lg">
                                                <div className="flex-1 grid grid-cols-3 gap-2">
                                                    <input
                                                        type="text"
                                                        value={col.name}
                                                        onChange={(e) => {
                                                            const updated = [...(formData.column_schema || [])]
                                                            updated[idx] = { ...col, name: e.target.value }
                                                            setFormData({ ...formData, column_schema: updated })
                                                        }}
                                                        placeholder="Column name"
                                                        className="px-2 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-sm text-white"
                                                    />
                                                    <select
                                                        value={col.source}
                                                        onChange={(e) => {
                                                            const updated = [...(formData.column_schema || [])]
                                                            updated[idx] = { ...col, source: e.target.value as ColumnSchema['source'] }
                                                            setFormData({ ...formData, column_schema: updated })
                                                        }}
                                                        className="px-2 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-sm text-white"
                                                    >
                                                        <option value="sender_phone">📱 Sender Phone</option>
                                                        <option value="sender_name">👤 Sender Name</option>
                                                        <option value="timestamp">🕐 Timestamp</option>
                                                        <option value="ai_extract">🤖 AI Extract</option>
                                                        <option value="static">📌 Static Value</option>
                                                    </select>
                                                    {col.source === 'ai_extract' && (
                                                        <input
                                                            type="text"
                                                            value={col.ai_prompt || ''}
                                                            onChange={(e) => {
                                                                const updated = [...(formData.column_schema || [])]
                                                                updated[idx] = { ...col, ai_prompt: e.target.value }
                                                                setFormData({ ...formData, column_schema: updated })
                                                            }}
                                                            placeholder="What to extract..."
                                                            className="px-2 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-sm text-white"
                                                        />
                                                    )}
                                                    {col.source === 'static' && (
                                                        <input
                                                            type="text"
                                                            value={col.static_value || ''}
                                                            onChange={(e) => {
                                                                const updated = [...(formData.column_schema || [])]
                                                                updated[idx] = { ...col, static_value: e.target.value }
                                                                setFormData({ ...formData, column_schema: updated })
                                                            }}
                                                            placeholder="Fixed value"
                                                            className="px-2 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-sm text-white"
                                                        />
                                                    )}
                                                </div>
                                                <button
                                                    onClick={() => {
                                                        const updated = formData.column_schema?.filter((_, i) => i !== idx)
                                                        setFormData({ ...formData, column_schema: updated })
                                                    }}
                                                    className="p-1.5 hover:bg-red-500/10 rounded text-zinc-500 hover:text-red-400"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                        <button
                                            onClick={() => {
                                                const newCol: ColumnSchema = { name: '', source: 'ai_extract', ai_prompt: '' }
                                                setFormData({ 
                                                    ...formData, 
                                                    column_schema: [...(formData.column_schema || []), newCol] 
                                                })
                                            }}
                                            className="w-full py-2 border border-dashed border-zinc-700 rounded-lg text-sm text-zinc-500 hover:text-zinc-400 hover:border-zinc-600 transition-colors"
                                        >
                                            + Add Column
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {/* Preset Selector - Only for update/smart mode */}
                    {(formData.mode === 'update' || formData.mode === 'smart') && (
                        <div>
                            <label className="block text-xs font-medium text-zinc-400 mb-2">Use Case Preset</label>
                            <div className="flex gap-2">
                                {Object.keys(presets).map(key => (
                                    <button
                                        key={key}
                                        onClick={() => {
                                            setSelectedPreset(key)
                                            setFormData({ ...formData, value_mappings: presets[key] })
                                        }}
                                        className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                                            selectedPreset === key
                                                ? 'bg-green-600 text-white'
                                                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                                        }`}
                                    >
                                        {key.charAt(0).toUpperCase() + key.slice(1)}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Value Mappings - Only for update/smart mode */}
                    {(formData.mode === 'update' || formData.mode === 'smart') && (
                        <div>
                            <label className="block text-xs font-medium text-zinc-400 mb-2">Value Mappings</label>
                            <div className="space-y-2">
                                {formData.value_mappings?.map((mapping, idx) => (
                                    <div key={idx} className="flex items-center gap-2 p-3 bg-zinc-900 border border-zinc-800 rounded-lg">
                                        <span className="text-lg">{mapping.emoji}</span>
                                        <span className="font-medium text-white text-sm">{mapping.value}</span>
                                        <ArrowRight className="w-4 h-4 text-zinc-600" />
                                    <span className="text-xs text-zinc-500 flex-1 truncate">
                                        {mapping.keywords.slice(0, 5).join(', ')}...
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                    )}

                    {/* Trigger Keywords (Optional) */}
                    <div>
                        <label className="block text-xs font-medium text-zinc-400 mb-1">
                            Trigger Keywords (Optional)
                        </label>
                        <input
                            type="text"
                            value={formData.trigger_keywords?.join(', ') || ''}
                            onChange={(e) => setFormData({ 
                                ...formData, 
                                trigger_keywords: e.target.value ? e.target.value.split(',').map(k => k.trim()) : []
                            })}
                            placeholder="e.g., order, pesan, beli (comma separated)"
                            className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white text-sm placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-green-500"
                        />
                        <p className="text-[10px] text-zinc-500 mt-1">
                            Only process messages containing these keywords. Leave empty to process all messages.
                        </p>
                    </div>

                    {/* AI Instructions */}
                    <div>
                        <label className="block text-xs font-medium text-zinc-400 mb-1">
                            AI Instructions (Optional)
                        </label>
                        <textarea
                            value={formData.ai_instructions}
                            onChange={(e) => setFormData({ ...formData, ai_instructions: e.target.value })}
                            placeholder={
                                formData.mode === 'create' 
                                    ? "Custom instructions for AI data extraction..."
                                    : formData.mode === 'smart'
                                    ? "Custom instructions for AI to decide update vs create..."
                                    : "Custom instructions for AI classification..."
                            }
                            rows={2}
                            className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white text-sm placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-green-500 resize-none"
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="sticky bottom-0 bg-zinc-950 border-t border-zinc-800 px-6 py-4 flex items-center justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                    >
                        {isSubmitting ? 'Saving...' : (isEdit ? 'Update' : 'Create')}
                    </button>
                </div>
            </div>
        </div>
    )
}
