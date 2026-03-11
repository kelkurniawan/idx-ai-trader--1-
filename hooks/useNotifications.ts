/**
 * useNotifications hook
 *
 * Manages notification preference state and auto-save on toggle.
 */

import { useState, useCallback } from 'react';
import * as profileApi from '../services/profileApi';
import type { NotificationPrefs } from '../services/profileApi';

export function useNotifications() {
    const [prefs, setPrefs] = useState<NotificationPrefs | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetch = useCallback(async () => {
        setLoading(true);
        try {
            const data = await profileApi.getNotifications();
            setPrefs(data);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, []);

    /** Toggle a single boolean field and immediately persist it. */
    const toggle = useCallback(async (
        field: keyof Omit<NotificationPrefs, 'id'>
    ) => {
        if (!prefs) return;
        const newValue = !prefs[field];
        // Optimistic update
        setPrefs((prev) => prev ? { ...prev, [field]: newValue } : prev);
        try {
            const updated = await profileApi.updateNotifications({ [field]: newValue });
            setPrefs(updated);
        } catch (e: any) {
            // Revert on failure
            setPrefs((prev) => prev ? { ...prev, [field]: !newValue } : prev);
            setError(e.message);
        }
    }, [prefs]);

    return { prefs, loading, error, fetch, toggle };
}
