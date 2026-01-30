'use client'

import React, { useState, useEffect, useCallback } from 'react';
import {
    FileText, Download, Filter, Search, X, RefreshCw,
    ChevronDown, Eye, Shield, User, Bot,
    Bell, Settings, Key, AlertTriangle, CheckCircle,
    XCircle, Clock, Activity, TrendingUp, Hash, ChevronLeft, ChevronRight, Calendar
} from 'lucide-react';
import { api } from '@/lib/api';

interface AuditLog {
    id: string;
    user_id: string;
    user_email: string;
    user_name: string;
    action_type: string;
    action_category: string;
    description: string;
    metadata: any;
    status: string;
    ip_address: string;
    user_agent: string;
    created_at: string;
}

interface AuditLogDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    log: AuditLog | null;
}

// KPI Card Component - Same as Analytics
interface KPICardProps {
    title: string;
    value: number | string;
    icon: React.ReactNode;
    loading?: boolean;
    color?: string;
}

function KPICard({ title, value, icon, loading, color = 'text-zinc-900 dark:text-zinc-100' }: KPICardProps) {
    return (
        <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-900 rounded-xl p-6 relative overflow-hidden group hover:border-zinc-300 dark:hover:border-zinc-800 transition-colors shadow-sm dark:shadow-none">
            <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-zinc-100 dark:bg-zinc-900 rounded-lg text-zinc-700 dark:text-zinc-100 group-hover:bg-zinc-200 dark:group-hover:bg-zinc-800 transition-colors">
                    {icon}
                </div>
            </div>

            <div className="space-y-1">
                {loading ? (
                    <div className="h-8 w-24 bg-zinc-200 dark:bg-zinc-900 rounded animate-pulse" />
                ) : (
                    <h3 className={`text-3xl font-bold tracking-tight ${color} transition-all duration-500 ease-out`}>
                        {typeof value === 'number' ? value.toLocaleString() : value}
                    </h3>
                )}
                <p className="text-sm text-zinc-500 font-medium">{title}</p>
            </div>
        </div>
    )
}

function AuditLogDetailModal({ isOpen, onClose, log }: AuditLogDetailModalProps) {
    if (!isOpen || !log) return null;

    const getCategoryIcon = (category: string) => {
        switch (category) {
            case 'user': return <User size={18} />;
            case 'bot': return <Bot size={18} />;
            case 'reminder': return <Bell size={18} />;
            case 'system': return <Settings size={18} />;
            case 'api': return <Key size={18} />;
            case 'settings': return <Settings size={18} />;
            default: return <Activity size={18} />;
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'success': return <CheckCircle size={16} className="text-emerald-500" />;
            case 'failed': return <XCircle size={16} className="text-red-500" />;
            case 'warning': return <AlertTriangle size={16} className="text-amber-500" />;
            default: return <Activity size={16} className="text-zinc-400" />;
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center transition-all duration-300">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-2xl mx-4 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-900 rounded-xl shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800/50">
                    <div>
                        <h3 className="text-lg font-medium text-zinc-800 dark:text-zinc-200">Log Detail</h3>
                        <p className="text-xs text-zinc-500">ID: {log.id.slice(0, 8)}...</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-lg transition-all"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 max-h-[60vh] overflow-y-auto space-y-4">
                    {/* Status & Category */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-zinc-100 dark:bg-zinc-900/50 rounded-xl border border-zinc-200 dark:border-zinc-800/50">
                            <div className="flex items-center gap-2 text-xs text-zinc-500 uppercase tracking-wider mb-2">
                                <Hash size={12} />
                                Status
                            </div>
                            <div className="flex items-center gap-2">
                                {getStatusIcon(log.status)}
                                <span className={`text-sm font-medium capitalize ${log.status === 'success' ? 'text-emerald-500' :
                                        log.status === 'failed' ? 'text-red-500' :
                                            log.status === 'warning' ? 'text-amber-500' : 'text-zinc-400'
                                    }`}>
                                    {log.status}
                                </span>
                            </div>
                        </div>
                        <div className="p-4 bg-zinc-100 dark:bg-zinc-900/50 rounded-xl border border-zinc-200 dark:border-zinc-800/50">
                            <div className="flex items-center gap-2 text-xs text-zinc-500 uppercase tracking-wider mb-2">
                                <Activity size={12} />
                                Category
                            </div>
                            <div className="flex items-center gap-2 text-blue-500">
                                {getCategoryIcon(log.action_category)}
                                <span className="text-sm font-medium capitalize">{log.action_category}</span>
                            </div>
                        </div>
                    </div>

                    {/* Action Type */}
                    <div className="p-4 bg-zinc-100 dark:bg-zinc-900/50 rounded-xl border border-zinc-200 dark:border-zinc-800/50">
                        <div className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Action Type</div>
                        <code className="text-sm text-blue-400 font-mono bg-blue-500/10 px-3 py-1.5 rounded-lg border border-blue-500/20">
                            {log.action_type}
                        </code>
                    </div>

                    {/* Description */}
                    <div className="p-4 bg-zinc-100 dark:bg-zinc-900/50 rounded-xl border border-zinc-200 dark:border-zinc-800/50">
                        <div className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Description</div>
                        <p className="text-sm text-zinc-800 dark:text-zinc-200 leading-relaxed">{log.description}</p>
                    </div>

                    {/* User Info */}
                    <div className="p-4 bg-zinc-100 dark:bg-zinc-900/50 rounded-xl border border-zinc-200 dark:border-zinc-800/50">
                        <div className="flex items-center gap-2 text-xs text-zinc-500 uppercase tracking-wider mb-3">
                            <User size={12} />
                            User Information
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <span className="text-zinc-500">Name:</span>
                                <p className="text-zinc-800 dark:text-zinc-200 font-medium">{log.user_name || 'System'}</p>
                            </div>
                            <div>
                                <span className="text-zinc-500">Email:</span>
                                <p className="text-zinc-800 dark:text-zinc-200 font-medium">{log.user_email || '-'}</p>
                            </div>
                        </div>
                    </div>

                    {/* Technical Details */}
                    <div className="p-4 bg-zinc-100 dark:bg-zinc-900/50 rounded-xl border border-zinc-200 dark:border-zinc-800/50">
                        <div className="flex items-center gap-2 text-xs text-zinc-500 uppercase tracking-wider mb-3">
                            <Settings size={12} />
                            Technical Details
                        </div>
                        <div className="space-y-3 text-sm">
                            <div className="flex items-center justify-between">
                                <span className="text-zinc-500">Timestamp:</span>
                                <span className="text-zinc-300 font-mono text-xs">
                                    {new Date(log.created_at).toLocaleString('id-ID', {
                                        dateStyle: 'long',
                                        timeStyle: 'medium'
                                    })}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-zinc-500">IP Address:</span>
                                <span className="text-zinc-300 font-mono">{log.ip_address || '-'}</span>
                            </div>
                            {log.user_agent && (
                                <div>
                                    <span className="text-zinc-500 block mb-1">User Agent:</span>
                                    <p className="text-zinc-400 text-xs font-mono bg-zinc-900 p-2 rounded-lg break-all">
                                        {log.user_agent}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Metadata */}
                    {log.metadata && Object.keys(log.metadata).length > 0 && (
                        <div className="p-4 bg-zinc-100 dark:bg-zinc-900/50 rounded-xl border border-zinc-200 dark:border-zinc-800/50">
                            <div className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Additional Data</div>
                            <pre className="text-xs text-zinc-400 font-mono bg-zinc-900 p-3 rounded-lg overflow-x-auto">
                                {JSON.stringify(log.metadata, null, 2)}
                            </pre>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-zinc-200 dark:border-zinc-800/50 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-5 py-2 bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-medium rounded-lg text-sm transition-colors border border-zinc-200 dark:border-zinc-800"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function AuditLogsPage() {
    const [mounted, setMounted] = useState(false);
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [isTransitioning, setIsTransitioning] = useState(false);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(0);
    const [limit] = useState(25);
    const [filters, setFilters] = useState({
        action_category: '',
        status: '',
        search: '',
        date_from: '',
        date_to: ''
    });
    const [showFilters, setShowFilters] = useState(false);
    const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [timeRange, setTimeRange] = useState('24h');
    const [showTimeDropdown, setShowTimeDropdown] = useState(false);
    const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);
    const [customDateRange, setCustomDateRange] = useState<{ from: Date | null, to: Date | null }>({ from: null, to: null });
    const [selectingDate, setSelectingDate] = useState<'from' | 'to'>('from');
    const [calendarMonth, setCalendarMonth] = useState(new Date());
    const [showCalendarPopup, setShowCalendarPopup] = useState(false);
    const [showTimePopup, setShowTimePopup] = useState<'from' | 'to' | null>(null);
    const [customTime, setCustomTime] = useState<{ from: string, to: string }>({ from: '00:00', to: '23:59' });

    useEffect(() => {
        setMounted(true);
    }, []);

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (!target.closest('[data-dropdown="time"]')) {
                setShowTimeDropdown(false);
            }
        };
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    const fetchLogs = useCallback(async (isRefresh = false) => {
        // Start transition - fade out current content
        setIsTransitioning(true);
        
        if (isRefresh) setRefreshing(true);
        else setLoading(true);

        // Small delay to allow fade out animation
        await new Promise(resolve => setTimeout(resolve, 150));

        try {
            const params: any = {
                limit,
                offset: page * limit
            };

            if (filters.action_category) params.action_category = filters.action_category;
            if (filters.status) params.status = filters.status;
            
            // Calculate date range based on timeRange selection
            if (timeRange === 'custom' && customDateRange.from && customDateRange.to) {
                params.start_date = customDateRange.from.toISOString();
                params.end_date = customDateRange.to.toISOString();
            } else if (timeRange !== 'all') {
                const now = new Date();
                let fromDate = new Date();
                
                switch (timeRange) {
                    case '30m':
                        fromDate = new Date(now.getTime() - 30 * 60 * 1000);
                        break;
                    case '24h':
                        fromDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
                        break;
                    case '7d':
                        fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                        break;
                    case '30d':
                        fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                        break;
                }
                
                params.start_date = fromDate.toISOString();
                params.end_date = now.toISOString();
            }

            const response = await api.get('/admin/audit-logs', { params });
            setLogs(response.data.logs || []);
            setTotal(response.data.total || 0);
        } catch (error) {
            console.error('Failed to fetch logs:', error);
            setLogs([]);
        } finally {
            setLoading(false);
            setRefreshing(false);
            // End transition - fade in new content
            setTimeout(() => setIsTransitioning(false), 50);
        }
    }, [page, filters, limit, timeRange, customDateRange]);

    useEffect(() => {
        if (!mounted) return;
        fetchLogs();
    }, [mounted, fetchLogs]);

    const handleExport = async () => {
        try {
            const params: any = {};
            if (filters.action_category) params.action_category = filters.action_category;
            if (filters.status) params.status = filters.status;
            
            // Calculate date range based on timeRange selection
            if (timeRange === 'custom' && customDateRange.from && customDateRange.to) {
                params.start_date = customDateRange.from.toISOString();
                params.end_date = customDateRange.to.toISOString();
            } else if (timeRange !== 'all') {
                const now = new Date();
                let fromDate = new Date();
                
                switch (timeRange) {
                    case '30m':
                        fromDate = new Date(now.getTime() - 30 * 60 * 1000);
                        break;
                    case '24h':
                        fromDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
                        break;
                    case '7d':
                        fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                        break;
                    case '30d':
                        fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                        break;
                }
                
                params.start_date = fromDate.toISOString();
                params.end_date = now.toISOString();
            }

            const response = await api.get('/admin/audit-logs/export', {
                params,
                responseType: 'blob'
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `audit_logs_${new Date().toISOString().split('T')[0]}.csv`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error('Failed to export logs:', error);
        }
    };

    const handleClearFilters = () => {
        setFilters({
            action_category: '',
            status: '',
            search: '',
            date_from: '',
            date_to: ''
        });
        setTimeRange('24h');
        setCustomDateRange({ from: null, to: null });
        setPage(0);
    };

    const handleViewDetail = (log: AuditLog) => {
        setSelectedLog(log);
        setShowDetailModal(true);
    };

    const filteredLogs = logs.filter(log => {
        if (!filters.search) return true;
        const search = filters.search.toLowerCase();
        return (
            log.description?.toLowerCase().includes(search) ||
            log.user_email?.toLowerCase().includes(search) ||
            log.action_type?.toLowerCase().includes(search) ||
            log.user_name?.toLowerCase().includes(search)
        );
    });

    const totalPages = Math.ceil(total / limit);
    const hasActiveFilters = filters.action_category || filters.status || filters.search || timeRange !== '24h';

    const getCategoryIcon = (category: string) => {
        switch (category) {
            case 'user': return <User size={14} />;
            case 'bot': return <Bot size={14} />;
            case 'reminder': return <Bell size={14} />;
            case 'system': return <Settings size={14} />;
            case 'api': return <Key size={14} />;
            case 'settings': return <Settings size={14} />;
            default: return <Activity size={14} />;
        }
    };

    const getCategoryColor = (category: string) => {
        const colors: any = {
            user: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
            bot: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
            reminder: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
            system: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
            api: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
            settings: 'bg-orange-500/10 text-orange-400 border-orange-500/20'
        };
        return colors[category] || 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';
    };

    const getStatusColor = (status: string) => {
        const colors: any = {
            success: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
            failed: 'bg-red-500/10 text-red-500 border-red-500/20',
            warning: 'bg-amber-500/10 text-amber-500 border-amber-500/20'
        };
        return colors[status] || 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'success': return <CheckCircle size={12} />;
            case 'failed': return <XCircle size={12} />;
            case 'warning': return <AlertTriangle size={12} />;
            default: return <Activity size={12} />;
        }
    };

    // Calculate stats
    const successCount = logs.filter(l => l.status === 'success').length;
    const failedCount = logs.filter(l => l.status === 'failed').length;
    const warningCount = logs.filter(l => l.status === 'warning').length;
    const successRate = logs.length > 0 ? Math.round((successCount / logs.length) * 100) : 0;

    if (!mounted) return null;

    if (loading && logs.length === 0) {
        return (
            <div className="p-8 min-h-screen bg-zinc-50 dark:bg-black">
                <div className="flex items-center justify-center h-64">
                    <div className="flex flex-col items-center gap-3">
                        <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-500 border-t-transparent"></div>
                        <p className="text-zinc-600 text-sm">Loading audit logs...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-8 space-y-8 min-h-screen bg-zinc-50 dark:bg-black text-zinc-900 dark:text-zinc-100 font-sans">
            {/* Header - Same style as Analytics */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white mb-1">
                        Audit Logs
                    </h1>
                    <p className="text-zinc-500 text-sm">
                        Track all system activity and user actions
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {/* Category Filter Dropdown */}
                    <div className="relative">
                        <button
                            onClick={() => {
                                const dropdown = document.getElementById('audit-category-dropdown')
                                if (dropdown) {
                                    dropdown.classList.toggle('hidden')
                                }
                            }}
                            onBlur={(e) => {
                                setTimeout(() => {
                                    const dropdown = document.getElementById('audit-category-dropdown')
                                    if (dropdown && !dropdown.contains(e.relatedTarget as Node)) {
                                        dropdown.classList.add('hidden')
                                    }
                                }, 150)
                            }}
                            className="inline-flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800/50 rounded-lg text-xs font-medium text-zinc-900 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 transition-all"
                        >
                            <Filter className="w-3.5 h-3.5 text-blue-500" />
                            <span>
                                {filters.action_category ? filters.action_category.charAt(0).toUpperCase() + filters.action_category.slice(1) : 'All Categories'}
                            </span>
                            <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
                        </button>

                        <div
                            id="audit-category-dropdown"
                            className="hidden absolute top-full right-0 mt-2 w-40 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl z-50 overflow-hidden py-1"
                        >
                            {[
                                { label: 'All Categories', value: '' },
                                { label: 'User', value: 'user' },
                                { label: 'Bot', value: 'bot' },
                                { label: 'Reminder', value: 'reminder' },
                                { label: 'System', value: 'system' },
                                { label: 'API', value: 'api' },
                                { label: 'Settings', value: 'settings' }
                            ].map((option) => (
                                <button
                                    key={option.value}
                                    onClick={() => {
                                        setFilters({ ...filters, action_category: option.value })
                                        setPage(0)
                                        document.getElementById('audit-category-dropdown')?.classList.add('hidden')
                                    }}
                                    className={`w-full text-left px-4 py-2 text-xs hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors ${filters.action_category === option.value ? 'text-blue-500 bg-blue-50 dark:bg-blue-400/5' : 'text-zinc-600 dark:text-zinc-400'}`}
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Status Filter Dropdown */}
                    <div className="relative">
                        <button
                            onClick={() => {
                                const dropdown = document.getElementById('audit-status-dropdown')
                                if (dropdown) {
                                    dropdown.classList.toggle('hidden')
                                }
                            }}
                            onBlur={(e) => {
                                setTimeout(() => {
                                    const dropdown = document.getElementById('audit-status-dropdown')
                                    if (dropdown && !dropdown.contains(e.relatedTarget as Node)) {
                                        dropdown.classList.add('hidden')
                                    }
                                }, 150)
                            }}
                            className="inline-flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800/50 rounded-lg text-xs font-medium text-zinc-900 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 transition-all"
                        >
                            <span>
                                {filters.status ? filters.status.charAt(0).toUpperCase() + filters.status.slice(1) : 'All Status'}
                            </span>
                            <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
                        </button>

                        <div
                            id="audit-status-dropdown"
                            className="hidden absolute top-full right-0 mt-2 w-32 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-lg overflow-hidden z-20"
                        >
                            {[
                                { label: 'All Status', value: '' },
                                { label: 'Success', value: 'success' },
                                { label: 'Failed', value: 'failed' },
                                { label: 'Warning', value: 'warning' }
                            ].map((option) => (
                                <button
                                    key={option.value}
                                    onClick={() => {
                                        setFilters({ ...filters, status: option.value })
                                        setPage(0)
                                        document.getElementById('audit-status-dropdown')?.classList.add('hidden')
                                    }}
                                    className={`w-full px-4 py-2 text-xs text-left transition-colors ${filters.status === option.value
                                        ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100'
                                        : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 hover:text-zinc-900 dark:hover:text-zinc-200'
                                        }`}
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Time Range Filter Dropdown */}
                    <div className="relative" data-dropdown="time">
                        <button
                            onClick={() => setShowTimeDropdown(!showTimeDropdown)}
                            className="inline-flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800/50 rounded-lg text-xs font-medium text-zinc-900 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 transition-all"
                        >
                            <Clock className="w-3.5 h-3.5 text-blue-500" />
                            <span>
                                {timeRange === '30m' ? 'Last 30m' :
                                 timeRange === '24h' ? 'Last 24h' :
                                 timeRange === '7d' ? 'Last 7d' :
                                 timeRange === '30d' ? 'Last 30d' :
                                 timeRange === 'custom' ? 'Custom' : 'All Time'}
                            </span>
                            <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
                        </button>

                        {showTimeDropdown && (
                            <div className="absolute top-full right-0 mt-2 w-36 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl z-50 overflow-hidden py-1">
                                {[
                                    { label: 'Last 30m', value: '30m' },
                                    { label: 'Last 24h', value: '24h' },
                                    { label: 'Last 7d', value: '7d' },
                                    { label: 'Last 30d', value: '30d' },
                                    { label: 'Custom', value: 'custom' },
                                ].map((option) => (
                                    <button
                                        key={option.value}
                                        onClick={() => {
                                            if (option.value === 'custom') {
                                                setShowCustomDatePicker(true);
                                            }
                                            setTimeRange(option.value);
                                            setShowTimeDropdown(false);
                                            setPage(0);
                                        }}
                                        className={`w-full text-left px-4 py-2 text-xs hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors ${timeRange === option.value ? 'text-blue-500 bg-blue-50 dark:bg-blue-400/5' : 'text-zinc-600 dark:text-zinc-400'}`}
                                    >
                                        {option.label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Refresh Button */}
                    <button
                        onClick={() => fetchLogs(true)}
                        disabled={refreshing || isTransitioning}
                        className={`p-2 bg-white dark:bg-zinc-900 border rounded-lg transition-all duration-300 ${
                            refreshing || isTransitioning 
                                ? 'border-blue-500/50 text-blue-500 dark:text-blue-400' 
                                : 'border-zinc-200 dark:border-zinc-800/50 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:border-zinc-300 dark:hover:border-zinc-700'
                        } disabled:cursor-not-allowed`}
                        title="Refresh logs"
                    >
                        <RefreshCw className={`w-4 h-4 transition-transform duration-700 ${refreshing || isTransitioning ? 'animate-spin' : ''}`} />
                    </button>

                    {/* Export Button */}
                    <button
                        onClick={handleExport}
                        className="p-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/50 rounded-lg text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
                    >
                        <Download className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* KPI Grid - Same style as Analytics */}
            <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 transition-all duration-300 ease-in-out ${isTransitioning ? 'opacity-40 scale-[0.99]' : 'opacity-100 scale-100'}`}>
                <KPICard
                    title="Total Logs"
                    value={total}
                    icon={<FileText className="w-5 h-5" />}
                    loading={loading}
                />
                <KPICard
                    title="Success Rate"
                    value={`${successRate}%`}
                    icon={<TrendingUp className="w-5 h-5" />}
                    loading={loading}
                    color="text-emerald-500"
                />
                <KPICard
                    title="Failed Actions"
                    value={failedCount}
                    icon={<XCircle className="w-5 h-5" />}
                    loading={loading}
                    color="text-red-500"
                />
                <KPICard
                    title="Warnings"
                    value={warningCount}
                    icon={<AlertTriangle className="w-5 h-5" />}
                    loading={loading}
                    color="text-amber-500"
                />
            </div>

            {/* Search Bar - REMOVED, replaced with time filter in header */}

            {/* Logs Table - Same style as Analytics */}
            <div className={`bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-900 rounded-xl overflow-hidden shadow-sm dark:shadow-none transition-all duration-300 ease-in-out ${isTransitioning ? 'opacity-40 scale-[0.995]' : 'opacity-100 scale-100'}`}>
                <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800/50 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <h3 className="text-lg font-medium text-zinc-800 dark:text-zinc-200">Activity Log</h3>
                        {(refreshing || isTransitioning) && (
                            <div className="flex items-center gap-2 text-xs text-blue-400">
                                <div className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                                <span>Loading...</span>
                            </div>
                        )}
                    </div>
                    <div className={`text-xs text-zinc-500 transition-opacity duration-300 ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}>
                        {filteredLogs.length} of {total} logs
                    </div>
                </div>

                {filteredLogs.length === 0 ? (
                    <div className="text-center py-16">
                        <div className="p-4 rounded-full bg-zinc-900/50 w-fit mx-auto mb-4">
                            <FileText size={32} className="text-zinc-600" />
                        </div>
                        <h3 className="text-lg font-medium text-zinc-800 dark:text-zinc-300 mb-1">No logs found</h3>
                        <p className="text-zinc-500 text-sm">
                            {hasActiveFilters ? 'Try adjusting your filters' : 'Activity logs will appear here'}
                        </p>
                        {hasActiveFilters && (
                            <button
                                onClick={handleClearFilters}
                                className="mt-4 text-sm text-blue-400 hover:text-blue-300"
                            >
                                Clear filters
                            </button>
                        )}
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full table-fixed">
                                <thead>
                                    <tr className="border-b border-zinc-200 dark:border-zinc-800/50">
                                        <th className="text-left py-3 px-4 text-sm font-medium text-zinc-600 dark:text-zinc-400 w-[80px]">Time</th>
                                        <th className="text-left py-3 px-4 text-sm font-medium text-zinc-600 dark:text-zinc-400 w-[180px]">User</th>
                                        <th className="text-left py-3 px-4 text-sm font-medium text-zinc-600 dark:text-zinc-400 w-[120px]">Action</th>
                                        <th className="text-left py-3 px-4 text-sm font-medium text-zinc-600 dark:text-zinc-400 w-[100px]">Category</th>
                                        <th className="text-left py-3 px-4 text-sm font-medium text-zinc-600 dark:text-zinc-400">Description</th>
                                        <th className="text-left py-3 px-4 text-sm font-medium text-zinc-600 dark:text-zinc-400 w-[100px]">Status</th>
                                        <th className="text-right py-3 px-4 text-sm font-medium text-zinc-600 dark:text-zinc-400 w-[60px]">Details</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredLogs.map((log, index) => (
                                        <tr 
                                            key={log.id} 
                                            className="border-b border-zinc-200 dark:border-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-900/50 transition-colors duration-150"
                                        >
                                            <td className="py-4 px-4 w-[80px]">
                                                <div className="text-zinc-300 font-mono text-xs">
                                                    {new Date(log.created_at).toLocaleDateString('id-ID', {
                                                        day: '2-digit',
                                                        month: 'short'
                                                    })}
                                                </div>
                                                <div className="text-zinc-500 font-mono text-xs">
                                                    {new Date(log.created_at).toLocaleTimeString('id-ID', {
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                </div>
                                            </td>
                                            <td className="py-4 px-4 w-[180px]">
                                                <p className="font-medium text-zinc-900 dark:text-white truncate">{log.user_name || 'System'}</p>
                                                <p className="text-xs text-zinc-500 truncate">{log.user_email || '-'}</p>
                                            </td>
                                            <td className="py-4 px-4 w-[120px]">
                                                <code className="text-xs bg-zinc-100 dark:bg-zinc-900 px-2 py-1 rounded text-blue-500 dark:text-blue-400 font-mono truncate block max-w-full">
                                                    {log.action_type}
                                                </code>
                                            </td>
                                            <td className="py-4 px-4 w-[100px]">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border ${getCategoryColor(log.action_category)} capitalize`}>
                                                    {getCategoryIcon(log.action_category)}
                                                    {log.action_category}
                                                </span>
                                            </td>
                                            <td className="py-4 px-4">
                                                <p className="text-sm text-zinc-700 dark:text-zinc-300 truncate" title={log.description}>
                                                    {log.description}
                                                </p>
                                            </td>
                                            <td className="py-4 px-4 w-[100px]">
                                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border ${getStatusColor(log.status)} capitalize`}>
                                                    {getStatusIcon(log.status)}
                                                    {log.status}
                                                </span>
                                            </td>
                                            <td className="py-4 px-4 text-right w-[60px]">
                                                <button
                                                    onClick={() => handleViewDetail(log)}
                                                    className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/30 hover:bg-blue-500/20 transition-all flex items-center justify-center text-blue-400 ml-auto"
                                                    title="View Details"
                                                >
                                                    <Eye size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        <div className="px-6 py-4 border-t border-zinc-200 dark:border-zinc-800/50 flex flex-col sm:flex-row items-center justify-between gap-3">
                            <div className="text-sm text-zinc-500">
                                Showing <span className="font-medium text-zinc-700 dark:text-zinc-300">{page * limit + 1}</span> to{' '}
                                <span className="font-medium text-zinc-700 dark:text-zinc-300">{Math.min((page + 1) * limit, total)}</span> of{' '}
                                <span className="font-medium text-zinc-700 dark:text-zinc-300">{total}</span> logs
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setPage(0)}
                                    disabled={page === 0}
                                    className="px-3 py-1.5 text-xs bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed border border-zinc-200 dark:border-zinc-800 transition-colors"
                                >
                                    First
                                </button>
                                <button
                                    onClick={() => setPage(Math.max(0, page - 1))}
                                    disabled={page === 0}
                                    className="px-3 py-1.5 text-xs bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed border border-zinc-200 dark:border-zinc-800 transition-colors"
                                >
                                    Prev
                                </button>
                                <span className="px-3 py-1.5 text-xs text-zinc-500">
                                    {page + 1} / {totalPages || 1}
                                </span>
                                <button
                                    onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                                    disabled={page >= totalPages - 1}
                                    className="px-3 py-1.5 text-xs bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed border border-zinc-200 dark:border-zinc-800 transition-colors"
                                >
                                    Next
                                </button>
                                <button
                                    onClick={() => setPage(totalPages - 1)}
                                    disabled={page >= totalPages - 1}
                                    className="px-3 py-1.5 text-xs bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed border border-zinc-200 dark:border-zinc-800 transition-colors"
                                >
                                    Last
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Detail Modal */}
            <AuditLogDetailModal
                isOpen={showDetailModal}
                onClose={() => setShowDetailModal(false)}
                log={selectedLog}
            />

            {/* Custom Date Range Picker Modal */}
            {showCustomDatePicker && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => { setShowCustomDatePicker(false); setShowCalendarPopup(false); setShowTimePopup(null); }} />
                    <div className="relative bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl p-6 w-full max-w-md">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-500/10 rounded-lg">
                                    <Calendar className="w-5 h-5 text-blue-400" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-white">Custom Date Range</h3>
                                    <p className="text-xs text-zinc-500">Select date and time range</p>
                                </div>
                            </div>
                            <button onClick={() => { setShowCustomDatePicker(false); setShowCalendarPopup(false); setShowTimePopup(null); }} className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-500 hover:text-white transition-all">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* From Date/Time Section */}
                        <div className="space-y-4 mb-4">
                            <div className="p-4 bg-zinc-100 dark:bg-zinc-900/50 rounded-xl border border-zinc-200 dark:border-zinc-800/50">
                                <p className="text-xs text-zinc-500 uppercase tracking-wider mb-3 font-medium">From</p>
                                <div className="grid grid-cols-2 gap-3">
                                    {/* Date Picker Button */}
                                    <div className="relative">
                                        <button
                                            onClick={() => { setSelectingDate('from'); setShowCalendarPopup(!showCalendarPopup || selectingDate !== 'from'); setShowTimePopup(null); }}
                                            className={`flex items-center gap-2 p-3 bg-zinc-900 border rounded-lg hover:border-blue-500/50 transition-all text-left w-full ${showCalendarPopup && selectingDate === 'from' ? 'border-blue-500' : 'border-zinc-800'}`}
                                        >
                                            <Calendar className="w-4 h-4 text-blue-400" />
                                            <div>
                                                <p className="text-[10px] text-zinc-500 uppercase">Date</p>
                                                <p className="text-sm text-white font-medium">
                                                    {customDateRange.from ? customDateRange.from.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Select date'}
                                                </p>
                                            </div>
                                        </button>
                                        
                                        {/* Calendar Popup for From */}
                                        {showCalendarPopup && selectingDate === 'from' && (
                                            <div className="absolute top-full left-0 mt-2 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl p-4 w-72 z-50">
                                                <div className="flex items-center justify-between mb-4">
                                                    <button
                                                        onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1))}
                                                        className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-all"
                                                    >
                                                        <ChevronLeft className="w-4 h-4" />
                                                    </button>
                                                    <span className="text-sm font-medium text-white">
                                                        {calendarMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                                                    </span>
                                                    <button
                                                        onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1))}
                                                        className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-all"
                                                    >
                                                        <ChevronRight className="w-4 h-4" />
                                                    </button>
                                                </div>

                                                <div className="grid grid-cols-7 gap-1 mb-2">
                                                    {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                                                        <div key={day} className="text-center text-xs text-zinc-500 font-medium py-1">{day}</div>
                                                    ))}
                                                </div>

                                                <div className="grid grid-cols-7 gap-1">
                                                    {(() => {
                                                        const year = calendarMonth.getFullYear();
                                                        const month = calendarMonth.getMonth();
                                                        const firstDay = new Date(year, month, 1).getDay();
                                                        const daysInMonth = new Date(year, month + 1, 0).getDate();
                                                        const days = [];

                                                        for (let i = 0; i < firstDay; i++) {
                                                            days.push(<div key={`empty-${i}`} className="h-8" />);
                                                        }

                                                        for (let day = 1; day <= daysInMonth; day++) {
                                                            const date = new Date(year, month, day);
                                                            const isSelected = customDateRange.from?.toDateString() === date.toDateString();
                                                            const isToday = new Date().toDateString() === date.toDateString();

                                                            days.push(
                                                                <button
                                                                    key={day}
                                                                    onClick={() => {
                                                                        setCustomDateRange({ ...customDateRange, from: date });
                                                                        setShowCalendarPopup(false);
                                                                    }}
                                                                    className={`h-8 w-full rounded-lg text-sm font-medium transition-all ${
                                                                        isSelected 
                                                                            ? 'bg-blue-500 text-white' 
                                                                            : isToday
                                                                                ? 'bg-zinc-800 text-white'
                                                                                : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
                                                                    }`}
                                                                >
                                                                    {day}
                                                                </button>
                                                            );
                                                        }

                                                        return days;
                                                    })()}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    
                                    {/* Time Picker Button */}
                                    <div className="relative">
                                        <button
                                            onClick={() => { setShowTimePopup(showTimePopup === 'from' ? null : 'from'); setShowCalendarPopup(false); }}
                                            className={`flex items-center gap-2 p-3 bg-zinc-900 border rounded-lg hover:border-blue-500/50 transition-all text-left w-full ${showTimePopup === 'from' ? 'border-blue-500' : 'border-zinc-800'}`}
                                        >
                                            <Clock className="w-4 h-4 text-blue-400" />
                                            <div>
                                                <p className="text-[10px] text-zinc-500 uppercase">Time</p>
                                                <p className="text-sm text-white font-medium">{customTime.from}</p>
                                            </div>
                                        </button>
                                        
                                        {/* Time Picker Popup for From */}
                                        {showTimePopup === 'from' && (
                                            <div className="absolute top-full right-0 mt-2 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl p-3 w-36 z-50">
                                                <div className="max-h-48 overflow-y-auto space-y-0.5">
                                                    {(() => {
                                                        const times = [];
                                                        for (let h = 0; h < 24; h++) {
                                                            for (let m = 0; m < 60; m += 30) {
                                                                const time = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
                                                                const isSelected = customTime.from === time;
                                                                times.push(
                                                                    <button
                                                                        key={time}
                                                                        onClick={() => {
                                                                            setCustomTime({ ...customTime, from: time });
                                                                            setShowTimePopup(null);
                                                                        }}
                                                                        className={`w-full text-left px-3 py-1.5 rounded-lg text-sm font-mono transition-all ${
                                                                            isSelected 
                                                                                ? 'bg-blue-500 text-white' 
                                                                                : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
                                                                        }`}
                                                                    >
                                                                        {time}
                                                                    </button>
                                                                );
                                                            }
                                                        }
                                                        return times;
                                                    })()}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* To Date/Time Section */}
                            <div className="p-4 bg-zinc-100 dark:bg-zinc-900/50 rounded-xl border border-zinc-200 dark:border-zinc-800/50">
                                <p className="text-xs text-zinc-500 uppercase tracking-wider mb-3 font-medium">To</p>
                                <div className="grid grid-cols-2 gap-3">
                                    {/* Date Picker Button */}
                                    <div className="relative">
                                        <button
                                            onClick={() => { setSelectingDate('to'); setShowCalendarPopup(!showCalendarPopup || selectingDate !== 'to'); setShowTimePopup(null); }}
                                            className={`flex items-center gap-2 p-3 bg-zinc-900 border rounded-lg hover:border-blue-500/50 transition-all text-left w-full ${showCalendarPopup && selectingDate === 'to' ? 'border-blue-500' : 'border-zinc-800'}`}
                                        >
                                            <Calendar className="w-4 h-4 text-blue-400" />
                                            <div>
                                                <p className="text-[10px] text-zinc-500 uppercase">Date</p>
                                                <p className="text-sm text-white font-medium">
                                                    {customDateRange.to ? customDateRange.to.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Select date'}
                                                </p>
                                            </div>
                                        </button>
                                        
                                        {/* Calendar Popup for To */}
                                        {showCalendarPopup && selectingDate === 'to' && (
                                            <div className="absolute top-full left-0 mt-2 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl p-4 w-72 z-50">
                                                <div className="flex items-center justify-between mb-4">
                                                    <button
                                                        onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1))}
                                                        className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-all"
                                                    >
                                                        <ChevronLeft className="w-4 h-4" />
                                                    </button>
                                                    <span className="text-sm font-medium text-white">
                                                        {calendarMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                                                    </span>
                                                    <button
                                                        onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1))}
                                                        className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-all"
                                                    >
                                                        <ChevronRight className="w-4 h-4" />
                                                    </button>
                                                </div>

                                                <div className="grid grid-cols-7 gap-1 mb-2">
                                                    {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                                                        <div key={day} className="text-center text-xs text-zinc-500 font-medium py-1">{day}</div>
                                                    ))}
                                                </div>

                                                <div className="grid grid-cols-7 gap-1">
                                                    {(() => {
                                                        const year = calendarMonth.getFullYear();
                                                        const month = calendarMonth.getMonth();
                                                        const firstDay = new Date(year, month, 1).getDay();
                                                        const daysInMonth = new Date(year, month + 1, 0).getDate();
                                                        const days = [];

                                                        for (let i = 0; i < firstDay; i++) {
                                                            days.push(<div key={`empty-${i}`} className="h-8" />);
                                                        }

                                                        for (let day = 1; day <= daysInMonth; day++) {
                                                            const date = new Date(year, month, day);
                                                            const isSelected = customDateRange.to?.toDateString() === date.toDateString();
                                                            const isToday = new Date().toDateString() === date.toDateString();

                                                            days.push(
                                                                <button
                                                                    key={day}
                                                                    onClick={() => {
                                                                        setCustomDateRange({ ...customDateRange, to: date });
                                                                        setShowCalendarPopup(false);
                                                                    }}
                                                                    className={`h-8 w-full rounded-lg text-sm font-medium transition-all ${
                                                                        isSelected 
                                                                            ? 'bg-blue-500 text-white' 
                                                                            : isToday
                                                                                ? 'bg-zinc-800 text-white'
                                                                                : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
                                                                    }`}
                                                                >
                                                                    {day}
                                                                </button>
                                                            );
                                                        }

                                                        return days;
                                                    })()}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    
                                    {/* Time Picker Button */}
                                    <div className="relative">
                                        <button
                                            onClick={() => { setShowTimePopup(showTimePopup === 'to' ? null : 'to'); setShowCalendarPopup(false); }}
                                            className={`flex items-center gap-2 p-3 bg-zinc-900 border rounded-lg hover:border-blue-500/50 transition-all text-left w-full ${showTimePopup === 'to' ? 'border-blue-500' : 'border-zinc-800'}`}
                                        >
                                            <Clock className="w-4 h-4 text-blue-400" />
                                            <div>
                                                <p className="text-[10px] text-zinc-500 uppercase">Time</p>
                                                <p className="text-sm text-white font-medium">{customTime.to}</p>
                                            </div>
                                        </button>
                                        
                                        {/* Time Picker Popup for To */}
                                        {showTimePopup === 'to' && (
                                            <div className="absolute top-full right-0 mt-2 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl p-3 w-36 z-50">
                                                <div className="max-h-48 overflow-y-auto space-y-0.5">
                                                    {(() => {
                                                        const times = [];
                                                        for (let h = 0; h < 24; h++) {
                                                            for (let m = 0; m < 60; m += 30) {
                                                                const time = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
                                                                const isSelected = customTime.to === time;
                                                                times.push(
                                                                    <button
                                                                        key={time}
                                                                        onClick={() => {
                                                                            setCustomTime({ ...customTime, to: time });
                                                                            setShowTimePopup(null);
                                                                        }}
                                                                        className={`w-full text-left px-3 py-1.5 rounded-lg text-sm font-mono transition-all ${
                                                                            isSelected 
                                                                                ? 'bg-blue-500 text-white' 
                                                                                : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
                                                                        }`}
                                                                    >
                                                                        {time}
                                                                    </button>
                                                                );
                                                            }
                                                        }
                                                        return times;
                                                    })()}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setCustomDateRange({ from: null, to: null });
                                    setCustomTime({ from: '00:00', to: '23:59' });
                                    setTimeRange('24h');
                                    setShowCustomDatePicker(false);
                                    setShowCalendarPopup(false);
                                    setShowTimePopup(null);
                                }}
                                className="flex-1 py-2.5 bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800 rounded-lg text-sm font-medium transition-all"
                            >
                                Clear
                            </button>
                            <button
                                onClick={() => {
                                    if (customDateRange.from && customDateRange.to) {
                                        // Combine date and time
                                        const [fromHour, fromMin] = customTime.from.split(':').map(Number);
                                        const [toHour, toMin] = customTime.to.split(':').map(Number);
                                        
                                        const fromDateTime = new Date(customDateRange.from);
                                        fromDateTime.setHours(fromHour, fromMin, 0, 0);
                                        
                                        const toDateTime = new Date(customDateRange.to);
                                        toDateTime.setHours(toHour, toMin, 59, 999);
                                        
                                        setCustomDateRange({ from: fromDateTime, to: toDateTime });
                                        setShowCustomDatePicker(false);
                                        setShowCalendarPopup(false);
                                        setShowTimePopup(null);
                                        setPage(0);
                                    }
                                }}
                                disabled={!customDateRange.from || !customDateRange.to}
                                className="flex-1 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Apply
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
