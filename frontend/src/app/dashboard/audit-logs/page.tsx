'use client'

import React, { useState, useEffect } from 'react';
import { FileText, Download, Filter, Search, X } from 'lucide-react';
import { api } from '@/lib/api';

interface AuditLog {
    id: string;
    user_email: string;
    user_name: string;
    action_type: string;
    action_category: string;
    description: string;
    status: string;
    ip_address: string;
    created_at: string;
}

export default function AuditLogsPage() {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(0);
    const [limit] = useState(50);
    const [filters, setFilters] = useState({
        action_category: '',
        status: '',
        search: ''
    });
    const [showFilters, setShowFilters] = useState(false);

    useEffect(() => {
        fetchLogs();
    }, [page, filters]);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const params: any = {
                limit,
                offset: page * limit
            };

            if (filters.action_category) params.action_category = filters.action_category;
            if (filters.status) params.status = filters.status;

            const response = await api.get('/admin/audit-logs', { params });
            setLogs(response.data.logs);
            setTotal(response.data.total);
        } catch (error) {
            console.error('Failed to fetch logs:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleExport = async () => {
        try {
            const params: any = {};
            if (filters.action_category) params.action_category = filters.action_category;
            if (filters.status) params.status = filters.status;

            const response = await api.get('/admin/audit-logs/export', {
                params,
                responseType: 'blob'
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `audit_logs_${Date.now()}.csv`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error('Failed to export logs:', error);
            alert('Failed to export logs');
        }
    };

    const filteredLogs = logs.filter(log => {
        if (!filters.search) return true;
        const search = filters.search.toLowerCase();
        return (
            log.description.toLowerCase().includes(search) ||
            log.user_email?.toLowerCase().includes(search) ||
            log.action_type.toLowerCase().includes(search)
        );
    });

    const totalPages = Math.ceil(total / limit);

    const getCategoryColor = (category: string) => {
        const colors: any = {
            user: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
            bot: 'bg-green-500/10 text-green-400 border border-green-500/20',
            reminder: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
            system: 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20',
            api: 'bg-pink-500/10 text-pink-400 border border-pink-500/20',
            settings: 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
        };
        return colors[category] || 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20';
    };

    const getStatusColor = (status: string) => {
        const colors: any = {
            success: 'bg-green-500/10 text-green-400 border border-green-500/20',
            failed: 'bg-red-500/10 text-red-400 border border-red-500/20',
            warning: 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
        };
        return colors[status] || 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20';
    };

    if (loading && logs.length === 0) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-zinc-100">Audit Logs</h1>
                    <p className="text-zinc-500 mt-1">Track all system activity and user actions</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className="flex items-center gap-2 px-4 py-2 bg-zinc-800 text-zinc-100 rounded-lg hover:bg-zinc-700 border border-zinc-700 transition-colors"
                    >
                        <Filter size={18} />
                        Filters
                    </button>
                    <button
                        onClick={handleExport}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all"
                    >
                        <Download size={18} />
                        Export CSV
                    </button>
                </div>
            </div>

            {/* Filters */}
            {showFilters && (
                <div className="bg-zinc-900 rounded-lg p-4 mb-6 border border-zinc-800">
                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-zinc-300 mb-2">Category</label>
                            <select
                                value={filters.action_category}
                                onChange={(e) => setFilters({ ...filters, action_category: e.target.value })}
                                className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-100 focus:outline-none focus:border-purple-500"
                            >
                                <option value="">All Categories</option>
                                <option value="user">User</option>
                                <option value="bot">Bot</option>
                                <option value="reminder">Reminder</option>
                                <option value="system">System</option>
                                <option value="api">API</option>
                                <option value="settings">Settings</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-zinc-300 mb-2">Status</label>
                            <select
                                value={filters.status}
                                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                                className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-100 focus:outline-none focus:border-purple-500"
                            >
                                <option value="">All Status</option>
                                <option value="success">Success</option>
                                <option value="failed">Failed</option>
                                <option value="warning">Warning</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-zinc-300 mb-2">Search</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={filters.search}
                                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                                    placeholder="Search logs..."
                                    className="w-full px-4 py-2 pl-10 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-100 focus:outline-none focus:border-purple-500"
                                />
                                <Search size={18} className="absolute left-3 top-2.5 text-zinc-500" />
                                {filters.search && (
                                    <button
                                        onClick={() => setFilters({ ...filters, search: '' })}
                                        className="absolute right-3 top-2.5 text-zinc-500 hover:text-zinc-100"
                                    >
                                        <X size={18} />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="bg-zinc-900 rounded-lg p-4 border border-zinc-800">
                    <p className="text-sm text-zinc-500">Total Logs</p>
                    <p className="text-2xl font-bold text-zinc-100 mt-1">{total.toLocaleString()}</p>
                </div>
                <div className="bg-zinc-900 rounded-lg p-4 border border-zinc-800">
                    <p className="text-sm text-zinc-500">Success Rate</p>
                    <p className="text-2xl font-bold text-green-400 mt-1">
                        {logs.length > 0 ? Math.round((logs.filter(l => l.status === 'success').length / logs.length) * 100) : 0}%
                    </p>
                </div>
                <div className="bg-zinc-900 rounded-lg p-4 border border-zinc-800">
                    <p className="text-sm text-zinc-500">Failed</p>
                    <p className="text-2xl font-bold text-red-400 mt-1">
                        {logs.filter(l => l.status === 'failed').length}
                    </p>
                </div>
                <div className="bg-zinc-900 rounded-lg p-4 border border-zinc-800">
                    <p className="text-sm text-zinc-500">Current Page</p>
                    <p className="text-2xl font-bold text-zinc-100 mt-1">{page + 1} / {totalPages}</p>
                </div>
            </div>

            {/* Logs Table */}
            {filteredLogs.length === 0 ? (
                <div className="text-center py-12 bg-zinc-900 rounded-lg border border-zinc-800">
                    <FileText size={48} className="mx-auto text-zinc-600 mb-4" />
                    <p className="text-zinc-500">No logs found</p>
                </div>
            ) : (
                <div className="bg-zinc-900 rounded-lg overflow-hidden border border-zinc-800">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-zinc-950">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">Time</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">User</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">Action</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">Category</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">Description</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">Status</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">IP</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800">
                                {filteredLogs.map((log) => (
                                    <tr key={log.id} className="hover:bg-zinc-800/50 transition-colors">
                                        <td className="px-4 py-3 text-sm text-zinc-300">
                                            {new Date(log.created_at).toLocaleString()}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-zinc-300">
                                            <div>
                                                <p className="font-medium">{log.user_name || 'System'}</p>
                                                <p className="text-xs text-zinc-600">{log.user_email || '-'}</p>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-sm">
                                            <code className="text-xs bg-zinc-950 px-2 py-1 rounded text-purple-400 border border-zinc-800">
                                                {log.action_type}
                                            </code>
                                        </td>
                                        <td className="px-4 py-3 text-sm">
                                            <span className={`px-2 py-1 rounded text-xs ${getCategoryColor(log.action_category)}`}>
                                                {log.action_category}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-zinc-300 max-w-md truncate">
                                            {log.description}
                                        </td>
                                        <td className="px-4 py-3 text-sm">
                                            <span className={`px-2 py-1 rounded text-xs ${getStatusColor(log.status)}`}>
                                                {log.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-zinc-600">
                                            {log.ip_address || '-'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    <div className="bg-zinc-950 px-4 py-3 flex items-center justify-between border-t border-zinc-800">
                        <div className="text-sm text-zinc-500">
                            Showing {page * limit + 1} to {Math.min((page + 1) * limit, total)} of {total} logs
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setPage(Math.max(0, page - 1))}
                                disabled={page === 0}
                                className="px-4 py-2 bg-zinc-800 text-zinc-100 rounded-lg hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed border border-zinc-700 transition-colors"
                            >
                                Previous
                            </button>
                            <button
                                onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                                disabled={page >= totalPages - 1}
                                className="px-4 py-2 bg-zinc-800 text-zinc-100 rounded-lg hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed border border-zinc-700 transition-colors"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
