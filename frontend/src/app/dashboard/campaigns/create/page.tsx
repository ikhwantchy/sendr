'use client'

import { Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import CreateCampaignWizard from '@/components/CreateCampaignWizard'

function CreateCampaignContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const botId = searchParams?.get('botId')

    const handleClose = (campaignId?: string) => {
        if (campaignId) {
            if (botId) {
                router.push(`/dashboard/bots/${botId}?openCampaign=${campaignId}#campaigns`)
            } else {
                router.push(`/dashboard/campaigns?open=${campaignId}`)
            }
            return
        }

        if (botId) {
            router.push(`/dashboard/bots/${botId}#campaigns`)
        } else {
            router.push('/dashboard/campaigns')
        }
    }

    return (
        <CreateCampaignWizard
            initialBotId={botId || undefined}
            onClose={handleClose}
        />
    )
}

export default function CreateCampaignPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-screen bg-zinc-50 dark:bg-[#09090b]">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        }>
            <CreateCampaignContent />
        </Suspense>
    )
}
