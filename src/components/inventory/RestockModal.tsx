
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Package, Loader2, WifiOff } from 'lucide-react';
import { formatCurrency } from '../../utils/currency';
import { useToast } from '../../hooks/use-toast';
import { Product } from '../../types';

interface RestockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (quantity: number, buyingPrice: number) => Promise<void>;
  product: Product | null;
  isLoading?: boolean;
}

const RestockModal: React.FC<RestockModalProps> = ({ isOpen, onClose, onSave, product, isLoading = false }) => {
  const [quantity, setQuantity] = useState('0');
  const [buyingPrice, setBuyingPrice] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const { toast } = useToast();

  // Get network status from navigator
  const isOnline = navigator.onLine;

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!quantity || parseInt(quantity) <= 0) {
      newErrors.quantity = 'Valid quantity is required';
    }
    if (!buyingPrice || parseFloat(buyingPrice) < 0) {
      newErrors.buyingPrice = 'Valid buying price is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    try {
      console.log('[RestockModal] Submitting restock with:', {
        quantity: parseInt(quantity),
        buyingPrice: parseFloat(buyingPrice),
        isOnline
      });

      // Use the onSave callback which handles both online and offline scenarios
      await onSave(parseInt(quantity), parseFloat(buyingPrice));
      
      // Show appropriate success message
      if (isOnline) {
        toast({
          title: "Stock Updated",
          description: `Added ${quantity} units to ${product?.name}`,
        });
      } else {
        toast({
          title: "Saved Offline ⏳",
          description: `Stock update for ${product?.name} will sync when online.`,
        });
      }
      
      // Reset form
      setQuantity('0');
      setBuyingPrice('');
      setErrors({});
      
      // Close modal
      handleClose();
    } catch (error) {
      console.error('[RestockModal] Error restocking product:', error);
      toast({
        title: "Error",
        description: "Failed to update stock. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleClose = () => {
    setQuantity('0');
    setBuyingPrice('');
    setErrors({});
    onClose();
  };

  // Handle escape key
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  const isFormValid = quantity && buyingPrice && parseInt(quantity) > 0 && parseFloat(buyingPrice) >= 0;
  const newTotal = product ? product.currentStock + (parseInt(quantity) || 0) : 0;
  const totalCost = parseFloat(buyingPrice) * parseInt(quantity) || 0;

  if (!product) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md rounded-2xl p-6 bg-white dark:bg-gray-800 shadow-xl animate-in fade-in-0 zoom-in-95 duration-200">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
              <Package className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div className="flex flex-col">
              <span>Restock {product.name}</span>
              {!isOnline && (
                <span className="flex items-center gap-1 text-xs font-normal text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/20 px-2 py-1 rounded-full mt-1">
                  <WifiOff className="w-3 h-3" />
                  Offline Mode
                </span>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Product Info */}
          <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border-l-4 border-green-500">
            <h3 className="font-medium text-foreground">{product.name}</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Current Stock: <span className="font-semibold">{product.currentStock} units</span>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Quantity */}
            <div className="space-y-2">
              <Label htmlFor="quantity" className="text-sm font-medium flex items-center gap-2">
                Quantity to Add <span className="text-red-500">*</span>
              </Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className={`focus-visible:ring-2 focus-visible:ring-green-500 ${
                  errors.quantity ? 'border-red-500 focus-visible:ring-red-500' : ''
                }`}
                placeholder="Enter quantity"
                disabled={isLoading}
                autoFocus
              />
              {errors.quantity && <p className="text-red-500 text-sm">{errors.quantity}</p>}
            </div>

            {/* Buying Price */}
            <div className="space-y-2">
              <Label htmlFor="buyingPrice" className="text-sm font-medium flex items-center gap-2">
                Buying Price (KES) <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground text-sm font-medium">
                  KES
                </span>
                <Input
                  id="buyingPrice"
                  type="number"
                  step="0.01"
                  min="0"
                  value={buyingPrice}
                  onChange={(e) => setBuyingPrice(e.target.value)}
                  className={`pl-12 focus-visible:ring-2 focus-visible:ring-green-500 ${
                    errors.buyingPrice ? 'border-red-500 focus-visible:ring-red-500' : ''
                  }`}
                  placeholder="0.00"
                  disabled={isLoading}
                />
              </div>
              {errors.buyingPrice && <p className="text-red-500 text-sm">{errors.buyingPrice}</p>}
            </div>

            {/* Summary */}
            {quantity && buyingPrice && isFormValid && (
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800 animate-in fade-in-0 slide-in-from-top-2 duration-200">
                <h4 className="font-medium text-green-800 dark:text-green-300 mb-3">Restock Summary</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">New Total Stock:</span>
                    <span className="font-semibold text-green-700 dark:text-green-300">{newTotal} units</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Total Cost:</span>
                    <span className="font-semibold text-green-600 dark:text-green-400">
                      {formatCurrency(totalCost)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={handleClose}
                className="flex-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!isFormValid || isLoading}
                className="flex-1 bg-green-600 text-white hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg transition-all duration-200"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Restocking...
                  </>
                ) : (
                  'Restock'
                )}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RestockModal;
