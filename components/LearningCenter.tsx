
import React, { useState, useMemo } from 'react';

interface Article {
  id: string;
  title: string;
  category: string;
  readTime: string;
  description: string;
  icon: string;
  color: string;
  content: React.ReactNode;
}

/* ── Category colour helper ── */
const CATEGORY_COLORS: Record<string, string> = {
  'Technical Analysis': '#6366f1',
  'Indicators':         '#7c3aed',
  'Strategy':           '#22c55e',
  'Fundamental':        '#f59e0b',
  'Psychology':         '#ec4899',
  'Macroeconomics':     '#06b6d4',
};
function catColor(cat: string): string { return CATEGORY_COLORS[cat] ?? '#64748b'; }

/* ── Static article data — unchanged ── */
const ARTICLES: Article[] = [
  {
    id: 'candlestick-patterns',
    title: 'Mastering Candlestick Patterns',
    category: 'Technical Analysis',
    readTime: '5 min',
    description: 'Learn to read the market sentiment through the most common and powerful candlestick formations.',
    icon: '🕯️',
    color: 'indigo',
    content: (
      <div className="space-y-6 text-slate-700 leading-relaxed">
        <p>Candlestick charts are the language of the market. Originating from Japan over 300 years ago, they provide more information than a simple line chart by showing the Open, High, Low, and Close prices for a specific period.</p>
        <h3 className="text-xl font-bold text-slate-900 mt-6">The Anatomy of a Candle</h3>
        <p>A candle consists of a <strong>Body</strong> and <strong>Wicks</strong> (or Shadows). The body represents the range between the open and close prices. The wicks show the extreme high and low prices during that period.</p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Green Candle:</strong> The close was higher than the open (Bullish).</li>
          <li><strong>Red Candle:</strong> The close was lower than the open (Bearish).</li>
        </ul>
        <h3 className="text-xl font-bold text-slate-900 mt-6">Key Patterns to Watch</h3>
        <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
          <h4 className="font-bold text-emerald-600">The Hammer (Bullish)</h4>
          <p className="text-sm mt-1">A small body at the top with a long lower wick. This suggests that sellers pushed the price down, but buyers rejected the low and pushed it back up. Often seen at the bottom of a downtrend.</p>
        </div>
        <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
          <h4 className="font-bold text-red-600">Shooting Star (Bearish)</h4>
          <p className="text-sm mt-1">The opposite of a hammer. A small body at the bottom with a long upper wick. Occurs at the top of an uptrend, indicating buyers lost control to sellers.</p>
        </div>
        <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
          <h4 className="font-bold text-indigo-600">Engulfing Patterns</h4>
          <p className="text-sm mt-1">When a candle's body completely covers (engulfs) the previous candle's body. A <strong>Bullish Engulfing</strong> (Green eats Red) signals strong buying pressure. A <strong>Bearish Engulfing</strong> (Red eats Green) signals strong selling pressure.</p>
        </div>
      </div>
    ),
  },
  {
    id: 'technical-indicators',
    title: 'Intro to RSI & MACD',
    category: 'Indicators',
    readTime: '7 min',
    description: 'Decode the two most popular momentum indicators to identify entry and exit points with precision.',
    icon: '📊',
    color: 'violet',
    content: (
      <div className="space-y-6 text-slate-700 leading-relaxed">
        <p>Technical indicators are mathematical calculations based on historical price, volume, or open interest information that aims to forecast financial market direction.</p>
        <h3 className="text-xl font-bold text-slate-900 mt-6">RSI (Relative Strength Index)</h3>
        <p>The RSI is a momentum oscillator that measures the speed and change of price movements. It oscillates between 0 and 100.</p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Overbought (&gt;70):</strong> The asset might be overvalued and due for a correction or pullback.</li>
          <li><strong>Oversold (&lt;30):</strong> The asset might be undervalued and due for a bounce or reversal.</li>
        </ul>
        <div className="p-4 bg-yellow-50 border-l-4 border-yellow-400 text-sm text-yellow-800">
          <strong>Pro Tip:</strong> In strong trends, RSI can stay overbought or oversold for long periods. Don't trade solely on these levels; wait for a confirmation signal like a trendline break.
        </div>
        <h3 className="text-xl font-bold text-slate-900 mt-6">MACD (Moving Average Convergence Divergence)</h3>
        <p>MACD is a trend-following momentum indicator that shows the relationship between two moving averages of a security's price.</p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>The MACD Line:</strong> Derived from the difference between the 12-day EMA and 26-day EMA.</li>
          <li><strong>The Signal Line:</strong> A 9-day EMA of the MACD Line.</li>
          <li><strong>Histogram:</strong> The difference between the MACD line and the Signal line.</li>
        </ul>
        <p className="mt-2"><strong>Buy Signal:</strong> When the MACD line crosses <em>above</em> the Signal line.<br /><strong>Sell Signal:</strong> When the MACD line crosses <em>below</em> the Signal line.</p>
      </div>
    ),
  },
  {
    id: 'risk-management',
    title: 'The Art of Risk Management',
    category: 'Strategy',
    readTime: '6 min',
    description: 'Survival is the first goal of trading. Learn how to protect your capital using professional risk strategies.',
    icon: '🛡️',
    color: 'emerald',
    content: (
      <div className="space-y-6 text-slate-700 leading-relaxed">
        <p>You can have the best trading strategy in the world, but without risk management, you will eventually blow up your account. Risk management is the safety net that keeps you in the game.</p>
        <h3 className="text-xl font-bold text-slate-900 mt-6">The 1% Rule</h3>
        <p>Never risk more than 1% (or at most 2%) of your total trading capital on a single trade. This doesn't mean you only buy 1% worth of stock; it means if your stop loss is hit, you only lose 1% of your total account balance.</p>
        <h3 className="text-xl font-bold text-slate-900 mt-6">Position Sizing</h3>
        <p>To follow the 1% rule, you need to calculate your position size based on your Stop Loss.</p>
        <code className="block bg-slate-900 text-emerald-400 p-4 rounded-lg text-sm font-mono my-4">
          Position Size = (Account Balance × Risk %) / (Entry Price - Stop Loss Price)
        </code>
        <h3 className="text-xl font-bold text-slate-900 mt-6">Risk-to-Reward Ratio (RR)</h3>
        <p>Always aim for a positive RR, ideally 1:2 or higher. This means for every dollar you risk losing, you aim to make two dollars.</p>
        <ul className="list-disc pl-5 space-y-2">
          <li>If you risk $100 to make $200, you only need to be right 33% of the time to break even.</li>
          <li>If you risk $100 to make $50, you need to be right 66% of the time just to break even!</li>
        </ul>
        <div className="mt-6 p-4 bg-red-50 border border-red-100 rounded-xl text-red-800 text-sm">
          <strong>The Golden Rule:</strong> "Cut your losses short, and let your winners run." Most beginners do the exact opposite—they hold losing trades hoping they come back, and take profits too early on winning trades out of fear.
        </div>
      </div>
    ),
  },
];

const ALL_CATEGORIES = ['All', ...Array.from(new Set(ARTICLES.map(a => a.category)))];

/* ══════════════════════════════════════════════════════════
   LEARNING CENTER COMPONENT
══════════════════════════════════════════════════════════ */
const LearningCenter: React.FC = () => {
  const [activeArticle, setActiveArticle] = useState<Article | null>(null);
  const [activeCategory, setActiveCategory] = useState('All');

  const filtered = useMemo(() =>
    activeCategory === 'All' ? ARTICLES : ARTICLES.filter(a => a.category === activeCategory),
    [activeCategory]
  );

  /* ── Article Reader ── */
  if (activeArticle) {
    const cc = catColor(activeArticle.category);
    return (
      <div className="animate-fade-in" style={{ paddingBottom: 88 }}>
        {/* Back button */}
        <button
          onClick={() => setActiveArticle(null)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 700,
            color: 'var(--text-muted)', padding: 0, marginBottom: 20,
            display: 'flex', alignItems: 'center', gap: 4,
          }}
        >← Kembali ke Learning Hub</button>

        {/* Reader header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14, flexShrink: 0,
            background: `linear-gradient(135deg, ${cc}22, ${cc}44)`,
            border: `1px solid ${cc}44`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 26,
          }}>{activeArticle.icon}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Category chip */}
            <span style={{
              display: 'inline-block', padding: '3px 8px', borderRadius: 999, marginBottom: 6,
              background: cc + '1e', border: `1px solid ${cc}3d`, color: cc,
              fontFamily: 'var(--font-sans)', fontSize: 8.5, fontWeight: 700,
              letterSpacing: '0.5px', textTransform: 'uppercase' as const,
            }}>{activeArticle.category}</span>
            <h1 style={{
              fontFamily: 'var(--font-sans)', fontSize: 20, fontWeight: 800,
              letterSpacing: '-0.2px', color: 'var(--text-primary)', margin: 0,
            }}>{activeArticle.title}</h1>
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: 10.5, fontWeight: 600, color: 'var(--text-muted)' }}>
              ⏱ {activeArticle.readTime}
            </span>
          </div>
        </div>

        {/* Body card */}
        <div style={{
          background: 'var(--bg-surface)', border: '1px solid var(--border)',
          borderRadius: 16, padding: 18, marginBottom: 16,
          fontFamily: 'var(--font-sans)', fontSize: 12.5, lineHeight: '1.75',
          color: 'var(--text-second)',
        }}>
          {activeArticle.content}
        </div>

        {/* Key Takeaway box */}
        <div style={{
          background: 'var(--bg-muted)', borderLeft: `3px solid ${cc}`,
          borderRadius: '0 10px 10px 0', padding: '12px 14px', marginBottom: 16,
        }}>
          <p style={{
            fontFamily: 'var(--font-sans)', fontSize: 10, fontWeight: 800,
            color: cc, letterSpacing: '0.8px', textTransform: 'uppercase' as const, margin: '0 0 6px',
          }}>💡 Key Takeaway</p>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 500, color: 'var(--text-second)', margin: 0, lineHeight: '1.6' }}>
            {activeArticle.description}
          </p>
        </div>

        {/* Disclaimer strip */}
        <div style={{
          background: 'var(--accent-gold-bg)', border: '1px solid var(--accent-gold-border)',
          borderRadius: 10, padding: '10px 14px',
          fontFamily: 'var(--font-sans)', fontSize: 10, fontWeight: 500,
          color: 'var(--accent-gold-text)', lineHeight: '1.4',
        }}>
          ⚠️ Konten ini hanya bersifat edukatif dan bukan merupakan saran investasi. Selalu lakukan riset mandiri sebelum mengambil keputusan trading.
        </div>
      </div>
    );
  }

  /* ── Course list ── */
  return (
    <div className="animate-fade-in" style={{ paddingBottom: 88 }}>
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 12, flexShrink: 0,
          background: 'linear-gradient(135deg, rgba(245,158,11,0.18), rgba(245,158,11,0.36))',
          border: '1px solid var(--accent-gold-border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="var(--accent-gold)" strokeWidth={2}>
            <path d="M12 14l9-5-9-5-9 5 9 5z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0112 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" />
          </svg>
        </div>
        <div>
          <h2 style={{ fontFamily: 'var(--font-sans)', fontSize: 18, fontWeight: 800, letterSpacing: '-0.3px', color: 'var(--text-primary)', margin: 0 }}>
            Learning Hub
          </h2>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', margin: '2px 0 0' }}>
            Master the markets with expert guides
          </p>
        </div>
      </div>

      {/* Filter chips — horizontal scroll */}
      <div style={{
        display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4,
        marginBottom: 16, scrollbarWidth: 'none', msOverflowStyle: 'none' as unknown as string,
      }}
        className="scrollbar-hide"
      >
        {ALL_CATEGORIES.map(cat => {
          const active = activeCategory === cat;
          return (
            <button key={cat} onClick={() => setActiveCategory(cat)} style={{
              padding: '6px 14px', borderRadius: 999,
              border: active ? '1px solid var(--accent-green-border)' : '1px solid var(--border)',
              background: active ? 'var(--accent-green-bg)' : 'transparent',
              color: active ? 'var(--accent-green)' : 'var(--text-muted)',
              fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 700,
              letterSpacing: '0.3px', whiteSpace: 'nowrap' as const, cursor: 'pointer',
              transition: 'all 0.15s',
            }}>{cat}</button>
          );
        })}
      </div>

      {/* Course card list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filtered.map(article => {
          const cc = catColor(article.category);
          return (
            <div
              key={article.id}
              onClick={() => setActiveArticle(article)}
              style={{
                background: 'var(--bg-surface)', border: '1px solid var(--border)',
                borderRadius: 14, padding: '14px 16px',
                display: 'flex', alignItems: 'flex-start', gap: 12,
                cursor: 'pointer', transition: 'border-color 0.15s, transform 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = cc + '66'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              {/* Icon block */}
              <div style={{
                width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                background: `linear-gradient(135deg, ${cc}22, ${cc}44)`,
                border: `1px solid ${cc}44`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 22,
              }}>{article.icon}</div>

              {/* Content column */}
              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 5 }}>
                {/* Category chip */}
                <span style={{
                  display: 'inline-block', width: 'fit-content', padding: '3px 8px', borderRadius: 999,
                  background: cc + '1e', border: `1px solid ${cc}3d`, color: cc,
                  fontFamily: 'var(--font-sans)', fontSize: 8.5, fontWeight: 700,
                  letterSpacing: '0.5px', textTransform: 'uppercase' as const,
                }}>{article.category}</span>

                {/* Title */}
                <span style={{ fontFamily: 'var(--font-sans)', fontSize: 13.5, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.4 }}>
                  {article.title}
                </span>

                {/* Description */}
                <span style={{
                  fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 500,
                  color: 'var(--text-second)', lineHeight: 1.6,
                  display: '-webkit-box', WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical' as const, overflow: 'hidden',
                }}>{article.description}</span>

                {/* Footer row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}>
                  <span style={{ fontFamily: 'var(--font-sans)', fontSize: 10.5, fontWeight: 600, color: 'var(--text-muted)' }}>
                    ⏱ {article.readTime}
                  </span>
                  <span style={{ fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 700, color: cc }}>
                    Read Now →
                  </span>
                </div>
              </div>
            </div>
          );
        })}

        {/* Coming Soon card */}
        <div style={{
          border: '1.5px dashed var(--border)', borderRadius: 14, padding: '20px 16px',
          display: 'flex', alignItems: 'center', gap: 12, opacity: 0.55,
        }}>
          <span style={{ fontSize: 28, flexShrink: 0 }}>🚀</span>
          <div>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              More Coming Soon
            </p>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: 10.5, fontWeight: 500, color: 'var(--text-muted)', margin: '2px 0 0' }}>
              New courses added weekly
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LearningCenter;
