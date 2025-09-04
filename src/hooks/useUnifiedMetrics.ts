import { useMemo } from 'react';
import { Sale, Product, Customer } from '../types';
import { dedupeSalesForReporting } from '../utils/salesDedupe';

interface UnifiedMetrics {
  todaySales: {
    totalRevenue: number;
    totalProfit: number;
    orderCount: number;
    averageOrderValue: number;
  };
  periodSales: {
    totalRevenue: number;
    totalProfit: number;
    orderCount: number;
    averageOrderValue: number;
    totalDiscounts: number;
  };
  customers: {
    total: number;
    active: number;
    withDebt: number;
    totalDebt: number;
  };
  products: {
    total: number;
    lowStock: number;
    outOfStock: number;
  };
}

export const useUnifiedMetrics = (
  sales: Sale[],
  products: Product[],
  customers: Customer[],
  dateRange?: { from: string; to: string }
): UnifiedMetrics => {
  const metrics = useMemo(() => {
    console.log('[UnifiedMetrics] Calculating metrics with data:', {
      salesCount: sales?.length || 0,
      productsCount: products?.length || 0,
      customersCount: customers?.length || 0,
      dateRange
    });

    // Guard against null/undefined data
    if (!sales || !products || !customers) {
      console.warn('[UnifiedMetrics] Missing data, returning empty metrics');
      return {
        todaySales: { totalRevenue: 0, totalProfit: 0, orderCount: 0, averageOrderValue: 0 },
        periodSales: { totalRevenue: 0, totalProfit: 0, orderCount: 0, averageOrderValue: 0, totalDiscounts: 0 },
        customers: { total: 0, active: 0, withDebt: 0, totalDebt: 0 },
        products: { total: 0, lowStock: 0, outOfStock: 0 }
      };
    }

    // Apply deduplication FIRST to avoid double counting temp/server duplicates
    const deduped = dedupeSalesForReporting(sales);
    console.log('[UnifiedMetrics] Deduplicated sales:', { original: sales.length, deduplicated: deduped.length });

    // Get today's date range
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

    // Filter today's sales
    const todaySalesData = deduped.filter(sale => {
      if (!sale.timestamp) return false;
      const saleDate = new Date(sale.timestamp);
      return saleDate >= todayStart && saleDate < todayEnd;
    });

    // Filter period sales (if dateRange provided)
    let periodSalesData = deduped;
    if (dateRange) {
      periodSalesData = deduped.filter(sale => {
        if (!sale.timestamp) return false;
        const saleDate = new Date(sale.timestamp).toISOString().split('T')[0];
        return saleDate >= dateRange.from && saleDate <= dateRange.to;
      });
    }

    // Calculate today's metrics
    const calculateSalesMetrics = (salesData: Sale[]) => {
      const totalRevenue = salesData.reduce((sum, sale) => {
        const total = Number(sale.total) || 0;
        const discount = Number(sale.paymentDetails?.discountAmount) || 0;
        return sum + Math.max(0, total - discount);
      }, 0);

      const validProfitSales = salesData.filter(sale => sale.costPrice > 0 && sale.sellingPrice > 0);
      const totalDiscounts = salesData.reduce((sum, sale) => sum + (Number(sale.paymentDetails?.discountAmount) || 0), 0);
      const rawProfit = validProfitSales.reduce((sum, sale) => sum + (Number(sale.profit) || 0), 0);
      const totalProfit = Math.max(0, rawProfit - totalDiscounts);

      const orderCount = salesData.length;
      const averageOrderValue = orderCount > 0 ? totalRevenue / orderCount : 0;

      return {
        totalRevenue,
        totalProfit,
        orderCount,
        averageOrderValue,
        totalDiscounts,
      };
    };

    const todayMetrics = calculateSalesMetrics(todaySalesData);
    const periodMetrics = calculateSalesMetrics(periodSalesData);

    // Calculate customer metrics (use period data for active customers)
    const activeCustomers = new Set(
      periodSalesData
        .map(s => s.customerId)
        .filter((id): id is string => !!id)
    ).size;
    
    const customersWithDebt = customers.filter(c => c.outstandingDebt > 0);
    const totalOutstandingDebt = customersWithDebt.reduce((sum, c) => sum + c.outstandingDebt, 0);

    // Calculate product metrics
    const lowStockProducts = products.filter(p => {
      const currentStock = p.currentStock ?? 0;
      const threshold = p.lowStockThreshold ?? 10;
      return currentStock !== -1 && currentStock <= threshold && currentStock > 0;
    });

    const outOfStockProducts = products.filter(p => {
      const currentStock = p.currentStock ?? 0;
      return currentStock === 0;
    });

    const calculatedMetrics: UnifiedMetrics = {
      todaySales: {
        totalRevenue: todayMetrics.totalRevenue,
        totalProfit: todayMetrics.totalProfit,
        orderCount: todayMetrics.orderCount,
        averageOrderValue: todayMetrics.averageOrderValue,
      },
      periodSales: {
        totalRevenue: periodMetrics.totalRevenue,
        totalProfit: periodMetrics.totalProfit,
        orderCount: periodMetrics.orderCount,
        averageOrderValue: periodMetrics.averageOrderValue,
        totalDiscounts: periodMetrics.totalDiscounts,
      },
      customers: {
        total: customers.length,
        active: activeCustomers,
        withDebt: customersWithDebt.length,
        totalDebt: totalOutstandingDebt,
      },
      products: {
        total: products.length,
        lowStock: lowStockProducts.length,
        outOfStock: outOfStockProducts.length,
      },
    };

    console.log('[UnifiedMetrics] Final calculated metrics:', calculatedMetrics);
    return calculatedMetrics;
  }, [sales, products, customers, dateRange]);

  return metrics;
};