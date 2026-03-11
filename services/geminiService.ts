/**
 * Gemini Service — REFACTORED
 *
 * All AI calls now go through the backend (/api/ai/*) where the Gemini API
 * key is held securely in environment variables.
 *
 * The GEMINI_API_KEY is NOT available in the browser bundle.
 * The public API surface (exports) is 100% identical to the original
 * so all callers (dataProvider.ts, PortfolioRow.tsx, ChartAnalyzer.tsx) work
 * without changes.
 */

import {
  StockDataPoint,
  TechnicalIndicators,
  AIAnalysisResult,
  RealTimeMarketData,
  NewsItem,
  ChartVisionAnalysis,
} from '../types';
import { generateMockStockData } from './marketDataService';

// ---------------------------------------------------------------------------
// Base URL — reads from same env var used by authApi.ts / backendApi.ts
// ---------------------------------------------------------------------------
const API_BASE = import.meta.env.VITE_API_URL || '';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

async function aiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}/api/ai${path}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  });
  if (!res.ok) {
    throw new Error(`AI API error ${res.status}: ${path}`);
  }
  return res.json();
}

async function aiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}/api/ai${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`AI API error ${res.status}: ${path}`);
  }
  return res.json();
}

// ---------------------------------------------------------------------------
// Chart Vision Analysis
// ---------------------------------------------------------------------------

/**
 * Analyse a trading chart image using AI vision (server-side Gemini call).
 *
 * @param base64Image - data URI or raw base64 PNG string
 * @param tradingType - "SWING" | "SCALP"
 */
export const analyzeChartWithVision = async (
  base64Image: string,
  tradingType: 'SWING' | 'SCALP',
): Promise<ChartVisionAnalysis> => {
  // Convert base64 string to a Blob so we can POST as multipart/form-data
  const raw = base64Image.split(',').pop() ?? base64Image;
  const binary = atob(raw);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const blob = new Blob([bytes], { type: 'image/png' });

  const form = new FormData();
  form.append('file', blob, 'chart.png');
  form.append('trading_type', tradingType);

  const res = await fetch(`${API_BASE}/api/ai/chart-vision`, {
    method: 'POST',
    credentials: 'include',
    body: form,
    // Do NOT set Content-Type — browser sets multipart boundary automatically
  });

  if (!res.ok) {
    throw new Error(`Chart vision API error: ${res.status}`);
  }
  return res.json();
};

// ---------------------------------------------------------------------------
// Real-Time Stock Data
// ---------------------------------------------------------------------------

/**
 * Fetch the latest real-time price / change / volume for an IDX stock.
 * Falls back to mock data if the backend is unavailable.
 */
export const getRealTimeStockData = async (ticker: string): Promise<RealTimeMarketData> => {
  try {
    return await aiGet<RealTimeMarketData>(`/realtime-price/${encodeURIComponent(ticker)}`);
  } catch (error) {
    console.warn(`AI realtime price unavailable for ${ticker}, falling back to simulation.`);

    const mockHistory = generateMockStockData(ticker, 1);
    if (mockHistory.length >= 2) {
      const latest = mockHistory[mockHistory.length - 1];
      const prev = mockHistory[mockHistory.length - 2];
      const change = latest.price - prev.price;
      const changePercent = (change / prev.price) * 100;
      return {
        price: latest.price,
        change: parseFloat(change.toFixed(2)),
        changePercent: parseFloat(changePercent.toFixed(2)),
        volume: latest.volume,
        lastUpdated: new Date().toLocaleTimeString(),
      };
    }

    return {
      price: 5000,
      change: 0,
      changePercent: 0,
      volume: 0,
      lastUpdated: new Date().toLocaleTimeString(),
    };
  }
};

// ---------------------------------------------------------------------------
// Stock News
// ---------------------------------------------------------------------------

/**
 * Fetch recent news articles for an IDX stock.
 */
export const fetchStockNews = async (
  ticker: string,
  companyName: string,
): Promise<NewsItem[]> => {
  try {
    const params = new URLSearchParams({ company: companyName });
    return await aiGet<NewsItem[]>(
      `/stock-news/${encodeURIComponent(ticker)}?${params.toString()}`,
    );
  } catch (error) {
    console.warn(`Failed to fetch news for ${ticker}:`, error);
    return [];
  }
};

// ---------------------------------------------------------------------------
// Full Stock Analysis
// ---------------------------------------------------------------------------

/**
 * Run a comprehensive 5-point technical + fundamental Gemini analysis.
 * Returns result in the exact same shape as the original frontend function.
 */
export const analyzeStockWithGemini = async (
  ticker: string,
  history: StockDataPoint[],
  technicals: TechnicalIndicators,
  realTimeData?: RealTimeMarketData,
): Promise<AIAnalysisResult> => {
  const body = {
    ticker,
    history,
    technicals: {
      rsi: technicals.rsi,
      macd: technicals.macd,
      ma50: technicals.ma50,
      ma200: technicals.ma200,
      volumeAvg: technicals.volumeAvg,
      bollingerUpper: technicals.bollingerUpper,
      bollingerLower: technicals.bollingerLower,
      trendShort: technicals.trendShort,
      trendMedium: technicals.trendMedium,
      trendLong: technicals.trendLong,
    },
    real_time_data: realTimeData ?? null,
  };

  const result = await aiPost<AIAnalysisResult>('/analyze-stock', body);

  // Backend already returns the complete AIAnalysisResult shape, including
  // currentPrice and timestamps, so pass through directly.
  return result;
};

// ---------------------------------------------------------------------------
// Analysis History (localStorage — unaffected by proxy migration)
// ---------------------------------------------------------------------------

export const getAnalysisHistory = (ticker: string): AIAnalysisResult[] => {
  const json = localStorage.getItem(`idx_history_${ticker}`);
  return json ? JSON.parse(json) : [];
};
