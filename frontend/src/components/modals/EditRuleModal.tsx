'use client'

import { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import RichTextEditor from '@/components/editors/RichTextEditor'
import WhatsAppPreview from '@/components/previews/WhatsAppPreview'
import { X, Zap, ChevronRight, Image as ImageIcon, Trash2 } from 'lucide-react'

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
            setExistingMediaUrl(null) // Clear existing media when new file is selected
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
            let mediaUrl = existingMediaUrl; // Keep existing media by default

            // If new media is uploaded, convert to base64
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

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="bg-[#0e0e11] border border-zinc-800 rounded-xl w-full max-w-5xl h-[600px] shadow-2xl overflow-hidden flex flex-col md:flex-row animate-in zoom-in-95 duration-200">

                {/* Header (Mobile only) */}
                <div className="md:hidden px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-white">Edit Rule</h2>
                    <button onClick={onClose} className="p-2 text-zinc-400 hover:text-white">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Left Column: Form */}
                <div className="flex-1 flex flex-col h-full bg-[#0e0e11]">
                    <div className="p-6 md:p-8 flex-1 overflow-y-auto">
                        <div className="mb-8 hidden md:block">
                            <h2 className="text-xl font-bold text-white tracking-tight">Edit Auto-Reply</h2>
                            <p className="text-zinc-500 text-sm mt-1">Update how the bot responds to this trigger.</p>
                        </div>

                        <div className="space-y-6">
                            {/* Trigger Input */}
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                                    Keyword Trigger <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={formData.trigger}
                                    onChange={(e) => setFormData({ ...formData, trigger: e.target.value })}
                                    placeholder="e.g. price, hello, help"
                                    className="w-full bg-zinc-900/50 border border-zinc-800 text-white text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-zinc-700 placeholder:text-zinc-700 font-mono transition-shadow shadow-sm"
                                    autoFocus
                                />
                                <p className="text-xs text-zinc-600">
                                    Triggered when message contains this exact keyword.
                                </p>
                            </div>

                            {/* Response Input */}
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                                    Response Message <span className="text-red-500">*</span>
                                </label>
                                <RichTextEditor
                                    value={formData.reply}
                                    onChange={(value) => setFormData({ ...formData, reply: value })}
                                    placeholder="Enter the reply text..."
                                    maxLength={2000}
                                />
                            </div>

                            {/* Media Attachment */}
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider flex justify-between">
                                    <span>Attachment (Optional)</span>
                                    {(formData.media || existingMediaUrl) && (
                                        <button
                                            onClick={removeImage}
                                            className="text-red-400 hover:text-red-300 flex items-center gap-1 text-[10px]"
                                            type="button"
                                        >
                                            <Trash2 className="w-3 h-3" /> Remove
                                        </button>
                                    )}
                                </label>
                                {!formData.media && !existingMediaUrl ? (
                                    <div className="relative group">
                                        <div className="border border-zinc-800 border-dashed rounded-lg p-4 bg-zinc-900/30 hover:bg-zinc-900/50 transition-colors flex flex-col items-center justify-center gap-2 cursor-pointer">
                                            <ImageIcon className="w-5 h-5 text-zinc-500 group-hover:text-zinc-400" />
                                            <span className="text-xs text-zinc-500">Click to upload image</span>
                                        </div>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleFileChange}
                                            className="absolute inset-0 opacity-0 cursor-pointer"
                                        />
                                    </div>
                                ) : (
                                    <div className="border border-zinc-800 rounded-lg p-2 bg-zinc-900 flex items-center gap-3">
                                        <div className="w-10 h-10 rounded bg-zinc-800 overflow-hidden relative">
                                            {displayMediaUrl && <img src={displayMediaUrl} alt="Preview" className="w-full h-full object-cover" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs text-zinc-300 truncate font-medium">
                                                {formData.media?.name || 'Existing image'}
                                            </p>
                                            <p className="text-[10px] text-zinc-500">
                                                {formData.media ? `${(formData.media.size / 1024).toFixed(1)} KB` : 'From server'}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Active Toggle */}
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
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="px-6 md:px-8 py-4 border-t border-zinc-800 flex justify-between items-center bg-[#0e0e11]">
                        <button
                            type="button"
                            onClick={onClose}
                            className="text-sm font-medium text-zinc-500 hover:text-zinc-300 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={updateMutation.isPending}
                            className="flex items-center gap-2 px-4 py-2 bg-white text-black hover:bg-zinc-200 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                        >
                            {updateMutation.isPending ? (
                                <span className="animate-pulse">Saving...</span>
                            ) : (
                                <>
                                    Update Rule
                                    <ChevronRight className="w-4 h-4" />
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Right Column: Preview */}
                <div className="hidden md:flex w-[400px] bg-zinc-950 border-l border-zinc-800 relative flex-col">
                    <div className="p-4 border-b border-zinc-900 bg-zinc-950">
                        <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Live Preview</h3>
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
