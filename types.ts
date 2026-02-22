
export interface StockDataPoint {
  date: string;
  price: number;
  volume: number;
}

export type ChartMode = 'line' | 'candle';

export interface OHLCDataPoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export enum SignalType {
  STRONG_BUY = 'STRONG_BUY',
  BUY = 'BUY',
  NEUTRAL = 'NEUTRAL',
  SELL = 'SELL',
  STRONG_SELL = 'STRONG_SELL',
}

export type TrendDirection = 'BULLISH' | 'BEARISH' | 'NEUTRAL';

export type TimeFrame = '1D' | '1W' | '1M' | '3M' | '6M' | '1Y' | 'YTD';

export interface TechnicalIndicators {
  rsi: number;
  macd: number;
  ma50: number;
  ma200: number;
  volumeAvg: number;
  bollingerUpper: number;
  bollingerLower: number;
  trendShort: TrendDirection;
  trendMedium: TrendDirection;
  trendLong: TrendDirection;
}

export interface RealTimeMarketData {
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  lastUpdated: string;
  sources?: { title: string; uri: string }[];
}

export interface NewsItem {
  title: string;
  source: string;
  url: string;
  snippet: string;
  publishedAt: string;
}

export interface FundamentalData {
  peRatio: number;
  pbvRatio: number;
  roe: number;
  der: number;
  marketCap: string;
  dividendYield: number;
}

export interface InvestmentVerdict {
  rating: 'Buy' | 'Hold' | 'Sell';
  suitability: {
    growth: number; // 0-100
    value: number; // 0-100
    dividend: number; // 0-100
  };
  pros: string[];
  cons: string[];
}

export interface QualitativeAnalysis {
  businessModel: string;
  managementQuality: string;
  industryProspects: string;
  competitivePosition: string;
}

export interface QuantitativeAnalysis {
  incomeStatement: Record<string, string>;
  balanceSheet: Record<string, string>;
  cashFlow: Record<string, string>;
}

export interface AnalysisApproach {
  methodology: string;
  description: string;
  keyFactors: string[];
}

export interface AIAnalysisResult {
  ticker: string;
  currentPrice: number;
  signal: SignalType;
  confidence: number;
  summary: string;
  reasoning: string[];
  supportLevel: number;
  resistanceLevel: number;
  lastUpdated: string;
  timestamp?: number;
  fundamentals?: FundamentalData;
  verdict?: InvestmentVerdict;
  qualitative?: QualitativeAnalysis;
  quantitative?: QuantitativeAnalysis;
  approach?: AnalysisApproach;
}

export interface VisualLevel {
  price: string;
  yPos: number; // 0 to 1
  label: string;
}

// New Chart Vision Types
export interface ChartVisionAnalysis {
  trend: string;
  candlestickPatterns: string[];
  supportLevels: VisualLevel[];
  resistanceLevels: VisualLevel[];
  entrySuggestion: string;
  stopLoss: string;
  takeProfit: string;
  overallStrategy: string;
}

export interface TradeSetup {
  balance: number;
  riskPercent: number;
  stopLossPoints: number;
  takeProfitPoints: number;
}

export interface StockProfile {
  ticker: string;
  name: string;
  sector: string;
}

export interface PortfolioItem {
  ticker: string;
  addedAt: number;
  targetPrice?: number;
  note?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

// --- Backtesting Types ---
export interface BacktestTrade {
  id: number;
  entryDate: string;
  entryPrice: number;
  exitDate: string;
  exitPrice: number;
  pnl: number;
  pnlPercent: number;
  type: 'LONG' | 'SHORT';
}

export interface BacktestResult {
  initialBalance: number;
  finalBalance: number;
  totalReturn: number;
  totalReturnPercent: number;
  winRate: number;
  maxDrawdown: number;
  totalTrades: number;
  trades: BacktestTrade[];
  equityCurve: { date: string; balance: number }[];
}

export type BacktestStrategy = 'SMA_CROSSOVER' | 'RSI_REVERSAL' | 'MOMENTUM_AI';

// --- Journal Types ---
export interface JournalEntry {
  id: string;
  ticker: string;
  date: string; // Entry Date
  exitDate?: string; // Exit Date
  type: 'LONG' | 'SHORT';
  setup: 'SWING' | 'SCALP';
  entryPrice: number;
  exitPrice?: number;
  stopLoss: number;
  takeProfit: number;
  notes: string;
  status: 'OPEN' | 'CLOSED';
}

export interface TradeMarker {
  date: string;
  price: number;
  label: string;
  color: string;
  type: 'ENTRY' | 'EXIT';
}

// --- Community Types ---
export interface CommunityPost {
  id: string;
  author: User;
  content: string;
  timestamp: number;
  sentiment?: 'BULLISH' | 'BEARISH';
  ticker?: string;
  likes: number;
  comments: number;
  isLiked?: boolean;
}

export const SAMPLE_IDX_STOCKS: StockProfile[] = [
  { ticker: 'BBCA', name: 'Bank Central Asia Tbk', sector: 'Finance' },
  { ticker: 'BBRI', name: 'Bank Rakyat Indonesia', sector: 'Finance' },
  { ticker: 'BMRI', name: 'Bank Mandiri', sector: 'Finance' },
  { ticker: 'BBNI', name: 'Bank Negara Indonesia', sector: 'Finance' },
  { ticker: 'BRIS', name: 'Bank Syariah Indonesia', sector: 'Finance' },
  { ticker: 'GOTO', name: 'GoTo Gojek Tokopedia', sector: 'Technology' },
  { ticker: 'BUKA', name: 'Bukalapak.com', sector: 'Technology' },
  { ticker: 'ADRO', name: 'Adaro Energy', sector: 'Energy' },
  { ticker: 'TLKM', name: 'Telkom Indonesia', sector: 'Infrastructure' },
  { ticker: 'ASII', name: 'Astra International', sector: 'Conglomerate' },
];
