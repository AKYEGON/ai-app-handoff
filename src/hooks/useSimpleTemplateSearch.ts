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

export const useSimpleTemplateSearch = () => {
  const [allTemplates, setAllTemplates] = useState<ProductTemplate[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { isOnline } = useNetworkStatus();
  const { getCache, setCache, getCacheInfo, isInitialized } = usePublicTemplateCache();

  // Load all templates with enhanced caching
  const loadTemplates = useCallback(async () => {
    if (!isInitialized) return;
    
    setLoading(true);
    setError(null);

    try {
      // Force cache refresh to ensure we get updated image URLs after download
      const currentCacheInfo = getCacheInfo('all_product_templates');
      const shouldRefreshCache = !currentCacheInfo.exists || 
        (currentCacheInfo.itemCount && currentCacheInfo.itemCount < 7000) || 
        currentCacheInfo.version !== '4.0' || // Version bump for instant image loading
        !currentCacheInfo.isValid;
        
      if (shouldRefreshCache) {
        console.log('[SimpleTemplateSearch] Refreshing cache for updated images - items:', currentCacheInfo.itemCount, 'version:', currentCacheInfo.version);
        // Clear the cache by removing the key
        localStorage.removeItem('public_cache_all_product_templates');
      }

      // Check cache again after potential clearing
      const cacheInfo = getCacheInfo('all_product_templates');
      console.log('[SimpleTemplateSearch] Cache info after clearing:', cacheInfo);
      
      if (cacheInfo.exists && cacheInfo.isValid && cacheInfo.itemCount && cacheInfo.itemCount >= 7000 && cacheInfo.version === '4.0') {
        console.log('[SimpleTemplateSearch] Using cached data:', cacheInfo.itemCount, 'templates');
        const cached = getCache<ProductTemplate[]>('all_product_templates');
        if (cached && Array.isArray(cached)) {
          setAllTemplates(cached);
          setLoading(false);
          return;
        }
      }

      // Fetch fresh data if online using pagination to bypass 1,000 limit
      if (isOnline) {
        console.log('[SimpleTemplateSearch] Fetching all templates using pagination...');
        
        // Get total count first for verification
        const { count } = await supabase
          .from('duka_products_templates')
          .select('*', { count: 'exact', head: true });
          
        console.log('[SimpleTemplateSearch] Total templates in DB:', count);
        
        // Fetch ALL templates using pagination (1000 per batch)
        const allTemplates: ProductTemplate[] = [];
        const batchSize = 1000;
        let totalFetched = 0;
        let hasMore = true;
        
        while (hasMore && totalFetched < (count || 0)) {
          console.log(`[SimpleTemplateSearch] Fetching batch ${Math.floor(totalFetched / batchSize) + 1}, offset: ${totalFetched}`);
          
          const { data: batch, error: batchError } = await supabase
            .from('duka_products_templates')
            .select('*')
            .order('name')
            .range(totalFetched, totalFetched + batchSize - 1);

          if (batchError) {
            console.error('[SimpleTemplateSearch] Batch fetch error:', batchError);
            setError(`Failed to load templates batch: ${batchError.message}`);
            break;
          }

          if (batch && batch.length > 0) {
            allTemplates.push(...batch);
            totalFetched += batch.length;
            console.log(`[SimpleTemplateSearch] Fetched batch of ${batch.length}, total: ${totalFetched}`);
            
            // Stop if we got less than expected (end of data)
            if (batch.length < batchSize) {
              hasMore = false;
            }
          } else {
            hasMore = false;
          }
          
          // Safety check to prevent infinite loops
          if (totalFetched >= 10000) {
            console.warn('[SimpleTemplateSearch] Safety limit reached, stopping pagination');
            break;
          }
        }

        console.log('[SimpleTemplateSearch] Pagination complete. Total fetched:', totalFetched);
        setCache('all_product_templates', allTemplates, '4.0'); // New version with instant image loading
        setAllTemplates(allTemplates);
        
        // Verify search targets exist
        const testSearches = ['kabras', 'sugar', 'omo', 'bread'];
        testSearches.forEach(term => {
          const found = allTemplates.filter(t => t.name.toLowerCase().includes(term.toLowerCase()));
          console.log(`[SimpleTemplateSearch] ${term} items:`, found.length, found.map(t => t.name));
        });
      } else {
        // Offline - check if we have any cached data
        const cached = getCache<ProductTemplate[]>('all_product_templates');
        if (cached && Array.isArray(cached) && cached.length > 0) {
          console.log('[SimpleTemplateSearch] Using offline cached data:', cached.length, 'templates');
          setAllTemplates(cached);
        } else {
          setError('No cached templates available offline');
        }
      }
    } catch (err) {
      setError('Failed to load templates');
      console.error('[SimpleTemplateSearch] Load error:', err);
    } finally {
      setLoading(false);
    }
  }, [isOnline, getCache, setCache, getCacheInfo, isInitialized]);

  // Initialize Fuse.js for search
  const fuse = useMemo(() => {
    if (allTemplates.length === 0) return null;
    
    return new Fuse(allTemplates, {
      keys: [
        { name: 'name', weight: 0.8 },
        { name: 'category', weight: 0.2 }
      ],
      threshold: 0.3, // More precise matching for better results
      includeScore: true,
      minMatchCharLength: 1,
      shouldSort: true,
      ignoreLocation: true,
      findAllMatches: true
    });
  }, [allTemplates]);

  // Get unique categories
  const categories = useMemo(() => {
    const uniqueCategories = [...new Set(allTemplates.map(t => t.category).filter(Boolean))];
    return ['all', ...uniqueCategories.sort()];
  }, [allTemplates]);

  // Filter and search templates
  const filteredTemplates = useMemo(() => {
    let results = allTemplates;
    
    console.log('[SimpleTemplateSearch] Starting filter with', allTemplates.length, 'total templates');
    console.log('[SimpleTemplateSearch] Search term:', searchTerm);
    console.log('[SimpleTemplateSearch] Selected category:', selectedCategory);

    // Apply category filter first
    if (selectedCategory !== 'all') {
      results = results.filter(t => t.category === selectedCategory);
      console.log('[SimpleTemplateSearch] After category filter:', results.length, 'templates');
    }

    // Apply search if there's a search term
    if (searchTerm.trim() && fuse) {
      const searchResults = fuse.search(searchTerm.trim());
      console.log('[SimpleTemplateSearch] Fuse search results:', searchResults.length);
      const searchIds = new Set(searchResults.map(result => result.item.id));
      results = results.filter(t => searchIds.has(t.id));
      console.log('[SimpleTemplateSearch] After search filter:', results.length, 'templates');
      
      // Debug: show first few search results
      if (searchResults.length > 0) {
        console.log('[SimpleTemplateSearch] First few matches:', searchResults.slice(0, 3).map(r => r.item.name));
      }
    }

    console.log('[SimpleTemplateSearch] Final filtered results:', results.length);
    return results;
  }, [allTemplates, searchTerm, selectedCategory, fuse]);

  // Search function
  const handleSearch = useCallback((term: string) => {
    setSearchTerm(term);
    // Ensure searches always span all categories
    if (term.trim()) {
      setSelectedCategory('all');
    }
  }, []);

  // Category filter function
  const handleCategoryChange = useCallback((category: string) => {
    setSelectedCategory(category);
  }, []);

  // Clear filters
  const clearFilters = useCallback(() => {
    setSearchTerm('');
    setSelectedCategory('all');
  }, []);

  // Load templates on mount
  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

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
    refetch: loadTemplates,
    totalTemplates: allTemplates.length,
    hasActiveSearch: searchTerm.trim().length > 0,
    hasActiveFilter: selectedCategory !== 'all',
  };
};