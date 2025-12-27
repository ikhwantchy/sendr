'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import RichTextEditor from '@/components/editors/RichTextEditor'
import WhatsAppPreview from '@/components/previews/WhatsAppPreview'

interface CreateRuleModalProps {
    botId: string
    onClose: () => void
}

export default function CreateRuleModal({ botId, onClose }: CreateRuleModalProps) {
    const queryClient = useQueryClient()
    const [formData, setFormData] = useState({
        trigger: '',
        reply: '',
        match_type: 'contains' as 'exact' | 'contains' | 'starts_with' | 'ends_with',
        is_active: true,
    })

    const createMutation = useMutation({
        mutationFn: async (data: any) => {
            // Transform frontend data to backend schema (keyword_rules table)
            const backendData = {
                bot_id: botId,
                name: `Auto-reply: ${data.trigger}`,
                keyword: data.trigger,
                match_type: 'contains',  // Backend expects: equals, contains, regex
                scope: 'global',         // Backend expects: global, group, contact
                scope_target: null,
                priority: 10,
                actions: [{
                    type: 'SEND_TEXT',   // ← Backend ActionEngine expects this!
                    config: {
                        message: data.reply,
                        variables: {}
                    }
                }],
                metadata: {},
                is_active: data.is_active ? 1 : 0  // SQLite uses 1/0 for boolean
            }

            console.log('=== CREATE RULE ===')
            console.log('Frontend data:', data)
            console.log('Backend data:', backendData)
            console.log('==================')

            return await api.rules.create(backendData)
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['rules', botId] })
            toast.success('Rule created successfully!')
            onClose()
        },
        onError: (error: any) => {
            console.error('Create rule error:', error)
            console.error('Error response:', error.response)
            const errorMessage = error.response?.data?.message ||
                error.response?.data?.error ||
                'Failed to create rule'
            toast.error(errorMessage)
        },
    })

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!formData.trigger || !formData.reply) {
            toast.error('Please fill all required fields')
            return
        }
        createMutation.mutate(formData)
    }

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="glass rounded-2xl border border-white/10 max-w-6xl w-full max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="p-6 border-b border-white/10">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-bold text-white">Create Auto-Reply Rule</h2>
                            <p className="text-sm text-gray-400 mt-1">Set up automatic responses for keywords</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-8 h-8 rounded-lg hover:bg-white/10 transition-colors flex items-center justify-center text-gray-400 hover:text-white"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[calc(90vh-140px)]">
                    <div className="p-6 space-y-6">
                        {/* Keyword */}
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">
                                Keyword / Trigger <span className="text-red-400">*</span>
                            </label>
                            <input
                                type="text"
                                value={formData.trigger}
                                onChange={(e) => setFormData({ ...formData, trigger: e.target.value })}
                                placeholder="e.g., hello, hi, info, price"
                                className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 transition-colors"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                When someone sends this keyword, bot will auto-reply
                            </p>
                        </div>

                        {/* Editor and Preview Side by Side */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Left: Editor */}
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">
                                    Reply Message <span className="text-red-400">*</span>
                                </label>
                                <RichTextEditor
                                    value={formData.reply}
                                    onChange={(value) => setFormData({ ...formData, reply: value })}
                                    placeholder="Enter your auto-reply message..."
                                    maxLength={1000}
                                />
                            </div>

                            {/* Right: Preview */}
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">
                                    Preview
                                </label>
                                <WhatsAppPreview
                                    message={formData.reply || 'Your message will appear here...'}
                                    isOwn={false}
                                />
                            </div>
                        </div>

                        {/* Active Toggle */}
                        <div className="flex items-center justify-between p-4 bg-black/20 rounded-lg border border-white/10">
                            <div>
                                <div className="font-medium text-white">Active</div>
                                <div className="text-sm text-gray-400">Enable this rule immediately</div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}
                                className={`relative w-12 h-6 rounded-full transition-colors ${formData.is_active ? 'bg-cyan-500' : 'bg-gray-600'
                                    }`}
                            >
                                <div
                                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${formData.is_active ? 'translate-x-6' : 'translate-x-0'
                                        }`}
                                />
                            </button>
                        </div>
                    </div>
                </form>

                {/* Footer */}
                <div className="p-6 border-t border-white/10 flex gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 px-4 py-3 bg-white/5 border border-white/10 text-gray-300 rounded-xl hover:bg-white/10 transition-all font-semibold"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={createMutation.isPending}
                        className="flex-1 px-4 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl hover:shadow-lg hover:shadow-cyan-500/50 transition-all disabled:opacity-50 font-semibold"
                    >
                        {createMutation.isPending ? 'Creating...' : 'Create Rule'}
                    </button>
                </div>
            </div>
        </div>
    )
}
