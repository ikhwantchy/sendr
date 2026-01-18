'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, CheckCircle2, XCircle } from 'lucide-react';

interface UserProfile {
    id: string;
    email: string;
    name: string;
    role: string;
    status: string;
}

export default function ProfilePage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [isEditing, setIsEditing] = useState(false);

    // Split name into first and last
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/profile/profile`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();

            if (data.success) {
                setProfile(data.data);
                const nameParts = data.data.name.split(' ');
                setFirstName(nameParts[0] || '');
                setLastName(nameParts.slice(1).join(' ') || '');
                setEmail(data.data.email);
            }
        } catch (error) {
            console.error('Failed to fetch profile:', error);
        }
    };

    const handleSave = async () => {
        setLoading(true);
        setMessage(null);

        try {
            const token = localStorage.getItem('token');
            const fullName = `${firstName} ${lastName}`.trim();

            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/profile/profile`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ name: fullName, email })
            });

            const data = await res.json();

            if (data.success) {
                setMessage({ type: 'success', text: 'Profile updated successfully!' });
                setProfile(data.data);
                setIsEditing(false);
            } else {
                setMessage({ type: 'error', text: data.message || 'Failed to update profile' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'An error occurred. Please try again.' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#09090b] p-8">
            <div className="max-w-4xl mx-auto">
                {/* Back Button */}
                <button
                    onClick={() => router.push('/dashboard')}
                    className="flex items-center gap-2 text-zinc-400 hover:text-zinc-100 mb-6 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    <span className="text-sm">Back</span>
                </button>

                {/* Header */}
                <div className="mb-8">
                    <h2 className="text-lg font-semibold text-white mb-1">General settings</h2>
                    <p className="text-sm text-zinc-500">Update your profile and how people can contact you generally</p>
                </div>

                {/* Alert Message */}
                {message && (
                    <div className={`mb-6 p-4 rounded-lg border ${message.type === 'success'
                        ? 'bg-green-900/20 border-green-700 text-green-300'
                        : 'bg-red-900/20 border-red-700 text-red-300'
                        }`}>
                        <div className="flex items-center gap-2">
                            {message.type === 'success' ? (
                                <CheckCircle2 className="h-4 w-4" />
                            ) : (
                                <XCircle className="h-4 w-4" />
                            )}
                            <span className="text-sm">{message.text}</span>
                        </div>
                    </div>
                )}

                {/* Combined Profile Card - Side by Side */}
                <div className="bg-[#0e0e11] border border-zinc-800/50 rounded-xl p-6 mb-6">
                    <div className="grid grid-cols-[200px_1fr] gap-12">
                        {/* Left Side - Profile Photo */}
                        <div>
                            <h3 className="text-sm font-semibold text-white mb-4">Profile photo</h3>

                            {/* Avatar */}
                            <div className="w-20 h-20 rounded-full bg-zinc-800 border-2 border-zinc-700 flex items-center justify-center text-zinc-300 text-2xl font-semibold overflow-hidden mb-3 mx-auto">
                                {profile?.name ? (
                                    <span>{profile.name.charAt(0).toUpperCase()}</span>
                                ) : (
                                    <span>U</span>
                                )}
                            </div>

                            {/* Upload Buttons */}
                            <div className="space-y-2 mb-3">
                                <label className="block cursor-pointer">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                                console.log('Upload file:', file);
                                            }
                                        }}
                                    />
                                    <span className="block w-full text-center px-3 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white text-xs font-medium rounded-lg transition-colors">
                                        Upload photo
                                    </span>
                                </label>
                                <button className="w-full text-xs text-zinc-500 hover:text-red-400 transition-colors">
                                    Remove
                                </button>
                            </div>

                            <p className="text-[10px] text-zinc-500 text-center leading-tight">
                                Recommended: Square image, at least 400×400px
                            </p>
                        </div>

                        {/* Right Side - Profile Details */}
                        <div>
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-sm font-semibold text-white">Profile details</h3>
                                {!isEditing ? (
                                    <button
                                        onClick={() => setIsEditing(true)}
                                        className="text-sm text-blue-500 hover:text-blue-400 transition-colors"
                                    >
                                        Edit
                                    </button>
                                ) : (
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => {
                                                setIsEditing(false);
                                                fetchProfile();
                                            }}
                                            className="text-sm text-zinc-400 hover:text-zinc-300 transition-colors px-3 py-1"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleSave}
                                            disabled={loading}
                                            className="text-sm text-blue-500 hover:text-blue-400 transition-colors px-3 py-1 disabled:opacity-50"
                                        >
                                            {loading ? 'Saving...' : 'Save'}
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Name Fields */}
                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <div>
                                    <label className="block text-xs text-zinc-400 mb-2">First name</label>
                                    <input
                                        type="text"
                                        value={firstName}
                                        onChange={(e) => setFirstName(e.target.value)}
                                        disabled={!isEditing}
                                        className="w-full px-3 py-2 bg-zinc-900/50 border border-zinc-800 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-zinc-400 mb-2">Last name</label>
                                    <input
                                        type="text"
                                        value={lastName}
                                        onChange={(e) => setLastName(e.target.value)}
                                        disabled={!isEditing}
                                        className="w-full px-3 py-2 bg-zinc-900/50 border border-zinc-800 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed"
                                    />
                                </div>
                            </div>

                            {/* Email Field */}
                            <div className="mb-4">
                                <label className="block text-xs text-zinc-400 mb-2">Email address</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    disabled={!isEditing}
                                    className="w-full px-3 py-2 bg-zinc-900/50 border border-zinc-800 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed"
                                />
                            </div>

                            {/* Address Field */}
                            <div>
                                <label className="block text-xs text-zinc-400 mb-2">Address</label>
                                <input
                                    type="text"
                                    value="1200 West Frontier Parkway, Prosper, TX, USA"
                                    disabled
                                    className="w-full px-3 py-2 bg-zinc-900/50 border border-zinc-800 rounded-lg text-zinc-500 text-sm cursor-not-allowed"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Languages Section */}
                <div className="bg-[#0e0e11] border border-zinc-800/50 rounded-xl p-6 mb-6">
                    <h3 className="text-sm font-semibold text-white mb-4">Languages</h3>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="text-xl">🇬🇧</span>
                            <span className="text-sm text-white">English</span>
                        </div>
                        <button className="text-sm text-blue-500 hover:text-blue-400 transition-colors">
                            Change
                        </button>
                    </div>
                </div>

                {/* App Appearance Section */}
                <div className="bg-[#0e0e11] border border-zinc-800/50 rounded-xl p-6">
                    <h3 className="text-sm font-semibold text-white mb-4">App appearance</h3>
                    <div className="flex gap-6">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="radio"
                                name="theme"
                                value="light"
                                className="w-4 h-4 text-blue-500 border-zinc-700 focus:ring-blue-500 bg-zinc-900"
                            />
                            <span className="text-sm text-zinc-300">Light mode</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="radio"
                                name="theme"
                                value="dark"
                                defaultChecked
                                className="w-4 h-4 text-blue-500 border-zinc-700 focus:ring-blue-500 bg-zinc-900"
                            />
                            <span className="text-sm text-zinc-300">Dark mode</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="radio"
                                name="theme"
                                value="system"
                                className="w-4 h-4 text-blue-500 border-zinc-700 focus:ring-blue-500 bg-zinc-900"
                            />
                            <span className="text-sm text-zinc-300">System preference</span>
                        </label>
                    </div>
                </div>
            </div>
        </div>
    );
}
