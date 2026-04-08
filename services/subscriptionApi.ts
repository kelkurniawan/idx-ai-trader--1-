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
  plan?: string | null;
  is_trial: boolean;
  trial_ends_at?: string | null;
  days_remaining?: number | null;
  payment_method_saved: boolean;
  payment_method_id?: string | null;
  payment_method_status?: string | null;
  redirect_url: string | null;
  requires_action: boolean;
}

export interface AutoRenewStatus {
  enabled: boolean;
  cancellable: boolean;
  current_plan: string;
  expires_at: string | null;
  message: string;
}

export interface BillingOverviewMetricSet {
  active_paid_users: number;
  trial_users: number;
  auto_renew_enabled: number;
  pending_invoices: number;
  revenue_this_month: number;
  paid_without_subscription: number;
  expiring_soon: number;
  cancelled_auto_renew: number;
}

export interface BillingPaymentRow {
  id: string;
  user_id: string;
  invoice_id: string;
  plan: string;
  billing_cycle: string;
  amount_idr: number;
  status: string;
  payment_method?: string | null;
  created_at: string;
  paid_at?: string | null;
}

export interface BillingOverview {
  metrics: BillingOverviewMetricSet;
  recent_payments: BillingPaymentRow[];
  generated_at: string;
}

export interface BillingReconciliationResult {
  processed: number;
  paid_activated: number;
  expired_marked: number;
  failed_marked: number;
  anomalies: string[];
  ran_at: string;
}

export interface BillingSupportDetail {
  payment_id: string;
  invoice_id: string;
  payment_status: string;
  amount_idr: number;
  plan: string;
  billing_cycle: string;
  created_at: string;
  paid_at?: string | null;
  payment_method?: string | null;
  payment_channel?: string | null;
  user_id: string;
  user_email: string;
  user_name: string;
  current_plan: string;
  current_plan_expires_at?: string | null;
  auto_renew_enabled: boolean;
  subscription_id?: string | null;
  subscription_status?: string | null;
  subscription_expires_at?: string | null;
  recommended_actions: string[];
  provider_refund_note: string;
}

export interface BillingAdminActionResult {
  payment_id: string;
  payment_status: string;
  access_revoked: boolean;
  auto_renew_disabled: boolean;
  message: string;
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

/** Confirm free-trial activation after customer finishes payment-method authorization */
export async function confirmStartTrial(paymentMethodId: string): Promise<StartTrialResponse> {
  const res = await subFetch('/start-trial/confirm', {
    method: 'POST',
    body: JSON.stringify({ payment_method_id: paymentMethodId }),
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

export async function getAutoRenewStatus(): Promise<AutoRenewStatus> {
  const res = await subFetch('/auto-renew', { method: 'GET' });
  return handleResponse<AutoRenewStatus>(res);
}

export async function disableAutoRenew(): Promise<AutoRenewStatus> {
  const res = await subFetch('/auto-renew/disable', { method: 'POST' });
  return handleResponse<AutoRenewStatus>(res);
}

export async function cancelAtPeriodEnd(): Promise<AutoRenewStatus> {
  const res = await subFetch('/cancel', { method: 'POST' });
  return handleResponse<AutoRenewStatus>(res);
}

export async function getAdminBillingOverview(): Promise<BillingOverview> {
  const res = await subFetch('/admin/overview', { method: 'GET' });
  return handleResponse<BillingOverview>(res);
}

export async function runBillingReconciliation(): Promise<BillingReconciliationResult> {
  const res = await subFetch('/admin/reconcile', { method: 'POST' });
  return handleResponse<BillingReconciliationResult>(res);
}

export async function getBillingSupportDetail(paymentId: string): Promise<BillingSupportDetail> {
  const res = await subFetch(`/admin/payments/${paymentId}`, { method: 'GET' });
  return handleResponse<BillingSupportDetail>(res);
}

export async function recordRefundSupportAction(
  paymentId: string,
  payload: {
    mark_status: 'REFUND_REQUESTED' | 'REFUNDED';
    revoke_access: boolean;
    disable_auto_renew: boolean;
  }
): Promise<BillingAdminActionResult> {
  const res = await subFetch(`/admin/payments/${paymentId}/refund-support`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return handleResponse<BillingAdminActionResult>(res);
}
