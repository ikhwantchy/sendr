'use client'

export default function HomePage() {
    // Immediate redirect to login - NO CHECKS
    if (typeof window !== 'undefined') {
        window.location.replace('/login')
    }

    return null
}
