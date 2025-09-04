
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Customer } from '../../types';
import { AlertTriangle } from 'lucide-react';
import { formatCurrency } from '../../utils/currency';

interface DeleteCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
  onDelete: (id: string) => Promise<void>;
  isDeleting?: boolean;
}

const DeleteCustomerModal: React.FC<DeleteCustomerModalProps> = ({
  isOpen,
  onClose,
  customer,
  onDelete,
  isDeleting = false
}) => {
  const handleDelete = async () => {
    if (!customer) return;
    
    try {
      await onDelete(customer.id);
    } catch (error) {
      console.error('Failed to delete customer:', error);
    }
  };

  if (!customer) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-destructive/10 dark:bg-destructive/20 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-destructive" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold text-foreground">
                Delete Customer
              </DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">
                This action cannot be undone
              </p>
            </div>
          </div>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Customer Details */}
          <div className="border-2 border-destructive/20 dark:border-destructive/30 rounded-lg p-4 bg-destructive/5 dark:bg-destructive/10">
            <h3 className="font-semibold text-destructive dark:text-destructive-foreground mb-2">Customer to Delete</h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Name:</span>
                <span className="font-medium text-foreground">{customer.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Phone:</span>
                <span className="text-foreground">{customer.phone}</span>
              </div>
              {customer.email && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Email:</span>
                  <span className="text-foreground">{customer.email}</span>
                </div>
              )}
              {customer.outstandingDebt && customer.outstandingDebt > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Outstanding Debt:</span>
                  <span className="text-destructive dark:text-red-400 font-semibold">
                    {formatCurrency(customer.outstandingDebt)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Warning Message */}
          <div className="border-2 border-yellow-500/20 dark:border-yellow-400/30 rounded-lg p-4 bg-yellow-500/5 dark:bg-yellow-400/10">
            <p className="text-sm text-yellow-800 dark:text-yellow-200 text-center">
              <strong>Warning:</strong> This will permanently remove <strong>{customer.name}</strong> from your customer database. All purchase history and debt records will be lost.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleDelete}
              disabled={isDeleting}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white"
            >
              {isDeleting ? 'Deleting...' : 'Delete Customer'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DeleteCustomerModal;
