'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Suspense } from 'react'
import { ArrowLeft, Save, HelpCircle } from 'lucide-react'
import ContactTable, { ContactRow, ContactColumn } from '@/components/ContactTable'

const STORAGE_KEY = 'campaign_contact_table_data'

interface StoredContactData {
    contacts: ContactRow[]
    columns: ContactColumn[]
}

function ContactsPageContent() {
    const router = useRouter()

    const [contacts, setContacts] = useState<ContactRow[]>([
        { id: 'row_1', phone: '', name_col: '' }
    ])
    const [columns, setColumns] = useState<ContactColumn[]>([
        { id: 'phone', name: 'Phone', required: true },
        { id: 'name_col', name: 'Name' }
    ])
    const [isLoaded, setIsLoaded] = useState(false)

    // Load data from localStorage on mount
    useEffect(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY)
            if (stored) {
                const data: StoredContactData = JSON.parse(stored)
                if (data.contacts && data.contacts.length > 0) {
                    setContacts(data.contacts)
                }
                if (data.columns && data.columns.length > 0) {
                    setColumns(data.columns)
                }
            }
        } catch (e) {
            console.error('Failed to load contact data:', e)
        }
        setIsLoaded(true)
    }, [])

    // Save to localStorage whenever data changes
    useEffect(() => {
        if (!isLoaded) return
        try {
            const data: StoredContactData = {
                contacts,
                columns
            }
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
        } catch (e) {
            console.error('Failed to save contact data:', e)
        }
    }, [contacts, columns, isLoaded])

    const handleSaveAndBack = () => {
        // Data is already saved to localStorage, just navigate back
        router.push('/dashboard/campaigns/create')
    }

    const handleCancel = () => {
        // Go back without clearing (data persists)
        router.push('/dashboard/campaigns/create')
    }

    if (!isLoaded) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-zinc-950">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-zinc-950 text-white">
            {/* Header */}
            <div className="sticky top-0 z-50 bg-zinc-950/95 backdrop-blur-sm border-b border-zinc-800">
                <div className="max-w-6xl mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={handleCancel}
                                className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                            >
                                <ArrowLeft size={20} />
                            </button>
                            <div>
                                <h1 className="text-xl font-semibold">Contact List</h1>
                                <p className="text-sm text-zinc-500">
                                    Enter contacts with custom fields for personalized messages
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            {/* Help Button with Tooltip */}
                            <div className="relative group">
                                <button
                                    type="button"
                                    className="p-2 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded-lg transition-colors"
                                >
                                    <HelpCircle size={18} />
                                </button>
                                {/* Tooltip */}
                                <div className="absolute right-0 top-full mt-2 w-72 p-3 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                                    <p className="text-xs text-zinc-300 mb-2 font-medium">Tips:</p>
                                    <ul className="text-xs text-zinc-400 space-y-1">
                                        <li>• Phone format: 628xxx</li>
                                        <li>• Click header to rename column</li>
                                        <li>• Use <code className="px-1 bg-zinc-700 rounded text-blue-400">[Name]</code> in message</li>
                                    </ul>
                                </div>
                            </div>
                            <button
                                onClick={handleCancel}
                                className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveAndBack}
                                className="px-5 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors flex items-center gap-2"
                            >
                                <Save size={16} />
                                Save & Continue
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-6xl mx-auto px-6 py-8">
                {/* Full Width Table */}
                <ContactTable
                    contacts={contacts}
                    columns={columns}
                    onChange={(newContacts, newColumns) => {
                        setContacts(newContacts)
                        setColumns(newColumns)
                    }}
                    className="w-full"
                />
            </div>
        </div>
    )
}

export default function CampaignContactsPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-screen bg-zinc-950">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        }>
            <ContactsPageContent />
        </Suspense>
    )
}
