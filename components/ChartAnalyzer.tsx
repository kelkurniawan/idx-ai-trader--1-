import React, { useState, useRef, useMemo } from 'react';
import { ChartVisionAnalysis, TradeSetup } from '../types';
import { analyzeChartWithVision } from '../services/geminiService';

interface ChartAnalyzerProps {
  type: 'SWING' | 'SCALP';
}

const CANDLESTICK_DEFINITIONS: Record<string, string> = {
  "doji": "Market indecision. Open and close prices are virtually equal.",
  "hammer": "Bullish reversal. Small body at the top with a long lower wick.",
  "inverted hammer": "Bullish reversal. Small body at bottom, long upper wick.",
  "shooting star": "Bearish reversal. Small body at bottom, long upper wick.",
  "hanging man": "Bearish reversal. Small body at top, long lower wick.",
  "bullish engulfing": "Strong bullish signal. Green candle engulfs previous red candle.",
  "bearish engulfing": "Strong bearish signal. Red candle engulfs previous green candle.",
  "morning star": "Bullish 3-candle reversal pattern at downtrend bottom.",
  "evening star": "Bearish 3-candle reversal pattern at uptrend top.",
  "marubozu": "Strong momentum. Candle with no shadows.",
  "harami": "Potential reversal. Small candle inside previous large body.",
  "spinning top": "Indecision. Small body, equal upper/lower shadows.",
  "three white soldiers": "Strong bullish reversal. Three consecutive long green candles.",
  "three black crows": "Strong bearish reversal. Three consecutive long red candles.",
  "piercing line": "Bullish reversal. Green candle closes above midpoint of previous red candle.",
  "dark cloud cover": "Bearish reversal. Red candle closes below midpoint of previous green candle."
};

const getPatternDefinition = (pattern: string) => {
  const lower = pattern.toLowerCase();
  const match = Object.keys(CANDLESTICK_DEFINITIONS).find(k => lower.includes(k));
  return match ? CANDLESTICK_DEFINITIONS[match] : null;
};

const ChartAnalyzer: React.FC<ChartAnalyzerProps> = ({ type }) => {
  const [image, setImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<ChartVisionAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'setup' | 'history'>('setup');
  const [showOverlays, setShowOverlays] = useState(true);

  const [setup, setSetup] = useState<TradeSetup>({
    balance: 10000,
    riskPercent: type === 'SWING' ? 1.0 : 0.5,
    stopLossPoints: type === 'SWING' ? 50 : 10,
    takeProfitPoints: type === 'SWING' ? 150 : 30
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
        setAnalysis(null);
        setError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const startAnalysis = async () => {
    if (!image) return;
    setIsAnalyzing(true);
    setError(null);
    try {
      const result = await analyzeChartWithVision(image, type);
      setAnalysis(result);
      setShowOverlays(true);
    } catch (err: any) {
      console.error("Vision Analysis failed", err);
      let msg = "Unable to analyze chart. Please ensure the image is clear and try again.";

      const errorString = err?.toString() || "";
      const errorMessage = err?.message || "";

      if (errorString.includes('429') || errorMessage.includes('429')) {
        msg = "High traffic detected. Please wait 30 seconds before trying again.";
      } else if (errorMessage.includes('Safety') || errorMessage.includes('blocked')) {
        msg = "The image was flagged by safety filters. Please try a different chart image.";
      } else if (errorMessage.includes('JSON') || errorMessage.includes('Empty')) {
        msg = "The AI couldn't identify a clear chart pattern. Please ensure the image is a clean candlestick chart.";
      }

      setError(msg);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const applyAISuggestions = () => {
    if (!analysis) return;

    const extractNum = (str: string) => {
      const match = str.match(/\d+(\.\d+)?/);
      return match ? parseFloat(match[0]) : null;
    };

    const suggestedSL = extractNum(analysis.stopLoss);
    const suggestedTP = extractNum(analysis.takeProfit);

    if (suggestedSL) setSetup(s => ({ ...s, stopLossPoints: suggestedSL }));
    if (suggestedTP) setSetup(s => ({ ...s, takeProfitPoints: suggestedTP }));
  };

  const calculations = useMemo(() => {
    const riskAmount = (setup.balance * (setup.riskPercent / 100));
    const positionSize = setup.stopLossPoints > 0 ? (riskAmount / setup.stopLossPoints) : 0;
    const rrRatio = setup.stopLossPoints > 0 ? (setup.takeProfitPoints / setup.stopLossPoints) : 0;

    return {
      riskAmount,
      positionSize,
      rrRatio
    };
  }, [setup]);

  const accentColor = type === 'SWING' ? 'indigo' : 'violet';

  return (
    <div className="flex flex-col lg:flex-row gap-8 animate-fade-in pb-12">
      <div className="flex-1 space-y-6">
        <div className="flex items-center gap-4 mb-2">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg ${type === 'SWING' ? 'bg-indigo-600 shadow-indigo-100' : 'bg-violet-600 shadow-violet-100'}`}>
            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d={type === 'SWING' ? "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" : "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"} />
            </svg>
          </div>
          <div>
            <h2 className="text-3xl font-black text-slate-800 tracking-tight">{type === 'SWING' ? 'Swing Vision' : 'Scalp Vision'}</h2>
            <p className="text-slate-500 font-medium">AI-powered pattern recognition for trades</p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden flex flex-col min-h-[300px] md:min-h-[420px]">
          {!image ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 m-4 md:m-6 p-6 md:p-0 rounded-2xl hover:border-indigo-400 hover:bg-indigo-50/20 transition-all cursor-pointer group"
            >
              <input type="file" hidden ref={fileInputRef} onChange={handleImageUpload} accept="image/*" />
              <div className="w-16 h-16 md:w-20 md:h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4 md:mb-6 group-hover:scale-110 transition-transform shadow-inner flex-shrink-0">
                <svg className="w-8 h-8 md:w-10 md:h-10 text-slate-400 group-hover:text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
              </div>
              <h3 className="text-lg md:text-xl font-black text-slate-800 text-center">Drop Chart Image</h3>
              <p className="text-slate-400 font-medium mt-2 text-xs md:text-sm text-center px-4">Upload a clear screenshot of your trading chart</p>
              <button className={`mt-6 md:mt-8 px-8 md:px-10 py-3 md:py-3.5 bg-${accentColor}-600 hover:bg-${accentColor}-700 text-white rounded-xl font-black shadow-lg shadow-${accentColor}-100 transition-all text-sm md:text-base`}>
                Select Chart
              </button>
            </div>
          ) : (
            <div className="p-4 md:p-6 space-y-4 md:space-y-6">
              <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-900 shadow-inner group">
                <img src={image} className="w-full h-auto max-h-[400px] md:max-h-[600px] object-contain mx-auto relative z-10" alt="Chart Preview" />

                {/* Interactive Overlays */}
                {analysis && showOverlays && (
                  <div className="absolute inset-0 z-20 pointer-events-none">
                    {analysis.resistanceLevels.map((l, i) => (
                      <div
                        key={`r-${i}`}
                        style={{ top: `${l.yPos * 100}%` }}
                        className="absolute w-full border-t-2 border-red-500/70 border-dashed flex items-center justify-end"
                      >
                        <span className="bg-red-500/90 text-white text-[8px] md:text-[9px] font-bold px-1.5 py-0.5 rounded-l-md mr-0 backdrop-blur-sm shadow-sm">{l.label} ({l.price})</span>
                      </div>
                    ))}
                    {analysis.supportLevels.map((l, i) => (
                      <div
                        key={`s-${i}`}
                        style={{ top: `${l.yPos * 100}%` }}
                        className="absolute w-full border-t-2 border-emerald-500/70 border-dashed flex items-center justify-end"
                      >
                        <span className="bg-emerald-500/90 text-white text-[8px] md:text-[9px] font-bold px-1.5 py-0.5 rounded-l-md mr-0 backdrop-blur-sm shadow-sm">{l.label} ({l.price})</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="absolute top-2 right-2 md:top-4 md:right-4 flex gap-2 z-30 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                  {analysis && (
                    <button
                      onClick={() => setShowOverlays(!showOverlays)}
                      className="p-1.5 md:p-2 bg-white/90 hover:bg-white text-slate-800 rounded-lg shadow-lg backdrop-blur-md transition-all text-[10px] md:text-xs font-bold"
                    >
                      {showOverlays ? 'Hide Levels' : 'Show Levels'}
                    </button>
                  )}
                  <button
                    onClick={() => setImage(null)}
                    className="p-1.5 md:p-2 bg-white/90 hover:bg-red-500 text-slate-800 hover:text-white rounded-lg shadow-lg backdrop-blur-md transition-all"
                  >
                    <svg className="w-3 h-3 md:w-4 md:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 md:p-4 flex items-center gap-3 animate-fade-in">
                  <div className="bg-red-100 p-2 rounded-lg text-red-600 flex-shrink-0">
                    <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </div>
                  <div>
                    <h4 className="text-xs md:text-sm font-bold text-red-700">Analysis Failed</h4>
                    <p className="text-[10px] md:text-xs text-red-600">{error}</p>
                  </div>
                </div>
              )}

              {!analysis && (
                <button
                  onClick={startAnalysis}
                  disabled={isAnalyzing}
                  className={`w-full py-3 md:py-4 min-h-touch bg-${accentColor}-600 hover:bg-${accentColor}-700 disabled:bg-slate-200 text-white font-black rounded-xl md:rounded-2xl shadow-xl shadow-${accentColor}-100 transition-all flex items-center justify-center gap-2 md:gap-3 text-sm md:text-lg`}
                >
                  {isAnalyzing ? (
                    <>
                      <div className="w-4 h-4 md:w-5 md:h-5 border-2 md:border-3 border-white/30 border-t-white rounded-full animate-spin flex-shrink-0"></div>
                      <span>Gemini is analyzing price action...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5 md:w-6 md:h-6 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                      <span>Analyze Chart Patterns</span>
                    </>
                  )}
                </button>
              )}
            </div>
          )}
        </div>

        {analysis && (
          <div className="bg-white border border-slate-200 rounded-3xl p-5 md:p-8 animate-fade-in shadow-sm relative overflow-hidden border-t-8 border-t-indigo-500">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 md:mb-8 gap-4 sm:gap-0">
              <div className="flex items-center gap-3 md:gap-4">
                <div className="w-12 h-12 md:w-14 md:h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-2xl md:text-3xl border border-indigo-100 shadow-sm flex-shrink-0">🤖</div>
                <div>
                  <h3 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight">AI Vision Insights</h3>
                  <p className="text-slate-400 font-bold uppercase text-[9px] md:text-[10px] tracking-widest mt-0.5 md:mt-1">Pattern Analysis Output</p>
                </div>
              </div>
              <button
                onClick={applyAISuggestions}
                className="w-full sm:w-auto px-4 py-2.5 md:py-2 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-xl text-xs font-black hover:bg-indigo-100 transition-all flex items-center justify-center gap-2 active:scale-95"
              >
                <span>⚡</span> Apply to Calculator
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-10">
              <div className="space-y-6">
                <div>
                  <span className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5 md:mb-2">Detected Trend</span>
                  <p className="text-slate-700 text-lg md:text-xl font-black">{analysis.trend}</p>
                </div>
                <div>
                  <span className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 md:mb-3">Candlestick Formations</span>
                  <div className="flex flex-wrap gap-2">
                    {analysis.candlestickPatterns.map(p => {
                      const def = getPatternDefinition(p);
                      return (
                        <div key={p} className="group relative">
                          <span className={`px-2.5 md:px-3 py-1 md:py-1.5 bg-slate-50 border border-slate-200 text-slate-600 rounded-lg text-[10px] md:text-xs font-bold flex items-center gap-1.5 ${def ? 'cursor-help hover:border-indigo-300 hover:bg-indigo-50 transition-colors' : ''}`}>
                            {p}
                            {def && <svg className="w-3 md:w-3.5 h-3 md:h-3.5 text-slate-400 group-hover:text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                          </span>
                          {def && (
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2.5 md:p-3 bg-slate-800 text-white text-[9px] md:text-[10px] font-medium leading-relaxed rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 pointer-events-none">
                              {def}
                              <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-4 border-transparent border-t-slate-800"></div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                  <div className="p-3 md:p-4 bg-red-50/30 rounded-2xl border border-red-100">
                    <span className="text-[8px] md:text-[9px] font-black text-red-500 uppercase tracking-widest block mb-1.5 md:mb-2">Resistance</span>
                    <ul className="text-[10px] md:text-xs text-red-700 font-bold space-y-1">
                      {analysis.resistanceLevels.slice(0, 3).map((l, i) => <li key={i}>• {l.label || l.price}</li>)}
                    </ul>
                  </div>
                  <div className="p-3 md:p-4 bg-emerald-50/30 rounded-2xl border border-emerald-100">
                    <span className="text-[8px] md:text-[9px] font-black text-emerald-500 uppercase tracking-widest block mb-1.5 md:mb-2">Support</span>
                    <ul className="text-[10px] md:text-xs text-emerald-700 font-bold space-y-1">
                      {analysis.supportLevels.slice(0, 3).map((l, i) => <li key={i}>• {l.label || l.price}</li>)}
                    </ul>
                  </div>
                </div>
              </div>

              <div className="bg-slate-900 rounded-3xl p-5 md:p-6 text-white shadow-2xl space-y-5 md:space-y-6">
                <div className="flex items-center gap-2.5 md:gap-3 border-b border-white/10 pb-3 md:pb-4">
                  <span className="text-lg md:text-xl">🎯</span>
                  <h4 className="font-black text-sm tracking-tight">AI Trade Suggestions</h4>
                </div>

                <div className="space-y-3 md:space-y-4">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-0 text-xs md:text-sm">
                    <span className="text-slate-400 font-medium">Entry Target</span>
                    <span className="text-indigo-400 font-mono font-black">{analysis.entrySuggestion}</span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-0 text-xs md:text-sm">
                    <span className="text-slate-400 font-medium">Stop Loss</span>
                    <span className="text-red-400 font-mono font-black">{analysis.stopLoss}</span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-0 text-xs md:text-sm">
                    <span className="text-slate-400 font-medium">Take Profit</span>
                    <span className="text-emerald-400 font-mono font-black">{analysis.takeProfit}</span>
                  </div>
                </div>
                <div className="pt-3 md:pt-4 border-t border-white/10">
                  <p className="text-[9px] md:text-[10px] text-slate-500 italic leading-relaxed">
                    {analysis.overallStrategy}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="w-full lg:w-[380px] space-y-6">
        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden flex flex-col shadow-sm sticky top-20 md:top-24">
          <div className="flex border-b border-slate-100 bg-slate-50/30">
            <button
              onClick={() => setActiveTab('setup')}
              className={`flex-1 py-3 md:py-4 text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'setup' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-white' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Risk Calculator
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex-1 py-3 md:py-4 text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'history' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-white' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Past Setups
            </button>
          </div>

          {activeTab === 'setup' ? (
            <div className="p-5 md:p-8 space-y-6 md:space-y-8 animate-fade-in">
              <div className="flex items-center gap-2.5 md:gap-3">
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-lg md:text-xl shadow-inner border border-indigo-100 flex-shrink-0">🧮</div>
                <h4 className="text-lg md:text-xl font-black text-slate-800 tracking-tight">Trade Parameters</h4>
              </div>

              <div className="space-y-4 md:space-y-6">
                <div>
                  <label className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 md:mb-2.5 ml-1">Account Balance ($)</label>
                  <div className="relative group">
                    <span className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 text-slate-400 font-black">$</span>
                    <input
                      type="number"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 md:py-4 pl-7 md:pl-8 pr-3 md:pr-4 text-xs md:text-sm font-black text-slate-800 focus:border-indigo-500 focus:bg-white outline-none transition-all"
                      value={setup.balance}
                      onChange={(e) => setSetup({ ...setup, balance: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 md:mb-2.5 ml-1">Risk Per Trade (%)</label>
                  <div className="relative group">
                    <span className="absolute right-3 md:right-4 top-1/2 -translate-y-1/2 text-slate-400 font-black">%</span>
                    <input
                      type="number"
                      step="0.05"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 md:py-4 pl-3 md:pl-4 pr-8 md:pr-10 text-xs md:text-sm font-black text-slate-800 focus:border-indigo-500 focus:bg-white outline-none transition-all"
                      value={setup.riskPercent}
                      onChange={(e) => setSetup({ ...setup, riskPercent: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 md:gap-4">
                  <div>
                    <label className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 md:mb-2.5 ml-1">Stop Loss (Pts)</label>
                    <input
                      type="number"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 md:py-4 px-3 md:px-4 text-xs md:text-sm font-black text-slate-800 focus:border-indigo-500 focus:bg-white outline-none transition-all"
                      value={setup.stopLossPoints}
                      onChange={(e) => setSetup({ ...setup, stopLossPoints: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div>
                    <label className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 md:mb-2.5 ml-1">Take Profit (Pts)</label>
                    <input
                      type="number"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 md:py-4 px-3 md:px-4 text-xs md:text-sm font-black text-slate-800 focus:border-indigo-500 focus:bg-white outline-none transition-all"
                      value={setup.takeProfitPoints}
                      onChange={(e) => setSetup({ ...setup, takeProfitPoints: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-6 md:mt-8 pt-6 md:pt-8 border-t border-slate-100 space-y-4 md:space-y-5">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest">Risk Amount</span>
                  <span className="text-base md:text-lg font-mono text-red-600 font-black">
                    ${calculations.riskAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest">Suggest. Position</span>
                  <div className="text-right">
                    <span className={`text-base md:text-lg font-mono text-${accentColor}-600 font-black block`}>
                      {calculations.positionSize.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Units
                    </span>
                    <span className="text-[8px] md:text-[9px] text-slate-400 font-bold uppercase tracking-tighter">Per point exposure</span>
                  </div>
                </div>
                <div className="flex justify-between items-center p-4 md:p-5 bg-emerald-50 rounded-2xl border border-emerald-100 shadow-sm">
                  <span className="text-[10px] md:text-[11px] font-black text-emerald-700 uppercase tracking-widest">Risk/Reward</span>
                  <span className="text-xl md:text-2xl font-mono text-emerald-600 font-black">1 : {calculations.rrRatio.toFixed(1)}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-6 md:p-8 text-center space-y-3 md:space-y-4 animate-fade-in min-h-[300px] md:min-h-[400px] flex flex-col items-center justify-center">
              <div className="w-12 h-12 md:w-16 md:h-16 bg-slate-50 rounded-full flex items-center justify-center text-2xl md:text-3xl shadow-inner mb-1 md:mb-2 border border-slate-100">📂</div>
              <h4 className="text-base md:text-lg font-black text-slate-800 tracking-tight">No History Found</h4>
              <p className="text-slate-400 text-[10px] md:text-xs font-bold leading-relaxed px-4 md:px-6">Start by analyzing a chart to save your first trade setup.</p>
            </div>
          )}
        </div>

        <div className={`bg-${accentColor}-600 rounded-3xl p-6 md:p-8 text-white relative overflow-hidden shadow-xl shadow-${accentColor}-100`}>
          <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
            <svg className="w-16 h-16 md:w-24 md:h-24" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" /></svg>
          </div>
          <div className="flex items-center gap-2.5 md:gap-3 mb-4 md:mb-6 relative z-10">
            <span className="text-xl md:text-2xl">⚡</span>
            <h4 className="text-base md:text-lg font-black tracking-tight">{type === 'SWING' ? 'Swing Pro Tip' : 'Scalping Tip'}</h4>
          </div>
          <p className="text-white/80 text-xs md:text-sm font-medium leading-relaxed relative z-10 mb-2 md:mb-4">
            {type === 'SWING' ?
              "Look for structural breaks on the 4H timeframe after a daily rejection." :
              "Scalping requires ultra-tight risk. Never trade without a hard stop-loss."}
          </p>
        </div>
      </div>
    </div>
  );
};

export default ChartAnalyzer;