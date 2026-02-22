
import { GoogleGenAI, Type } from "@google/genai";
import { StockDataPoint, TechnicalIndicators, AIAnalysisResult, SignalType, RealTimeMarketData, NewsItem, ChartVisionAnalysis } from '../types';
import { generateMockStockData } from './marketDataService';

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key not found in environment variables");
  }
  return new GoogleGenAI({ apiKey });
};

// --- Rate Limiting & Retry Logic ---

async function fetchWithRetry<T>(fn: () => Promise<T>, retries = 1, delay = 2000): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    const isRateLimit = error?.message?.includes('429') || error?.status === 429 || error?.code === 429;
    if (isRateLimit && retries > 0) {
      console.warn(`Rate limit hit. Retrying in ${delay}ms... (${retries} retries left)`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return fetchWithRetry(fn, retries - 1, delay * 2);
    }
    throw error;
  }
}

// --- Chart Vision Analysis ---
export const analyzeChartWithVision = async (base64Image: string, tradingType: 'SWING' | 'SCALP'): Promise<ChartVisionAnalysis> => {
  return fetchWithRetry(async () => {
    const ai = getClient();
    const prompt = `
      Act as a professional technical analyst. Analyze this trading chart for a ${tradingType} setup.
      1. Identify the primary market trend.
      2. Detect specific candlestick patterns.
      3. Identify key Support and Resistance levels. 
      CRITICAL: For each support and resistance level, estimate its vertical position (yPos) on the image where 0 is the very top and 1 is the very bottom. This is used to draw lines over the image.
      4. Suggest precise Entry, Stop Loss, and Take Profit levels.
      Return JSON.
    `;

    const imagePart = {
      inlineData: {
        mimeType: 'image/png',
        data: base64Image.split(',')[1],
      },
    };

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [{ parts: [imagePart, { text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            trend: { type: Type.STRING },
            candlestickPatterns: { type: Type.ARRAY, items: { type: Type.STRING } },
            supportLevels: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  price: { type: Type.STRING },
                  yPos: { type: Type.NUMBER },
                  label: { type: Type.STRING }
                },
                required: ["price", "yPos"]
              }
            },
            resistanceLevels: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  price: { type: Type.STRING },
                  yPos: { type: Type.NUMBER },
                  label: { type: Type.STRING }
                },
                required: ["price", "yPos"]
              }
            },
            entrySuggestion: { type: Type.STRING },
            stopLoss: { type: Type.STRING },
            takeProfit: { type: Type.STRING },
            overallStrategy: { type: Type.STRING }
          },
          required: ["trend", "candlestickPatterns", "supportLevels", "resistanceLevels", "overallStrategy"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("Empty response from AI Vision");
    return JSON.parse(text);
  });
};

export const getRealTimeStockData = async (ticker: string): Promise<RealTimeMarketData> => {
  try {
    return await fetchWithRetry(async () => {
      const ai = getClient();
      const prompt = `Find the latest real-time stock price (IDR), today's change amount, change percentage, and volume for "${ticker}" on the Indonesia Stock Exchange (IDX). Return JSON.`;
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: { price: { type: Type.NUMBER }, change: { type: Type.NUMBER }, changePercent: { type: Type.NUMBER }, volume: { type: Type.NUMBER } },
            required: ["price"]
          }
        }
      });
      const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks?.filter(c => c.web?.uri && c.web?.title).map(c => ({ title: c.web!.title!, uri: c.web!.uri! })) || [];
      let data = { price: 0, change: 0, changePercent: 0, volume: 0 };
      try {
        const jsonText = response.text;
        if (jsonText) { data = { ...data, ...JSON.parse(jsonText) }; }
      } catch (e) { console.warn("Failed to parse JSON", e); }
      return { price: data.price || 0, change: data.change || 0, changePercent: data.changePercent || 0, volume: data.volume || 0, lastUpdated: new Date().toLocaleTimeString(), sources: sources.length > 0 ? sources : undefined };
    }, 1, 1000); // Reduced retries/delay to fail faster to fallback
  } catch (error) {
    console.warn(`Gemini API unavailable for ${ticker}, falling back to simulation.`);

    // Fallback: Generate mock data using the service
    // We ask for 1 day of history, which usually gives us [yesterday, today]
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
        lastUpdated: new Date().toLocaleTimeString()
      };
    }

    // Fallback if generator fails (rare)
    return {
      price: 5000,
      change: 0,
      changePercent: 0,
      volume: 0,
      lastUpdated: new Date().toLocaleTimeString()
    };
  }
};

export const fetchStockNews = async (ticker: string, companyName: string): Promise<NewsItem[]> => {
  try {
    return await fetchWithRetry(async () => {
      const ai = getClient();
      const prompt = `Find the 5 most recent and relevant news articles about the stock "${ticker}" (${companyName}) on IDX. Return JSON array.`;
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { tools: [{ googleSearch: {} }], responseMimeType: "application/json", responseSchema: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, source: { type: Type.STRING }, url: { type: Type.STRING }, snippet: { type: Type.STRING }, publishedAt: { type: Type.STRING } }, required: ["title", "source", "url", "snippet"] } } }
      });
      try { const jsonText = response.text; if (jsonText) return JSON.parse(jsonText); } catch (e) { console.warn(e); }
      return [];
    }, 1, 1000);
  } catch (error) {
    console.warn(`Failed to fetch news for ${ticker}`, error);
    return [];
  }
};

export const analyzeStockWithGemini = async (ticker: string, history: StockDataPoint[], technicals: TechnicalIndicators, realTimeData?: RealTimeMarketData): Promise<AIAnalysisResult> => {
  return fetchWithRetry(async () => {
    const ai = getClient();

    // --- Resolve stock metadata for the prompt ---
    const { SAMPLE_IDX_STOCKS, IDX_STOCK_INDICES } = await import('../types');
    const stockProfile = SAMPLE_IDX_STOCKS.find(s => s.ticker === ticker);
    const sector = stockProfile?.sector || 'Unknown';
    const subsector = stockProfile?.subsector || '';
    const companyName = stockProfile?.name || ticker;
    const memberOf = IDX_STOCK_INDICES
      .filter(idx => (idx.tickers as readonly string[]).includes(ticker))
      .map(idx => idx.label);
    const indexStr = memberOf.length > 0 ? memberOf.join(', ') : 'None';

    // --- Derive indicator summaries from technicals ---
    const rsiValue = technicals.rsi?.toFixed(1) || 'N/A';
    const rsiStatus = technicals.rsi > 70 ? 'Overbought' : technicals.rsi < 30 ? 'Oversold' : 'Neutral';
    const macdStatus = (technicals.macd ?? 0) > 0 ? 'Bullish (histogram positive)' : 'Bearish (histogram negative)';
    const currentPrice = realTimeData?.price || history[history.length - 1]?.price || 0;
    const ma50 = technicals.ma50?.toFixed(0) || 'N/A';
    const priceVsMa = currentPrice > (technicals.ma50 || 0) ? 'above' : 'below';
    const volumeStatus = (realTimeData?.volume || history[history.length - 1]?.volume || 0) > (technicals.volumeAvg || 1) ? 'Above average (confirming)' : 'Below average (weak confirmation)';

    const prompt = `
You are an elite, highly accurate quantitative financial analyst AI specializing in the Indonesian Stock Exchange (IDX).

CRITICAL DIRECTIVES:
1. LOGICAL CONSISTENCY: Your final recommendation (signal) MUST perfectly align with the underlying technical indicators. Do NOT issue a "Buy" signal if MACD or Volume is bearish. Do NOT issue "Sell" if RSI and MACD are bullish.
2. FACTUAL ACCURACY: This stock's official IDX-IC sector is "${sector}"${subsector ? ` (subsector: ${subsector})` : ''}. Index membership: ${indexStr}. Never hallucinate sectors or indices.
3. CHAIN OF THOUGHT: Internally analyze the exact relationship between price, moving averages, and momentum indicators before generating the final output.

INPUT DATA:
Ticker: ${ticker} (${companyName})
Sector: ${sector}
Index Membership: ${indexStr}
Current Price: Rp ${currentPrice.toLocaleString('id-ID')}
RSI (14): ${rsiValue} (${rsiStatus})
MACD: ${macdStatus}
50-Day MA: Rp ${ma50} (price is ${priceVsMa} the MA)
Volume: ${volumeStatus}
Long-term Trend: ${technicals.trendLong || 'N/A'}

TASKS:
1. Perform a Google Search to find the latest Fundamental Data (PE, PBV, ROE, DER, Market Cap, Dividend Yield) for ${ticker} on IDX.
2. Generate a synthesized 5-point analysis:
   - Point 1: RSI Insight — what the current momentum means for price action
   - Point 2: MACD Insight — trend direction and crossover signal
   - Point 3: Moving Average Insight — price relative to the 50-day MA
   - Point 4: Volume Insight — does volume confirm or reject the current trend?
   - Point 5: Sector Outlook — factual insight about the ${sector} sector in Indonesia's current macro environment
3. Write a cohesive summary headline (1 sentence) that is logically supported by all 5 points. Include clear support/resistance levels.
4. Provide an Investment Verdict: Rating (Buy/Hold/Sell), Suitability scores (0-100) for Growth, Value, Dividend investors.
5. List Pros and Cons.

Put the 5-point analysis into the "reasoning" array. Put the headline into "summary".
Return JSON matching the schema.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash-exp',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            signal: { type: Type.STRING, enum: Object.values(SignalType) },
            confidence: { type: Type.INTEGER },
            summary: { type: Type.STRING },
            reasoning: { type: Type.ARRAY, items: { type: Type.STRING } },
            supportLevel: { type: Type.NUMBER },
            resistanceLevel: { type: Type.NUMBER },
            fundamentals: {
              type: Type.OBJECT,
              properties: {
                peRatio: { type: Type.NUMBER },
                pbvRatio: { type: Type.NUMBER },
                roe: { type: Type.NUMBER },
                der: { type: Type.NUMBER },
                marketCap: { type: Type.STRING },
                dividendYield: { type: Type.NUMBER }
              },
              required: ["peRatio", "pbvRatio", "roe", "der", "marketCap", "dividendYield"]
            },
            verdict: {
              type: Type.OBJECT,
              properties: {
                rating: { type: Type.STRING, enum: ["Buy", "Hold", "Sell"] },
                suitability: {
                  type: Type.OBJECT,
                  properties: {
                    growth: { type: Type.NUMBER },
                    value: { type: Type.NUMBER },
                    dividend: { type: Type.NUMBER }
                  },
                  required: ["growth", "value", "dividend"]
                },
                pros: { type: Type.ARRAY, items: { type: Type.STRING } },
                cons: { type: Type.ARRAY, items: { type: Type.STRING } }
              },
              required: ["rating", "suitability", "pros", "cons"]
            }
          },
          required: ["signal", "confidence", "summary", "reasoning", "supportLevel", "resistanceLevel", "fundamentals", "verdict"]
        }
      }
    });

    const parsed = JSON.parse(response.text || '{}');
    return {
      ticker,
      currentPrice: realTimeData?.price || 0,
      lastUpdated: new Date().toLocaleTimeString(),
      timestamp: Date.now(),
      ...parsed
    };
  }, 1, 2000);
};

export const getAnalysisHistory = (ticker: string): AIAnalysisResult[] => {
  const json = localStorage.getItem(`idx_history_${ticker}`);
  return json ? JSON.parse(json) : [];
};
