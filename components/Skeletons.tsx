import React from 'react';

export const HeaderPriceSkeleton = () => (
  <div className="flex flex-col items-start lg:items-end animate-pulse">
    <div className="h-8 md:h-10 w-32 md:w-48 bg-slate-800 rounded-lg mb-2"></div>
    <div className="h-4 md:h-5 w-20 md:w-24 bg-slate-800/60 rounded-lg"></div>
  </div>
);

export const GaugeSkeleton = () => (
  <div className="bg-slate-800/30 border border-slate-700 rounded-2xl md:rounded-3xl p-5 md:p-8 backdrop-blur-sm h-[300px] md:h-[400px] animate-pulse relative overflow-hidden flex flex-col">
    <div className="h-5 md:h-6 w-24 md:w-32 bg-slate-700/50 rounded mb-6 md:mb-8"></div>

    <div className="flex-1 flex items-center justify-center relative">
      <div className="w-40 h-20 md:w-48 md:h-24 bg-slate-800 rounded-t-full border-t-[16px] border-x-[16px] md:border-t-[20px] md:border-x-[20px] border-slate-700/50 border-b-0 opacity-50"></div>
    </div>

    <div className="space-y-4 md:space-y-6 mt-6 md:mt-8">
      <div className="flex justify-between items-center border-b border-slate-700/30 pb-2 md:pb-3">
        <div className="h-3 md:h-4 w-12 md:w-16 bg-slate-700/50 rounded"></div>
        <div className="h-3 md:h-4 w-16 md:w-24 bg-slate-700/50 rounded"></div>
      </div>
      <div className="flex justify-between items-center border-b border-slate-700/30 pb-2 md:pb-3">
        <div className="h-4 w-16 bg-slate-700/50 rounded"></div>
        <div className="h-4 w-24 bg-slate-700/50 rounded"></div>
      </div>
      <div className="flex justify-between items-center">
        <div className="h-4 w-16 bg-slate-700/50 rounded"></div>
        <div className="h-4 w-20 bg-slate-700/50 rounded"></div>
      </div>
    </div>
  </div>
);

export const TrendSkeleton = () => (
  <div className="bg-slate-800/30 border border-slate-700 rounded-2xl md:rounded-3xl p-5 md:p-8 animate-pulse min-h-[280px] flex flex-col justify-between">
    <div>
      <div className="h-4 md:h-5 w-24 md:w-32 bg-slate-700/50 rounded mb-4 md:mb-6"></div>
      <div className="space-y-3 md:space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="flex items-center justify-between p-2 md:p-3 rounded-lg border border-slate-700/30 bg-slate-700/20">
            <div className="h-3 md:h-4 w-20 md:w-24 bg-slate-700/50 rounded"></div>
            <div className="h-3 md:h-4 w-12 md:w-16 bg-slate-700/50 rounded"></div>
          </div>
        ))}
      </div>
    </div>
    <div className="mt-4 pt-4 border-t border-slate-700/30 flex justify-between gap-4">
      <div>
        <div className="h-2 md:h-3 w-10 md:w-12 bg-slate-700/30 rounded mb-2"></div>
        <div className="h-3 md:h-4 w-12 md:w-16 bg-slate-700/50 rounded"></div>
      </div>
      <div className="text-right flex flex-col items-end">
        <div className="h-2 md:h-3 w-10 md:w-12 bg-slate-700/30 rounded mb-2"></div>
        <div className="h-3 md:h-4 w-12 md:w-16 bg-slate-700/50 rounded"></div>
      </div>
    </div>
  </div>
);

export const ChartSkeleton = () => (
  <div className="lg:col-span-2 flex flex-col gap-4 md:gap-6 animate-pulse">
    {/* Chart Area */}
    <div className="w-full h-[250px] md:h-[350px] bg-slate-800/30 rounded-2xl md:rounded-3xl border border-slate-700 p-4 md:p-6 relative overflow-hidden">
      <div className="h-3 md:h-4 w-24 md:w-32 bg-slate-700/50 rounded mb-6 md:mb-8"></div>
      <div className="flex items-end justify-between space-x-1 md:space-x-2 h-[150px] md:h-[250px] opacity-30">
        {/* Simulated graph bars/wave */}
        <div className="w-full bg-slate-600 rounded-t h-[30%]"></div>
        <div className="w-full bg-slate-600 rounded-t h-[50%]"></div>
        <div className="w-full bg-slate-600 rounded-t h-[40%]"></div>
        <div className="w-full bg-slate-600 rounded-t h-[70%]"></div>
        <div className="w-full bg-slate-600 rounded-t h-[55%]"></div>
        <div className="w-full bg-slate-600 rounded-t h-[80%]"></div>
        <div className="w-full bg-slate-600 rounded-t h-[60%]"></div>
        <div className="w-full bg-slate-600 rounded-t h-[40%]"></div>
      </div>
    </div>
    {/* Indicators Row */}
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-3 md:p-4 h-20 md:h-24 flex flex-col justify-center">
          <div className="h-2 md:h-3 w-12 md:w-16 bg-slate-700/50 rounded mb-2 md:mb-3"></div>
          <div className="h-4 md:h-6 w-16 md:w-24 bg-slate-700/50 rounded"></div>
        </div>
      ))}
    </div>
  </div>
);

export const AnalysisSkeleton = () => (
  <div className="bg-slate-800/30 border border-slate-700 rounded-2xl md:rounded-3xl p-5 md:p-8 mt-6 relative overflow-hidden h-[400px]">
    <div className="animate-pulse space-y-6 opacity-30">
      <div className="h-8 w-48 bg-slate-700/50 rounded"></div>
      <div className="space-y-3">
        <div className="h-4 w-full bg-slate-700/30 rounded"></div>
        <div className="h-4 w-full bg-slate-700/30 rounded"></div>
        <div className="h-4 w-2/3 bg-slate-700/30 rounded"></div>
      </div>
      <div className="hidden md:grid md:grid-cols-3 gap-6 pt-2">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-32 bg-slate-700/20 rounded-lg border border-slate-700/30"></div>
        ))}
      </div>
    </div>

    {/* Analyzing Badge Overlay */}
    <div className="absolute inset-0 flex items-center justify-center p-4">
      <div className="flex flex-col sm:flex-row items-center gap-3 px-6 py-4 bg-slate-900/90 rounded-2xl sm:rounded-full border border-emerald-500/30 shadow-2xl backdrop-blur-md max-w-[90%] text-center">
        <svg className="animate-spin h-6 w-6 text-emerald-500 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span className="text-sm text-emerald-100 font-bold tracking-wide animate-pulse leading-snug">Gemini AI is analyzing market data...</span>
      </div>
    </div>
  </div>
);