
import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceDot,
  Label
} from 'recharts';
import { StockDataPoint, OHLCDataPoint, TimeFrame, TradeMarker, ChartMode } from '../types';
import CandlestickChart from './CandlestickChart';

interface ChartProps {
  data: StockDataPoint[];
  timeFrame?: TimeFrame;
  markers?: TradeMarker[];
  chartMode?: ChartMode;
  ohlcData?: OHLCDataPoint[];
  onChartModeChange?: (mode: ChartMode) => void;
}

const Chart: React.FC<ChartProps> = ({ data, timeFrame = '3M', markers, chartMode = 'line', ohlcData, onChartModeChange }) => {
  const isPositive = data.length > 0 && data[data.length - 1].price >= data[0].price;
  const color = isPositive ? '#10b981' : '#ef4444'; // Emerald or Red

  const isIntraday = timeFrame === '1D';

  const formatXAxis = (value: string) => {
    const date = new Date(value);
    if (isIntraday) {
      return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    }
    return `${date.getDate()}/${date.getMonth() + 1}`;
  };

  const formatTooltipDate = (label: string) => {
    const date = new Date(label);
    if (isIntraday) {
      return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString('id-ID', { dateStyle: 'medium' });
  };

  return (
    <div className="w-full h-[300px] md:h-[350px] bg-slate-100/50 dark:bg-slate-800/50 rounded-xl p-3 md:p-4 border border-slate-200 dark:border-slate-700 backdrop-blur-sm transition-all duration-500 flex flex-col text-slate-800 dark:text-slate-200">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">Price Action</h3>
        <span className="text-xs text-slate-400 dark:text-slate-500 font-mono">{timeFrame}</span>
      </div>

      {/* Conditional Chart Rendering */}
      {chartMode === 'candle' && ohlcData && ohlcData.length > 0 ? (
        <CandlestickChart data={ohlcData} timeFrame={timeFrame} />
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.15} vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fill: 'currentColor', fontSize: 10, opacity: 0.6 }}
              axisLine={false}
              tickLine={false}
              minTickGap={30}
              tickFormatter={formatXAxis}
            />
            <YAxis
              domain={['auto', 'auto']}
              tick={{ fill: 'currentColor', fontSize: 10, opacity: 0.6 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(val) => `Rp${val}`}
              width={60}
            />
            <Tooltip
              contentStyle={{ backgroundColor: 'var(--bg-surface, #1e293b)', borderColor: 'var(--border, #475569)', color: 'currentColor' }}
              itemStyle={{ color: 'currentColor' }}
              formatter={(value: number) => [`Rp ${value.toLocaleString('id-ID')}`, 'Price']}
              labelFormatter={formatTooltipDate}
            />
            <Area
              type="monotone"
              dataKey="price"
              stroke={color}
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorPrice)"
              isAnimationActive={true}
              animationDuration={1000}
              animationEasing="ease-in-out"
            />
            {markers && markers.map((marker, idx) => (
              <ReferenceDot
                key={idx}
                x={marker.date}
                y={marker.price}
                r={5}
                fill={marker.color}
                stroke="#fff"
                strokeWidth={2}
                ifOverflow="extendDomain"
              >
                <Label
                  value={marker.label}
                  position="top"
                  fill={marker.color}
                  fontSize={10}
                  fontWeight="900"
                  offset={10}
                />
              </ReferenceDot>
            ))}
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};

export default Chart;
