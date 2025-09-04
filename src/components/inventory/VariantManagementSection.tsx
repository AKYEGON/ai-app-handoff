import React, { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Product } from '../../types';
import { useUnifiedProducts } from '../../hooks/useUnifiedProducts';
import { useToast } from '../../hooks/use-toast';
import { formatCurrency } from '../../utils/currency';
import { Package, Edit3 } from 'lucide-react';

interface VariantManagementSectionProps {
  product: Product;
  onVariantUpdate: () => void;
  disabled?: boolean;
}

const VariantManagementSection: React.FC<VariantManagementSectionProps> = ({
  product,
  onVariantUpdate,
  disabled = false
}) => {
  const [variants, setVariants] = useState<Product[]>([]);
  const [selectedVariantId, setSelectedVariantId] = useState<string>('');
  const [variantFormData, setVariantFormData] = useState({
    variant_name: '',
    variant_multiplier: '',
    costPrice: '',
    sellingPrice: ''
  });
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  const { products, updateProduct } = useUnifiedProducts();
  const { toast } = useToast();

  // Load variants when product changes
  useEffect(() => {
    if (product?.is_parent) {
      const productVariants = products.filter(p => p.parent_id === product.id);
      setVariants(productVariants);
      
      // Select first variant by default
      if (productVariants.length > 0 && !selectedVariantId) {
        setSelectedVariantId(productVariants[0].id);
      }
    }
  }, [product, products, selectedVariantId]);

  // Update form data when variant selection changes
  useEffect(() => {
    const selectedVariant = variants.find(v => v.id === selectedVariantId);
    if (selectedVariant) {
      setVariantFormData({
        variant_name: selectedVariant.variant_name || '',
        variant_multiplier: selectedVariant.variant_multiplier?.toString() || '',
        costPrice: selectedVariant.costPrice.toString(),
        sellingPrice: selectedVariant.sellingPrice.toString()
      });
    }
  }, [selectedVariantId, variants]);

  const selectedVariant = variants.find(v => v.id === selectedVariantId);

  const handleVariantUpdate = async () => {
    if (!selectedVariant) return;

    const updatedData = {
      variant_name: variantFormData.variant_name,
      variant_multiplier: parseFloat(variantFormData.variant_multiplier),
      costPrice: parseFloat(variantFormData.costPrice),
      sellingPrice: parseFloat(variantFormData.sellingPrice)
    };

    setLoading(true);
    try {
      await updateProduct(selectedVariant.id, updatedData);
      setIsEditing(false);
      onVariantUpdate();
      
      toast({
        title: "Variant Updated",
        description: `${variantFormData.variant_name} has been updated successfully.`,
      });
    } catch (error) {
      console.error('Failed to update variant:', error);
      toast({
        title: "Update Failed",
        description: "Failed to update variant. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!product?.is_parent || variants.length === 0) {
    return null;
  }

  return (
    <div className="border-2 border-gray-300 dark:border-gray-600 rounded-xl p-4 bg-transparent">
      <div className="flex items-center gap-2 mb-4">
        <Package className="w-4 h-4 text-gray-600 dark:text-gray-400" />
        <Label className="font-mono text-sm font-bold uppercase tracking-wider text-gray-900 dark:text-white">
          Variant Management
        </Label>
        <Badge variant="outline" className="text-xs">
          {variants.length} variant{variants.length !== 1 ? 's' : ''}
        </Badge>
      </div>

      <Separator className="mb-4" />

      {/* Variant Selection */}
      <div className="space-y-4">
        <div>
          <Label className="font-mono text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-2 block">
            Select Variant
          </Label>
          <Select 
            value={selectedVariantId} 
            onValueChange={setSelectedVariantId}
            disabled={disabled || loading}
          >
            <SelectTrigger className="h-10 border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-transparent font-mono">
              <SelectValue placeholder="Choose a variant" />
            </SelectTrigger>
            <SelectContent className="border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900">
              {variants.map((variant) => (
                <SelectItem key={variant.id} value={variant.id} className="font-mono">
                  {variant.variant_name} ({variant.variant_multiplier}x) - {formatCurrency(variant.sellingPrice)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Variant Details */}
        {selectedVariant && (
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-gray-50 dark:bg-gray-800/50">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-mono text-sm font-bold text-gray-900 dark:text-white">
                Variant Details
              </h4>
              <Button
                onClick={() => setIsEditing(!isEditing)}
                size="sm"
                variant="outline"
                className="h-7 px-2 font-mono text-xs"
                disabled={disabled || loading}
              >
                <Edit3 className="w-3 h-3 mr-1" />
                {isEditing ? 'Cancel' : 'Edit'}
              </Button>
            </div>

            {isEditing ? (
              <div className="space-y-3">
                {/* Variant Name */}
                <div>
                  <Label className="font-mono text-xs text-gray-600 dark:text-gray-400 mb-1 block">
                    Variant Name
                  </Label>
                  <Input
                    value={variantFormData.variant_name}
                    onChange={(e) => setVariantFormData(prev => ({ ...prev, variant_name: e.target.value }))}
                    className="h-8 text-sm border border-gray-300 dark:border-gray-600 rounded font-mono"
                    disabled={disabled || loading}
                  />
                </div>

                {/* Variant Multiplier */}
                <div>
                  <Label className="font-mono text-xs text-gray-600 dark:text-gray-400 mb-1 block">
                    Multiplier
                  </Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={variantFormData.variant_multiplier}
                    onChange={(e) => setVariantFormData(prev => ({ ...prev, variant_multiplier: e.target.value }))}
                    className="h-8 text-sm border border-gray-300 dark:border-gray-600 rounded font-mono"
                    disabled={disabled || loading}
                  />
                </div>

                {/* Pricing */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="font-mono text-xs text-gray-600 dark:text-gray-400 mb-1 block">
                      Cost Price (KES)
                    </Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={variantFormData.costPrice}
                      onChange={(e) => setVariantFormData(prev => ({ ...prev, costPrice: e.target.value }))}
                      className="h-8 text-sm border border-gray-300 dark:border-gray-600 rounded font-mono"
                      disabled={disabled || loading}
                    />
                  </div>
                  <div>
                    <Label className="font-mono text-xs text-gray-600 dark:text-gray-400 mb-1 block">
                      Selling Price (KES)
                    </Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={variantFormData.sellingPrice}
                      onChange={(e) => setVariantFormData(prev => ({ ...prev, sellingPrice: e.target.value }))}
                      className="h-8 text-sm border border-gray-300 dark:border-gray-600 rounded font-mono"
                      disabled={disabled || loading}
                    />
                  </div>
                </div>

                {/* Save Button */}
                <Button
                  onClick={handleVariantUpdate}
                  size="sm"
                  className="w-full h-8 font-mono text-xs font-bold uppercase tracking-wide bg-blue-600 hover:bg-blue-700"
                  disabled={disabled || loading}
                >
                  {loading ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Name:</span>
                  <div className="font-bold text-gray-900 dark:text-white">{selectedVariant.variant_name}</div>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Multiplier:</span>
                  <div className="font-bold text-gray-900 dark:text-white">{selectedVariant.variant_multiplier}x</div>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Cost:</span>
                  <div className="font-bold text-gray-900 dark:text-white">{formatCurrency(selectedVariant.costPrice)}</div>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Price:</span>
                  <div className="font-bold text-gray-900 dark:text-white">{formatCurrency(selectedVariant.sellingPrice)}</div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default VariantManagementSection;