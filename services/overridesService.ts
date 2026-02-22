/**
 * Manual Overrides Service
 * 
 * Manages manually-entered data overrides for stocks, news, and fundamentals.
 * Data persists in localStorage for the frontend.
 * In production, this would sync with a backend API.
 */

import {
    AIAnalysisResult,
    RealTimeMarketData,
    NewsItem,
    FundamentalData,
    SignalType,
} from '../types';

// ============================================
// Storage Keys
// ============================================
const STORAGE_KEYS = {
    STOCK_OVERRIDES: 'idx_admin_stock_overrides',
    NEWS_OVERRIDES: 'idx_admin_news_overrides',
};

// ============================================
// Types
// ============================================
export interface StockOverride {
    ticker: string;
    name?: string;
    price?: number;
    change?: number;
    changePercent?: number;
    volume?: number;
    signal?: SignalType;
    confidence?: number;
    summary?: string;
    supportLevel?: number;
    resistanceLevel?: number;
    fundamentals?: Partial<FundamentalData>;
    enabled: boolean; // toggle override on/off
    lastUpdated: string;
}

export interface NewsOverride {
    id: string;
    ticker: string;
    title: string;
    source: string;
    url: string;
    snippet: string;
    publishedAt: string;
    enabled: boolean;
}

// ============================================
// Stock Overrides CRUD
// ============================================
export function getStockOverrides(): StockOverride[] {
    try {
        const raw = localStorage.getItem(STORAGE_KEYS.STOCK_OVERRIDES);
        return raw ? JSON.parse(raw) : [];
    } catch { return []; }
}

export function getStockOverride(ticker: string): StockOverride | null {
    const overrides = getStockOverrides();
    return overrides.find(o => o.ticker === ticker && o.enabled) || null;
}

export function saveStockOverride(override: StockOverride): void {
    const overrides = getStockOverrides();
    const idx = overrides.findIndex(o => o.ticker === override.ticker);
    override.lastUpdated = new Date().toISOString();
    if (idx >= 0) {
        overrides[idx] = override;
    } else {
        overrides.push(override);
    }
    localStorage.setItem(STORAGE_KEYS.STOCK_OVERRIDES, JSON.stringify(overrides));
}

export function deleteStockOverride(ticker: string): void {
    const overrides = getStockOverrides().filter(o => o.ticker !== ticker);
    localStorage.setItem(STORAGE_KEYS.STOCK_OVERRIDES, JSON.stringify(overrides));
}

// ============================================
// News Overrides CRUD
// ============================================
export function getNewsOverrides(ticker?: string): NewsOverride[] {
    try {
        const raw = localStorage.getItem(STORAGE_KEYS.NEWS_OVERRIDES);
        const all: NewsOverride[] = raw ? JSON.parse(raw) : [];
        if (ticker) return all.filter(n => n.ticker === ticker && n.enabled);
        return all;
    } catch { return []; }
}

export function saveNewsOverride(item: NewsOverride): void {
    const overrides = getNewsOverrides();
    const idx = overrides.findIndex(o => o.id === item.id);
    if (idx >= 0) {
        overrides[idx] = item;
    } else {
        overrides.push(item);
    }
    localStorage.setItem(STORAGE_KEYS.NEWS_OVERRIDES, JSON.stringify(overrides));
}

export function deleteNewsOverride(id: string): void {
    const overrides = getNewsOverrides().filter(o => o.id !== id);
    localStorage.setItem(STORAGE_KEYS.NEWS_OVERRIDES, JSON.stringify(overrides));
}

// ============================================
// Apply overrides to data bundles
// ============================================
export function applyStockOverrideToRealTime(
    ticker: string,
    base: RealTimeMarketData
): RealTimeMarketData {
    const override = getStockOverride(ticker);
    if (!override) return base;
    return {
        ...base,
        price: override.price ?? base.price,
        change: override.change ?? base.change,
        changePercent: override.changePercent ?? base.changePercent,
        volume: override.volume ?? base.volume,
    };
}

export function applyStockOverrideToAnalysis(
    ticker: string,
    base: AIAnalysisResult
): AIAnalysisResult {
    const override = getStockOverride(ticker);
    if (!override) return base;
    return {
        ...base,
        signal: override.signal ?? base.signal,
        confidence: override.confidence ?? base.confidence,
        summary: override.summary ?? base.summary,
        supportLevel: override.supportLevel ?? base.supportLevel,
        resistanceLevel: override.resistanceLevel ?? base.resistanceLevel,
        fundamentals: override.fundamentals
            ? { ...base.fundamentals!, ...override.fundamentals }
            : base.fundamentals,
    };
}

export function applyNewsOverrides(ticker: string, base: NewsItem[]): NewsItem[] {
    const overrides = getNewsOverrides(ticker);
    if (overrides.length === 0) return base;
    const overrideNews: NewsItem[] = overrides.map(o => ({
        title: o.title,
        source: o.source,
        url: o.url,
        snippet: o.snippet,
        publishedAt: o.publishedAt,
    }));
    return [...overrideNews, ...base];
}

// ============================================
// Bulk Import / Export
// ============================================
export function exportAllOverrides(): string {
    return JSON.stringify({
        stocks: getStockOverrides(),
        news: getNewsOverrides(),
    }, null, 2);
}

export function importOverrides(jsonString: string): { stocks: number; news: number } {
    const data = JSON.parse(jsonString);
    let stockCount = 0;
    let newsCount = 0;

    if (Array.isArray(data.stocks)) {
        data.stocks.forEach((s: StockOverride) => {
            saveStockOverride(s);
            stockCount++;
        });
    }
    if (Array.isArray(data.news)) {
        data.news.forEach((n: NewsOverride) => {
            saveNewsOverride(n);
            newsCount++;
        });
    }
    return { stocks: stockCount, news: newsCount };
}
