import React, { useState } from 'react';
import { X, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ProxyImage from '@/components/ui/proxy-image';
import SpinningNumberInput from '@/components/ui/spinning-number-input';
import { cn } from '@/lib/utils';

interface TemplateSelectionOverlayProps {
  template: any;
  isVisible: boolean;
  onClose: () => void;
  onAddToSpreadsheet: (productData: any) => void;
  className?: string;
  mode?: 'bulk' | 'single';
}

interface ProductFormData {
  costPrice: number;
  sellingPrice: number;
  currentStock: number;
  lowStockThreshold: number;
}

/**
 * Overlay that appears when a template is selected
 * Shows spinning number inputs for product configuration
 */
const TemplateSelectionOverlay: React.FC<TemplateSelectionOverlayProps> = ({
  template,
  isVisible,
  onClose,
  onAddToSpreadsheet,
  className,
  mode = 'bulk'
}) => {
  const [formData, setFormData] = useState<ProductFormData>({
    costPrice: 10,
    sellingPrice: 15,
    currentStock: 50,
    lowStockThreshold: 10
  });

  const handleFieldChange = (field: keyof ProductFormData, value: number) => {
    console.log('[TemplateSelectionOverlay] Field change:', field, value);
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAddProduct = () => {
    console.log('[TemplateSelectionOverlay] handleAddProduct called');
    console.log('[TemplateSelectionOverlay] formData:', formData);
    console.log('[TemplateSelectionOverlay] template:', template);
    
    const productData = {
      name: template.name,
      category: template.category,
      image_url: template.image_url,
      costPrice: formData.costPrice,
      sellingPrice: formData.sellingPrice,
      currentStock: formData.currentStock,
      lowStockThreshold: formData.lowStockThreshold
    };
    
    console.log('[TemplateSelectionOverlay] Calling onAddToSpreadsheet with:', productData);
    onAddToSpreadsheet(productData);
    console.log('[TemplateSelectionOverlay] Calling onClose');
    onClose();
  };

  
  
  if (!isVisible) return null;

  return (
    <div className={cn(
      "fixed inset-0 flex items-center justify-center p-2",
      "bg-black/70 backdrop-blur-sm",
      className
    )}
    style={{ 
      zIndex: 100000,
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0
    }}>
      {/* Overlay Background */}
      <div 
        className="absolute inset-0" 
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onClose();
        }}
      />
      
      {/* Content Container - Positioned slightly above middle */}
      <div 
        className="relative bg-card/98 backdrop-blur-xl rounded-2xl md:rounded-3xl border border-border/50 shadow-2xl max-w-2xl md:max-w-3xl w-full mx-2 md:mx-4 transform transition-all duration-300 ease-out max-h-[90dvh] h-[90dvh] flex flex-col"
        style={{ 
          zIndex: 10000,
          background: 'linear-gradient(135deg, hsl(var(--card) / 0.98), hsl(var(--muted) / 0.95))',
          backdropFilter: 'blur(20px)',
        }}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        {/* Elegant Header */}
        <div className="flex items-center justify-between p-4 md:p-6 border-b border-border/30">
          <div className="flex items-center gap-3 md:gap-6">
            {/* Template Image */}
            <div className="w-14 h-14 md:w-20 md:h-20 rounded-xl md:rounded-2xl overflow-hidden bg-gradient-to-br from-primary/10 to-primary/20 flex-shrink-0 ring-2 ring-primary/20">
              {template.image_url ? (
                <ProxyImage 
                  src={template.image_url}
                  alt={template.name}
                  className="w-full h-full object-cover"
                  fallbackContent={(
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-3xl font-bold text-primary">
                        {template.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-3xl font-bold text-primary">
                    {template.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
            </div>
            
            {/* Template Info */}
            <div className="min-w-0 flex-1">
              <h3 className="font-bold text-lg md:text-xl text-foreground mb-1 truncate">{template.name}</h3>
              {template.category && (
                <p className="text-sm md:text-base text-muted-foreground capitalize font-medium">{template.category}</p>
              )}
            </div>
          </div>
          
          {/* Close Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="w-8 h-8 md:w-10 md:h-10 p-0 hover:bg-muted/50 rounded-full flex-shrink-0"
          >
            <X className="w-4 h-4 md:w-5 md:h-5" />
          </Button>
        </div>
        
        {/* Scrollable Content */}
        <div className="flex-1 overflow-auto p-4 md:p-6 pb-[env(safe-area-inset-bottom,1rem)]">
          <div className="text-center mb-4">
            <h4 className="text-base font-semibold mb-1 text-foreground">
              Configure Product Details
            </h4>
            <p className="text-muted-foreground text-xs">
              Scroll or tap to adjust values
            </p>
          </div>
          
          {/* Compact Spinning Number Inputs Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-6">
            <SpinningNumberInput
              label="Cost"
              value={formData.costPrice}
              onChange={(value) => handleFieldChange('costPrice', value)}
              min={0}
              max={999999}
              step={1}
              suffix="KES"
            />
            
            <SpinningNumberInput
              label="Selling"
              value={formData.sellingPrice}
              onChange={(value) => handleFieldChange('sellingPrice', value)}
              min={0}
              max={999999}
              step={1}
              suffix="KES"
            />
            
            <SpinningNumberInput
              label="In Stock"
              value={formData.currentStock}
              onChange={(value) => handleFieldChange('currentStock', value)}
              min={0}
              max={999999}
              step={1}
              suffix="units"
            />
            
            <SpinningNumberInput
              label="Low Stock Alert"
              value={formData.lowStockThreshold}
              onChange={(value) => handleFieldChange('lowStockThreshold', value)}
              min={0}
              max={999999}
              step={1}
              suffix="units"
            />
          </div>
          
          {/* Compact Profit Calculation */}
          <div className="bg-gradient-to-r from-primary/3 to-primary/5 rounded-lg p-3 mb-4 border border-primary/10">
            <h5 className="font-medium text-center mb-2 text-foreground text-sm">Profit Analysis</h5>
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center">
                <div className="text-xs text-muted-foreground mb-1">Profit per Unit</div>
                <div className={cn(
                  "text-lg font-semibold",
                  formData.sellingPrice > formData.costPrice 
                    ? "text-green-600 dark:text-green-400" 
                    : "text-red-600 dark:text-red-400"
                )}>
                  {(formData.sellingPrice - formData.costPrice).toLocaleString()} KES
                </div>
              </div>
              <div className="text-center">
                <div className="text-xs text-muted-foreground mb-1">Profit Margin</div>
                <div className={cn(
                  "text-lg font-semibold",
                  formData.sellingPrice > formData.costPrice 
                    ? "text-green-600 dark:text-green-400" 
                    : "text-red-600 dark:text-red-400"
                )}>
                  {formData.costPrice > 0 
                    ? (((formData.sellingPrice - formData.costPrice) / formData.costPrice) * 100).toFixed(1)
                    : '0'
                  }%
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Sticky Footer Actions */}
        <div className="flex-shrink-0 p-4 md:p-6 pt-2 border-t border-border/30 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/75">
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3">
            <Button
              onClick={onClose}
              variant="outline"
              className="w-full sm:w-auto h-10 text-sm px-6"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddProduct}
              size="lg"
              className="w-full sm:flex-1 h-12 text-base font-semibold gap-2 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white shadow-lg"
            >
              <Plus className="w-4 h-4" />
              Save
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TemplateSelectionOverlay;