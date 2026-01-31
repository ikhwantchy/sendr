'use client'

import { Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import CreateAIConfigWizard from '@/components/CreateAIConfigWizard'

function CreateAIConfigContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const botId = searchParams?.get('botId') || null
    const editId = searchParams?.get('edit') || null // Edit mode if this exists

    const handleClose = () => {
        // Navigate back to bot detail page (AI tab)
        if (botId) {
            router.push(`/dashboard/bots/${botId}#ai`)
        } else {
            router.push('/dashboard/bots')
        }
    }

    if (!botId && !editId) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-[#09090b] text-zinc-400">
                <div className="flex flex-col items-center gap-4">
                    <p>Bot ID is missing.</p>
                    <button
                        onClick={() => router.push('/dashboard/bots')}
                        className="px-4 py-2 bg-white text-black rounded-lg hover:bg-zinc-200 font-medium transition-colors"
                    >
                        Select a Bot
                    </button>
                </div>
            </div>
        )
    }

    return (
        <CreateAIConfigWizard
            botId={botId || ''}
            configId={editId || undefined}
            onClose={handleClose}
        />
    )
}

export default function CreateAIConfigPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-screen bg-[#09090b]">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        }>
            <CreateAIConfigContent />
        </Suspense>
    )
}
