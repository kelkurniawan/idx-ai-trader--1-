/**
 * Backend API Client Service
 * 
 * Connects the frontend to the FastAPI backend.
 * Falls back to local services if backend is unavailable.
 */

import {
  StockProfile,
  StockDataPoint,
  TechnicalIndicators,
  AIAnalysisResult,
  RealTimeMarketData,
  ChartVisionAnalysis,
  SignalType,
  TrendDirection
} from '../types';

// Backend API base URL - configurable for different environments
import { API_BASE, buildAuthHeaders } from './apiClient';

const API_BASE_URL = API_BASE;

// Track backend availability
let backendAvailable = true;
let lastCheckTime = 0;
const CHECK_INTERVAL = 30000; // 30 seconds

/**
 * Check if backend is available
 */
async function checkBackendHealth(): Promise<boolean> {
  const now = Date.now();
  if (now - lastCheckTime < CHECK_INTERVAL) {
    return backendAvailable;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(3000)
    });
    backendAvailable = response.ok;
    lastCheckTime = now;
    return backendAvailable;
  } catch {
    backendAvailable = false;
    lastCheckTime = now;
    return false;
  }
}

/**
 * Generic fetch wrapper with error handling
 */
async function apiFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const headers = await buildAuthHeaders(options?.headers);
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    credentials: 'include',
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(error.detail || `API Error: ${response.status}`);
  }

  return response.json();
}

// ============================================
// Stock Data APIs
// ============================================

/**
 * Get list of all available stocks
 */
export async function getStockList(): Promise<StockProfile[]> {
  if (!await checkBackendHealth()) {
    // Fallback to import from types if backend unavailable
    const { SAMPLE_IDX_STOCKS } = await import('../types');
    return SAMPLE_IDX_STOCKS;
  }

  const data = await apiFetch<{ stocks: StockProfile[] }>('/api/stocks');
  return data.stocks;
}

/**
 * Get stock profile by ticker
 */
export async function getStockProfile(ticker: string): Promise<StockProfile | null> {
  if (!await checkBackendHealth()) {
    const { SAMPLE_IDX_STOCKS } = await import('../types');
    return SAMPLE_IDX_STOCKS.find(s => s.ticker === ticker.toUpperCase()) || null;
  }

  try {
    return await apiFetch<StockProfile>(`/api/stocks/${ticker}`);
  } catch {
    return null;
  }
}

/**
 * Get real-time price data
 */
export async function getRealTimePrice(ticker: string): Promise<RealTimeMarketData | null> {
  if (!await checkBackendHealth()) {
    return null; // Let frontend handle fallback
  }

  try {
    const data = await apiFetch<{
      current: number;
      change: number;
      change_percent: number;
      volume: number;
      last_updated: string;
    }>(`/api/stocks/${ticker}/price`);

    return {
      price: data.current,
      change: data.change,
      changePercent: data.change_percent,
      volume: data.volume,
      lastUpdated: data.last_updated,
    };
  } catch {
    return null;
  }
}

/**
 * Get historical price data
 */
export async function getStockHistory(
  ticker: string,
  timeframe: string = '3M',
  limit: number = 100
): Promise<StockDataPoint[]> {
  if (!await checkBackendHealth()) {
    return []; // Let frontend use local generation
  }

  try {
    return await apiFetch<StockDataPoint[]>(
      `/api/stocks/${ticker}/history?timeframe=${timeframe}&limit=${limit}`
    );
  } catch {
    return [];
  }
}

// ============================================
// Market Analyzer APIs (Priority #1)
// ============================================

/**
 * Complete Market Analysis Response Type
 */
export interface MarketAnalysisResponse {
  ticker: string;
  name: string;
  sector: string;
  price: {
    current: number;
    change: number;
    change_percent: number;
    volume: number;
    last_updated: string;
  };
  technicals: {
    rsi: number;
    macd: { line: number; signal: number; histogram: number };
    ema20: number;
    sma50: number;
    sma200: number;
    bollinger: { upper: number; middle: number; lower: number };
    support: number[];
    resistance: number[];
    trend_short: TrendDirection;
    trend_medium: TrendDirection;
    trend_long: TrendDirection;
  };
  trend: {
    short_term: TrendDirection;
    medium_term: TrendDirection;
    long_term: TrendDirection;
    strength: number;
    description: string;
  };
  volume: {
    current: number;
    average: number;
    ratio: number;
    trend: string;
    prediction: string;
    unusual_activity: boolean;
    unusual_reason?: string;
  };
  broker_summary: {
    top_buyers: Array<{
      broker_code: string;
      broker_name?: string;
      net_value: number;
    }>;
    top_sellers: Array<{
      broker_code: string;
      broker_name?: string;
      net_value: number;
    }>;
    foreign_flow: {
      net_value: number;
      flow_trend: TrendDirection;
    };
    accumulation_score: number;
    smart_money_signal?: string;
  };
  signal: {
    action: SignalType;
    confidence: number;
    entry_price?: number;
    stop_loss?: number;
    take_profit?: number;
    risk_reward_ratio?: number;
    reasoning: string[];
  };
  fundamentals?: {
    pe_ratio: number;
    pbv_ratio: number;
    roe: number;
    der: number;
    market_cap: string;
    dividend_yield: number;
  };
  verdict?: {
    rating: 'Buy' | 'Hold' | 'Sell';
    suitability: {
      growth: number;
      value: number;
      dividend: number;
    };
    pros: string[];
    cons: string[];
  };
  qualitative?: {
    business_model: string;
    management_quality: string;
    industry_prospects: string;
    competitive_position: string;
  };
  quantitative?: {
    income_statement: Record<string, string>;
    balance_sheet: Record<string, string>;
    cash_flow: Record<string, string>;
  };
  approach?: {
    methodology: string;
    description: string;
    key_factors: string[];
  };
  last_updated: string;
  data_source: string;
}

/**
 * Get complete market analysis (Priority #1 endpoint)
 */
export async function getMarketAnalysis(ticker: string): Promise<MarketAnalysisResponse | null> {
  if (!await checkBackendHealth()) {
    return null; // Frontend will use local analysis
  }

  try {
    return await apiFetch<MarketAnalysisResponse>(`/api/analyze/${ticker}`);
  } catch (error) {
    console.error('Market analysis failed:', error);
    return null;
  }
}

/**
 * Convert backend response to frontend-compatible format
 */
export function convertToFrontendFormat(analysis: MarketAnalysisResponse): {
  realTimeData: RealTimeMarketData;
  technicals: TechnicalIndicators;
  aiResult: AIAnalysisResult;
} {
  return {
    realTimeData: {
      price: analysis.price.current,
      change: analysis.price.change,
      changePercent: analysis.price.change_percent,
      volume: analysis.price.volume,
      lastUpdated: analysis.price.last_updated,
    },
    technicals: {
      rsi: analysis.technicals.rsi,
      macd: analysis.technicals.macd.line,
      ma50: analysis.technicals.sma50,
      ma200: analysis.technicals.sma200,
      volumeAvg: analysis.volume.average,
      bollingerUpper: analysis.technicals.bollinger.upper,
      bollingerLower: analysis.technicals.bollinger.lower,
      trendShort: analysis.technicals.trend_short,
      trendMedium: analysis.technicals.trend_medium,
      trendLong: analysis.technicals.trend_long,
    },
    aiResult: {
      ticker: analysis.ticker,
      currentPrice: analysis.price.current,
      signal: analysis.signal.action,
      confidence: analysis.signal.confidence,
      summary: analysis.trend.description,
      reasoning: analysis.signal.reasoning,
      supportLevel: analysis.technicals.support[0] || analysis.price.current * 0.95,
      resistanceLevel: analysis.technicals.resistance[0] || analysis.price.current * 1.05,
      lastUpdated: analysis.last_updated,
      fundamentals: analysis.fundamentals ? {
        peRatio: analysis.fundamentals.pe_ratio,
        pbvRatio: analysis.fundamentals.pbv_ratio,
        roe: analysis.fundamentals.roe,
        der: analysis.fundamentals.der,
        marketCap: analysis.fundamentals.market_cap,
        dividendYield: analysis.fundamentals.dividend_yield
      } : undefined,
      verdict: analysis.verdict ? {
        rating: analysis.verdict.rating,
        suitability: analysis.verdict.suitability,
        pros: analysis.verdict.pros,
        cons: analysis.verdict.cons
      } : undefined,
      qualitative: analysis.qualitative ? {
        businessModel: analysis.qualitative.business_model,
        managementQuality: analysis.qualitative.management_quality,
        industryProspects: analysis.qualitative.industry_prospects,
        competitivePosition: analysis.qualitative.competitive_position
      } : undefined,
      quantitative: analysis.quantitative ? {
        incomeStatement: analysis.quantitative.income_statement,
        balanceSheet: analysis.quantitative.balance_sheet,
        cashFlow: analysis.quantitative.cash_flow
      } : undefined,
      approach: analysis.approach ? {
        methodology: analysis.approach.methodology,
        description: analysis.approach.description,
        keyFactors: analysis.approach.key_factors
      } : undefined
    },
  };
}

/**
 * Get technical indicators only
 */
export async function getTechnicalIndicators(ticker: string): Promise<TechnicalIndicators | null> {
  if (!await checkBackendHealth()) {
    return null;
  }

  try {
    const data = await apiFetch<{
      rsi: number;
      macd: { line: number };
      sma50: number;
      sma200: number;
      bollinger: { upper: number; lower: number };
      trend_short: TrendDirection;
      trend_medium: TrendDirection;
      trend_long: TrendDirection;
    }>(`/api/analyze/${ticker}/technicals`);

    return {
      rsi: data.rsi,
      macd: data.macd.line,
      ma50: data.sma50,
      ma200: data.sma200,
      volumeAvg: 0,
      bollingerUpper: data.bollinger.upper,
      bollingerLower: data.bollinger.lower,
      trendShort: data.trend_short,
      trendMedium: data.trend_medium,
      trendLong: data.trend_long,
    };
  } catch {
    return null;
  }
}

/**
 * Get broker summary
 */
export async function getBrokerSummary(ticker: string) {
  if (!await checkBackendHealth()) {
    return null;
  }

  try {
    return await apiFetch(`/api/analyze/${ticker}/broker-summary`);
  } catch {
    return null;
  }
}

// ============================================
// Chart Vision Analysis
// ============================================

/**
 * Analyze chart image using AI Vision
 */
export async function analyzeChartImage(
  imageFile: File,
  tradingType: 'SWING' | 'SCALP'
): Promise<ChartVisionAnalysis | null> {
  if (!await checkBackendHealth()) {
    return null;
  }

  try {
    const formData = new FormData();
    formData.append('file', imageFile);
    formData.append('trading_type', tradingType);

    const response = await fetch(`${API_BASE_URL}/api/analyze/chart`, {
      method: 'POST',
      body: formData,
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Chart analysis failed');
    }

    return await response.json();
  } catch {
    return null;
  }
}

// ============================================
// Predictions
// ============================================

/**
 * Get price prediction
 */
export async function getPricePrediction(ticker: string, timeframe: string = '1W') {
  if (!await checkBackendHealth()) {
    return null;
  }

  try {
    return await apiFetch(`/api/predict/${ticker}/price?timeframe=${timeframe}`);
  } catch {
    return null;
  }
}

/**
 * Get trend prediction
 */
export async function getTrendPrediction(ticker: string, timeframe: string = '1W') {
  if (!await checkBackendHealth()) {
    return null;
  }

  try {
    return await apiFetch(`/api/predict/${ticker}/trend?timeframe=${timeframe}`);
  } catch {
    return null;
  }
}

// ============================================
// Export backend availability checker
// ============================================

export { checkBackendHealth };
export const isBackendAvailable = () => backendAvailable;
