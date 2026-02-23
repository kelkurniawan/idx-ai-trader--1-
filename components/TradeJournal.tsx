
import React, { useState, useEffect } from 'react';
import { JournalEntry, SAMPLE_IDX_STOCKS, StockDataPoint, TradeMarker } from '../types';
import Chart from './Chart';
import { generateTradeReviewData } from '../services/marketDataService';

const TradeJournal: React.FC = () => {
    const [entries, setEntries] = useState<JournalEntry[]>([]);
    const [showForm, setShowForm] = useState(false);

    // Review Mode State
    const [reviewTrade, setReviewTrade] = useState<JournalEntry | null>(null);
    const [reviewData, setReviewData] = useState<StockDataPoint[]>([]);
    const [reviewMarkers, setReviewMarkers] = useState<TradeMarker[]>([]);

    // Form State
    const [ticker, setTicker] = useState(SAMPLE_IDX_STOCKS[0].ticker);
    const [date, setDate] = useState(new Date().toISOString().slice(0, 16));
    const [exitDate, setExitDate] = useState('');
    const [type, setType] = useState<'LONG' | 'SHORT'>('LONG');
    const [setup, setSetup] = useState<'SWING' | 'SCALP'>('SWING');
    const [entryPrice, setEntryPrice] = useState<number>(0);
    const [exitPrice, setExitPrice] = useState<number>(0);
    const [stopLoss, setStopLoss] = useState<number>(0);
    const [takeProfit, setTakeProfit] = useState<number>(0);
    const [notes, setNotes] = useState('');

    useEffect(() => {
        const savedEntries = localStorage.getItem('idx_trade_journal');
        if (savedEntries) {
            try {
                setEntries(JSON.parse(savedEntries));
            } catch (e) {
                console.error("Failed to parse journal entries", e);
            }
        }
    }, []);

    // Effect to load review data when a trade is selected
    useEffect(() => {
        if (reviewTrade) {
            const { data, markers } = generateTradeReviewData(reviewTrade);
            setReviewData(data);
            setReviewMarkers(markers);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            setReviewData([]);
            setReviewMarkers([]);
        }
    }, [reviewTrade]);

    const saveEntries = (newEntries: JournalEntry[]) => {
        setEntries(newEntries);
        localStorage.setItem('idx_trade_journal', JSON.stringify(newEntries));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const newEntry: JournalEntry = {
            id: Date.now().toString(),
            ticker,
            date,
            exitDate: exitDate || undefined,
            type,
            setup,
            entryPrice,
            exitPrice: exitPrice > 0 ? exitPrice : undefined,
            stopLoss,
            takeProfit,
            notes,
            status: exitPrice > 0 ? 'CLOSED' : 'OPEN'
        };

        const updatedEntries = [newEntry, ...entries];
        saveEntries(updatedEntries);
        resetForm();
        setShowForm(false);
    };

    const handleDelete = (id: string) => {
        if (window.confirm("Are you sure you want to delete this trade log?")) {
            const updatedEntries = entries.filter(entry => entry.id !== id);
            saveEntries(updatedEntries);
            if (reviewTrade?.id === id) setReviewTrade(null);
        }
    };

    const resetForm = () => {
        setTicker(SAMPLE_IDX_STOCKS[0].ticker);
        setDate(new Date().toISOString().slice(0, 16));
        setExitDate('');
        setEntryPrice(0);
        setExitPrice(0);
        setStopLoss(0);
        setTakeProfit(0);
        setNotes('');
    };

    const calculatePnL = (entry: JournalEntry) => {
        if (!entry.exitPrice) return null;
        const diff = entry.exitPrice - entry.entryPrice;
        const pnl = entry.type === 'LONG' ? diff : -diff;
        const percent = (pnl / entry.entryPrice) * 100;
        return { pnl, percent };
    };

    return (
        <div className="animate-fade-in pb-12">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-8 mb-6 md:mb-8">
                <div className="flex items-center gap-3 md:gap-4">
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-rose-500 rounded-xl md:rounded-2xl flex items-center justify-center text-white shadow-lg shadow-rose-100 flex-shrink-0">
                        <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                    </div>
                    <div>
                        <h2 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">Trade Journal</h2>
                        <p className="text-slate-500 font-medium text-xs md:text-sm">Log your setups and track performance</p>
                    </div>
                </div>
                <button
                    onClick={() => { setShowForm(!showForm); setReviewTrade(null); }}
                    className="w-full md:w-auto px-6 py-3.5 md:py-3 min-h-touch md:min-h-0 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl shadow-lg shadow-indigo-100 transition-all active:scale-95 flex items-center justify-center gap-2 text-sm md:text-base"
                >
                    {showForm ? 'Cancel Entry' : '+ Log New Trade'}
                </button>
            </div>

            {/* Review Chart Section */}
            {reviewTrade && reviewData.length > 0 && (
                <div className="mb-8 bg-slate-900 border border-slate-700 rounded-3xl p-6 shadow-2xl relative overflow-hidden animate-fade-in">
                    <div className="flex justify-between items-center mb-6 relative z-10">
                        <div className="flex items-center gap-3 text-white">
                            <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center font-black shadow-inner border border-slate-700">{reviewTrade.ticker}</div>
                            <div>
                                <h3 className="font-bold">Trade Review</h3>
                                <p className="text-xs text-slate-400">Visualizing {reviewTrade.type} setup</p>
                            </div>
                        </div>
                        <button onClick={() => setReviewTrade(null)} className="p-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>

                    <div className="relative z-10">
                        <Chart data={reviewData} timeFrame="3M" markers={reviewMarkers} />
                    </div>

                    {/* Background Decoration */}
                    <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
                        <svg className="w-64 h-64 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z" /></svg>
                    </div>
                </div>
            )}

            {showForm && (
                <div className="bg-white border border-slate-200 rounded-2xl md:rounded-3xl p-5 md:p-8 shadow-sm mb-8 animate-fade-in">
                    <h3 className="text-base md:text-lg font-black text-slate-800 mb-4 md:mb-6">New Trade Entry</h3>
                    <form onSubmit={handleSubmit} className="space-y-5 md:space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                            <div>
                                <label className="block text-[10px] md:text-xs font-bold text-slate-400 mb-1.5 md:mb-2 uppercase tracking-wider">Asset</label>
                                <select
                                    value={ticker}
                                    onChange={(e) => setTicker(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3.5 md:py-3 px-4 min-h-input text-sm font-black text-slate-800 focus:outline-none focus:border-indigo-500"
                                >
                                    {SAMPLE_IDX_STOCKS.map(s => <option key={s.ticker} value={s.ticker}>{s.ticker}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] md:text-xs font-bold text-slate-400 mb-1.5 md:mb-2 uppercase tracking-wider">Entry Date</label>
                                <input
                                    type="datetime-local"
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3.5 md:py-3 px-4 min-h-input text-xs md:text-sm font-bold text-slate-800 focus:outline-none focus:border-indigo-500"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] md:text-xs font-bold text-slate-400 mb-1.5 md:mb-2 uppercase tracking-wider">Type</label>
                                <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-200">
                                    <button type="button" onClick={() => setType('LONG')} className={`flex-1 py-2.5 md:py-2 rounded-lg text-xs font-black transition-all ${type === 'LONG' ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>LONG</button>
                                    <button type="button" onClick={() => setType('SHORT')} className={`flex-1 py-2.5 md:py-2 rounded-lg text-xs font-black transition-all ${type === 'SHORT' ? 'bg-red-500 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>SHORT</button>
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] md:text-xs font-bold text-slate-400 mb-1.5 md:mb-2 uppercase tracking-wider">Setup</label>
                                <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-200">
                                    <button type="button" onClick={() => setSetup('SWING')} className={`flex-1 py-2.5 md:py-2 rounded-lg text-xs font-black transition-all ${setup === 'SWING' ? 'bg-indigo-500 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>SWING</button>
                                    <button type="button" onClick={() => setSetup('SCALP')} className={`flex-1 py-2.5 md:py-2 rounded-lg text-xs font-black transition-all ${setup === 'SCALP' ? 'bg-violet-500 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>SCALP</button>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                            <div className="col-span-2 sm:col-span-1">
                                <label className="block text-[10px] md:text-xs font-bold text-slate-400 mb-1.5 md:mb-2 uppercase tracking-wider">Entry Price</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] md:text-xs font-bold">Rp</span>
                                    <input type="number" value={entryPrice} onChange={e => setEntryPrice(parseFloat(e.target.value))} className="w-full pl-8 pr-4 py-3.5 md:py-3 min-h-input bg-slate-50 border border-slate-200 rounded-xl text-xs md:text-sm font-black text-slate-800 focus:outline-none focus:border-indigo-500" required />
                                </div>
                            </div>
                            <div className="col-span-2 sm:col-span-1">
                                <label className="block text-[10px] md:text-xs font-bold text-slate-400 mb-1.5 md:mb-2 uppercase tracking-wider">Exit Price (Optional)</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] md:text-xs font-bold">Rp</span>
                                    <input type="number" value={exitPrice} onChange={e => setExitPrice(parseFloat(e.target.value))} className="w-full pl-8 pr-4 py-3.5 md:py-3 min-h-input bg-slate-50 border border-slate-200 rounded-xl text-xs md:text-sm font-black text-slate-800 focus:outline-none focus:border-indigo-500" />
                                </div>
                            </div>
                            {exitPrice > 0 && (
                                <div className="col-span-2 sm:col-span-2 animate-fade-in">
                                    <label className="block text-[10px] md:text-xs font-bold text-slate-400 mb-1.5 md:mb-2 uppercase tracking-wider">Exit Date</label>
                                    <input
                                        type="datetime-local"
                                        value={exitDate}
                                        onChange={(e) => setExitDate(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3.5 md:py-3 min-h-input px-4 text-xs md:text-sm font-bold text-slate-800 focus:outline-none focus:border-indigo-500"
                                        required
                                    />
                                </div>
                            )}
                            <div className="col-span-2 sm:col-span-1">
                                <label className="block text-[10px] md:text-xs font-bold text-slate-400 mb-1.5 md:mb-2 uppercase tracking-wider">Stop Loss</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] md:text-xs font-bold">Rp</span>
                                    <input type="number" value={stopLoss} onChange={e => setStopLoss(parseFloat(e.target.value))} className="w-full pl-8 pr-4 py-3.5 md:py-3 min-h-input bg-slate-50 border border-slate-200 rounded-xl text-xs md:text-sm font-black text-slate-800 focus:outline-none focus:border-indigo-500" required />
                                </div>
                            </div>
                            <div className="col-span-2 sm:col-span-1">
                                <label className="block text-[10px] md:text-xs font-bold text-slate-400 mb-1.5 md:mb-2 uppercase tracking-wider">Take Profit</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] md:text-xs font-bold">Rp</span>
                                    <input type="number" value={takeProfit} onChange={e => setTakeProfit(parseFloat(e.target.value))} className="w-full pl-8 pr-4 py-3.5 md:py-3 min-h-input bg-slate-50 border border-slate-200 rounded-xl text-xs md:text-sm font-black text-slate-800 focus:outline-none focus:border-indigo-500" required />
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-[10px] md:text-xs font-bold text-slate-400 mb-1.5 md:mb-2 uppercase tracking-wider">Notes</label>
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3.5 md:py-3 px-4 min-h-input text-xs md:text-sm font-medium text-slate-800 focus:outline-none focus:border-indigo-500 h-24 resize-none"
                                placeholder="Why did you take this trade? Strategy used?"
                            ></textarea>
                        </div>

                        <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 md:gap-4 pt-4 md:pt-6 border-t border-slate-100">
                            <button type="button" onClick={() => setShowForm(false)} className="px-6 py-3.5 md:py-3 min-h-touch bg-slate-100 sm:bg-transparent text-slate-500 font-bold hover:bg-slate-200 sm:hover:bg-slate-50 rounded-xl transition-all">Cancel</button>
                            <button type="submit" className="w-full sm:w-auto px-8 py-3.5 md:py-3 min-h-touch bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl shadow-lg shadow-indigo-100 transition-all active:scale-95">Save Trade</button>
                        </div>
                    </form>
                </div>
            )}

            <div className="space-y-4">
                {entries.length === 0 ? (
                    <div className="text-center py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-3xl shadow-sm mb-4 mx-auto border border-slate-100">📝</div>
                        <h3 className="text-lg font-black text-slate-800">Your journal is empty</h3>
                        <p className="text-slate-400 text-sm mt-1">Start logging your trades to track your journey.</p>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {entries.map(entry => {
                            const pnl = calculatePnL(entry);
                            const isSelected = reviewTrade?.id === entry.id;
                            return (
                                <div key={entry.id} className={`bg-white border transition-all rounded-2xl p-6 shadow-sm relative group ${isSelected ? 'border-indigo-500 ring-2 ring-indigo-500/20 shadow-xl' : 'border-slate-200 hover:shadow-md'}`}>
                                    <div className="flex flex-col md:flex-row justify-between gap-4 mb-4">
                                        <div className="flex items-start gap-4">
                                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white font-black text-xs shadow-md ${entry.type === 'LONG' ? 'bg-emerald-500' : 'bg-red-500'}`}>
                                                {entry.type}
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-black text-slate-800">{entry.ticker}</h3>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded uppercase">{entry.setup}</span>
                                                    <span className="text-[10px] font-medium text-slate-400">{new Date(entry.date).toLocaleDateString()}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end gap-2">
                                            {entry.status === 'CLOSED' && pnl ? (
                                                <>
                                                    <div className={`text-2xl font-black font-mono ${pnl.pnl >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                                        {pnl.pnl >= 0 ? '+' : ''}Rp {Math.abs(pnl.pnl).toLocaleString()}
                                                    </div>
                                                    <div className={`text-xs font-bold ${pnl.percent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                                        {pnl.percent >= 0 ? '+' : ''}{pnl.percent.toFixed(2)}%
                                                    </div>
                                                </>
                                            ) : (
                                                <span className="inline-block px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-xs font-black uppercase tracking-wider border border-blue-100">Open Trade</span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 py-3 md:py-4 border-t border-b border-slate-50 bg-slate-50/50 rounded-xl px-3 md:px-4">
                                        <div><p className="text-[8px] md:text-[9px] text-slate-400 font-bold uppercase">Entry</p><p className="font-mono font-bold text-slate-700 text-xs md:text-sm">Rp {entry.entryPrice.toLocaleString()}</p></div>
                                        <div><p className="text-[8px] md:text-[9px] text-slate-400 font-bold uppercase">Exit</p><p className="font-mono font-bold text-slate-700 text-xs md:text-sm">{entry.exitPrice ? `Rp ${entry.exitPrice.toLocaleString()}` : '-'}</p></div>
                                        <div><p className="text-[8px] md:text-[9px] text-slate-400 font-bold uppercase">Stop Loss</p><p className="font-mono font-bold text-red-400 text-xs md:text-sm">Rp {entry.stopLoss.toLocaleString()}</p></div>
                                        <div><p className="text-[8px] md:text-[9px] text-slate-400 font-bold uppercase">Take Profit</p><p className="font-mono font-bold text-emerald-400 text-xs md:text-sm">Rp {entry.takeProfit.toLocaleString()}</p></div>
                                    </div>

                                    <div className="flex justify-between items-end mt-4">
                                        {entry.notes ? (
                                            <p className="text-sm text-slate-500 italic flex-1 mr-4 line-clamp-2">"{entry.notes}"</p>
                                        ) : <div className="flex-1"></div>}

                                        <button
                                            onClick={() => setReviewTrade(isSelected ? null : entry)}
                                            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${isSelected ? 'bg-slate-800 text-white shadow-lg' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                                        >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" /></svg>
                                            {isSelected ? 'Close Review' : 'Review Chart'}
                                        </button>
                                    </div>

                                    <button
                                        onClick={() => handleDelete(entry.id)}
                                        className="absolute top-4 right-4 p-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                                        title="Delete Entry"
                                    >
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default TradeJournal;
