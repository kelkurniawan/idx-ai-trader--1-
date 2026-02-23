import React, { useState } from 'react';
import { User } from '../types';
import { updateProfile } from '../services/authApi';

interface ProfileSetupProps {
    user: User;
    onComplete: (updatedUser: User) => void;
    onSkip: () => void;
}

/**
 * Post-registration profile completion screen.
 * Shown when user.profile_complete === false.
 */
const ProfileSetup: React.FC<ProfileSetupProps> = ({ user, onComplete, onSkip }) => {
    const [name, setName] = useState(user.name || '');
    const [phone, setPhone] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const updated = await updateProfile({
                name: name || undefined,
                phone_number: phone || undefined,
            });
            onComplete({
                ...user,
                name: updated.name,
                phone_number: updated.phone_number ?? undefined,
                avatar: updated.avatar ?? undefined,
                profile_complete: true,
            });
        } catch (err: any) {
            setError(err.message || 'Failed to update profile');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-slate-800 border border-slate-700 rounded-2xl p-8 shadow-2xl">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-gradient-to-tr from-emerald-500 to-cyan-500 rounded-2xl flex items-center justify-center text-2xl font-bold text-white shadow-lg shadow-emerald-500/20 mx-auto mb-4">
                        {(name || user.name || '?')[0].toUpperCase()}
                    </div>
                    <h1 className="text-2xl font-bold text-white">Complete Your Profile</h1>
                    <p className="text-slate-400 mt-2">Welcome, {user.name}! Tell us a bit more about yourself.</p>
                </div>

                {error && (
                    <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Display Name</label>
                        <input
                            type="text"
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2.5 px-4 text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                            placeholder="Your name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">
                            Phone Number <span className="text-slate-500">(optional, for WhatsApp OTP)</span>
                        </label>
                        <input
                            type="tel"
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2.5 px-4 text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                            placeholder="+62 8xx xxxx xxxx"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                        {loading ? 'Saving...' : 'Save & Continue'}
                    </button>
                </form>

                <button
                    onClick={onSkip}
                    className="w-full mt-3 text-slate-500 hover:text-slate-300 text-sm font-medium py-2 transition-colors"
                >
                    Skip for now
                </button>
            </div>
        </div>
    );
};

export default ProfileSetup;
