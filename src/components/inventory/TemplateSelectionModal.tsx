import React, { useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious, PaginationEllipsis } from '@/components/ui/pagination';
import { X, Package2, ArrowLeft, Plus, Search, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLazyTemplateSearch, ProductTemplate } from '../../hooks/useLazyTemplateSearch';
import VirtualizedTemplateGrid from './VirtualizedTemplateGrid';
import SpinningNumberInput from '../ui/spinning-number-input';
import TemplateImage from '../ui/template-image';

interface TemplateSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTemplateSelect: (templateData: any) => void;
  mode?: 'normal' | 'uncountable' | 'variation';
}

const TemplateSelectionModal: React.FC<TemplateSelectionModalProps> = ({
  isOpen,
  onClose,
  onTemplateSelect,
  mode = 'normal'
}) => {
  const [selectedTemplate, setSelectedTemplate] = useState<ProductTemplate | null>(null);
  const [modalStep, setModalStep] = useState<'selection' | 'configuration'>('selection');
  const [formData, setFormData] = useState({
    costPrice: 10,
    sellingPrice: 15,
    currentStock: 50,
    lowStockThreshold: 10
  });
  
  const {
    templates,
    loading,
    error,
    searchTerm,
    selectedCategory,
    categories,
    handleSearch,
    handleCategoryChange: filterByCategory,
    clearFilters,
    totalTemplates,
    initializeTemplates,
    initialized,
    currentPage,
    totalPages,
    handlePageChange
  } = useLazyTemplateSearch();

  // Reset modal state when closing
  React.useEffect(() => {
    if (!isOpen) {
      setModalStep('selection');
      setSelectedTemplate(null);
      setFormData({
        costPrice: 10,
        sellingPrice: 15,
        currentStock: 50,
        lowStockThreshold: 10
      });
    }
  }, [isOpen]);

  // Initialize templates when modal opens
  React.useEffect(() => {
    if (isOpen && !initialized) {
      initializeTemplates();
    }
  }, [isOpen, initialized]);

  const handleTemplateClick = React.useCallback((template: ProductTemplate) => {
    console.log('[TemplateSelectionModal] Template clicked:', template.name);
    setSelectedTemplate(template);
    setModalStep('configuration');
  }, []);

  const handleBackToSelection = React.useCallback(() => {
    console.log('[TemplateSelectionModal] Going back to selection');
    setModalStep('selection');
    setSelectedTemplate(null);
  }, []);

  const handleFieldChange = React.useCallback((field: string, value: number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  const handleUseTemplate = React.useCallback(() => {
    if (!selectedTemplate) return;
    
    const templateData = {
      name: selectedTemplate.name,
      category: selectedTemplate.category,
      image_url: selectedTemplate.image_url,
      cost_price: formData.costPrice,
      selling_price: formData.sellingPrice,
      current_stock: mode === 'uncountable' ? -1 : formData.currentStock,
      low_stock_threshold: mode === 'uncountable' ? 0 : formData.lowStockThreshold
    };
    
    console.log('[TemplateSelectionModal] Using template with data:', templateData);
    onTemplateSelect(templateData);
    onClose();
  }, [selectedTemplate, formData, onTemplateSelect, onClose, mode]);

  // Handle dialog open change - prevent closing during configuration
  const handleDialogOpenChange = React.useCallback((open: boolean) => {
    if (!open) {
      if (modalStep === 'configuration') {
        // Don't close during configuration, go back to selection
        handleBackToSelection();
      } else {
        onClose();
      }
    }
  }, [modalStep, onClose, handleBackToSelection]);

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="max-w-6xl w-[95vw] h-[90dvh] p-0 flex flex-col bg-background">
        <DialogTitle className="sr-only">
          {modalStep === 'selection' ? 'Select Template' : 'Configure Template'}
        </DialogTitle>
        
        {modalStep === 'selection' ? (
          <>
            {/* Template Selection Header */}
            <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Package2 className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">
                    Select {mode === 'uncountable' ? 'Uncountable Item' : 'Product'} Template
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Choose a template to pre-fill your {mode === 'uncountable' ? 'uncountable item' : 'product'} details
                  </p>
                 </div>
              </div>
            </div>

            {/* Fixed Search Bar */}
            <div className="bg-muted/20 border-b border-border flex-shrink-0">
              <div className="p-3">
                <div className="relative">
                  <Search className={cn(
                    "absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 transition-colors",
                    loading ? "text-primary animate-pulse" : "text-muted-foreground"
                  )} />
                  <Input
                    placeholder={`Search ${totalTemplates > 0 ? totalTemplates.toLocaleString() : '7,344+'} templates...`}
                    value={searchTerm}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="pl-10 h-10"
                    autoFocus
                  />
                  {loading && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Scrollable Categories and Templates */}
            <div className="flex-1 overflow-auto">
              {/* Horizontal Scrollable Categories */}
              <div className="p-3 bg-muted/10 border-b border-border/50">
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {categories.map((category) => (
                    <Button
                      key={category}
                      onClick={() => filterByCategory(category)}
                      variant={selectedCategory === category ? "default" : "outline"}
                      size="sm"
                      className={cn(
                        "capitalize whitespace-nowrap flex-shrink-0 h-7 px-3 text-xs transition-opacity",
                        selectedCategory === category && "bg-primary text-primary-foreground",
                        loading && "opacity-75"
                      )}
                    >
                      <Filter className="w-3 h-3 mr-1" />
                      {category === 'all' ? 'All Categories' : category}
                    </Button>
                  ))}
                </div>
                
                {/* Results Summary */}
                <div className="flex items-center justify-between text-xs mt-2">
                  <span className="text-muted-foreground">
                    <span className="font-semibold text-primary">{templates.length.toLocaleString()}</span> of{' '}
                    <span className="font-semibold">{totalTemplates.toLocaleString()}</span> templates
                  </span>
                  {(searchTerm.trim() || selectedCategory !== 'all') && (
                    <Button
                      onClick={clearFilters}
                      variant="ghost"
                      size="sm"
                      className="text-xs h-6 px-2"
                    >
                      Clear Filters
                    </Button>
                  )}
                </div>
              </div>

              {/* Templates Grid */}
              <div className="flex-1">
                {loading ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 p-4">
                    {Array.from({ length: 20 }).map((_, index) => (
                      <div key={index} className="animate-pulse">
                        <div className="bg-muted rounded-lg aspect-square mb-2"></div>
                        <div className="bg-muted rounded h-4 mb-1"></div>
                        <div className="bg-muted rounded h-3 w-2/3"></div>
                      </div>
                    ))}
                  </div>
                ) : error ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="text-center p-8">
                      <Package2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground mb-2">Failed to load templates</p>
                      <p className="text-sm text-muted-foreground">{error}</p>
                    </div>
                  </div>
                ) : templates.length === 0 ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="text-center p-8">
                      <Package2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground mb-2">No templates found</p>
                      <p className="text-sm text-muted-foreground">Try adjusting your search or filters</p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 p-4">
                    {templates.map((template) => (
                      <div
                        key={template.id}
                        onClick={() => handleTemplateClick(template)}
                        className="relative bg-card rounded-lg border border-border hover:border-primary/40 transition-all duration-200 cursor-pointer shadow-sm hover:shadow-lg overflow-hidden"
                      >
                        {/* Product Image */}
                        <div className="aspect-square overflow-hidden rounded-t-lg bg-gradient-to-br from-muted/50 to-muted">
                          <TemplateImage 
                            src={template.image_url}
                            alt={template.name}
                            productName={template.name}
                            className="w-full h-full"
                          />
                        </div>
                        
                        {/* Product Information */}
                        <div className="p-2 flex flex-col gap-1">
                          <h4 className="font-medium text-xs text-foreground line-clamp-2 leading-tight min-h-[2rem]" title={template.name}>
                            {template.name}
                          </h4>
                          {template.category && (
                            <p className="text-[10px] text-muted-foreground capitalize truncate">
                              {template.category}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Pagination for Templates - Scrollable, not fixed */}
                {totalPages > 1 && (
                  <div className="bg-background/95 backdrop-blur-sm border-t border-border p-4">
                    <Pagination className="w-full">
                      <PaginationContent className="flex-wrap justify-center gap-1">
                        <PaginationItem>
                          <PaginationPrevious 
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              if (currentPage > 1) handlePageChange(currentPage - 1);
                            }}
                            className={currentPage === 1 ? 'pointer-events-none opacity-50' : ''}
                          />
                        </PaginationItem>
                        
                        {/* Show first page */}
                        {currentPage > 3 && (
                          <>
                            <PaginationItem>
                              <PaginationLink 
                                href="#"
                                onClick={(e) => {
                                  e.preventDefault();
                                  handlePageChange(1);
                                }}
                                isActive={currentPage === 1}
                              >
                                1
                              </PaginationLink>
                            </PaginationItem>
                            {currentPage > 4 && <PaginationEllipsis />}
                          </>
                        )}
                        
                        {/* Show pages around current */}
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          const start = Math.max(1, Math.min(currentPage - 2, totalPages - 4));
                          const pageNum = start + i;
                          if (pageNum > totalPages || pageNum < 1) return null;
                          
                          // Skip if already shown in first/last sections
                          if ((currentPage > 3 && pageNum === 1) || (currentPage < totalPages - 2 && pageNum === totalPages)) {
                            return null;
                          }
                          
                          return (
                            <PaginationItem key={pageNum}>
                              <PaginationLink 
                                href="#"
                                onClick={(e) => {
                                  e.preventDefault();
                                  handlePageChange(pageNum);
                                }}
                                isActive={currentPage === pageNum}
                              >
                                {pageNum}
                              </PaginationLink>
                            </PaginationItem>
                          );
                        })}
                        
                        {/* Show last page */}
                        {currentPage < totalPages - 2 && (
                          <>
                            {currentPage < totalPages - 3 && <PaginationEllipsis />}
                            <PaginationItem>
                              <PaginationLink 
                                href="#"
                                onClick={(e) => {
                                  e.preventDefault();
                                  handlePageChange(totalPages);
                                }}
                                isActive={currentPage === totalPages}
                              >
                                {totalPages}
                              </PaginationLink>
                            </PaginationItem>
                          </>
                        )}
                        
                        <PaginationItem>
                          <PaginationNext 
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              if (currentPage < totalPages) handlePageChange(currentPage + 1);
                            }}
                            className={currentPage === totalPages ? 'pointer-events-none opacity-50' : ''}
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                    
                    {/* Page info */}
                    <div className="text-center mt-2">
                      <span className="text-xs text-muted-foreground">
                        Page {currentPage} of {totalPages} ({totalTemplates.toLocaleString()} total templates)
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Configuration Header */}
            <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30 flex-shrink-0">
              <div className="flex items-center gap-3">
                <Button
                  onClick={handleBackToSelection}
                  variant="ghost"
                  size="sm"
                  className="p-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                
                {selectedTemplate && (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-gradient-to-br from-primary/10 to-primary/20 flex-shrink-0">
                      {selectedTemplate.image_url ? (
                        <TemplateImage 
                          src={selectedTemplate.image_url} 
                          alt={selectedTemplate.name}
                          productName={selectedTemplate.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="text-sm font-bold text-primary">
                            {selectedTemplate.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold">{selectedTemplate.name}</h2>
                      <p className="text-sm text-muted-foreground">
                        Configure product details
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Configuration Content */}
            <div className="flex-1 overflow-auto p-4 pb-[env(safe-area-inset-bottom,1rem)]">
              <div className="max-w-2xl mx-auto">
                <div className="text-center mb-6">
                  <h3 className="text-lg font-semibold mb-2">
                    Configure {mode === 'uncountable' ? 'Uncountable Item' : 'Product'} Details
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    Adjust the values below to customize your {mode === 'uncountable' ? 'uncountable item' : 'product'}
                  </p>
                </div>
                
                {/* Spinning Number Inputs Grid */}
                <div className={cn(
                  "gap-4 mb-6",
                  mode === 'uncountable' 
                    ? "grid grid-cols-1 sm:grid-cols-2"
                    : mode === 'variation'
                    ? "grid grid-cols-1 sm:grid-cols-2"
                    : "grid grid-cols-2 sm:grid-cols-4"
                )}>
                  {mode === 'variation' ? (
                    <>
                      <SpinningNumberInput
                        label="Parent Stock Quantity"
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
                    </>
                  ) : (
                    <>
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
                      
                      {mode !== 'uncountable' && (
                        <>
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
                        </>
                      )}
                    </>
                  )}
                </div>
                
                {/* Mode-specific Notices */}
                {mode === 'uncountable' && (
                  <div className="bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 rounded-lg p-3 mb-4 border border-orange-200 dark:border-orange-800">
                    <h5 className="font-semibold text-orange-900 dark:text-orange-100 mb-1 text-sm">
                      Uncountable Item Template
                    </h5>
                    <p className="text-xs text-orange-700 dark:text-orange-300">
                      This template will be configured for uncountable items (sold by scoops, cups, portions, etc.).
                    </p>
                  </div>
                )}
                
                {mode === 'variation' && (
                  <div className="bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg p-3 mb-4 border border-green-200 dark:border-green-800">
                    <h5 className="font-semibold text-green-900 dark:text-green-100 mb-1 text-sm">
                      Variation Product Template
                    </h5>
                    <p className="text-xs text-green-700 dark:text-green-300">
                      This template will be used as the base for your product variations.
                    </p>
                  </div>
                )}

                {/* Profit Calculation - Only show for non-variation modes */}
                {mode !== 'variation' && (
                  <div className="bg-gradient-to-r from-primary/3 to-primary/5 rounded-lg p-3 mb-4 border border-primary/10">
                    <h5 className="font-medium text-center mb-2 text-foreground text-sm">Profit Analysis</h5>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="text-center">
                        <div className="text-xs text-muted-foreground mb-1">Profit per Unit</div>
                        <div className={cn(
                          "text-base font-semibold",
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
                          "text-base font-semibold",
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
                )}
                
                {/* Action Buttons */}
                <div className="sticky bottom-0 -mx-4 px-4 pt-3 pb-[env(safe-area-inset-bottom,1rem)] bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/75 border-t flex flex-col gap-2">
                  <Button
                    onClick={handleBackToSelection}
                    variant="outline"
                    className="w-full h-10 text-sm"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Templates
                  </Button>
                  <Button
                    onClick={handleUseTemplate}
                    className="w-full h-12 text-base font-semibold gap-2 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white shadow-lg"
                  >
                    <Plus className="w-4 h-4" />
                    Use Template
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default TemplateSelectionModal;