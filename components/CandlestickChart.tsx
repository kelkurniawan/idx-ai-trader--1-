import React, { useEffect, useRef } from 'react';
import { createChart, ColorType, CandlestickData, Time, IChartApi, CandlestickSeries } from 'lightweight-charts';
import { OHLCDataPoint, TimeFrame } from '../types';

interface CandlestickChartProps {
    data: OHLCDataPoint[];
    timeFrame?: TimeFrame;
}

const CandlestickChart: React.FC<CandlestickChartProps> = ({ data, timeFrame = '3M' }) => {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);

    useEffect(() => {
        if (!chartContainerRef.current) return;

        // Remove previous chart instance
        if (chartRef.current) {
            chartRef.current.remove();
            chartRef.current = null;
        }

        const container = chartContainerRef.current;

        const chart = createChart(container, {
            layout: {
                background: { type: ColorType.Solid, color: 'transparent' },
                textColor: '#94a3b8',
                fontSize: 10,
            },
            grid: {
                vertLines: { visible: false },
                horzLines: { color: '#334155', style: 1 },
            },
            width: container.clientWidth,
            height: container.clientHeight,
            rightPriceScale: {
                borderVisible: false,
                scaleMargins: { top: 0.1, bottom: 0.1 },
            },
            timeScale: {
                borderVisible: false,
                timeVisible: timeFrame === '1D',
                secondsVisible: false,
                fixLeftEdge: true,
                fixRightEdge: true,
            },
            crosshair: {
                vertLine: { color: '#475569', width: 1, style: 2, labelBackgroundColor: '#1e293b' },
                horzLine: { color: '#475569', width: 1, style: 2, labelBackgroundColor: '#1e293b' },
            },
            handleScroll: { mouseWheel: true, pressedMouseMove: true },
            handleScale: { mouseWheel: true, pinch: true },
        });

        chartRef.current = chart;

        // v5 API: chart.addSeries(CandlestickSeries, options)
        const candleSeries = chart.addSeries(CandlestickSeries, {
            upColor: '#10b981',
            downColor: '#ef4444',
            borderUpColor: '#10b981',
            borderDownColor: '#ef4444',
            wickUpColor: '#10b981',
            wickDownColor: '#ef4444',
        });

        // Format data for lightweight-charts
        const isIntraday = timeFrame === '1D';
        const formattedData: CandlestickData<Time>[] = data.map((d) => {
            const time = isIntraday
                ? (Math.floor(new Date(d.date).getTime() / 1000) as Time)
                : (d.date as Time); // 'YYYY-MM-DD' format is directly accepted

            return {
                time,
                open: d.open,
                high: d.high,
                low: d.low,
                close: d.close,
            };
        });

        candleSeries.setData(formattedData);
        chart.timeScale().fitContent();

        // Resize observer
        const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const { width, height } = entry.contentRect;
                chart.applyOptions({ width, height });
            }
        });
        resizeObserver.observe(container);

        return () => {
            resizeObserver.disconnect();
            if (chartRef.current) {
                chartRef.current.remove();
                chartRef.current = null;
            }
        };
    }, [data, timeFrame]);

    return (
        <div
            ref={chartContainerRef}
            className="w-full h-full"
            style={{ minHeight: '250px' }}
        />
    );
};

export default CandlestickChart;
