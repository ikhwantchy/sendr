'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { usePermissions } from '@/hooks/usePermissions'
import { Plus, ChevronDown } from 'lucide-react'

interface SubTab {
    id: string
    name: string
    action?: string
    actionType?: 'link' | 'event'
}

interface Tab {
    id: string
    name: string
    permission?: string
    action?: string
    actionPath?: string
    subTabs?: SubTab[]
}

const TABS: Tab[] = [
    { id: 'overview', name: 'Overview' },
    { id: 'rules', name: 'Auto-Reply', permission: 'auto_reply', action: 'New Rule', actionPath: '/dashboard/rules/create' },
    { 
        id: 'ai-assistant', 
        name: 'AI Assistant', 
        permission: 'ai_assistant', 
        action: 'Create Config', 
        actionPath: '/dashboard/ai-config/create',
        subTabs: [
            { id: 'ai-config', name: 'Configurations', action: 'Create Config', actionType: 'link' },
            { id: 'ai-mappings', name: 'Contact Mappings', action: 'Add Mapping', actionType: 'event' },
        ]
    },
    { id: 'campaigns', name: 'Campaigns', permission: 'campaigns', action: 'New Campaign', actionPath: '/dashboard/campaigns/create' },
    { id: 'reminders', name: 'Reminders', permission: 'reminders', action: 'New Reminder', actionPath: '/dashboard/reminders/create' },
    { id: 'settings', name: 'Settings' },
]

export default function BotTabsHeader({ botId }: { botId: string }) {
    const router = useRouter()
    const { hasModuleAccess } = usePermissions()
    const [activeTab, setActiveTab] = useState('overview')
    const [mounted, setMounted] = useState(false)
    const [hoveredTab, setHoveredTab] = useState<string | null>(null)

    useEffect(() => {
        setMounted(true)
        const handleHashChange = () => {
            const hash = window.location.hash.replace('#', '')
            // Check if it's a subtab (ai-config or ai-mappings)
            if (hash === 'ai-config' || hash === 'ai-mappings') {
                setActiveTab(hash)
            } else if (hash && TABS.some(t => t.id === hash)) {
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
    
    // Determine current tab considering subtabs
    const isAISubTab = activeTab === 'ai-config' || activeTab === 'ai-mappings'
    const currentTabId = isAISubTab ? 'ai-assistant' : activeTab
    const currentTab = TABS.find(t => t.id === currentTabId)

    if (!mounted) return null

    const handleTabClick = (tabId: string) => {
        // If clicking AI Assistant directly, go to ai-config by default
        const aiTab = TABS.find(t => t.id === 'ai-assistant')
        if (tabId === 'ai-assistant' && aiTab?.subTabs) {
            window.location.hash = 'ai-config'
        } else {
            window.location.hash = tabId
        }
    }

    const handleSubTabClick = (subTabId: string, e: React.MouseEvent) => {
        e.stopPropagation()
        window.location.hash = subTabId
        setHoveredTab(null)
    }

    const handleActionClick = () => {
        // Check if we're on a subtab with its own action
        if (isAISubTab && currentTab?.subTabs) {
            const currentSubTab = currentTab.subTabs.find(st => st.id === activeTab)
            if (currentSubTab?.actionType === 'event') {
                // Dispatch custom event for Add Mapping
                window.dispatchEvent(new CustomEvent('openAddMapping'))
                return
            }
        }
        
        if (currentTab?.actionPath) {
            router.push(`${currentTab.actionPath}?botId=${botId}`)
        }
    }

    // Get current action label based on active subtab
    const getActionLabel = () => {
        if (isAISubTab && currentTab?.subTabs) {
            const currentSubTab = currentTab.subTabs.find(st => st.id === activeTab)
            if (currentSubTab?.action) return currentSubTab.action
        }
        return currentTab?.action
    }

    const actionLabel = getActionLabel()

    return (
        <div className="relative flex items-center justify-center w-full h-full">
            {/* Center: Tabs */}
            <div className="flex items-center gap-12 h-full">
                {tabs.map((tab) => {
                    const isActive = tab.id === currentTabId || (tab.subTabs?.some(st => st.id === activeTab))
                    const hasSubTabs = tab.subTabs && tab.subTabs.length > 0

                    return (
                        <div
                            key={tab.id}
                            className="relative h-full"
                            onMouseEnter={() => hasSubTabs && setHoveredTab(tab.id)}
                            onMouseLeave={() => setHoveredTab(null)}
                        >
                            <button
                                onClick={() => handleTabClick(tab.id)}
                                className={`group relative flex items-center gap-1 h-[89px] px-1 text-sm font-medium transition-all ${isActive
                                    ? 'text-white'
                                    : 'text-zinc-500 hover:text-zinc-200'
                                    }`}
                            >
                                <span>{tab.name}</span>
                                {hasSubTabs && (
                                    <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${hoveredTab === tab.id ? 'rotate-180' : ''}`} />
                                )}
                                {isActive ? (
                                    <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-blue-500 shadow-[0_-4px_12px_rgba(59,130,246,0.3)] animate-in slide-in-from-bottom-1 duration-300"></div>
                                ) : (
                                    <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-transparent group-hover:bg-zinc-800 transition-colors"></div>
                                )}
                            </button>

                            {/* Dropdown for subtabs */}
                            {hasSubTabs && hoveredTab === tab.id && (
                                <div 
                                    className="absolute left-1/2 -translate-x-1/2 pt-2"
                                    style={{ top: '100%', zIndex: 9999 }}
                                >
                                    <div className="bg-black border border-zinc-600 rounded-lg py-2 min-w-[180px]">
                                        {tab.subTabs!.map((subTab) => {
                                            const isSubActive = activeTab === subTab.id
                                            return (
                                                <button
                                                    key={subTab.id}
                                                    onClick={(e) => handleSubTabClick(subTab.id, e)}
                                                    className={`w-full px-5 py-2.5 text-sm text-left transition-colors ${
                                                        isSubActive
                                                            ? 'text-white font-medium'
                                                            : 'text-zinc-400 hover:text-white'
                                                    }`}
                                                >
                                                    {subTab.name}
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>

            {/* Right: Action Button (absolute positioned) */}
            {actionLabel && (
                <button
                    onClick={handleActionClick}
                    className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center gap-2 px-4 py-2.5 bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 text-white rounded-lg text-sm font-medium transition-all min-w-[140px] justify-center"
                >
                    <Plus className="w-4 h-4" />
                    {actionLabel}
                </button>
            )}
        </div>
    )
}
