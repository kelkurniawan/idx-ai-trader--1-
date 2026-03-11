/**
 * useMfa hook
 *
 * Manages MFA setup flow state and API calls for the Security tab.
 */

import { useState, useCallback } from 'react';
import * as profileApi from '../services/profileApi';
import type { MFAStatus, TOTPSetup, TOTPVerifyResult } from '../services/profileApi';

type MfaStep = 'idle' | 'totp_pending' | 'email_pending' | 'sms_pending' | 'backup_codes';

export function useMfa() {
    const [status, setStatus] = useState<MFAStatus | null>(null);
    const [totpSetup, setTotpSetup] = useState<TOTPSetup | null>(null);
    const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
    const [step, setStep] = useState<MfaStep>('idle');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const clearMessages = () => { setError(null); setSuccess(null); };

    const fetchStatus = useCallback(async () => {
        try {
            const s = await profileApi.getMFAStatus();
            setStatus(s);
        } catch (e: any) {
            // Silently ignore — not critical
        }
    }, []);

    // ── TOTP ──────────────────────────────────────────────────

    const startTOTP = useCallback(async () => {
        setLoading(true);
        clearMessages();
        try {
            const setup = await profileApi.setupTOTP();
            setTotpSetup(setup);
            setStep('totp_pending');
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, []);

    const confirmTOTP = useCallback(async (token: string) => {
        setLoading(true);
        clearMessages();
        try {
            const result = await profileApi.verifyTOTP(token);
            setBackupCodes(result.backup_codes);
            setStep('backup_codes');
            setSuccess(result.message);
            setStatus((prev) => prev ? { ...prev, mfa_enabled: true, mfa_type: 'totp' } : null);
            return true;
        } catch (e: any) {
            setError(e.message);
            return false;
        } finally {
            setLoading(false);
        }
    }, []);

    const removeTOTP = useCallback(async (password: string) => {
        setLoading(true);
        clearMessages();
        try {
            await profileApi.removeTOTP(password);
            setStatus({ mfa_enabled: false, mfa_type: null, backup_codes_available: false });
            setSuccess('TOTP authenticator removed.');
            setStep('idle');
            return true;
        } catch (e: any) {
            setError(e.message);
            return false;
        } finally {
            setLoading(false);
        }
    }, []);

    // ── Email OTP ─────────────────────────────────────────────

    const startEmailOTP = useCallback(async () => {
        setLoading(true);
        clearMessages();
        try {
            const msg = await profileApi.setupEmailOTP();
            setStep('email_pending');
            setSuccess(msg.message);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, []);

    const confirmEmailOTP = useCallback(async (otp: string) => {
        setLoading(true);
        clearMessages();
        try {
            const s = await profileApi.verifyEmailOTPMFA(otp);
            setStatus(s);
            setStep('idle');
            setSuccess('Email OTP MFA activated.');
            return true;
        } catch (e: any) {
            setError(e.message);
            return false;
        } finally {
            setLoading(false);
        }
    }, []);

    // ── SMS OTP ───────────────────────────────────────────────

    const startSMSOTP = useCallback(async (phone?: string) => {
        setLoading(true);
        clearMessages();
        try {
            const msg = await profileApi.setupSMSOTP(phone);
            setStep('sms_pending');
            setSuccess(msg.message);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, []);

    const confirmSMSOTP = useCallback(async (otp: string) => {
        setLoading(true);
        clearMessages();
        try {
            const s = await profileApi.verifySMSOTPMFA(otp);
            setStatus(s);
            setStep('idle');
            setSuccess('SMS OTP MFA activated.');
            return true;
        } catch (e: any) {
            setError(e.message);
            return false;
        } finally {
            setLoading(false);
        }
    }, []);

    const reset = () => {
        setStep('idle');
        setTotpSetup(null);
        setBackupCodes(null);
        clearMessages();
    };

    return {
        status, totpSetup, backupCodes, step, loading, error, success,
        fetchStatus, startTOTP, confirmTOTP, removeTOTP,
        startEmailOTP, confirmEmailOTP,
        startSMSOTP, confirmSMSOTP,
        reset, clearMessages,
    };
}
