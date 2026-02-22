
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
    const prompt = `
      Analyze stock ${ticker} (${realTimeData?.price ? 'Current Price: ' + realTimeData.price : ''}) on IDX.
      1. perform a Google Search to find the latest Fundamental Data (PE, PBV, ROE, DER, Market Cap, Dividend Yield).
      2. Analyze technicals: Trend ${technicals.trendLong}, RSI ${technicals.rsi}.
      3. Provide an Investment Verdict: Rating (Buy/Hold/Sell), Suitability scores (0-100) for Growth, Value, Dividend investors.
      4. List Pros and Cons.
      Return JSON matching the schema.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash-exp', // Upgraded model for better reasoning
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
