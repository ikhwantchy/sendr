/**
 * API Client
 * Axios-based API client with authentication
 */

import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

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
        if (error.response?.status === 401) {
            localStorage.removeItem('token')
            window.location.href = '/login'
        }
        return Promise.reject(error)
    }
)

// API methods
export const api = {
    // Auth
    auth: {
        login: (email: string, password: string) =>
            apiClient.post('/auth/login', { email, password }),
        register: (data: any) =>
            apiClient.post('/auth/register', data),
    },

    // Bots
    bots: {
        list: () => apiClient.get('/bots'),
        get: (id: string) => apiClient.get(`/bots/${id}`),
        create: (data: any) => apiClient.post('/bots', data),
        connect: (id: string) => apiClient.post(`/bots/${id}/connect`),
        status: (id: string) => apiClient.get(`/bots/${id}/status`),
        disconnect: (id: string) => apiClient.post(`/bots/${id}/disconnect`),
        pause: (id: string) => apiClient.post(`/bots/${id}/pause`),
        resume: (id: string) => apiClient.post(`/bots/${id}/resume`),
        delete: (id: string) => apiClient.delete(`/bots/${id}`),
        getGroups: (id: string) => apiClient.get(`/bots/${id}/groups`),
    },

    // Rules
    rules: {
        list: () => apiClient.get('/rules'),
        getByBot: (botId: string) => apiClient.get(`/rules/bot/${botId}`),
        create: (data: any) => apiClient.post('/rules', data),
        update: (id: string, data: any) => apiClient.put(`/rules/${id}`, data),
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
        delete: (id: string) => apiClient.delete(`/reminders/${id}`),
    },

    // Data Sources
    dataSources: {
        list: () => apiClient.get('/datasources'),
    },

    // Analytics
    analytics: {
        get: () => apiClient.get('/analytics'),
    },

    // Users (Owner only)
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
        grant: (data: any) => apiClient.post('/permissions', data),
        update: (id: string, data: any) => apiClient.put(`/permissions/${id}`, data),
        revoke: (id: string) => apiClient.delete(`/permissions/${id}`),
    },
}
