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
    User,
    Key,
    Shield,
    FileText,
    Clock,
    Server
} from 'lucide-react'

export default function Sidebar() {
    const pathname = usePathname()
    const router = useRouter()
    const [user, setUser] = useState<any>(null)
    const [isExpanded, setIsExpanded] = useState(true)
    const [isMobileOpen, setIsMobileOpen] = useState(false)
    const [showUserMenu, setShowUserMenu] = useState(false)
    const [showSettingsSubmenu, setShowSettingsSubmenu] = useState(false)

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
            name: 'Users',
            href: '/dashboard/users',
            icon: Users,
            adminOnly: true
        },
        {
            name: 'Analytics',
            href: '/dashboard/analytics',
            icon: BarChart3,
        },
    ]

    const ownerNavigation: any[] = []

    const adminTopNavigation = [
        {
            name: 'Audit Logs',
            href: '/dashboard/audit-logs',
            icon: FileText,
        },
        {
            name: 'System',
            href: '/dashboard/system',
            icon: Server,
        },
    ]

    const bottomNavigation = [
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

    const SidebarContent = () => (
        <>
            {/* Logo */}
            <div className="flex items-center justify-between px-4 py-6 border-b border-zinc-800/50">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 flex items-center justify-center flex-shrink-0">
                        <img src="/brobot-logo.png" alt="BroBot" className="w-10 h-10 object-contain" />
                    </div>
                    {isExpanded && (
                        <div className="min-w-0">
                            <h1 className="text-zinc-100 font-semibold text-sm tracking-tight truncate">BroBot</h1>
                            <p className="text-zinc-600 text-xs truncate">Automation Platform</p>
                        </div>
                    )}
                </div>

                {/* Desktop Toggle - Always in top right */}
                <button
                    onClick={toggleSidebar}
                    className="hidden md:flex items-center justify-center w-6 h-6 rounded-md hover:bg-zinc-800/50 text-zinc-400 hover:text-zinc-100 transition-colors flex-shrink-0"
                    title={isExpanded ? "Collapse sidebar" : "Expand sidebar"}
                >
                    {isExpanded ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>

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
                {navigation.map((item: any) => {
                    const isActive = pathname === item.href
                    const Icon = item.icon

                    // Conditionally hide admin-only items
                    if (item.adminOnly && !(user?.role?.toLowerCase() === 'admin' || user?.role?.toLowerCase() === 'owner')) {
                        return null
                    }

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

                {/* Admin/Owner top only items */}
                {(user?.role?.toLowerCase() === 'admin' || user?.role?.toLowerCase() === 'owner') && adminTopNavigation.map((item) => {
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

            {/* Bottom Actions & User Info */}
            <div className="px-3 py-4 space-y-1">
                {bottomNavigation.map((item) => {
                    const isActive = pathname === item.href
                    const Icon = item.icon
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={`group flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 ${isActive
                                ? 'bg-zinc-900 text-zinc-100'
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
            </div>

            {/* User Info with Enhanced Popup Menu */}
            {user && (
                <div className="p-4 border-t border-zinc-900 bg-zinc-950 relative">
                    <button
                        onClick={() => setShowUserMenu(!showUserMenu)}
                        className={`w-full flex items-center ${isExpanded ? 'justify-start' : 'justify-center'} hover:bg-zinc-900/50 rounded-xl p-1.5 transition-colors gap-3 overflow-hidden group`}
                    >
                        {/* Avatar */}
                        <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 border border-zinc-800 group-hover:border-zinc-700 transition-colors bg-zinc-800">
                            {user.avatar_url || user.image ? (
                                <img src={user.avatar_url || user.image} alt={user.name} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-zinc-400">
                                    <User className="w-4 h-4" />
                                </div>
                            )}
                        </div>

                        {/* Email / Username Label */}
                        {isExpanded && (
                            <div className="flex-1 min-w-0 text-left">
                                <p className="text-[13px] font-medium text-zinc-200 truncate tracking-tight">
                                    {user.email || 'admin@example.com'}
                                </p>
                            </div>
                        )}
                    </button>

                    {/* Dropdown Menu Popup (Custom Modal Style as per Image) */}
                    {showUserMenu && (
                        <>
                            {/* Backdrop */}
                            <div
                                className="fixed inset-0 z-40 bg-black/20"
                                onClick={() => setShowUserMenu(false)}
                            />

                            {/* Menu Popup Modal */}
                            <div className="absolute bottom-full left-4 mr-4 mb-3 w-[280px] bg-[#1a1a1c] border border-zinc-800/80 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-50 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200">
                                <div className="p-6 flex flex-col items-center text-center">
                                    {/* Large Avatar */}
                                    <div className="w-16 h-16 rounded-full overflow-hidden mb-4 border-2 border-zinc-800 shadow-xl bg-zinc-800">
                                        {user.avatar_url || user.image ? (
                                            <img src={user.avatar_url || user.image} alt={user.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-zinc-400">
                                                <User className="w-8 h-8" />
                                            </div>
                                        )}
                                    </div>

                                    {/* Name & Email */}
                                    <h3 className="text-[17px] font-semibold text-white tracking-tight leading-tight mb-1">
                                        {user.name || 'Ikhwan Tricahya'}
                                    </h3>
                                    <p className="text-[13px] text-zinc-400 font-normal mb-6 break-all">
                                        {user.email || 'ikhwantricahya03@gmail.com'}
                                    </p>

                                    {/* Switch Account */}
                                    <button
                                        onClick={() => {/* Switch account logic */ }}
                                        className="w-full py-2.5 px-6 border border-zinc-700/50 rounded-full text-zinc-200 text-sm font-medium hover:bg-zinc-800 transition-colors mb-2"
                                    >
                                        Switch account
                                    </button>
                                </div>

                                {/* Menu Actions */}
                                <div className="border-t border-zinc-800/50">
                                    <button
                                        onClick={handleLogout}
                                        className="w-full py-3.5 px-6 text-center text-[15px] font-medium text-zinc-200 hover:bg-zinc-800 transition-colors"
                                    >
                                        Sign out
                                    </button>
                                </div>

                                {/* Footer Links */}
                                <div className="px-6 py-4 bg-zinc-900/30 text-center flex items-center justify-center gap-2">
                                    <Link href="/privacy" className="text-[12px] text-zinc-500 hover:text-zinc-300 transition-colors">Privacy Policy</Link>
                                    <span className="w-1 h-1 rounded-full bg-zinc-700" />
                                    <Link href="/terms" className="text-[12px] text-zinc-500 hover:text-zinc-300 transition-colors">Terms of Service</Link>
                                </div>
                            </div>
                        </>
                    )}
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
