import React, { useState, useEffect } from 'react';
import { usePortfolio } from '../hooks/usePortfolio';
import { SAMPLE_IDX_STOCKS, StockDataPoint, TradeMarker, JournalEntry } from '../types';
import Chart from './Chart';
import { generateTradeReviewData } from '../services/marketDataService';
import type { TradeEntry, PortfolioHolding, HoldingCreate, TradeCreate } from '../services/portfolioApi';

/* ── Helpers ── */
const idr = (n: number) => `Rp ${Math.abs(n).toLocaleString('id-ID')}`;
const formatDate = (d: string) => {
  try {
    return new Date(d).toLocaleDateString('id-ID', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  } catch { return d; }
};

const STRATEGIES = ['Swing', 'Scalp', 'Breakout', 'Value', 'Dividen'] as const;

type Tab = 'tradelog' | 'portfolio';

const TradeJournal: React.FC = () => {
  const {
    summary, trades, tradeStats, loading, error,
    addHolding, updateHolding, deleteHolding, updateCash,
    addTrade, deleteTrade, refreshAll,
  } = usePortfolio();

  const [tab, setTab] = useState<Tab>('tradelog');

  // Review Mode
  const [reviewTrade, setReviewTrade] = useState<JournalEntry | null>(null);
  const [reviewData, setReviewData] = useState<StockDataPoint[]>([]);
  const [reviewMarkers, setReviewMarkers] = useState<TradeMarker[]>([]);

  // Forms
  const [showTradeForm, setShowTradeForm] = useState(false);
  const [showHoldingForm, setShowHoldingForm] = useState(false);
  const [showCashForm, setShowCashForm] = useState(false);

  // Trade form fields
  const [tTicker, setTTicker] = useState(SAMPLE_IDX_STOCKS[0].ticker);
  const [tType, setTType] = useState<'BUY' | 'SELL'>('BUY');
  const [tEntryPrice, setTEntryPrice] = useState(0);
  const [tExitPrice, setTExitPrice] = useState(0);
  const [tLot, setTLot] = useState(1);
  const [tStrategy, setTStrategy] = useState<typeof STRATEGIES[number]>('Swing');
  const [tDate, setTDate] = useState(new Date().toISOString().slice(0, 10));
  const [tNotes, setTNotes] = useState('');

  // Holding form fields
  const [hTicker, setHTicker] = useState(SAMPLE_IDX_STOCKS[0].ticker);
  const [hAvg, setHAvg] = useState(0);
  const [hCurrent, setHCurrent] = useState(0);
  const [hLot, setHLot] = useState(1);
  const [hNotes, setHNotes] = useState('');

  // Cash form
  const [cashInput, setCashInput] = useState('');

  useEffect(() => {
    if (reviewTrade) {
      const { data, markers } = generateTradeReviewData(reviewTrade);
      setReviewData(data); setReviewMarkers(markers);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      setReviewData([]); setReviewMarkers([]);
    }
  }, [reviewTrade]);

  /* ── Handlers ── */
  const handleAddTrade = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data: TradeCreate = {
        ticker: tTicker, trade_type: tType, entry_price: tEntryPrice,
        lot: tLot, strategy: tStrategy, trade_date: tDate, notes: tNotes || undefined,
      };
      if (tExitPrice > 0) data.exit_price = tExitPrice;
      await addTrade(data);
      setShowTradeForm(false); resetTradeForm();
    } catch (err) { /* error displayed by hook */ }
  };

  const handleAddHolding = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data: HoldingCreate = {
        ticker: hTicker, avg_buy_price: hAvg, current_price: hCurrent,
        lot: hLot, notes: hNotes || undefined,
      };
      await addHolding(data);
      setShowHoldingForm(false); resetHoldingForm();
    } catch (err) { /* error displayed by hook */ }
  };

  const handleUpdateCash = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseInt(cashInput, 10);
    if (isNaN(val) || val < 0) return;
    try {
      await updateCash(val);
      setShowCashForm(false); setCashInput('');
    } catch (err) { /* error displayed by hook */ }
  };

  const resetTradeForm = () => {
    setTTicker(SAMPLE_IDX_STOCKS[0].ticker); setTType('BUY');
    setTEntryPrice(0); setTExitPrice(0); setTLot(1);
    setTStrategy('Swing'); setTDate(new Date().toISOString().slice(0, 10)); setTNotes('');
  };

  const resetHoldingForm = () => {
    setHTicker(SAMPLE_IDX_STOCKS[0].ticker);
    setHAvg(0); setHCurrent(0); setHLot(1); setHNotes('');
  };

  /* ── Styles ── */
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
              Log & manage your portfolio
            </p>
          </div>
        </div>
      </div>

      {/* ── Tab Bar ── */}
      <div style={{
        display: 'flex', gap: 4, background: 'var(--bg-muted)', borderRadius: 12, padding: 3, marginBottom: 16,
      }}>
        {([
          { id: 'tradelog' as Tab, label: 'Trade Log' },
          { id: 'portfolio' as Tab, label: 'Portofolio' },
        ]).map(t => (
          <button key={t.id} onClick={() => { setTab(t.id); setReviewTrade(null); }}
            style={{
              flex: 1, padding: '10px 0', borderRadius: 10, border: 'none', cursor: 'pointer',
              fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: tab === t.id ? 800 : 600,
              background: tab === t.id ? 'var(--bg-surface)' : 'transparent',
              color: tab === t.id ? 'var(--text-primary)' : 'var(--text-muted)',
              boxShadow: tab === t.id ? '0 1px 3px rgba(0,0,0,0.15)' : 'none',
              transition: 'all 0.15s',
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Error banner ── */}
      {error && (
        <div style={{
          padding: '10px 14px', borderRadius: 10, marginBottom: 12,
          background: 'var(--accent-red-bg)', border: '1px solid var(--accent-red-border)',
          fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 600, color: 'var(--accent-red)',
        }}>
          {error}
        </div>
      )}

      {/* ══════════════════════════════
          TRADE LOG TAB
         ══════════════════════════════ */}
      {tab === 'tradelog' && (
        <>
          {/* Stats Bar */}
          {tradeStats && tradeStats.total_trades > 0 && (
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2,
              background: 'var(--bg-surface)', border: '1px solid var(--border)',
              borderRadius: 14, padding: 2, marginBottom: 16,
            }}>
              {[
                { label: 'Total P&L', value: idr(tradeStats.total_pnl), color: tradeStats.total_pnl >= 0 ? 'var(--accent-green)' : 'var(--accent-red)', prefix: tradeStats.total_pnl >= 0 ? '+' : '-' },
                { label: 'Win Rate', value: `${tradeStats.win_rate.toFixed(0)}%`, color: 'var(--accent-green)', prefix: '' },
                { label: 'Total Trades', value: String(tradeStats.total_trades), color: 'var(--text-primary)', prefix: '' },
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

          {/* Add Trade Button */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
            <button
              onClick={() => { setShowTradeForm(!showTradeForm); setReviewTrade(null); }}
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
              {showTradeForm ? 'Cancel' : '+ Log Trade'}
            </button>
          </div>

          {/* Review Chart */}
          {reviewTrade && reviewData.length > 0 && (
            <div className="mb-4" style={{
              background: 'var(--bg-surface)', border: '1px solid var(--border)',
              borderRadius: 16, padding: 20, position: 'relative', overflow: 'hidden',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: 'var(--bg-muted)', border: '1px solid var(--border)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: 11, color: 'var(--text-primary)',
                  }}>{reviewTrade.ticker}</div>
                  <div>
                    <h3 style={{ fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', margin: 0 }}>Trade Review</h3>
                    <p style={{ fontFamily: 'var(--font-sans)', fontSize: 10, color: 'var(--text-muted)', margin: 0 }}>Visualizing {reviewTrade.type} setup</p>
                  </div>
                </div>
                <button onClick={() => setReviewTrade(null)} style={{
                  padding: 6, borderRadius: 8, border: 'none', cursor: 'pointer',
                  background: 'var(--bg-muted)', color: 'var(--text-primary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <Chart data={reviewData} timeFrame="3M" markers={reviewMarkers} />
            </div>
          )}

          {/* Trade Form Modal */}
          {showTradeForm && (
            <div onClick={e => { if (e.target === e.currentTarget) setShowTradeForm(false); }}
              style={{ position: 'fixed', inset: 0, zIndex: 40, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'flex-end' }}>
              <div style={{
                background: 'var(--bg-surface)', borderTop: '1px solid var(--border-strong)',
                borderRadius: '20px 20px 0 0', padding: '0 16px 32px',
                width: '100%', maxHeight: '90vh', overflowY: 'auto',
              }}>
                <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 16px' }}>
                  <div style={{ width: 40, height: 4, borderRadius: 999, background: 'var(--border-strong)' }} />
                </div>
                <h3 style={{ fontFamily: 'var(--font-sans)', fontSize: 15, fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 20px' }}>
                  Log New Trade
                </h3>
                <form onSubmit={handleAddTrade} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {/* Ticker | Type */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <label style={labelStyle}>Ticker</label>
                      <select value={tTicker} onChange={e => setTTicker(e.target.value)} style={inputStyle}>
                        {SAMPLE_IDX_STOCKS.map(s => <option key={s.ticker} value={s.ticker}>{s.ticker}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>Direction</label>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {(['BUY', 'SELL'] as const).map(t => (
                          <button key={t} type="button" onClick={() => setTType(t)} style={{
                            flex: 1, padding: '10px 0', borderRadius: 8, cursor: 'pointer',
                            fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 800,
                            background: tType === t ? (t === 'BUY' ? 'var(--accent-green-bg)' : 'var(--accent-red-bg)') : 'var(--bg-muted)',
                            border: tType === t ? `1px solid ${t === 'BUY' ? 'var(--accent-green-border)' : 'var(--accent-red-border)'}` : '1px solid var(--border)',
                            color: tType === t ? (t === 'BUY' ? 'var(--accent-green)' : 'var(--accent-red)') : 'var(--text-muted)',
                          }}>{t}</button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Prices */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                    {[
                      { label: 'Entry Price', val: tEntryPrice, set: setTEntryPrice, required: true },
                      { label: 'Exit Price', val: tExitPrice, set: setTExitPrice, required: false },
                      { label: 'Lot', val: tLot, set: setTLot, required: true },
                    ].map(({ label, val, set, required }) => (
                      <div key={label}>
                        <label style={labelStyle}>{label}</label>
                        <input type="number" value={val} onChange={e => set(parseInt(e.target.value) || 0)}
                          required={required} style={inputStyle} />
                      </div>
                    ))}
                  </div>

                  {/* Strategy + Date */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 16, alignItems: 'start' }}>
                    <div>
                      <label style={labelStyle}>Strategy</label>
                      <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 6 }}>
                        {STRATEGIES.map(s => (
                          <button key={s} type="button" onClick={() => setTStrategy(s)} style={{
                            padding: '5px 12px', borderRadius: 999, cursor: 'pointer',
                            fontFamily: 'var(--font-sans)', fontSize: 10.5, fontWeight: 700,
                            background: tStrategy === s ? 'var(--accent-green-bg)' : 'transparent',
                            border: tStrategy === s ? '1px solid var(--accent-green-border)' : '1px solid var(--border)',
                            color: tStrategy === s ? 'var(--accent-green)' : 'var(--text-muted)',
                          }}>{s}</button>
                        ))}
                      </div>
                    </div>
                    <div style={{ minWidth: 140 }}>
                      <label style={labelStyle}>Trade Date</label>
                      <input type="date" value={tDate} onChange={e => setTDate(e.target.value)} required style={inputStyle} />
                    </div>
                  </div>

                  {/* Notes */}
                  <div>
                    <label style={labelStyle}>Notes</label>
                    <textarea value={tNotes} onChange={e => setTNotes(e.target.value)}
                      placeholder="Why did you take this trade?"
                      style={{ ...inputStyle, height: 80, resize: 'none' as const }} />
                  </div>

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

          {/* Trade List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
                <div className="animate-spin" style={{
                  width: 32, height: 32, borderRadius: '50%',
                  border: '3px solid var(--border)', borderTopColor: 'var(--accent-green)',
                }} />
              </div>
            ) : trades.length === 0 ? (
              <div style={{
                background: 'var(--bg-surface)', border: '1px solid var(--border)',
                borderRadius: 16, padding: '48px 24px',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, textAlign: 'center',
              }}>
                <svg width="44" height="44" fill="none" viewBox="0 0 24 24" stroke="var(--text-dim)" strokeWidth={1.5} style={{ opacity: 0.5 }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <p style={{ fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                  Belum ada trade
                </p>
                <p style={{ fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', margin: 0 }}>
                  Mulai catat trade kamu untuk tracking performa.
                </p>
              </div>
            ) : (
              trades.map(entry => {
                const pnlPositive = entry.realized_pnl !== null ? entry.realized_pnl >= 0 : null;
                const cardBorder = pnlPositive === true
                  ? '1px solid var(--accent-green-border)'
                  : pnlPositive === false
                  ? '1px solid var(--accent-red-border)'
                  : '1px solid var(--border)';

                return (
                  <div key={entry.id} style={{
                    background: 'var(--bg-surface)', border: cardBorder,
                    borderRadius: 14, padding: '14px 16px',
                    display: 'flex', flexDirection: 'column', gap: 10,
                    transition: 'border-color 0.15s',
                  }}>
                    {/* Row 1: Direction · Ticker · Strategy | P&L */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 }}>
                        <span style={{
                          padding: '3px 8px', borderRadius: 6, flexShrink: 0,
                          fontFamily: 'var(--font-sans)', fontSize: 9, fontWeight: 800,
                          background: entry.trade_type === 'BUY' ? 'var(--accent-green-bg)' : 'var(--accent-red-bg)',
                          border: entry.trade_type === 'BUY' ? '1px solid var(--accent-green-border)' : '1px solid var(--accent-red-border)',
                          color: entry.trade_type === 'BUY' ? 'var(--accent-green)' : 'var(--accent-red)',
                        }}>{entry.trade_type}</span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 15, fontWeight: 800, color: 'var(--text-primary)' }}>
                          {entry.ticker}
                        </span>
                        {entry.strategy && (
                          <span style={{
                            padding: '2px 7px', borderRadius: 999, flexShrink: 0,
                            fontFamily: 'var(--font-sans)', fontSize: 8.5, fontWeight: 700,
                            background: 'var(--bg-muted)', border: '1px solid var(--border)',
                            color: 'var(--text-muted)', textTransform: 'uppercase' as const,
                          }}>{entry.strategy}</span>
                        )}
                        <span style={{
                          padding: '2px 7px', borderRadius: 999,
                          fontFamily: 'var(--font-mono)', fontSize: 8.5, fontWeight: 700,
                          background: 'var(--bg-muted)', border: '1px solid var(--border)',
                          color: 'var(--text-muted)',
                        }}>{entry.lot} lot</span>
                      </div>
                      {/* P&L */}
                      {entry.status === 'CLOSED' && entry.realized_pnl !== null ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1 }}>
                          <span style={{
                            fontFamily: 'var(--font-mono)', fontSize: 15, fontWeight: 800,
                            color: entry.realized_pnl >= 0 ? 'var(--accent-green)' : 'var(--accent-red)',
                          }}>
                            {entry.realized_pnl >= 0 ? '+' : '-'}{idr(entry.realized_pnl)}
                          </span>
                          {entry.realized_pct !== null && (
                            <span style={{
                              fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700,
                              color: entry.realized_pnl >= 0 ? 'var(--accent-green)' : 'var(--accent-red)',
                            }}>
                              {entry.realized_pct >= 0 ? '+' : ''}{entry.realized_pct.toFixed(2)}%
                            </span>
                          )}
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

                    {/* Row 2: Mini stats */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                      {[
                        { label: 'Entry', val: idr(entry.entry_price) },
                        { label: 'Exit', val: entry.exit_price ? idr(entry.exit_price) : '—' },
                        { label: 'Date', val: formatDate(entry.trade_date) },
                      ].map(({ label, val }) => (
                        <div key={label} style={{ background: 'var(--bg-muted)', borderRadius: 8, padding: '6px 10px' }}>
                          <p style={{ fontFamily: 'var(--font-sans)', fontSize: 9, fontWeight: 700, color: 'var(--text-dim)', margin: '0 0 2px', textTransform: 'uppercase' as const, letterSpacing: '0.5px' }}>{label}</p>
                          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, color: 'var(--text-second)', margin: 0 }}>{val}</p>
                        </div>
                      ))}
                    </div>

                    {/* Notes */}
                    {entry.notes && (
                      <p style={{
                        fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 400,
                        color: 'var(--text-muted)', margin: 0,
                        paddingTop: 8, borderTop: '1px solid var(--border)',
                        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const,
                        overflow: 'hidden',
                      }}>"{entry.notes}"</p>
                    )}

                    {/* Footer: Delete */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                      <button
                        onClick={() => {
                          if (window.confirm('Delete this trade?')) deleteTrade(entry.id);
                        }}
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
                );
              })
            )}
          </div>
        </>
      )}

      {/* ══════════════════════════════
          PORTFOLIO TAB
         ══════════════════════════════ */}
      {tab === 'portfolio' && (
        <>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
              <div className="animate-spin" style={{
                width: 32, height: 32, borderRadius: '50%',
                border: '3px solid var(--border)', borderTopColor: 'var(--accent-green)',
              }} />
            </div>
          ) : (
            <>
              {/* Portfolio Summary Card */}
              {summary && (
                <div style={{
                  background: 'var(--card-grad)', border: '1px solid var(--accent-border)',
                  borderRadius: 16, padding: 20, marginBottom: 16, position: 'relative', overflow: 'hidden',
                }}>
                  <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, height: 2, borderRadius: '16px 16px 0 0',
                    background: summary.unrealized_pnl >= 0 ? 'var(--accent-green)' : 'var(--accent-red)',
                  }} />
                  <p style={{ fontFamily: 'var(--font-sans)', fontSize: 10, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '1.2px', margin: '0 0 4px' }}>
                    Total Portofolio
                  </p>
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                    {idr(summary.total_portfolio)}
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 14 }}>
                    {[
                      { label: 'Nilai Saham', val: idr(summary.holdings_value) },
                      { label: 'Kas Broker', val: idr(summary.cash_balance) },
                      { label: 'Unrealized P&L', val: `${summary.unrealized_pnl >= 0 ? '+' : ''}${idr(summary.unrealized_pnl)}`, color: summary.unrealized_pnl >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' },
                    ].map(s => (
                      <div key={s.label} style={{ background: 'var(--bg-muted)', borderRadius: 10, padding: '8px 10px', textAlign: 'center' }}>
                        <p style={{ fontFamily: 'var(--font-sans)', fontSize: 8.5, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 3px' }}>{s.label}</p>
                        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, color: (s as any).color || 'var(--text-primary)', margin: 0 }}>{s.val}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <button onClick={() => setShowHoldingForm(true)} style={{
                  flex: 1, padding: '10px 0', borderRadius: 10, border: 'none', cursor: 'pointer',
                  background: 'linear-gradient(135deg, #7c3aed, #a855f7)', color: '#fff',
                  fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 800,
                  transition: 'opacity 0.15s',
                }}
                  onMouseEnter={e => (e.currentTarget.style.opacity = '0.88')}
                  onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                >+ Tambah Saham</button>
                <button onClick={() => { setCashInput(String(summary?.cash_balance || 0)); setShowCashForm(true); }} style={{
                  flex: 1, padding: '10px 0', borderRadius: 10, border: '1px solid var(--border)', cursor: 'pointer',
                  background: 'var(--bg-surface)', color: 'var(--text-primary)',
                  fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 700,
                  transition: 'opacity 0.15s',
                }}
                  onMouseEnter={e => (e.currentTarget.style.opacity = '0.88')}
                  onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                >Update Kas</button>
              </div>

              {/* Holdings List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {(!summary || summary.holdings.length === 0) ? (
                  <div style={{
                    background: 'var(--bg-surface)', border: '1px solid var(--border)',
                    borderRadius: 16, padding: '48px 24px',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, textAlign: 'center',
                  }}>
                    <svg width="44" height="44" fill="none" viewBox="0 0 24 24" stroke="var(--text-dim)" strokeWidth={1.5} style={{ opacity: 0.5 }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                    <p style={{ fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                      Portofolio kosong
                    </p>
                    <p style={{ fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', margin: 0 }}>
                      Tambah saham atau update kas broker kamu.
                    </p>
                  </div>
                ) : (
                  summary!.holdings.map(h => {
                    const up = h.unrealized_pnl >= 0;
                    return (
                      <div key={h.id} style={{
                        background: 'var(--bg-surface)',
                        border: `1px solid ${up ? 'var(--accent-green-border)' : 'var(--accent-red-border)'}`,
                        borderRadius: 14, padding: '14px 16px',
                        display: 'flex', flexDirection: 'column', gap: 10,
                      }}>
                        {/* Row 1: Ticker | P&L */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>
                              {h.ticker}
                            </span>
                            <span style={{
                              padding: '2px 7px', borderRadius: 999,
                              fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 700,
                              background: 'var(--bg-muted)', border: '1px solid var(--border)',
                              color: 'var(--text-muted)',
                            }}>{h.lot} lot</span>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1 }}>
                            <span style={{
                              fontFamily: 'var(--font-mono)', fontSize: 15, fontWeight: 800,
                              color: up ? 'var(--accent-green)' : 'var(--accent-red)',
                            }}>
                              {up ? '+' : '-'}{idr(h.unrealized_pnl)}
                            </span>
                            <span style={{
                              fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700,
                              color: up ? 'var(--accent-green)' : 'var(--accent-red)',
                            }}>
                              {h.unrealized_pct >= 0 ? '+' : ''}{h.unrealized_pct.toFixed(2)}%
                            </span>
                          </div>
                        </div>

                        {/* Row 2: Stats */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                          {[
                            { label: 'Avg Buy', val: idr(h.avg_buy_price) },
                            { label: 'Current', val: idr(h.current_price) },
                            { label: 'Market Val', val: idr(h.market_value) },
                          ].map(({ label, val }) => (
                            <div key={label} style={{ background: 'var(--bg-muted)', borderRadius: 8, padding: '6px 10px' }}>
                              <p style={{ fontFamily: 'var(--font-sans)', fontSize: 9, fontWeight: 700, color: 'var(--text-dim)', margin: '0 0 2px', textTransform: 'uppercase' as const, letterSpacing: '0.5px' }}>{label}</p>
                              <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, color: 'var(--text-second)', margin: 0 }}>{val}</p>
                            </div>
                          ))}
                        </div>

                        {/* Notes */}
                        {h.notes && (
                          <p style={{
                            fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 400,
                            color: 'var(--text-muted)', margin: 0,
                            paddingTop: 8, borderTop: '1px solid var(--border)',
                          }}>"{h.notes}"</p>
                        )}

                        {/* Delete */}
                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                          <button onClick={() => { if (window.confirm(`Hapus ${h.ticker}?`)) deleteHolding(h.id); }}
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
                    );
                  })
                )}
              </div>

              {/* ── Holding Form Modal ── */}
              {showHoldingForm && (
                <div onClick={e => { if (e.target === e.currentTarget) setShowHoldingForm(false); }}
                  style={{ position: 'fixed', inset: 0, zIndex: 40, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'flex-end' }}>
                  <div style={{
                    background: 'var(--bg-surface)', borderTop: '1px solid var(--border-strong)',
                    borderRadius: '20px 20px 0 0', padding: '0 16px 32px',
                    width: '100%', maxHeight: '90vh', overflowY: 'auto',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 16px' }}>
                      <div style={{ width: 40, height: 4, borderRadius: 999, background: 'var(--border-strong)' }} />
                    </div>
                    <h3 style={{ fontFamily: 'var(--font-sans)', fontSize: 15, fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 20px' }}>
                      Tambah Saham
                    </h3>
                    <form onSubmit={handleAddHolding} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                      <div>
                        <label style={labelStyle}>Ticker</label>
                        <select value={hTicker} onChange={e => setHTicker(e.target.value)} style={inputStyle}>
                          {SAMPLE_IDX_STOCKS.map(s => <option key={s.ticker} value={s.ticker}>{s.ticker}</option>)}
                        </select>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                        {[
                          { label: 'Avg Buy', val: hAvg, set: setHAvg },
                          { label: 'Current Price', val: hCurrent, set: setHCurrent },
                          { label: 'Lot', val: hLot, set: setHLot },
                        ].map(({ label, val, set }) => (
                          <div key={label}>
                            <label style={labelStyle}>{label}</label>
                            <input type="number" value={val} onChange={e => set(parseInt(e.target.value) || 0)}
                              required style={inputStyle} />
                          </div>
                        ))}
                      </div>
                      <div>
                        <label style={labelStyle}>Notes</label>
                        <textarea value={hNotes} onChange={e => setHNotes(e.target.value)}
                          placeholder="Catatan (opsional)" style={{ ...inputStyle, height: 60, resize: 'none' as const }} />
                      </div>
                      <button type="submit" style={{
                        width: '100%', padding: 14, borderRadius: 12, border: 'none',
                        background: 'var(--accent-green)', color: '#0f1117',
                        fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 800,
                        cursor: 'pointer',
                      }}>Simpan</button>
                    </form>
                  </div>
                </div>
              )}

              {/* ── Cash Form Modal ── */}
              {showCashForm && (
                <div onClick={e => { if (e.target === e.currentTarget) setShowCashForm(false); }}
                  style={{ position: 'fixed', inset: 0, zIndex: 40, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'flex-end' }}>
                  <div style={{
                    background: 'var(--bg-surface)', borderTop: '1px solid var(--border-strong)',
                    borderRadius: '20px 20px 0 0', padding: '0 16px 32px',
                    width: '100%', maxHeight: '90vh', overflowY: 'auto',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 16px' }}>
                      <div style={{ width: 40, height: 4, borderRadius: 999, background: 'var(--border-strong)' }} />
                    </div>
                    <h3 style={{ fontFamily: 'var(--font-sans)', fontSize: 15, fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 20px' }}>
                      Update Kas Broker
                    </h3>
                    <form onSubmit={handleUpdateCash} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                      <div>
                        <label style={labelStyle}>Saldo Kas (IDR)</label>
                        <div style={{ position: 'relative' }}>
                          <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 700, color: 'var(--text-dim)' }}>Rp</span>
                          <input type="number" value={cashInput} onChange={e => setCashInput(e.target.value)}
                            required style={{ ...inputStyle, paddingLeft: 30 }} />
                        </div>
                      </div>
                      <button type="submit" style={{
                        width: '100%', padding: 14, borderRadius: 12, border: 'none',
                        background: 'var(--accent-green)', color: '#0f1117',
                        fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 800,
                        cursor: 'pointer',
                      }}>Simpan</button>
                    </form>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
};

export default TradeJournal;
