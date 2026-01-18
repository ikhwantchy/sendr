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

            {/* User Info with Dropdown Menu */}
            {user && (
                <div className="p-4 border-t border-zinc-900 bg-zinc-950 relative">
                    <button
                        onClick={() => setShowUserMenu(!showUserMenu)}
                        className={`w-full flex items-center ${isExpanded ? 'justify-between' : 'justify-center'} hover:bg-zinc-900/50 rounded-lg p-2 transition-colors`}
                    >
                        <div className="flex items-center gap-3 overflow-hidden">
                            {/* Avatar */}
                            <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center flex-shrink-0 text-zinc-500 border border-zinc-700">
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
                                        {user.email}
                                    </p>
                                </div>
                            )}
                        </div>
                    </button>

                    {/* Dropdown Menu */}
                    {showUserMenu && (
                        <>
                            {/* Backdrop */}
                            <div
                                className="fixed inset-0 z-40"
                                onClick={() => setShowUserMenu(false)}
                            />

                            {/* Menu Popup */}
                            <div className="absolute bottom-full left-4 right-4 mb-2 bg-[#0e0e11] border border-zinc-800/50 rounded-2xl shadow-2xl z-50 overflow-hidden">
                                <div className="py-2">
                                    <button
                                        onClick={() => {
                                            setShowUserMenu(false);
                                            router.push('/dashboard/settings/profile');
                                        }}
                                        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-zinc-800/50 transition-colors"
                                    >
                                        <User className="w-5 h-5 text-zinc-100" />
                                        <span className="text-[15px] font-normal text-zinc-100">Profile</span>
                                    </button>

                                    <button
                                        onClick={() => setShowSettingsSubmenu(!showSettingsSubmenu)}
                                        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-zinc-800/50 transition-colors"
                                    >
                                        <Settings className="w-5 h-5 text-zinc-100" />
                                        <span className="flex-1 text-[15px] font-normal text-zinc-100">Settings</span>
                                        <ChevronRight className={`w-4 h-4 text-zinc-500 transition-transform ${showSettingsSubmenu ? 'rotate-90' : ''}`} />
                                    </button>

                                    {/* Settings Submenu */}
                                    <div className={`overflow-hidden transition-all duration-300 ease-in-out ${showSettingsSubmenu ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'
                                        }`}>
                                        <div className="bg-zinc-900/30">
                                            <button
                                                onClick={() => {
                                                    setShowUserMenu(false);
                                                    setShowSettingsSubmenu(false);
                                                    router.push('/dashboard/settings/profile');
                                                }}
                                                className="w-full flex items-center gap-3 pl-12 pr-4 py-2.5 text-left hover:bg-zinc-800/50 transition-colors"
                                            >
                                                <span className="text-[14px] font-normal text-zinc-300">General Settings</span>
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setShowUserMenu(false);
                                                    setShowSettingsSubmenu(false);
                                                    router.push('/dashboard/settings/security');
                                                }}
                                                className="w-full flex items-center gap-3 pl-12 pr-4 py-2.5 text-left hover:bg-zinc-800/50 transition-colors"
                                            >
                                                <span className="text-[14px] font-normal text-zinc-300">Security Settings</span>
                                            </button>
                                        </div>
                                    </div>

                                    <button
                                        disabled
                                        className="w-full flex items-center gap-3 px-4 py-3 text-left opacity-50 cursor-not-allowed"
                                    >
                                        <svg className="w-5 h-5 text-zinc-100" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                                        </svg>
                                        <span className="flex-1 text-[15px] font-normal text-zinc-100">Theme</span>
                                        <ChevronRight className="w-4 h-4 text-zinc-500" />
                                    </button>

                                    <button
                                        disabled
                                        className="w-full flex items-center gap-3 px-4 py-3 text-left opacity-50 cursor-not-allowed"
                                    >
                                        <svg className="w-5 h-5 text-zinc-100" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                        </svg>
                                        <span className="text-[15px] font-normal text-zinc-100">Upgrade</span>
                                    </button>

                                    <div className="border-t border-zinc-800 my-2" />

                                    <button
                                        disabled
                                        className="w-full flex items-center gap-3 px-4 py-3 text-left opacity-50 cursor-not-allowed"
                                    >
                                        <svg className="w-5 h-5 text-zinc-100" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                                        </svg>
                                        <span className="text-[15px] font-normal text-zinc-100">Keyboard shortcuts</span>
                                    </button>

                                    <button
                                        disabled
                                        className="w-full flex items-center gap-3 px-4 py-3 text-left opacity-50 cursor-not-allowed"
                                    >
                                        <svg className="w-5 h-5 text-zinc-100" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <span className="text-[15px] font-normal text-zinc-100">Help center</span>
                                    </button>

                                    <button
                                        onClick={handleLogout}
                                        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-zinc-800/50 transition-colors"
                                    >
                                        <LogOut className="w-5 h-5 text-zinc-100" />
                                        <span className="text-[15px] font-normal text-zinc-100">Log out</span>
                                    </button>
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
