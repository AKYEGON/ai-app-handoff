import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface PendingOperation {
  id: string;
  type: 'sale' | 'product' | 'customer' | 'transaction';
  operation: 'create' | 'update' | 'delete';
  data: any;
  timestamp: string;
  attempts: number;
  maxAttempts: number;
}

export const useCacheManager = () => {
  const [pendingOps, setPendingOps] = useState<PendingOperation[]>([]);
  const { user } = useAuth();

  // Load pending operations from localStorage - user specific
  const loadPendingOperations = useCallback(() => {
    if (!user?.id) return;
    
    try {
      const userSpecificKey = `pendingOperations_${user.id}`;
      const stored = localStorage.getItem(userSpecificKey);
      if (stored) {
        const operations = JSON.parse(stored);
        console.log('[CacheManager] Loaded pending operations for user:', user.id, '- count:', operations.length);
        setPendingOps(operations);
      } else {
        setPendingOps([]);
      }
    } catch (error) {
      console.error('[CacheManager] Failed to load pending operations:', error);
      setPendingOps([]);
    }
  }, [user?.id]);

  useEffect(() => {
    loadPendingOperations();
  }, [loadPendingOperations]);

  // Save pending operations to localStorage - user specific
  useEffect(() => {
    if (!user?.id) return;
    
    try {
      const userSpecificKey = `pendingOperations_${user.id}`;
      localStorage.setItem(userSpecificKey, JSON.stringify(pendingOps));
      console.log('[CacheManager] Saved pending operations for user:', user.id, '- count:', pendingOps.length);
    } catch (error) {
      console.error('[CacheManager] Failed to save pending operations:', error);
    }
  }, [pendingOps, user?.id]);

  // Clear user data when user changes or logs out
  useEffect(() => {
    const handleAuthChange = () => {
      if (!user) {
        // User logged out - clear pending operations
        setPendingOps([]);
        console.log('[CacheManager] User logged out, cleared pending operations');
      }
    };

    window.addEventListener('auth-state-change', handleAuthChange);
    return () => window.removeEventListener('auth-state-change', handleAuthChange);
  }, [user]);

  const getCache = useCallback(<T>(key: string): T | null => {
    if (!user?.id) return null;
    
    try {
      const userSpecificKey = `cache_${user.id}_${key}`;
      const cached = localStorage.getItem(userSpecificKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        const cacheTime = parsed.timestamp;
        const now = new Date().getTime();
        const hoursDiff = (now - cacheTime) / (1000 * 60 * 60);
        
        if (hoursDiff < 24) {
          return parsed.data;
        } else {
          localStorage.removeItem(userSpecificKey);
        }
      }
    } catch (error) {
      console.error('[CacheManager] Failed to get cache:', error);
    }
    return null;
  }, [user?.id]);

  const setCache = useCallback(<T>(key: string, data: T): void => {
    if (!user?.id) return;
    
    try {
      const userSpecificKey = `cache_${user.id}_${key}`;
      const cacheData = {
        data,
        timestamp: new Date().getTime()
      };
      localStorage.setItem(userSpecificKey, JSON.stringify(cacheData));
      console.log('[CacheManager] Set cache for user:', user.id, 'key:', key, '- items:', Array.isArray(data) ? data.length : 'N/A');
    } catch (error) {
      console.error('[CacheManager] Failed to set cache:', error);
    }
  }, [user?.id]);

  // Clear cache when user changes
  const clearUserCache = useCallback(() => {
    if (!user?.id) return;
    
    try {
      const keys = Object.keys(localStorage);
      const userCachePrefix = `cache_${user.id}_`;
      
      keys.forEach(key => {
        if (key.startsWith(userCachePrefix)) {
          localStorage.removeItem(key);
        }
      });
      
      console.log('[CacheManager] Cleared all cache for user:', user.id);
    } catch (error) {
      console.error('[CacheManager] Failed to clear user cache:', error);
    }
  }, [user?.id]);

  const addPendingOperation = useCallback((operation: Omit<PendingOperation, 'id' | 'timestamp' | 'attempts' | 'maxAttempts'>): void => {
    const operationWithId: PendingOperation = {
      ...operation,
      id: `${operation.type}_${operation.operation}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      attempts: 0,
      maxAttempts: 3
    };

    console.log('[CacheManager] Adding pending operation:', operationWithId.id, operationWithId.type, operationWithId.operation);

    setPendingOps(prev => {
      let filteredOps = [...prev];
      
      // Enhanced deduplication logic
      if (operation.type === 'product') {
        if (operation.operation === 'update' && operation.data.id) {
          // Replace existing updates for the same product
          filteredOps = prev.filter(op => !(
            op.type === 'product' && 
            op.operation === 'update' && 
            op.data.id === operation.data.id
          ));
        } else if (operation.operation === 'create' && operation.data.id) {
          // Remove duplicate creates for the same temp product
          filteredOps = prev.filter(op => !(
            op.type === 'product' && 
            op.operation === 'create' && 
            op.data.id === operation.data.id
          ));
        }
      }
      
      if (operation.type === 'customer') {
        if (operation.operation === 'update' && operation.data.id) {
          // Replace existing updates for the same customer
          filteredOps = prev.filter(op => !(
            op.type === 'customer' && 
            op.operation === 'update' && 
            op.data.id === operation.data.id
          ));
        } else if (operation.operation === 'create' && operation.data.tempId) {
          // Remove duplicate creates for the same temp customer
          filteredOps = prev.filter(op => !(
            op.type === 'customer' && 
            op.operation === 'create' && 
            op.data.tempId === operation.data.tempId
          ));
        }
      }
      
      // Check for exact duplicates
      const isDuplicate = filteredOps.some(op => 
        op.type === operation.type && 
        op.operation === operation.operation &&
        JSON.stringify(op.data) === JSON.stringify(operation.data)
      );
      
      if (isDuplicate) {
        console.log('[CacheManager] Duplicate operation detected, skipping');
        return prev;
      }
      
      const newOps = [...filteredOps, operationWithId];
      console.log(`[CacheManager] Added pending operation. Total: ${newOps.length}`);
      return newOps;
    });
  }, []);

  const clearPendingOperation = useCallback((operationId: string): void => {
    console.log('[CacheManager] Clearing pending operation:', operationId);
    setPendingOps(prev => {
      const filtered = prev.filter(op => op.id !== operationId);
      console.log(`[CacheManager] Removed operation. Remaining: ${filtered.length}`);
      return filtered;
    });
  }, []);

  const incrementOperationAttempts = useCallback((operationId: string): void => {
    setPendingOps(prev => prev.map(op => 
      op.id === operationId 
        ? { ...op, attempts: op.attempts + 1 }
        : op
    ));
  }, []);

  // Enhanced sync function with better error handling
  const syncPendingOperations = useCallback(async (): Promise<void> => {
    if (!user) {
      console.log('[CacheManager] No user, skipping sync');
      return;
    }

    const operationsToSync = pendingOps.filter(op => op.attempts < op.maxAttempts);
    if (operationsToSync.length === 0) {
      console.log('[CacheManager] No operations to sync');
      return;
    }

    console.log('[CacheManager] Starting sync:', operationsToSync.length, 'operations');
    
    const successfulOps: string[] = [];
    const failedOps: string[] = [];
    
    // Group operations by type for better processing
    const operationsByType = operationsToSync.reduce((acc, op) => {
      if (!acc[op.type]) acc[op.type] = [];
      acc[op.type].push(op);
      return acc;
    }, {} as Record<string, PendingOperation[]>);

    // Process each type in chronological order
    for (const [type, typeOps] of Object.entries(operationsByType)) {
      console.log(`[CacheManager] Processing ${typeOps.length} ${type} operations`);
      
      // Sort by timestamp for chronological processing
      const sortedOps = typeOps.sort((a, b) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );

      for (const operation of sortedOps) {
        try {
          console.log(`[CacheManager] Syncing: ${operation.type} ${operation.operation}`);

          let success = false;
          
          if (operation.type === 'product') {
            success = await syncProductOperation(operation, user.id);
          } else if (operation.type === 'customer') {
            success = await syncCustomerOperation(operation, user.id);
          }

          if (success) {
            successfulOps.push(operation.id);
            console.log(`[CacheManager] Successfully synced: ${operation.id}`);
          } else {
            failedOps.push(operation.id);
            incrementOperationAttempts(operation.id);
            console.log(`[CacheManager] Failed to sync: ${operation.id}`);
          }
        } catch (error) {
          console.error(`[CacheManager] Error syncing ${operation.id}:`, error);
          failedOps.push(operation.id);
          incrementOperationAttempts(operation.id);
        }
      }
    }

    // Clean up successful operations
    if (successfulOps.length > 0) {
      setPendingOps(prev => prev.filter(op => !successfulOps.includes(op.id)));
      console.log(`[CacheManager] Cleaned up ${successfulOps.length} successful operations`);
    }

    console.log(`[CacheManager] Sync complete: ${successfulOps.length} success, ${failedOps.length} failed`);

    // Dispatch completion events
    if (successfulOps.length > 0) {
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('sync-completed', {
          detail: { totalOperations: successfulOps.length, timestamp: new Date().toISOString() }
        }));
        
        window.dispatchEvent(new CustomEvent('data-synced', {
          detail: { timestamp: new Date().toISOString() }
        }));

        // Dispatch specific events for different types
        if (operationsByType.product && operationsByType.product.length > 0) {
          window.dispatchEvent(new CustomEvent('product-synced', {
            detail: { operationCount: operationsByType.product.length, timestamp: new Date().toISOString() }
          }));
        }
        
        if (operationsByType.customer && operationsByType.customer.length > 0) {
          window.dispatchEvent(new CustomEvent('customer-synced', {
            detail: { operationCount: operationsByType.customer.length, timestamp: new Date().toISOString() }
          }));
        }
      }, 100);
    }
  }, [user, pendingOps, incrementOperationAttempts]);

  // Enhanced product sync function with duplicate prevention
  const syncProductOperation = async (operation: PendingOperation, userId: string): Promise<boolean> => {
    const { data } = operation;
    console.log(`[CacheManager] Syncing product ${operation.operation}:`, data?.name || data?.id);
    
    try {
      switch (operation.operation) {
        case 'create':
          // Check for existing product to prevent duplicates
          const { data: existingProduct } = await supabase
            .from('products')
            .select('id')
            .eq('user_id', userId)
            .eq('name', data.name)
            .eq('category', data.category)
            .maybeSingle();

          if (existingProduct) {
            console.log('[CacheManager] Product already exists, marking as synced:', data.name);
            return true;
          }

          const { error: createError } = await supabase
            .from('products')
            .insert([{
              user_id: userId,
              name: data.name,
              category: data.category,
              cost_price: data.costPrice,
              selling_price: data.sellingPrice,
              current_stock: data.currentStock || 0,
              low_stock_threshold: data.lowStockThreshold || 10,
            }]);
          
          if (createError) {
            console.error('[CacheManager] Product create error:', createError);
            return false;
          }
          return true;
          
        case 'update':
          if (!data.id || data.id.startsWith('temp_')) {
            console.warn('[CacheManager] Cannot update temp product:', data.id);
            return true;
          }
          
          // Verify product exists
          const { data: productExists } = await supabase
            .from('products')
            .select('id')
            .eq('id', data.id)
            .eq('user_id', userId)
            .maybeSingle();
            
          if (!productExists) {
            console.warn('[CacheManager] Product not found for update:', data.id);
            return true;
          }
          
          const updateData: any = {};
          const updates = data.updates || data;
          
          if (updates.name !== undefined) updateData.name = updates.name;
          if (updates.category !== undefined) updateData.category = updates.category;
          if (updates.costPrice !== undefined) updateData.cost_price = updates.costPrice;
          if (updates.sellingPrice !== undefined) updateData.selling_price = updates.sellingPrice;
          if (updates.currentStock !== undefined) updateData.current_stock = updates.currentStock;
          if (updates.lowStockThreshold !== undefined) updateData.low_stock_threshold = updates.lowStockThreshold;
          updateData.updated_at = new Date().toISOString();

          const { error: updateError } = await supabase
            .from('products')
            .update(updateData)
            .eq('id', data.id)
            .eq('user_id', userId);
            
          if (updateError) {
            console.error('[CacheManager] Product update error:', updateError);
            return false;
          }
          return true;
          
        case 'delete':
          if (!data.id || data.id.startsWith('temp_')) {
            console.warn('[CacheManager] Cannot delete temp product:', data.id);
            return true;
          }
          
          const { error: deleteError } = await supabase
            .from('products')
            .delete()
            .eq('id', data.id)
            .eq('user_id', userId);
            
          if (deleteError) {
            console.error('[CacheManager] Product delete error:', deleteError);
            return false;
          }
          return true;
          
        default:
          console.warn(`[CacheManager] Unsupported operation: ${operation.operation}`);
          return false;
      }
    } catch (error) {
      console.error('[CacheManager] Product operation error:', error);
      return false;
    }
  };

  // Customer sync function (keeping existing implementation)
  const syncCustomerOperation = async (operation: PendingOperation, userId: string): Promise<boolean> => {
    const { data } = operation;
    console.log(`[CacheManager] Syncing customer ${operation.operation}:`, data?.name || data?.id);
    
    try {
      switch (operation.operation) {
        case 'create':
          const { error: createError } = await supabase
            .from('customers')
            .insert([{
              user_id: userId,
              name: data.name,
              phone: data.phone,
              email: data.email,
              address: data.address,
              total_purchases: data.totalPurchases || 0,
              outstanding_debt: data.outstandingDebt || 0,
              credit_limit: data.creditLimit || 1000,
              risk_rating: data.riskRating || 'low',
              last_purchase_date: data.lastPurchaseDate,
            }]);
          
          if (createError) {
            console.error('[CacheManager] Customer create error:', createError);
            return false;
          }
          return true;
          
        case 'update':
          const updates = data.updates || data;
          const dbUpdates: any = {};
          
          if (updates.name !== undefined) dbUpdates.name = updates.name;
          if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
          if (updates.email !== undefined) dbUpdates.email = updates.email;
          if (updates.address !== undefined) dbUpdates.address = updates.address;
          if (updates.totalPurchases !== undefined) dbUpdates.total_purchases = updates.totalPurchases;
          if (updates.outstandingDebt !== undefined) dbUpdates.outstanding_debt = updates.outstandingDebt;
          if (updates.creditLimit !== undefined) dbUpdates.credit_limit = updates.creditLimit;
          if (updates.riskRating !== undefined) dbUpdates.risk_rating = updates.riskRating;
          if (updates.lastPurchaseDate !== undefined) dbUpdates.last_purchase_date = updates.lastPurchaseDate;

          const { error: updateError } = await supabase
            .from('customers')
            .update(dbUpdates)
            .eq('id', data.id)
            .eq('user_id', userId);
            
          if (updateError) {
            console.error('[CacheManager] Customer update error:', updateError);
            return false;
          }
          return true;
          
        case 'delete':
          const { error: deleteError } = await supabase
            .from('customers')
            .delete()
            .eq('id', data.id)
            .eq('user_id', userId);
            
          if (deleteError) {
            console.error('[CacheManager] Customer delete error:', deleteError);
            return false;
          }
          return true;
          
        default:
          console.warn(`[CacheManager] Unsupported operation: ${operation.operation}`);
          return false;
      }
    } catch (error) {
      console.error('[CacheManager] Customer operation error:', error);
      return false;
    }
  };

  const debugPendingOperations = useCallback(() => {
    console.log('[CacheManager] Debug - Current pending operations:', {
      total: pendingOps.length,
      byType: {
        sale: pendingOps.filter(op => op.type === 'sale').length,
        customer: pendingOps.filter(op => op.type === 'customer').length,
        product: pendingOps.filter(op => op.type === 'product').length,
        transaction: pendingOps.filter(op => op.type === 'transaction').length,
      },
      operations: pendingOps
    });
  }, [pendingOps]);

  return {
    getCache,
    setCache,
    clearUserCache,
    addPendingOperation,
    clearPendingOperation,
    loadPendingOperations,
    debugPendingOperations,
    syncPendingOperations,
    incrementOperationAttempts,
    pendingOps,
  };
};
