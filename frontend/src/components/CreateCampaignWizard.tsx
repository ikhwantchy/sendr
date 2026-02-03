'use client'

import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
    Calendar, Users, Clock, Save, Plus, X, Upload,
    FileText, Check, AlertCircle, ChevronRight, CheckCircle2,
    Database, Wand2, ChevronDown, ChevronUp, RefreshCw, Type,
    Bold, Italic, Image as ImageIcon, Smile, Globe,
    Strikethrough, Code, Search, ArrowRight, ArrowLeft, Lock, Eye, MessageSquare, Paperclip,
    Cat, Coffee, Dumbbell, Car, Lightbulb, Heart, Hand, Send, Trash2, ExternalLink,
    ChevronLeft, ShieldCheck, Zap, Activity, Edit, Maximize2, Minimize2
} from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { EMOJI_CATEGORIES } from '@/lib/emojiList'
import ContactTable, { ContactRow, ContactColumn, contactTableToParsedContacts, getContactTableVariables } from '@/components/ContactTable'
import Link from 'next/link'
import SharedMessageEditor, { formatWhatsAppText } from '@/components/SharedMessageEditor'
import ScheduleDateTimePicker from '@/components/pickers/ScheduleDateTimePicker'
import StyledNumberInput from '@/components/ui/StyledNumberInput'

// --- Types ---
type ContactMethod = 'manual' | 'csv' | 'sheet'

interface FormData {
    botId: string
    name: string
    contactMethod: ContactMethod
    manualContacts: string
    // New: Contact Table data
    tableContacts: ContactRow[]
    tableColumns: ContactColumn[]
    contactSheetUrl: string
    sheetName: string
    csvFile: File | null
    csvPreview: string[]
    csvCount: number
    sheetContactCount: number
    sheetPreviewContacts: any[]
    sheetVariables: string[]

    // Scheduling & Anti-Blocking
    isScheduled: boolean
    scheduledAt: string // ISO string or YYYY-MM-DDTHH:mm
    delay: number // seconds (average/target delay)
    delayMode: 'preset' | 'manual'
    delayPreset: 'safe' | 'normal' | 'fast'
    minDelay: number
    maxDelay: number
    batchSize: number
    batchPauseMin: number
    batchPauseMax: number

    // Content
    message: string
    imageFile: File | null
    imagePreview: string | null
}

// Storage key for contact table data
const CAMPAIGN_CONTACT_TABLE_STORAGE_KEY = 'campaign_contact_table_data'

interface CreateCampaignWizardProps {
    initialBotId?: string
    onClose: (newCampaignId?: string) => void
    campaignId?: string // Optional for edit mode if needed later
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
    'Smileys': <Smile size={18} />,
    'Gestures & People': <Hand size={18} />,
    'Animals & Nature': <Cat size={18} />,
    'Food & Drink': <Coffee size={18} />,
    'Activity': <Dumbbell size={18} />,
    'Objects': <Lightbulb size={18} />,
    'Travel & Places': <Car size={18} />,
    'Symbols': <Heart size={18} />,
}

const DELAY_PRESETS = {
    safe: {
        min: 30, max: 60,
        batchSize: 15, batchPauseMin: 60, batchPauseMax: 120,
        label: 'Safe (Maximum Security)', shortLabel: 'Safe', icon: ShieldCheck, color: 'text-emerald-400',
        desc: 'Human-paced. Long intervals & rest every 15 messages.'
    },
    normal: {
        min: 10, max: 20,
        batchSize: 30, batchPauseMin: 30, batchPauseMax: 60,
        label: 'Normal (Recommended)', shortLabel: 'Normal', icon: Activity, color: 'text-blue-400',
        desc: 'Best balance. Randomized delays & moderate rest.'
    },
    fast: {
        min: 3, max: 7,
        batchSize: 50, batchPauseMin: 10, batchPauseMax: 20,
        label: 'Fast (Established Accounts)', shortLabel: 'Fast', icon: Zap, color: 'text-amber-400',
        desc: 'Fast & efficient. Only use for trusted/aged numbers.'
    }
}



export default function CreateCampaignWizard({ initialBotId, onClose, campaignId }: CreateCampaignWizardProps) {
    const queryClient = useQueryClient()
    const [isEditorExpanded, setIsEditorExpanded] = useState(false)
    const textareaRef = useRef<HTMLDivElement>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Fetch bots for selection
    const { data: botsData } = useQuery({
        queryKey: ['bots'],
        queryFn: () => api.bots.list().then(res => res.data.data)
    })

    // Default Dates (Local Time for Input)
    const getLocalDatetimeString = (date: Date) => {
        const pad = (num: number) => String(num).padStart(2, '0');
        const year = date.getFullYear();
        const month = pad(date.getMonth() + 1);
        const day = pad(date.getDate());
        const hours = pad(date.getHours());
        const minutes = pad(date.getMinutes());
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    };

    const initialDate = new Date();
    initialDate.setMinutes(initialDate.getMinutes() + 5);
    const defaultScheduledAt = getLocalDatetimeString(initialDate);

    // UI State
    const [isContactPreviewOpen, setIsContactPreviewOpen] = useState(false)
    const [isPreviewOpen, setIsPreviewOpen] = useState(false) // Default: Hidden
    const [isFullImageOpen, setIsFullImageOpen] = useState(false)
    const [availableTabs, setAvailableTabs] = useState<Array<{ gid: string; name: string }>>([])
    const [isLoadingTabs, setIsLoadingTabs] = useState(false)

    // Form State
    const [formData, setFormData] = useState<FormData>({
        botId: initialBotId || '',
        name: '',
        contactMethod: 'manual',
        manualContacts: '',
        tableContacts: [],
        tableColumns: [
            { id: 'phone', name: 'Phone', required: true },
            { id: 'name', name: 'Name' }
        ],
        contactSheetUrl: '',
        sheetName: '',
        csvFile: null,
        csvPreview: [],
        csvCount: 0,
        sheetContactCount: 0,
        sheetPreviewContacts: [],
        sheetVariables: [],

        isScheduled: false,
        scheduledAt: defaultScheduledAt,
        delay: 15,
        delayMode: 'preset',
        delayPreset: 'normal',
        minDelay: 10,
        maxDelay: 20,
        batchSize: 30,
        batchPauseMin: 30,
        batchPauseMax: 60,

        message: '',
        imageFile: null,
        imagePreview: null
    })

    // Load contact table data from localStorage on mount
    useEffect(() => {
        const savedData = localStorage.getItem(CAMPAIGN_CONTACT_TABLE_STORAGE_KEY)
        if (savedData) {
            try {
                const saved = JSON.parse(savedData)
                if (saved) {
                    setFormData(prev => ({
                        ...prev,
                        tableContacts: saved.contacts || prev.tableContacts,
                        tableColumns: saved.columns || prev.tableColumns,
                        contactSheetUrl: saved.contactSheetUrl || prev.contactSheetUrl,
                        sheetName: saved.sheetName || prev.sheetName,
                        name: saved.name || prev.name,
                        message: saved.message || prev.message,
                        botId: saved.botId || prev.botId
                    }))
                }
            } catch (e) {
                console.error('Failed to load contact table data:', e)
            }
            // Clear after loading
            localStorage.removeItem(CAMPAIGN_CONTACT_TABLE_STORAGE_KEY)
        }
    }, [])

    // Update botId if initialBotId changes
    useEffect(() => {
        if (initialBotId && !formData.botId) {
            setFormData(prev => ({ ...prev, botId: initialBotId }))
        } else if (botsData && botsData.length > 0 && !formData.botId) {
            setFormData(prev => ({ ...prev, botId: botsData[0].id }))
        }
    }, [initialBotId, botsData])

    // Update delay when presets or manual ranges change
    useEffect(() => {
        if (formData.delayMode === 'preset') {
            const preset = DELAY_PRESETS[formData.delayPreset]
            const average = Math.floor((preset.min + preset.max) / 2)
            setFormData(prev => ({
                ...prev,
                minDelay: preset.min,
                maxDelay: preset.max,
                delay: average,
                batchSize: (preset as any).batchSize || 30,
                batchPauseMin: (preset as any).batchPauseMin || 30,
                batchPauseMax: (preset as any).batchPauseMax || 60
            }))
        } else {
            const average = Math.floor((formData.minDelay + formData.maxDelay) / 2)
            setFormData(prev => ({ ...prev, delay: average }))
        }
    }, [formData.delayMode, formData.delayPreset, formData.minDelay, formData.maxDelay])

    // Auto-detect tabs when Sheet URL changes
    useEffect(() => {
        const detectTabs = async () => {
            const url = formData.contactSheetUrl
            if (!url || formData.contactMethod !== 'sheet') {
                setAvailableTabs([])
                return
            }

            const match = url.match(/\/d\/([\w-]+)/)
            if (!match || !match[1]) {
                setAvailableTabs([])
                return
            }

            setIsLoadingTabs(true)
            try {
                const response = await api.sheets.getTabs(url)
                const data = response.data
                if (data.success && data.tabs && data.tabs.length > 0) {
                    setAvailableTabs(data.tabs)
                    const initialTab = data.tabs[0].name
                    if (!formData.sheetName) {
                        setFormData(prev => ({ ...prev, sheetName: initialTab }))
                    }

                    // Also trigger a preview fetch
                    fetchSheetPreview(url, formData.sheetName || initialTab)
                } else {
                    setAvailableTabs([])
                }
            } catch (error) {
                console.error('Tab detection error:', error)
                setAvailableTabs([])
            } finally {
                setIsLoadingTabs(false)
            }
        }

        const timeoutId = setTimeout(detectTabs, 1000)
        return () => clearTimeout(timeoutId)
    }, [formData.contactSheetUrl, formData.contactMethod])

    const fetchSheetPreview = async (url: string, tab: string) => {
        if (!url || !tab) return
        try {
            const token = localStorage.getItem('token')
            const response = await fetch('http://localhost:3001/api/campaigns/preview-contacts', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    source: 'sheets',
                    sheets_url: url,
                    sheets_tab: tab
                })
            })
            const result = await response.json()
            if (result.success) {
                setFormData(prev => ({
                    ...prev,
                    sheetPreviewContacts: result.data.preview,
                    sheetContactCount: result.data.total,
                    sheetVariables: result.data.columns
                }))
            }
        } catch (error) {
            console.error('Failed to fetch sheet preview:', error)
        }
    }

    // Effect to fetch preview when tab changes
    useEffect(() => {
        if (formData.contactMethod === 'sheet' && formData.contactSheetUrl && formData.sheetName) {
            fetchSheetPreview(formData.contactSheetUrl, formData.sheetName)
        }
    }, [formData.sheetName])

    const importSheetToManual = async () => {
        if (!formData.contactSheetUrl || !formData.sheetName) return;

        try {
            toast.loading('Importing contacts from sheet...', { id: 'sheet-import' });
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:3001/api/campaigns/preview-contacts', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    source: 'sheets',
                    sheets_url: formData.contactSheetUrl,
                    sheets_tab: formData.sheetName,
                    limit: 1000 // Import all (or a reasonable limit)
                })
            });

            const result = await response.json();
            if (result.success && result.data.preview) {
                const sheetContacts = result.data.preview;
                const headers = result.data.columns;

                // 1. Map columns
                const newColumns: ContactColumn[] = headers.map((h: string) => {
                    const lh = h.toLowerCase();
                    if (lh === 'phone' || lh === 'nomor' || lh === 'no') return { id: 'phone', name: h, required: true };
                    if (lh === 'name' || lh === 'nama') return { id: 'name', name: h };
                    return { id: h.toLowerCase().replace(/[^a-z0-9]/g, '_'), name: h };
                });

                // Ensure phone exists
                if (!newColumns.find(c => c.id === 'phone')) {
                    newColumns.unshift({ id: 'phone', name: 'Phone', required: true });
                }

                // 2. Map contacts
                const newTableContacts: ContactRow[] = sheetContacts.map((c: any, idx: number) => {
                    const row: ContactRow = {
                        id: `row-${idx}-${Date.now()}`,
                        phone: ''
                    };

                    // Map values based on header keys
                    Object.entries(c).forEach(([key, val]) => {
                        const col = newColumns.find(col => col.name.toLowerCase() === key.toLowerCase());
                        if (col) {
                            row[col.id] = String(val || '');
                        }
                    });

                    return row;
                });

                setFormData(prev => ({
                    ...prev,
                    contactMethod: 'manual',
                    tableColumns: newColumns,
                    tableContacts: newTableContacts
                }));

                toast.success(`Successfully imported ${newTableContacts.length} contacts!`, { id: 'sheet-import' });
            } else {
                throw new Error(result.error || 'Failed to import contacts');
            }
        } catch (error: any) {
            console.error('Sheet import error:', error);
            toast.error(error.message || 'Failed to import contacts', { id: 'sheet-import' });
        }
    }





    // --- Mutation ---
    const createMutation = useMutation({
        mutationFn: async () => {
            let contacts: Array<{ phone: string, name: string, [key: string]: string }> = []

            if (formData.contactMethod === 'manual') {
                // Use ContactTable data
                contacts = contactTableToParsedContacts(formData.tableContacts, formData.tableColumns)
            }
            // If contactMethod is 'sheet', we send the URL and let backend fetch it correctly

            if (formData.contactMethod === 'manual' && contacts.length === 0) throw new Error('No contacts found')

            const payload = {
                bot_id: formData.botId,
                name: formData.name,
                message_template: formData.message,
                contact_source: formData.contactMethod === 'sheet' ? 'sheets' : 'manual',
                contacts: formData.contactMethod === 'manual' ? contacts : undefined,
                sheets_url: formData.contactMethod === 'sheet' ? formData.contactSheetUrl : undefined,
                sheets_tab: formData.contactMethod === 'sheet' ? formData.sheetName : undefined,
                delay_preset: formData.delayMode === 'preset' ? formData.delayPreset : 'custom',
                custom_delay_config: {
                    minDelay: formData.minDelay,
                    maxDelay: formData.maxDelay,
                    batchSize: formData.batchSize,
                    batchPauseMin: formData.batchPauseMin,
                    batchPauseMax: formData.batchPauseMax,
                    dailyLimit: 1000
                },
                image_url: formData.imagePreview || undefined,
                scheduled_at: formData.isScheduled ? new Date(formData.scheduledAt).toISOString() : undefined,
                start_immediately: !formData.isScheduled
            }

            const token = localStorage.getItem('token')
            const response = await fetch('http://localhost:3001/api/campaigns', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            })

            const result = await response.json()
            if (!result.success) throw new Error(result.error || 'Failed to create campaign')
            return result
        },
        onSuccess: (result: any) => {
            queryClient.invalidateQueries({ queryKey: ['campaigns'] })
            toast.success('Campaign created successfully!')
            // Pass the new campaign ID to handle redirect to status
            onClose(result.data?.id)
        },
        onError: (err: any) => {
            toast.error(err.message)
        }
    })

    // --- Derived State for Preview ---
    const getPreviewContactName = (): string => {
        if (formData.contactMethod === 'manual') {
            const firstContact = formData.tableContacts.find(c => c.phone?.trim())
            if (firstContact) {
                const nameCol = formData.tableColumns.find(col =>
                    col.id !== 'phone' && col.name.toLowerCase().includes('name')
                ) || formData.tableColumns.find(col => col.id !== 'phone')

                if (nameCol && firstContact[nameCol.id]?.trim()) {
                    return firstContact[nameCol.id]
                }
            }
        }
        if (formData.contactMethod === 'sheet' && formData.sheetPreviewContacts?.length > 0) {
            const first = formData.sheetPreviewContacts[0]
            // Look for any key that contains 'name' or 'nama' (Indonesian) or 'penerima'
            const nameKey = Object.keys(first).find(k => {
                const lk = k.toLowerCase();
                return lk.includes('name') || lk.includes('nama') || lk.includes('penerima') || lk.includes('customer');
            });
            if (nameKey && first[nameKey]) return String(first[nameKey]);

            return first.name || first.nama || first.contact || Object.values(first)[1] || 'Contact Name'
        }
        if (formData.sheetContactCount > 0) return 'Customer Name'
        return '{NAME}'
    }

    const getPreviewReplacements = (): Record<string, string> => {
        const replacements: Record<string, string> = {}
        if (formData.contactMethod === 'manual') {
            const firstContact = formData.tableContacts.find(c => c.phone?.trim())
            if (firstContact) {
                if (firstContact.phone) replacements['phone'] = firstContact.phone
                formData.tableColumns.forEach(col => {
                    if (col.id !== 'phone') {
                        const value = firstContact[col.id]?.trim() || ''
                        if (value) replacements[col.name.toLowerCase()] = value
                    }
                })
            }
        } else if (formData.contactMethod === 'sheet' && formData.sheetPreviewContacts?.length > 0) {
            const first = formData.sheetPreviewContacts[0]
            Object.entries(first).forEach(([key, value]) => {
                if (value) replacements[key.toLowerCase()] = String(value)
            })
        }
        return replacements
    }



    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            const reader = new FileReader()
            reader.onloadend = () => {
                setFormData({ ...formData, imageFile: file, imagePreview: reader.result as string })
            }
            reader.readAsDataURL(file)
        }
    }

    const SectionHeader = ({ title, desc, step }: { title: string, desc: string, step?: number }) => (
        <div className={desc ? "mb-6" : "mb-4"}>
            <div className="flex items-center gap-3 mb-2">
                {step && (
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 font-bold text-sm shrink-0">
                        {step}
                    </div>
                )}
                <h3 className="text-lg font-semibold text-white">{title}</h3>
            </div>
            {desc && <p className="text-sm text-zinc-500 ml-11">{desc}</p>}
        </div>
    )

    return (
        <div className="fixed inset-0 z-[100] bg-black flex transition-all duration-500">
            {/* Left Panel: Scrollable Form */}
            <div className="flex-1 flex flex-col h-full border-r border-zinc-800 relative bg-black overflow-hidden">
                {/* Header */}
                <div className="shrink-0 bg-black/95 backdrop-blur-sm z-20 border-b border-zinc-800">
                    <div className="max-w-6xl mx-auto px-6 py-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <button onClick={() => onClose()} className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors group">
                                    <ChevronLeft size={20} className="transition-transform duration-300 group-hover:-translate-x-1" />
                                </button>
                                <div>
                                    <h1 className="text-xl font-semibold text-white">Create Campaign</h1>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setIsPreviewOpen(!isPreviewOpen)}
                                    className={`hidden lg:flex items-center gap-2 px-4 py-2 text-sm border rounded-lg font-medium transition-all group ${isPreviewOpen
                                        ? 'bg-zinc-800 border-zinc-700 text-white'
                                        : 'border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-600'
                                        }`}
                                >
                                    <Eye size={16} className="transition-transform duration-300 group-hover:scale-110" />
                                    Preview
                                </button>
                                <button
                                    onClick={() => createMutation.mutate()}
                                    disabled={createMutation.isPending || !formData.name || !formData.message || !formData.botId}
                                    className="flex items-center gap-2 px-5 py-2 text-sm bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg disabled:opacity-50 transition-all shadow-lg shadow-blue-500/20 group"
                                >
                                    <Send size={16} className={`transition-transform duration-300 ${createMutation.isPending ? 'animate-pulse' : 'group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:rotate-[-10deg]'}`} />
                                    {createMutation.isPending ? 'Launching...' : 'Launch Campaign'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto px-6 lg:px-12 py-8 pb-24 lg:pb-8 scroll-smooth">
                    <div className="max-w-3xl mx-auto space-y-8">
                        {/* 1. Basic Details */}
                        <section className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 hover:border-zinc-700/50 transition-colors">
                            <SectionHeader step={1} title="Campaign Name" desc="" />
                            <input
                                type="text"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-white text-xs placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                                placeholder="e.g. Ramadhan Promo Batch 1"
                                required
                            />
                        </section>

                        {/* 2. Recipients */}
                        <section className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 hover:border-zinc-700/50 transition-colors">
                            <SectionHeader step={2} title="Target Audience" desc="" />
                            <div className="flex bg-zinc-800/50 p-1 rounded-lg border border-zinc-700 w-fit mb-6">
                                {[
                                    { id: 'manual', label: 'Manual Input', icon: MessageSquare },
                                    { id: 'sheet', label: 'Google Sheets', icon: Database }
                                ].map(m => (
                                    <button
                                        key={m.id}
                                        onClick={() => setFormData({ ...formData, contactMethod: m.id as any })}
                                        className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-all group ${formData.contactMethod === m.id ? 'bg-blue-600 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'}`}
                                    >
                                        <m.icon size={14} className="transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6" /> {m.label}
                                    </button>
                                ))}
                            </div>

                            {formData.contactMethod === 'manual' && (
                                <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                                    <ContactTable
                                        contacts={formData.tableContacts}
                                        columns={formData.tableColumns}
                                        onChange={(contacts, columns) => setFormData({ ...formData, tableContacts: contacts, tableColumns: columns })}
                                    />
                                    <Link
                                        href="/dashboard/campaigns/create/contacts"
                                        onClick={() => {
                                            localStorage.setItem(CAMPAIGN_CONTACT_TABLE_STORAGE_KEY, JSON.stringify({
                                                contacts: formData.tableContacts,
                                                columns: formData.tableColumns,
                                                contactSheetUrl: formData.contactSheetUrl,
                                                sheetName: formData.sheetName,
                                                name: formData.name,
                                                message: formData.message,
                                                botId: formData.botId
                                            }))
                                        }}
                                        className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors group"
                                    >
                                        Open full page editor <ExternalLink size={12} className="transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                                    </Link>
                                </div>
                            )}

                            {formData.contactMethod === 'sheet' && (
                                <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                                    <div>
                                        <label className="block text-xs font-medium text-zinc-400 mb-1">Google Sheets URL</label>
                                        <input
                                            type="url"
                                            value={formData.contactSheetUrl}
                                            onChange={e => setFormData({ ...formData, contactSheetUrl: e.target.value })}
                                            placeholder="https://docs.google.com/spreadsheets/d/..."
                                            className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-white text-xs placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                                        />
                                    </div>
                                    <div className="flex gap-4">
                                        <div className="flex-1">
                                            <label className="block text-xs font-medium text-zinc-400 mb-1">Select Tab</label>
                                            <div className="relative">
                                                <select
                                                    value={formData.sheetName}
                                                    onChange={e => setFormData({ ...formData, sheetName: e.target.value })}
                                                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-white text-xs outline-none appearance-none cursor-pointer focus:ring-1 focus:ring-blue-500"
                                                >
                                                    {availableTabs.map(t => <option key={t.gid} value={t.name}>{t.name}</option>)}
                                                    {availableTabs.length === 0 && <option value="">{isLoadingTabs ? 'Auto-detecting tabs...' : 'Paste URL to detect tabs'}</option>}
                                                </select>
                                                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" size={16} />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-3 px-1">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-1.5 opacity-60">
                                                <AlertCircle size={12} className="text-zinc-500" />
                                                <span className="text-[10px] text-zinc-500 italic">Make sure your sheet is "Public" or shared with "Anyone with the link can view"</span>
                                            </div>
                                            {formData.sheetContactCount > 0 && (
                                                <div className="flex items-center gap-1.5 bg-emerald-500/5 px-2 py-0.5 rounded border border-emerald-500/10">
                                                    <div className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse" />
                                                    <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-tighter">{formData.sheetContactCount} Contacts Found</span>
                                                </div>
                                            )}
                                        </div>

                                        {formData.sheetContactCount > 0 && (
                                            <button
                                                type="button"
                                                onClick={importSheetToManual}
                                                className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors w-fit transition-colors group"
                                            >
                                                Edit in Manual Table <ExternalLink size={12} className="transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </section>

                        {/* 3. Sending Speed */}
                        <section className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 hover:border-zinc-700/50 transition-colors">
                            <SectionHeader step={3} title="Sending Speed" desc="" />
                            <div className="space-y-4">
                                {/* Anti-Spam Strategy */}
                                <div className="space-y-4">
                                    <div className="flex bg-zinc-800/50 p-1 rounded-lg border border-zinc-700 w-fit">
                                        <button
                                            onClick={() => setFormData({ ...formData, delayMode: 'preset' })}
                                            className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${formData.delayMode === 'preset' ? 'bg-zinc-700 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
                                        >
                                            PRESETS
                                        </button>
                                        <button
                                            onClick={() => setFormData({ ...formData, delayMode: 'manual' })}
                                            className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${formData.delayMode === 'manual' ? 'bg-zinc-700 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
                                        >
                                            CUSTOM
                                        </button>
                                    </div>

                                    {formData.delayMode === 'preset' ? (
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                            {(Object.entries(DELAY_PRESETS) as [keyof typeof DELAY_PRESETS, any][]).map(([key, config]) => (
                                                <button
                                                    key={key}
                                                    onClick={() => setFormData({ ...formData, delayPreset: key as any })}
                                                    className={`relative p-4 rounded-xl border text-left transition-all group ${formData.delayPreset === key ? 'bg-blue-600/5 border-blue-500 ring-1 ring-blue-500' : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700'}`}
                                                    title={config.desc}
                                                >
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <config.icon size={16} className={`transition-transform duration-300 group-hover:rotate-12 group-hover:scale-110 ${formData.delayPreset === key ? 'text-blue-400' : config.color}`} />
                                                        <span className="text-sm font-bold text-white">{config.shortLabel}</span>
                                                    </div>
                                                    <div className="text-[11px] text-zinc-500 font-medium">{config.min}-{config.max}s delay</div>
                                                    {/* Tooltip on hover */}
                                                    <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-[10px] text-zinc-300 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10 shadow-lg">
                                                        {config.desc}
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="space-y-5 animate-in fade-in slide-in-from-top-2">
                                            {/* Primary Delay Range */}
                                            <div className="grid grid-cols-2 gap-4">
                                                <StyledNumberInput
                                                    label="Min Delay (Sec)"
                                                    value={formData.minDelay}
                                                    onChange={(val) => setFormData({ ...formData, minDelay: val })}
                                                    min={1}
                                                    max={formData.maxDelay - 1}
                                                />
                                                <StyledNumberInput
                                                    label="Max Delay (Sec)"
                                                    value={formData.maxDelay}
                                                    onChange={(val) => setFormData({ ...formData, maxDelay: val })}
                                                    min={formData.minDelay + 1}
                                                    max={300}
                                                />
                                            </div>

                                            {/* Batch/Rest Period */}
                                            <div>
                                                <div className="flex items-center gap-2 mb-3">
                                                    <Coffee size={14} className="text-blue-400" />
                                                    <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-widest">Rest Period</h4>
                                                </div>
                                                <div className="grid grid-cols-3 gap-3">
                                                    <StyledNumberInput
                                                        label="Rest After (Messages)"
                                                        value={formData.batchSize}
                                                        onChange={(val) => setFormData({ ...formData, batchSize: val })}
                                                        min={1}
                                                        max={100}
                                                    />
                                                    <StyledNumberInput
                                                        label="Min Rest (s)"
                                                        value={formData.batchPauseMin}
                                                        onChange={(val) => setFormData({ ...formData, batchPauseMin: val })}
                                                        min={1}
                                                        max={formData.batchPauseMax - 1}
                                                    />
                                                    <StyledNumberInput
                                                        label="Max Rest (s)"
                                                        value={formData.batchPauseMax}
                                                        onChange={(val) => setFormData({ ...formData, batchPauseMax: val })}
                                                        min={formData.batchPauseMin + 1}
                                                        max={600}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </section>

                        {/* 4. Scheduling */}
                        <section className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 hover:border-zinc-700/50 transition-colors">
                            <SectionHeader step={4} title="Schedule" desc="" />
                            <div className="space-y-4">
                                <div className="flex bg-zinc-800/50 p-1 rounded-lg border border-zinc-700 w-fit">
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, isScheduled: false })}
                                        className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-all group ${!formData.isScheduled ? 'bg-blue-600 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'}`}
                                    >
                                        <Send size={14} /> Launch Now
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, isScheduled: true })}
                                        className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-all group ${formData.isScheduled ? 'bg-blue-600 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'}`}
                                    >
                                        <Calendar size={14} /> Schedule
                                    </button>
                                </div>
                                {formData.isScheduled && (
                                    <div className="animate-in fade-in slide-in-from-top-2">
                                        <ScheduleDateTimePicker
                                            value={formData.scheduledAt}
                                            onChange={(val) => setFormData({ ...formData, scheduledAt: val })}
                                        />
                                    </div>
                                )}
                            </div>
                        </section>

                        {/* 5. Message Content */}
                        <section className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 hover:border-zinc-700/50 transition-colors mb-20">
                            <SectionHeader step={5} title="Message Content" desc="" />

                            {/* Message editor will go here, media attachment moved below */}


                            {/* Rich Text Editor */}
                            {/* Backdrop when expanded */}
                            {/* Rich Text Editor - DUAL MODE (Inline + Modal) */}
                            <div className="relative">
                                {/* 1. Inline Editor (Always there, keeping layout stable) */}
                                <SharedMessageEditor
                                    value={formData.message}
                                    onChange={(val) => setFormData({ ...formData, message: val })}
                                    variables={formData.contactMethod === 'manual' ? getContactTableVariables(formData.tableColumns) : formData.sheetVariables}
                                    isExpanded={false}
                                    onToggleExpand={() => setIsEditorExpanded(true)}
                                />

                                {/* 2. Modal Editor (Only when Expanded) */}
                                {isEditorExpanded && (
                                    <>
                                        <div
                                            className="fixed inset-0 z-[150] bg-black/90 backdrop-blur-sm animate-in fade-in duration-300"
                                            onClick={() => setIsEditorExpanded(false)}
                                        />
                                        <div className="fixed top-[5vh] bottom-[5vh] left-1/2 -translate-x-1/2 w-[95vw] max-w-5xl z-[200] flex flex-col animate-in zoom-in-95 duration-300">
                                            <SharedMessageEditor
                                                value={formData.message}
                                                onChange={(val) => setFormData({ ...formData, message: val })}
                                                variables={formData.contactMethod === 'manual' ? getContactTableVariables(formData.tableColumns) : formData.sheetVariables}
                                                isExpanded={true}
                                                onToggleExpand={() => setIsEditorExpanded(false)}
                                            />
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Image Attachment - COMPACT VERSION */}
                            <div className="mt-4">
                                {!formData.imagePreview ? (
                                    <label className="flex items-center justify-center gap-3 w-full py-4 bg-zinc-900/30 border-2 border-dashed border-zinc-800 rounded-2xl cursor-pointer hover:bg-zinc-900/50 transition-all group hover:border-blue-500/40">
                                        <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center group-hover:bg-blue-500/10 transition-colors">
                                            <ImageIcon size={20} className="text-zinc-500 group-hover:text-blue-500 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-[-10deg]" />
                                        </div>
                                        <div className="text-left">
                                            <span className="text-sm font-bold text-zinc-300 group-hover:text-white block">Attach Media</span>
                                            <span className="text-[10px] text-zinc-500 uppercase tracking-tighter">Images, flyers, or promo banners</span>
                                        </div>
                                        <input type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
                                    </label>
                                ) : (
                                    <div className="flex items-center justify-between p-4 bg-zinc-950 border border-zinc-800 rounded-2xl group animate-in slide-in-from-top-2 duration-300">
                                        <div className="flex items-center gap-4">
                                            <div
                                                className="w-14 h-14 rounded-xl border border-zinc-800 overflow-hidden cursor-pointer hover:border-blue-500/50 transition-colors shrink-0"
                                                onClick={() => setIsFullImageOpen(true)}
                                            >
                                                <img src={formData.imagePreview} className="w-full h-full object-cover" />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2 mb-0.5">
                                                    <div className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 text-[9px] font-bold rounded uppercase tracking-wider border border-emerald-500/20">Media Attached</div>
                                                    <span className="text-xs font-bold text-zinc-300">Image file selected</span>
                                                </div>
                                                <p className="text-[10px] text-zinc-500">This media will be sent as a caption to your message.</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setIsFullImageOpen(true)}
                                                className="flex items-center gap-2 px-3 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-lg text-xs font-bold transition-all border border-zinc-800 focus:ring-2 focus:ring-blue-500/20"
                                            >
                                                <Eye size={14} />
                                                Full View
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setFormData({ ...formData, imageFile: null, imagePreview: null })}
                                                className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                                                title="Remove media"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </section>
                    </div>
                </div>
            </div>

            {/* Right Panel: WhatsApp Preview */}
            {isPreviewOpen && (
                <div className="hidden lg:flex w-[380px] xl:w-[420px] bg-[#0d0d0f] flex-col h-full relative overflow-hidden border-l border-zinc-800 animate-in slide-in-from-right-5 duration-300">
                    {/* Dark Mode BG Pattern */}
                    <div className="absolute inset-0 bg-[url('https://w0.peakpx.com/wallpaper/818/148/HD-wallpaper-whatsapp-background-dark-mode-whatsapp-background.jpg')] opacity-10 bg-repeat bg-center" />

                    <div className="relative h-full flex flex-col">
                        <div className="h-16 flex items-center px-6 gap-4 border-b border-white/5 bg-[#0d0d0f]/80 backdrop-blur-xl z-10">
                            <div className="w-10 h-10 rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center text-zinc-400 font-bold overflow-hidden shadow-inner uppercase">
                                {formData.name ? formData.name.substring(0, 2) : 'BC'}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-white font-bold text-sm tracking-tight truncate">{formData.name || 'Campaign Preview'}</div>
                                <div className="text-emerald-500 text-[10px] font-bold flex items-center gap-1">
                                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                                    active preview
                                </div>
                            </div>
                            <X
                                className="text-zinc-500 hover:text-white cursor-pointer transition-all hover:rotate-90 hover:scale-110"
                                size={18}
                                onClick={() => setIsPreviewOpen(false)}
                            />
                        </div>

                        <div className="flex-1 p-6 flex flex-col justify-end overflow-y-auto custom-scrollbar pb-10 gap-4">
                            <div className="bg-[#1f2c33] rounded-2xl rounded-tr-sm p-3.5 max-w-[90%] shadow-2xl animate-in slide-in-from-bottom-4 duration-300 border border-white/5 relative self-start">
                                {/* Triangle arrow for chat bubble */}
                                <div className="absolute top-0 -left-1.5 w-3 h-3 bg-[#1f2c33] rotate-45 border-l border-t border-white/5 rounded-sm" />

                                {formData.imagePreview && (
                                    <div className="mb-3 rounded-xl overflow-hidden shadow-lg border border-white/5 bg-zinc-900">
                                        <img src={formData.imagePreview} className="w-full aspect-square object-cover" alt="Campaign media" />
                                    </div>
                                )}
                                <div className="text-zinc-100 text-[14px] whitespace-pre-wrap leading-relaxed font-sans relative z-10">
                                    {(() => {
                                        let msg = formData.message || 'Your message preview will appear here...';

                                        const replacements = getPreviewReplacements();
                                        const nameVal = getPreviewContactName();

                                        // 1. Handle pattern: {{var}}
                                        msg = msg.replace(/\{\{([^}]+)\}\}/g, (match, varName) => {
                                            const key = varName.trim().toLowerCase();
                                            if (key === 'nama' || key === 'name') return nameVal;
                                            return replacements[key] !== undefined ? replacements[key] : match;
                                        });

                                        // 2. Handle pattern: [var]
                                        msg = msg.replace(/\[([^\]]+)\]/g, (match, varName) => {
                                            const key = varName.trim().toLowerCase();
                                            if (key === 'nama' || key === 'name') return nameVal;
                                            return replacements[key] !== undefined ? replacements[key] : match;
                                        });

                                        // 3. Handle pattern: {var}
                                        msg = msg.replace(/\{([^{}]+)\}/g, (match, varName) => {
                                            const key = varName.trim().toLowerCase();
                                            if (key === 'nama' || key === 'name') return nameVal;
                                            return replacements[key] !== undefined ? replacements[key] : match;
                                        });

                                        return <div dangerouslySetInnerHTML={{ __html: formatWhatsAppText(msg) }} />;
                                    })()}
                                </div>
                                <div className="mt-1 flex items-center justify-end gap-1 opacity-60">
                                    <span className="text-[10px] text-zinc-300 font-medium">
                                        {new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: true })}
                                    </span>
                                    <div className="flex -space-x-1 translate-y-[1px]">
                                        <Check size={11} className="text-blue-500" />
                                        <Check size={11} className="text-blue-500" />
                                    </div>
                                </div>
                            </div>

                            {/* Device Mockup Decor */}
                            <div className="mt-6 mx-auto w-32 h-1 bg-zinc-800 rounded-full opacity-30 shrink-0" />
                        </div>
                    </div>
                </div>
            )}
            {/* Full Image Lightbox */}
            {isFullImageOpen && formData.imagePreview && (
                <div
                    className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 lg:p-12 animate-in fade-in duration-300"
                    onClick={() => setIsFullImageOpen(false)}
                >
                    <button
                        className="absolute top-6 right-6 p-3 bg-zinc-900/50 hover:bg-zinc-800 rounded-full text-white transition-all border border-white/10 group"
                        onClick={() => setIsFullImageOpen(false)}
                    >
                        <X size={24} className="transition-transform duration-300 group-hover:rotate-90 group-hover:scale-110" />
                    </button>
                    <img
                        src={formData.imagePreview}
                        className="max-w-full max-h-full object-contain rounded-lg shadow-2xl animate-in zoom-in-95 duration-300"
                        alt="Full Preview"
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            )}
        </div>
    )
}
