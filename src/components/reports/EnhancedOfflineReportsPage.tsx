
import React, { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, WifiOff, Wifi } from 'lucide-react';
import { useUnifiedSales } from '@/hooks/useUnifiedSales';
import { useUnifiedProducts } from '@/hooks/useUnifiedProducts';
import { useUnifiedCustomers } from '@/hooks/useUnifiedCustomers';
import { useOfflineReports } from '@/hooks/useOfflineReports';
import ModernSummaryCards from './ModernSummaryCards';
import AlwaysCurrentPanels from './AlwaysCurrentPanels';
import EnhancedSalesTrendChart from './EnhancedSalesTrendChart';
import OrdersBarChart from './OrdersBarChart';
import SalesReportTable from './SalesReportTable';
import ProductProfitsTable from './ProductProfitsTable';
import DebtTransactionsTable from './DebtTransactionsTable';
import { DatePicker } from '@/components/ui/date-picker';
import { dedupeSalesForReporting } from '@/utils/salesDedupe';

const EnhancedOfflineReportsPage = () => {
  const [timeframe, setTimeframe] = useState<'today' | 'week' | 'month' | 'quarter' | 'custom'>('today');
  const { sales, loading: salesLoading } = useUnifiedSales();
  const { products, loading: productsLoading } = useUnifiedProducts();
  const { customers, loading: customersLoading } = useUnifiedCustomers();
  const { isOnline, cachedSnapshot, lastSyncedAt, cacheSnapshot, readOnly } = useOfflineReports();
  const [customFrom, setCustomFrom] = useState<Date | undefined>(undefined);
  const [customTo, setCustomTo] = useState<Date | undefined>(undefined);

  // Calculate date range based on timeframe
  const dateRange = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (timeframe === 'custom' && customFrom && customTo) {
      const start = new Date(customFrom);
      start.setHours(0, 0, 0, 0);
      const end = new Date(customTo);
      end.setHours(23, 59, 59, 999);
      return {
        from: start.toISOString().split('T')[0],
        to: end.toISOString().split('T')[0]
      };
    }
    
    switch (timeframe) {
      case 'today':
        return {
          from: today.toISOString().split('T')[0],
          to: now.toISOString().split('T')[0]
        };
      case 'week':
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - 7);
        return {
          from: weekStart.toISOString().split('T')[0],
          to: now.toISOString().split('T')[0]
        };
      case 'month':
        const monthStart = new Date(today);
        monthStart.setDate(today.getDate() - 30);
        return {
          from: monthStart.toISOString().split('T')[0],
          to: now.toISOString().split('T')[0]
        };
      case 'quarter':
        const quarterStart = new Date(today);
        quarterStart.setDate(today.getDate() - 90);
        return {
          from: quarterStart.toISOString().split('T')[0],
          to: now.toISOString().split('T')[0]
        };
      default:
        return {
          from: today.toISOString().split('T')[0],
          to: now.toISOString().split('T')[0]
        };
    }
  }, [timeframe, customFrom, customTo]);

  // Use cached data when offline, live data when online
  const currentSales = readOnly && cachedSnapshot ? cachedSnapshot.sales : sales;
  const currentProducts = readOnly && cachedSnapshot ? cachedSnapshot.products : products;
  const currentCustomers = readOnly && cachedSnapshot ? cachedSnapshot.customers : customers;
  const dedupedSales = useMemo(() => dedupeSalesForReporting(currentSales), [currentSales]);

  const isLoading = !readOnly && (salesLoading || productsLoading || customersLoading);

  // Cache data when online and data is available
  useEffect(() => {
    if (isOnline && dedupedSales.length > 0 && products.length > 0 && customers.length > 0) {
      // Calculate metrics for caching from deduped sales
      const metrics = {
        totalRevenue: dedupedSales.reduce((sum, sale) => sum + sale.total, 0),
        totalOrders: dedupedSales.length,
        activeCustomers: customers.filter(c => c.createdDate && new Date(c.createdDate) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).length,
        lowStockProducts: products.filter(p => p.currentStock < 10).length
      };

      // Simple chart data for caching
      const chartData = dedupedSales.slice(0, 10).map(sale => ({
        date: sale.timestamp,
        amount: sale.total
      }));

      cacheSnapshot(dedupedSales, products, customers, metrics, chartData);
    }
  }, [dedupedSales, products, customers, isOnline, cacheSnapshot]);


  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-64"></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-5 gap-4">
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded-2xl"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header - Matching Dashboard Style */}
      <div className="h-14 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 border border-gray-300 dark:border-gray-600 rounded-full flex items-center justify-center">
            <Calendar className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          </div>
          <h1 className="font-mono text-lg md:text-xl font-black uppercase tracking-widest text-gray-900 dark:text-white">
            REPORTS
          </h1>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            {isOnline ? (
              <Wifi className="w-4 h-4 text-green-500" />
            ) : (
              <WifiOff className="w-4 h-4 text-red-500" />
            )}
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {isOnline ? 'Online' : 'Offline'}
            </span>
          </div>
          {readOnly && lastSyncedAt && (
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Last sync: {new Date(lastSyncedAt).toLocaleTimeString()}
            </div>
          )}
        </div>
      </div>

      {/* Timeframe Selector */}
      <div className="max-w-7xl mx-auto px-6 pb-4">
          <div className="flex justify-center">
            <div className="flex bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-1 shadow-sm flex-wrap gap-1">
              {[
                { value: 'today', label: 'Today' },
                { value: 'week', label: 'This Week' },
                { value: 'month', label: 'This Month' },
                { value: 'quarter', label: 'This Quarter' }
              ].map((option) => (
                <Button
                  key={option.value}
                  variant="ghost"
                  size="sm"
                  onClick={() => setTimeframe(option.value as any)}
                  disabled={readOnly}
                  className={`
                    text-sm font-medium rounded-md transition-all duration-200 px-3 py-1.5
                    ${readOnly ? 'opacity-50 cursor-not-allowed' : ''}
                    ${timeframe === option.value
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-background"
                    }
                  `}
                >
                  {option.label}
                </Button>
              ))}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setTimeframe('custom')}
                disabled={readOnly}
                className={`
                  text-sm font-medium rounded-md transition-all duration-200 px-3 py-1.5
                  ${readOnly ? 'opacity-50 cursor-not-allowed' : ''}
                  ${timeframe === 'custom'
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-background"
                  }
                `}
              >
                Custom
              </Button>
            </div>
          </div>
          {timeframe === 'custom' && (
            <div className="flex flex-wrap items-center justify-center gap-2 mt-3">
              <DatePicker date={customFrom} onSelect={setCustomFrom} placeholder="From date" className="w-[160px]" />
              <DatePicker date={customTo} onSelect={setCustomTo} placeholder="To date" className="w-[160px]" />
              <Button variant="outline" size="sm" onClick={() => { setCustomFrom(undefined); setCustomTo(undefined); }}>
                Clear
              </Button>
            </div>
          )}
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        {/* Modern Summary Cards */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Performance Overview
            </h2>
            <Badge variant="outline" className="text-xs">
              {timeframe === 'today' ? 'Today' : 
               timeframe === 'week' ? 'Last 7 days' :
               timeframe === 'month' ? 'Last 30 days' : 'Last 90 days'}
            </Badge>
          </div>
          <ModernSummaryCards
            sales={dedupedSales}
            products={currentProducts}
            customers={currentCustomers}
            dateRange={dateRange}
          />
        </div>

        {/* Sales Trend Chart */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Sales Analytics
          </h2>
          <EnhancedSalesTrendChart sales={dedupedSales} />
        </div>

        {/* Orders Bar Chart */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Orders Analytics
          </h2>
          <OrdersBarChart sales={dedupedSales} />
        </div>

        {/* Sales Report Table */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Detailed Sales Report
          </h2>
          <SalesReportTable sales={dedupedSales} loading={isLoading} isOffline={readOnly} />
        </div>

        {/* Product Profits Table */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Product Profits Report
          </h2>
          <ProductProfitsTable sales={dedupedSales} loading={isLoading} isOffline={readOnly} />
        </div>

        {/* Debt Transactions Table */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Debt Transactions Report
          </h2>
          <DebtTransactionsTable sales={dedupedSales} loading={isLoading} isOffline={readOnly} />
        </div>

        {/* Always Current Data Panels */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Current Status
          </h2>
          <AlwaysCurrentPanels
            products={currentProducts}
            customers={currentCustomers}
            loading={isLoading}
          />
        </div>
      </div>
    </div>
  );
};

export default EnhancedOfflineReportsPage;
