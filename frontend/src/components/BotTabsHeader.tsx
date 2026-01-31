'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { usePermissions } from '@/hooks/usePermissions'
import { Plus } from 'lucide-react'

const TABS = [
    { id: 'overview', name: 'Overview' },
    { id: 'rules', name: 'Auto-Reply', permission: 'auto_reply', action: 'New Rule', actionPath: '/dashboard/rules/create' },
    { id: 'ai-assistant', name: 'AI Assistant', permission: 'ai_assistant', action: 'Create Config', actionPath: '/dashboard/ai-config/create' },
    { id: 'campaigns', name: 'Campaigns', permission: 'campaigns', action: 'New Campaign', actionPath: '/dashboard/campaigns/create' },
    { id: 'reminders', name: 'Reminders', permission: 'reminders', action: 'New Reminder', actionPath: '/dashboard/reminders/create' },
    { id: 'settings', name: 'Settings' },
]

export default function BotTabsHeader({ botId }: { botId: string }) {
    const router = useRouter()
    const { hasModuleAccess } = usePermissions()
    const [activeTab, setActiveTab] = useState('overview')
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
        const handleHashChange = () => {
            const hash = window.location.hash.replace('#', '')
            if (hash && TABS.some(t => t.id === hash)) {
                setActiveTab(hash)
            } else {
                setActiveTab('overview')
            }
        }

        handleHashChange()
        window.addEventListener('hashchange', handleHashChange)
        return () => window.removeEventListener('hashchange', handleHashChange)
    }, [])

    const tabs = TABS.filter(tab => !tab.permission || hasModuleAccess(tab.permission, botId))
    const currentTab = TABS.find(t => t.id === activeTab)

    if (!mounted) return null

    const handleTabClick = (tabId: string) => {
        window.location.hash = tabId
    }

    const handleActionClick = () => {
        if (currentTab?.actionPath) {
            router.push(`${currentTab.actionPath}?botId=${botId}`)
        }
    }

    return (
        <div className="relative flex items-center justify-center w-full h-full">
            {/* Center: Tabs */}
            <div className="flex items-center gap-12 h-full">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => handleTabClick(tab.id)}
                        className={`group relative flex items-center h-[89px] px-1 text-sm font-medium transition-all ${activeTab === tab.id
                            ? 'text-white'
                            : 'text-zinc-500 hover:text-zinc-200'
                            }`}
                    >
                        <span>{tab.name}</span>
                        {activeTab === tab.id ? (
                            <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-blue-500 shadow-[0_-4px_12px_rgba(59,130,246,0.3)] animate-in slide-in-from-bottom-1 duration-300"></div>
                        ) : (
                            <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-transparent group-hover:bg-zinc-800 transition-colors"></div>
                        )}
                    </button>
                ))}
            </div>

            {/* Right: Action Button (absolute positioned) */}
            {currentTab?.action && (
                <button
                    onClick={handleActionClick}
                    className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center gap-2 px-4 py-2.5 bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 text-white rounded-lg text-sm font-medium transition-all min-w-[140px] justify-center"
                >
                    <Plus className="w-4 h-4" />
                    {currentTab.action}
                </button>
            )}
        </div>
    )
}
