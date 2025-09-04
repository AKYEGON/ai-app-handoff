import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useUnifiedSales } from '../../hooks/useUnifiedSales';
import { useUnifiedProducts } from '../../hooks/useUnifiedProducts';
import { useOfflineDebtManager } from '../../hooks/useOfflineDebtManager';

import { SalesService } from '../../services/salesService';
import { CartItem } from '../../types/cart';
import { Customer, Sale } from '../../types';
import { formatCurrency } from '../../utils/currency';
import { User, UserPlus, Receipt, Banknote, DollarSign, AlertTriangle, Split, ChevronDown } from 'lucide-react';
import AddCustomerModal from './AddCustomerModal';
import SplitPaymentModal from './SplitPaymentModal';
import { SplitPaymentData } from '../../types/cart';

interface NewSalesCheckoutProps {
  cart: CartItem[];
  onCheckoutComplete: () => void;
  isOnline: boolean;
  customers: Customer[];
  onCustomersRefresh: () => void;
  updateCustomer: (id: string, updates: Partial<Customer>) => Promise<any>;
}

const NewSalesCheckout: React.FC<NewSalesCheckoutProps> = ({
  cart,
  onCheckoutComplete,
  isOnline,
  customers: initialCustomers,
  onCustomersRefresh,
  updateCustomer
}) => {
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'mpesa' | 'debt' | 'split'>('cash');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAddCustomerModalOpen, setIsAddCustomerModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isSplitPaymentModalOpen, setIsSplitPaymentModalOpen] = useState(false);
  const [splitPaymentData, setSplitPaymentData] = useState<SplitPaymentData | null>(null);
  const [showRefInput, setShowRefInput] = useState(false);
  const [salesReference, setSalesReference] = useState('');

  const { user } = useAuth();
  const { toast } = useToast();
  const { createSale } = useUnifiedSales();
  const { updateProduct, forceRefetch: forceReloadProducts, products } = useUnifiedProducts();
  const { calculateCustomerDebt } = useOfflineDebtManager();

// Use customers from parent to ensure single source of truth
const allCustomers = initialCustomers;

  // Update selected customer when customer list changes or selection changes
  useEffect(() => {
    if (selectedCustomerId) {
      const customer = allCustomers.find(c => c.id === selectedCustomerId);
      console.log('[NewSalesCheckout] Updating selected customer:', {
        selectedCustomerId,
        found: customer ? { id: customer.id, name: customer.name, debt: customer.outstandingDebt } : null,
        totalCustomers: allCustomers.length
      });
      setSelectedCustomer(customer || null);
    } else {
      setSelectedCustomer(null);
    }
  }, [selectedCustomerId, allCustomers]);

  // Listen for customer refresh events
  useEffect(() => {
    const handleCustomersRefreshed = () => {
      console.log('[NewSalesCheckout] Customers refreshed event received');
      // Force re-evaluation of customer selection
      if (selectedCustomerId) {
        const customer = allCustomers.find(c => c.id === selectedCustomerId);
        setSelectedCustomer(customer || null);
      }
    };

    window.addEventListener('customers-refreshed', handleCustomersRefreshed);
    return () => window.removeEventListener('customers-refreshed', handleCustomersRefreshed);
  }, [selectedCustomerId, allCustomers]);

  const total = cart.reduce((sum, item) => sum + item.sellingPrice * item.quantity, 0);

const handleCustomerAdded = useCallback(async (newCustomer: Customer) => {
  console.log('[NewSalesCheckout] Customer added successfully:', {
    id: newCustomer.id,
    name: newCustomer.name,
    phone: newCustomer.phone,
    debt: newCustomer.outstandingDebt
  });
  
  try {
    // Refresh customers from parent to ensure consistency across components
    await onCustomersRefresh();
    
    // Set the new customer as selected immediately for instant UI feedback
    setSelectedCustomer(newCustomer);
    setSelectedCustomerId(newCustomer.id);
    
    // Close the modal
    setIsAddCustomerModalOpen(false);
    
    // Show success feedback
    toast({
      title: "Customer Added & Selected",
      description: `${newCustomer.name} has been added and is now selected for this sale.`,
    });
    
    // Log the current state for debugging
    console.log('[NewSalesCheckout] Customer selection updated:', {
      selectedCustomerId: newCustomer.id,
      selectedCustomerName: newCustomer.name,
      selectedCustomerDebt: newCustomer.outstandingDebt
    });
    
  } catch (error) {
    console.error('[NewSalesCheckout] Error handling customer addition:', error);
    
    // Still try to select the customer even if refresh failed
    setSelectedCustomer(newCustomer);
    setSelectedCustomerId(newCustomer.id);
    setIsAddCustomerModalOpen(false);
    
    toast({
      title: "Customer Added",
      description: `${newCustomer.name} has been added. If you don't see them in the dropdown, try refreshing the page.`,
      variant: "destructive",
    });
  }
}, [onCustomersRefresh, toast]);

  const handleCheckout = async () => {
    console.log('[NewSalesCheckout] Starting checkout:', {
      cart: cart.length,
      selectedCustomerId,
      selectedCustomer: selectedCustomer ? {
        id: selectedCustomer.id,
        name: selectedCustomer.name,
        debt: selectedCustomer.outstandingDebt
      } : null,
      paymentMethod,
      total,
      isOnline
    });

    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to complete the sale.",
        variant: "destructive",
      });
      return;
    }

    if (cart.length === 0) {
      toast({
        title: "Empty Cart",
        description: "Please add items to your cart before checking out.",
        variant: "destructive",
      });
      return;
    }

    if (paymentMethod === 'debt' && !selectedCustomerId) {
      toast({
        title: "Customer Required",
        description: "Please select a customer for debt transactions.",
        variant: "destructive",
      });
      return;
    }

    if (paymentMethod === 'split' && !splitPaymentData) {
      toast({
        title: "Split Payment Required",
        description: "Please configure split payment methods first.",
        variant: "destructive",
      });
      return;
    }

    if (paymentMethod === 'split' && splitPaymentData?.methods.debt && !selectedCustomerId) {
      toast({
        title: "Customer Required",
        description: "Please select a customer for debt portion of split payment.",
        variant: "destructive",
      });
      return;
    }

    if (paymentMethod === 'debt' && selectedCustomerId && !selectedCustomer) {
      toast({
        title: "Customer Not Found",
        description: "The selected customer could not be found. Please select a different customer.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      // Generate a clientSaleId for this checkout session to ensure idempotency across items
      const clientSaleId = `cs_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      // For debt sales or split payments with debt, update customer debt
      let updatedCustomer = selectedCustomer;
      const debtAmount = paymentMethod === 'debt' ? total : 
                        (paymentMethod === 'split' && splitPaymentData?.methods.debt ? splitPaymentData.methods.debt.amount : 0);
      
      if (debtAmount > 0 && selectedCustomer) {
        console.log('[NewSalesCheckout] Processing debt payment - updating customer:', {
          customerId: selectedCustomer.id,
          customerName: selectedCustomer.name,
          currentDebt: selectedCustomer.outstandingDebt,
          additionalDebt: debtAmount,
          newTotalDebt: (selectedCustomer.outstandingDebt || 0) + debtAmount
        });

        const customerUpdates = {
          outstandingDebt: (selectedCustomer.outstandingDebt || 0) + debtAmount,
          totalPurchases: (selectedCustomer.totalPurchases || 0) + total,
          lastPurchaseDate: new Date().toISOString(),
        };
        
        // Rely on DB trigger for customer aggregates; avoid client-side debt updates

      }

      // Process each item in the cart as a separate sale
      let salesProcessed = 0;
      for (const item of cart) {
        const itemTotal = item.sellingPrice * item.quantity;
        const profit = item.costPrice > 0 ? (item.sellingPrice - item.costPrice) * item.quantity : 0;
        
        console.log('[NewSalesCheckout] Creating sale data for item:', {
          itemName: item.name,
          itemTotal,
          total,
          paymentMethod,
          splitPaymentData: splitPaymentData ? {
            cash: splitPaymentData.methods.cash?.amount || 0,
            mpesa: splitPaymentData.methods.mpesa?.amount || 0,
            debt: splitPaymentData.methods.debt?.amount || 0,
            discount: splitPaymentData.methods.discount?.amount || 0
          } : null,
          selectedCustomer: updatedCustomer ? {
            id: updatedCustomer.id,
            name: updatedCustomer.name,
            currentDebt: updatedCustomer.outstandingDebt
          } : null
        });

        // Calculate proportional amounts for split payments
        const splitRatio = itemTotal / total;
        const itemPaymentDetails = paymentMethod === 'split' && splitPaymentData ? {
          cashAmount: Math.round((splitPaymentData.methods.cash?.amount || 0) * splitRatio),
          mpesaAmount: Math.round((splitPaymentData.methods.mpesa?.amount || 0) * splitRatio),
          debtAmount: Math.round((splitPaymentData.methods.debt?.amount || 0) * splitRatio),
          discountAmount: Math.round((splitPaymentData.methods.discount?.amount || 0) * splitRatio),
          saleReference: salesReference || undefined,
        } : {
          cashAmount: paymentMethod === 'cash' ? itemTotal : 0,
          mpesaAmount: paymentMethod === 'mpesa' ? itemTotal : 0,
          debtAmount: paymentMethod === 'debt' ? itemTotal : 0,
          discountAmount: 0,
          saleReference: salesReference || undefined,
        };

        console.log('[NewSalesCheckout] Item payment details calculated:', {
          itemName: item.name,
          splitRatio,
          itemPaymentDetails,
          expectedDebtAmount: itemPaymentDetails.debtAmount
        });

        const saleData: Omit<Sale, 'id' | 'synced'> = {
          productId: item.id,
          productName: item.name,
          quantity: item.quantity,
          sellingPrice: item.sellingPrice,
          costPrice: item.costPrice,
          profit: profit,
          total: itemTotal,
          customerId: updatedCustomer?.id || undefined,
          customerName: updatedCustomer?.name || undefined,
          paymentMethod: paymentMethod,
          paymentDetails: itemPaymentDetails,
          timestamp: new Date().toISOString(),
          clientSaleId: clientSaleId,
        };

        console.log('[NewSalesCheckout] Creating sale for item:', {
          itemName: item.name,
          saleData: {
            productId: saleData.productId,
            paymentMethod: saleData.paymentMethod,
            paymentDetails: saleData.paymentDetails,
            customerId: saleData.customerId,
            customerName: saleData.customerName,
            total: saleData.total
          }
        });
        
        const createdSale = await createSale(saleData);
        console.log('[NewSalesCheckout] Sale created successfully:', {
          itemName: item.name,
          saleId: createdSale.id,
          debtAmount: createdSale.paymentDetails.debtAmount,
          customerId: createdSale.customerId
        });

        // Debt increases are now handled automatically by database trigger
        // No manual debt recording needed to prevent duplication
        if (itemPaymentDetails.debtAmount > 0 && updatedCustomer) {
          console.log('[NewSalesCheckout] Debt will be updated by database trigger:', {
            customerId: updatedCustomer.id,
            customerName: updatedCustomer.name,
            debtAmount: itemPaymentDetails.debtAmount,
            saleId: createdSale.id
          });
        }

        // Update product stock - use direct approach for variants like SalesCheckout
        console.log('[NewSalesCheckout] Updating stock for product:', {
          id: item.id,
          name: item.name,
          variant_name: item.variant_name,
          parent_id: item.parent_id,
          currentStock: item.currentStock,
          quantity: item.quantity,
          variant_multiplier: item.variant_multiplier,
          stock_derivation_quantity: item.stock_derivation_quantity
        });
        
        try {
          if (item.currentStock !== -1) {
            // Check if this is a variant product
            if (item.parent_id) {
              // For variants, update parent stock using multiplier calculation
              const variantMultiplier = item.variant_multiplier || 1;
              const stockDerivationQty = item.stock_derivation_quantity || 1;
              const parentStockReduction = item.quantity * variantMultiplier * stockDerivationQty;
              
              console.log('[NewSalesCheckout] Variant stock calculation:', {
                quantity: item.quantity,
                variantMultiplier,
                stockDerivationQty,
                parentStockReduction
              });
              
              // Get current parent product from products array
              const parentProduct = products.find(p => p.id === item.parent_id);
              
              if (parentProduct) {
                const currentParentStock = parentProduct.currentStock || 0;
                const newParentStock = Math.max(0, currentParentStock - parentStockReduction);
                
                console.log('[NewSalesCheckout] Updating parent stock:', {
                  parentId: item.parent_id,
                  currentParentStock,
                  newParentStock,
                  reduction: parentStockReduction
                });
                
                await updateProduct(item.parent_id, { 
                  currentStock: newParentStock,
                  updatedAt: new Date().toISOString()
                });
                console.log('[NewSalesCheckout] Parent product stock updated for variant:', item.name, 'Parent stock reduction:', parentStockReduction, 'New parent stock:', newParentStock);
              } else {
                console.error('[NewSalesCheckout] Warning: Parent product not found for variant:', item.name, 'Parent ID:', item.parent_id);
              }
            } else {
              // Regular product stock update
              const currentStock = item.currentStock || 0;
              const newStock = Math.max(0, currentStock - item.quantity);
              
              console.log('[NewSalesCheckout] Updating regular product stock:', {
                productId: item.id,
                currentStock,
                newStock,
                quantity: item.quantity
              });
              
              await updateProduct(item.id, { 
                currentStock: newStock,
                updatedAt: new Date().toISOString()
              });
              console.log('[NewSalesCheckout] Regular product stock updated:', item.name, 'New stock:', newStock);
            }
          } else {
            console.log('[NewSalesCheckout] Skipping stock update for unspecified quantity product:', item.name);
          }
          
          console.log('[NewSalesCheckout] Stock update completed for:', item.name);
        } catch (error) {
          console.error('[NewSalesCheckout] Stock update failed for:', item.name, error);
          // Don't fail the sale if stock update fails
        }

        salesProcessed++;
       }
 
      // Customer totals are handled by DB trigger; no client-side adjustments needed

 
       // Force reload products to refresh stock display
      console.log('[NewSalesCheckout] Forcing product reload to refresh stock displays');
      try {
        if (forceReloadProducts) {
          await forceReloadProducts();
          console.log('[NewSalesCheckout] Product reload completed successfully');
        }
      } catch (error) {
        console.error('[NewSalesCheckout] Product reload failed:', error);
      }

      // Show success message
      let successMessage = '';
      if (paymentMethod === 'split') {
        successMessage = `Split payment completed! ${formatCurrency(total)} processed across multiple methods.${!isOnline ? ' (will sync when online)' : ''}`;
      } else if (paymentMethod === 'debt') {
        successMessage = `Sale completed! Customer debt increased by ${formatCurrency(total)}.${!isOnline ? ' (will sync when online)' : ''}`;
      } else {
        successMessage = `Successfully processed ${salesProcessed} item(s) for ${formatCurrency(total)}.${!isOnline ? ' (will sync when online)' : ''}`;
      }

      toast({
        title: "Sale Completed!",
        description: successMessage,
      });

console.log('[NewSalesCheckout] Checkout completed successfully');

// Notify other parts of the app and refresh customers
window.dispatchEvent(new CustomEvent('sale-completed'));
window.dispatchEvent(new CustomEvent('checkout-completed'));

// Force customer refresh to show updated debt balances
console.log('[NewSalesCheckout] Forcing customer refresh after sale completion');
await onCustomersRefresh();

// Additional event to ensure all customer-related components update
window.dispatchEvent(new CustomEvent('customers-refreshed', {
  detail: { trigger: 'post-checkout', timestamp: new Date().toISOString() }
}));

// Reset states
setSelectedCustomerId(null);
setPaymentMethod('cash');
setSplitPaymentData(null);

onCheckoutComplete();

    } catch (error) {
      console.error('[NewSalesCheckout] Checkout failed:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      
      toast({
        title: "Checkout Failed",
        description: `Unable to complete sale: ${errorMessage}`,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const isDisabled = isProcessing || 
    cart.length === 0 || 
    (paymentMethod === 'debt' && !selectedCustomer) ||
    (paymentMethod === 'split' && (!splitPaymentData || (splitPaymentData.methods.debt && !selectedCustomer)));

  return (
    <div className="space-y-6 p-6 bg-background">
      {/* Customer Selection */}
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium mb-3 block text-foreground">Customer Selection</label>
          <div className="space-y-3">
            <div className="flex gap-2">
              <Select 
                value={selectedCustomerId || 'no-customer'} 
                onValueChange={(value) => {
                  const newCustomerId = value === 'no-customer' ? null : value;
                  console.log('[NewSalesCheckout] Customer selection changed:', {
                    oldId: selectedCustomerId,
                    newId: newCustomerId,
                    availableCustomers: allCustomers.length
                  });
                  setSelectedCustomerId(newCustomerId);
                }}
              >
                <SelectTrigger className="flex-1 h-12 bg-background border border-border hover:border-primary/50 transition-colors">
                  <SelectValue>
                    {selectedCustomer ? (
                      <div className="flex flex-col items-start w-full">
                        <div className="flex items-center gap-2">
                          <User size={14} className="text-primary" />
                          <span className="font-medium">{selectedCustomer.name}</span>
                        </div>
                        {selectedCustomer.outstandingDebt > 0 && (
                          <span className="text-xs text-red-600 font-medium mt-1">
                            Outstanding Debt: {formatCurrency(selectedCustomer.outstandingDebt)}
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <User size={14} />
                        <span>No Customer Selected</span>
                      </div>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="no-customer">
                    <div className="flex items-center gap-2">
                      <User size={14} className="text-muted-foreground" />
                      <span>No Customer</span>
                    </div>
                  </SelectItem>
                  {allCustomers.map(customer => (
                    <SelectItem key={customer.id} value={customer.id}>
                      <div className="flex flex-col items-start w-full">
                        <div className="flex items-center gap-2">
                          <User size={14} className="text-primary" />
                          <span className="font-medium">{customer.name}</span>
                          <span className="text-xs text-muted-foreground">({customer.phone})</span>
                        </div>
                        {customer.outstandingDebt > 0 && (
                          <span className="text-xs text-red-600 font-medium mt-1">
                            Debt: {formatCurrency(customer.outstandingDebt)}
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="icon"
                className="h-12 w-12 border-border hover:border-primary/50 transition-colors"
                onClick={() => setIsAddCustomerModalOpen(true)}
              >
                <UserPlus size={16} />
              </Button>
            </div>
            
            {/* Customer Debt Display */}
            {selectedCustomer && selectedCustomer.outstandingDebt > 0 && (
              <Card className="border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-800">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
                    <AlertTriangle size={14} />
                    <span className="text-sm font-medium">Customer has outstanding debt</span>
                  </div>
                  <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                    Current debt: {formatCurrency(selectedCustomer.outstandingDebt)}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Payment Method Selection */}
        <div>
          <label className="text-sm font-medium mb-2 block">Payment Method</label>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant={paymentMethod === 'cash' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPaymentMethod('cash')}
              className="flex-1"
            >
              <Banknote size={14} className="mr-1" />
              Cash
            </Button>
            <Button
              variant={paymentMethod === 'mpesa' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPaymentMethod('mpesa')}
              className="flex-1"
            >
              <DollarSign size={14} className="mr-1" />
              M-Pesa
            </Button>
            <Button
              variant={paymentMethod === 'debt' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPaymentMethod('debt')}
              className="flex-1"
            >
              <Receipt size={14} className="mr-1" />
              Debt
            </Button>
            <Button
              variant={paymentMethod === 'split' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setIsSplitPaymentModalOpen(true)}
              className="flex-1"
            >
              <Split size={14} className="mr-1" />
              Split
            </Button>
          </div>
        </div>
      </div>

      {/* Customer Required Warning */}
      {(paymentMethod === 'debt' && !selectedCustomer) && (
        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
              <AlertTriangle size={14} />
              <span className="text-sm font-medium">Customer required for debt transactions</span>
            </div>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
              Please select a customer or add a new one to proceed with debt payment.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Split Payment Summary */}
      {paymentMethod === 'split' && splitPaymentData && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Split size={16} className="text-primary" />
              <span className="font-medium text-primary">Split Payment Configured</span>
            </div>
            <div className="space-y-2 text-sm">
              {splitPaymentData.methods.cash && (
                <div className="flex justify-between">
                  <span className="flex items-center gap-1">
                    <Banknote size={12} />Cash
                  </span>
                  <span className="font-medium">{formatCurrency(splitPaymentData.methods.cash.amount)}</span>
                </div>
              )}
              {splitPaymentData.methods.mpesa && (
                <div className="flex justify-between">
                  <span className="flex items-center gap-1">
                    <DollarSign size={12} />M-Pesa
                  </span>
                  <span className="font-medium">{formatCurrency(splitPaymentData.methods.mpesa.amount)}</span>
                </div>
              )}
              {splitPaymentData.methods.debt && (
                <div className="flex justify-between">
                  <span className="flex items-center gap-1">
                    <Receipt size={12} />Debt
                  </span>
                  <span className="font-medium">{formatCurrency(splitPaymentData.methods.debt.amount)}</span>
                </div>
              )}
            </div>
            
            {/* Customer Selection Required for Debt in Split Payment */}
            {splitPaymentData.methods.debt && !selectedCustomer && (
              <div className="mt-3 pt-3 border-t border-primary/20">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle size={14} className="text-amber-600" />
                  <span className="text-sm font-medium text-amber-700">Customer Required for Debt</span>
                </div>
                <p className="text-xs text-amber-600 mb-2">
                  Select a customer above for the debt portion ({formatCurrency(splitPaymentData.methods.debt.amount)})
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Cart Summary */}
      <Card>
        <CardContent className="p-4">
          <div className="flex justify-between items-center">
            <span className="font-medium">Total:</span>
            <span className="font-bold text-xl text-primary">{formatCurrency(total)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Toggle for Sales Reference */}
      <div className="flex justify-end">
        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setShowRefInput(v => !v)} aria-expanded={showRefInput} aria-controls="sales-ref-input">
          <ChevronDown className={`h-4 w-4 transition-transform ${showRefInput ? 'rotate-180' : ''}`} />
        </Button>
      </div>
      {showRefInput && (
        <Input
          id="sales-ref-input"
          placeholder="Sales reference (optional)"
          value={salesReference}
          onChange={(e) => setSalesReference(e.target.value)}
          className="w-full"
        />
      )}

      {/* Checkout Button */}
      <Button
        onClick={handleCheckout}
        disabled={isDisabled}
        className="w-full px-6 py-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed text-white font-black text-lg rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:scale-105 disabled:transform-none active:scale-95 min-h-[56px]"
      >
        {isProcessing ? (
          <div className="flex items-center justify-center gap-2">
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Processing Sale...
          </div>
        ) : (
          `Complete Sale - ${formatCurrency(total)}`
        )}
      </Button>

      {/* Add Customer Modal */}
      <AddCustomerModal
        open={isAddCustomerModalOpen}
        onOpenChange={setIsAddCustomerModalOpen}
        onCustomerAdded={handleCustomerAdded}
      />

      {/* Split Payment Modal */}
      <SplitPaymentModal
        open={isSplitPaymentModalOpen}
        onOpenChange={setIsSplitPaymentModalOpen}
        total={total}
        customers={allCustomers}
        onConfirm={(data) => {
          setSplitPaymentData(data);
          setPaymentMethod('split');
          setIsSplitPaymentModalOpen(false);
          // Auto-select customer if debt is part of split
          if (data.methods.debt?.customerId) {
            setSelectedCustomerId(data.methods.debt.customerId);
          }
        }}
      />
    </div>
  );
};

export default NewSalesCheckout;