'use client'

import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
    Calendar, Users, Clock, Save, Plus, X, Upload,
    FileText, Check, AlertCircle, ChevronRight, CheckCircle2,
    Database, Wand2, ChevronDown, ChevronUp, RefreshCw, Type,
    Bold, Italic, Link, Image as ImageIcon, Smile, Globe,
    Strikethrough, Code, Search, ArrowRight, Lock, Eye, MessageSquare, Paperclip
} from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/api'

// --- Types ---
type TargetType = 'group' | 'contact'
type ContactMethod = 'manual' | 'csv' | 'sheet'
type Frequency = 'once' | 'daily' | 'weekly' | 'monthly'

interface Group {
    id?: string
    jid: string
    name: string
    participant_count?: number
}

interface FormData {
    name: string
    targetType: TargetType
    contactMethod: ContactMethod
    selectedGroups: string[]
    manualContacts: string
    contactSheetUrl: string
    sheetName: string // Optional tab name
    csvFile: File | null
    csvPreview: string[] // Array of first few lines
    csvCount: number
    sheetContactCount: number
    triggerColumn: string
    triggerValue: string
    isDigestMode: boolean // Logic for grouping messages
    frequency: Frequency
    startDate: string // YYYY-MM-DD
    hasEndDate: boolean
    endDate: string // YYYY-MM-DD
    time: string // HH:mm
    days: number[] // 0-6 for weekly
    dataSource: 'static' | 'google_sheets'
    message: string
    imageFile: File | null
    imagePreview: string | null
}

interface CreateReminderWizardProps {
    botId: string
    onClose: () => void
}

// --- Constants ---
const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const EMOJIS = ['😊', '😂', '🥺', '🔥', '❤️', '👍', '🙏', '🎉', '👋', '✅']

export default function CreateReminderWizard({ botId, onClose }: CreateReminderWizardProps) {
    const queryClient = useQueryClient()
    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Default Dates
    const today = new Date().toISOString().split('T')[0]

    // UI State
    const [isContactPreviewOpen, setIsContactPreviewOpen] = useState(false)
    const [isGroupSelectorOpen, setIsGroupSelectorOpen] = useState(false)
    const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false)
    const [availableTabs, setAvailableTabs] = useState<Array<{ gid: string; name: string }>>([])
    const [isLoadingTabs, setIsLoadingTabs] = useState(false)

    // Form State
    const [formData, setFormData] = useState<FormData>({
        name: '',
        targetType: 'group',
        contactMethod: 'manual',
        selectedGroups: [],
        manualContacts: '',
        contactSheetUrl: '',
        sheetName: '',
        csvFile: null,
        csvPreview: [],
        csvCount: 0,
        sheetContactCount: 0,
        triggerColumn: '',
        triggerValue: '',
        isDigestMode: false,
        frequency: 'once',
        startDate: today,
        hasEndDate: false,
        endDate: '',
        time: '09:00',
        days: [],
        dataSource: 'static',
        message: '',
        imageFile: null,
        imagePreview: null
    })

    // Fetch Groups
    const { data: groupsData } = useQuery<Group[]>({
        queryKey: ['bot-groups', botId],
        queryFn: async () => {
            const res = await api.bots.getGroups(botId)
            const list = res.data.data
            return Array.isArray(list) ? list : []
        }
    })

    // Auto-detect tabs when Sheet URL changes
    useEffect(() => {
        const detectTabs = async () => {
            const url = formData.contactSheetUrl

            // Only proceed if we have a valid URL and Google Sheets Monitor is enabled
            if (!url || formData.dataSource !== 'google_sheets') {
                setAvailableTabs([])
                return
            }

            // Validate URL format
            const match = url.match(/\/d\/([\w-]+)/)
            if (!match || !match[1]) {
                setAvailableTabs([])
                return
            }

            setIsLoadingTabs(true)

            try {
                const response = await fetch(`http://localhost:3001/api/sheets/tabs?url=${encodeURIComponent(url)}`)
                const data = await response.json()

                if (data.success && data.tabs) {
                    setAvailableTabs(data.tabs)
                    // Auto-select first tab if none selected
                    if (!formData.sheetName && data.tabs.length > 0) {
                        setFormData(prev => ({ ...prev, sheetName: data.tabs[0].name }))
                    }
                } else {
                    setAvailableTabs([])
                    toast.error(data.message || 'Failed to detect tabs')
                }
            } catch (error) {
                console.error('Tab detection error:', error)
                setAvailableTabs([])
                // Silent fail - user can still input manually
            } finally {
                setIsLoadingTabs(false)
            }
        }

        // Debounce to avoid excessive API calls
        const timeoutId = setTimeout(detectTabs, 800)
        return () => clearTimeout(timeoutId)
    }, [formData.contactSheetUrl, formData.dataSource])


    // Create Mutation
    const createMutation = useMutation({
        mutationFn: async () => {
            // 1. Determine Target ID
            let targetId: string | null = null;

            if (formData.targetType === 'group') {
                // For now, take the first selected group
                // TODO: Support multiple groups (loop or separate reminders)
                targetId = formData.selectedGroups[0] || null;
            } else {
                if (formData.contactMethod === 'sheet') {
                    targetId = formData.contactSheetUrl;
                } else {
                    const contacts = formData.manualContacts.split('\n').filter(l => l.trim().length > 0).join(',');
                    targetId = contacts;
                }
            }

            // 2. Generate Schedule (cron or 'now')
            const schedule = generateCron(formData.frequency, formData.time, formData.days, formData.startDate);

            // 3. Prepare Template Config
            const templateConfig: any = {
                body: formData.message,
            };

            // Add Google Sheets config if enabled
            if (formData.dataSource === 'google_sheets') {
                templateConfig.isDigestMode = formData.isDigestMode;
                templateConfig.googleSheetsUrl = formData.contactSheetUrl;
                templateConfig.sheetName = formData.sheetName;
                templateConfig.triggerColumn = formData.triggerColumn;
                templateConfig.triggerValue = formData.triggerValue;
            }

            // 4. Prepare Payload (match backend API)
            const payload = {
                botId: botId,
                name: formData.name,
                description: '',
                targetType: formData.targetType,
                targetId: targetId,
                schedule: schedule,
                timezone: 'Asia/Jakarta',
                googleSheetsUrl: formData.dataSource === 'google_sheets' ? formData.contactSheetUrl : undefined,
                templateConfig: templateConfig,
            };

            return await api.reminders.create(payload);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['reminders', botId] })
            toast.success('Reminder scheduled successfully')
            onClose()
        },
        onError: (err: any) => {
            toast.error(err.message || 'Failed to create reminder')
        }
    })

    // Helpers
    const generateCron = (freq: Frequency, time: string, days: number[], dateStr: string) => {
        const [hh, mm] = time.split(':')
        const date = new Date(dateStr)
        const dd = date.getDate()
        const MM = date.getMonth() + 1
        if (freq === 'once') return `${mm} ${hh} ${dd} ${MM} *`
        if (freq === 'daily') return `${mm} ${hh} * * *`
        if (freq === 'weekly') return `${mm} ${hh} * * ${days.join(',') || '*'}`
        if (freq === 'monthly') return `${mm} ${hh} ${dd} * *`
        return `0 9 * * *`
    }

    const insertFormatting = (char: string) => {
        if (!textareaRef.current) return
        const start = textareaRef.current.selectionStart
        const end = textareaRef.current.selectionEnd
        const text = formData.message
        const before = text.substring(0, start)
        const selection = text.substring(start, end)
        const after = text.substring(end)

        const newText = `${before}${char}${selection}${char}${after}`
        setFormData({ ...formData, message: newText })

        // Reset cursor/selection
        setTimeout(() => {
            textareaRef.current?.focus()
            textareaRef.current?.setSelectionRange(start + char.length, end + char.length)
        }, 0)
    }

    const insertText = (str: string) => {
        if (!textareaRef.current) return
        const start = textareaRef.current.selectionStart
        const end = textareaRef.current.selectionEnd
        const text = formData.message
        const newText = text.substring(0, start) + str + text.substring(end)
        setFormData({ ...formData, message: newText })
        setTimeout(() => {
            textareaRef.current?.focus()
            textareaRef.current?.setSelectionRange(start + str.length, start + str.length)
        }, 0)
    }

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            setFormData({
                ...formData,
                imageFile: file,
                imagePreview: URL.createObjectURL(file)
            })
        }
    }

    // --- Derived State for Preview ---
    const getPreviewContactName = () => {
        // Try to find a name in the csvPreview (Real or Simulated)
        // Heuristic: First line usually header. Second line is data.
        // If csvPreview is empty, use 'User'
        if ((formData.contactMethod === 'csv' && formData.csvCount > 0) || (formData.contactMethod === 'sheet' && formData.sheetContactCount > 0)) {
            const dataLine = formData.csvPreview[1] || formData.csvPreview[0] // Fallback to 0 if 1 missing, though 0 might be header
            if (dataLine) {
                // Try to split by comma
                const parts = dataLine.split(',')
                // If parts[0] is name-like (alpha), use it. Else parts[1]
                if (parts[0] && isNaN(Number(parts[0].trim().replace(/['"+]/g, '')))) return parts[0].replace(/['"]/g, '')
            }
        }
        return '{NAME}'
    }

    const previewMessage = formData.message
        .replace(/{NAME}/g, getPreviewContactName().replace(/"/g, ''))

    // --- Sub-Components ---

    const SectionHeader = ({ title, desc }: { title: string, desc: string }) => (
        <div className="mb-6">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                {title}
            </h3>
            <p className="text-sm text-zinc-500">{desc}</p>
        </div>
    )

    // --- Main Render ---

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4 lg:p-10 animate-in fade-in duration-200">
            <div className="w-full max-w-7xl h-full max-h-[85vh] bg-[#09090b] rounded-2xl shadow-2xl border border-zinc-800 flex overflow-hidden ring-1 ring-white/10">

                {/* --- Left Panel: Scrollable Form (60%) --- */}
                <div className="w-[60%] flex flex-col h-full border-r border-zinc-800 relative bg-[#09090b]">
                    {/* Header */}
                    <div className="h-16 flex items-center justify-between px-8 border-b border-zinc-800 shrink-0 bg-[#09090b] z-20">
                        <h1 className="text-xl font-bold text-white tracking-tight">Create Reminder</h1>
                        <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-white transition-colors">
                            <X size={20} />
                        </button>
                    </div>

                    {/* Scrollable Content */}
                    <div className="flex-1 overflow-y-auto px-8 py-8 custom-scrollbar">

                        {/* 1. Basic Details */}
                        <section className="mb-10 pb-8 border-b border-zinc-800/50">
                            <SectionHeader title="Basic Details" desc="Name your reminder to easily identify it later." />
                            <div className="space-y-4">
                                <label className="text-xs font-medium text-zinc-400 uppercase tracking-wide">Reminder Name</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg text-white placeholder-zinc-600 focus:ring-1 focus:ring-blue-600 outline-none transition-all"
                                    placeholder="e.g. Monthly Staff Meeting"
                                />
                            </div>
                        </section>

                        {/* 2. Target Audience */}
                        <section className="mb-10 pb-8 border-b border-zinc-800/50">
                            <SectionHeader title="Target Audience" desc="Who should receive this reminder?" />

                            <div className="flex bg-zinc-900 p-1 rounded-lg border border-zinc-800 mb-6 w-fit">
                                <button
                                    onClick={() => setFormData({ ...formData, targetType: 'group' })}
                                    className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${formData.targetType === 'group' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
                                >
                                    WhatsApp Groups
                                </button>
                                <button
                                    onClick={() => setFormData({ ...formData, targetType: 'contact' })}
                                    className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${formData.targetType === 'contact' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
                                >
                                    Individual Contacts
                                </button>
                            </div>

                            {formData.targetType === 'group' ? (
                                <div className="space-y-4 animate-in fade-in">
                                    <label className="text-xs font-medium text-zinc-400 uppercase tracking-wide">Selected Groups</label>

                                    {/* Selected Chips */}
                                    <div className="flex flex-wrap gap-2 mb-2">
                                        {formData.selectedGroups.map(id => {
                                            const group = groupsData?.find(g => g.jid === id)
                                            return (
                                                <span key={id} className="inline-flex items-center gap-1 px-3 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full text-sm">
                                                    {group?.name || id}
                                                    <button onClick={() => setFormData(prev => ({ ...prev, selectedGroups: prev.selectedGroups.filter(g => g !== id) }))} className="hover:text-white">
                                                        <X size={14} />
                                                    </button>
                                                </span>
                                            )
                                        })}
                                        <button
                                            onClick={() => setIsGroupSelectorOpen(!isGroupSelectorOpen)}
                                            className="inline-flex items-center gap-1 px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-full text-sm border border-zinc-700 transition delay-75"
                                        >
                                            <Plus size={14} /> Add Group
                                        </button>
                                    </div>

                                    {/* Dropdown Selector */}
                                    {isGroupSelectorOpen && (
                                        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-2 max-h-60 overflow-y-auto shadow-xl animate-in zoom-in-95">
                                            {groupsData?.filter(g => !formData.selectedGroups.includes(g.jid)).map(group => (
                                                <button
                                                    key={group.jid}
                                                    onClick={() => {
                                                        setFormData(prev => ({
                                                            ...prev,
                                                            selectedGroups: [...prev.selectedGroups, group.jid]
                                                        }))
                                                        setIsGroupSelectorOpen(false)
                                                    }}
                                                    className="w-full text-left px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 rounded-md flex items-center justify-between group"
                                                >
                                                    {group.name}
                                                    <Plus size={14} className="opacity-0 group-hover:opacity-100 text-zinc-500" />
                                                </button>
                                            ))}
                                            {groupsData?.filter(g => !formData.selectedGroups.includes(g.jid)).length === 0 && (
                                                <div className="p-2 text-center text-zinc-500 text-xs">No more groups available</div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-4 animate-in fade-in">
                                    <div className="flex gap-4 border-b border-zinc-800 pb-1">
                                        {[
                                            { id: 'manual', label: 'Manual Input', icon: FileText },
                                            { id: 'csv', label: 'Import CSV', icon: Upload },
                                            { id: 'sheet', label: 'Google Sheets', icon: Database }
                                        ].map(m => (
                                            <button
                                                key={m.id}
                                                onClick={() => setFormData({ ...formData, contactMethod: m.id as any })}
                                                className={`flex items-center gap-2 px-3 py-2 text-sm font-medium border-b-2 transition-all ${formData.contactMethod === m.id ? 'border-blue-600 text-blue-500' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
                                            >
                                                <m.icon size={14} /> {m.label}
                                            </button>
                                        ))}
                                    </div>

                                    {formData.contactMethod === 'manual' && (
                                        <textarea
                                            value={formData.manualContacts}
                                            onChange={e => setFormData({ ...formData, manualContacts: e.target.value })}
                                            placeholder="Enter phone numbers (one per line)..."
                                            rows={6}
                                            className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg text-white font-mono text-sm focus:ring-1 focus:ring-blue-600 outline-none"
                                        />
                                    )}

                                    {formData.contactMethod === 'sheet' && (
                                        <div className="space-y-3">
                                            <div className="flex gap-2">
                                                <input
                                                    type="url"
                                                    value={formData.contactSheetUrl}
                                                    onChange={e => setFormData({ ...formData, contactSheetUrl: e.target.value, sheetContactCount: 0 })}
                                                    placeholder="https://docs.google.com/spreadsheets/d/..."
                                                    className="flex-1 px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:ring-1 focus:ring-blue-600 outline-none text-sm"
                                                />
                                                <button
                                                    onClick={async () => {
                                                        const url = formData.contactSheetUrl
                                                        const match = url.match(/\/d\/(.*?)(\/|$)/)
                                                        if (!match || !match[1]) return toast.error('Invalid URL')
                                                        const csvUrl = `https://docs.google.com/spreadsheets/d/${match[1]}/gviz/tq?tqx=out:csv`
                                                        const toastId = toast.loading('Fetching...')
                                                        try {
                                                            const res = await fetch(csvUrl)
                                                            if (!res.ok) throw new Error('Fetch failed')
                                                            const text = await res.text()
                                                            const lines = text.split('\n').map(r => r.replace(/^"|"$/g, '').replace(/""/g, '"')).filter(l => l.trim().length > 0)
                                                            setFormData(prev => ({ ...prev, sheetContactCount: lines.length, csvPreview: lines.slice(0, 10) })) // Get 10 for preview
                                                            toast.success(`Found ${lines.length} rows`, { id: toastId })
                                                        } catch (e) { toast.error('Failed or Private Sheet', { id: toastId }) }
                                                    }}
                                                    className="px-4 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg border border-zinc-700 font-medium text-sm"
                                                >
                                                    Check
                                                </button>
                                            </div>

                                            {/* Preview Dropdown for Sheet */}
                                            {formData.sheetContactCount > 0 && (
                                                <div className="border border-zinc-800 rounded-lg bg-zinc-900/50">
                                                    <button
                                                        onClick={() => setIsContactPreviewOpen(!isContactPreviewOpen)}
                                                        className="w-full flex items-center justify-between px-3 py-2 text-sm text-emerald-400 font-medium"
                                                    >
                                                        <span className="flex items-center gap-2"><CheckCircle2 size={16} /> Sheet Connected ({formData.sheetContactCount})</span>
                                                        {isContactPreviewOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                                    </button>
                                                    {isContactPreviewOpen && (
                                                        <div className="border-t border-zinc-800 p-2 max-h-40 overflow-y-auto">
                                                            {formData.csvPreview.map((line, i) => (
                                                                <div key={i} className="text-xs text-zinc-400 px-2 py-1 font-mono truncate border-b border-zinc-800/20 last:border-0">{line}</div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </section>

                        {/* 3. Trigger Logic (Data Source) */}
                        <section className="mb-10 pb-8 border-b border-zinc-800/50 animate-in fade-in slide-in-from-top-4">
                            <SectionHeader title="Trigger Logic" desc="Determine when to send reminders based on your sheet data." />
                            <div className="space-y-4">
                                <button
                                    onClick={() => setFormData({ ...formData, dataSource: formData.dataSource === 'static' ? 'google_sheets' : 'static' })}
                                    className={`w-full p-4 rounded-xl border flex items-center justify-between transition-all relative overflow-hidden group
                                    ${formData.dataSource === 'google_sheets' ? 'bg-emerald-500/10 border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.1)]' : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'}`}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center transition-colors ${formData.dataSource === 'google_sheets' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-800 text-zinc-500'}`}>
                                            <Database size={24} />
                                        </div>
                                        <div className="text-left">
                                            <div className={`font-semibold text-base mb-1 ${formData.dataSource === 'google_sheets' ? 'text-emerald-400' : 'text-zinc-200'}`}>Google Sheets Monitor</div>
                                            <div className="text-xs text-zinc-500">Auto-send based on a "Trigger" column value (e.g. "SEND")</div>
                                        </div>
                                    </div>
                                    <div className={`w-6 h-6 rounded-full border flex items-center justify-center transition-all ${formData.dataSource === 'google_sheets' ? 'bg-emerald-500 border-emerald-500 text-white scale-110' : 'border-zinc-600 group-hover:border-zinc-500'}`}>
                                        {formData.dataSource === 'google_sheets' && <Check size={14} />}
                                    </div>
                                </button>

                                {formData.dataSource === 'google_sheets' && (
                                    <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-6 space-y-6 animate-in fade-in slide-in-from-top-2">

                                        {/* 1. Connection Inputs */}
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div className="md:col-span-2 space-y-2">
                                                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Google Sheets URL</label>
                                                <div className="relative">
                                                    <Database className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
                                                    <input
                                                        type="url"
                                                        value={formData.contactSheetUrl}
                                                        onChange={e => setFormData({ ...formData, contactSheetUrl: e.target.value, sheetContactCount: 0 })}
                                                        placeholder="https://docs.google.com/spreadsheets/d/..."
                                                        className="w-full pl-10 pr-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:ring-1 focus:ring-emerald-500/50 outline-none text-sm transition-all"
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                                                    Tab Name
                                                    {isLoadingTabs && <RefreshCw size={12} className="animate-spin text-emerald-400" />}
                                                </label>
                                                {availableTabs.length > 0 ? (
                                                    <select
                                                        value={formData.sheetName}
                                                        onChange={e => setFormData({ ...formData, sheetName: e.target.value })}
                                                        className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:ring-1 focus:ring-emerald-500/50 outline-none text-sm transition-all"
                                                    >
                                                        <option value="">Select a tab...</option>
                                                        {availableTabs.map(tab => (
                                                            <option key={tab.gid} value={tab.name}>
                                                                {tab.name}
                                                            </option>
                                                        ))}
                                                    </select>
                                                ) : (
                                                    <input
                                                        type="text"
                                                        value={formData.sheetName}
                                                        onChange={e => setFormData({ ...formData, sheetName: e.target.value })}
                                                        placeholder="Paste URL first to auto-detect"
                                                        className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:ring-1 focus:ring-emerald-500/50 outline-none text-sm transition-all"
                                                        disabled={!formData.contactSheetUrl}
                                                    />
                                                )}
                                                <p className="text-[10px] text-zinc-500">
                                                    {availableTabs.length > 0
                                                        ? `✓ ${availableTabs.length} tabs detected`
                                                        : 'Paste Sheet URL to auto-detect tabs'}
                                                </p>
                                            </div>
                                        </div>

                                        {/* 2. Check Connection Button */}
                                        <div className="flex justify-between items-center">
                                            <div className="text-[10px] text-zinc-500 italic">Ensure your sheet is "Anyone with the link can view".</div>
                                            <button
                                                onClick={async () => {
                                                    const url = formData.contactSheetUrl
                                                    const match = url.match(/\/d\/(.*?)(\/|$)/)
                                                    if (!match || !match[1]) {
                                                        toast.error('Invalid Google Sheets URL')
                                                        return
                                                    }
                                                    const sheetId = match[1]

                                                    // Smart Tab Detection: Use Name input OR 'gid' from URL
                                                    let sheetParam = ''
                                                    const gidMatch = url.match(/[#&?]gid=(\d+)/)

                                                    if (formData.sheetName) {
                                                        sheetParam = `&sheet=${encodeURIComponent(formData.sheetName)}`
                                                    } else if (gidMatch && gidMatch[1]) {
                                                        sheetParam = `&gid=${gidMatch[1]}`
                                                    }

                                                    const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv${sheetParam}`

                                                    const toastMsg = formData.sheetName ? `Fetching '${formData.sheetName}'...` : (gidMatch ? 'Fetching tab from URL...' : 'Fetching default tab...')
                                                    const toastId = toast.loading(toastMsg)

                                                    try {
                                                        const res = await fetch(csvUrl)
                                                        if (!res.ok) throw new Error('Failed to fetch')

                                                        const text = await res.text()
                                                        const lines = text.split('\n')
                                                            .map(row => row.replace(/^"|"$/g, '').replace(/""/g, '"'))
                                                            .filter(l => l.trim().length > 0)

                                                        if (lines.length === 0) {
                                                            toast.error('Sheet appears empty', { id: toastId })
                                                            return
                                                        }

                                                        setFormData(prev => ({
                                                            ...prev,
                                                            sheetContactCount: lines.length,
                                                            csvPreview: lines.slice(0, 5)
                                                        }))

                                                        toast.success(`Found ${lines.length} rows`, { id: toastId })

                                                    } catch (err) {
                                                        console.error(err)
                                                        toast.error('Failed to fetch. Check permissions & tab name.', { id: toastId })
                                                    }
                                                }}
                                                className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2"
                                            >
                                                <Database size={14} /> Check Connection
                                            </button>
                                        </div>

                                        {/* 3. Preview (Collapsible) */}
                                        {formData.sheetContactCount > 0 && (
                                            <div className="border border-zinc-800 rounded-lg bg-zinc-900/50 overflow-hidden">
                                                <button
                                                    onClick={() => setIsContactPreviewOpen(!isContactPreviewOpen)}
                                                    className="w-full flex items-center justify-between px-3 py-2 text-sm text-emerald-400 font-medium hover:bg-zinc-800/50 transition-colors"
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <CheckCircle2 size={16} />
                                                        <span>Connected: {formData.sheetContactCount} rows found</span>
                                                    </div>
                                                    <div className="flex items-center gap-1 text-xs text-zinc-500 font-normal">
                                                        {isContactPreviewOpen ? 'Hide Data' : 'Show Data'}
                                                        {isContactPreviewOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                                    </div>
                                                </button>

                                                {isContactPreviewOpen && (
                                                    <div className="border-t border-zinc-800 max-h-48 overflow-y-auto custom-scrollbar bg-black/20">
                                                        <table className="w-full text-left text-xs text-zinc-400">
                                                            <thead className="bg-zinc-800/50 text-zinc-300 font-mono sticky top-0">
                                                                <tr>
                                                                    <th className="px-3 py-1.5 font-normal">#</th>
                                                                    <th className="px-3 py-1.5 font-normal">Raw Row Data</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-zinc-800/50">
                                                                {formData.csvPreview.map((line, i) => (
                                                                    <tr key={i} className="hover:bg-white/5 font-mono">
                                                                        <td className="px-3 py-1.5 w-10 opacity-50">{i + 1}</td>
                                                                        <td className="px-3 py-1.5 truncate max-w-[200px]">{line}</td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                        <div className="px-3 py-1 text-[10px] text-zinc-600 border-t border-zinc-800 bg-zinc-900/50">
                                                            Showing first {formData.csvPreview.length} rows used for loop simulation.
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* 4. Info Box & Tips */}
                                        <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg text-sm text-blue-300 leading-relaxed shadow-sm space-y-3">
                                            <div className="flex items-start gap-3">
                                                <div className="p-1 bg-blue-500/20 rounded text-blue-400 mt-0.5"><Wand2 size={16} /></div>
                                                <div>
                                                    <strong className="block mb-1 text-blue-200">How Logic Works:</strong>
                                                    The bot looks for a <strong>specific word</strong> (e.g. "SEND") in a <strong>specific column</strong> (e.g. "Status").
                                                    <div className="mt-2 text-xs bg-black/20 p-2 rounded border border-blue-500/10 font-mono text-blue-200/70">
                                                        =IF(AND(Deadline=TODAY(), BillPaid=FALSE), "SEND", "WAIT")
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Advanced Tip for Multi-Tab */}
                                            <div className="flex items-start gap-3 pt-3 border-t border-blue-500/20">
                                                <div className="p-1 bg-purple-500/20 rounded text-purple-400 mt-0.5"><Globe size={16} /></div>
                                                <div>
                                                    <strong className="block mb-1 text-purple-200">Need data from Multiple Tabs? (Schedules + Deadlines)</strong>
                                                    <p className="text-xs text-blue-200/80 mb-1">
                                                        The best way is to create a <strong>Master Tab</strong> (e.g. "Bot_Digest") in your Sheet that combines data using formulas like <code>=VSTACK(Schedule!A:E, Deadlines!A:E)</code>.
                                                    </p>
                                                    <p className="text-[10px] text-blue-200/60 font-bold">
                                                        Then point this bot to that "Bot_Digest" tab name.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* 5. Trigger Inputs */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Trigger Column Header</label>
                                                <div className="relative">
                                                    <input
                                                        type="text"
                                                        value={formData.triggerColumn}
                                                        onChange={e => setFormData({ ...formData, triggerColumn: e.target.value })}
                                                        placeholder="Status"
                                                        className="w-full pl-4 pr-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all font-medium"
                                                    />
                                                </div>
                                                <p className="text-[10px] text-zinc-500">Column to check (e.g. "Status")</p>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Trigger Value</label>
                                                <input
                                                    type="text"
                                                    value={formData.triggerValue}
                                                    onChange={e => setFormData({ ...formData, triggerValue: e.target.value })}
                                                    placeholder="SEND"
                                                    className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg text-emerald-400 placeholder-zinc-700 font-bold focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
                                                />
                                                <p className="text-[10px] text-zinc-500">Value to match (e.g. "SEND")</p>
                                            </div>
                                        </div>

                                    </div>
                                )}
                            </div>
                        </section>

                        {/* 4. Schedule */}
                        <section className="mb-10 pb-8 border-b border-zinc-800/50">
                            <SectionHeader title="Schedule" desc="When should this reminder run?" />
                            <div className="space-y-6">
                                <div className="grid grid-cols-4 gap-2">
                                    {['once', 'daily', 'weekly', 'monthly'].map(f => (
                                        <button key={f} onClick={() => setFormData({ ...formData, frequency: f as any })} className={`py-3 px-2 rounded-lg border text-sm font-medium capitalize transition-all ${formData.frequency === f ? 'bg-zinc-100 text-black' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300'}`}>{f}</button>
                                    ))}
                                </div>
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-medium text-zinc-400 uppercase">{formData.frequency === 'once' ? 'Execution Date' : 'Start Date'}</label>
                                        <input type="date" value={formData.startDate} min={today} onChange={e => setFormData({ ...formData, startDate: e.target.value })} className="w-full px-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-white outline-none" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-medium text-zinc-400 uppercase">Time</label>
                                        <input type="time" value={formData.time} onChange={e => setFormData({ ...formData, time: e.target.value })} className="w-full px-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-white outline-none" />
                                    </div>
                                </div>
                                {formData.frequency !== 'once' && (
                                    <div className="flex items-center justify-between pt-2 border-t border-zinc-800/50">
                                        <span className="text-sm text-zinc-400">Set End Date?</span>
                                        <button onClick={() => setFormData({ ...formData, hasEndDate: !formData.hasEndDate })} className={`w-10 h-6 rounded-full p-1 transition-colors ${formData.hasEndDate ? 'bg-blue-600' : 'bg-zinc-700'}`}>
                                            <div className={`w-4 h-4 bg-white rounded-full transition-transform ${formData.hasEndDate ? 'translate-x-4' : 'translate-x-0'}`} />
                                        </button>
                                    </div>
                                )}
                                {formData.hasEndDate && <input type="date" value={formData.endDate} min={formData.startDate} onChange={e => setFormData({ ...formData, endDate: e.target.value })} className="w-full px-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-white outline-none" />}
                            </div>
                        </section>

                        {/* 5. Message Content */}
                        <section className="mb-20">
                            <SectionHeader title="Message Content" desc="Compose your message." />

                            <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden focus-within:ring-1 focus-within:ring-blue-600/50 transition-all">
                                {/* Digest Mode Toggle */}
                                <div className="px-4 py-3 border-b border-zinc-800 bg-[#18181b]/50 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className={`p-1.5 rounded-md ${formData.isDigestMode ? 'bg-purple-500/20 text-purple-400' : 'bg-zinc-800 text-zinc-500'}`}>
                                            <FileText size={16} />
                                        </div>
                                        <div>
                                            <div className="text-sm font-medium text-zinc-200">Digest / List Mode</div>
                                            <div className="text-[10px] text-zinc-500">Combine multiple rows into one message (e.g. "Daily Summary")</div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setFormData({ ...formData, isDigestMode: !formData.isDigestMode })}
                                        className={`w-10 h-6 rounded-full p-1 transition-colors ${formData.isDigestMode ? 'bg-purple-600' : 'bg-zinc-700'}`}
                                    >
                                        <div className={`w-4 h-4 bg-white rounded-full transition-transform shadow-sm ${formData.isDigestMode ? 'translate-x-4' : 'translate-x-0'}`} />
                                    </button>
                                </div>

                                {/* Toolbar */}
                                <div className="bg-[#18181b] p-2 flex items-center justify-between border-b border-zinc-800">
                                    <div className="flex items-center gap-1">
                                        <button onClick={() => insertFormatting('*')} className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded"><Bold size={14} /></button>
                                        <button onClick={() => insertFormatting('_')} className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded"><Italic size={14} /></button>
                                        <button onClick={() => insertFormatting('~')} className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded"><Strikethrough size={14} /></button>
                                        <button onClick={() => insertFormatting('```')} className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded"><Code size={14} /></button>
                                        <div className="w-[1px] h-4 bg-zinc-700 mx-1" />
                                        <button onClick={() => setIsEmojiPickerOpen(!isEmojiPickerOpen)} className="p-1.5 text-zinc-400 hover:text-yellow-400 hover:bg-zinc-800 rounded relative">
                                            <Smile size={14} />
                                            {isEmojiPickerOpen && (
                                                <div className="absolute top-full left-0 mt-2 bg-zinc-800 border border-zinc-700 rounded-lg p-2 grid grid-cols-5 gap-1 shadow-xl z-50 min-w-[150px]">
                                                    {EMOJIS.map(e => <button key={e} onClick={() => insertText(e)} className="p-1 hover:bg-zinc-700 rounded text-lg">{e}</button>)}
                                                </div>
                                            )}
                                        </button>

                                        {formData.isDigestMode && (
                                            <>
                                                <div className="w-[1px] h-4 bg-zinc-700 mx-1" />
                                                <button
                                                    onClick={() => insertText('\n{{#LOOP}}\n - {ColumnName} \n{{/LOOP}}\n')}
                                                    className="flex items-center gap-1 px-2 py-1 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 text-xs font-medium rounded transition-colors border border-purple-500/20"
                                                >
                                                    <RefreshCw size={12} /> Add Loop Block
                                                </button>
                                            </>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageSelect} />
                                        <button
                                            onClick={() => fileInputRef.current?.click()}
                                            className={`flex items-center gap-2 px-2 py-1 rounded text-xs font-medium transition-colors ${formData.imageFile ? 'bg-blue-600/10 text-blue-400' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`}
                                        >
                                            <ImageIcon size={14} /> {formData.imageFile ? 'Change Image' : 'Add Image'}
                                        </button>
                                    </div>
                                </div>

                                <textarea
                                    ref={textareaRef}
                                    value={formData.message}
                                    onChange={e => setFormData({ ...formData, message: e.target.value })}
                                    className="w-full bg-transparent p-4 min-h-[200px] text-zinc-200 placeholder-zinc-600 resize-y focus:outline-none font-mono text-sm leading-relaxed"
                                    placeholder={formData.isDigestMode
                                        ? "Start typing... Use the Loop Block to list multiple items.\nExample:\nHere is your daily report:\n{{#LOOP}}\n - {TaskName} due on {Date}\n{{/LOOP}}\nBest regards."
                                        : "Type your message here... Use {{ColumnName}} to insert sheet data."}
                                />

                                <div className="px-3 py-2 bg-[#18181b] border-t border-zinc-800 flex items-center gap-2 overflow-x-auto text-[10px]">
                                    <span className="text-zinc-500 uppercase mr-2 font-bold">Variables:</span>
                                    {['{NAME}', '{PHONE}', '{{Deadline}}', '{{Tugas}}', '{TODAY}'].map(tag => (
                                        <button key={tag} onClick={() => insertText(tag)} className="px-2 py-1 bg-zinc-800 border border-zinc-700 text-blue-400 rounded hover:bg-zinc-700">{tag}</button>
                                    ))}
                                </div>
                            </div>
                        </section>
                    </div >

                    <div className="absolute bottom-0 left-0 right-0 p-6 bg-[#09090b]/95 backdrop-blur border-t border-zinc-800 z-30">
                        <button onClick={() => createMutation.mutate()} disabled={createMutation.isPending} className="w-full flex items-center justify-center gap-2 py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg shadow-lg disabled:opacity-50">
                            {createMutation.isPending ? 'Scheduling...' : 'Create Reminder'} <Save size={18} />
                        </button>
                    </div>
                </div >

                {/* --- Right Panel: Fixed Preview (40%) --- */}
                < div className="w-[40%] bg-[#0b141a] relative flex flex-col h-full border-l border-zinc-800" >
                    <div className="h-16 bg-[#202c33] flex items-center px-4 gap-3 border-b border-[#2a3942] z-10">
                        <div className="w-10 h-10 rounded-full bg-black/20 flex items-center justify-center overflow-hidden">
                            <img src="/brobot-logo.png" alt="BroBot" className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="text-[#e9edef] text-sm font-medium truncate">{formData.name || 'BroBot Assistant'}</div>
                            <div className="text-[#8696a0] text-xs">Business Account</div>
                        </div>
                        <Search size={20} className="text-[#aebac1]" />
                    </div>

                    <div className="flex-1 relative flex flex-col min-h-0">
                        <div className="absolute inset-0 bg-[url('https://static.whatsapp.net/rsrc.php/v3/yl/r/gi_DckOUM5a.png')] bg-repeat opacity-[0.06] pointer-events-none mix-blend-overlay"></div>
                        <div className="relative z-10 flex-1 p-6 flex flex-col justify-end gap-3 overflow-y-auto">
                            <div className="flex justify-center mb-4"><span className="bg-[#182229] text-[#8696a0] text-xs px-3 py-1.5 rounded-lg shadow-sm font-medium">TODAY</span></div>

                            <div className="self-start max-w-[90%] relative group animate-in slide-in-from-left-2">
                                <div className="bg-[#202c33] p-1 rounded-lg rounded-tl-none shadow border border-white/5 text-[#e9edef] text-sm relative min-w-[120px]">
                                    {/* Image Preview */}
                                    {formData.imagePreview && (
                                        <div className="mb-1 rounded-lg overflow-hidden">
                                            <img src={formData.imagePreview} alt="Attached" className="w-full h-auto object-cover max-h-60" />
                                        </div>
                                    )}

                                    <div className="px-2 pt-1 pb-6 whitespace-pre-wrap leading-relaxed">
                                        {/* Dynamic Preview Logic */}
                                        {(() => {
                                            let finalMsg = formData.message || '';

                                            // 1. Basic Variables
                                            finalMsg = finalMsg
                                                .replace(/{TODAY}/g, new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' }))
                                                .replace(/{NAME}/g, 'John Doe');

                                            // 2. Digest Loop Simulation
                                            if (formData.isDigestMode) {
                                                const loopRegex = /{{#LOOP}}([\s\S]*?){{\/LOOP}}/g;
                                                finalMsg = finalMsg.replace(loopRegex, (_, template) => {
                                                    // Simulate 3 items from csvPreview logic or fake data if empty
                                                    const mockData = formData.csvPreview.length > 0 ? formData.csvPreview.slice(0, 3) : ['Item 1', 'Item 2', 'Item 3'];

                                                    return mockData.map((row, i) => {
                                                        // Fallback parser: Split CSV by comma to find "Columns"
                                                        // Ideally we map {ColumnName} to actual Index.
                                                        // For simulation, we just return the template replaced with whole row or mock.

                                                        // If raw row is "Matkul, Deadline", and template is "{Matkul} - {Deadline}"
                                                        // We can't map accurately without headers.
                                                        // Simplification: Just replace {any} with random parts of the row.

                                                        let itemText = template;
                                                        const cols = row.split(',');
                                                        itemText = itemText.replace(/{.*?}/g, (match: string) => {
                                                            // Pick random column or just cleaned text
                                                            return cols[Math.floor(Math.random() * cols.length)]?.replace(/['"]/g, '').trim() || match
                                                        });
                                                        return itemText;
                                                    }).join('\n');
                                                });
                                            }

                                            return finalMsg || <span className="text-white/30 italic">This is a preview of your message...</span>
                                        })()}
                                    </div>
                                    <div className="absolute right-2 bottom-1 text-[10px] text-[#8696a0]">{formData.time}</div>
                                </div>
                                <div className="absolute top-0 -left-2 w-0 h-0 border-t-[10px] border-t-[#202c33] border-l-[10px] border-l-transparent transform scale-x-[-1]"></div>
                            </div>
                        </div>
                    </div>

                    <div className="h-[62px] bg-[#202c33] px-3 flex items-center gap-3 shrink-0 border-t border-[#2a3942] mt-auto relative z-20">
                        <Upload size={24} className="text-[#8696a0]" />
                        <div className="flex-1 bg-[#2a3942] rounded-lg h-9 px-3 flex items-center text-[#8696a0] text-sm">Type a message</div>
                        <div className="w-8 h-8 rounded-full bg-[#00a884] flex items-center justify-center text-white"><ArrowRight size={16} /></div>
                    </div>
                </div >
            </div >
        </div >
    )
}
