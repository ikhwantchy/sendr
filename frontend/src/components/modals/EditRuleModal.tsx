'use client'

import { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import RichTextEditor from '@/components/editors/RichTextEditor'
import { X, Image as ImageIcon, Trash2, MessageSquare } from 'lucide-react'

interface EditRuleModalProps {
    botId: string
    rule: any
    onClose: () => void
}

export default function EditRuleModal({ botId, rule, onClose }: EditRuleModalProps) {
    const queryClient = useQueryClient()
    const [formData, setFormData] = useState({
        trigger: '',
        reply: '',
        match_type: 'contains' as 'exact' | 'contains' | 'starts_with' | 'ends_with',
        is_active: true,
        media: null as File | null
    })
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)
    const [existingMediaUrl, setExistingMediaUrl] = useState<string | null>(null)

    // Populate form with existing rule data
    useEffect(() => {
        if (rule) {
            const action = rule.actions?.[0]
            const isImage = action?.type === 'SEND_IMAGE'

            setFormData({
                trigger: rule.keyword || '',
                reply: action?.config?.message || rule.reply_message || '',
                match_type: rule.match_type || 'contains',
                is_active: rule.is_active === 1,
                media: null
            })

            // Set existing media URL if available
            if (isImage && action?.config?.url) {
                setExistingMediaUrl(action.config.url)
            }
        }
    }, [rule])

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            setFormData({ ...formData, media: file })
            const url = URL.createObjectURL(file)
            setPreviewUrl(url)
            setExistingMediaUrl(null)
        }
    }

    const removeImage = () => {
        setFormData({ ...formData, media: null })
        setPreviewUrl(null)
        setExistingMediaUrl(null)
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
            let mediaUrl = existingMediaUrl;

            if (data.media) {
                mediaUrl = await fileToBase64(data.media);
            }

            const backendData = {
                bot_id: botId,
                name: `Auto-reply: ${data.trigger}`,
                keyword: data.trigger,
                match_type: data.match_type,
                scope: rule.scope || 'global',
                scope_target: rule.scope_target || null,
                priority: rule.priority || 10,
                actions: [{
                    type: mediaUrl ? 'SEND_IMAGE' : 'SEND_TEXT',
                    config: {
                        message: data.reply,
                        url: mediaUrl,
                        variables: {}
                    }
                }],
                metadata: rule.metadata || {},
                is_active: data.is_active ? 1 : 0
            }

            return await api.rules.update(rule.id, backendData)
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['rules', botId] })
            toast.success('Rule updated successfully!')
            onClose()
        },
        onError: (error: any) => {
            const errorMessage = error.response?.data?.message ||
                error.response?.data?.error ||
                'Failed to update rule'
            toast.error(errorMessage)
        },
    })

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!formData.trigger || !formData.reply) {
            toast.error('Please fill all required fields')
            return
        }
        updateMutation.mutate(formData)
    }

    const displayMediaUrl = previewUrl || existingMediaUrl

    const SectionHeader = ({ title, desc }: { title: string, desc: string }) => (
        <div className="mb-6">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                {title}
            </h3>
            <p className="text-sm text-zinc-500">{desc}</p>
        </div>
    )

    // Parse WhatsApp formatting for preview
    const parseWhatsAppFormatting = (text: string) => {
        if (!text) return null

        // Split by newlines to preserve them
        const lines = text.split('\n')

        return lines.map((line, lineIndex) => {
            const parts: React.ReactNode[] = []
            let remaining = line
            let keyCounter = 0

            // Process formatting in order
            while (remaining.length > 0) {
                let matched = false

                // Try each pattern
                const patterns = [
                    { regex: /^\*([^*\n]+)\*/, tag: 'strong' },      // *bold*
                    { regex: /^_([^_\n]+)_/, tag: 'em' },            // _italic_
                    { regex: /^~([^~\n]+)~/, tag: 'del' },           // ~strikethrough~
                    { regex: /^```([^`\n]+)```/, tag: 'code' },      // ```monospace```
                ]

                for (const { regex, tag } of patterns) {
                    const match = remaining.match(regex)
                    if (match) {
                        const Tag = tag as keyof JSX.IntrinsicElements
                        parts.push(<Tag key={`${lineIndex}-${keyCounter++}`}>{match[1]}</Tag>)
                        remaining = remaining.slice(match[0].length)
                        matched = true
                        break
                    }
                }

                // If no pattern matched, take one character
                if (!matched) {
                    parts.push(remaining[0])
                    remaining = remaining.slice(1)
                }
            }

            // Add line break except for last line
            if (lineIndex < lines.length - 1) {
                return <span key={lineIndex}>{parts}<br /></span>
            }
            return <span key={lineIndex}>{parts}</span>
        })
    }

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4 lg:p-10 animate-in fade-in duration-200">
            <div className="w-full max-w-7xl h-full max-h-[85vh] bg-[#09090b] rounded-2xl shadow-2xl border border-zinc-800 flex overflow-hidden ring-1 ring-white/10">

                {/* Left Panel: Form (60%) */}
                <div className="w-[60%] flex flex-col h-full border-r border-zinc-800 relative bg-[#09090b]">
                    {/* Header */}
                    <div className="h-16 flex items-center justify-between px-8 border-b border-zinc-800 shrink-0 bg-[#09090b] z-20">
                        <h1 className="text-xl font-bold text-white tracking-tight">Edit Auto-Reply</h1>
                        <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-white transition-colors">
                            <X size={20} />
                        </button>
                    </div>

                    {/* Scrollable Content */}
                    <div className="flex-1 overflow-y-auto px-8 py-8 custom-scrollbar">

                        {/* 1. Trigger Setup */}
                        <section className="mb-10 pb-8 border-b border-zinc-800/50">
                            <SectionHeader
                                title="Trigger Setup"
                                desc="Update the keyword that activates this auto-reply."
                            />
                            <div className="space-y-4">
                                <label className="text-xs font-medium text-zinc-400 uppercase tracking-wide">
                                    Keyword Trigger <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={formData.trigger}
                                    onChange={(e) => setFormData({ ...formData, trigger: e.target.value })}
                                    placeholder="e.g. price, hello, help"
                                    className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg text-white placeholder-zinc-600 focus:ring-1 focus:ring-blue-600 outline-none transition-all font-mono"
                                    autoFocus
                                />
                                <p className="text-xs text-zinc-600">
                                    Triggered when message contains this keyword.
                                </p>
                            </div>
                        </section>

                        {/* 2. Response Message */}
                        <section className="mb-10 pb-8 border-b border-zinc-800/50">
                            <SectionHeader
                                title="Response Message"
                                desc="Update the automated reply that will be sent."
                            />
                            <div className="space-y-4">
                                <label className="text-xs font-medium text-zinc-400 uppercase tracking-wide">
                                    Reply Text <span className="text-red-500">*</span>
                                </label>
                                <RichTextEditor
                                    value={formData.reply}
                                    onChange={(value) => setFormData({ ...formData, reply: value })}
                                    placeholder="Enter the reply text..."
                                    maxLength={2000}
                                />
                            </div>
                        </section>

                        {/* 3. Media Attachment */}
                        <section className="mb-10 pb-8 border-b border-zinc-800/50">
                            <SectionHeader
                                title="Media Attachment"
                                desc="Update or remove the image attachment."
                            />
                            <div className="space-y-4">
                                {!formData.media && !existingMediaUrl ? (
                                    <div className="relative group">
                                        <div className="border border-zinc-800 border-dashed rounded-lg p-6 bg-zinc-900/30 hover:bg-zinc-900/50 transition-colors flex flex-col items-center justify-center gap-2 cursor-pointer">
                                            <ImageIcon className="w-6 h-6 text-zinc-500 group-hover:text-zinc-400" />
                                            <span className="text-sm text-zinc-500">Click to upload image</span>
                                            <span className="text-xs text-zinc-600">PNG, JPG up to 5MB</span>
                                        </div>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleFileChange}
                                            className="absolute inset-0 opacity-0 cursor-pointer"
                                        />
                                    </div>
                                ) : (
                                    <div className="border border-zinc-800 rounded-lg p-3 bg-zinc-900 flex items-center gap-3">
                                        <div className="w-12 h-12 rounded bg-zinc-800 overflow-hidden relative">
                                            {displayMediaUrl && <img src={displayMediaUrl} alt="Preview" className="w-full h-full object-cover" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm text-zinc-300 truncate font-medium">
                                                {formData.media?.name || 'Existing image'}
                                            </p>
                                            <p className="text-xs text-zinc-500">
                                                {formData.media ? `${(formData.media.size / 1024).toFixed(1)} KB` : 'From server'}
                                            </p>
                                        </div>
                                        <button
                                            onClick={removeImage}
                                            className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                                            type="button"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </section>

                        {/* 4. Rule Status */}
                        <section className="mb-6">
                            <SectionHeader
                                title="Rule Status"
                                desc="Enable or disable this auto-reply rule."
                            />
                            <div className="flex items-center gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${formData.is_active ? 'bg-blue-600' : 'bg-zinc-800'
                                        }`}
                                >
                                    <span
                                        className={`${formData.is_active ? 'translate-x-6' : 'translate-x-1'
                                            } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                                    />
                                </button>
                                <span className="text-sm font-medium text-zinc-300">
                                    {formData.is_active ? 'Rule is Active' : 'Rule is Paused'}
                                </span>
                            </div>
                        </section>
                    </div>

                    {/* Footer Actions */}
                    <div className="px-8 py-4 border-t border-zinc-800 flex justify-end items-center bg-[#09090b] gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2.5 text-sm font-medium text-zinc-400 hover:text-white transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={updateMutation.isPending}
                            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-600/20"
                        >
                            {updateMutation.isPending ? 'Updating...' : 'Update Reminder'}
                        </button>
                    </div>
                </div>

                {/* Right Panel: Preview (40%) */}
                <div className="w-[40%] bg-[#0b141a] relative flex flex-col h-full border-l border-zinc-800">
                    {/* Header */}
                    <div className="h-16 bg-[#202c33] flex items-center px-4 gap-3 border-b border-[#2a3942] z-10">
                        <div className="w-10 h-10 rounded-full bg-black/20 flex items-center justify-center overflow-hidden">
                            <img src="/brobot-logo.png" alt="BroBot" className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="text-[#e9edef] text-sm font-medium truncate">BroBot Assistant</div>
                            <div className="text-[#8696a0] text-xs">Business Account</div>
                        </div>
                        <div className="text-xs text-[#8696a0] uppercase tracking-wider font-semibold">LIVE PREVIEW</div>
                    </div>

                    {/* Chat Area */}
                    <div className="flex-1 relative flex flex-col min-h-0">
                        {/* Background Pattern */}
                        <div className="absolute inset-0 bg-[url('https://static.whatsapp.net/rsrc.php/v3/yl/r/gi_DckOUM5a.png')] bg-repeat opacity-[0.06] pointer-events-none mix-blend-overlay"></div>

                        {/* Messages */}
                        <div className="relative z-10 flex-1 p-6 flex flex-col justify-end gap-3 overflow-y-auto">
                            {/* Date Badge */}
                            <div className="flex justify-center mb-4">
                                <span className="bg-[#182229] text-[#8696a0] text-xs px-3 py-1.5 rounded-lg shadow-sm font-medium">TODAY</span>
                            </div>

                            {/* User Message (Trigger) */}
                            <div className="self-end max-w-[85%] relative group animate-in slide-in-from-right-2">
                                <div className="bg-[#005c4b] p-3 rounded-lg rounded-tr-none shadow text-white text-sm relative">
                                    <div className="whitespace-pre-wrap leading-relaxed">
                                        {formData.trigger || <span className="text-white/50 italic">Type keyword...</span>}
                                    </div>
                                    <div className="text-[10px] text-white/50 text-right mt-1">10:00</div>
                                </div>
                                <div className="absolute top-0 -right-2 w-0 h-0 border-t-[10px] border-t-[#005c4b] border-r-[10px] border-r-transparent"></div>
                            </div>

                            {/* Bot Reply */}
                            <div className="self-start max-w-[85%] relative group animate-in slide-in-from-left-2">
                                <div className="bg-[#202c33] p-1 rounded-lg rounded-tl-none shadow border border-white/5 text-[#e9edef] text-sm relative">
                                    {/* Image Preview */}
                                    {displayMediaUrl && (
                                        <div className="mb-1 rounded-lg overflow-hidden">
                                            <img src={displayMediaUrl} alt="Attached" className="w-full h-auto object-cover max-h-60" />
                                        </div>
                                    )}

                                    <div className="px-2 pt-1 pb-6 whitespace-pre-wrap leading-relaxed">
                                        {formData.reply ? parseWhatsAppFormatting(formData.reply) : <span className="text-white/30 italic">Type reply message...</span>}
                                    </div>
                                    <div className="absolute right-2 bottom-1 text-[10px] text-[#8696a0]">10:00</div>
                                </div>
                                <div className="absolute top-0 -left-2 w-0 h-0 border-t-[10px] border-t-[#202c33] border-l-[10px] border-l-transparent transform scale-x-[-1]"></div>
                            </div>
                        </div>
                    </div>

                    {/* Input Field */}
                    <div className="h-[62px] bg-[#202c33] px-3 flex items-center gap-3 shrink-0 border-t border-[#2a3942] mt-auto relative z-20">
                        <svg className="w-6 h-6 text-[#8696a0]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        <div className="flex-1 bg-[#2a3942] rounded-lg h-9 px-3 flex items-center text-[#8696a0] text-sm">Type a message</div>
                        <div className="w-8 h-8 rounded-full bg-[#00a884] flex items-center justify-center text-white">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                            </svg>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    )
}
