'use client'

import React, { useState, useEffect } from 'react';
import { Save, Mail, Shield, Settings as SettingsIcon, Zap, Send } from 'lucide-react';
import { api } from '@/lib/api';

interface Setting {
    key: string;
    value: string;
    category: string;
    description: string;
    data_type: string;
}

export default function SystemSettingsPage() {
    const [settings, setSettings] = useState<Setting[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState('general');
    const [changes, setChanges] = useState<Record<string, string>>({});

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        setLoading(true);
        try {
            const response = await api.get('/admin/settings');
            setSettings(response.data.settings);
        } catch (error) {
            console.error('Failed to fetch settings:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (key: string, value: string) => {
        setChanges({ ...changes, [key]: value });
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await api.put('/admin/settings', { settings: changes });
            alert('Settings saved successfully');
            setChanges({});
            fetchSettings();
        } catch (error) {
            console.error('Failed to save settings:', error);
            alert('Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    const getValue = (key: string) => {
        return changes[key] !== undefined ? changes[key] : settings.find(s => s.key === key)?.value || '';
    };

    const getSettingsByCategory = (category: string) => {
        return settings.filter(s => s.category === category);
    };

    const renderInput = (setting: Setting) => {
        const value = getValue(setting.key);

        if (setting.data_type === 'boolean') {
            return (
                <select
                    value={value}
                    onChange={(e) => handleChange(setting.key, e.target.value)}
                    className="w-full px-4 py-2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-purple-500"
                >
                    <option value="true">Enabled</option>
                    <option value="false">Disabled</option>
                </select>
            );
        }

        if (setting.data_type === 'number') {
            return (
                <input
                    type="number"
                    value={value}
                    onChange={(e) => handleChange(setting.key, e.target.value)}
                    className="w-full px-4 py-2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-purple-500"
                />
            );
        }

        if (setting.data_type === 'password') {
            return (
                <input
                    type="password"
                    value={value}
                    onChange={(e) => handleChange(setting.key, e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-purple-500"
                />
            );
        }

        return (
            <input
                type="text"
                value={value}
                onChange={(e) => handleChange(setting.key, e.target.value)}
                className="w-full px-4 py-2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-purple-500"
            />
        );
    };


    const tabs = [
        { id: 'general', label: 'General', icon: SettingsIcon },
        { id: 'email', label: 'Email', icon: Mail },
        { id: 'telegram', label: 'Telegram', icon: Send },
        { id: 'security', label: 'Security', icon: Shield },
        { id: 'advanced', label: 'Advanced', icon: Zap },
    ];

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-5xl mx-auto min-h-screen bg-zinc-50 dark:bg-black">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">System Settings</h1>

                </div>
                <button
                    onClick={handleSave}
                    disabled={saving || Object.keys(changes).length === 0}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Save size={18} />
                    {saving ? 'Saving...' : 'Save Changes'}
                </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6 border-b border-zinc-200 dark:border-zinc-800">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-2 font-medium transition-colors ${activeTab === tab.id
                                ? 'text-purple-500 dark:text-purple-400 border-b-2 border-purple-500 dark:border-purple-400'
                                : 'text-zinc-600 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300'
                                }`}
                        >
                            <Icon size={18} />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Settings Form */}
            <div className="space-y-4">
                {getSettingsByCategory(activeTab).map((setting) => (
                    <div key={setting.key} className="bg-white dark:bg-zinc-900 rounded-lg p-4 border border-zinc-200 dark:border-zinc-800 shadow-sm dark:shadow-none">
                        <div className="mb-2">
                            <label className="block text-sm font-medium text-zinc-800 dark:text-zinc-300">
                                {setting.key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                            </label>
                            {setting.description && (
                                <p className="text-xs text-zinc-500 dark:text-zinc-600 mt-1">{setting.description}</p>
                            )}
                        </div>
                        {renderInput(setting)}
                    </div>
                ))}

                {getSettingsByCategory(activeTab).length === 0 && (
                    <div className="text-center py-12 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
                        <p className="text-zinc-500">No settings available in this category</p>
                    </div>
                )}
            </div>

            {/* Unsaved Changes Warning */}
            {Object.keys(changes).length > 0 && (
                <div className="fixed bottom-6 right-6 bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 px-4 py-3 rounded-lg shadow-lg">
                    <p className="text-sm font-medium">You have unsaved changes</p>
                </div>
            )}
        </div>
    );
}
