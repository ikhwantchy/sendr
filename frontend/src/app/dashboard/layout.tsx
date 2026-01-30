'use client'

import Sidebar from '@/components/Sidebar'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const [sidebarExpanded, setSidebarExpanded] = useState(true)
    const [isNavigating, setIsNavigating] = useState(false)
    const pathname = usePathname()

    // Check if current page should hide sidebar (fullscreen mode)
    const isFullscreenPage = pathname?.includes('/reminders/create') || 
        (pathname?.includes('/reminders/') && pathname?.includes('/edit')) ||
        pathname?.includes('/rules/create') ||
        (pathname?.includes('/rules/') && pathname?.includes('/edit')) ||
        pathname?.includes('/campaigns/create') ||
        (pathname?.includes('/campaigns/') && pathname?.includes('/edit'))

    // Handle page transition
    useEffect(() => {
        setIsNavigating(true)
        const timer = setTimeout(() => setIsNavigating(false), 150)
        return () => clearTimeout(timer)
    }, [pathname])

    useEffect(() => {
        // Listen for sidebar state changes
        const handleStorageChange = () => {
            const expanded = localStorage.getItem('sidebarExpanded')
            setSidebarExpanded(expanded !== 'false')
        }

        // Initial check
        handleStorageChange()

        // Listen for changes
        window.addEventListener('storage', handleStorageChange)
        // Custom event for same-window updates
        window.addEventListener('sidebarToggle', handleStorageChange)

        return () => {
            window.removeEventListener('storage', handleStorageChange)
            window.removeEventListener('sidebarToggle', handleStorageChange)
        }
    }, [])

    // Fullscreen mode - no sidebar
    if (isFullscreenPage) {
        return (
            <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
                {children}
            </div>
        )
    }

    return (
        <div className="flex min-h-screen bg-zinc-50 dark:bg-zinc-950">
            <Sidebar />
            <main
                className={`flex-1 pt-20 md:pt-0 transition-all duration-300 overflow-auto ${sidebarExpanded ? 'md:ml-64' : 'md:ml-20'
                    }`}
            >
                <div 
                    className={`transition-all duration-200 ease-out ${
                        isNavigating 
                            ? 'opacity-0 translate-y-1' 
                            : 'opacity-100 translate-y-0'
                    }`}
                >
                    {children}
                </div>
            </main>
        </div>
    )
}
