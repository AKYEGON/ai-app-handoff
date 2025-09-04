
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Package, Users, CreditCard } from 'lucide-react';
import { formatCurrency } from '@/utils/currency';
import { cn } from '@/lib/utils';
import { Product, Customer } from '@/types';
import { ScrollArea } from '@/components/ui/scroll-area';

interface AlwaysCurrentPanelsProps {
  products: Product[];
  customers: Customer[];
  loading?: boolean;
}

const AlwaysCurrentPanels: React.FC<AlwaysCurrentPanelsProps> = ({
  products,
  customers,
  loading = false
}) => {
  const lowStockProducts = React.useMemo(() => {
    return products
      .filter(product => {
        // Only consider products with valid stock quantities
        const hasValidStock = product.currentStock !== null && product.currentStock !== undefined;
        if (!hasValidStock) return false;
        
        // Exclude products with unspecified quantities (negative values like -1)
        if (product.currentStock < 0) return false;
        
        const threshold = product.lowStockThreshold || 10;
        return product.currentStock <= threshold;
      })
      .sort((a, b) => (a.currentStock || 0) - (b.currentStock || 0))
      .slice(0, 10);
  }, [products]);

  const outstandingDebts = React.useMemo(() => {
    return customers
      .filter(customer => (customer.outstandingDebt || 0) > 0)
      .sort((a, b) => (b.outstandingDebt || 0) - (a.outstandingDebt || 0))
      .slice(0, 10);
  }, [customers]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Array.from({ length: 2 }).map((_, index) => (
          <Card key={index} className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl animate-pulse">
            <CardHeader>
              <div className="h-6 bg-gray-200 dark:bg-gray-600 rounded w-40"></div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-16 bg-gray-200 dark:bg-gray-600 rounded"></div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Low Stock Products */}
      <Card className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-orange-100 dark:bg-orange-900/20 rounded-xl">
              <AlertTriangle className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">
                Low Stock Alert
              </CardTitle>
              <p className="text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Products running low (current stock levels)
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-80">
            {lowStockProducts.length > 0 ? (
              <div className="space-y-4">
                {lowStockProducts.map((product) => (
                  <div
                    key={product.id}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600"
                  >
                    <div className="flex items-center gap-3">
                      <Package className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white text-sm">
                          {product.name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Threshold: {product.lowStockThreshold || 10}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge
                        variant={product.currentStock <= 0 ? "destructive" : "secondary"}
                        className="font-medium"
                      >
                        {product.currentStock} left
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-xl inline-block mb-3">
                  <Package className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  All products are well stocked! 🎉
                </p>
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Outstanding Debts */}
      <Card className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-100 dark:bg-red-900/20 rounded-xl">
              <CreditCard className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">
                Outstanding Debts
              </CardTitle>
              <p className="text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Customers with pending payments
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-80">
            {outstandingDebts.length > 0 ? (
              <div className="space-y-4">
                {outstandingDebts.map((customer) => (
                  <div
                    key={customer.id}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600"
                  >
                    <div className="flex items-center gap-3">
                      <Users className="w-4 h-4 text-red-600 dark:text-red-400" />
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white text-sm">
                          {customer.name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {customer.phone}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant="destructive" className="font-medium">
                        {formatCurrency(customer.outstandingDebt || 0)}
                      </Badge>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Risk: {customer.riskRating}
                      </p>
                    </div>
                  </div>
                ))}
                <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                  <p className="text-sm font-semibold text-red-700 dark:text-red-400">
                    Total Outstanding: {formatCurrency(outstandingDebts.reduce((sum, customer) => sum + (customer.outstandingDebt || 0), 0))}
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-xl inline-block mb-3">
                  <CreditCard className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  No outstanding debts! 💚
                </p>
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};

export default AlwaysCurrentPanels;
