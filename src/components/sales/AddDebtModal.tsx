import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useUnifiedCustomers } from '@/hooks/useUnifiedCustomers';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useCacheManager } from '@/hooks/useCacheManager';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/utils/currency';
import { DollarSign, UserPlus, AlertTriangle, TrendingUp, WifiOff } from 'lucide-react';
import AddCustomerModal from './AddCustomerModal';

interface AddDebtModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AddDebtModal = ({ isOpen, onClose }: AddDebtModalProps) => {
  const { customers, updateCustomer, refetch } = useUnifiedCustomers();
  const { user } = useAuth();
  const { toast } = useToast();
  const { isOnline } = useNetworkStatus();
  const { addPendingOperation } = useCacheManager();

  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [debtAmount, setDebtAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showAddCustomer, setShowAddCustomer] = useState(false);

  const selectedCustomer = customers.find(c => c.id === selectedCustomerId);
  const totalAmount = parseFloat(debtAmount) || 0;

  // Reset form when modal is closed
  useEffect(() => {
    if (!isOpen) {
      setSelectedCustomerId('');
      setDebtAmount('');
      setNotes('');
      setIsProcessing(false);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedCustomerId || !debtAmount || totalAmount <= 0) {
      toast({
        title: "Missing Information",
        description: "Please select a customer and enter a valid debt amount.",
        variant: "destructive",
      });
      return;
    }

    if (!user) {
      toast({
        title: "Authentication Error",
        description: "You must be logged in to record debt.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      const transactionData = {
        user_id: user.id,
        customer_id: selectedCustomerId,
        item_id: null, // No product for cash lending
        quantity: 1,
        unit_price: totalAmount,
        total_amount: totalAmount,
        notes: notes || 'Cash lending transaction',
        paid: false,
      };

      // Update customer debt using the unified hook (handles both online/offline)
      if (selectedCustomer) {
        const currentDebt = selectedCustomer.outstandingDebt || 0;
        const updatedDebt = currentDebt + totalAmount;
        
        await updateCustomer(selectedCustomer.id, {
          outstandingDebt: updatedDebt,
          lastPurchaseDate: new Date().toISOString(),
        });
      }

      // Handle transaction creation through unified system
      if (isOnline) {
        try {
          // Online - direct to database
          const { error: transactionError } = await supabase
            .from('transactions')
            .insert(transactionData);

          if (transactionError) {
            console.error('Transaction creation failed, queuing for sync:', transactionError);
            // Queue for sync if direct insert fails
            addPendingOperation({
              type: 'transaction',
              operation: 'create',
              data: transactionData,
            });
          }
        } catch (error) {
          console.error('Transaction creation failed, queuing for sync:', error);
          // Queue for sync if network request fails
          addPendingOperation({
            type: 'transaction',
            operation: 'create',
            data: transactionData,
          });
        }
      } else {
        // Offline - queue for sync
        addPendingOperation({
          type: 'transaction',
          operation: 'create',
          data: transactionData,
        });
      }

      toast({
        title: "Cash Lending Recorded",
        description: `Debt of ${formatCurrency(totalAmount)} recorded for ${selectedCustomer?.name}${!isOnline ? ' (will sync when online)' : ''}`,
      });

      // Reset form and close
      setSelectedCustomerId('');
      setDebtAmount('');
      setNotes('');
      onClose();
      
    } catch (error) {
      console.error('Error recording debt:', error);
      toast({
        title: "Error",
        description: "Failed to record debt transaction.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCustomerAdded = async (customer: any) => {
    console.log('🎯 Customer added successfully, setting selection:', customer);
    
    try {
      // Force refresh customers from the unified hook to ensure latest data
      await refetch();
      
      // Set the new customer as selected immediately for instant UI feedback
      setSelectedCustomerId(customer.id);
      
      // Close the modal
      setShowAddCustomer(false);
      
      // Show success feedback
      toast({
        title: "Customer Added & Selected",
        description: `${customer.name} has been added and is now selected for debt recording.`,
      });
      
      // Log the current state for debugging
      console.log('🎯 Customer selection updated in AddDebtModal:', {
        selectedCustomerId: customer.id,
        selectedCustomerName: customer.name,
        selectedCustomerDebt: customer.outstandingDebt
      });
      
    } catch (error) {
      console.error('🎯 Error in handleCustomerAdded:', error);
      
      // Fallback: still set selection even if refresh fails
      setSelectedCustomerId(customer.id);
      setShowAddCustomer(false);
      
      toast({
        title: "Customer Added",
        description: `${customer.name} has been selected for debt recording.`,
      });
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[500px] max-h-[95vh] w-[95vw] overflow-y-auto bg-white dark:bg-slate-800 fixed z-[10000] mx-auto my-auto">
          <DialogHeader className="space-y-3 pb-4">
            <DialogTitle className="flex items-center gap-3 text-xl font-bold">
              <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg">
                <DollarSign className="w-5 h-5 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-bold text-red-700 dark:text-red-300">Record Cash Lending</span>
                <span className="text-xs font-medium text-red-600 dark:text-red-400 uppercase tracking-wide">
                  Debt Management
                  {!isOnline && (
                    <span className="inline-flex items-center gap-1 ml-2 text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/20 px-2 py-1 rounded-full">
                      <WifiOff className="w-3 h-3" />
                      Offline
                    </span>
                  )}
                </span>
              </div>
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border-l-4 border-red-500">
              Record a cash loan to a customer that will be tracked as debt in your system
            </DialogDescription>
          </DialogHeader>

          <Separator className="my-4" />

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Customer Selection */}
            <div className="space-y-3">
              <Label className="text-sm font-medium flex items-center gap-2">
                <span>Customer</span>
                <Badge variant="destructive" className="text-xs">Required</Badge>
              </Label>
              <div className="flex gap-2">
                <Select
                  value={selectedCustomerId}
                  onValueChange={(value) => {
                    console.log('🎯 Customer selected:', value);
                    setSelectedCustomerId(value);
                  }}
                >
                  <SelectTrigger className="flex-1 h-12 bg-white dark:bg-slate-700 border-2 border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 focus:border-red-500 dark:focus:border-red-400" style={{ fontSize: '16px' }}>
                    <SelectValue placeholder="Choose a customer..." />
                  </SelectTrigger>
                  <SelectContent 
                    className="bg-white dark:bg-slate-800 border-2 border-gray-300 dark:border-gray-600 shadow-xl z-[10001] max-h-64 overflow-y-auto"
                    position="popper"
                    sideOffset={5}
                  >
                    {customers.length === 0 ? (
                      <div className="p-4 text-center text-sm text-muted-foreground">
                        <div className="flex flex-col items-center gap-2">
                          <UserPlus className="w-8 h-8 text-gray-400" />
                          <p>No customers found.</p>
                          <p className="text-xs">Click + to add a customer first.</p>
                        </div>
                      </div>
                    ) : (
                      customers.map((customer) => (
                        <SelectItem 
                          key={customer.id} 
                          value={customer.id}
                          className="cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700 p-3"
                        >
                          <div className="flex items-center justify-between w-full">
                            <div className="flex flex-col items-start">
                              <span className="font-medium text-gray-900 dark:text-white">{customer.name}</span>
                              <span className="text-xs text-muted-foreground">
                                {customer.phone}
                              </span>
                            </div>
                            {customer.outstandingDebt > 0 && (
                              <Badge variant="secondary" className="ml-2 text-xs">
                                Debt: {formatCurrency(customer.outstandingDebt)}
                              </Badge>
                            )}
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    console.log('🎯 Opening add customer modal');
                    setShowAddCustomer(true);
                  }}
                  className="h-12 w-12 shrink-0 border-2 border-red-300 dark:border-red-600 hover:border-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                  title="Add new customer"
                >
                  <UserPlus className="w-4 h-4 text-red-600 dark:text-red-400" />
                </Button>
              </div>
              
              {/* Customer Selection Status */}
              {selectedCustomer && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-300 dark:border-green-700 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm font-medium text-green-700 dark:text-green-300">
                      Selected: {selectedCustomer.name} ({selectedCustomer.phone})
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Debt Amount */}
            <div className="space-y-3">
              <Label className="text-sm font-medium flex items-center gap-2">
                <span>Debt Amount</span>
                <Badge variant="destructive" className="text-xs">Required</Badge>
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-sm font-medium text-muted-foreground">KSH</span>
                <Input
                  id="debtAmount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={debtAmount}
                  onChange={(e) => setDebtAmount(e.target.value)}
                  placeholder="0.00"
                  className="pl-12 h-12 text-lg font-semibold"
                  style={{ fontSize: '16px' }}
                />
              </div>
            </div>

            {/* Amount Summary */}
            {totalAmount > 0 && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-red-600 dark:text-red-400">
                    Amount to lend:
                  </span>
                  <span className="text-lg font-bold text-red-700 dark:text-red-300">
                    {formatCurrency(totalAmount)}
                  </span>
                </div>
              </div>
            )}

            {/* Customer Debt Info */}
            {selectedCustomer && (
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-3">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-amber-600 dark:text-amber-400">Current debt:</span>
                    <span className="font-semibold text-amber-700 dark:text-amber-300">
                      {formatCurrency(selectedCustomer.outstandingDebt || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-amber-100 dark:bg-amber-900/30 rounded border border-amber-200 dark:border-amber-600">
                    <span className="text-sm font-medium text-amber-600 dark:text-amber-400">New total debt:</span>
                    <span className="font-bold text-amber-700 dark:text-amber-300">
                      {formatCurrency((selectedCustomer.outstandingDebt || 0) + totalAmount)}
                    </span>
                  </div>
                  {selectedCustomer.creditLimit && (selectedCustomer.outstandingDebt || 0) + totalAmount > selectedCustomer.creditLimit && (
                    <div className="bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded p-2 mt-2">
                      <p className="text-xs text-red-700 dark:text-red-300 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        Exceeds credit limit of {formatCurrency(selectedCustomer.creditLimit)}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Notes */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any additional notes about this cash lending transaction..."
                rows={3}
                className="resize-none"
              />
            </div>

            <Separator className="my-6" />

            {/* Action Buttons */}
            <div className="flex flex-col-reverse sm:flex-row gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1 h-14 font-semibold border-2 border-gray-300 hover:border-gray-400 dark:border-gray-600 dark:hover:border-gray-500"
                disabled={isProcessing}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 h-14 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold shadow-lg hover:shadow-xl transition-all duration-200 active:scale-98"
                disabled={isProcessing || !selectedCustomerId || !debtAmount || totalAmount <= 0}
              >
                {isProcessing ? (
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span className="font-bold">Recording...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <DollarSign className="w-5 h-5" />
                    <span className="font-bold">Record Cash Lending</span>
                  </div>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Customer Modal */}
      {showAddCustomer && (
        <AddCustomerModal
          open={showAddCustomer}
          onOpenChange={(open) => {
            console.log('🎯 Add customer modal state change:', open);
            setShowAddCustomer(open);
          }}
          onCustomerAdded={handleCustomerAdded}
        />
      )}
    </>
  );
};

export default AddDebtModal;
