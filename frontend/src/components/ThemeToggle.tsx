'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { Sun, Moon, Monitor } from 'lucide-react'

interface ThemeToggleProps {
    variant?: 'icon' | 'dropdown' | 'switch'
    className?: string
}

export function ThemeToggle({ variant = 'icon', className = '' }: ThemeToggleProps) {
    const { theme, setTheme, resolvedTheme } = useTheme()
    const [mounted, setMounted] = useState(false)

    // Prevent hydration mismatch
    useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) {
        return (
            <div className={`w-9 h-9 rounded-lg bg-zinc-800/50 animate-pulse ${className}`} />
        )
    }

    if (variant === 'switch') {
        return (
            <button
                onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    resolvedTheme === 'dark' ? 'bg-zinc-700' : 'bg-zinc-300'
                } ${className}`}
                aria-label="Toggle theme"
            >
                <span
                    className={`inline-flex h-5 w-5 transform items-center justify-center rounded-full bg-white shadow-sm transition-transform ${
                        resolvedTheme === 'dark' ? 'translate-x-5' : 'translate-x-0.5'
                    }`}
                >
                    {resolvedTheme === 'dark' ? (
                        <Moon className="h-3 w-3 text-zinc-700" />
                    ) : (
                        <Sun className="h-3 w-3 text-amber-500" />
                    )}
                </span>
            </button>
        )
    }

    if (variant === 'dropdown') {
        return (
            <div className={`relative group ${className}`}>
                <button
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-900/50 dark:bg-zinc-900/50 border border-zinc-800 dark:border-zinc-800 hover:border-zinc-700 transition-all text-sm"
                    aria-label="Theme options"
                >
                    {resolvedTheme === 'dark' ? (
                        <Moon className="w-4 h-4 text-blue-400" />
                    ) : (
                        <Sun className="w-4 h-4 text-amber-500" />
                    )}
                    <span className="text-zinc-300 dark:text-zinc-300">
                        {theme === 'system' ? 'System' : theme === 'dark' ? 'Dark' : 'Light'}
                    </span>
                </button>
                <div className="absolute right-0 top-full mt-1 w-36 bg-zinc-900 dark:bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                    <button
                        onClick={() => setTheme('light')}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-zinc-800 transition-colors rounded-t-xl ${
                            theme === 'light' ? 'text-blue-400' : 'text-zinc-400'
                        }`}
                    >
                        <Sun className="w-4 h-4" />
                        Light
                    </button>
                    <button
                        onClick={() => setTheme('dark')}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-zinc-800 transition-colors ${
                            theme === 'dark' ? 'text-blue-400' : 'text-zinc-400'
                        }`}
                    >
                        <Moon className="w-4 h-4" />
                        Dark
                    </button>
                    <button
                        onClick={() => setTheme('system')}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-zinc-800 transition-colors rounded-b-xl ${
                            theme === 'system' ? 'text-blue-400' : 'text-zinc-400'
                        }`}
                    >
                        <Monitor className="w-4 h-4" />
                        System
                    </button>
                </div>
            </div>
        )
    }

    // Default: icon variant
    return (
        <button
            onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
            className={`flex items-center justify-center w-9 h-9 rounded-lg bg-zinc-100 dark:bg-zinc-800/50 hover:bg-zinc-200 dark:hover:bg-zinc-700/50 border border-zinc-200 dark:border-zinc-700/50 transition-all ${className}`}
            aria-label="Toggle theme"
        >
            {resolvedTheme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
            ) : (
                <Moon className="w-4 h-4 text-zinc-600" />
            )}
        </button>
    )
}
