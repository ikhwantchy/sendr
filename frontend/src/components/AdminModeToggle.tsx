'use client';

import { useAdminMode } from '@/contexts/AdminModeContext';

export function AdminModeToggle() {
    const { mode, isAdminMode, switchToAdmin, switchToContent } = useAdminMode();

    return (
        <div className="glass rounded-2xl border border-white/10 p-6 mb-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-bold text-white mb-1">
                        Current Mode: {isAdminMode ? '👑 Admin Mode' : '📝 Content Creator Mode'}
                    </h3>
                    <p className="text-sm text-gray-400">
                        {isAdminMode
                            ? 'Managing users and permissions'
                            : 'Creating and managing bot content'}
                    </p>
                </div>

                <button
                    onClick={isAdminMode ? switchToContent : switchToAdmin}
                    className="px-6 py-3 rounded-xl font-medium transition-all
            bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600
            text-white shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40
            hover:-translate-y-0.5"
                >
                    {isAdminMode ? '🔄 Switch to Content Creator' : '🔄 Switch to Admin'}
                </button>
            </div>

            {/* Mode explanation */}
            <div className="mt-4 pt-4 border-t border-white/10">
                <p className="text-xs text-gray-500">
                    {isAdminMode ? (
                        <>
                            <strong>Admin Mode:</strong> Manage users, assign bots, configure feature permissions,
                            set usage limits, and view system reports.
                        </>
                    ) : (
                        <>
                            <strong>Content Creator Mode:</strong> Create and manage auto reply rules,
                            send broadcast campaigns, schedule reminders, and view analytics.
                        </>
                    )}
                </p>
            </div>
        </div>
    );
}
