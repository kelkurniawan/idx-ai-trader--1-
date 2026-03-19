
import React, { useState, useEffect, useCallback, useMemo, useRef, Suspense } from 'react';

import {
  SAMPLE_IDX_STOCKS,
  IDX_SECTORS,
  IDX_STOCK_INDICES,
  StockProfile,
  StockDataPoint,
  TechnicalIndicators,
  AIAnalysisResult,
  RealTimeMarketData,
  PortfolioItem,
  User,
  TimeFrame,
  SignalType,
  NewsItem,
  FundamentalData,
  InvestmentVerdict,
  QualitativeAnalysis,
  QuantitativeAnalysis,
  AnalysisApproach,
  ChartMode,
  OHLCDataPoint
} from './types';
import { generateMockStockData, calculateTechnicals, generateIntradayData, generateMockOHLCData, generateIntradayOHLCData } from './services/marketDataService';
import { loadStockAnalysis, pollRealTimePrice, IS_MOCK } from './services/dataProvider';
import Gauge from './components/Gauge';
import Chart from './components/Chart';
import IndicatorCard from './components/IndicatorCard';
import TrendAnalysis from './components/TrendAnalysis';
import NewsFeed from './components/NewsFeed';
import { HeaderPriceSkeleton, AnalysisSkeleton, GaugeSkeleton, TrendSkeleton } from './components/Skeletons';
import { LoginPage, RegisterPage } from './components/Auth';
import ProfileSetup from './components/ProfileSetup';
import MfaVerify from './components/MfaVerify';
import MfaSetup from './components/MfaSetup';
import { checkAuthStatus, logout as apiLogout, getMe } from './services/authApi';
import type { ProfileUser } from './services/profileApi';

// Lazy-loaded components (only loaded when their tab/view is active)
const ChartAnalyzer = React.lazy(() => import('./components/ChartAnalyzer'));
const Backtester = React.lazy(() => import('./components/Backtester'));
const TradeJournal = React.lazy(() => import('./components/TradeJournal'));
const LearningCenter = React.lazy(() => import('./components/LearningCenter'));
const Community = React.lazy(() => import('./components/Community'));
const Watchlist = React.lazy(() => import('./components/Watchlist'));
const AdminDashboard = React.lazy(() => import('./components/admin/AdminDashboard'));// RESTYLED: SahamGue Design System
const ProfilePageLazy = React.lazy(() => import('./pages/ProfilePage'));
const ProfileMenuLazy = React.lazy(() => import('./components/profile/ProfileMenu'));
import HomeDashboard from './components/HomeDashboard';
import { NewsPage, TickerNewsPanel } from './components/NewsPage';


// ─── Feature Flags ───────────────────────────────────────────────────────────
// Set ARCHIVED = true to hide legacy menus from the UI (routes kept intact)
const ARCHIVED = true;

// ─── SahamGue Design Tokens ───────────────────────────────────────────────
const SG = {
  bg:        'var(--bg-header)',
  bgBase:    'var(--bg-base)',
  bgHeader:  'var(--bg-header)',
  surface:   'var(--bg-surface)',
  bgSurface: 'var(--bg-surface)',
  bgMuted:   'var(--bg-muted)',
  border:    'var(--border)',
  green:     'var(--accent)',
  greenBg:   'var(--accent-bg)',
  red:       'var(--semantic-red)',
  text:      'var(--text-primary)',
  textPrimary: 'var(--text-primary)',
  textSecond: 'var(--text-second)',
  textMuted: 'var(--text-muted)',
  muted:     'var(--text-muted)',
  dim:       'var(--text-dim)',
  textDim:   'var(--text-dimmer)',
  mono:      "'JetBrains Mono', monospace",
  sans:      "'Plus Jakarta Sans', sans-serif",
};

// Helper Components moved to top for hoisting safety
const FundamentalsCard = ({ data }: { data: FundamentalData }) => (
  <div className="sg-surface rounded-2xl md:rounded-3xl p-5 md:p-8 relative overflow-hidden h-full animate-slide-up">
    <div className="absolute top-0 left-0 w-1.5 h-full rounded-l-2xl md:rounded-l-3xl" style={{background: SG.green}} />
    <h3 className="text-sm md:text-lg font-black mb-5 md:mb-6 flex items-center gap-2 md:gap-3 font-jakarta" style={{color: SG.textPrimary}}>
      <div className="w-8 h-8 md:w-9 md:h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{background: SG.greenBg}}>
        <span className="text-base md:text-lg">🏛️</span>
      </div>
      Fundamental Health
    </h3>
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
      <div className="space-y-1">
        <p className="text-[10px] font-black uppercase tracking-widest truncate font-jakarta" style={{color: SG.textMuted}}>P/E Ratio</p>
        <p className="text-lg md:text-xl font-black truncate font-mono-trading" style={{color: SG.textPrimary}}>{data.peRatio?.toFixed(2)}x</p>
      </div>
      <div className="space-y-1">
        <p className="text-[10px] font-black uppercase tracking-widest truncate font-jakarta" style={{color: SG.textMuted}}>PBV Ratio</p>
        <p className="text-lg md:text-xl font-black truncate font-mono-trading" style={{color: SG.textPrimary}}>{data.pbvRatio?.toFixed(2)}x</p>
      </div>
      <div className="space-y-1">
        <p className="text-[10px] font-black uppercase tracking-widest truncate font-jakarta" style={{color: SG.textMuted}}>ROE</p>
        <p className={`text-lg md:text-xl font-black truncate font-mono-trading`} style={{color: data.roe > 15 ? SG.green : SG.textPrimary}}>{data.roe?.toFixed(2)}%</p>
      </div>
      <div className="space-y-1">
        <p className="text-[10px] font-black uppercase tracking-widest truncate font-jakarta" style={{color: SG.textMuted}}>DER</p>
        <p className={`text-lg md:text-xl font-black truncate font-mono-trading`} style={{color: data.der < 1 ? SG.green : SG.textPrimary}}>{data.der?.toFixed(2)}x</p>
      </div>
      <div className="space-y-1">
        <p className="text-[10px] font-black uppercase tracking-widest truncate font-jakarta" style={{color: SG.textMuted}}>Div. Yield</p>
        <p className="text-lg md:text-xl font-black truncate font-mono-trading" style={{color: SG.textPrimary}}>{data.dividendYield?.toFixed(2)}%</p>
      </div>
      <div className="space-y-1">
        <p className="text-[10px] font-black uppercase tracking-widest truncate font-jakarta" style={{color: SG.textMuted}}>Market Cap</p>
        <p className="text-xs md:text-sm font-black truncate font-mono-trading" style={{color: SG.textPrimary}}>{data.marketCap}</p>
      </div>
    </div>
  </div>
);

const VerdictCard = ({ verdict }: { verdict: InvestmentVerdict }) => {
  const accentColor = verdict.rating === 'Buy' ? SG.green : verdict.rating === 'Sell' ? SG.red : '#facc15';
  const accentBg = verdict.rating === 'Buy' ? SG.greenBg : verdict.rating === 'Sell' ? 'rgba(239, 68, 68, 0.12)' : 'rgba(250, 204, 21, 0.12)';
  return (
    <div className="sg-surface rounded-2xl md:rounded-3xl p-5 md:p-8 relative overflow-hidden h-full animate-slide-up">
      <div className={`absolute top-0 left-0 right-0 h-1 rounded-t-2xl md:rounded-t-3xl`} style={{background: accentColor}} />
      <div className="flex flex-col sm:flex-row sm:justify-between items-start mb-5 md:mb-8 gap-4 sm:gap-0">
        <div>
          <h3 className="text-sm md:text-lg font-black mb-2 font-jakarta" style={{color: SG.textPrimary}}>Investment Verdict</h3>
          <span className={`px-3 md:px-4 py-1.5 md:py-2 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest font-jakarta`} style={{color: accentColor, background: accentBg}}>
            {verdict.rating}
          </span>
        </div>
        <div className="text-left w-full sm:text-right sm:w-auto">
          <div className="flex justify-start sm:justify-end gap-2 items-end h-10">
            {['Growth', 'Value', 'Dividend'].map((type) => (
              <div key={type} className="flex flex-col items-center gap-1 group w-4">
                <div className="w-full rounded-full h-full relative overflow-hidden" style={{background: SG.bgMuted}}>
                  <div className="absolute bottom-0 w-full rounded-full transition-all duration-1000" style={{ height: `${(verdict.suitability as any)[type.toLowerCase()] || 0}%`, background: SG.textSecond }}></div>
                </div>
                <span className="text-[8px] font-black uppercase font-jakarta" style={{color: SG.textMuted}}>{type[0]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <h4 className="text-[9px] font-black uppercase tracking-widest mb-3 font-jakarta" style={{color: SG.green}}>Pros</h4>
          <ul className="space-y-2">
            {verdict.pros.slice(0, 3).map((pro, i) => (
              <li key={i} className="flex items-start gap-2 text-[10px] font-bold leading-tight font-jakarta" style={{color: SG.textPrimary}}>
                <span className="mt-0.5 flex-shrink-0" style={{color: SG.green}}>✓</span> <span>{pro}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="text-[9px] font-black uppercase tracking-widest mb-3 font-jakarta" style={{color: SG.red}}>Cons</h4>
          <ul className="space-y-2">
            {verdict.cons.slice(0, 3).map((con, i) => (
              <li key={i} className="flex items-start gap-2 text-[10px] font-bold leading-tight font-jakarta" style={{color: SG.textPrimary}}>
                <span className="mt-0.5 flex-shrink-0" style={{color: SG.red}}>✕</span> <span>{con}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

const QualitativeCard = ({ data }: { data: QualitativeAnalysis }) => (
  <div className="sg-surface rounded-2xl md:rounded-3xl p-5 md:p-8 relative overflow-hidden animate-slide-up stagger-1 h-full">
    <div className="absolute top-0 left-0 w-1.5 h-full rounded-l-2xl md:rounded-l-3xl" style={{background: '#3b82f6'}} />
    <h3 className="text-sm md:text-lg font-black mb-5 md:mb-6 flex items-center gap-2 md:gap-3 font-jakarta" style={{color: SG.textPrimary}}>
      <div className="w-8 h-8 md:w-9 md:h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{background: 'rgba(59, 130, 246, 0.1)'}}>
        <span className="text-base md:text-lg">🎯</span>
      </div>
      Qualitative Analysis
    </h3>
    <div className="space-y-4 md:space-y-5">
      {[
        { label: 'Business Model', text: data.businessModel },
        { label: 'Management Quality', text: data.managementQuality },
        { label: 'Industry Prospects', text: data.industryProspects },
        { label: 'Competitive Position', text: data.competitivePosition },
      ].map(({ label, text }) => (
        <div key={label} className="group">
          <h4 className="text-[10px] md:text-xs font-black uppercase tracking-widest mb-1.5 font-jakarta" style={{color: '#60a5fa'}}>{label}</h4>
          <p className="text-xs md:text-sm leading-relaxed font-jakarta" style={{color: SG.textPrimary}}>{text}</p>
        </div>
      ))}
    </div>
  </div>
);

const QuantitativeCard = ({ data }: { data: QuantitativeAnalysis }) => (
  <div className="sg-surface rounded-2xl md:rounded-3xl p-5 md:p-8 relative overflow-hidden animate-slide-up stagger-2 h-full">
    <div className="absolute top-0 left-0 w-1.5 h-full rounded-l-2xl md:rounded-l-3xl" style={{background: '#8b5cf6'}} />
    <h3 className="text-sm md:text-lg font-black mb-5 md:mb-6 flex items-center gap-2 md:gap-3 font-jakarta" style={{color: SG.textPrimary}}>
      <div className="w-8 h-8 md:w-9 md:h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{background: 'rgba(139, 92, 246, 0.1)'}}>
        <span className="text-base md:text-lg">📊</span>
      </div>
      Quantitative Analysis
    </h3>
    <div className="space-y-5 md:space-y-6">
      {[
        { label: 'Income Statement', entries: data.incomeStatement, color: '#a78bfa' },
        { label: 'Balance Sheet', entries: data.balanceSheet, color: '#a78bfa' },
        { label: 'Cash Flow', entries: data.cashFlow, color: '#a78bfa' },
      ].map(({ label, entries, color }) => (
        <div key={label}>
          <h4 className={`text-[10px] md:text-xs font-black uppercase tracking-widest mb-3 font-jakarta`} style={{color}}>{label}</h4>
          <div className="grid grid-cols-2 gap-3 md:gap-4">
            {Object.entries(entries).map(([key, value]) => (
              <div key={key} className="space-y-1">
                <p className="text-[8px] md:text-[9px] font-black uppercase tracking-widest truncate font-jakarta" style={{color: SG.textMuted}}>{key.replace(/_/g, ' ')}</p>
                <p className="text-sm md:text-base font-black truncate font-mono-trading" style={{color: SG.textPrimary}}>{value}</p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  </div>
);

const AnalysisApproachCard = ({ data }: { data: AnalysisApproach }) => (
  <div className="sg-surface rounded-2xl p-5 md:p-6 relative overflow-hidden animate-slide-up h-full" style={{border: `1px solid ${SG.border}`}}>
    <div className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl" style={{background: '#818cf8'}} />
    <h3 className="text-xs md:text-sm font-black uppercase tracking-widest mb-4 md:mb-5 flex items-center gap-2.5 font-jakarta" style={{color: SG.textPrimary}}>
      <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{background: 'rgba(99, 102, 241, 0.1)'}}>
        <span className="text-sm md:text-base">🔍</span>
      </div>
      Analysis Approach
    </h3>
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="px-3 md:px-3.5 py-1 md:py-1.5 rounded-lg text-[9px] md:text-[10px] font-black uppercase tracking-widest font-jakarta" style={{background: 'rgba(99, 102, 241, 0.1)', color: '#818cf8'}}>
          {data.methodology}
        </span>
      </div>
      <p className="text-xs md:text-sm leading-relaxed font-medium font-jakarta" style={{color: SG.textPrimary}}>{data.description}</p>
      <div className="pt-2">
        <h4 className="text-[10px] md:text-xs font-black uppercase tracking-widest mb-2 md:mb-3 font-jakarta" style={{color: '#818cf8'}}>Key Factors</h4>
        <ul className="space-y-2">
          {data.keyFactors.map((factor, i) => (
            <li key={i} className="flex items-start gap-2 text-xs md:text-sm font-medium font-jakarta" style={{color: SG.textPrimary}}>
              <span className="w-4 h-4 md:w-5 md:h-5 rounded-md flex items-center justify-center text-[9px] md:text-[10px] font-black flex-shrink-0 mt-0.5" style={{background: 'rgba(99, 102, 241, 0.1)', color: '#818cf8'}}>{i + 1}</span>
              <span>{factor}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  </div>
);

const DashboardHeroCard = ({ icon, title, desc, activeCount, color, onClick }: any) => (
  <div onClick={onClick} className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl md:rounded-3xl p-6 md:p-8 hover:shadow-2xl hover:shadow-${color}-500/10 transition-all group relative overflow-hidden flex flex-col h-full border-b-4 md:border-b-[8px] border-b-${color}-500 cursor-pointer active:scale-[0.99]`}>
    <div className="absolute top-0 right-0 p-4 md:p-6">
      <span className="bg-slate-900 dark:bg-slate-800 text-white text-[8px] md:text-[9px] px-2 md:px-3 py-1 rounded-full font-black tracking-widest uppercase shadow-xl">{activeCount} TRADERS</span>
    </div>
    <div className={`w-12 h-12 md:w-16 md:h-16 bg-${color}-50 dark:bg-${color}-900/20 rounded-xl md:rounded-2xl flex items-center justify-center text-2xl md:text-3xl mb-4 md:mb-6 border border-${color}-100 dark:border-${color}-900/50 group-hover:scale-110 transition-transform shadow-inner`}>{icon}</div>
    <h3 className="text-xl md:text-2xl font-black text-slate-800 dark:text-slate-100 mb-2 md:mb-3 tracking-tight">{title}</h3>
    <p className="text-slate-400 dark:text-slate-500 font-bold text-xs md:text-sm mb-8 md:mb-12 leading-relaxed flex-grow">{desc}</p>
    <button className={`w-full min-h-touch py-3 md:py-4 bg-${color}-600 hover:bg-${color}-700 text-white font-black rounded-xl md:rounded-2xl transition-all shadow-xl shadow-${color}-100 dark:shadow-none active:scale-95 text-sm md:text-base`}>Launch AI Vision</button>
  </div>
);

const ToolGridCard = ({ icon, label, sub, badge, onClick }: any) => (
  <div onClick={onClick} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 md:p-5 flex items-center gap-3 md:gap-5 min-h-[72px] md:min-h-[80px] cursor-pointer hover:border-indigo-500 hover:shadow-lg transition-all group border-b-4 border-b-transparent active:scale-95 select-none touch-manipulation">
    <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-slate-50 dark:bg-slate-800 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/20 flex items-center justify-center text-xl md:text-2xl transition-colors shadow-inner flex-shrink-0">{icon}</div>
    <div className="flex-1 min-w-0">
      <h4 className="font-black text-slate-800 dark:text-slate-200 text-xs md:text-sm flex items-center gap-2 truncate">
        {label}
        {badge && <span className="text-[6px] md:text-[7px] bg-indigo-600 text-white px-1.5 md:px-2 py-0.5 rounded-full font-black tracking-tighter flex-shrink-0">{badge}</span>}
      </h4>
      <p className="text-[8px] md:text-[9px] text-slate-400 font-black uppercase tracking-wider mt-1 md:mt-1.5 truncate">{sub}</p>
    </div>
    <div className="text-slate-300 dark:text-slate-600 group-hover:text-indigo-500 transform group-hover:translate-x-1 transition-all flex-shrink-0">
      <svg className="w-3 h-3 md:w-4 md:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3.5} d="M9 5l7 7-7 7" /></svg>
    </div>
  </div>
);

const SidebarItem = ({ icon, label, viewId, view, setView }: { icon: string, label: string, viewId: any, view: string, setView: any }) => {
  const isActive = view === viewId;
  return (
    <button
      onClick={() => setView(viewId)}
      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-semibold transition-colors touch-manipulation relative"
      style={{
        color: isActive ? SG.green : SG.muted,
        background: isActive ? SG.greenBg : 'transparent',
        borderLeft: isActive ? `3px solid ${SG.green}` : '3px solid transparent',
        borderRadius: '0 10px 10px 0',
        fontFamily: SG.sans,
        fontWeight: 600,
        fontSize: '13px',
      }}
    >
      <span className="text-base group-hover:scale-110 transition-transform">{icon}</span>
      <span>{label}</span>
    </button>
  );
};

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [authView, setAuthView] = useState<'login' | 'register'>('login');
  const [authLoading, setAuthLoading] = useState(true); // Loading while checking session
  // MFA challenge state
  const [mfaTempToken, setMfaTempToken] = useState<string | null>(null);
  const [mfaMessage, setMfaMessage] = useState('');
  // Settings sub-view
  const [settingsView, setSettingsView] = useState<'mfa' | null>(null);
  const [view, setView] = useState<'home' | 'analysis' | 'swing' | 'scalp' | 'backtest' | 'review' | 'journal' | 'learning' | 'community' | 'watchlist' | 'admin' | 'profile'>('home');
  // Profile menu dropdown state
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [profileUser, setProfileUser] = useState<ProfileUser | null>(null);
  const [selectedStock, setSelectedStock] = useState<StockProfile | null>(null);
  const [timeFrame, setTimeFrame] = useState<TimeFrame>('3M');
  const [chartMode, setChartMode] = useState<ChartMode>('line');
  const [fullStockData, setFullStockData] = useState<StockDataPoint[]>([]);
  const [technicals, setTechnicals] = useState<TechnicalIndicators | null>(null);
  const [analysis, setAnalysis] = useState<AIAnalysisResult | null>(null);
  const [realTimeData, setRealTimeData] = useState<RealTimeMarketData | null>(null);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [isNewsLoading, setIsNewsLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [quotaExceeded, setQuotaExceeded] = useState(false);

  // Search State
  const [searchTicker, setSearchTicker] = useState('');
  const [browseMode, setBrowseMode] = useState<'home' | 'sector' | 'index'>('home');
  const [browseFilter, setBrowseFilter] = useState('');

  // Filtered stocks based on browse mode
  const filteredStocks = useMemo(() => {
    if (browseMode === 'sector') {
      return SAMPLE_IDX_STOCKS.filter(s => s.sector === browseFilter);
    }
    if (browseMode === 'index') {
      const index = IDX_STOCK_INDICES.find(i => i.id === browseFilter);
      if (index) {
        return SAMPLE_IDX_STOCKS.filter(s => (index.tickers as readonly string[]).includes(s.ticker));
      }
    }
    return SAMPLE_IDX_STOCKS;
  }, [browseMode, browseFilter]);

  const handleBrowseSector = (sectorId: string) => {
    setBrowseMode('sector');
    setBrowseFilter(sectorId);
  };

  const handleBrowseIndex = (indexId: string) => {
    setBrowseMode('index');
    setBrowseFilter(indexId);
  };

  const handleBrowseBack = () => {
    setBrowseMode('home');
    setBrowseFilter('');
  };

  // Watchlist & Alert State for Analysis View
  const [isSavedToWatchlist, setIsSavedToWatchlist] = useState(false);
  const [alertPrice, setAlertPrice] = useState<string>('');
  const [isAlertOpen, setIsAlertOpen] = useState(false);

  const pollingInProgress = useRef(false);

  // On mount: check if user has a valid session via HTTP-only cookies
  useEffect(() => {
    const checkSession = async () => {
      try {
        const status = await checkAuthStatus();
        if (status.authenticated && status.user) {
          setUser({
            id: status.user.id,
            name: status.user.name,
            email: status.user.email,
            avatar: status.user.avatar ?? undefined,
            phone_number: status.user.phone_number ?? undefined,
            mfa_enabled: status.user.mfa_enabled,
            mfa_type: status.user.mfa_type as any,
            profile_complete: status.user.profile_complete,
            auth_provider: status.user.auth_provider as any,
          });
        }
      } catch {
        // Not authenticated — stay on login
      } finally {
        setAuthLoading(false);
      }
    };
    checkSession();
  }, []);

  useEffect(() => {
    // Skip polling entirely in mock mode — no network calls needed
    if (IS_MOCK || view !== 'analysis' || !selectedStock || quotaExceeded) return;
    const intervalId = setInterval(async () => {
      if (pollingInProgress.current) return;
      pollingInProgress.current = true;
      try {
        const data = await pollRealTimePrice(selectedStock.ticker);
        if (data) {
          setRealTimeData(prev => ({
            ...data,
            sources: data.sources || prev?.sources
          }));
        }
      } catch (e: any) {
        if (e?.message?.includes('429')) setQuotaExceeded(true);
      } finally {
        pollingInProgress.current = false;
      }
    }, 60000);
    return () => clearInterval(intervalId);
  }, [view, selectedStock, quotaExceeded]);

  // Check watchlist status when stock is selected
  useEffect(() => {
    if (selectedStock) {
      const saved = localStorage.getItem('idx_watchlist');
      if (saved) {
        const list: PortfolioItem[] = JSON.parse(saved);
        const found = list.find(i => i.ticker === selectedStock.ticker);
        setIsSavedToWatchlist(!!found);
        setAlertPrice(found?.targetPrice?.toString() || '');
      } else {
        setIsSavedToWatchlist(false);
        setAlertPrice('');
      }
    }
  }, [selectedStock]);

  const handleLogin = (userData: User) => {
    setUser(userData);
    setMfaTempToken(null);
    setMfaMessage('');
    setView('home');
  };

  const handleMfaRequired = (tempToken: string, message: string) => {
    setMfaTempToken(tempToken);
    setMfaMessage(message);
  };

  const handleLogout = async () => {
    try {
      await apiLogout();
    } catch {
      // Clear locally even if API fails
    }
    setUser(null);
    setAuthView('login');
    setMfaTempToken(null);
    setSettingsView(null);
  };

  const handleSelectStock = useCallback(async (stock: StockProfile) => {
    setSelectedStock(stock);
    setAnalysis(null);
    setRealTimeData(null);
    setNews([]);
    setView('analysis');
    setIsAnalyzing(true);
    setIsNewsLoading(true);
    setTimeFrame('3M');
    setQuotaExceeded(false);
    setSearchTicker('');
    setIsAlertOpen(false);

    // Immediate mock data for instant UI render
    const estimatedData = generateMockStockData(stock.ticker, 365);
    setFullStockData(estimatedData);
    setTechnicals(calculateTechnicals(estimatedData));

    try {
      // Unified data provider handles mock/live routing
      const bundle = await loadStockAnalysis(stock);
      setRealTimeData(bundle.realTimeData);
      setFullStockData(bundle.fullStockData);
      setTechnicals(bundle.technicals);
      setAnalysis(bundle.analysis);
      setNews(bundle.news);
    } catch (err: any) {
      if (err?.message?.includes('429')) setQuotaExceeded(true);
      console.error('[App] loadStockAnalysis failed:', err);
    } finally {
      setIsAnalyzing(false);
      setIsNewsLoading(false);
    }
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTicker.trim()) return;
    const ticker = searchTicker.trim().toUpperCase();

    // Check if it's in sample list to get nicer name
    const found = SAMPLE_IDX_STOCKS.find(s => s.ticker === ticker);
    handleSelectStock(found || { ticker, name: 'Custom Search', sector: 'Unknown' });
  };

  const handleToggleWatchlist = () => {
    if (!selectedStock) return;
    const saved = localStorage.getItem('idx_watchlist');
    let list: PortfolioItem[] = saved ? JSON.parse(saved) : [];

    if (isSavedToWatchlist) {
      list = list.filter(i => i.ticker !== selectedStock.ticker);
      setIsSavedToWatchlist(false);
      setAlertPrice('');
    } else {
      list.unshift({ ticker: selectedStock.ticker, addedAt: Date.now() });
      setIsSavedToWatchlist(true);
    }
    localStorage.setItem('idx_watchlist', JSON.stringify(list));
  };

  const handleSetAlert = () => {
    if (!selectedStock) return;
    const saved = localStorage.getItem('idx_watchlist');
    let list: PortfolioItem[] = saved ? JSON.parse(saved) : [];

    const price = parseFloat(alertPrice);
    const target = isNaN(price) ? undefined : price;

    const existingIndex = list.findIndex(i => i.ticker === selectedStock.ticker);
    if (existingIndex >= 0) {
      list[existingIndex].targetPrice = target;
      list[existingIndex].addedAt = Date.now(); // bump to top?
    } else {
      list.unshift({ ticker: selectedStock.ticker, addedAt: Date.now(), targetPrice: target });
      setIsSavedToWatchlist(true);
    }
    localStorage.setItem('idx_watchlist', JSON.stringify(list));
    alert(`Signal Alert ${target ? `set to Rp ${target}` : 'removed'} for ${selectedStock.ticker}. Added to Watchlist.`);
  };

  const chartData = useMemo(() => {
    if (!fullStockData.length) return [];
    if (timeFrame === '1D') {
      const currentPrice = realTimeData ? realTimeData.price : fullStockData[fullStockData.length - 1].price;
      const change = realTimeData ? realTimeData.change : 0;
      return generateIntradayData(selectedStock?.ticker || '', currentPrice, change);
    }
    let daysToSlice = 90;
    switch (timeFrame) {
      case '1W': daysToSlice = 7; break;
      case '1M': daysToSlice = 30; break;
      case '3M': daysToSlice = 90; break;
      case '6M': daysToSlice = 180; break;
      case '1Y': daysToSlice = 365; break;
      case 'YTD':
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - new Date(now.getFullYear(), 0, 1).getTime());
        daysToSlice = Math.ceil(diffTime / 86400000);
        break;
    }
    return fullStockData.slice(-daysToSlice);
  }, [fullStockData, timeFrame, realTimeData, selectedStock]);

  const ohlcChartData = useMemo(() => {
    if (!fullStockData.length) return [];
    if (timeFrame === '1D') {
      const currentPrice = realTimeData ? realTimeData.price : fullStockData[fullStockData.length - 1].price;
      const change = realTimeData ? realTimeData.change : 0;
      return generateIntradayOHLCData(selectedStock?.ticker || '', currentPrice, change);
    }
    let daysToSlice = 90;
    switch (timeFrame) {
      case '1W': daysToSlice = 7; break;
      case '1M': daysToSlice = 30; break;
      case '3M': daysToSlice = 90; break;
      case '6M': daysToSlice = 180; break;
      case '1Y': daysToSlice = 365; break;
      case 'YTD':
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - new Date(now.getFullYear(), 0, 1).getTime());
        daysToSlice = Math.ceil(diffTime / 86400000);
        break;
    }
    const fullOhlc = generateMockOHLCData(selectedStock?.ticker || '', 365, realTimeData?.price);
    return fullOhlc.slice(-daysToSlice);
  }, [fullStockData, timeFrame, realTimeData, selectedStock]);

  // Loading screen while checking session cookies
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-tr from-emerald-500 to-cyan-500 rounded-xl flex items-center justify-center font-bold text-white shadow-lg shadow-emerald-500/20 animate-pulse">AI</div>
          <p className="text-slate-400 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  // Not authenticated — show login/register
  if (!user) {
    // MFA challenge screen
    if (mfaTempToken) {
      return (
        <MfaVerify
          tempToken={mfaTempToken}
          mfaMessage={mfaMessage}
          onVerified={handleLogin}
          onCancel={() => { setMfaTempToken(null); setMfaMessage(''); }}
        />
      );
    }
    if (authView === 'login') return <LoginPage onLogin={handleLogin} onSwitch={() => setAuthView('register')} onMfaRequired={handleMfaRequired} />;
    return <RegisterPage onLogin={handleLogin} onSwitch={() => setAuthView('login')} onMfaRequired={handleMfaRequired} />;
  }

  // Profile setup (if not complete)
  if (user.profile_complete === false) {
    return (
      <ProfileSetup
        user={user}
        onComplete={(updatedUser) => setUser(updatedUser)}
        onSkip={() => setUser({ ...user, profile_complete: true })}
      />
    );
  }

  // Profile — full-page takeover (no sidebar)
  if (view === 'profile') {
    const profileAuth = {
      id: user.id,
      email: user.email,
      display_name: user.name,
      avatar_url: user.avatar ?? null,
      phone: user.phone_number ?? null,
      bio: null,
      plan: (user as any).plan || 'FREE',
      plan_expires_at: null,
      theme_preference: (user as any).theme_preference || 'dark',
      mfa_enabled: user.mfa_enabled || false,
      mfa_type: user.mfa_type ?? null,
      auth_provider: user.auth_provider || 'local',
      profile_complete: user.profile_complete || false,
      created_at: new Date().toISOString(),
    };
    return (
      <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div></div>}>
        <ProfilePageLazy
          authUser={profileAuth}
          onBack={() => setView('home')}
          onUserUpdate={(updated) => {
            setUser({
              ...user,
              name: updated.display_name,
              email: updated.email,
              avatar: updated.avatar_url ?? undefined,
              phone_number: updated.phone ?? undefined,
            });
          }}
        />
      </Suspense>
    );
  }

  // Admin Dashboard — full-page takeover (no sidebar)
  if (view === 'admin') {
    return (
      <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div></div>}>
        <AdminDashboard onBack={() => setView('home')} />
      </Suspense>
    );
  }

  return (
    <div className="min-h-screen text-slate-50 font-sans flex overflow-hidden transition-colors duration-300"
      style={{ background: SG.bgBase }}
    >
      {/* SIDEBAR — Desktop only */}
      <aside className="w-52 flex-col hidden lg:flex sticky top-0 h-screen z-50 transition-colors"
        style={{ background: SG.bg, borderRight: `1px solid ${SG.border}` }}>
        <div className="p-5">
          {/* SahamGue Logo */}
          <div className="flex items-center gap-3 mb-8 cursor-pointer" onClick={() => setView('home')}>
            <div className="w-8 h-8 rounded-[9px] flex items-center justify-center flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}>
              <span style={{ fontFamily: SG.mono, fontWeight: 800, fontSize: '12px', color: SG.bgBase }}>SG</span>
            </div>
            <div>
              <h1 className="font-black tracking-tight leading-none" style={{ fontFamily: SG.sans, fontWeight: 800, fontSize: '15px', color: SG.text }}>IDX Assistant</h1>
              <p className="text-[8px] font-bold uppercase tracking-widest mt-0.5" style={{ color: SG.muted }}>SahamGue AI</p>
            </div>
          </div>

          <div className="space-y-6">
            {/* Main Navigation — 5 tabs */}
            <section>
              <h3 className="text-[10px] font-bold uppercase mb-2 ml-3" style={{ color: SG.textMuted, letterSpacing: '1px' }}>NAVIGASI</h3>
              <div className="space-y-0.5">
                <SidebarItem icon="🏠" label="Home" viewId="home" view={view} setView={setView} />
                <SidebarItem icon="📊" label="Market Analysis" viewId="analysis" view={view} setView={setView} />
                <SidebarItem icon="👁" label="Watchlist" viewId="watchlist" view={view} setView={setView} />
                <SidebarItem icon="📰" label="News" viewId="news" view={view} setView={setView} />
                <SidebarItem icon="📓" label="Trade Journal" viewId="journal" view={view} setView={setView} />
                <SidebarItem icon="🎓" label="Learning" viewId="learning" view={view} setView={setView} />
              </div>
            </section>

            {/* Archived — hidden via feature flag */}
            {!ARCHIVED && (
              <section>
                <h3 className="text-[10px] font-bold uppercase mb-2 ml-3" style={{ color: SG.textMuted, letterSpacing: '1px' }}>ARSIP</h3>
                <div className="space-y-0.5">
                  <SidebarItem icon="📅" label="Swing Trading" viewId="swing" view={view} setView={setView} />
                  <SidebarItem icon="⏱️" label="Scalp Trading" viewId="scalp" view={view} setView={setView} />
                  <SidebarItem icon="⚡" label="Backtester" viewId="backtest" view={view} setView={setView} />
                  <SidebarItem icon="👥" label="Community" viewId="community" view={view} setView={setView} />
                </div>
              </section>
            )}

            {/* System */}
            <section>
              <h3 className="text-[10px] font-bold uppercase mb-2 ml-3" style={{ color: SG.textMuted, letterSpacing: '1px' }}>SISTEM</h3>
              <div className="space-y-0.5">
                <SidebarItem icon="⚙️" label="Admin" viewId="admin" view={view} setView={setView} />
                <button
                  onClick={() => setSettingsView(settingsView === 'mfa' ? null : 'mfa')}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-semibold transition-colors"
                  style={{
                    color: settingsView === 'mfa' ? SG.green : SG.muted,
                    fontFamily: SG.sans, fontWeight: 600, fontSize: '13px',
                    background: settingsView === 'mfa' ? SG.greenBg : 'transparent',
                    borderLeft: settingsView === 'mfa' ? `3px solid ${SG.green}` : '3px solid transparent',
                    borderRadius: '0 10px 10px 0',
                  }}
                >
                  <span>🔐</span><span>MFA Settings</span>
                </button>
              </div>
            </section>
          </div>
        </div>
        <div className="mt-auto p-5 space-y-3">
          <button onClick={handleLogout}
            className="w-full py-2.5 rounded-xl text-sm font-bold transition-all"
            style={{ background: SG.surface, border: `1px solid ${SG.border}`, color: SG.dim }}>
            Keluar
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 overflow-y-auto pb-24 lg:pb-0">
        {/* Top Nav Bar */}
        <nav className="h-14 flex items-center justify-between px-4 lg:px-6 backdrop-blur-md sticky top-0 z-[45] transition-colors"
          style={{ background: SG.bg, borderBottom: `1px solid ${SG.border}` }}>
          <div className="flex items-center gap-3">
            {/* Mobile logo */}
            <div className="lg:hidden flex items-center gap-2 cursor-pointer" onClick={() => setView('home')}>
              <div className="w-7 h-7 rounded-[7px] flex items-center justify-center flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}>
                <span style={{ fontFamily: SG.mono, fontWeight: 800, fontSize: '10px', color: SG.bgBase }}>SG</span>
              </div>
              <span className="font-black text-sm tracking-tight" style={{ fontFamily: SG.sans, color: SG.text }}>IDX Assistant</span>
            </div>
            <h2 className="hidden lg:block text-[11px] font-bold uppercase tracking-widest" style={{ color: SG.dim }}>
              {view === 'home' ? 'Home' : view === 'analysis' ? 'Market Analysis' : view === 'watchlist' ? 'Watchlist' : view === 'news' ? 'Berita & Analisis' : view === 'journal' ? 'Trade Journal' : view === 'learning' ? 'Learning' : view.replace('-', ' ')}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-black leading-none" style={{ color: SG.text }}>{user.name || 'User'}</p>
              <p className="text-[10px] font-bold uppercase tracking-widest mt-0.5" style={{ color: SG.muted }}>Trader Pro</p>
            </div>
            {/* Avatar button — opens ProfileMenu */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setProfileMenuOpen(v => !v)}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-[13px] font-black transition-all hover:scale-110"
                style={{ background: 'rgba(34,197,94,0.15)', color: '#22c55e', border: 'none', cursor: 'pointer' }}
                title="Profile"
              >
                {(user.name?.charAt(0) || '?').toUpperCase()}
              </button>
              <Suspense fallback={null}>
                <ProfileMenuLazy
                  userName={user.name || 'User'}
                  userEmail={user.email}
                  userInitial={(user.name?.charAt(0) || '?').toUpperCase()}
                  plan={(user as any).plan || 'FREE'}
                  isOpen={profileMenuOpen}
                  onClose={() => setProfileMenuOpen(false)}
                  onNavigateProfile={() => { setView('profile'); setProfileMenuOpen(false); }}
                  onNavigateSecurity={() => { setView('profile'); setProfileMenuOpen(false); }}
                  onNavigateNotifications={() => { setView('profile'); setProfileMenuOpen(false); }}
                  onNavigatePlan={() => { setView('profile'); setProfileMenuOpen(false); }}
                  onLogout={handleLogout}
                />
              </Suspense>
            </div>
          </div>
        </nav>

        <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-8 md:space-y-12">
          {/* MFA Settings panel (overlays main content when active) */}
          {settingsView === 'mfa' && (
            <div className="animate-fade-in pb-12 md:pb-20">
              <MfaSetup
                mfaEnabled={user.mfa_enabled || false}
                mfaType={user.mfa_type}
                hasPhone={!!user.phone_number}
                onMfaChanged={async () => {
                  try {
                    const fresh = await getMe();
                    setUser({
                      ...user,
                      mfa_enabled: fresh.mfa_enabled,
                      mfa_type: fresh.mfa_type as any,
                    });
                  } catch { /* ignore */ }
                }}
                onBack={() => setSettingsView(null)}
              />
            </div>
          )}

          {/* HOME VIEW */}
          {!settingsView && view === 'home' && (
            <HomeDashboard
              user={user}
              onNavigateAnalysis={() => setView('analysis')}
              onNavigateWatchlist={() => setView('watchlist')}
              onSelectStock={(ticker) => handleSelectStock({ ticker, name: ticker, sector: 'Unknown' })}
              onLogout={handleLogout}
            />
          )}

          {/* ARCHIVED VIEWS — kept for route integrity, never render */}
          {!ARCHIVED && view === 'dashboard' && null}
          {(!ARCHIVED && (view === 'swing' || view === 'scalp')) && (
            <Suspense fallback={<div className="flex items-center justify-center py-24"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div></div>}>
              {view === 'swing' && <ChartAnalyzer type="SWING" />}
              {view === 'scalp' && <ChartAnalyzer type="SCALP" />}
            </Suspense>
          )}
          {!ARCHIVED && view === 'backtest' && (
            <Suspense fallback={<div className="flex items-center justify-center py-24"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div></div>}>
              <Backtester />
            </Suspense>
          )}
          {!ARCHIVED && view === 'community' && (
            <Suspense fallback={<div className="flex items-center justify-center py-24"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div></div>}>
              <Community currentUser={user} />
            </Suspense>
          )}

          {/* TRADE JOURNAL */}
          {view === 'journal' && (
            <Suspense fallback={<div className="flex items-center justify-center py-24"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div></div>}>
              <TradeJournal />
            </Suspense>
          )}

          {/* LEARNING HUB */}
          {view === 'learning' && (
            <Suspense fallback={<div className="flex items-center justify-center py-24"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div></div>}>
              <LearningCenter />
            </Suspense>
          )}

          {/* WATCHLIST */}
          {view === 'watchlist' && (
            <Suspense fallback={<div className="flex items-center justify-center py-24"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div></div>}>
              <Watchlist onAnalyze={(ticker) => handleSelectStock({ ticker, name: 'Watchlist Asset', sector: 'Unknown' })} />
            </Suspense>
          )}

          {/* MARKET ANALYSIS TAB */}
          {view === 'analysis' && (!selectedStock ? (
            <div className="py-16 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm animate-fade-in">
              <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-900/20 rounded-3xl flex items-center justify-center text-4xl mx-auto mb-6 shadow-sm">🔍</div>
              <h2 className="text-3xl font-black text-slate-800 dark:text-slate-100 tracking-tight">Market IQ Scanner</h2>
              <p className="text-slate-400 dark:text-slate-500 font-bold mb-8 uppercase tracking-widest text-xs">Search a ticker or browse by sector & index</p>

              {/* Search Bar */}
              <div className="max-w-xl mx-auto mb-10 relative px-6">
                <form onSubmit={handleSearchSubmit}>
                  <input
                    type="text"
                    placeholder="Search IDX Ticker (e.g. UNVR, TLKM)"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl py-4 pl-12 pr-4 text-lg font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all uppercase placeholder:normal-case shadow-inner"
                    value={searchTicker}
                    onChange={(e) => setSearchTicker(e.target.value)}
                  />
                  <button type="submit" className="absolute right-8 top-2 bottom-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl px-6 transition-all">
                    Scan
                  </button>
                  <span className="absolute left-10 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                  </span>
                </form>
              </div>

              {browseMode === 'home' ? (
                <>
                  {/* Browse by Sector */}
                  <div className="max-w-4xl mx-auto px-6 mb-10">
                    <h3 className="text-left text-[10px] font-black uppercase tracking-widest mb-4 flex items-center gap-2 font-jakarta" style={{color: SG.textMuted}}>
                      <span className="w-5 h-px" style={{background: SG.border}}></span>
                      Browse by Business Sector
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
                      {IDX_SECTORS.map(sector => {
                        if (sector.id === 'All') return null; // Skip 'All' sector
                        const count = SAMPLE_IDX_STOCKS.filter(s => s.sector === sector.id).length;
                        return (
                          <button
                            key={sector.id}
                            onClick={() => handleBrowseSector(sector.id)}
                            className="flex items-center gap-3 px-4 py-3.5 sg-surface rounded-xl transition-all active:scale-[0.98] group text-left"
                            style={{border: `1px solid ${SG.border}`}}
                            onMouseEnter={(e) => e.currentTarget.style.borderColor = SG.green}
                            onMouseLeave={(e) => e.currentTarget.style.borderColor = SG.border}
                          >
                            <span className="text-xl">{sector.icon}</span>
                            <div className="flex-1 min-w-0">
                              <span className="text-xs font-bold block truncate font-jakarta" style={{color: SG.textPrimary}}>{sector.label}</span>
                              <span className="text-[10px] font-medium font-jakarta" style={{color: SG.textDim}}>{count} stocks</span>
                            </div>
                            <svg className="w-3.5 h-3.5 transition-colors flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{color: SG.textDim}}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Browse by Index */}
                  <div className="max-w-4xl mx-auto px-6">
                    <h3 className="text-left text-[10px] font-black uppercase tracking-widest mb-4 flex items-center gap-2 font-jakarta" style={{color: SG.textMuted}}>
                      <span className="w-5 h-px" style={{background: SG.border}}></span>
                      Browse by Stock Index
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
                      {IDX_STOCK_INDICES.map(index => (
                        <button
                          key={index.id}
                          onClick={() => handleBrowseIndex(index.id)}
                          className="flex flex-col items-center gap-2 px-4 py-5 sg-surface rounded-xl transition-all active:scale-[0.98] group"
                          style={{border: `1px solid ${SG.border}`}}
                          onMouseEnter={(e) => e.currentTarget.style.borderColor = SG.green}
                          onMouseLeave={(e) => e.currentTarget.style.borderColor = SG.border}
                        >
                          <span className="text-2xl">{index.icon}</span>
                          <span className="text-sm font-black font-jakarta transition-colors" style={{color: SG.textPrimary}}>{index.label}</span>
                          <span className="text-[10px] font-medium leading-tight text-center font-jakarta" style={{color: SG.textSecond}}>{index.description}</span>
                          <span className="text-[10px] mt-1 px-2.5 py-0.5 rounded-full font-bold font-jakarta" style={{background: SG.bgMuted, color: SG.textMuted}}>{index.tickers.length} stocks</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                /* Drill-down: Show stocks for selected sector or index */
                <div className="max-w-5xl mx-auto px-6">
                  {/* Back button + title */}
                  <div className="flex items-center gap-3 mb-6">
                    <button
                      onClick={handleBrowseBack}
                      className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest transition-colors font-jakarta"
                      style={{color: SG.textMuted}}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                      Back
                    </button>
                    <span className="text-sm font-black font-jakarta" style={{color: SG.textPrimary}}>
                      {browseMode === 'sector'
                        ? `${IDX_SECTORS.find(s => s.id === browseFilter)?.icon || ''} ${browseFilter}`
                        : `${IDX_STOCK_INDICES.find(i => i.id === browseFilter)?.icon || ''} ${browseFilter}`
                      }
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold font-jakarta" style={{background: SG.greenBg, color: SG.green}}>
                      {filteredStocks.length} stocks
                    </span>
                  </div>

                  {/* Filtered stock grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5">
                    {filteredStocks.map(s => (
                      <button
                        key={s.ticker}
                        onClick={() => handleSelectStock(s)}
                        className="flex flex-col items-start px-4 py-3 sg-surface text-left rounded-xl transition-all active:scale-95 group hover:-translate-y-0.5"
                        style={{border: `1px solid ${SG.border}`}}
                        onMouseEnter={(e) => e.currentTarget.style.borderColor = SG.green}
                        onMouseLeave={(e) => e.currentTarget.style.borderColor = SG.border}
                      >
                        <span className="font-black text-sm font-mono-trading transition-colors" style={{color: SG.textPrimary}}>{s.ticker}</span>
                        <span className="text-[10px] font-medium leading-tight mt-0.5 line-clamp-1 font-jakarta" style={{color: SG.textSecond}}>{s.name}</span>
                        {s.subsector && (
                          <span className="text-[8px] mt-1.5 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider font-jakarta" style={{background: SG.bgMuted, color: SG.textDim}}>{s.subsector}</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-10 animate-fade-in pb-20">
              <div className="flex flex-col md:flex-row justify-between items-start gap-6 border-b border-slate-200 dark:border-slate-800 pb-10">
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <button
                      onClick={() => setSelectedStock(null)}
                      className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 hover:text-indigo-600 flex items-center gap-2 transition-colors"
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                      Back to Scanner
                    </button>

                    {/* Inline Quick Search */}
                    <div className="relative ml-2">
                      <input
                        type="text"
                        placeholder="Jump to ticker..."
                        className="w-36 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg py-1.5 pl-7 pr-2 text-[11px] font-bold text-slate-600 dark:text-slate-300 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 focus:w-52 transition-all uppercase placeholder:normal-case"
                        value={searchTicker}
                        onChange={(e) => setSearchTicker(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && searchTicker.trim()) {
                            handleSearchSubmit(e as any);
                          }
                        }}
                      />
                      <svg className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>

                      {/* Search Dropdown */}
                      {searchTicker.trim().length >= 1 && (
                        <div className="absolute top-full left-0 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 w-64 max-h-48 overflow-y-auto animate-fade-in">
                          {SAMPLE_IDX_STOCKS
                            .filter(s =>
                              s.ticker.includes(searchTicker.trim().toUpperCase()) ||
                              s.name.toLowerCase().includes(searchTicker.trim().toLowerCase())
                            )
                            .slice(0, 8)
                            .map(s => (
                              <button
                                key={s.ticker}
                                onClick={() => { setSearchTicker(''); handleSelectStock(s); }}
                                className="w-full flex items-center gap-3 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left first:rounded-t-xl last:rounded-b-xl"
                              >
                                <span className="font-black text-xs text-slate-800 dark:text-slate-100">{s.ticker}</span>
                                <span className="text-[10px] text-slate-400 dark:text-slate-500 truncate flex-1">{s.name}</span>
                                <span className="text-[8px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-400 font-bold">{s.sector}</span>
                              </button>
                            ))
                          }
                          {SAMPLE_IDX_STOCKS.filter(s =>
                            s.ticker.includes(searchTicker.trim().toUpperCase()) ||
                            s.name.toLowerCase().includes(searchTicker.trim().toLowerCase())
                          ).length === 0 && (
                              <div className="px-3 py-3 text-[10px] text-slate-400 text-center font-bold">No matches found</div>
                            )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 md:gap-4 flex-wrap">
                    <h1 className="text-3xl md:text-5xl font-black tracking-tighter font-mono-trading" style={{color: SG.textPrimary}}>{selectedStock.ticker}</h1>
                    <span className="text-[10px] md:text-xs px-2 md:px-3 py-1 md:py-1.5 rounded-lg border font-black uppercase font-jakarta" style={{background: SG.bgMuted, color: SG.textMuted, borderColor: SG.border}}>IDX</span>
                    {realTimeData && <span className="flex items-center gap-1.5 md:gap-2 text-[9px] md:text-[10px] px-2 md:px-3 py-1 md:py-1.5 rounded-full border animate-pulse font-black font-jakarta" style={{background: 'rgba(239, 68, 68, 0.1)', color: SG.red, borderColor: 'rgba(239, 68, 68, 0.2)'}}><span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full" style={{background: SG.red}}></span> LIVE</span>}
                  </div>
                  <p className="mt-1 md:mt-2 text-base md:text-xl font-bold font-jakarta" style={{color: SG.textSecond}}>{selectedStock.name}</p>

                  {/* Sector & Index Tags */}
                  <div className="flex flex-wrap items-center gap-2 mt-3">
                    {/* Sector tag */}
                    {selectedStock.sector && selectedStock.sector !== 'Unknown' && (
                      <button
                        onClick={() => { setSelectedStock(null); handleBrowseSector(selectedStock.sector); }}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer font-jakarta"
                        style={{background: 'rgba(99, 102, 241, 0.1)', color: '#818cf8', borderColor: 'rgba(99, 102, 241, 0.2)'}}
                      >
                        <span>{IDX_SECTORS.find(s => s.id === selectedStock.sector)?.icon || '📁'}</span>
                        <span>#{selectedStock.sector}</span>
                      </button>
                    )}

                    {/* Index tags */}
                    {IDX_STOCK_INDICES
                      .filter(idx => (idx.tickers as readonly string[]).includes(selectedStock.ticker))
                      .map(idx => (
                        <button
                          key={idx.id}
                          onClick={() => { setSelectedStock(null); handleBrowseIndex(idx.id); }}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-900/15 text-amber-700 dark:text-amber-400 text-[10px] font-bold border border-amber-100 dark:border-amber-900/40 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors cursor-pointer"
                        >
                          <span>{idx.icon}</span>
                          <span>{idx.label}</span>
                        </button>
                      ))
                    }
                  </div>
                </div>

                <div className="flex flex-col items-start md:items-end gap-4 md:gap-6 w-full md:w-auto mt-6 md:mt-0 pt-6 md:pt-0 border-t md:border-none" style={{borderColor: SG.border}}>
                  <div className="text-left md:text-right">
                    {(realTimeData || fullStockData.length > 0) ? <>
                      <div className="text-4xl md:text-5xl font-black tracking-tighter font-mono-trading" style={{color: SG.green}}>Rp {(realTimeData?.price || fullStockData[fullStockData.length - 1]?.price || 0).toLocaleString('id-ID')}</div>
                      {realTimeData ? (
                        <div className={`text-xs md:text-sm font-black mt-2 md:mt-3 flex items-center md:justify-end gap-2 font-mono-trading`} style={{color: realTimeData.change >= 0 ? SG.green : SG.red}}>
                          <span>{realTimeData.change >= 0 ? '+' : ''}{realTimeData.changePercent}%</span>
                          <span className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.15em] px-2 py-0.5 md:px-2.5 md:py-1 rounded font-jakarta" style={{background: SG.bgMuted, color: SG.textSecond}}>Today</span>
                        </div>
                      ) : <div className="text-xs md:text-sm mt-2 md:mt-3 font-black uppercase tracking-widest opacity-50 font-jakarta" style={{color: SG.textMuted}}>Historical View</div>}
                    </> : <HeaderPriceSkeleton />}
                  </div>

                  {/* ACTION BUTTONS */}
                  <div className="flex items-center gap-4">
                    {/* Alert Bell */}
                    <div className="relative">
                      <button
                        onClick={() => setIsAlertOpen(!isAlertOpen)}
                        className={`w-12 h-12 rounded-full flex items-center justify-center transition-all border ${alertPrice ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 hover:border-slate-300 dark:hover:border-slate-700 hover:text-slate-600 dark:hover:text-slate-300'}`}
                        title="Set Price Alert"
                      >
                        <svg className="w-6 h-6" fill={alertPrice ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                        </svg>
                        {alertPrice && <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 border-2 border-white rounded-full"></span>}
                      </button>

                      {/* Popover */}
                      {isAlertOpen && (
                        <div className="absolute top-full right-0 mt-4 p-4 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 w-72 z-50 animate-fade-in">
                          <div className="flex justify-between items-center mb-4">
                            <h4 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-wide">Set Price Alert</h4>
                            <button onClick={() => setIsAlertOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"><svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                          </div>

                          <div className="space-y-3">
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 text-xs font-bold">Rp</span>
                              <input
                                type="number"
                                autoFocus
                                placeholder="Target Price"
                                className="w-full pl-8 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold focus:outline-none focus:border-indigo-500 transition-all"
                                value={alertPrice}
                                onChange={(e) => setAlertPrice(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSetAlert()}
                              />
                            </div>
                            <button
                              onClick={() => { handleSetAlert(); setIsAlertOpen(false); }}
                              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-indigo-100 transition-all"
                            >
                              Save Alert
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Bookmark Watchlist */}
                    <button
                      onClick={handleToggleWatchlist}
                      className={`w-12 h-12 rounded-full flex items-center justify-center transition-all border ${isSavedToWatchlist ? 'bg-slate-800 dark:bg-slate-700 border-slate-800 dark:border-slate-700 text-white shadow-lg shadow-slate-200 dark:shadow-none' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 hover:border-slate-300 dark:hover:border-slate-700 hover:text-slate-600 dark:hover:text-slate-300'}`}
                      title={isSavedToWatchlist ? "Remove from Watchlist" : "Add to Watchlist"}
                    >
                      <svg className="w-6 h-6" fill={isSavedToWatchlist ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 md:gap-8">
                <div className="lg:col-span-1">
                  {analysis ? (
                    <div className="sg-surface rounded-2xl md:rounded-3xl p-5 md:p-6 relative overflow-hidden animate-slide-up flex flex-col justify-center h-full">
                      <div className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl md:rounded-t-3xl" style={{background: '#818cf8'}} />
                      <h2 className="text-[9px] md:text-[10px] font-black mb-4 md:mb-8 uppercase tracking-[0.2em] font-jakarta text-center md:text-left" style={{color: SG.textMuted}}>Signal Core</h2>
                      <div className="flex-1 flex items-center justify-center">
                        <Gauge signal={analysis.signal} confidence={analysis.confidence} />
                      </div>
                      <div className="mt-6 md:mt-10 space-y-3 md:space-y-4 pt-4 md:pt-6 border-t" style={{borderColor: SG.border}}>
                        <div className="flex justify-between items-center text-xs md:text-sm"><span className="font-black uppercase tracking-widest text-[8px] md:text-[9px] font-jakarta" style={{color: SG.textMuted}}>Supp Level</span><span className="font-black font-mono-trading" style={{color: SG.green}}>Rp {analysis.supportLevel.toLocaleString('id-ID')}</span></div>
                        <div className="flex justify-between items-center text-xs md:text-sm"><span className="font-black uppercase tracking-widest text-[8px] md:text-[9px] font-jakarta" style={{color: SG.textMuted}}>Resi Level</span><span className="font-black font-mono-trading" style={{color: SG.red}}>Rp {analysis.resistanceLevel.toLocaleString('id-ID')}</span></div>
                      </div>
                    </div>
                  ) : <GaugeSkeleton />}
                </div>
                <div className="lg:col-span-3 space-y-4 md:space-y-8">
                  <div className="relative group sg-surface p-3 sm:p-5 md:p-6 rounded-2xl md:rounded-3xl overflow-hidden h-full flex flex-col">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4 z-10 w-full relative">
                      <h3 className="text-xs md:text-sm font-black uppercase tracking-widest font-jakarta" style={{color: SG.textMuted}}>Price Action</h3>
                      
                      <div className="flex items-center bg-white/5 dark:bg-slate-900/50 rounded-xl md:rounded-2xl p-1 backdrop-blur-md border shadow-lg gap-0.5 md:gap-1 overflow-x-auto max-w-full" style={{borderColor: `rgba(255,255,255,0.05)`}}>
                        {/* Chart Mode Toggle */}
                        <button
                          onClick={() => setChartMode('line')}
                          className={`flex items-center gap-1 px-2 md:px-3 py-1.5 md:py-2 rounded-lg md:rounded-xl text-[8px] md:text-[9px] font-black tracking-widest uppercase transition-all whitespace-nowrap ${chartMode === 'line'
                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100'
                            : 'text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-slate-100'
                            }`}
                          title="Line Chart"
                        >
                          <svg className="w-2.5 h-2.5 md:w-3 md:h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M3 17l6-6 4 4 8-8" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          Line
                        </button>
                        <button
                          onClick={() => setChartMode('candle')}
                          className={`flex items-center gap-1 px-2 md:px-3 py-1.5 md:py-2 rounded-lg md:rounded-xl text-[8px] md:text-[9px] font-black tracking-widest uppercase transition-all whitespace-nowrap ${chartMode === 'candle'
                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100'
                            : 'text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-slate-100'
                            }`}
                          title="Candlestick Chart"
                        >
                          <svg className="w-2.5 h-2.5 md:w-3 md:h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <line x1="9" y1="2" x2="9" y2="22" />
                            <rect x="6" y="6" width="6" height="10" rx="1" fill="currentColor" />
                            <line x1="17" y1="4" x2="17" y2="20" />
                            <rect x="14" y="8" width="6" height="8" rx="1" />
                          </svg>
                          Candle
                        </button>
                        {/* Divider */}
                        <div className="w-px h-4 md:h-5 mx-0.5 md:mx-1" style={{background: 'rgba(255,255,255,0.1)'}}></div>
                        {/* Timeframe Buttons */}
                        {(['1D', '1W', '1M', '3M', '6M', '1Y', 'YTD'] as TimeFrame[]).map(tf => <button key={tf} onClick={() => setTimeFrame(tf)} className={`px-2 md:px-4 py-1.5 md:py-2 text-[8px] md:text-[9px] font-black tracking-widest uppercase rounded-lg md:rounded-xl transition-all whitespace-nowrap ${timeFrame === tf ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100 scale-105' : 'text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-slate-100'}`}>{tf}</button>)}
                      </div>
                    </div>
                    
                    <div className="flex-1 min-h-[250px] md:min-h-[350px] mt-2 relative z-0">
                      <Chart data={chartData} timeFrame={timeFrame} chartMode={chartMode} ohlcData={ohlcChartData} onChartModeChange={setChartMode} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {technicals && <>
                      <IndicatorCard label="RSI" value={technicals.rsi} trend={technicals.rsi > 70 ? 'down' : technicals.rsi < 30 ? 'up' : 'neutral'} />
                      <IndicatorCard label="MACD" value={technicals.macd} trend={technicals.macd > 0 ? 'up' : 'down'} />
                      <IndicatorCard label="EMA 50" value={technicals.ma50} />
                      <IndicatorCard label="EMA 200" value={technicals.ma200} />
                    </>}
                  </div>
                </div>
              </div>

              {/* Financial Disclaimer */}
              <div className="my-4 px-4 py-2.5 rounded-xl bg-amber-500/5 border border-amber-500/10 dark:border-amber-400/10">
                <p className="text-xs text-amber-600/70 dark:text-amber-400/50 font-medium text-center">
                  ⚠️ Disclaimer: This analysis is for informational purposes only and does not constitute financial advice.
                </p>
              </div>

              {/* Trend Analysis + Analysis Approach — side by side */}
              {technicals && fullStockData.length > 0 && analysis?.approach && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <TrendAnalysis trendShort={technicals.trendShort} trendMedium={technicals.trendMedium} trendLong={technicals.trendLong} ma50={technicals.ma50} ma200={technicals.ma200} currentPrice={fullStockData[fullStockData.length - 1].price} />
                  <AnalysisApproachCard data={analysis.approach} />
                </div>
              )}
              {/* Fallback: TrendAnalysis or AnalysisApproach alone */}
              {technicals && fullStockData.length > 0 && !analysis?.approach && (
                <TrendAnalysis trendShort={technicals.trendShort} trendMedium={technicals.trendMedium} trendLong={technicals.trendLong} ma50={technicals.ma50} ma200={technicals.ma200} currentPrice={fullStockData[fullStockData.length - 1].price} />
              )}
              {!(technicals && fullStockData.length > 0) && <TrendSkeleton />}


              {/* Enhanced Fundamental Analysis Section */}
              {analysis?.qualitative && analysis?.quantitative && (
                <div className="space-y-8 mb-8">
                  {/* Qualitative and Quantitative side by side */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <QualitativeCard data={analysis.qualitative} />
                    <QuantitativeCard data={analysis.quantitative} />
                  </div>
                </div>
              )}

              {/* Fundamental Health & Verdict */}
              {analysis?.fundamentals && analysis?.verdict && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                  <FundamentalsCard data={analysis.fundamentals} />
                  <VerdictCard verdict={analysis.verdict} />
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-12">
                <div className="lg:col-span-2">
                  {analysis ? (
                    <div className="sg-surface rounded-3xl p-6 md:p-8 relative overflow-hidden h-full animate-slide-up">
                      <div className="absolute top-0 left-0 right-0 h-1 rounded-t-3xl" style={{background: '#8b5cf6'}} />
                      <div className="absolute top-0 right-0 p-4 opacity-[0.03] pointer-events-none"><svg className="w-32 h-32 md:w-48 md:h-48" fill="currentColor" viewBox="0 0 24 24"><path d="M13 10V3L4 14h7v7l9-11h-7z" /></svg></div>
                      <h2 className="text-xl md:text-2xl font-black mb-6 md:mb-8 flex items-center gap-3 md:gap-4 font-jakarta" style={{color: SG.textPrimary}}><span className="text-3xl md:text-4xl">🤖</span> AI Engine Insight</h2>
                      <p className="text-base md:text-lg font-bold leading-relaxed mb-8 md:mb-12 font-jakarta" style={{color: SG.textSecond}}>{analysis.summary}</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                        {analysis.reasoning.map((point, idx) => (
                          <div key={idx} className="sg-surface p-5 md:p-6 rounded-2xl hover:scale-[1.02] transition-all group flex flex-col h-full active:scale-[0.98]" style={{border: `1px solid ${SG.border}`}}>
                            <div className="w-8 h-8 rounded-full mb-4 flex items-center justify-center text-xs font-black transition-colors" style={{background: '#8b5cf6', color: '#fff'}}>{idx + 1}</div>
                            <p className="text-xs md:text-sm font-bold flex-1 font-jakarta" style={{color: SG.textPrimary}}>{point}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : <AnalysisSkeleton />}
                </div>
                <div className="lg:col-span-1 min-h-[400px]">
                  <TickerNewsPanel
                    ticker={selectedStock?.ticker || 'IHSG'}
                    onTickerClick={(t) => handleSelectStock({ ticker: t, name: t, sector: 'Unknown' })}
                    onViewAll={() => setView('news')}
                  />
                </div>
              </div>
            </div>
          ))}

          {/* Feature Placeholders */}
          {(['review'] as any[]).includes(view) && (
            <div className="py-24 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm animate-fade-in flex flex-col items-center">
              <div className="w-24 h-24 bg-slate-50 dark:bg-slate-800 rounded-3xl flex items-center justify-center text-5xl mb-10 shadow-inner border border-slate-100 dark:border-slate-700">🚧</div>
              <h2 className="text-3xl font-black text-slate-800 dark:text-slate-100 tracking-tight uppercase tracking-widest">Premium Tool Active</h2>
              <p className="text-slate-400 dark:text-slate-500 font-bold max-w-sm mt-4">Module {view.toUpperCase()} is currently in deployment. Full analytical dashboard arrives in v2.2.</p>
              <button onClick={() => setView('dashboard')} className="mt-12 px-12 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl transition-all shadow-xl shadow-indigo-100 dark:shadow-none active:scale-95">Back to Dashboard</button>
            </div>
          )}
          {/* NEWS PAGE */}
          {view === 'news' && (
            <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{borderColor:'#22c55e'}} /></div>}>
              <NewsPage onTickerClick={(t) => { handleSelectStock({ ticker: t, name: t, sector: 'Unknown' }); setView('analysis'); }} />
            </Suspense>
          )}
        </div>
      </main>

      {/* MOBILE BOTTOM NAVIGATION — SahamGue 6 tabs */}
      {view !== 'auth' && (
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 flex justify-around items-end z-50 transition-colors"
          style={{ background: SG.bg, borderTop: `1px solid ${SG.border}`, height: '60px', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
          {[
            { id: 'home'      as const, icon: '🏠', label: 'Home'     },
            { id: 'analysis'  as const, icon: '📊', label: 'Analisis' },
            { id: 'watchlist' as const, icon: '👁',  label: 'Watch'   },
            { id: 'news'      as const, icon: '📰', label: 'News'     },
            { id: 'journal'   as const, icon: '📓', label: 'Jurnal'   },
            { id: 'learning'  as const, icon: '🎓', label: 'Belajar'  },
          ].map((tab) => {
            const isActive = view === tab.id;
            return (
              <button key={tab.id} onClick={() => setView(tab.id)}
                className="flex flex-col items-center justify-center flex-1 py-1.5 min-h-[52px] relative touch-manipulation transition-all active:scale-95"
                style={{ color: isActive ? SG.green : SG.muted }}
              >
                {isActive && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 rounded-b-full"
                    style={{ width: 24, height: 2.5, background: SG.green }} />
                )}
                <span className="text-[17px] leading-none" style={{ transform: isActive ? 'scale(1.1)' : 'scale(1)', transition: 'transform 0.15s' }}>
                  {tab.icon}
                </span>
                <span style={{
                  fontSize: '8.5px', marginTop: '2px', fontFamily: SG.sans,
                  fontWeight: isActive ? 700 : 500,
                  opacity: isActive ? 1 : 0.5, letterSpacing: '0.2px',
                }}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </nav>
      )}

    </div>
  );
};

export default App;
