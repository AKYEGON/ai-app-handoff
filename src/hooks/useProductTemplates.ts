import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNetworkStatus } from './useNetworkStatus';
import { usePublicTemplateCache } from './usePublicTemplateCache';
import { useSimpleTemplateSearch } from './useSimpleTemplateSearch';

export interface ProductTemplate {
  id: number;
  name: string;
  category: string | null;
  image_url: string | null;
}

export interface TemplateFilters {
  searchTerm: string;
  selectedCategory: string;
}

export const useProductTemplates = () => {
  const {
    templates: filteredTemplates,
    allTemplates,
    loading,
    error,
    searchTerm,
    selectedCategory,
    categories,
    isOnline,
    handleSearch,
    handleCategoryChange,
    clearFilters,
    refetch: loadTemplates,
    totalTemplates,
    hasActiveSearch,
    hasActiveFilter
  } = useSimpleTemplateSearch();

  // Search and filter functions
  const searchTemplates = useCallback((term: string) => {
    handleSearch(term);
  }, [handleSearch]);

  const filterByCategory = useCallback((category: string) => {
    handleCategoryChange(category);
  }, [handleCategoryChange]);

  return {
    templates: filteredTemplates,
    allTemplates,
    loading,
    error,
    searchTerm,
    selectedCategory,
    categories,
    searchTemplates,
    filterByCategory,
    clearFilters,
    refetch: loadTemplates,
    isOnline,
    totalTemplates,
    hasActiveSearch,
    hasActiveFilter
  };
};