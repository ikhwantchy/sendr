import axios from 'axios'

export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

export const apiClient = axios.create({
    baseURL: `${API_URL}/api`,
    headers: {
        'Content-Type': 'application/json',
    },
})

// Add auth token to requests
apiClient.interceptors.request.use((config) => {
    const token = localStorage.getItem('token')
    if (token) {
        config.headers.Authorization = `Bearer ${token}`
    }
    return config
})

// Handle auth errors
apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401 && !error.config?.url?.includes('/auth/login')) {
            localStorage.removeItem('token')
            localStorage.removeItem('user')
            window.location.href = '/login'
        }
        if (error.response?.status === 404) {
            console.warn('API endpoint not found:', error.config?.url)
        }
        return Promise.reject(error)
    }
)

// API methods
export const api = {
    // Auth
    auth: {
        login: (email: string, password: string, turnstileToken?: string) =>
            apiClient.post('/auth/login', { email, password, turnstileToken }),
        register: (data: any) =>
            apiClient.post('/auth/register', data),
        profile: () =>
            apiClient.get('/auth/profile'),
    },

    // Profile (separate route for profile updates)
    profile: {
        get: () => apiClient.get('/profile/profile'),
        update: (data: { name: string; email: string }) =>
            apiClient.put('/profile/profile', data),
        changePassword: (data: { currentPassword: string; newPassword: string }) =>
            apiClient.put('/profile/password', data),
    },

    // Bots
    bots: {
        list: () => apiClient.get('/bots'),
        get: (id: string) => apiClient.get(`/bots/${id}`),
        getByUser: (userId: string) => apiClient.get(`/bots/user/${userId}`),
        create: (data: any) => apiClient.post('/bots', data),
        connect: (id: string) => apiClient.post(`/bots/${id}/connect`),
        status: (id: string) => apiClient.get(`/bots/${id}/status`),
        disconnect: (id: string) => apiClient.post(`/bots/${id}/disconnect`),
        pause: (id: string) => apiClient.post(`/bots/${id}/pause`),
        resume: (id: string) => apiClient.post(`/bots/${id}/resume`),
        delete: (id: string) => apiClient.delete(`/bots/${id}`),
        update: (id: string, data: any) => apiClient.put(`/bots/${id}`, data),
        getGroups: (id: string) => apiClient.get(`/bots/${id}/groups`),
        syncGroups: (id: string) => apiClient.post(`/bots/${id}/sync-groups`),

        // LLM Targets
        llmTargets: {
            list: (botId: string) => apiClient.get(`/bots/${botId}/llm-targets`),
            add: (botId: string, data: any) => apiClient.post(`/bots/${botId}/llm-targets`, data),
            update: (botId: string, targetId: string, data: any) => apiClient.put(`/bots/${botId}/llm-targets/${targetId}`, data),
            toggle: (botId: string, targetId: string) => apiClient.patch(`/bots/${botId}/llm-targets/${targetId}/toggle`),
            remove: (botId: string, targetId: string) => apiClient.delete(`/bots/${botId}/llm-targets/${targetId}`),
            bulkAdd: (botId: string, targets: any[]) => apiClient.post(`/bots/${botId}/llm-targets/bulk`, { targets }),
        },
    },

    // AI
    ai: {
        getProviders: () => apiClient.get('/ai/providers'),
        testConnection: (data: any) => apiClient.post('/ai/test-connection', data),
        getConversations: (botId: string) => apiClient.get(`/ai/conversations/${botId}`),
        getMessages: (conversationId: string) => apiClient.get(`/ai/conversations/${conversationId}/messages`),
        endConversation: (conversationId: string) => apiClient.post(`/ai/conversations/${conversationId}/end`),
        getUsage: (botId: string) => apiClient.get(`/ai/usage/${botId}`),
    },

    // Rules
    rules: {
        list: () => apiClient.get('/rules'),
        getByBot: (botId: string) => apiClient.get(`/rules/bot/${botId}`),
        get: (id: string) => apiClient.get(`/rules/${id}`),
        create: (data: any) => apiClient.post('/rules', data),
        update: (id: string, data: any) => apiClient.put(`/rules/${id}`, data),
        toggle: (id: string) => apiClient.patch(`/rules/${id}/toggle`),
        delete: (id: string) => apiClient.delete(`/rules/${id}`),
    },

    // Campaigns
    campaigns: {
        list: () => apiClient.get('/campaigns'),
        getByBot: (botId: string) => apiClient.get(`/campaigns/bot/${botId}`),
        create: (data: any) => apiClient.post('/campaigns', data),
        delete: (id: string) => apiClient.delete(`/campaigns/${id}`),
    },

    // Reminders
    reminders: {
        list: () => apiClient.get('/reminders'),
        getByBot: (botId: string) => apiClient.get(`/reminders/bot/${botId}`),
        create: (data: any) => apiClient.post('/reminders', data),
        update: (id: string, data: any) => apiClient.put(`/reminders/${id}`, data),
        toggle: (id: string) => apiClient.patch(`/reminders/${id}/toggle`),
        delete: (id: string) => apiClient.delete(`/reminders/${id}`),
    },

    // Data Sources
    dataSources: {
        list: () => apiClient.get('/datasources'),
    },

    // Analytics
    analytics: {
        get: () => apiClient.get('/analytics'),
        getFull: (timeRange: string, botId?: string) => {
            // Get user's timezone for accurate chart display
            const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Jakarta';
            let url = `/analytics/full?timeRange=${timeRange}&timezone=${encodeURIComponent(timezone)}`;
            if (botId) url += `&botId=${botId}`;
            return apiClient.get(url);
        },
        getDashboardStats: () => apiClient.get('/analytics/dashboard-stats'),
        getActivityLogs: (limit: number = 8, botId?: string, timeRange: string = '24h') => {
            let url = `/analytics/activity-logs?limit=${limit}&timeRange=${timeRange}`;
            if (botId) url += `&botId=${botId}`;
            return apiClient.get(url);
        },
        getSystemStatus: () => apiClient.get('/analytics/system-status'),
    },

    // Users
    users: {
        list: () => apiClient.get('/users'),
        get: (id: string) => apiClient.get(`/users/${id}`),
        stats: () => apiClient.get('/users/stats'),
        invite: (data: any) => apiClient.post('/users/invite', data),
        update: (id: string, data: any) => apiClient.put(`/users/${id}`, data),
        delete: (id: string) => apiClient.delete(`/users/${id}`),
    },

    // Permissions
    permissions: {
        getUserPermissions: (userId: string) => apiClient.get(`/permissions/user/${userId}`),
        getBotPermissions: (botId: string) => apiClient.get(`/permissions/bot/${botId}`),
        checkAccess: (botId: string, userId: string) => apiClient.get(`/permissions/check/${botId}/${userId}`),
        updateBotPermission: (userId: string, botId: string, data: any) =>
            apiClient.put(`/permissions/${userId}/${botId}`, data),
        revoke: (id: string) => apiClient.delete(`/permissions/${id}`),
    },

    // Sheets
    sheets: {
        getTabs: (url: string) => apiClient.get(`/sheets/tabs?url=${encodeURIComponent(url)}`),
        getColumns: (url: string, tab?: string) => apiClient.get(`/sheets/columns?url=${encodeURIComponent(url)}${tab ? `&tab=${encodeURIComponent(tab)}` : ''}`),
        previewDigest: (data: any) => apiClient.post('/sheets/preview-digest', data),
        previewEnhanced: (data: any) => apiClient.post('/sheets/preview-enhanced', data),
        renderPreview: (data: any) => apiClient.post('/sheets/render-preview', data),
    },
    // Security
    security: {
        getSessions: () => apiClient.get('/security/sessions'),
        revokeSession: (id: string) => apiClient.post(`/security/sessions/${id}/revoke`),
        revokeOtherSessions: () => apiClient.post('/security/sessions/revoke-others'),
        getLogs: () => apiClient.get('/security/logs'),
        setupTelegram: (chatId: string) => apiClient.post('/security/telegram/setup', { chatId }),
    },

    // AI Sheet Updater
    sheetUpdater: {
        getStatus: () => apiClient.get('/sheet-updater/status'),
        validateSheet: (spreadsheetUrl: string) => apiClient.post('/sheet-updater/validate-sheet', { spreadsheetUrl }),
        getSheetInfo: (spreadsheetUrl: string, sheetName?: string) =>
            apiClient.get(`/sheet-updater/sheet-info?spreadsheetUrl=${encodeURIComponent(spreadsheetUrl)}${sheetName ? `&sheetName=${encodeURIComponent(sheetName)}` : ''}`),
        getConfigs: (botId: string) => apiClient.get(`/sheet-updater/configs/${botId}`),
        getConfigsByTarget: (botId: string, targetJid: string) =>
            apiClient.get(`/sheet-updater/configs/${botId}/by-target/${encodeURIComponent(targetJid)}`),
        getConfig: (configId: string) => apiClient.get(`/sheet-updater/config/${configId}`),
        createConfig: (data: any) => apiClient.post('/sheet-updater/configs', data),
        updateConfig: (configId: string, data: any) => apiClient.put(`/sheet-updater/config/${configId}`, data),
        deleteConfig: (configId: string) => apiClient.delete(`/sheet-updater/config/${configId}`),
        deleteConfigsByTarget: (botId: string, targetJid: string) =>
            apiClient.delete(`/sheet-updater/configs/${botId}/by-target/${encodeURIComponent(targetJid)}`),
        toggleConfig: (configId: string) => apiClient.patch(`/sheet-updater/config/${configId}/toggle`),
        testClassify: (message: string, valueMappings?: any[], aiInstructions?: string) =>
            apiClient.post('/sheet-updater/test-classify', { message, valueMappings, aiInstructions }),
        testUpdate: (botId: string, phone: string, message: string) =>
            apiClient.post('/sheet-updater/test-update', { botId, phone, message }),
        getLogs: (configId: string, limit?: number) =>
            apiClient.get(`/sheet-updater/logs/${configId}${limit ? `?limit=${limit}` : ''}`),
        getDefaultMappings: () => apiClient.get('/sheet-updater/default-mappings'),
    },

    // LID to Phone Mappings
    lidMappings: {
        list: (botId: string) => apiClient.get(`/lid-mappings/${botId}`),
        create: (data: { bot_id: string; lid: string; phone: string; name?: string }) =>
            apiClient.post('/lid-mappings', data),
        delete: (id: string) => apiClient.delete(`/lid-mappings/${id}`),
    },

    // Generic helpers
    get: (url: string, config?: any) => apiClient.get(url, config),
    post: (url: string, data?: any) => apiClient.post(url, data),
    put: (url: string, data?: any) => apiClient.put(url, data),
    delete: (url: string) => apiClient.delete(url),
}
