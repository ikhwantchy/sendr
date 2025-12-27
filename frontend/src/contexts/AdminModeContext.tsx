'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

type AdminMode = 'admin' | 'content';

interface AdminModeContextType {
    mode: AdminMode;
    isAdminMode: boolean;
    isContentMode: boolean;
    switchToAdmin: () => void;
    switchToContent: () => void;
    toggleMode: () => void;
}

const AdminModeContext = createContext<AdminModeContextType | null>(null);

const STORAGE_KEY = 'brobot_admin_mode';

export function AdminModeProvider({ children }: { children: React.ReactNode }) {
    const [mode, setMode] = useState<AdminMode>('admin');

    // Load mode from localStorage on mount
    useEffect(() => {
        const savedMode = localStorage.getItem(STORAGE_KEY) as AdminMode | null;
        if (savedMode === 'admin' || savedMode === 'content') {
            setMode(savedMode);
        }
    }, []);

    // Save mode to localStorage when it changes
    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, mode);
    }, [mode]);

    const switchToAdmin = () => setMode('admin');
    const switchToContent = () => setMode('content');
    const toggleMode = () => setMode(prev => prev === 'admin' ? 'content' : 'admin');

    const value: AdminModeContextType = {
        mode,
        isAdminMode: mode === 'admin',
        isContentMode: mode === 'content',
        switchToAdmin,
        switchToContent,
        toggleMode,
    };

    return (
        <AdminModeContext.Provider value={value}>
            {children}
        </AdminModeContext.Provider>
    );
}

export function useAdminMode() {
    const context = useContext(AdminModeContext);
    if (!context) {
        throw new Error('useAdminMode must be used within AdminModeProvider');
    }
    return context;
}
