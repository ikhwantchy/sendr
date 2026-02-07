'use client'

import Sidebar from '@/components/Sidebar'
import { useEffect, useState, Suspense } from 'react'
import { usePathname } from 'next/navigation'
import { MessageCircle, HelpCircle } from 'lucide-react'
import { api } from '@/lib/api'
import BotTabsHeader from '@/components/BotTabsHeader'
import BotDetailTopBar from '@/components/BotDetailTopBar'

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const [sidebarExpanded, setSidebarExpanded] = useState(true)
    const [isNavigating, setIsNavigating] = useState(false)
    const [systemStatus, setSystemStatus] = useState<'operational' | 'warning' | 'error'>('operational')
    const [user, setUser] = useState<any>(null)
    const pathname = usePathname()

    // Check if current page is bot detail page
    const isBotDetailPage = pathname?.match(/^\/dashboard\/bots\/[^/]+$/)

    // Check if current page should hide sidebar (fullscreen mode)
    const isFullscreenPage = pathname?.includes('/reminders/create') ||
        (pathname?.includes('/reminders/') && pathname?.includes('/edit')) ||
        pathname?.includes('/rules/create') ||
        (pathname?.includes('/rules/') && pathname?.includes('/edit')) ||
        pathname?.includes('/campaigns/create') ||
        (pathname?.includes('/campaigns/') && pathname?.includes('/edit')) ||
        pathname?.includes('/ai-config/create') ||
        (pathname?.includes('/ai-config/') && pathname?.includes('/edit'))

    // Handle page transition
    useEffect(() => {
        setIsNavigating(true)
        const timer = setTimeout(() => setIsNavigating(false), 150)
        return () => clearTimeout(timer)
    }, [pathname])

    useEffect(() => {
        const handleStorageChange = () => {
            const expanded = localStorage.getItem('sidebarExpanded')
            setSidebarExpanded(expanded !== 'false')
        }

        const initData = async () => {
            const userData = localStorage.getItem('user')
            if (userData) {
                try {
                    setUser(JSON.parse(userData))
                } catch (e) {
                    console.error("Failed to parse user data", e)
                }
            }

            try {
                const sysRes = await api.analytics.getSystemStatus()
                if (sysRes.data.success) {
                    setSystemStatus(sysRes.data.data.status)
                }
            } catch (e) {
                console.error("Failed to fetch system status", e)
            }
        }

        handleStorageChange()
        initData()

        window.addEventListener('storage', handleStorageChange)
        window.addEventListener('sidebarToggle', handleStorageChange)

        return () => {
            window.removeEventListener('storage', handleStorageChange)
            window.removeEventListener('sidebarToggle', handleStorageChange)
        }
    }, [])

    if (isFullscreenPage) {
        return (
            <div className="min-h-screen bg-zinc-50 dark:bg-black">
                {children}
            </div>
        )
    }

    return (
        <div className="flex min-h-screen bg-zinc-50 dark:bg-black overflow-hidden">
            <Suspense fallback={<div className="w-20 md:w-64 bg-white dark:bg-black border-r border-zinc-200 dark:border-zinc-800" />}>
                <Sidebar />
            </Suspense>
            <main
                className={`flex-1 flex flex-col pt-16 md:pt-0 transition-all duration-300 overflow-hidden ${isBotDetailPage ? 'md:ml-20' : (sidebarExpanded ? 'md:ml-64' : 'md:ml-20')
                    }`}
            >
                <header className="hidden md:flex h-[89px] flex-shrink-0 items-center border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black sticky top-0 z-40">
                    <div className="max-w-[1440px] mx-auto w-full h-full flex items-center px-4 sm:px-6 lg:px-8">
                        {/* Center: Tabs (Bot Detail Page only) */}
                        {isBotDetailPage ? (
                            <div className="flex-1 h-full">
                                <BotTabsHeader botId={pathname!.split('/')[3]} />
                            </div>
                        ) : (
                            <div className="flex-1 flex justify-end">
                                <div className="flex items-center gap-6 text-sm text-zinc-500 dark:text-zinc-100 animate-in fade-in duration-300">
                                    <button className="hover:text-zinc-900 dark:hover:text-white transition-colors font-normal">Feedback</button>
                                    <button className="hover:text-zinc-900 dark:hover:text-white transition-colors font-normal">Help</button>

                                    <div className="h-4 w-[1px] bg-zinc-300 dark:bg-zinc-800" />

                                    <div className="flex items-center gap-2">
                                        <span className="relative flex h-2 w-2">
                                            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${systemStatus === 'operational' ? 'bg-emerald-500' :
                                                systemStatus === 'warning' ? 'bg-amber-500' : 'bg-red-500'
                                                }`}></span>
                                            <span className={`relative inline-flex rounded-full h-2 w-2 ${systemStatus === 'operational' ? 'bg-emerald-500' :
                                                systemStatus === 'warning' ? 'bg-amber-500' : 'bg-red-500'
                                                }`}></span>
                                        </span>
                                        <span className="font-normal text-zinc-500 dark:text-zinc-100">
                                            System {systemStatus === 'operational' ? 'Normal' : systemStatus}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </header>

                {/* Main Content */}
                <div className="flex-1 overflow-auto">
                    <div
                        className={`transition-all duration-200 ease-out ${isNavigating ? 'opacity-0 translate-y-1' : 'opacity-100 translate-y-0'
                            }`}
                    >
                        <div className="max-w-[1440px] mx-auto w-full">
                            <Suspense fallback={
                                <div className="flex items-center justify-center p-12">
                                    <div className="w-6 h-6 border-2 border-zinc-300 dark:border-zinc-800 border-t-zinc-600 dark:border-t-white rounded-full animate-spin" />
                                </div>
                            }>
                                {children}
                            </Suspense>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}
