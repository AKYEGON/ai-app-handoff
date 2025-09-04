import { useState, useCallback, useMemo } from 'react';
import { useProductTemplates, ProductTemplate } from './useProductTemplates';
import { Product } from '../types';

export interface BulkProductRow {
  id: string;
  name: string;
  category: string;
  costPrice: number | '';
  sellingPrice: number | '';
  currentStock: number | '';
  lowStockThreshold: number | '';
  image_url?: string | null;
  isValid: boolean;
  errors: string[];
}

export interface BulkAddState {
  // Views
  activeView: 'spreadsheet' | 'templates';
  
  // Spreadsheet data
  spreadsheetData: BulkProductRow[];
  
  // Template selection
  selectedTemplates: ProductTemplate[];
  
  // UI state
  isLoading: boolean;
  error: string | null;
}

export const useBulkAddState = () => {
  const [activeView, setActiveView] = useState<'spreadsheet' | 'templates'>('spreadsheet');
  const [spreadsheetData, setSpreadsheetData] = useState<BulkProductRow[]>([]);
  const [selectedTemplates, setSelectedTemplates] = useState<ProductTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize with empty rows
  const initializeSpreadsheet = useCallback(() => {
    const initialRows: BulkProductRow[] = Array.from({ length: 15 }, (_, index) => ({
      id: `row_${index}`,
      name: '',
      category: '',
      costPrice: '',
      sellingPrice: '',
      currentStock: '',
      lowStockThreshold: '',
      image_url: '',
      isValid: false,
      errors: [],
    }));
    setSpreadsheetData(initialRows);
  }, []);

  // Validate a single row
  const validateRow = useCallback((row: BulkProductRow): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];
    
    if (!row.name.trim()) {
      errors.push('Name is required');
    }
    
    if (!row.category.trim()) {
      errors.push('Category is required');
    }
    
    if (!row.sellingPrice || row.sellingPrice <= 0) {
      errors.push('Selling price is required and must be > 0');
    }

    return { isValid: errors.length === 0, errors };
  }, []);

  // Update spreadsheet data
  const updateSpreadsheetData = useCallback((newData: BulkProductRow[]) => {
    // Validate all rows
    const validatedData = newData.map(row => {
      const validation = validateRow(row);
      return {
        ...row,
        isValid: validation.isValid,
        errors: validation.errors,
      };
    });
    
    setSpreadsheetData(validatedData);
    
    // Update selected templates to match spreadsheet
    const templateNames = validatedData.filter(row => row.name.trim()).map(row => row.name);
    setSelectedTemplates(prev => 
      prev.filter(template => templateNames.includes(template.name))
    );
  }, [validateRow]);

  // Handle template selection
  const toggleTemplate = useCallback((template: ProductTemplate) => {
    const isSelected = selectedTemplates.some(t => t.id === template.id);
    
    if (isSelected) {
      // Remove from selection
      setSelectedTemplates(prev => prev.filter(t => t.id !== template.id));
      
      // Remove from spreadsheet
      setSpreadsheetData(prev => 
        prev.map(row => 
          row.name === template.name 
            ? { ...row, name: '', category: '', image_url: '', isValid: false, errors: [] } 
            : row
        )
      );
    } else {
      // Add to selection
      setSelectedTemplates(prev => [...prev, template]);
      
      // Add to spreadsheet - find first empty row
      setSpreadsheetData(prev => {
        const emptyRowIndex = prev.findIndex(row => !row.name.trim());
        const updated = [...prev];
        
        if (emptyRowIndex === -1) {
          // No empty rows, add new one
          const newRow: BulkProductRow = {
            id: `template_${template.id}_${Date.now()}`,
            name: template.name,
            category: template.category || '',
            costPrice: '',
            sellingPrice: '',
            currentStock: '',
            lowStockThreshold: '',
            image_url: template.image_url || '',
            isValid: false,
            errors: ['Selling price is required and must be > 0'],
          };
          updated.push(newRow);
        } else {
          // Fill empty row
          updated[emptyRowIndex] = {
            ...updated[emptyRowIndex],
            name: template.name,
            category: template.category || '',
            image_url: template.image_url || '', // Properly handle null values
            isValid: false,
            errors: ['Selling price is required and must be > 0'],
          };
        }
        
        return updated;
      });
    }
  }, [selectedTemplates]);

  // Clear all data
  const clearAll = useCallback(() => {
    setSelectedTemplates([]);
    initializeSpreadsheet();
    setError(null);
  }, [initializeSpreadsheet]);

  // Generate SKU for bulk products
  const generateSKU = useCallback((category: string, name: string, index: number) => {
    const prefix = category ? category.substring(0, 3).toUpperCase() : 'BLK';
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `${prefix}-${timestamp}-${random}-${index.toString().padStart(3, '0')}`;
  }, []);

  // Get valid products for saving
  const getValidProducts = useCallback((): Omit<Product, 'id' | 'createdAt' | 'updatedAt'>[] => {
    const validRows = spreadsheetData.filter(row => row.isValid && row.name.trim());
    
    return validRows.map((row, index) => {
      const isUncountable = (
        row.currentStock === '' || Number(row.currentStock) === 0
      ) && (
        row.lowStockThreshold === '' || Number(row.lowStockThreshold) === 0
      );

      return {
        name: row.name.trim(),
        category: row.category || 'General',
        costPrice: row.costPrice === '' ? 0 : Number(row.costPrice),
        sellingPrice: Number(row.sellingPrice),
        currentStock: isUncountable ? -1 : Number(row.currentStock),
        lowStockThreshold: isUncountable ? 0 : (row.lowStockThreshold === '' ? 10 : Number(row.lowStockThreshold)),
        sku: generateSKU(row.category || 'General', row.name, index + 1), // Auto-generated SKU
        image_url: row.image_url || null, // Ensure image_url is properly transferred
      };
    });
  }, [spreadsheetData, generateSKU]);

  // Calculate stats
  const stats = useMemo(() => {
    const validCount = spreadsheetData.filter(row => row.isValid).length;
    const totalCount = spreadsheetData.filter(row => row.name.trim()).length;
    const selectedCount = selectedTemplates.length;
    
    return {
      validCount,
      totalCount,
      selectedCount,
      hasValidProducts: validCount > 0,
    };
  }, [spreadsheetData, selectedTemplates]);

  return {
    // State
    activeView,
    spreadsheetData,
    selectedTemplates,
    isLoading,
    error,
    stats,
    
    // Actions
    setActiveView,
    updateSpreadsheetData,
    toggleTemplate,
    clearAll,
    initializeSpreadsheet,
    getValidProducts,
    setIsLoading,
    setError,
  };
};