'use client';

import { useFeatureAccess } from '@/contexts/FeatureContext';
import { useParams } from 'next/navigation';

interface FeatureGuardProps {
    feature: string;
    botId?: string;
    children: React.ReactNode;
    fallback?: React.ReactNode;
    showLocked?: boolean;
}

export function FeatureGuard({
    feature,
    botId: propBotId,
    children,
    fallback = null,
    showLocked = false
}: FeatureGuardProps) {
    const params = useParams();
    const botId = propBotId || (params?.id as string);

    const { hasAccess, loading } = useFeatureAccess(botId, feature);

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
            </div>
        );
    }

    if (!hasAccess) {
        if (showLocked) {
            return (
                <div className="glass rounded-2xl border border-white/10 p-8 text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-500/20 rounded-2xl mb-4">
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Feature Locked</h3>
                    <p className="text-gray-400">This feature is not enabled for your account.</p>
                    <p className="text-sm text-gray-500 mt-2">Contact your administrator to enable this feature.</p>
                </div>
            );
        }
        return <>{fallback}</>;
    }

    return <>{children}</>;
}
