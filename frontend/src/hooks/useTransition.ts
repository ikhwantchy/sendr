'use client'

import { useState, useCallback } from 'react'

interface UseTransitionOptions {
    fadeOutDuration?: number
    fadeInDelay?: number
}

interface UseTransitionReturn {
    isTransitioning: boolean
    startTransition: () => Promise<void>
    endTransition: () => void
    transitionClasses: string
    contentClasses: string
}

/**
 * Hook for smooth page/content transitions
 * Usage:
 * const { isTransitioning, startTransition, endTransition, transitionClasses } = useTransition()
 * 
 * const fetchData = async () => {
 *   await startTransition()
 *   // fetch data...
 *   endTransition()
 * }
 * 
 * <div className={transitionClasses}>content</div>
 */
export function useTransition(options: UseTransitionOptions = {}): UseTransitionReturn {
    const { fadeOutDuration = 150, fadeInDelay = 50 } = options
    const [isTransitioning, setIsTransitioning] = useState(false)

    const startTransition = useCallback(async () => {
        setIsTransitioning(true)
        await new Promise(resolve => setTimeout(resolve, fadeOutDuration))
    }, [fadeOutDuration])

    const endTransition = useCallback(() => {
        setTimeout(() => setIsTransitioning(false), fadeInDelay)
    }, [fadeInDelay])

    // CSS classes for fade transition
    const transitionClasses = `transition-all duration-300 ease-in-out ${
        isTransitioning ? 'opacity-40 scale-[0.995]' : 'opacity-100 scale-100'
    }`

    // CSS classes for content fade (less scale effect)
    const contentClasses = `transition-opacity duration-300 ease-in-out ${
        isTransitioning ? 'opacity-40' : 'opacity-100'
    }`

    return {
        isTransitioning,
        startTransition,
        endTransition,
        transitionClasses,
        contentClasses
    }
}

export default useTransition
