
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  DollarSign, 
  ShoppingCart, 
  Users, 
  Package,
  Plus,
  UserPlus,
  ShoppingBag,
  AlertTriangle,
  TrendingUp,
  Activity,
  RefreshCw
} from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useUnifiedSales } from '../hooks/useUnifiedSales';
import { useUnifiedProducts } from '../hooks/useUnifiedProducts';
import { useUnifiedCustomers } from '../hooks/useUnifiedCustomers';
import { useUnifiedSyncManager } from '../hooks/useUnifiedSyncManager';
import { formatCurrency } from '../utils/currency';
import { useNavigate } from 'react-router-dom';
import AccurateDashboardStats from './dashboard/AccurateDashboardStats';
import AddProductModal from './inventory/AddProductModal';
import AddCustomerModal from './sales/AddCustomerModal';
import { useDashboardMetrics } from '../hooks/useDashboardMetrics';

const ColoredCardDashboard = () => {
  const isMobile = useIsMobile();
  const { 
    sales, 
    loading: salesLoading, 
    error: salesError 
  } = useUnifiedSales();
  const { 
    products, 
    createProduct, 
    loading: productsLoading, 
    error: productsError 
  } = useUnifiedProducts();
  const { 
    customers, 
    createCustomer, 
    loading: customersLoading, 
    error: customersError 
  } = useUnifiedCustomers();
  const { pendingOperations } = useUnifiedSyncManager();
  const navigate = useNavigate();

  // Modal states
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);

  console.log('[ColoredCardDashboard] Rendering dashboard with data:', {
    salesCount: sales.length,
    productsCount: products.length,
    customersCount: customers.length,
    hasAccurateStats: true,
    renderingDashboard: true
  });

  // Use standardized dashboard metrics to match reports
  const dashboardMetrics = useDashboardMetrics(sales, products, customers);

  // Enhanced loading check - wait for all data to be properly loaded or show errors
  if (!Array.isArray(sales) || !Array.isArray(products) || !Array.isArray(customers) || 
      (salesLoading && sales.length === 0) || 
      (productsLoading && products.length === 0) || 
      (customersLoading && customers.length === 0)) {
    console.log('[ColoredCardDashboard] Data not ready:', { 
      sales: Array.isArray(sales) ? sales.length : 'not array', 
      products: Array.isArray(products) ? products.length : 'not array', 
      customers: Array.isArray(customers) ? customers.length : 'not array',
      loadingStates: { salesLoading, productsLoading, customersLoading },
      errors: { salesError, productsError, customersError }
    });
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading dashboard data...</p>
          <p className="text-xs text-muted-foreground mt-2">
            Sales: {Array.isArray(sales) ? `${sales.length} loaded` : salesLoading ? 'loading...' : 'pending'}
            {' • '}
            Products: {Array.isArray(products) ? `${products.length} loaded` : productsLoading ? 'loading...' : 'pending'}
            {' • '}
            Customers: {Array.isArray(customers) ? `${customers.length} loaded` : customersLoading ? 'loading...' : 'pending'}
          </p>
          {salesError && <p className="text-xs text-destructive mt-1">Sales: {salesError}</p>}
          {productsError && <p className="text-xs text-destructive mt-1">Products: {productsError}</p>}
          {customersError && <p className="text-xs text-destructive mt-1">Customers: {customersError}</p>}
        </div>
      </div>
    );
  }

  // Calculate low stock products (excluding unspecified stock)
  const lowStockProducts = products.filter(p => 
    p.currentStock !== -1 && // Exclude unspecified quantities
    p.currentStock !== null && 
    p.currentStock !== undefined &&
    p.currentStock <= (p.lowStockThreshold || 10)
  );

  // Outstanding debts
  const customersWithDebt = customers.filter(c => c.outstandingDebt > 0);

  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'add-sale':
        navigate('/app/sales');
        break;
      case 'add-product':
        setShowAddProductModal(true);
        break;
      case 'add-customer':
        setShowAddCustomerModal(true);
        break;
      default:
        break;
    }
  };

  const handleProductSave = async (productData: any) => {
    try {
      await createProduct(productData);
      setShowAddProductModal(false);
    } catch (error) {
      console.error('Error adding product:', error);
    }
  };

  const handleCustomerSave = async (customerData: any) => {
    try {
      await createCustomer(customerData);
      setShowAddCustomerModal(false);
    } catch (error) {
      console.error('Error adding customer:', error);
    }
  };

  return (
    <div className={`min-h-screen bg-background ${isMobile ? 'pb-20' : ''}`}>
      {/* Modern Top Bar */}
      <div className="h-14 bg-card border-b border-border flex items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 border border-border rounded-full flex items-center justify-center">
            <Activity className="w-4 h-4 text-primary" />
          </div>
          <h1 className="font-mono text-lg md:text-xl font-black uppercase tracking-widest text-foreground">
            DASHBOARD
          </h1>
        </div>
      </div>

      <div className="p-4 sm:p-6 space-y-6 sm:space-y-8 max-w-7xl mx-auto">
        {/* Accurate Summary Cards */}
        <AccurateDashboardStats 
          sales={sales}
          products={products}
          customers={customers}
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Low Stock Alerts */}
          <div className="border-2 border-orange-600 rounded-xl p-6 bg-transparent">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-5 h-5 border border-gray-300 dark:border-gray-600 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-3 h-3 text-orange-600 dark:text-orange-400" />
              </div>
              <h3 className="font-mono text-lg font-black uppercase tracking-wider text-gray-900 dark:text-white">
                LOW STOCK ALERTS
              </h3>
            </div>
            
            {lowStockProducts.length > 0 ? (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {lowStockProducts.slice(0, 5).map((product) => (
                  <div key={product.id} className="flex items-center justify-between p-3 border border-orange-300 dark:border-orange-700 rounded-lg bg-transparent">
                    <div className="flex-1">
                      <div className="font-medium text-foreground dark:text-white">{product.name}</div>
                      <div className="text-sm text-muted-foreground dark:text-slate-400">
                        Stock: {product.currentStock} | Min: {product.lowStockThreshold}
                      </div>
                    </div>
                    <Badge 
                      variant={product.currentStock <= 0 ? "destructive" : "secondary"}
                      className="ml-2 font-mono text-xs uppercase"
                    >
                      {product.currentStock <= 0 ? 'OUT' : 'LOW'}
                    </Badge>
                  </div>
                ))}
                {lowStockProducts.length > 5 && (
                  <div className="text-center">
                    <button
                      onClick={() => navigate('/app/inventory')}
                      className="px-4 py-2 bg-transparent border-2 border-orange-300 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg font-mono text-xs font-bold uppercase transition-all duration-200"
                    >
                      View All ({lowStockProducts.length})
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">All products are well stocked! 🎉</p>
              </div>
            )}
          </div>

          {/* Outstanding Debts */}
          <div className="border-2 border-red-600 rounded-xl p-6 bg-transparent">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-5 h-5 border border-gray-300 dark:border-gray-600 rounded-full flex items-center justify-center">
                <DollarSign className="w-3 h-3 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="font-mono text-lg font-black uppercase tracking-wider text-gray-900 dark:text-white">
                OUTSTANDING DEBTS
              </h3>
            </div>
            
            {customersWithDebt.length > 0 ? (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {customersWithDebt.slice(0, 5).map((customer) => (
                  <div key={customer.id} className="flex items-center justify-between p-3 border border-red-300 dark:border-red-700 rounded-lg bg-transparent">
                    <div className="flex-1">
                      <div className="font-medium text-foreground dark:text-white">{customer.name}</div>
                      <div className="text-sm text-muted-foreground dark:text-slate-400">{customer.phone}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-red-600 dark:text-red-400">
                        {formatCurrency(customer.outstandingDebt)}
                      </div>
                      <div className="text-xs text-muted-foreground dark:text-slate-500">
                        Limit: {formatCurrency(customer.creditLimit)}
                      </div>
                    </div>
                  </div>
                ))}
                {customersWithDebt.length > 5 && (
                  <div className="text-center">
                    <button
                      onClick={() => navigate('/app/customers')}
                      className="px-4 py-2 bg-transparent border-2 border-red-300 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg font-mono text-xs font-bold uppercase transition-all duration-200"
                    >
                      View All ({customersWithDebt.length})
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">No outstanding debts! 💚</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="border-2 border-gray-300 dark:border-gray-600 rounded-xl p-6 bg-transparent">
          <h3 className="font-mono text-lg font-black uppercase tracking-wider text-gray-900 dark:text-white mb-6">
            QUICK ACTIONS
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <button 
              onClick={() => handleQuickAction('add-sale')}
              className="flex items-center justify-center gap-2 h-12 bg-transparent border-2 border-green-600 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-xl font-mono text-sm font-bold uppercase tracking-wide transition-all duration-200"
            >
              <ShoppingBag className="h-4 w-4" />
              Record Sale
            </button>
            <button 
              onClick={() => handleQuickAction('add-product')}
              className="flex items-center justify-center gap-2 h-12 bg-transparent border-2 border-blue-600 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl font-mono text-sm font-bold uppercase tracking-wide transition-all duration-200"
            >
              <Plus className="h-4 w-4" />
              Add Product
            </button>
            <button 
              onClick={() => handleQuickAction('add-customer')}
              className="flex items-center justify-center gap-2 h-12 bg-transparent border-2 border-purple-600 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-xl font-mono text-sm font-bold uppercase tracking-wide transition-all duration-200"
            >
              <UserPlus className="h-4 w-4" />
              Add Customer
            </button>
          </div>
        </div>
      </div>

      {/* Modals */}
      <AddProductModal
        isOpen={showAddProductModal}
        onClose={() => setShowAddProductModal(false)}
        onSave={handleProductSave}
      />
      
      <AddCustomerModal
        open={showAddCustomerModal}
        onOpenChange={setShowAddCustomerModal}
        onCustomerAdded={handleCustomerSave}
      />
    </div>
  );
};

export default ColoredCardDashboard;
