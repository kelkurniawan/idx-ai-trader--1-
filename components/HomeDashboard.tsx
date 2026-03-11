// RESTYLED: SahamGue Design System
import React, { useState } from 'react';

// ────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────
interface HomeDashboardProps {
  user: { name: string; email: string };
  onNavigateAnalysis: () => void;
  onNavigateWatchlist: () => void;
  onSelectStock: (ticker: string) => void;
  onLogout: () => void;
}

// ────────────────────────────────────────────────
// Design tokens (mirrors index.css :root)
// ────────────────────────────────────────────────
const SG = {
  bgBase:       '#0a0f10',
  bgSurface:    '#151b1e',
  bgHeader:     '#0d1417',
  border:       '#1e2a2f',
  green:        '#22c55e',
  greenBg:      'rgba(34,197,94,0.12)',
  greenBgStrong:'rgba(34,197,94,0.18)',
  red:          '#ef4444',
  redBg:        'rgba(239,68,68,0.12)',
  gold:         '#facc15',
  textPrimary:  '#f1f5f9',
  textSecondary:'#94a3b8',
  textMuted:    '#475569',
  textDim:      '#64748b',
  mono:         "'JetBrains Mono', monospace",
  sans:         "'Plus Jakarta Sans', sans-serif",
};

// ────────────────────────────────────────────────
// Mock Data (unchanged)
// ────────────────────────────────────────────────
const MOCK_INDICES = [
  { id: 'IHSG',     label: 'IHSG',    price: 7_284.52, change: +0.83 },
  { id: 'LQ45',     label: 'LQ45',    price: 972.18,   change: +1.12 },
  { id: 'IDX30',    label: 'IDX30',   price: 534.77,   change: +0.91 },
  { id: 'JII',      label: 'JII',     price: 462.34,   change: -0.21 },
  { id: 'IDXSMC',   label: 'SMC',     price: 215.60,   change: +0.44 },
  { id: 'HIDIV20',  label: 'HIDIV20', price: 611.20,   change: -0.15 },
];

const MOCK_WATCHLIST = [
  { ticker: 'BBCA', name: 'Bank Central Asia',      price: 10_150, change: +1.50 },
  { ticker: 'TLKM', name: 'Telkom Indonesia',       price: 3_870,  change: -0.77 },
  { ticker: 'GOTO', name: 'GoTo Gojek Tokopedia',   price: 71,     change: +4.41 },
  { ticker: 'BBRI', name: 'Bank Rakyat Indonesia',  price: 4_240,  change: +0.48 },
  { ticker: 'ASII', name: 'Astra International',    price: 4_800,  change: -0.21 },
];

const MOCK_GAINERS = [
  { ticker: 'GOTO', name: 'GoTo Gojek Tokopedia',      price: 71,     change: +4.41 },
  { ticker: 'EMTK', name: 'Elang Mahkota Teknologi',   price: 1_510,  change: +3.78 },
  { ticker: 'ADRO', name: 'Adaro Andalan Indonesia',   price: 2_940,  change: +2.97 },
  { ticker: 'MDKA', name: 'Merdeka Copper Gold',       price: 2_190,  change: +2.34 },
  { ticker: 'INCO', name: 'Vale Indonesia',            price: 3_060,  change: +1.89 },
];

const MOCK_LOSERS = [
  { ticker: 'SIDO', name: 'Industri Jamu Sido Muncul', price: 580,   change: -3.33 },
  { ticker: 'HRUM', name: 'Harum Energy',              price: 1_260, change: -2.71 },
  { ticker: 'PTBA', name: 'Bukit Asam',                price: 2_880, change: -2.04 },
  { ticker: 'KLBF', name: 'Kalbe Farma',               price: 1_485, change: -1.65 },
  { ticker: 'BRIS', name: 'Bank Syariah Indonesia',    price: 2_240, change: -1.32 },
];

const MOCK_ACTIVE = [
  { ticker: 'BBRI', name: 'Bank Rakyat Indonesia',  price: 4_240,  change: +0.48, volume: 'Rp 2,1 T' },
  { ticker: 'GOTO', name: 'GoTo Gojek Tokopedia',   price: 71,     change: +4.41, volume: 'Rp 1,8 T' },
  { ticker: 'BBCA', name: 'Bank Central Asia',      price: 10_150, change: +1.50, volume: 'Rp 1,5 T' },
  { ticker: 'TLKM', name: 'Telkom Indonesia',       price: 3_870,  change: -0.77, volume: 'Rp 987 M' },
  { ticker: 'ASII', name: 'Astra International',    price: 4_800,  change: -0.21, volume: 'Rp 823 M' },
];

const MOCK_NEWS = [
  { id: 1, source: 'CNN Indonesia', category: 'Pasar',     emoji: '📈', time: '14 menit lalu', title: 'IHSG Menguat 0,83% Ditopang Saham Perbankan dan Teknologi' },
  { id: 2, source: 'Bisnis.com',    category: 'Makro',     emoji: '🏦', time: '1 jam lalu',    title: 'Bank Indonesia Pertahankan Suku Bunga di Level 6,00% Maret 2026' },
  { id: 3, source: 'Kontan',        category: 'Emiten',    emoji: '🚀', time: '2 jam lalu',    title: 'GoTo Cetak Laba Operasional Perdana, Saham GOTO Melonjak 4%' },
  { id: 4, source: 'CNBC Indonesia', category: 'Komoditas', emoji: '⚡',time: '3 jam lalu',    title: 'Harga Batubara Rebound, Saham Sektor Energi Direkomendasikan Buy' },
];

// ────────────────────────────────────────────────
// Helpers (unchanged logic)
// ────────────────────────────────────────────────
const formatIDR = (n: number) =>
  'Rp ' + n.toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

const pct = (n: number) => (n >= 0 ? `+${n.toFixed(2)}%` : `${n.toFixed(2)}%`);

const getGreeting = (name: string) => {
  const h = new Date().getHours();
  const salam = h < 11 ? 'Selamat pagi' : h < 15 ? 'Selamat siang' : h < 18 ? 'Selamat sore' : 'Selamat malam';
  return `${salam}, ${(name || 'Trader').split(' ')[0]}! 👋`;
};

const getDateID = () =>
  new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

const isMarketOpen = () => {
  const now = new Date();
  const wib = new Date(now.getTime() + (7 * 60 - (-now.getTimezoneOffset())) * 60 * 1000);
  const day = wib.getDay();
  if (day === 0 || day === 6) return false;
  const total = wib.getHours() * 60 + wib.getMinutes();
  return total >= 9 * 60 && total <= 15 * 60 + 50;
};

// ────────────────────────────────────────────────
// Sparkline — SahamGue colors
// ────────────────────────────────────────────────
const Sparkline = ({ positive }: { positive: boolean }) => {
  const color = positive ? SG.green : SG.red;
  const id = `sg-spark-${positive}`;
  return (
    <svg viewBox="0 0 80 30" className="w-20 h-8" fill="none">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {positive ? (
        <>
          <path d="M0 24 L10 22 L20 18 L30 20 L40 14 L50 10 L60 12 L70 6 L80 2"
            stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M0 24 L10 22 L20 18 L30 20 L40 14 L50 10 L60 12 L70 6 L80 2 L80 30 L0 30Z"
            fill={`url(#${id})`} />
        </>
      ) : (
        <>
          <path d="M0 4 L10 6 L20 8 L30 7 L40 14 L50 16 L60 20 L70 22 L80 26"
            stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M0 4 L10 6 L20 8 L30 7 L40 14 L50 16 L60 20 L70 22 L80 26 L80 30 L0 30Z"
            fill={`url(#${id})`} />
        </>
      )}
    </svg>
  );
};

// ────────────────────────────────────────────────
// 1. Market Pulse Bar — auto-scroll + LIVE badge
// ────────────────────────────────────────────────
const MarketPulseBar = () => {
  const open = isMarketOpen();
  const items = [...MOCK_INDICES, ...MOCK_INDICES]; // duplicate for seamless loop

  return (
    <div style={{ background: SG.bgSurface, borderBottom: `1px solid ${SG.border}` }}
      className="flex items-center gap-3 py-2.5 overflow-hidden"
    >
      {/* Badge */}
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-bold flex-shrink-0 ml-4"
        style={{ background: open ? 'rgba(34,197,94,0.15)' : 'rgba(245,158,11,0.15)',
                 color: open ? SG.green : '#f59e0b' }}
      >
        <span className="w-1.5 h-1.5 rounded-full animate-pulse inline-block"
          style={{ background: open ? SG.green : '#f59e0b' }} />
        <span className="uppercase">{open ? 'LIVE' : 'CLOSED'}</span>
      </div>

      {/* Auto-scroll strip */}
      <div className="flex-1 overflow-hidden relative"
        style={{ maskImage: 'linear-gradient(to right, transparent, black 4%, black 96%, transparent)' }}
      >
        <div className="ticker-scroll-inner flex gap-10" style={{ width: 'max-content' }}>
          {items.map((idx, i) => {
            const up = idx.change >= 0;
            return (
              <span key={i} className="inline-flex items-center gap-2 flex-shrink-0">
                <span style={{ fontFamily: SG.mono, fontWeight: 700, fontSize: '11px', color: SG.textSecondary }}>
                  {idx.label}
                </span>
                <span style={{ fontFamily: SG.mono, fontWeight: 600, fontSize: '11px', color: '#e2e8f0' }}>
                  {idx.price.toLocaleString('id-ID', { minimumFractionDigits: 2 })}
                </span>
                <span style={{ fontFamily: SG.mono, fontWeight: 700, fontSize: '11px', color: up ? SG.green : SG.red }}>
                  {up ? '▲' : '▼'} {Math.abs(idx.change).toFixed(2)}%
                </span>
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ────────────────────────────────────────────────
// 2. Portfolio Snapshot
// ────────────────────────────────────────────────
const PortfolioSnapshot = () => {
  const totalAsset = 285_450_000;
  const dailyPnL = +3_250_000;
  const dailyPct = +1.15;
  const up = dailyPnL >= 0;

  return (
    <div className="rounded-2xl p-5 relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #151b1e 0%, #0f1a1d 100%)',
               border: `1px solid ${up ? '#1e3a2f' : '#3a1e1e'}` }}
    >
      {/* Green radial glow  */}
      <div className="absolute top-0 right-0 w-36 h-36 pointer-events-none"
        style={{ background: 'radial-gradient(circle at top right, rgba(34,197,94,0.09), transparent 70%)' }} />
      {/* Top accent line */}
      <div className="absolute top-0 left-0 right-0 h-[2px] rounded-t-2xl"
        style={{ background: up ? SG.green : SG.red }} />

      <div className="flex items-start justify-between gap-4 relative">
        <div className="flex-1 min-w-0">
          <p className="text-[9px] font-bold uppercase mb-2" style={{ color: SG.textMuted, letterSpacing: '1.5px' }}>
            Portofolio Saya
          </p>
          <p className="tracking-tight" style={{ fontFamily: SG.mono, fontWeight: 800, fontSize: '24px', color: SG.textPrimary }}>
            {formatIDR(totalAsset)}
          </p>
          <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold"
            style={{ fontFamily: SG.mono, background: up ? SG.greenBg : SG.redBg, color: up ? SG.green : SG.red }}
          >
            {up ? '▲' : '▼'} {formatIDR(Math.abs(dailyPnL))} ({pct(dailyPct)})
            <span style={{ color: SG.textMuted, fontSize: '9px', marginLeft: 4 }}>hari ini</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Sparkline positive={up} />
          <span className="text-[9px] font-bold uppercase" style={{ color: SG.textMuted, letterSpacing: '1px' }}>7 hari</span>
        </div>
      </div>

      <div className="mt-3 pt-3 flex items-center gap-1.5" style={{ borderTop: `1px solid ${SG.border}` }}>
        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: SG.gold }} />
        <p className="text-[9px] font-bold" style={{ color: SG.textMuted }}>
          Data simulasi — hubungkan broker untuk sinkronisasi portofolio
        </p>
      </div>
    </div>
  );
};

// ────────────────────────────────────────────────
// 3. Market Summary
// ────────────────────────────────────────────────
const MarketSummary = () => {
  const sentiment: 'BULLISH' | 'BEARISH' | 'SIDEWAYS' = 'BULLISH';
  const map = {
    BULLISH:  { badgeBg: SG.green,  badgeText: SG.bgBase, icon: '🐂', desc: 'Tren naik, mayoritas saham hijau. Momentum beli masih kuat.' },
    BEARISH:  { badgeBg: SG.red,    badgeText: '#fff',    icon: '🐻', desc: 'Tekanan jual mendominasi. Waspada level support kritis.' },
    SIDEWAYS: { badgeBg: '#f59e0b', badgeText: SG.bgBase, icon: '↔️', desc: 'Konsolidasi. Pasar menunggu katalis baru.' },
  };
  const s = map[sentiment];

  return (
    <div className="rounded-2xl p-5" style={{ background: SG.bgSurface, border: `1px solid ${SG.border}` }}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-[9px] font-bold uppercase mb-2" style={{ color: SG.textMuted, letterSpacing: '1.5px' }}>
            Sentimen Pasar Hari Ini
          </p>
          <div className="flex items-center gap-2">
            <span className="text-lg">{s.icon}</span>
            <span className="px-2.5 py-1 rounded-lg text-xs font-bold"
              style={{ background: s.badgeBg, color: s.badgeText, fontWeight: 700 }}>
              {sentiment}
            </span>
          </div>
        </div>
        <p className="text-[9px] font-medium text-right leading-relaxed" style={{ color: SG.textMuted }}>
          Update:<br />10 Mar 2026, 15:47
        </p>
      </div>
      <p className="text-xs font-medium leading-relaxed mb-4" style={{ color: SG.textSecondary }}>{s.desc}</p>
      <div className="grid grid-cols-3 gap-2">
        {MOCK_INDICES.slice(0, 3).map((idx) => {
          const up = idx.change >= 0;
          return (
            <div key={idx.id} className="rounded-xl p-2.5 text-center" style={{ background: '#1e2a2f' }}>
              <p className="text-[9px] font-bold uppercase mb-0.5" style={{ color: SG.textMuted }}>{idx.label}</p>
              <p className="text-sm font-black mt-0.5" style={{ fontFamily: SG.mono, color: SG.textPrimary }}>
                {idx.price.toLocaleString('id-ID', { minimumFractionDigits: 0 })}
              </p>
              <p style={{ fontFamily: SG.mono, fontWeight: 700, fontSize: '10px', marginTop: 2, color: up ? SG.green : SG.red }}>
                {pct(idx.change)}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ────────────────────────────────────────────────
// 4. Watchlist Preview
// ────────────────────────────────────────────────
interface WatchlistPreviewProps {
  onNavigateWatchlist: () => void;
  onSelectStock: (ticker: string) => void;
}
const WatchlistPreview = ({ onNavigateWatchlist, onSelectStock }: WatchlistPreviewProps) => (
  <div className="rounded-2xl overflow-hidden" style={{ background: SG.bgSurface, border: `1px solid ${SG.border}` }}>
    <div className="flex items-center justify-between px-5 pt-5 pb-3">
      <div>
        <p className="text-[9px] font-bold uppercase mb-0.5" style={{ color: SG.textMuted, letterSpacing: '1.5px' }}>Watchlist</p>
        <h3 className="text-base font-bold" style={{ color: SG.textPrimary }}>Saham Pantauan</h3>
      </div>
      <button onClick={onNavigateWatchlist} className="text-[10px] font-bold transition-opacity hover:opacity-70"
        style={{ color: SG.green }}>
        Lihat Semua →
      </button>
    </div>
    <div>
      {MOCK_WATCHLIST.map((s, i) => {
        const up = s.change >= 0;
        return (
          <button key={s.ticker} onClick={() => onSelectStock(s.ticker)}
            className="w-full flex items-center justify-between px-5 py-3 touch-manipulation active:opacity-70 transition-colors text-left"
            style={{ borderTop: i > 0 ? `1px solid ${SG.border}` : 'none' }}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: up ? SG.greenBg : SG.redBg }}>
                <span style={{ fontFamily: SG.mono, fontWeight: 800, fontSize: '11px', color: up ? SG.green : SG.red }}>
                  {s.ticker.slice(0, 2)}
                </span>
              </div>
              <div className="min-w-0">
                <p style={{ fontFamily: SG.mono, fontWeight: 700, fontSize: '13px', color: SG.textPrimary }}>{s.ticker}</p>
                <p className="truncate" style={{ fontFamily: SG.sans, fontSize: '10px', color: SG.textDim, maxWidth: 140 }}>{s.name}</p>
              </div>
            </div>
            <div className="text-right flex-shrink-0 ml-2">
              <p style={{ fontFamily: SG.mono, fontWeight: 700, fontSize: '13px', color: SG.textPrimary }}>{formatIDR(s.price)}</p>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold"
                style={{ fontFamily: SG.mono, background: up ? SG.greenBg : SG.redBg, color: up ? SG.green : SG.red }}>
                {pct(s.change)}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  </div>
);

// ────────────────────────────────────────────────
// 5. Top Movers
// ────────────────────────────────────────────────
type MoverTab = 'gainers' | 'losers' | 'active';
const TopMovers = ({ onSelectStock }: { onSelectStock: (ticker: string) => void }) => {
  const [tab, setTab] = useState<MoverTab>('gainers');
  const rows = tab === 'gainers' ? MOCK_GAINERS : tab === 'losers' ? MOCK_LOSERS : MOCK_ACTIVE;
  const tabs: { id: MoverTab; label: string }[] = [
    { id: 'gainers', label: '▲ Naik' },
    { id: 'losers',  label: '▼ Turun' },
    { id: 'active',  label: '🔥 Aktif' },
  ];

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: SG.bgSurface, border: `1px solid ${SG.border}` }}>
      <div className="px-5 pt-5 pb-4">
        <p className="text-[9px] font-bold uppercase mb-0.5" style={{ color: SG.textMuted, letterSpacing: '1.5px' }}>Pergerakan Saham</p>
        <h3 className="text-base font-bold mb-3" style={{ color: SG.textPrimary }}>Top Movers</h3>
        {/* Tab pills */}
        <div className="flex gap-1.5">
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className="flex-1 py-2 px-2 rounded-xl text-[11px] font-bold touch-manipulation transition-all"
              style={{
                background: tab === t.id ? SG.green : '#1e2a2f',
                color: tab === t.id ? SG.bgBase : SG.textDim,
                fontWeight: tab === t.id ? 700 : 500,
              }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>
      <div>
        {rows.map((s, i) => {
          const up = s.change >= 0;
          return (
            <button key={s.ticker} onClick={() => onSelectStock(s.ticker)}
              className="w-full flex items-center gap-3 px-5 py-3 touch-manipulation active:opacity-70 transition-colors text-left"
              style={{ borderTop: `1px solid ${SG.border}` }}>
              <span className="text-[10px] font-black w-4 text-center flex-shrink-0" style={{ color: '#334155' }}>{i + 1}</span>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: up ? SG.greenBg : SG.redBg }}>
                <span style={{ fontFamily: SG.mono, fontWeight: 800, fontSize: '11px', color: up ? SG.green : SG.red }}>
                  {s.ticker.slice(0, 2)}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p style={{ fontFamily: SG.mono, fontWeight: 700, fontSize: '13px', color: SG.textPrimary }}>{s.ticker}</p>
                <p className="truncate" style={{ fontFamily: SG.sans, fontSize: '10px', color: SG.textDim }}>{s.name}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p style={{ fontFamily: SG.mono, fontWeight: 700, fontSize: '13px', color: SG.textPrimary }}>{formatIDR(s.price)}</p>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold"
                  style={{ fontFamily: SG.mono, background: up ? SG.greenBg : SG.redBg, color: up ? SG.green : SG.red }}>
                  {pct(s.change)}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

// ────────────────────────────────────────────────
// 6. News Feed
// ────────────────────────────────────────────────
const NewsFeedHome = () => (
  <div>
    <div className="flex items-center justify-between mb-3 px-1">
      <div>
        <p className="text-[9px] font-bold uppercase mb-0.5" style={{ color: SG.textMuted, letterSpacing: '1.5px' }}>Berita Terkini</p>
        <h3 className="text-base font-bold" style={{ color: SG.textPrimary }}>Pasar Modal Indonesia</h3>
      </div>
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded text-[9px] font-bold"
        style={{ background: SG.greenBg, color: SG.green }}>
        <span className="w-1.5 h-1.5 rounded-full animate-pulse inline-block" style={{ background: SG.green }} />
        LIVE
      </div>
    </div>
    <div className="space-y-2.5">
      {MOCK_NEWS.map((n) => (
        <div key={n.id}
          className="flex items-start gap-3 p-4 cursor-pointer touch-manipulation active:opacity-80 transition-colors"
          style={{ background: SG.bgSurface, border: `1px solid ${SG.border}`, borderRadius: '14px' }}
        >
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
            style={{ background: '#1e2a2f' }}>
            {n.emoji}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[8px] font-bold uppercase px-1.5 py-0.5 rounded"
                style={{ background: SG.greenBg, color: SG.green, letterSpacing: '0.5px' }}>
                {n.category}
              </span>
              <span className="text-[9px] font-medium" style={{ color: SG.textMuted }}>{n.source}</span>
            </div>
            <p className="font-medium line-clamp-2" style={{ fontFamily: SG.sans, fontSize: '13px', color: '#cbd5e1', lineHeight: 1.5 }}>
              {n.title}
            </p>
            <p className="text-[9px] font-medium mt-1" style={{ color: SG.textMuted }}>{n.time}</p>
          </div>
        </div>
      ))}
    </div>
  </div>
);

// ────────────────────────────────────────────────
// 7. Floating CTA
// ────────────────────────────────────────────────
const FloatingCTA = ({ onClick }: { onClick: () => void }) => (
  <button onClick={onClick}
    className="fixed bottom-20 right-4 z-40 flex items-center gap-2 font-bold touch-manipulation active:scale-95 transition-transform shadow-lg"
    style={{ background: SG.green, color: SG.bgBase, borderRadius: '50px', padding: '12px 20px', fontSize: '13px', fontWeight: 700, fontFamily: SG.sans }}
  >
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
    Analisis Saham
  </button>
);

// ────────────────────────────────────────────────
// Main Component
// ────────────────────────────────────────────────
const HomeDashboard: React.FC<HomeDashboardProps> = ({ user, onNavigateAnalysis, onNavigateWatchlist, onSelectStock }) => {
  const [greeting] = useState(() => getGreeting(user.name));
  const [dateStr]  = useState(() => getDateID());

  return (
    <div className="pb-28 lg:pb-12 animate-fade-in">

      {/* Greeting */}
      <div className="px-4 md:px-0 mb-5">
        <h2 className="text-xl md:text-2xl font-black tracking-tight" style={{ color: SG.textPrimary }}>
          {greeting}
        </h2>
        <p className="text-[11px] font-bold uppercase tracking-widest mt-1" style={{ color: SG.textMuted }}>
          {dateStr} • Sesi Bursa Aktif
        </p>
      </div>

      {/* Market Pulse Bar */}
      <div className="mb-5 -mx-4 md:mx-0">
        <MarketPulseBar />
      </div>

      {/* Portfolio + Sentiment — side by side on md+ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <PortfolioSnapshot />
        <MarketSummary />
      </div>

      {/* Watchlist Preview */}
      <div className="mb-4">
        <WatchlistPreview onNavigateWatchlist={onNavigateWatchlist} onSelectStock={onSelectStock} />
      </div>

      {/* Top Movers */}
      <div className="mb-4">
        <TopMovers onSelectStock={onSelectStock} />
      </div>

      {/* News Feed */}
      <div className="mb-4">
        <NewsFeedHome />
      </div>

      {/* Floating CTA — mobile only */}
      <div className="lg:hidden">
        <FloatingCTA onClick={onNavigateAnalysis} />
      </div>

      {/* Desktop CTA banner */}
      <div className="hidden lg:block">
        <button onClick={onNavigateAnalysis}
          className="w-full py-5 rounded-2xl font-bold text-base flex items-center justify-center gap-3 transition-opacity hover:opacity-90 active:scale-[0.99] shadow-lg"
          style={{ background: SG.green, color: SG.bgBase, fontFamily: SG.sans, fontWeight: 700 }}>
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          Analisis Saham Sekarang
          <svg className="w-4 h-4 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default HomeDashboard;
