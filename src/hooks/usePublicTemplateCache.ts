import { useState, useEffect, useCallback } from 'react';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  version: string;
}

export const usePublicTemplateCache = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Public cache doesn't need authentication
  const getCache = useCallback(<T>(key: string): T | null => {
    try {
      const cached = localStorage.getItem(`public_cache_${key}`);
      if (cached) {
        const parsed: CacheEntry<T> = JSON.parse(cached);
        const now = new Date().getTime();
        const hoursDiff = (now - parsed.timestamp) / (1000 * 60 * 60);
        
        // Cache valid for 48 hours for public templates
        if (hoursDiff < 48) {
          return parsed.data;
        } else {
          localStorage.removeItem(`public_cache_${key}`);
        }
      }
    } catch (error) {
      console.error('[PublicTemplateCache] Failed to get cache:', error);
    }
    return null;
  }, []);

  const setCache = useCallback(<T>(key: string, data: T, version = '1.0'): void => {
    try {
      const cacheData: CacheEntry<T> = {
        data,
        timestamp: new Date().getTime(),
        version
      };
      localStorage.setItem(`public_cache_${key}`, JSON.stringify(cacheData));
      console.log('[PublicTemplateCache] Set cache for key:', key, '- items:', Array.isArray(data) ? data.length : 'N/A');
    } catch (error) {
      console.error('[PublicTemplateCache] Failed to set cache:', error);
    }
  }, []);

  const clearCache = useCallback((key?: string) => {
    try {
      if (key) {
        localStorage.removeItem(`public_cache_${key}`);
        console.log('[PublicTemplateCache] Cleared cache for key:', key);
      } else {
        // Clear all public template caches
        const keys = Object.keys(localStorage);
        keys.forEach(storageKey => {
          if (storageKey.startsWith('public_cache_')) {
            localStorage.removeItem(storageKey);
          }
        });
        console.log('[PublicTemplateCache] Cleared all public template caches');
      }
    } catch (error) {
      console.error('[PublicTemplateCache] Failed to clear cache:', error);
    }
  }, []);

  const getCacheInfo = useCallback((key: string) => {
    try {
      const cached = localStorage.getItem(`public_cache_${key}`);
      if (cached) {
        const parsed: CacheEntry<any> = JSON.parse(cached);
        const now = new Date().getTime();
        const hoursDiff = (now - parsed.timestamp) / (1000 * 60 * 60);
        
        return {
          exists: true,
          age: hoursDiff,
          isValid: hoursDiff < 48,
          version: parsed.version,
          itemCount: Array.isArray(parsed.data) ? parsed.data.length : null
        };
      }
    } catch (error) {
      console.error('[PublicTemplateCache] Failed to get cache info:', error);
    }
    
    return {
      exists: false,
      age: 0,
      isValid: false,
      version: null,
      itemCount: null
    };
  }, []);

  useEffect(() => {
    setIsInitialized(true);
  }, []);

  return {
    getCache,
    setCache,
    clearCache,
    getCacheInfo,
    isInitialized
  };
};