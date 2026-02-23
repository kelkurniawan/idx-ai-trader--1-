import React, { useState, useRef, useEffect } from 'react';
import { mfaVerify } from '../services/authApi';
import { User } from '../types';

interface MfaVerifyProps {
    tempToken: string;
    mfaMessage: string;
    onVerified: (user: User) => void;
    onCancel: () => void;
}

/**
 * MFA challenge screen shown during login.
 * User enters a 6-digit OTP/TOTP code to complete authentication.
 */
const MfaVerify: React.FC<MfaVerifyProps> = ({ tempToken, mfaMessage, onVerified, onCancel }) => {
    const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    // Auto-focus first input on mount
    useEffect(() => {
        inputRefs.current[0]?.focus();
    }, []);

    const handleChange = (index: number, value: string) => {
        if (!/^\d*$/.test(value)) return; // Only digits

        const newDigits = [...digits];
        newDigits[index] = value.slice(-1); // Only take last char
        setDigits(newDigits);

        // Auto-advance to next input
        if (value && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }

        // Auto-submit when all 6 digits filled
        if (newDigits.every(d => d) && newDigits.join('').length === 6) {
            handleSubmit(newDigits.join(''));
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === 'Backspace' && !digits[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
        if (pasted.length === 6) {
            const newDigits = pasted.split('');
            setDigits(newDigits);
            inputRefs.current[5]?.focus();
            handleSubmit(pasted);
        }
    };

    const handleSubmit = async (code?: string) => {
        const otp = code || digits.join('');
        if (otp.length !== 6) {
            setError('Please enter a 6-digit code');
            return;
        }

        setLoading(true);
        setError('');
        try {
            const result = await mfaVerify({ temp_token: tempToken, otp_code: otp });
            if (result.user) {
                onVerified({
                    id: result.user.id,
                    name: result.user.name,
                    email: result.user.email,
                    avatar: result.user.avatar ?? undefined,
                    phone_number: result.user.phone_number ?? undefined,
                    mfa_enabled: result.user.mfa_enabled,
                    mfa_type: result.user.mfa_type as any,
                    profile_complete: result.user.profile_complete,
                    auth_provider: result.user.auth_provider as any,
                });
            }
        } catch (err: any) {
            setError(err.message || 'Invalid code. Please try again.');
            setDigits(['', '', '', '', '', '']);
            inputRefs.current[0]?.focus();
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-slate-800 border border-slate-700 rounded-2xl p-8 shadow-2xl">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-gradient-to-tr from-amber-500 to-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold text-white">Verification Required</h1>
                    <p className="text-slate-400 mt-2 text-sm">{mfaMessage}</p>
                </div>

                {error && (
                    <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm text-center">
                        {error}
                    </div>
                )}

                {/* 6-digit code input */}
                <div className="flex justify-center gap-3 mb-6" onPaste={handlePaste}>
                    {digits.map((digit, i) => (
                        <input
                            key={i}
                            ref={(el) => { inputRefs.current[i] = el; }}
                            type="text"
                            inputMode="numeric"
                            maxLength={1}
                            value={digit}
                            onChange={(e) => handleChange(i, e.target.value)}
                            onKeyDown={(e) => handleKeyDown(i, e)}
                            disabled={loading}
                            className="w-12 h-14 bg-slate-900 border-2 border-slate-600 rounded-xl text-center text-white text-xl font-mono focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all disabled:opacity-50"
                        />
                    ))}
                </div>

                <button
                    onClick={() => handleSubmit()}
                    disabled={loading || digits.some(d => !d)}
                    className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-600 text-white font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                    {loading ? (
                        <>
                            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            Verifying...
                        </>
                    ) : 'Verify Code'}
                </button>

                <button
                    onClick={onCancel}
                    disabled={loading}
                    className="w-full mt-3 text-slate-500 hover:text-slate-300 text-sm font-medium py-2 transition-colors"
                >
                    Back to login
                </button>
            </div>
        </div>
    );
};

export default MfaVerify;
