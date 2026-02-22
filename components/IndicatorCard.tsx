import React from 'react';

interface IndicatorCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  trend?: 'up' | 'down' | 'neutral';
  tooltip?: string;
}

const IndicatorCard: React.FC<IndicatorCardProps> = ({ label, value, subtext, trend, tooltip }) => {
  let valueColor = 'text-slate-800 dark:text-slate-100';
  let glowRing = '';
  let trendIcon = null;

  if (trend === 'up') {
    valueColor = 'text-emerald-600 dark:text-emerald-400';
    glowRing = 'ring-1 ring-emerald-200/50 dark:ring-emerald-500/20';
    trendIcon = (
      <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
      </svg>
    );
  }
  if (trend === 'down') {
    valueColor = 'text-red-600 dark:text-red-400';
    glowRing = 'ring-1 ring-red-200/50 dark:ring-red-500/20';
    trendIcon = (
      <svg className="w-3.5 h-3.5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
      </svg>
    );
  }

  return (
    <div className={`glass-card rounded-2xl p-4 flex flex-col items-center justify-center min-w-[100px] relative overflow-visible group transition-all duration-200 hover:scale-[1.03] ${glowRing}`}>
      <div className="flex items-center gap-1.5 mb-1.5 z-20">
        <span className="text-slate-400 dark:text-slate-500 text-[10px] uppercase font-black tracking-widest">{label}</span>

        {tooltip && (
          <div className="relative inline-block group/tooltip">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-3.5 w-3.5 text-slate-300 dark:text-slate-600 hover:text-slate-500 dark:hover:text-slate-400 cursor-help transition-colors"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>

            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-48 p-2.5 glass-card rounded-xl opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all duration-200 z-50 pointer-events-none">
              <p className="text-[10px] leading-relaxed text-slate-600 dark:text-slate-300 font-medium normal-case text-center">
                {tooltip}
              </p>
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-px border-4 border-transparent border-t-white/50 dark:border-t-slate-700/50"></div>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        <span className={`text-xl font-black tabular-nums ${valueColor}`}>{value}</span>
        {trendIcon}
      </div>
      {subtext && <span className="text-slate-400 dark:text-slate-500 text-[10px] mt-1 font-bold">{subtext}</span>}
    </div>
  );
};

export default IndicatorCard;