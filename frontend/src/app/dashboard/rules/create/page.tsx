'use client'

import { Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import CreateRuleWizard from '@/components/CreateRuleWizard'

function CreateRuleContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const botId = searchParams?.get('botId')
    const editId = searchParams?.get('edit')

    const handleClose = () => {
        if (botId) {
            router.push(`/dashboard/bots/${botId}#rules`)
        } else {
            router.push('/dashboard/rules')
        }
    }

    return (
        <CreateRuleWizard
            botId={botId || undefined}
            ruleId={editId || undefined}
            onClose={handleClose}
        />
    )
}

export default function CreateRulePage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-screen bg-zinc-50 dark:bg-[#09090b]">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        }>
            <CreateRuleContent />
        </Suspense>
    )
}
