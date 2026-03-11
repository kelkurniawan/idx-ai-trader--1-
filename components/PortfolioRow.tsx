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

/* ── Sector colour helper ── */
const SECTOR_COLORS: Record<string, string> = {
  Financials:  '#3b82f6',
  Energy:      '#f59e0b',
  Technology:  '#7c3aed',
  Industrials: '#06b6d4',
  Consumer:    '#ec4899',
  Healthcare:  '#22c55e',
  Mining:      '#a78bfa',
  Infra:       '#f97316',
};
function sectorChipStyle(sector: string) {
  const c = SECTOR_COLORS[sector] ?? '#64748b';
  return { color: c, background: c + '2e', border: `1px solid ${c}54` };
}

/* ── Alert Price Modal ── */
interface AlertModalProps {
  ticker: string;
  currentTarget: number | undefined;
  onSave: (price: number | undefined) => void;
  onClose: () => void;
}
const AlertModal: React.FC<AlertModalProps> = ({ ticker, currentTarget, onSave, onClose }) => {
  const [editVal, setEditVal] = useState(currentTarget?.toString() ?? '');

  const handleSave = () => {
    const parsed = parseFloat(editVal);
    onSave(isNaN(parsed) ? undefined : parsed);
    onClose();
  };
  const handleClear = () => { onSave(undefined); onClose(); };

  // Close on overlay click
  const handleOverlay = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      onClick={handleOverlay}
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        background: 'rgba(0,0,0,0.65)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-strong)',
        borderRadius: 18, padding: 24,
        width: 'min(320px, 90vw)',
        display: 'flex', flexDirection: 'column', gap: 16,
      }}>
        {/* Title */}
        <div>
          <h3 style={{ fontFamily: 'var(--font-sans)', fontSize: 15, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
            Set Signal Alert
          </h3>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', margin: '4px 0 0' }}>
            Alert when{' '}
            <span style={{ color: 'var(--accent-green)', fontWeight: 700 }}>{ticker}</span>
            {' '}reaches your target price.
          </p>
        </div>

        {/* Price input */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'var(--bg-muted)', border: '1px solid var(--border)',
          borderRadius: 10, padding: '10px 14px',
        }}>
          <span style={{ fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 700, color: 'var(--text-dim)', flexShrink: 0 }}>Rp</span>
          <input
            type="number"
            value={editVal}
            onChange={e => setEditVal(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSave()}
            autoFocus
            placeholder="0"
            style={{
              flex: 1, border: 'none', background: 'transparent', outline: 'none',
              fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700,
              color: 'var(--text-primary)',
            }}
          />
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8 }}>
          {currentTarget && (
            <button onClick={handleClear} style={{
              flex: 1, background: 'var(--accent-red-bg)',
              border: '1px solid var(--accent-red-border)',
              borderRadius: 10, padding: '10px 0',
              fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 700,
              color: 'var(--accent-red)', cursor: 'pointer',
            }}>Clear</button>
          )}
          <button onClick={onClose} style={{
            flex: 1, background: 'var(--bg-muted)',
            border: '1px solid var(--border)',
            borderRadius: 10, padding: '10px 0',
            fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 700,
            color: 'var(--text-muted)', cursor: 'pointer',
          }}>Cancel</button>
          <button onClick={handleSave} style={{
            flex: 1, background: 'var(--accent-green-bg)',
            border: '1px solid var(--accent-green-border)',
            borderRadius: 10, padding: '10px 0',
            fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 700,
            color: 'var(--accent-green)', cursor: 'pointer',
          }}>Set Alert</button>
        </div>
      </div>
    </div>
  );
};

/* ── Main component ── */
const PortfolioRow: React.FC<PortfolioRowProps> = ({
  ticker, onRemove, onAnalyze, onUpdateTarget, targetPrice, delay = 0,
}) => {
  const [data, setData] = useState<RealTimeMarketData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      if (delay > 0) await new Promise(r => setTimeout(r, delay));
      try {
        const result = await getRealTimeStockData(ticker);
        if (isMounted) { setData(result); setLoading(false); }
      } catch {
        console.warn(`PortfolioRow: Could not fetch data for ${ticker}`);
        if (isMounted) setLoading(false);
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => { isMounted = false; clearInterval(interval); };
  }, [ticker, delay]);

  const isAlert = !!(data && targetPrice && data.price >= targetPrice);
  const profile = SAMPLE_IDX_STOCKS.find(s => s.ticker === ticker);
  const indices = IDX_STOCK_INDICES.filter(idx => (idx.tickers as readonly string[]).includes(ticker));

  /* card border */
  const cardBorder = isAlert
    ? '1px solid var(--accent-green-border)'
    : '1px solid var(--border)';
  const cardShadow = isAlert
    ? '0 0 0 1px var(--accent-green-border)'
    : 'none';

  return (
    <>
      {/* ── Card ── */}
      <div style={{
        background: 'var(--bg-surface)',
        border: cardBorder,
        boxShadow: cardShadow,
        borderRadius: 14,
        padding: '16px',
        display: 'flex',
        gap: 16,
        transition: 'border-color 0.15s, box-shadow 0.15s',
      }}>

        {/* Left: Avatar */}
        <div style={{
          width: 48, height: 48, borderRadius: 12, flexShrink: 0,
          background: 'var(--bg-muted)',
          border: '1px solid var(--border-strong)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 800,
          color: 'var(--text-primary)', textAlign: 'center', lineHeight: 1.1,
        }}>
          {ticker}
        </div>

        {/* Right: Content */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }}>
          
          {/* Top Row: Info & Price */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
              <span style={{
                fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 800,
                color: 'var(--text-primary)', lineHeight: 1,
              }}>{ticker}</span>
              <span style={{
                fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 500,
                color: 'var(--text-muted)', whiteSpace: 'nowrap',
                overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.2,
              }}>{profile?.name ?? 'IDX Market'}</span>
            </div>

            {loading ? (
              <div style={{ width: 88, height: 36, background: 'var(--bg-muted)', borderRadius: 8, animation: 'pulse 1.5s ease-in-out infinite' }} />
            ) : data ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                <span style={{
                  fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 800,
                  color: 'var(--text-primary)', lineHeight: 1,
                }}>
                  Rp {data.price.toLocaleString('id-ID')}
                </span>
                <span style={{
                  fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700,
                  color: data.change >= 0 ? 'var(--accent-green)' : 'var(--accent-red)', lineHeight: 1,
                }}>
                  {data.change >= 0 ? '+' : ''}{data.changePercent}%
                </span>
              </div>
            ) : (
              <span style={{
                fontSize: 11, fontWeight: 700, color: 'var(--accent-red)',
                background: 'var(--accent-red-bg)', padding: '4px 8px', borderRadius: 6,
              }}>Offline</span>
            )}
          </div>

          {/* Bottom Row: Tags & Actions */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16 }}>
            
            {/* Tags */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, flex: 1 }}>
              {profile?.sector && profile.sector !== 'Unknown' && (() => {
                const cs = sectorChipStyle(profile.sector);
                return (
                  <span style={{
                    ...cs, padding: '3px 8px', borderRadius: 6,
                    fontFamily: 'var(--font-sans)', fontSize: 10, fontWeight: 800,
                    letterSpacing: '0.5px',
                    display: 'inline-flex', alignItems: 'center', gap: 3,
                  }}>
                    #{profile.sector}
                  </span>
                );
              })()}
              {indices.map(idx => (
                <span key={idx.id} style={{
                  background: 'var(--bg-muted)',
                  border: '1px solid var(--border-strong)',
                  color: 'var(--text-dim)',
                  padding: '3px 8px', borderRadius: 6,
                  fontFamily: 'var(--font-sans)', fontSize: 10, fontWeight: 700,
                  letterSpacing: '0.5px', textTransform: 'uppercase' as const,
                  display: 'inline-flex', alignItems: 'center',
                }}>
                  {idx.label}
                </span>
              ))}
            </div>

            {/* Alerts & Actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              
              {/* Alert */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                <span style={{
                  fontFamily: 'var(--font-sans)', fontSize: 9, fontWeight: 800,
                  color: 'var(--text-dim)', letterSpacing: '0.5px', textTransform: 'uppercase' as const, lineHeight: 1,
                }}>Signal Alert</span>
                <div
                  onClick={() => setShowModal(true)}
                  style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                >
                  <span style={{
                    fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 600,
                    color: isAlert ? 'var(--accent-gold)' : targetPrice ? 'var(--accent-green)' : 'var(--text-dim)',
                    animation: isAlert ? 'pulse 1.5s ease-in-out infinite' : undefined, lineHeight: 1,
                  }}>
                    {targetPrice ? `Rp ${targetPrice.toLocaleString('id-ID')}` : 'Set Price'}
                  </span>
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24"
                    stroke={isAlert ? 'var(--accent-gold)' : targetPrice ? 'var(--accent-green)' : 'var(--accent-red)'} strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round"
                      d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => onAnalyze(ticker)}
                  title="Analyze"
                  style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: 'transparent', border: '1px solid var(--accent-green-border)',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'var(--accent-green)', transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--accent-green-bg)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 17l6-6 4 4 8-8" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14 7h7v7" />
                  </svg>
                </button>
                <button
                  onClick={() => onRemove(ticker)}
                  title="Remove"
                  style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: 'transparent', border: '1px solid var(--accent-red-border)',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'var(--accent-red)', transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--accent-red-bg)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* ── Alert confirmation strip ── */}
      {targetPrice !== undefined && !isAlert && (
        <div style={{
          marginTop: 4, padding: '7px 12px', borderRadius: 8,
          background: 'var(--accent-green-bg)', border: '1px solid var(--accent-green-border)',
          fontFamily: 'var(--font-sans)', fontSize: 10, fontWeight: 600,
          color: 'var(--accent-green)',
        }}>
          🔔 Alert set at Rp {targetPrice.toLocaleString('id-ID')}
        </div>
      )}
      {isAlert && (
        <div style={{
          marginTop: 4, padding: '7px 12px', borderRadius: 8,
          background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.33)',
          fontFamily: 'var(--font-sans)', fontSize: 10, fontWeight: 700,
          color: 'var(--accent-gold)',
        }}>
          🚨 Price alert triggered! Rp {targetPrice!.toLocaleString('id-ID')} reached.
        </div>
      )}

      {/* ── Alert modal ── */}
      {showModal && (
        <AlertModal
          ticker={ticker}
          currentTarget={targetPrice}
          onSave={(price) => onUpdateTarget(ticker, price)}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
};

export default PortfolioRow;
