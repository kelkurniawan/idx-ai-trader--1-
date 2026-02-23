import React, { useState, useEffect } from 'react';
import { SAMPLE_IDX_STOCKS } from '../../types';
import {
    getNewsOverrides,
    saveNewsOverride,
    deleteNewsOverride,
    type NewsOverride,
} from '../../services/overridesService';

const NewsManager: React.FC = () => {
    const [overrides, setOverrides] = useState<NewsOverride[]>([]);
    const [editId, setEditId] = useState<string | null>(null);
    const [form, setForm] = useState<Partial<NewsOverride>>({});
    const [showAdd, setShowAdd] = useState(false);
    const [filterTicker, setFilterTicker] = useState<string>('');

    useEffect(() => {
        setOverrides(getNewsOverrides());
    }, []);

    const reload = () => setOverrides(getNewsOverrides());

    const filtered = filterTicker
        ? overrides.filter(n => n.ticker === filterTicker)
        : overrides;

    const handleAddNew = () => {
        setEditId(null);
        setForm({
            enabled: true,
            ticker: filterTicker || '',
            publishedAt: new Date().toISOString().slice(0, 16),
        });
        setShowAdd(true);
    };

    const handleEdit = (item: NewsOverride) => {
        setEditId(item.id);
        setForm({ ...item, publishedAt: item.publishedAt.slice(0, 16) });
        setShowAdd(false);
    };

    const handleSave = () => {
        if (!form.title || !form.ticker) return;
        const item: NewsOverride = {
            id: editId || `news_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            ticker: form.ticker!.toUpperCase(),
            title: form.title!,
            source: form.source || 'Manual Entry',
            url: form.url || '#',
            snippet: form.snippet || '',
            publishedAt: form.publishedAt ? new Date(form.publishedAt).toISOString() : new Date().toISOString(),
            enabled: form.enabled ?? true,
        };
        saveNewsOverride(item);
        reload();
        setEditId(null);
        setShowAdd(false);
        setForm({});
    };

    const handleDelete = (id: string) => {
        if (confirm('Delete this news override?')) {
            deleteNewsOverride(id);
            reload();
        }
    };

    const handleToggle = (item: NewsOverride) => {
        saveNewsOverride({ ...item, enabled: !item.enabled });
        reload();
    };

    const updateField = (key: string, value: any) => {
        setForm(prev => ({ ...prev, [key]: value }));
    };

    const isEditing = editId !== null || showAdd;

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-0">
                <div>
                    <h2 className="text-xl md:text-2xl font-black tracking-tight">News Manager</h2>
                    <p className="text-xs md:text-sm text-slate-400 mt-1">
                        Curate news articles per ticker. Manual news appears before automated results.
                    </p>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 md:gap-3">
                    <select
                        value={filterTicker}
                        onChange={e => setFilterTicker(e.target.value)}
                        className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 min-h-input text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none w-full sm:w-auto"
                    >
                        <option value="">All Tickers</option>
                        {SAMPLE_IDX_STOCKS.map(s => (
                            <option key={s.ticker} value={s.ticker}>{s.ticker}</option>
                        ))}
                    </select>
                    {!isEditing && (
                        <button
                            onClick={handleAddNew}
                            className="flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white px-5 py-2.5 min-h-touch rounded-xl text-sm font-bold shadow-lg shadow-indigo-100 dark:shadow-none hover:from-indigo-600 hover:to-indigo-700 transition-all active:scale-95 w-full sm:w-auto"
                        >
                            <span className="text-lg">+</span> Add News
                        </button>
                    )}
                </div>
            </div>

            {/* Edit / Add Form */}
            {isEditing && (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl md:rounded-3xl p-5 md:p-6 shadow-sm">
                    <h3 className="text-base md:text-lg font-black mb-5 md:mb-6 flex items-center gap-2">
                        <span className="text-xl">{showAdd ? '📝' : '✏️'}</span>
                        {showAdd ? 'New News Article' : 'Editing Article'}
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Ticker</label>
                            <select
                                value={form.ticker || ''}
                                onChange={e => updateField('ticker', e.target.value)}
                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 min-h-input text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                            >
                                <option value="">Select ticker...</option>
                                {SAMPLE_IDX_STOCKS.map(s => (
                                    <option key={s.ticker} value={s.ticker}>{s.ticker} — {s.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Source</label>
                            <input
                                type="text"
                                value={form.source ?? ''}
                                onChange={e => updateField('source', e.target.value)}
                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 min-h-input text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                                placeholder="e.g. CNBC Indonesia"
                            />
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Title</label>
                            <input
                                type="text"
                                value={form.title ?? ''}
                                onChange={e => updateField('title', e.target.value)}
                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 min-h-input text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                                placeholder="Article headline..."
                            />
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Snippet</label>
                            <textarea
                                value={form.snippet ?? ''}
                                onChange={e => updateField('snippet', e.target.value)}
                                rows={2}
                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                                placeholder="Brief article summary..."
                            />
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">URL</label>
                            <input
                                type="url"
                                value={form.url ?? ''}
                                onChange={e => updateField('url', e.target.value)}
                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 min-h-input text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                                placeholder="https://..."
                            />
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Published At</label>
                            <input
                                type="datetime-local"
                                value={form.publishedAt ?? ''}
                                onChange={e => updateField('publishedAt', e.target.value)}
                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 min-h-input text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-3 mt-6">
                        <button
                            onClick={handleSave}
                            disabled={!form.title || !form.ticker}
                            className="w-full sm:w-auto bg-gradient-to-r from-emerald-500 to-emerald-600 text-white min-h-touch px-6 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-emerald-100 dark:shadow-none hover:from-emerald-600 hover:to-emerald-700 transition-all active:scale-95 disabled:opacity-40"
                        >
                            💾 Save Article
                        </button>
                        <button
                            onClick={() => { setEditId(null); setShowAdd(false); setForm({}); }}
                            className="w-full sm:w-auto bg-slate-100 dark:bg-slate-800 text-slate-500 min-h-touch px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all active:scale-95"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* News List */}
            <div className="space-y-3">
                {filtered.length === 0 ? (
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl py-16 text-center">
                        <div className="text-5xl mb-4">📰</div>
                        <h3 className="text-lg font-black text-slate-400">No News Overrides</h3>
                        <p className="text-sm text-slate-400 mt-1">Add curated news articles to appear in the dashboard.</p>
                    </div>
                ) : (
                    filtered.map(item => (
                        <div
                            key={item.id}
                            className={`bg-white dark:bg-slate-900 border rounded-2xl p-5 transition-all ${item.enabled
                                ? 'border-slate-200 dark:border-slate-800'
                                : 'border-dashed border-slate-300 dark:border-slate-700 opacity-50'
                                }`}
                        >
                            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                    <div className="flex flex-wrap items-center gap-2 mb-2">
                                        <span className="text-[10px] font-black text-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded-md uppercase tracking-wider">{item.ticker}</span>
                                        <span className="text-[10px] font-bold text-slate-400">{item.source}</span>
                                        <span className="text-[10px] text-slate-400">
                                            {new Date(item.publishedAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                                        </span>
                                    </div>
                                    <h4 className="text-sm md:text-base font-black text-slate-800 dark:text-slate-100 leading-snug">{item.title}</h4>
                                    {item.snippet && <p className="text-xs md:text-sm text-slate-400 mt-1.5 md:mt-2 line-clamp-2">{item.snippet}</p>}
                                </div>
                                <div className="flex items-center justify-end md:justify-start gap-2 flex-shrink-0 mt-2 md:mt-0 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800">
                                    <button
                                        onClick={() => handleToggle(item)}
                                        className={`relative w-10 h-5.5 rounded-full transition-colors ${item.enabled ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                                        style={{ width: 44, height: 24 }}
                                    >
                                        <span className={`absolute top-0.5 w-[20px] h-[20px] bg-white rounded-full transition-transform shadow ${item.enabled ? 'left-[22px]' : 'left-0.5'}`} />
                                    </button>
                                    <button onClick={() => handleEdit(item)} className="p-2 min-h-touch min-w-[44px] flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-indigo-500 transition-all active:scale-95">
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                        </svg>
                                    </button>
                                    <button onClick={() => handleDelete(item.id)} className="p-2 min-h-touch min-w-[44px] flex items-center justify-center rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 transition-all active:scale-95">
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default NewsManager;
