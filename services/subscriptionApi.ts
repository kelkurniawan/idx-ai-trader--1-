/**
 * Subscription API Service
 *
 * Frontend client for /api/subscription/* endpoints.
 * Handles plan listing, subscription status checks, trial activation, and invoice creation.
 */

const API_BASE = import.meta.env.VITE_API_URL || '';

async function subFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const url = `${API_BASE}/api/subscription${path}`;
  return fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: 'Network error' }));
    throw new Error(error.detail || `Request failed with status ${res.status}`);
  }
  return res.json();
}

// ───────────────────────────────────────────────
// Types
// ───────────────────────────────────────────────

export interface SubscriptionStatus {
  plan: string;
  status: string; // "FREE" | "TRIAL" | "ACTIVE" | "GRACE" | "EXPIRED"
  billing_cycle: string | null;
  is_trial: boolean;
  has_used_trial: boolean;
  trial_ends_at: string | null;
  expires_at: string | null;
  grace_until: string | null;
  days_remaining: number | null;
  has_payment_method: boolean;
  features: Record<string, any>;
}

export interface InvoiceResponse {
  invoice_id: string;
  invoice_url: string;
  plan: string;
  billing_cycle: string;
  amount_idr: number;
  expires_at: string;
}

export interface StartTrialResponse {
  message: string;
  plan: string;
  is_trial: boolean;
  trial_ends_at: string;
  days_remaining: number;
  payment_method_saved: boolean;
  redirect_url: string | null;
}

// ───────────────────────────────────────────────
// API Functions
// ───────────────────────────────────────────────

/** Get current subscription status */
export async function getSubscriptionStatus(): Promise<SubscriptionStatus> {
  const res = await subFetch('/status', { method: 'GET' });
  return handleResponse<SubscriptionStatus>(res);
}

/** Start free trial with payment method collection */
export async function startTrial(paymentType: 'CARD' | 'EWALLET' = 'CARD'): Promise<StartTrialResponse> {
  const res = await subFetch('/start-trial', {
    method: 'POST',
    body: JSON.stringify({ payment_type: paymentType }),
  });
  return handleResponse<StartTrialResponse>(res);
}

/** Create a subscription invoice (redirect to Xendit checkout) */
export async function subscribe(
  plan: 'PRO' | 'EXPERT',
  billingCycle: 'MONTHLY' | 'QUARTERLY' | 'ANNUAL' = 'MONTHLY'
): Promise<InvoiceResponse> {
  const res = await subFetch('/subscribe', {
    method: 'POST',
    body: JSON.stringify({ plan, billing_cycle: billingCycle }),
  });
  return handleResponse<InvoiceResponse>(res);
}
