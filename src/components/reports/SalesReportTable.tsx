import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatCurrency } from '@/utils/currency';
import { Sale } from '@/types';
import { DatePicker } from '@/components/ui/date-picker';

interface SalesReportTableProps {
  sales: Sale[];
  loading?: boolean;
  isOffline?: boolean;
}

type TimeFrameType = 'today' | 'week' | 'month' | 'custom';

const SalesReportTable: React.FC<SalesReportTableProps> = ({
  sales,
  loading = false,
  isOffline = false
}) => {
  const [timeFrame, setTimeFrame] = useState<TimeFrameType>('today');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [customFrom, setCustomFrom] = useState<Date | undefined>(undefined);
  const [customTo, setCustomTo] = useState<Date | undefined>(undefined);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  // Filter sales based on timeframe
  const filteredSalesByTime = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (timeFrame === 'custom' && customFrom && customTo) {
      const start = new Date(customFrom);
      start.setHours(0, 0, 0, 0);
      const end = new Date(customTo);
      end.setHours(23, 59, 59, 999);
      return sales.filter((sale) => {
        const saleDate = new Date(sale.timestamp);
        return saleDate >= start && saleDate <= end;
      });
    }
    
    let startDate: Date = today;
    switch (timeFrame) {
      case 'today':
        startDate = today;
        break;
      case 'week':
        startDate = new Date(today);
        startDate.setDate(today.getDate() - 7);
        break;
      case 'month':
        startDate = new Date(today);
        startDate.setDate(today.getDate() - 30);
        break;
      default:
        startDate = today;
    }

    return sales.filter((sale) => {
      const saleDate = new Date(sale.timestamp);
      return saleDate >= startDate && saleDate <= now;
    });
  }, [sales, timeFrame, customFrom, customTo]);

  // Filter sales based on search term
  const filteredSales = useMemo(() => {
    if (!searchTerm) return filteredSalesByTime;
    
    return filteredSalesByTime.filter(sale =>
      sale.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (sale.customerName && sale.customerName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      sale.paymentMethod.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [filteredSalesByTime, searchTerm]);

  // Group sales by sale id (clientSaleId/offlineId fallback to id)
  const groupedSales = useMemo(() => {
    const groups = new Map<string, {
      groupId: string;
      timestamp: string;
      customerName: string;
      paymentMethod: Sale['paymentMethod'];
      paymentDetails: Sale['paymentDetails'];
      total: number;
      items: { productName: string; quantity: number }[];
    }>();
    filteredSales.forEach((sale) => {
      const key = sale.clientSaleId || sale.offlineId || sale.id;
      const existing = groups.get(key);
      if (!existing) {
        groups.set(key, {
          groupId: key,
          timestamp: sale.timestamp,
          customerName: sale.customerName || 'Walk-in Customer',
          paymentMethod: sale.paymentMethod,
          paymentDetails: sale.paymentDetails,
          total: sale.total,
          items: [{ productName: sale.productName, quantity: sale.quantity }],
        });
      } else {
        existing.total += sale.total;
        existing.items.push({ productName: sale.productName, quantity: sale.quantity });
        // Prefer split if any item in group is split
        if (sale.paymentMethod === 'split') existing.paymentMethod = 'split';
        // Merge discount if present
        if ((sale.paymentDetails?.discountAmount || 0) > 0) existing.paymentDetails.discountAmount = (existing.paymentDetails.discountAmount || 0) + (sale.paymentDetails?.discountAmount || 0);
      }
    });
    // Sort by timestamp desc
    return Array.from(groups.values()).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [filteredSales]);

  // Paginate grouped data
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return groupedSales.slice(startIndex, startIndex + itemsPerPage);
  }, [groupedSales, currentPage]);

  const totalPages = Math.ceil(groupedSales.length / itemsPerPage);

  // CSV Export function
  const handleCSVExport = () => {
    const csvData = [
      ['Date', 'Time', 'Customer', 'Items', 'Amount', 'Payment Method'],
      ...groupedSales.map(group => {
        const saleDate = new Date(group.timestamp);
        const itemsStr = group.items.map(i => `${i.productName} x ${i.quantity}`).join(' | ');
        return [
          saleDate.toLocaleDateString(),
          saleDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          group.customerName,
          itemsStr,
          formatCurrency(group.total).replace('KSh ', 'Ksh '),
          group.paymentMethod.toUpperCase()
        ];
      })
    ];

    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `sales-report-${timeFrame}-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const getPaymentMethodBadge = (method: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      cash: 'default',
      mpesa: 'secondary',
      debt: 'destructive',
      partial: 'outline',
      split: 'outline'
    };
    
    return (
      <Badge variant={variants[method] || 'outline'} className="font-medium whitespace-nowrap">
        {method.toUpperCase()}
      </Badge>
    );
  };

  const renderPaymentCell = (sale: Sale) => {
    if (sale.paymentMethod === 'split') {
      const parts: string[] = [];
      if ((sale.paymentDetails?.cashAmount || 0) > 0) parts.push('CASH');
      if ((sale.paymentDetails?.mpesaAmount || 0) > 0) parts.push('MPESA');
      if ((sale.paymentDetails?.debtAmount || 0) > 0) parts.push('DEBT');
      const discount = sale.paymentDetails?.discountAmount || 0;
      return (
        <div className="flex items-center justify-center gap-1 whitespace-nowrap">
          {parts.map((p) => (
            <Badge key={p} variant="outline" className="px-2 py-0.5 text-[10px] font-semibold tracking-wide">
              {p}
            </Badge>
          ))}
          {discount > 0 && (
            <Badge variant="outline" className="px-1.5 py-0.5 text-[10px] font-semibold tracking-wide">
              - Disc {discount}
            </Badge>
          )}
        </div>
      );
    }
    return getPaymentMethodBadge(sale.paymentMethod);
  };

  // Reset to first page when search or timeframe changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, timeFrame, customFrom, customTo]);

  if (loading) {
    return (
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle>Sales Report</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-12 bg-muted rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="bg-card rounded-lg shadow-sm border border-border">
      {/* Header with controls */}
      <div className="p-6 border-b border-border">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h3 className="text-xl font-bold text-foreground">
            Sales Report
          </h3>
          <Button
            onClick={handleCSVExport}
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
        <div className="text-sm text-muted-foreground mt-2">{groupedSales.length} orders</div>
        
        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-4 mt-4">
          <div className="flex flex-col gap-2">
            <div className="flex bg-muted rounded-lg p-1 flex-wrap">
              {[
                { value: 'today', label: 'Today' },
                { value: 'week', label: 'This Week' },
                { value: 'month', label: 'This Month' }
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => setTimeFrame(option.value as TimeFrameType)}
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
              <button
                onClick={() => setTimeFrame('custom')}
                disabled={isOffline}
                className={`
                  text-sm font-medium rounded-md transition-all duration-200 px-3 py-1.5
                  ${isOffline ? 'opacity-50 cursor-not-allowed' : ''}
                  ${timeFrame === 'custom'
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-background"
                  }
                `}
              >
                Custom
              </button>
            </div>
            {timeFrame === 'custom' && (
              <div className="flex flex-wrap items-center gap-2">
                <DatePicker date={customFrom} onSelect={setCustomFrom} placeholder="From date" className="w-[160px]" />
                <DatePicker date={customTo} onSelect={setCustomTo} placeholder="To date" className="w-[160px]" />
                <Button variant="outline" size="sm" onClick={() => { setCustomFrom(undefined); setCustomTo(undefined); }}>
                  Clear
                </Button>
              </div>
            )}
          </div>

          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder={isOffline ? "Search (cached data)" : "Search by customer or product..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
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
              <TableHead className="w-8 py-4 px-6"></TableHead>
              <TableHead className="font-semibold text-foreground uppercase tracking-wider text-left py-4 px-6">
                DATE
              </TableHead>
              <TableHead className="font-semibold text-foreground uppercase tracking-wider text-left py-4 px-6">
                TIME
              </TableHead>
              <TableHead className="font-semibold text-foreground uppercase tracking-wider text-left py-4 px-6">
                CUSTOMER
              </TableHead>
              <TableHead className="font-semibold text-foreground uppercase tracking-wider text-center py-4 px-6">
                AMOUNT
              </TableHead>
              <TableHead className="font-semibold text-foreground uppercase tracking-wider text-center py-4 px-6">
                PAYMENT
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  {searchTerm ? 'No sales found matching your search criteria' : 
                   `No sales found for ${timeFrame === 'today' ? 'today' : timeFrame === 'week' ? 'this week' : 'this month'}`}
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((group) => {
                const saleDate = new Date(group.timestamp);
                const isExpanded = !!expandedGroups[group.groupId];
                const toggle = () => setExpandedGroups(prev => ({ ...prev, [group.groupId]: !prev[group.groupId] }));
                return (
                  <>
                    <TableRow key={`row-${group.groupId}`} className="border-b border-border hover:bg-muted/50">
                      <TableCell className="py-4 px-6">
                        <button onClick={toggle} className="text-muted-foreground hover:text-foreground">
                          {isExpanded ? <ChevronLeft className="w-4 h-4 rotate-90" /> : <ChevronLeft className="w-4 h-4 -rotate-90" />}
                        </button>
                      </TableCell>
                      <TableCell className="py-4 px-6 font-medium text-card-foreground">
                        {saleDate.toLocaleDateString()}
                      </TableCell>
                      <TableCell className="py-4 px-6 text-muted-foreground">
                        {saleDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                      </TableCell>
                      <TableCell className="py-4 px-6 font-medium text-card-foreground">
                        {group.customerName}
                      </TableCell>
                      <TableCell className="py-4 px-6 text-center font-medium text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(group.total)}
                      </TableCell>
                      <TableCell className="py-4 px-6 text-center">
                        {renderPaymentCell({
                          ...({} as Sale),
                          paymentMethod: group.paymentMethod,
                          paymentDetails: group.paymentDetails
                        } as Sale)}
                      </TableCell>
                    </TableRow>
                    {isExpanded && (
                      <TableRow key={`details-${group.groupId}`} className="border-b border-border bg-muted/30">
                        <TableCell colSpan={6} className="py-3 px-6 text-sm text-muted-foreground">
                          <div className="flex flex-col gap-2">
                            {group.paymentDetails && (group.paymentDetails as any).saleReference && (
                              <div className="text-foreground text-sm break-words max-w-full">
                                <span className="font-semibold mr-2">Reference:</span>
                                <span className="font-mono whitespace-pre-wrap break-words">{(group.paymentDetails as any).saleReference}</span>
                              </div>
                            )}
                            <div className="flex flex-wrap gap-2">
                              {Array.from(
                                (() => {
                                  const map = new Map<string, { productName: string; quantity: number }>();
                                  for (const it of group.items) {
                                    const key = it.productName;
                                    const existing = map.get(key);
                                    if (existing) existing.quantity += it.quantity;
                                    else map.set(key, { ...it });
                                  }
                                  return map.values();
                                })()
                              ).map((item, idx) => (
                                <Badge key={idx} variant="outline" className="px-2 py-0.5 text-[11px]">
                                  {item.productName} × {item.quantity}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-4 md:px-6 py-4 border-t border-border">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="text-sm text-muted-foreground text-center sm:text-left">
              Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, groupedSales.length)} of {groupedSales.length} orders
              {searchTerm && ` (filtered from ${filteredSalesByTime.length} total items)`}
            </div>
            
            <div className="flex items-center justify-center gap-2 overflow-x-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="h-8 w-8 p-0 flex-shrink-0"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              
              {/* Mobile: Simple page indicator, Desktop: Page numbers */}
              <div className="hidden sm:flex items-center gap-1">
                {Array.from({ length: Math.min(3, totalPages) }, (_, i) => {
                  const page = i + 1;
                  const isActive = page === currentPage;
                  return (
                    <Button
                      key={page}
                      variant={isActive ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(page)}
                      className="h-8 w-8 p-0"
                    >
                      {page}
                    </Button>
                  );
                })}
                {totalPages > 3 && (
                  <>
                    <span className="text-muted-foreground px-1">...</span>
                    <Button
                      variant={currentPage === totalPages ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(totalPages)}
                      className="h-8 w-8 p-0"
                    >
                      {totalPages}
                    </Button>
                  </>
                )}
              </div>
              
              {/* Mobile page indicator */}
              <span className="sm:hidden px-3 py-1 text-sm text-foreground bg-muted rounded-md flex-shrink-0">
                {currentPage} / {totalPages}
              </span>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="h-8 w-8 p-0 flex-shrink-0"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesReportTable;