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
                <div className="w-[40%] bg-zinc-950 flex flex-col">
                    <div className="p-6 border-b border-zinc-900 bg-zinc-950">
                        <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                            <MessageSquare size={16} />
                            Live Preview
                        </h3>
                    </div>
                    <div className="flex-1 p-6 flex flex-col items-center justify-center bg-[url('/whatsapp-bg-dark.png')] bg-cover bg-center opacity-80 backdrop-blur-sm grayscale-[0.8]">
                        {/* Mock Phone Frame */}
                        <div className="w-[300px] bg-[#0b141a] rounded-3xl border-[3px] border-zinc-800 shadow-2xl overflow-hidden flex flex-col h-[500px]">
                            {/* WA Header */}
                            <div className="h-14 bg-[#202c33] flex items-center px-4 gap-3 border-b border-zinc-800">
                                <div className="w-8 h-8 rounded-full bg-zinc-600" />
                                <div className="flex-1">
                                    <div className="h-2 w-20 bg-zinc-700 rounded mb-1" />
                                    <div className="h-1.5 w-12 bg-zinc-800 rounded" />
                                </div>
                            </div>

                            {/* Chat Area */}
                            <div className="flex-1 p-4 space-y-4 overflow-hidden relative">
                                {/* Trigger Msg */}
                                <div className="flex justify-end">
                                    <div className="bg-[#005c4b] text-white text-xs p-2 rounded-lg rounded-tr-none max-w-[80%] shadow-sm">
                                        {formData.trigger || '...'}
                                        <div className="text-[9px] text-white/50 text-right mt-1">10:00</div>
                                    </div>
                                </div>

                                {/* Reply Msg */}
                                <div className="flex justify-start">
                                    <div className="bg-[#202c33] text-zinc-100 text-xs p-2 rounded-lg rounded-tl-none max-w-[80%] shadow-sm">
                                        {/* Image Preview in Message */}
                                        {displayMediaUrl && (
                                            <div className="mb-2 rounded overflow-hidden">
                                                <img src={displayMediaUrl} alt="Sent Media" className="w-full h-auto object-cover max-h-40" />
                                            </div>
                                        )}
                                        {formData.reply || '...'}
                                        <div className="text-[9px] text-zinc-500 text-right mt-1 flex items-center justify-end gap-1">
                                            10:00
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    )
}
