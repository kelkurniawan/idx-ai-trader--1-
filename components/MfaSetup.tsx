import React, { useState } from 'react';
import { mfaSetup, mfaDisable } from '../services/authApi';

interface MfaSetupProps {
    mfaEnabled: boolean;
    mfaType?: string | null;
    hasPhone: boolean;
    onMfaChanged: () => void;
    onBack: () => void;
}

/**
 * MFA setup/management component.
 * Allows enabling TOTP (Google Authenticator), Email OTP, or WhatsApp OTP.
 * Also allows disabling MFA with a verification code.
 */
const MfaSetup: React.FC<MfaSetupProps> = ({ mfaEnabled, mfaType, hasPhone, onMfaChanged, onBack }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // TOTP setup result
    const [totpSecret, setTotpSecret] = useState('');
    const [totpQrUri, setTotpQrUri] = useState('');

    // Disable MFA
    const [disableCode, setDisableCode] = useState('');

    const handleSetup = async (type: 'totp' | 'email_otp' | 'whatsapp_otp') => {
        setLoading(true);
        setError('');
        setSuccess('');
        try {
            const result = await mfaSetup({ mfa_type: type });
            setSuccess(result.message);

            if (type === 'totp' && result.secret && result.qr_code_uri) {
                setTotpSecret(result.secret);
                setTotpQrUri(result.qr_code_uri);
            }

            onMfaChanged();
        } catch (err: any) {
            setError(err.message || 'Failed to set up MFA');
        } finally {
            setLoading(false);
        }
    };

    const handleDisable = async () => {
        if (!disableCode || disableCode.length !== 6) {
            setError('Please enter a 6-digit code');
            return;
        }
        setLoading(true);
        setError('');
        try {
            const result = await mfaDisable({ otp_code: disableCode });
            setSuccess(result.message);
            setTotpSecret('');
            setTotpQrUri('');
            setDisableCode('');
            onMfaChanged();
        } catch (err: any) {
            setError(err.message || 'Failed to disable MFA');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="glass-card rounded-2xl p-6 max-w-lg mx-auto">
            <div className="flex items-center gap-3 mb-6">
                <button onClick={onBack} className="text-slate-400 hover:text-slate-200 transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                    </svg>
                </button>
                <h2 className="text-xl font-bold text-slate-800 dark:text-white">Multi-Factor Authentication</h2>
            </div>

            {error && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                    {error}
                </div>
            )}
            {success && (
                <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400 text-sm">
                    {success}
                </div>
            )}

            {mfaEnabled ? (
                /* ===== MFA is ENABLED — Show status + disable option ===== */
                <div className="space-y-4">
                    <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                        <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                            MFA Enabled
                        </div>
                        <p className="text-slate-400 text-sm mt-1">
                            Type: <span className="font-mono text-slate-300">{mfaType === 'totp' ? 'Google Authenticator (TOTP)' : mfaType === 'email_otp' ? 'Email OTP' : 'WhatsApp OTP'}</span>
                        </p>
                    </div>

                    {/* TOTP QR code (if just set up) */}
                    {totpSecret && (
                        <div className="p-4 bg-slate-700/50 rounded-lg space-y-3">
                            <p className="text-sm text-slate-300">Scan this QR code with Google Authenticator:</p>
                            <div className="bg-white p-4 rounded-lg w-fit mx-auto">
                                <img
                                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(totpQrUri)}`}
                                    alt="TOTP QR Code"
                                    className="w-48 h-48"
                                />
                            </div>
                            <p className="text-xs text-slate-400">
                                Manual entry key: <span className="font-mono text-emerald-400 select-all">{totpSecret}</span>
                            </p>
                        </div>
                    )}

                    <div className="border-t border-slate-700 pt-4">
                        <p className="text-sm text-slate-400 mb-2">To disable MFA, enter a code from your authenticator:</p>
                        <div className="flex flex-col sm:flex-row gap-2 md:gap-3">
                            <input
                                type="text"
                                maxLength={6}
                                value={disableCode}
                                onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, ''))}
                                className="flex-1 min-h-input bg-slate-900 border border-slate-700 rounded-lg py-3 px-4 text-white text-center font-mono text-lg tracking-widest focus:ring-2 focus:ring-red-500 outline-none"
                                placeholder="000000"
                            />
                            <button
                                onClick={handleDisable}
                                disabled={loading}
                                className="w-full sm:w-auto px-6 py-3 min-h-touch bg-red-500/20 hover:bg-red-500/30 text-red-400 font-semibold rounded-lg transition-colors active:scale-95"
                            >
                                {loading ? '...' : 'Disable'}
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                /* ===== MFA is DISABLED — Show setup options ===== */
                <div className="space-y-3">
                    <p className="text-sm text-slate-400 mb-4">
                        Add an extra layer of security to your account. Choose a method:
                    </p>

                    {/* TOTP (Google Authenticator) */}
                    <button
                        onClick={() => handleSetup('totp')}
                        disabled={loading}
                        className="w-full p-4 min-h-touch bg-slate-700/30 hover:bg-slate-700/50 border border-slate-700 rounded-xl transition-all active:scale-[0.98] text-left flex items-center gap-3 md:gap-4"
                    >
                        <div className="w-10 h-10 md:w-12 md:h-12 bg-indigo-500/20 rounded-lg flex items-center justify-center text-indigo-400 flex-shrink-0">
                            <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <div>
                            <p className="font-semibold text-slate-200 text-sm md:text-base">Google Authenticator (TOTP)</p>
                            <p className="text-[10px] md:text-xs text-slate-400">Use an authenticator app to generate codes</p>
                        </div>
                    </button>

                    {/* Email OTP */}
                    <button
                        onClick={() => handleSetup('email_otp')}
                        disabled={loading}
                        className="w-full p-4 min-h-touch bg-slate-700/30 hover:bg-slate-700/50 border border-slate-700 rounded-xl transition-all active:scale-[0.98] text-left flex items-center gap-3 md:gap-4"
                    >
                        <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-500/20 rounded-lg flex items-center justify-center text-blue-400 flex-shrink-0">
                            <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <div>
                            <p className="font-semibold text-slate-200 text-sm md:text-base">Email OTP</p>
                            <p className="text-[10px] md:text-xs text-slate-400">Receive a code via email at each login</p>
                        </div>
                    </button>

                    {/* WhatsApp OTP */}
                    <button
                        onClick={() => handleSetup('whatsapp_otp')}
                        disabled={loading || !hasPhone}
                        className="w-full p-4 min-h-touch bg-slate-700/30 hover:bg-slate-700/50 border border-slate-700 rounded-xl transition-all active:scale-[0.98] text-left flex items-center gap-3 md:gap-4 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <div className="w-10 h-10 md:w-12 md:h-12 bg-green-500/20 rounded-lg flex items-center justify-center text-green-400 flex-shrink-0">
                            <svg className="w-5 h-5 md:w-6 md:h-6" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                            </svg>
                        </div>
                        <div>
                            <p className="font-semibold text-slate-200 text-sm md:text-base">WhatsApp OTP</p>
                            <p className="text-[10px] md:text-xs text-slate-400">
                                {hasPhone ? 'Receive a code via WhatsApp at each login' : 'Set your phone number in profile first'}
                            </p>
                        </div>
                    </button>
                </div>
            )}
        </div>
    );
};

export default MfaSetup;
