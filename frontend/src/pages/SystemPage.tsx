import React, { useState, useEffect } from 'react';
import { Activity, Database, HardDrive, Download, Trash2, Zap, RefreshCw } from 'lucide-react';
import { api } from '../lib/api';

interface SystemHealth {
    status: string;
    checks: {
        database: { status: string; message: string; size?: string };
        redis: { status: string; message: string };
        memory: { status: string; rss: string; heapUsed: string; heapTotal: string };
        whatsapp: { status: string; total_bots: number; connected_bots: number };
        disk: { status: string; message: string };
    };
    uptime: string;
}

interface Backup {
    id: string;
    filename: string;
    file_size_mb: number;
    backup_type: string;
    status: string;
    created_at: string;
    created_by_email: string;
}

export default function SystemPage() {
    const [activeTab, setActiveTab] = useState('health');
    const [health, setHealth] = useState<SystemHealth | null>(null);
    const [backups, setBackups] = useState<Backup[]>([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        if (activeTab === 'health') {
            fetchHealth();
        } else if (activeTab === 'backup') {
            fetchBackups();
        }
    }, [activeTab]);

    const fetchHealth = async () => {
        setLoading(true);
        try {
            const response = await api.get('/admin/system/health');
            setHealth(response.data.health);
        } catch (error) {
            console.error('Failed to fetch health:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchBackups = async () => {
        setLoading(true);
        try {
            const response = await api.get('/admin/system/backups');
            setBackups(response.data.backups);
        } catch (error) {
            console.error('Failed to fetch backups:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateBackup = async () => {
        if (!confirm('Create a database backup? This may take a few minutes.')) return;

        setCreating(true);
        try {
            await api.post('/admin/system/backup');
            alert('Backup created successfully!');
            fetchBackups();
        } catch (error: any) {
            alert(error.response?.data?.message || 'Failed to create backup');
        } finally {
            setCreating(false);
        }
    };

    const handleOptimizeDB = async () => {
        if (!confirm('Optimize database? This will run VACUUM ANALYZE.')) return;

        try {
            await api.post('/admin/system/maintenance/optimize-db');
            alert('Database optimized successfully!');
        } catch (error: any) {
            alert(error.response?.data?.message || 'Failed to optimize database');
        }
    };

    const handleCleanupLogs = async () => {
        if (!confirm('Clean up old audit logs? This will delete logs older than retention period.')) return;

        try {
            await api.post('/admin/system/maintenance/cleanup-logs');
            alert('Old logs cleaned up successfully!');
        } catch (error: any) {
            alert(error.response?.data?.message || 'Failed to cleanup logs');
        }
    };

    const handleClearCache = async () => {
        if (!confirm('Clear system cache?')) return;

        try {
            await api.post('/admin/cache/clear');
            alert('Cache cleared successfully!');
        } catch (error: any) {
            alert(error.response?.data?.message || 'Failed to clear cache');
        }
    };

    const tabs = [
        { id: 'health', label: 'Health Check', icon: Activity },
        { id: 'backup', label: 'Backup & Restore', icon: Database },
        { id: 'maintenance', label: 'Maintenance', icon: Zap }
    ];

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-white">System Management</h1>
                <p className="text-gray-400 mt-1">Monitor health, manage backups, and perform maintenance</p>
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
            {activeTab === 'health' && (
                <HealthTab health={health} loading={loading} onRefresh={fetchHealth} />
            )}

            {activeTab === 'backup' && (
                <BackupTab
                    backups={backups}
                    loading={loading}
                    creating={creating}
                    onCreate={handleCreateBackup}
                />
            )}

            {activeTab === 'maintenance' && (
                <MaintenanceTab
                    onOptimizeDB={handleOptimizeDB}
                    onCleanupLogs={handleCleanupLogs}
                    onClearCache={handleClearCache}
                />
            )}
        </div>
    );
}

// Health Check Tab
function HealthTab({ health, loading, onRefresh }: any) {
    if (loading || !health) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
            </div>
        );
    }

    const getStatusColor = (status: string) => {
        if (status === 'healthy') return 'text-green-400';
        if (status === 'unhealthy') return 'text-red-400';
        return 'text-yellow-400';
    };

    const getStatusBg = (status: string) => {
        if (status === 'healthy') return 'bg-green-500/20 border-green-500/50';
        if (status === 'unhealthy') return 'bg-red-500/20 border-red-500/50';
        return 'bg-yellow-500/20 border-yellow-500/50';
    };

    return (
        <div className="space-y-6">
            {/* Overall Status */}
            <div className={`p-6 rounded-lg border ${getStatusBg(health.status)}`}>
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-white mb-2">
                            System Status: <span className={getStatusColor(health.status)}>{health.status.toUpperCase()}</span>
                        </h2>
                        <p className="text-gray-400">Uptime: {health.uptime}</p>
                    </div>
                    <button
                        onClick={onRefresh}
                        className="p-3 bg-gray-700 rounded-lg hover:bg-gray-600"
                    >
                        <RefreshCw size={20} className="text-white" />
                    </button>
                </div>
            </div>

            {/* Health Checks Grid */}
            <div className="grid grid-cols-2 gap-4">
                {/* Database */}
                <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                    <div className="flex items-center gap-3 mb-4">
                        <Database size={24} className={getStatusColor(health.checks.database.status)} />
                        <h3 className="text-lg font-semibold text-white">Database</h3>
                    </div>
                    <p className={`text-sm mb-2 ${getStatusColor(health.checks.database.status)}`}>
                        {health.checks.database.message}
                    </p>
                    {health.checks.database.size && (
                        <p className="text-sm text-gray-400">Size: {health.checks.database.size}</p>
                    )}
                </div>

                {/* Memory */}
                <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                    <div className="flex items-center gap-3 mb-4">
                        <HardDrive size={24} className={getStatusColor(health.checks.memory.status)} />
                        <h3 className="text-lg font-semibold text-white">Memory</h3>
                    </div>
                    <div className="space-y-1 text-sm">
                        <p className="text-gray-400">RSS: {health.checks.memory.rss}</p>
                        <p className="text-gray-400">Heap Used: {health.checks.memory.heapUsed}</p>
                        <p className="text-gray-400">Heap Total: {health.checks.memory.heapTotal}</p>
                    </div>
                </div>

                {/* WhatsApp */}
                <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                    <div className="flex items-center gap-3 mb-4">
                        <Zap size={24} className={getStatusColor(health.checks.whatsapp.status)} />
                        <h3 className="text-lg font-semibold text-white">WhatsApp Bots</h3>
                    </div>
                    <div className="space-y-1 text-sm">
                        <p className="text-gray-400">Total Bots: {health.checks.whatsapp.total_bots}</p>
                        <p className="text-green-400">Connected: {health.checks.whatsapp.connected_bots}</p>
                    </div>
                </div>

                {/* Redis */}
                <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                    <div className="flex items-center gap-3 mb-4">
                        <Activity size={24} className={getStatusColor(health.checks.redis.status)} />
                        <h3 className="text-lg font-semibold text-white">Redis</h3>
                    </div>
                    <p className={`text-sm ${getStatusColor(health.checks.redis.status)}`}>
                        {health.checks.redis.message}
                    </p>
                </div>
            </div>
        </div>
    );
}

// Backup Tab
function BackupTab({ backups, loading, creating, onCreate }: any) {
    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Create Backup Button */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-semibold text-white">Database Backups</h2>
                    <p className="text-gray-400 text-sm mt-1">Create and manage database backups</p>
                </div>
                <button
                    onClick={onCreate}
                    disabled={creating}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 disabled:opacity-50"
                >
                    <Database size={18} />
                    {creating ? 'Creating...' : 'Create Backup'}
                </button>
            </div>

            {/* Backups List */}
            {backups.length === 0 ? (
                <div className="text-center py-12 bg-gray-800 rounded-lg">
                    <Database size={48} className="mx-auto text-gray-600 mb-4" />
                    <p className="text-gray-400">No backups yet</p>
                    <p className="text-gray-500 text-sm mt-2">Create your first backup to get started</p>
                </div>
            ) : (
                <div className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700">
                    <table className="w-full">
                        <thead className="bg-gray-900">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Filename</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Size</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Type</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Created By</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Created At</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700">
                            {backups.map((backup: Backup) => (
                                <tr key={backup.id} className="hover:bg-gray-750">
                                    <td className="px-4 py-3 text-sm text-white font-mono">{backup.filename}</td>
                                    <td className="px-4 py-3 text-sm text-gray-300">{backup.file_size_mb} MB</td>
                                    <td className="px-4 py-3 text-sm">
                                        <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs">
                                            {backup.backup_type}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-300">{backup.created_by_email || 'System'}</td>
                                    <td className="px-4 py-3 text-sm text-gray-300">
                                        {new Date(backup.created_at).toLocaleString()}
                                    </td>
                                    <td className="px-4 py-3 text-sm">
                                        <span className={`px-2 py-1 rounded text-xs ${backup.status === 'completed'
                                                ? 'bg-green-500/20 text-green-400'
                                                : 'bg-yellow-500/20 text-yellow-400'
                                            }`}>
                                            {backup.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

// Maintenance Tab
function MaintenanceTab({ onOptimizeDB, onCleanupLogs, onClearCache }: any) {
    return (
        <div className="space-y-6">
            <h2 className="text-xl font-semibold text-white mb-4">System Maintenance</h2>

            <div className="grid gap-4">
                {/* Optimize Database */}
                <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                                <Database size={24} className="text-blue-400" />
                                <h3 className="text-lg font-semibold text-white">Optimize Database</h3>
                            </div>
                            <p className="text-gray-400 text-sm mb-4">
                                Run VACUUM ANALYZE to optimize database performance and reclaim storage space.
                            </p>
                        </div>
                        <button
                            onClick={onOptimizeDB}
                            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                        >
                            Optimize Now
                        </button>
                    </div>
                </div>

                {/* Cleanup Logs */}
                <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                                <Trash2 size={24} className="text-yellow-400" />
                                <h3 className="text-lg font-semibold text-white">Cleanup Old Logs</h3>
                            </div>
                            <p className="text-gray-400 text-sm mb-4">
                                Delete audit logs older than the retention period to free up space.
                            </p>
                        </div>
                        <button
                            onClick={onCleanupLogs}
                            className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600"
                        >
                            Cleanup Now
                        </button>
                    </div>
                </div>

                {/* Clear Cache */}
                <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                                <Zap size={24} className="text-purple-400" />
                                <h3 className="text-lg font-semibold text-white">Clear System Cache</h3>
                            </div>
                            <p className="text-gray-400 text-sm mb-4">
                                Clear all cached settings and data. Useful after configuration changes.
                            </p>
                        </div>
                        <button
                            onClick={onClearCache}
                            className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600"
                        >
                            Clear Cache
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
