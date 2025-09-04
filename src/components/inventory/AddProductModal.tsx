import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import MobileOptimizedModal from '@/components/ui/mobile-optimized-modal';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '../../hooks/use-toast';
import { Product } from '../../types';
import { Sparkles } from 'lucide-react';
import { PRODUCT_CATEGORIES, isCustomCategory, validateCustomCategory } from '../../constants/categories';
import ImageUpload from '../ui/image-upload';
import TemplateSelectionModal from './TemplateSelectionModal';

interface AddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => void;
  editingProduct?: Product | null;
}

const AddProductModal: React.FC<AddProductModalProps> = ({ 
  isOpen, 
  onClose, 
  onSave,
  editingProduct 
}) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    category: '',
    costPrice: 0,
    sellingPrice: 0,
    currentStock: 0,
    lowStockThreshold: 0,
    image_url: '',
  });
  const [customCategory, setCustomCategory] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [templatesInitialized, setTemplatesInitialized] = useState(false);

  useEffect(() => {
    if (editingProduct) {
      const isCustom = !PRODUCT_CATEGORIES.includes(editingProduct.category as any);
      setFormData({
        name: editingProduct.name,
        sku: editingProduct.sku || '',
        category: isCustom ? 'Other / Custom' : editingProduct.category,
        costPrice: editingProduct.costPrice,
        sellingPrice: editingProduct.sellingPrice,
        currentStock: editingProduct.currentStock,
        lowStockThreshold: editingProduct.lowStockThreshold,
        image_url: editingProduct.image_url || '',
      });
      setCustomCategory(isCustom ? editingProduct.category : '');
      setShowCustomInput(isCustom);
    } else {
      setFormData({
        name: '',
        sku: '',
        category: '',
        costPrice: 0,
        sellingPrice: 0,
        currentStock: 0,
        lowStockThreshold: 0,
        image_url: '',
      });
      setCustomCategory('');
      setShowCustomInput(false);
    }
  }, [editingProduct, isOpen]);

  const generateSKU = () => {
    const prefix = formData.category ? formData.category.substring(0, 3).toUpperCase() : 'PRD';
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    const generatedSKU = `${prefix}-${timestamp}-${random}`;
    return generatedSKU;
  };

  // Auto-generate SKU when form data changes
  useEffect(() => {
    if (!editingProduct && (formData.name || formData.category)) {
      const autoSKU = generateSKU();
      setFormData(prev => ({ ...prev, sku: autoSKU }));
    }
  }, [formData.name, formData.category, editingProduct]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Product name is required",
        variant: "destructive",
      });
      return;
    }

    if (!formData.category.trim()) {
      toast({
        title: "Validation Error",
        description: "Category is required",
        variant: "destructive",
      });
      return;
    }

    if (isCustomCategory(formData.category) && !validateCustomCategory(customCategory)) {
      toast({
        title: "Validation Error",
        description: "Custom category is required and must be 50 characters or less",
        variant: "destructive",
      });
      return;
    }

    if (formData.sellingPrice < 0) {
      toast({
        title: "Validation Error",
        description: "Selling price cannot be negative",
        variant: "destructive",
      });
      return;
    }

    if (formData.costPrice < 0) {
      toast({
        title: "Validation Error",
        description: "Cost price cannot be negative",
        variant: "destructive",
      });
      return;
    }

    if (formData.currentStock < 0) {
      toast({
        title: "Validation Error",
        description: "Stock cannot be negative",
        variant: "destructive",
      });
      return;
    }
    
    const finalFormData = {
      ...formData,
      category: isCustomCategory(formData.category) ? customCategory : formData.category,
    };
    
    onSave(finalFormData);
  };

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleCategoryChange = (value: string) => {
    handleInputChange('category', value);
    if (isCustomCategory(value)) {
      setShowCustomInput(true);
    } else {
      setShowCustomInput(false);
      setCustomCategory('');
    }
  };

  const handleTemplateSelect = React.useCallback((templateData: any) => {
    console.log('[AddProductModal] Template data received:', templateData);
    
    setFormData(prev => {
      const newData = {
        ...prev,
        name: templateData.name || '',
        category: templateData.category || '',
        costPrice: templateData.cost_price || 0,
        sellingPrice: templateData.selling_price || 0,
        currentStock: templateData.current_stock || 0,
        lowStockThreshold: templateData.low_stock_threshold || 10,
        image_url: templateData.image_url || '',
      };
      console.log('[AddProductModal] Setting form data to:', newData);
      return newData;
    });
    
    // Handle custom category
    if (templateData.category && !PRODUCT_CATEGORIES.includes(templateData.category)) {
      setCustomCategory(templateData.category);
      setShowCustomInput(true);
      setFormData(prev => ({ ...prev, category: 'Other / Custom' }));
    } else {
      setShowCustomInput(false);
      setCustomCategory('');
    }
    
    // Close template modal and ensure template is not shown again
    setShowTemplateModal(false);
    setTemplatesInitialized(false);
    console.log('[AddProductModal] Template selection complete, modal closed');
  }, []);

  const showProfitCalculation = formData.costPrice > 0 && formData.sellingPrice > 0;

  const modalTitle = editingProduct ? 'EDIT PRODUCT' : 'ADD PRODUCT';
  const modalDescription = editingProduct ? 'Update product details' : 'Create new inventory item';

  const modalFooter = (
    <div className="flex gap-3">
      <Button
        type="button"
        onClick={onClose}
        variant="outline"
        className="flex-1 font-mono font-bold uppercase tracking-wide border-2 border-gray-300 hover:border-gray-400 rounded-lg h-12"
      >
        Cancel
      </Button>
      <Button
        type="submit"
        form="product-form"
        className="flex-1 font-mono font-bold uppercase tracking-wide bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white border-0 rounded-lg h-12 shadow-lg hover:shadow-xl transition-all duration-200"
      >
        {editingProduct ? 'UPDATE' : 'CREATE'} PRODUCT
      </Button>
    </div>
  );

  return (
    <>
      <MobileOptimizedModal
        open={isOpen}
        onOpenChange={onClose}
        title={modalTitle}
        description={modalDescription}
        footer={modalFooter}
        maxHeight="calc(100dvh - 1rem)"
        className="border-0 bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900"
      >
        <form id="product-form" onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
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
                  value={formData.image_url}
                  onChange={(url) => handleInputChange('image_url', url || '')}
                  placeholder="Upload product image"
                  compact={true}
                />
              </div>

              {/* Product Name */}
              <div className="border-2 border-gray-300 dark:border-gray-600 rounded-xl p-4 bg-transparent">
                <Label htmlFor="name" className="font-mono text-sm font-bold uppercase tracking-wider text-gray-900 dark:text-white mb-3 block">
                  Product Name *
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Enter product name"
                  className="h-12 text-base border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-transparent font-mono focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:border-green-500"
                  required
                />
              </div>

              {/* Product SKU */}
              <div className="border-2 border-gray-300 dark:border-gray-600 rounded-xl p-4 bg-transparent">
                <Label htmlFor="sku" className="font-mono text-sm font-bold uppercase tracking-wider text-gray-900 dark:text-white mb-3 block">
                  Product SKU (Auto-Generated)
                </Label>
                <Input
                  id="sku"
                  value={formData.sku}
                  readOnly
                  disabled
                  placeholder="Auto-generated SKU"
                  className="h-12 text-base border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-800 font-mono text-gray-600 dark:text-gray-400"
                />
              </div>
              
              {/* Category */}
              <div className="border-2 border-gray-300 dark:border-gray-600 rounded-xl p-4 bg-transparent">
                <Label htmlFor="category" className="font-mono text-sm font-bold uppercase tracking-wider text-gray-900 dark:text-white mb-3 block">
                  Category *
                </Label>
                <Select 
                  value={formData.category} 
                  onValueChange={handleCategoryChange}
                >
                  <SelectTrigger className="h-12 text-base border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-transparent font-mono focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:border-green-500">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent className="border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900">
                    {PRODUCT_CATEGORIES.map(category => (
                      <SelectItem key={category} value={category} className="font-mono">
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
              
              {/* Pricing Section */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div className="border-2 border-gray-300 dark:border-gray-600 rounded-xl p-4 bg-transparent">
                  <Label htmlFor="costPrice" className="font-mono text-sm font-bold uppercase tracking-wider text-gray-900 dark:text-white mb-3 block">
                    Cost Price (KES) *
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 text-sm font-mono">
                      KES
                    </span>
                    <Input
                      id="costPrice"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.costPrice}
                      onChange={(e) => handleInputChange('costPrice', parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      className="h-12 text-base pl-14 border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-transparent font-mono focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:border-green-500"
                      required
                    />
                  </div>
                </div>
                
                <div className="border-2 border-gray-300 dark:border-gray-600 rounded-xl p-4 bg-transparent">
                  <Label htmlFor="sellingPrice" className="font-mono text-sm font-bold uppercase tracking-wider text-gray-900 dark:text-white mb-3 block">
                    Selling Price (KES) *
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 text-sm font-mono">
                      KES
                    </span>
                    <Input
                      id="sellingPrice"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.sellingPrice}
                      onChange={(e) => handleInputChange('sellingPrice', parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      className="h-12 text-base pl-14 border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-transparent font-mono focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:border-green-500"
                      required
                    />
                  </div>
                </div>
              </div>
              
              {/* Stock Section */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div className="border-2 border-gray-300 dark:border-gray-600 rounded-xl p-4 bg-transparent">
                  <Label htmlFor="currentStock" className="font-mono text-sm font-bold uppercase tracking-wider text-gray-900 dark:text-white mb-3 block">
                    Current Stock *
                  </Label>
                  <Input
                    id="currentStock"
                    type="number"
                    min="0"
                    value={formData.currentStock}
                    onChange={(e) => handleInputChange('currentStock', parseInt(e.target.value) || 0)}
                    placeholder="0"
                    className="h-12 text-base border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-transparent font-mono focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:border-green-500"
                    required
                  />
                </div>
                
                <div className="border-2 border-gray-300 dark:border-gray-600 rounded-xl p-4 bg-transparent">
                  <Label htmlFor="lowStockThreshold" className="font-mono text-sm font-bold uppercase tracking-wider text-gray-900 dark:text-white mb-3 block">
                    Low Stock Alert
                  </Label>
                  <Input
                    id="lowStockThreshold"
                    type="number"
                    min="0"
                    value={formData.lowStockThreshold}
                    onChange={(e) => handleInputChange('lowStockThreshold', parseInt(e.target.value) || 0)}
                    placeholder="0"
                    className="h-12 text-base border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-transparent font-mono focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:border-green-500"
                  />
                </div>
              </div>

              {showProfitCalculation && (
                <div className="border-2 border-blue-300 dark:border-blue-600 rounded-xl p-4 bg-blue-50/50 dark:bg-blue-900/20">
                  <h3 className="font-mono font-bold uppercase tracking-wider text-blue-900 dark:text-blue-100 mb-3">
                    Profit Summary
                  </h3>
                  <div className="space-y-2 font-mono text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400 uppercase tracking-wide">Profit per unit:</span>
                      <span className="font-bold text-green-600">
                        KES {(formData.sellingPrice - formData.costPrice).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400 uppercase tracking-wide">Profit margin:</span>
                      <span className="font-bold text-green-600">
                        {(((formData.sellingPrice - formData.costPrice) / formData.sellingPrice) * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
              )}
        </form>
      </MobileOptimizedModal>
        
      {/* Template Selection Modal */}
      {showTemplateModal && templatesInitialized && (
        <TemplateSelectionModal
          isOpen={showTemplateModal}
          onClose={() => {
            setShowTemplateModal(false);
            setTemplatesInitialized(false);
          }}
          onTemplateSelect={handleTemplateSelect}
        />
      )}
    </>
  );
};

export default AddProductModal;
