'use client'

import { createContext, useContext, useState, ReactNode } from 'react'

interface BotTabContextType {
    activeTab: string
    setActiveTab: (tab: string) => void
}

const BotTabContext = createContext<BotTabContextType | undefined>(undefined)

export function BotTabProvider({ children, initialTab = 'overview' }: { children: ReactNode, initialTab?: string }) {
    const [activeTab, setActiveTab] = useState(initialTab)

    return (
        <BotTabContext.Provider value={{ activeTab, setActiveTab }}>
            {children}
        </BotTabContext.Provider>
    )
}

export function useBotTabs() {
    const context = useContext(BotTabContext)
    if (context === undefined) {
        throw new Error('useBotTabs must be used within a BotTabProvider')
    }
    return context
}
