const API_BASE = import.meta.env.VITE_API_URL || '';

let authTokenGetter: (() => Promise<string | null>) | null = null;

export function setAuthTokenGetter(getter: (() => Promise<string | null>) | null) {
  authTokenGetter = getter;
}

export async function buildAuthHeaders(
  headers?: HeadersInit,
  includeJsonContentType: boolean = true
): Promise<Record<string, string>> {
  const resolved: Record<string, string> = {
    ...(headers as Record<string, string> | undefined),
  };
  if (includeJsonContentType && !('Content-Type' in resolved)) {
    resolved['Content-Type'] = 'application/json';
  }

  if (authTokenGetter) {
    try {
      const token = await authTokenGetter();
      if (token) {
        resolved.Authorization = `Bearer ${token}`;
      }
    } catch {
      // ignore token lookup failures and fall back to unauthenticated request
    }
  }

  return resolved;
}

export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const headers = await buildAuthHeaders(options.headers, !(options.body instanceof FormData));
  return fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: 'include',
    headers,
  });
}

export { API_BASE };
