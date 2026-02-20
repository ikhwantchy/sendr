'use client'

import React, { useState, useEffect } from 'react';
import { Mail, Send, User, Loader2, CheckCircle2, XCircle, Eye, EyeOff, Save } from 'lucide-react';
import { api } from '@/lib/api';

interface Setting {
    key: string;
    value: string;
    category: string;
    description: string;
    data_type: string;
}

const emailSettingKeys = [
    'smtp_host', 'smtp_port', 'smtp_username', 'smtp_password',
    'from_email', 'from_name',
    'welcome_email_enabled', 'welcome_email_subject', 'welcome_email_template'
];

const emailDefaults: Record<string, string> = {
    smtp_host: '',
    smtp_port: '587',
    smtp_username: '',
    smtp_password: '',
    from_email: 'noreply@example.com',
    from_name: 'WA Platform',
    welcome_email_enabled: 'false',
    welcome_email_subject: 'Selamat Datang di {{site_name}}',
    welcome_email_template: ''
};

export default function EmailSettings() {
    const [settings, setSettings] = useState<Setting[]>([]);
    const [changes, setChanges] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [testingEmail, setTestingEmail] = useState(false);
    const [showSmtpPassword, setShowSmtpPassword] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    useEffect(() => {
        fetchEmailSettings();
    }, []);

    const fetchEmailSettings = async () => {
        setLoading(true);
        try {
            const response = await api.get('/admin/settings/email');
            const rawSettings = response.data.settings;

            // getCategory returns flat { key: value } format
            const flatSettings: Setting[] = [];
            if (rawSettings && typeof rawSettings === 'object' && !Array.isArray(rawSettings)) {
                for (const key of Object.keys(rawSettings)) {
                    const val = rawSettings[key];
                    // Support both flat { key: value } and nested { key: { value: ... } }
                    const isNested = val && typeof val === 'object' && 'value' in val;
                    flatSettings.push({
                        key,
                        value: isNested ? String(val.value ?? '') : String(val ?? ''),
                        category: 'email',
                        description: isNested ? val.description || '' : '',
                        data_type: key.includes('password') ? 'password' : 'string'
                    });
                }
            } else if (Array.isArray(rawSettings)) {
                flatSettings.push(...rawSettings);
            }

            setSettings(flatSettings);
        } catch (error) {
            console.error('Failed to fetch email settings:', error);
        } finally {
            setLoading(false);
        }
    };

    const getVal = (key: string): string => {
        if (changes[key] !== undefined) return changes[key];
        const setting = settings.find(s => s.key === key);
        if (setting) return setting.value;
        return emailDefaults[key] || '';
    };

    const setVal = (key: string, value: string) => {
        setChanges(prev => ({ ...prev, [key]: value }));
    };

    const handleSave = async () => {
        setSaving(true);
        setMessage(null);
        try {
            const emailChanges: Record<string, string> = {};
            for (const key of emailSettingKeys) {
                if (changes[key] !== undefined) {
                    emailChanges[key] = changes[key];
                }
            }
            if (Object.keys(emailChanges).length === 0) {
                setSaving(false);
                return;
            }
            await api.put('/admin/settings/email', emailChanges);
            setMessage({ type: 'success', text: 'Pengaturan email berhasil disimpan' });
            setChanges({});
            fetchEmailSettings();
        } catch (error) {
            console.error('Failed to save email settings:', error);
            setMessage({ type: 'error', text: 'Gagal menyimpan pengaturan email' });
        } finally {
            setSaving(false);
        }
    };

    const handleTestEmail = async () => {
        const testTo = prompt('Masukkan alamat email tujuan test:');
        if (!testTo) return;
        setTestingEmail(true);
        setMessage(null);
        try {
            await api.post('/admin/settings/test-email', { to: testTo });
            setMessage({ type: 'success', text: `Test email berhasil dikirim ke ${testTo}` });
        } catch (error: any) {
            setMessage({ type: 'error', text: error.response?.data?.error || error.response?.data?.message || 'Gagal mengirim test email. Pastikan SMTP sudah dikonfigurasi.' });
        } finally {
            setTestingEmail(false);
        }
    };

    const hasChanges = Object.keys(changes).length > 0;

    if (loading) {
        return (
            <div className="flex items-center justify-center h-48">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white">Email</h1>
                    <p className="text-xs sm:text-sm text-zinc-500 mt-1">Konfigurasi SMTP dan welcome email</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving || !hasChanges}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                >
                    <Save size={16} />
                    {saving ? 'Menyimpan...' : 'Simpan'}
                </button>
            </div>

            {/* Alert Message */}
            {message && (
                <div className={`p-4 rounded-lg border ${message.type === 'success'
                    ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700 text-green-700 dark:text-green-300'
                    : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700 text-red-700 dark:text-red-300'
                }`}>
                    <div className="flex items-center gap-2">
                        {message.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                        <span className="text-sm">{message.text}</span>
                    </div>
                </div>
            )}

            {/* SMTP Configuration */}
            <div className="bg-white dark:bg-zinc-900 rounded-xl p-4 sm:p-6 border border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                        <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">Konfigurasi SMTP</h3>
                        <p className="text-xs text-zinc-500 mt-0.5">Pengaturan server email untuk mengirim notifikasi</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">SMTP Host</label>
                        <input
                            type="text"
                            value={getVal('smtp_host')}
                            onChange={(e) => setVal('smtp_host', e.target.value)}
                            placeholder="smtp.gmail.com"
                            className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-900 dark:text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">SMTP Port</label>
                        <input
                            type="number"
                            value={getVal('smtp_port')}
                            onChange={(e) => setVal('smtp_port', e.target.value)}
                            placeholder="587"
                            className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-900 dark:text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        <p className="text-[10px] text-zinc-500 mt-1">587 (TLS) atau 465 (SSL)</p>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">Username</label>
                        <input
                            type="text"
                            value={getVal('smtp_username')}
                            onChange={(e) => setVal('smtp_username', e.target.value)}
                            placeholder="user@gmail.com"
                            className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-900 dark:text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">Password</label>
                        <div className="relative">
                            <input
                                type={showSmtpPassword ? 'text' : 'password'}
                                value={getVal('smtp_password')}
                                onChange={(e) => setVal('smtp_password', e.target.value)}
                                placeholder="••••••••"
                                className="w-full px-3 py-2 pr-10 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-900 dark:text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                            <button
                                type="button"
                                onClick={() => setShowSmtpPassword(!showSmtpPassword)}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                            >
                                {showSmtpPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                        <p className="text-[10px] text-zinc-500 mt-1">Untuk Gmail, gunakan App Password</p>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">From Email</label>
                        <input
                            type="email"
                            value={getVal('from_email')}
                            onChange={(e) => setVal('from_email', e.target.value)}
                            placeholder="noreply@example.com"
                            className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-900 dark:text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">From Name</label>
                        <input
                            type="text"
                            value={getVal('from_name')}
                            onChange={(e) => setVal('from_name', e.target.value)}
                            placeholder="WA Platform"
                            className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-900 dark:text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                    </div>
                </div>

                {/* Test Email */}
                <div className="mt-5 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                    <button
                        onClick={handleTestEmail}
                        disabled={testingEmail}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                    >
                        {testingEmail ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        {testingEmail ? 'Mengirim...' : 'Kirim Test Email'}
                    </button>
                    <p className="text-[10px] text-zinc-500 mt-2">Simpan pengaturan SMTP dulu sebelum test.</p>
                </div>
            </div>

            {/* Welcome Email */}
            <div className="bg-white dark:bg-zinc-900 rounded-xl p-4 sm:p-6 border border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                        <User className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">Welcome Email</h3>
                        <p className="text-xs text-zinc-500 mt-0.5">Email otomatis saat admin membuat user baru</p>
                    </div>
                    <select
                        value={getVal('welcome_email_enabled')}
                        onChange={(e) => setVal('welcome_email_enabled', e.target.value)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                            getVal('welcome_email_enabled') === 'true'
                                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400'
                                : 'bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400'
                        }`}
                    >
                        <option value="true">Aktif</option>
                        <option value="false">Nonaktif</option>
                    </select>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">Subject Email</label>
                        <input
                            type="text"
                            value={getVal('welcome_email_subject')}
                            onChange={(e) => setVal('welcome_email_subject', e.target.value)}
                            placeholder="Selamat Datang di {{site_name}}"
                            className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-900 dark:text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">Template Email (HTML)</label>
                        <textarea
                            value={getVal('welcome_email_template')}
                            onChange={(e) => setVal('welcome_email_template', e.target.value)}
                            placeholder="Kosongkan untuk menggunakan template default. Atau masukkan HTML template kustom..."
                            rows={12}
                            className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-900 dark:text-white text-sm font-mono focus:outline-none focus:ring-1 focus:ring-blue-500 resize-y"
                        />
                        <p className="text-[10px] text-zinc-500 mt-1">Kosongkan untuk menggunakan template bawaan.</p>
                    </div>

                    {/* Variables Reference */}
                    <div className="bg-zinc-50 dark:bg-zinc-950 rounded-lg p-4 border border-zinc-200 dark:border-zinc-800">
                        <h4 className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-2">Variabel yang tersedia:</h4>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {[
                                { var: '{{name}}', desc: 'Nama user' },
                                { var: '{{email}}', desc: 'Email user' },
                                { var: '{{password}}', desc: 'Password' },
                                { var: '{{login_url}}', desc: 'URL login' },
                                { var: '{{site_name}}', desc: 'Nama site' },
                                { var: '{{year}}', desc: 'Tahun sekarang' },
                            ].map((v) => (
                                <div key={v.var} className="flex items-start gap-1.5">
                                    <code className="text-[10px] bg-zinc-200 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-blue-600 dark:text-blue-400 font-mono whitespace-nowrap">{v.var}</code>
                                    <span className="text-[10px] text-zinc-500">{v.desc}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Unsaved Changes Warning */}
            {hasChanges && (
                <div className="fixed bottom-6 right-6 bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/20 text-yellow-700 dark:text-yellow-400 px-4 py-3 rounded-lg shadow-lg">
                    <p className="text-sm font-medium">Ada perubahan yang belum disimpan</p>
                </div>
            )}
        </div>
    );
}
