'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect, useMemo } from 'react'
import {
    LayoutDashboard,
    Bot,
    BarChart3,
    Users,
    LogOut,
    Menu,
    X,
    ChevronLeft,
    ChevronRight,
    Settings,
    Key,
    FileText,
    Server,
    Shield,
    Sun,
    Moon
} from 'lucide-react'
import { usePermissions } from '@/hooks/usePermissions'
import { useTheme } from 'next-themes'

export default function Sidebar() {
    const pathname = usePathname()
    const router = useRouter()
    const { user, hasModuleAccess, isAdmin } = usePermissions()
    const { resolvedTheme, setTheme } = useTheme()
    const [isExpanded, setIsExpanded] = useState(true)
    const [isMobileOpen, setIsMobileOpen] = useState(false)
    const [showUserMenu, setShowUserMenu] = useState(false)
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

    const navigation = useMemo(() => {
        const base = [
            {
                name: 'Dashboard',
                href: '/dashboard',
                icon: LayoutDashboard,
            },
            {
                name: 'Bots',
                href: '/dashboard/bots',
                icon: Bot,
            },
        ]

        if (!user) return base

        // Module Access for Users
        if (hasModuleAccess('analytics')) {
            base.push({ name: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 })
        }
        return base
    }, [user, hasModuleAccess])

    const adminTopNavigation = [
        {
            name: 'Users',
            href: '/dashboard/users',
            icon: Users,
            adminOnly: true
        },
        {
            name: 'Audit Logs',
            href: '/dashboard/audit-logs',
            icon: FileText,
            adminOnly: true
        },
        {
            name: 'System',
            href: '/dashboard/system',
            icon: Server,
            adminOnly: true
        },
        {
            name: 'Security',
            href: '/dashboard/security',
            icon: Shield,
            adminOnly: true
        },
    ]

    const bottomNavigation = useMemo(() => {
        if (!isAdmin) return []
        return [
            {
                name: 'Get API key',
                href: '/dashboard/api-keys',
                icon: Key,
            },
            {
                name: 'Settings',
                href: '/dashboard/settings',
                icon: Settings,
            },
        ]
    }, [isAdmin])

    const SidebarContent = () => (
        <>
            <div className="flex items-center justify-between px-4 py-6 border-b border-zinc-200 dark:border-zinc-800/50">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 flex items-center justify-center flex-shrink-0">
                        <img src="/brobot-logo.png" alt="BroBot" className="w-10 h-10 object-contain dark:invert-0 invert" />
                    </div>
                    {isExpanded && (
                        <div className="min-w-0">
                            <h1 className="text-zinc-900 dark:text-zinc-100 font-semibold text-sm tracking-tight truncate">BroBot</h1>
                            <p className="text-zinc-500 dark:text-zinc-600 text-xs truncate">Automation Platform</p>
                        </div>
                    )}
                </div>

                <button
                    onClick={toggleSidebar}
                    className="hidden md:flex p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 rounded-md text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                >
                    {isExpanded ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>

                <button
                    onClick={() => setIsMobileOpen(false)}
                    className="md:hidden flex items-center justify-center w-6 h-6 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800/50 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>

            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                {navigation.map((item: any) => {
                    const isActive = pathname ? (item.href === '/dashboard'
                        ? pathname === '/dashboard'
                        : pathname === item.href || pathname.startsWith(item.href + '/')) : false
                    const Icon = item.icon

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
                            <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 rounded-r-full transition-all duration-300 ease-out ${
                                isActive 
                                    ? 'h-5 opacity-100 bg-blue-500' 
                                    : 'h-0 opacity-0 bg-zinc-400 dark:bg-zinc-500 group-hover:h-4 group-hover:opacity-100'
                            }`} />
                            
                            <Icon className={`w-4 h-4 flex-shrink-0 transition-all duration-300 ease-out ${isActive ? 'text-blue-500 dark:text-blue-400 scale-110' : 'text-zinc-500 group-hover:text-zinc-700 dark:group-hover:text-zinc-300 group-hover:scale-105'}`} />
                            {isExpanded && (
                                <span className={`text-sm font-medium tracking-tight truncate transition-all duration-300 ${isActive ? 'translate-x-0.5' : ''}`}>{item.name}</span>
                            )}
                        </Link>
                    )
                })}

                {isAdmin && adminTopNavigation.map((item) => {
                    const isActive = pathname === item.href
                    const Icon = item.icon
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
                            <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 rounded-r-full transition-all duration-300 ease-out ${
                                isActive
                            ? 'h-5 opacity-100 bg-blue-500' 
                                    : 'h-0 opacity-0 bg-zinc-400 dark:bg-zinc-500 group-hover:h-4 group-hover:opacity-100'
                            }`} />
                            
                            <Icon className={`w-4 h-4 flex-shrink-0 transition-all duration-300 ease-out ${isActive ? 'text-blue-500 dark:text-blue-400 scale-110' : 'text-zinc-500 group-hover:text-zinc-700 dark:group-hover:text-zinc-300 group-hover:scale-105'}`} />
                            {isExpanded && (
                                <span className={`text-sm font-medium tracking-tight truncate transition-all duration-300 ${isActive ? 'translate-x-0.5' : ''}`}>{item.name}</span>
                            )}
                        </Link>
                    )
                })}
            </nav>

            <div className="px-3 py-4 space-y-1">
                {bottomNavigation.map((item) => {
                    const isActive = pathname === item.href
                    const Icon = item.icon
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
                            <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 rounded-r-full transition-all duration-300 ease-out ${
                                isActive 
                                    ? 'h-5 opacity-100 bg-blue-500' 
                                    : 'h-0 opacity-0 bg-zinc-400 dark:bg-zinc-500 group-hover:h-4 group-hover:opacity-100'
                            }`} />
                            
                            <Icon className={`w-4 h-4 flex-shrink-0 transition-all duration-300 ease-out ${isActive ? 'text-blue-500 dark:text-blue-400 scale-110' : 'text-zinc-500 group-hover:text-zinc-700 dark:group-hover:text-zinc-300 group-hover:scale-105'}`} />
                            {isExpanded && (
                                <span className={`text-sm font-medium tracking-tight truncate transition-all duration-300 ${isActive ? 'translate-x-0.5' : ''}`}>{item.name}</span>
                            )}
                        </Link>
                    )
                })}
            </div>

            {user && (
                <div className="p-4 border-t border-zinc-200 dark:border-zinc-900 bg-zinc-50 dark:bg-zinc-950 relative">
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
                        <div className="absolute bottom-full left-4 right-4 mb-2 p-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-lg dark:shadow-2xl z-[60] overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200">
                            <button
                                onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
                                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                            >
                                {resolvedTheme === 'dark' ? (
                                    <>
                                        <Sun className="w-4 h-4 text-amber-500" />
                                        <span>Light Mode</span>
                                    </>
                                ) : (
                                    <>
                                        <Moon className="w-4 h-4 text-blue-500" />
                                        <span>Dark Mode</span>
                                    </>
                                )}
                            </button>
                            <div className="h-px bg-zinc-200 dark:bg-zinc-800 my-1" />
                            <button
                                onClick={handleLogout}
                                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                            >
                                <LogOut className="w-4 h-4" />
                                <span>Sign Out</span>
                            </button>
                        </div>
                    )}
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
                    className="md:hidden fixed top-4 right-4 z-[45] p-2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-900 rounded-lg text-zinc-600 dark:text-zinc-400"
                >
                    <Menu className="w-6 h-6" />
                </button>
            )}

            <aside
                className={`fixed left-0 top-0 h-full bg-white dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-900 z-[55] transition-all duration-300 ease-in-out flex flex-col ${isExpanded ? 'w-64' : 'w-20'
                    } hidden md:flex`}
            >
                <SidebarContent />
            </aside>

            <aside
                className={`fixed left-0 top-0 h-full bg-white dark:bg-zinc-950 z-[60] transition-transform duration-300 ease-in-out flex flex-col w-64 md:hidden ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'
                    }`}
            >
                <SidebarContent />
            </aside>
        </>
    )
}
