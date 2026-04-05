/**
 * SubscriptionCampaign – Smart pop-up notification system
 *
 * Renders different campaign modals based on the user's subscription status:
 *   A) FREE user → Upgrade to Pro campaign
 *   B) PRO TRIAL (>7 days) → Gentle trial reminder
 *   C) PRO TRIAL (≤7 days) → Urgent countdown with CTA
 *
 * - Fetches subscription status from backend on mount
 * - Dismissible (stores in sessionStorage so it only shows once per session)
 * - ≤7 day warnings persist (always shown on home page)
 */

import React, { useState, useEffect } from 'react';
import {
  getSubscriptionStatus,
  subscribe,
  startTrial,
  type SubscriptionStatus,
} from '../services/subscriptionApi';

// ─── Design Tokens ────────────────────────────────────────
const SG = {
  bgBase:    'var(--bg-base)',
  bgSurface: 'var(--bg-surface)',
  bgMuted:   'var(--bg-muted)',
  border:    'var(--border)',
  green:     'var(--accent)',
  greenBg:   'var(--accent-bg)',
  red:       'var(--semantic-red)',
  gold:      'var(--semantic-gold)',
  textPrimary:'var(--text-primary)',
  textSecond: 'var(--text-second)',
  textMuted: 'var(--text-muted)',
  mono:      "'JetBrains Mono', monospace",
  sans:      "'Plus Jakarta Sans', sans-serif",
};

interface SubscriptionCampaignProps {
  userId: string;
}

type CampaignVariant = 'free_upgrade' | 'trial_reminder' | 'trial_countdown' | null;

const SubscriptionCampaign: React.FC<SubscriptionCampaignProps> = ({ userId }) => {
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [variant, setVariant] = useState<CampaignVariant>(null);
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [trialLoading, setTrialLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const sub = await getSubscriptionStatus();
        if (cancelled) return;
        setStatus(sub);

        // Determine variant
        if (sub.plan === 'FREE' && sub.status === 'FREE') {
          // Free user — show upgrade campaign (once per session)
          const key = `sg_campaign_dismissed_free_${userId}`;
          if (!sessionStorage.getItem(key)) {
            setVariant('free_upgrade');
            // Small delay for nice entrance animation
            setTimeout(() => setVisible(true), 1200);
          }
        } else if (sub.is_trial && sub.days_remaining !== null) {
          if (sub.days_remaining <= 7) {
            // Urgent countdown — always show
            setVariant('trial_countdown');
            setTimeout(() => setVisible(true), 800);
          } else {
            // Gentle reminder — once per session
            const key = `sg_campaign_dismissed_trial_${userId}`;
            if (!sessionStorage.getItem(key)) {
              setVariant('trial_reminder');
              setTimeout(() => setVisible(true), 1200);
            }
          }
        }
      } catch (err) {
        // Silently fail — don't block the user's experience
        console.warn('[SubscriptionCampaign] Failed to load status:', err);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [userId]);

  const handleDismiss = () => {
    setVisible(false);
    // Mark as dismissed for this session
    if (variant === 'free_upgrade') {
      sessionStorage.setItem(`sg_campaign_dismissed_free_${userId}`, '1');
    } else if (variant === 'trial_reminder') {
      sessionStorage.setItem(`sg_campaign_dismissed_trial_${userId}`, '1');
    }
    // trial_countdown: don't mark as dismissed — show every time
  };

  const handleSubscribe = async () => {
    setLoading(true);
    setError('');
    try {
      const invoice = await subscribe('PRO', 'MONTHLY');
      // Redirect to Xendit checkout
      window.open(invoice.invoice_url, '_blank');
    } catch (err: any) {
      setError(err.message || 'Failed to create invoice');
    } finally {
      setLoading(false);
    }
  };

  const handleStartTrial = async () => {
    setTrialLoading(true);
    setError('');
    try {
      const result = await startTrial('CARD');
      // If there's a redirect URL for payment method collection, open it
      if (result.redirect_url) {
        window.open(result.redirect_url, '_blank');
      }
      // Refresh status
      const newStatus = await getSubscriptionStatus();
      setStatus(newStatus);
      setVariant('trial_reminder');
      setError('');
      // Show success briefly then auto-dismiss
      setTimeout(() => {
        setVisible(false);
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to start trial');
    } finally {
      setTrialLoading(false);
    }
  };

  if (!visible || !variant) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget && variant !== 'trial_countdown') handleDismiss();
      }}
    >
      <div
        className="w-full max-w-md rounded-3xl p-0 relative overflow-hidden animate-[scaleIn_0.3s_ease-out]"
        style={{
          background: 'linear-gradient(145deg, #1a1f2e, #0f1219)',
          border: `1px solid rgba(255,255,255,0.08)`,
          boxShadow: '0 25px 80px rgba(0,0,0,0.6)',
        }}
      >
        {/* ─── VARIANT A: FREE USER UPGRADE ─── */}
        {variant === 'free_upgrade' && (
          <>
            {/* Top accent */}
            <div className="h-1.5 w-full" style={{ background: 'linear-gradient(90deg, #22c55e, #06b6d4)' }} />

            <div className="p-8">
              {/* Close button */}
              <button onClick={handleDismiss} className="absolute top-5 right-5 w-8 h-8 rounded-full flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/10 transition-colors">
                ✕
              </button>

              {/* Icon */}
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6"
                style={{ background: 'linear-gradient(135deg, rgba(34,197,94,0.2), rgba(6,182,212,0.2))', border: '1px solid rgba(34,197,94,0.3)' }}>
                <span className="text-3xl">🚀</span>
              </div>

              <h2 className="text-2xl font-black text-center text-white mb-3" style={{ fontFamily: SG.sans }}>
                Upgrade ke Pro
              </h2>
              <p className="text-center text-sm mb-8" style={{ color: '#94a3b8', lineHeight: 1.7 }}>
                Dapatkan akses penuh ke AI Analysis, unlimited trade journal, dan real-time market scanner.
              </p>

              {/* Feature highlights */}
              <div className="space-y-3 mb-8">
                {[
                  { icon: '📊', label: '30 AI Analisis per hari' },
                  { icon: '📈', label: 'Real-time intraday data' },
                  { icon: '📓', label: 'Unlimited trade journal' },
                  { icon: '👁️', label: '30 saham di watchlist' },
                ].map((f) => (
                  <div key={f.label} className="flex items-center gap-3 px-4 py-2.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <span className="text-lg">{f.icon}</span>
                    <span className="text-sm font-semibold text-slate-300">{f.label}</span>
                  </div>
                ))}
              </div>

              {error && (
                <div className="mb-4 p-3 rounded-xl text-sm font-medium" style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}>
                  {error}
                </div>
              )}

              {/* CTA buttons */}
              <div className="space-y-3">
                {!status?.has_used_trial && (
                  <button onClick={handleStartTrial} disabled={trialLoading}
                    className="w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                    style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)', color: '#0f1219', fontFamily: SG.sans }}>
                    {trialLoading ? (
                      <><span className="animate-spin">⏳</span> Memproses...</>
                    ) : (
                      <>Coba Gratis 30 Hari</>
                    )}
                  </button>
                )}

                <button onClick={handleSubscribe} disabled={loading}
                  className="w-full py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                  style={{
                    background: status?.has_used_trial ? 'linear-gradient(135deg, #22c55e, #16a34a)' : 'rgba(255,255,255,0.06)',
                    color: status?.has_used_trial ? '#0f1219' : '#e2e8f0',
                    border: status?.has_used_trial ? 'none' : '1px solid rgba(255,255,255,0.1)',
                    fontFamily: SG.sans,
                  }}>
                  {loading ? (
                    <><span className="animate-spin">⏳</span> Membuat invoice...</>
                  ) : (
                    <>Langganan Pro — Rp 24.999/bulan</>
                  )}
                </button>

                <button onClick={handleDismiss} className="w-full py-2 text-sm font-medium transition-colors" style={{ color: '#64748b' }}>
                  Nanti saja
                </button>
              </div>

              {status?.has_used_trial && (
                <p className="text-center text-xs mt-3" style={{ color: '#64748b' }}>
                  ⚠️ Free trial sudah pernah digunakan
                </p>
              )}
            </div>
          </>
        )}

        {/* ─── VARIANT B: TRIAL REMINDER ─── */}
        {variant === 'trial_reminder' && (
          <>
            <div className="h-1.5 w-full" style={{ background: 'linear-gradient(90deg, #06b6d4, #8b5cf6)' }} />
            <div className="p-8">
              <button onClick={handleDismiss} className="absolute top-5 right-5 w-8 h-8 rounded-full flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/10 transition-colors">
                ✕
              </button>

              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6"
                style={{ background: 'rgba(6,182,212,0.15)', border: '1px solid rgba(6,182,212,0.3)' }}>
                <span className="text-3xl">✨</span>
              </div>

              <h2 className="text-xl font-black text-center text-white mb-3" style={{ fontFamily: SG.sans }}>
                Kamu sedang menikmati Pro Trial!
              </h2>
              <p className="text-center text-sm mb-6" style={{ color: '#94a3b8', lineHeight: 1.7 }}>
                Sisa <strong className="text-cyan-400">{status?.days_remaining} hari</strong> lagi.
                Langganan sekarang agar tidak kehilangan akses penuh setelah trial berakhir.
              </p>

              {/* Trial status */}
              <div className="p-4 rounded-2xl mb-6" style={{ background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.15)' }}>
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs font-bold uppercase" style={{ color: '#67e8f9', letterSpacing: '1px' }}>Pro Trial</span>
                  <span className="text-xs font-bold" style={{ color: '#94a3b8', fontFamily: SG.mono }}>{status?.days_remaining} hari tersisa</span>
                </div>
                <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                  <div className="h-full rounded-full transition-all" style={{
                    width: `${Math.max(5, ((30 - (status?.days_remaining || 0)) / 30) * 100)}%`,
                    background: 'linear-gradient(90deg, #06b6d4, #8b5cf6)',
                  }} />
                </div>
              </div>

              {error && (
                <div className="mb-4 p-3 rounded-xl text-sm font-medium" style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171' }}>
                  {error}
                </div>
              )}

              <div className="space-y-3">
                <button onClick={handleSubscribe} disabled={loading}
                  className="w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                  style={{ background: 'linear-gradient(135deg, #06b6d4, #8b5cf6)', color: '#fff', fontFamily: SG.sans }}>
                  {loading ? 'Memproses...' : 'Langganan Pro Sekarang'}
                </button>
                <button onClick={handleDismiss} className="w-full py-2 text-sm font-medium" style={{ color: '#64748b' }}>
                  Ingatkan nanti
                </button>
              </div>
            </div>
          </>
        )}

        {/* ─── VARIANT C: URGENT COUNTDOWN ─── */}
        {variant === 'trial_countdown' && (
          <>
            <div className="h-2 w-full animate-pulse" style={{ background: 'linear-gradient(90deg, #ef4444, #f97316, #ef4444)' }} />
            <div className="p-8">
              {/* No dismiss button for urgency — only a small close */}
              <button onClick={handleDismiss} className="absolute top-5 right-5 w-8 h-8 rounded-full flex items-center justify-center text-slate-600 hover:text-white hover:bg-white/10 transition-colors text-xs">
                ✕
              </button>

              {/* Countdown display */}
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-24 h-24 rounded-full mb-4"
                  style={{ background: 'rgba(239,68,68,0.1)', border: '2px solid rgba(239,68,68,0.3)' }}>
                  <div>
                    <span className="text-4xl font-black text-white block" style={{ fontFamily: SG.mono }}>
                      {status?.days_remaining ?? 0}
                    </span>
                    <span className="text-[10px] font-bold uppercase" style={{ color: '#f87171', letterSpacing: '1.5px' }}>HARI LAGI</span>
                  </div>
                </div>

                <h2 className="text-xl font-black text-white mb-2" style={{ fontFamily: SG.sans }}>
                  ⚠️ Trial Pro Segera Berakhir!
                </h2>
                <p className="text-sm" style={{ color: '#94a3b8', lineHeight: 1.7 }}>
                  {status?.days_remaining === 0
                    ? 'Trial Pro kamu berakhir hari ini!'
                    : `Hanya tersisa ${status?.days_remaining} hari sebelum akses Pro kamu berakhir.`
                  }
                  {' '}Metode pembayaran kamu akan otomatis dicharge setelah trial berakhir.
                </p>
              </div>

              {/* Urgency bar */}
              <div className="p-4 rounded-2xl mb-6" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold uppercase" style={{ color: '#f87171', letterSpacing: '1px' }}>Trial Progress</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black" style={{ background: 'rgba(239,68,68,0.2)', color: '#f87171' }}>
                    {status?.days_remaining === 0 ? 'HARI INI' : `${status?.days_remaining} HARI`}
                  </span>
                </div>
                <div className="w-full h-3 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                  <div className="h-full rounded-full transition-all animate-pulse" style={{
                    width: `${Math.max(5, ((30 - (status?.days_remaining || 0)) / 30) * 100)}%`,
                    background: 'linear-gradient(90deg, #f97316, #ef4444)',
                  }} />
                </div>
              </div>

              {/* What you'll lose */}
              <div className="mb-6 space-y-2">
                <p className="text-xs font-bold uppercase mb-2" style={{ color: '#f87171', letterSpacing: '1px' }}>Yang akan hilang:</p>
                {[
                  '30 AI Analysis per hari → 3',
                  'Real-time data → Delayed EOD',
                  'Unlimited journal → 10 entries',
                ].map((item) => (
                  <div key={item} className="flex items-center gap-2 text-sm" style={{ color: '#94a3b8' }}>
                    <span style={{ color: '#ef4444' }}>✕</span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>

              {error && (
                <div className="mb-4 p-3 rounded-xl text-sm font-medium" style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171' }}>
                  {error}
                </div>
              )}

              <div className="space-y-3">
                <button onClick={handleSubscribe} disabled={loading}
                  className="w-full py-4 rounded-2xl font-black text-base flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                  style={{ background: 'linear-gradient(135deg, #ef4444, #f97316)', color: '#fff', fontFamily: SG.sans }}>
                  {loading ? 'Memproses...' : '🔒 Amankan Akses Pro — Rp 24.999/bln'}
                </button>
                <button onClick={handleDismiss} className="w-full py-2 text-xs font-medium" style={{ color: '#475569' }}>
                  Tutup (akan tampil lagi)
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* CSS Animation */}
      <style>{`
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.92) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default SubscriptionCampaign;
