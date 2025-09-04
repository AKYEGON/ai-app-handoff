
import React, { useState } from 'react';
import MobileOptimizedModal from '@/components/ui/mobile-optimized-modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useUnifiedCustomers } from '../../hooks/useUnifiedCustomers';
import { useToast } from '../../hooks/use-toast';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { UserPlus, Loader2, WifiOff } from 'lucide-react';
import { Customer } from '../../types';

interface AddCustomerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCustomerAdded?: (customer: Customer) => void;
}

const AddCustomerModal = ({ open, onOpenChange, onCustomerAdded }: AddCustomerModalProps) => {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    creditLimit: 1000,
    initialDebt: 0,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { createCustomer } = useUnifiedCustomers();
  const { toast } = useToast();
  const { isOnline } = useNetworkStatus();

  const validateField = (name: string, value: string | number) => {
    const newErrors = { ...errors };

    switch (name) {
      case 'name':
        if (!String(value).trim()) {
          newErrors.name = 'Customer name is required';
        } else {
          delete newErrors.name;
        }
        break;
      case 'phone':
        if (!String(value).trim()) {
          newErrors.phone = 'Phone number is required';
        } else {
          delete newErrors.phone;
        }
        break;
      case 'creditLimit':
        if (Number(value) < 0) {
          newErrors.creditLimit = 'Credit limit cannot be negative';
        } else {
          delete newErrors.creditLimit;
        }
        break;
      case 'initialDebt':
        if (Number(value) < 0) {
          newErrors.initialDebt = 'Initial debt cannot be negative';
        } else {
          delete newErrors.initialDebt;
        }
        break;
    }

    setErrors(newErrors);
  };

  const handleChange = (field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    validateField(field, value);
  };

  const isFormValid = () => {
    return formData.name.trim() && 
           formData.phone.trim() && 
           formData.creditLimit >= 0 &&
           formData.initialDebt >= 0 &&
           Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Final validation
    validateField('name', formData.name);
    validateField('phone', formData.phone);
    validateField('creditLimit', formData.creditLimit);
    validateField('initialDebt', formData.initialDebt);

    if (!isFormValid()) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields correctly.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      console.log('[AddCustomerModal] Creating customer with data:', formData);

      const customerData = {
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim() || '',
        address: formData.address.trim() || '',
        totalPurchases: 0,
        outstandingDebt: formData.initialDebt,
        creditLimit: formData.creditLimit,
        riskRating: 'low' as const,
        lastPurchaseDate: null,
      };

      // Create customer using unified hook (handles both online and offline scenarios)
      const newCustomer = await createCustomer(customerData);
      console.log('[AddCustomerModal] Customer created successfully:', newCustomer);
      
      toast({
        title: "Success!",
        description: `Customer ${formData.name} has been ${isOnline ? 'added' : 'saved offline and will sync when online'}.`,
      });

      // Reset form
      setFormData({
        name: '',
        phone: '',
        email: '',
        address: '',
        creditLimit: 1000,
        initialDebt: 0,
      });
      setErrors({});

      // Notify parent component with the new customer FIRST
      // This ensures the parent gets the customer data before the modal closes
      console.log('[AddCustomerModal] Notifying parent with new customer:', newCustomer);
      onCustomerAdded?.(newCustomer);
      
      // Close modal after notifying parent
      onOpenChange(false);

    } catch (error) {
      console.error('[AddCustomerModal] Error creating customer:', error);
      
      // More specific error handling
      let errorMessage = 'Unknown error occurred';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      toast({
        title: "Error",
        description: `Failed to add customer: ${errorMessage}. ${!isOnline ? 'Please check your offline storage.' : 'Please try again.'}`,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (isSubmitting) return;
    
    setFormData({
      name: '',
      phone: '',
      email: '',
      address: '',
      creditLimit: 1000,
      initialDebt: 0,
    });
    setErrors({});
    onOpenChange(false);
  };

  const modalTitle = 'Add New Customer';

  const modalFooter = (
    <div className="flex gap-3">
      <Button
        type="button"
        variant="outline"
        onClick={handleClose}
        className="flex-1 border-2 border-gray-300 hover:border-gray-400 rounded-xl h-12"
        disabled={isSubmitting}
      >
        Cancel
      </Button>
      <Button
        type="submit"
        form="customer-form"
        className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold rounded-xl h-12"
        disabled={!isFormValid() || isSubmitting}
      >
        {isSubmitting ? (
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Adding...
          </div>
        ) : (
          'Add Customer'
        )}
      </Button>
    </div>
  );

  return (
    <MobileOptimizedModal
      open={open}
      onOpenChange={handleClose}
      title={modalTitle}
      description={!isOnline ? "Adding in offline mode" : undefined}
      footer={modalFooter}
      maxHeight="calc(100dvh - 1rem)"
    >
      <form id="customer-form" onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4">
          <div>
            <Label htmlFor="name" className="text-sm font-bold text-gray-700 dark:text-gray-300">
              Name *
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="Customer name"
              required
              className={`mt-1 border-2 ${errors.name ? 'border-red-500' : 'border-purple-200'} focus:border-purple-400 rounded-xl h-12`}
              style={{ fontSize: '16px' }}
              disabled={isSubmitting}
            />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
          </div>
          
          <div>
            <Label htmlFor="phone" className="text-sm font-bold text-gray-700 dark:text-gray-300">
              Phone *
            </Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              placeholder="Phone number"
              required
              className={`mt-1 border-2 ${errors.phone ? 'border-red-500' : 'border-purple-200'} focus:border-purple-400 rounded-xl h-12`}
              style={{ fontSize: '16px' }}
              disabled={isSubmitting}
            />
            {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
          </div>
          
          <div>
            <Label htmlFor="email" className="text-sm font-bold text-gray-700 dark:text-gray-300">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              placeholder="Email address (optional)"
              className="mt-1 border-2 border-purple-200 focus:border-purple-400 rounded-xl h-12"
              style={{ fontSize: '16px' }}
              disabled={isSubmitting}
            />
          </div>
          
          <div>
            <Label htmlFor="address" className="text-sm font-bold text-gray-700 dark:text-gray-300">
              Address
            </Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => handleChange('address', e.target.value)}
              placeholder="Address (optional)"
              className="mt-1 border-2 border-purple-200 focus:border-purple-400 rounded-xl h-12"
              style={{ fontSize: '16px' }}
              disabled={isSubmitting}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="creditLimit" className="text-sm font-bold text-gray-700 dark:text-gray-300">
                Credit Limit (KES)
              </Label>
              <Input
                id="creditLimit"
                type="number"
                value={formData.creditLimit}
                onChange={(e) => handleChange('creditLimit', Number(e.target.value))}
                placeholder="1000"
                min="0"
                className={`mt-1 border-2 ${errors.creditLimit ? 'border-red-500' : 'border-purple-200'} focus:border-purple-400 rounded-xl h-12`}
                style={{ fontSize: '16px' }}
                disabled={isSubmitting}
              />
              {errors.creditLimit && <p className="text-red-500 text-xs mt-1">{errors.creditLimit}</p>}
            </div>

            <div>
              <Label htmlFor="initialDebt" className="text-sm font-bold text-gray-700 dark:text-gray-300">
                Initial Debt (KES)
              </Label>
              <Input
                id="initialDebt"
                type="number"
                value={formData.initialDebt}
                onChange={(e) => handleChange('initialDebt', Number(e.target.value))}
                placeholder="0"
                min="0"
                step="0.01"
                className={`mt-1 border-2 ${errors.initialDebt ? 'border-red-500' : 'border-purple-200'} focus:border-purple-400 rounded-xl h-12`}
                style={{ fontSize: '16px' }}
                disabled={isSubmitting}
              />
              {errors.initialDebt && <p className="text-red-500 text-xs mt-1">{errors.initialDebt}</p>}
            </div>
          </div>
          
          <p className="text-xs text-gray-500 dark:text-gray-400">
            * Enter any existing debt amount if the customer already owes money
          </p>
        </div>
      </form>
    </MobileOptimizedModal>
  );
};

export default AddCustomerModal;
