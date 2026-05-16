import { apiFetch } from './apiClient';

export type OpsServiceStatus = {
  name: string;
  status: 'healthy' | 'down' | 'configured' | 'missing' | 'disabled';
  latency_ms: number | null;
  detail?: string;
};

export type OpsOverview = {
  generated_at: string;
  environment: string;
  summary: {
    total_users: number;
    active_users: number;
    deactivated_users: number;
    new_users_24h: number;
    active_subscriptions: number;
    revenue_7d_idr: number;
    pending_payments: number;
    failed_payments_24h: number;
    total_requests: number;
    error_rate: number;
    avg_latency_ms: number;
    ai_requests: number;
  };
  services: OpsServiceStatus[];
  traffic: Array<{
    timestamp: number;
    requests: number;
    errors: number;
    ai_requests: number;
    avg_ms: number;
  }>;
  routes: Array<{
    path: string;
    requests: number;
    errors: number;
    avg_ms: number;
  }>;
  ai: {
    configured: boolean;
    default_model: string;
    pro_model: string;
    requests_observed: number;
    token_usage: string;
  };
};

export async function fetchOpsOverview(): Promise<OpsOverview> {
  const response = await apiFetch('/api/admin/ops/overview');
  if (!response.ok) {
    throw new Error(`Failed to load ops overview (${response.status})`);
  }
  return response.json();
}
