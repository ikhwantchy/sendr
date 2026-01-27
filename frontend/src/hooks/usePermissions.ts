import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useMemo, useState, useEffect } from 'react'

export interface BotPermission {
    bot_id: string
    can_view: boolean
    can_edit: boolean
    can_delete: boolean
    can_create_campaigns: boolean
    can_create_rules: boolean
    can_view_analytics: boolean
    can_use_reminders: boolean
    can_use_ai: boolean
}

export function usePermissions() {
    // Initialize user with baked-in permission parsing
    const [user, setUser] = useState(() => {
        if (typeof window === 'undefined') return null
        const userData = localStorage.getItem('user')
        if (!userData) return null
        try {
            const parsed = JSON.parse(userData)
            if (parsed && typeof parsed.permissions === 'string') {
                parsed.permissions = JSON.parse(parsed.permissions || '{}')
            }
            return parsed
        } catch (e) {
            return null
        }
    })

    // Fetch latest user profile
    const { data: profile } = useQuery({
        queryKey: ['user-profile', user?.id],
        queryFn: async () => {
            if (!user?.id) return null
            const res = await api.auth.profile()
            return res.data.success ? res.data.data : null
        },
        enabled: !!user?.id,
        refetchOnWindowFocus: true
    })

    useEffect(() => {
        if (profile) {
            const processedProfile = { ...profile };
            if (typeof processedProfile.permissions === 'string') {
                try {
                    processedProfile.permissions = JSON.parse(processedProfile.permissions || '{}');
                } catch (e) {
                    processedProfile.permissions = {};
                }
            }
            setUser(processedProfile)
            localStorage.setItem('user', JSON.stringify(processedProfile))
        }
    }, [profile])

    const isOwner = useMemo(() => user?.role?.toUpperCase() === 'OWNER', [user])
    const isAdmin = useMemo(() => user?.role?.toUpperCase() === 'ADMIN' || isOwner, [user, isOwner])
    const isClient = useMemo(() => user?.role?.toUpperCase() === 'USER', [user])

    // Fetch bot-specific permissions
    const { data: permissions, isLoading } = useQuery({
        queryKey: ['user-permissions', user?.id],
        queryFn: async () => {
            if (!user?.id) return []
            const response = await api.permissions.getUserPermissions(user.id)
            return response.data.data || []
        },
        enabled: !!user?.id,
    })

    /**
     * Check module access
     * If botId is provided, checks bot-specific flags
     */
    const hasModuleAccess = (moduleName: string, botId?: string): boolean => {
        if (isAdmin) return true;

        // Map general module names to permission keys
        const permissionMap: Record<string, string> = {
            'auto_reply': 'can_use_auto_reply',
            'ai_assistant': 'can_use_ai',
            'campaigns': 'can_use_campaigns',
            'reminders': 'can_use_reminders',
            'analytics': 'can_view_analytics'
        };

        const key = permissionMap[moduleName] || moduleName;

        // If botId provided, check per-bot permissions first
        if (botId && permissions) {
            const botPerm = permissions.find((p: any) => p.bot_id === botId);
            if (botPerm) {
                // Map the specific column names to module keys
                const botKeyMap: Record<string, string> = {
                    'can_use_auto_reply': 'can_create_rules',
                    'can_use_campaigns': 'can_create_campaigns'
                };
                const actualBotKey = botKeyMap[key] || key;
                return botPerm[actualBotKey] === 1 || botPerm[actualBotKey] === true;
            }
        }

        // If botId not provided, check if user has this permission on ANY bot
        if (!botId && permissions && permissions.length > 0) {
            const hasAnyBotAccess = permissions.some((botPerm: any) => {
                const botKeyMap: Record<string, string> = {
                    'can_use_auto_reply': 'can_create_rules',
                    'can_use_campaigns': 'can_create_campaigns'
                };
                const actualBotKey = botKeyMap[key] || key;
                return botPerm[actualBotKey] === 1 || botPerm[actualBotKey] === true;
            });
            if (hasAnyBotAccess) return true;
        }

        // Fallback to user-level permissions
        if (!user || !user.permissions) return false;
        let perms = user.permissions;
        if (typeof perms === 'string') perms = JSON.parse(perms);

        return perms[key] === true;
    }

    const hasAccess = (botId: string): boolean => {
        if (isAdmin) return true;
        if (!permissions) return false;
        return permissions.some((p: any) => p.bot_id === botId && (p.can_view === 1 || p.can_view === true));
    }

    const can = (botId: string, action: string): boolean => {
        if (isAdmin) return true;
        if (!permissions) return false;
        const p = permissions.find((p: any) => p.bot_id === botId);
        return p ? (p[action] === 1 || p[action] === true) : false;
    }

    const filterBots = (bots: any[]): any[] => {
        if (isAdmin) return bots;

        // If no permissions loaded yet, only show bots from same tenant
        const allowedBotIds = (permissions || [])
            .filter((p: any) => p.can_view === 1 || p.can_view === true)
            .map((p: any) => p.bot_id);

        return bots.filter(b => {
            // Case 1: Bot belongs to user's tenant
            if (b.tenant_id === user?.tenant_id) return true;
            // Case 2: Bot is explicitly shared with user
            return allowedBotIds.includes(b.id);
        });
    }

    return {
        user,
        isOwner,
        isAdmin,
        isClient,
        permissions: permissions || [],
        isLoading,
        hasAccess,
        hasModuleAccess,
        can,
        filterBots,
    }
}
