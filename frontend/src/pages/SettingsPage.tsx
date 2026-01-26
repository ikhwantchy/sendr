import React, { useState, useEffect } from 'react';
import { Settings, Mail, Shield, Zap, Database, Save, Send } from 'lucide-react';
import { api } from '../lib/api';

interface SettingsCategory {
    [key: string]: any;
}

export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState('general');
    const [settings, setSettings] = useState<Record<string, SettingsCategory>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [changes, setChanges] = useState<Record<string, any>>({});

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const response = await api.get('/admin/settings');
            setSettings(response.data.settings);
        } catch (error) {
            console.error('Failed to fetch settings:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (category: string, key: string, value: any) => {
        setChanges(prev => ({
            ...prev,
            [`${category}.${key}`]: value
        }));
    };

    const handleSave = async (category: string) => {
        setSaving(true);
        try {
            const categoryChanges: any = {};
            Object.keys(changes).forEach(key => {
                if (key.startsWith(`${category}.`)) {
                    const settingKey = key.split('.')[1];
                    categoryChanges[settingKey] = changes[key];
                }
            });

            if (Object.keys(categoryChanges).length === 0) {
                alert('No changes to save');
                return;
            }

            await api.put(`/admin/settings/${category}`, categoryChanges);

            // Clear changes for this category
            const newChanges = { ...changes };
            Object.keys(newChanges).forEach(key => {
                if (key.startsWith(`${category}.`)) {
                    delete newChanges[key];
                }
            });
            setChanges(newChanges);

            // Refresh settings
            await fetchSettings();
            alert('Settings saved successfully!');
        } catch (error: any) {
            alert(error.response?.data?.message || 'Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    const handleTestEmail = async () => {
        const email = prompt('Enter email address to send test email:');
        if (!email) return;

        try {
            await api.post('/admin/settings/test-email', { to: email });
            alert(`Test email sent to ${email}!`);
        } catch (error: any) {
            alert(error.response?.data?.message || 'Failed to send test email');
        }
    };

    const getValue = (category: string, key: string) => {
        const changeKey = `${category}.${key}`;
        if (changeKey in changes) {
            return changes[changeKey];
        }
        return settings[category]?.[key]?.value;
    };

    const tabs = [
        { id: 'general', label: 'General', icon: Settings },
        { id: 'email', label: 'Email', icon: Mail },
        { id: 'whatsapp', label: 'WhatsApp', icon: Zap },
        { id: 'security', label: 'Security', icon: Shield },
        { id: 'advanced', label: 'Advanced', icon: Database }
    ];

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-white">System Settings</h1>
                <p className="text-gray-400 mt-1">Configure system-wide settings</p>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6 border-b border-gray-700">
                {tabs.map(tab => {
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${activeTab === tab.id
                                    ? 'border-purple-500 text-white'
                                    : 'border-transparent text-gray-400 hover:text-white'
                                }`}
                        >
                            <Icon size={18} />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Content */}
            <div className="bg-gray-800 rounded-lg p-6">
                {activeTab === 'general' && (
                    <GeneralSettings
                        settings={settings.general || {}}
                        getValue={(key) => getValue('general', key)}
                        onChange={(key, value) => handleChange('general', key, value)}
                        onSave={() => handleSave('general')}
                        saving={saving}
                    />
                )}

                {activeTab === 'email' && (
                    <EmailSettings
                        settings={settings.email || {}}
                        getValue={(key) => getValue('email', key)}
                        onChange={(key, value) => handleChange('email', key, value)}
                        onSave={() => handleSave('email')}
                        onTest={handleTestEmail}
                        saving={saving}
                    />
                )}

                {activeTab === 'whatsapp' && (
                    <WhatsAppSettings
                        settings={settings.whatsapp || {}}
                        getValue={(key) => getValue('whatsapp', key)}
                        onChange={(key, value) => handleChange('whatsapp', key, value)}
                        onSave={() => handleSave('whatsapp')}
                        saving={saving}
                    />
                )}

                {activeTab === 'security' && (
                    <SecuritySettings
                        settings={settings.security || {}}
                        getValue={(key) => getValue('security', key)}
                        onChange={(key, value) => handleChange('security', key, value)}
                        onSave={() => handleSave('security')}
                        saving={saving}
                    />
                )}

                {activeTab === 'advanced' && (
                    <AdvancedSettings
                        settings={settings.advanced || {}}
                        getValue={(key) => getValue('advanced', key)}
                        onChange={(key, value) => handleChange('advanced', key, value)}
                        onSave={() => handleSave('advanced')}
                        saving={saving}
                    />
                )}
            </div>
        </div>
    );
}

// General Settings Tab
function GeneralSettings({ settings, getValue, onChange, onSave, saving }: any) {
    return (
        <div className="space-y-6">
            <h2 className="text-xl font-semibold text-white mb-4">General Settings</h2>

            <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Site Name</label>
                <input
                    type="text"
                    value={getValue('site_name') || ''}
                    onChange={(e) => onChange('site_name', e.target.value)}
                    className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
                />
                <p className="text-xs text-gray-500 mt-1">{settings.site_name?.description}</p>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Contact Email</label>
                <input
                    type="email"
                    value={getValue('contact_email') || ''}
                    onChange={(e) => onChange('contact_email', e.target.value)}
                    className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
                />
                <p className="text-xs text-gray-500 mt-1">{settings.contact_email?.description}</p>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Timezone</label>
                <select
                    value={getValue('timezone') || 'Asia/Jakarta'}
                    onChange={(e) => onChange('timezone', e.target.value)}
                    className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
                >
                    <option value="Asia/Jakarta">Asia/Jakarta (WIB)</option>
                    <option value="Asia/Makassar">Asia/Makassar (WITA)</option>
                    <option value="Asia/Jayapura">Asia/Jayapura (WIT)</option>
                    <option value="UTC">UTC</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">{settings.timezone?.description}</p>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Date Format</label>
                <select
                    value={getValue('date_format') || 'DD/MM/YYYY'}
                    onChange={(e) => onChange('date_format', e.target.value)}
                    className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
                >
                    <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                    <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                    <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">{settings.date_format?.description}</p>
            </div>

            <button
                onClick={onSave}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 disabled:opacity-50"
            >
                <Save size={18} />
                {saving ? 'Saving...' : 'Save Changes'}
            </button>
        </div>
    );
}

// Email Settings Tab
function EmailSettings({ settings, getValue, onChange, onSave, onTest, saving }: any) {
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-white">Email Settings</h2>
                <button
                    onClick={onTest}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                >
                    <Send size={18} />
                    Send Test Email
                </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">SMTP Host</label>
                    <input
                        type="text"
                        value={getValue('smtp_host') || ''}
                        onChange={(e) => onChange('smtp_host', e.target.value)}
                        placeholder="smtp.gmail.com"
                        className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">SMTP Port</label>
                    <input
                        type="number"
                        value={getValue('smtp_port') || ''}
                        onChange={(e) => onChange('smtp_port', e.target.value)}
                        placeholder="587"
                        className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
                    />
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">SMTP Username</label>
                <input
                    type="text"
                    value={getValue('smtp_username') || ''}
                    onChange={(e) => onChange('smtp_username', e.target.value)}
                    className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">SMTP Password</label>
                <input
                    type="password"
                    value={getValue('smtp_password') || ''}
                    onChange={(e) => onChange('smtp_password', e.target.value)}
                    className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">From Email</label>
                    <input
                        type="email"
                        value={getValue('from_email') || ''}
                        onChange={(e) => onChange('from_email', e.target.value)}
                        placeholder="noreply@example.com"
                        className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">From Name</label>
                    <input
                        type="text"
                        value={getValue('from_name') || ''}
                        onChange={(e) => onChange('from_name', e.target.value)}
                        placeholder="WA Platform"
                        className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
                    />
                </div>
            </div>

            <button
                onClick={onSave}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 disabled:opacity-50"
            >
                <Save size={18} />
                {saving ? 'Saving...' : 'Save Changes'}
            </button>
        </div>
    );
}

// WhatsApp Settings Tab
function WhatsAppSettings({ settings, getValue, onChange, onSave, saving }: any) {
    return (
        <div className="space-y-6">
            <h2 className="text-xl font-semibold text-white mb-4">WhatsApp Settings</h2>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Max Bots per User</label>
                    <input
                        type="number"
                        value={getValue('max_bots_per_user') || ''}
                        onChange={(e) => onChange('max_bots_per_user', e.target.value)}
                        min="1"
                        max="100"
                        className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">{settings.max_bots_per_user?.description}</p>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Max Reminders per Bot</label>
                    <input
                        type="number"
                        value={getValue('max_reminders_per_bot') || ''}
                        onChange={(e) => onChange('max_reminders_per_bot', e.target.value)}
                        min="1"
                        max="1000"
                        className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">{settings.max_reminders_per_bot?.description}</p>
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Message Rate Limit (per minute)</label>
                <input
                    type="number"
                    value={getValue('message_rate_limit') || ''}
                    onChange={(e) => onChange('message_rate_limit', e.target.value)}
                    min="1"
                    max="100"
                    className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
                />
                <p className="text-xs text-gray-500 mt-1">{settings.message_rate_limit?.description}</p>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Session Timeout (hours)</label>
                <input
                    type="number"
                    value={getValue('session_timeout_hours') || ''}
                    onChange={(e) => onChange('session_timeout_hours', e.target.value)}
                    min="1"
                    max="168"
                    className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
                />
                <p className="text-xs text-gray-500 mt-1">{settings.session_timeout_hours?.description}</p>
            </div>

            <div>
                <label className="flex items-center gap-2 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={getValue('auto_reconnect') === 'true' || getValue('auto_reconnect') === true}
                        onChange={(e) => onChange('auto_reconnect', e.target.checked)}
                        className="rounded bg-gray-900 border-gray-700"
                    />
                    <span className="text-sm text-gray-300">Enable Auto-Reconnect</span>
                </label>
                <p className="text-xs text-gray-500 mt-1 ml-6">{settings.auto_reconnect?.description}</p>
            </div>

            <button
                onClick={onSave}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 disabled:opacity-50"
            >
                <Save size={18} />
                {saving ? 'Saving...' : 'Save Changes'}
            </button>
        </div>
    );
}

// Security Settings Tab
function SecuritySettings({ settings, getValue, onChange, onSave, saving }: any) {
    return (
        <div className="space-y-6">
            <h2 className="text-xl font-semibold text-white mb-4">Security Settings</h2>

            <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Password Min Length</label>
                <input
                    type="number"
                    value={getValue('password_min_length') || ''}
                    onChange={(e) => onChange('password_min_length', e.target.value)}
                    min="6"
                    max="32"
                    className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
                />
                <p className="text-xs text-gray-500 mt-1">{settings.password_min_length?.description}</p>
            </div>

            <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={getValue('require_uppercase') === 'true' || getValue('require_uppercase') === true}
                        onChange={(e) => onChange('require_uppercase', e.target.checked)}
                        className="rounded bg-gray-900 border-gray-700"
                    />
                    <span className="text-sm text-gray-300">Require Uppercase Letters</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={getValue('require_numbers') === 'true' || getValue('require_numbers') === true}
                        onChange={(e) => onChange('require_numbers', e.target.checked)}
                        className="rounded bg-gray-900 border-gray-700"
                    />
                    <span className="text-sm text-gray-300">Require Numbers</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={getValue('require_symbols') === 'true' || getValue('require_symbols') === true}
                        onChange={(e) => onChange('require_symbols', e.target.checked)}
                        className="rounded bg-gray-900 border-gray-700"
                    />
                    <span className="text-sm text-gray-300">Require Symbols</span>
                </label>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Max Login Attempts</label>
                    <input
                        type="number"
                        value={getValue('max_login_attempts') || ''}
                        onChange={(e) => onChange('max_login_attempts', e.target.value)}
                        min="3"
                        max="10"
                        className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">{settings.max_login_attempts?.description}</p>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Lockout Duration (minutes)</label>
                    <input
                        type="number"
                        value={getValue('lockout_duration_minutes') || ''}
                        onChange={(e) => onChange('lockout_duration_minutes', e.target.value)}
                        min="5"
                        max="120"
                        className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">{settings.lockout_duration_minutes?.description}</p>
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Invite Expiry (days)</label>
                <input
                    type="number"
                    value={getValue('invite_expiry_days') || ''}
                    onChange={(e) => onChange('invite_expiry_days', e.target.value)}
                    min="1"
                    max="30"
                    className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
                />
                <p className="text-xs text-gray-500 mt-1">{settings.invite_expiry_days?.description}</p>
            </div>

            <button
                onClick={onSave}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 disabled:opacity-50"
            >
                <Save size={18} />
                {saving ? 'Saving...' : 'Save Changes'}
            </button>
        </div>
    );
}

// Advanced Settings Tab
function AdvancedSettings({ settings, getValue, onChange, onSave, saving }: any) {
    return (
        <div className="space-y-6">
            <h2 className="text-xl font-semibold text-white mb-4">Advanced Settings</h2>
            <p className="text-yellow-400 text-sm mb-4">⚠️ Caution: Changing these settings may affect system performance</p>

            <div>
                <label className="flex items-center gap-2 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={getValue('enable_caching') === 'true' || getValue('enable_caching') === true}
                        onChange={(e) => onChange('enable_caching', e.target.checked)}
                        className="rounded bg-gray-900 border-gray-700"
                    />
                    <span className="text-sm text-gray-300">Enable Caching</span>
                </label>
                <p className="text-xs text-gray-500 mt-1 ml-6">{settings.enable_caching?.description}</p>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Cache TTL (seconds)</label>
                <input
                    type="number"
                    value={getValue('cache_ttl_seconds') || ''}
                    onChange={(e) => onChange('cache_ttl_seconds', e.target.value)}
                    min="60"
                    max="86400"
                    className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
                />
                <p className="text-xs text-gray-500 mt-1">{settings.cache_ttl_seconds?.description}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Queue Max Jobs</label>
                    <input
                        type="number"
                        value={getValue('queue_max_jobs') || ''}
                        onChange={(e) => onChange('queue_max_jobs', e.target.value)}
                        min="10"
                        max="1000"
                        className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">{settings.queue_max_jobs?.description}</p>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Job Timeout (seconds)</label>
                    <input
                        type="number"
                        value={getValue('job_timeout_seconds') || ''}
                        onChange={(e) => onChange('job_timeout_seconds', e.target.value)}
                        min="30"
                        max="600"
                        className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">{settings.job_timeout_seconds?.description}</p>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Log Retention (days)</label>
                    <input
                        type="number"
                        value={getValue('log_retention_days') || ''}
                        onChange={(e) => onChange('log_retention_days', e.target.value)}
                        min="7"
                        max="365"
                        className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">{settings.log_retention_days?.description}</p>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Backup Retention (days)</label>
                    <input
                        type="number"
                        value={getValue('backup_retention_days') || ''}
                        onChange={(e) => onChange('backup_retention_days', e.target.value)}
                        min="1"
                        max="90"
                        className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">{settings.backup_retention_days?.description}</p>
                </div>
            </div>

            <div>
                <label className="flex items-center gap-2 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={getValue('debug_mode') === 'true' || getValue('debug_mode') === true}
                        onChange={(e) => onChange('debug_mode', e.target.checked)}
                        className="rounded bg-gray-900 border-gray-700"
                    />
                    <span className="text-sm text-gray-300">Enable Debug Mode</span>
                </label>
                <p className="text-xs text-gray-500 mt-1 ml-6">{settings.debug_mode?.description}</p>
            </div>

            <button
                onClick={onSave}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 disabled:opacity-50"
            >
                <Save size={18} />
                {saving ? 'Saving...' : 'Save Changes'}
            </button>
        </div>
    );
}
