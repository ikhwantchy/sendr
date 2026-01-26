'use client'

import React, { useState, useEffect } from 'react';
import { Server, Database, HardDrive, Activity, Download, Trash2, RefreshCw } from 'lucide-react';
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

export default function SystemPage() {
    const [activeTab, setActiveTab] = useState('health');
    const [health, setHealth] = useState<HealthStatus | null>(null);
    const [backups, setBackups] = useState<Backup[]>([]);
    const [loading, setLoading] = useState(false);

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
            setHealth(response.data);
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
            await api.post('/admin/system/optimize');
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
            await api.post('/admin/system/cleanup-logs');
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
            await api.post('/admin/system/clear-cache');
            alert('Cache cleared successfully');
        } catch (error) {
            console.error('Failed to clear cache:', error);
            alert('Failed to clear cache');
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status: string) => {
        return status === 'healthy' || status === 'connected'
            ? 'bg-green-500/10 text-green-400 border-green-500/20'
            : 'bg-red-500/10 text-red-400 border-red-500/20';
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-zinc-100">System Management</h1>
                <p className="text-zinc-500 mt-1">Monitor system health and perform maintenance tasks</p>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6 border-b border-zinc-800">
                <button
                    onClick={() => setActiveTab('health')}
                    className={`px-4 py-2 font-medium transition-colors ${activeTab === 'health'
                        ? 'text-purple-400 border-b-2 border-purple-400'
                        : 'text-zinc-500 hover:text-zinc-300'
                        }`}
                >
                    Health Check
                </button>
                <button
                    onClick={() => setActiveTab('backup')}
                    className={`px-4 py-2 font-medium transition-colors ${activeTab === 'backup'
                        ? 'text-purple-400 border-b-2 border-purple-400'
                        : 'text-zinc-500 hover:text-zinc-300'
                        }`}
                >
                    Backup & Restore
                </button>
                <button
                    onClick={() => setActiveTab('maintenance')}
                    className={`px-4 py-2 font-medium transition-colors ${activeTab === 'maintenance'
                        ? 'text-purple-400 border-b-2 border-purple-400'
                        : 'text-zinc-500 hover:text-zinc-300'
                        }`}
                >
                    Maintenance
                </button>
            </div>

            {/* Health Check Tab */}
            {activeTab === 'health' && (
                <div className="space-y-4">
                    <div className="flex justify-end">
                        <button
                            onClick={fetchHealth}
                            disabled={loading}
                            className="flex items-center gap-2 px-4 py-2 bg-zinc-800 text-zinc-100 rounded-lg hover:bg-zinc-700 border border-zinc-700 transition-colors disabled:opacity-50"
                        >
                            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                            Refresh
                        </button>
                    </div>

                    {health && (
                        <div className="grid grid-cols-2 gap-4">
                            {/* Database */}
                            <div className="bg-zinc-900 rounded-lg p-6 border border-zinc-800">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <Database className="w-5 h-5 text-purple-400" />
                                        <h3 className="font-semibold text-zinc-100">Database</h3>
                                    </div>
                                    <span className={`px-3 py-1 rounded-full text-xs border ${getStatusColor(health.database.status)}`}>
                                        {health.database.status}
                                    </span>
                                </div>
                                <p className="text-sm text-zinc-500">{health.database.message || 'Connected'}</p>
                            </div>

                            {/* Memory */}
                            <div className="bg-zinc-900 rounded-lg p-6 border border-zinc-800">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <HardDrive className="w-5 h-5 text-blue-400" />
                                        <h3 className="font-semibold text-zinc-100">Memory</h3>
                                    </div>
                                    <span className={`px-3 py-1 rounded-full text-xs border ${getStatusColor(health.memory.status)}`}>
                                        {health.memory.status}
                                    </span>
                                </div>
                                <p className="text-sm text-zinc-500">
                                    {(health.memory.used / 1024 / 1024).toFixed(2)} MB / {(health.memory.total / 1024 / 1024).toFixed(2)} MB
                                </p>
                            </div>

                            {/* WhatsApp */}
                            <div className="bg-zinc-900 rounded-lg p-6 border border-zinc-800">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <Activity className="w-5 h-5 text-green-400" />
                                        <h3 className="font-semibold text-zinc-100">WhatsApp</h3>
                                    </div>
                                    <span className={`px-3 py-1 rounded-full text-xs border ${getStatusColor(health.whatsapp.status)}`}>
                                        {health.whatsapp.status}
                                    </span>
                                </div>
                                <p className="text-sm text-zinc-500">
                                    {health.whatsapp.connected_bots} / {health.whatsapp.total_bots} bots connected
                                </p>
                            </div>

                            {/* Redis */}
                            <div className="bg-zinc-900 rounded-lg p-6 border border-zinc-800">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <Server className="w-5 h-5 text-red-400" />
                                        <h3 className="font-semibold text-zinc-100">Redis</h3>
                                    </div>
                                    <span className={`px-3 py-1 rounded-full text-xs border ${getStatusColor(health.redis.status)}`}>
                                        {health.redis.status}
                                    </span>
                                </div>
                                <p className="text-sm text-zinc-500">{health.redis.message || 'Connected'}</p>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Backup Tab */}
            {activeTab === 'backup' && (
                <div className="space-y-4">
                    <div className="flex justify-end">
                        <button
                            onClick={handleCreateBackup}
                            disabled={loading}
                            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all disabled:opacity-50"
                        >
                            <Download size={18} />
                            Create Backup
                        </button>
                    </div>

                    <div className="bg-zinc-900 rounded-lg border border-zinc-800 overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-zinc-950">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">Filename</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">Size</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">Type</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">Created</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800">
                                {backups.map((backup) => (
                                    <tr key={backup.id} className="hover:bg-zinc-800/50 transition-colors">
                                        <td className="px-4 py-3 text-sm text-zinc-300">{backup.filename}</td>
                                        <td className="px-4 py-3 text-sm text-zinc-500">
                                            {(backup.file_size / 1024 / 1024).toFixed(2)} MB
                                        </td>
                                        <td className="px-4 py-3 text-sm">
                                            <span className="px-2 py-1 rounded text-xs bg-purple-500/10 text-purple-400 border border-purple-500/20">
                                                {backup.backup_type}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-zinc-500">
                                            {new Date(backup.created_at).toLocaleString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Maintenance Tab */}
            {activeTab === 'maintenance' && (
                <div className="grid grid-cols-3 gap-4">
                    <div className="bg-zinc-900 rounded-lg p-6 border border-zinc-800">
                        <Database className="w-8 h-8 text-purple-400 mb-4" />
                        <h3 className="font-semibold text-zinc-100 mb-2">Optimize Database</h3>
                        <p className="text-sm text-zinc-500 mb-4">Run VACUUM to optimize database performance</p>
                        <button
                            onClick={handleOptimizeDB}
                            disabled={loading}
                            className="w-full px-4 py-2 bg-zinc-800 text-zinc-100 rounded-lg hover:bg-zinc-700 border border-zinc-700 transition-colors disabled:opacity-50"
                        >
                            Optimize
                        </button>
                    </div>

                    <div className="bg-zinc-900 rounded-lg p-6 border border-zinc-800">
                        <Trash2 className="w-8 h-8 text-red-400 mb-4" />
                        <h3 className="font-semibold text-zinc-100 mb-2">Cleanup Logs</h3>
                        <p className="text-sm text-zinc-500 mb-4">Delete old audit logs and system logs</p>
                        <button
                            onClick={handleCleanupLogs}
                            disabled={loading}
                            className="w-full px-4 py-2 bg-zinc-800 text-zinc-100 rounded-lg hover:bg-zinc-700 border border-zinc-700 transition-colors disabled:opacity-50"
                        >
                            Cleanup
                        </button>
                    </div>

                    <div className="bg-zinc-900 rounded-lg p-6 border border-zinc-800">
                        <RefreshCw className="w-8 h-8 text-blue-400 mb-4" />
                        <h3 className="font-semibold text-zinc-100 mb-2">Clear Cache</h3>
                        <p className="text-sm text-zinc-500 mb-4">Clear all cached data and settings</p>
                        <button
                            onClick={handleClearCache}
                            disabled={loading}
                            className="w-full px-4 py-2 bg-zinc-800 text-zinc-100 rounded-lg hover:bg-zinc-700 border border-zinc-700 transition-colors disabled:opacity-50"
                        >
                            Clear
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
