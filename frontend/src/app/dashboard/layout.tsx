'use client'

import Sidebar from '@/components/Sidebar'
import { useEffect, useState } from 'react'

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const [sidebarExpanded, setSidebarExpanded] = useState(true)

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

    return (
        <div className="flex min-h-screen bg-zinc-950">
            <Sidebar />
            <main
                className={`flex-1 pt-20 md:pt-0 transition-all duration-300 overflow-auto ${sidebarExpanded ? 'md:ml-64' : 'md:ml-20'
                    }`}
            >
                {children}
            </main>
        </div>
    )
}
