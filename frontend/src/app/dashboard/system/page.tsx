'use client'

import React, { useState, useEffect } from 'react';
import {
    Server, Database, HardDrive, Activity, Download, Trash2, RefreshCw,
    ChevronDown, CheckCircle, XCircle, AlertTriangle, Cpu, Clock,
    Archive, Settings, Zap, MemoryStick
} from 'lucide-react';
import { api } from '@/lib/api';

interface HealthStatus {
    status: string;
    database: { status: string; message?: string };
    memory: { status: string; used: number; total: number };
    whatsapp: { status: string; connected_bots: number; total_bots: number };
    redis: { status: string; message?: string };
}

interface Backup {
    id: string;
    filename: string;
    file_size: number;
    backup_type: string;
    created_at: string;
}

// KPI Card Component - Same as Analytics
interface KPICardProps {
    title: string
    value: number | string
    icon: React.ReactNode
    loading?: boolean
    status?: 'healthy' | 'warning' | 'error' | 'unknown'
    subtitle?: string
}

function KPICard({ title, value, icon, loading, status, subtitle }: KPICardProps) {
    const getStatusColor = () => {
        switch (status) {
            case 'healthy': return 'text-emerald-500'
            case 'warning': return 'text-amber-500'
            case 'error': return 'text-red-500'
            default: return 'text-zinc-900 dark:text-white'
        }
    }

    const getStatusBadge = () => {
        switch (status) {
            case 'healthy': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
            case 'warning': return 'bg-amber-500/10 text-amber-400 border-amber-500/20'
            case 'error': return 'bg-red-500/10 text-red-400 border-red-500/20'
            default: return 'bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-300 dark:border-zinc-700'
        }
    }

    return (
        <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-900 rounded-xl p-6 relative overflow-hidden group hover:border-zinc-300 dark:hover:border-zinc-800 transition-colors shadow-sm dark:shadow-none">
            <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-zinc-100 dark:bg-zinc-900 rounded-lg text-zinc-700 dark:text-zinc-100 group-hover:bg-zinc-200 dark:group-hover:bg-zinc-800 transition-colors">
                    {icon}
                </div>
                {status && (
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full border ${getStatusBadge()}`}>
                        {status}
                    </span>
                )}
            </div>

            <div className="space-y-1">
                {loading ? (
                    <div className="h-8 w-24 bg-zinc-200 dark:bg-zinc-900 rounded animate-pulse" />
                ) : (
                    <h3 className={`text-2xl font-bold tracking-tight ${getStatusColor()}`}>
                        {typeof value === 'number' ? value.toLocaleString() : value}
                    </h3>
                )}
                <p className="text-sm text-zinc-500 font-medium">{title}</p>
                {subtitle && <p className="text-xs text-zinc-400 dark:text-zinc-600">{subtitle}</p>}
            </div>
        </div>
    )
}

export default function SystemPage() {
    const [mounted, setMounted] = useState(false);
    const [activeTab, setActiveTab] = useState<'health' | 'backup' | 'maintenance'>('health');
    const [health, setHealth] = useState<HealthStatus | null>(null);
    const [backups, setBackups] = useState<Backup[]>([]);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!mounted) return;
        if (activeTab === 'health') {
            fetchHealth();
        } else if (activeTab === 'backup') {
            fetchBackups();
        }
    }, [mounted, activeTab]);

    const fetchHealth = async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);
        try {
            const response = await api.get('/admin/system/health');
            if (response.data && response.data.health) {
                const { health } = response.data;
                setHealth({
                    status: health.status,
                    database: health.checks?.database || { status: 'unknown' },
                    memory: {
                        status: health.checks?.memory?.status || 'unknown',
                        used: health.checks?.memory?.heapUsed || 0,
                        total: health.checks?.memory?.heapTotal || 0
                    },
                    whatsapp: health.checks?.whatsapp || { status: 'unknown', connected_bots: 0, total_bots: 0 },
                    redis: health.checks?.redis || { status: 'unknown' }
                });
            }
        } catch (error) {
            console.error('Failed to fetch health:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const fetchBackups = async () => {
        setLoading(true);
        try {
            const response = await api.get('/admin/system/backups');
            setBackups(response.data.backups || []);
        } catch (error) {
            console.error('Failed to fetch backups:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateBackup = async () => {
        setLoading(true);
        try {
            await api.post('/admin/system/backup');
            alert('Backup created successfully');
            fetchBackups();
        } catch (error) {
            console.error('Failed to create backup:', error);
            alert('Failed to create backup');
        } finally {
            setLoading(false);
        }
    };

    const handleOptimizeDB = async () => {
        if (!confirm('Optimize database? This may take a few moments.')) return;
        setLoading(true);
        try {
            await api.post('/admin/system/maintenance/optimize-db');
            alert('Database optimized successfully');
        } catch (error) {
            console.error('Failed to optimize database:', error);
            alert('Failed to optimize database');
        } finally {
            setLoading(false);
        }
    };

    const handleCleanupLogs = async () => {
        if (!confirm('Delete old logs? This cannot be undone.')) return;
        setLoading(true);
        try {
            await api.post('/admin/system/maintenance/cleanup-logs');
            alert('Logs cleaned up successfully');
        } catch (error) {
            console.error('Failed to cleanup logs:', error);
            alert('Failed to cleanup logs');
        } finally {
            setLoading(false);
        }
    };

    const handleClearCache = async () => {
        setLoading(true);
        try {
            await api.post('/admin/cache/clear');
            alert('Cache cleared successfully');
        } catch (error) {
            console.error('Failed to clear cache:', error);
            alert('Failed to clear cache');
        } finally {
            setLoading(false);
        }
    };

    const getHealthStatus = (status: string): 'healthy' | 'warning' | 'error' | 'unknown' => {
        if (status === 'healthy' || status === 'connected') return 'healthy';
        if (status === 'warning' || status === 'not_configured') return 'warning';
        if (status === 'error' || status === 'disconnected') return 'error';
        return 'unknown';
    };

    if (!mounted) return null;

    return (
        <div className="p-8 space-y-8 min-h-screen bg-zinc-50 dark:bg-black text-zinc-900 dark:text-zinc-100 font-sans">
            {/* Header - Same style as Analytics */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white mb-1">
                        System Management
                    </h1>
                    <p className="text-zinc-500 text-sm">
                        Monitor system health and perform maintenance tasks
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {/* Tab Dropdown */}
                    <div className="relative">
                        <button
                            onClick={() => {
                                const dropdown = document.getElementById('system-tab-dropdown')
                                if (dropdown) dropdown.classList.toggle('hidden')
                            }}
                            onBlur={(e) => {
                                setTimeout(() => {
                                    const dropdown = document.getElementById('system-tab-dropdown')
                                    if (dropdown && !dropdown.contains(e.relatedTarget as Node)) {
                                        dropdown.classList.add('hidden')
                                    }
                                }, 150)
                            }}
                            className="inline-flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800/50 rounded-lg text-xs font-medium text-zinc-900 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 transition-all"
                        >
                            <Settings className="w-3.5 h-3.5 text-blue-500" />
                            <span>
                                {activeTab === 'health' ? 'Health Check' :
                                    activeTab === 'backup' ? 'Backup & Restore' : 'Maintenance'}
                            </span>
                            <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
                        </button>

                        <div
                            id="system-tab-dropdown"
                            className="hidden absolute top-full right-0 mt-2 w-44 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl z-50 overflow-hidden py-1"
                        >
                            {[
                                { id: 'health', label: 'Health Check', icon: Activity },
                                { id: 'backup', label: 'Backup & Restore', icon: Archive },
                                { id: 'maintenance', label: 'Maintenance', icon: Settings }
                            ].map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => {
                                        setActiveTab(item.id as any)
                                        document.getElementById('system-tab-dropdown')?.classList.add('hidden')
                                    }}
                                    className={`w-full flex items-center gap-2 text-left px-4 py-2 text-xs hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors ${activeTab === item.id ? 'text-blue-500 bg-blue-50 dark:bg-blue-400/5' : 'text-zinc-600 dark:text-zinc-400'}`}
                                >
                                    <item.icon className="w-3.5 h-3.5" />
                                    {item.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Refresh Button */}
                    <button
                        onClick={() => activeTab === 'health' ? fetchHealth(true) : fetchBackups()}
                        disabled={refreshing || loading}
                        className="p-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/50 rounded-lg text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors disabled:opacity-50"
                    >
                        <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Health Check Tab */}
            {activeTab === 'health' && (
                <>
                    {/* KPI Grid - Same style as Analytics */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <KPICard
                            title="Database"
                            value={health?.database?.status === 'healthy' ? 'Connected' : 'Disconnected'}
                            icon={<Database className="w-5 h-5" />}
                            loading={loading && !health}
                            status={getHealthStatus(health?.database?.status || 'unknown')}
                            subtitle={health?.database?.message}
                        />
                        <KPICard
                            title="Memory Usage"
                            value={`${((health?.memory?.used || 0) / 1024 / 1024).toFixed(0)} MB`}
                            icon={<MemoryStick className="w-5 h-5" />}
                            loading={loading && !health}
                            status={getHealthStatus(health?.memory?.status || 'unknown')}
                            subtitle={`of ${((health?.memory?.total || 0) / 1024 / 1024).toFixed(0)} MB total`}
                        />
                        <KPICard
                            title="WhatsApp Bots"
                            value={`${health?.whatsapp?.connected_bots || 0} / ${health?.whatsapp?.total_bots || 0}`}
                            icon={<Activity className="w-5 h-5" />}
                            loading={loading && !health}
                            status={getHealthStatus(health?.whatsapp?.status || 'unknown')}
                            subtitle="connected bots"
                        />
                        <KPICard
                            title="Redis Cache"
                            value={health?.redis?.status === 'healthy' ? 'Connected' : 'Not Configured'}
                            icon={<Server className="w-5 h-5" />}
                            loading={loading && !health}
                            status={getHealthStatus(health?.redis?.status || 'unknown')}
                            subtitle={health?.redis?.message}
                        />
                    </div>

                    {/* System Status Table */}
                    <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-900 rounded-xl overflow-hidden shadow-sm dark:shadow-none">
                        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800/50 flex justify-between items-center">
                            <div>
                                <h3 className="text-lg font-medium text-zinc-800 dark:text-zinc-200">System Status</h3>
                                <p className="text-xs text-zinc-500 mt-0.5">Detailed health information</p>
                            </div>
                            <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${health?.status === 'healthy'
                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                    : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                }`}>
                                Overall: {health?.status || 'Unknown'}
                            </span>
                        </div>

                        {loading && !health ? (
                            <div className="flex items-center justify-center py-16">
                                <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-zinc-100 dark:bg-zinc-900/50 text-zinc-600 dark:text-zinc-500 font-medium">
                                        <tr>
                                            <th className="px-6 py-3">Component</th>
                                            <th className="px-6 py-3">Status</th>
                                            <th className="px-6 py-3">Details</th>
                                            <th className="px-6 py-3">Last Check</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/50 text-zinc-700 dark:text-zinc-300">
                                        <tr className="hover:bg-zinc-100 dark:hover:bg-zinc-900/30 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 bg-zinc-100 dark:bg-zinc-900 rounded-lg flex items-center justify-center border border-zinc-200 dark:border-zinc-800">
                                                        <Database className="w-4 h-4 text-blue-400" />
                                                    </div>
                                                    <span className="font-medium text-zinc-900 dark:text-white">Database</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${getHealthStatus(health?.database?.status || 'unknown') === 'healthy'
                                                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                                        : 'bg-red-500/10 text-red-400 border-red-500/20'
                                                    }`}>
                                                    {getHealthStatus(health?.database?.status || 'unknown') === 'healthy' ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                                                    {health?.database?.status || 'Unknown'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-zinc-500">{health?.database?.message || 'PostgreSQL connection'}</td>
                                            <td className="px-6 py-4 text-zinc-500">Just now</td>
                                        </tr>
                                        <tr className="hover:bg-zinc-100 dark:hover:bg-zinc-900/30 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 bg-zinc-100 dark:bg-zinc-900 rounded-lg flex items-center justify-center border border-zinc-200 dark:border-zinc-800">
                                                        <MemoryStick className="w-4 h-4 text-purple-400" />
                                                    </div>
                                                    <span className="font-medium text-zinc-900 dark:text-white">Memory</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${getHealthStatus(health?.memory?.status || 'unknown') === 'healthy'
                                                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                                        : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                                    }`}>
                                                    {getHealthStatus(health?.memory?.status || 'unknown') === 'healthy' ? <CheckCircle className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                                                    {health?.memory?.status || 'Unknown'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-zinc-500">
                                                {((health?.memory?.used || 0) / 1024 / 1024).toFixed(2)} MB / {((health?.memory?.total || 0) / 1024 / 1024).toFixed(2)} MB
                                            </td>
                                            <td className="px-6 py-4 text-zinc-500">Just now</td>
                                        </tr>
                                        <tr className="hover:bg-zinc-100 dark:hover:bg-zinc-900/30 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 bg-zinc-100 dark:bg-zinc-900 rounded-lg flex items-center justify-center border border-zinc-200 dark:border-zinc-800">
                                                        <Activity className="w-4 h-4 text-emerald-400" />
                                                    </div>
                                                    <span className="font-medium text-zinc-900 dark:text-white">WhatsApp</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${getHealthStatus(health?.whatsapp?.status || 'unknown') === 'healthy'
                                                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                                        : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                                    }`}>
                                                    {getHealthStatus(health?.whatsapp?.status || 'unknown') === 'healthy' ? <CheckCircle className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                                                    {health?.whatsapp?.status || 'Unknown'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-zinc-500">
                                                {health?.whatsapp?.connected_bots || 0} / {health?.whatsapp?.total_bots || 0} bots connected
                                            </td>
                                            <td className="px-6 py-4 text-zinc-500">Just now</td>
                                        </tr>
                                        <tr className="hover:bg-zinc-100 dark:hover:bg-zinc-900/30 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 bg-zinc-100 dark:bg-zinc-900 rounded-lg flex items-center justify-center border border-zinc-200 dark:border-zinc-800">
                                                        <Server className="w-4 h-4 text-red-400" />
                                                    </div>
                                                    <span className="font-medium text-zinc-900 dark:text-white">Redis Cache</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${getHealthStatus(health?.redis?.status || 'unknown') === 'healthy'
                                                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                                        : getHealthStatus(health?.redis?.status || 'unknown') === 'warning'
                                                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                                            : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                                                    }`}>
                                                    {getHealthStatus(health?.redis?.status || 'unknown') === 'healthy' ? <CheckCircle className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                                                    {health?.redis?.status || 'Unknown'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-zinc-500">{health?.redis?.message || 'Cache service'}</td>
                                            <td className="px-6 py-4 text-zinc-500">Just now</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* Backup Tab */}
            {activeTab === 'backup' && (
                <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-900 rounded-xl overflow-hidden shadow-sm dark:shadow-none">
                    <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800/50 flex justify-between items-center">
                        <div>
                            <h3 className="text-lg font-medium text-zinc-800 dark:text-zinc-200">Backup & Restore</h3>
                            <p className="text-xs text-zinc-500 mt-0.5">Manage database backups</p>
                        </div>
                        <button
                            onClick={handleCreateBackup}
                            disabled={loading}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-all disabled:opacity-50"
                        >
                            <Download className="w-4 h-4" />
                            Create Backup
                        </button>
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center py-16">
                            <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
                        </div>
                    ) : backups.length === 0 ? (
                        <div className="text-center py-16">
                            <div className="p-4 rounded-full bg-zinc-900/50 w-fit mx-auto mb-4">
                                <Archive size={32} className="text-zinc-600" />
                            </div>
                            <h3 className="text-lg font-medium text-zinc-800 dark:text-zinc-300 mb-1">No backups found</h3>
                            <p className="text-zinc-500 text-sm">Create your first backup to get started</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-zinc-100 dark:bg-zinc-900/50 text-zinc-600 dark:text-zinc-500 font-medium">
                                    <tr>
                                        <th className="px-6 py-3">Filename</th>
                                        <th className="px-6 py-3">Size</th>
                                        <th className="px-6 py-3">Type</th>
                                        <th className="px-6 py-3">Created</th>
                                        <th className="px-6 py-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/50 text-zinc-700 dark:text-zinc-300">
                                    {backups.map((backup) => (
                                        <tr key={backup.id} className="hover:bg-zinc-100 dark:hover:bg-zinc-900/30 transition-colors">
                                            <td className="px-6 py-4 font-medium text-zinc-900 dark:text-white">{backup.filename}</td>
                                            <td className="px-6 py-4 text-zinc-600 dark:text-zinc-400">
                                                {(backup.file_size / 1024 / 1024).toFixed(2)} MB
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                                    {backup.backup_type}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-zinc-600 dark:text-zinc-400">
                                                {new Date(backup.created_at).toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button className="p-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-all">
                                                    <Download className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* Maintenance Tab */}
            {activeTab === 'maintenance' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-900 rounded-xl p-6 group hover:border-zinc-300 dark:hover:border-zinc-800 transition-colors shadow-sm dark:shadow-none">
                        <div className="p-2 bg-zinc-100 dark:bg-zinc-900 rounded-lg text-zinc-700 dark:text-zinc-100 w-fit mb-4 group-hover:bg-zinc-200 dark:group-hover:bg-zinc-800 transition-colors">
                            <Database className="w-5 h-5 text-blue-400" />
                        </div>
                        <h3 className="font-semibold text-zinc-900 dark:text-white mb-2">Optimize Database</h3>
                        <p className="text-sm text-zinc-500 mb-4">Run VACUUM to optimize database performance and reclaim storage</p>
                        <button
                            onClick={handleOptimizeDB}
                            disabled={loading}
                            className="w-full px-4 py-2.5 bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-lg border border-zinc-200 dark:border-zinc-800 transition-colors disabled:opacity-50 font-medium text-sm"
                        >
                            {loading ? 'Processing...' : 'Optimize'}
                        </button>
                    </div>

                    <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-900 rounded-xl p-6 group hover:border-zinc-300 dark:hover:border-zinc-800 transition-colors shadow-sm dark:shadow-none">
                        <div className="p-2 bg-zinc-100 dark:bg-zinc-900 rounded-lg text-zinc-700 dark:text-zinc-100 w-fit mb-4 group-hover:bg-zinc-200 dark:group-hover:bg-zinc-800 transition-colors">
                            <Trash2 className="w-5 h-5 text-red-400" />
                        </div>
                        <h3 className="font-semibold text-zinc-900 dark:text-white mb-2">Cleanup Logs</h3>
                        <p className="text-sm text-zinc-500 mb-4">Delete old audit logs and system logs to free up space</p>
                        <button
                            onClick={handleCleanupLogs}
                            disabled={loading}
                            className="w-full px-4 py-2.5 bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-lg border border-zinc-200 dark:border-zinc-800 transition-colors disabled:opacity-50 font-medium text-sm"
                        >
                            {loading ? 'Processing...' : 'Cleanup'}
                        </button>
                    </div>

                    <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-900 rounded-xl p-6 group hover:border-zinc-300 dark:hover:border-zinc-800 transition-colors shadow-sm dark:shadow-none">
                        <div className="p-2 bg-zinc-100 dark:bg-zinc-900 rounded-lg text-zinc-700 dark:text-zinc-100 w-fit mb-4 group-hover:bg-zinc-200 dark:group-hover:bg-zinc-800 transition-colors">
                            <Zap className="w-5 h-5 text-amber-400" />
                        </div>
                        <h3 className="font-semibold text-zinc-900 dark:text-white mb-2">Clear Cache</h3>
                        <p className="text-sm text-zinc-500 mb-4">Clear all cached data and refresh system state</p>
                        <button
                            onClick={handleClearCache}
                            disabled={loading}
                            className="w-full px-4 py-2.5 bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-lg border border-zinc-200 dark:border-zinc-800 transition-colors disabled:opacity-50 font-medium text-sm"
                        >
                            {loading ? 'Processing...' : 'Clear Cache'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
