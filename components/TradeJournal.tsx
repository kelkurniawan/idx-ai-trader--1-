
import React, { useState, useEffect } from 'react';
import { JournalEntry, SAMPLE_IDX_STOCKS, StockDataPoint, TradeMarker } from '../types';
import Chart from './Chart';
import { generateTradeReviewData } from '../services/marketDataService';

/* ── Helper: IDR format ── */
const idr = (n: number) => `Rp ${Math.abs(n).toLocaleString('id-ID')}`;

/* ── Helper: WIB timestamp ── */
const toWIB = (utcStr: string) => {
  try {
    return new Date(utcStr).toLocaleString('id-ID', {
      timeZone: 'Asia/Jakarta',
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    }) + ' WIB';
  } catch { return utcStr; }
};

/* ── Strategy options ── */
const STRATEGIES = ['SWING', 'SCALP', 'BREAKOUT', 'REVERSAL', 'MOMENTUM'];

const TradeJournal: React.FC = () => {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [showForm, setShowForm] = useState(false);

  // Review Mode State — unchanged
  const [reviewTrade, setReviewTrade] = useState<JournalEntry | null>(null);
  const [reviewData, setReviewData] = useState<StockDataPoint[]>([]);
  const [reviewMarkers, setReviewMarkers] = useState<TradeMarker[]>([]);

  // Form State — unchanged from original
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
      try { setEntries(JSON.parse(savedEntries)); } catch (e) { console.error('Failed to parse journal entries', e); }
    }
  }, []);

  useEffect(() => {
    if (reviewTrade) {
      const { data, markers } = generateTradeReviewData(reviewTrade);
      setReviewData(data); setReviewMarkers(markers);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      setReviewData([]); setReviewMarkers([]);
    }
  }, [reviewTrade]);

  const saveEntries = (newEntries: JournalEntry[]) => {
    setEntries(newEntries);
    localStorage.setItem('idx_trade_journal', JSON.stringify(newEntries));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newEntry: JournalEntry = {
      id: Date.now().toString(), ticker, date,
      exitDate: exitDate || undefined, type, setup,
      entryPrice, exitPrice: exitPrice > 0 ? exitPrice : undefined,
      stopLoss, takeProfit, notes,
      status: exitPrice > 0 ? 'CLOSED' : 'OPEN',
    };
    saveEntries([newEntry, ...entries]);
    resetForm(); setShowForm(false);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this trade log?')) {
      saveEntries(entries.filter(e => e.id !== id));
      if (reviewTrade?.id === id) setReviewTrade(null);
    }
  };

  const resetForm = () => {
    setTicker(SAMPLE_IDX_STOCKS[0].ticker); setDate(new Date().toISOString().slice(0, 16));
    setExitDate(''); setEntryPrice(0); setExitPrice(0);
    setStopLoss(0); setTakeProfit(0); setNotes('');
  };

  const calculatePnL = (entry: JournalEntry) => {
    if (!entry.exitPrice) return null;
    const diff = entry.exitPrice - entry.entryPrice;
    const pnl = entry.type === 'LONG' ? diff : -diff;
    const percent = (pnl / entry.entryPrice) * 100;
    return { pnl, percent };
  };

  /* ── Stats ── */
  const closedEntries = entries.filter(e => e.status === 'CLOSED');
  const totalPnL = closedEntries.reduce((acc, e) => {
    const p = calculatePnL(e); return acc + (p ? p.pnl : 0);
  }, 0);
  const wins = closedEntries.filter(e => { const p = calculatePnL(e); return p && p.pnl > 0; }).length;
  const winRate = closedEntries.length > 0 ? (wins / closedEntries.length) * 100 : 0;

  /* ── Input field base style ── */
  const inputStyle: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box',
    background: 'var(--bg-muted)', border: '1px solid var(--border)',
    borderRadius: 10, padding: '10px 14px',
    fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 600,
    color: 'var(--text-primary)', outline: 'none',
  };
  const labelStyle: React.CSSProperties = {
    fontFamily: 'var(--font-sans)', fontSize: 10, fontWeight: 700,
    color: 'var(--text-dim)', letterSpacing: '0.6px',
    textTransform: 'uppercase', display: 'block', marginBottom: 6,
  };

  return (
    <div className="animate-fade-in" style={{ paddingBottom: 88 }}>

      {/* ── Page Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12, flexShrink: 0,
            background: 'linear-gradient(135deg, rgba(239,68,68,0.18), rgba(239,68,68,0.36))',
            border: '1px solid var(--accent-red-border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="var(--accent-red)" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </div>
          <div>
            <h2 style={{ fontFamily: 'var(--font-sans)', fontSize: 18, fontWeight: 800, letterSpacing: '-0.3px', color: 'var(--text-primary)', margin: 0 }}>
              Trade Journal
            </h2>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', margin: '2px 0 0' }}>
              Log your setups and track performance
            </p>
          </div>
        </div>

        <button
          onClick={() => { setShowForm(!showForm); setReviewTrade(null); }}
          style={{
            background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
            color: '#ffffff', border: 'none', borderRadius: 10, padding: '10px 18px',
            fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 800,
            cursor: 'pointer', whiteSpace: 'nowrap',
            transition: 'opacity 0.15s, transform 0.1s',
          }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '0.88')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
        >
          {showForm ? 'Cancel' : '+ Log Trade'}
        </button>
      </div>

      {/* ── Stats Bar ── */}
      {entries.length > 0 && (
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2,
          background: 'var(--bg-surface)', border: '1px solid var(--border)',
          borderRadius: 14, padding: 2, marginBottom: 16,
        }}>
          {[
            { label: 'Total P&L', value: idr(totalPnL), color: totalPnL >= 0 ? 'var(--accent-green)' : 'var(--accent-red)', prefix: totalPnL >= 0 ? '+' : '-' },
            { label: 'Win Rate', value: `${winRate.toFixed(0)}%`, color: 'var(--accent-green)', prefix: '' },
            { label: 'Total Trades', value: String(entries.length), color: 'var(--text-primary)', prefix: '' },
          ].map(stat => (
            <div key={stat.label} style={{
              background: 'var(--bg-muted)', borderRadius: 12, padding: '12px 10px',
              display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center',
            }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 800, color: stat.color }}>
                {stat.prefix}{stat.value}
              </span>
              <span style={{ fontFamily: 'var(--font-sans)', fontSize: 9.5, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.3px', textTransform: 'uppercase' as const }}>
                {stat.label}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* ── Review Chart ── */}
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
          <div className="relative z-10"><Chart data={reviewData} timeFrame="3M" markers={reviewMarkers} /></div>
        </div>
      )}

      {/* ── Log Form — Bottom Sheet Modal ── */}
      {showForm && (
        <div
          onClick={e => { if (e.target === e.currentTarget) setShowForm(false); }}
          style={{
            position: 'fixed', inset: 0, zIndex: 40,
            background: 'rgba(0,0,0,0.65)',
            display: 'flex', alignItems: 'flex-end',
          }}
        >
          <div style={{
            background: 'var(--bg-surface)',
            borderTop: '1px solid var(--border-strong)',
            borderRadius: '20px 20px 0 0',
            padding: '0 16px 32px',
            width: '100%', maxHeight: '90vh', overflowY: 'auto',
          }}>
            {/* Drag handle */}
            <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 16px' }}>
              <div style={{ width: 40, height: 4, borderRadius: 999, background: 'var(--border-strong)' }} />
            </div>

            <h3 style={{ fontFamily: 'var(--font-sans)', fontSize: 15, fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 20px' }}>
              Log New Trade
            </h3>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Row 1: Ticker | BUY/SELL */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelStyle}>Ticker</label>
                  <select value={ticker} onChange={e => setTicker(e.target.value)} style={inputStyle}>
                    {SAMPLE_IDX_STOCKS.map(s => <option key={s.ticker} value={s.ticker}>{s.ticker}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Direction</label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {(['LONG', 'SHORT'] as const).map(t => (
                      <button key={t} type="button" onClick={() => setType(t)} style={{
                        flex: 1, padding: '10px 0', borderRadius: 8, cursor: 'pointer',
                        fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 800,
                        background: type === t ? (t === 'LONG' ? 'var(--accent-green-bg)' : 'var(--accent-red-bg)') : 'var(--bg-muted)',
                        border: type === t ? `1px solid ${t === 'LONG' ? 'var(--accent-green-border)' : 'var(--accent-red-border)'}` : '1px solid var(--border)',
                        color: type === t ? (t === 'LONG' ? 'var(--accent-green)' : 'var(--accent-red)') : 'var(--text-muted)',
                      }}>{t === 'LONG' ? 'BUY' : 'SELL'}</button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Row 2: Entry | Exit | Stop Loss */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                {[
                  { label: 'Entry Price', val: entryPrice, set: setEntryPrice, required: true },
                  { label: 'Exit Price', val: exitPrice, set: setExitPrice, required: false },
                  { label: 'Stop Loss', val: stopLoss, set: setStopLoss, required: true },
                ].map(({ label, val, set, required }) => (
                  <div key={label}>
                    <label style={labelStyle}>{label}</label>
                    <div style={{ position: 'relative' }}>
                      <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 700, color: 'var(--text-dim)' }}>Rp</span>
                      <input type="number" value={val} onChange={e => set(parseFloat(e.target.value))} required={required}
                        style={{ ...inputStyle, paddingLeft: 30 }} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Row 3: Strategy chips | Date */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 16, alignItems: 'start' }}>
                <div>
                  <label style={labelStyle}>Strategy</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 6 }}>
                    {STRATEGIES.map(s => (
                      <button key={s} type="button" onClick={() => setSetup(s as 'SWING' | 'SCALP')} style={{
                        padding: '5px 12px', borderRadius: 999, cursor: 'pointer',
                        fontFamily: 'var(--font-sans)', fontSize: 10.5, fontWeight: 700,
                        background: setup === s ? 'var(--accent-green-bg)' : 'transparent',
                        border: setup === s ? '1px solid var(--accent-green-border)' : '1px solid var(--border)',
                        color: setup === s ? 'var(--accent-green)' : 'var(--text-muted)',
                      }}>{s}</button>
                    ))}
                  </div>
                </div>
                <div style={{ minWidth: 140 }}>
                  <label style={labelStyle}>Entry Date</label>
                  <input type="datetime-local" value={date} onChange={e => setDate(e.target.value)} required style={inputStyle} />
                </div>
              </div>

              {/* Exit date — conditional */}
              {exitPrice > 0 && (
                <div>
                  <label style={labelStyle}>Exit Date</label>
                  <input type="datetime-local" value={exitDate} onChange={e => setExitDate(e.target.value)} required style={inputStyle} />
                </div>
              )}

              {/* Take Profit */}
              <div>
                <label style={labelStyle}>Take Profit</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 700, color: 'var(--text-dim)' }}>Rp</span>
                  <input type="number" value={takeProfit} onChange={e => setTakeProfit(parseFloat(e.target.value))} required style={{ ...inputStyle, paddingLeft: 30 }} />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label style={labelStyle}>Notes</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)}
                  placeholder="Why did you take this trade? Strategy used?"
                  style={{ ...inputStyle, height: 80, resize: 'none' as const }} />
              </div>

              {/* CTA */}
              <button type="submit" style={{
                width: '100%', padding: 14, borderRadius: 12, border: 'none',
                background: 'var(--accent-green)', color: '#0f1117',
                fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 800,
                cursor: 'pointer', transition: 'opacity 0.15s',
              }}
                onMouseEnter={e => (e.currentTarget.style.opacity = '0.88')}
                onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
              >
                Simpan Trade
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── Entry List ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {entries.length === 0 ? (
          /* Empty state */
          <div style={{
            background: 'var(--bg-surface)', border: '1px solid var(--border)',
            borderRadius: 16, padding: '48px 24px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, textAlign: 'center',
          }}>
            <span style={{ fontSize: 44, opacity: 0.6 }}>📝</span>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              Your journal is empty
            </p>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', margin: 0 }}>
              Start logging your trades to track your journey.
            </p>
          </div>
        ) : (
          entries.map(entry => {
            const pnl = calculatePnL(entry);
            const isSelected = reviewTrade?.id === entry.id;
            const pnlPositive = pnl ? pnl.pnl >= 0 : null;
            const cardBorder = pnlPositive === true
              ? '1px solid var(--accent-green-border)'
              : pnlPositive === false
              ? '1px solid var(--accent-red-border)'
              : '1px solid var(--border)';

            return (
              <div key={entry.id} style={{
                background: 'var(--bg-surface)',
                border: isSelected ? '1px solid var(--accent-purple-border)' : cardBorder,
                boxShadow: isSelected ? '0 0 0 1px var(--accent-purple-border)' : 'none',
                borderRadius: 14, padding: '14px 16px',
                display: 'flex', flexDirection: 'column', gap: 10,
                transition: 'border-color 0.15s, box-shadow 0.15s',
              }}>

                {/* Row 1: Direction pill | Ticker | Strategy | P&L */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 }}>
                    {/* BUY / SELL pill */}
                    <span style={{
                      padding: '3px 8px', borderRadius: 6, flexShrink: 0,
                      fontFamily: 'var(--font-sans)', fontSize: 9, fontWeight: 800,
                      background: entry.type === 'LONG' ? 'var(--accent-green-bg)' : 'var(--accent-red-bg)',
                      border: entry.type === 'LONG' ? '1px solid var(--accent-green-border)' : '1px solid var(--accent-red-border)',
                      color: entry.type === 'LONG' ? 'var(--accent-green)' : 'var(--accent-red)',
                    }}>{entry.type === 'LONG' ? 'BUY' : 'SELL'}</span>

                    {/* Ticker */}
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 15, fontWeight: 800, color: 'var(--text-primary)' }}>
                      {entry.ticker}
                    </span>

                    {/* Strategy chip */}
                    <span style={{
                      padding: '2px 7px', borderRadius: 999, flexShrink: 0,
                      fontFamily: 'var(--font-sans)', fontSize: 8.5, fontWeight: 700,
                      background: 'var(--bg-muted)', border: '1px solid var(--border)',
                      color: 'var(--text-muted)', textTransform: 'uppercase' as const,
                    }}>{entry.setup}</span>
                  </div>

                  {/* P&L + % (right) */}
                  {pnl ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1 }}>
                      <span style={{
                        fontFamily: 'var(--font-mono)', fontSize: 15, fontWeight: 800,
                        color: pnl.pnl >= 0 ? 'var(--accent-green)' : 'var(--accent-red)',
                      }}>
                        {pnl.pnl >= 0 ? '+' : '-'}{idr(pnl.pnl)}
                      </span>
                      <span style={{
                        fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700,
                        color: pnl.pnl >= 0 ? 'var(--accent-green)' : 'var(--accent-red)',
                      }}>
                        {pnl.percent >= 0 ? '+' : ''}{pnl.percent.toFixed(2)}%
                      </span>
                    </div>
                  ) : (
                    <span style={{
                      padding: '3px 8px', borderRadius: 6,
                      fontFamily: 'var(--font-sans)', fontSize: 9, fontWeight: 800,
                      background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.30)',
                      color: '#3b82f6',
                    }}>OPEN</span>
                  )}
                </div>

                {/* Row 2: Mini stat grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                  {[
                    { label: 'Entry', val: idr(entry.entryPrice) },
                    { label: 'Exit', val: entry.exitPrice ? idr(entry.exitPrice) : '—' },
                    { label: 'Stop', val: idr(entry.stopLoss) },
                  ].map(({ label, val }) => (
                    <div key={label} style={{
                      background: 'var(--bg-muted)', borderRadius: 8, padding: '6px 10px',
                    }}>
                      <p style={{ fontFamily: 'var(--font-sans)', fontSize: 9, fontWeight: 700, color: 'var(--text-dim)', margin: '0 0 2px', textTransform: 'uppercase' as const, letterSpacing: '0.5px' }}>{label}</p>
                      <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, color: 'var(--text-second)', margin: 0 }}>{val}</p>
                    </div>
                  ))}
                </div>

                {/* Row 3: Notes (conditional) */}
                {entry.notes && (
                  <p style={{
                    fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 400,
                    color: 'var(--text-muted)', margin: 0,
                    paddingTop: 8, borderTop: '1px solid var(--border)',
                    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const,
                    overflow: 'hidden',
                  }}>"{entry.notes}"</p>
                )}

                {/* Footer: Date | action buttons */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontFamily: 'var(--font-sans)', fontSize: 10, fontWeight: 500, color: 'var(--text-dimmer)' }}>
                    {toWIB(entry.date)}
                  </span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {/* Review Chart — kept as subtle secondary action */}
                    <button
                      onClick={() => setReviewTrade(isSelected ? null : entry)}
                      style={{
                        padding: '5px 10px', borderRadius: 8, border: 'none', cursor: 'pointer',
                        fontFamily: 'var(--font-sans)', fontSize: 10, fontWeight: 700,
                        background: isSelected ? 'var(--bg-raised)' : 'var(--bg-muted)',
                        color: isSelected ? 'var(--text-primary)' : 'var(--text-muted)',
                        display: 'flex', alignItems: 'center', gap: 4,
                      }}
                    >
                      <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                      </svg>
                      {isSelected ? 'Close' : 'Chart'}
                    </button>
                    {/* Delete */}
                    <button
                      onClick={() => handleDelete(entry.id)}
                      style={{
                        width: 30, height: 30, borderRadius: 8, border: 'none', cursor: 'pointer',
                        background: 'transparent', color: 'var(--text-dim)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'background 0.15s, color 0.15s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'var(--accent-red-bg)'; e.currentTarget.style.color = 'var(--accent-red)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-dim)'; }}
                    >
                      <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default TradeJournal;
