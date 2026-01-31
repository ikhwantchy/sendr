'use client'

import { useEffect, useRef, useState } from 'react'

interface LordIconProps {
    src: string
    trigger?: 'hover' | 'click' | 'loop' | 'loop-on-hover' | 'morph' | 'boomerang'
    colors?: { primary?: string; secondary?: string }
    size?: number
    className?: string
}

/**
 * LordIcon - Animated icon component using Lordicon
 * https://lordicon.com - Like Resend.com uses
 */
export default function LordIcon({
    src,
    trigger = 'hover',
    colors = { primary: '#6B7280', secondary: '#9CA3AF' },
    size = 20,
    className = '',
}: LordIconProps) {
    const iconRef = useRef<HTMLDivElement>(null)
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) {
        return <div className={className} style={{ width: size, height: size }} />
    }

    // Lordicon uses custom HTML element
    return (
        <div ref={iconRef} className={`flex items-center justify-center ${className}`}>
            {/* @ts-ignore - Lordicon custom element */}
            <lord-icon
                src={src}
                trigger={trigger}
                colors={`primary:${colors.primary},secondary:${colors.secondary}`}
                style={{ width: `${size}px`, height: `${size}px` }}
            />
        </div>
    )
}

// Pre-defined icon sources from Lordicon CDN (free icons)
export const LORDICON_SOURCES = {
    // Dashboard/Home
    dashboard: 'https://cdn.lordicon.com/slduhdil.json',
    home: 'https://cdn.lordicon.com/osuxyevn.json',
    grid: 'https://cdn.lordicon.com/jeuxydnh.json',

    // Bot/Robot
    bot: 'https://cdn.lordicon.com/tdtlrbly.json',
    robot: 'https://cdn.lordicon.com/zpxybbhl.json',

    // Analytics/Chart
    analytics: 'https://cdn.lordicon.com/gqdnbnwt.json',
    chart: 'https://cdn.lordicon.com/fkaukecx.json',

    // Users/People
    users: 'https://cdn.lordicon.com/hrjifpbq.json',
    people: 'https://cdn.lordicon.com/kthelypq.json',

    // Documents/Logs
    document: 'https://cdn.lordicon.com/jmkrnisz.json',
    file: 'https://cdn.lordicon.com/rbbnmpcf.json',

    // Server/System
    server: 'https://cdn.lordicon.com/vspbqszr.json',
    system: 'https://cdn.lordicon.com/kbtmbyzy.json',

    // Shield/Security
    shield: 'https://cdn.lordicon.com/eouimtlu.json',
    security: 'https://cdn.lordicon.com/hpivxauj.json',

    // Key/API
    key: 'https://cdn.lordicon.com/hbvgknxo.json',
    lock: 'https://cdn.lordicon.com/yklwfgzu.json',

    // Settings/Gear
    settings: 'https://cdn.lordicon.com/hwuyodym.json',
    gear: 'https://cdn.lordicon.com/lecprnjb.json',

    // Emails/Messages
    email: 'https://cdn.lordicon.com/rhvddzym.json',
    message: 'https://cdn.lordicon.com/lsrcesku.json',

    // Broadcast/Megaphone
    broadcast: 'https://cdn.lordicon.com/obyzncey.json',
    megaphone: 'https://cdn.lordicon.com/xcrjfuzb.json',
}
