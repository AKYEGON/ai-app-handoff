
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useNetworkStatus } from './useNetworkStatus';
import { useCacheManager } from './useCacheManager';
import { Product } from '../types';

// Helper function to transform database product to interface
const transformDbProduct = (dbProduct: any): Product => ({
  id: dbProduct.id,
  name: dbProduct.name,
  category: dbProduct.category,
  costPrice: Number(dbProduct.cost_price),
  sellingPrice: Number(dbProduct.selling_price),
  currentStock: dbProduct.current_stock,
  lowStockThreshold: dbProduct.low_stock_threshold || 10,
  createdAt: dbProduct.created_at,
  updatedAt: dbProduct.updated_at,
  image_url: dbProduct.image_url || null,
  // Variant support
  parent_id: dbProduct.parent_id,
  variant_name: dbProduct.variant_name,
  variant_multiplier: dbProduct.variant_multiplier,
  stock_derivation_quantity: dbProduct.stock_derivation_quantity,
  is_parent: dbProduct.is_parent,
});

export const useUnifiedProducts = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const syncingRef = useRef(false);
  const lastSyncRef = useRef<number>(0);
  
  const { user } = useAuth();
  const { isOnline } = useNetworkStatus();
  
  // Listen for auth state changes to refresh data
  useEffect(() => {
    const handleAuthStateChange = () => {
      console.log('[useUnifiedProducts] Auth state changed, refreshing data');
      if (user) {
        loadProducts();
      } else {
        setProducts([]);
        setLoading(false);
      }
    };

    window.addEventListener('auth-state-change', handleAuthStateChange);
    return () => window.removeEventListener('auth-state-change', handleAuthStateChange);
  }, [user]);
  const { getCache, setCache, clearUserCache, addPendingOperation, pendingOps, clearPendingOperation } = useCacheManager();

  // Merge products intelligently - prioritize local changes over server data
  const mergeProducts = useCallback((serverProducts: Product[], localProducts: Product[]): Product[] => {
    console.log('[UnifiedProducts] Merging products:', {
      serverCount: serverProducts.length,
      localCount: localProducts.length
    });

    const merged = new Map<string, Product>();
    
    // First, add all server products
    serverProducts.forEach(product => {
      merged.set(product.id, product);
    });

    // Then overlay local products, giving priority to local changes
    localProducts.forEach(localProduct => {
      const serverProduct = merged.get(localProduct.id);
      
      if (serverProduct) {
        // If both exist, compare timestamps and prefer newer
        const localTime = new Date(localProduct.updatedAt || 0).getTime();
        const serverTime = new Date(serverProduct.updatedAt || 0).getTime();
        
        if (localTime >= serverTime) {
          console.log('[UnifiedProducts] Keeping local changes for:', localProduct.name);
          merged.set(localProduct.id, localProduct);
        } else {
          console.log('[UnifiedProducts] Using server data for:', localProduct.name);
          merged.set(localProduct.id, serverProduct);
        }
      } else {
        // Local-only product (temp or new)
        merged.set(localProduct.id, localProduct);
      }
    });

    const result = Array.from(merged.values()).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    console.log('[UnifiedProducts] Merge result:', result.length, 'products');
    return result;
  }, []);

  // Load products with cache-first strategy
  const loadProducts = useCallback(async () => {
    if (!user) {
      setProducts([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Always load from cache first for immediate UI update
      const cached = getCache<Product[]>('products');
      if (cached && Array.isArray(cached)) {
        console.log('[UnifiedProducts] Using cached data:', cached.length, 'products');
        setProducts(cached);
        setLoading(false);
        
        // If online, fetch fresh data in background
        if (isOnline) {
          try {
            const { data, error: fetchError } = await supabase
              .from('products')
              .select('*')
              .eq('user_id', user.id)
              .order('created_at', { ascending: false });

            if (!fetchError && data) {
              const serverProducts = data.map(transformDbProduct);
              console.log('[UnifiedProducts] Server products fetched:', {
                total: serverProducts.length,
                parents: serverProducts.filter(p => p.is_parent).length,
                variants: serverProducts.filter(p => p.parent_id).length,
                regular: serverProducts.filter(p => !p.is_parent && !p.parent_id).length
              });
              
              const mergedProducts = mergeProducts(serverProducts, cached);
              
              // Only update if data actually changed
              if (JSON.stringify(mergedProducts) !== JSON.stringify(cached)) {
                console.log('[UnifiedProducts] Background refresh: updating merged data');
                setCache('products', mergedProducts);
                setProducts(mergedProducts);
              }
            }
          } catch (bgError) {
            console.error('[UnifiedProducts] Background refresh failed:', bgError);
          }
        }
        return;
      }

      // No cache - fetch from server if online
      if (isOnline) {
        console.log('[UnifiedProducts] No cache, fetching from server');
        const { data, error: fetchError } = await supabase
          .from('products')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (fetchError) {
          setError('Failed to load products');
          console.error('[UnifiedProducts] Fetch error:', fetchError);
        } else {
          const transformedData = (data || []).map(transformDbProduct);
          console.log('[UnifiedProducts] Fetched from server:', {
            total: transformedData.length,
            parents: transformedData.filter(p => p.is_parent).length,
            variants: transformedData.filter(p => p.parent_id).length,
            regular: transformedData.filter(p => !p.is_parent && !p.parent_id).length
          });
          setCache('products', transformedData);
          setProducts(transformedData);
        }
      } else {
        setError('No cached data available offline');
      }
    } catch (err) {
      setError('Failed to load products');
      console.error('[UnifiedProducts] Load error:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id, isOnline, getCache, setCache, mergeProducts]);

  // Force reload products from server (bypass cache for stock updates)
  const forceReloadProducts = useCallback(async () => {
    if (!user || !isOnline) return;

    console.log('[UnifiedProducts] Force reloading products from server');

    try {
      const { data, error: fetchError } = await supabase
        .from('products')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (!fetchError && data) {
        const serverProducts = data.map(transformDbProduct);
        console.log('[UnifiedProducts] Force reload: fetched', serverProducts.length, 'products');
        setCache('products', serverProducts);
        setProducts(serverProducts);
      }
    } catch (error) {
      console.error('[UnifiedProducts] Force reload failed:', error);
    }
  }, [user?.id, isOnline, setCache]);

  // Create product with optimistic updates
  const createProduct = useCallback(async (productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!user) throw new Error('User not authenticated');

    const tempProduct: Product = {
      ...productData,
      id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    console.log('[UnifiedProducts] Creating product:', tempProduct.name);

    // Optimistically update UI and cache
    setProducts(prev => {
      const updated = [tempProduct, ...prev];
      setCache('products', updated);
      return updated;
    });

    if (isOnline) {
      try {
        const dbData = {
          name: productData.name,
          category: productData.category,
          cost_price: productData.costPrice,
          selling_price: productData.sellingPrice,
          current_stock: productData.currentStock || 0,
          low_stock_threshold: productData.lowStockThreshold || 10,
          image_url: productData.image_url || null,
          user_id: user.id,
          // Variant support
          parent_id: productData.parent_id,
          variant_name: productData.variant_name,
          variant_multiplier: productData.variant_multiplier,
          stock_derivation_quantity: productData.stock_derivation_quantity,
          is_parent: productData.is_parent,
        };

        const { data, error } = await supabase
          .from('products')
          .insert([dbData])
          .select()
          .single();

        if (error) throw error;

        const realProduct = transformDbProduct(data);
        
        // Replace temp product with real one
        setProducts(prev => {
          const updated = prev.map(p => 
            p.id === tempProduct.id ? realProduct : p
          );
          setCache('products', updated);
          return updated;
        });

        console.log('[UnifiedProducts] Product created successfully');
        return realProduct;
      } catch (error) {
        console.error('[UnifiedProducts] Create failed, queuing for sync:', error);
        addPendingOperation({
          type: 'product',
          operation: 'create',
          data: { ...productData, id: tempProduct.id },
        });
        return tempProduct;
      }
    } else {
      // Queue for sync when online
      addPendingOperation({
        type: 'product',
        operation: 'create',
        data: { ...productData, id: tempProduct.id },
      });
      return tempProduct;
    }
  }, [user, isOnline, addPendingOperation, setCache]);

  // Update product with immediate feedback
  const updateProduct = useCallback(async (id: string, updates: Partial<Product>) => {
    if (!user) throw new Error('User not authenticated');

    console.log('[UnifiedProducts] Updating product:', id, updates);

    const currentProduct = products.find(p => p.id === id);
    if (!currentProduct) {
      throw new Error(`Product ${id} not found`);
    }

    const updatedProduct = { 
      ...currentProduct, 
      ...updates, 
      updatedAt: new Date().toISOString() 
    };

    // Immediately update UI and cache
    setProducts(prev => {
      const updated = prev.map(p => p.id === id ? updatedProduct : p);
      setCache('products', updated);
      return updated;
    });

    // Dispatch immediate local update event with delay to ensure UI consistency
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('product-updated-locally', {
        detail: { productId: id, product: updatedProduct }
      }));
      window.dispatchEvent(new CustomEvent('product-updated'));
    }, 50);

    if (isOnline) {
      try {
        const dbUpdates: any = {};
        if (updates.name !== undefined) dbUpdates.name = updates.name;
        if (updates.category !== undefined) dbUpdates.category = updates.category;
        if (updates.costPrice !== undefined) dbUpdates.cost_price = updates.costPrice;
        if (updates.sellingPrice !== undefined) dbUpdates.selling_price = updates.sellingPrice;
        if (updates.currentStock !== undefined) dbUpdates.current_stock = updates.currentStock;
        if (updates.lowStockThreshold !== undefined) dbUpdates.low_stock_threshold = updates.lowStockThreshold;
        if (updates.image_url !== undefined) dbUpdates.image_url = updates.image_url;
        // Variant support
        if (updates.parent_id !== undefined) dbUpdates.parent_id = updates.parent_id;
        if (updates.variant_name !== undefined) dbUpdates.variant_name = updates.variant_name;
        if (updates.variant_multiplier !== undefined) dbUpdates.variant_multiplier = updates.variant_multiplier;
        if (updates.stock_derivation_quantity !== undefined) dbUpdates.stock_derivation_quantity = updates.stock_derivation_quantity;
        if (updates.is_parent !== undefined) dbUpdates.is_parent = updates.is_parent;

        const { error } = await supabase
          .from('products')
          .update(dbUpdates)
          .eq('id', id)
          .eq('user_id', user.id);

        if (error) throw error;

        console.log('[UnifiedProducts] Product updated successfully in database');
        
        // Dispatch success event
        window.dispatchEvent(new CustomEvent('product-updated-server', {
          detail: { productId: id, product: updatedProduct }
        }));
        
      } catch (error) {
        console.error('[UnifiedProducts] Server update failed, queuing for sync:', error);
        addPendingOperation({
          type: 'product',
          operation: 'update',
          data: { id, updates },
        });
      }
    } else {
      // Queue for sync when online
      addPendingOperation({
        type: 'product',
        operation: 'update',
        data: { id, updates },
      });
    }

    return updatedProduct;
  }, [user, isOnline, addPendingOperation, setCache, products]);

  // Delete product with optimistic updates
  const deleteProduct = useCallback(async (id: string) => {
    if (!user) throw new Error('User not authenticated');

    const originalProduct = products.find(p => p.id === id);

    // Optimistically update UI
    setProducts(prev => {
      const filtered = prev.filter(p => p.id !== id);
      setCache('products', filtered);
      return filtered;
    });

    if (isOnline) {
      try {
        const { error } = await supabase
          .from('products')
          .delete()
          .eq('id', id)
          .eq('user_id', user.id);

        if (error) throw error;

        console.log('[UnifiedProducts] Product deleted successfully');
      } catch (error) {
        console.error('[UnifiedProducts] Delete failed, queuing for sync:', error);
        
        // Rollback optimistic update
        if (originalProduct) {
          setProducts(prev => {
            const restored = [...prev, originalProduct].sort((a, b) => 
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );
            setCache('products', restored);
            return restored;
          });
        }
        
        addPendingOperation({
          type: 'product',
          operation: 'delete',
          data: { id },
        });
        throw error;
      }
    } else {
      // Queue for sync when online
      addPendingOperation({
        type: 'product',
        operation: 'delete',
        data: { id },
      });
    }
  }, [user, isOnline, addPendingOperation, setCache, products]);

  // Sync pending operations
  const syncPendingOperations = useCallback(async () => {
    if (!user || !isOnline || syncingRef.current) return false;

    const productOps = pendingOps.filter(op => op.type === 'product');
    if (productOps.length === 0) return true;

    console.log('[UnifiedProducts] Syncing', productOps.length, 'pending operations');
    syncingRef.current = true;
    setSyncStatus('syncing');

    try {
      const syncedCreates: Array<{tempId: string, realProduct: Product}> = [];

      for (const operation of productOps) {
        try {
          let success = false;

          switch (operation.operation) {
            case 'create':
              console.log('[UnifiedProducts] Syncing create:', operation.data.name);
              const { data: createdData, error: createError } = await supabase
                .from('products')
                .insert([{
                  name: operation.data.name,
                  category: operation.data.category,
                  cost_price: operation.data.costPrice,
                  selling_price: operation.data.sellingPrice,
                  current_stock: operation.data.currentStock || 0,
                  low_stock_threshold: operation.data.lowStockThreshold || 10,
                  image_url: operation.data.image_url || null,
                  user_id: user.id,
                  // Variant support
                  parent_id: operation.data.parent_id,
                  variant_name: operation.data.variant_name,
                  variant_multiplier: operation.data.variant_multiplier,
                  stock_derivation_quantity: operation.data.stock_derivation_quantity,
                  is_parent: operation.data.is_parent,
                }])
                .select()
                .single();

              if (!createError && createdData) {
                const realProduct = transformDbProduct(createdData);
                syncedCreates.push({
                  tempId: operation.data.id,
                  realProduct
                });
                success = true;
              }
              break;

            case 'update':
              console.log('[UnifiedProducts] Syncing update:', operation.data.id);
              const updates = operation.data.updates;
              const dbUpdates: any = {};
              
              if (updates.name !== undefined) dbUpdates.name = updates.name;
              if (updates.category !== undefined) dbUpdates.category = updates.category;
              if (updates.costPrice !== undefined) dbUpdates.cost_price = updates.costPrice;
              if (updates.sellingPrice !== undefined) dbUpdates.selling_price = updates.sellingPrice;
              if (updates.currentStock !== undefined) dbUpdates.current_stock = updates.currentStock;
              if (updates.lowStockThreshold !== undefined) dbUpdates.low_stock_threshold = updates.lowStockThreshold;
              if (updates.image_url !== undefined) dbUpdates.image_url = updates.image_url;
              // Variant support
              if (updates.parent_id !== undefined) dbUpdates.parent_id = updates.parent_id;
              if (updates.variant_name !== undefined) dbUpdates.variant_name = updates.variant_name;
              if (updates.variant_multiplier !== undefined) dbUpdates.variant_multiplier = updates.variant_multiplier;
              if (updates.stock_derivation_quantity !== undefined) dbUpdates.stock_derivation_quantity = updates.stock_derivation_quantity;
              if (updates.is_parent !== undefined) dbUpdates.is_parent = updates.is_parent;

              const { error: updateError } = await supabase
                .from('products')
                .update(dbUpdates)
                .eq('id', operation.data.id)
                .eq('user_id', user.id);

              success = !updateError;
              break;

            case 'delete':
              console.log('[UnifiedProducts] Syncing delete:', operation.data.id);
              const { error: deleteError } = await supabase
                .from('products')
                .delete()
                .eq('id', operation.data.id)
                .eq('user_id', user.id);

              success = !deleteError;
              break;
          }

          if (success) {
            clearPendingOperation(operation.id);
          }
        } catch (error) {
          console.error('[UnifiedProducts] Error syncing operation:', error);
        }
      }

      // Replace temp products with real ones
      if (syncedCreates.length > 0) {
        setProducts(prev => {
          let updated = [...prev];
          
          syncedCreates.forEach(({ tempId, realProduct }) => {
            updated = updated.map(p => p.id === tempId ? realProduct : p);
          });
          
          const uniqueProducts = updated.filter((product, index, self) => 
            index === self.findIndex(p => p.id === product.id)
          ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          
          setCache('products', uniqueProducts);
          return uniqueProducts;
        });
      }

      setSyncStatus('success');
      lastSyncRef.current = Date.now();
      
      // Refresh data after successful sync
      await loadProducts();
      
      return true;
    } catch (error) {
      console.error('[UnifiedProducts] Sync failed:', error);
      setSyncStatus('error');
      return false;
    } finally {
      syncingRef.current = false;
    }
  }, [user, isOnline, pendingOps, clearPendingOperation, setCache, loadProducts]);

  // Load products on mount and when user changes
  useEffect(() => {
    if (user?.id) {
      console.log('[UnifiedProducts] User changed, loading products for:', user.id);
      
      // Clear any stale cache for this user to ensure fresh data on login
      const currentProducts = getCache<Product[]>('products');
      console.log('[UnifiedProducts] Current cached products for user:', currentProducts?.length || 0);
      
      loadProducts();
    } else {
      // User logged out, clear products
      console.log('[UnifiedProducts] User logged out, clearing products');
      setProducts([]);
      setLoading(false);
      setError(null);
    }
  }, [user?.id]);

  // Listen for data refresh events
  useEffect(() => {
    const handleDataRefresh = () => {
      console.log('[UnifiedProducts] Data refresh event received');
      loadProducts();
    };

    const handleStockUpdate = (event: CustomEvent) => {
      console.log('[UnifiedProducts] Stock update event received:', event.detail);
      // Force a reload when stock is updated
      setTimeout(() => loadProducts(), 500); // Small delay to ensure DB is updated
    };

    const events = [
      'data-refresh-product',
      'product-synced',
      'sync-completed',
      'data-synced'
    ];

    events.forEach(event => {
      window.addEventListener(event, handleDataRefresh);
    });
    
    window.addEventListener('product-stock-updated', handleStockUpdate as EventListener);
    
    return () => {
      events.forEach(event => {
        window.removeEventListener(event, handleDataRefresh);
      });
      window.removeEventListener('product-stock-updated', handleStockUpdate as EventListener);
    };
  }, [loadProducts]);

  // Auto-sync when coming online
  useEffect(() => {
    if (isOnline && pendingOps.filter(op => op.type === 'product').length > 0) {
      const timer = setTimeout(() => {
        syncPendingOperations();
      }, 1500);

      return () => clearTimeout(timer);
    }
  }, [isOnline, pendingOps, syncPendingOperations]);

  return {
    products,
    loading,
    error,
    createProduct,
    updateProduct,
    deleteProduct,
    refetch: loadProducts,
    forceRefetch: forceReloadProducts,
    isOnline,
    pendingOperations: pendingOps.filter(op => op.type === 'product').length,
    syncPendingOperations,
    syncStatus,
  };
};
