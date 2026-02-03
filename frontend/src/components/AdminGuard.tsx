'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { usePermissions } from '@/hooks/usePermissions'
import { ShieldX, Loader2 } from 'lucide-react'

interface AdminGuardProps {
    children: React.ReactNode
}

export default function AdminGuard({ children }: AdminGuardProps) {
    const router = useRouter()
    const { isAdmin, user } = usePermissions()
    const [checking, setChecking] = useState(true)

    useEffect(() => {
        // Small delay to ensure user data is loaded
        const timer = setTimeout(() => {
            setChecking(false)
        }, 100)

        return () => clearTimeout(timer)
    }, [])

    // Still loading user data
    if (checking || !user) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
            </div>
        )
    }

    // User is not admin
    if (!isAdmin) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-8 max-w-md text-center">
                    <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                        <ShieldX className="w-8 h-8 text-red-500" />
                    </div>
                    <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">Access Denied</h2>
                    <p className="text-zinc-600 dark:text-zinc-400 mb-6">
                        You don't have permission to access this page. This area is restricted to administrators only.
                    </p>
                    <button
                        onClick={() => router.push('/dashboard')}
                        className="px-6 py-2.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-lg font-medium hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors"
                    >
                        Back to Dashboard
                    </button>
                </div>
            </div>
        )
    }

    // User is admin, render children
    return <>{children}</>
}
