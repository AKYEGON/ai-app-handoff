
import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Package, CreditCard, Smartphone, Banknote, ChevronDown, ChevronUp } from 'lucide-react';
import { Customer } from '../../types';
import { formatCurrency } from '../../utils/currency';
import { supabase } from '../../integrations/supabase/client';
import { useIsMobile } from '../../hooks/use-mobile';
import { useOfflineCustomerPayments } from '@/hooks/useOfflineCustomerPayments';
import { useUnifiedSales } from '@/hooks/useUnifiedSales';

interface CustomerHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
}

interface GroupedOrder {
  groupId: string;
  date: string;
  total: number;
  paymentMethod: 'cash' | 'mpesa' | 'bank' | 'debt' | 'partial' | 'split';
  paymentDetails?: { cashAmount?: number; mpesaAmount?: number; debtAmount?: number; discountAmount?: number };
  items: { name: string; quantity: number }[];
}

interface Payment {
  id: string;
  date: string;
  method: 'cash' | 'mpesa' | 'bank' | 'debt';
  amount: number;
  reference?: string;
}

const CustomerHistoryModal: React.FC<CustomerHistoryModalProps> = ({
  isOpen,
  onClose,
  customer
}) => {
const [activeTab, setActiveTab] = useState<'orders' | 'payments'>('orders');
const [groupedOrders, setGroupedOrders] = useState<GroupedOrder[]>([]);
const [ordersLoading, setOrdersLoading] = useState(false);
const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
const isMobile = useIsMobile();
const { payments: paymentsData, loading: paymentsLoading, refresh: refreshPayments } = useOfflineCustomerPayments(customer?.id);
const { sales: allSales, loading: salesLoading, refetch: refetchSales } = useUnifiedSales();

// Compute orders from cached/remote sales
useEffect(() => {
  if (!customer) {
    setGroupedOrders([]);
    return;
  }
  try {
    const groups = new Map<string, GroupedOrder>();
    (allSales || [])
      .filter((sale: any) => {
        const matchesId = sale.customerId === customer.id;
        const matchesName = sale.customerName && customer.name && String(sale.customerName).trim().toLowerCase() === String(customer.name).trim().toLowerCase();
        return matchesId || matchesName;
      })
      .forEach((sale: any) => {
        const key = sale.clientSaleId || sale.offlineId || sale.id;
        const existing = groups.get(key);
        const pd = typeof sale.paymentDetails === 'object' && sale.paymentDetails !== null ? sale.paymentDetails : {};
        const details = {
          cashAmount: Number(pd.cashAmount || pd.cash_amount || 0),
          mpesaAmount: Number(pd.mpesaAmount || pd.mpesa_amount || 0),
          debtAmount: Number(pd.debtAmount || pd.debt_amount || 0),
          discountAmount: Number(pd.discountAmount || pd.discount_amount || 0),
        };
        const saleTimestamp = sale.timestamp || sale.created_at || new Date().toISOString();
        const saleTotal = Number(sale.total || sale.total_amount || 0);
        const saleMethod = (sale.paymentMethod === 'partial' ? 'split' : sale.paymentMethod) as GroupedOrder['paymentMethod'];
        if (!existing) {
          groups.set(key, {
            groupId: key,
            date: saleTimestamp,
            total: saleTotal,
            paymentMethod: saleMethod,
            paymentDetails: details,
            items: [{ name: sale.productName, quantity: Number(sale.quantity || 0) }],
          });
        } else {
          existing.total += saleTotal;
          existing.items.push({ name: sale.productName, quantity: Number(sale.quantity || 0) });
          if (saleMethod === 'split') existing.paymentMethod = 'split';
          existing.paymentDetails = {
            cashAmount: (existing.paymentDetails?.cashAmount || 0) + details.cashAmount,
            mpesaAmount: (existing.paymentDetails?.mpesaAmount || 0) + details.mpesaAmount,
            debtAmount: (existing.paymentDetails?.debtAmount || 0) + details.debtAmount,
            discountAmount: (existing.paymentDetails?.discountAmount || 0) + details.discountAmount,
          };
          if (new Date(saleTimestamp).getTime() > new Date(existing.date).getTime()) {
            existing.date = saleTimestamp;
          }
        }
      });
    const grouped = Array.from(groups.values()).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setGroupedOrders(grouped);
  } catch (err) {
    console.error('Error computing customer orders from sales:', err);
    setGroupedOrders([]);
  }
}, [customer, allSales]);

// Synchronize loading state with sales loading
useEffect(() => {
  setOrdersLoading(salesLoading);
}, [salesLoading]);

// Keep stable refs for refresh functions to avoid effect loops
const refreshPaymentsRef = useRef(refreshPayments);
const refreshSalesRef = useRef(refetchSales);
useEffect(() => {
  refreshPaymentsRef.current = refreshPayments;
  refreshSalesRef.current = refetchSales;
}, [refreshPayments, refetchSales]);

// Set up real-time subscriptions
useEffect(() => {
  if (!isOpen || !customer) return;

  // Initial refreshes
  refreshSalesRef.current?.();
  refreshPaymentsRef.current?.();

  // Real-time subscription for sales (orders)
  const salesChannel = supabase
    .channel(`sales-changes-${customer.id}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'sales',
        filter: `customer_id=eq.${customer.id}`,
      },
      () => {
        // Refresh cached sales
        refreshSalesRef.current?.();
      }
    )
    .subscribe();

  // Real-time subscription for debt payments
  const paymentsChannel = supabase
    .channel(`debt-payments-changes-${customer.id}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'debt_payments',
        filter: `customer_id=eq.${customer.id}`,
      },
      () => {
        // Refresh cached payments
        refreshPaymentsRef.current?.();
      }
    )
    .subscribe();

  // Cleanup subscription when modal closes
  return () => {
    supabase.removeChannel(salesChannel);
    supabase.removeChannel(paymentsChannel);
  };
}, [customer, isOpen]);

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Unknown date';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime = (dateString: string) => {
    if (!dateString) return '--:--';
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  };

const renderPaymentCell = (g: GroupedOrder) => {
    if (g.paymentMethod === 'split') {
      const parts: string[] = [];
      if ((g.paymentDetails?.cashAmount || 0) > 0) parts.push('CASH');
      if ((g.paymentDetails?.mpesaAmount || 0) > 0) parts.push('MPESA');
      if ((g.paymentDetails?.debtAmount || 0) > 0) parts.push('DEBT');
      const discount = g.paymentDetails?.discountAmount || 0;
      return (
        <div className="flex flex-wrap items-start gap-1">
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
    return (
      <Badge variant={g.paymentMethod === 'cash' ? 'default' : g.paymentMethod === 'mpesa' ? 'secondary' : g.paymentMethod === 'debt' ? 'destructive' : 'outline'} className="font-medium">
        {g.paymentMethod.toUpperCase()}
      </Badge>
    );
  };

  const toggleOrderExpansion = (orderId: string) => {
    const newExpanded = new Set(expandedOrders);
    if (newExpanded.has(orderId)) {
      newExpanded.delete(orderId);
    } else {
      newExpanded.add(orderId);
    }
    setExpandedOrders(newExpanded);
  };

  // Reset state when modal closes
useEffect(() => {
    if (!isOpen) {
      setGroupedOrders([]);
      setExpandedOrders(new Set());
      setActiveTab('orders');
    }
  }, [isOpen]);

  if (!customer) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className={`
          ${isMobile 
            ? 'fixed inset-0 left-0 right-0 top-0 bottom-0 translate-x-0 translate-y-0 max-w-none w-full h-full p-0 rounded-none'
            : 'max-w-2xl rounded-2xl p-0'
          } 
          bg-white dark:bg-gray-800 shadow-xl
        `}
        style={isMobile ? { left: 0, top: 0, transform: 'none' } : undefined}
      >
        
        {/* Close button */}
        <DialogClose asChild>
          <Button
            variant="ghost"
            size="sm"
            aria-label="Close"
            className="absolute top-4 right-4 w-8 h-8 p-0 rounded-full bg-muted hover:bg-accent z-50"
          >
            <X className="w-4 h-4" />
          </Button>
        </DialogClose>

        <div className="h-full flex flex-col">
          {/* Sticky Header + Tabs + Column Headers */}
          <div className="sticky top-0 z-10 bg-white dark:bg-gray-800">
            {/* Title */}
<div className="px-6 pt-3 pb-3">
              <DialogTitle className="text-lg font-semibold text-foreground">History for {customer.name}</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">Orders and payments</DialogDescription>
            </div>
            {/* Tabs */}
            <div className="px-6 border-b border-border">
              <div className="flex">
                <button
                  onClick={() => setActiveTab('orders')}
                  className={`
                    flex-1 px-4 py-2 text-xs sm:text-sm font-medium transition-colors relative
                    ${activeTab === 'orders' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}
                  `}
                >
<Package className="w-4 h-4 inline mr-2" />
                  Orders ({groupedOrders.length})
                  {activeTab === 'orders' && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('payments')}
                  className={`
                    flex-1 px-4 py-2 text-xs sm:text-sm font-medium transition-colors relative
                    ${activeTab === 'payments' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}
                  `}
                >
                  <CreditCard className="w-4 h-4 inline mr-2" />
                  Payments ({paymentsData.length})
                  {activeTab === 'payments' && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                  )}
                </button>
              </div>
            </div>
            {/* Column headers */}
            {activeTab === 'orders' && (
<div className="px-6 py-2 border-b border-border text-[11px] sm:text-xs text-muted-foreground">
                <div className="grid grid-cols-5 gap-2">
                  <span></span>
                  <span>Date</span>
                  <span>Time</span>
                  <span>Payment</span>
                  <span className="text-right">Total</span>
                </div>
              </div>
            )}
            {activeTab === 'payments' && (
              <div className="px-6 py-2 border-b border-border text-[11px] sm:text-xs text-muted-foreground">
                <div className="grid grid-cols-5 gap-2">
                  <span>Date</span>
                  <span>Time</span>
                  <span>Method</span>
                  <span className="text-right">Amount</span>
                  <span>Ref</span>
                </div>
              </div>
            )}
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto px-6 pb-[env(safe-area-inset-bottom,1rem)]">
{activeTab === 'orders' && (
              <div>
                {ordersLoading ? (
                  <div className="divide-y divide-border">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="grid grid-cols-5 gap-2 py-2 text-xs animate-pulse">
                        <div className="h-3 bg-muted rounded" />
                        <div className="h-3 bg-muted rounded" />
                        <div className="h-3 bg-muted rounded" />
                        <div className="h-3 bg-muted rounded" />
                        <div className="h-3 bg-muted rounded" />
                      </div>
                    ))}
                  </div>
                ) : groupedOrders.length ? (
                  <div className="divide-y divide-border">
                    {groupedOrders.map((g) => (
                      <div key={g.groupId} className="py-2 text-xs sm:text-sm">
                        <div className="grid grid-cols-5 gap-2 items-start">
                          <button onClick={() => toggleOrderExpansion(g.groupId)} className="text-muted-foreground hover:text-foreground">
                            {expandedOrders.has(g.groupId) ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                          <span>{formatDate(g.date)}</span>
                          <span>{formatTime(g.date)}</span>
                          <span className="flex flex-wrap items-start gap-1 justify-start min-w-0">
                            {renderPaymentCell(g)}
                          </span>
                          <span className="text-right font-medium">{formatCurrency(g.total)}</span>
                        </div>
                        {expandedOrders.has(g.groupId) && (
                          <div className="mt-2 pl-6 text-muted-foreground flex flex-wrap gap-2">
                            {g.items.map((item, idx) => (
                              <Badge key={idx} variant="outline" className="px-2 py-0.5 text-[11px]">
                                {item.name} × {item.quantity}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center text-muted-foreground text-sm">
                    <Package className="w-10 h-10 mx-auto mb-3 opacity-60" />
                    No orders found
                  </div>
                )}
              </div>
            )}

{activeTab === 'payments' && (
              <div>
                {paymentsLoading ? (
                  <div className="divide-y divide-border">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="grid grid-cols-5 gap-2 py-2 text-xs animate-pulse">
                        <div className="h-3 bg-muted rounded" />
                        <div className="h-3 bg-muted rounded" />
                        <div className="h-3 bg-muted rounded" />
                        <div className="h-3 bg-muted rounded" />
                        <div className="h-3 bg-muted rounded" />
                      </div>
                    ))}
                  </div>
                ) : paymentsData.length ? (
                  (() => {
                    // Group split payments by reference
                    const groupedPayments: { [key: string]: typeof paymentsData } = {};
                    const singlePayments: typeof paymentsData = [];
                    
                    paymentsData.forEach(payment => {
                      const reference = payment.reference || '';
                      if (reference.includes('split_')) {
                        const baseRef = reference.replace(/_[^_]+$/, ''); // Remove "_cash" or "_mpesa" suffix
                        if (!groupedPayments[baseRef]) {
                          groupedPayments[baseRef] = [];
                        }
                        groupedPayments[baseRef].push(payment);
                      } else {
                        singlePayments.push(payment);
                      }
                    });

                    // Combine and sort all entries by timestamp
                    const allEntries: Array<{ type: 'single' | 'split'; data: typeof paymentsData[0] | typeof paymentsData; key: string }> = [
                      ...singlePayments.map(p => ({ type: 'single' as const, data: p, key: p.id })),
                      ...Object.entries(groupedPayments).map(([ref, payments]) => ({ 
                        type: 'split' as const, 
                        data: payments, 
                        key: ref 
                      }))
                    ];

                    allEntries.sort((a, b) => {
                      const aTimestamp = a.type === 'single' 
                        ? (a.data as typeof paymentsData[0]).timestamp 
                        : Math.max(...(a.data as typeof paymentsData).map(p => new Date(p.timestamp).getTime()));
                      const bTimestamp = b.type === 'single' 
                        ? (b.data as typeof paymentsData[0]).timestamp 
                        : Math.max(...(b.data as typeof paymentsData).map(p => new Date(p.timestamp).getTime()));
                      return new Date(bTimestamp).getTime() - new Date(aTimestamp).getTime();
                    });

                    return (
                      <div className="divide-y divide-border">
                        {allEntries.map((entry) => {
                          if (entry.type === 'single') {
                            const p = entry.data as typeof paymentsData[0];
                            return (
                              <div key={p.id} className="grid grid-cols-5 gap-2 py-2 text-xs sm:text-sm">
                                <span>{formatDate(p.timestamp)}</span>
                                <span>{formatTime(p.timestamp)}</span>
                                <span className="capitalize flex items-center gap-1">
                                  {p.payment_method === 'mpesa' ? <Smartphone className="w-3.5 h-3.5" /> : <Banknote className="w-3.5 h-3.5" />}
                                  {p.payment_method === 'mpesa' ? 'M-Pesa' : p.payment_method}
                                </span>
                                <span className="text-right font-medium text-green-600 dark:text-green-400">{formatCurrency(p.amount)}</span>
                                <span className="truncate" title={p.reference || undefined}>{p.reference || '-'}</span>
                              </div>
                            );
                          } else {
                            const payments = entry.data as typeof paymentsData;
                            const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0);
                            const latestPayment = payments.reduce((latest, p) => 
                              new Date(p.timestamp) > new Date(latest.timestamp) ? p : latest
                            );
                            
                            return (
                              <div key={entry.key} className="py-2 text-xs sm:text-sm">
                                <div className="grid grid-cols-5 gap-2">
                                  <span>{formatDate(latestPayment.timestamp)}</span>
                                  <span>{formatTime(latestPayment.timestamp)}</span>
                                  <span className="flex flex-wrap items-start gap-1">
                                    <Badge variant="outline" className="px-2 py-0.5 text-[10px] font-semibold bg-purple-50 border-purple-200 text-purple-700 dark:bg-purple-950/20 dark:border-purple-800 dark:text-purple-300">
                                      Split Payment
                                    </Badge>
                                  </span>
                                  <span className="text-right font-medium text-green-600 dark:text-green-400">{formatCurrency(totalAmount)}</span>
                                  <span className="text-xs text-muted-foreground">Split</span>
                                </div>
                                <div className="mt-1 ml-0 pl-0 flex flex-wrap gap-1">
                                  {payments.map((p) => (
                                    <Badge key={p.id} variant="outline" className="px-1.5 py-0.5 text-[9px] bg-muted/50">
                                      {p.payment_method === 'mpesa' ? 'M-Pesa' : p.payment_method.charAt(0).toUpperCase() + p.payment_method.slice(1)}: {formatCurrency(p.amount)}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            );
                          }
                        })}
                      </div>
                    );
                  })()
                ) : (
                  <div className="py-8 text-center text-muted-foreground text-sm">
                    <CreditCard className="w-10 h-10 mx-auto mb-3 opacity-60" />
                    No payments found
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CustomerHistoryModal;
