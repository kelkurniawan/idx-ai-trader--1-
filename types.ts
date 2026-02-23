
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
  subsector?: string;
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
  phone_number?: string;
  mfa_enabled?: boolean;
  mfa_type?: 'totp' | 'email_otp' | 'whatsapp_otp' | null;
  profile_complete?: boolean;
  auth_provider?: 'local' | 'google';
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

// --- IDX-IC Sector Classification ---
export const IDX_SECTORS = [
  { id: 'All', label: 'All Sectors', icon: '🔥' },
  { id: 'Financials', label: 'Financials', icon: '🏦' },
  { id: 'Energy', label: 'Energy', icon: '⚡' },
  { id: 'Basic Materials', label: 'Basic Materials', icon: '🧱' },
  { id: 'Technology', label: 'Technology', icon: '💻' },
  { id: 'Consumer Non-Cyclicals', label: 'Consumer Non-Cyclicals', icon: '🛒' },
  { id: 'Consumer Cyclicals', label: 'Consumer Cyclicals', icon: '🎯' },
  { id: 'Healthcare', label: 'Healthcare', icon: '🏥' },
  { id: 'Infrastructures', label: 'Infrastructures', icon: '🏗️' },
  { id: 'Transportation & Logistics', label: 'Transport & Logistics', icon: '🚛' },
  { id: 'Industrials', label: 'Industrials', icon: '🏭' },
  { id: 'Property & Real Estate', label: 'Property & Real Estate', icon: '🏠' },
] as const;

// --- IDX Stock Indices ---
export const IDX_STOCK_INDICES = [
  {
    id: 'IDX30', label: 'IDX30', icon: '🏆',
    description: 'Top 30 most liquid large-cap stocks',
    tickers: ['BBCA', 'BBRI', 'BMRI', 'BBNI', 'ADRO', 'PTBA', 'ANTM', 'INCO', 'BRPT', 'SMGR', 'MBMA', 'MDKA', 'GOTO', 'UNVR', 'ICBP', 'INDF', 'AMRT', 'KLBF', 'ASII', 'TLKM', 'UNTR', 'AMMN', 'PGEO', 'BREN', 'INKP', 'MEDC', 'PGAS', 'AKRA', 'ITMG', 'TOWR'],
  },
  {
    id: 'LQ45', label: 'LQ45', icon: '💎',
    description: '45 highest liquidity & market cap',
    tickers: ['BBCA', 'BBRI', 'BMRI', 'BBNI', 'BRIS', 'BBTN', 'ADRO', 'MEDC', 'PGAS', 'PTBA', 'AKRA', 'BUMI', 'DSSA', 'ANTM', 'INCO', 'BRPT', 'INKP', 'SMGR', 'MBMA', 'MDKA', 'NCKL', 'AMMN', 'GOTO', 'EMTK', 'UNVR', 'ICBP', 'INDF', 'HMSP', 'CPIN', 'JPFA', 'AMRT', 'KLBF', 'ASII', 'MAPI', 'MAPA', 'SCMA', 'HEAL', 'TLKM', 'ISAT', 'EXCL', 'TOWR', 'JSMR', 'UNTR', 'ITMG', 'CTRA', 'SMRA'],
  },
  {
    id: 'IDX80', label: 'IDX80', icon: '📊',
    description: '80 stocks with significant cap & liquidity',
    tickers: ['BBCA', 'BBRI', 'BMRI', 'BBNI', 'BRIS', 'BBTN', 'ARTO', 'BTPS', 'ADRO', 'MEDC', 'PGAS', 'PTBA', 'AKRA', 'BUMI', 'ESSA', 'PGEO', 'DSSA', 'RAJA', 'ANTM', 'INCO', 'BRPT', 'INKP', 'TKIM', 'SMGR', 'INTP', 'MBMA', 'MDKA', 'NCKL', 'AMMN', 'BREN', 'GOTO', 'BUKA', 'EMTK', 'DCII', 'MTDL', 'WIFI', 'UNVR', 'ICBP', 'INDF', 'HMSP', 'GGRM', 'CPIN', 'JPFA', 'AMRT', 'MYOR', 'KLBF', 'SIDO', 'AALI', 'ASII', 'MAPI', 'MAPA', 'ACES', 'SCMA', 'SSIA', 'HEAL', 'MIKA', 'TLKM', 'ISAT', 'EXCL', 'TOWR', 'TBIG', 'JSMR', 'MTEL', 'UNTR', 'ITMG', 'PTRO', 'ADMR', 'CTRA', 'SMRA', 'BSDE', 'PWON', 'KIJA', 'INDY', 'ERAA', 'AUTO', 'BIRD', 'SMDR', 'ASSA', 'WIKA', 'SRTG'],
  },
  {
    id: 'KOMPAS100', label: 'KOMPAS100', icon: '🌐',
    description: 'Top 100 by cap, liquidity & financials',
    tickers: ['BBCA', 'BBRI', 'BMRI', 'BBNI', 'BRIS', 'BBTN', 'ARTO', 'BNGA', 'BDMN', 'MEGA', 'BTPS', 'ADRO', 'MEDC', 'PGAS', 'PTBA', 'AKRA', 'BUMI', 'ESSA', 'PGEO', 'DSSA', 'ELSA', 'RAJA', 'INDY', 'ANTM', 'INCO', 'BRPT', 'INKP', 'TKIM', 'SMGR', 'INTP', 'MBMA', 'MDKA', 'NCKL', 'AMMN', 'BREN', 'GOTO', 'BUKA', 'EMTK', 'DCII', 'MTDL', 'BELI', 'WIFI', 'UNVR', 'ICBP', 'INDF', 'HMSP', 'GGRM', 'CPIN', 'JPFA', 'AMRT', 'MYOR', 'KLBF', 'SIDO', 'AALI', 'ASII', 'MAPI', 'MAPA', 'ACES', 'ERAA', 'SCMA', 'AUTO', 'SSIA', 'HEAL', 'SILO', 'MIKA', 'SAME', 'PRDA', 'TLKM', 'ISAT', 'EXCL', 'TOWR', 'TBIG', 'JSMR', 'MTEL', 'BIRD', 'GIAA', 'SMDR', 'ASSA', 'TMAS', 'UNTR', 'ITMG', 'WIKA', 'WSKT', 'PTRO', 'ADMR', 'SRTG', 'CTRA', 'SMRA', 'BSDE', 'PWON', 'KIJA', 'LPKR', 'DILD'],
  },
] as const;

// --- Complete IDX Stock Database (sourced from LQ45, IDX30, IDX80, KOMPAS100) ---
export const SAMPLE_IDX_STOCKS: StockProfile[] = [
  // Financials
  { ticker: 'BBCA', name: 'Bank Central Asia Tbk', sector: 'Financials', subsector: 'Banking' },
  { ticker: 'BBRI', name: 'Bank Rakyat Indonesia Tbk', sector: 'Financials', subsector: 'Banking' },
  { ticker: 'BMRI', name: 'Bank Mandiri Tbk', sector: 'Financials', subsector: 'Banking' },
  { ticker: 'BBNI', name: 'Bank Negara Indonesia Tbk', sector: 'Financials', subsector: 'Banking' },
  { ticker: 'BRIS', name: 'Bank Syariah Indonesia Tbk', sector: 'Financials', subsector: 'Islamic Banking' },
  { ticker: 'BBTN', name: 'Bank Tabungan Negara Tbk', sector: 'Financials', subsector: 'Banking' },
  { ticker: 'ARTO', name: 'Bank Jago Tbk', sector: 'Financials', subsector: 'Digital Banking' },
  { ticker: 'BNGA', name: 'Bank CIMB Niaga Tbk', sector: 'Financials', subsector: 'Banking' },
  { ticker: 'BDMN', name: 'Bank Danamon Indonesia Tbk', sector: 'Financials', subsector: 'Banking' },
  { ticker: 'MEGA', name: 'Bank Mega Tbk', sector: 'Financials', subsector: 'Banking' },
  { ticker: 'BTPS', name: 'Bank BTPN Syariah Tbk', sector: 'Financials', subsector: 'Islamic Banking' },

  // Energy
  { ticker: 'ADRO', name: 'Adaro Energy Indonesia Tbk', sector: 'Energy', subsector: 'Coal' },
  { ticker: 'MEDC', name: 'Medco Energi Internasional Tbk', sector: 'Energy', subsector: 'Oil & Gas' },
  { ticker: 'PGAS', name: 'Perusahaan Gas Negara Tbk', sector: 'Energy', subsector: 'Natural Gas' },
  { ticker: 'PTBA', name: 'Bukit Asam Tbk', sector: 'Energy', subsector: 'Coal' },
  { ticker: 'AKRA', name: 'AKR Corporindo Tbk', sector: 'Energy', subsector: 'Energy Distribution' },
  { ticker: 'BUMI', name: 'Bumi Resources Tbk', sector: 'Energy', subsector: 'Coal' },
  { ticker: 'ESSA', name: 'ESSA Industries Indonesia Tbk', sector: 'Energy', subsector: 'Coal' },
  { ticker: 'PGEO', name: 'Pertamina Geothermal Energy Tbk', sector: 'Energy', subsector: 'Geothermal' },
  { ticker: 'DSSA', name: 'Dian Swastatika Sentosa Tbk', sector: 'Energy', subsector: 'Coal/Energy' },
  { ticker: 'ELSA', name: 'Elnusa Tbk', sector: 'Energy', subsector: 'Energy Services' },
  { ticker: 'RAJA', name: 'Rukun Raharja Tbk', sector: 'Energy', subsector: 'Oil & Gas' },
  { ticker: 'INDY', name: 'Indika Energy Tbk', sector: 'Energy', subsector: 'Diversified Energy' },

  // Basic Materials
  { ticker: 'ANTM', name: 'Aneka Tambang Tbk', sector: 'Basic Materials', subsector: 'Metals & Mining' },
  { ticker: 'INCO', name: 'Vale Indonesia Tbk', sector: 'Basic Materials', subsector: 'Nickel' },
  { ticker: 'BRPT', name: 'Barito Pacific Tbk', sector: 'Basic Materials', subsector: 'Petrochemical' },
  { ticker: 'INKP', name: 'Indah Kiat Pulp & Paper Tbk', sector: 'Basic Materials', subsector: 'Pulp & Paper' },
  { ticker: 'TKIM', name: 'Pabrik Kertas Tjiwi Kimia Tbk', sector: 'Basic Materials', subsector: 'Pulp & Paper' },
  { ticker: 'SMGR', name: 'Semen Indonesia Tbk', sector: 'Basic Materials', subsector: 'Cement' },
  { ticker: 'INTP', name: 'Indocement Tunggal Prakarsa Tbk', sector: 'Basic Materials', subsector: 'Cement' },
  { ticker: 'MBMA', name: 'Merdeka Battery Materials Tbk', sector: 'Basic Materials', subsector: 'Battery Minerals' },
  { ticker: 'MDKA', name: 'Merdeka Copper Gold Tbk', sector: 'Basic Materials', subsector: 'Mining' },
  { ticker: 'NCKL', name: 'Trimegah Bangun Persada Tbk', sector: 'Basic Materials', subsector: 'Nickel' },
  { ticker: 'AMMN', name: 'Amman Mineral Internasional Tbk', sector: 'Basic Materials', subsector: 'Mining' },
  { ticker: 'BREN', name: 'Barito Renewables Energy Tbk', sector: 'Basic Materials', subsector: 'Renewables' },

  // Technology
  { ticker: 'GOTO', name: 'GoTo Gojek Tokopedia Tbk', sector: 'Technology', subsector: 'E-commerce/Fintech' },
  { ticker: 'BUKA', name: 'Bukalapak.com Tbk', sector: 'Technology', subsector: 'E-commerce' },
  { ticker: 'EMTK', name: 'Elang Mahkota Teknologi Tbk', sector: 'Technology', subsector: 'Media Tech' },
  { ticker: 'DCII', name: 'DCI Indonesia Tbk', sector: 'Technology', subsector: 'Data Center' },
  { ticker: 'MTDL', name: 'Metrodata Electronics Tbk', sector: 'Technology', subsector: 'IT Solutions' },
  { ticker: 'BELI', name: 'Global Digital Niaga Tbk', sector: 'Technology', subsector: 'E-commerce' },
  { ticker: 'WIFI', name: 'Solusi Sinergi Digital Tbk', sector: 'Technology', subsector: 'Digital Services' },

  // Consumer Non-Cyclicals
  { ticker: 'UNVR', name: 'Unilever Indonesia Tbk', sector: 'Consumer Non-Cyclicals', subsector: 'Household Products' },
  { ticker: 'ICBP', name: 'Indofood CBP Sukses Makmur Tbk', sector: 'Consumer Non-Cyclicals', subsector: 'Food & Beverage' },
  { ticker: 'INDF', name: 'Indofood Sukses Makmur Tbk', sector: 'Consumer Non-Cyclicals', subsector: 'Food & Beverage' },
  { ticker: 'HMSP', name: 'HM Sampoerna Tbk', sector: 'Consumer Non-Cyclicals', subsector: 'Tobacco' },
  { ticker: 'GGRM', name: 'Gudang Garam Tbk', sector: 'Consumer Non-Cyclicals', subsector: 'Tobacco' },
  { ticker: 'CPIN', name: 'Charoen Pokphand Indonesia Tbk', sector: 'Consumer Non-Cyclicals', subsector: 'Poultry/Agri' },
  { ticker: 'JPFA', name: 'JAPFA Comfeed Indonesia Tbk', sector: 'Consumer Non-Cyclicals', subsector: 'Poultry/Agri' },
  { ticker: 'AMRT', name: 'Sumber Alfaria Trijaya Tbk', sector: 'Consumer Non-Cyclicals', subsector: 'Retail (Food)' },
  { ticker: 'MYOR', name: 'Mayora Indah Tbk', sector: 'Consumer Non-Cyclicals', subsector: 'Food & Beverage' },
  { ticker: 'KLBF', name: 'Kalbe Farma Tbk', sector: 'Consumer Non-Cyclicals', subsector: 'Pharma/Consumer' },
  { ticker: 'SIDO', name: 'Industri Jamu Sido Muncul Tbk', sector: 'Consumer Non-Cyclicals', subsector: 'Herbal/Pharma' },
  { ticker: 'AALI', name: 'Astra Agro Lestari Tbk', sector: 'Consumer Non-Cyclicals', subsector: 'Agriculture' },

  // Consumer Cyclicals
  { ticker: 'ASII', name: 'Astra International Tbk', sector: 'Consumer Cyclicals', subsector: 'Automotive/Conglomerate' },
  { ticker: 'MAPI', name: 'Mitra Adiperkasa Tbk', sector: 'Consumer Cyclicals', subsector: 'Retail (Fashion)' },
  { ticker: 'MAPA', name: 'MAP Aktif Adiperkasa Tbk', sector: 'Consumer Cyclicals', subsector: 'Retail (Sports)' },
  { ticker: 'ACES', name: 'Aspirasi Hidup Indonesia Tbk', sector: 'Consumer Cyclicals', subsector: 'Retail (Hardware)' },
  { ticker: 'ERAA', name: 'Erajaya Swasembada Tbk', sector: 'Consumer Cyclicals', subsector: 'Electronics Retail' },
  { ticker: 'SCMA', name: 'Surya Citra Media Tbk', sector: 'Consumer Cyclicals', subsector: 'Media' },
  { ticker: 'AUTO', name: 'Astra Otoparts Tbk', sector: 'Consumer Cyclicals', subsector: 'Auto Parts' },
  { ticker: 'SSIA', name: 'Surya Semesta Internusa Tbk', sector: 'Consumer Cyclicals', subsector: 'Consumer Services' },

  // Healthcare
  { ticker: 'HEAL', name: 'Medikaloka Hermina Tbk', sector: 'Healthcare', subsector: 'Hospitals' },
  { ticker: 'SILO', name: 'Siloam International Hospitals Tbk', sector: 'Healthcare', subsector: 'Hospitals' },
  { ticker: 'MIKA', name: 'Mitra Keluarga Karyasehat Tbk', sector: 'Healthcare', subsector: 'Hospitals' },
  { ticker: 'SAME', name: 'Sarana Meditama Metropolitan Tbk', sector: 'Healthcare', subsector: 'Hospitals' },
  { ticker: 'PRDA', name: 'Prodia Widyahusada Tbk', sector: 'Healthcare', subsector: 'Diagnostics' },

  // Infrastructures
  { ticker: 'TLKM', name: 'Telkom Indonesia Tbk', sector: 'Infrastructures', subsector: 'Telecom' },
  { ticker: 'ISAT', name: 'Indosat Ooredoo Hutchison Tbk', sector: 'Infrastructures', subsector: 'Telecom' },
  { ticker: 'EXCL', name: 'XL Axiata Tbk', sector: 'Infrastructures', subsector: 'Telecom' },
  { ticker: 'TOWR', name: 'Sarana Menara Nusantara Tbk', sector: 'Infrastructures', subsector: 'Telecom Tower' },
  { ticker: 'TBIG', name: 'Tower Bersama Infrastructure Tbk', sector: 'Infrastructures', subsector: 'Telecom Tower' },
  { ticker: 'JSMR', name: 'Jasa Marga Tbk', sector: 'Infrastructures', subsector: 'Toll Roads' },
  { ticker: 'MTEL', name: 'Dayamitra Telekomunikasi Tbk', sector: 'Infrastructures', subsector: 'Telecom Infra' },

  // Transportation & Logistics
  { ticker: 'BIRD', name: 'Blue Bird Tbk', sector: 'Transportation & Logistics', subsector: 'Land Transport' },
  { ticker: 'GIAA', name: 'Garuda Indonesia Tbk', sector: 'Transportation & Logistics', subsector: 'Airlines' },
  { ticker: 'SMDR', name: 'Samudera Indonesia Tbk', sector: 'Transportation & Logistics', subsector: 'Marine Shipping' },
  { ticker: 'ASSA', name: 'Adi Sarana Armada Tbk', sector: 'Transportation & Logistics', subsector: 'Logistics' },
  { ticker: 'TMAS', name: 'Temas Tbk', sector: 'Transportation & Logistics', subsector: 'Marine Shipping' },

  // Industrials
  { ticker: 'UNTR', name: 'United Tractors Tbk', sector: 'Industrials', subsector: 'Heavy Equipment' },
  { ticker: 'ITMG', name: 'Indo Tambangraya Megah Tbk', sector: 'Industrials', subsector: 'Coal Mining' },
  { ticker: 'WIKA', name: 'Wijaya Karya Tbk', sector: 'Industrials', subsector: 'Construction' },
  { ticker: 'WSKT', name: 'Waskita Karya Tbk', sector: 'Industrials', subsector: 'Construction' },
  { ticker: 'PTRO', name: 'Petrosea Tbk', sector: 'Industrials', subsector: 'Mining Services' },
  { ticker: 'ADMR', name: 'Adaro Minerals Indonesia Tbk', sector: 'Industrials', subsector: 'Mining' },
  { ticker: 'SRTG', name: 'Saratoga Investama Sedaya Tbk', sector: 'Industrials', subsector: 'Investment' },

  // Property & Real Estate
  { ticker: 'CTRA', name: 'Ciputra Development Tbk', sector: 'Property & Real Estate', subsector: 'Property Developer' },
  { ticker: 'SMRA', name: 'Summarecon Agung Tbk', sector: 'Property & Real Estate', subsector: 'Property Developer' },
  { ticker: 'BSDE', name: 'Bumi Serpong Damai Tbk', sector: 'Property & Real Estate', subsector: 'Property Developer' },
  { ticker: 'PWON', name: 'Pakuwon Jati Tbk', sector: 'Property & Real Estate', subsector: 'Property Developer' },
  { ticker: 'KIJA', name: 'Kawasan Industri Jababeka Tbk', sector: 'Property & Real Estate', subsector: 'Industrial Estate' },
  { ticker: 'LPKR', name: 'Lippo Karawaci Tbk', sector: 'Property & Real Estate', subsector: 'Property Developer' },
  { ticker: 'DILD', name: 'Intiland Development Tbk', sector: 'Property & Real Estate', subsector: 'Property Developer' },
];
