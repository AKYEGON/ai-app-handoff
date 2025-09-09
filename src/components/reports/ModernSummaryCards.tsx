
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { 
  DollarSign, 
  ShoppingCart, 
  Users, 
  Package, 
  CreditCard, 
  TrendingUp, 
  Warehouse,
  Percent
} from 'lucide-react';
import { formatCurrency } from '@/utils/currency';
import { Sale, Product, Customer } from '@/types';
import { useUnifiedMetricsCalculator } from '@/hooks/useUnifiedMetricsCalculator';

interface ModernSummaryCardsProps {
  sales: Sale[];
  products: Product[];
  customers: Customer[];
  dateRange: { from: string; to: string };
}

const ModernSummaryCards: React.FC<ModernSummaryCardsProps> = ({
  sales,
  products,
  customers,
  dateRange
}) => {
  // Use unified metrics calculator for consistent calculations
  const metrics = useUnifiedMetricsCalculator(sales, products, customers, dateRange);
  
  // Extract metrics for display (using period metrics for date range)
  const totalOrders = metrics.period.orderCount;
  const netRevenue = metrics.period.totalRevenue;
  const netProfit = metrics.period.totalProfit;
  const totalDiscounts = metrics.period.totalDiscounts;
  const activeCustomers = metrics.period.activeCustomers;
  const averageOrderValue = metrics.period.averageOrderValue;
  const lowStockProducts = metrics.overall.products.lowStock;
  const totalOutstandingDebts = metrics.overall.customers.totalDebt;
  const totalInventoryValue = metrics.overall.products.inventoryValue;

  // Calculate gross revenue for discount percentage
  const grossRevenue = netRevenue + totalDiscounts;

  const cards = [
    {
      title: 'TOTAL REVENUE',
      value: formatCurrency(netRevenue),
      subtitle: `Avg: ${formatCurrency(averageOrderValue)}`,
      icon: DollarSign,
      bgColor: 'bg-green-50 dark:bg-green-900/10',
      borderColor: 'border-green-500',
      iconBg: 'bg-green-500',
      iconColor: 'text-white'
    },
    {
      title: 'TOTAL SALES',
      value: totalOrders.toString(),
      subtitle: `Profit: ${formatCurrency(netProfit)}`,
      icon: ShoppingCart,
      bgColor: 'bg-blue-50 dark:bg-blue-900/10',
      borderColor: 'border-blue-500',
      iconBg: 'bg-blue-500',
      iconColor: 'text-white'
    },
    {
      title: 'ACTIVE CUSTOMERS',
      value: activeCustomers.toString(),
      subtitle: `Total: ${customers.length}`,
      icon: Users,
      bgColor: 'bg-purple-50 dark:bg-purple-900/10',
      borderColor: 'border-purple-500',
      iconBg: 'bg-purple-500',
      iconColor: 'text-white'
    },
    {
      title: 'LOW STOCK PRODUCTS',
      value: lowStockProducts.toString(),
      subtitle: lowStockProducts === 0 ? 'All stocked well' : 'Need attention',
      icon: Package,
      bgColor: 'bg-orange-50 dark:bg-orange-900/10',
      borderColor: 'border-orange-500',
      iconBg: 'bg-orange-500',
      iconColor: 'text-white'
    },
    {
      title: 'OUTSTANDING DEBTS',
      value: formatCurrency(totalOutstandingDebts),
      subtitle: `${customers.filter(c => c.outstandingDebt > 0).length} customers`,
      icon: CreditCard,
      bgColor: 'bg-red-50 dark:bg-red-900/10',
      borderColor: 'border-red-500',
      iconBg: 'bg-red-500',
      iconColor: 'text-white'
    },
    {
      title: 'DISCOUNTS GIVEN',
      value: formatCurrency(totalDiscounts),
      subtitle: totalOrders > 0 ? `${((totalDiscounts / Math.max(grossRevenue || 1, 1)) * 100).toFixed(1)}% of gross` : '—',
      icon: Percent,
      bgColor: 'bg-yellow-50 dark:bg-yellow-900/10',
      borderColor: 'border-yellow-500',
      iconBg: 'bg-yellow-500',
      iconColor: 'text-white'
    },
    {
      title: 'TOTAL PROFIT',
      value: formatCurrency(netProfit),
      subtitle: netRevenue > 0 ? `${((netProfit / netRevenue) * 100).toFixed(1)}% margin` : '0% margin',
      icon: TrendingUp,
      bgColor: 'bg-emerald-50 dark:bg-emerald-900/10',
      borderColor: 'border-emerald-500',
      iconBg: 'bg-emerald-500',
      iconColor: 'text-white'
    },
    {
      title: 'INVENTORY VALUE',
      value: formatCurrency(totalInventoryValue),
      subtitle: `${products.length} products`,
      icon: Warehouse,
      bgColor: 'bg-indigo-50 dark:bg-indigo-900/10',
      borderColor: 'border-indigo-500',
      iconBg: 'bg-indigo-500',
      iconColor: 'text-white'
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-4 gap-4 mb-8">
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <Card 
            key={index}
            className={`
              ${card.bgColor} ${card.borderColor} 
              border-2 rounded-2xl p-4 hover:shadow-lg transition-all duration-300
              hover:-translate-y-1 cursor-pointer
            `}
          >
            <CardContent className="p-0">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-mono text-xs font-black uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-2">
                    {card.title}
                  </h3>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                    {card.value}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {card.subtitle}
                  </p>
                </div>
                <div className={`
                  w-10 h-10 ${card.iconBg} rounded-full 
                  flex items-center justify-center flex-shrink-0
                `}>
                  <Icon className={`w-5 h-5 ${card.iconColor}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default ModernSummaryCards;
