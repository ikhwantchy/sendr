'use client'

import { useState } from 'react'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import RichTextEditor from '@/components/editors/RichTextEditor'
import WhatsAppPreview from '@/components/previews/WhatsAppPreview'

interface CreateCampaignModalProps {
    botId: string
    onClose: () => void
}

interface Contact {
    phone: string
    name: string
}

interface WhatsAppGroup {
    id: string
    name: string
    participant_count: number
}

type ImportMethod = 'sheets' | 'csv' | 'manual' | null
type RecipientType = 'contacts' | 'groups'

export default function CreateCampaignModal({ botId, onClose }: CreateCampaignModalProps) {
    const queryClient = useQueryClient()
    const [currentStep, setCurrentStep] = useState<'details' | 'recipients'>('details')
    const [recipientType, setRecipientType] = useState<RecipientType>('contacts')
    const [importMethod, setImportMethod] = useState<ImportMethod>(null)

    const [formData, setFormData] = useState({
        name: '',
        message: '',
        schedule_type: 'immediate',
        scheduled_at: '',
    })

    const [contacts, setContacts] = useState<Contact[]>([])
    const [selectedGroups, setSelectedGroups] = useState<string[]>([])
    const [image, setImage] = useState<File | null>(null)
    const [imagePreview, setImagePreview] = useState<string>('')

    // Manual contact entry
    const [manualPhone, setManualPhone] = useState('')
    const [manualName, setManualName] = useState('')

    // Google Sheets
    const [sheetsUrl, setSheetsUrl] = useState('')
    const [isImportingSheets, setIsImportingSheets] = useState(false)

    // Function to import from Google Sheets
    const handleGoogleSheetsImport = async () => {
        if (!sheetsUrl) {
            toast.error('Please enter a Google Sheets URL')
            return
        }

        setIsImportingSheets(true)

        try {
            // Extract spreadsheet ID from URL
            const match = sheetsUrl.match(/\/d\/([a-zA-Z0-9-_]+)/)
            if (!match) {
                toast.error('Invalid Google Sheets URL')
                setIsImportingSheets(false)
                return
            }

            const spreadsheetId = match[1]

            // Use Google Sheets API to fetch as CSV
            const csvUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv`

            const response = await fetch(csvUrl)
            if (!response.ok) {
                throw new Error('Failed to fetch spreadsheet. Make sure it is publicly accessible.')
            }

            const text = await response.text()
            const lines = text.split('\n').filter(line => line.trim())

            const parsedContacts: Contact[] = []
            let nameIndex = 0
            let phoneIndex = 1

            lines.forEach((line, index) => {
                // Check header to determine column order
                if (index === 0) {
                    const lowerLine = line.toLowerCase()
                    // Skip if it's a header row
                    if (lowerLine.includes('phone') || lowerLine.includes('name') ||
                        lowerLine.includes('nama') || lowerLine.includes('nomor')) {

                        // Determine column order based on header
                        const columns = line.split(',').map(s => s.trim().toLowerCase())

                        // Check if Nama comes first (Indonesian format)
                        if (columns[0].includes('nama') || columns[0].includes('name')) {
                            nameIndex = 0
                            phoneIndex = 1
                        } else {
                            // phone,name format
                            phoneIndex = 0
                            nameIndex = 1
                        }
                        return
                    }
                }

                const columns = line.split(',').map(s => s.trim())
                const name = columns[nameIndex] || 'Contact'
                const phone = columns[phoneIndex]

                if (phone) {
                    parsedContacts.push({
                        phone: phone.replace(/[^0-9]/g, ''),
                        name: name
                    })
                }
            })

            setContacts(parsedContacts)
            toast.success(`Imported ${parsedContacts.length} contacts from Google Sheets!`)

        } catch (error: any) {
            console.error('Google Sheets import error:', error)
            toast.error(error.message || 'Failed to import from Google Sheets')
        } finally {
            setIsImportingSheets(false)
        }
    }

    // Fetch WhatsApp groups for this bot
    const { data: groups } = useQuery({
        queryKey: ['whatsapp-groups', botId],
        queryFn: async () => {
            try {
                const response = await api.bots.getGroups(botId)
                return response.data.data || response.data || []
            } catch (error) {
                return []
            }
        },
        enabled: recipientType === 'groups',
    })

    const createMutation = useMutation({
        mutationFn: async (data: any) => {
            return await api.campaigns.create({
                ...data,
                bot_id: botId,
            })
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['campaigns', botId] })
            toast.success('Campaign created successfully!')
            onClose()
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.error || 'Failed to create campaign')
        },
    })

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                toast.error('Image size must be less than 5MB')
                return
            }
            setImage(file)
            const reader = new FileReader()
            reader.onloadend = () => {
                setImagePreview(reader.result as string)
            }
            reader.readAsDataURL(file)
        }
    }

    const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        const reader = new FileReader()
        reader.onload = (event) => {
            const text = event.target?.result as string
            const lines = text.split('\n').filter(line => line.trim())

            const parsedContacts: Contact[] = []
            let nameIndex = 0
            let phoneIndex = 1

            lines.forEach((line, index) => {
                // Check header to determine column order
                if (index === 0) {
                    const lowerLine = line.toLowerCase()
                    // Skip if it's a header row
                    if (lowerLine.includes('phone') || lowerLine.includes('name') ||
                        lowerLine.includes('nama') || lowerLine.includes('nomor')) {

                        // Determine column order based on header
                        const columns = line.split(',').map(s => s.trim().toLowerCase())

                        // Check if Nama comes first (Indonesian format)
                        if (columns[0].includes('nama') || columns[0].includes('name')) {
                            nameIndex = 0
                            phoneIndex = 1
                        } else {
                            // phone,name format
                            phoneIndex = 0
                            nameIndex = 1
                        }
                        return
                    }
                }

                const columns = line.split(',').map(s => s.trim())
                const name = columns[nameIndex] || 'Contact'
                const phone = columns[phoneIndex]

                if (phone) {
                    parsedContacts.push({
                        phone: phone.replace(/[^0-9]/g, ''),
                        name: name
                    })
                }
            })

            setContacts(parsedContacts)
            toast.success(`Imported ${parsedContacts.length} contacts`)
        }
        reader.readAsText(file)
    }

    const handleAddManualContact = () => {
        if (!manualPhone) {
            toast.error('Phone number is required')
            return
        }

        const newContact: Contact = {
            phone: manualPhone.replace(/[^0-9]/g, ''),
            name: manualName || 'Contact'
        }

        setContacts([...contacts, newContact])
        setManualPhone('')
        setManualName('')
        toast.success('Contact added')
    }

    const handleRemoveContact = (index: number) => {
        setContacts(contacts.filter((_, i) => i !== index))
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()

        if (!formData.name || !formData.message) {
            toast.error('Please fill in all required fields')
            return
        }

        if (recipientType === 'contacts' && contacts.length === 0) {
            toast.error('Please add at least one contact')
            return
        }

        if (recipientType === 'groups' && selectedGroups.length === 0) {
            toast.error('Please select at least one group')
            return
        }

        createMutation.mutate({
            ...formData,
            recipient_type: recipientType,
            contacts: recipientType === 'contacts' ? contacts : [],
            group_ids: recipientType === 'groups' ? selectedGroups : [],
        })
    }

    const handleNext = () => {
        if (!formData.name || !formData.message) {
            toast.error('Please fill in campaign name and message')
            return
        }
        setCurrentStep('recipients')
    }

    const renderDetailsStep = () => (
        <div className="grid grid-cols-2 gap-6">
            {/* Left: Form */}
            <div className="space-y-6">
                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                        Campaign Name <span className="text-red-400">*</span>
                    </label>
                    <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g., New Year Promo"
                        className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 transition-colors"
                        required
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                        Broadcast Message <span className="text-red-400">*</span>
                    </label>
                    <RichTextEditor
                        value={formData.message}
                        onChange={(value) => setFormData({ ...formData, message: value })}
                        placeholder="Type your message here..."
                    />
                    <div className="mt-2 text-xs text-gray-500">
                        💡 Use <code className="px-1 bg-black/30 rounded">{'{{name}}'}</code> to personalize with contact name
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                        Image (Optional)
                    </label>
                    {imagePreview ? (
                        <div className="relative">
                            <img src={imagePreview} alt="Preview" className="w-full rounded-lg" />
                            <button
                                type="button"
                                onClick={() => {
                                    setImage(null)
                                    setImagePreview('')
                                }}
                                className="absolute top-2 right-2 px-3 py-1 bg-red-500 text-white text-xs rounded-lg hover:bg-red-600"
                            >
                                Remove Image
                            </button>
                        </div>
                    ) : (
                        <label className="block w-full p-6 border-2 border-dashed border-white/10 rounded-lg hover:border-cyan-500 transition-colors cursor-pointer">
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleImageUpload}
                                className="hidden"
                            />
                            <div className="text-center">
                                <svg className="w-12 h-12 mx-auto text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <p className="text-sm text-gray-400">Click to upload image</p>
                                <p className="text-xs text-gray-500 mt-1">Max 5MB</p>
                            </div>
                        </label>
                    )}
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-3">
                        Schedule
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            type="button"
                            onClick={() => setFormData({ ...formData, schedule_type: 'immediate' })}
                            className={`p-3 rounded-lg border transition-all ${formData.schedule_type === 'immediate'
                                ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400'
                                : 'bg-black/20 border-white/10 text-gray-400 hover:border-white/20'
                                }`}
                        >
                            <div className="font-semibold text-sm">Send Now</div>
                            <div className="text-xs opacity-80">Immediate</div>
                        </button>
                        <button
                            type="button"
                            onClick={() => setFormData({ ...formData, schedule_type: 'scheduled' })}
                            className={`p-3 rounded-lg border transition-all ${formData.schedule_type === 'scheduled'
                                ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400'
                                : 'bg-black/20 border-white/10 text-gray-400 hover:border-white/20'
                                }`}
                        >
                            <div className="font-semibold text-sm">Schedule</div>
                            <div className="text-xs opacity-80">Set time</div>
                        </button>
                    </div>
                </div>
            </div>

            {/* Right: Preview */}
            <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                    Preview
                </label>
                <WhatsAppPreview
                    message={formData.message.replace('{{name}}', 'John Doe')}
                    image={imagePreview}
                    timestamp={new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                />
            </div>
        </div>
    )

    const renderRecipientsStep = () => (
        <div className="space-y-6">
            {/* Recipient Type Selection */}
            <div>
                <label className="block text-sm font-medium text-gray-400 mb-3">
                    Send To
                </label>
                <div className="grid grid-cols-2 gap-4">
                    <button
                        type="button"
                        onClick={() => {
                            setRecipientType('contacts')
                            setImportMethod(null)
                            setSelectedGroups([])
                        }}
                        className={`p-4 rounded-xl border transition-all ${recipientType === 'contacts'
                            ? 'bg-cyan-500/20 border-cyan-500'
                            : 'bg-black/20 border-white/10 hover:border-white/20'
                            }`}
                    >
                        <div className="flex items-center gap-3">
                            <svg className={`w-6 h-6 ${recipientType === 'contacts' ? 'text-cyan-400' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                            <div className="text-left">
                                <div className={`font-semibold ${recipientType === 'contacts' ? 'text-cyan-400' : 'text-white'}`}>Individual Contacts</div>
                                <div className="text-xs text-gray-400">Import from Sheets/CSV</div>
                            </div>
                        </div>
                    </button>

                    <button
                        type="button"
                        onClick={() => {
                            setRecipientType('groups')
                            setImportMethod(null)
                            setContacts([])
                        }}
                        className={`p-4 rounded-xl border transition-all ${recipientType === 'groups'
                            ? 'bg-purple-500/20 border-purple-500'
                            : 'bg-black/20 border-white/10 hover:border-white/20'
                            }`}
                    >
                        <div className="flex items-center gap-3">
                            <svg className={`w-6 h-6 ${recipientType === 'groups' ? 'text-purple-400' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                            <div className="text-left">
                                <div className={`font-semibold ${recipientType === 'groups' ? 'text-purple-400' : 'text-white'}`}>WhatsApp Groups</div>
                                <div className="text-xs text-gray-400">Select bot groups</div>
                            </div>
                        </div>
                    </button>
                </div>
            </div>

            {/* Individual Contacts Flow */}
            {recipientType === 'contacts' && (
                <>
                    {/* Import Method Selection */}
                    {!importMethod && (
                        <div className="grid grid-cols-3 gap-4">
                            <button
                                type="button"
                                onClick={() => setImportMethod('sheets')}
                                className="p-6 bg-black/30 border border-white/10 rounded-xl hover:border-green-500 hover:bg-green-500/10 transition-all group"
                            >
                                <div className="w-12 h-12 mx-auto mb-3 bg-green-500/20 rounded-lg flex items-center justify-center group-hover:bg-green-500/30 transition-colors">
                                    <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                    </svg>
                                </div>
                                <div className="font-semibold text-white mb-1">Google Sheets</div>
                                <div className="text-xs text-gray-400">Paste link</div>
                            </button>

                            <button
                                type="button"
                                onClick={() => setImportMethod('csv')}
                                className="p-6 bg-black/30 border border-white/10 rounded-xl hover:border-cyan-500 hover:bg-cyan-500/10 transition-all group"
                            >
                                <div className="w-12 h-12 mx-auto mb-3 bg-cyan-500/20 rounded-lg flex items-center justify-center group-hover:bg-cyan-500/30 transition-colors">
                                    <svg className="w-6 h-6 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                </div>
                                <div className="font-semibold text-white mb-1">CSV File</div>
                                <div className="text-xs text-gray-400">Upload file</div>
                            </button>

                            <button
                                type="button"
                                onClick={() => setImportMethod('manual')}
                                className="p-6 bg-black/30 border border-white/10 rounded-xl hover:border-cyan-500 hover:bg-cyan-500/10 transition-all group"
                            >
                                <div className="w-12 h-12 mx-auto mb-3 bg-cyan-500/20 rounded-lg flex items-center justify-center group-hover:bg-cyan-500/30 transition-colors">
                                    <svg className="w-6 h-6 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                </div>
                                <div className="font-semibold text-white mb-1">Manual Entry</div>
                                <div className="text-xs text-gray-400">Add manually</div>
                            </button>
                        </div>
                    )}

                    {/* Google Sheets Import */}
                    {importMethod === 'sheets' && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-semibold text-white">Google Sheets Link</h3>
                                <button
                                    type="button"
                                    onClick={() => setImportMethod(null)}
                                    className="text-sm text-gray-400 hover:text-white"
                                >
                                    Change method
                                </button>
                            </div>

                            <div>
                                <input
                                    type="url"
                                    value={sheetsUrl}
                                    onChange={(e) => setSheetsUrl(e.target.value)}
                                    placeholder="https://docs.google.com/spreadsheets/d/..."
                                    className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
                                />
                            </div>

                            <button
                                type="button"
                                onClick={handleGoogleSheetsImport}
                                disabled={isImportingSheets || !sheetsUrl}
                                className="w-full px-4 py-3 bg-green-500/20 border border-green-500 text-green-400 rounded-lg hover:bg-green-500/30 transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isImportingSheets ? (
                                    <div className="flex items-center justify-center gap-2">
                                        <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Importing...
                                    </div>
                                ) : (
                                    'Import from Google Sheets'
                                )}
                            </button>

                            <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg text-sm text-blue-300">
                                <div className="font-semibold mb-2">Requirements:</div>
                                <ul className="space-y-1 text-xs text-blue-200/80">
                                    <li>• Sheet must be publicly accessible</li>
                                    <li>• First row (header): <code className="px-1 bg-black/30 rounded">Nama, Nomor</code> or <code className="px-1 bg-black/30 rounded">phone, name</code></li>
                                    <li>• Phone format: <code className="px-1 bg-black/30 rounded">62-85710569566</code> (with or without dashes)</li>
                                    <li>• Example: <code className="px-1 bg-black/30 rounded text-[10px]">Ikhwan, 62-85710569566</code></li>
                                </ul>
                            </div>
                        </div>
                    )}

                    {/* CSV Upload */}
                    {importMethod === 'csv' && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-semibold text-white">Upload CSV File</h3>
                                <button
                                    type="button"
                                    onClick={() => setImportMethod(null)}
                                    className="text-sm text-gray-400 hover:text-white"
                                >
                                    Change method
                                </button>
                            </div>

                            <label className="block w-full p-6 border-2 border-dashed border-white/10 rounded-lg hover:border-cyan-500 transition-colors cursor-pointer">
                                <input
                                    type="file"
                                    accept=".csv,.xlsx,.xls"
                                    onChange={handleCSVUpload}
                                    className="hidden"
                                />
                                <div className="text-center">
                                    <svg className="w-12 h-12 mx-auto text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                    </svg>
                                    <p className="text-sm text-gray-400">Click to upload CSV/Excel</p>
                                    <p className="text-xs text-gray-500 mt-1">Format: phone, name</p>
                                </div>
                            </label>
                        </div>
                    )}

                    {/* Manual Entry */}
                    {importMethod === 'manual' && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-semibold text-white">Add Contact Manually</h3>
                                <button
                                    type="button"
                                    onClick={() => setImportMethod(null)}
                                    className="text-sm text-gray-400 hover:text-white"
                                >
                                    Change method
                                </button>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <input
                                    type="tel"
                                    value={manualPhone}
                                    onChange={(e) => setManualPhone(e.target.value)}
                                    placeholder="628123456789"
                                    className="px-4 py-3 bg-black/30 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
                                />
                                <input
                                    type="text"
                                    value={manualName}
                                    onChange={(e) => setManualName(e.target.value)}
                                    placeholder="Contact Name"
                                    className="px-4 py-3 bg-black/30 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
                                />
                            </div>

                            <button
                                type="button"
                                onClick={handleAddManualContact}
                                className="w-full px-4 py-3 bg-cyan-500/20 border border-cyan-500 text-cyan-400 rounded-lg hover:bg-cyan-500/30 transition-all font-semibold"
                            >
                                + Add Contact
                            </button>
                        </div>
                    )}

                    {/* Contact List Preview - Collapsible */}
                    {contacts.length > 0 && (
                        <div className="space-y-3">
                            <button
                                type="button"
                                onClick={() => {
                                    const preview = document.getElementById('contact-preview')
                                    if (preview) {
                                        preview.classList.toggle('hidden')
                                    }
                                }}
                                className="w-full flex items-center justify-between p-4 bg-cyan-500/10 border border-cyan-500/30 rounded-lg hover:bg-cyan-500/20 transition-all"
                            >
                                <div className="flex items-center gap-3">
                                    <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                    </svg>
                                    <div className="text-left">
                                        <div className="text-sm font-semibold text-cyan-400">
                                            {contacts.length} Contact{contacts.length > 1 ? 's' : ''} Imported
                                        </div>
                                        <div className="text-xs text-cyan-300/70">Click to preview</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            setContacts([])
                                        }}
                                        className="text-xs text-red-400 hover:text-red-300 px-3 py-1 bg-red-500/10 rounded-lg hover:bg-red-500/20 transition-all"
                                    >
                                        Clear all
                                    </button>
                                    <svg className="w-5 h-5 text-cyan-400 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>
                            </button>

                            {/* Collapsible Contact List */}
                            <div id="contact-preview" className="hidden">
                                <div className="max-h-60 overflow-y-auto space-y-2 p-4 bg-black/20 rounded-lg border border-white/10">
                                    {contacts.map((contact, index) => (
                                        <div key={index} className="flex items-center justify-between p-3 bg-black/30 rounded-lg border border-white/10 hover:border-cyan-500/30 transition-all">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-400 font-semibold text-sm">
                                                    {index + 1}
                                                </div>
                                                <div>
                                                    <div className="text-sm text-white font-medium">{contact.name}</div>
                                                    <div className="text-xs text-gray-400">{contact.phone}</div>
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveContact(index)}
                                                className="text-red-400 hover:text-red-300 p-1 hover:bg-red-500/10 rounded transition-all"
                                                title="Remove contact"
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* WhatsApp Groups Flow */}
            {recipientType === 'groups' && (
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-white">Select WhatsApp Groups</h3>

                    {groups && groups.length > 0 ? (
                        <div className="max-h-96 overflow-y-auto space-y-2">
                            {groups.map((group: WhatsAppGroup) => (
                                <label
                                    key={group.id}
                                    className="flex items-center gap-3 p-4 bg-black/20 rounded-lg border border-white/10 hover:border-purple-500 cursor-pointer transition-all"
                                >
                                    <input
                                        type="checkbox"
                                        checked={selectedGroups.includes(group.id)}
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                setSelectedGroups([...selectedGroups, group.id])
                                            } else {
                                                setSelectedGroups(selectedGroups.filter(id => id !== group.id))
                                            }
                                        }}
                                        className="w-5 h-5 rounded border-white/20 text-purple-500 focus:ring-purple-500"
                                    />
                                    <div className="flex-1">
                                        <div className="text-white font-medium">{group.name}</div>
                                        <div className="text-xs text-gray-400">{group.participant_count} members</div>
                                    </div>
                                </label>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12 text-gray-400">
                            <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                            <p>No WhatsApp groups found</p>
                            <p className="text-sm mt-1">Make sure your bot is added to groups</p>
                        </div>
                    )}

                    {selectedGroups.length > 0 && (
                        <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg text-sm text-purple-300">
                            {selectedGroups.length} group{selectedGroups.length > 1 ? 's' : ''} selected
                        </div>
                    )}
                </div>
            )}
        </div>
    )

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-[#1a1f2e] rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col border border-white/10">
                {/* Header */}
                <div className="p-6 border-b border-white/10">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-2xl font-bold text-white">Create Broadcast Campaign</h2>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-white transition-colors"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Step Indicator */}
                    <div className="flex items-center gap-2">
                        <div className={`flex-1 h-1 rounded-full ${currentStep === 'details' ? 'bg-cyan-500' : 'bg-cyan-500'}`} />
                        <div className={`flex-1 h-1 rounded-full ${currentStep === 'recipients' ? 'bg-cyan-500' : 'bg-white/10'}`} />
                    </div>
                    <div className="flex items-center justify-between mt-2 text-xs">
                        <span className="text-cyan-400">Step 1: Message Details</span>
                        <span className={currentStep === 'recipients' ? 'text-cyan-400' : 'text-gray-500'}>
                            Step 2: {recipientType === 'contacts' ? 'Add Contacts' : 'Select Groups'}
                        </span>
                    </div>
                </div>

                {/* Content */}
                <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1">
                    {currentStep === 'details' ? renderDetailsStep() : renderRecipientsStep()}
                </form>

                {/* Footer */}
                <div className="p-6 border-t border-white/10 flex items-center justify-between">
                    <button
                        type="button"
                        onClick={currentStep === 'details' ? onClose : () => setCurrentStep('details')}
                        className="px-6 py-3 bg-white/5 text-white rounded-lg hover:bg-white/10 transition-all font-semibold"
                    >
                        {currentStep === 'details' ? 'Cancel' : 'Back'}
                    </button>

                    {currentStep === 'details' ? (
                        <button
                            type="button"
                            onClick={handleNext}
                            className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg hover:shadow-lg hover:shadow-cyan-500/50 transition-all font-semibold"
                        >
                            Next: {recipientType === 'contacts' ? 'Add Contacts' : 'Select Groups'} →
                        </button>
                    ) : (
                        <button
                            type="submit"
                            disabled={createMutation.isPending}
                            className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg hover:shadow-lg hover:shadow-cyan-500/50 transition-all font-semibold disabled:opacity-50"
                        >
                            {createMutation.isPending ? 'Creating...' : 'Create Campaign'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}
