'use client'

import { useState, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import RichTextEditor from '@/components/editors/RichTextEditor'
import { X, Image as ImageIcon, Trash2, MessageSquare, Zap, Globe, Users, User, Plus, Search, ArrowRight, Upload, Save } from 'lucide-react'

interface EditRuleModalProps {
    botId: string
    rule: any
    onClose: () => void
}

interface Group {
    id?: string
    jid: string
    name: string
    participant_count?: number
}

export default function EditRuleModal({ botId, rule, onClose }: EditRuleModalProps) {
    const queryClient = useQueryClient()

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

    // Global Config State (Everyone)
    const [globalConfig, setGlobalConfig] = useState({ private: true, group: true })

    // UI Helper State
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)

    // Populate Data from Rule
    useEffect(() => {
        if (rule) {
            const action = rule.actions?.[0]
            setFormData({
                trigger: rule.keyword,
                reply: action?.config?.message || '',
                match_type: rule.match_type || 'contains',
                is_active: rule.is_active,
                media: null
            })

            // Parse Media URL (if applicable, tricky with File object, just showing preview)
            if (action?.config?.url) {
                setPreviewUrl(action.config.url)
            }

            // Parse Scope
            setTargetType(rule.scope || 'global')
            if (rule.scope === 'group') {
                setSelectedGroups(rule.scope_target ? rule.scope_target.split(',') : [])
            } else if (rule.scope === 'contact') {
                setSpecificContacts(rule.scope_target || '')
            }

            // Parse Metadata for Global Config
            if (rule.metadata) {
                let meta = rule.metadata
                if (typeof meta === 'string') {
                    try { meta = JSON.parse(meta) } catch (e) { }
                }
                setGlobalConfig({
                    private: meta.reply_in_private !== false, // Default true
                    group: meta.reply_in_group !== false      // Default true
                })
            }
        }
    }, [rule])

    // Fetch Groups for Selector
    const { data: groupsData } = useQuery({
        queryKey: ['groups', botId],
        queryFn: async () => {
            try {
                const res = await api.bots.getGroups(botId)
                return res.data.data as Group[] || []
            } catch (e) {
                console.error('Failed to fetch groups', e)
                return []
            }
        },
        enabled: targetType === 'group'
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

    const updateMutation = useMutation({
        mutationFn: async (data: any) => {
            let mediaUrl = previewUrl // Default to existing URL
            if (data.media) {
                mediaUrl = await fileToBase64(data.media);
            } else if (previewUrl === null) {
                mediaUrl = null // Explicit removal
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
                name: `Auto-reply: ${data.trigger}`,
                keyword: data.trigger,
                match_type: data.match_type,
                scope: scope,
                scope_target: scopeTarget,
                priority: 10,
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

            return await api.rules.update(rule.id, backendData)
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['rules', botId] })
            queryClient.invalidateQueries({ queryKey: ['rules'] })
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
        updateMutation.mutate(formData)
    }

    const SectionHeader = ({ title, desc }: { title: string, desc: string }) => (
        <div className="mb-6">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                {title}
            </h3>
            <p className="text-sm text-zinc-500">{desc}</p>
        </div>
    )

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4 lg:p-10 animate-in fade-in duration-200">
            <div className="w-full max-w-7xl h-full max-h-[85vh] bg-[#09090b] rounded-2xl shadow-2xl border border-zinc-800 flex overflow-hidden ring-1 ring-white/10">

                {/* --- Left Panel: Form (60%) --- */}
                <div className="w-[60%] flex flex-col h-full border-r border-zinc-800 relative bg-[#09090b]">
                    {/* Header */}
                    <div className="h-16 flex items-center justify-between px-8 border-b border-zinc-800 shrink-0 bg-[#09090b] z-20">
                        <h1 className="text-xl font-bold text-white tracking-tight">Edit Rule</h1>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-white transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto px-8 py-8 custom-scrollbar">

                        <div className="grid grid-cols-1 gap-8">
                            {/* Trigger & Scope */}
                            <section className="mb-10 pb-8 border-b border-zinc-800/50">
                                <SectionHeader title="Trigger Condition" desc="When should this rule run?" />

                                <div className="space-y-6">
                                    {/* Keyword */}
                                    <div>
                                        <label className="text-xs font-medium text-zinc-400 uppercase tracking-wide mb-2 block">Keyword (Trigger)</label>
                                        <input
                                            type="text"
                                            value={formData.trigger}
                                            onChange={(e) => setFormData({ ...formData, trigger: e.target.value })}
                                            placeholder="e.g. /price, hello, !help"
                                            className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg text-white placeholder-zinc-600 focus:ring-1 focus:ring-blue-600 outline-none transition-all"
                                        />
                                    </div>

                                    {/* Match Type */}
                                    <div>
                                        <label className="text-xs font-medium text-zinc-400 uppercase tracking-wide mb-2 block">Match Logic</label>
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
                                                        ? 'bg-zinc-100 text-black border-zinc-100'
                                                        : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300'
                                                        }`}
                                                >
                                                    {type.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </section>

                            <section className="mb-10 pb-8 border-b border-zinc-800/50">
                                <SectionHeader title="Target Audience" desc="Who should trigger this rule?" />

                                <div className="flex bg-zinc-900 p-1 rounded-lg border border-zinc-800 mb-6 w-fit">
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
                                                ? 'bg-zinc-800 text-white shadow-sm'
                                                : 'text-zinc-500 hover:text-zinc-300'
                                                }`}
                                        >
                                            {t.label}
                                        </button>
                                    ))}
                                </div>

                                {/* Global Config Options */}
                                {targetType === 'global' && (
                                    <div className="mt-4 flex flex-col sm:flex-row gap-4 animate-in fade-in p-4 bg-zinc-900/50 rounded-lg border border-zinc-800/50">
                                        <label className="flex items-center gap-3 text-sm text-zinc-300 cursor-pointer hover:text-white transition-colors">
                                            <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${globalConfig.private ? 'bg-blue-600 border-blue-600' : 'border-zinc-600 bg-zinc-800'}`}>
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
                                        <label className="flex items-center gap-3 text-sm text-zinc-300 cursor-pointer hover:text-white transition-colors">
                                            <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${globalConfig.group ? 'bg-blue-600 border-blue-600' : 'border-zinc-600 bg-zinc-800'}`}>
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
                                        <label className="text-xs font-medium text-zinc-400 uppercase tracking-wide">Selected Groups</label>
                                        <div className="flex flex-wrap gap-2">
                                            {selectedGroups.map(id => {
                                                const group = groupsData?.find(g => g.jid === id)
                                                return (
                                                    <span key={id} className="inline-flex items-center gap-1 px-3 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full text-sm">
                                                        {group?.name || id}
                                                        <button
                                                            type="button"
                                                            onClick={() => setSelectedGroups(selectedGroups.filter(g => g !== id))}
                                                            className="hover:text-white"
                                                        >
                                                            <X size={14} />
                                                        </button>
                                                    </span>
                                                )
                                            })}
                                            <button
                                                type="button"
                                                onClick={() => setIsGroupSelectorOpen(!isGroupSelectorOpen)}
                                                className="inline-flex items-center gap-1 px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-full text-sm border border-zinc-700 transition delay-75"
                                            >
                                                <Plus size={14} /> Add Group
                                            </button>
                                        </div>

                                        {isGroupSelectorOpen && (
                                            <div className="bg-zinc-900 border border-zinc-800 rounded-lg max-h-48 overflow-y-auto shadow-xl p-2 animate-in zoom-in-95">
                                                {groupsData?.length === 0 && <div className="p-2 text-xs text-zinc-500 text-center">No groups found</div>}
                                                {groupsData?.filter(g => !selectedGroups.includes(g.jid)).map(g => (
                                                    <button
                                                        key={g.jid}
                                                        type="button"
                                                        onClick={() => {
                                                            setSelectedGroups([...selectedGroups, g.jid])
                                                            setIsGroupSelectorOpen(false)
                                                        }}
                                                        className="w-full text-left px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 rounded-md flex items-center justify-between group"
                                                    >
                                                        {g.name}
                                                        <Plus size={14} className="opacity-0 group-hover:opacity-100 text-zinc-500" />
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {targetType === 'contact' && (
                                    <div className="animate-in fade-in space-y-4">
                                        <label className="text-xs font-medium text-zinc-400 uppercase tracking-wide">Phone Numbers</label>
                                        <textarea
                                            value={specificContacts}
                                            onChange={(e) => setSpecificContacts(e.target.value)}
                                            placeholder="e.g. 628123456789 (Comma separated)"
                                            rows={3}
                                            className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg text-white font-mono text-sm focus:ring-1 focus:ring-blue-600 outline-none"
                                        />
                                    </div>
                                )}
                            </section>

                            {/* Response Action */}
                            <section className="mb-24">
                                <SectionHeader title="Response Action" desc="What should the bot do?" />

                                <div className="space-y-4">
                                    <label className="text-xs font-medium text-zinc-400 uppercase tracking-wide mb-2 block">Reply Message</label>

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
                                            <label className="text-xs font-medium text-zinc-400 uppercase tracking-wide">Attachment (Optional)</label>
                                        </div>
                                        {!previewUrl ? (
                                            <div className="border border-dashed border-zinc-800 rounded-lg p-6 hover:bg-zinc-900/50 transition-colors text-center cursor-pointer relative group">
                                                <input
                                                    type="file"
                                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                                    onChange={handleFileChange}
                                                    accept="image/*"
                                                />
                                                <div className="flex flex-col items-center gap-2">
                                                    <div className="p-3 bg-zinc-900 rounded-full group-hover:bg-zinc-800 transition-colors">
                                                        <ImageIcon className="text-zinc-500 group-hover:text-zinc-300" size={24} />
                                                    </div>
                                                    <p className="text-sm text-zinc-500 group-hover:text-zinc-400">Click to upload image</p>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="relative w-fit group">
                                                <img src={previewUrl} alt="Preview" className="h-32 rounded-lg border border-zinc-800 object-cover" />
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

                    {/* Footer Actions - Floating */}
                    <div className="absolute bottom-0 left-0 right-0 p-6 bg-[#09090b]/95 backdrop-blur border-t border-zinc-800 z-30">
                        <button
                            onClick={() => updateMutation.mutate(formData)}
                            disabled={updateMutation.isPending}
                            className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg shadow-lg disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                        >
                            {updateMutation.isPending ? (
                                <><Zap size={18} className="animate-spin" /> Saving Changes...</>
                            ) : (
                                <><Save size={18} /> Save Changes</>
                            )}
                        </button>
                    </div>
                </div>

                {/* --- Right Panel: Preview (40%) --- */}
                <div className="w-[40%] bg-[#0b141a] relative flex flex-col h-full border-l border-zinc-800 hidden lg:flex">
                    {/* Preview Header */}
                    <div className="h-16 bg-[#202c33] flex items-center px-4 gap-3 border-b border-[#2a3942] z-10 shrink-0">
                        <div className="w-10 h-10 rounded-full bg-black/20 flex items-center justify-center overflow-hidden">
                            <img src="/brobot-logo.png" alt="BroBot" className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="text-[#e9edef] text-sm font-medium truncate">BroBot Assistant</div>
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
                            <div className="self-start max-w-[90%] relative group animate-in slide-in-from-left-2">
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
                                                return <span className="text-white/30 italic text-xs">Typing reply...</span>
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
                        <div className="w-8 h-8 rounded-full bg-[#00a884] flex items-center justify-center text-white">
                            <ArrowRight size={16} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
