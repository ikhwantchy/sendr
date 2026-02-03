'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect, useMemo } from 'react'
import {
    SquaresFour,
    Robot,
    Megaphone,
    Bell,
    GearSix,
    SignOut,
    List,
    X,
    Sun,
    Moon,
    ChartLine,
    IconProps
} from '@phosphor-icons/react'
import { usePermissions } from '@/hooks/usePermissions'
import { useTheme } from 'next-themes'

type PhosphorIcon = React.ForwardRefExoticComponent<IconProps & React.RefAttributes<SVGSVGElement>>

export default function UserSidebar() {
    const pathname = usePathname()
    const router = useRouter()
    const { user, permissions, hasModuleAccess } = usePermissions()
    const { resolvedTheme, setTheme } = useTheme()
    const [isExpanded, setIsExpanded] = useState(true)
    const [isMobileOpen, setIsMobileOpen] = useState(false)
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
        const savedState = localStorage.getItem('userSidebarExpanded')
        if (savedState !== null) {
            setIsExpanded(savedState === 'true')
        }
    }, [])

    useEffect(() => {
        setIsMobileOpen(false)
    }, [pathname])

    const toggleSidebar = () => {
        const newState = !isExpanded
        setIsExpanded(newState)
        localStorage.setItem('userSidebarExpanded', String(newState))
    }

    const handleLogout = () => {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        router.push('/login')
    }

    // Check if user has any bot with specific permission
    const hasCampaignAccess = useMemo(() => {
        return permissions?.some((p: any) => p.can_create_campaigns === 1 || p.can_create_campaigns === true)
    }, [permissions])

    const hasReminderAccess = useMemo(() => {
        return permissions?.some((p: any) => p.can_use_reminders === 1 || p.can_use_reminders === true)
    }, [permissions])

    const hasAnalyticsAccess = useMemo(() => {
        return permissions?.some((p: any) => p.can_view_analytics === 1 || p.can_view_analytics === true)
    }, [permissions])

    const navigation = useMemo(() => {
        const items: Array<{ name: string, href: string, icon: PhosphorIcon }> = [
            { name: 'Dashboard', href: '/user', icon: SquaresFour },
            { name: 'My Bots', href: '/user/bots', icon: Robot },
        ]

        if (hasCampaignAccess) {
            items.push({ name: 'Campaigns', href: '/user/campaigns', icon: Megaphone })
        }

        if (hasReminderAccess) {
            items.push({ name: 'Reminders', href: '/user/reminders', icon: Bell })
        }

        if (hasAnalyticsAccess) {
            items.push({ name: 'Analytics', href: '/user/analytics', icon: ChartLine })
        }

        return items
    }, [hasCampaignAccess, hasReminderAccess, hasAnalyticsAccess])

    const bottomNavigation: Array<{ name: string, href: string, icon: PhosphorIcon }> = [
        { name: 'Settings', href: '/user/settings', icon: GearSix },
    ]

    const AnimatedNavIcon = ({ Icon, isActive }: { Icon: PhosphorIcon, isActive: boolean }) => (
        <div className="relative flex items-center justify-center">
            <Icon
                size={20}
                weight={isActive ? "fill" : "regular"}
                className={`transition-all duration-300 ease-out transform group-hover:rotate-12 group-hover:scale-110 ${isActive
                    ? 'text-blue-500 rotate-0'
                    : 'text-zinc-500 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-zinc-200'
                    }`}
            />
        </div>
    )

    const isActive = (href: string): boolean => {
        if (href === '/user') return pathname === '/user'
        return pathname?.startsWith(href) ?? false
    }

    return (
        <>
            {/* Mobile Menu Button */}
            <button
                onClick={() => setIsMobileOpen(!isMobileOpen)}
                className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white dark:bg-zinc-900 rounded-lg shadow-lg border border-zinc-200 dark:border-zinc-800"
            >
                {isMobileOpen ? <X size={20} /> : <List size={20} />}
            </button>

            {/* Mobile Overlay */}
            {isMobileOpen && (
                <div
                    className="lg:hidden fixed inset-0 bg-black/50 z-40"
                    onClick={() => setIsMobileOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`fixed top-0 left-0 h-screen bg-white dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-900 flex flex-col z-40 transition-all duration-300 ease-out
                    ${isExpanded ? 'w-60' : 'w-[68px]'}
                    ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
                `}
            >
                {/* Logo */}
                <div className="h-16 flex items-center px-4 border-b border-zinc-200 dark:border-zinc-900">
                    <Link href="/user" className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                            <span className="text-white font-bold text-sm">S</span>
                        </div>
                        {isExpanded && (
                            <span className="font-semibold text-zinc-900 dark:text-white">Sendr</span>
                        )}
                    </Link>
                </div>

                {/* Navigation */}
                <nav className="flex-1 py-4 px-3 overflow-y-auto">
                    <ul className="space-y-1">
                        {navigation.map((item) => {
                            const active = isActive(item.href)
                            return (
                                <li key={item.name}>
                                    <Link
                                        href={item.href}
                                        className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${active
                                            ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400'
                                            : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900'
                                            }`}
                                    >
                                        <AnimatedNavIcon Icon={item.icon} isActive={active} />
                                        {isExpanded && (
                                            <span className="text-sm font-medium">{item.name}</span>
                                        )}
                                    </Link>
                                </li>
                            )
                        })}
                    </ul>
                </nav>

                {/* Bottom Section */}
                <div className="border-t border-zinc-200 dark:border-zinc-900 p-3">
                    <ul className="space-y-1">
                        {bottomNavigation.map((item) => {
                            const active = isActive(item.href)
                            return (
                                <li key={item.name}>
                                    <Link
                                        href={item.href}
                                        className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${active
                                            ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400'
                                            : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900'
                                            }`}
                                    >
                                        <AnimatedNavIcon Icon={item.icon} isActive={active} />
                                        {isExpanded && (
                                            <span className="text-sm font-medium">{item.name}</span>
                                        )}
                                    </Link>
                                </li>
                            )
                        })}

                        {/* Theme Toggle */}
                        {mounted && (
                            <li>
                                <button
                                    onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
                                    className="group w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-all duration-200"
                                >
                                    <div className="relative flex items-center justify-center">
                                        {resolvedTheme === 'dark' ? (
                                            <Sun size={20} className="text-zinc-400 group-hover:text-yellow-500 transition-colors" />
                                        ) : (
                                            <Moon size={20} className="text-zinc-500 group-hover:text-blue-500 transition-colors" />
                                        )}
                                    </div>
                                    {isExpanded && (
                                        <span className="text-sm font-medium">
                                            {resolvedTheme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                                        </span>
                                    )}
                                </button>
                            </li>
                        )}

                        {/* Logout */}
                        <li>
                            <button
                                onClick={handleLogout}
                                className="group w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-zinc-600 dark:text-zinc-400 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400 transition-all duration-200"
                            >
                                <SignOut size={20} className="group-hover:scale-110 transition-transform" />
                                {isExpanded && (
                                    <span className="text-sm font-medium">Logout</span>
                                )}
                            </button>
                        </li>
                    </ul>

                    {/* User Info */}
                    {isExpanded && user && (
                        <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-900">
                            <div className="px-2">
                                <p className="text-sm font-medium text-zinc-900 dark:text-white truncate">
                                    {user.name || user.email}
                                </p>
                                <p className="text-xs text-zinc-500 truncate">{user.email}</p>
                            </div>
                        </div>
                    )}
                </div>
            </aside>
        </>
    )
}
