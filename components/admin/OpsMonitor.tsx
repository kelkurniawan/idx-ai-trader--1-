import React, { useEffect, useMemo, useState } from 'react';
import { Activity, AlertTriangle, Bot, Clock3, CreditCard, Database, RefreshCw, Server, ShieldCheck, Users } from 'lucide-react';
import { fetchOpsOverview, OpsOverview, OpsServiceStatus } from '../../services/opsApi';

const formatIdr = (value: number) => `Rp ${value.toLocaleString('id-ID')}`;

const statusColor = (status: OpsServiceStatus['status']) => {
  if (status === 'healthy' || status === 'configured') return 'text-emerald-600 bg-emerald-50 border-emerald-200 dark:text-emerald-300 dark:bg-emerald-500/10 dark:border-emerald-500/20';
  if (status === 'disabled') return 'text-slate-500 bg-slate-100 border-slate-200 dark:text-slate-400 dark:bg-slate-800 dark:border-slate-700';
  return 'text-rose-600 bg-rose-50 border-rose-200 dark:text-rose-300 dark:bg-rose-500/10 dark:border-rose-500/20';
};

const MetricCard = ({ label, value, sub, icon }: { label: string; value: string; sub?: string; icon: React.ReactNode }) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
        <p className="mt-3 text-2xl font-black tracking-tight text-slate-900 dark:text-white">{value}</p>
        {sub && <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">{sub}</p>}
      </div>
      <div className="rounded-xl bg-slate-100 p-2.5 text-slate-500 dark:bg-slate-800 dark:text-slate-300">{icon}</div>
    </div>
  </div>
);

const OpsMonitor: React.FC = () => {
  const [overview, setOverview] = useState<OpsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setOverview(await fetchOpsOverview());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load operations data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const timer = window.setInterval(load, 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const recentTraffic = useMemo(() => overview?.traffic.slice(-12) ?? [], [overview]);

  if (loading && !overview) {
    return <div className="rounded-2xl border border-slate-200 bg-white p-8 text-sm font-bold text-slate-500 dark:border-slate-800 dark:bg-slate-900">Loading operations monitor...</div>;
  }

  if (error && !overview) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300">
        <p className="font-black">Unable to load ops monitor</p>
        <p className="mt-2 text-sm font-semibold">{error}</p>
        <button onClick={load} className="mt-5 rounded-xl bg-rose-600 px-4 py-2 text-sm font-black text-white">Retry</button>
      </div>
    );
  }

  if (!overview) return null;

  const s = overview.summary;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Operations Monitor</h2>
          <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">
            Environment: {overview.environment} • Updated {new Date(overview.generated_at).toLocaleString()}
          </p>
        </div>
        <button
          onClick={load}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
        >
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </div>

      {error && <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-bold text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">{error}</div>}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Active Users" value={s.active_users.toLocaleString()} sub={`${s.deactivated_users} deactivated • ${s.new_users_24h} new today`} icon={<Users className="h-5 w-5" />} />
        <MetricCard label="Active Plans" value={s.active_subscriptions.toLocaleString()} sub={`${s.total_users} total users`} icon={<ShieldCheck className="h-5 w-5" />} />
        <MetricCard label="7D Revenue" value={formatIdr(s.revenue_7d_idr)} sub={`${s.pending_payments} pending • ${s.failed_payments_24h} failed today`} icon={<CreditCard className="h-5 w-5" />} />
        <MetricCard label="Traffic" value={s.total_requests.toLocaleString()} sub={`${(s.error_rate * 100).toFixed(2)}% errors • ${s.avg_latency_ms} ms avg`} icon={<Activity className="h-5 w-5" />} />
        <MetricCard label="AI Calls" value={s.ai_requests.toLocaleString()} sub={overview.ai.token_usage} icon={<Bot className="h-5 w-5" />} />
        <MetricCard label="Default Model" value={overview.ai.default_model} sub={`Pro: ${overview.ai.pro_model}`} icon={<Server className="h-5 w-5" />} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-4 flex items-center gap-2">
            <Database className="h-5 w-5 text-slate-400" />
            <h3 className="font-black text-slate-900 dark:text-white">Service Health</h3>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {overview.services.map((service) => (
              <div key={service.name} className="rounded-xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-black text-slate-900 dark:text-white">{service.name}</p>
                    <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">{service.detail || 'Operational check'}</p>
                  </div>
                  <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${statusColor(service.status)}`}>{service.status}</span>
                </div>
                <p className="mt-3 text-xs font-bold text-slate-400">{service.latency_ms == null ? 'No latency check' : `${service.latency_ms} ms`}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-4 flex items-center gap-2">
            <Clock3 className="h-5 w-5 text-slate-400" />
            <h3 className="font-black text-slate-900 dark:text-white">Recent Traffic</h3>
          </div>
          <div className="space-y-2">
            {recentTraffic.length === 0 && <p className="text-sm font-semibold text-slate-500">Traffic appears here after requests hit the API.</p>}
            {recentTraffic.map((bucket) => (
              <div key={bucket.timestamp} className="grid grid-cols-[88px_1fr_64px] items-center gap-3 text-xs">
                <span className="font-bold text-slate-500">{new Date(bucket.timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.min(100, bucket.requests * 8)}%` }} />
                </div>
                <span className="text-right font-black text-slate-700 dark:text-slate-200">{bucket.requests}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-4 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-slate-400" />
          <h3 className="font-black text-slate-900 dark:text-white">Top Routes</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              <tr>
                <th className="py-3">Route</th>
                <th className="py-3 text-right">Requests</th>
                <th className="py-3 text-right">Errors</th>
                <th className="py-3 text-right">Avg latency</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {overview.routes.map((route) => (
                <tr key={route.path}>
                  <td className="py-3 font-bold text-slate-800 dark:text-slate-100">{route.path}</td>
                  <td className="py-3 text-right font-mono font-bold">{route.requests}</td>
                  <td className="py-3 text-right font-mono font-bold">{route.errors}</td>
                  <td className="py-3 text-right font-mono font-bold">{route.avg_ms} ms</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default OpsMonitor;
