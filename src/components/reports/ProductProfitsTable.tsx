import React, { useMemo, useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Download, Search } from 'lucide-react';
import { formatCurrency } from '@/utils/currency';
import { Sale } from '@/types';


interface ProductProfitsTableProps {
  sales: Sale[];
  loading?: boolean;
  isOffline?: boolean;
}

interface ProductProfitRow {
  productName: string;
  quantitySold: number;
  salesAmount: number;
  profit: number;
}

const ProductProfitsTable: React.FC<ProductProfitsTableProps> = ({
  sales,
  loading = false,
  isOffline = false
}) => {
  const [timeFrame, setTimeFrame] = useState<'today' | 'week' | 'month' | 'quarter'>('today');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const getTimeFrameRange = (frame: 'today' | 'week' | 'month' | 'quarter') => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (frame) {
      case 'today':
        return {
          start: today,
          end: new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1)
        };
      case 'week':
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - 7);
        const weekEnd = new Date();
        return { start: weekStart, end: weekEnd };
      case 'month':
        const monthStart = new Date(today);
        monthStart.setDate(today.getDate() - 30);
        const monthEnd = new Date();
        return { start: monthStart, end: monthEnd };
      case 'quarter':
        const quarterStart = new Date(today);
        quarterStart.setDate(today.getDate() - 90);
        const quarterEnd = new Date();
        return { start: quarterStart, end: quarterEnd };
      default:
        return { start: today, end: new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1) };
    }
  };

  const filteredSales = useMemo(() => {
    const { start, end } = getTimeFrameRange(timeFrame);
    return sales.filter(sale => {
      const saleDate = new Date(sale.timestamp);
      return saleDate >= start && saleDate <= end;
    });
  }, [sales, timeFrame]);

  const productProfitsData = useMemo((): ProductProfitRow[] => {
    const productMap = new Map<string, ProductProfitRow>();

    // Group filtered sales by sale id to distribute discounts accurately across items
    const groups = new Map<string, { sales: typeof filteredSales }>();
    filteredSales.forEach((s) => {
      const key = s.clientSaleId || s.offlineId || s.id;
      const g = groups.get(key);
      if (!g) groups.set(key, { sales: [s] }); else g.sales.push(s);
    });

    groups.forEach(({ sales: salesInGroup }) => {
      // Only include valid items with positive prices
      const validSales = salesInGroup.filter(sale => sale.costPrice > 0 && sale.sellingPrice > 0);
      if (validSales.length === 0) return;

      const groupTotal = validSales.reduce((sum, s) => sum + s.total, 0);
      const groupDiscount = Math.max(...validSales.map(s => s.paymentDetails?.discountAmount || 0));

      validSales.forEach(sale => {
        const existing = productMap.get(sale.productName) || {
          productName: sale.productName,
          quantitySold: 0,
          salesAmount: 0,
          profit: 0
        };

        // Distribute discount proportionally across items in the sale group
        const proportion = groupTotal > 0 ? (sale.total / groupTotal) : 0;
        const allocatedDiscount = (groupDiscount || 0) * proportion;
        const netProfitForSale = (sale.profit || 0) - allocatedDiscount;

        productMap.set(sale.productName, {
          productName: sale.productName,
          quantitySold: existing.quantitySold + sale.quantity,
          salesAmount: existing.salesAmount + sale.total,
          profit: existing.profit + netProfitForSale
        });
      });
    });

    return Array.from(productMap.values()).sort((a, b) => b.profit - a.profit);
  }, [filteredSales]);

  const searchedData = useMemo(() => {
    if (!searchTerm) return productProfitsData;
    
    return productProfitsData.filter(item =>
      item.productName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [productProfitsData, searchTerm]);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return searchedData.slice(startIndex, startIndex + itemsPerPage);
  }, [searchedData, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(searchedData.length / itemsPerPage);

  const exportToCSV = () => {
    const headers = ['Product', 'Quantity Sold', 'Sales Amount', 'Profit'];
    const csvContent = [
      headers.join(','),
      ...searchedData.map(row => [
        `"${row.productName}"`,
        row.quantitySold,
        row.salesAmount.toFixed(2),
        row.profit.toFixed(2)
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `product-profits-${timeFrame}-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getTimeFrameLabel = () => {
    switch (timeFrame) {
      case 'today': return 'Today';
      case 'week': return 'This Week';
      case 'month': return 'This Month';
      case 'quarter': return 'This Quarter';
      default: return 'Today';
    }
  };

  if (loading) {
    return (
      <div className="bg-card rounded-lg shadow-sm border border-border p-6">
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 bg-muted rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg shadow-sm border border-border">
      {/* Header with controls */}
      <div className="p-6 border-b border-border">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h3 className="text-xl font-bold text-foreground">
            Product Profits Report
          </h3>
          <Button
            onClick={exportToCSV}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
            size="sm"
            disabled={isOffline}
            title={isOffline ? 'Export not available offline' : 'Export to CSV'}
          >
            <Download className="w-4 h-4 mr-2" />
            Download CSV
            {isOffline && <span className="text-xs ml-1">(offline)</span>}
          </Button>
        </div>
        
        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-4 mt-4">
          <div className="flex flex-col gap-2">
            {/* Timeframe Selector */}
            <div className="flex bg-muted rounded-lg p-1 flex-wrap">
              {[
                { value: 'today', label: 'Today' },
                { value: 'week', label: 'This Week' },
                { value: 'month', label: 'This Month' },
                { value: 'quarter', label: 'This Quarter' }
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    setTimeFrame(option.value as 'today' | 'week' | 'month' | 'quarter');
                    setCurrentPage(1);
                  }}
                  disabled={isOffline}
                  className={`
                    text-sm font-medium rounded-md transition-all duration-200 px-3 py-1.5
                    ${isOffline ? 'opacity-50 cursor-not-allowed' : ''}
                    ${timeFrame === option.value
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-background"
                    }
                  `}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder={isOffline ? "Search (cached data)" : "Search products..."}
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              disabled={isOffline}
              className={`pl-10 ${isOffline ? 'opacity-50' : ''}`}
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-border">
              <TableHead className="font-semibold text-foreground uppercase tracking-wider text-left py-4 px-6">
                PRODUCT
              </TableHead>
              <TableHead className="font-semibold text-foreground uppercase tracking-wider text-center py-4 px-6">
                QUANTITY SOLD
              </TableHead>
              <TableHead className="font-semibold text-foreground uppercase tracking-wider text-center py-4 px-6">
                SALES AMOUNT
              </TableHead>
              <TableHead className="font-semibold text-foreground uppercase tracking-wider text-center py-4 px-6">
                PROFIT
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  {searchTerm ? 'No products found matching your search' : `No products found for ${getTimeFrameLabel().toLowerCase()}`}
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((product, index) => (
                <TableRow key={`${product.productName}-${index}`} className="border-b border-border hover:bg-muted/50">
                  <TableCell className="py-4 px-6 font-medium text-card-foreground">
                    {product.productName}
                  </TableCell>
                  <TableCell className="py-4 px-6 text-center font-medium text-card-foreground">
                    {product.quantitySold}
                  </TableCell>
                  <TableCell className="py-4 px-6 text-center font-medium text-blue-600 dark:text-blue-400">
                    {formatCurrency(product.salesAmount)}
                  </TableCell>
                  <TableCell className="py-4 px-6 text-center font-medium text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(product.profit)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-4 md:px-6 py-4 border-t border-border">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="text-sm text-muted-foreground text-center sm:text-left">
              Showing {searchedData.length} products for <span className="font-medium">{getTimeFrameLabel()}</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-3"
              >
                Previous
              </Button>
              <span className="px-3 py-1 text-sm text-foreground bg-muted rounded-md">
                {currentPage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-3"
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductProfitsTable;