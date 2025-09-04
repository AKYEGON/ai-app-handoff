
import { Sale, Product, Customer } from '../types';
import { useUnifiedMetrics } from './useUnifiedMetrics';

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
  // Use unified metrics for consistent data processing
  const unifiedMetrics = useUnifiedMetrics(sales, products, customers);
  
  // Map unified metrics to dashboard metrics interface
  return {
    todaySales: unifiedMetrics.todaySales,
    customers: unifiedMetrics.customers,
    products: unifiedMetrics.products,
  };
};
