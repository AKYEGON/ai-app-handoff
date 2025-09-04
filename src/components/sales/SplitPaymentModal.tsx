import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ColoredPaymentSlider } from '@/components/ui/colored-payment-slider';
import { Input } from '@/components/ui/input';
import MobileOptimizedModal from '@/components/ui/mobile-optimized-modal';
import { formatCurrency, parseCurrency } from '@/utils/currency';
import { Customer } from '@/types';
import { Banknote, CreditCard, UserX, Split, Percent } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import type { SplitPaymentData } from '@/types/cart';

interface SplitPaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  total: number;
  customers: Customer[];
  onConfirm: (data: SplitPaymentData) => void;
  context?: 'sales' | 'debt'; // Add context to differentiate between sales and debt scenarios
}

const SplitPaymentModal: React.FC<SplitPaymentModalProps> = ({
  open,
  onOpenChange,
  total,
  customers,
  onConfirm,
  context = 'sales' // Default to sales context for backward compatibility
}) => {
  const [selectedMethods, setSelectedMethods] = useState({
    cash: false,
    mpesa: false,
    debt: false,
    discount: false,
  });

  const [sliderValues, setSliderValues] = useState([50]);
  
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  
  // Direct amount inputs
  const [directAmounts, setDirectAmounts] = useState<{
    cash: string;
    mpesa: string;
    debt: string;
    discount: string;
  }>({
    cash: '0',
    mpesa: '0',
    debt: '0',
    discount: '0'
  });

  const [lockedInputs, setLockedInputs] = useState<Set<string>>(new Set());

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      // Set default methods based on context
      if (context === 'debt') {
        // For debt payments, only allow cash, mpesa, and discount (no debt option)
        setSelectedMethods({ cash: false, mpesa: true, debt: false, discount: true });
      } else {
        // For sales, allow all methods including debt
        setSelectedMethods({ cash: false, mpesa: true, debt: false, discount: true });
      }
      
      // Start with full amount on M-Pesa and zero discount
      setSliderValues([99]); // visual bias toward first segment
      setSelectedCustomerId('');
      setDirectAmounts({
        cash: '0',
        mpesa: Math.round(total).toString(),
        debt: '0',
        discount: '0'
      });
    }
  }, [open, total, context]);

  const handleMethodToggle = useCallback((method: keyof typeof selectedMethods, enabled: boolean) => {
    setSelectedMethods(prev => {
      const next = { ...prev, [method]: enabled };

      // Prevent disabling the last non-discount method
      const nonDiscountEnabled = Object.entries(next).filter(([k, v]) => k !== 'discount' && v).length;
      if (nonDiscountEnabled === 0) {
        return prev; // must have at least one non-discount method
      }

      // Recalculate amounts evenly for enabled methods (including discount) and clear locks
      const enabledMethodsAll = Object.entries(next).filter(([, v]) => v).map(([k]) => k) as Array<keyof typeof directAmounts>;
      if (enabledMethodsAll.length >= 2) {
        const split = (total / enabledMethodsAll.length).toFixed(2);
        const newAmounts = { cash: '0.00', mpesa: '0.00', debt: '0.00', discount: '0.00' } as typeof directAmounts;
        enabledMethodsAll.forEach(m => { newAmounts[m] = split; });
        setDirectAmounts(newAmounts);
        setSliderValues(Array.from({ length: Math.max(1, enabledMethodsAll.length - 1) }, (_, i) => Math.round(((i + 1) / enabledMethodsAll.length) * 100) - 1));
        setLockedInputs(new Set());
      }

      return next;
    });
  }, [total, directAmounts]);

  const calculateAmounts = useCallback(() => {
    const enabledAll = Object.entries(selectedMethods)
      .filter(([, enabled]) => enabled)
      .map(([m]) => m);

    const nonDiscountEnabled = Object.entries(selectedMethods)
      .filter(([k, v]) => k !== 'discount' && v).length;

    if (enabledAll.length < 2 || nonDiscountEnabled < 1) {
      return { methods: {}, total, isValid: false } as SplitPaymentData;
    }

    const methods: SplitPaymentData['methods'] = {};

    // Compute amounts and percentages against total for all enabled (including discount)
    enabledAll.forEach(method => {
      const raw = parseCurrency(directAmounts[method as keyof typeof directAmounts]) || 0;
      const amount = Math.max(0, Math.round(raw));
      const pct = total > 0 ? (amount / total) * 100 : 0;
      if (method === 'cash') methods.cash = { amount, percentage: pct };
      if (method === 'mpesa') methods.mpesa = { amount, percentage: pct };
      if (method === 'debt') methods.debt = { amount, percentage: pct, customerId: selectedCustomerId };
      if (method === 'discount') methods.discount = { amount, percentage: pct };
    });

    // Validate total (including discount) for exact integer match
    const sumAll = enabledAll.reduce((s, m) => s + Math.round(parseCurrency(directAmounts[m as keyof typeof directAmounts]) || 0), 0);
    const isValid = sumAll === Math.round(total) && nonDiscountEnabled >= 1;

    return { methods, total, isValid };
  }, [selectedMethods, directAmounts, total, selectedCustomerId]);

  const paymentData = calculateAmounts();
  const enabledAllMethods = Object.entries(selectedMethods).filter(([, v]) => v).map(([m]) => m);
  const enabledCount = enabledAllMethods.length;
  const nonDiscountEnabledCount = Object.entries(selectedMethods).filter(([k, v]) => k !== 'discount' && v).length;

  const handleSliderChange = useCallback((values: number[]) => {
    // Ensure sorted and clamped values between 1 and 99
    const sorted = [...values].sort((a, b) => a - b).map(v => Math.max(1, Math.min(99, v)));
    setSliderValues(sorted);

    const methods = enabledAllMethods as Array<keyof typeof directAmounts>;
    if (methods.length < 2) return;

    const boundaries = [0, ...sorted, 100];
    const percents = boundaries.slice(0, -1).map((b, i) => (boundaries[i + 1] - b));
    const newAmounts = { cash: '0', mpesa: '0', debt: '0', discount: '0' } as typeof directAmounts;

    let allocated = 0;
    percents.forEach((p, i) => {
      const isLast = i === percents.length - 1;
      const amt = isLast ? Math.max(0, Math.round(total) - allocated) : Math.round((Math.round(total) * p) / 100);
      newAmounts[methods[i]] = String(amt);
      allocated += amt;
    });

    setDirectAmounts(newAmounts);
    setLockedInputs(new Set());
  }, [enabledAllMethods, total]);
  
  const handleAmountChange = useCallback((method: keyof typeof directAmounts, value: string) => {
    const raw = parseCurrency(value) || 0;
    const newInt = Math.max(0, Math.round(raw));
    const methods = enabledAllMethods as Array<keyof typeof directAmounts>;
    if (!methods.includes(method)) return;

    // Update locked set
    setLockedInputs(prev => {
      const next = new Set(prev);
      next.add(method);
      return next;
    });

    // Build a working copy preserving current values
    const working = { ...directAmounts } as typeof directAmounts;
    working[method] = String(newInt);

    const locks = new Set(lockedInputs);
    locks.add(method);

    const enabledCountLocal = methods.length;
    const neededLocks = enabledCountLocal - 1;

    if (locks.size >= neededLocks) {
      // Compute remainder for the single unlocked method
      const unlocked = methods.find(m => !locks.has(m)) as keyof typeof directAmounts | undefined;
      const sumLocked = methods
        .filter(m => m !== unlocked)
        .reduce((s, m) => s + Math.round(parseCurrency(working[m]) || 0), 0);
      const remainder = Math.max(0, Math.min(Math.round(total), Math.round(total) - sumLocked));
      if (unlocked) working[unlocked] = String(remainder);
    }

    setDirectAmounts(working);

    // Update slider based on current distribution
    const amounts = methods.map(m => Math.round(parseCurrency(working[m]) || 0));
    const sum = amounts.reduce((s, a) => s + a, 0);
    if (sum > 0 && methods.length >= 2) {
      const cumulative: number[] = [];
      let acc = 0;
      for (let i = 0; i < methods.length - 1; i++) {
        acc += (amounts[i] / Math.max(1, Math.round(total))) * 100;
        cumulative.push(Math.max(1, Math.min(99, Math.round(acc))));
      }
      setSliderValues(cumulative);
    }
  }, [enabledAllMethods, directAmounts, lockedInputs, total]);

  const handleConfirm = () => {
    if (paymentData.isValid) {
      // Don't pass customerId from modal - let checkout handle customer selection
      const dataWithoutCustomerId = {
        ...paymentData,
        methods: {
          ...paymentData.methods,
          debt: paymentData.methods.debt ? {
            ...paymentData.methods.debt,
            customerId: undefined
          } : undefined
        }
      };
      onConfirm(dataWithoutCustomerId);
      onOpenChange(false);
    }
  };

  const paymentMethodIcons = {
    cash: <Banknote className="h-4 w-4" />,
    mpesa: <CreditCard className="h-4 w-4" />,
    debt: <UserX className="h-4 w-4" />,
    discount: <Percent className="h-4 w-4" />,
  };

  const paymentMethodLabels = {
    cash: 'Cash',
    mpesa: 'M-Pesa',
    debt: 'Debt',
    discount: 'Discount',
  };

  return (
<MobileOptimizedModal
  open={open}
  onOpenChange={onOpenChange}
  title="Split Payment"
  description={`Total: ${formatCurrency(total)}`}
  maxHeight="calc(100dvh - 2rem)"
  footer={
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleConfirm}
            disabled={!paymentData.isValid}
            className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
          >
            <Split className="h-4 w-4 mr-2" />
            Apply Split
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Payment Method Selection */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Select Payment Methods (choose 2-3)</Label>
          <div className={`grid gap-2 ${context === 'debt' ? 'grid-cols-3' : 'grid-cols-4'}`}>
              {Object.entries(selectedMethods)
                .filter(([method]) => context === 'debt' ? method !== 'debt' : true) // Hide debt option for debt context
                .map(([method, enabled]) => (
                <Button
                  key={method}
                  variant={enabled ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleMethodToggle(method as keyof typeof selectedMethods, !enabled)}
                  disabled={enabled && method !== 'discount' && nonDiscountEnabledCount === 1}
                  className={`flex-1 h-8 text-xs ${method === 'discount' && enabled ? 'bg-amber-500 hover:bg-amber-600 text-white' : ''}`}
                >
                  {paymentMethodIcons[method as keyof typeof paymentMethodIcons]}
                  <span className="ml-1">{paymentMethodLabels[method as keyof typeof paymentMethodLabels]}</span>
                </Button>
              ))}
          </div>
          {selectedMethods.debt && context !== 'debt' && (
            <p className="text-xs text-muted-foreground">Customer selection will be required at checkout for debt payment</p>
          )}
          {context === 'debt' && (
            <p className="text-xs text-muted-foreground">Recording payment for customer debt - only Cash, M-Pesa, and Discount available</p>
          )}
        </div>

        {/* Customer Selection for Debt - Removed from modal, will be enforced in checkout */}

        {/* Split Ratio Controls */}
        {enabledCount >= 2 && (
          <div className="space-y-4">
            <Label className="text-sm font-medium">Payment Ratio</Label>
            <div className="px-2">
              <ColoredPaymentSlider
                value={sliderValues}
                onValueChange={handleSliderChange}
                min={1}
                max={99}
                step={1}
                className="w-full"
                thumbs={Math.max(1, Math.min(3, enabledCount - 1))}
                paymentMethods={enabledAllMethods}
              />
            </div>

            {/* Enhanced Amount Inputs with Better UI */}
            <div className="space-y-3">
              {Object.entries(selectedMethods)
                .filter(([, enabled]) => enabled)
                .map(([method]) => {
                  const isDebt = method === 'debt';
                  const isCash = method === 'cash';
                  const isMpesa = method === 'mpesa';
                  const isDiscount = method === 'discount';
                  
                  return (
                    <div 
                      key={method} 
                      className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all duration-200 ${
                        isDiscount
                          ? 'bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800'
                          : isDebt 
                            ? 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800' 
                            : isCash 
                              ? 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800'
                              : 'bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800'
                      }`}
                    >
                      <div className="flex items-center gap-2 flex-1">
                        <div className={`p-2 rounded-full ${
                          isDiscount
                            ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'
                            : isDebt 
                              ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' 
                              : isCash 
                                ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                                : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                        }`}>
                          {paymentMethodIcons[method as keyof typeof paymentMethodIcons]}
                        </div>
                        <span className={`text-sm font-semibold min-w-[60px] ${
                          isDiscount
                            ? 'text-amber-700 dark:text-amber-300'
                            : isDebt 
                              ? 'text-red-700 dark:text-red-300' 
                              : isCash 
                                ? 'text-green-700 dark:text-green-300'
                                : 'text-blue-700 dark:text-blue-300'
                        }`}>
                          {paymentMethodLabels[method as keyof typeof paymentMethodLabels]}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 flex-1">
                        <Input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={directAmounts[method as keyof typeof directAmounts]}
                          onChange={(e) => handleAmountChange(method as keyof typeof directAmounts, e.target.value)}
                          className={`h-10 text-sm text-right flex-1 min-w-0 border-2 font-medium [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                            isDiscount
                              ? 'border-amber-300 focus:border-amber-500 bg-white dark:bg-amber-950/10'
                              : isDebt 
                                ? 'border-red-300 focus:border-red-500 bg-white dark:bg-red-950/10' 
                                : isCash 
                                  ? 'border-green-300 focus:border-green-500 bg-white dark:bg-green-950/10'
                                  : 'border-blue-300 focus:border-blue-500 bg-white dark:bg-blue-950/10'
                          }`}
                          placeholder="0"
                          onFocus={(e) => e.target.select()}
                          onKeyDown={(e) => { if (e.key === '.' || e.key === ',') e.preventDefault(); }}
                        />
                        <div className={`text-xs font-semibold w-12 text-right px-2 py-1 rounded ${
                          isDiscount
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                            : isDebt 
                              ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' 
                              : isCash 
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                                : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                        }`}>
                          {paymentData.methods[method as keyof typeof paymentData.methods]?.percentage.toFixed(0) || '0'}%
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}


      </div>
    </MobileOptimizedModal>
  );
};

export default SplitPaymentModal;