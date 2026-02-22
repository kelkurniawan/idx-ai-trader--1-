import React from 'react';
import { TrendDirection } from '../types';

interface TrendAnalysisProps {
  trendShort: TrendDirection;
  trendMedium: TrendDirection;
  trendLong: TrendDirection;
  ma50: number;
  ma200: number;
  currentPrice: number;
}

const TrendPill: React.FC<{ label: string; trend: TrendDirection }> = ({ label, trend }) => {
  const config = {
    BULLISH: {
      bg: 'bg-emerald-50 dark:bg-emerald-500/10',
      border: 'border-emerald-200/60 dark:border-emerald-500/20',
      text: 'text-emerald-700 dark:text-emerald-400',
      badge: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-300',
      icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>,
    },
    BEARISH: {
      bg: 'bg-red-50 dark:bg-red-500/10',
      border: 'border-red-200/60 dark:border-red-500/20',
      text: 'text-red-700 dark:text-red-400',
      badge: 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-300',
      icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" /></svg>,
    },
    NEUTRAL: {
      bg: 'bg-amber-50 dark:bg-amber-500/8',
      border: 'border-amber-200/60 dark:border-amber-500/20',
      text: 'text-amber-700 dark:text-amber-400',
      badge: 'bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-300',
      icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 12h14" /></svg>,
    },
  }[trend] || {
    bg: 'bg-slate-50 dark:bg-slate-800',
    border: 'border-slate-200 dark:border-slate-700',
    text: 'text-slate-600 dark:text-slate-400',
    badge: 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400',
    icon: null,
  };

  return (
    <div className={`flex items-center justify-between p-3.5 rounded-xl border ${config.bg} ${config.border} transition-all hover:scale-[1.01]`}>
      <span className={`text-sm font-bold ${config.text}`}>{label}</span>
      <div className="flex items-center gap-2">
        <span className={`text-[10px] font-black tracking-wider px-2.5 py-1 rounded-lg ${config.badge}`}>{trend}</span>
        <span className={config.text}>{config.icon}</span>
      </div>
    </div>
  );
};

const TrendAnalysis: React.FC<TrendAnalysisProps> = ({
  trendShort, trendMedium, trendLong, ma50, ma200, currentPrice
}) => {

  const diffMa50 = ((currentPrice - ma50) / ma50) * 100;
  const diffMa200 = ((currentPrice - ma200) / ma200) * 100;

  return (
    <div className="glass-card rounded-2xl p-6 relative overflow-hidden animate-slide-up h-full">
      {/* Gradient accent */}
      <div className="absolute top-0 left-0 right-0 h-1 accent-blue rounded-t-2xl" />

      <h3 className="text-slate-800 dark:text-slate-100 text-sm font-black uppercase tracking-widest mb-5 flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center">
          <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        Trend Analysis
      </h3>

      <div className="space-y-2.5">
        <TrendPill label="Short Term (MA20)" trend={trendShort} />
        <TrendPill label="Mid Term (MA50)" trend={trendMedium} />
        <TrendPill label="Long Term (MA200)" trend={trendLong} />
      </div>

      <div className="mt-5 pt-5 border-t border-slate-200/60 dark:border-slate-700/40 grid grid-cols-2 gap-4">
        <div>
          <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">vs MA50</div>
          <div className={`font-mono text-lg font-black ${diffMa50 >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
            {diffMa50 >= 0 ? '+' : ''}{diffMa50.toFixed(2)}%
          </div>
          {/* Visual bar */}
          <div className="mt-1.5 h-1 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${diffMa50 >= 0 ? 'bg-emerald-500' : 'bg-red-500'}`}
              style={{ width: `${Math.min(Math.abs(diffMa50) * 5, 100)}%` }}
            />
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">vs MA200</div>
          <div className={`font-mono text-lg font-black ${diffMa200 >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
            {diffMa200 >= 0 ? '+' : ''}{diffMa200.toFixed(2)}%
          </div>
          {/* Visual bar */}
          <div className="mt-1.5 h-1 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ml-auto ${diffMa200 >= 0 ? 'bg-emerald-500' : 'bg-red-500'}`}
              style={{ width: `${Math.min(Math.abs(diffMa200) * 5, 100)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrendAnalysis;