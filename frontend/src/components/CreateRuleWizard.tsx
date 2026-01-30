'use client'

import { useState, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import RichTextEditor from '@/components/editors/RichTextEditor'
import { X, Image as ImageIcon, Trash2, MessageSquare, Zap, Globe, Users, User, Plus, Search, ArrowRight, Upload, Save, ChevronLeft, Eye } from 'lucide-react'

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

    const removeImage = () => {
        setFormData({ ...formData, media: null })
        setPreviewUrl(null)
    }

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

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!formData.trigger || !formData.reply) {
            toast.error('Trigger and Reply message are required')
            return
        }
        createMutation.mutate(formData)
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

    // Derived Preview Logic
    const getPreviewBotName = () => {
        if (!selectedBotId || !botsData) return 'Sendr Assistant'
        const bot = botsData.find((b: any) => b.id === selectedBotId)
        return bot ? bot.name : 'Sendr Assistant'
    }

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex">

            {/* --- Left Panel: Scrollable Form --- */}
            <div className="flex-1 flex flex-col h-screen border-r border-zinc-200 dark:border-zinc-800 relative bg-zinc-50 dark:bg-zinc-950 overflow-hidden">
                {/* Header */}
                <div className="shrink-0 bg-zinc-50 dark:bg-zinc-950 z-20 border-b border-zinc-200 dark:border-zinc-800">
                    <div className="h-16 flex items-center justify-between px-6 lg:px-8">
                        <div className="flex items-center gap-4">
                            <button onClick={onClose} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors">
                                <ChevronLeft size={20} />
                            </button>
                            <h1 className="text-xl font-bold text-zinc-900 dark:text-white tracking-tight">Create Auto-Reply</h1>
                        </div>
                        <div className="flex items-center gap-3">
                            <button 
                                onClick={() => setIsPreviewOpen(!isPreviewOpen)}
                                className={`hidden lg:flex items-center gap-2 px-4 py-2.5 border rounded-lg font-medium transition-all ${
                                    isPreviewOpen 
                                        ? 'bg-zinc-200 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white' 
                                        : 'border-zinc-300 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:border-zinc-400 dark:hover:border-zinc-600'
                                }`}
                            >
                                <Eye size={16} />
                                Preview
                            </button>
                            <button 
                                onClick={() => createMutation.mutate(formData)}
                                disabled={createMutation.isPending}
                                className="hidden lg:flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg shadow-lg disabled:opacity-50 transition-all"
                            >
                                {createMutation.isPending ? (
                                    <><Zap size={16} className="animate-spin" /> Saving...</>
                                ) : (
                                    <><Save size={16} /> Save</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto px-6 lg:px-12 py-8 pb-24 lg:pb-8">
                    <div className="max-w-3xl mx-auto space-y-8">

                        {/* Bot Selection - Only show if botId is NOT provided */}
                        {!botId && (
                        <section className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm dark:shadow-none">
                            <SectionHeader step={1} title="Basic Details" desc="Select which bot this rule applies to." />
                            <div className="space-y-4">
                                <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">Target Bot *</label>
                                <select
                                    value={selectedBotId}
                                    onChange={(e) => setSelectedBotId(e.target.value)}
                                    className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all text-sm"
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
                        <section className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm dark:shadow-none">
                            <SectionHeader step={botId ? 1 : 2} title="Trigger Condition" desc="Define the keywords that trigger this rule." />

                            <div className="space-y-6">
                                {/* Keyword */}
                                <div>
                                    <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-2 block">Keyword (Trigger) *</label>
                                    <input
                                        type="text"
                                        value={formData.trigger}
                                        onChange={(e) => setFormData({ ...formData, trigger: e.target.value })}
                                        placeholder="e.g. /price, hello, !help"
                                        className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all"
                                    />
                                    <p className="text-xs text-zinc-500 mt-2">💡 Use a descriptive keyword like "/info" or "harga"</p>
                                </div>

                                {/* Match Type */}
                                <div>
                                    <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-2 block">Match Logic</label>
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
                                                className={`py-3 px-2 rounded-lg border text-sm font-medium transition-all ${formData.match_type === type.id
                                                    ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-black border-zinc-900 dark:border-zinc-100'
                                                    : 'bg-white dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
                                                    }`}
                                            >
                                                {type.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </section>

                        <section className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm dark:shadow-none">
                            <SectionHeader step={botId ? 2 : 3} title="Target Audience" desc="Who should be able to trigger this rule?" />

                            <div className="flex bg-zinc-100 dark:bg-zinc-800/50 p-1 rounded-lg border border-zinc-200 dark:border-zinc-700 mb-6 w-fit">
                                {[
                                    { id: 'global', label: 'Everyone' },
                                    { id: 'group', label: 'WhatsApp Groups' },
                                    { id: 'contact', label: 'Individual Contacts' }
                                ].map(t => (
                                    <button
                                        key={t.id}
                                        type="button"
                                        onClick={() => setTargetType(t.id as any)}
                                        className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${targetType === t.id
                                            ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm'
                                            : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
                                            }`}
                                    >
                                        {t.label}
                                    </button>
                                ))}
                            </div>

                            {/* Global Config Options */}
                            {targetType === 'global' && (
                                <div className="mt-4 flex flex-col sm:flex-row gap-4 animate-in fade-in p-4 bg-zinc-100 dark:bg-zinc-800/30 rounded-lg border border-zinc-200 dark:border-zinc-700/50">
                                    <label className="flex items-center gap-3 text-sm text-zinc-700 dark:text-zinc-300 cursor-pointer hover:text-zinc-900 dark:hover:text-white transition-colors">
                                        <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${globalConfig.private ? 'bg-blue-600 border-blue-600' : 'border-zinc-400 dark:border-zinc-600 bg-white dark:bg-zinc-800'}`}>
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
                                    <label className="flex items-center gap-3 text-sm text-zinc-700 dark:text-zinc-300 cursor-pointer hover:text-zinc-900 dark:hover:text-white transition-colors">
                                        <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${globalConfig.group ? 'bg-blue-600 border-blue-600' : 'border-zinc-400 dark:border-zinc-600 bg-white dark:bg-zinc-800'}`}>
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
                                    <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">Target Group/Contact *</label>

                                    {/* Selected Groups Chips */}
                                    {selectedGroups.length > 0 && (
                                        <div className="flex flex-wrap gap-2 p-3 bg-zinc-100 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg">
                                            {selectedGroups.map(id => {
                                                const group = groupsData?.find(g => g.jid === id)
                                                return (
                                                    <div key={id} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-100 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-md text-sm">
                                                        <span className="text-blue-600 dark:text-blue-400">{group?.name || id}</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => setSelectedGroups(selectedGroups.filter(g => g !== id))}
                                                            className="text-blue-500 hover:text-blue-700 dark:hover:text-blue-300"
                                                        >
                                                            <X size={14} />
                                                        </button>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    )}

                                    {/* Search Input / Toggle Button */}
                                    <div className="relative">
                                        {isGroupSelectorOpen ? (
                                            <div className="relative animate-in fade-in duration-200">
                                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                                                <input
                                                    type="text"
                                                    placeholder="Search groups..."
                                                    autoFocus
                                                    value={groupSearchQuery}
                                                    onChange={(e) => setGroupSearchQuery(e.target.value)}
                                                    className="w-full pl-10 pr-10 py-2.5 bg-white dark:bg-zinc-800 border border-blue-500 dark:border-blue-500/50 rounded-lg text-zinc-900 dark:text-white text-sm focus:outline-none ring-2 ring-blue-500/20 transition-all"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setIsGroupSelectorOpen(false)
                                                        setGroupSearchQuery('')
                                                    }}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-white"
                                                >
                                                    <ChevronLeft className="w-4 h-4 rotate-90" />
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() => setIsGroupSelectorOpen(true)}
                                                className="w-full px-4 py-2.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm flex items-center justify-between hover:border-zinc-300 dark:hover:border-zinc-600 transition-all group"
                                            >
                                                <span className={selectedGroups.length > 0 ? 'text-zinc-900 dark:text-white' : 'text-zinc-400 dark:text-zinc-500'}>
                                                    {selectedGroups.length > 0
                                                        ? `${selectedGroups.length} group(s) selected`
                                                        : 'Select groups...'}
                                                </span>
                                                <div className="flex items-center gap-2">
                                                    {selectedGroups.length > 0 && (
                                                        <span className="flex items-center justify-center w-5 h-5 bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 text-[10px] font-bold rounded-full border border-blue-200 dark:border-blue-500/30">
                                                            {selectedGroups.length}
                                                        </span>
                                                    )}
                                                    <ChevronLeft className="w-4 h-4 text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-colors -rotate-90" />
                                                </div>
                                            </button>
                                        )}

                                        {/* Dropdown List */}
                                        {isGroupSelectorOpen && (
                                            <div className="absolute z-50 w-full mt-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl overflow-hidden animate-in slide-in-from-top-2 duration-200">
                                                <div className="max-h-60 overflow-y-auto">
                                                    {(() => {
                                                        const filtered = groupsData?.filter((g: Group) =>
                                                            (g.name || '').toLowerCase().includes(groupSearchQuery.toLowerCase()) ||
                                                            (g.jid || '').toLowerCase().includes(groupSearchQuery.toLowerCase())
                                                        ) || []

                                                        if (filtered.length === 0) {
                                                            return (
                                                                <div className="px-4 py-8 text-center">
                                                                    <div className="w-12 h-12 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-3 border border-zinc-200 dark:border-zinc-700">
                                                                        <Users className="w-6 h-6 text-zinc-400" />
                                                                    </div>
                                                                    <div className="text-zinc-600 dark:text-zinc-400 text-sm mb-1">
                                                                        {groupSearchQuery ? `No groups match "${groupSearchQuery}"` : 'No groups found'}
                                                                    </div>
                                                                    <div className="text-zinc-400 dark:text-zinc-500 text-xs">
                                                                        Make sure the bot has joined some groups
                                                                    </div>
                                                                </div>
                                                            )
                                                        }

                                                        return filtered.map((g: Group) => {
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
                                                                    className={`w-full px-3 py-2.5 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors flex items-center gap-3 text-left border-b border-zinc-100 dark:border-zinc-800/50 last:border-0 ${isSelected ? 'bg-blue-50 dark:bg-blue-500/5' : ''}`}
                                                                >
                                                                    {/* Avatar */}
                                                                    <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center flex-shrink-0">
                                                                        <Users className="w-5 h-5 text-zinc-400" />
                                                                    </div>
                                                                    {/* Group Info */}
                                                                    <div className="flex-1 min-w-0">
                                                                        <div className="text-sm font-medium text-zinc-900 dark:text-white truncate">
                                                                            {g.name || 'Unnamed Group'}
                                                                        </div>
                                                                        <div className="text-xs text-zinc-400 dark:text-zinc-500 truncate">
                                                                            {g.jid}
                                                                        </div>
                                                                    </div>
                                                                    {/* Icon: Plus or Checkmark */}
                                                                    {isSelected ? (
                                                                        <svg className="w-5 h-5 text-blue-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                                        </svg>
                                                                    ) : (
                                                                        <Plus className="w-5 h-5 text-zinc-400 flex-shrink-0" />
                                                                    )}
                                                                </button>
                                                            )
                                                        })
                                                    })()}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {targetType === 'contact' && (
                                <div className="animate-in fade-in space-y-4">
                                    <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">Phone Numbers</label>
                                    <textarea
                                        value={specificContacts}
                                        onChange={(e) => setSpecificContacts(e.target.value)}
                                        placeholder="Enter phone numbers (e.g. 628123456789), one per line or comma separated..."
                                        rows={3}
                                        className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-white font-mono text-sm focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none"
                                    />
                                </div>
                            )}
                        </section>

                        {/* Response Action */}
                        <section className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm dark:shadow-none">
                            <SectionHeader step={botId ? 3 : 4} title="Response Message" desc="What should the bot reply when triggered?" />

                            <div className="space-y-4">
                                <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-2 block">Reply Message *</label>

                                {/* Rich Text Editor */}
                                <RichTextEditor
                                    value={formData.reply}
                                    onChange={(val) => setFormData({ ...formData, reply: val })}
                                    placeholder="Type your automated reply here..."
                                    minHeight="200px"
                                />

                                {/* Image Attachment Mock */}
                                <div className="pt-2">
                                    <div className="flex items-center gap-2 mb-2">
                                        <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">Attachment (Optional)</label>
                                    </div>
                                    {!previewUrl ? (
                                        <div className="border border-dashed border-zinc-300 dark:border-zinc-700 rounded-lg p-6 hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors text-center cursor-pointer relative group">
                                            <input
                                                type="file"
                                                className="absolute inset-0 opacity-0 cursor-pointer"
                                                onChange={handleFileChange}
                                                accept="image/*"
                                            />
                                            <div className="flex flex-col items-center gap-2">
                                                <div className="p-3 bg-zinc-100 dark:bg-zinc-800/50 rounded-full group-hover:bg-zinc-200 dark:group-hover:bg-zinc-700 transition-colors">
                                                    <ImageIcon className="text-zinc-500 group-hover:text-zinc-700 dark:group-hover:text-zinc-300" size={24} />
                                                </div>
                                                <p className="text-sm text-zinc-500 group-hover:text-zinc-600 dark:group-hover:text-zinc-400">Click to upload image</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="relative w-fit group">
                                            <img src={previewUrl} alt="Preview" className="h-32 rounded-lg border border-zinc-200 dark:border-zinc-700 object-cover" />
                                            <button
                                                type="button"
                                                onClick={removeImage}
                                                className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white p-1.5 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all scale-90 active:scale-95"
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </section>
                    </div>
                </div>

                {/* Mobile Save Button */}
                <div className="lg:hidden fixed bottom-0 left-0 right-0 p-4 bg-white/95 dark:bg-zinc-950/95 backdrop-blur border-t border-zinc-200 dark:border-zinc-800 z-30">
                    <button
                        onClick={() => createMutation.mutate(formData)}
                        disabled={createMutation.isPending}
                        className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg shadow-lg disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                    >
                        {createMutation.isPending ? (
                            <><Zap size={18} className="animate-spin" /> Creating Rule...</>
                        ) : (
                            <><Save size={18} /> Save</>
                        )}
                    </button>
                </div>
            </div>

            {/* --- Right Panel: Preview (conditional) --- */}
            {isPreviewOpen && (
                <div className="w-[400px] bg-[#0b141a] relative flex flex-col h-screen border-l border-zinc-800 hidden lg:flex">
                    {/* Preview Header */}
                    <div className="h-16 bg-[#202c33] flex items-center px-4 gap-3 border-b border-[#2a3942] z-10 shrink-0">
                        <div className="w-10 h-10 rounded-full bg-black/20 flex items-center justify-center overflow-hidden">
                            <img src="/Sendr-logo.png" alt="Sendr" className="w-full h-full object-cover" />
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
            )}
        </div>
    )
}
