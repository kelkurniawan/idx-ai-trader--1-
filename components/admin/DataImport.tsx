import React, { useState, useRef } from 'react';
import { exportAllOverrides, importOverrides } from '../../services/overridesService';

const DataImport: React.FC = () => {
    const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
    const fileRef = useRef<HTMLInputElement>(null);

    const handleExport = () => {
        const json = exportAllOverrides();
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `idx-overrides-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        setStatus({ type: 'success', message: 'Overrides exported successfully!' });
    };

    const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const json = event.target?.result as string;
                const result = importOverrides(json);
                setStatus({
                    type: 'success',
                    message: `Imported ${result.stocks} stock override(s) and ${result.news} news override(s).`,
                });
            } catch (err) {
                setStatus({ type: 'error', message: `Import failed: ${(err as Error).message}` });
            }
        };
        reader.readAsText(file);
        if (fileRef.current) fileRef.current.value = '';
    };

    const handleClearAll = () => {
        if (confirm('Are you sure you want to clear ALL overrides? This cannot be undone.')) {
            localStorage.removeItem('idx_admin_stock_overrides');
            localStorage.removeItem('idx_admin_news_overrides');
            setStatus({ type: 'success', message: 'All overrides cleared.' });
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div>
                <h2 className="text-2xl font-black tracking-tight">Import / Export</h2>
                <p className="text-sm text-slate-400 mt-1">
                    Bulk manage your overrides via JSON files. Export to backup, import to restore.
                </p>
            </div>

            {/* Status Banner */}
            {status && (
                <div className={`rounded-xl px-5 py-3 text-sm font-bold flex items-center gap-3 ${status.type === 'success'
                        ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                        : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800'
                    }`}>
                    <span className="text-lg">{status.type === 'success' ? '✅' : '❌'}</span>
                    {status.message}
                    <button onClick={() => setStatus(null)} className="ml-auto text-current opacity-50 hover:opacity-100">✕</button>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Export Card */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 shadow-sm">
                    <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl flex items-center justify-center text-3xl mb-6">
                        📤
                    </div>
                    <h3 className="text-lg font-black mb-2">Export Overrides</h3>
                    <p className="text-sm text-slate-400 mb-6">
                        Download all stock and news overrides as a JSON file. Use this to backup your data or share with team members.
                    </p>
                    <button
                        onClick={handleExport}
                        className="w-full bg-gradient-to-r from-indigo-500 to-indigo-600 text-white py-3 rounded-xl text-sm font-bold shadow-lg shadow-indigo-100 dark:shadow-none hover:from-indigo-600 hover:to-indigo-700 transition-all active:scale-95"
                    >
                        Download JSON
                    </button>
                </div>

                {/* Import Card */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 shadow-sm">
                    <div className="w-16 h-16 bg-amber-50 dark:bg-amber-900/20 rounded-2xl flex items-center justify-center text-3xl mb-6">
                        📥
                    </div>
                    <h3 className="text-lg font-black mb-2">Import Overrides</h3>
                    <p className="text-sm text-slate-400 mb-6">
                        Upload a JSON file to merge overrides. Existing entries with the same ticker/ID will be updated. New entries will be added.
                    </p>
                    <label className="block w-full">
                        <input
                            ref={fileRef}
                            type="file"
                            accept=".json"
                            onChange={handleImport}
                            className="hidden"
                        />
                        <div className="w-full bg-gradient-to-r from-amber-400 to-orange-500 text-white py-3 rounded-xl text-sm font-bold text-center shadow-lg shadow-amber-100 dark:shadow-none hover:from-amber-500 hover:to-orange-600 transition-all cursor-pointer active:scale-95">
                            Choose JSON File
                        </div>
                    </label>
                </div>
            </div>

            {/* Danger Zone */}
            <div className="bg-white dark:bg-slate-900 border border-red-200 dark:border-red-900/50 rounded-2xl p-6 shadow-sm">
                <h3 className="text-sm font-black text-red-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <span>⚠️</span> Danger Zone
                </h3>
                <p className="text-sm text-slate-400 mb-4">
                    Permanently delete all stock and news overrides. The main dashboard will fall back to automated API data.
                </p>
                <button
                    onClick={handleClearAll}
                    className="bg-red-50 dark:bg-red-900/20 text-red-500 border border-red-200 dark:border-red-800 px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-red-100 dark:hover:bg-red-900/40 transition-all active:scale-95"
                >
                    🗑️ Clear All Overrides
                </button>
            </div>

            {/* JSON Format Reference */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4">JSON Format Reference</h3>
                <pre className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 text-xs font-mono text-slate-600 dark:text-slate-300 overflow-x-auto">
                    {`{
  "stocks": [
    {
      "ticker": "BBCA",
      "price": 9500,
      "change": 150,
      "changePercent": 1.6,
      "signal": "BUY",
      "confidence": 78,
      "summary": "Strong Q4 performance...",
      "supportLevel": 9100,
      "resistanceLevel": 9800,
      "fundamentals": {
        "peRatio": 15.2,
        "pbvRatio": 2.8,
        "roe": 18.5
      },
      "enabled": true
    }
  ],
  "news": [
    {
      "id": "news_custom_1",
      "ticker": "BBCA",
      "title": "BBCA Reports Record Earnings",
      "source": "Manual",
      "url": "https://...",
      "snippet": "Bank Central Asia...",
      "publishedAt": "2026-02-19T00:00:00Z",
      "enabled": true
    }
  ]
}`}
                </pre>
            </div>
        </div>
    );
};

export default DataImport;
