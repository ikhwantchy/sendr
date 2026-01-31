'use client'

import React, { useState, useEffect } from 'react';
import { Trash2, Key, Zap, Plus, Check, Copy, X, Shield, Activity, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';

interface ApiKey {
    id: string;
    name: string;
    key_prefix: string;
    permissions: any;
    rate_limit: number;
    last_used_at: string | null;
    request_count: number;
    is_active: boolean;
    created_at: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function ApiKeysPage() {
    const [keys, setKeys] = useState<ApiKey[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newKey, setNewKey] = useState<string | null>(null);
    const [copiedId, setCopiedId] = useState<string | null>(null);

    useEffect(() => {
        fetchKeys();
    }, []);

    const fetchKeys = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/api/admin/api-keys`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();
            const mappedKeys = (data.keys || []).map((k: any) => ({
                ...k,
                is_active: k.is_active === 1 || k.is_active === true || k.is_active === '1'
            }));
            setKeys(mappedKeys);
        } catch (error) {
            console.error('Failed to fetch API keys:', error);
            toast.error('Failed to load API keys');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateKey = async (name: string, permissions: any) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/api/admin/api-keys`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name, permissions })
            });
            const data = await response.json();
            if (data.success) {
                setNewKey(data.key);
                await fetchKeys();
                toast.success('API key generated');
            } else {
                toast.error(data.message || 'Failed to generate key');
            }
        } catch (error: any) {
            toast.error('Network error');
        }
    };

    const handleToggleStatus = async (id: string, currentStatus: boolean) => {
        const targetStatus = !currentStatus;
        const targetValue = targetStatus ? 1 : 0;
        setKeys(prev => prev.map(k => k.id === id ? { ...k, is_active: targetStatus } : k));

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/api/admin/api-keys/${id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ is_active: targetValue })
            });
            const data = await response.json();
            if (!data.success) throw new Error(data.message || 'Failed to update');
            toast.success(`API key ${targetStatus ? 'activated' : 'disabled'}`);
        } catch (error: any) {
            toast.error('Failed to update status');
            fetchKeys();
        }
    };

    const handleDeleteKey = async (id: string) => {
        if (!confirm('Are you sure you want to delete this configuration?')) return;
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/api/admin/api-keys/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();
            if (data.success) {
                toast.success('Configuration deleted');
                fetchKeys();
            }
        } catch (error: any) {
            toast.error('Failed to delete');
        }
    };

    const copyToClipboard = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        toast.success('Copied to clipboard');
        setTimeout(() => setCopiedId(null), 2000);
    };

    const parsePermissions = (perms: any) => {
        if (typeof perms === 'string') {
            try { return JSON.parse(perms); } catch (e) { return {}; }
        }
        return perms || {};
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="w-6 h-6 border-2 border-zinc-800 border-t-white rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="p-8 min-h-screen bg-[#09090b]">
            {/* Header matching Bots page layout & button style EXACTLY */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-[28px] font-bold text-white tracking-tight">API Keys</h1>

                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-white text-black hover:bg-zinc-200 rounded-xl text-sm font-medium transition-colors shadow-lg active:scale-[0.98]"
                >
                    <Plus className="w-4 h-4" />
                    <span>Create Key</span>
                </button>
            </div>

            {/* Table layout - Refined separation */}
            <div className="bg-[#0c0c0e] border border-zinc-800/60 rounded-xl overflow-hidden shadow-2xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-zinc-800/60 bg-zinc-900/30">
                                <th className="px-6 py-4 text-[11px] font-bold text-zinc-500 uppercase tracking-widest min-w-[150px]">STATUS</th>
                                <th className="px-6 py-4 text-[11px] font-bold text-zinc-500 uppercase tracking-widest">NAME</th>
                                <th className="px-6 py-4 text-[11px] font-bold text-zinc-500 uppercase tracking-widest">CREDENTIALS</th>
                                <th className="px-6 py-4 text-[11px] font-bold text-zinc-500 uppercase tracking-widest">SCOPE / TYPE</th>
                                <th className="px-6 py-4 text-[11px] font-bold text-zinc-500 uppercase tracking-widest text-right">ACTIONS</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/40">
                            {keys.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-zinc-600 italic text-sm">
                                        No configurations found
                                    </td>
                                </tr>
                            ) : (
                                keys.map((key) => {
                                    const isActive = Boolean(key.is_active);
                                    const perms = parsePermissions(key.permissions);
                                    return (
                                        <tr key={key.id} className="hover:bg-zinc-900/10 transition-colors group">
                                            {/* STATUS Column */}
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-3">
                                                    <button
                                                        onClick={() => handleToggleStatus(key.id, isActive)}
                                                        className={`relative w-10 h-5 rounded-full transition-all duration-300 ${isActive ? 'bg-emerald-500' : 'bg-zinc-800'}`}
                                                    >
                                                        <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all duration-300 ${isActive ? 'left-6' : 'left-1'}`} />
                                                    </button>
                                                    <span className={`text-[12px] font-medium ${isActive ? 'text-emerald-500' : 'text-zinc-600'}`}>
                                                        {isActive ? 'Active' : 'Disabled'}
                                                    </span>
                                                </div>
                                            </td>

                                            {/* NAME Column */}
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-2">
                                                    <Zap size={14} className="text-blue-500" />
                                                    <span className="text-sm font-bold text-white tracking-tight">{key.name}</span>
                                                </div>
                                            </td>

                                            {/* CREDENTIALS Column */}
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-2 group/key">
                                                    <code className="text-zinc-500 font-mono text-[11px] bg-zinc-900/50 px-2 py-0.5 rounded border border-zinc-800/50">
                                                        {key.key_prefix}••••
                                                    </code>
                                                    <button
                                                        onClick={() => copyToClipboard(key.key_prefix, key.id)}
                                                        className="p-1 opacity-0 group-hover/key:opacity-100 transition-opacity hover:bg-zinc-800 rounded text-zinc-600 hover:text-white"
                                                    >
                                                        {copiedId === key.id ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                                                    </button>
                                                </div>
                                            </td>

                                            {/* SCOPE / TYPE Column - Dynamic */}
                                            <td className="px-6 py-5">
                                                <div className="flex gap-1.5 flex-wrap">
                                                    {perms.admin ? (
                                                        <span className="px-2 py-0.5 bg-purple-500/10 text-purple-400 text-[9px] font-black rounded border border-purple-500/20 uppercase tracking-widest">ADMIN</span>
                                                    ) : (
                                                        <>
                                                            {perms.read && <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 text-[9px] font-black rounded border border-blue-500/20 uppercase tracking-widest">READ</span>}
                                                            {perms.write && <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-[9px] font-black rounded border border-emerald-500/20 uppercase tracking-widest">WRITE</span>}
                                                        </>
                                                    )}
                                                    {!perms.admin && !perms.read && !perms.write && (
                                                        <span className="px-2 py-0.5 bg-zinc-800 text-zinc-600 text-[9px] font-black rounded uppercase tracking-widest">NO SCOPE</span>
                                                    )}
                                                </div>
                                            </td>

                                            {/* ACTIONS Column */}
                                            <td className="px-6 py-5 text-right">
                                                <button
                                                    onClick={() => handleDeleteKey(key.id)}
                                                    className="px-6 py-1.5 bg-[#1a0a0a] border border-[#ff4444]/20 text-[#ff4444] rounded-full text-xs font-bold hover:bg-[#2a0e0e] transition-all"
                                                >
                                                    Delete
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Generated Secret Reveal Overlay */}
            {newKey && (
                <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[100] flex items-center justify-center p-4">
                    <div className="bg-[#111111] border border-zinc-800/80 rounded-2xl w-full max-w-lg p-10 shadow-[0_0_100px_rgba(0,0,0,0.5)]">
                        <div className="w-20 h-20 bg-emerald-500/10 rounded-3xl flex items-center justify-center text-emerald-500 mx-auto mb-8 ring-1 ring-emerald-500/20">
                            <Activity className="w-10 h-10" />
                        </div>
                        <h3 className="text-2xl font-bold text-white text-center mb-2">Secret Key Generated</h3>
                        <p className="text-zinc-500 text-center mb-8 px-8 text-sm leading-relaxed">
                            For security purposes, Sendr only hashes this key. It cannot be recovered if lost. Please store it in a secure location.
                        </p>

                        <div className="bg-[#050505] border border-emerald-500/20 rounded-2xl p-6 mb-8 relative group">
                            <div className="flex items-center justify-between gap-6">
                                <code className="text-emerald-400 text-base font-mono break-all leading-relaxed flex-1">{newKey}</code>
                                <button
                                    onClick={() => copyToClipboard(newKey, 'new')}
                                    className="p-4 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-xl transition-all shadow-lg active:scale-95"
                                >
                                    <Copy size={20} />
                                </button>
                            </div>
                        </div>

                        <button
                            onClick={() => setNewKey(null)}
                            className="w-full py-5 bg-white text-black rounded-xl font-bold text-sm hover:bg-zinc-100 transition-all shadow-2xl active:scale-[0.98]"
                        >
                            I have secured the secret
                        </button>
                    </div>
                </div>
            )}

            {/* Creation Modal */}
            {showCreateModal && <CreateApiKeyModal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} onCreate={handleCreateKey} />}
        </div>
    );
}

function CreateApiKeyModal({ isOpen, onClose, onCreate }: { isOpen: boolean; onClose: () => void; onCreate: (name: string, permissions: any) => void }) {
    const [name, setName] = useState('');
    const [permissions, setPermissions] = useState({ read: true, write: false, admin: false });

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-[#0f0f12] border border-zinc-800 rounded-2xl w-full max-w-sm shadow-[0_30px_60px_-15px_rgba(0,0,0,0.6)]">
                <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-bold text-white">New Configuration</h2>
                        <p className="text-[10px] text-zinc-600 font-black uppercase tracking-widest mt-0.5">API Endpoints Access</p>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-zinc-800 rounded-lg text-zinc-500 transition-colors">
                        <X size={5} className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Configuration Name</label>
                        <input
                            type="text"
                            autoFocus
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-4 py-3 bg-black border border-zinc-800 rounded-xl text-sm text-white focus:outline-none focus:border-zinc-500 transition-all"
                            placeholder="e.g. Sendr Webhook"
                        />
                    </div>

                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Scope Selection</label>
                        <div className="flex flex-col gap-2">
                            {['read', 'write', 'admin'].map((p) => (
                                <button
                                    key={p}
                                    onClick={() => setPermissions({ ...permissions, [p]: !permissions[p as keyof typeof permissions] })}
                                    className={`flex items-center justify-between px-4 py-3 rounded-xl text-xs font-bold transition-all border ${permissions[p as keyof typeof permissions] ? 'bg-emerald-500/5 border-emerald-500/20 text-white' : 'bg-zinc-900/30 border-zinc-800 text-zinc-500'}`}
                                >
                                    <span className="uppercase tracking-widest">{p}</span>
                                    {permissions[p as keyof typeof permissions] ? <Check size={14} className="text-emerald-500" /> : <div className="w-3.5 h-3.5 border border-zinc-800 rounded-full" />}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="pt-2 flex gap-3">
                        <button onClick={onClose} className="flex-1 py-3 text-zinc-500 rounded-xl font-bold text-xs uppercase tracking-widest hover:text-white transition-all">Cancel</button>
                        <button
                            onClick={() => { if (name.trim()) onCreate(name, permissions); onClose(); }}
                            className="flex-1 py-3 bg-white text-black rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-zinc-200 transition-all active:scale-95"
                        >
                            Generate
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
