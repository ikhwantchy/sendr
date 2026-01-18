'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { apiClient } from '@/lib/api';

// Types
export interface FeaturePermission {
    feature_key: string;
    feature_name: string;
    feature_description: string | null;
    feature_category: string | null;
    is_premium: boolean;
    is_enabled: boolean;
    daily_limit: number | null;
    daily_usage: number;
    monthly_limit: number | null;
    monthly_usage: number;
}

export interface BotFeatures {
    bot_id: string;
    bot_name: string;
    features: FeaturePermission[];
}

interface FeatureContextType {
    botFeatures: BotFeatures[];
    loading: boolean;
    error: string | null;
    hasFeature: (botId: string, featureKey: string) => boolean;
    getFeaturePermission: (botId: string, featureKey: string) => FeaturePermission | null;
    getBotFeatures: (botId: string) => FeaturePermission[];
    refresh: () => Promise<void>;
}

const FeatureContext = createContext<FeatureContextType | null>(null);

export function FeatureProvider({ children }: { children: React.ReactNode }) {
    const [botFeatures, setBotFeatures] = useState<BotFeatures[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchFeatures = useCallback(async () => {
        // Don't fetch if user is not authenticated
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        if (!token) {
            setLoading(false);
            setBotFeatures([]);
            return;
        }

        try {
            setLoading(true);
            setError(null);

            const response = await apiClient.get('/users/me/features');

            if (response.data.success) {
                setBotFeatures(response.data.data || []);
            } else {
                setError(response.data.error || 'Failed to fetch features');
            }
        } catch (err: any) {
            console.error('Failed to fetch features:', err);
            // Silently fail - features are optional
            setBotFeatures([]);
            setError(null); // Don't show error to user
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchFeatures();
    }, [fetchFeatures]);

    const hasFeature = useCallback((botId: string, featureKey: string): boolean => {
        const bot = botFeatures.find(b => b.bot_id === botId);
        if (!bot) return false;

        const feature = bot.features.find(f => f.feature_key === featureKey);
        return feature?.is_enabled || false;
    }, [botFeatures]);

    const getFeaturePermission = useCallback((botId: string, featureKey: string): FeaturePermission | null => {
        const bot = botFeatures.find(b => b.bot_id === botId);
        if (!bot) return null;

        return bot.features.find(f => f.feature_key === featureKey) || null;
    }, [botFeatures]);

    const getBotFeatures = useCallback((botId: string): FeaturePermission[] => {
        const bot = botFeatures.find(b => b.bot_id === botId);
        return bot?.features || [];
    }, [botFeatures]);

    const value: FeatureContextType = {
        botFeatures,
        loading,
        error,
        hasFeature,
        getFeaturePermission,
        getBotFeatures,
        refresh: fetchFeatures,
    };

    return (
        <FeatureContext.Provider value={value}>
            {children}
        </FeatureContext.Provider>
    );
}

export function useFeatures() {
    const context = useContext(FeatureContext);
    if (!context) {
        throw new Error('useFeatures must be used within FeatureProvider');
    }
    return context;
}

// Convenience hook for checking a specific feature
export function useFeatureAccess(botId: string | undefined, featureKey: string) {
    const { hasFeature, getFeaturePermission, loading } = useFeatures();

    if (!botId) {
        return { hasAccess: false, permission: null, loading };
    }

    return {
        hasAccess: hasFeature(botId, featureKey),
        permission: getFeaturePermission(botId, featureKey),
        loading,
    };
}
