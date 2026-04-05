import React from 'react';
import { Activity, Target, ShieldCheck, Zap, History, BookOpen, Star, ChevronRight, CheckCircle2 } from 'lucide-react';

interface LandingPageProps {
  onLogin: () => void;
  onGetStarted: (plan?: 'FREE' | 'PRO' | 'EXPERT') => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onLogin, onGetStarted }) => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 font-sans selection:bg-emerald-500/30">
      
      {/* ─────────────────────────────────────────────────────────────────
          NAVIGATION BAR
      ────────────────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 w-full z-50 bg-slate-950/80 backdrop-blur-md border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <span className="font-mono font-black text-slate-950 text-sm">SG</span>
            </div>
            <div>
              <h1 className="font-black tracking-tight text-lg text-white">sahamgue</h1>
              <p className="text-[9px] font-bold uppercase tracking-widest text-emerald-500">IDX AI Trader</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => onLogin()} className="text-sm font-bold text-slate-300 hover:text-white transition-colors">
              Log in
            </button>
            <button onClick={() => onGetStarted()} className="text-sm font-bold bg-white text-slate-950 px-5 py-2.5 rounded-full hover:bg-slate-200 transition-colors hidden sm:block">
              Get Started
            </button>
          </div>
        </div>
      </nav>

      {/* ─────────────────────────────────────────────────────────────────
          HERO SECTION
      ────────────────────────────────────────────────────────────────── */}
      <section className="relative pt-40 pb-20 lg:pt-48 lg:pb-32 px-6 overflow-hidden">
        {/* Background glow effects */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/10 blur-[100px] rounded-full pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-emerald-400 text-xs font-bold uppercase tracking-widest mb-8 animate-fade-in">
            <Zap className="w-4 h-4" /> Version 2.0 Live
          </div>
          
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-8 leading-[1.1]">
            Trade the <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">Indonesian Market</span> with AI Precision.
          </h1>
          
          <p className="text-lg md:text-xl text-slate-400 font-medium mb-12 max-w-2xl mx-auto leading-relaxed">
            Stop guessing. SahamGue strips away the noise, delivering institutional-grade technical analysis, instant market scanning, and portfolio journaling for retail IDX traders.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button onClick={() => onGetStarted('PRO')} className="w-full sm:w-auto px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-full text-lg transition-transform active:scale-95 flex items-center justify-center gap-2">
              Start Free Trial <ChevronRight className="w-5 h-5" />
            </button>
            <button onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })} className="w-full sm:w-auto px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold rounded-full text-lg transition-colors">
              See How It Works
            </button>
          </div>
          <p className="mt-6 text-sm text-slate-500 font-medium">No credit card required for the Free Tier.</p>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────
          SERVICES / FEATURES SECTION
      ────────────────────────────────────────────────────────────────── */}
      <section id="features" className="py-24 px-6 bg-slate-900 border-y border-white/5 relative">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-black mb-4">The Ultimate Trading Ecosystem</h2>
            <p className="text-slate-400 max-w-xl mx-auto">Everything you need to analyze, execute, and track your trades in the Bursa Efek Indonesia.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-slate-950 border border-white/10 p-8 rounded-3xl hover:border-emerald-500/30 transition-colors group">
              <div className="w-14 h-14 bg-emerald-500/10 text-emerald-400 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Target className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold mb-3">Market IQ Scanner</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Instantly scan all 900+ IDX stocks. Filter by sector or index (LQ45, IDX30) to find breakout structures and momentum setups in seconds.
              </p>
            </div>

            <div className="bg-slate-950 border border-white/10 p-8 rounded-3xl hover:border-emerald-500/30 transition-colors group">
              <div className="w-14 h-14 bg-indigo-500/10 text-indigo-400 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Activity className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold mb-3">Deep AI Analysis</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Tired of drawing endless lines? Our AI reads the charts for you, summarizing MACD, RSI, and moving averages into clear actionable verdicts.
              </p>
            </div>

            <div className="bg-slate-950 border border-white/10 p-8 rounded-3xl hover:border-emerald-500/30 transition-colors group">
              <div className="w-14 h-14 bg-amber-500/10 text-amber-400 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <History className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold mb-3">Trade Journaling</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Log your buy/sell executions, automatically calculate IDX lot maths and broker fees, and track your historical performance beautifully.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────
          BENEFITS SECTION
      ────────────────────────────────────────────────────────────────── */}
      <section className="py-24 px-6 relative overflow-hidden">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-16">
          <div className="flex-1">
            <h2 className="text-4xl md:text-5xl font-black mb-6 leading-tight">Remove Emotion. <br />Trade on <span className="text-emerald-400">Data.</span></h2>
            <p className="text-lg text-slate-400 mb-8 max-w-lg">
              Human psychology is a trader's biggest enemy. SahamGue acts as your objective companion, validating your trade ideas with raw quantitative data before you pull the trigger.
            </p>
            
            <ul className="space-y-4">
              <li className="flex items-center gap-3 text-slate-300">
                <ShieldCheck className="w-6 h-6 text-emerald-400 flex-shrink-0" />
                <span>Avoid bad setups triggered by FOMO.</span>
              </li>
              <li className="flex items-center gap-3 text-slate-300">
                <ShieldCheck className="w-6 h-6 text-emerald-400 flex-shrink-0" />
                <span>Save 2+ hours daily on manual chart reading.</span>
              </li>
              <li className="flex items-center gap-3 text-slate-300">
                <ShieldCheck className="w-6 h-6 text-emerald-400 flex-shrink-0" />
                <span>Consolidate your tools: Screener, analysis, and journal in one app.</span>
              </li>
            </ul>
          </div>
          <div className="flex-1 relative w-full aspect-square md:aspect-[4/3] bg-gradient-to-tr from-slate-900 to-slate-800 rounded-3xl border border-white/10 shadow-2xl p-6 md:p-10 flex items-center justify-center">
            {/* Abstract visual representation of UI */}
            <div className="w-full h-full relative">
              <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:30px_30px] rounded-xl [mask-image:radial-gradient(ellipse_at_center,black,transparent_80%)]" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-emerald-500/20 blur-3xl rounded-full" />
              <div className="relative z-10 w-full h-full border border-white/10 bg-slate-950/80 backdrop-blur-sm rounded-2xl p-6 shadow-2xl flex flex-col gap-4">
                <div className="h-6 w-32 bg-slate-800 rounded-md animate-pulse" />
                <div className="flex-1 flex items-end gap-3 px-2">
                  {[40, 65, 45, 80, 55, 90, 70].map((h, i) => (
                    <div key={i} className="flex-1 rounded-t-sm bg-gradient-to-t from-emerald-600/50 to-emerald-400/80" style={{ height: `${h}%` }} />
                  ))}
                </div>
                <div className="h-20 w-full bg-slate-800/50 rounded-xl mt-auto" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────
          TESTIMONIALS
      ────────────────────────────────────────────────────────────────── */}
      <section className="py-24 px-6 bg-slate-900 border-y border-white/5">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-3xl font-black mb-16">Trusted by Indonesian Traders</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { text: "This app totally changed my approach to Swing Trading. I used to subscribe to signal groups, but now the AI Scanner finds the setups for me instantly.", name: "Budi P.", role: "Retail Trader" },
              { text: "The Trade Journaling feature alone is worth it. It automatically counts my IDX lot sizes and standard fees, finally letting me see my real win rate.", name: "Siska A.", role: "Part-time Investor" },
              { text: "As a beginner, looking at candlestick charts was intimidating. SahamGue's fundamental and technical verdicts make complex data beautifully readable.", name: "Reza F.", role: "Student" }
            ].map((t, idx) => (
              <div key={idx} className="bg-slate-950 p-8 rounded-3xl border border-white/10 text-left relative">
                <div className="flex gap-1 mb-6 text-amber-500">
                  <Star className="w-4 h-4 fill-current" /><Star className="w-4 h-4 fill-current" /><Star className="w-4 h-4 fill-current" /><Star className="w-4 h-4 fill-current" /><Star className="w-4 h-4 fill-current" />
                </div>
                <p className="text-slate-300 mb-8 italic">"{t.text}"</p>
                <div className="mt-auto">
                  <p className="font-bold text-white">{t.name}</p>
                  <p className="text-xs text-slate-500">{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────
          PRICING
      ────────────────────────────────────────────────────────────────── */}
      <section id="pricing" className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black mb-4">Simple, Transparent Pricing</h2>
            <p className="text-slate-400">Choose the plan that suits your trading journey.</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 items-center">
            {/* Free Plan */}
            <div className="bg-slate-900 border border-white/10 p-8 rounded-3xl">
              <h3 className="text-xl font-bold mb-2 text-slate-300">Free Tier</h3>
              <div className="text-3xl font-black mb-6">Rp 0<span className="text-sm text-slate-500 font-medium">/mo</span></div>
              <ul className="space-y-4 mb-8">
                <li className="flex items-center gap-3 text-sm text-slate-400"><CheckCircle2 className="w-5 h-5 text-slate-600" /> Delayed Quotes (EOD)</li>
                <li className="flex items-center gap-3 text-sm text-slate-400"><CheckCircle2 className="w-5 h-5 text-slate-600" /> Basic Market Scanner</li>
                <li className="flex items-center gap-3 text-sm text-slate-400"><CheckCircle2 className="w-5 h-5 text-slate-600" /> Public Watchlists</li>
              </ul>
              <button onClick={() => onGetStarted('FREE')} className="w-full py-3 rounded-full font-bold bg-white/10 hover:bg-white/20 transition-colors">Start Free</button>
            </div>

            {/* Pro Plan */}
            <div className="bg-gradient-to-b from-slate-800 to-slate-900 border-2 border-emerald-500 p-8 rounded-3xl relative transform md:-translate-y-4 shadow-2xl shadow-emerald-500/10">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-emerald-500 text-slate-950 text-xs font-black px-4 py-1 rounded-full uppercase tracking-widest">Most Popular</div>
              <h3 className="text-xl font-bold mb-2 text-emerald-400">Pro Trader</h3>
              <div className="text-4xl font-black mb-2">Rp 49k<span className="text-lg text-slate-500 font-medium">/mo</span></div>
              <p className="text-xs text-emerald-500 mb-6 font-bold">Includes 1-Month Free Trial</p>
              <ul className="space-y-4 mb-8">
                <li className="flex items-center gap-3 text-sm"><CheckCircle2 className="w-5 h-5 text-emerald-500" /> Real-time Intraday Data</li>
                <li className="flex items-center gap-3 text-sm"><CheckCircle2 className="w-5 h-5 text-emerald-500" /> Full AI Analysis Quotas</li>
                <li className="flex items-center gap-3 text-sm"><CheckCircle2 className="w-5 h-5 text-emerald-500" /> Advanced Trade Journaling</li>
                <li className="flex items-center gap-3 text-sm"><CheckCircle2 className="w-5 h-5 text-emerald-500" /> Portfolio Tracking</li>
              </ul>
              <button onClick={() => onGetStarted('PRO')} className="w-full py-4 rounded-full font-black bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-colors">Choose Pro</button>
            </div>

            {/* Expert Plan */}
            <div className="bg-slate-900 border border-white/10 p-8 rounded-3xl">
              <h3 className="text-xl font-bold mb-2 text-indigo-400">Expert</h3>
              <div className="text-3xl font-black mb-6">Rp 149k<span className="text-sm text-slate-500 font-medium">/mo</span></div>
              <ul className="space-y-4 mb-8">
                <li className="flex items-center gap-3 text-sm text-slate-300"><CheckCircle2 className="w-5 h-5 text-indigo-500" /> Everything in Pro</li>
                <li className="flex items-center gap-3 text-sm text-slate-300"><CheckCircle2 className="w-5 h-5 text-indigo-500" /> Priority API Access</li>
                <li className="flex items-center gap-3 text-sm text-slate-300"><CheckCircle2 className="w-5 h-5 text-indigo-500" /> Export Trades to CSV</li>
              </ul>
              <button onClick={() => onGetStarted('EXPERT')} className="w-full py-3 rounded-full font-bold bg-white/10 hover:bg-white/20 transition-colors">Choose Expert</button>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────
          FOOTER
      ────────────────────────────────────────────────────────────────── */}
      <footer className="py-8 border-t border-white/5 text-center text-slate-500 text-sm">
        <div className="flex items-center justify-center gap-2 mb-4">
          <div className="w-6 h-6 rounded-md bg-emerald-500 flex items-center justify-center grayscale opacity-50">
            <span className="font-mono font-black text-slate-950 text-[8px]">SG</span>
          </div>
          <span className="font-black">SahamGue</span>
        </div>
        <p>&copy; {new Date().getFullYear()} SahamGue. All rights reserved.</p>
        <p className="mt-2 text-xs opacity-50">Data powered by IDX. AI analysis is not financial advice.</p>
      </footer>

    </div>
  );
};

export default LandingPage;
