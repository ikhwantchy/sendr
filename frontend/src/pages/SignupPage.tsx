import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { UserPlus, Mail, Lock, Eye, EyeOff, CheckCircle, XCircle } from 'lucide-react';
import { api } from '../lib/api';

export default function SignupPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');

    const [inviteData, setInviteData] = useState<any>(null);
    const [validating, setValidating] = useState(true);
    const [tokenValid, setTokenValid] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        password: '',
        confirmPassword: ''
    });

    const [passwordRequirements, setPasswordRequirements] = useState({
        minLength: false,
        hasUppercase: false,
        hasNumber: false,
        hasSymbol: false,
        passwordsMatch: false
    });

    useEffect(() => {
        if (!token) {
            setValidating(false);
            setTokenValid(false);
            return;
        }

        validateToken();
    }, [token]);

    useEffect(() => {
        checkPasswordRequirements();
    }, [formData.password, formData.confirmPassword]);

    const validateToken = async () => {
        try {
            const response = await api.post('/invites/validate', { token });
            setInviteData(response.data.invite);
            setTokenValid(true);
        } catch (error: any) {
            setTokenValid(false);
            console.error('Token validation failed:', error);
        } finally {
            setValidating(false);
        }
    };

    const checkPasswordRequirements = () => {
        const password = formData.password;
        setPasswordRequirements({
            minLength: password.length >= 8,
            hasUppercase: /[A-Z]/.test(password),
            hasNumber: /[0-9]/.test(password),
            hasSymbol: /[!@#$%^&*(),.?":{}|<>]/.test(password),
            passwordsMatch: password === formData.confirmPassword && password.length > 0
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validate all requirements
        const allRequirementsMet = Object.values(passwordRequirements).every(req => req === true);
        if (!allRequirementsMet) {
            alert('Please meet all password requirements');
            return;
        }

        if (!formData.name.trim()) {
            alert('Please enter your name');
            return;
        }

        setSubmitting(true);
        try {
            await api.post('/auth/signup', {
                email: inviteData.email,
                name: formData.name,
                password: formData.password,
                role: inviteData.role,
                inviteToken: token
            });

            alert('Account created successfully! Please login.');
            navigate('/login');
        } catch (error: any) {
            alert(error.response?.data?.message || 'Failed to create account');
        } finally {
            setSubmitting(false);
        }
    };

    // Loading state
    if (validating) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center p-4">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
                    <p className="text-white">Validating invite...</p>
                </div>
            </div>
        );
    }

    // Invalid token
    if (!tokenValid || !token) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center p-4">
                <div className="bg-gray-800 rounded-lg p-8 max-w-md w-full border border-gray-700 text-center">
                    <XCircle size={64} className="mx-auto text-red-400 mb-4" />
                    <h2 className="text-2xl font-bold text-white mb-2">Invalid Invite</h2>
                    <p className="text-gray-400 mb-6">
                        {!token
                            ? 'No invite token provided. Please check your invite email.'
                            : 'This invite link is invalid or has expired.'
                        }
                    </p>
                    <button
                        onClick={() => navigate('/login')}
                        className="px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600"
                    >
                        Go to Login
                    </button>
                </div>
            </div>
        );
    }

    // Valid token - show signup form
    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center p-4">
            <div className="bg-gray-800 rounded-lg p-8 max-w-md w-full border border-gray-700">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full mb-4">
                        <UserPlus size={32} className="text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-2">Create Your Account</h1>
                    <p className="text-gray-400">You've been invited to join the platform</p>
                </div>

                {/* Invite Info */}
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-6">
                    <div className="flex items-center gap-2 mb-2">
                        <Mail size={18} className="text-blue-400" />
                        <span className="text-sm font-medium text-blue-400">Invited Email</span>
                    </div>
                    <p className="text-white font-semibold">{inviteData.email}</p>
                    <p className="text-xs text-gray-400 mt-1">Role: {inviteData.role}</p>
                </div>

                {/* Signup Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Name */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Full Name
                        </label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="John Doe"
                            className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
                            required
                        />
                    </div>

                    {/* Password */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Password
                        </label>
                        <div className="relative">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                placeholder="Enter password"
                                className="w-full px-4 py-2 pr-10 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-2.5 text-gray-400 hover:text-white"
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    {/* Confirm Password */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Confirm Password
                        </label>
                        <div className="relative">
                            <input
                                type={showConfirmPassword ? 'text' : 'password'}
                                value={formData.confirmPassword}
                                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                placeholder="Confirm password"
                                className="w-full px-4 py-2 pr-10 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="absolute right-3 top-2.5 text-gray-400 hover:text-white"
                            >
                                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    {/* Password Requirements */}
                    <div className="bg-gray-900 rounded-lg p-4 space-y-2">
                        <p className="text-sm font-medium text-gray-300 mb-2">Password Requirements:</p>
                        <RequirementItem met={passwordRequirements.minLength} text="At least 8 characters" />
                        <RequirementItem met={passwordRequirements.hasUppercase} text="Contains uppercase letter" />
                        <RequirementItem met={passwordRequirements.hasNumber} text="Contains number" />
                        <RequirementItem met={passwordRequirements.hasSymbol} text="Contains symbol (!@#$%...)" />
                        <RequirementItem met={passwordRequirements.passwordsMatch} text="Passwords match" />
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={submitting || !Object.values(passwordRequirements).every(req => req === true)}
                        className="w-full px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-semibold hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                        {submitting ? 'Creating Account...' : 'Create Account'}
                    </button>
                </form>

                {/* Footer */}
                <p className="text-center text-sm text-gray-400 mt-6">
                    Already have an account?{' '}
                    <button
                        onClick={() => navigate('/login')}
                        className="text-purple-400 hover:text-purple-300 font-medium"
                    >
                        Login here
                    </button>
                </p>
            </div>
        </div>
    );
}

// Requirement Item Component
function RequirementItem({ met, text }: { met: boolean; text: string }) {
    return (
        <div className="flex items-center gap-2">
            {met ? (
                <CheckCircle size={16} className="text-green-400" />
            ) : (
                <XCircle size={16} className="text-gray-600" />
            )}
            <span className={`text-sm ${met ? 'text-green-400' : 'text-gray-500'}`}>
                {text}
            </span>
        </div>
    );
}
