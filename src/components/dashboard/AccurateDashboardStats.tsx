
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { 
  DollarSign, 
  ShoppingCart, 
  Users, 
  Package,
  TrendingUp,
  AlertTriangle
} from 'lucide-react';
import { formatCurrency } from '../../utils/currency';
import { useDashboardMetrics } from '../../hooks/useDashboardMetrics';
import { Sale, Product, Customer } from '../../types';

interface AccurateDashboardStatsProps {
  sales: Sale[];
  products: Product[];
  customers: Customer[];
}

const AccurateDashboardStats: React.FC<AccurateDashboardStatsProps> = ({
  sales,
  products,
  customers
}) => {
  const metrics = useDashboardMetrics(sales, products, customers);

  console.log('[AccurateDashboardStats] Rendering with metrics:', metrics);

  const statsCards = [
    {
      title: 'Total Revenue Today',
      value: formatCurrency(metrics.todaySales.totalRevenue),
      icon: DollarSign,
      color: 'border-green-600',
      iconColor: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-50 dark:bg-green-900/10'
    },
    {
      title: 'Total Sales Today',
      value: metrics.todaySales.orderCount.toString(),
      icon: ShoppingCart,
      color: 'border-blue-600',
      iconColor: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-900/10'
    },
    {
      title: 'Active Customers',
      value: metrics.customers.active.toString(),
      icon: Users,
      color: 'border-purple-600',
      iconColor: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-50 dark:bg-purple-900/10'
    },
    {
      title: 'Low Stock Products',
      value: metrics.products.lowStock.toString(),
      icon: metrics.products.lowStock > 0 ? AlertTriangle : Package,
      color: metrics.products.lowStock > 0 ? 'border-orange-600' : 'border-gray-600',
      iconColor: metrics.products.lowStock > 0 
        ? 'text-orange-600 dark:text-orange-400' 
        : 'text-gray-600 dark:text-gray-400',
      bgColor: metrics.products.lowStock > 0 
        ? 'bg-orange-50 dark:bg-orange-900/10' 
        : 'bg-gray-50 dark:bg-gray-900/10'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {statsCards.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <Card key={index} className={`border-2 ${stat.color} ${stat.bgColor} hover:shadow-lg transition-all duration-300`}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-mono text-xs font-black uppercase tracking-wide text-gray-700 dark:text-gray-300 mb-3">
                    {stat.title}
                  </h3>
                  <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                    {stat.value}
                  </p>
                  {stat.title === 'Total Revenue Today' && metrics.todaySales.orderCount > 0 && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Avg: {formatCurrency(metrics.todaySales.averageOrderValue)}
                    </p>
                  )}
                  {stat.title === 'Total Sales Today' && metrics.todaySales.totalProfit > 0 && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Profit: {formatCurrency(metrics.todaySales.totalProfit)}
                    </p>
                  )}
                </div>
                <div className="w-10 h-10 border border-gray-300 dark:border-gray-600 rounded-full flex items-center justify-center">
                  <Icon className={`w-5 h-5 ${stat.iconColor}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default AccurateDashboardStats;
