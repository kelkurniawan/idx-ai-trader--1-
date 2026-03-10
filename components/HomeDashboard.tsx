import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '../context/ThemeContext';
import { Sun, Moon } from 'lucide-react';

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
// Mock Data
// ────────────────────────────────────────────────
const MOCK_INDICES = [
  { id: 'IHSG', label: 'IHSG', price: 7_284.52, change: +0.83 },
  { id: 'LQ45', label: 'LQ45', price: 972.18, change: +1.12 },
  { id: 'IDX30', label: 'IDX30', price: 534.77, change: +0.91 },
  { id: 'JII', label: 'JII', price: 462.34, change: -0.21 },
  { id: 'IDXSMC', label: 'SMC', price: 215.60, change: +0.44 },
  { id: 'IDXHIDIV20', label: 'HIDIV20', price: 611.20, change: -0.15 },
];

const MOCK_WATCHLIST = [
  { ticker: 'BBCA', name: 'Bank Central Asia', price: 10_150, change: +1.50, sector: 'Keuangan' },
  { ticker: 'TLKM', name: 'Telkom Indonesia', price: 3_870, change: -0.77, sector: 'Teknologi' },
  { ticker: 'GOTO', name: 'GoTo Gojek Tokopedia', price: 71, change: +4.41, sector: 'Teknologi' },
  { ticker: 'BBRI', name: 'Bank Rakyat Indonesia', price: 4_240, change: +0.48, sector: 'Keuangan' },
  { ticker: 'ASII', name: 'Astra International', price: 4_800, change: -0.21, sector: 'Industri' },
];

const MOCK_GAINERS = [
  { ticker: 'GOTO', name: 'GoTo Gojek Tokopedia', price: 71, change: +4.41 },
  { ticker: 'EMTK', name: 'Elang Mahkota Teknologi', price: 1_510, change: +3.78 },
  { ticker: 'ADRO', name: 'Adaro Andalan Indonesia', price: 2_940, change: +2.97 },
  { ticker: 'MDKA', name: 'Merdeka Copper Gold', price: 2_190, change: +2.34 },
  { ticker: 'INCO', name: 'Vale Indonesia', price: 3_060, change: +1.89 },
];

const MOCK_LOSERS = [
  { ticker: 'SIDO', name: 'Industri Jamu Sido Muncul', price: 580, change: -3.33 },
  { ticker: 'HRUM', name: 'Harum Energy', price: 1_260, change: -2.71 },
  { ticker: 'PTBA', name: 'Bukit Asam', price: 2_880, change: -2.04 },
  { ticker: 'KLBF', name: 'Kalbe Farma', price: 1_485, change: -1.65 },
  { ticker: 'BRIS', name: 'Bank Syariah Indonesia', price: 2_240, change: -1.32 },
];

const MOCK_ACTIVE = [
  { ticker: 'BBRI', name: 'Bank Rakyat Indonesia', price: 4_240, change: +0.48, volume: 'Rp 2,1 T' },
  { ticker: 'GOTO', name: 'GoTo Gojek Tokopedia', price: 71, change: +4.41, volume: 'Rp 1,8 T' },
  { ticker: 'BBCA', name: 'Bank Central Asia', price: 10_150, change: +1.50, volume: 'Rp 1,5 T' },
  { ticker: 'TLKM', name: 'Telkom Indonesia', price: 3_870, change: -0.77, volume: 'Rp 987 M' },
  { ticker: 'ASII', name: 'Astra International', price: 4_800, change: -0.21, volume: 'Rp 823 M' },
];

const MOCK_NEWS = [
  {
    id: 1,
    source: 'CNN Indonesia',
    title: 'IHSG Menguat 0,83% Ditopang Saham Perbankan dan Teknologi',
    time: '14 menit lalu',
    category: 'Pasar',
    color: 'from-indigo-500 to-indigo-700',
    emoji: '📈',
  },
  {
    id: 2,
    source: 'Bisnis.com',
    title: 'Bank Indonesia Pertahankan Suku Bunga di Level 6,00% Maret 2026',
    time: '1 jam lalu',
    category: 'Makro',
    color: 'from-amber-500 to-orange-600',
    emoji: '🏦',
  },
  {
    id: 3,
    source: 'Kontan',
    title: "GoTo Cetak Laba Operasional Perdana, Saham GOTO Melonjak 4%",
    time: '2 jam lalu',
    category: 'Emiten',
    color: 'from-emerald-500 to-teal-600',
    emoji: '🚀',
  },
  {
    id: 4,
    source: 'CNBC Indonesia',
    title: 'Harga Batubara Rebound, Saham Sektor Energi Direkomendasikan Buy',
    time: '3 jam lalu',
    category: 'Komoditas',
    color: 'from-rose-500 to-pink-600',
    emoji: '⚡',
  },
];

// ────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────
const formatIDR = (n: number) =>
  'Rp ' +
  n.toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

const pct = (n: number) => (n >= 0 ? `+${n.toFixed(2)}%` : `${n.toFixed(2)}%`);

const getGreeting = (name: string) => {
  const h = new Date().getHours();
  const salam =
    h < 11 ? 'Selamat pagi' : h < 15 ? 'Selamat siang' : h < 18 ? 'Selamat sore' : 'Selamat malam';
  return `${salam}, ${name.split(' ')[0]}! 👋`;
};

const getDateID = () => {
  const d = new Date();
  return d.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

// Mini sparkline — static bullish path
const Sparkline = ({ positive }: { positive: boolean }) => {
  const color = positive ? '#10b981' : '#ef4444';
  return (
    <svg viewBox="0 0 80 30" className="w-20 h-8" fill="none">
      <defs>
        <linearGradient id={`sg-${positive}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {positive ? (
        <>
          <path
            d="M0 24 L10 22 L20 18 L30 20 L40 14 L50 10 L60 12 L70 6 L80 2"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M0 24 L10 22 L20 18 L30 20 L40 14 L50 10 L60 12 L70 6 L80 2 L80 30 L0 30Z"
            fill={`url(#sg-${positive})`}
          />
        </>
      ) : (
        <>
          <path
            d="M0 4 L10 6 L20 8 L30 7 L40 14 L50 16 L60 20 L70 22 L80 26"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M0 4 L10 6 L20 8 L30 7 L40 14 L50 16 L60 20 L70 22 L80 26 L80 30 L0 30Z"
            fill={`url(#sg-${positive})`}
          />
        </>
      )}
    </svg>
  );
};

// ────────────────────────────────────────────────
// Sub-components
// ────────────────────────────────────────────────

/** 1. Market Pulse Bar */
const MarketPulseBar = () => {
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <div className="overflow-x-auto pb-1" ref={scrollRef} style={{ scrollbarWidth: 'none' }}>
      <div className="flex gap-2 min-w-max px-4 md:px-0">
        {MOCK_INDICES.map((idx) => {
          const up = idx.change >= 0;
          return (
            <div
              key={idx.id}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold whitespace-nowrap transition-all
                ${up
                  ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800/40 text-emerald-700 dark:text-emerald-300'
                  : 'bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800/40 text-red-700 dark:text-red-300'
                }`}
            >
              <span className="font-black text-slate-700 dark:text-slate-200">{idx.label}</span>
              <span className="font-mono text-slate-700 dark:text-slate-200">
                {idx.price.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className={`flex items-center gap-0.5 ${up ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                {up ? '▲' : '▼'} {Math.abs(idx.change).toFixed(2)}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/** 2. Portfolio Snapshot */
const PortfolioSnapshot = () => {
  const totalAsset = 285_450_000;
  const dailyPnL = +3_250_000;
  const dailyPct = +1.15;
  const up = dailyPnL >= 0;

  return (
    <div className="glass-card rounded-2xl p-5 relative overflow-hidden animate-slide-up">
      <div className={`absolute top-0 left-0 right-0 h-1 rounded-t-2xl ${up ? 'accent-emerald' : 'accent-rose'}`} />
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">
            Portofolio Saya
          </p>
          <p className="text-2xl font-mono font-black text-slate-800 dark:text-slate-100 tracking-tight">
            {formatIDR(totalAsset)}
          </p>
          <div className={`mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-black
            ${up ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400'
                 : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'}`}>
            {up ? '▲' : '▼'} {formatIDR(Math.abs(dailyPnL))} &nbsp;({up ? '+' : ''}{dailyPct.toFixed(2)}%)
            <span className="text-slate-400 dark:text-slate-500 font-bold text-[9px]">hari ini</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Sparkline positive={up} />
          <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">7 hari</span>
        </div>
      </div>
      <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
        <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block"></span>
          Data simulasi — hubungkan broker untuk sinkronisasi portofolio
        </p>
      </div>
    </div>
  );
};

/** 3. Watchlist Preview */
interface WatchlistPreviewProps {
  onNavigateWatchlist: () => void;
  onSelectStock: (ticker: string) => void;
}
const WatchlistPreview = ({ onNavigateWatchlist, onSelectStock }: WatchlistPreviewProps) => (
  <div className="glass-card rounded-2xl overflow-hidden animate-slide-up stagger-1">
    <div className="flex items-center justify-between px-5 pt-5 pb-3">
      <div>
        <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Watchlist</p>
        <h3 className="text-base font-black text-slate-800 dark:text-slate-100">Saham Pantauan</h3>
      </div>
      <button
        onClick={onNavigateWatchlist}
        className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest hover:underline"
      >
        Lihat Semua →
      </button>
    </div>
    <div className="divide-y divide-slate-100 dark:divide-slate-800">
      {MOCK_WATCHLIST.map((s) => {
        const up = s.change >= 0;
        return (
          <button
            key={s.ticker}
            onClick={() => onSelectStock(s.ticker)}
            className="w-full flex items-center justify-between px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors touch-manipulation active:scale-[0.99] text-left"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-black text-indigo-600 dark:text-indigo-400">{s.ticker.slice(0, 2)}</span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-black text-slate-800 dark:text-slate-100">{s.ticker}</p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium truncate max-w-[120px] sm:max-w-[160px]">{s.name}</p>
              </div>
            </div>
            <div className="text-right flex-shrink-0 ml-2">
              <p className="text-sm font-mono font-black text-slate-800 dark:text-slate-100">
                {formatIDR(s.price)}
              </p>
              <span className={`text-[10px] font-black px-1.5 py-0.5 rounded
                ${up ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400'
                     : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'}`}>
                {pct(s.change)}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  </div>
);

/** 4. Market Summary */
const MarketSummary = () => {
  const sentiment = 'BULLISH';
  const sentimentMap: Record<string, { color: string; icon: string; desc: string }> = {
    BULLISH: { color: 'bg-emerald-500', icon: '🐂', desc: 'Tren naik, mayoritas saham hijau. Momentum beli masih kuat.' },
    BEARISH: { color: 'bg-red-500', icon: '🐻', desc: 'Tekanan jual mendominasi. Waspada level support kritis.' },
    SIDEWAYS: { color: 'bg-amber-500', icon: '↔️', desc: 'Konsolidasi. Pasar menunggu katalis baru.' },
  };
  const s = sentimentMap[sentiment];

  return (
    <div className="glass-card rounded-2xl p-5 animate-slide-up stagger-2">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Sentimen Pasar Hari Ini</p>
          <div className="flex items-center gap-2">
            <span className="text-xl">{s.icon}</span>
            <span className={`px-3 py-1 rounded-lg text-xs font-black text-white ${s.color}`}>{sentiment}</span>
          </div>
        </div>
        <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold text-right leading-relaxed">
          Update:<br />10 Mar 2026, 15:47
        </p>
      </div>
      <p className="text-xs text-slate-600 dark:text-slate-300 font-medium leading-relaxed mb-4">{s.desc}</p>
      <div className="grid grid-cols-3 gap-2">
        {MOCK_INDICES.slice(0, 3).map((idx) => {
          const up = idx.change >= 0;
          return (
            <div key={idx.id} className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-2.5 text-center">
              <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{idx.label}</p>
              <p className="text-sm font-mono font-black text-slate-800 dark:text-slate-100 mt-0.5">
                {idx.price.toLocaleString('id-ID', { minimumFractionDigits: 0 })}
              </p>
              <p className={`text-[10px] font-black mt-0.5 ${up ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                {pct(idx.change)}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/** 5. Top Movers */
type MoverTab = 'gainers' | 'losers' | 'active';

interface TopMoversProps {
  onSelectStock: (ticker: string) => void;
}
const TopMovers = ({ onSelectStock }: TopMoversProps) => {
  const [tab, setTab] = useState<MoverTab>('gainers');
  const tabData: Record<MoverTab, typeof MOCK_GAINERS | typeof MOCK_ACTIVE> = {
    gainers: MOCK_GAINERS,
    losers: MOCK_LOSERS,
    active: MOCK_ACTIVE,
  };
  const rows = tabData[tab];

  const tabs: { id: MoverTab; label: string }[] = [
    { id: 'gainers', label: '▲ Naik' },
    { id: 'losers', label: '▼ Turun' },
    { id: 'active', label: '🔥 Teraktif' },
  ];

  return (
    <div className="glass-card rounded-2xl overflow-hidden animate-slide-up stagger-3">
      <div className="px-5 pt-5 pb-4">
        <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Pergerakan Saham</p>
        <h3 className="text-base font-black text-slate-800 dark:text-slate-100 mb-3">Top Movers</h3>
        {/* Tabs */}
        <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 py-2 px-1 rounded-lg text-[10px] font-black transition-all touch-manipulation
                ${tab === t.id
                  ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 shadow-sm'
                  : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
                }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {rows.map((s, i) => {
          const up = s.change >= 0;
          return (
            <button
              key={s.ticker}
              onClick={() => onSelectStock(s.ticker)}
              className="w-full flex items-center gap-3 px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors touch-manipulation active:scale-[0.99] text-left"
            >
              <span className="text-[10px] font-black text-slate-400 dark:text-slate-600 w-4 text-center flex-shrink-0">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black text-slate-800 dark:text-slate-100">{s.ticker}</p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium truncate">{s.name}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-mono font-black text-slate-800 dark:text-slate-100">{formatIDR(s.price)}</p>
                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded
                  ${up
                    ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400'
                    : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
                  }`}>
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

/** 6. News Feed */
const NewsFeedHome = () => (
  <div className="animate-slide-up stagger-4">
    <div className="flex items-center justify-between mb-3 px-1">
      <div>
        <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Berita Terkini</p>
        <h3 className="text-base font-black text-slate-800 dark:text-slate-100">Pasar Modal Indonesia</h3>
      </div>
      <span className="flex items-center gap-1.5 text-[9px] font-black text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block"></span>
        LIVE
      </span>
    </div>
    <div className="space-y-3">
      {MOCK_NEWS.map((n) => (
        <div
          key={n.id}
          className="glass-card rounded-2xl p-4 flex items-start gap-3 hover:scale-[1.005] transition-transform cursor-pointer touch-manipulation active:scale-[0.99]"
        >
          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${n.color} flex items-center justify-center text-lg flex-shrink-0 shadow-sm`}>
            {n.emoji}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[8px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 px-1.5 py-0.5 rounded">
                {n.category}
              </span>
              <span className="text-[8px] text-slate-400 dark:text-slate-500 font-bold">{n.source}</span>
            </div>
            <p className="text-xs font-bold text-slate-700 dark:text-slate-200 leading-snug line-clamp-2">{n.title}</p>
            <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-1 font-medium">{n.time}</p>
          </div>
        </div>
      ))}
    </div>
  </div>
);

/** 7. Floating CTA */
const FloatingCTA = ({ onClick }: { onClick: () => void }) => (
  <button
    onClick={onClick}
    className="fixed bottom-20 right-4 z-40 flex items-center gap-2 px-4 py-3 rounded-full shadow-2xl shadow-amber-500/30 font-black text-sm text-white touch-manipulation active:scale-[0.95] transition-transform"
    style={{
      background: 'linear-gradient(135deg, #f59e0b, #ea580c)',
      animation: 'pulse 2.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
    }}
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
const HomeDashboard: React.FC<HomeDashboardProps> = ({
  user,
  onNavigateAnalysis,
  onNavigateWatchlist,
  onSelectStock,
}) => {
  const [greeting] = useState(() => getGreeting(user.name));
  const [dateStr] = useState(() => getDateID());

  // Navigate to analysis and pre-select stock
  const handleSelectStock = (ticker: string) => {
    onSelectStock(ticker);
  };

  return (
    <div className="pb-28 lg:pb-12 animate-fade-in">

      {/* Greeting */}
      <div className="px-4 md:px-0 mb-5">
        <h2 className="text-xl md:text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
          {greeting}
        </h2>
        <p className="text-[11px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest mt-1">
          {dateStr} • Sesi Bursa Aktif
        </p>
      </div>

      {/* Market Pulse Bar */}
      <div className="mb-5 -mx-4 md:mx-0">
        <MarketPulseBar />
      </div>

      {/* Portfolio Snapshot + Market Summary — side by side on md+ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <PortfolioSnapshot />
        <MarketSummary />
      </div>

      {/* Watchlist Preview */}
      <div className="mb-4">
        <WatchlistPreview onNavigateWatchlist={onNavigateWatchlist} onSelectStock={handleSelectStock} />
      </div>

      {/* Top Movers */}
      <div className="mb-4">
        <TopMovers onSelectStock={handleSelectStock} />
      </div>

      {/* News Feed */}
      <div className="mb-4">
        <NewsFeedHome />
      </div>

      {/* Floating CTA — only on mobile (lg: uses sidebar + nav already) */}
      <div className="lg:hidden">
        <FloatingCTA onClick={onNavigateAnalysis} />
      </div>

      {/* Desktop CTA Banner */}
      <div className="hidden lg:block">
        <button
          onClick={onNavigateAnalysis}
          className="w-full py-5 rounded-2xl font-black text-white text-base flex items-center justify-center gap-3 transition-all hover:opacity-90 active:scale-[0.99] shadow-xl shadow-amber-500/20"
          style={{ background: 'linear-gradient(135deg, #f59e0b, #ea580c)' }}
        >
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
