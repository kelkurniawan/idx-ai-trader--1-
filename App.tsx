
import React, { useState, useEffect, useCallback, useMemo, useRef, Suspense } from 'react';
import { useTheme } from './context/ThemeContext';
import { Sun, Moon } from 'lucide-react';
import {
  SAMPLE_IDX_STOCKS,
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

// Lazy-loaded components (only loaded when their tab/view is active)
const ChartAnalyzer = React.lazy(() => import('./components/ChartAnalyzer'));
const Backtester = React.lazy(() => import('./components/Backtester'));
const TradeJournal = React.lazy(() => import('./components/TradeJournal'));
const LearningCenter = React.lazy(() => import('./components/LearningCenter'));
const Community = React.lazy(() => import('./components/Community'));
const Watchlist = React.lazy(() => import('./components/Watchlist'));
const AdminDashboard = React.lazy(() => import('./components/admin/AdminDashboard'));

// Helper Components moved to top for hoisting safety
const FundamentalsCard = ({ data }: { data: FundamentalData }) => (
  <div className="glass-card rounded-3xl p-8 relative overflow-hidden h-full animate-slide-up">
    <div className="absolute top-0 left-0 w-1.5 h-full accent-emerald rounded-l-3xl" />
    <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 mb-6 flex items-center gap-3">
      <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center">
        <span className="text-lg">🏛️</span>
      </div>
      Fundamental Health
    </h3>
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
      <div className="space-y-1">
        <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">P/E Ratio</p>
        <p className="text-xl font-mono font-black text-slate-800 dark:text-slate-200">{data.peRatio?.toFixed(2)}x</p>
      </div>
      <div className="space-y-1">
        <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">PBV Ratio</p>
        <p className="text-xl font-mono font-black text-slate-800 dark:text-slate-200">{data.pbvRatio?.toFixed(2)}x</p>
      </div>
      <div className="space-y-1">
        <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">ROE</p>
        <p className={`text-xl font-mono font-black ${data.roe > 15 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-800 dark:text-slate-200'}`}>{data.roe?.toFixed(2)}%</p>
      </div>
      <div className="space-y-1">
        <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">DER</p>
        <p className={`text-xl font-mono font-black ${data.der < 1 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-800 dark:text-slate-200'}`}>{data.der?.toFixed(2)}x</p>
      </div>
      <div className="space-y-1">
        <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Div. Yield</p>
        <p className="text-xl font-mono font-black text-slate-800 dark:text-slate-200">{data.dividendYield?.toFixed(2)}%</p>
      </div>
      <div className="space-y-1">
        <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Market Cap</p>
        <p className="text-sm font-mono font-black text-slate-800 dark:text-slate-200">{data.marketCap}</p>
      </div>
    </div>
  </div>
);

const VerdictCard = ({ verdict }: { verdict: InvestmentVerdict }) => {
  const accentClass = verdict.rating === 'Buy' ? 'accent-emerald' : verdict.rating === 'Sell' ? 'accent-rose' : 'accent-amber';
  return (
    <div className="glass-card rounded-3xl p-8 relative overflow-hidden h-full animate-slide-up">
      <div className={`absolute top-0 left-0 right-0 h-1 ${accentClass} rounded-t-3xl`} />
      <div className="flex justify-between items-start mb-8">
        <div>
          <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 mb-2">Investment Verdict</h3>
          <span className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest ${verdict.rating === 'Buy' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' : verdict.rating === 'Sell' ? 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400' : 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400'}`}>
            {verdict.rating}
          </span>
        </div>
        <div className="text-right">
          <div className="flex gap-2 items-end h-10">
            {['Growth', 'Value', 'Dividend'].map((type) => (
              <div key={type} className="flex flex-col items-center gap-1 group w-4">
                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-full relative overflow-hidden">
                  <div className="absolute bottom-0 w-full bg-indigo-500 rounded-full transition-all duration-1000" style={{ height: `${(verdict.suitability as any)[type.toLowerCase()] || 0}%` }}></div>
                </div>
                <span className="text-[8px] font-black uppercase text-slate-400 dark:text-slate-500">{type[0]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <h4 className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-3">Pros</h4>
          <ul className="space-y-2">
            {verdict.pros.slice(0, 3).map((pro, i) => (
              <li key={i} className="flex items-start gap-2 text-[10px] font-bold text-slate-600 dark:text-slate-400 leading-tight">
                <span className="text-emerald-500 mt-0.5">✓</span> {pro}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="text-[9px] font-black text-red-600 dark:text-red-400 uppercase tracking-widest mb-3">Cons</h4>
          <ul className="space-y-2">
            {verdict.cons.slice(0, 3).map((con, i) => (
              <li key={i} className="flex items-start gap-2 text-[10px] font-bold text-slate-600 dark:text-slate-400 leading-tight">
                <span className="text-red-500 mt-0.5">✕</span> {con}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

const QualitativeCard = ({ data }: { data: QualitativeAnalysis }) => (
  <div className="glass-card rounded-3xl p-8 relative overflow-hidden animate-slide-up stagger-1">
    <div className="absolute top-0 left-0 w-1.5 h-full accent-blue rounded-l-3xl" />
    <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 mb-6 flex items-center gap-3">
      <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center">
        <span className="text-lg">🎯</span>
      </div>
      Qualitative Analysis
    </h3>
    <div className="space-y-5">
      {[
        { label: 'Business Model', text: data.businessModel },
        { label: 'Management Quality', text: data.managementQuality },
        { label: 'Industry Prospects', text: data.industryProspects },
        { label: 'Competitive Position', text: data.competitivePosition },
      ].map(({ label, text }) => (
        <div key={label} className="group">
          <h4 className="text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-1.5">{label}</h4>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{text}</p>
        </div>
      ))}
    </div>
  </div>
);

const QuantitativeCard = ({ data }: { data: QuantitativeAnalysis }) => (
  <div className="glass-card rounded-3xl p-8 relative overflow-hidden animate-slide-up stagger-2">
    <div className="absolute top-0 left-0 w-1.5 h-full accent-violet rounded-l-3xl" />
    <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 mb-6 flex items-center gap-3">
      <div className="w-9 h-9 rounded-xl bg-violet-50 dark:bg-violet-500/10 flex items-center justify-center">
        <span className="text-lg">📊</span>
      </div>
      Quantitative Analysis
    </h3>
    <div className="space-y-6">
      {[
        { label: 'Income Statement', entries: data.incomeStatement, color: 'text-violet-600 dark:text-violet-400' },
        { label: 'Balance Sheet', entries: data.balanceSheet, color: 'text-violet-600 dark:text-violet-400' },
        { label: 'Cash Flow', entries: data.cashFlow, color: 'text-violet-600 dark:text-violet-400' },
      ].map(({ label, entries, color }) => (
        <div key={label}>
          <h4 className={`text-xs font-black ${color} uppercase tracking-widest mb-3`}>{label}</h4>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(entries).map(([key, value]) => (
              <div key={key} className="space-y-1">
                <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{key.replace(/_/g, ' ')}</p>
                <p className="text-base font-mono font-black text-slate-800 dark:text-slate-200">{value}</p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  </div>
);

const AnalysisApproachCard = ({ data }: { data: AnalysisApproach }) => (
  <div className="glass-card rounded-2xl p-6 relative overflow-hidden animate-slide-up h-full">
    <div className="absolute top-0 left-0 right-0 h-1 accent-indigo rounded-t-2xl" />
    <h3 className="text-slate-800 dark:text-slate-100 text-sm font-black uppercase tracking-widest mb-5 flex items-center gap-2.5">
      <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center">
        <span className="text-base">🔍</span>
      </div>
      Analysis Approach
    </h3>
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="px-3.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400">
          {data.methodology}
        </span>
      </div>
      <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{data.description}</p>
      <div>
        <h4 className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-3">Key Factors</h4>
        <ul className="space-y-2">
          {data.keyFactors.map((factor, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
              <span className="w-5 h-5 rounded-md bg-indigo-50 dark:bg-indigo-500/10 text-indigo-500 flex items-center justify-center text-[10px] font-black flex-shrink-0 mt-0.5">{i + 1}</span>
              <span>{factor}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  </div>
);

const DashboardHeroCard = ({ icon, title, desc, activeCount, color, onClick }: any) => (
  <div onClick={onClick} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 hover:shadow-2xl hover:shadow-indigo-500/10 transition-all group relative overflow-hidden flex flex-col h-full border-b-[8px] border-b-indigo-500 cursor-pointer active:scale-[0.99]">
    <div className="absolute top-0 right-0 p-6">
      <span className="bg-slate-900 dark:bg-slate-800 text-white text-[9px] px-3 py-1 rounded-full font-black tracking-widest uppercase shadow-xl">{activeCount} TRADERS</span>
    </div>
    <div className={`w-16 h-16 bg-${color}-50 dark:bg-${color}-900/20 rounded-2xl flex items-center justify-center text-3xl mb-6 border border-${color}-100 dark:border-${color}-900/50 group-hover:scale-110 transition-transform shadow-inner`}>{icon}</div>
    <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100 mb-3 tracking-tight">{title}</h3>
    <p className="text-slate-400 dark:text-slate-500 font-bold text-sm mb-12 leading-relaxed flex-grow">{desc}</p>
    <button className={`w-full py-4 bg-${color}-600 hover:bg-${color}-700 text-white font-black rounded-2xl transition-all shadow-xl shadow-${color}-100 dark:shadow-none`}>Launch AI Vision</button>
  </div>
);

const ToolGridCard = ({ icon, label, sub, badge, onClick }: any) => (
  <div onClick={onClick} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex items-center gap-5 cursor-pointer hover:border-indigo-500 hover:shadow-lg transition-all group border-b-4 border-b-transparent active:scale-95">
    <div className="w-12 h-12 rounded-xl bg-slate-50 dark:bg-slate-800 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/20 flex items-center justify-center text-2xl transition-colors shadow-inner">{icon}</div>
    <div className="flex-1">
      <h4 className="font-black text-slate-800 dark:text-slate-200 text-sm flex items-center gap-2">
        {label}
        {badge && <span className="text-[7px] bg-indigo-600 text-white px-2 py-0.5 rounded-full font-black tracking-tighter">{badge}</span>}
      </h4>
      <p className="text-[9px] text-slate-400 font-black uppercase tracking-wider mt-1.5">{sub}</p>
    </div>
    <div className="text-slate-300 dark:text-slate-600 group-hover:text-indigo-500 transform group-hover:translate-x-1 transition-all">
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3.5} d="M9 5l7 7-7 7" /></svg>
    </div>
  </div>
);

const SidebarItem = ({ icon, label, viewId, view, setView, color = 'indigo' }: { icon: string, label: string, viewId: any, view: string, setView: any, color?: string }) => (
  <button
    onClick={() => setView(viewId)}
    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all group ${view === viewId ? `bg-${color}-500/10 dark:bg-${color}-500/20 text-${color}-600 dark:text-${color}-400` : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
  >
    <div className="flex items-center gap-3">
      <span className="text-xl group-hover:scale-110 transition-transform">{icon}</span>
      <span className="text-sm font-bold tracking-tight">{label}</span>
    </div>
    {view === viewId && <div className={`w-1.5 h-4 bg-${color}-500 rounded-full`}></div>}
  </button>
);

const ThemeToggle = () => {
  const { theme, setTheme } = useTheme();
  return (
    <button
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
      title="Toggle Theme"
    >
      {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
    </button>
  );
};

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [authView, setAuthView] = useState<'login' | 'register'>('login');
  const [view, setView] = useState<'dashboard' | 'analysis' | 'swing' | 'scalp' | 'backtest' | 'review' | 'journal' | 'learning' | 'community' | 'watchlist' | 'admin'>('dashboard');
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

  // Watchlist & Alert State for Analysis View
  const [isSavedToWatchlist, setIsSavedToWatchlist] = useState(false);
  const [alertPrice, setAlertPrice] = useState<string>('');
  const [isAlertOpen, setIsAlertOpen] = useState(false);

  const pollingInProgress = useRef(false);

  useEffect(() => {
    const savedUser = localStorage.getItem('idx_user');
    if (savedUser) setUser(JSON.parse(savedUser));
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
    localStorage.setItem('idx_user', JSON.stringify(userData));
    setView('dashboard');
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('idx_user');
    setAuthView('login');
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

  if (!user) {
    if (authView === 'login') return <LoginPage onLogin={handleLogin} onSwitch={() => setAuthView('register')} />;
    return <RegisterPage onLogin={handleLogin} onSwitch={() => setAuthView('login')} />;
  }

  // Admin Dashboard — full-page takeover (no sidebar)
  if (view === 'admin') {
    return (
      <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div></div>}>
        <AdminDashboard onBack={() => setView('dashboard')} />
      </Suspense>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 text-slate-900 dark:text-slate-50 font-sans flex overflow-hidden transition-colors duration-300">
      {/* SIDEBAR */}
      <aside className="w-64 border-r border-slate-200 dark:border-slate-800 flex-col hidden lg:flex sticky top-0 h-screen bg-white dark:bg-slate-900 shadow-sm z-50 transition-colors">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-10 cursor-pointer" onClick={() => setView('dashboard')}>
            <div className="w-10 h-10 bg-gradient-to-tr from-indigo-500 to-indigo-700 rounded-xl flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-100">
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 3v18h18M7 16l4-4 4 4 6-6" /></svg>
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tighter text-slate-800 leading-none">IDX Assistant</h1>
              <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mt-1">Smart AI Trading</p>
            </div>
          </div>

          <div className="space-y-10">
            <section>
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 ml-2">Tools</h3>
              <div className="space-y-1">
                <SidebarItem icon="🏠" label="Dashboard" viewId="dashboard" view={view} setView={setView} />
                <SidebarItem icon="📅" label="Swing Trading" viewId="swing" view={view} setView={setView} />
                <SidebarItem icon="⏱️" label="Scalp Trading" viewId="scalp" view={view} setView={setView} color="violet" />
                <SidebarItem icon="⚡" label="Backtester" viewId="backtest" view={view} setView={setView} color="amber" />
              </div>
            </section>

            <section>
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 ml-2">Market IQ</h3>
              <div className="space-y-1">
                <SidebarItem icon="🤖" label="Market Analysis" viewId="analysis" view={view} setView={setView} color="emerald" />
                <SidebarItem icon="👀" label="Watchlist" viewId="watchlist" view={view} setView={setView} color="indigo" />
                <SidebarItem icon="📖" label="Learning" viewId="learning" view={view} setView={setView} color="amber" />
                <SidebarItem icon="📓" label="Journal" viewId="journal" view={view} setView={setView} color="rose" />
                <SidebarItem icon="👥" label="Community" viewId="community" view={view} setView={setView} color="blue" />
              </div>
            </section>

            <section>
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 ml-2">System</h3>
              <div className="space-y-1">
                <SidebarItem icon="⚙️" label="Admin" viewId="admin" view={view} setView={setView} color="amber" />
              </div>
            </section>
          </div>
        </div>
        <div className="mt-auto p-6 space-y-4">
          <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Theme</span>
            <ThemeToggle />
          </div>
          <button onClick={handleLogout} className="w-full bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-black py-3 rounded-xl text-sm transition-all border border-slate-200 dark:border-slate-700">Sign Out</button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 overflow-y-auto">
        {/* Nav Bar */}
        <nav className="h-16 border-b border-slate-200 flex items-center justify-between px-8 bg-white/80 backdrop-blur-md sticky top-0 z-[45]">
          <div className="flex items-center gap-4">
            <button className="lg:hidden p-2 text-slate-500"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" /></svg></button>
            <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest">{view.replace('-', ' ')}</h2>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-black text-slate-800 leading-none">{user.name}</p>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Trader Pro</p>
            </div>
            <div className="w-9 h-9 bg-indigo-500 rounded-xl flex items-center justify-center text-white font-black text-sm shadow-md shadow-indigo-100">{user.name[0].toUpperCase()}</div>
          </div>
        </nav>

        <div className="p-8 max-w-6xl mx-auto space-y-12">
          {/* DASHBOARD VIEW */}
          {view === 'dashboard' && (
            <div className="animate-fade-in space-y-12 pb-20">
              {/* Header */}
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <span className="text-3xl">👋</span>
                  <h2 className="text-3xl font-black text-slate-800 dark:text-slate-100 tracking-tight">Welcome back, {user.name}!</h2>
                </div>
                <p className="text-slate-400 dark:text-slate-500 font-bold text-lg">Thursday, January 22 • Ready for today's market?</p>
              </div>

              {/* Top Action Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <DashboardHeroCard
                  icon="📈"
                  title="Swing Vision"
                  desc="Analyze higher timeframe charts. AI identifies multi-day patterns and structure."
                  activeCount="9.1k"
                  color="indigo"
                  onClick={() => setView('swing')}
                />
                <DashboardHeroCard
                  icon="⚡"
                  title="Scalp Vision"
                  desc="Ultra-short term analysis. Capture quick moves with precision AI mapping."
                  activeCount="5.0k"
                  color="violet"
                  onClick={() => setView('scalp')}
                />
              </div>

              {/* Tool Grid Section */}
              <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 space-y-8 shadow-sm">
                <div>
                  <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight">Trading Command Center</h3>
                  <p className="text-slate-400 dark:text-slate-500 text-sm font-medium mt-1">Master the market with advanced AI tools</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  <ToolGridCard icon="📅" label="Swing Trades" sub="Multi-day pattern matching" badge="POPULAR" onClick={() => setView('swing')} />
                  <ToolGridCard icon="⏱️" label="Scalp Trades" sub="Quick volatility scanner" badge="NEW" onClick={() => setView('scalp')} />
                  <ToolGridCard icon="🤖" label="Market Analysis" sub="Gemini-powered ticker scan" onClick={() => setView('analysis')} />
                  <ToolGridCard icon="👀" label="Watchlist" sub="Price alerts & monitoring" onClick={() => setView('watchlist')} />
                  <ToolGridCard icon="🧪" label="Backtester" sub="Simulate historical strategy" onClick={() => setView('backtest')} />
                  <ToolGridCard icon="📓" label="Trade Journal" sub="Track your performance" onClick={() => setView('journal')} />
                  <ToolGridCard icon="📖" label="Learning Hub" sub="Professional trading courses" onClick={() => setView('learning')} />
                  <ToolGridCard icon="👥" label="Community" sub="Discuss with other traders" onClick={() => setView('community')} />
                </div>
              </section>

              {/* Community & Tips Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Community Card */}
                <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 space-y-6 shadow-sm flex flex-col h-full">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-black text-slate-800 dark:text-slate-100">Community News</h3>
                    <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 px-3 py-1 rounded-full text-[9px] font-black border border-emerald-100 dark:border-emerald-900/50">
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                      121 ONLINE
                    </div>
                  </div>
                  <div className="space-y-4 flex-grow">
                    <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 flex items-center gap-4 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10 transition-all cursor-pointer">
                      <span className="text-xl">📊</span>
                      <p className="text-xs font-bold text-slate-600 dark:text-slate-300 leading-relaxed">Weekly Wrap: Market sentiment remains bullish after rejection of support.</p>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 flex items-center gap-4 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10 transition-all cursor-pointer">
                      <span className="text-xl">📚</span>
                      <p className="text-xs font-bold text-slate-600 dark:text-slate-300 leading-relaxed">Academy: "The Psychology of Scalping" lesson is now live in Learning Hub.</p>
                    </div>
                  </div>
                  <button onClick={() => setView('community')} className="w-full py-3 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-black rounded-xl text-xs transition-all border border-slate-200 dark:border-slate-700 shadow-sm active:scale-95">Explore Community</button>
                </section>

                {/* Tips Card */}
                <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 space-y-6 shadow-sm flex flex-col h-full">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">💡</span>
                    <h3 className="text-lg font-black text-slate-800 dark:text-slate-100">Pro Tips</h3>
                  </div>
                  <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-900/50 rounded-2xl p-6 border-l-8 border-l-indigo-500 flex-grow">
                    <h4 className="text-[10px] font-black text-indigo-700 dark:text-indigo-400 mb-3 uppercase tracking-[0.2em]">Risk Management</h4>
                    <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed font-bold">
                      "The key to surviving in trading is never letting one bad decision wipe you out. Always risk less than 1% of your total balance per trade to maintain longevity."
                    </p>
                  </div>
                  <button onClick={() => setView('learning')} className="w-full py-3 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-black rounded-xl text-xs transition-all border border-slate-200 dark:border-slate-700 shadow-sm active:scale-95">Browse All Tips</button>
                </section>
              </div>
            </div>
          )}

          {/* VISION TOOLS */}
          {(view === 'swing' || view === 'scalp') && (
            <Suspense fallback={<div className="flex items-center justify-center py-24"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div></div>}>
              {view === 'swing' && <ChartAnalyzer type="SWING" />}
              {view === 'scalp' && <ChartAnalyzer type="SCALP" />}
            </Suspense>
          )}

          {/* BACKTESTER */}
          {view === 'backtest' && (
            <Suspense fallback={<div className="flex items-center justify-center py-24"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div></div>}>
              <Backtester />
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

          {/* COMMUNITY */}
          {view === 'community' && (
            <Suspense fallback={<div className="flex items-center justify-center py-24"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div></div>}>
              <Community currentUser={user} />
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
            <div className="py-24 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm animate-fade-in">
              <div className="w-24 h-24 bg-indigo-50 dark:bg-indigo-900/20 rounded-3xl flex items-center justify-center text-5xl mx-auto mb-8 shadow-sm">🔍</div>
              <h2 className="text-4xl font-black text-slate-800 dark:text-slate-100 tracking-tight">Market IQ Scanner</h2>
              <p className="text-slate-400 dark:text-slate-500 font-bold mb-8 uppercase tracking-widest text-xs">Search or Select a major ticker to start IDX technical scan</p>

              {/* Search Bar */}
              <div className="max-w-xl mx-auto mb-12 relative">
                <form onSubmit={handleSearchSubmit}>
                  <input
                    type="text"
                    placeholder="Search IDX Ticker (e.g. UNVR, TLKM)"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl py-4 pl-12 pr-4 text-lg font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all uppercase placeholder:normal-case shadow-inner"
                    value={searchTicker}
                    onChange={(e) => setSearchTicker(e.target.value)}
                  />
                  <button type="submit" className="absolute right-2 top-2 bottom-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl px-6 transition-all">
                    Scan
                  </button>
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                  </span>
                </form>
              </div>

              <div className="flex flex-wrap gap-3 justify-center max-w-2xl mx-auto px-6">
                {SAMPLE_IDX_STOCKS.map(s => (
                  <button
                    key={s.ticker}
                    onClick={() => handleSelectStock(s)}
                    className="px-6 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-indigo-500 hover:text-indigo-600 text-slate-500 dark:text-slate-400 font-bold rounded-xl transition-all shadow-sm active:scale-95 text-xs"
                  >
                    {s.ticker}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-10 animate-fade-in pb-20">
              <div className="flex flex-col md:flex-row justify-between items-start gap-6 border-b border-slate-200 dark:border-slate-800 pb-10">
                <div>
                  <button
                    onClick={() => setSelectedStock(null)}
                    className="mb-4 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 hover:text-indigo-600 flex items-center gap-2 transition-colors"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                    Back to Scanner
                  </button>
                  <div className="flex items-center gap-4">
                    <h1 className="text-5xl font-black text-slate-800 dark:text-slate-100 tracking-tighter">{selectedStock.ticker}</h1>
                    <span className="bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 text-xs px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 font-black uppercase">IDX</span>
                    {realTimeData && <span className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-[10px] px-3 py-1.5 rounded-full border border-red-100 dark:border-red-900/50 animate-pulse font-black"><span className="w-2 h-2 bg-red-500 rounded-full"></span> LIVE</span>}
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 mt-2 text-xl font-bold">{selectedStock.name}</p>
                </div>

                <div className="flex flex-col items-end gap-6 w-full md:w-auto">
                  <div className="text-right">
                    {(realTimeData || fullStockData.length > 0) ? <>
                      <div className="text-5xl font-mono font-black text-indigo-600 dark:text-indigo-400 tracking-tighter">Rp {(realTimeData?.price || fullStockData[fullStockData.length - 1]?.price || 0).toLocaleString('id-ID')}</div>
                      {realTimeData ? (
                        <div className={`text-sm font-black mt-3 flex items-center md:justify-end gap-2 ${realTimeData.change >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                          <span>{realTimeData.change >= 0 ? '+' : ''}{realTimeData.changePercent}%</span>
                          <span className="text-slate-400 dark:text-slate-500 text-[10px] font-black uppercase tracking-[0.15em] bg-slate-50 dark:bg-slate-800 px-2.5 py-1 rounded">Today</span>
                        </div>
                      ) : <div className="text-sm text-slate-400 dark:text-slate-500 mt-3 font-black uppercase tracking-widest opacity-50">Historical View</div>}
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

              <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                <div className="lg:col-span-1">
                  {analysis ? (
                    <div className="glass-card rounded-3xl p-6 relative overflow-hidden animate-slide-up">
                      <div className="absolute top-0 left-0 right-0 h-1 accent-indigo rounded-t-3xl" />
                      <h2 className="text-[10px] font-black text-slate-400 dark:text-slate-500 mb-8 uppercase tracking-[0.2em]">Signal Core</h2>
                      <Gauge signal={analysis.signal} confidence={analysis.confidence} />
                      <div className="mt-10 space-y-4 pt-6 border-t border-slate-200/40 dark:border-slate-700/40">
                        <div className="flex justify-between items-center text-sm"><span className="text-slate-400 dark:text-slate-500 font-black uppercase tracking-widest text-[9px]">Supp Level</span><span className="text-emerald-600 dark:text-emerald-400 font-mono font-black">Rp {analysis.supportLevel.toLocaleString('id-ID')}</span></div>
                        <div className="flex justify-between items-center text-sm"><span className="text-slate-400 dark:text-slate-500 font-black uppercase tracking-widest text-[9px]">Resi Level</span><span className="text-red-600 dark:text-red-400 font-mono font-black">Rp {analysis.resistanceLevel.toLocaleString('id-ID')}</span></div>
                      </div>
                    </div>
                  ) : <GaugeSkeleton />}
                </div>
                <div className="lg:col-span-3 space-y-8">
                  <div className="relative group glass-card p-6 rounded-3xl overflow-hidden">
                    <Chart data={chartData} timeFrame={timeFrame} chartMode={chartMode} ohlcData={ohlcChartData} onChartModeChange={setChartMode} />
                    <div className="absolute top-10 right-10 flex items-center bg-white/95 dark:bg-slate-900/95 rounded-2xl p-1 backdrop-blur-sm border border-slate-200 dark:border-slate-800 shadow-2xl gap-1">
                      {/* Chart Mode Toggle */}
                      <button
                        onClick={() => setChartMode('line')}
                        className={`flex items-center gap-1 px-3 py-2 rounded-xl text-[9px] font-black tracking-widest uppercase transition-all ${chartMode === 'line'
                          ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100'
                          : 'text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-slate-100'
                          }`}
                        title="Line Chart"
                      >
                        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M3 17l6-6 4 4 8-8" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        Line
                      </button>
                      <button
                        onClick={() => setChartMode('candle')}
                        className={`flex items-center gap-1 px-3 py-2 rounded-xl text-[9px] font-black tracking-widest uppercase transition-all ${chartMode === 'candle'
                          ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100'
                          : 'text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-slate-100'
                          }`}
                        title="Candlestick Chart"
                      >
                        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <line x1="9" y1="2" x2="9" y2="22" />
                          <rect x="6" y="6" width="6" height="10" rx="1" fill="currentColor" />
                          <line x1="17" y1="4" x2="17" y2="20" />
                          <rect x="14" y="8" width="6" height="8" rx="1" />
                        </svg>
                        Candle
                      </button>
                      {/* Divider */}
                      <div className="w-px h-5 bg-slate-200 dark:bg-slate-700 mx-1"></div>
                      {/* Timeframe Buttons */}
                      {(['1D', '1W', '1M', '3M', '6M', '1Y', 'YTD'] as TimeFrame[]).map(tf => <button key={tf} onClick={() => setTimeFrame(tf)} className={`px-4 py-2 text-[9px] font-black tracking-widest uppercase rounded-xl transition-all ${timeFrame === tf ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100 scale-105' : 'text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-slate-100'}`}>{tf}</button>)}
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
                    <div className="glass-card rounded-3xl p-8 relative overflow-hidden h-full animate-slide-up">
                      <div className="absolute top-0 left-0 right-0 h-1 accent-violet rounded-t-3xl" />
                      <div className="absolute top-0 right-0 p-4 opacity-[0.03] pointer-events-none"><svg className="w-48 h-48" fill="currentColor" viewBox="0 0 24 24"><path d="M13 10V3L4 14h7v7l9-11h-7z" /></svg></div>
                      <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 mb-8 flex items-center gap-4"><span className="text-4xl">🤖</span> AI Engine Insight</h2>
                      <p className="text-slate-500 dark:text-slate-400 text-lg font-bold leading-relaxed mb-12">{analysis.summary}</p>
                      <div className="grid md:grid-cols-3 gap-6">
                        {analysis.reasoning.map((point, idx) => (
                          <div key={idx} className="glass-card p-6 rounded-2xl hover:scale-[1.02] transition-all group flex flex-col h-full">
                            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xs font-black mb-6 group-hover:scale-110 transition-transform">{idx + 1}</div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-black uppercase tracking-wider leading-relaxed flex-grow">{point}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : <AnalysisSkeleton />}
                </div>
                <div className="lg:col-span-1"><NewsFeed news={news} isLoading={isNewsLoading} /></div>
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
        </div>
      </main>
    </div>
  );
};

export default App;
