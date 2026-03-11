
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
            try { setItems(JSON.parse(saved)); } catch (e) { console.error(e); }
        } else {
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
        <div className="animate-fade-in" style={{ paddingBottom: 88 }}>
            {/* ── Page Header ── */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                <div style={{
                    width: 48, height: 48, borderRadius: 14, flexShrink: 0,
                    background: 'var(--bg-muted)',
                    border: '1px solid var(--border-strong)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                    <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="var(--text-primary)" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                </div>
                <div>
                    <h2 style={{ fontFamily: 'var(--font-sans)', fontSize: 18, fontWeight: 800, letterSpacing: '-0.3px', color: 'var(--text-primary)', margin: 0 }}>
                        My Watchlist
                    </h2>
                    <p style={{ fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', margin: '2px 0 0' }}>
                        Monitor price action and set signal alerts
                    </p>
                </div>
            </div>

            {/* ── Add-Ticker Bar ── */}
            <div style={{
                background: 'var(--bg-surface)', border: '1px solid var(--border)',
                borderRadius: 14, padding: '14px 16px', marginBottom: 16,
            }}>
                <form onSubmit={handleAdd} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                        <span style={{
                            position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)',
                            fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 800,
                            color: 'var(--text-dim)', letterSpacing: '0.5px',
                        }}>IDX:</span>
                        <input
                            type="text"
                            value={newTicker}
                            onChange={(e) => setNewTicker(e.target.value)}
                            placeholder="Add Ticker (e.g. BBCA)"
                            style={{
                                width: '100%', boxSizing: 'border-box',
                                background: 'transparent', border: 'none',
                                padding: '10px 14px 10px 36px',
                                fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700,
                                color: 'var(--text-primary)', outline: 'none',
                                textTransform: 'uppercase',
                            }}
                        />
                    </div>
                    <button
                        type="submit"
                        style={{
                            background: 'var(--bg-elevated)', color: 'var(--text-primary)',
                            border: '1px solid var(--border)', borderRadius: 10, padding: '10px 24px',
                            fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 700,
                            cursor: 'pointer', whiteSpace: 'nowrap',
                            transition: 'background 0.15s',
                        }}
                        onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-muted)')}
                        onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-elevated)')}
                    >
                        Add
                    </button>
                </form>
            </div>

            {/* ── Ticker List ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {items.length === 0 ? (
                    <div style={{
                        background: 'var(--bg-surface)', border: '1px solid var(--border)',
                        borderRadius: 14, padding: '48px 24px',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
                        textAlign: 'center',
                    }}>
                        <span style={{ fontSize: 36, opacity: 0.5 }}>👁</span>
                        <p style={{ fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                            Your watchlist is empty
                        </p>
                        <p style={{ fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', margin: 0 }}>
                            Add a ticker above to start tracking.
                        </p>
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
                            delay={idx * 200}
                        />
                    ))
                )}
            </div>
        </div>
    );
};

export default Watchlist;
