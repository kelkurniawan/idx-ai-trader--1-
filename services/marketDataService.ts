
import { StockDataPoint, OHLCDataPoint, TechnicalIndicators, TrendDirection, BacktestResult, BacktestStrategy, BacktestTrade, JournalEntry, TradeMarker } from '../types';

// --- Deterministic Random Helper ---
class SeededRNG {
    private seed: number;
    constructor(seed: number) {
        this.seed = seed;
    }
    // Simple Linear Congruential Generator
    next(): number {
        this.seed = (this.seed * 9301 + 49297) % 233280;
        return this.seed / 233280;
    }
}

// Generate a hash code from a string
const stringHash = (str: string): number => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs(hash);
};

// Helper to generate random dates
const getDateStr = (daysBack: number): string => {
    const date = new Date();
    date.setDate(date.getDate() - daysBack);
    return date.toISOString().split('T')[0];
};

// Generates intraday data for '1D' view
export const generateIntradayData = (ticker: string, currentPrice: number, change: number = 0): StockDataPoint[] => {
    const data: StockDataPoint[] = [];
    // Anchor the randomness to the ticker and today's date so it doesn't jitter on reload
    const todayStr = new Date().toISOString().split('T')[0];

    const openPrice = currentPrice - change;
    let price = openPrice;

    // Start at 9:00 AM today
    const now = new Date();
    const startTime = new Date();
    startTime.setHours(9, 0, 0, 0);

    // End at current time or 4:00 PM if market closed
    let endTime = new Date();
    if (now.getHours() >= 16) {
        endTime.setHours(16, 0, 0, 0);
    } else if (now.getHours() < 9) {
        // If before market open, show pre-market or just previous close flat line
        endTime.setHours(9, 0, 0, 0);
    } else {
        endTime = now;
    }

    // Ensure we have at least one point
    if (startTime > endTime) endTime = startTime;

    // Generate minute-by-minute or 5-min interval data
    for (let t = startTime.getTime(); t <= endTime.getTime(); t += 5 * 60 * 1000) {
        const timePoint = new Date(t);
        // Seed specific to ticker + date + time (minute)
        const pointSeed = stringHash(ticker + todayStr + timePoint.getHours() + ':' + timePoint.getMinutes());
        const rng = new SeededRNG(pointSeed);

        // Volatility based on price
        const volatility = price * 0.002;
        const delta = (rng.next() - 0.5) * volatility;
        price += delta;

        data.push({
            date: timePoint.toISOString(),
            price: parseFloat(price.toFixed(0)),
            volume: Math.floor(rng.next() * 50000) + 1000
        });
    }

    // Force the last point to match current price to align with header
    if (data.length > 0) {
        data[data.length - 1].price = currentPrice;
    }

    return data;
};

// Generates a random walk to simulate stock price history.
// If anchorPrice is provided, it generates backwards from that price to ensure continuity with real-time data.
export const generateMockStockData = (ticker: string, days = 365, anchorPrice?: number): StockDataPoint[] => {
    let price = 0;

    if (anchorPrice) {
        price = anchorPrice;
    } else {
        // Fallback seed simulation if no real price found
        const seed = ticker.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        if (ticker === 'BBCA') price = 9000;
        else if (ticker === 'GOTO') price = 60;
        else if (ticker === 'TLKM') price = 3200;
        else price = (seed % 50) * 100 + 500;
    }

    const data: StockDataPoint[] = [];

    // If we have an anchor price, we generate backwards
    if (anchorPrice) {
        let currentSimPrice = anchorPrice;
        for (let i = 0; i <= days; i++) {
            const dateStr = getDateStr(i);
            // Deterministic seed based on Ticker + Date. 
            // This ensures the "change" for a specific date is always the same.
            const dailySeed = stringHash(ticker + dateStr);
            const rng = new SeededRNG(dailySeed);

            data.unshift({
                date: dateStr,
                price: parseFloat(currentSimPrice.toFixed(0)),
                volume: Math.floor(rng.next() * 1000000) + 500000,
            });

            // Reverse volatility for backwards generation
            const volatility = currentSimPrice * 0.02;
            const change = (rng.next() - 0.5) * volatility;
            currentSimPrice -= change; // Subtract change to go back in time
            if (currentSimPrice < 50) currentSimPrice = 50;
        }
    } else {
        // Forward generation (legacy fallback)
        let currentSimPrice = price;
        for (let i = days; i >= 0; i--) {
            const dateStr = getDateStr(i);
            const dailySeed = stringHash(ticker + dateStr);
            const rng = new SeededRNG(dailySeed);

            const volatility = currentSimPrice * 0.02;
            const change = (rng.next() - 0.5) * volatility;
            currentSimPrice += change;
            if (currentSimPrice < 50) currentSimPrice = 50;

            data.push({
                date: dateStr,
                price: parseFloat(currentSimPrice.toFixed(0)),
                volume: Math.floor(rng.next() * 1000000) + 500000,
            });
        }
    }

    return data;
};

// Generates OHLC data from mock stock data for candlestick charts
export const generateMockOHLCData = (ticker: string, days = 365, anchorPrice?: number): OHLCDataPoint[] => {
    const lineData = generateMockStockData(ticker, days, anchorPrice);
    return lineData.map((point) => {
        const ohlcSeed = stringHash(ticker + point.date + 'ohlc');
        const rng = new SeededRNG(ohlcSeed);
        const volatility = point.price * 0.015; // 1.5% daily range around close

        // Generate open as close +/- small deviation
        const openDeviation = (rng.next() - 0.5) * volatility;
        const open = Math.max(50, point.price + openDeviation);

        // High is above both open and close
        const highExtra = rng.next() * volatility * 0.8;
        const high = Math.max(open, point.price) + highExtra;

        // Low is below both open and close
        const lowExtra = rng.next() * volatility * 0.8;
        const low = Math.min(open, point.price) - lowExtra;

        return {
            date: point.date,
            open: parseFloat(open.toFixed(0)),
            high: parseFloat(high.toFixed(0)),
            low: parseFloat(Math.max(50, low).toFixed(0)),
            close: point.price,
            volume: point.volume,
        };
    });
};

// Generates intraday OHLC data for '1D' candlestick view (5-minute candles)
export const generateIntradayOHLCData = (ticker: string, currentPrice: number, change: number = 0): OHLCDataPoint[] => {
    const lineData = generateIntradayData(ticker, currentPrice, change);
    return lineData.map((point) => {
        const ohlcSeed = stringHash(ticker + point.date + 'ohlc_intra');
        const rng = new SeededRNG(ohlcSeed);
        const volatility = point.price * 0.003; // Tighter range for intraday

        const openDeviation = (rng.next() - 0.5) * volatility;
        const open = Math.max(1, point.price + openDeviation);

        const highExtra = rng.next() * volatility * 0.6;
        const high = Math.max(open, point.price) + highExtra;

        const lowExtra = rng.next() * volatility * 0.6;
        const low = Math.min(open, point.price) - lowExtra;

        return {
            date: point.date,
            open: parseFloat(open.toFixed(0)),
            high: parseFloat(high.toFixed(0)),
            low: parseFloat(Math.max(1, low).toFixed(0)),
            close: point.price,
            volume: point.volume,
        };
    });
};

// Generates historical data specifically for a trade review
// It bridges the Entry Price at Entry Date to Exit Price at Exit Date
export const generateTradeReviewData = (trade: JournalEntry): { data: StockDataPoint[], markers: TradeMarker[] } => {
    const startBuf = 15; // Days before entry
    const endBuf = 10;   // Days after exit

    const entryTime = new Date(trade.date).getTime();
    const exitTime = trade.exitDate ? new Date(trade.exitDate).getTime() : new Date().getTime();

    // Normalize to midnight for daily bars
    const dStart = new Date(entryTime - (startBuf * 86400000));
    dStart.setHours(0, 0, 0, 0);
    const dEnd = new Date(exitTime + (endBuf * 86400000));
    dEnd.setHours(0, 0, 0, 0);

    const data: StockDataPoint[] = [];
    const markers: TradeMarker[] = [];

    // Helper to format date for chart
    const toChartDate = (d: Date) => d.toISOString().split('T')[0];

    const totalDays = Math.ceil((dEnd.getTime() - dStart.getTime()) / 86400000);

    // Interpolation Setup
    // Point A: Entry
    const entryIndex = startBuf;
    const entryPrice = trade.entryPrice;

    // Point B: Exit (or Current)
    const tradeDurationDays = Math.ceil((exitTime - entryTime) / 86400000);
    const exitIndex = entryIndex + Math.max(0, tradeDurationDays);
    const exitPrice = trade.exitPrice || trade.entryPrice * (1 + (Math.random() * 0.1 - 0.05)); // Simulated current price if open

    // Generate path
    let currentPrice = entryPrice;
    // Backfill pre-entry
    for (let i = entryIndex - 1; i >= 0; i--) {
        // Reverse walk from entry
        const rng = new SeededRNG(stringHash(trade.id + i));
        const vol = currentPrice * 0.02;
        currentPrice += (rng.next() - 0.5) * vol;
    }
    const startPrice = currentPrice;

    // Forward generation
    currentPrice = startPrice;
    for (let i = 0; i <= totalDays; i++) {
        const currentDate = new Date(dStart.getTime() + (i * 86400000));
        const dateStr = toChartDate(currentDate);
        const rng = new SeededRNG(stringHash(trade.id + dateStr));

        // Determine target and pull
        let target = entryPrice;
        let influence = 0;

        if (i < entryIndex) {
            // Approaching entry
            target = entryPrice;
            influence = i / entryIndex; // Stronger pull as we get closer
        } else if (i >= entryIndex && i <= exitIndex) {
            // Inside trade
            const progress = (i - entryIndex) / (exitIndex - entryIndex || 1);
            // Linear interpolation target
            target = entryPrice + (exitPrice - entryPrice) * progress;
            influence = 0.1; // Weak pull to allow volatility
        } else {
            // After trade
            target = exitPrice;
            influence = 0; // Random walk
        }

        // Random walk with drift towards target
        const volatility = currentPrice * 0.025;
        const drift = (target - currentPrice) * influence;
        const randomMove = (rng.next() - 0.5) * volatility;

        // Force prices at exact markers
        if (i === entryIndex) currentPrice = entryPrice;
        else if (i === exitIndex && trade.exitPrice) currentPrice = exitPrice;
        else currentPrice += randomMove + drift;

        data.push({
            date: dateStr,
            price: parseFloat(currentPrice.toFixed(0)),
            volume: Math.floor(rng.next() * 100000)
        });

        // Add Markers
        if (i === entryIndex) {
            markers.push({
                date: dateStr,
                price: entryPrice,
                label: 'ENTRY',
                color: '#10b981', // Emerald
                type: 'ENTRY'
            });
        }
        if (i === exitIndex && trade.exitPrice) {
            markers.push({
                date: dateStr,
                price: exitPrice,
                label: 'EXIT',
                color: '#ef4444', // Red
                type: 'EXIT'
            });
        }
    }

    return { data, markers };
};

// --- Technical Indicator Calculations ---

// Helper: Calculate EMA (Exponential Moving Average)
const calculateEMA = (prices: number[], period: number): number[] => {
    const k = 2 / (period + 1);
    const emaArr = new Array(prices.length).fill(0);

    if (prices.length < period) return emaArr;

    // Initial SMA for the first point
    let sum = 0;
    for (let i = 0; i < period; i++) {
        sum += prices[i];
    }
    emaArr[period - 1] = sum / period;

    // Calculate EMA for the rest
    for (let i = period; i < prices.length; i++) {
        // EMA_today = (Price_today * k) + (EMA_yesterday * (1-k))
        emaArr[i] = (prices[i] * k) + (emaArr[i - 1] * (1 - k));
    }
    return emaArr;
};

// Helper: Calculate RSI (Relative Strength Index)
const calculateRSI = (prices: number[], period: number = 14): number[] => {
    const rsiArray = new Array(prices.length).fill(50);
    if (prices.length < period + 1) return rsiArray;

    let gains = 0;
    let losses = 0;

    // 1. Initial SMA of gains/losses
    for (let i = 1; i <= period; i++) {
        const change = prices[i] - prices[i - 1];
        if (change > 0) gains += change;
        else losses += Math.abs(change);
    }

    let avgGain = gains / period;
    let avgLoss = losses / period;

    // 2. Wilder's Smoothing for subsequent steps
    for (let i = period + 1; i < prices.length; i++) {
        const change = prices[i] - prices[i - 1];
        const currentGain = change > 0 ? change : 0;
        const currentLoss = change < 0 ? Math.abs(change) : 0;

        avgGain = ((avgGain * (period - 1)) + currentGain) / period;
        avgLoss = ((avgLoss * (period - 1)) + currentLoss) / period;

        if (avgLoss === 0) {
            rsiArray[i] = 100;
        } else {
            const rs = avgGain / avgLoss;
            rsiArray[i] = 100 - (100 / (1 + rs));
        }
    }
    return rsiArray;
};

// Helper: Determine Trend Direction based on Price vs Moving Average
const getTrend = (currentPrice: number, ma: number, tolerance: number = 0.01): TrendDirection => {
    const diff = (currentPrice - ma) / ma;
    if (diff > tolerance) return 'BULLISH';
    if (diff < -tolerance) return 'BEARISH';
    return 'NEUTRAL';
};

export const calculateTechnicals = (data: StockDataPoint[]): TechnicalIndicators => {
    const prices = data.map(d => d.price);
    const currentPrice = prices[prices.length - 1];
    const rsiSeries = calculateRSI(prices, 14);
    const rsi = rsiSeries[rsiSeries.length - 1];

    // 2. MACD (12, 26, 9)
    const ema12 = calculateEMA(prices, 12);
    const ema26 = calculateEMA(prices, 26);

    let currentMacd = 0;
    if (prices.length >= 26) {
        currentMacd = ema12[prices.length - 1] - ema26[prices.length - 1];
    }

    // 3. Moving Averages (Simple)
    const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);
    const ma50 = prices.length >= 50 ? sum(prices.slice(-50)) / 50 : currentPrice;
    const ma200 = prices.length >= 200 ? sum(prices.slice(-200)) / 200 : currentPrice * 0.95;

    // 4. Bollinger Bands (20, 2)
    const bbPeriod = 20;
    let bollingerUpper = currentPrice;
    let bollingerLower = currentPrice;
    let ma20 = currentPrice;

    if (prices.length >= bbPeriod) {
        const slice = prices.slice(-bbPeriod);
        ma20 = sum(slice) / bbPeriod;
        const variance = slice.reduce((acc, val) => acc + Math.pow(val - ma20, 2), 0) / bbPeriod;
        const stdDev = Math.sqrt(variance);
        bollingerUpper = ma20 + (2 * stdDev);
        bollingerLower = ma20 - (2 * stdDev);
    }

    const trendShort = getTrend(currentPrice, ma20, 0.005);
    const trendMedium = getTrend(currentPrice, ma50, 0.01);
    const trendLong = getTrend(currentPrice, ma200, 0.015);

    return {
        rsi: parseFloat(rsi.toFixed(2)),
        macd: parseFloat(currentMacd.toFixed(2)),
        ma50: parseFloat(ma50.toFixed(0)),
        ma200: parseFloat(ma200.toFixed(0)),
        volumeAvg: Math.floor(data.reduce((acc, curr) => acc + curr.volume, 0) / data.length),
        bollingerUpper: parseFloat(bollingerUpper.toFixed(0)),
        bollingerLower: parseFloat(bollingerLower.toFixed(0)),
        trendShort,
        trendMedium,
        trendLong
    };
};

// --- Backtester Logic ---
export const runBacktestSimulation = (
    ticker: string,
    strategy: BacktestStrategy,
    initialCapital: number,
    days: number = 365
): BacktestResult => {
    // 1. Generate Historical Data
    const data = generateMockStockData(ticker, days + 50); // Add buffer for indicators
    const prices = data.map(d => d.price);

    // 2. Pre-calculate Indicators for the whole range
    const rsiSeries = calculateRSI(prices, 14);
    const ma50Series = calculateEMA(prices, 50);
    const ma20Series = calculateEMA(prices, 20);

    let balance = initialCapital;
    let holdings = 0; // Number of shares
    const trades: BacktestTrade[] = [];
    const equityCurve: { date: string; balance: number }[] = [];

    let peakBalance = initialCapital;
    let maxDrawdown = 0;

    // Iterate through data, start after buffer
    for (let i = 50; i < data.length; i++) {
        const today = data[i];
        const price = today.price;
        const date = today.date;

        // Current Indicators
        const currentRSI = rsiSeries[i];
        const currentMA50 = ma50Series[i];
        const currentMA20 = ma20Series[i];

        // Previous Indicators (for crossovers)
        const prevMA50 = ma50Series[i - 1];
        const prevMA20 = ma20Series[i - 1];

        // Strategy Logic
        let signal: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';

        if (strategy === 'SMA_CROSSOVER') {
            // Golden Cross: MA20 crosses above MA50
            if (prevMA20 < prevMA50 && currentMA20 > currentMA50) signal = 'BUY';
            // Death Cross: MA20 crosses below MA50
            else if (prevMA20 > prevMA50 && currentMA20 < currentMA50) signal = 'SELL';
        } else if (strategy === 'RSI_REVERSAL') {
            // Buy oversold, Sell overbought
            if (currentRSI < 30) signal = 'BUY';
            else if (currentRSI > 70) signal = 'SELL';
        } else if (strategy === 'MOMENTUM_AI') {
            // Simplified Momentum logic for "AI" simulation
            // Buy if price > MA50 AND RSI > 50 (Strong Trend)
            // Sell if Price < MA50 OR RSI < 40 (Trend weakness)
            if (price > currentMA50 && currentRSI > 55 && holdings === 0) signal = 'BUY';
            else if ((price < currentMA50 || currentRSI < 40) && holdings > 0) signal = 'SELL';
        }

        // Execute Trade
        if (signal === 'BUY' && holdings === 0) {
            // Buy all in
            holdings = Math.floor(balance / price);
            const cost = holdings * price;
            balance -= cost;

            // Record partial trade (entry only)
            // We'll complete the trade record on exit
        } else if (signal === 'SELL' && holdings > 0) {
            // Sell all
            const revenue = holdings * price;
            const profit = revenue - (trades.length > 0 && trades[trades.length - 1].exitDate === '' ? 0 : 0); // Logic simplified: we need to track entry price properly

            // Find the corresponding entry
            // In this simple simulation, we just assume last action was buy if holdings > 0
            // but we need to track entry price. 
            // Let's optimize: Store entry price in a temp variable
        }

        // --- Simplified Trade Tracking with correct PnL ---
        // (Re-implementing logic loop for cleaner tracking)
    }

    // Re-run loop with clean state tracking
    balance = initialCapital;
    holdings = 0;
    let entryPrice = 0;
    let entryDate = '';

    // Reset equity curve
    equityCurve.length = 0;

    for (let i = 50; i < data.length; i++) {
        const today = data[i];
        const price = today.price;
        const date = today.date;
        const currentRSI = rsiSeries[i];
        const currentMA50 = ma50Series[i];
        const currentMA20 = ma20Series[i];
        const prevMA50 = ma50Series[i - 1];
        const prevMA20 = ma20Series[i - 1];

        let action: 'BUY' | 'SELL' | 'NONE' = 'NONE';

        if (strategy === 'SMA_CROSSOVER') {
            if (holdings === 0 && prevMA20 < prevMA50 && currentMA20 > currentMA50) action = 'BUY';
            else if (holdings > 0 && prevMA20 > prevMA50 && currentMA20 < currentMA50) action = 'SELL';
        } else if (strategy === 'RSI_REVERSAL') {
            if (holdings === 0 && currentRSI < 30) action = 'BUY';
            else if (holdings > 0 && currentRSI > 70) action = 'SELL';
        } else if (strategy === 'MOMENTUM_AI') {
            if (holdings === 0 && price > currentMA50 * 1.01 && currentRSI > 50) action = 'BUY';
            else if (holdings > 0 && (price < currentMA50 || currentRSI < 35)) action = 'SELL';
        }

        if (action === 'BUY') {
            holdings = Math.floor(balance / price);
            const cost = holdings * price;
            balance -= cost;
            entryPrice = price;
            entryDate = date;
        } else if (action === 'SELL') {
            const revenue = holdings * price;
            const pnl = revenue - (holdings * entryPrice);
            const pnlPercent = (pnl / (holdings * entryPrice)) * 100;

            balance += revenue;
            holdings = 0;

            trades.push({
                id: trades.length + 1,
                entryDate,
                entryPrice,
                exitDate: date,
                exitPrice: price,
                pnl,
                pnlPercent,
                type: 'LONG'
            });
        }

        // Update Equity Curve (Mark to Market)
        const currentEquity = balance + (holdings * price);
        equityCurve.push({ date: date, balance: currentEquity });

        // Update Drawdown
        if (currentEquity > peakBalance) peakBalance = currentEquity;
        const drawdown = ((peakBalance - currentEquity) / peakBalance) * 100;
        if (drawdown > maxDrawdown) maxDrawdown = drawdown;
    }

    const finalBalance = equityCurve[equityCurve.length - 1]?.balance || initialCapital;
    const totalReturn = finalBalance - initialCapital;
    const totalReturnPercent = (totalReturn / initialCapital) * 100;
    const winningTrades = trades.filter(t => t.pnl > 0).length;
    const winRate = trades.length > 0 ? (winningTrades / trades.length) * 100 : 0;

    return {
        initialBalance: initialCapital,
        finalBalance,
        totalReturn,
        totalReturnPercent,
        winRate,
        maxDrawdown,
        totalTrades: trades.length,
        trades: trades.reverse(), // Newest first
        equityCurve
    };
};
