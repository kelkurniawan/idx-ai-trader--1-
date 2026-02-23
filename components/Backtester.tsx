
import React, { useState, useMemo } from 'react';
import {
   AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import {
   BacktestResult, BacktestStrategy, StockProfile, SAMPLE_IDX_STOCKS
} from '../types';
import { runBacktestSimulation } from '../services/marketDataService';

const StrategyCard = ({
   id, title, desc, active, onClick
}: { id: BacktestStrategy, title: string, desc: string, active: boolean, onClick: () => void }) => (
   <div
      onClick={onClick}
      className={`p-4 rounded-xl border cursor-pointer transition-all ${active
            ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-200'
            : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300 hover:bg-indigo-50'
         }`}
   >
      <h4 className="font-black text-sm mb-1">{title}</h4>
      <p className={`text-xs ${active ? 'text-indigo-100' : 'text-slate-400'}`}>{desc}</p>
   </div>
);

const MetricCard = ({ label, value, sub, color = 'slate' }: any) => (
   <div className={`bg-white border border-slate-200 rounded-2xl p-4 md:p-5 shadow-sm border-l-4 border-l-${color}-500`}>
      <p className="text-[9px] md:text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">{label}</p>
      <p className="text-xl md:text-2xl font-black text-slate-800 tracking-tight whitespace-nowrap overflow-hidden text-ellipsis leading-tight">{value}</p>
      {sub && <p className={`text-xs font-bold mt-1 text-${color}-500`}>{sub}</p>}
   </div>
);

const Backtester: React.FC = () => {
   const [selectedStock, setSelectedStock] = useState<StockProfile>(SAMPLE_IDX_STOCKS[0]);
   const [strategy, setStrategy] = useState<BacktestStrategy>('SMA_CROSSOVER');
   const [duration, setDuration] = useState<number>(365);
   const [initialCapital, setInitialCapital] = useState<number>(10000000); // 10M IDR default
   const [result, setResult] = useState<BacktestResult | null>(null);
   const [isRunning, setIsRunning] = useState(false);

   const handleRun = () => {
      setIsRunning(true);
      // Simulate processing time for UX
      setTimeout(() => {
         const res = runBacktestSimulation(selectedStock.ticker, strategy, initialCapital, duration);
         setResult(res);
         setIsRunning(false);
      }, 800);
   };

   const formatIDR = (num: number) => {
      return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num);
   };

   return (
      <div className="animate-fade-in pb-12">
         <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4 mb-6 md:mb-8">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-amber-500 rounded-xl md:rounded-2xl flex items-center justify-center text-white shadow-lg shadow-amber-100 flex-shrink-0">
               <svg className="w-5 h-5 md:w-7 md:h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
               </svg>
            </div>
            <div>
               <h2 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">Strategy Backtester</h2>
               <p className="text-slate-500 font-medium text-xs md:text-sm">Test trading logic on historical IDX data</p>
            </div>
         </div>

         <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
            {/* CONFIGURATION PANEL */}
            <div className="lg:col-span-1 space-y-4 md:space-y-6">
               <div className="bg-white border border-slate-200 rounded-2xl md:rounded-3xl p-5 md:p-6 shadow-sm">
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide mb-4 md:mb-6">Configuration</h3>

                  <div className="space-y-5 md:space-y-6">
                     <div>
                        <label className="block text-[10px] md:text-xs font-bold text-slate-400 mb-1.5 md:mb-2 uppercase tracking-wider">Select Asset</label>
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-3 gap-2">
                           {SAMPLE_IDX_STOCKS.slice(0, 6).map(s => (
                              <button
                                 key={s.ticker}
                                 onClick={() => setSelectedStock(s)}
                                 className={`min-h-touch px-2 md:px-3 py-1.5 md:py-2 text-[10px] md:text-xs font-black rounded-lg border transition-all active:scale-[0.98] ${selectedStock.ticker === s.ticker ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}
                              >
                                 {s.ticker}
                              </button>
                           ))}
                        </div>
                     </div>

                     <div>
                        <label className="block text-[10px] md:text-xs font-bold text-slate-400 mb-1.5 md:mb-2 uppercase tracking-wider">Strategy Logic</label>
                        <div className="space-y-2 md:space-y-3">
                           <StrategyCard
                              id="SMA_CROSSOVER"
                              title="SMA Crossover"
                              desc="Buy when Short MA crosses Long MA."
                              active={strategy === 'SMA_CROSSOVER'}
                              onClick={() => setStrategy('SMA_CROSSOVER')}
                           />
                           <StrategyCard
                              id="RSI_REVERSAL"
                              title="RSI Reversal"
                              desc="Mean reversion on overbought/oversold."
                              active={strategy === 'RSI_REVERSAL'}
                              onClick={() => setStrategy('RSI_REVERSAL')}
                           />
                           <StrategyCard
                              id="MOMENTUM_AI"
                              title="AI Momentum (Sim)"
                              desc="Algorithmic trend following with volume weight."
                              active={strategy === 'MOMENTUM_AI'}
                              onClick={() => setStrategy('MOMENTUM_AI')}
                           />
                        </div>
                     </div>

                     <div>
                        <label className="block text-[10px] md:text-xs font-bold text-slate-400 mb-1.5 md:mb-2 uppercase tracking-wider">Initial Capital</label>
                        <div className="relative">
                           <span className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-[10px] md:text-xs">Rp</span>
                           <input
                              type="number"
                              value={initialCapital}
                              onChange={(e) => setInitialCapital(Number(e.target.value))}
                              className="w-full pl-8 md:pl-10 pr-4 py-3 min-h-input bg-slate-50 border border-slate-200 rounded-xl text-xs md:text-sm font-black text-slate-800 focus:outline-none focus:border-indigo-500"
                           />
                        </div>
                     </div>

                     <button
                        onClick={handleRun}
                        disabled={isRunning}
                        className="w-full py-3.5 md:py-4 min-h-touch bg-amber-500 hover:bg-amber-600 text-white font-black rounded-xl shadow-lg shadow-amber-100 transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm md:text-base mt-2"
                     >
                        {isRunning ? (
                           <>
                              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                              Running...
                           </>
                        ) : 'Run Backtest'}
                     </button>
                  </div>
               </div>
            </div>

            {/* RESULTS PANEL */}
            <div className="lg:col-span-2 space-y-6">
               {result ? (
                  <div className="space-y-6 animate-fade-in">
                     {/* Metrics Grid */}
                     <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <MetricCard
                           label="Total Return"
                           value={formatIDR(result.totalReturn)}
                           sub={`${result.totalReturnPercent.toFixed(2)}%`}
                           color={result.totalReturn >= 0 ? 'emerald' : 'red'}
                        />
                        <MetricCard
                           label="Win Rate"
                           value={`${result.winRate.toFixed(1)}%`}
                           sub={`${result.totalTrades} Trades`}
                           color="indigo"
                        />
                        <MetricCard
                           label="Max Drawdown"
                           value={`-${result.maxDrawdown.toFixed(2)}%`}
                           color="rose"
                        />
                        <MetricCard
                           label="Final Balance"
                           value={new Intl.NumberFormat('id-ID', { notation: "compact", compactDisplay: "short" }).format(result.finalBalance)}
                           color="amber"
                        />
                     </div>

                     {/* Equity Chart */}
                     <div className="bg-white border border-slate-200 rounded-2xl md:rounded-3xl p-4 md:p-6 shadow-sm">
                        <h3 className="text-xs md:text-sm font-black text-slate-800 uppercase tracking-wide mb-4 md:mb-6">Equity Curve</h3>
                        <div className="h-[250px] md:h-[300px] w-full">
                           <ResponsiveContainer width="100%" height="100%">
                              <AreaChart data={result.equityCurve} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                 <defs>
                                    <linearGradient id="colorEquity" x1="0" y1="0" x2="0" y2="1">
                                       <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                                       <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                                    </linearGradient>
                                 </defs>
                                 <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                 <XAxis
                                    dataKey="date"
                                    tick={{ fill: '#94a3b8', fontSize: 10 }}
                                    tickFormatter={(val) => new Date(val).toLocaleDateString('id-ID', { month: 'short' })}
                                    axisLine={false}
                                    tickLine={false}
                                    minTickGap={20}
                                 />
                                 <YAxis
                                    domain={['auto', 'auto']}
                                    tick={{ fill: '#94a3b8', fontSize: 10 }}
                                    axisLine={false}
                                    tickLine={false}
                                    width={35}
                                    tickFormatter={(val) => new Intl.NumberFormat('en-US', { notation: "compact", compactDisplay: "short" }).format(val)}
                                 />
                                 <Tooltip
                                    contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                                    itemStyle={{ color: '#fbbf24' }}
                                    formatter={(val: number) => [formatIDR(val), 'Equity']}
                                    labelFormatter={(label) => new Date(label).toLocaleDateString()}
                                 />
                                 <Area type="monotone" dataKey="balance" stroke="#f59e0b" strokeWidth={2} md:strokeWidth={3} fillOpacity={1} fill="url(#colorEquity)" />
                              </AreaChart>
                           </ResponsiveContainer>
                        </div>
                     </div>

                     {/* Trade List */}
                     <div className="bg-white border border-slate-200 rounded-2xl md:rounded-3xl overflow-hidden shadow-sm flex flex-col">
                        <div className="p-4 md:p-6 border-b border-slate-100 flex-shrink-0">
                           <h3 className="text-xs md:text-sm font-black text-slate-800 uppercase tracking-wide">Trade Log</h3>
                        </div>
                        <div className="flex-1 min-h-[300px] max-h-[400px] overflow-auto">
                           <table className="w-full text-left inline-block min-w-max md:table md:min-w-0 align-top">
                              <thead className="bg-slate-50 sticky top-0 md:static z-10 w-full md:table-header-group box-border block">
                                 <tr className="flex md:table-row w-[150%] md:w-auto">
                                    <th className="p-3 md:p-4 text-[9px] md:text-[10px] font-black uppercase text-slate-400 tracking-wider flex-1 md:w-auto">Type</th>
                                    <th className="p-3 md:p-4 text-[9px] md:text-[10px] font-black uppercase text-slate-400 tracking-wider flex-1 md:w-auto">Entry</th>
                                    <th className="p-3 md:p-4 text-[9px] md:text-[10px] font-black uppercase text-slate-400 tracking-wider flex-1 md:w-auto">Exit</th>
                                    <th className="p-3 md:p-4 text-[9px] md:text-[10px] font-black uppercase text-slate-400 tracking-wider flex-1 md:w-auto text-right">PnL</th>
                                 </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 block md:table-row-group w-full md:w-auto overflow-x-hidden md:overflow-x-visible">
                                 {result.trades.map((trade) => (
                                    <tr key={trade.id} className="hover:bg-slate-50/50 transition-colors flex md:table-row w-[150%] md:w-auto">
                                       <td className="p-3 md:p-4 flex-1 md:w-auto flex items-center md:table-cell">
                                          <span className="text-[9px] md:text-[10px] font-black bg-emerald-100 text-emerald-600 px-1.5 md:px-2 py-0.5 md:py-1 rounded uppercase min-w-max">{trade.type}</span>
                                       </td>
                                       <td className="p-3 md:p-4 flex-1 md:w-auto flex flex-col justify-center md:table-cell">
                                          <div className="text-[10px] md:text-xs font-bold text-slate-700 whitespace-nowrap">Rp {trade.entryPrice.toLocaleString()}</div>
                                          <div className="text-[9px] md:text-[10px] text-slate-400 whitespace-nowrap">{trade.entryDate.split(',')[0]}</div>
                                       </td>
                                       <td className="p-3 md:p-4 flex-1 md:w-auto flex flex-col justify-center md:table-cell">
                                          <div className="text-[10px] md:text-xs font-bold text-slate-700 whitespace-nowrap">Rp {trade.exitPrice.toLocaleString()}</div>
                                          <div className="text-[9px] md:text-[10px] text-slate-400 whitespace-nowrap">{trade.exitDate.split(',')[0]}</div>
                                       </td>
                                       <td className="p-3 md:p-4 flex-1 md:w-auto text-right flex flex-col justify-center items-end md:table-cell">
                                          <div className={`text-[10px] md:text-xs font-black ${trade.pnl >= 0 ? 'text-emerald-500' : 'text-red-500'} whitespace-nowrap`}>
                                             {trade.pnl >= 0 ? '+' : ''}Rp {Math.abs(trade.pnl).toLocaleString()}
                                          </div>
                                          <div className={`text-[9px] md:text-[10px] font-bold ${trade.pnlPercent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                             {trade.pnlPercent.toFixed(2)}%
                                          </div>
                                       </td>
                                    </tr>
                                 ))}
                                 {result.trades.length === 0 && (
                                    <tr className="block py-8 w-[150%] md:w-auto md:table-row"><td colSpan={4} className="p-4 md:p-8 text-center text-slate-400 text-xs md:text-sm block md:table-cell">No trades executed with this configuration.</td></tr>
                                 )}
                              </tbody>
                           </table>
                        </div>
                     </div>
                  </div>
               ) : (
                  <div className="h-full min-h-[400px] flex flex-col items-center justify-center bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl text-center p-8">
                     <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center text-4xl shadow-sm mb-6">⚙️</div>
                     <h3 className="text-xl font-black text-slate-800">Ready to Simulate</h3>
                     <p className="text-slate-400 max-w-sm mt-2">Configure your strategy settings on the left and click "Run Backtest" to generate historical performance metrics.</p>
                  </div>
               )}
            </div>
         </div>
      </div>
   );
};

export default Backtester;
