'use client'

import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'next/navigation'
import { api } from '@/lib/api'

export default function CampaignsPage() {
    const [showCreateModal, setShowCreateModal] = useState(false)
    const queryClient = useQueryClient()
    const searchParams = useSearchParams()
    const preselectedBotId = searchParams.get('bot')

    // Auto-open modal if bot parameter exists
    useEffect(() => {
        if (preselectedBotId) {
            setShowCreateModal(true)
        }
    }, [preselectedBotId])

    const { data: campaigns, isLoading } = useQuery({
        queryKey: ['campaigns'],
        queryFn: async () => {
            const response = await api.campaigns.list()
            return response.data.data || []
        },
    })

    return (
        <div className="p-8">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
                        <span className="w-1.5 h-10 bg-gradient-to-b from-purple-400 to-pink-600 rounded-full"></span>
                        Broadcast Campaigns
                    </h1>
                    <p className="text-gray-400 text-lg">Send messages and images to multiple contacts</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="group px-6 py-3.5 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-xl font-bold hover:shadow-2xl hover:shadow-purple-500/50 transition-all flex items-center gap-2 hover-lift relative overflow-hidden"
                >
                    <div className="absolute inset-0 shimmer opacity-0 group-hover:opacity-100"></div>
                    <svg className="w-5 h-5 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <span className="relative z-10">New Campaign</span>
                </button>
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center py-12">
                    <div className="relative w-16 h-16">
                        <div className="absolute inset-0 rounded-full border-4 border-purple-500/20"></div>
                        <div className="absolute inset-0 rounded-full border-4 border-purple-500 border-t-transparent animate-spin"></div>
                    </div>
                </div>
            ) : campaigns && campaigns.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {campaigns.map((campaign: any) => (
                        <CampaignCard key={campaign.id} campaign={campaign} />
                    ))}
                </div>
            ) : (
                <div className="text-center py-16 glass rounded-2xl border-2 border-dashed border-white/10">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-2xl mb-6">
                        <svg className="w-10 h-10 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                        </svg>
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">No campaigns yet</h3>
                    <p className="text-gray-400 mb-6">Create your first broadcast campaign</p>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-purple-500/50 transition-all hover-lift"
                    >
                        New Campaign
                    </button>
                </div>
            )}

            {showCreateModal && (
                <CreateCampaignModal
                    preselectedBotId={preselectedBotId}
                    onClose={() => setShowCreateModal(false)}
                    onSuccess={() => {
                        setShowCreateModal(false)
                        queryClient.invalidateQueries({ queryKey: ['campaigns'] })
                    }}
                />
            )}
        </div>
    )
}

interface Contact {
    phone: string;
    name: string;
}

function CreateCampaignModal({ preselectedBotId, onClose, onSuccess }: any) {
    const [formData, setFormData] = useState({
        bot_id: '',
        name: '',
        message_template: '',
        target_type: 'specific' as 'all' | 'specific',
    })
    const [contacts, setContacts] = useState<Contact[]>([])
    const [uploadMethod, setUploadMethod] = useState<'csv' | 'sheets' | 'manual'>('csv')
    const [sheetsUrl, setSheetsUrl] = useState('')
    const [manualInput, setManualInput] = useState('')
    const [uploadedImage, setUploadedImage] = useState<File | null>(null)
    const [imagePreview, setImagePreview] = useState<string | null>(null)
    const textareaRef = useRef<HTMLTextAreaElement>(null)

    const { data: bots } = useQuery({
        queryKey: ['bots'],
        queryFn: async () => {
            const response = await api.bots.list()
            return response.data.data || []
        },
    })

    // Auto-set bot_id if preselected
    useEffect(() => {
        if (preselectedBotId) {
            setFormData(prev => ({ ...prev, bot_id: preselectedBotId }))
        }
    }, [preselectedBotId])

    // Debug: Log contacts changes
    useEffect(() => {
        console.log('🔄 Contacts state changed:', contacts.length, 'contacts')
        console.log('Contacts:', contacts)
    }, [contacts])

    // Format WhatsApp text for preview
    const formatWhatsAppText = (text: string): JSX.Element => {
        // Replace variables first
        let formatted = text
            .replace(/\{\{name\}\}/gi, previewContact.name || 'Customer')
            .replace(/\{\{phone\}\}/gi, previewContact.phone)

        // Split by formatting markers and render
        const parts: JSX.Element[] = []
        let key = 0

        // Bold: *text*
        formatted = formatted.replace(/\*([^*]+)\*/g, (match, p1) => `<b>${p1}</b>`)
        // Italic: _text_
        formatted = formatted.replace(/_([^_]+)_/g, (match, p1) => `<i>${p1}</i>`)
        // Strikethrough: ~text~
        formatted = formatted.replace(/~([^~]+)~/g, (match, p1) => `<s>${p1}</s>`)
        // Monospace: ```text```
        formatted = formatted.replace(/```([^`]+)```/g, (match, p1) => `<code>${p1}</code>`)

        return <span dangerouslySetInnerHTML={{ __html: formatted }} />
    }

    // Replace template variables (for table preview)
    const replaceVariables = (template: string, contact: Contact): string => {
        return template
            .replace(/\{\{name\}\}/gi, contact.name || 'Customer')
            .replace(/\{\{phone\}\}/gi, contact.phone)
    }

    // Get first contact with name for preview
    const getPreviewContact = (): Contact => {
        const contactWithName = contacts.find(c => c.name)
        return contactWithName || contacts[0] || { phone: '628123456789', name: 'Customer' }
    }

    const previewContact = getPreviewContact()

    // Emoji picker state
    const [showEmojiPicker, setShowEmojiPicker] = useState(false)

    // Contact table visibility state
    const [showContactTable, setShowContactTable] = useState(false)

    // Comprehensive emoji list
    const emojiCategories = {
        'Smileys': ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '🥲', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥', '😌', '😔', '😪', '🤤', '😴'],
        'Gestures': ['👋', '🤚', '🖐', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏'],
        'Hearts': ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝'],
        'Celebrations': ['🎉', '🎊', '🎈', '🎁', '🎀', '🎂', '🍰', '🧁', '🥳', '🎆', '🎇', '✨', '🎃', '🎄', '🎋', '🎍', '🎏', '🎐', '🎑'],
        'Symbols': ['✅', '❌', '⭕', '✔️', '☑️', '❎', '➕', '➖', '➗', '✖️', '💯', '🔥', '⚡', '💥', '💫', '⭐', '🌟', '✨', '💢', '💬', '💭', '🗯️', '💤'],
        'Objects': ['📱', '💻', '⌨️', '🖥️', '🖨️', '🖱️', '🖲️', '💾', '💿', '📀', '📷', '📸', '📹', '🎥', '📞', '☎️', '📟', '📠', '📺', '📻', '🎙️', '🎚️', '🎛️', '🧭', '⏰', '⏱️', '⏲️', '⏳', '📡'],
    }


    // Format text (WhatsApp style)
    const insertFormatting = (format: 'bold' | 'italic' | 'strikethrough' | 'monospace') => {
        const textarea = textareaRef.current
        if (!textarea) return

        const start = textarea.selectionStart
        const end = textarea.selectionEnd
        const selectedText = formData.message_template.substring(start, end)

        let formattedText = ''
        switch (format) {
            case 'bold':
                formattedText = `*${selectedText}*`
                break
            case 'italic':
                formattedText = `_${selectedText}_`
                break
            case 'strikethrough':
                formattedText = `~${selectedText}~`
                break
            case 'monospace':
                formattedText = `\`\`\`${selectedText}\`\`\``
                break
        }

        const newText = formData.message_template.substring(0, start) + formattedText + formData.message_template.substring(end)
        setFormData({ ...formData, message_template: newText })

        // Restore cursor position
        setTimeout(() => {
            textarea.focus()
            textarea.setSelectionRange(start + formattedText.length, start + formattedText.length)
        }, 0)
    }

    // Insert emoji
    const insertEmoji = (emoji: string) => {
        const textarea = textareaRef.current
        if (!textarea) return

        const start = textarea.selectionStart
        const newText = formData.message_template.substring(0, start) + emoji + formData.message_template.substring(start)
        setFormData({ ...formData, message_template: newText })

        setTimeout(() => {
            textarea.focus()
            textarea.setSelectionRange(start + emoji.length, start + emoji.length)
        }, 0)
    }

    // Parse CSV - SIMPLIFIED (Match Google Sheets logic)
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        console.log('=== CSV FILE UPLOAD ===')
        console.log('File name:', file.name)

        try {
            const text = await file.text()
            console.log('Raw text length:', text.length)
            console.log('Raw text preview:', text.substring(0, 200))

            const lines = text.split(/\r?\n/).map(line => line.trim()).filter(line => line)
            console.log('Total lines after split:', lines.length)
            console.log('Lines:', lines)

            const parsedContacts: Contact[] = []

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i]
                console.log(`\nProcessing line ${i}:`, line)

                // Skip header
                if (i === 0 && line.toLowerCase().includes('nama')) {
                    console.log('  → Skipped (header)')
                    continue
                }

                const parts = line.split(',').map(p => p.trim().replace(/^["']|["']$/g, ''))
                console.log('  Parts:', parts)

                if (parts.length >= 2) {
                    const firstCleaned = parts[0].replace(/[\s-]/g, '')
                    const secondCleaned = parts[1].replace(/[\s-]/g, '')

                    console.log('  First cleaned:', firstCleaned)
                    console.log('  Second cleaned:', secondCleaned)

                    const firstIsPhone = /^\+?\d{10,}$/.test(firstCleaned)
                    const secondIsPhone = /^\+?\d{10,}$/.test(secondCleaned)

                    console.log('  First is phone?', firstIsPhone)
                    console.log('  Second is phone?', secondIsPhone)

                    if (secondIsPhone && !firstIsPhone) {
                        // name,phone format
                        const contact = {
                            phone: secondCleaned.replace(/[^\d]/g, ''),
                            name: parts[0]
                        }
                        parsedContacts.push(contact)
                        console.log('  ✅ Added:', contact)
                    } else if (firstIsPhone && !secondIsPhone) {
                        // phone,name format
                        const contact = {
                            phone: firstCleaned.replace(/[^\d]/g, ''),
                            name: parts[1]
                        }
                        parsedContacts.push(contact)
                        console.log('  ✅ Added:', contact)
                    } else {
                        console.log('  ❌ Skipped (format unclear)')
                    }
                } else if (parts.length === 1) {
                    // Just phone
                    const cleaned = parts[0].replace(/[\s-]/g, '')
                    if (/^\+?\d{10,}$/.test(cleaned)) {
                        const contact = {
                            phone: cleaned.replace(/[^\d]/g, ''),
                            name: ''
                        }
                        parsedContacts.push(contact)
                        console.log('  ✅ Added (phone only):', contact)
                    }
                }
            }

            console.log('\n=== FINAL RESULT ===')
            console.log('Total contacts:', parsedContacts.length)
            console.log('Contacts:', parsedContacts)

            setContacts([...parsedContacts])
            console.log('✅ setContacts called with', parsedContacts.length, 'contacts')
        } catch (error) {
            console.error('❌ CSV parsing error:', error)
            alert('Failed to parse CSV file. Please check the format.')
        }
    }

    // Load from Google Sheets
    const handleSheetsLoad = async () => {
        if (!sheetsUrl) return

        try {
            const match = sheetsUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)
            if (!match) {
                alert('Invalid Google Sheets URL')
                return
            }

            const sheetId = match[1]
            const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`

            console.log('Loading from Google Sheets:', csvUrl)

            const response = await fetch(csvUrl)
            const text = await response.text()

            const lines = text.split('\n').map(line => line.trim()).filter(line => line)
            const parsedContacts: Contact[] = []

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i]

                // Skip header
                if (i === 0 && line.toLowerCase().includes('nama')) continue

                const parts = line.split(',').map(p => p.trim().replace(/^["']|["']$/g, ''))

                if (parts.length >= 2) {
                    const firstCleaned = parts[0].replace(/[\s-]/g, '')
                    const secondCleaned = parts[1].replace(/[\s-]/g, '')

                    const firstIsPhone = /^\+?\d{10,}$/.test(firstCleaned)
                    const secondIsPhone = /^\+?\d{10,}$/.test(secondCleaned)

                    if (secondIsPhone && !firstIsPhone) {
                        parsedContacts.push({
                            phone: secondCleaned.replace(/[^\d]/g, ''),
                            name: parts[0]
                        })
                    }
                }
            }

            console.log('Loaded from Sheets:', parsedContacts)
            setContacts(parsedContacts)
        } catch (error) {
            console.error('Failed to load Google Sheets:', error)
            alert('Failed to load Google Sheets. Make sure the sheet is publicly accessible.')
        }
    }

    // Parse manual input
    const handleManualInputChange = (value: string) => {
        setManualInput(value)

        const numbers = value.split(',').map(n => n.trim()).filter(n => n.length >= 10)
        const parsedContacts: Contact[] = numbers.map(phone => ({
            phone: phone.replace(/[^\d+]/g, ''),
            name: ''
        }))

        setContacts(parsedContacts)
    }

    // Handle image upload
    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setUploadedImage(file)

        const reader = new FileReader()
        reader.onloadend = () => {
            setImagePreview(reader.result as string)
        }
        reader.readAsDataURL(file)
    }

    const createMutation = useMutation({
        mutationFn: async (data: any) => {
            const payload = {
                bot_id: data.bot_id,
                name: data.name,
                message_template: data.message_template,
                target_type: data.target_type,
                target_contacts: contacts.map(c => c.phone),
                has_image: !!uploadedImage,
            }

            return await api.campaigns.create(payload)
        },
        onSuccess,
    })

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        createMutation.mutate(formData)
    }

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="glass-strong rounded-3xl max-w-6xl w-full p-8 max-h-[90vh] overflow-y-auto border border-white/20 shadow-2xl">
                <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
                    <span className="w-1.5 h-8 bg-gradient-to-b from-purple-400 to-pink-600 rounded-full"></span>
                    Create Campaign
                </h2>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Left: Form */}
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Bot Selection */}
                        <div>
                            <label className="block text-sm font-semibold text-white mb-2">
                                Select Bot
                            </label>
                            {preselectedBotId ? (
                                <div className="w-full px-4 py-3 bg-white/5 border border-purple-500/50 rounded-xl text-white backdrop-blur-sm flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                                        <span className="font-medium">
                                            {bots?.find((bot: any) => bot.id === preselectedBotId)?.name || 'Selected Bot'}
                                        </span>
                                        <span className="text-gray-400 text-sm">
                                            ({bots?.find((bot: any) => bot.id === preselectedBotId)?.phone_number || 'Loading...'})
                                        </span>
                                    </div>
                                    <span className="text-xs text-purple-400 bg-purple-500/20 px-3 py-1 rounded-full">
                                        Pre-selected
                                    </span>
                                </div>
                            ) : (
                                <select
                                    required
                                    value={formData.bot_id}
                                    onChange={(e) => setFormData({ ...formData, bot_id: e.target.value })}
                                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent backdrop-blur-sm"
                                >
                                    <option value="" className="bg-gray-800">Choose a bot...</option>
                                    {bots?.map((bot: any) => (
                                        <option key={bot.id} value={bot.id} className="bg-gray-800">
                                            {bot.name} ({bot.phone_number || 'Not connected'})
                                        </option>
                                    ))}
                                </select>
                            )}
                        </div>

                        {/* Campaign Name */}
                        <div>
                            <label className="block text-sm font-semibold text-white mb-2">
                                Campaign Name
                            </label>
                            <input
                                type="text"
                                required
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="e.g., Product Launch Announcement"
                                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent backdrop-blur-sm"
                            />
                        </div>

                        {/* Message Template with Formatting Toolbar */}
                        <div>
                            <label className="block text-sm font-semibold text-white mb-2">
                                Message Template
                            </label>

                            {/* WhatsApp-style Formatting Toolbar */}
                            <div className="flex items-center gap-2 mb-2 p-2 bg-white/5 rounded-xl border border-white/10">
                                <button
                                    type="button"
                                    onClick={() => insertFormatting('bold')}
                                    className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg transition text-white font-bold text-sm"
                                    title="Bold (*text*)"
                                >
                                    B
                                </button>
                                <button
                                    type="button"
                                    onClick={() => insertFormatting('italic')}
                                    className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg transition text-white italic text-sm"
                                    title="Italic (_text_)"
                                >
                                    I
                                </button>
                                <button
                                    type="button"
                                    onClick={() => insertFormatting('strikethrough')}
                                    className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg transition text-white line-through text-sm"
                                    title="Strikethrough (~text~)"
                                >
                                    S
                                </button>
                                <button
                                    type="button"
                                    onClick={() => insertFormatting('monospace')}
                                    className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg transition text-white font-mono text-sm"
                                    title="Monospace (```text```)"
                                >
                                    M
                                </button>
                                <div className="w-px h-6 bg-white/20"></div>
                                {/* Emoji Picker Button */}
                                <button
                                    type="button"
                                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                    className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg transition text-white text-sm flex items-center gap-1"
                                    title="Emoji Picker"
                                >
                                    😊 Emoji
                                </button>
                            </div>

                            {/* Emoji Picker Modal */}
                            {showEmojiPicker && (
                                <div className="mb-2 p-4 bg-white/10 rounded-xl border border-white/20 max-h-64 overflow-y-auto">
                                    <div className="flex items-center justify-between mb-3">
                                        <h4 className="text-sm font-semibold text-white">Select Emoji</h4>
                                        <button
                                            type="button"
                                            onClick={() => setShowEmojiPicker(false)}
                                            className="text-gray-400 hover:text-white transition"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                    {Object.entries(emojiCategories).map(([category, emojis]) => (
                                        <div key={category} className="mb-4">
                                            <p className="text-xs text-gray-400 font-semibold mb-2">{category}</p>
                                            <div className="grid grid-cols-10 gap-1">
                                                {emojis.map((emoji, index) => (
                                                    <button
                                                        key={index}
                                                        type="button"
                                                        onClick={() => {
                                                            insertEmoji(emoji)
                                                            setShowEmojiPicker(false)
                                                        }}
                                                        className="w-8 h-8 flex items-center justify-center hover:bg-white/20 rounded transition text-xl"
                                                    >
                                                        {emoji}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <textarea
                                ref={textareaRef}
                                required
                                value={formData.message_template}
                                onChange={(e) => setFormData({ ...formData, message_template: e.target.value })}
                                placeholder="Halo {{name}}, promo spesial untuk Anda!"
                                rows={4}
                                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent backdrop-blur-sm"
                            />
                            <p className="text-xs text-gray-400 mt-2">
                                💡 Use <code className="px-1 py-0.5 bg-white/10 rounded">{'{{name}}'}</code> and <code className="px-1 py-0.5 bg-white/10 rounded">{'{{phone}}'}</code>
                            </p>
                        </div>

                        {/* Image Upload */}
                        <div>
                            <label className="block text-sm font-semibold text-white mb-2">
                                📷 Attach Image (Optional)
                            </label>
                            <div className="flex items-center gap-4">
                                <label className="flex-1 cursor-pointer">
                                    <div className="flex items-center gap-3 px-4 py-3 bg-white/10 border border-white/20 rounded-xl hover:bg-white/20 transition">
                                        <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                        <span className="text-white text-sm">
                                            {uploadedImage ? uploadedImage.name : 'Choose image...'}
                                        </span>
                                    </div>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleImageUpload}
                                        className="hidden"
                                    />
                                </label>
                                {imagePreview && (
                                    <div className="relative w-20 h-20 rounded-xl overflow-hidden border-2 border-purple-500">
                                        <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setUploadedImage(null)
                                                setImagePreview(null)
                                            }}
                                            className="absolute top-1 right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white text-xs hover:bg-red-600"
                                        >
                                            ×
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Target Type */}
                        <div>
                            <label className="block text-sm font-semibold text-white mb-2">
                                Send To
                            </label>
                            <div className="flex gap-4">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        value="all"
                                        checked={formData.target_type === 'all'}
                                        onChange={(e) => setFormData({ ...formData, target_type: e.target.value as any })}
                                        className="w-4 h-4 text-purple-500"
                                    />
                                    <span className="text-white">All Contacts</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        value="specific"
                                        checked={formData.target_type === 'specific'}
                                        onChange={(e) => setFormData({ ...formData, target_type: e.target.value as any })}
                                        className="w-4 h-4 text-purple-500"
                                    />
                                    <span className="text-white">Specific Numbers</span>
                                </label>
                            </div>
                        </div>

                        {/* Target Contacts - DROPDOWN */}
                        {formData.target_type === 'specific' && (
                            <div className="space-y-4">
                                {/* Upload Method Dropdown */}
                                <div>
                                    <label className="block text-sm font-semibold text-white mb-2">
                                        📋 Contact Source
                                    </label>
                                    <select
                                        value={uploadMethod}
                                        onChange={(e) => setUploadMethod(e.target.value as any)}
                                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent backdrop-blur-sm"
                                    >
                                        <option value="csv" className="bg-gray-800">📁 Upload CSV File</option>
                                        <option value="sheets" className="bg-gray-800">📊 Google Sheets URL</option>
                                        <option value="manual" className="bg-gray-800">✍️ Enter Manually</option>
                                    </select>
                                </div>

                                {/* CSV Upload */}
                                {uploadMethod === 'csv' && (
                                    <div>
                                        <input
                                            type="file"
                                            accept=".csv,.txt"
                                            onChange={handleFileUpload}
                                            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-purple-500 file:text-white hover:file:bg-purple-600 cursor-pointer text-sm"
                                        />
                                        <div className="mt-3 p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
                                            <p className="text-xs text-blue-300 font-semibold mb-2">📝 CSV Format:</p>
                                            <code className="text-xs text-blue-200 block bg-black/30 p-2 rounded">
                                                Nama,Nomor<br />
                                                Ikhwan,62-85710569566<br />
                                                Aura,62-88716916002
                                            </code>
                                            <p className="text-xs text-blue-300 mt-2">✅ With header row (Nama, Nomor)</p>
                                        </div>
                                    </div>
                                )}

                                {/* Google Sheets */}
                                {uploadMethod === 'sheets' && (
                                    <div>
                                        <div className="flex gap-2">
                                            <input
                                                type="url"
                                                value={sheetsUrl}
                                                onChange={(e) => setSheetsUrl(e.target.value)}
                                                placeholder="https://docs.google.com/spreadsheets/d/..."
                                                className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent backdrop-blur-sm"
                                            />
                                            <button
                                                type="button"
                                                onClick={handleSheetsLoad}
                                                className="px-6 py-3 bg-green-500 text-white rounded-xl hover:bg-green-600 transition font-semibold"
                                            >
                                                Load
                                            </button>
                                        </div>
                                        <div className="mt-3 p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
                                            <p className="text-xs text-green-300 font-semibold mb-2">📊 How to use Google Sheets:</p>
                                            <ol className="text-xs text-green-200 space-y-1 list-decimal list-inside">
                                                <li>Create spreadsheet with columns: Nama, Nomor</li>
                                                <li>Click "Share" → "Anyone with the link can view"</li>
                                                <li>Copy the URL and paste above</li>
                                                <li>Click "Load" to import contacts</li>
                                            </ol>
                                        </div>
                                    </div>
                                )}

                                {/* Manual Input */}
                                {uploadMethod === 'manual' && (
                                    <div>
                                        <textarea
                                            value={manualInput}
                                            onChange={(e) => handleManualInputChange(e.target.value)}
                                            placeholder="628123456789, 628987654321, 628111222333"
                                            rows={4}
                                            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent backdrop-blur-sm font-mono text-sm"
                                        />
                                        <p className="text-xs text-gray-400 mt-2">
                                            Enter phone numbers separated by commas
                                        </p>
                                    </div>
                                )}

                                {/* Contacts Preview - COLLAPSIBLE */}
                                {contacts.length > 0 && (
                                    <div className="glass rounded-xl p-4 border border-white/20">
                                        <div className="flex items-center justify-between mb-3">
                                            <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                                                <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                </svg>
                                                {contacts.length} Contacts Ready
                                            </h4>
                                            <button
                                                type="button"
                                                onClick={() => setShowContactTable(!showContactTable)}
                                                className="flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg transition text-white text-xs"
                                            >
                                                {showContactTable ? (
                                                    <>
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                                        </svg>
                                                        Hide
                                                    </>
                                                ) : (
                                                    <>
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                        </svg>
                                                        Show Details
                                                    </>
                                                )}
                                            </button>
                                        </div>

                                        {/* Collapsible table */}
                                        {showContactTable && (
                                            <div className="max-h-64 overflow-y-auto">
                                                <table className="w-full text-sm">
                                                    <thead className="sticky top-0 bg-gray-800/90 backdrop-blur-sm">
                                                        <tr className="border-b border-white/10">
                                                            <th className="text-left py-2 px-3 text-gray-400 font-semibold">#</th>
                                                            <th className="text-left py-2 px-3 text-gray-400 font-semibold">Name</th>
                                                            <th className="text-left py-2 px-3 text-gray-400 font-semibold">Phone</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {contacts.slice(0, 50).map((contact, index) => (
                                                            <tr key={index} className="border-b border-white/5 hover:bg-white/5">
                                                                <td className="py-2 px-3 text-gray-500">{index + 1}</td>
                                                                <td className="py-2 px-3 text-white">{contact.name || '-'}</td>
                                                                <td className="py-2 px-3 text-gray-300 font-mono text-xs">{contact.phone}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                                {contacts.length > 50 && (
                                                    <p className="text-xs text-gray-500 text-center py-2">
                                                        Showing first 50 of {contacts.length} contacts
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Buttons */}
                        <div className="flex gap-3 pt-4">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 px-6 py-3 bg-white/10 text-white rounded-xl hover:bg-white/20 transition font-semibold"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={createMutation.isPending || (formData.target_type === 'specific' && contacts.length === 0)}
                                className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-xl hover:from-purple-600 hover:to-pink-700 transition disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-lg shadow-purple-500/30"
                            >
                                {createMutation.isPending ? 'Creating...' : `Send to ${contacts.length} contacts`}
                            </button>
                        </div>

                        {createMutation.isError && (
                            <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-xl text-red-200 text-sm">
                                ❌ Failed to create campaign. Please try again.
                            </div>
                        )}
                    </form>

                    {/* Right: WhatsApp Chat Preview */}
                    <div className="lg:sticky lg:top-8 lg:self-start">
                        <div className="glass rounded-2xl p-6 border border-white/20">
                            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
                                    <path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z" />
                                </svg>
                                Message Preview
                            </h3>

                            {formData.message_template && contacts.length > 0 ? (
                                <div className="space-y-4">
                                    {/* WhatsApp Chat Room Style */}
                                    <div className="bg-[#0d1418] rounded-2xl p-4 min-h-[400px] flex flex-col">
                                        {/* Chat Header */}
                                        <div className="flex items-center gap-3 pb-4 border-b border-white/10 mb-4">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-lg">
                                                {previewContact.name ? previewContact.name[0].toUpperCase() : '?'}
                                            </div>
                                            <div>
                                                <p className="text-white font-semibold">{previewContact.name || 'Customer'}</p>
                                                <p className="text-xs text-gray-400">{previewContact.phone}</p>
                                            </div>
                                        </div>

                                        {/* Message Bubble */}
                                        <div className="flex-1 flex items-end">
                                            <div className="bg-[#005c4b] rounded-2xl rounded-bl-sm p-4 max-w-[85%] shadow-lg">
                                                {imagePreview && (
                                                    <img src={imagePreview} alt="Preview" className="w-full rounded-lg mb-3" />
                                                )}
                                                <div className="text-white text-sm whitespace-pre-wrap break-words leading-relaxed">
                                                    {formatWhatsAppText(formData.message_template)}
                                                </div>
                                                <div className="flex items-center justify-end gap-1 mt-2">
                                                    <span className="text-xs text-gray-300">
                                                        {new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                    <svg className="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                                                        <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
                                                    </svg>
                                                    <svg className="w-4 h-4 text-blue-400 -ml-2" fill="currentColor" viewBox="0 0 20 20">
                                                        <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
                                                    </svg>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Info */}
                                    <div className="text-xs text-gray-400 space-y-1 bg-white/5 rounded-xl p-3">
                                        <p className="flex items-center gap-2">
                                            <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                            </svg>
                                            Preview shows how message will look
                                        </p>
                                        <p className="flex items-center gap-2">
                                            <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                            </svg>
                                            Variables replaced for each contact
                                        </p>
                                        <p className="flex items-center gap-2">
                                            <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                            </svg>
                                            Total recipients: <span className="text-white font-bold">{contacts.length}</span>
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-12 text-gray-500">
                                    <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                    </svg>
                                    <p>Enter message and contacts to see preview</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

function CampaignCard({ campaign }: any) {
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed': return 'bg-green-500/20 text-green-300 border-green-500/30'
            case 'running': return 'bg-blue-500/20 text-blue-300 border-blue-500/30'
            case 'failed': return 'bg-red-500/20 text-red-300 border-red-500/30'
            default: return 'bg-gray-500/20 text-gray-300 border-gray-500/30'
        }
    }

    return (
        <div className="glass rounded-2xl border border-white/10 p-6 hover-lift group relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative">
                <div className="flex items-start justify-between mb-4">
                    <h3 className="text-lg font-bold text-white">{campaign.name}</h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(campaign.status)}`}>
                        {campaign.status}
                    </span>
                </div>

                <div className="space-y-3 text-sm">
                    <div className="flex justify-between items-center">
                        <span className="text-gray-400">Total:</span>
                        <span className="font-bold text-white">{campaign.total_contacts || 0}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-gray-400">Sent:</span>
                        <span className="font-bold text-green-400">{campaign.sent_count || 0}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-gray-400">Failed:</span>
                        <span className="font-bold text-red-400">{campaign.failed_count || 0}</span>
                    </div>
                </div>

                {campaign.total_contacts > 0 && (
                    <div className="mt-4">
                        <div className="w-full bg-white/10 rounded-full h-2.5 overflow-hidden">
                            <div
                                className="bg-gradient-to-r from-purple-500 to-pink-600 h-2.5 rounded-full transition-all shadow-lg shadow-purple-500/50"
                                style={{
                                    width: `${((campaign.sent_count || 0) / campaign.total_contacts) * 100}%`
                                }}
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
