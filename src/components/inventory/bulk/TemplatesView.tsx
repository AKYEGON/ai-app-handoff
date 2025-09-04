import React, { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { useBulkAdd } from './BulkAddProvider';
import { useProductTemplates } from '../../../hooks/useProductTemplates';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Search, X, Filter } from 'lucide-react';
import ResponsiveProductGrid from '../../ui/responsive-product-grid';
import SimpleTemplateSearch from './SimpleTemplateSearch';
import TemplateLoadingStatus from './TemplateLoadingStatus';
import TemplateDebugPanel from './TemplateDebugPanel';
import TemplateCacheManager from './TemplateCacheManager';
import ImageDownloadButton from './ImageDownloadButton';
import VirtualizedTemplateGrid from './VirtualizedTemplateGrid';
import TemplateImage from '../../ui/template-image';
import TemplateSelectionOverlay from './TemplateSelectionOverlay';


const TemplatesView: React.FC = () => {
  const { selectedTemplates, toggleTemplate } = useBulkAdd();
  const {
    templates,
    loading,
    error,
    searchTerm,
    selectedCategory,
    categories,
    searchTemplates,
    filterByCategory,
    clearFilters,
    isOnline,
    totalTemplates
  } = useProductTemplates();
  

  return (
    <div className="flex flex-col h-full">
      {/* Fixed Search Bar Only */}
      <div className="p-2 sm:p-3 border-b border-border bg-muted/20 flex-shrink-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={`Search ${totalTemplates > 0 ? totalTemplates.toLocaleString() : '7,344+'} templates... (e.g., 'kabras', 'sugar', 'omo')`}
            value={searchTerm}
            onChange={(e) => searchTemplates(e.target.value)}
            className="pl-10 pr-10 h-8 sm:h-10 text-sm"
            disabled={loading}
          />
          {searchTerm && (
            <Button
              onClick={() => searchTemplates('')}
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 sm:h-7 sm:w-7 p-0"
            >
              <X className="w-3 h-3 sm:w-4 sm:h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Scrollable Categories and Templates */}
      <div className="flex-1 overflow-auto">
        {/* Scrollable Category Filter */}
        <div className="p-2 sm:p-3 bg-muted/10 border-b border-border/50">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {categories.map((category) => (
              <Button
                key={category}
                onClick={() => filterByCategory(category)}
                variant={selectedCategory === category ? "default" : "outline"}
                size="sm"
                className={cn(
                  "capitalize whitespace-nowrap flex-shrink-0 h-7 px-3 text-xs",
                  selectedCategory === category && "bg-primary text-primary-foreground"
                )}
                disabled={loading}
              >
                <Filter className="w-3 h-3 mr-1" />
                {category === 'all' ? 'All Categories' : category}
              </Button>
            ))}
          </div>
          
          {/* Compact Results Summary */}
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
              {Array.from({ length: 24 }).map((_, index) => (
                <div key={index} className="animate-pulse">
                  <div className="bg-gray-200 dark:bg-gray-700 rounded-lg aspect-square mb-2"></div>
                  <div className="bg-gray-200 dark:bg-gray-700 rounded h-4 mb-1"></div>
                  <div className="bg-gray-200 dark:bg-gray-700 rounded h-3 w-2/3"></div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center p-8">
                <div className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Failed to load templates
                </div>
                <p className="text-gray-500 dark:text-gray-400">{error}</p>
              </div>
            </div>
          ) : (
            <PaginatedTemplateGrid templates={templates} selectedTemplates={selectedTemplates} onToggleTemplate={toggleTemplate} searchTerm={searchTerm} />
          )}
        </div>
      </div>
    </div>
  );
};

// Pagination component for efficient template display
const PaginatedTemplateGrid: React.FC<{
  templates: any[];
  selectedTemplates: any[];
  onToggleTemplate: (template: any) => void;
  searchTerm: string;
}> = ({ templates, selectedTemplates, onToggleTemplate, searchTerm }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [isOverlayVisible, setIsOverlayVisible] = useState(false);
  const [addedTemplateIds, setAddedTemplateIds] = useState<Set<number>>(new Set());
  const { updateSpreadsheetData, spreadsheetData } = useBulkAdd();
  const templatesPerPage = 50; // Reduced for faster loading
  
  const totalPages = Math.ceil(templates.length / templatesPerPage);
  const startIndex = (currentPage - 1) * templatesPerPage;
  const endIndex = startIndex + templatesPerPage;
  const currentTemplates = templates.slice(startIndex, endIndex);

  // Reset to first page when a new search is performed
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Clamp current page if filtered result reduces total pages
  useEffect(() => {
    const pages = Math.max(1, Math.ceil(templates.length / templatesPerPage));
    if (currentPage > pages) {
      setCurrentPage(pages);
    }
  }, [templates.length, currentPage]);

  const handleTemplateClick = (template: any) => {
    setSelectedTemplate(template);
    setIsOverlayVisible(true);
  };

  const handleCloseOverlay = () => {
    setIsOverlayVisible(false);
    setSelectedTemplate(null);
  };

  const handleAddToSpreadsheet = (productData: any) => {
    // Prevent duplicates by checking if template is already added
    const existingRowIndex = spreadsheetData.findIndex(row => 
      row.name.trim() === productData.name.trim() && row.name.trim() !== ''
    );
    
    if (existingRowIndex >= 0) {
      console.log('[TemplatesView] Template already exists in spreadsheet, skipping');
      return;
    }
    
    // Find first empty row in spreadsheet
    const emptyRowIndex = spreadsheetData.findIndex(row => !row.name.trim());
    const newSpreadsheetData = [...spreadsheetData];
    
    const newRow = {
      id: emptyRowIndex >= 0 ? spreadsheetData[emptyRowIndex].id : `template_${productData.name}_${Date.now()}`,
      name: productData.name,
      category: productData.category || '',
      costPrice: productData.costPrice, // Fix: use camelCase property names
      sellingPrice: productData.sellingPrice,
      currentStock: productData.currentStock,
      lowStockThreshold: productData.lowStockThreshold,
      image_url: productData.image_url || '',
      isValid: true,
      errors: []
    };
    
    if (emptyRowIndex >= 0) {
      newSpreadsheetData[emptyRowIndex] = newRow;
    } else {
      newSpreadsheetData.push(newRow);
    }
    
    updateSpreadsheetData(newSpreadsheetData);
    
    // Track this template as added for highlighting
    setAddedTemplateIds(prev => new Set([...prev, selectedTemplate.id]));
  };

  const goToPage = (page: number) => {
    setCurrentPage(page);
    // Scroll to top of templates grid
    const templatesContainer = document.querySelector('.templates-grid-container');
    if (templatesContainer) {
      templatesContainer.scrollTop = 0;
    }
  };

  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      const start = Math.max(1, currentPage - 2);
      const end = Math.min(totalPages, start + maxVisiblePages - 1);
      
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
    }
    
    return pages;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Compact Page Info */}
      <div className="px-4 py-1 bg-muted/10 text-xs text-muted-foreground text-center">
        Showing {templates.length === 0 ? 0 : startIndex + 1}-{Math.min(endIndex, templates.length)} of {templates.length.toLocaleString()} templates
      </div>

      {/* Templates Grid Container - Maximized Space */}
      <div className="flex-1 overflow-auto templates-grid-container">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 gap-2 p-3">
          {currentTemplates.map((template) => {
              const isSelected = selectedTemplates.some(t => t.id === template.id);
              const isAdded = addedTemplateIds.has(template.id);
              return (
                <div
                  key={template.id}
                  onClick={() => handleTemplateClick(template)}
                  className={`relative bg-card rounded-lg border transition-all duration-200 cursor-pointer shadow-sm hover:shadow-lg overflow-hidden ${
                    isAdded
                      ? "border-green-500 bg-green-50 dark:bg-green-950/20 ring-2 ring-green-500/30 shadow-md"
                      : isSelected 
                        ? "border-primary bg-primary/5 ring-2 ring-primary/20 shadow-md" 
                        : "border-border hover:border-primary/40"
                  }`}
                >
                  {/* Selection/Added indicator */}
                  {(isSelected || isAdded) && (
                    <div className={`absolute top-1 right-1 z-20 w-5 h-5 rounded-full flex items-center justify-center shadow-md ${
                      isAdded ? "bg-green-500" : "bg-primary"
                    }`}>
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}

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
              );
            })}
        </div>
        
        {/* Scrollable Pagination at Bottom of Content */}
        {totalPages > 1 && (
          <div className="px-3 py-4 border-t border-border/50">
            <div className="flex items-center justify-center gap-2 flex-wrap">
              {/* Previous Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="gap-1 text-xs"
              >
                ← Prev
              </Button>

              {/* Page Numbers - Scrollable */}
              <div className="flex gap-1 overflow-x-auto max-w-xs">
                {currentPage > 3 && (
                  <>
                    <Button
                      variant={1 === currentPage ? "default" : "outline"}
                      size="sm"
                      onClick={() => goToPage(1)}
                      className="w-8 h-8 p-0 text-xs flex-shrink-0"
                    >
                      1
                    </Button>
                    {currentPage > 4 && <span className="px-1 text-muted-foreground text-xs flex-shrink-0">...</span>}
                  </>
                )}
                
                {getPageNumbers().map((page) => (
                  <Button
                    key={page}
                    variant={page === currentPage ? "default" : "outline"}
                    size="sm"
                    onClick={() => goToPage(page)}
                    className="w-8 h-8 p-0 text-xs flex-shrink-0"
                  >
                    {page}
                  </Button>
                ))}
                
                {currentPage < totalPages - 2 && (
                  <>
                    {currentPage < totalPages - 3 && <span className="px-1 text-muted-foreground text-xs flex-shrink-0">...</span>}
                    <Button
                      variant={totalPages === currentPage ? "default" : "outline"}
                      size="sm"
                      onClick={() => goToPage(totalPages)}
                      className="w-8 h-8 p-0 text-xs flex-shrink-0"
                    >
                      {totalPages}
                    </Button>
                  </>
                )}
              </div>

              {/* Next Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="gap-1 text-xs"
              >
                Next →
              </Button>
            </div>
            
            {/* Compact Jump */}
            <div className="flex items-center justify-center gap-2 mt-2">
              <span className="text-xs text-muted-foreground">Page:</span>
              <input
                type="number"
                min="1"
                max={totalPages}
                value={currentPage}
                onChange={(e) => {
                  const page = parseInt(e.target.value);
                  if (page >= 1 && page <= totalPages) {
                    goToPage(page);
                  }
                }}
                className="w-12 px-1 py-1 text-xs border rounded text-center bg-background"
              />
              <span className="text-xs text-muted-foreground">of {totalPages}</span>
            </div>
          </div>
        )}
      </div>
      
      {/* Template Selection Overlay */}
      <TemplateSelectionOverlay
        template={selectedTemplate}
        isVisible={isOverlayVisible}
        onClose={handleCloseOverlay}
        onAddToSpreadsheet={handleAddToSpreadsheet}
      />
    </div>
  );
};

export default TemplatesView;