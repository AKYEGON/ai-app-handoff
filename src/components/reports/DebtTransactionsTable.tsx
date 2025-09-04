import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Download, TrendingDown, TrendingUp } from 'lucide-react';
import { formatCurrency } from '@/utils/currency';
import { Sale } from '@/types';
import { useSupabaseDebtPayments, DebtPayment } from '@/hooks/useSupabaseDebtPayments';
import { useSupabaseTransactions } from '@/hooks/useSupabaseTransactions';
import { useSupabaseCustomers } from '@/hooks/useSupabaseCustomers';
import { DatePicker } from '@/components/ui/date-picker';

interface DebtTransactionsTableProps {
  sales: Sale[];
  loading?: boolean;
  isOffline?: boolean;
}

type TimeFrameType = 'today' | 'week' | 'month' | 'custom';

interface DebtTransaction {
  id: string;
  customer: string;
  amount: number;
  paymentMethod: string;
  transactionType: 'cash_lending' | 'debt_sale' | 'payment' | 'discount';
  timestamp: string;
  reference?: string;
}

const DebtTransactionsTable: React.FC<DebtTransactionsTableProps> = ({
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
  
  const { debtPayments, loading: paymentsLoading } = useSupabaseDebtPayments();
  const { transactions, loading: transactionsLoading } = useSupabaseTransactions();
  const { customers, loading: customersLoading } = useSupabaseCustomers();

  // Combine debt transactions from sales, transactions, and payments
  const allDebtTransactions = useMemo(() => {
    const debtTransactionsList: DebtTransaction[] = [];

    // Add cash lending from transactions table (null itemId indicates cash lending)
    transactions.forEach(transaction => {
      // Cash lending transactions have null itemId and are unpaid debt
      if (!transaction.itemId && !transaction.paid) {
        const customer = customers.find(c => c.id === transaction.customerId);
        const customerName = customer ? customer.name : 'Unknown Customer';
        
        debtTransactionsList.push({
          id: `transaction-${transaction.id}`,
          customer: customerName,
          amount: transaction.totalAmount,
          paymentMethod: 'cash', // Cash lending is typically cash
          transactionType: 'cash_lending',
          timestamp: transaction.date || new Date().toISOString(),
          reference: transaction.notes
        });
      }
    });

    // Add debt sales from sales (when payment method includes debt) and discounts
    sales.forEach(sale => {
      const hasDebt = sale.paymentMethod === 'debt' || 
                     (sale.paymentMethod === 'partial' && sale.paymentDetails?.debtAmount > 0) ||
                     (sale.paymentMethod === 'split' && (sale.paymentDetails?.debtAmount || 0) > 0);
      
      if (hasDebt) {
        const debtAmount = sale.paymentMethod === 'debt' 
          ? sale.total || (sale.sellingPrice * sale.quantity)
          : (sale.paymentDetails?.debtAmount || 0);
        
        if (debtAmount > 0) {
          debtTransactionsList.push({
            id: `sale-${sale.id}`,
            customer: sale.customerName || 'Unknown Customer',
            amount: debtAmount,
            paymentMethod: sale.paymentMethod,
            transactionType: 'debt_sale',
            timestamp: sale.timestamp,
            reference: sale.paymentDetails?.saleReference
          });
        }
      }

      // Add discounts as separate entries
      const discount = sale.paymentDetails?.discountAmount || 0;
      if (discount > 0) {
        debtTransactionsList.push({
          id: `discount-${sale.id}`,
          customer: sale.customerName || 'Unknown Customer',
          amount: discount,
          paymentMethod: 'discount',
          transactionType: 'discount',
          timestamp: sale.timestamp,
          reference: 'Discount applied'
        });
      }
    });

    // Add debt payments
    debtPayments.forEach(payment => {
      debtTransactionsList.push({
        id: `payment-${payment.id}`,
        customer: payment.customer_name,
        amount: payment.amount,
        paymentMethod: payment.payment_method,
        transactionType: 'payment',
        timestamp: payment.timestamp,
        reference: payment.reference
      });
    });

    return debtTransactionsList.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [sales, debtPayments, transactions, customers]);

  // Filter transactions based on timeframe
  const filteredTransactionsByTime = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (timeFrame === 'custom' && customFrom && customTo) {
      const start = new Date(customFrom);
      start.setHours(0, 0, 0, 0);
      const end = new Date(customTo);
      end.setHours(23, 59, 59, 999);
      return allDebtTransactions.filter((transaction) => {
        const d = new Date(transaction.timestamp);
        return d >= start && d <= end;
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
    
    return allDebtTransactions.filter(transaction => {
      const transactionDate = new Date(transaction.timestamp);
      return transactionDate >= startDate && transactionDate <= now;
    });
  }, [allDebtTransactions, timeFrame, customFrom, customTo]);

  // Filter by search term
  const filteredTransactions = useMemo(() => {
    if (!searchTerm) return filteredTransactionsByTime;
    
    return filteredTransactionsByTime.filter(transaction =>
      transaction.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.paymentMethod.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.transactionType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (transaction.reference && transaction.reference.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [filteredTransactionsByTime, searchTerm]);

  // Pagination
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedTransactions = filteredTransactions.slice(startIndex, startIndex + itemsPerPage);

  // Reset pagination when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [timeFrame, searchTerm]);


  // Export to CSV
  const exportToCSV = () => {
    const headers = ['Date', 'Customer', 'Amount', 'Payment Method', 'Transaction Type', 'Reference'];
    const csvData = filteredTransactions.map(transaction => [
      new Date(transaction.timestamp).toLocaleDateString(),
      transaction.customer,
      transaction.amount,
      transaction.paymentMethod,
      transaction.transactionType === 'cash_lending' ? 'Cash Lending' : 
      transaction.transactionType === 'debt_sale' ? 'Debt Sale' : 'Payment',
      transaction.reference || ''
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `debt-transactions-${timeFrame}-${Date.now()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getTransactionTypeIcon = (type: string) => {
    if (type === 'payment' || type === 'discount') return <TrendingDown className="h-4 w-4" />;
    return <TrendingUp className="h-4 w-4" />;
  };

  const getTransactionTypeBadge = (type: string) => {
    if (type === 'discount') {
      return (
        <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-200 dark:bg-amber-900 dark:text-amber-300 flex items-center gap-1">
          <TrendingDown className="h-4 w-4" /> Discount
        </Badge>
      );
    }

    const variant = type === 'payment' ? "secondary" : "destructive";
    const label = type === 'cash_lending' ? 'Cash Lending' : 
                  type === 'debt_sale' ? 'Debt Sale' : 'Payment';
    
    return (
      <Badge 
        variant={variant} 
        className={`flex items-center gap-1 ${
          type === 'payment' 
            ? 'bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900 dark:text-green-300' 
            : ''
        }`}
      >
        {getTransactionTypeIcon(type)}
        {label}
      </Badge>
    );
  };

  const isLoading = loading || paymentsLoading || transactionsLoading || customersLoading;

  return (
    <div className="bg-card rounded-lg shadow-sm border border-border">
      {/* Header with controls */}
      <div className="p-6 border-b border-border">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h3 className="text-xl font-bold text-foreground">
            Debt Transactions Report
          </h3>
          <Button
            onClick={exportToCSV}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
            size="sm"
            disabled={isOffline || isLoading || filteredTransactions.length === 0}
            title={isOffline ? 'Export not available offline' : 'Export to CSV'}
          >
            <Download className="w-4 h-4 mr-2" />
            Download CSV
            {isOffline && <span className="text-xs ml-1">(offline)</span>}
          </Button>
        </div>
        
        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-4 mt-4">
          <div className="flex flex-col gap-2 mt-4 sm:mt-0">
            {/* Timeframe Selector */}
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
              placeholder={isOffline ? "Search (cached data)" : "Search by customer, payment method, or reference..."}
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
        {isLoading ? (
          <div className="space-y-4 p-6">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-12 bg-muted rounded animate-pulse" />
            ))}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-b border-border">
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
                  ENTRY METHOD
                </TableHead>
                <TableHead className="font-semibold text-foreground uppercase tracking-wider text-center py-4 px-6">
                  TYPE
                </TableHead>
                <TableHead className="font-semibold text-foreground uppercase tracking-wider text-center py-4 px-6">
                  REFERENCE
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedTransactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No debt transactions found for the selected period
                  </TableCell>
                </TableRow>
              ) : (
                paginatedTransactions.map((transaction) => (
                  <TableRow key={transaction.id} className="border-b border-border hover:bg-muted/50">
                    <TableCell className="py-4 px-6 font-medium text-card-foreground">
                      {new Date(transaction.timestamp).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="py-4 px-6 text-muted-foreground">
                      {new Date(transaction.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                    </TableCell>
                    <TableCell className="py-4 px-6 font-medium text-card-foreground">
                      {transaction.customer}
                    </TableCell>
                    <TableCell className="py-4 px-6 text-center font-medium text-blue-600 dark:text-blue-400">
                      {formatCurrency(transaction.amount)}
                    </TableCell>
                    <TableCell className="py-4 px-6 text-center">
                      <Badge variant="outline" className="capitalize">
                        {transaction.paymentMethod}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-4 px-6 text-center">
                      {getTransactionTypeBadge(transaction.transactionType)}
                    </TableCell>
                    <TableCell className="py-4 px-6 text-center text-muted-foreground break-words whitespace-pre-wrap max-w-[480px] mx-auto">
                      {transaction.reference || '-'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 md:px-6 py-4 border-t border-border">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="text-sm text-muted-foreground text-center sm:text-left">
                Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredTransactions.length)} of {filteredTransactions.length} transactions
              </div>
              <div className="flex items-center justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
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
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
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
    </div>
  );
};

export default DebtTransactionsTable;