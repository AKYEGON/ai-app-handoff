import { useMemo } from 'react';
import { Sale, Product, Customer } from '../types';
import { dedupeSalesForReporting } from '../utils/salesDedupe';

interface MetricsCalculator {
  // Today metrics (always from start of day to now)
  today: {
    totalRevenue: number;
    totalProfit: number;
    orderCount: number;
    averageOrderValue: number;
    activeCustomers: number;
  };
  // Period metrics (based on provided date range)
  period: {
    totalRevenue: number;
    totalProfit: number; 
    orderCount: number;
    averageOrderValue: number;
    totalDiscounts: number;
    activeCustomers: number;
  };
  // Overall metrics (not time-bound)
  overall: {
    customers: {
      total: number;
      active: number; // customers with sales in period
      withDebt: number;
      totalDebt: number;
    };
    products: {
      total: number;
      lowStock: number;
      outOfStock: number;
      inventoryValue: number;
    };
  };
}

interface DateRange {
  from: string; // YYYY-MM-DD format
  to: string;   // YYYY-MM-DD format
}

/**
 * Unified metrics calculator - single source of truth for all Dashboard and Reports calculations
 * Ensures consistent behavior across all pages by using identical logic
 */
export const useUnifiedMetricsCalculator = (
  sales: Sale[],
  products: Product[],
  customers: Customer[],
  dateRange?: DateRange
): MetricsCalculator => {
  const metrics = useMemo(() => {
    console.log('[UnifiedMetricsCalculator] Calculating metrics with:', {
      salesCount: sales?.length || 0,
      productsCount: products?.length || 0,
      customersCount: customers?.length || 0,
      dateRange
    });

    // Guard against missing data
    if (!sales || !products || !customers) {
      console.warn('[UnifiedMetricsCalculator] Missing data, returning empty metrics');
      return {
        today: { totalRevenue: 0, totalProfit: 0, orderCount: 0, averageOrderValue: 0, activeCustomers: 0 },
        period: { totalRevenue: 0, totalProfit: 0, orderCount: 0, averageOrderValue: 0, totalDiscounts: 0, activeCustomers: 0 },
        overall: {
          customers: { total: 0, active: 0, withDebt: 0, totalDebt: 0 },
          products: { total: 0, lowStock: 0, outOfStock: 0, inventoryValue: 0 }
        }
      };
    }

    // Apply deduplication FIRST to avoid double counting
    const dedupedSales = dedupeSalesForReporting(sales);
    console.log('[UnifiedMetricsCalculator] Deduplicated sales:', { 
      original: sales.length, 
      deduplicated: dedupedSales.length 
    });

    // Calculate today's date range (consistent UTC boundaries)
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

    // Filter today's sales
    const todaySales = dedupedSales.filter(sale => {
      if (!sale.timestamp) return false;
      const saleDate = new Date(sale.timestamp);
      return saleDate >= todayStart && saleDate < todayEnd;
    });

    // Filter period sales (if dateRange provided, otherwise use today)
    let periodSales = todaySales;
    if (dateRange) {
      periodSales = dedupedSales.filter(sale => {
        if (!sale.timestamp) return false;
        const saleDate = new Date(sale.timestamp).toISOString().split('T')[0];
        return saleDate >= dateRange.from && saleDate <= dateRange.to;
      });
    }

    // Unified calculation function for sales metrics
    const calculateSalesMetrics = (salesData: Sale[]) => {
      // Revenue calculation: subtract discounts from total
      const grossRevenue = salesData.reduce((sum, sale) => sum + (Number(sale.total) || 0), 0);
      const totalDiscounts = salesData.reduce((sum, sale) => 
        sum + (Number(sale.paymentDetails?.discountAmount) || 0), 0
      );
      const totalRevenue = Math.max(0, grossRevenue - totalDiscounts);

      // Profit calculation: base profit minus discounts
      const validProfitSales = salesData.filter(sale => 
        (sale.costPrice > 0 && sale.sellingPrice > 0)
      );
      const baseProfit = validProfitSales.reduce((sum, sale) => sum + (Number(sale.profit) || 0), 0);
      const totalProfit = Math.max(0, baseProfit - totalDiscounts);

      const orderCount = salesData.length;
      const averageOrderValue = orderCount > 0 ? totalRevenue / orderCount : 0;

      // Active customers: unique customers who made purchases in this period
      const activeCustomers = new Set(
        salesData
          .map(s => s.customerId)
          .filter((id): id is string => !!id)
      ).size;

      return {
        totalRevenue,
        totalProfit,
        orderCount,
        averageOrderValue,
        totalDiscounts,
        activeCustomers,
      };
    };

    const todayMetrics = calculateSalesMetrics(todaySales);
    const periodMetrics = calculateSalesMetrics(periodSales);

    // Customer metrics
    const customersWithDebt = customers.filter(c => (c.outstandingDebt || 0) > 0);
    const totalOutstandingDebt = customersWithDebt.reduce((sum, c) => sum + (c.outstandingDebt || 0), 0);

    // Product metrics
    const lowStockProducts = products.filter(p => {
      const currentStock = p.currentStock ?? 0;
      const threshold = p.lowStockThreshold ?? 10;
      return currentStock !== -1 && currentStock <= threshold && currentStock > 0;
    });

    const outOfStockProducts = products.filter(p => {
      const currentStock = p.currentStock ?? 0;
      return currentStock === 0;
    });

    const inventoryValue = products.reduce((sum, product) => {
      if (product.currentStock === -1) return sum; // Skip unlimited stock items
      return sum + ((product.sellingPrice || 0) * (product.currentStock || 0));
    }, 0);

    const calculatedMetrics: MetricsCalculator = {
      today: {
        totalRevenue: todayMetrics.totalRevenue,
        totalProfit: todayMetrics.totalProfit,
        orderCount: todayMetrics.orderCount,
        averageOrderValue: todayMetrics.averageOrderValue,
        activeCustomers: todayMetrics.activeCustomers,
      },
      period: {
        totalRevenue: periodMetrics.totalRevenue,
        totalProfit: periodMetrics.totalProfit,
        orderCount: periodMetrics.orderCount,
        averageOrderValue: periodMetrics.averageOrderValue,
        totalDiscounts: periodMetrics.totalDiscounts,
        activeCustomers: periodMetrics.activeCustomers,
      },
      overall: {
        customers: {
          total: customers.length,
          active: periodMetrics.activeCustomers, // Use period active customers
          withDebt: customersWithDebt.length,
          totalDebt: totalOutstandingDebt,
        },
        products: {
          total: products.length,
          lowStock: lowStockProducts.length,
          outOfStock: outOfStockProducts.length,
          inventoryValue,
        },
      },
    };

    console.log('[UnifiedMetricsCalculator] Final metrics:', calculatedMetrics);
    return calculatedMetrics;
  }, [sales, products, customers, dateRange]);

  return metrics;
};