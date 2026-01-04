'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import CreateReminderWizard from '@/components/CreateReminderWizard'

export default function CreateReminderPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const botId = searchParams.get('botId')

    const handleClose = () => {
        // Navigate back to reminders list
        if (botId) {
            router.push(`/dashboard/reminders?botId=${botId}`)
        } else {
            router.push('/dashboard/reminders')
        }
    }

    if (!botId) {
        return (
            <div className="flex items-center justify-center min-h-screen text-gray-400">
                <div className="flex flex-col items-center gap-4">
                    <p>Bot ID is missing.</p>
                    <button
                        onClick={() => router.push('/dashboard/bots')}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500"
                    >
                        Select a Bot
                    </button>
                </div>
            </div>
        )
    }

    return (
        <CreateReminderWizard
            botId={botId}
            onClose={handleClose}
        />
    )
}
