
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Customer } from '../../types';

interface CustomerFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
  isEditing: boolean;
  onSave: (customerData: Omit<Customer, 'id' | 'createdDate'>) => Promise<void>;
}

const CustomerFormModal: React.FC<CustomerFormModalProps> = ({
  isOpen,
  onClose,
  customer,
  isEditing,
  onSave
}) => {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    creditLimit: 1000,
    riskRating: 'low' as 'low' | 'medium' | 'high',
    totalPurchases: 0,
    outstandingDebt: 0,
    lastPurchaseDate: null as string | null,
  });

  const [isSaving, setIsSaving] = useState(false);

  // Reset form when modal opens/closes or customer changes
  useEffect(() => {
    if (isOpen) {
      if (isEditing && customer) {
        setFormData({
          name: customer.name,
          phone: customer.phone,
          email: customer.email || '',
          address: customer.address || '',
          creditLimit: customer.creditLimit || 1000,
          riskRating: customer.riskRating || 'low',
          totalPurchases: customer.totalPurchases || 0,
          outstandingDebt: customer.outstandingDebt || 0,
          lastPurchaseDate: customer.lastPurchaseDate,
        });
      } else {
        setFormData({
          name: '',
          phone: '',
          email: '',
          address: '',
          creditLimit: 1000,
          riskRating: 'low',
          totalPurchases: 0,
          outstandingDebt: 0,
          lastPurchaseDate: null,
        });
      }
    }
  }, [isOpen, isEditing, customer]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Failed to save customer:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleInputChange = (field: keyof typeof formData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Customer' : 'Add New Customer'}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone *</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => handleInputChange('address', e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="creditLimit">Credit Limit</Label>
              <Input
                id="creditLimit"
                type="number"
                value={formData.creditLimit}
                onChange={(e) => handleInputChange('creditLimit', Number(e.target.value))}
                min={0}
              />
            </div>
            <div>
              <Label htmlFor="riskRating">Risk Rating</Label>
              <Select 
                value={formData.riskRating} 
                onValueChange={(value: 'low' | 'medium' | 'high') => 
                  handleInputChange('riskRating', value)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low Risk</SelectItem>
                  <SelectItem value="medium">Medium Risk</SelectItem>
                  <SelectItem value="high">High Risk</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {isEditing && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="totalPurchases">Total Purchases</Label>
                <Input
                  id="totalPurchases"
                  type="number"
                  value={formData.totalPurchases}
                  onChange={(e) => handleInputChange('totalPurchases', Number(e.target.value))}
                  min={0}
                />
              </div>
              <div>
                <Label htmlFor="outstandingDebt">Outstanding Debt</Label>
                <Input
                  id="outstandingDebt"
                  type="number"
                  value={formData.outstandingDebt}
                  onChange={(e) => handleInputChange('outstandingDebt', Number(e.target.value))}
                  min={0}
                />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? 'Saving...' : (isEditing ? 'Update' : 'Create')} Customer
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CustomerFormModal;
