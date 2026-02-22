import React from 'react';
import { SignalType } from '../types';

interface GaugeProps {
  signal: SignalType;
  confidence: number;
}

const Gauge: React.FC<GaugeProps> = ({ signal, confidence }) => {
  let baseAngle = 0;
  let label = 'NEUTRAL';
  let colorLight = 'text-slate-500';
  let colorDark = 'dark:text-slate-400';

  switch (signal) {
    case SignalType.STRONG_SELL:
      baseAngle = -75;
      colorLight = 'text-red-600'; colorDark = 'dark:text-red-400';
      label = 'STRONG SELL';
      break;
    case SignalType.SELL:
      baseAngle = -45;
      colorLight = 'text-red-500'; colorDark = 'dark:text-red-400';
      label = 'SELL';
      break;
    case SignalType.NEUTRAL:
      baseAngle = 0;
      colorLight = 'text-amber-600'; colorDark = 'dark:text-amber-400';
      label = 'NEUTRAL';
      break;
    case SignalType.BUY:
      baseAngle = 45;
      colorLight = 'text-emerald-600'; colorDark = 'dark:text-emerald-400';
      label = 'BUY';
      break;
    case SignalType.STRONG_BUY:
      baseAngle = 75;
      colorLight = 'text-emerald-600'; colorDark = 'dark:text-emerald-400';
      label = 'STRONG BUY';
      break;
  }

  const rotation = baseAngle;

  // Confidence ring — percentage of a full circle
  const circumference = 2 * Math.PI * 16;
  const strokeDashoffset = circumference - (confidence / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center p-6 relative">
      <div className="relative w-64 h-32 overflow-hidden">
        {/* SVG Gauge */}
        <div className="absolute top-0 left-0 w-full h-full">
          <svg viewBox="0 0 100 50" className="w-full h-full transform translate-y-1">
            {/* Background arc — theme-aware */}
            <path
              d="M 10 50 A 40 40 0 0 1 90 50"
              fill="none"
              className="stroke-slate-200 dark:stroke-slate-700"
              strokeWidth="12"
              strokeLinecap="round"
            />
            {/* Gradient arc — red → amber → green */}
            <defs>
              <linearGradient id="gauge-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#ef4444" />
                <stop offset="25%" stopColor="#f97316" />
                <stop offset="50%" stopColor="#eab308" />
                <stop offset="75%" stopColor="#22c55e" />
                <stop offset="100%" stopColor="#10b981" />
              </linearGradient>
            </defs>
            <path
              d="M 10 50 A 40 40 0 0 1 90 50"
              fill="none"
              stroke="url(#gauge-gradient)"
              strokeWidth="12"
              strokeLinecap="round"
              strokeOpacity="0.8"
            />
          </svg>
        </div>

        {/* Needle — theme-aware */}
        <div
          className="absolute bottom-0 left-1/2 w-1 h-28 bg-slate-800 dark:bg-white origin-bottom rounded-full shadow-lg transition-transform duration-1000 ease-out"
          style={{
            transform: `translateX(-50%) rotate(${rotation}deg)`,
            zIndex: 10
          }}
        >
          {/* Pivot */}
          <div className="absolute bottom-0 left-1/2 w-4 h-4 bg-slate-800 dark:bg-white rounded-full transform -translate-x-1/2 translate-y-1/2 shadow-md ring-4 ring-slate-100 dark:ring-slate-800"></div>
        </div>
      </div>

      <div className="mt-4 text-center">
        <h3 className={`text-2xl font-black ${colorLight} ${colorDark} tracking-wider`}>{label}</h3>

        {/* Confidence ring */}
        <div className="mt-3 flex items-center justify-center gap-2">
          <svg className="w-8 h-8 -rotate-90" viewBox="0 0 36 36">
            <circle cx="18" cy="18" r="16" fill="none" className="stroke-slate-200 dark:stroke-slate-700" strokeWidth="3" />
            <circle
              cx="18" cy="18" r="16"
              fill="none"
              className="stroke-indigo-500"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              style={{ transition: 'stroke-dashoffset 1s ease-out' }}
            />
          </svg>
          <span className="text-slate-500 dark:text-slate-400 text-sm font-bold">
            {confidence}%
            <span className="text-[9px] text-slate-400 dark:text-slate-500 ml-1 uppercase tracking-widest">conf</span>
          </span>
        </div>
      </div>
    </div>
  );
};

export default Gauge;