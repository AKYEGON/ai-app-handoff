import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Product } from '../../types';
import { PRODUCT_CATEGORIES, isCustomCategory, validateCustomCategory } from '../../constants/categories';
import { ArrowRight, Plus, Trash2, Package2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import ImageUpload from '../ui/image-upload';
import TemplateSelectionModal from './TemplateSelectionModal';

interface ProductVariant {
  id: string;
  name: string;
  multiplier: number;
  sellingPrice: number;
  costPrice: number;
  showInQuickSelect: boolean;
}

interface VariationProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (parentProduct: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>, variants: ProductVariant[]) => void;
  existingProducts?: Product[];
}

const VariationProductModal: React.FC<VariationProductModalProps> = ({ 
  isOpen, 
  onClose, 
  onSave,
  existingProducts = []
}) => {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [step, setStep] = useState(1);
  const [parentProduct, setParentProduct] = useState<{
    type: 'new' | 'existing';
    id?: string;
    name: string;
    sku: string;
    category: string;
    currentStock: number;
    lowStockThreshold: number;
    stockDerivationQuantity: number;
    image_url: string;
  }>({
    type: 'new',
    name: '',
    sku: '',
    category: '',
    currentStock: 0,
    lowStockThreshold: 0,
    stockDerivationQuantity: 1,
    image_url: '',
  });
  
  const [variants, setVariants] = useState<ProductVariant[]>([
    { id: '1', name: '', multiplier: 0.5, sellingPrice: 0, costPrice: 0, showInQuickSelect: true },
    { id: '2', name: '', multiplier: 1, sellingPrice: 0, costPrice: 0, showInQuickSelect: true },
  ]);
  
  const [customCategory, setCustomCategory] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [templatesInitialized, setTemplatesInitialized] = useState(false);

  useEffect(() => {
    if (isOpen) {
      resetForm();
    }
  }, [isOpen]);

  const resetForm = () => {
    setStep(1);
    setParentProduct({
      type: 'new',
      name: '',
      sku: '',
      category: '',
      currentStock: 0,
      lowStockThreshold: 0,
      stockDerivationQuantity: 1,
      image_url: '',
    });
    setVariants([
      { id: '1', name: '', multiplier: 0.5, sellingPrice: 0, costPrice: 0, showInQuickSelect: true },
      { id: '2', name: '', multiplier: 1, sellingPrice: 0, costPrice: 0, showInQuickSelect: true },
    ]);
    setCustomCategory('');
    setShowCustomInput(false);
    setShowTemplateModal(false);
    setTemplatesInitialized(false);
    setIsSaving(false);
  };

  const handleCategoryChange = (value: string) => {
    setParentProduct(prev => ({ ...prev, category: value }));
    if (isCustomCategory(value)) {
      setShowCustomInput(true);
    } else {
      setShowCustomInput(false);
      setCustomCategory('');
    }
  };

  const addVariant = () => {
    const newVariant: ProductVariant = {
      id: Date.now().toString(),
      name: '',
      multiplier: 1,
      sellingPrice: 0,
      costPrice: 0,
      showInQuickSelect: true,
    };
    setVariants(prev => [...prev, newVariant]);
  };

  const removeVariant = (id: string) => {
    if (variants.length <= 2) {
      toast({
        title: "Cannot Remove",
        description: "Must have at least 2 variants",
        variant: "destructive",
      });
      return;
    }
    setVariants(prev => prev.filter(v => v.id !== id));
  };

  const updateVariant = (id: string, field: keyof ProductVariant, value: any) => {
    setVariants(prev => prev.map(v => 
      v.id === id ? { ...v, [field]: value } : v
    ));
  };

  const validateStep1 = () => {
    if (parentProduct.type === 'new') {
      if (!parentProduct.name.trim()) {
        toast({
          title: "Validation Error",
          description: "Parent product name is required",
          variant: "destructive",
        });
        return false;
      }
      
      if (!parentProduct.category.trim()) {
        toast({
          title: "Validation Error",
          description: "Category is required",
          variant: "destructive",
        });
        return false;
      }

      if (isCustomCategory(parentProduct.category) && !validateCustomCategory(customCategory)) {
        toast({
          title: "Validation Error",
          description: "Custom category is required and must be 50 characters or less",
          variant: "destructive",
        });
        return false;
      }

      if (parentProduct.stockDerivationQuantity <= 0) {
        toast({
          title: "Validation Error",
          description: "Stock derivation quantity must be greater than 0",
          variant: "destructive",
        });
        return false;
      }
    }
    return true;
  };

  const validateStep2 = () => {
    const validVariants = variants.filter(v => v.name.trim() && v.multiplier > 0 && v.sellingPrice > 0);
    
    if (validVariants.length < 2) {
      toast({
        title: "Validation Error",
        description: "Must have at least 2 valid variants",
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const generateSKU = (category: string = '', name: string = '') => {
    const prefix = category ? category.substring(0, 3).toUpperCase() : 'VAR';
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
  };

  // Auto-generate SKU when parent product data changes
  useEffect(() => {
    if (parentProduct.name || parentProduct.category) {
      const autoSKU = generateSKU(parentProduct.category, parentProduct.name);
      setParentProduct(prev => ({ ...prev, sku: autoSKU }));
    }
  }, [parentProduct.name, parentProduct.category]);

  const handleTemplateSelect = React.useCallback((templateData: any) => {
    console.log('[VariationProductModal] Template data received:', templateData);
    
    setParentProduct(prev => ({
      ...prev,
      name: templateData.name || '',
      sku: generateSKU(templateData.category || '', templateData.name || ''),
      category: templateData.category || '',
      image_url: templateData.image_url || '',
      currentStock: templateData.current_stock || 0,
      lowStockThreshold: templateData.low_stock_threshold || 10,
    }));
    
    // Handle custom category
    if (templateData.category && !PRODUCT_CATEGORIES.includes(templateData.category)) {
      setCustomCategory(templateData.category);
      setShowCustomInput(true);
      setParentProduct(prev => ({ ...prev, category: 'Other / Custom' }));
    } else {
      setShowCustomInput(false);
      setCustomCategory('');
    }
    
    // Close template modal
    setShowTemplateModal(false);
    setTemplatesInitialized(false);
    console.log('[VariationProductModal] Template selection complete, modal closed');
  }, []);

  const handleSave = async () => {
    if (!validateStep2() || isSaving) return;

    setIsSaving(true);

    try {
      const finalCategory = isCustomCategory(parentProduct.category) ? customCategory : parentProduct.category;
      const validVariants = variants.filter(v => v.name.trim() && v.multiplier > 0 && v.sellingPrice > 0);

      // Create parent product
      const parentProductData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'> = {
        name: parentProduct.name,
        category: finalCategory,
        costPrice: 0, // Parent product doesn't have pricing
        sellingPrice: 0, // Parent product doesn't have pricing
        currentStock: parentProduct.currentStock,
        lowStockThreshold: parentProduct.lowStockThreshold,
        stock_derivation_quantity: parentProduct.stockDerivationQuantity,
        is_parent: true,
        sku: parentProduct.sku, // Auto-generated SKU
        image_url: parentProduct.image_url || null,
      };

      await onSave(parentProductData, validVariants);
      
      toast({
        title: "Variation Products Created",
        description: `Created parent product with ${validVariants.length} variants`,
      });

      onClose(); // Close modal immediately after save
    } catch (error) {
      console.error('Failed to save variation products:', error);
      toast({
        title: "Save Failed",
        description: "Failed to create variation products. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const nextStep = () => {
    if (step === 1 && validateStep1()) {
      setStep(2);
    } else if (step === 2 && validateStep2()) {
      setStep(3);
    }
  };

  const prevStep = () => {
    if (step > 1) setStep(step - 1);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] sm:w-[90vw] max-w-[800px] max-h-[95vh] border-0 p-0 bg-white dark:bg-gray-900 shadow-2xl rounded-xl overflow-hidden flex flex-col">          
        {/* Header */}
        <div className="border-b-4 border-green-600 bg-white dark:bg-gray-900 p-6 text-center flex-shrink-0">
          <DialogTitle className="font-mono text-xl font-black uppercase tracking-widest text-gray-900 dark:text-white">
            CREATE PRODUCT VARIATIONS
          </DialogTitle>
          <DialogDescription className="font-mono text-sm text-gray-600 dark:text-gray-400 mt-2 uppercase tracking-wider">
            Step {step} of 3: {step === 1 ? 'Parent Product' : step === 2 ? 'Define Variants' : 'Quick Select Options'}
          </DialogDescription>
        </div>
        
        <div className="flex-1 overflow-y-auto bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-6">
          
          {/* Step 1: Parent Product Configuration */}
          {step === 1 && (
            <div className="space-y-6">
              {/* Use Templates Button */}
              <div className="mb-6">
                <Button
                  type="button"
                  onClick={() => {
                    setTemplatesInitialized(true);
                    setShowTemplateModal(true);
                  }}
                  className="w-full h-12 px-6 bg-gradient-to-r from-purple-500 to-blue-600 hover:from-purple-600 hover:to-blue-700 text-white border-0 rounded-lg font-mono font-bold uppercase tracking-wide transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  ✨ USE TEMPLATES
                </Button>
              </div>

              {/* Product Image */}
              <div className="border-2 border-gray-300 dark:border-gray-600 rounded-xl p-4 bg-transparent">
                <Label className="font-mono text-sm font-bold uppercase tracking-wider text-gray-900 dark:text-white mb-3 block">
                  Product Image
                </Label>
                <ImageUpload
                  value={parentProduct.image_url}
                  onChange={(url) => setParentProduct(prev => ({ ...prev, image_url: url || '' }))}
                  placeholder="Upload product image"
                  compact={true}
                />
              </div>

              <div className="border-2 border-gray-300 dark:border-gray-600 rounded-xl p-4 bg-transparent">
                <Label className="font-mono text-sm font-bold uppercase tracking-wider text-gray-900 dark:text-white mb-3 block">
                  Product Name *
                </Label>
                <Input
                  value={parentProduct.name}
                  onChange={(e) => setParentProduct(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter parent product name"
                  className="h-12 text-base border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-transparent font-mono focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:border-green-500"
                />
              </div>

              {/* Product SKU */}
              <div className="border-2 border-gray-300 dark:border-gray-600 rounded-xl p-4 bg-transparent">
                <Label className="font-mono text-sm font-bold uppercase tracking-wider text-gray-900 dark:text-white mb-3 block">
                  Product SKU (Auto-Generated)
                </Label>
                <Input
                  value={parentProduct.sku}
                  readOnly
                  disabled
                  placeholder="Auto-generated SKU"
                  className="h-12 text-base border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-800 font-mono text-gray-600 dark:text-gray-400"
                />
              </div>

              <div className="border-2 border-gray-300 dark:border-gray-600 rounded-xl p-4 bg-transparent">
                <Label className="font-mono text-sm font-bold uppercase tracking-wider text-gray-900 dark:text-white mb-3 block">
                  Category *
                </Label>
                <Select 
                  value={parentProduct.category} 
                  onValueChange={handleCategoryChange}
                >
                  <SelectTrigger className="h-12 text-base border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-transparent font-mono focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:border-green-500">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {PRODUCT_CATEGORIES.map(category => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {showCustomInput && (
                  <div className="mt-3">
                    <Input
                      placeholder="Enter custom category"
                      value={customCategory}
                      onChange={(e) => setCustomCategory(e.target.value)}
                      className="h-12 text-base border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-transparent font-mono focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:border-green-500"
                      maxLength={50}
                    />
                  </div>
                )}
              </div>

              <div className="border-2 border-gray-300 dark:border-gray-600 rounded-xl p-4 bg-transparent">
                <Label className="font-mono text-sm font-bold uppercase tracking-wider text-gray-900 dark:text-white mb-3 block">
                  Stock Derivation Quantity *
                </Label>
                <Input
                  type="number"
                  min="1"
                  value={parentProduct.stockDerivationQuantity === 0 ? '' : parentProduct.stockDerivationQuantity}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '') {
                      setParentProduct(prev => ({ ...prev, stockDerivationQuantity: 0 }));
                    } else {
                      setParentProduct(prev => ({ ...prev, stockDerivationQuantity: parseInt(value) || 0 }));
                    }
                  }}
                  onBlur={(e) => {
                    const value = parseInt(e.target.value);
                    if (!value || value < 1) {
                      setParentProduct(prev => ({ ...prev, stockDerivationQuantity: 1 }));
                    }
                  }}
                  placeholder="1"
                  className="h-12 text-base border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-transparent font-mono focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:border-green-500"
                />
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 font-mono">
                  Base quantity used for variant multiplier calculations (e.g., if set to 10 and variant multiplier is 0.5, selling 1 variant deducts 5 from parent stock)
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="border-2 border-gray-300 dark:border-gray-600 rounded-xl p-4 bg-transparent">
                  <Label className="font-mono text-sm font-bold uppercase tracking-wider text-gray-900 dark:text-white mb-3 block">
                    Parent Stock
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    value={parentProduct.currentStock}
                    onChange={(e) => setParentProduct(prev => ({ ...prev, currentStock: parseInt(e.target.value) || 0 }))}
                    placeholder="0"
                    className="h-12 text-base border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-transparent font-mono focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:border-green-500"
                  />
                </div>
                
                <div className="border-2 border-gray-300 dark:border-gray-600 rounded-xl p-4 bg-transparent">
                  <Label className="font-mono text-sm font-bold uppercase tracking-wider text-gray-900 dark:text-white mb-3 block">
                    Low Stock Threshold
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    value={parentProduct.lowStockThreshold}
                    onChange={(e) => setParentProduct(prev => ({ ...prev, lowStockThreshold: parseInt(e.target.value) || 0 }))}
                    placeholder="10"
                    className="h-12 text-base border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-transparent font-mono focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:border-green-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Define Variants */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h3 className="font-mono text-lg font-black uppercase tracking-wider text-gray-900 dark:text-white">
                  Define Product Variants
                </h3>
                <p className="font-mono text-sm text-gray-600 dark:text-gray-400 mt-2">
                  Create different variations of "{parentProduct.name}"
                </p>
              </div>

              <ScrollArea className="h-[400px] w-full rounded-lg border-2 border-gray-300 dark:border-gray-600 p-4">
                <div className="space-y-4">
                  {variants.map((variant, index) => (
                    <div key={variant.id} className="border-2 border-gray-200 dark:border-gray-700 rounded-xl p-4 bg-white/50 dark:bg-gray-800/50">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-mono font-bold text-gray-900 dark:text-white">
                          Variant {index + 1}
                        </h4>
                        {variants.length > 2 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeVariant(variant.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                          <Label className="font-mono text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-2 block">
                            Variant Name *
                          </Label>
                          <Input
                            value={variant.name}
                            onChange={(e) => updateVariant(variant.id, 'name', e.target.value)}
                            placeholder="e.g., Small, Medium, Large"
                            className="h-10 text-sm border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-transparent font-mono"
                          />
                        </div>

                        <div>
                          <Label className="font-mono text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-2 block">
                            Multiplier *
                          </Label>
                          <Input
                            type="number"
                            step="0.1"
                            min="0.1"
                            value={variant.multiplier}
                            onChange={(e) => updateVariant(variant.id, 'multiplier', parseFloat(e.target.value) || 0)}
                            placeholder="1.0"
                            className="h-10 text-sm border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-transparent font-mono"
                          />
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Stock multiplier factor
                          </p>
                        </div>

                        <div>
                          <Label className="font-mono text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-2 block">
                            Cost Price (KES) *
                          </Label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={variant.costPrice}
                            onChange={(e) => updateVariant(variant.id, 'costPrice', parseFloat(e.target.value) || 0)}
                            placeholder="0.00"
                            className="h-10 text-sm border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-transparent font-mono"
                          />
                        </div>

                        <div>
                          <Label className="font-mono text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-2 block">
                            Selling Price (KES) *
                          </Label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={variant.sellingPrice}
                            onChange={(e) => updateVariant(variant.id, 'sellingPrice', parseFloat(e.target.value) || 0)}
                            placeholder="0.00"
                            className="h-10 text-sm border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-transparent font-mono"
                          />
                        </div>

                        <div className="flex items-center space-x-2 pt-6">
                          <Checkbox
                            id={`quickselect-${variant.id}`}
                            checked={variant.showInQuickSelect}
                            onCheckedChange={(checked) => updateVariant(variant.id, 'showInQuickSelect', checked)}
                          />
                          <Label htmlFor={`quickselect-${variant.id}`} className="font-mono text-xs text-gray-700 dark:text-gray-300">
                            Show in Quick Select
                          </Label>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              <div className="flex justify-center">
                <Button
                  type="button"
                  onClick={addVariant}
                  className="bg-green-600 hover:bg-green-700 text-white font-mono font-bold uppercase tracking-wide"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Variant
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Quick Select Configuration */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h3 className="font-mono text-lg font-black uppercase tracking-wider text-gray-900 dark:text-white">
                  Quick Select Configuration
                </h3>
                <p className="font-mono text-sm text-gray-600 dark:text-gray-400 mt-2">
                  Configure which variants appear in quick select menu
                </p>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-700 rounded-xl p-6">
                <h4 className="font-mono font-bold text-blue-900 dark:text-blue-100 mb-4">Selected for Quick Select:</h4>
                <div className="space-y-2">
                  {variants.filter(v => v.showInQuickSelect && v.name.trim()).map(variant => (
                    <div key={variant.id} className="flex items-center justify-between bg-white dark:bg-gray-800 p-3 rounded-lg border">
                      <div>
                        <span className="font-mono font-semibold">{parentProduct.name} - {variant.name}</span>
                        <span className="text-sm text-gray-600 dark:text-gray-400 ml-2">
                          (Multiplier: {variant.multiplier}x, Price: KES {variant.sellingPrice})
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-800/50 border-2 border-gray-200 dark:border-gray-600 rounded-xl p-6">
                <h4 className="font-mono font-bold text-gray-900 dark:text-white mb-4">Summary:</h4>
                <ul className="space-y-2 font-mono text-sm text-gray-700 dark:text-gray-300">
                  <li>• Parent Product: {parentProduct.name}</li>
                  <li>• Category: {isCustomCategory(parentProduct.category) ? customCategory : parentProduct.category}</li>
                  <li>• Initial Stock: {parentProduct.currentStock}</li>
                  <li>• Stock Derivation Quantity: {parentProduct.stockDerivationQuantity}</li>
                  <li>• Total Variants: {variants.filter(v => v.name.trim()).length}</li>
                  <li>• Quick Select Variants: {variants.filter(v => v.showInQuickSelect && v.name.trim()).length}</li>
                </ul>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex flex-col sm:flex-row justify-between gap-3 pt-6 border-t-2 border-gray-200 dark:border-gray-700">
            <Button
              type="button"
              onClick={prevStep}
              disabled={step === 1}
              className="w-full sm:w-auto px-4 sm:px-6 py-3 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white font-mono font-bold uppercase tracking-wide rounded-lg text-sm sm:text-base"
            >
              Previous
            </Button>

            {step < 3 ? (
              <Button
                type="button"
                onClick={nextStep}
                className="w-full sm:w-auto px-4 sm:px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-mono font-bold uppercase tracking-wide rounded-lg text-sm sm:text-base"
              >
                Next
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="w-full sm:w-auto px-4 sm:px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-mono font-bold uppercase tracking-wide rounded-lg text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? 'Creating...' : 'Create Product Variants'}
              </Button>
            )}
          </div>
        </div>

        {/* Template Selection Modal */}
        <TemplateSelectionModal
          isOpen={showTemplateModal}
          onClose={() => setShowTemplateModal(false)}
          onTemplateSelect={handleTemplateSelect}
          mode="variation"
        />
      </DialogContent>
    </Dialog>
  );
};

export default VariationProductModal;