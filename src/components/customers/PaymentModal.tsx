
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Customer } from '../../types';
import { formatCurrency } from '../../utils/currency';
import { Split } from 'lucide-react';
import SplitPaymentModal from '../sales/SplitPaymentModal';
import type { SplitPaymentData } from '@/types/cart';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
  onPayment: (paymentData: { amount: number; method: string; notes?: string; splitPaymentData?: SplitPaymentData }) => Promise<void>;
  isRecording: boolean;
}

const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  customer,
  onPayment,
  isRecording
}) => {
  const [paymentData, setPaymentData] = useState({
    amount: 0,
    method: 'cash',
    notes: ''
  });

  const [showSplitModal, setShowSplitModal] = useState(false);
  const [splitPaymentData, setSplitPaymentData] = useState<SplitPaymentData | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!customer || paymentData.amount <= 0) return;

    // If split payment is selected, show split modal
    if (paymentData.method === 'split') {
      setShowSplitModal(true);
      return;
    }
    
    try {
      await onPayment({
        ...paymentData,
        splitPaymentData: splitPaymentData
      });
      // Reset form
      setPaymentData({
        amount: 0,
        method: 'cash',
        notes: ''
      });
      setSplitPaymentData(null);
    } catch (error) {
      console.error('Failed to record payment:', error);
    }
  };

  const handleSplitPaymentConfirm = async (data: SplitPaymentData) => {
    setSplitPaymentData(data);
    setShowSplitModal(false);
    
    try {
      await onPayment({
        ...paymentData,
        splitPaymentData: data
      });
      // Reset form
      setPaymentData({
        amount: 0,
        method: 'cash',
        notes: ''
      });
      setSplitPaymentData(null);
    } catch (error) {
      console.error('Failed to record split payment:', error);
    }
  };

  const handleAmountChange = (value: string) => {
    const amount = parseFloat(value) || 0;
    setPaymentData(prev => ({ ...prev, amount }));
  };

  const setFullDebt = () => {
    if (customer?.outstandingDebt) {
      setPaymentData(prev => ({ ...prev, amount: customer.outstandingDebt }));
    }
  };

  if (!customer) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
        </DialogHeader>
        
        {/* Customer Info */}
        <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg">
          <h3 className="font-semibold">{customer.name}</h3>
          <p className="text-sm text-muted-foreground">
            Outstanding Debt: {formatCurrency(customer.outstandingDebt || 0)}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="amount">Payment Amount *</Label>
            <div className="flex gap-2">
              <Input
                id="amount"
                type="number"
                value={paymentData.amount}
                onChange={(e) => handleAmountChange(e.target.value)}
                min={0}
                max={customer.outstandingDebt || 0}
                step={0.01}
                required
              />
              <Button
                type="button"
                variant="outline"
                onClick={setFullDebt}
                disabled={!customer.outstandingDebt}
              >
                Full
              </Button>
            </div>
          </div>

          <div>
            <Label htmlFor="method">Payment Method *</Label>
            <Select 
              value={paymentData.method} 
              onValueChange={(value) => setPaymentData(prev => ({ ...prev, method: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="mpesa">M-Pesa</SelectItem>
                <SelectItem value="split">
                  <div className="flex items-center gap-2">
                    <Split className="h-4 w-4" />
                    Split Payment
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={paymentData.notes}
              onChange={(e) => setPaymentData(prev => ({ ...prev, notes: e.target.value }))}
              rows={3}
              placeholder="Any additional notes about this payment..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isRecording || paymentData.amount <= 0}>
              {isRecording ? 'Recording...' : 'Record Payment'}
            </Button>
          </div>
        </form>
      </DialogContent>

      {/* Split Payment Modal */}
      <SplitPaymentModal
        open={showSplitModal}
        onOpenChange={setShowSplitModal}
        total={paymentData.amount}
        customers={[]} // Empty array for debt payments - customer is already selected
        onConfirm={handleSplitPaymentConfirm}
        context="debt"
      />
    </Dialog>
  );
};

export default PaymentModal;
