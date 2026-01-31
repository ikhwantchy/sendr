'use client'

import { LucideIcon } from 'lucide-react'
import { useState } from 'react'
import './animated-icon.css'

interface AnimatedIconProps {
    icon: LucideIcon
    isActive?: boolean
    className?: string
}

/**
 * AnimatedIcon - Resend.com style animated icons using CSS
 * Smooth line-drawing animation on hover
 */
export default function AnimatedIcon({
    icon: Icon,
    isActive = false,
    className = '',
}: AnimatedIconProps) {
    const [isHovered, setIsHovered] = useState(false)

    return (
        <div
            className={`animated-icon-wrapper ${isHovered || isActive ? 'active' : ''}`}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <Icon
                className={`animated-icon ${className}`}
                strokeWidth={isActive ? 2.2 : 1.8}
            />
        </div>
    )
}
