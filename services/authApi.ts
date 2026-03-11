/**
 * Authentication API Service
 * 
 * Handles all calls to /api/auth/* endpoints.
 * Sessions are managed via HTTP-only cookies (set by the server),
 * so no manual token management is required on the frontend.
 */

const API_BASE = import.meta.env.VITE_API_URL || '';

// ===========================
// Types (matching backend schemas)
// ===========================

export interface AuthUser {
    id: string;
    email: string;
    name: string;
    avatar?: string | null;
    phone_number?: string | null;
    mfa_enabled: boolean;
    mfa_type?: string | null;
    profile_complete: boolean;
    auth_provider: string;
}

export interface AuthResponse {
    access_token?: string | null;
    token_type: string;
    user?: AuthUser | null;
    mfa_required: boolean;
    temp_token?: string | null;
    message: string;
}

export interface MfaSetupResponse {
    mfa_type: string;
    secret?: string | null;
    qr_code_uri?: string | null;
    message: string;
}

export interface MessageResponse {
    message: string;
    success: boolean;
}

// ===========================
// Helper
// ===========================

async function authFetch(path: string, options: RequestInit = {}): Promise<Response> {
    const url = `${API_BASE}/api/auth${path}`;
    const res = await fetch(url, {
        ...options,
        credentials: 'include',  // Always send cookies (HTTP-only session)
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
        },
    });
    return res;
}

async function handleResponse<T>(res: Response): Promise<T> {
    if (!res.ok) {
        const error = await res.json().catch(() => ({ detail: 'Network error' }));
        throw new Error(error.detail || `Request failed with status ${res.status}`);
    }
    return res.json();
}

// ===========================
// Auth API Functions
// ===========================

/** Register a new user */
export async function register(data: {
    email: string;
    name: string;
    password: string;
    recaptcha_token?: string;
}): Promise<AuthResponse> {
    const res = await authFetch('/register', {
        method: 'POST',
        body: JSON.stringify({
            email: data.email,
            name: data.name,
            password: data.password,
            recaptcha_token: data.recaptcha_token || '',
        }),
    });
    return handleResponse<AuthResponse>(res);
}

/** Login with email and password */
export async function login(data: {
    email: string;
    password: string;
    remember_me?: boolean;
    recaptcha_token?: string;
}): Promise<AuthResponse> {
    const res = await authFetch('/login', {
        method: 'POST',
        body: JSON.stringify({
            email: data.email,
            password: data.password,
            remember_me: data.remember_me || false,
            recaptcha_token: data.recaptcha_token || '',
        }),
    });
    return handleResponse<AuthResponse>(res);
}

/** Google OAuth login/register */
export async function googleAuth(data: {
    google_id_token: string;
    recaptcha_token?: string;
}): Promise<AuthResponse> {
    const res = await authFetch('/google', {
        method: 'POST',
        body: JSON.stringify({
            google_id_token: data.google_id_token,
            recaptcha_token: data.recaptcha_token || '',
        }),
    });
    return handleResponse<AuthResponse>(res);
}

/** Verify MFA code during login */
export async function mfaVerify(data: {
    temp_token: string;
    otp_code: string;
}): Promise<AuthResponse> {
    const res = await authFetch('/mfa/verify', {
        method: 'POST',
        body: JSON.stringify(data),
    });
    return handleResponse<AuthResponse>(res);
}

/** Set up MFA for the current user */
export async function mfaSetup(data: {
    mfa_type: 'totp' | 'email_otp' | 'whatsapp_otp';
}): Promise<MfaSetupResponse> {
    const res = await authFetch('/mfa/setup', {
        method: 'POST',
        body: JSON.stringify(data),
    });
    return handleResponse<MfaSetupResponse>(res);
}

/** Disable MFA for the current user */
export async function mfaDisable(data: {
    otp_code: string;
}): Promise<MessageResponse> {
    const res = await authFetch('/mfa/disable', {
        method: 'POST',
        body: JSON.stringify(data),
    });
    return handleResponse<MessageResponse>(res);
}

/** Get current authenticated user */
export async function getMe(): Promise<AuthUser> {
    const res = await authFetch('/me', { method: 'GET' });
    return handleResponse<AuthUser>(res);
}

/** Check auth status (returns user or throws 401) */
export async function checkAuthStatus(): Promise<{ authenticated: boolean; user: AuthUser }> {
    const res = await authFetch('/status', { method: 'GET' });
    return handleResponse<{ authenticated: boolean; user: AuthUser }>(res);
}

/** Update user profile */
export async function updateProfile(data: {
    name?: string;
    phone_number?: string;
    profile_picture_url?: string;
}): Promise<AuthUser> {
    const res = await authFetch('/profile', {
        method: 'PUT',
        body: JSON.stringify(data),
    });
    return handleResponse<AuthUser>(res);
}

/** Logout — clears HTTP-only cookies server-side */
export async function logout(): Promise<MessageResponse> {
    const res = await authFetch('/logout', { method: 'POST' });
    return handleResponse<MessageResponse>(res);
}
