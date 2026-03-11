/**
 * useProfile hook
 *
 * Provides profile data, loading state, and mutation helpers for the account tab.
 */

import { useState, useCallback } from 'react';
import * as profileApi from '../services/profileApi';
import type { ProfileUser } from '../services/profileApi';

export function useProfile(initialUser?: ProfileUser | null) {
    const [profile, setProfile] = useState<ProfileUser | null>(initialUser ?? null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const clearMessages = () => { setError(null); setSuccess(null); };

    const refresh = useCallback(async () => {
        setLoading(true);
        clearMessages();
        try {
            const data = await profileApi.getProfile();
            setProfile(data);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, []);

    const update = useCallback(async (data: {
        display_name?: string;
        avatar_url?: string;
        phone?: string;
        bio?: string;
    }) => {
        setLoading(true);
        clearMessages();
        try {
            const updated = await profileApi.updateProfile(data);
            setProfile(updated);
            setSuccess('Profile updated successfully.');
            return updated;
        } catch (e: any) {
            setError(e.message);
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    const changePassword = useCallback(async (data: {
        current_password: string;
        new_password: string;
        confirm_password: string;
    }) => {
        setLoading(true);
        clearMessages();
        try {
            await profileApi.changePassword(data);
            setSuccess('Password changed. All other sessions have been logged out.');
            return true;
        } catch (e: any) {
            setError(e.message);
            return false;
        } finally {
            setLoading(false);
        }
    }, []);

    const initiateEmailChange = useCallback(async (data: {
        new_email: string;
        current_password: string;
    }) => {
        setLoading(true);
        clearMessages();
        try {
            const msg = await profileApi.initiateEmailChange(data);
            setSuccess(msg.message);
            return true;
        } catch (e: any) {
            setError(e.message);
            return false;
        } finally {
            setLoading(false);
        }
    }, []);

    const verifyEmailChange = useCallback(async (otp: string) => {
        setLoading(true);
        clearMessages();
        try {
            const updated = await profileApi.verifyEmailChange(otp);
            setProfile(updated);
            setSuccess('Email address updated successfully.');
            return true;
        } catch (e: any) {
            setError(e.message);
            return false;
        } finally {
            setLoading(false);
        }
    }, []);

    return {
        profile, setProfile, loading, error, success, clearMessages,
        refresh, update, changePassword, initiateEmailChange, verifyEmailChange,
    };
}
