
import { Sale, Product, Customer } from '../types';
import { useUnifiedMetricsCalculator } from './useUnifiedMetricsCalculator';

interface DashboardMetrics {
  todaySales: {
    totalRevenue: number;
    totalProfit: number;
    orderCount: number;
    averageOrderValue: number;
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

export const useDashboardMetrics = (
  sales: Sale[],
  products: Product[],
  customers: Customer[]
): DashboardMetrics => {
  // Use unified metrics calculator for consistent data processing
  const unifiedMetrics = useUnifiedMetricsCalculator(sales, products, customers);
  
  // Map unified metrics to dashboard metrics interface
  return {
    todaySales: unifiedMetrics.today,
    customers: unifiedMetrics.overall.customers,
    products: unifiedMetrics.overall.products,
  };
};
