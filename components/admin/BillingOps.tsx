import React, { useEffect, useState } from 'react';
import { AlertTriangle, CreditCard, RefreshCw, ShieldCheck, Timer, Wallet } from 'lucide-react';
import {
    getBillingSupportDetail,
    getAdminBillingOverview,
    recordRefundSupportAction,
    runBillingReconciliation,
    type BillingAdminActionResult,
    type BillingOverview,
    type BillingReconciliationResult,
    type BillingSupportDetail,
} from '../../services/subscriptionApi';

const money = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
});

const dtf = new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
});

const cardStyle: React.CSSProperties = {
    background: 'white',
    borderRadius: 20,
    border: '1px solid rgba(148, 163, 184, 0.18)',
    boxShadow: '0 18px 40px rgba(15, 23, 42, 0.05)',
};

const metricCards = [
    { key: 'active_paid_users', label: 'Active Paid Users', icon: Wallet, tone: '#0f766e' },
    { key: 'auto_renew_enabled', label: 'Auto Renew On', icon: RefreshCw, tone: '#1d4ed8' },
    { key: 'pending_invoices', label: 'Pending Invoices', icon: Timer, tone: '#b45309' },
    { key: 'paid_without_subscription', label: 'Provisioning Issues', icon: AlertTriangle, tone: '#b91c1c' },
] as const;

const BillingOps: React.FC = () => {
    const [overview, setOverview] = useState<BillingOverview | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [reconciling, setReconciling] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [reconcileResult, setReconcileResult] = useState<BillingReconciliationResult | null>(null);
    const [supportDetail, setSupportDetail] = useState<BillingSupportDetail | null>(null);
    const [supportLoading, setSupportLoading] = useState(false);
    const [supportActionLoading, setSupportActionLoading] = useState(false);
    const [supportResult, setSupportResult] = useState<BillingAdminActionResult | null>(null);

    const loadOverview = async (mode: 'initial' | 'refresh' = 'initial') => {
        try {
            setError(null);
            if (mode === 'initial') {
                setLoading(true);
            } else {
                setRefreshing(true);
            }
            const data = await getAdminBillingOverview();
            setOverview(data);
        } catch (err: any) {
            setError(err?.message || 'Failed to load billing overview.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadOverview();
    }, []);

    const handleReconcile = async () => {
        try {
            setReconciling(true);
            setError(null);
            const result = await runBillingReconciliation();
            setReconcileResult(result);
            await loadOverview('refresh');
        } catch (err: any) {
            setError(err?.message || 'Failed to run billing reconciliation.');
        } finally {
            setReconciling(false);
        }
    };

    const handleLoadSupport = async (paymentId: string) => {
        try {
            setSupportLoading(true);
            setSupportResult(null);
            const detail = await getBillingSupportDetail(paymentId);
            setSupportDetail(detail);
        } catch (err: any) {
            setError(err?.message || 'Failed to load support detail.');
        } finally {
            setSupportLoading(false);
        }
    };

    const handleRefundSupportAction = async (markStatus: 'REFUND_REQUESTED' | 'REFUNDED', revokeAccess: boolean) => {
        if (!supportDetail) return;
        const confirmed = window.confirm(
            markStatus === 'REFUNDED'
                ? 'Confirm that the refund has already been processed in Xendit Dashboard and record it here?'
                : 'Record this payment as refund requested and disable future renewal?'
        );
        if (!confirmed) return;

        try {
            setSupportActionLoading(true);
            setError(null);
            const result = await recordRefundSupportAction(supportDetail.payment_id, {
                mark_status: markStatus,
                revoke_access: revokeAccess,
                disable_auto_renew: true,
            });
            setSupportResult(result);
            const refreshed = await getBillingSupportDetail(supportDetail.payment_id);
            setSupportDetail(refreshed);
            await loadOverview('refresh');
        } catch (err: any) {
            setError(err?.message || 'Failed to record support action.');
        } finally {
            setSupportActionLoading(false);
        }
    };

    if (loading && !overview) {
        return (
            <div style={{ ...cardStyle, padding: 24 }}>
                <p style={{ margin: 0, color: '#64748b', fontSize: 14, fontWeight: 600 }}>Loading billing operations...</p>
            </div>
        );
    }

    const metrics = overview?.metrics;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {error && (
                <div style={{ ...cardStyle, padding: 16, borderColor: 'rgba(239, 68, 68, 0.25)', color: '#b91c1c' }}>
                    <strong style={{ display: 'block', marginBottom: 6 }}>Billing ops error</strong>
                    <span style={{ fontSize: 14 }}>{error}</span>
                </div>
            )}

            <div style={{ ...cardStyle, padding: 24, background: 'linear-gradient(135deg, #fff7ed 0%, #ffffff 60%, #eff6ff 100%)' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 16 }}>
                    <div style={{ maxWidth: 560 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                            <div style={{ width: 44, height: 44, borderRadius: 14, background: '#0f172a', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <ShieldCheck size={20} />
                            </div>
                            <div>
                                <h2 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: '#0f172a' }}>Billing Operations</h2>
                                <p style={{ margin: '4px 0 0', color: '#475569', fontSize: 13 }}>Reconcile payments, spot provisioning drift, and monitor launch-day revenue health.</p>
                            </div>
                        </div>
                        <p style={{ margin: 0, color: '#334155', fontSize: 13 }}>
                            Last generated {overview ? dtf.format(new Date(overview.generated_at)) : '-'}
                        </p>
                    </div>

                    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                        <button
                            onClick={() => loadOverview('refresh')}
                            disabled={refreshing}
                            style={{
                                border: '1px solid rgba(148, 163, 184, 0.35)',
                                background: 'white',
                                color: '#0f172a',
                                padding: '12px 16px',
                                borderRadius: 12,
                                fontWeight: 800,
                                fontSize: 13,
                                cursor: refreshing ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                            }}
                        >
                            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
                            Refresh
                        </button>
                        <button
                            onClick={handleReconcile}
                            disabled={reconciling}
                            style={{
                                border: 'none',
                                background: '#0f766e',
                                color: 'white',
                                padding: '12px 16px',
                                borderRadius: 12,
                                fontWeight: 800,
                                fontSize: 13,
                                cursor: reconciling ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                            }}
                        >
                            <RefreshCw size={16} className={reconciling ? 'animate-spin' : ''} />
                            Run Reconciliation
                        </button>
                    </div>
                </div>
            </div>

            {metrics && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 16 }}>
                    {metricCards.map(({ key, label, icon: Icon, tone }) => (
                        <div key={key} style={{ ...cardStyle, padding: 18 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                                <span style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748b' }}>{label}</span>
                                <div style={{ width: 36, height: 36, borderRadius: 12, background: `${tone}14`, color: tone, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Icon size={16} />
                                </div>
                            </div>
                            <div style={{ fontSize: 30, fontWeight: 900, color: '#0f172a' }}>{String(metrics[key])}</div>
                        </div>
                    ))}
                </div>
            )}

            {metrics && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16 }}>
                    <div style={{ ...cardStyle, padding: 20 }}>
                        <p style={{ margin: '0 0 6px', color: '#64748b', fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Revenue This Month</p>
                        <p style={{ margin: 0, fontSize: 28, fontWeight: 900, color: '#0f172a' }}>{money.format(metrics.revenue_this_month)}</p>
                    </div>
                    <div style={{ ...cardStyle, padding: 20 }}>
                        <p style={{ margin: '0 0 6px', color: '#64748b', fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Lifecycle Watchlist</p>
                        <p style={{ margin: 0, color: '#0f172a', fontSize: 14, fontWeight: 700 }}>Trials: {metrics.trial_users}</p>
                        <p style={{ margin: '6px 0 0', color: '#0f172a', fontSize: 14, fontWeight: 700 }}>Expiring in 7 days: {metrics.expiring_soon}</p>
                        <p style={{ margin: '6px 0 0', color: '#0f172a', fontSize: 14, fontWeight: 700 }}>Auto renew disabled: {metrics.cancelled_auto_renew}</p>
                    </div>
                </div>
            )}

            {reconcileResult && (
                <div style={{ ...cardStyle, padding: 20, borderColor: 'rgba(15, 118, 110, 0.25)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                        <CreditCard size={18} color="#0f766e" />
                        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 900, color: '#0f172a' }}>Latest Reconciliation</h3>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
                        <div style={{ background: '#f8fafc', borderRadius: 12, padding: 14 }}>Processed: <strong>{reconcileResult.processed}</strong></div>
                        <div style={{ background: '#f0fdf4', borderRadius: 12, padding: 14 }}>Activated: <strong>{reconcileResult.paid_activated}</strong></div>
                        <div style={{ background: '#fff7ed', borderRadius: 12, padding: 14 }}>Expired: <strong>{reconcileResult.expired_marked}</strong></div>
                        <div style={{ background: '#fef2f2', borderRadius: 12, padding: 14 }}>Failed: <strong>{reconcileResult.failed_marked}</strong></div>
                    </div>
                    {reconcileResult.anomalies.length > 0 && (
                        <div style={{ marginTop: 14, padding: 14, borderRadius: 12, background: '#fff7ed', border: '1px solid rgba(234, 88, 12, 0.18)' }}>
                            <p style={{ margin: '0 0 8px', fontWeight: 800, color: '#9a3412' }}>Anomalies</p>
                            {reconcileResult.anomalies.map((item) => (
                                <p key={item} style={{ margin: '0 0 4px', color: '#9a3412', fontSize: 13 }}>{item}</p>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {(supportDetail || supportLoading || supportResult) && (
                <div style={{ ...cardStyle, padding: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
                        <div>
                            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 900, color: '#0f172a' }}>Support Action Center</h3>
                            <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 13 }}>Use this after checking the payment in Xendit Dashboard and your support inbox.</p>
                        </div>
                        {supportLoading && <span style={{ color: '#64748b', fontSize: 13, fontWeight: 700 }}>Loading payment detail...</span>}
                    </div>

                    {supportResult && (
                        <div style={{ marginBottom: 14, padding: 14, borderRadius: 12, background: '#eff6ff', color: '#1d4ed8', border: '1px solid rgba(29, 78, 216, 0.2)' }}>
                            <strong style={{ display: 'block', marginBottom: 4 }}>Support action saved</strong>
                            <span style={{ fontSize: 13 }}>{supportResult.message}</span>
                        </div>
                    )}

                    {supportDetail && (
                        <>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 14, marginBottom: 16 }}>
                                <div style={{ background: '#f8fafc', borderRadius: 14, padding: 14 }}>
                                    <p style={{ margin: '0 0 6px', color: '#64748b', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Customer</p>
                                    <p style={{ margin: 0, color: '#0f172a', fontWeight: 800 }}>{supportDetail.user_name}</p>
                                    <p style={{ margin: '4px 0 0', color: '#334155', fontSize: 13 }}>{supportDetail.user_email}</p>
                                    <p style={{ margin: '4px 0 0', color: '#334155', fontSize: 13 }}>Current plan: {supportDetail.current_plan}</p>
                                </div>
                                <div style={{ background: '#f8fafc', borderRadius: 14, padding: 14 }}>
                                    <p style={{ margin: '0 0 6px', color: '#64748b', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Payment</p>
                                    <p style={{ margin: 0, color: '#0f172a', fontWeight: 800 }}>{supportDetail.invoice_id}</p>
                                    <p style={{ margin: '4px 0 0', color: '#334155', fontSize: 13 }}>{money.format(supportDetail.amount_idr)} • {supportDetail.payment_status}</p>
                                    <p style={{ margin: '4px 0 0', color: '#334155', fontSize: 13 }}>{supportDetail.plan} / {supportDetail.billing_cycle}</p>
                                </div>
                                <div style={{ background: '#f8fafc', borderRadius: 14, padding: 14 }}>
                                    <p style={{ margin: '0 0 6px', color: '#64748b', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Entitlement</p>
                                    <p style={{ margin: 0, color: '#0f172a', fontWeight: 800 }}>{supportDetail.subscription_status || 'No linked subscription'}</p>
                                    <p style={{ margin: '4px 0 0', color: '#334155', fontSize: 13 }}>
                                        Expires: {supportDetail.subscription_expires_at ? dtf.format(new Date(supportDetail.subscription_expires_at)) : '-'}
                                    </p>
                                    <p style={{ margin: '4px 0 0', color: '#334155', fontSize: 13 }}>
                                        Auto renew: {supportDetail.auto_renew_enabled ? 'Enabled' : 'Disabled'}
                                    </p>
                                </div>
                            </div>

                            <div style={{ marginBottom: 16, padding: 14, borderRadius: 12, background: '#fff7ed', border: '1px solid rgba(234, 88, 12, 0.18)' }}>
                                <p style={{ margin: '0 0 8px', color: '#9a3412', fontWeight: 800 }}>Refund note</p>
                                <p style={{ margin: 0, color: '#9a3412', fontSize: 13 }}>{supportDetail.provider_refund_note}</p>
                            </div>

                            <div style={{ marginBottom: 16 }}>
                                <p style={{ margin: '0 0 8px', color: '#0f172a', fontWeight: 800 }}>Recommended next actions</p>
                                {supportDetail.recommended_actions.map((item) => (
                                    <p key={item} style={{ margin: '0 0 6px', color: '#334155', fontSize: 13 }}>{item}</p>
                                ))}
                            </div>

                            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                                <button
                                    onClick={() => handleRefundSupportAction('REFUND_REQUESTED', false)}
                                    disabled={supportActionLoading}
                                    style={{
                                        border: '1px solid rgba(191, 219, 254, 0.9)',
                                        background: '#eff6ff',
                                        color: '#1d4ed8',
                                        padding: '11px 14px',
                                        borderRadius: 12,
                                        fontWeight: 800,
                                        cursor: supportActionLoading ? 'not-allowed' : 'pointer',
                                    }}
                                >
                                    Mark Refund Requested
                                </button>
                                <button
                                    onClick={() => handleRefundSupportAction('REFUNDED', false)}
                                    disabled={supportActionLoading}
                                    style={{
                                        border: '1px solid rgba(16, 185, 129, 0.24)',
                                        background: '#ecfdf5',
                                        color: '#047857',
                                        padding: '11px 14px',
                                        borderRadius: 12,
                                        fontWeight: 800,
                                        cursor: supportActionLoading ? 'not-allowed' : 'pointer',
                                    }}
                                >
                                    Mark Refunded
                                </button>
                                <button
                                    onClick={() => handleRefundSupportAction('REFUNDED', true)}
                                    disabled={supportActionLoading}
                                    style={{
                                        border: '1px solid rgba(239, 68, 68, 0.22)',
                                        background: '#fef2f2',
                                        color: '#b91c1c',
                                        padding: '11px 14px',
                                        borderRadius: 12,
                                        fontWeight: 800,
                                        cursor: supportActionLoading ? 'not-allowed' : 'pointer',
                                    }}
                                >
                                    Refund And Revoke Access
                                </button>
                            </div>
                        </>
                    )}
                </div>
            )}

            <div style={{ ...cardStyle, overflow: 'hidden' }}>
                <div style={{ padding: 20, borderBottom: '1px solid rgba(148, 163, 184, 0.18)' }}>
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 900, color: '#0f172a' }}>Recent Payments</h3>
                </div>

                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 760 }}>
                        <thead>
                            <tr style={{ background: '#f8fafc' }}>
                                {['Invoice', 'User', 'Plan', 'Amount', 'Status', 'Created', 'Paid', 'Actions'].map((header) => (
                                    <th key={header} style={{ textAlign: 'left', padding: '14px 18px', color: '#64748b', fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                                        {header}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {overview?.recent_payments.length ? overview.recent_payments.map((payment) => (
                                <tr key={payment.id} style={{ borderTop: '1px solid rgba(148, 163, 184, 0.16)' }}>
                                    <td style={{ padding: '14px 18px', fontWeight: 700, color: '#0f172a' }}>{payment.invoice_id}</td>
                                    <td style={{ padding: '14px 18px', color: '#334155', fontSize: 13 }}>{payment.user_id}</td>
                                    <td style={{ padding: '14px 18px', color: '#334155', fontSize: 13 }}>{payment.plan} / {payment.billing_cycle}</td>
                                    <td style={{ padding: '14px 18px', color: '#334155', fontSize: 13 }}>{money.format(payment.amount_idr)}</td>
                                    <td style={{ padding: '14px 18px' }}>
                                        <span style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            padding: '6px 10px',
                                            borderRadius: 999,
                                            background: payment.status === 'PAID' ? '#ecfdf5' : payment.status === 'PENDING' ? '#fff7ed' : '#f8fafc',
                                            color: payment.status === 'PAID' ? '#047857' : payment.status === 'PENDING' ? '#b45309' : '#475569',
                                            fontSize: 12,
                                            fontWeight: 800,
                                        }}>
                                            {payment.status}
                                        </span>
                                    </td>
                                    <td style={{ padding: '14px 18px', color: '#334155', fontSize: 13 }}>{dtf.format(new Date(payment.created_at))}</td>
                                    <td style={{ padding: '14px 18px', color: '#334155', fontSize: 13 }}>{payment.paid_at ? dtf.format(new Date(payment.paid_at)) : '-'}</td>
                                    <td style={{ padding: '14px 18px' }}>
                                        <button
                                            onClick={() => handleLoadSupport(payment.id)}
                                            style={{
                                                border: '1px solid rgba(148, 163, 184, 0.28)',
                                                background: 'white',
                                                color: '#0f172a',
                                                padding: '8px 12px',
                                                borderRadius: 10,
                                                fontWeight: 800,
                                                cursor: 'pointer',
                                            }}
                                        >
                                            Support
                                        </button>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={8} style={{ padding: 24, textAlign: 'center', color: '#64748b', fontWeight: 600 }}>
                                        No billing records yet.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default BillingOps;
