'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { usePermissions } from '@/hooks/usePermissions'
import UserSidebar from '@/components/UserSidebar'

export default function UserLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter()
    const { user, isAdmin, isLoading } = usePermissions()

    useEffect(() => {
        // If not logged in, redirect to login
        if (!isLoading && !user) {
            router.push('/login')
            return
        }

        // If user is admin/owner, redirect to admin dashboard
        if (!isLoading && user && isAdmin) {
            router.push('/dashboard')
            return
        }
    }, [user, isAdmin, isLoading, router])

    // Show loading while checking auth
    if (isLoading || !user) {
        return (
            <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
                <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
            </div>
        )
    }

    // If admin, don't render (will redirect)
    if (isAdmin) {
        return null
    }

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
            <UserSidebar />
            
            {/* Main Content */}
            <main className="lg:ml-60 min-h-screen transition-all duration-300">
                <div className="p-6 lg:p-8">
                    {children}
                </div>
            </main>
        </div>
    )
}
