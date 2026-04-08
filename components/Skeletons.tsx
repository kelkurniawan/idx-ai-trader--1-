import React from 'react';

const SkeletonBlock = ({
  className = '',
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) => (
  <div
    style={style}
    className={`animate-pulse rounded-2xl bg-gradient-to-r from-slate-800/80 via-slate-700/60 to-slate-800/80 ${className}`}
  />
);

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

export const AppBootSkeleton = () => (
  <div className="min-h-screen bg-slate-950 text-slate-100 overflow-hidden">
    <div className="absolute inset-0 pointer-events-none">
      <div className="absolute inset-x-0 top-0 h-56 bg-gradient-to-b from-emerald-500/10 to-transparent" />
      <div className="absolute right-0 top-24 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl" />
      <div className="absolute left-0 bottom-0 h-80 w-80 rounded-full bg-emerald-400/10 blur-3xl" />
    </div>

    <div className="relative z-10 border-b border-white/5 bg-slate-950/70 backdrop-blur-md">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <SkeletonBlock className="h-10 w-10 rounded-xl" />
          <div className="space-y-2">
            <SkeletonBlock className="h-4 w-24 rounded-lg" />
            <SkeletonBlock className="h-2.5 w-20 rounded-lg" />
          </div>
        </div>
        <div className="hidden items-center gap-3 sm:flex">
          <SkeletonBlock className="h-10 w-20 rounded-full" />
          <SkeletonBlock className="h-10 w-28 rounded-full" />
        </div>
      </div>
    </div>

    <div className="mx-auto max-w-7xl px-6 pb-12 pt-12 lg:pt-16">
      <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
        <div className="space-y-5">
          <SkeletonBlock className="h-7 w-40 rounded-full" />
          <SkeletonBlock className="h-16 w-full max-w-2xl rounded-3xl" />
          <SkeletonBlock className="h-16 w-5/6 max-w-xl rounded-3xl" />
          <SkeletonBlock className="h-5 w-full max-w-xl rounded-xl" />
          <SkeletonBlock className="h-5 w-4/5 max-w-lg rounded-xl" />
          <div className="flex flex-col gap-3 sm:flex-row">
            <SkeletonBlock className="h-14 w-full sm:w-44 rounded-full" />
            <SkeletonBlock className="h-14 w-full sm:w-40 rounded-full" />
          </div>
        </div>

        <div className="rounded-[32px] border border-white/10 bg-white/5 p-6">
          <SkeletonBlock className="h-4 w-32 rounded-lg" />
          <div className="mt-6 flex h-64 items-end gap-3 rounded-[24px] border border-white/5 bg-slate-900/80 p-5">
            {[32, 54, 46, 72, 60, 84, 68].map((height, index) => (
              <SkeletonBlock
                key={index}
                className="flex-1 rounded-t-2xl rounded-b-md"
                style={{ height: `${height}%` } as React.CSSProperties}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="mt-12 grid gap-6 md:grid-cols-3">
        {[1, 2, 3].map((item) => (
          <div key={item} className="rounded-[28px] border border-white/10 bg-slate-900/80 p-6">
            <SkeletonBlock className="h-12 w-12 rounded-2xl" />
            <SkeletonBlock className="mt-6 h-6 w-32 rounded-xl" />
            <SkeletonBlock className="mt-4 h-4 w-full rounded-lg" />
            <SkeletonBlock className="mt-2 h-4 w-4/5 rounded-lg" />
            <SkeletonBlock className="mt-2 h-4 w-3/5 rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  </div>
);

export const ContentPanelSkeleton = ({ fullScreen = false }: { fullScreen?: boolean }) => (
  <div className={fullScreen ? 'min-h-screen bg-slate-950 px-6 py-8' : 'py-6 md:py-10'}>
    <div className="mx-auto max-w-6xl animate-pulse">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-3">
          <SkeletonBlock className="h-4 w-28 rounded-lg" />
          <SkeletonBlock className="h-9 w-64 rounded-2xl" />
        </div>
        <SkeletonBlock className="h-10 w-36 rounded-full" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[28px] border border-slate-800 bg-slate-900/80 p-6">
          <SkeletonBlock className="h-4 w-32 rounded-lg" />
          <SkeletonBlock className="mt-5 h-56 w-full rounded-[24px]" />
          <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-4">
            {[1, 2, 3, 4].map((item) => (
              <SkeletonBlock key={item} className="h-20 rounded-2xl" />
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-[28px] border border-slate-800 bg-slate-900/80 p-6">
            <SkeletonBlock className="h-4 w-24 rounded-lg" />
            <SkeletonBlock className="mt-5 h-28 w-full rounded-[24px]" />
            <SkeletonBlock className="mt-4 h-4 w-3/4 rounded-lg" />
            <SkeletonBlock className="mt-2 h-4 w-1/2 rounded-lg" />
          </div>
          <div className="rounded-[28px] border border-slate-800 bg-slate-900/80 p-6">
            <SkeletonBlock className="h-4 w-20 rounded-lg" />
            <div className="mt-5 space-y-3">
              {[1, 2, 3, 4].map((item) => (
                <div key={item} className="flex items-center gap-3">
                  <SkeletonBlock className="h-10 w-10 rounded-xl" />
                  <div className="flex-1 space-y-2">
                    <SkeletonBlock className="h-3 w-24 rounded-lg" />
                    <SkeletonBlock className="h-3 w-full rounded-lg" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

export const HomeDashboardSkeleton = () => (
  <div className="pb-28 lg:pb-12 animate-pulse">
    <div className="mb-5 px-4 md:px-0">
      <SkeletonBlock className="h-8 w-56 rounded-2xl" />
      <SkeletonBlock className="mt-3 h-3.5 w-48 rounded-xl" />
    </div>

    <div className="mb-5 -mx-4 md:mx-0 rounded-2xl border border-slate-800 bg-slate-900/80 px-4 py-3 md:px-5">
      <div className="flex gap-4 overflow-hidden">
        {[1, 2, 3, 4].map((item) => (
          <SkeletonBlock key={item} className="h-6 w-36 flex-shrink-0 rounded-full" />
        ))}
      </div>
    </div>

    <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
      {[1, 2].map((item) => (
        <div key={item} className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
          <SkeletonBlock className="h-3 w-28 rounded-lg" />
          <SkeletonBlock className="mt-4 h-8 w-44 rounded-2xl" />
          <div className="mt-4 grid grid-cols-3 gap-2">
            {[1, 2, 3].map((tile) => (
              <SkeletonBlock key={tile} className="h-14 rounded-xl" />
            ))}
          </div>
        </div>
      ))}
    </div>

    <div className="space-y-4">
      {[1, 2, 3].map((panel) => (
        <div key={panel} className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="space-y-2">
              <SkeletonBlock className="h-3 w-24 rounded-lg" />
              <SkeletonBlock className="h-5 w-40 rounded-xl" />
            </div>
            <SkeletonBlock className="h-8 w-24 rounded-full" />
          </div>
          <div className="space-y-3">
            {[1, 2, 3].map((row) => (
              <div key={row} className="flex items-center gap-3">
                <SkeletonBlock className="h-10 w-10 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <SkeletonBlock className="h-3 w-20 rounded-lg" />
                  <SkeletonBlock className="h-3 w-40 rounded-lg" />
                </div>
                <SkeletonBlock className="h-8 w-20 rounded-xl" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  </div>
);
