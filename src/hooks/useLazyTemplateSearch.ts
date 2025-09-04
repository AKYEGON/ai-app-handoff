import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNetworkStatus } from './useNetworkStatus';
import { usePublicTemplateCache } from './usePublicTemplateCache';
import Fuse from 'fuse.js';

export interface ProductTemplate {
  id: number;
  name: string;
  category: string | null;
  image_url: string | null;
}

// Lazy loading hook that only loads templates when needed with pagination
export const useLazyTemplateSearch = () => {
  const [allTemplates, setAllTemplates] = useState<ProductTemplate[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const TEMPLATES_PER_PAGE = 100; // Display 100 templates at a time
  
  const { isOnline } = useNetworkStatus();
  const { getCache, setCache, getCacheInfo, isInitialized } = usePublicTemplateCache();

  // Fast initialization - only load first 100 templates for display
  const initializeTemplates = useCallback(async () => {
    if (initialized) return;
    
    setLoading(true);
    setError(null);
    setInitialized(true);

    try {
      // Check cache first
      const cacheInfo = getCacheInfo('first_100_templates');
      
      if (cacheInfo.exists && cacheInfo.isValid && cacheInfo.itemCount && cacheInfo.itemCount >= 100) {
        console.log('[LazyTemplateSearch] Using cached first 100 templates:', cacheInfo.itemCount);
        const cached = getCache<ProductTemplate[]>('first_100_templates');
        if (cached && Array.isArray(cached)) {
          setAllTemplates(cached);
          // Get total count from another cache or estimate
          const totalCacheInfo = getCacheInfo('total_template_count');
          if (totalCacheInfo.exists) {
            const totalCached = getCache<number>('total_template_count');
            if (totalCached) setTotalCount(totalCached);
          }
          setLoading(false);
          return;
        }
      }

      // Load from database if online
      if (isOnline) {
        console.log('[LazyTemplateSearch] Loading first 100 templates from database...');
        
        // Get total count first
        const { count, error: countError } = await supabase
          .from('duka_products_templates')
          .select('*', { count: 'exact', head: true });
          
        if (countError) {
          throw new Error(`Failed to get template count: ${countError.message}`);
        }
        
        setTotalCount(count || 0);
        setCache('total_template_count', count || 0, '1.0');
        
        // Load first 100 templates only
        const { data: firstBatch, error: batchError } = await supabase
          .from('duka_products_templates')
          .select('*')
          .order('name')
          .limit(TEMPLATES_PER_PAGE);

        if (batchError) {
          throw new Error(`Failed to load templates: ${batchError.message}`);
        }

        if (firstBatch) {
          setAllTemplates(firstBatch);
          setCache('first_100_templates', firstBatch, '1.0');
          console.log('[LazyTemplateSearch] Loaded first batch:', firstBatch.length, 'templates out of', count);
        }
      } else {
        // Offline - check if we have any cached data
        const cached = getCache<ProductTemplate[]>('first_100_templates');
        if (cached && Array.isArray(cached) && cached.length > 0) {
          console.log('[LazyTemplateSearch] Using offline cached data:', cached.length, 'templates');
          setAllTemplates(cached);
          const totalCached = getCache<number>('total_template_count');
          if (totalCached) setTotalCount(totalCached);
        } else {
          setError('No cached templates available offline');
        }
      }
    } catch (err) {
      setError('Failed to load templates');
      console.error('[LazyTemplateSearch] Load error:', err);
    } finally {
      setLoading(false);
    }
  }, [isOnline, getCache, setCache, getCacheInfo, initialized]);

  // Search entire database for templates
  const searchAllTemplates = useCallback(async (searchTerm: string) => {
    if (!isOnline || !searchTerm.trim()) return [];
    
    // Use a shorter loading state for search to prevent UI blocking
    setLoading(true);
    try {
      console.log('[LazyTemplateSearch] Searching entire database for:', searchTerm);
      
      // Check cache first for this search term
      const searchCache = getCache<ProductTemplate[]>(`search_${searchTerm.toLowerCase()}`);
      if (searchCache && Array.isArray(searchCache)) {
        console.log('[LazyTemplateSearch] Using cached search results:', searchCache.length, 'templates');
        setLoading(false);
        return searchCache;
      }
      
      // Search entire database using ilike for partial matching
      const { data: searchResults, error } = await supabase
        .from('duka_products_templates')
        .select('*')
        .or(`name.ilike.%${searchTerm}%,category.ilike.%${searchTerm}%`)
        .order('name')
        .limit(1000); // Limit to 1000 search results for performance

      if (error) {
        console.error('[LazyTemplateSearch] Search error:', error);
        return [];
      }

      if (searchResults) {
        // Cache search results
        setCache(`search_${searchTerm.toLowerCase()}`, searchResults, '1.0');
        console.log('[LazyTemplateSearch] Found', searchResults.length, 'search results');
        setLoading(false);
        return searchResults;
      }
      
      setLoading(false);
      return [];
    } catch (err) {
      console.error('[LazyTemplateSearch] Search error:', err);
      setLoading(false);
      return [];
    }
  }, [isOnline, setCache, getCache]);

  // Load more templates for pagination (loads next 100 when needed)
  const loadMoreTemplates = useCallback(async (page: number) => {
    if (!isOnline) return;
    
    setLoading(true);
    try {
      const offset = (page - 1) * TEMPLATES_PER_PAGE;
      console.log('[LazyTemplateSearch] Loading more templates, page:', page, 'offset:', offset);
      
      // Check cache first for this specific page
      const pageCache = getCache<ProductTemplate[]>(`templates_page_${page}`);
      if (pageCache && Array.isArray(pageCache) && pageCache.length > 0) {
        console.log('[LazyTemplateSearch] Using cached page', page, ':', pageCache.length, 'templates');
        setAllTemplates(pageCache);
        setLoading(false);
        return;
      }
      
      const { data: moreBatch, error } = await supabase
        .from('duka_products_templates')
        .select('*')
        .order('name')
        .range(offset, offset + TEMPLATES_PER_PAGE - 1);

      if (error) {
        throw new Error(`Failed to load more templates: ${error.message}`);
      }

      if (moreBatch && moreBatch.length > 0) {
        setAllTemplates(moreBatch);
        setCache(`templates_page_${page}`, moreBatch, '1.0');
        console.log('[LazyTemplateSearch] Loaded page', page, ':', moreBatch.length, 'templates');
      }
    } catch (err) {
      setError('Failed to load more templates');
      console.error('[LazyTemplateSearch] Load more error:', err);
    } finally {
      setLoading(false);
    }
  }, [isOnline, setCache, getCache]);

  // Initialize Fuse.js for search
  const fuse = useMemo(() => {
    if (allTemplates.length === 0) return null;
    
    return new Fuse(allTemplates, {
      keys: [
        { name: 'name', weight: 0.8 },
        { name: 'category', weight: 0.2 }
      ],
      threshold: 0.3,
      includeScore: true,
      minMatchCharLength: 1,
      shouldSort: true,
      ignoreLocation: true,
      findAllMatches: true
    });
  }, [allTemplates]);

  // Get unique categories - always show all categories, not just from current templates
  const categories = useMemo(() => {
    // When searching, show standard categories to allow easy switching
    if (searchTerm.trim()) {
      return ['all', 'Electronics', 'Foods', 'Fresh Products', 'Hardware', 'Homecare', 'Households', 'Personal Care'];
    }
    // When browsing, show categories from current templates
    const uniqueCategories = [...new Set(allTemplates.map(t => t.category).filter(Boolean))];
    return ['all', ...uniqueCategories.sort()];
  }, [allTemplates, searchTerm]);

  // Filter and search templates 
  const filteredTemplates = useMemo(() => {
    let results = allTemplates;
    
    // If we're searching and have a search term
    if (searchTerm.trim()) {
      // For online: allTemplates already contains database search results
      if (isOnline) {
        return results; // Return search results as-is since they're already filtered by search
      }
      // For offline: use fuse.js search on cached data
      else if (fuse) {
        const searchResults = fuse.search(searchTerm.trim());
        return searchResults.map(result => result.item);
      }
      return results;
    }
    
    // Apply category filter only when not searching
    if (selectedCategory !== 'all') {
      results = results.filter(t => t.category === selectedCategory);
    }

    return results;
  }, [allTemplates, searchTerm, selectedCategory, isOnline, fuse]);

  // Debounced search to prevent excessive database calls
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  
  // Debounce search term updates with improved timing
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500); // Increased to 500ms for smoother typing experience

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Enhanced search function with debouncing
  const handleSearch = useCallback((term: string) => {
    setSearchTerm(term);
    
    // If search term is entered, automatically switch to "All Categories"
    if (term.trim()) {
      console.log('[LazyTemplateSearch] Search initiated, switching to All Categories');
      setSelectedCategory('all');
      setCurrentPage(1); // Reset to first page when searching
    } else {
      // If search is cleared, reset to first 100 templates immediately
      if (!term.trim() && initialized) {
        setCurrentPage(1);
        const cached = getCache<ProductTemplate[]>('first_100_templates');
        if (cached && Array.isArray(cached)) {
          setAllTemplates(cached);
        }
      }
    }
  }, [initialized, getCache]);

  // Effect to handle actual search execution after debounce
  useEffect(() => {
    const executeSearch = async () => {
      const term = debouncedSearchTerm.trim();
      
      if (term) {
        // Show loading only briefly for search operations
        setLoading(true);
        
        try {
          // If online, search entire database
          if (isOnline) {
            const searchResults = await searchAllTemplates(term);
            if (searchResults.length > 0) {
              setAllTemplates(searchResults);
            }
          }
          // For offline, load cached templates and perform fuse.js search
          else {
            console.log('[LazyTemplateSearch] Offline search using cached data');
            const cached = getCache<ProductTemplate[]>('first_100_templates');
            if (cached && Array.isArray(cached)) {
              setAllTemplates(cached);
              // Fuse.js search will be applied in filteredTemplates memoization
            }
          }
        } finally {
          // Ensure loading is cleared quickly to prevent UI blocking
          setTimeout(() => setLoading(false), 100);
        }
      }
    };

    if (debouncedSearchTerm !== searchTerm) {
      executeSearch();
    }
  }, [debouncedSearchTerm, searchTerm, isOnline, searchAllTemplates, getCache]);

  // Category filter function
  const handleCategoryChange = useCallback((category: string) => {
    setSelectedCategory(category);
    // If user manually selects a category, clear search to show category results
    if (searchTerm.trim()) {
      setSearchTerm('');
      setCurrentPage(1);
      // Restore default templates
      const cached = getCache<ProductTemplate[]>('first_100_templates');
      if (cached && Array.isArray(cached)) {
        setAllTemplates(cached);
      }
    }
  }, [searchTerm, getCache]);

  // Clear filters
  const clearFilters = useCallback(() => {
    setSearchTerm('');
    setSelectedCategory('all');
  }, []);

  // Handle page change
  const handlePageChange = useCallback((page: number) => {
    if (page !== currentPage && page >= 1) {
      setCurrentPage(page);
      // Check if we need to load more templates for this page
      if (page > 1) {
        loadMoreTemplates(page);
      }
    }
  }, [currentPage, loadMoreTemplates]);

  return {
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
    initializeTemplates,
    searchAllTemplates,
    totalTemplates: totalCount > 0 ? totalCount : allTemplates.length, // Use total count from DB if available
    hasActiveSearch: searchTerm.trim().length > 0,
    hasActiveFilter: selectedCategory !== 'all',
    initialized,
    // Pagination
    currentPage,
    totalPages: Math.ceil((totalCount > 0 ? totalCount : allTemplates.length) / TEMPLATES_PER_PAGE),
    templatesPerPage: TEMPLATES_PER_PAGE,
    handlePageChange,
    loadMoreTemplates
  };
};