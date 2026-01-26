import React, { useState, useEffect } from 'react';
import { Plus, Key, Copy, Trash2, Shield, Clock, Activity } from 'lucide-react';
import { api } from '../lib/api';

interface ApiKey {
    id: string;
    name: string;
    key_prefix: string;
    permissions: {
        read: boolean;
        write: boolean;
        admin: boolean;
    };
    rate_limit: number;
    last_used_at: string | null;
    request_count: number;
    is_active: boolean;
    created_at: string;
}

export default function ApiKeysPage() {
    const [keys, setKeys] = useState<ApiKey[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newKey, setNewKey] = useState<string | null>(null);

    useEffect(() => {
        fetchKeys();
    }, []);

    const fetchKeys = async () => {
        try {
            const response = await api.get('/admin/api-keys');
            setKeys(response.data.keys);
        } catch (error) {
            console.error('Failed to fetch API keys:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateKey = async (name: string, permissions: any) => {
        try {
            const response = await api.post('/admin/api-keys', {
                name,
                permissions
            });
            setNewKey(response.data.key);
            fetchKeys();
        } catch (error: any) {
            alert(error.response?.data?.message || 'Failed to create API key');
        }
    };

    const handleRevokeKey = async (id: string) => {
        if (!confirm('Are you sure you want to revoke this API key?')) return;

        try {
            await api.post(`/admin/api-keys/${id}/revoke`);
            fetchKeys();
        } catch (error: any) {
            alert(error.response?.data?.message || 'Failed to revoke API key');
        }
    };

    const handleDeleteKey = async (id: string) => {
        if (!confirm('Are you sure you want to delete this API key? This action cannot be undone.')) return;

        try {
            await api.delete(`/admin/api-keys/${id}`);
            fetchKeys();
        } catch (error: any) {
            alert(error.response?.data?.message || 'Failed to delete API key');
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        alert('Copied to clipboard!');
    };

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
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-white">API Keys</h1>
                    <p className="text-gray-400 mt-1">Manage API keys for external integrations</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all"
                >
                    <Plus size={20} />
                    Generate New Key
                </button>
            </div>

            {/* New Key Modal */}
            {newKey && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
                        <h3 className="text-xl font-bold text-white mb-4">API Key Generated!</h3>
                        <div className="bg-gray-900 p-4 rounded-lg mb-4">
                            <p className="text-sm text-gray-400 mb-2">Your API Key (save it now!):</p>
                            <div className="flex items-center gap-2">
                                <code className="text-green-400 text-sm flex-1 break-all">{newKey}</code>
                                <button
                                    onClick={() => copyToClipboard(newKey)}
                                    className="p-2 hover:bg-gray-700 rounded"
                                >
                                    <Copy size={16} className="text-gray-400" />
                                </button>
                            </div>
                        </div>
                        <p className="text-yellow-400 text-sm mb-4">
                            ⚠️ This key will only be shown once. Make sure to save it securely!
                        </p>
                        <button
                            onClick={() => setNewKey(null)}
                            className="w-full px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600"
                        >
                            I've Saved It
                        </button>
                    </div>
                </div>
            )}

            {/* Create Modal */}
            {showCreateModal && (
                <CreateApiKeyModal
                    onClose={() => setShowCreateModal(false)}
                    onCreate={handleCreateKey}
                />
            )}

            {/* API Keys List */}
            {keys.length === 0 ? (
                <div className="text-center py-12 bg-gray-800 rounded-lg">
                    <Key size={48} className="mx-auto text-gray-600 mb-4" />
                    <p className="text-gray-400">No API keys yet</p>
                    <p className="text-gray-500 text-sm mt-2">Create your first API key to get started</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {keys.map(key => (
                        <div key={key.id} className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <h3 className="text-lg font-semibold text-white">{key.name}</h3>
                                        {!key.is_active && (
                                            <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded">
                                                Revoked
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-gray-400">
                                        <code className="bg-gray-900 px-2 py-1 rounded">{key.key_prefix}...</code>
                                        <button
                                            onClick={() => copyToClipboard(key.key_prefix)}
                                            className="p-1 hover:bg-gray-700 rounded"
                                        >
                                            <Copy size={14} />
                                        </button>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    {key.is_active && (
                                        <button
                                            onClick={() => handleRevokeKey(key.id)}
                                            className="p-2 hover:bg-gray-700 rounded text-yellow-400"
                                            title="Revoke"
                                        >
                                            <Shield size={18} />
                                        </button>
                                    )}
                                    <button
                                        onClick={() => handleDeleteKey(key.id)}
                                        className="p-2 hover:bg-gray-700 rounded text-red-400"
                                        title="Delete"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>

                            {/* Stats */}
                            <div className="grid grid-cols-4 gap-4 mt-4 pt-4 border-t border-gray-700">
                                <div>
                                    <p className="text-xs text-gray-500 mb-1">Permissions</p>
                                    <div className="flex gap-1">
                                        {key.permissions.read && <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded">Read</span>}
                                        {key.permissions.write && <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded">Write</span>}
                                        {key.permissions.admin && <span className="px-2 py-1 bg-purple-500/20 text-purple-400 text-xs rounded">Admin</span>}
                                    </div>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 mb-1">Rate Limit</p>
                                    <p className="text-sm text-white">{key.rate_limit}/hour</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 mb-1">Requests</p>
                                    <p className="text-sm text-white">{key.request_count}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 mb-1">Last Used</p>
                                    <p className="text-sm text-white">
                                        {key.last_used_at ? new Date(key.last_used_at).toLocaleDateString() : 'Never'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// Create API Key Modal Component
function CreateApiKeyModal({ onClose, onCreate }: { onClose: () => void; onCreate: (name: string, permissions: any) => void }) {
    const [name, setName] = useState('');
    const [permissions, setPermissions] = useState({
        read: true,
        write: false,
        admin: false
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) {
            alert('Please enter a name for the API key');
            return;
        }
        onCreate(name, permissions);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
                <h3 className="text-xl font-bold text-white mb-4">Generate API Key</h3>
                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Key Name
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g., Mobile App, Zapier Integration"
                            className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
                        />
                    </div>

                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Permissions
                        </label>
                        <div className="space-y-2">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={permissions.read}
                                    onChange={(e) => setPermissions({ ...permissions, read: e.target.checked })}
                                    className="rounded bg-gray-900 border-gray-700"
                                />
                                <span className="text-sm text-gray-300">Read - View data</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={permissions.write}
                                    onChange={(e) => setPermissions({ ...permissions, write: e.target.checked })}
                                    className="rounded bg-gray-900 border-gray-700"
                                />
                                <span className="text-sm text-gray-300">Write - Create/update data</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={permissions.admin}
                                    onChange={(e) => setPermissions({ ...permissions, admin: e.target.checked })}
                                    className="rounded bg-gray-900 border-gray-700"
                                />
                                <span className="text-sm text-gray-300">Admin - Full access</span>
                            </label>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600"
                        >
                            Generate
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
