import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart, ReferenceDot } from 'recharts';
import { formatCurrency } from '@/utils/currency';
import { Sale } from '@/types';
import { TrendingUp } from 'lucide-react';
import { useDragPanWindow } from '@/hooks/useDragPanWindow';

interface EnhancedSalesTrendChartProps {
  sales: Sale[];
}

type TimeframeType = 'hourly' | 'daily' | 'monthly';

interface ChartDataPoint {
  label: string;
  revenue: number;
  timestamp: string;
  displayLabel: string;
}

const EnhancedSalesTrendChart: React.FC<EnhancedSalesTrendChartProps> = ({ sales }) => {
  const [timeframe, setTimeframe] = useState<TimeframeType>('daily');

  const chartData = useMemo((): ChartDataPoint[] => {
    const now = new Date();
    const dataMap = new Map<string, number>();

    if (timeframe === 'hourly') {
      // Extended history: last 72 hours (24h visible via pan)
      const start = new Date(now);
      start.setHours(now.getHours() - 71, 0, 0, 0);

      for (let i = 0; i < 72; i++) {
        const hour = new Date(start);
        hour.setHours(start.getHours() + i, 0, 0, 0);
        const key = `${hour.getFullYear()}-${String(hour.getMonth() + 1).padStart(2, '0')}-${String(hour.getDate()).padStart(2, '0')}-${String(hour.getHours()).padStart(2, '0')}`;
        dataMap.set(key, 0);
      }

      // Aggregate sales by hour within extended window
      sales.forEach((sale) => {
        const d = new Date(sale.timestamp);
        if (d >= start && d <= now) {
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}-${String(d.getHours()).padStart(2, '0')}`;
          dataMap.set(key, (dataMap.get(key) || 0) + Math.max(0, sale.total - (sale.paymentDetails?.discountAmount || 0)));
        }
      });

      return Array.from(dataMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, revenue]) => {
          const [, , , hour] = key.split('-');
          return {
            label: key,
            revenue,
            timestamp: key,
            displayLabel: `${String(parseInt(hour)).padStart(2, '0')}:00`
          };
        });

    } else if (timeframe === 'daily') {
      // Extended history: last 90 days (30 days visible via pan)
      const start = new Date(now);
      start.setDate(start.getDate() - 89);
      start.setHours(0, 0, 0, 0);

      for (let i = 0; i < 90; i++) {
        const day = new Date(start);
        day.setDate(start.getDate() + i);
        const key = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
        dataMap.set(key, 0);
      }

      // Aggregate sales by day within extended window
      sales.forEach((sale) => {
        const d = new Date(sale.timestamp);
        if (d >= start && d <= now) {
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
          dataMap.set(key, (dataMap.get(key) || 0) + Math.max(0, sale.total - (sale.paymentDetails?.discountAmount || 0)));
        }
      });

      return Array.from(dataMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, revenue]) => {
          const [year, month, day] = key.split('-');
          const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
          return {
            label: key,
            revenue,
            timestamp: key,
            displayLabel: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
          };
        });

    } else {
      // Fixed window: last 12 months (including current month)
      const startMonth = new Date(now.getFullYear(), now.getMonth() - 11, 1);

      for (let i = 0; i < 12; i++) {
        const m = new Date(startMonth.getFullYear(), startMonth.getMonth() + i, 1);
        const key = `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, '0')}`;
        dataMap.set(key, 0);
      }

      // Aggregate sales by month within fixed window
      sales.forEach((sale) => {
        const d = new Date(sale.timestamp);
        if (d >= startMonth && d <= now) {
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          dataMap.set(key, (dataMap.get(key) || 0) + Math.max(0, sale.total - (sale.paymentDetails?.discountAmount || 0)));
        }
      });

      return Array.from(dataMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, revenue]) => {
          const [year, month] = key.split('-');
          const date = new Date(parseInt(year), parseInt(month) - 1, 1);
          return {
            label: key,
            revenue,
            timestamp: key,
            displayLabel: date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
          };
        });
    }
  }, [sales, timeframe]);

  const totalRevenue = chartData.reduce((sum, item) => sum + item.revenue, 0);
  const windowSize = useMemo(() => (timeframe === 'hourly' ? 24 : timeframe === 'daily' ? 30 : 12), [timeframe]);
  const { start, end, containerRef, overlayHandlers, isDragging } = useDragPanWindow({
    dataLength: chartData.length,
    windowSize,
  });
  const visibleData = useMemo(() => chartData.slice(start, end), [chartData, start, end]);
  const getTimeframeDisplay = () => {
    switch (timeframe) {
      case 'hourly': return 'Last 24 Hours';
      case 'daily': return 'Last 30 Days';
      case 'monthly': return 'Last 12 Months';
    }
  };

  // Selected point (click/touch) support
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const handleOverlaySelect = (
    e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>
  ) => {
    if (isDragging) return; // don't select while dragging
    if (!containerRef.current || visibleData.length === 0) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clientX = 'clientX' in e ? (e as any).clientX : (e as any).touches?.[0]?.clientX;
    if (clientX == null) return;
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const idx = Math.round((x / Math.max(rect.width, 1)) * (visibleData.length - 1));
    setSelectedIndex(idx);
  };

  return (
    <Card className="bg-white dark:bg-gray-800 shadow-lg border-0">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold text-gray-900 dark:text-white">
                Sales Trend
              </CardTitle>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {getTimeframeDisplay()} • Revenue Tracking
              </p>
            </div>
          </div>
          
          {/* Timeframe Selector */}
          <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            {(['hourly', 'daily', 'monthly'] as const).map((option) => (
              <button
                key={option}
                onClick={() => setTimeframe(option)}
                className={`
                  px-3 py-2 text-sm font-medium rounded-md transition-all duration-200
                  ${timeframe === option
                    ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm font-bold'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                  }
                `}
              >
                {option.charAt(0).toUpperCase() + option.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Revenue Indicator */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">REVENUE</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            Total: {formatCurrency(totalRevenue)}
          </p>
        </div>

        {/* Chart */}
         <div ref={containerRef} className="relative h-80 w-full select-none">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart 
              data={visibleData}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.5} />
              <XAxis 
                dataKey="displayLabel" 
                stroke="#64748b"
                fontSize={12}
                fontWeight={600}
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11 }}
                interval="preserveStartEnd"
              />
              <YAxis 
                stroke="#64748b"
                fontSize={10}
                fontWeight={600}
                tickLine={false}
                axisLine={false}
                width={30}
                tickFormatter={(value) => {
                  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                  if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
                  return value.toString();
                }}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '12px',
                  boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
                  fontWeight: 600,
                  color: 'hsl(var(--foreground))'
                }}
                formatter={(value: number) => [formatCurrency(value), 'Revenue']}
                labelFormatter={(label) => {
                  if (timeframe === 'hourly') {
                    return `Hour: ${label}`;
                  } else if (timeframe === 'daily') {
                    return `Date: ${label}`;
                  } else {
                    return `Month: ${label}`;
                  }
                }}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#3b82f6"
                strokeWidth={2}
                fill="url(#revenueGradient)"
                dot={false}
                activeDot={{ 
                  r: 6, 
                  stroke: '#3b82f6', 
                  strokeWidth: 2, 
                  fill: '#fff'
                }}
              />
              {selectedIndex !== null && visibleData[selectedIndex] && (
                <ReferenceDot
                  x={visibleData[selectedIndex].displayLabel}
                  y={visibleData[selectedIndex].revenue}
                  r={5}
                  fill="hsl(var(--primary))"
                  stroke="hsl(var(--background))"
                  strokeWidth={2}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
          <div
            className="absolute inset-0 cursor-grab active:cursor-grabbing select-none"
            style={{ touchAction: 'pan-y' }}
            onClick={handleOverlaySelect}
            onTouchStart={handleOverlaySelect}
            {...overlayHandlers}
          />
        </div>
        {selectedIndex !== null && visibleData[selectedIndex] && (
          <div className="mt-3 inline-flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2 text-sm">
            <span className="font-semibold text-foreground">{visibleData[selectedIndex].displayLabel}</span>
            <span className="text-muted-foreground">•</span>
            <span className="font-bold text-foreground">{formatCurrency(visibleData[selectedIndex].revenue)}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default EnhancedSalesTrendChart;