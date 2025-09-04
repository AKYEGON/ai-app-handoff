
import React from 'react';
import { Package, TrendingUp, AlertTriangle } from 'lucide-react';
import { formatCurrency } from '../../utils/currency';
import { useIsMobile, useIsTablet } from '../../hooks/use-mobile';
import { cn } from '@/lib/utils';
import AddProductDropdown, { ProductMode } from './AddProductDropdown';

interface InventoryHeaderProps {
  totalProducts: number;
  totalValue: number;
  lowStockCount: number;
  onAddProduct: (mode: ProductMode) => void;
}

const InventoryHeader: React.FC<InventoryHeaderProps> = ({ 
  totalProducts,
  totalValue,
  lowStockCount,
  onAddProduct 
}) => {
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();

  return (
    <div className="space-y-6 w-full">
      {/* Modern Top Bar - Matching Dashboard Style */}
      <div className="h-14 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 border border-gray-300 dark:border-gray-600 rounded-full flex items-center justify-center">
            <Package className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          </div>
          <h1 className="font-mono text-lg md:text-xl font-black uppercase tracking-widest text-gray-900 dark:text-white">
            INVENTORY
          </h1>
        </div>
        
        <AddProductDropdown
          onModeSelect={onAddProduct}
          className="flex-shrink-0"
        />
      </div>

      {/* Stats Cards */}
      <div className={cn(
        "grid gap-4 w-full",
        isMobile ? "grid-cols-2" : isTablet ? "grid-cols-3" : "grid-cols-3"
      )}>
        <div className="bg-card rounded-xl p-4 border border-border shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <Package className="w-4 h-4 text-primary flex-shrink-0" />
            <span className="text-sm font-medium text-muted-foreground">Products</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{totalProducts}</p>
        </div>
        
        <div className="bg-card rounded-xl p-4 border border-border shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-green-600 flex-shrink-0" />
            <span className="text-sm font-medium text-muted-foreground">Total Value</span>
          </div>
          <p className={cn("text-2xl font-bold text-foreground", isMobile && "text-lg")}>
            {formatCurrency(totalValue)}
          </p>
        </div>

        <div className={cn(
          "bg-card rounded-xl p-4 border border-border shadow-sm",
          isMobile && "col-span-2"
        )}>
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className={cn("w-4 h-4 flex-shrink-0", lowStockCount > 0 ? 'text-red-600' : 'text-muted-foreground')} />
            <span className="text-sm font-medium text-muted-foreground">Low Stock</span>
          </div>
          <p className={cn("text-2xl font-bold", lowStockCount > 0 ? 'text-red-600' : 'text-foreground')}>
            {lowStockCount}
          </p>
        </div>
      </div>
    </div>
  );
};

export default InventoryHeader;
