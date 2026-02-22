
import React, { useState } from 'react';

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
        )
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
                    <li><strong>Overbought (&gt;70):</strong> he asset might be overvalued and due for a correction or pullback.</li>
                    <li><strong>Oversold (&lt;30):</strong> The asset might be undervalued and due for a bounce or reversal.</li>
                </ul>
                <div className="p-4 bg-yellow-50 border-l-4 border-yellow-400 text-sm text-yellow-800">
                    <strong>Pro Tip:</strong> In strong trends, RSI can stay overbought or oversold for long periods. Don't trade solely on these levels; wait for a confirmation signal like a trendline break.
                </div>

                <h3 className="text-xl font-bold text-slate-900 mt-6">MACD (Moving Average Convergence Divergence)</h3>
                <p>MACD is a trend-following momentum indicator that shows the relationship between two moving averages of a security’s price.</p>
                <ul className="list-disc pl-5 space-y-2">
                    <li><strong>The MACD Line:</strong> Derived from the difference between the 12-day EMA and 26-day EMA.</li>
                    <li><strong>The Signal Line:</strong> A 9-day EMA of the MACD Line.</li>
                    <li><strong>Histogram:</strong> The difference between the MACD line and the Signal line.</li>
                </ul>
                <p className="mt-2"><strong>Buy Signal:</strong> When the MACD line crosses <em>above</em> the Signal line.<br /><strong>Sell Signal:</strong> When the MACD line crosses <em>below</em> the Signal line.</p>
            </div>
        )
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
        )
    }
];

const LearningCenter: React.FC = () => {
    const [activeArticle, setActiveArticle] = useState<Article | null>(null);

    return (
        <div className="animate-fade-in pb-12">
            <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 bg-amber-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-amber-100">
                    <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path d="M12 14l9-5-9-5-9 5 9 5z" />
                        <path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" />
                    </svg>
                </div>
                <div>
                    <h2 className="text-3xl font-black text-slate-800 tracking-tight">Learning Hub</h2>
                    <p className="text-slate-500 font-medium">Master the markets with expert guides</p>
                </div>
            </div>

            {!activeArticle ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {ARTICLES.map((article) => (
                        <div
                            key={article.id}
                            onClick={() => setActiveArticle(article)}
                            className="bg-white border border-slate-200 rounded-3xl p-6 hover:shadow-xl hover:shadow-indigo-500/10 hover:border-indigo-300 transition-all cursor-pointer group flex flex-col h-full active:scale-95"
                        >
                            <div className="flex justify-between items-start mb-6">
                                <div className={`w-12 h-12 rounded-2xl bg-${article.color}-50 flex items-center justify-center text-2xl shadow-inner border border-${article.color}-100`}>
                                    {article.icon}
                                </div>
                                <span className={`px-3 py-1 bg-${article.color}-50 text-${article.color}-600 text-[10px] font-black uppercase tracking-widest rounded-full border border-${article.color}-100`}>
                                    {article.category}
                                </span>
                            </div>

                            <h3 className="text-xl font-black text-slate-800 mb-3 group-hover:text-indigo-600 transition-colors">{article.title}</h3>
                            <p className="text-slate-500 text-sm leading-relaxed mb-6 flex-grow">{article.description}</p>

                            <div className="flex items-center justify-between pt-6 border-t border-slate-50 mt-auto">
                                <div className="flex items-center gap-2 text-slate-400 text-xs font-bold">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    {article.readTime} Read
                                </div>
                                <span className="text-indigo-600 text-sm font-black flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                                    Read Now <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                                </span>
                            </div>
                        </div>
                    ))}

                    {/* Placeholder for future content */}
                    <div className="border-2 border-dashed border-slate-200 rounded-3xl p-6 flex flex-col items-center justify-center text-center opacity-60">
                        <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-xl mb-4">🚀</div>
                        <h3 className="font-bold text-slate-800">More Coming Soon</h3>
                        <p className="text-xs text-slate-400 mt-1">New courses added weekly</p>
                    </div>
                </div>
            ) : (
                <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm animate-fade-in">
                    <div className="border-b border-slate-100 bg-slate-50/50 p-6 flex items-center gap-4 sticky top-0 backdrop-blur-md z-10">
                        <button
                            onClick={() => setActiveArticle(null)}
                            className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 hover:border-slate-300 transition-all shadow-sm"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                        </button>
                        <div>
                            <span className={`text-[10px] font-black uppercase tracking-widest text-${activeArticle.color}-600 block`}>{activeArticle.category}</span>
                            <h1 className="text-xl font-black text-slate-800">{activeArticle.title}</h1>
                        </div>
                    </div>

                    <div className="p-8 md:p-12 max-w-4xl mx-auto">
                        <div className="prose prose-slate prose-lg max-w-none">
                            {activeArticle.content}
                        </div>

                        <div className="mt-12 pt-8 border-t border-slate-100 flex justify-between items-center">
                            <p className="text-slate-400 text-sm italic">Did you find this guide helpful?</p>
                            <button
                                onClick={() => setActiveArticle(null)}
                                className="px-6 py-3 bg-indigo-50 text-indigo-600 font-black rounded-xl hover:bg-indigo-100 transition-colors"
                            >
                                Back to Hub
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LearningCenter;
