import React, { useEffect, useState } from 'react';
import { getRealTimeStockData } from '../services/geminiService';
import { RealTimeMarketData, SAMPLE_IDX_STOCKS, IDX_SECTORS, IDX_STOCK_INDICES } from '../types';

interface PortfolioRowProps {
  ticker: string;
  onRemove: (ticker: string) => void;
  onAnalyze: (ticker: string) => void;
  onUpdateTarget: (ticker: string, price: number | undefined) => void;
  targetPrice?: number;
  delay?: number;
}

const PortfolioRow: React.FC<PortfolioRowProps> = ({ ticker, onRemove, onAnalyze, onUpdateTarget, targetPrice, delay = 0 }) => {
  const [data, setData] = useState<RealTimeMarketData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editPrice, setEditPrice] = useState(targetPrice?.toString() || '');

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      if (delay > 0) await new Promise(r => setTimeout(r, delay));

      try {
        const result = await getRealTimeStockData(ticker);
        if (isMounted) {
          setData(result);
          setLoading(false);
        }
      } catch (error) {
        // We warn instead of error to avoid console clutter, as retry logic handles critical failures
        console.warn(`PortfolioRow: Could not fetch data for ${ticker}`);
        if (isMounted) setLoading(false);
      }
    };
    fetchData();
    // Poll every minute
    const interval = setInterval(fetchData, 60000);
    return () => { isMounted = false; clearInterval(interval); };
  }, [ticker, delay]);

  const handleSaveTarget = () => {
    const val = parseFloat(editPrice);
    onUpdateTarget(ticker, isNaN(val) ? undefined : val);
    setIsEditing(false);
  };

  const isAlert = data && targetPrice && data.price >= targetPrice;
  const profile = SAMPLE_IDX_STOCKS.find(s => s.ticker === ticker);

  return (
    <div className={`bg-white dark:bg-slate-900 border transition-all rounded-2xl p-4 md:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm hover:shadow-md ${isAlert ? 'border-yellow-400 ring-1 ring-yellow-400 bg-yellow-50/10' : 'border-slate-200 dark:border-slate-800'}`}>
      <div className="flex items-center gap-3 md:gap-4 w-full md:w-auto">
        <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-slate-800 dark:bg-slate-700 flex items-center justify-center font-black text-white text-xs md:text-sm shadow-sm flex-shrink-0">{ticker}</div>
        <div className="flex flex-col gap-1 md:gap-1.5 min-w-0 flex-1">
          <div>
            <h3 className="font-black text-slate-800 dark:text-slate-100 leading-tight truncate text-sm md:text-base">{ticker}</h3>
            <p className="text-[9px] md:text-[10px] font-bold text-slate-400 truncate">{profile?.name || 'IDX Market'}</p>
          </div>

          {(profile?.sector || IDX_STOCK_INDICES.some(idx => (idx.tickers as readonly string[]).includes(ticker))) && (
            <div className="flex flex-wrap items-center gap-1 md:gap-1.5">
              {profile?.sector && profile.sector !== 'Unknown' && (
                <div className="flex items-center gap-1 px-1.5 md:px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 text-[8px] md:text-[9px] font-bold border border-indigo-100 dark:border-indigo-900/40 truncate max-w-[100px] md:max-w-none">
                  <span className="flex-shrink-0">{IDX_SECTORS.find(s => s.id === profile.sector)?.icon || '📁'}</span>
                  <span className="truncate">#{profile.sector}</span>
                </div>
              )}
              {IDX_STOCK_INDICES.filter(idx => (idx.tickers as readonly string[]).includes(ticker)).map(idx => (
                <div key={idx.id} className="flex items-center gap-1 px-1.5 md:px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-900/15 text-amber-700 dark:text-amber-400 text-[8px] md:text-[9px] font-bold border border-amber-100 dark:border-amber-900/40 truncate max-w-[80px] md:max-w-none">
                  <span className="flex-shrink-0">{idx.icon}</span>
                  <span className="truncate">{idx.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 flex justify-between md:justify-end gap-4 md:gap-8 w-full md:w-auto text-left md:text-right items-center">
        {loading ? <div className="h-10 w-32 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse"></div>
          : data ? <>
            <div>
              <div className="text-lg md:text-xl font-mono font-black text-slate-800 dark:text-slate-100">Rp {data.price.toLocaleString('id-ID')}</div>
              <div className={`text-[10px] md:text-xs font-bold ${data.change >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                {data.change >= 0 ? '+' : ''}{data.changePercent}%
              </div>
            </div>

            <div className="flex flex-col items-end min-w-[100px]">
              <span className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5 md:mb-1">Signal Alert</span>
              {isEditing ? (
                <div className="flex items-center gap-1 w-full justify-end">
                  <span className="text-[10px] md:text-xs font-bold text-slate-400">Rp</span>
                  <input
                    type="number"
                    className="w-16 md:w-20 px-2 py-1 md:py-1.5 min-h-touch md:min-h-0 text-xs md:text-sm font-bold border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white rounded focus:border-indigo-500 outline-none"
                    value={editPrice}
                    onChange={(e) => setEditPrice(e.target.value)}
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveTarget()}
                  />
                  <button onClick={handleSaveTarget} className="p-1.5 md:p-1 min-h-touch md:min-h-0 min-w-touch md:min-w-0 flex items-center justify-center bg-emerald-100 text-emerald-600 rounded hover:bg-emerald-200 active:scale-95 transition-transform">
                    <svg className="w-4 h-4 md:w-4 md:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                  </button>
                </div>
              ) : (
                <div onClick={() => { setIsEditing(true); setEditPrice(targetPrice?.toString() || ''); }} className="cursor-pointer group flex items-center gap-1.5 md:gap-2 hover:bg-slate-50 dark:hover:bg-slate-800 px-2 py-1 md:py-1.5 min-h-touch md:min-h-0 justify-end w-full rounded-lg transition-colors">
                  <div className={`text-xs md:text-sm font-mono font-bold ${isAlert ? 'text-yellow-600 animate-pulse' : targetPrice ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-300 dark:text-slate-600'}`}>
                    {targetPrice ? `Rp ${targetPrice.toLocaleString()}` : 'Set Price'}
                  </div>
                  <svg className={`w-3.5 h-3.5 md:w-4 md:h-4 flex-shrink-0 ${targetPrice ? 'text-indigo-400' : 'text-slate-300 dark:text-slate-600'} group-hover:text-indigo-600 dark:group-hover:text-indigo-400`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                </div>
              )}
            </div>

          </> : <span className="text-xs font-bold text-red-400 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded">Offline</span>}
      </div>

      <div className="flex items-center gap-2 w-full md:w-auto justify-end border-t md:border-t-0 border-slate-100 dark:border-slate-800 pt-3 md:pt-0 pl-0 md:pl-4 md:border-l dark:md:border-slate-800">
        <button onClick={() => onAnalyze(ticker)} className="p-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-xl transition-colors" title="Analyze">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
        </button>
        <button onClick={() => onRemove(ticker)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors" title="Remove">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
        </button>
      </div>
    </div>
  );
};

export default PortfolioRow;
