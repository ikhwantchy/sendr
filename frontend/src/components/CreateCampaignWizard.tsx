'use client'

import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
    Calendar, Users, Clock, Save, Plus, X, Upload,
    FileText, Check, AlertCircle, ChevronRight, CheckCircle2,
    Database, Wand2, ChevronDown, ChevronUp, RefreshCw, Type,
    Bold, Italic, Image as ImageIcon, Smile, Globe,
    Strikethrough, Code, Search, ArrowRight, Lock, Eye, MessageSquare, Paperclip,
    Cat, Coffee, Dumbbell, Car, Lightbulb, Heart, Hand, Send, Trash2
} from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { EMOJI_CATEGORIES } from '@/lib/emojiList'

// --- Types ---
type ContactMethod = 'manual' | 'csv' | 'sheet'

interface FormData {
    botId: string
    name: string
    contactMethod: ContactMethod
    manualContacts: string
    contactSheetUrl: string
    sheetName: string
    csvFile: File | null
    csvPreview: string[]
    csvCount: number
    sheetContactCount: number

    // Scheduling & Anti-Blocking
    isScheduled: boolean
    scheduledAt: string // ISO string or YYYY-MM-DDTHH:mm
    delay: number // seconds

    // Content
    message: string
    imageFile: File | null
    imagePreview: string | null
}

interface CreateCampaignWizardProps {
    initialBotId?: string
    onClose: () => void
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

export default function CreateCampaignWizard({ initialBotId, onClose, campaignId }: CreateCampaignWizardProps) {
    const queryClient = useQueryClient()
    const textareaRef = useRef<HTMLDivElement>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const isTypingRef = useRef(false)

    // Fetch bots for selection
    const { data: botsData } = useQuery({
        queryKey: ['bots'],
        queryFn: () => api.bots.list().then(res => res.data.data)
    })

    // Default Dates
    const now = new Date();
    now.setMinutes(now.getMinutes() + 5); // Default 5 mins from now
    const defaultScheduledAt = now.toISOString().slice(0, 16);

    // UI State
    const [isContactPreviewOpen, setIsContactPreviewOpen] = useState(false)
    const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false)
    const [activeEmojiCategory, setActiveEmojiCategory] = useState<keyof typeof EMOJI_CATEGORIES>('Smileys')
    const [availableTabs, setAvailableTabs] = useState<Array<{ gid: string; name: string }>>([])
    const [isLoadingTabs, setIsLoadingTabs] = useState(false)
    const emojiPickerRef = useRef<HTMLDivElement>(null)
    const emojiTriggerRef = useRef<HTMLButtonElement>(null)

    // Form State
    const [formData, setFormData] = useState<FormData>({
        botId: initialBotId || '',
        name: '',
        contactMethod: 'manual',
        manualContacts: '',
        contactSheetUrl: '',
        sheetName: '',
        csvFile: null,
        csvPreview: [],
        csvCount: 0,
        sheetContactCount: 0,

        isScheduled: false,
        scheduledAt: defaultScheduledAt,
        delay: 5, // Default 5 seconds between messages

        message: '',
        imageFile: null,
        imagePreview: null
    })

    // Update botId if initialBotId changes
    useEffect(() => {
        if (initialBotId && !formData.botId) {
            setFormData(prev => ({ ...prev, botId: initialBotId }))
        } else if (botsData && botsData.length > 0 && !formData.botId) {
            setFormData(prev => ({ ...prev, botId: botsData[0].id }))
        }
    }, [initialBotId, botsData])

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
                    if (!formData.sheetName) {
                        setFormData(prev => ({ ...prev, sheetName: data.tabs[0].name }))
                    }
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

        const timeoutId = setTimeout(detectTabs, 800)
        return () => clearTimeout(timeoutId)
    }, [formData.contactSheetUrl, formData.contactMethod])

    // Close emoji picker when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (
                emojiPickerRef.current &&
                !emojiPickerRef.current.contains(event.target as Node) &&
                emojiTriggerRef.current &&
                !emojiTriggerRef.current.contains(event.target as Node)
            ) {
                setIsEmojiPickerOpen(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [])

    // Sync markdown to contentEditable
    useEffect(() => {
        if (textareaRef.current && !isTypingRef.current) {
            const currentMD = htmlToMarkdown(textareaRef.current);
            if (currentMD !== formData.message) {
                textareaRef.current.innerHTML = markdownToHtml(formData.message);
            }
        }
    }, [formData.message])

    // Set initial content
    useEffect(() => {
        if (textareaRef.current && !textareaRef.current.innerHTML) {
            textareaRef.current.innerHTML = markdownToHtml(formData.message) || '<br>';
        }
    }, [])

    // --- Mutation ---
    const createMutation = useMutation({
        mutationFn: async () => {
            let contacts: Array<{ phone: string, name: string }> = []

            if (formData.contactMethod === 'manual') {
                contacts = formData.manualContacts
                    .split('\n')
                    .filter(l => l.trim().length > 0)
                    .map(line => {
                        const parts = line.split(/[,\s]+/)
                        return {
                            phone: parts[0].trim(),
                            name: parts.slice(1).join(' ').trim() || ''
                        }
                    })
            } else if (formData.contactMethod === 'sheet') {
                // Fetch contacts from sheet
                const url = formData.contactSheetUrl
                const match = url.match(/\/d\/(.*?)(\/|$)/)
                if (!match) throw new Error('Invalid Google Sheets URL')
                const sheetId = match[1]
                const sheetParam = formData.sheetName ? `&sheet=${encodeURIComponent(formData.sheetName)}` : ''
                const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv${sheetParam}`

                const res = await fetch(csvUrl)
                const text = await res.text()
                const lines = text.split('\n')
                    .map(row => row.replace(/^"|"$/g, '').replace(/""/g, '"'))
                    .filter(l => l.trim().length > 0)

                // Heuristic: First line is header if it contains 'nama' or 'phone' or 'wa'
                const header = lines[0].toLowerCase()
                let dataLines = lines
                let nameIdx = -1
                let phoneIdx = -1

                if (header.includes('nama') || header.includes('name') || header.includes('phone') || header.includes('wa') || header.includes('telp')) {
                    const cols = lines[0].split(',')
                    nameIdx = cols.findIndex(c => c.toLowerCase().includes('name') || c.toLowerCase().includes('nama'))
                    phoneIdx = cols.findIndex(c => c.toLowerCase().includes('phone') || c.toLowerCase().includes('telp') || c.toLowerCase().includes('wa'))
                    dataLines = lines.slice(1)
                }

                contacts = dataLines.map(line => {
                    const cols = line.split(',')
                    return {
                        phone: phoneIdx !== -1 ? cols[phoneIdx]?.trim() : cols[0]?.trim(),
                        name: nameIdx !== -1 ? cols[nameIdx]?.trim() : (cols.length > 1 ? cols[1]?.trim() : '')
                    }
                }).filter(c => c.phone)
            } else if (formData.contactMethod === 'csv' && formData.csvFile) {
                // Should handle file reading here, but for now we skip for brevity
                // or assume contacts were already parsed in csvPreview logic
                throw new Error('CSV file upload not fully implemented in this wizard yet')
            }

            if (contacts.length === 0) throw new Error('No contacts found')

            const payload = {
                bot_id: formData.botId,
                name: formData.name,
                message_template: formData.message,
                target_type: 'specific',
                target_contacts: contacts,
                delay: formData.delay,
                image_url: formData.imagePreview || undefined,
                scheduled_at: formData.isScheduled ? formData.scheduledAt : undefined
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
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['campaigns'] })
            toast.success('Campaign created successfully!')
            onClose()
        },
        onError: (err: any) => {
            toast.error(err.message)
        }
    })

    // --- Helpers ---
    const markdownToHtml = (text: string) => {
        if (!text) return '';
        let html = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        html = html.replace(/\*([^\*]+)\*/g, '<b>$1</b>');
        html = html.replace(/_([^_]+)_/g, '<i>$1</i>');
        html = html.replace(/~([^~]+)~/g, '<s>$1</s>');
        html = html.replace(/```([^`]+)```/g, '<code style="background: rgba(255,255,255,0.1); padding: 2px 4px; border-radius: 4px; font-family: monospace;">$1</code>');
        html = html.replace(/\n/g, '<br>');
        return html;
    }

    const htmlToMarkdown = (element: HTMLElement, activeStyles: any = {}): string => {
        let markdown = '';
        for (const node of Array.from(element.childNodes)) {
            if (node.nodeType === Node.TEXT_NODE) {
                markdown += node.textContent;
            } else if (node.nodeType === Node.ELEMENT_NODE) {
                const el = node as HTMLElement;
                const tagName = el.tagName.toLowerCase();
                const styles = window.getComputedStyle(el);
                const isBold = tagName === 'b' || tagName === 'strong' || parseInt(styles.fontWeight) >= 600;
                const isItalic = tagName === 'i' || tagName === 'em' || styles.fontStyle === 'italic';
                const isStrike = tagName === 's' || tagName === 'strike' || styles.textDecoration.includes('line-through');
                const isCode = tagName === 'code';
                let content = htmlToMarkdown(el, {
                    bold: activeStyles.bold || isBold,
                    italic: activeStyles.italic || isItalic,
                    strike: activeStyles.strike || isStrike,
                    code: activeStyles.code || isCode
                });
                if (isBold && !activeStyles.bold) content = `*${content}*`;
                if (isItalic && !activeStyles.italic) content = `_${content}_`;
                if (isStrike && !activeStyles.strike) content = `~${content}~`;
                if (isCode && !activeStyles.code) content = `\`\`\`${content}\`\`\``;
                if (tagName === 'div') markdown += (markdown ? '\n' : '') + content;
                else if (tagName === 'br') markdown += '\n';
                else markdown += content;
            }
        }
        return markdown.replace(/\n{3,}/g, '\n\n').trim();
    }

    const insertText = (str: string) => {
        if (!textareaRef.current) return
        textareaRef.current.focus()
        document.execCommand('insertText', false, str)
        handleEditorInput()
    }

    const handleEditorInput = () => {
        if (!textareaRef.current) return;
        isTypingRef.current = true;
        const markdown = htmlToMarkdown(textareaRef.current);
        setFormData(prev => ({ ...prev, message: markdown }));
        setTimeout(() => { isTypingRef.current = false; }, 100);
    }

    const execCommand = (command: string) => {
        if (!textareaRef.current) return;
        textareaRef.current.focus();
        document.execCommand(command, false);
        handleEditorInput();
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
        <div className="mb-6">
            <div className="flex items-center gap-3 mb-2">
                {step && (
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 font-bold text-sm shrink-0">
                        {step}
                    </div>
                )}
                <h3 className="text-lg font-semibold text-white">{title}</h3>
            </div>
            <p className="text-sm text-zinc-500 ml-11">{desc}</p>
        </div>
    )

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4 lg:p-10 animate-in fade-in duration-200">
            <div className="w-full max-w-7xl h-full max-h-[85vh] bg-[#09090b] rounded-2xl shadow-2xl border border-zinc-800 flex overflow-hidden ring-1 ring-white/10">

                {/* Left Panel: Scrollable Form */}
                <div className="w-[60%] flex flex-col h-full border-r border-zinc-800 bg-[#09090b]">
                    <div className="h-16 flex items-center justify-between px-8 border-b border-zinc-800 bg-[#09090b] z-20">
                        <h1 className="text-xl font-bold text-white tracking-tight">Create Blast Campaign</h1>
                        <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-white transition-colors">
                            <X size={20} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto px-8 py-8 custom-scrollbar">
                        {/* 1. Basic Details */}
                        <section className="mb-10 pb-8 border-b border-zinc-800/50">
                            <SectionHeader step={1} title="Campaign Basic" desc="General information and sender bot." />
                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] text-zinc-500 uppercase font-bold mb-1 block tracking-wider">Campaign Name *</label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg text-white placeholder-zinc-600 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all"
                                        placeholder="e.g. Promo Ramadhan Batch 1"
                                        required
                                    />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] text-zinc-500 uppercase font-bold mb-1 block tracking-wider">Select Sender Bot *</label>
                                        <select
                                            value={formData.botId}
                                            onChange={e => setFormData({ ...formData, botId: e.target.value })}
                                            className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all"
                                            required
                                        >
                                            <option value="" disabled>Choose a bot...</option>
                                            {botsData?.map((bot: any) => (
                                                <option key={bot.id} value={bot.id}>{bot.name} ({bot.phone_number || 'No Phone'})</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-zinc-500 uppercase font-bold mb-1 block tracking-wider">Interval (Seconds)</label>
                                        <div className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3">
                                            <Clock size={16} className="text-zinc-500" />
                                            <input
                                                type="number"
                                                min="1"
                                                max="3600"
                                                value={formData.delay}
                                                onChange={e => setFormData({ ...formData, delay: parseInt(e.target.value) || 0 })}
                                                className="bg-transparent text-white outline-none w-full text-sm"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* 2. Recipients */}
                        <section className="mb-10 pb-8 border-b border-zinc-800/50">
                            <SectionHeader step={2} title="Recipients" desc="Import your contacts from various sources." />
                            <div className="flex gap-4 border-b border-zinc-800 mb-6">
                                {[
                                    { id: 'manual', label: 'Manual Input', icon: MessageSquare },
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
                                <div className="space-y-2">
                                    <label className="text-[10px] text-zinc-500 uppercase font-bold mb-1 block tracking-wider">Contacts (Phone, Name)</label>
                                    <textarea
                                        value={formData.manualContacts}
                                        onChange={e => setFormData({ ...formData, manualContacts: e.target.value })}
                                        placeholder="62812345678, John Doe"
                                        rows={6}
                                        className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg text-white font-mono text-sm focus:ring-1 focus:ring-blue-600 outline-none"
                                    />
                                    <p className="text-[10px] text-zinc-500">Format: phone,name (one per line). Example: 62812345678, Budi</p>
                                </div>
                            )}

                            {formData.contactMethod === 'sheet' && (
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-[10px] text-zinc-500 uppercase font-bold mb-1 block tracking-wider">Google Sheets URL</label>
                                        <input
                                            type="url"
                                            value={formData.contactSheetUrl}
                                            onChange={e => setFormData({ ...formData, contactSheetUrl: e.target.value })}
                                            placeholder="https://docs.google.com/spreadsheets/d/..."
                                            className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg text-white text-sm focus:ring-1 focus:ring-blue-600 outline-none"
                                        />
                                    </div>
                                    <div className="flex gap-4">
                                        <div className="flex-1">
                                            <label className="text-[10px] text-zinc-500 uppercase font-bold mb-1 block tracking-wider">Select Tab</label>
                                            <select
                                                value={formData.sheetName}
                                                onChange={e => setFormData({ ...formData, sheetName: e.target.value })}
                                                className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg text-white text-sm outline-none appearance-none"
                                            >
                                                {availableTabs.map(t => <option key={t.gid} value={t.name}>{t.name}</option>)}
                                                {availableTabs.length === 0 && <option value="">Auto-detecting tabs...</option>}
                                            </select>
                                        </div>
                                    </div>
                                    <div className="p-3 bg-blue-500/5 border border-blue-500/20 rounded-lg">
                                        <p className="text-[10px] text-blue-400 leading-relaxed italic">
                                            💡 Make sure your sheet is "Public" or shared with "Anyone with the link can view".
                                            The bot will read columns for 'phone' and 'name'.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </section>

                        {/* 3. Scheduling */}
                        <section className="mb-10 pb-8 border-b border-zinc-800/50">
                            <SectionHeader step={3} title="Execution Schedule" desc="When should this blast start?" />
                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, isScheduled: false })}
                                        className={`flex-1 px-4 py-3 rounded-xl border font-bold transition-all flex items-center justify-center gap-2 ${!formData.isScheduled ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/20' : 'bg-zinc-900 border-zinc-800 text-zinc-500'}`}
                                    >
                                        <Send size={18} />
                                        Blast Now
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, isScheduled: true })}
                                        className={`flex-1 px-4 py-3 rounded-xl border font-bold transition-all flex items-center justify-center gap-2 ${formData.isScheduled ? 'bg-purple-600 border-purple-500 text-white shadow-lg shadow-purple-500/20' : 'bg-zinc-900 border-zinc-800 text-zinc-500'}`}
                                    >
                                        <Calendar size={18} />
                                        Schedule
                                    </button>
                                </div>
                                {formData.isScheduled && (
                                    <div className="animate-in fade-in slide-in-from-top-2">
                                        <label className="text-[10px] text-zinc-500 uppercase font-bold mb-1 block tracking-wider">Start Date & Time</label>
                                        <input
                                            type="datetime-local"
                                            value={formData.scheduledAt}
                                            onChange={e => setFormData({ ...formData, scheduledAt: e.target.value })}
                                            className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg text-white text-sm outline-none focus:border-purple-500 transition-colors"
                                        />
                                    </div>
                                )}
                            </div>
                        </section>

                        {/* 4. Message Content */}
                        <section className="mb-20">
                            <SectionHeader step={4} title="Message Content" desc="Use [nama] to personalize messages." />

                            {/* Image Attachment */}
                            <div className="mb-6">
                                <label className="inline-flex items-center gap-2 px-6 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl cursor-pointer hover:bg-zinc-800 transition-all group hover:border-blue-500/50">
                                    <ImageIcon size={18} className="text-zinc-500 group-hover:text-blue-500" />
                                    <span className="text-sm font-semibold text-zinc-400 group-hover:text-white">Attach Media</span>
                                    <input type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
                                </label>
                                {formData.imagePreview && (
                                    <div className="mt-4 relative w-48 h-48 rounded-2xl overflow-hidden border border-zinc-800 shadow-2xl group">
                                        <img src={formData.imagePreview} className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <button
                                                onClick={() => setFormData({ ...formData, imageFile: null, imagePreview: null })}
                                                className="p-2 bg-red-500 rounded-full text-white hover:bg-red-600 shadow-lg scale-90 hover:scale-100 transition-transform"
                                            >
                                                <Trash2 size={20} />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Rich Text Editor */}
                            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl min-h-[350px] flex flex-col focus-within:border-blue-500/50 transition-all">
                                <div className="bg-zinc-800/50 p-3 flex items-center gap-2 border-b border-zinc-800">
                                    <button onClick={() => execCommand('bold')} className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded-lg transition-colors" title="Bold"><Bold size={16} /></button>
                                    <button onClick={() => execCommand('italic')} className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded-lg transition-colors" title="Italic"><Italic size={16} /></button>
                                    <button onClick={() => insertText('~')} className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded-lg transition-colors" title="Strikethrough">~</button>
                                    <div className="w-[1px] h-4 bg-zinc-700 mx-2" />
                                    <button
                                        ref={emojiTriggerRef}
                                        onClick={() => setIsEmojiPickerOpen(!isEmojiPickerOpen)}
                                        className={`p-2 rounded-lg transition-all ${isEmojiPickerOpen ? 'text-yellow-400 bg-yellow-400/10' : 'text-zinc-400 hover:text-yellow-400 hover:bg-zinc-700'}`}
                                    ><Smile size={18} /></button>
                                    {isEmojiPickerOpen && (
                                        <div ref={emojiPickerRef} className="absolute left-8 bottom-32 z-50 w-80 bg-[#1f2c34] border border-zinc-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                                            <div className="flex gap-1 overflow-x-auto p-2 bg-[#111b21] border-b border-zinc-700 no-scrollbar">
                                                {Object.keys(EMOJI_CATEGORIES).map(cat => (
                                                    <button key={cat} onClick={() => setActiveEmojiCategory(cat as any)} className={`p-2 rounded-lg flex-shrink-0 transition-colors ${activeEmojiCategory === cat ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:bg-zinc-800'}`}>
                                                        {CATEGORY_ICONS[cat]}
                                                    </button>
                                                ))}
                                            </div>
                                            <div className="h-56 overflow-y-auto grid grid-cols-7 p-2 bg-[#111b21] custom-scrollbar">
                                                {EMOJI_CATEGORIES[activeEmojiCategory].map(emoji => (
                                                    <button key={emoji} onClick={() => { insertText(emoji); setIsEmojiPickerOpen(false); }} className="w-9 h-9 flex items-center justify-center text-xl hover:bg-zinc-800 rounded-lg transition-transform active:scale-90">{emoji}</button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    <div className="w-[1px] h-4 bg-zinc-700 mx-2" />
                                    <button
                                        onClick={() => insertText('[nama]')}
                                        className="px-3 py-1.5 text-xs bg-blue-500/10 text-blue-400 border border-blue-500/30 rounded-lg hover:bg-blue-500/20 transition-all font-bold tracking-tight"
                                    >Insert [nama]</button>
                                </div>
                                <div
                                    ref={textareaRef}
                                    contentEditable
                                    onInput={handleEditorInput}
                                    className="flex-1 p-6 text-white focus:outline-none min-h-[250px] font-sans prose prose-invert max-w-none text-base leading-relaxed"
                                />
                                <div className="p-3 bg-zinc-800/20 border-t border-zinc-800 flex items-center justify-between text-[10px] text-zinc-500">
                                    <span>Tip: Use *bold* and _italic_ for WhatsApp formatting.</span>
                                    <span>{formData.message.length} characters</span>
                                </div>
                            </div>
                        </section>
                    </div>

                    {/* Footer */}
                    <div className="h-24 shrink-0 border-t border-zinc-800 px-8 flex items-center justify-between bg-[#09090b]">
                        <button onClick={onClose} className="px-6 py-2.5 text-zinc-500 hover:text-white font-bold transition-colors">Cancel</button>
                        <button
                            onClick={() => createMutation.mutate()}
                            disabled={createMutation.isPending || !formData.name || !formData.message || !formData.botId}
                            className="px-10 py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black shadow-xl shadow-blue-500/20 disabled:opacity-50 transition-all flex items-center gap-3 active:scale-95 group"
                        >
                            {createMutation.isPending ? 'Launching Campaign...' : 'Launch Campaign'}
                            <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                        </button>
                    </div>
                </div>

                {/* Right Panel: WhatsApp Preview */}
                <div className="w-[40%] bg-[#0d0d0f] flex flex-col h-full relative overflow-hidden">
                    {/* Dark Mode BG Pattern */}
                    <div className="absolute inset-0 bg-[url('https://w0.peakpx.com/wallpaper/818/148/HD-wallpaper-whatsapp-background-dark-mode-whatsapp-background.jpg')] opacity-10 bg-repeat bg-center" />

                    <div className="relative h-full flex flex-col">
                        <div className="h-16 flex items-center px-6 gap-4 border-b border-white/5 bg-[#0d0d0f]/80 backdrop-blur-xl z-10">
                            <div className="w-10 h-10 rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center text-zinc-400 font-bold overflow-hidden shadow-inner uppercase">
                                {formData.name ? formData.name.substring(0, 2) : 'BC'}
                            </div>
                            <div className="flex-1">
                                <div className="text-white font-bold text-sm tracking-tight truncate">{formData.name || 'Campaign Preview'}</div>
                                <div className="text-emerald-500 text-[10px] font-bold flex items-center gap-1"><div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" /> active preview</div>
                            </div>
                        </div>

                        <div className="flex-1 p-6 flex flex-col justify-end overflow-y-auto custom-scrollbar pb-10">
                            <div className="bg-[#1f2c33] rounded-2xl rounded-tr-sm p-4 max-w-[90%] shadow-2xl animate-in slide-in-from-bottom-4 duration-300 border border-white/5">
                                {formData.imagePreview && (
                                    <div className="mb-3 rounded-xl overflow-hidden shadow-lg border border-white/5 bg-zinc-900">
                                        <img src={formData.imagePreview} className="w-full aspect-square object-cover" />
                                    </div>
                                )}
                                <div className="text-zinc-100 text-[14px] whitespace-pre-wrap leading-relaxed font-sans">
                                    {formData.message.replace(/\[nama\]/g, 'Costumer Name') || 'Your message preview will appear here...'}
                                </div>
                                <div className="mt-2 flex items-center justify-end gap-1 opacity-60">
                                    <span className="text-[10px] text-zinc-300 font-medium">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    <div className="flex -space-x-1.5 translate-y-[1px]">
                                        <Check size={12} className="text-blue-500" />
                                        <Check size={12} className="text-blue-500" />
                                    </div>
                                </div>
                            </div>

                            {/* Device Mockup Decor */}
                            <div className="mt-10 mx-auto w-32 h-1 bg-zinc-800 rounded-full opacity-30" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
