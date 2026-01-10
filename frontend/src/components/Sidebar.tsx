'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import {
    LayoutDashboard,
    Bot,
    Database,
    BarChart3,
    Users,
    LogOut,
    Menu,
    X,
    ChevronLeft,
    ChevronRight,
    Settings,
    User
} from 'lucide-react'

export default function Sidebar() {
    const pathname = usePathname()
    const router = useRouter()
    const [user, setUser] = useState<any>(null)
    const [isExpanded, setIsExpanded] = useState(true)
    const [isMobileOpen, setIsMobileOpen] = useState(false)

    useEffect(() => {
        const userData = localStorage.getItem('user')
        if (userData) {
            setUser(JSON.parse(userData))
        }

        // Load sidebar state from localStorage
        const savedState = localStorage.getItem('sidebarExpanded')
        if (savedState !== null) {
            setIsExpanded(savedState === 'true')
        }

        // Close mobile menu on route change
        setIsMobileOpen(false)
    }, [pathname])

    const toggleSidebar = () => {
        const newState = !isExpanded
        setIsExpanded(newState)
        // Save to localStorage
        localStorage.setItem('sidebarExpanded', String(newState))
        // Dispatch custom event to notify layout
        window.dispatchEvent(new Event('sidebarToggle'))
    }

    const handleLogout = () => {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        router.push('/login')
    }

    const navigation = [
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
        {
            name: 'Data Sources',
            href: '/dashboard/datasources',
            icon: Database,
        },
        {
            name: 'Analytics',
            href: '/dashboard/analytics',
            icon: BarChart3,
        },
    ]

    const ownerNavigation = [
        {
            name: 'Users',
            href: '/dashboard/users',
            icon: Users,
        },
    ]

    const SidebarContent = () => (
        <>
            {/* Logo */}
            <div className={`flex items-center px-4 py-6 border-b border-zinc-800/50 ${isExpanded ? 'justify-between' : 'justify-center flex-col gap-3'
                }`}>
                {isExpanded ? (
                    <>
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 flex items-center justify-center flex-shrink-0">
                                <img src="/brobot-logo.png" alt="BroBot" className="w-10 h-10 object-contain" />
                            </div>
                            <div className="min-w-0">
                                <h1 className="text-zinc-100 font-semibold text-sm tracking-tight truncate">BroBot</h1>
                                <p className="text-zinc-600 text-xs truncate">Automation Platform</p>
                            </div>
                        </div>

                        {/* Desktop Toggle - Expanded */}
                        <button
                            onClick={toggleSidebar}
                            className="hidden md:flex items-center justify-center w-6 h-6 rounded-md hover:bg-zinc-800/50 text-zinc-400 hover:text-zinc-100 transition-colors"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                    </>
                ) : (
                    <>
                        {/* Logo Only */}
                        <div className="w-10 h-10 flex items-center justify-center flex-shrink-0">
                            <img src="/brobot-logo.png" alt="BroBot" className="w-10 h-10 object-contain" />
                        </div>

                        {/* Desktop Toggle - Collapsed */}
                        <button
                            onClick={toggleSidebar}
                            className="hidden md:flex items-center justify-center w-8 h-8 rounded-md bg-zinc-800/50 hover:bg-zinc-700/50 text-zinc-400 hover:text-zinc-100 transition-colors"
                            title="Expand sidebar"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </>
                )}

                {/* Mobile Close */}
                <button
                    onClick={() => setIsMobileOpen(false)}
                    className="md:hidden flex items-center justify-center w-6 h-6 rounded-md hover:bg-zinc-800/50 text-zinc-400 hover:text-zinc-100 transition-colors"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                {navigation.map((item) => {
                    const isActive = pathname === item.href
                    const Icon = item.icon
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={`group flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 ${isActive
                                ? 'bg-zinc-900 text-zinc-100 shadow-[0_1px_0_0_rgba(255,255,255,0.05)] inset'
                                : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/40'
                                }`}
                            title={!isExpanded ? item.name : undefined}
                        >
                            <Icon className={`w-4 h-4 flex-shrink-0 transition-colors ${isActive ? 'text-zinc-100' : 'text-zinc-500 group-hover:text-zinc-300'}`} />
                            {isExpanded && (
                                <span className="text-sm font-medium tracking-tight truncate">{item.name}</span>
                            )}
                        </Link>
                    )
                })}

                {/* Owner-only navigation */}
                {user?.role?.toLowerCase() === 'owner' && ownerNavigation.map((item) => {
                    const isActive = pathname === item.href
                    const Icon = item.icon
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={`group flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 ${isActive
                                ? 'bg-zinc-900 text-zinc-100 shadow-[0_1px_0_0_rgba(255,255,255,0.05)] inset'
                                : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/40'
                                }`}
                            title={!isExpanded ? item.name : undefined}
                        >
                            <Icon className={`w-4 h-4 flex-shrink-0 transition-colors ${isActive ? 'text-zinc-100' : 'text-zinc-500 group-hover:text-zinc-300'}`} />
                            {isExpanded && (
                                <span className="text-sm font-medium tracking-tight truncate">{item.name}</span>
                            )}
                        </Link>
                    )
                })}
            </nav>

            {/* User Info */}
            {user && (
                <div className="p-4 border-t border-zinc-900 bg-zinc-950">
                    <div className={`flex items-center ${isExpanded ? 'justify-between' : 'justify-center'}`}>
                        <div className="flex items-center gap-3 overflow-hidden">
                            {/* Avatar */}
                            <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center flex-shrink-0 text-zinc-500">
                                {user.name ? (
                                    <span className="font-medium text-sm text-zinc-300">{user.name.charAt(0)}</span>
                                ) : (
                                    <User className="w-5 h-5" />
                                )}
                            </div>

                            {/* Text Info */}
                            {isExpanded && (
                                <div className="min-w-0 transition-opacity duration-200">
                                    <h4 className="text-sm font-medium text-white truncate leading-none mb-1">
                                        {user.name || 'Admin'}
                                    </h4>
                                    <p className="text-xs text-zinc-500 truncate font-medium">
                                        Pro Plan
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Actions */}
                        {isExpanded && (
                            <div className="flex items-center gap-1">
                                <button
                                    className="text-zinc-600 hover:text-white transition-colors p-1.5 rounded-md hover:bg-zinc-900"
                                    onClick={() => router.push('/dashboard/settings')}
                                    title="Settings"
                                >
                                    <Settings className="w-4 h-4" />
                                </button>
                                <button
                                    className="text-zinc-600 hover:text-red-400 transition-colors p-1.5 rounded-md hover:bg-red-500/10"
                                    onClick={handleLogout}
                                    title="Logout"
                                >
                                    <LogOut className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    )

    return (
        <>
            {/* Mobile Header */}
            <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-800/50 z-40 flex items-center justify-between px-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 flex items-center justify-center">
                        <img src="/brobot-logo.png" alt="BroBot" className="w-10 h-10 object-contain" />
                    </div>
                    <h1 className="text-zinc-100 font-semibold text-sm tracking-tight">BroBot</h1>
                </div>
                <button
                    onClick={() => setIsMobileOpen(true)}
                    className="flex items-center justify-center w-9 h-9 rounded-lg hover:bg-zinc-800/50 text-zinc-400 hover:text-zinc-100 transition-colors"
                >
                    <Menu className="w-5 h-5" />
                </button>
            </div>

            {/* Mobile Backdrop */}
            {isMobileOpen && (
                <div
                    className="md:hidden fixed inset-0 bg-black/80 backdrop-blur-sm z-40 animate-fade-in"
                    onClick={() => setIsMobileOpen(false)}
                />
            )}

            {/* Sidebar - Desktop & Mobile */}
            <aside
                className={`fixed top-0 left-0 h-screen bg-zinc-950 border-r border-zinc-800/50 z-50 flex flex-col transition-all duration-300 ${isExpanded ? 'w-64' : 'w-20'
                    } ${isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
                    }`}
            >
                <SidebarContent />
            </aside>
        </>
    )
}
