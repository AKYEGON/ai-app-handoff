import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Sparkles } from 'lucide-react';
import { Product } from '../../types';
import { PRODUCT_CATEGORIES, isCustomCategory, validateCustomCategory } from '../../constants/categories';
import ImageUpload from '../ui/image-upload';
import TemplateSelectionModal from './TemplateSelectionModal';

interface UncountableProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => void;
}

const UncountableProductModal: React.FC<UncountableProductModalProps> = ({ 
  isOpen, 
  onClose, 
  onSave 
}) => {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    category: '',
    costPrice: 0,
    sellingPrice: 0,
    image_url: '',
  });
  const [customCategory, setCustomCategory] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFormData({
        name: '',
        sku: '',
        category: '',
        costPrice: 0,
        sellingPrice: 0,
        image_url: '',
      });
      setCustomCategory('');
      setShowCustomInput(false);
      setShowTemplateModal(false);
      setIsSaving(false);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSaving) return; // Prevent double submission
    
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

    if (formData.sellingPrice <= 0) {
      toast({
        title: "Validation Error",
        description: "Selling price must be greater than 0",
        variant: "destructive",
      });
      return;
    }
    
    setIsSaving(true);
    
    try {
      const finalFormData = {
        ...formData,
        category: isCustomCategory(formData.category) ? customCategory : formData.category,
        currentStock: -1, // Unspecified quantity
        lowStockThreshold: 0, // No threshold for uncountable items
        sku: formData.sku, // Auto-generated SKU
      };
      
      await onSave(finalFormData);
      onClose(); // Close modal immediately after save
    } catch (error) {
      console.error('Failed to save uncountable product:', error);
      toast({
        title: "Save Failed",
        description: "Failed to create uncountable product. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
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

  const handleTemplateSelect = (templateData: any) => {
    console.log('[UncountableProductModal] Template selected:', templateData);
    
    // Pre-fill form with template data
    setFormData({
      name: templateData.name || '',
      sku: generateSKU(templateData.category || '', templateData.name || ''),
      category: templateData.category || '',
      costPrice: templateData.cost_price || 0,
      sellingPrice: templateData.selling_price || 0,
      image_url: templateData.image_url || '',
    });
    
    // Handle custom category if needed
    if (isCustomCategory(templateData.category)) {
      setShowCustomInput(true);
      setCustomCategory(templateData.category);
    } else {
      setShowCustomInput(false);
      setCustomCategory('');
    }
    
    setShowTemplateModal(false);
  };

  const generateSKU = (category: string = '', name: string = '') => {
    const prefix = category ? category.substring(0, 3).toUpperCase() : 'UNC';
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
  };

  // Auto-generate SKU when form data changes
  useEffect(() => {
    if (formData.name || formData.category) {
      const autoSKU = generateSKU(formData.category, formData.name);
      setFormData(prev => ({ ...prev, sku: autoSKU }));
    }
  }, [formData.name, formData.category]);

  const handleUseTemplates = () => {
    setShowTemplateModal(true);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] sm:w-[90vw] max-w-[500px] max-h-[95vh] border-0 p-0 bg-white dark:bg-gray-900 shadow-2xl rounded-xl overflow-hidden flex flex-col">          
        {/* Header */}
        <div className="border-b-4 border-orange-600 bg-white dark:bg-gray-900 p-4 sm:p-6 text-center flex-shrink-0">
          <DialogTitle className="font-mono text-xl font-black uppercase tracking-widest text-gray-900 dark:text-white">
            ADD UNCOUNTABLE ITEM
          </DialogTitle>
          <DialogDescription className="font-mono text-sm text-gray-600 dark:text-gray-400 mt-2 uppercase tracking-wider">
            Items sold by scoops, cups, portions, etc.
          </DialogDescription>
        </div>
        
        <div className="flex-1 overflow-y-auto bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-3 sm:p-6">
          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-6">
            {/* Use Templates Button */}
            <div className="mb-4 sm:mb-6">
              <Button 
                type="button" 
                onClick={handleUseTemplates}
                className="w-full h-10 sm:h-12 px-4 sm:px-6 bg-gradient-to-r from-purple-500 to-blue-600 hover:from-purple-600 hover:to-blue-700 text-white border-0 rounded-lg font-mono font-bold uppercase tracking-wide transition-all duration-200 shadow-lg hover:shadow-xl text-sm sm:text-base"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                ✨ USE TEMPLATES
              </Button>
            </div>

            {/* Product Image */}
            <div className="border-2 border-gray-300 dark:border-gray-600 rounded-xl p-3 sm:p-4 bg-transparent">
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
                className="h-12 text-base border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-transparent font-mono focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:border-orange-500"
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
                <SelectTrigger className="h-12 text-base border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-transparent font-mono focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:border-orange-500">
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
                    className="h-12 text-base border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-transparent font-mono focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:border-orange-500"
                    maxLength={50}
                  />
                </div>
              )}
            </div>
            
            {/* Pricing Section */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <div className="border-2 border-gray-300 dark:border-gray-600 rounded-xl p-4 bg-transparent">
                <Label htmlFor="costPrice" className="font-mono text-sm font-bold uppercase tracking-wider text-gray-900 dark:text-white mb-3 block">
                  Cost Price (KES)
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
                    placeholder="optional"
                    className="h-12 text-base pl-14 border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-transparent font-mono focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:border-orange-500"
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
                    className="h-12 text-base pl-14 border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-transparent font-mono focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:border-orange-500"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Uncountable Notice */}
            <div className="border-2 border-orange-300 dark:border-orange-600 rounded-xl p-4 bg-orange-50/50 dark:bg-orange-900/20">
              <h3 className="font-mono font-bold uppercase tracking-wider text-orange-900 dark:text-orange-100 mb-2">
                Uncountable Item Notice
              </h3>
              <p className="text-sm text-orange-700 dark:text-orange-300 font-mono">
                This item will be marked as "Uncountable" with unspecified quantity. Perfect for items sold by scoops, cups, portions, or other non-countable units.
              </p>
            </div>


            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 pt-3 sm:pt-6">
              <Button 
                type="button" 
                onClick={onClose}
                className="w-full sm:w-auto px-4 sm:px-6 py-3 border-2 border-gray-300 dark:border-gray-600 bg-transparent text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg font-mono font-bold uppercase tracking-wide transition-all duration-200 text-sm sm:text-base"
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                disabled={isSaving}
                className="w-full sm:w-auto px-4 sm:px-6 py-3 border-2 border-orange-600 bg-orange-600 text-white hover:bg-orange-700 hover:border-orange-700 rounded-lg font-mono font-bold uppercase tracking-wide transition-all duration-200 shadow-lg hover:shadow-xl text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? 'Adding...' : 'Add Uncountable Item'}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
      
      {/* Template Selection Modal */}
      <TemplateSelectionModal
        isOpen={showTemplateModal}
        onClose={() => setShowTemplateModal(false)}
        onTemplateSelect={handleTemplateSelect}
        mode="uncountable"
      />
    </Dialog>
  );
};

export default UncountableProductModal;