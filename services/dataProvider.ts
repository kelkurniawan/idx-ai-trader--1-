/**
 * Unified Data Provider
 * 
 * Single entry point for all data access in the application.
 * Routes to mock data (dev) or live APIs (production) based on VITE_APP_MODE.
 * 
 * In mock mode: returns data synchronously, zero network calls.
 * In live mode: calls backend API / Gemini AI with fallback to mock.
 */

import {
    StockProfile,
    StockDataPoint,
    TechnicalIndicators,
    AIAnalysisResult,
    RealTimeMarketData,
    NewsItem,
} from '../types';
import { getMockStockBundle, getMockRealTimeData, getMockNews, type MockStockBundle } from './mockDataProvider';
import { generateMockStockData, calculateTechnicals } from './marketDataService';
import { getMarketAnalysis, getRealTimePrice, convertToFrontendFormat, checkBackendHealth, getStockHistory } from './backendApi';
import { analyzeStockWithGemini, getRealTimeStockData, fetchStockNews } from './geminiService';
import { applyStockOverrideToRealTime, applyStockOverrideToAnalysis, applyNewsOverrides } from './overridesService';

// ============================================
// Mode Detection
// ============================================
export const IS_MOCK = import.meta.env.VITE_APP_MODE === 'mock';

if (IS_MOCK) {
    console.log('%c[DataProvider] 🧪 MOCK MODE — Zero network calls', 'color: #10b981; font-weight: bold; font-size: 14px;');
} else {
    console.log('%c[DataProvider] 🔴 LIVE MODE — API calls enabled', 'color: #ef4444; font-weight: bold; font-size: 14px;');
}

// ============================================
// Full Stock Analysis (used by handleSelectStock)
// ============================================
export interface StockAnalysisBundle {
    realTimeData: RealTimeMarketData;
    fullStockData: StockDataPoint[];
    technicals: TechnicalIndicators;
    analysis: AIAnalysisResult;
    news: NewsItem[];
}

/**
 * Apply manual overrides to a data bundle.
 * Overrides from the Admin Dashboard take priority over API/mock data.
 */
function applyOverrides(ticker: string, bundle: StockAnalysisBundle): StockAnalysisBundle {
    return {
        ...bundle,
        realTimeData: applyStockOverrideToRealTime(ticker, bundle.realTimeData),
        analysis: bundle.analysis ? applyStockOverrideToAnalysis(ticker, bundle.analysis) : bundle.analysis,
        news: applyNewsOverrides(ticker, bundle.news),
    };
}

/**
 * Load complete stock analysis data.
 * 
 * MOCK MODE: Returns instantly (<1ms), zero network calls.
 * LIVE MODE: Tries backend → fallback to Gemini → fallback to mock.
 * 
 * In both modes, manual overrides from Admin Dashboard are applied last.
 */
export async function loadStockAnalysis(stock: StockProfile): Promise<StockAnalysisBundle> {
    if (IS_MOCK) {
        return applyOverrides(stock.ticker, getMockStockBundle(stock.ticker));
    }

    // LIVE MODE: progressive loading with fallbacks
    const estimatedData = generateMockStockData(stock.ticker, 365);
    const estimatedTechnicals = calculateTechnicals(estimatedData);

    let result: StockAnalysisBundle = {
        realTimeData: getMockRealTimeData(stock.ticker),
        fullStockData: estimatedData,
        technicals: estimatedTechnicals,
        analysis: null as any,
        news: [],
    };

    try {
        const isBackendUp = await checkBackendHealth();

        if (isBackendUp) {
            // Backend available — parallel fetch
            const [analysisData, historyData, newsData] = await Promise.allSettled([
                getMarketAnalysis(stock.ticker),
                getStockHistory(stock.ticker, '1Y'),
                fetchStockNews(stock.ticker, stock.name),
            ]);

            // News
            if (newsData.status === 'fulfilled' && newsData.value.length > 0) {
                result.news = newsData.value;
            }

            // Analysis
            if (analysisData.status === 'fulfilled' && analysisData.value) {
                const formatted = convertToFrontendFormat(analysisData.value);
                result.realTimeData = formatted.realTimeData;
                result.technicals = formatted.technicals;
                result.analysis = formatted.aiResult;
            }

            // History
            if (historyData.status === 'fulfilled' && historyData.value && historyData.value.length > 0) {
                result.fullStockData = historyData.value;
            } else if (result.realTimeData) {
                result.fullStockData = generateMockStockData(stock.ticker, 365, result.realTimeData.price);
            }

            if (result.analysis) return applyOverrides(stock.ticker, result);
        }

        // Fallback to Gemini
        console.log('[DataProvider] Backend unavailable, falling back to Gemini...');

        const [rtResult, newsResult] = await Promise.allSettled([
            getRealTimeStockData(stock.ticker),
            fetchStockNews(stock.ticker, stock.name),
        ]);

        if (rtResult.status === 'fulfilled' && rtResult.value) {
            result.realTimeData = rtResult.value;
            result.fullStockData = generateMockStockData(stock.ticker, 365, rtResult.value.price);
            result.technicals = calculateTechnicals(result.fullStockData);
        }

        if (newsResult.status === 'fulfilled') {
            result.news = newsResult.value;
        }

        const aiResult = await analyzeStockWithGemini(
            stock.ticker,
            result.fullStockData,
            result.technicals,
            result.realTimeData || undefined
        );
        result.analysis = aiResult;

    } catch (err) {
        console.warn('[DataProvider] All live sources failed, using full mock data', err);
        return applyOverrides(stock.ticker, getMockStockBundle(stock.ticker));
    }

    return applyOverrides(stock.ticker, result);
}

// ============================================
// Real-time Price Polling (used by interval)
// ============================================
export async function pollRealTimePrice(ticker: string): Promise<RealTimeMarketData | null> {
    if (IS_MOCK) {
        return getMockRealTimeData(ticker);
    }

    try {
        if (await checkBackendHealth()) {
            const data = await getRealTimePrice(ticker);
            if (data) return data;
        }
        return await getRealTimeStockData(ticker);
    } catch {
        return getMockRealTimeData(ticker);
    }
}
