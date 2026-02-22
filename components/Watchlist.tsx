
import React, { useState, useEffect } from 'react';
import { PortfolioItem } from '../types';
import PortfolioRow from './PortfolioRow';

interface WatchlistProps {
    onAnalyze: (ticker: string) => void;
}

const Watchlist: React.FC<WatchlistProps> = ({ onAnalyze }) => {
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [newTicker, setNewTicker] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('idx_watchlist');
    if (saved) {
      try { setItems(JSON.parse(saved)); } catch(e) { console.error(e); }
    } else {
        // Default items if empty
        const defaults = [
            { ticker: 'BBCA', addedAt: Date.now() },
            { ticker: 'GOTO', addedAt: Date.now() }
        ];
        setItems(defaults);
        localStorage.setItem('idx_watchlist', JSON.stringify(defaults));
    }
  }, []);

  const saveItems = (newItems: PortfolioItem[]) => {
      setItems(newItems);
      localStorage.setItem('idx_watchlist', JSON.stringify(newItems));
  };

  const handleAdd = (e: React.FormEvent) => {
      e.preventDefault();
      if (!newTicker.trim()) return;
      const ticker = newTicker.trim().toUpperCase();
      if (items.some(i => i.ticker === ticker)) {
          alert('Ticker already in watchlist');
          return;
      }
      const newItem: PortfolioItem = { ticker, addedAt: Date.now() };
      saveItems([newItem, ...items]);
      setNewTicker('');
  };

  const handleRemove = (ticker: string) => {
      saveItems(items.filter(i => i.ticker !== ticker));
  };

  const handleUpdateTarget = (ticker: string, price: number | undefined) => {
      saveItems(items.map(i => i.ticker === ticker ? { ...i, targetPrice: price } : i));
  };

  return (
    <div className="animate-fade-in pb-12">
        <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 bg-slate-800 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-slate-200">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
            </div>
            <div>
                <h2 className="text-3xl font-black text-slate-800 tracking-tight">My Watchlist</h2>
                <p className="text-slate-500 font-medium">Monitor price action and set signal alerts</p>
            </div>
        </div>

        <div className="max-w-4xl">
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm mb-8">
                <form onSubmit={handleAdd} className="flex gap-4">
                    <div className="relative flex-1">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-black text-xs">IDX:</span>
                        <input 
                            type="text" 
                            value={newTicker} 
                            onChange={(e) => setNewTicker(e.target.value)} 
                            placeholder="Add Ticker (e.g. TLKM)" 
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-4 pl-12 pr-4 text-sm font-black text-slate-800 focus:outline-none focus:border-indigo-500 transition-all uppercase"
                        />
                    </div>
                    <button type="submit" className="px-8 bg-slate-800 hover:bg-slate-900 text-white font-black rounded-xl transition-all shadow-lg active:scale-95">
                        Add
                    </button>
                </form>
            </div>

            <div className="space-y-4">
                {items.length === 0 ? (
                    <div className="text-center py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                        <p className="text-slate-400 font-bold">Your watchlist is empty.</p>
                    </div>
                ) : (
                    items.map((item, idx) => (
                        <PortfolioRow 
                            key={item.ticker}
                            ticker={item.ticker}
                            targetPrice={item.targetPrice}
                            onRemove={handleRemove}
                            onAnalyze={onAnalyze}
                            onUpdateTarget={handleUpdateTarget}
                            delay={idx * 200} // Stagger fetch
                        />
                    ))
                )}
            </div>
        </div>
    </div>
  );
};

export default Watchlist;
