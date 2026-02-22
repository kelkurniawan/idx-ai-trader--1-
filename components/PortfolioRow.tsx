
import React, { useEffect, useState } from 'react';
import { getRealTimeStockData } from '../services/geminiService';
import { RealTimeMarketData } from '../types';

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

  return (
    <div className={`bg-white dark:bg-slate-900 border transition-all rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm hover:shadow-md ${isAlert ? 'border-yellow-400 ring-1 ring-yellow-400 bg-yellow-50/10' : 'border-slate-200 dark:border-slate-800'}`}>
      <div className="flex items-center gap-4 w-full sm:w-auto">
        <div className="w-12 h-12 rounded-xl bg-slate-800 dark:bg-slate-700 flex items-center justify-center font-black text-white text-sm shadow-sm">{ticker}</div>
        <div>
            <h3 className="font-black text-slate-800 dark:text-slate-100">{ticker}</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">IDX Market</p>
        </div>
      </div>
      
      <div className="flex-1 flex justify-center sm:justify-end gap-8 w-full sm:w-auto text-center sm:text-right items-center">
        {loading ? <div className="h-10 w-32 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse"></div>
        : data ? <>
            <div>
                <div className="text-xl font-mono font-black text-slate-800 dark:text-slate-100">Rp {data.price.toLocaleString('id-ID')}</div>
                <div className={`text-xs font-bold ${data.change >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                    {data.change >= 0 ? '+' : ''}{data.changePercent}%
                </div>
            </div>
            
            <div className="flex flex-col items-end min-w-[100px]">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Signal Alert</span>
                {isEditing ? (
                    <div className="flex items-center gap-1">
                        <span className="text-xs font-bold text-slate-400">Rp</span>
                        <input 
                            type="number" 
                            className="w-20 px-2 py-1 text-sm font-bold border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white rounded focus:border-indigo-500 outline-none"
                            value={editPrice}
                            onChange={(e) => setEditPrice(e.target.value)}
                            autoFocus
                            onKeyDown={(e) => e.key === 'Enter' && handleSaveTarget()}
                        />
                        <button onClick={handleSaveTarget} className="p-1 bg-emerald-100 text-emerald-600 rounded hover:bg-emerald-200">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        </button>
                    </div>
                ) : (
                    <div onClick={() => { setIsEditing(true); setEditPrice(targetPrice?.toString() || ''); }} className="cursor-pointer group flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800 px-2 py-1 rounded-lg transition-colors">
                        <div className={`text-sm font-mono font-bold ${isAlert ? 'text-yellow-600 animate-pulse' : targetPrice ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-300 dark:text-slate-600'}`}>
                            {targetPrice ? `Rp ${targetPrice.toLocaleString()}` : 'Set Price'}
                        </div>
                        <svg className={`w-4 h-4 ${targetPrice ? 'text-indigo-400' : 'text-slate-300 dark:text-slate-600'} group-hover:text-indigo-600 dark:group-hover:text-indigo-400`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                        </svg>
                    </div>
                )}
            </div>

          </> : <span className="text-xs font-bold text-red-400 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded">Offline</span>}
      </div>
      
      <div className="flex items-center gap-2 w-full sm:w-auto justify-end border-t sm:border-t-0 border-slate-100 dark:border-slate-800 pt-3 sm:pt-0 pl-4 sm:border-l dark:sm:border-slate-800">
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
