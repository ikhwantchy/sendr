'use client'

import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useState, useEffect, useMemo } from 'react'
import {
    SquaresFour,      // Dashboard
    Robot,             // Bots
    ChartBar,          // Analytics
    Users,             // Users
    ListBullets,       // Audit Logs
    HardDrives,        // System
    ShieldCheck,       // Security
    Key,               // API Key
    GearSix,           // Settings
    SignOut,
    List,
    X,
    CaretDown,
    SidebarSimple,     // Toggle sidebar icon
    Sun,
    Moon,
    IconProps
} from '@phosphor-icons/react'
import { usePermissions } from '@/hooks/usePermissions'
import { useTheme } from 'next-themes'
import '@/components/ui/animated-icon.css'

// Phosphor icon type
type PhosphorIcon = React.ForwardRefExoticComponent<IconProps & React.RefAttributes<SVGSVGElement>>

export default function Sidebar() {
    const pathname = usePathname()
    const router = useRouter()
    const searchParams = useSearchParams()
    const { user, hasModuleAccess, isAdmin } = usePermissions()
    const { resolvedTheme, setTheme } = useTheme()
    const [isExpanded, setIsExpanded] = useState(true)
    const [isMobileOpen, setIsMobileOpen] = useState(false)
    const [showUserMenu, setShowUserMenu] = useState(false)
    const [isSecurityExpanded, setIsSecurityExpanded] = useState(false)
    const [isSystemExpanded, setIsSystemExpanded] = useState(false)
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
        const savedState = localStorage.getItem('sidebarExpanded')
        if (savedState !== null) {
            setIsExpanded(savedState === 'true')
        }
    }, [])

    useEffect(() => {
        setIsMobileOpen(false)

        // Auto-collapse sidebar if on bot detail page
        if (pathname?.match(/^\/dashboard\/bots\/[^/]+$/)) {
            setIsExpanded(false)
        } else {
            // Restore from localStorage if we navigate away from bot detail page
            const savedState = localStorage.getItem('sidebarExpanded')
            setIsExpanded(savedState !== 'false')
        }

        // Auto-expand security submenu if on security page
        if (pathname?.startsWith('/dashboard/security')) {
            setIsSecurityExpanded(true)
        }
        // Auto-expand system submenu if on system page
        if (pathname?.startsWith('/dashboard/system')) {
            setIsSystemExpanded(true)
        }
    }, [pathname])

    const toggleSidebar = () => {
        const newState = !isExpanded
        setIsExpanded(newState)
        localStorage.setItem('sidebarExpanded', String(newState))
        window.dispatchEvent(new Event('sidebarToggle'))
    }

    const handleLogout = () => {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        router.push('/login')
    }

    // Navigation with Phosphor Icons (same as Resend.com)
    const navigation = useMemo(() => {
        const base: Array<{ name: string, href: string, icon: PhosphorIcon }> = [
            { name: 'Dashboard', href: '/dashboard', icon: SquaresFour },
            { name: 'Bots', href: '/dashboard/bots', icon: Robot },
        ]

        if (!user) return base

        if (hasModuleAccess('analytics')) {
            base.push({ name: 'Analytics', href: '/dashboard/analytics', icon: ChartBar })
        }
        return base
    }, [user, hasModuleAccess])

    const adminTopNavigation: Array<{ name: string, href: string, icon: PhosphorIcon, adminOnly?: boolean, hasSubmenu?: boolean, submenuType?: 'security' | 'system' }> = [
        { name: 'Users', href: '/dashboard/users', icon: Users, adminOnly: true },
        { name: 'Audit Logs', href: '/dashboard/audit-logs', icon: ListBullets, adminOnly: true },
        { name: 'System', href: '/dashboard/system', icon: HardDrives, adminOnly: true, hasSubmenu: true, submenuType: 'system' },
        { name: 'Security', href: '/dashboard/security', icon: ShieldCheck, adminOnly: true, hasSubmenu: true, submenuType: 'security' },
    ]

    // Security sub-navigation items
    const securitySubNavigation = [
        { name: 'Active Sessions', href: '/dashboard/security?tab=sessions' },
        { name: 'Two-Factor Auth', href: '/dashboard/security?tab=2fa' },
        { name: 'Telegram Alerts', href: '/dashboard/security?tab=alerts' },
        { name: 'Security Logs', href: '/dashboard/security?tab=logs' },
    ]

    // System sub-navigation items
    const systemSubNavigation = [
        { name: 'Health Check', href: '/dashboard/system?tab=health' },
        { name: 'Backup & Restore', href: '/dashboard/system?tab=backup' },
        { name: 'Maintenance', href: '/dashboard/system?tab=maintenance' },
    ]

    const bottomNavigation = useMemo(() => {
        const items: Array<{ name: string, href: string, icon: PhosphorIcon }> = []
        
        // API Key - admin only
        if (isAdmin) {
            items.push({ name: 'Get API Key', href: '/dashboard/api-keys', icon: Key })
            // Settings - admin only
            items.push({ name: 'Settings', href: '/dashboard/settings', icon: GearSix })
        }
        
        return items
    }, [isAdmin])

    // Animated Icon Component (inline for simplicity)
    // Animated Icon Component using Tailwind group-hover
    const AnimatedNavIcon = ({ Icon, isActive }: { Icon: PhosphorIcon, isActive: boolean }) => {
        return (
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
    }

    const SidebarContent = () => (
        <>
            <div className={`flex items-center ${isExpanded ? 'justify-between px-6' : 'justify-center px-0'} py-2 border-b border-zinc-200 dark:border-zinc-800 h-[89px]`}>
                {isExpanded && (
                    <div className="flex items-center min-w-0 transition-all duration-300 px-0">
                        <img
                            src="/sendr-logo.png"
                            alt="Sendr"
                            className="w-[125px] h-auto object-contain dark:invert-0 invert"
                        />
                    </div>
                )}

                <button
                    onClick={toggleSidebar}
                    className={`${isExpanded ? 'hidden md:flex' : 'flex'} p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 rounded-md text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors`}
                    title={isExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
                >
                    <SidebarSimple size={20} weight="regular" className={`transition-transform ${isExpanded ? '' : 'rotate-180'}`} />
                </button>

                <button
                    onClick={() => setIsMobileOpen(false)}
                    className="md:hidden flex items-center justify-center w-6 h-6 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800/50 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors absolute right-4"
                >
                    <X size={16} weight="bold" />
                </button>
            </div>


            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                {navigation.map((item) => {
                    const isActive = pathname ? (item.href === '/dashboard'
                        ? pathname === '/dashboard'
                        : pathname === item.href || pathname.startsWith(item.href + '/')) : false

                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-300 ease-out active:scale-[0.97] ${isActive
                                ? 'bg-zinc-100 dark:bg-zinc-800/80 text-zinc-900 dark:text-white'
                                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/40'
                                }`}
                            title={!isExpanded ? item.name : undefined}
                        >
                            {/* Active/Hover indicator bar */}
                            <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 rounded-r-full transition-all duration-300 ease-out ${isActive
                                ? 'h-5 opacity-100 bg-blue-500'
                                : 'h-0 opacity-0 bg-zinc-400 dark:bg-zinc-500 group-hover:h-4 group-hover:opacity-100'
                                }`} />

                            <AnimatedNavIcon Icon={item.icon} isActive={isActive} />
                            {isExpanded && (
                                <span className={`text-sm font-normal tracking-normal truncate transition-all duration-300 ${isActive ? 'text-white' : 'text-zinc-400 group-hover:text-zinc-200'}`}>{item.name}</span>
                            )}
                        </Link>
                    )
                })}

                {isAdmin && adminTopNavigation.map((item) => {
                    const isSecurityActive = item.submenuType === 'security' && pathname?.startsWith('/dashboard/security')
                    const isSystemActive = item.submenuType === 'system' && pathname?.startsWith('/dashboard/system')
                    const isActive = pathname === item.href || isSecurityActive || isSystemActive

                    if (item.hasSubmenu) {
                        // Determine which submenu type
                        const isSecurityMenu = item.submenuType === 'security'
                        const isSystemMenu = item.submenuType === 'system'
                        const isThisExpanded = isSecurityMenu ? isSecurityExpanded : isSystemExpanded
                        const setThisExpanded = isSecurityMenu ? setIsSecurityExpanded : setIsSystemExpanded
                        const subNavItems = isSecurityMenu ? securitySubNavigation : systemSubNavigation
                        const basePath = isSecurityMenu ? '/dashboard/security' : '/dashboard/system'

                        return (
                            <div key={item.name}>
                                <button
                                    onClick={() => setThisExpanded(!isThisExpanded)}
                                    className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-300 ease-out active:scale-[0.97] w-full ${isActive
                                        ? 'bg-zinc-100 dark:bg-zinc-800/80 text-zinc-900 dark:text-white'
                                        : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/40'
                                        }`}
                                    title={!isExpanded ? item.name : undefined}
                                >
                                    {/* Active/Hover indicator bar */}
                                    <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 rounded-r-full transition-all duration-300 ease-out ${isActive
                                        ? 'h-5 opacity-100 bg-blue-500'
                                        : 'h-0 opacity-0 bg-zinc-400 dark:bg-zinc-500 group-hover:h-4 group-hover:opacity-100'
                                        }`} />

                                    <AnimatedNavIcon Icon={item.icon} isActive={!!isActive} />
                                    {isExpanded && (
                                        <>
                                            <span className={`text-sm font-normal tracking-normal truncate transition-all duration-300 flex-1 text-left ${isActive ? 'text-white' : 'text-zinc-400 group-hover:text-zinc-200'}`}>{item.name}</span>
                                            <CaretDown
                                                size={14}
                                                weight="bold"
                                                className={`text-zinc-500 transition-transform duration-200 ${isThisExpanded ? 'rotate-180' : ''}`}
                                            />
                                        </>
                                    )}
                                </button>

                                {/* Submenu */}
                                {isThisExpanded && isExpanded && (
                                    <div className="ml-6 mt-1 space-y-0.5 border-l border-zinc-700/50 pl-3">
                                        {subNavItems.map((subItem) => {
                                            const tabValue = subItem.href.split('tab=')[1]
                                            const currentTab = searchParams?.get('tab')
                                            const isSubActive = pathname === basePath && currentTab === tabValue
                                            return (
                                                <Link
                                                    key={subItem.name}
                                                    href={subItem.href}
                                                    className={`block px-3 py-2 rounded-md text-xs transition-all duration-200 ${isSubActive
                                                        ? 'bg-zinc-800/60 text-white'
                                                        : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/40'
                                                        }`}
                                                >
                                                    {subItem.name}
                                                </Link>
                                            )
                                        })}
                                    </div>
                                )}
                            </div>
                        )
                    }

                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-300 ease-out active:scale-[0.97] ${isActive
                                ? 'bg-zinc-100 dark:bg-zinc-800/80 text-zinc-900 dark:text-white'
                                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/40'
                                }`}
                            title={!isExpanded ? item.name : undefined}
                        >
                            {/* Active/Hover indicator bar */}
                            <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 rounded-r-full transition-all duration-300 ease-out ${isActive
                                ? 'h-5 opacity-100 bg-blue-500'
                                : 'h-0 opacity-0 bg-zinc-400 dark:bg-zinc-500 group-hover:h-4 group-hover:opacity-100'
                                }`} />

                            <AnimatedNavIcon Icon={item.icon} isActive={!!isActive} />
                            {isExpanded && (
                                <span className={`text-sm font-normal tracking-normal truncate transition-all duration-300 ${isActive ? 'text-white' : 'text-zinc-400 group-hover:text-zinc-200'}`}>{item.name}</span>
                            )}
                        </Link>
                    )
                })}
            </nav>

            <div className="px-3 py-4 space-y-1">
                {bottomNavigation.map((item) => {
                    const isActive = pathname === item.href
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-300 ease-out active:scale-[0.97] ${isActive
                                ? 'bg-zinc-100 dark:bg-zinc-800/80 text-zinc-900 dark:text-white'
                                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/40'
                                }`}
                            title={!isExpanded ? item.name : undefined}
                        >
                            {/* Active/Hover indicator bar */}
                            <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 rounded-r-full transition-all duration-300 ease-out ${isActive
                                ? 'h-5 opacity-100 bg-blue-500'
                                : 'h-0 opacity-0 bg-zinc-400 dark:bg-zinc-500 group-hover:h-4 group-hover:opacity-100'
                                }`} />

                            <AnimatedNavIcon Icon={item.icon} isActive={isActive} />
                            {isExpanded && (
                                <span className={`text-sm font-normal tracking-normal truncate transition-all duration-300 ${isActive ? 'text-white' : 'text-zinc-400 group-hover:text-zinc-200'}`}>{item.name}</span>
                            )}
                        </Link>
                    )
                })}

                {/* Non-admin: Show theme toggle and sign out directly */}
                {!isAdmin && (
                    <>
                        <button
                            onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
                            className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-300 ease-out active:scale-[0.97] w-full text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/40`}
                            title={!isExpanded ? (resolvedTheme === 'dark' ? 'Light Mode' : 'Dark Mode') : undefined}
                        >
                            <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 rounded-r-full transition-all duration-300 ease-out h-0 opacity-0 bg-zinc-400 dark:bg-zinc-500 group-hover:h-4 group-hover:opacity-100`} />
                            <div className="relative flex items-center justify-center">
                                {resolvedTheme === 'dark' ? (
                                    <Sun size={20} weight="regular" className="text-zinc-500 dark:text-zinc-400 group-hover:text-amber-500 transition-all duration-300 group-hover:rotate-90 group-hover:scale-110" />
                                ) : (
                                    <Moon size={20} weight="regular" className="text-zinc-500 dark:text-zinc-400 group-hover:text-blue-500 transition-all duration-300 group-hover:-rotate-12 group-hover:scale-110" />
                                )}
                            </div>
                            {isExpanded && (
                                <span className="text-sm font-normal tracking-normal truncate transition-all duration-300 text-zinc-400 group-hover:text-zinc-200">
                                    {resolvedTheme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                                </span>
                            )}
                        </button>
                        <button
                            onClick={handleLogout}
                            className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-300 ease-out active:scale-[0.97] w-full text-zinc-600 dark:text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10`}
                            title={!isExpanded ? 'Sign Out' : undefined}
                        >
                            <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 rounded-r-full transition-all duration-300 ease-out h-0 opacity-0 bg-red-500 group-hover:h-4 group-hover:opacity-100`} />
                            <div className="relative flex items-center justify-center">
                                <SignOut size={20} weight="regular" className="text-zinc-500 dark:text-zinc-400 group-hover:text-red-500 transition-all duration-300 group-hover:-translate-x-1" />
                            </div>
                            {isExpanded && (
                                <span className="text-sm font-normal tracking-normal truncate transition-all duration-300 text-zinc-400 group-hover:text-red-500">
                                    Sign Out
                                </span>
                            )}
                        </button>
                    </>
                )}
            </div>

            {
                user && (
                    <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-black relative">
                        <button
                            onClick={() => setShowUserMenu(!showUserMenu)}
                            className={`w-full flex items-center ${isExpanded ? 'justify-start' : 'justify-center'} hover:bg-zinc-100 dark:hover:bg-zinc-900/50 rounded-xl p-1.5 transition-colors gap-3 overflow-hidden group`}
                        >
                            <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 border border-zinc-300 dark:border-zinc-800 group-hover:border-zinc-400 dark:group-hover:border-zinc-700 transition-colors bg-zinc-200 dark:bg-zinc-800">
                                <div className="w-full h-full flex items-center justify-center bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-500 uppercase font-bold text-xs">
                                    {user.name[0]}
                                </div>
                            </div>
                            {isExpanded && (
                                <div className="flex-1 text-left min-w-0">
                                    <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">{user.name}</p>
                                    <p className="text-[10px] text-zinc-500 truncate">{user.email}</p>
                                </div>
                            )}
                        </button>

                        {showUserMenu && (
                            <div className={`absolute bottom-full mb-2 p-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-lg dark:shadow-2xl z-[60] overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200 ${isExpanded ? 'left-4 right-4' : 'left-1/2 -translate-x-1/2 w-12'}`}>
                                <button
                                    onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
                                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors group ${!isExpanded ? 'justify-center' : ''}`}
                                    title={resolvedTheme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                                >
                                    {resolvedTheme === 'dark' ? (
                                        <>
                                            <Sun size={16} weight="light" className="text-amber-500 transition-transform duration-300 group-hover:rotate-90 group-hover:scale-110" />
                                            {isExpanded && <span>Light Mode</span>}
                                        </>
                                    ) : (
                                        <>
                                            <Moon size={16} weight="light" className="text-blue-500 transition-transform duration-300 group-hover:-rotate-12 group-hover:scale-110" />
                                            {isExpanded && <span>Dark Mode</span>}
                                        </>
                                    )}
                                </button>
                                <div className="h-px bg-zinc-200 dark:bg-zinc-800 my-1" />
                                <button
                                    onClick={handleLogout}
                                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors group ${!isExpanded ? 'justify-center' : ''}`}
                                    title="Sign Out"
                                >
                                    <SignOut size={16} weight="light" className="transition-transform duration-300 group-hover:-translate-x-1" />
                                    {isExpanded && <span>Sign Out</span>}
                                </button>
                            </div>
                        )}
                    </div>
                )
            }
        </>
    )

    // Mobile sidebar content - always shows labels
    const MobileSidebarContent = ({ onClose }: { onClose: () => void }) => (
        <>
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 h-[60px]">
                <div className="flex items-center">
                    <img
                        src="/sendr-logo.png"
                        alt="Sendr"
                        className="w-[100px] h-auto object-contain dark:invert-0 invert"
                    />
                </div>
                <button
                    onClick={onClose}
                    className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800/50 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                >
                    <X size={18} weight="bold" />
                </button>
            </div>

            <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
                {navigation.map((item) => {
                    const isActive = pathname ? (item.href === '/dashboard'
                        ? pathname === '/dashboard'
                        : pathname === item.href || pathname.startsWith(item.href + '/')) : false

                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            onClick={onClose}
                            className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${isActive
                                ? 'bg-blue-500/10 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400'
                                : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/40'
                                }`}
                        >
                            <item.icon
                                size={20}
                                weight={isActive ? "fill" : "regular"}
                                className={isActive ? 'text-blue-500' : 'text-zinc-500 dark:text-zinc-400'}
                            />
                            <span className={`text-sm font-medium ${isActive ? 'text-blue-600 dark:text-blue-400' : ''}`}>
                                {item.name}
                            </span>
                        </Link>
                    )
                })}

                {isAdmin && (
                    <>
                        <div className="h-px bg-zinc-200 dark:bg-zinc-800 my-2" />
                        {adminTopNavigation.map((item) => {
                            const isSecurityActive = item.submenuType === 'security' && pathname?.startsWith('/dashboard/security')
                            const isSystemActive = item.submenuType === 'system' && pathname?.startsWith('/dashboard/system')
                            const isActive = pathname === item.href || isSecurityActive || isSystemActive

                            if (item.hasSubmenu) {
                                const isSecurityMenu = item.submenuType === 'security'
                                const isThisExpanded = isSecurityMenu ? isSecurityExpanded : isSystemExpanded
                                const setThisExpanded = isSecurityMenu ? setIsSecurityExpanded : setIsSystemExpanded
                                const subNavItems = isSecurityMenu ? securitySubNavigation : systemSubNavigation
                                const basePath = isSecurityMenu ? '/dashboard/security' : '/dashboard/system'

                                return (
                                    <div key={item.name}>
                                        <button
                                            onClick={() => setThisExpanded(!isThisExpanded)}
                                            className={`group w-full relative flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${isActive
                                                ? 'bg-blue-500/10 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400'
                                                : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/40'
                                                }`}
                                        >
                                            <item.icon
                                                size={20}
                                                weight={isActive ? "fill" : "regular"}
                                                className={isActive ? 'text-blue-500' : 'text-zinc-500 dark:text-zinc-400'}
                                            />
                                            <span className={`text-sm font-medium flex-1 text-left ${isActive ? 'text-blue-600 dark:text-blue-400' : ''}`}>
                                                {item.name}
                                            </span>
                                            <CaretDown
                                                size={14}
                                                weight="bold"
                                                className={`text-zinc-400 transition-transform duration-200 ${isThisExpanded ? 'rotate-180' : ''}`}
                                            />
                                        </button>
                                        {isThisExpanded && (
                                            <div className="ml-8 mt-1 space-y-0.5 border-l-2 border-zinc-200 dark:border-zinc-700/50 pl-3">
                                                {subNavItems.map((subItem) => {
                                                    const tabValue = subItem.href.split('tab=')[1]
                                                    const currentTab = searchParams?.get('tab')
                                                    const isSubActive = pathname === basePath && currentTab === tabValue
                                                    return (
                                                        <Link
                                                            key={subItem.name}
                                                            href={subItem.href}
                                                            onClick={onClose}
                                                            className={`block px-3 py-2 rounded-md text-sm transition-colors ${isSubActive
                                                                ? 'text-blue-500 font-medium'
                                                                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300'
                                                                }`}
                                                        >
                                                            {subItem.name}
                                                        </Link>
                                                    )
                                                })}
                                            </div>
                                        )}
                                    </div>
                                )
                            }

                            return (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    onClick={onClose}
                                    className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${isActive
                                        ? 'bg-blue-500/10 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400'
                                        : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/40'
                                        }`}
                                >
                                    <item.icon
                                        size={20}
                                        weight={isActive ? "fill" : "regular"}
                                        className={isActive ? 'text-blue-500' : 'text-zinc-500 dark:text-zinc-400'}
                                    />
                                    <span className={`text-sm font-medium ${isActive ? 'text-blue-600 dark:text-blue-400' : ''}`}>
                                        {item.name}
                                    </span>
                                </Link>
                            )
                        })}
                    </>
                )}
            </nav>

            {/* Bottom section */}
            <div className="px-3 py-3 space-y-0.5 border-t border-zinc-200 dark:border-zinc-800">
                {bottomNavigation.map((item) => {
                    const isActive = pathname === item.href
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            onClick={onClose}
                            className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${isActive
                                ? 'bg-blue-500/10 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400'
                                : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/40'
                                }`}
                        >
                            <item.icon
                                size={20}
                                weight={isActive ? "fill" : "regular"}
                                className={isActive ? 'text-blue-500' : 'text-zinc-500 dark:text-zinc-400'}
                            />
                            <span className={`text-sm font-medium ${isActive ? 'text-blue-600 dark:text-blue-400' : ''}`}>
                                {item.name}
                            </span>
                        </Link>
                    )
                })}

                {/* Theme toggle */}
                <button
                    onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/40 transition-colors"
                >
                    {resolvedTheme === 'dark' ? (
                        <Sun size={20} weight="regular" className="text-amber-500" />
                    ) : (
                        <Moon size={20} weight="regular" className="text-blue-500" />
                    )}
                    <span className="text-sm font-medium">
                        {resolvedTheme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                    </span>
                </button>

                {/* Sign out */}
                <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-zinc-600 dark:text-zinc-400 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-500 transition-colors"
                >
                    <SignOut size={20} weight="regular" className="text-zinc-500 dark:text-zinc-400" />
                    <span className="text-sm font-medium">Sign Out</span>
                </button>
            </div>

            {/* User info */}
            {user && (
                <div className="p-3 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
                    <div className="flex items-center gap-3 px-2">
                        <div className="w-9 h-9 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-400 font-bold text-sm uppercase">
                            {user.name[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-zinc-900 dark:text-white truncate">{user.name}</p>
                            <p className="text-xs text-zinc-500 truncate">{user.email}</p>
                        </div>
                    </div>
                </div>
            )}
        </>
    )

    if (!mounted) return null

    return (
        <>
            <div
                className={`fixed inset-0 bg-black/60 dark:bg-black/60 backdrop-blur-sm z-50 md:hidden transition-opacity duration-300 ${isMobileOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
                    }`}
                onClick={() => setIsMobileOpen(false)}
            />

            {!isMobileOpen && (
                <button
                    onClick={() => setIsMobileOpen(true)}
                    className="md:hidden fixed top-4 right-4 z-[45] p-2 bg-white dark:bg-black border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-600 dark:text-zinc-400"
                >
                    <List size={24} weight="light" />
                </button>
            )}

            <aside
                className={`fixed left-0 top-0 h-full bg-white dark:bg-black border-r border-zinc-200 dark:border-zinc-800 z-[55] transition-all duration-300 ease-in-out flex flex-col ${isExpanded ? 'w-64' : 'w-20'
                    } hidden md:flex`}
            >
                <SidebarContent />
            </aside>

            {/* Mobile sidebar - always expanded with labels */}
            <aside
                className={`fixed left-0 top-0 h-full bg-white dark:bg-black z-[60] transition-transform duration-300 ease-in-out flex flex-col w-72 md:hidden ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'
                    }`}
            >
                <MobileSidebarContent onClose={() => setIsMobileOpen(false)} />
            </aside>
        </>
    )
}
