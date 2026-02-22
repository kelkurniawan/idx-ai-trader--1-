/**
 * Mock Data Provider
 * 
 * Generates comprehensive, deterministic mock data for all dashboard components.
 * Used exclusively in dev mode (VITE_APP_MODE=mock) to eliminate all network calls.
 * Uses SeededRNG from marketDataService for consistency across reloads.
 */

import {
    StockProfile,
    StockDataPoint,
    TechnicalIndicators,
    AIAnalysisResult,
    RealTimeMarketData,
    NewsItem,
    FundamentalData,
    InvestmentVerdict,
    SignalType,
    OHLCDataPoint,
    QualitativeAnalysis,
    QuantitativeAnalysis,
    AnalysisApproach,
} from '../types';
import {
    generateMockStockData,
    calculateTechnicals,
    generateIntradayData,
    generateMockOHLCData,
    generateIntradayOHLCData,
} from './marketDataService';

// ============================================
// Seeded RNG (matches marketDataService)
// ============================================
class MockRNG {
    private seed: number;
    constructor(seed: string) {
        this.seed = Array.from(seed).reduce((acc, c) => acc + c.charCodeAt(0), 0);
    }
    next(): number {
        this.seed = (this.seed * 16807 + 0) % 2147483647;
        return (this.seed - 1) / 2147483646;
    }
    range(min: number, max: number): number {
        return min + this.next() * (max - min);
    }
    int(min: number, max: number): number {
        return Math.floor(this.range(min, max + 1));
    }
    pick<T>(arr: T[]): T {
        return arr[this.int(0, arr.length - 1)];
    }
}

// ============================================
// Per-Ticker Price Anchors (realistic IDX prices)
// ============================================
const PRICE_ANCHORS: Record<string, number> = {
    BBCA: 9450, BBRI: 5125, BMRI: 6300, BBNI: 5200, BRIS: 2650,
    GOTO: 78, BUKA: 135, ADRO: 2750, TLKM: 3850, ASII: 5575,
};

// ============================================
// Mock Real-Time Market Data
// ============================================
export function getMockRealTimeData(ticker: string): RealTimeMarketData {
    const rng = new MockRNG(`rt-${ticker}`);
    const basePrice = PRICE_ANCHORS[ticker] || 5000;
    const change = Math.round(basePrice * rng.range(-0.03, 0.04));
    const price = basePrice + change;
    const changePercent = parseFloat(((change / basePrice) * 100).toFixed(2));
    return {
        price,
        change,
        changePercent,
        volume: rng.int(5_000_000, 80_000_000),
        lastUpdated: new Date().toLocaleTimeString('id-ID'),
        sources: [
            { title: 'IDX Live Feed', uri: 'https://www.idx.co.id' },
            { title: 'RTI Business', uri: 'https://www.rti.co.id' },
        ],
    };
}

// ============================================
// Mock Fundamentals
// ============================================
export function getMockFundamentals(ticker: string): FundamentalData {
    const rng = new MockRNG(`fund-${ticker}`);
    const sectorMultiplier = ticker.startsWith('BB') || ticker === 'BMRI' ? 1.2 : 1.0;
    return {
        peRatio: parseFloat((rng.range(8, 28) * sectorMultiplier).toFixed(2)),
        pbvRatio: parseFloat(rng.range(0.8, 4.5).toFixed(2)),
        roe: parseFloat(rng.range(6, 25).toFixed(2)),
        der: parseFloat(rng.range(0.3, 2.5).toFixed(2)),
        marketCap: `Rp ${rng.int(15, 600)}T`,
        dividendYield: parseFloat(rng.range(0.5, 6.5).toFixed(2)),
    };
}

// ============================================
// Mock Investment Verdict
// ============================================
export function getMockVerdict(ticker: string): InvestmentVerdict {
    const rng = new MockRNG(`verdict-${ticker}`);
    const ratings: ('Buy' | 'Hold' | 'Sell')[] = ['Buy', 'Hold', 'Sell'];
    const rating = rng.pick(ratings);

    const prosPool = [
        'Strong revenue growth trajectory', 'Dominant market position in sector',
        'Healthy balance sheet with low debt', 'Consistent dividend payments',
        'Expanding digital ecosystem', 'Strong institutional ownership',
        'Government-backed infrastructure support', 'Resilient earnings through cycles',
    ];
    const consPool = [
        'High valuation relative to peers', 'Slowing loan growth',
        'Regulatory headwinds in sector', 'Currency exposure risk (IDR/USD)',
        'Competitive pressure increasing', 'Commodity price sensitivity',
        'Limited international diversification', 'High employee cost ratio',
    ];

    return {
        rating,
        suitability: {
            growth: rng.int(40, 95),
            value: rng.int(30, 90),
            dividend: rng.int(20, 85),
        },
        pros: Array.from({ length: 3 }, () => rng.pick(prosPool)),
        cons: Array.from({ length: 3 }, () => rng.pick(consPool)),
    };
}

// ============================================
// Mock News
// ============================================
export function getMockNews(ticker: string): NewsItem[] {
    const rng = new MockRNG(`news-${ticker}`);
    const sources = ['CNBC Indonesia', 'Bisnis.com', 'Kontan', 'Detik Finance', 'Reuters ID'];
    const templates = [
        { title: `${ticker} Reports Strong Q4 Earnings, Beats Analyst Estimates`, snippet: `The company reported net income growth of ${rng.int(8, 25)}% year-over-year, driven by robust operational performance.` },
        { title: `Analysts Upgrade ${ticker} Price Target Amid Positive Outlook`, snippet: `Several major brokerages have raised their price targets following the company's latest strategic initiatives.` },
        { title: `${ticker} Announces Strategic Digital Transformation Investment`, snippet: `The company has committed Rp ${rng.int(1, 15)} trillion to accelerate its digital transformation roadmap over the next 3 years.` },
        { title: `Foreign Investors Increase Stakes in ${ticker} Shares`, snippet: `Net foreign buying in ${ticker} reached Rp ${rng.int(100, 800)} billion this month, signaling growing international confidence.` },
        { title: `${ticker} Partners with Fintech Startup for Payment Solutions`, snippet: `The collaboration aims to expand financial inclusion across Indonesia's growing digital economy.` },
    ];

    const now = new Date();
    return templates.map((t, i) => ({
        title: t.title,
        source: rng.pick(sources),
        url: `https://finance.example.com/${ticker.toLowerCase()}-news-${i + 1}`,
        snippet: t.snippet,
        publishedAt: new Date(now.getTime() - i * 3600000 * rng.int(2, 24)).toISOString(),
    }));
}

// ============================================
// Mock Qualitative / Quantitative / Approach
// ============================================
function getMockQualitative(ticker: string): QualitativeAnalysis {
    return {
        businessModel: `${ticker} operates a diversified business model with strong recurring revenue streams and significant market share in its core segment.`,
        managementQuality: 'Management team has a proven track record of delivering consistent profitability and strategic capital allocation.',
        industryProspects: 'The Indonesian market continues to show robust growth driven by demographic tailwinds and increasing digital adoption.',
        competitivePosition: `${ticker} holds a dominant position with significant barriers to entry including brand recognition, distribution network, and regulatory licenses.`,
    };
}

function getMockQuantitative(ticker: string): QuantitativeAnalysis {
    const rng = new MockRNG(`quant-${ticker}`);
    return {
        incomeStatement: {
            Revenue: `Rp ${rng.int(20, 150)}T`,
            'Net Income': `Rp ${rng.int(5, 50)}T`,
            'Gross Margin': `${rng.int(25, 65)}%`,
            'Operating Margin': `${rng.int(15, 45)}%`,
        },
        balanceSheet: {
            'Total Assets': `Rp ${rng.int(100, 1800)}T`,
            'Total Equity': `Rp ${rng.int(40, 400)}T`,
            'Total Debt': `Rp ${rng.int(10, 200)}T`,
            'Current Ratio': rng.range(1.1, 2.5).toFixed(2),
        },
        cashFlow: {
            'Operating CF': `Rp ${rng.int(10, 80)}T`,
            'Investing CF': `(Rp ${rng.int(5, 40)}T)`,
            'Free Cash Flow': `Rp ${rng.int(3, 50)}T`,
        },
    };
}

function getMockApproach(): AnalysisApproach {
    return {
        methodology: 'Hybrid Technical-Fundamental Analysis',
        description: 'Analysis combines quantitative technical indicators (RSI, MACD, moving averages) with fundamental valuation metrics and qualitative sector assessment.',
        keyFactors: [
            'Price momentum relative to 50/200 day moving averages',
            'Valuation multiples vs. sector median',
            'Earnings growth trajectory and quality',
            'Macroeconomic tailwinds/headwinds for the sector',
        ],
    };
}

// ============================================
// Mock AI Analysis (complete)
// ============================================
export function getMockAnalysis(ticker: string): AIAnalysisResult {
    const rng = new MockRNG(`analysis-${ticker}`);
    const signals = [SignalType.STRONG_BUY, SignalType.BUY, SignalType.NEUTRAL, SignalType.SELL];
    const signal = rng.pick(signals);
    const basePrice = PRICE_ANCHORS[ticker] || 5000;

    const reasonings = [
        `RSI at ${rng.int(30, 70)} indicates ${signal === SignalType.BUY || signal === SignalType.STRONG_BUY ? 'upward momentum' : 'caution'} in the short term.`,
        `MACD crossover ${signal === SignalType.BUY ? 'confirms bullish' : 'suggests bearish'} trend continuation.`,
        `Price trading ${rng.pick(['above', 'near', 'below'])} the 50-day MA at Rp ${Math.round(basePrice * rng.range(0.95, 1.05)).toLocaleString('id-ID')}.`,
        `Volume ${rng.pick(['increasing', 'stable', 'declining'])} — ${rng.pick(['supports', 'does not confirm'])} the current trend.`,
        `Sector outlook: Indonesia's ${rng.pick(['banking', 'tech', 'energy', 'telecom'])} sector shows ${rng.pick(['robust', 'moderate', 'mixed'])} growth prospects.`,
    ];

    return {
        ticker,
        currentPrice: basePrice,
        signal,
        confidence: rng.int(55, 92),
        summary: `${ticker} shows a ${signal.replace('_', ' ').toLowerCase()} signal with ${rng.pick(['strong', 'moderate', 'mixed'])} technical confirmation. ${rng.pick(['Volume supports the trend.', 'Monitor key support levels closely.', 'Earnings growth remains a positive catalyst.'])}`,
        reasoning: reasonings,
        supportLevel: Math.round(basePrice * rng.range(0.90, 0.97)),
        resistanceLevel: Math.round(basePrice * rng.range(1.03, 1.12)),
        lastUpdated: new Date().toLocaleTimeString('id-ID'),
        timestamp: Date.now(),
        fundamentals: getMockFundamentals(ticker),
        verdict: getMockVerdict(ticker),
        qualitative: getMockQualitative(ticker),
        quantitative: getMockQuantitative(ticker),
        approach: getMockApproach(),
    };
}

// ============================================
// Full Stock Data Bundle (single call)
// ============================================
export interface MockStockBundle {
    realTimeData: RealTimeMarketData;
    fullStockData: StockDataPoint[];
    technicals: TechnicalIndicators;
    analysis: AIAnalysisResult;
    news: NewsItem[];
}

export function getMockStockBundle(ticker: string): MockStockBundle {
    const realTimeData = getMockRealTimeData(ticker);
    const fullStockData = generateMockStockData(ticker, 365, realTimeData.price);
    const technicals = calculateTechnicals(fullStockData);
    const analysis = getMockAnalysis(ticker);
    analysis.currentPrice = realTimeData.price;
    const news = getMockNews(ticker);

    return { realTimeData, fullStockData, technicals, analysis, news };
}
