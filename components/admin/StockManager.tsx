import React, { useState, useEffect } from 'react';
import { SignalType, SAMPLE_IDX_STOCKS } from '../../types';
import {
    getStockOverrides,
    saveStockOverride,
    deleteStockOverride,
    type StockOverride,
} from '../../services/overridesService';

const SIGNAL_OPTIONS = Object.values(SignalType);
const SIGNAL_COLORS: Record<string, string> = {
    STRONG_BUY: 'bg-emerald-500',
    BUY: 'bg-green-400',
    NEUTRAL: 'bg-amber-400',
    SELL: 'bg-orange-500',
    STRONG_SELL: 'bg-red-500',
};

const StockManager: React.FC = () => {
    const [overrides, setOverrides] = useState<StockOverride[]>([]);
    const [editTicker, setEditTicker] = useState<string | null>(null);
    const [form, setForm] = useState<Partial<StockOverride>>({});
    const [showAdd, setShowAdd] = useState(false);

    useEffect(() => {
        setOverrides(getStockOverrides());
    }, []);

    const reload = () => setOverrides(getStockOverrides());

    const handleEdit = (override: StockOverride) => {
        setEditTicker(override.ticker);
        setForm({ ...override });
        setShowAdd(false);
    };

    const handleAddNew = () => {
        setEditTicker(null);
        setForm({ enabled: true, ticker: '' });
        setShowAdd(true);
    };

    const handleSave = () => {
        if (!form.ticker) return;
        const override: StockOverride = {
            ticker: form.ticker!.toUpperCase(),
            name: form.name,
            price: form.price,
            change: form.change,
            changePercent: form.changePercent,
            volume: form.volume,
            signal: form.signal as SignalType | undefined,
            confidence: form.confidence,
            summary: form.summary,
            supportLevel: form.supportLevel,
            resistanceLevel: form.resistanceLevel,
            fundamentals: form.fundamentals,
            enabled: form.enabled ?? true,
            lastUpdated: new Date().toISOString(),
        };
        saveStockOverride(override);
        reload();
        setEditTicker(null);
        setShowAdd(false);
        setForm({});
    };

    const handleDelete = (ticker: string) => {
        if (confirm(`Delete override for ${ticker}?`)) {
            deleteStockOverride(ticker);
            reload();
        }
    };

    const handleToggle = (override: StockOverride) => {
        saveStockOverride({ ...override, enabled: !override.enabled });
        reload();
    };

    const updateField = (key: string, value: any) => {
        setForm(prev => ({ ...prev, [key]: value }));
    };

    const updateFundamental = (key: string, value: any) => {
        setForm(prev => ({
            ...prev,
            fundamentals: { ...(prev.fundamentals || {}), [key]: value },
        }));
    };

    const isEditing = editTicker !== null || showAdd;

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-0">
                <div>
                    <h2 className="text-xl md:text-2xl font-black tracking-tight">Stock Overrides</h2>
                    <p className="text-xs md:text-sm text-slate-400 mt-1">
                        Manually set prices, signals, etc. Overrides take priority over API data.
                    </p>
                </div>
                {!isEditing && (
                    <button
                        onClick={handleAddNew}
                        className="w-full sm:w-auto flex justify-center items-center gap-2 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white min-h-touch px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-indigo-100 dark:shadow-none hover:from-indigo-600 hover:to-indigo-700 transition-all active:scale-95"
                    >
                        <span className="text-lg">+</span> Add Override
                    </button>
                )}
            </div>

            {/* Edit / Add Form */}
            {isEditing && (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl md:rounded-3xl p-5 md:p-6 shadow-sm">
                    <h3 className="text-base md:text-lg font-black mb-5 md:mb-6 flex items-center gap-2">
                        <span className="text-xl">{showAdd ? '➕' : '✏️'}</span>
                        {showAdd ? 'New Override' : `Editing ${editTicker}`}
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {/* Ticker */}
                        {showAdd && (
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Ticker</label>
                                <select
                                    value={form.ticker || ''}
                                    onChange={e => updateField('ticker', e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                                >
                                    <option value="">Select ticker...</option>
                                    {SAMPLE_IDX_STOCKS.map(s => (
                                        <option key={s.ticker} value={s.ticker}>{s.ticker} — {s.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* Price */}
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Price (Rp)</label>
                            <input
                                type="number"
                                value={form.price ?? ''}
                                onChange={e => updateField('price', e.target.value ? Number(e.target.value) : undefined)}
                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                                placeholder="e.g. 9450"
                            />
                        </div>

                        {/* Change */}
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Change (Rp)</label>
                            <input
                                type="number"
                                value={form.change ?? ''}
                                onChange={e => updateField('change', e.target.value ? Number(e.target.value) : undefined)}
                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                                placeholder="e.g. +150"
                            />
                        </div>

                        {/* Change % */}
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Change %</label>
                            <input
                                type="number"
                                step="0.01"
                                value={form.changePercent ?? ''}
                                onChange={e => updateField('changePercent', e.target.value ? Number(e.target.value) : undefined)}
                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                                placeholder="e.g. 1.59"
                            />
                        </div>

                        {/* Volume */}
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Volume</label>
                            <input
                                type="number"
                                value={form.volume ?? ''}
                                onChange={e => updateField('volume', e.target.value ? Number(e.target.value) : undefined)}
                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                                placeholder="e.g. 45000000"
                            />
                        </div>

                        {/* Signal */}
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Signal</label>
                            <select
                                value={form.signal ?? ''}
                                onChange={e => updateField('signal', e.target.value || undefined)}
                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                            >
                                <option value="">Auto (from API)</option>
                                {SIGNAL_OPTIONS.map(s => (
                                    <option key={s} value={s}>{s.replace('_', ' ')}</option>
                                ))}
                            </select>
                        </div>

                        {/* Confidence */}
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Confidence (0–100)</label>
                            <input
                                type="number"
                                min={0} max={100}
                                value={form.confidence ?? ''}
                                onChange={e => updateField('confidence', e.target.value ? Number(e.target.value) : undefined)}
                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                                placeholder="e.g. 78"
                            />
                        </div>

                        {/* Support / Resistance */}
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Support Level (Rp)</label>
                            <input
                                type="number"
                                value={form.supportLevel ?? ''}
                                onChange={e => updateField('supportLevel', e.target.value ? Number(e.target.value) : undefined)}
                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                                placeholder="e.g. 9100"
                            />
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Resistance Level (Rp)</label>
                            <input
                                type="number"
                                value={form.resistanceLevel ?? ''}
                                onChange={e => updateField('resistanceLevel', e.target.value ? Number(e.target.value) : undefined)}
                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                                placeholder="e.g. 9800"
                            />
                        </div>
                    </div>

                    {/* Fundamentals Section */}
                    <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-800">
                        <h4 className="text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Fundamentals Override</h4>
                        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 md:gap-4">
                            {[
                                { key: 'peRatio', label: 'P/E Ratio', placeholder: '15.2' },
                                { key: 'pbvRatio', label: 'P/BV', placeholder: '2.8' },
                                { key: 'roe', label: 'ROE %', placeholder: '18.5' },
                                { key: 'der', label: 'DER', placeholder: '0.7' },
                                { key: 'dividendYield', label: 'Div Yield %', placeholder: '3.2' },
                            ].map(({ key, label, placeholder }) => (
                                <div key={key}>
                                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">{label}</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={form.fundamentals?.[key as keyof typeof form.fundamentals] ?? ''}
                                        onChange={e => updateFundamental(key, e.target.value ? Number(e.target.value) : undefined)}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg md:rounded-xl px-3 py-2 min-h-input text-xs font-bold focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                                        placeholder={placeholder}
                                    />
                                </div>
                            ))}
                            <div>
                                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Mkt Cap</label>
                                <input
                                    type="text"
                                    value={form.fundamentals?.marketCap ?? ''}
                                    onChange={e => updateFundamental('marketCap', e.target.value || undefined)}
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg md:rounded-xl px-3 py-2 min-h-input text-xs font-bold focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                                    placeholder="Rp 150T"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Summary */}
                    <div className="mt-6">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Summary / Analysis Text</label>
                        <textarea
                            value={form.summary ?? ''}
                            onChange={e => updateField('summary', e.target.value || undefined)}
                            rows={3}
                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all resize-none"
                            placeholder="Manual analysis summary..."
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col sm:flex-row items-center gap-3 mt-6">
                        <button
                            onClick={handleSave}
                            disabled={!form.ticker}
                            className="w-full sm:w-auto bg-gradient-to-r from-emerald-500 to-emerald-600 text-white min-h-touch px-6 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-emerald-100 dark:shadow-none hover:from-emerald-600 hover:to-emerald-700 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            💾 Save Override
                        </button>
                        <button
                            onClick={() => { setEditTicker(null); setShowAdd(false); setForm({}); }}
                            className="w-full sm:w-auto bg-slate-100 dark:bg-slate-800 text-slate-500 min-h-touch px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all active:scale-95"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* Overrides Table */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                {overrides.length === 0 ? (
                    <div className="py-16 text-center">
                        <div className="text-5xl mb-4">📊</div>
                        <h3 className="text-lg font-black text-slate-400">No Overrides Yet</h3>
                        <p className="text-sm text-slate-400 mt-1">Add a stock override to manually control displayed data.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-slate-200 dark:border-slate-800">
                                    <th className="text-left text-[10px] font-black text-slate-400 uppercase tracking-widest px-6 py-4">Ticker</th>
                                    <th className="text-left text-[10px] font-black text-slate-400 uppercase tracking-widest px-4 py-4">Price</th>
                                    <th className="text-left text-[10px] font-black text-slate-400 uppercase tracking-widest px-4 py-4">Change</th>
                                    <th className="text-left text-[10px] font-black text-slate-400 uppercase tracking-widest px-4 py-4">Signal</th>
                                    <th className="text-left text-[10px] font-black text-slate-400 uppercase tracking-widest px-4 py-4">Status</th>
                                    <th className="text-left text-[10px] font-black text-slate-400 uppercase tracking-widest px-4 py-4">Updated</th>
                                    <th className="text-right text-[10px] font-black text-slate-400 uppercase tracking-widest px-6 py-4">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {overrides.map(o => (
                                    <tr key={o.ticker} className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <span className="text-sm font-black">{o.ticker}</span>
                                            {o.name && <span className="text-xs text-slate-400 ml-2">{o.name}</span>}
                                        </td>
                                        <td className="px-4 py-4 text-sm font-bold tabular-nums">
                                            {o.price != null ? `Rp ${o.price.toLocaleString('id-ID')}` : '—'}
                                        </td>
                                        <td className="px-4 py-4">
                                            {o.change != null ? (
                                                <span className={`text-sm font-bold tabular-nums ${o.change >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                                    {o.change >= 0 ? '+' : ''}{o.change} ({o.changePercent ?? 0}%)
                                                </span>
                                            ) : '—'}
                                        </td>
                                        <td className="px-4 py-4">
                                            {o.signal ? (
                                                <span className={`inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg text-white ${SIGNAL_COLORS[o.signal] || 'bg-slate-400'}`}>
                                                    {o.signal.replace('_', ' ')}
                                                </span>
                                            ) : '—'}
                                        </td>
                                        <td className="px-4 py-4">
                                            <button
                                                onClick={() => handleToggle(o)}
                                                className={`relative w-11 h-6 rounded-full transition-colors ${o.enabled ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                                            >
                                                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow ${o.enabled ? 'left-[22px]' : 'left-0.5'}`} />
                                            </button>
                                        </td>
                                        <td className="px-4 py-4 text-[11px] text-slate-400 font-medium">
                                            {new Date(o.lastUpdated).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => handleEdit(o)}
                                                    className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-indigo-500 transition-all"
                                                    title="Edit"
                                                >
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                    </svg>
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(o.ticker)}
                                                    className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 transition-all"
                                                    title="Delete"
                                                >
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default StockManager;
