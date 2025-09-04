import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import ProxyImage from '@/components/ui/proxy-image';
import { Product } from '../../types';
import { formatCurrency } from '../../utils/currency';
import { Package } from 'lucide-react';

interface VariantSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  parentProduct: Product | null;
  variants: Product[];
  onVariantSelect: (variant: Product) => void;
}

const VariantSelectionModal: React.FC<VariantSelectionModalProps> = ({
  isOpen,
  onClose,
  parentProduct,
  variants,
  onVariantSelect
}) => {
  const [selectedVariant, setSelectedVariant] = useState<Product | null>(null);

  useEffect(() => {
    if (isOpen && variants.length > 0) {
      setSelectedVariant(variants[0]);
    }
  }, [isOpen, variants]);

  const handleVariantSelect = () => {
    if (selectedVariant) {
      onVariantSelect(selectedVariant);
      onClose();
    }
  };

  if (!parentProduct || variants.length === 0) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md mx-auto border-0 p-0 bg-white dark:bg-gray-900 shadow-2xl rounded-xl overflow-hidden">
        
        {/* Header */}
        <div className="border-b-4 border-blue-600 bg-white dark:bg-gray-900 p-4 text-center">
          <DialogTitle className="font-mono text-lg font-black uppercase tracking-widest text-gray-900 dark:text-white">
            Select Variant
          </DialogTitle>
          <p className="font-mono text-sm text-gray-600 dark:text-gray-400 mt-1 uppercase tracking-wider">
            {parentProduct.name}
          </p>
        </div>

        <div className="bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-4">
          {/* Parent Product Info */}
          <div className="border-2 border-gray-300 dark:border-gray-600 rounded-xl p-3 bg-transparent mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                {parentProduct.image_url ? (
                  <ProxyImage 
                    src={parentProduct.image_url}
                    alt={parentProduct.name}
                    className="w-full h-full object-cover rounded-lg"
                    fallbackContent={<Package className="w-6 h-6 text-gray-400" />}
                  />
                ) : (
                  <Package className="w-6 h-6 text-gray-400" />
                )}
              </div>
              <div className="flex-1">
                <h3 className="font-mono text-sm font-bold text-gray-900 dark:text-white">
                  {parentProduct.name}
                </h3>
                <p className="font-mono text-xs text-gray-600 dark:text-gray-400">
                  {parentProduct.category}
                </p>
              </div>
            </div>
          </div>

          <Separator className="my-3" />

          {/* Variants List */}
          <div className="space-y-2">
            <h4 className="font-mono text-sm font-bold uppercase tracking-wider text-gray-900 dark:text-white mb-3">
              Available Variants
            </h4>
            
            {variants.map((variant) => (
              <div
                key={variant.id}
                onClick={() => setSelectedVariant(variant)}
                className={`border-2 rounded-xl p-3 cursor-pointer transition-all duration-200 ${
                  selectedVariant?.id === variant.id
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30'
                    : 'border-gray-300 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h5 className="font-mono text-sm font-bold text-gray-900 dark:text-white">
                        {variant.variant_name}
                      </h5>
                      <Badge variant="outline" className="text-xs">
                        {variant.variant_multiplier}x
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-4 text-xs">
                      <span className="font-mono text-gray-600 dark:text-gray-400">
                        Price: {formatCurrency(variant.sellingPrice)}
                      </span>
                      <span className="font-mono text-gray-600 dark:text-gray-400">
                        Cost: {formatCurrency(variant.costPrice)}
                      </span>
                    </div>
                  </div>
                  
                  {selectedVariant?.id === variant.id && (
                    <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 mt-6">
            <Button
              onClick={onClose}
              variant="outline"
              className="flex-1 h-10 font-mono font-bold uppercase tracking-wide border-2 border-gray-600 text-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              Cancel
            </Button>
            <Button
              onClick={handleVariantSelect}
              disabled={!selectedVariant}
              className="flex-1 h-10 font-mono font-bold uppercase tracking-wide bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
            >
              Add to Cart
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VariantSelectionModal;