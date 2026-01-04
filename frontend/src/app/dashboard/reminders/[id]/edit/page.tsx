'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'

export default function EditReminderPage() {
    const params = useParams()
    const router = useRouter()
    const reminderId = params.id as string

    useEffect(() => {
        // Redirect to create page with edit mode
        router.push(`/dashboard/reminders/create?edit=${reminderId}`)
    }, [reminderId, router])

    return (
        <div className="p-8 min-h-screen bg-[#09090b] flex items-center justify-center">
            <div className="text-center">
                <div className="w-8 h-8 border-2 border-zinc-700 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-zinc-500 text-sm">Loading reminder...</p>
            </div>
        </div>
    )
}
