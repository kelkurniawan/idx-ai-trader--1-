/**
 * Profile API Service
 *
 * All calls to /api/profile/* endpoints.
 * Pattern mirrors authApi.ts: native fetch + credentials: 'include'.
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// ─── Types (matching backend schemas/profile.py) ─────────────────────────────

export interface ProfileUser {
    id: string;
    email: string;
    display_name: string;
    avatar_url?: string | null;
    phone?: string | null;
    bio?: string | null;
    plan: string;
    plan_expires_at?: string | null;
    theme_preference: string;
    mfa_enabled: boolean;
    mfa_type?: string | null;
    auth_provider: string;
    profile_complete: boolean;
    created_at: string;
}

export interface NotificationPrefs {
    id: string;
    price_alerts: boolean;
    news_alerts: boolean;
    portfolio_digest: boolean;
    market_open: boolean;
    market_close: boolean;
    email_enabled: boolean;
    push_enabled: boolean;
}

export interface SessionInfo {
    id: string;
    user_agent?: string | null;
    ip_address?: string | null;
    created_at: string;
    expires_at: string;
}

export interface MFAStatus {
    mfa_enabled: boolean;
    mfa_type?: string | null;
    backup_codes_available: boolean;
}

export interface TOTPSetup {
    secret: string;
    qr_code_data_url: string;
}

export interface TOTPVerifyResult {
    message: string;
    backup_codes: string[];
}

export interface PlanInfo {
    plan: string;
    plan_expires_at?: string | null;
    features: {
        news_ai: boolean;
        watchlist_limit: number;
        alert_limit?: number | null;
    };
}

export interface ApiMessage {
    message: string;
    success: boolean;
}

// ─── Transport ────────────────────────────────────────────────────────────────

async function profileFetch(path: string, options: RequestInit = {}): Promise<Response> {
    return fetch(`${API_BASE}/api/profile${path}`, {
        ...options,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...options.headers },
    });
}

async function handle<T>(res: Response): Promise<T> {
    if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Network error' }));
        throw new Error(err.detail || `Request failed: ${res.status}`);
    }
    return res.json();
}

// ─── Account ─────────────────────────────────────────────────────────────────

export const getProfile = async (): Promise<ProfileUser> => {
    const res = await profileFetch('');
    return handle<ProfileUser>(res);
};

export const updateProfile = async (data: {
    display_name?: string;
    avatar_url?: string;
    phone?: string;
    bio?: string;
}): Promise<ProfileUser> => {
    const res = await profileFetch('', { method: 'PUT', body: JSON.stringify(data) });
    return handle<ProfileUser>(res);
};

export const deleteAccount = async (password: string): Promise<ApiMessage> => {
    const res = await profileFetch('', { method: 'DELETE', body: JSON.stringify({ password }) });
    return handle<ApiMessage>(res);
};

// ─── Password ─────────────────────────────────────────────────────────────────

export const changePassword = async (data: {
    current_password: string;
    new_password: string;
    confirm_password: string;
}): Promise<ApiMessage> => {
    const res = await profileFetch('/password', { method: 'PUT', body: JSON.stringify(data) });
    return handle<ApiMessage>(res);
};

// ─── Email change ─────────────────────────────────────────────────────────────

export const initiateEmailChange = async (data: {
    new_email: string;
    current_password: string;
}): Promise<ApiMessage> => {
    const res = await profileFetch('/email/change', { method: 'POST', body: JSON.stringify(data) });
    return handle<ApiMessage>(res);
};

export const verifyEmailChange = async (otp: string): Promise<ProfileUser> => {
    const res = await profileFetch('/email/verify', { method: 'POST', body: JSON.stringify({ otp }) });
    return handle<ProfileUser>(res);
};

// ─── MFA ──────────────────────────────────────────────────────────────────────

export const getMFAStatus = async (): Promise<MFAStatus> => {
    const res = await profileFetch('/mfa');
    return handle<MFAStatus>(res);
};

export const setupTOTP = async (): Promise<TOTPSetup> => {
    const res = await profileFetch('/mfa/totp/setup', { method: 'POST' });
    return handle<TOTPSetup>(res);
};

export const verifyTOTP = async (token: string): Promise<TOTPVerifyResult> => {
    const res = await profileFetch('/mfa/totp/verify', { method: 'POST', body: JSON.stringify({ token }) });
    return handle<TOTPVerifyResult>(res);
};

export const removeTOTP = async (current_password: string): Promise<ApiMessage> => {
    const res = await profileFetch('/mfa/totp', { method: 'DELETE', body: JSON.stringify({ current_password }) });
    return handle<ApiMessage>(res);
};

export const setupEmailOTP = async (): Promise<ApiMessage> => {
    const res = await profileFetch('/mfa/email/setup', { method: 'POST' });
    return handle<ApiMessage>(res);
};

export const verifyEmailOTPMFA = async (otp: string): Promise<MFAStatus> => {
    const res = await profileFetch('/mfa/email/verify', { method: 'POST', body: JSON.stringify({ otp }) });
    return handle<MFAStatus>(res);
};

export const setupSMSOTP = async (phone?: string): Promise<ApiMessage> => {
    const res = await profileFetch('/mfa/sms/setup', { method: 'POST', body: JSON.stringify({ phone }) });
    return handle<ApiMessage>(res);
};

export const verifySMSOTPMFA = async (otp: string): Promise<MFAStatus> => {
    const res = await profileFetch('/mfa/sms/verify', { method: 'POST', body: JSON.stringify({ otp }) });
    return handle<MFAStatus>(res);
};

// ─── Notifications ────────────────────────────────────────────────────────────

export const getNotifications = async (): Promise<NotificationPrefs> => {
    const res = await profileFetch('/notifications');
    return handle<NotificationPrefs>(res);
};

export const updateNotifications = async (data: Partial<Omit<NotificationPrefs, 'id'>>): Promise<NotificationPrefs> => {
    const res = await profileFetch('/notifications', { method: 'PUT', body: JSON.stringify(data) });
    return handle<NotificationPrefs>(res);
};

// ─── Theme ────────────────────────────────────────────────────────────────────

export const updateTheme = async (theme: 'dark' | 'light'): Promise<ProfileUser> => {
    const res = await profileFetch('/theme', { method: 'PUT', body: JSON.stringify({ theme }) });
    return handle<ProfileUser>(res);
};

// ─── Sessions ─────────────────────────────────────────────────────────────────

export const listSessions = async (): Promise<SessionInfo[]> => {
    const res = await profileFetch('/sessions');
    return handle<SessionInfo[]>(res);
};

export const revokeSession = async (sessionId: string): Promise<ApiMessage> => {
    const res = await profileFetch(`/sessions/${sessionId}`, { method: 'DELETE' });
    return handle<ApiMessage>(res);
};

export const revokeAllOtherSessions = async (): Promise<ApiMessage> => {
    const res = await profileFetch('/sessions', { method: 'DELETE' });
    return handle<ApiMessage>(res);
};

// ─── Plan ─────────────────────────────────────────────────────────────────────

export const getPlan = async (): Promise<PlanInfo> => {
    const res = await profileFetch('/plan');
    return handle<PlanInfo>(res);
};
