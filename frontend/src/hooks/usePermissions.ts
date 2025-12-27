import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useMemo } from 'react'

export interface BotPermission {
    bot_id: string
    can_view: boolean
    can_edit: boolean
    can_delete: boolean
    can_create_campaigns: boolean
    can_create_rules: boolean
    can_view_analytics: boolean
}

export function usePermissions() {
    const user = useMemo(() => {
        if (typeof window === 'undefined') return null
        const userData = localStorage.getItem('user')
        return userData ? JSON.parse(userData) : null
    }, [])

    const isOwner = user?.role?.toLowerCase() === 'owner'

    // Fetch user permissions
    const { data: permissions, isLoading } = useQuery({
        queryKey: ['user-permissions', user?.id],
        queryFn: async () => {
            if (!user?.id) return []
            const response = await api.permissions.getUserPermissions(user.id)
            return response.data.data || []
        },
        enabled: !!user?.id && !isOwner, // Only fetch if not owner
    })

    // Check if user has access to a specific bot
    const hasAccess = (botId: string): boolean => {
        if (isOwner) return true // Owner has access to all bots
        if (!permissions) return false
        return permissions.some((p: BotPermission) => p.bot_id === botId && p.can_view)
    }

    // Check specific permission for a bot
    const can = (botId: string, action: keyof BotPermission): boolean => {
        if (isOwner) return true // Owner can do everything
        if (!permissions) return false

        const permission = permissions.find((p: BotPermission) => p.bot_id === botId)
        if (!permission) return false

        return permission[action] === true
    }

    // Filter bots based on permissions
    const filterBots = (bots: any[]): any[] => {
        if (isOwner) return bots // Owner sees all bots
        if (!permissions || permissions.length === 0) return []

        const allowedBotIds = permissions
            .filter((p: BotPermission) => p.can_view)
            .map((p: BotPermission) => p.bot_id)

        return bots.filter(bot => allowedBotIds.includes(bot.id))
    }

    // Get all bot IDs user has access to
    const allowedBotIds = useMemo(() => {
        if (isOwner) return null // null means all bots
        if (!permissions) return []
        return permissions
            .filter((p: BotPermission) => p.can_view)
            .map((p: BotPermission) => p.bot_id)
    }, [isOwner, permissions])

    return {
        user,
        isOwner,
        permissions: permissions || [],
        isLoading,
        hasAccess,
        can,
        filterBots,
        allowedBotIds,
    }
}
