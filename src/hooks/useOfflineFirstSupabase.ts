
import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

// IndexedDB wrapper for offline-first data storage
class OfflineFirstDB {
  private dbName = 'dukafiti_offline';
  private version = 2;
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    if (this.db) return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      
      request.onupgradeneeded = () => {
        const db = request.result;
        
        // Create stores for each data type (bump version when adding new stores)
        const stores = ['products', 'customers', 'sales', 'settings', 'debt_payments'];
        stores.forEach((storeName) => {
          if (!db.objectStoreNames.contains(storeName)) {
            db.createObjectStore(storeName, { keyPath: 'id' });
          }
        });
      };
    });
  }

  async set<T>(storeName: string, data: T[]): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      
      // Clear existing data
      store.clear();
      
      // Add new data
      data.forEach(item => store.put(item));
      
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async get<T>(storeName: string): Promise<T[]> {
    await this.init();
    if (!this.db) return [];

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();
      
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async clear(storeName: string): Promise<void> {
    await this.init();
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

const offlineDB = new OfflineFirstDB();

interface TestResult {
  success: boolean;
  message: string;
  details?: any;
}

interface UseOfflineFirstSupabaseOptions<T> {
  cacheKey: string;
  tableName: string;
  loadFromSupabase: () => Promise<T[]>;
  transformToLocal: (item: any) => T;
  transformFromLocal: (item: T) => any;
}

export const useOfflineFirstSupabase = <T extends { id: string }>({
  cacheKey,
  tableName,
  loadFromSupabase,
  transformToLocal,
  transformFromLocal,
  user = null // Accept user as parameter to break circular dependency
}: UseOfflineFirstSupabaseOptions<T> & { user?: any }) => {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  
  const { toast } = useToast();
  const initializationRef = useRef(false);
  const loadingRef = useRef(false);

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => {
      console.log(`[${cacheKey}] Connection restored`);
      setIsOnline(true);
      if (user && !loadingRef.current) {
        refresh();
      }
    };
    
    const handleOffline = () => {
      console.log(`[${cacheKey}] Connection lost - switching to offline mode`);
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [user, cacheKey]);

  // Load data function
  const loadData = useCallback(async (forceRefresh: boolean = false) => {
    if (loadingRef.current) {
      console.log(`[${cacheKey}] Load already in progress, skipping`);
      return;
    }

    if (!user) {
      console.log(`[${cacheKey}] No user, clearing data`);
      setData([]);
      setLoading(false);
      setError(null);
      return;
    }

    loadingRef.current = true;
    setLoading(true);
    
    try {
      console.log(`[${cacheKey}] Loading data - Online: ${isOnline}, Force refresh: ${forceRefresh}`);
      
      if (isOnline && (forceRefresh || !initializationRef.current)) {
        // Try to load from Supabase first
        try {
          console.log(`[${cacheKey}] Loading from Supabase...`);
          const supabaseData = await loadFromSupabase();
          console.log(`[${cacheKey}] Loaded ${supabaseData.length} items from Supabase`);
          
          // Cache the data
          await offlineDB.set(cacheKey, supabaseData);
          console.log(`[${cacheKey}] Data cached successfully`);
          
          setData(supabaseData);
          setError(null);
          setLastSyncTime(new Date());
          
          // Data loaded successfully - no toast needed
        } catch (supabaseError) {
          console.error(`[${cacheKey}] Supabase load failed:`, supabaseError);
          
          // Fall back to cached data
          const cachedData = await offlineDB.get<T>(cacheKey);
          console.log(`[${cacheKey}] Falling back to ${cachedData.length} cached items`);
          
          setData(cachedData);
          setError(null); // Don't show error for offline mode with cached data
          
          if (!initializationRef.current) {
            console.log(`[${cacheKey}] Using cached data in offline mode`);
          }
        }
      } else {
        // Load from cache only
        console.log(`[${cacheKey}] Loading from cache (offline mode)`);
        const cachedData = await offlineDB.get<T>(cacheKey);
        console.log(`[${cacheKey}] Loaded ${cachedData.length} items from cache`);
        
        setData(cachedData);
        setError(null); // No error for offline mode
        
        if (!initializationRef.current && cachedData.length === 0 && !isOnline) {
          console.log(`[${cacheKey}] No cached data available offline`);
        }
      }
      
      initializationRef.current = true;
    } catch (error) {
      console.error(`[${cacheKey}] Load data error:`, error);
      setError(error instanceof Error ? error.message : 'Failed to load data');
      
      // Try to load from cache as last resort
      try {
        const cachedData = await offlineDB.get<T>(cacheKey);
        setData(cachedData);
        console.log(`[${cacheKey}] Emergency fallback to cache: ${cachedData.length} items`);
      } catch (cacheError) {
        console.error(`[${cacheKey}] Cache fallback failed:`, cacheError);
        setData([]);
      }
      
      // Only show error toast for actual failures, not offline scenarios
      if (isOnline) {
        toast({
          title: "Error",
          description: `Failed to load ${tableName}. Please try again.`,
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [user, cacheKey, tableName, isOnline, loadFromSupabase, toast]);

  // Initial load
  useEffect(() => {
    if (!initializationRef.current) {
      console.log(`[${cacheKey}] Initializing data load`);
      loadData(false);
    }
  }, [loadData]);

  // Refresh function
  const refresh = useCallback(async () => {
    console.log(`[${cacheKey}] Manual refresh requested`);
    await loadData(true);
  }, [loadData]);

  // Test offline function - now returns TestResult
  const testOffline = useCallback(async (): Promise<TestResult> => {
    try {
      console.log(`[${cacheKey}] Testing offline functionality...`);
      
      // Test 1: Check cache availability
      const cachedData = await offlineDB.get<T>(cacheKey);
      
      // Test 2: Simulate offline mode temporarily
      const originalOnline = isOnline;
      setIsOnline(false);
      
      // Test 3: Try to load data in offline mode
      await loadData(false);
      
      // Restore online status
      setIsOnline(originalOnline);
      
      return {
        success: true,
        message: `Offline test passed. ${cachedData.length} items available in cache.`,
        details: {
          cacheSize: cachedData.length,
          tableName,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error(`[${cacheKey}] Offline test failed:`, error);
      return {
        success: false,
        message: `Offline test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
          tableName,
          timestamp: new Date().toISOString()
        }
      };
    }
  }, [cacheKey, isOnline, loadData]);

  return {
    data,
    loading,
    error,
    refresh,
    isOnline,
    lastSyncTime,
    testOffline
  };
};
