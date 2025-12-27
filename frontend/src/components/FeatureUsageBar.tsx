'use client';

import { useFeatureAccess } from '@/contexts/FeatureContext';

interface FeatureUsageBarProps {
    botId: string;
    feature: string;
}

export function FeatureUsageBar({ botId, feature }: FeatureUsageBarProps) {
    const { permission } = useFeatureAccess(botId, feature);

    if (!permission) return null;

    const { daily_limit, daily_usage, monthly_limit, monthly_usage } = permission;

    // Show daily usage if limit exists
    if (daily_limit) {
        const percentage = Math.min((daily_usage / daily_limit) * 100, 100);
        const isNearLimit = percentage >= 80;
        const isAtLimit = percentage >= 100;

        return (
            <div className="glass rounded-xl p-4 border border-white/10 mb-4">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-400">Daily Usage</span>
                    <span className={`text-sm font-bold ${isAtLimit ? 'text-red-400' :
                            isNearLimit ? 'text-orange-400' :
                                'text-cyan-400'
                        }`}>
                        {daily_usage} / {daily_limit}
                    </span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-2">
                    <div
                        className={`h-2 rounded-full transition-all ${isAtLimit ? 'bg-gradient-to-r from-red-500 to-red-600' :
                                isNearLimit ? 'bg-gradient-to-r from-orange-500 to-red-500' :
                                    'bg-gradient-to-r from-cyan-500 to-blue-500'
                            }`}
                        style={{ width: `${percentage}%` }}
                    />
                </div>
                {isAtLimit && (
                    <p className="text-xs text-red-400 mt-2 flex items-center gap-1">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        Daily limit reached
                    </p>
                )}
                {isNearLimit && !isAtLimit && (
                    <p className="text-xs text-orange-400 mt-2 flex items-center gap-1">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        Approaching daily limit
                    </p>
                )}
            </div>
        );
    }

    // Show monthly usage if limit exists (and no daily limit)
    if (monthly_limit) {
        const percentage = Math.min((monthly_usage / monthly_limit) * 100, 100);
        const isNearLimit = percentage >= 80;
        const isAtLimit = percentage >= 100;

        return (
            <div className="glass rounded-xl p-4 border border-white/10 mb-4">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-400">Monthly Usage</span>
                    <span className={`text-sm font-bold ${isAtLimit ? 'text-red-400' :
                            isNearLimit ? 'text-orange-400' :
                                'text-cyan-400'
                        }`}>
                        {monthly_usage} / {monthly_limit}
                    </span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-2">
                    <div
                        className={`h-2 rounded-full transition-all ${isAtLimit ? 'bg-gradient-to-r from-red-500 to-red-600' :
                                isNearLimit ? 'bg-gradient-to-r from-orange-500 to-red-500' :
                                    'bg-gradient-to-r from-cyan-500 to-blue-500'
                            }`}
                        style={{ width: `${percentage}%` }}
                    />
                </div>
                {isAtLimit && (
                    <p className="text-xs text-red-400 mt-2">
                        ⚠️ Monthly limit reached
                    </p>
                )}
                {isNearLimit && !isAtLimit && (
                    <p className="text-xs text-orange-400 mt-2">
                        ⚠️ Approaching monthly limit
                    </p>
                )}
            </div>
        );
    }

    return null;
}
