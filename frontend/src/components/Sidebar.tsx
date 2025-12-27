'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'

export default function Sidebar() {
    const pathname = usePathname()
    const router = useRouter()
    const [user, setUser] = useState<any>(null)

    useEffect(() => {
        const userData = localStorage.getItem('user')
        if (userData) {
            const parsedUser = JSON.parse(userData)
            setUser(parsedUser)
            // Debug logging
            console.log('🔍 Sidebar - User loaded:', parsedUser)
            console.log('🔍 Sidebar - User role:', parsedUser.role)
            console.log('🔍 Sidebar - Is owner?:', parsedUser.role?.toLowerCase() === 'owner')
        }
    }, [])

    const handleLogout = () => {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        router.push('/login')
    }

    const navigation = [
        {
            name: 'Dashboard',
            href: '/dashboard',
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
            ),
        },
        {
            name: 'Bots',
            href: '/dashboard/bots',
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                </svg>
            ),
        },
        {
            name: 'Data Sources',
            href: '/dashboard/datasources',
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                </svg>
            ),
        },
        {
            name: 'Analytics',
            href: '/dashboard/analytics',
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
            ),
        },
    ]

    // Owner-only navigation items
    const ownerNavigation = [
        {
            name: 'Users',
            href: '/dashboard/users',
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
            ),
        },
    ]

    return (
        <div className="flex flex-col w-72 bg-gradient-to-b from-gray-900 via-gray-900 to-black min-h-screen border-r border-white/10 relative overflow-hidden">
            {/* Animated Background */}
            <div className="absolute inset-0 opacity-30">
                <div className="absolute top-0 -left-4 w-72 h-72 bg-cyan-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
                <div className="absolute top-0 -right-4 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" style={{ animationDelay: '2s' }}></div>
                <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" style={{ animationDelay: '4s' }}></div>
            </div>

            {/* Logo */}
            <div className="relative flex items-center space-x-3 px-6 py-6 border-b border-white/10">
                <div className="w-12 h-12 bg-gradient-to-br from-cyan-400 via-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg glow-cyan relative group">
                    <svg className="w-7 h-7 text-white relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                    </svg>
                    <div className="absolute inset-0 bg-gradient-to-br from-cyan-400 to-purple-600 rounded-2xl blur-md opacity-50 group-hover:opacity-75 transition-opacity"></div>
                </div>
                <div>
                    <h1 className="text-white font-bold text-xl tracking-tight">BroBot</h1>
                    <p className="text-cyan-400 text-xs font-medium">Automation Made Easy</p>
                </div>
            </div>

            {/* Navigation */}
            <nav className="relative flex-1 px-4 py-6 space-y-2">
                {navigation.map((item) => {
                    const isActive = pathname === item.href
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={`group flex items-center space-x-3 px-4 py-3.5 rounded-xl transition-all duration-300 relative overflow-hidden ${isActive
                                ? 'bg-gradient-to-r from-cyan-500/20 to-purple-500/20 text-white shadow-lg'
                                : 'text-gray-400 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            {/* Active indicator */}
                            {isActive && (
                                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-cyan-400 to-purple-600 rounded-r-full"></div>
                            )}

                            {/* Icon with gradient background */}
                            <div className={`relative p-2 rounded-lg transition-all duration-300 ${isActive
                                ? 'bg-gradient-to-br from-cyan-500 to-purple-600 shadow-lg'
                                : 'bg-white/5 group-hover:bg-white/10'
                                }`}>
                                <div className={isActive ? 'text-white' : 'text-gray-400 group-hover:text-cyan-400'}>
                                    {item.icon}
                                </div>
                                {isActive && (
                                    <div className="absolute inset-0 bg-gradient-to-br from-cyan-500 to-purple-600 rounded-lg blur-md opacity-50"></div>
                                )}
                            </div>

                            <span className={`font-semibold transition-all duration-300 ${isActive ? 'text-white' : 'group-hover:text-white'
                                }`}>
                                {item.name}
                            </span>

                            {/* Hover effect */}
                            {!isActive && (
                                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/0 via-purple-500/5 to-pink-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl"></div>
                            )}
                        </Link>
                    )
                })}

                {/* Owner-only navigation */}
                {user?.role?.toLowerCase() === 'owner' && ownerNavigation.map((item) => {
                    const isActive = pathname === item.href
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={`group flex items-center space-x-3 px-4 py-3.5 rounded-xl transition-all duration-300 relative overflow-hidden ${isActive
                                ? 'bg-gradient-to-r from-cyan-500/20 to-purple-500/20 text-white shadow-lg'
                                : 'text-gray-400 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            {/* Active indicator */}
                            {isActive && (
                                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-cyan-400 to-purple-600 rounded-r-full"></div>
                            )}

                            {/* Icon with gradient background */}
                            <div className={`relative p-2 rounded-lg transition-all duration-300 ${isActive
                                ? 'bg-gradient-to-br from-cyan-500 to-purple-600 shadow-lg'
                                : 'bg-white/5 group-hover:bg-white/10'
                                }`}>
                                <div className={isActive ? 'text-white' : 'text-gray-400 group-hover:text-cyan-400'}>
                                    {item.icon}
                                </div>
                                {isActive && (
                                    <div className="absolute inset-0 bg-gradient-to-br from-cyan-500 to-purple-600 rounded-lg blur-md opacity-50"></div>
                                )}
                            </div>

                            <span className={`font-semibold transition-all duration-300 ${isActive ? 'text-white' : 'group-hover:text-white'
                                }`}>
                                {item.name}
                            </span>

                            {/* Hover effect */}
                            {!isActive && (
                                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/0 via-purple-500/5 to-pink-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl"></div>
                            )}
                        </Link>
                    )
                })}
            </nav>

            {/* User Info */}
            {user && (
                <div className="relative border-t border-white/10 p-5 backdrop-blur-sm">
                    <div className="glass-strong rounded-xl p-4 mb-3">
                        <div className="flex items-center space-x-3 mb-3">
                            <div className="relative w-11 h-11 bg-gradient-to-br from-pink-500 via-purple-500 to-cyan-500 rounded-full flex items-center justify-center shadow-lg">
                                <span className="text-white font-bold text-base relative z-10">
                                    {user.name?.charAt(0) || 'A'}
                                </span>
                                <div className="absolute inset-0 bg-gradient-to-br from-pink-500 to-cyan-500 rounded-full blur-md opacity-50"></div>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-white text-sm font-semibold truncate">{user.name}</p>
                                <p className="text-cyan-400 text-xs font-medium truncate capitalize">{user.role}</p>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={handleLogout}
                        className="group w-full px-4 py-3 text-sm font-semibold text-gray-400 hover:text-white bg-white/5 hover:bg-gradient-to-r hover:from-red-500/20 hover:to-pink-500/20 rounded-xl transition-all duration-300 flex items-center justify-center space-x-2 border border-white/10 hover:border-red-500/30"
                    >
                        <svg className="w-4 h-4 group-hover:text-red-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        <span className="group-hover:text-red-400 transition-colors">Logout</span>
                    </button>
                </div>
            )}
        </div>
    )
}
