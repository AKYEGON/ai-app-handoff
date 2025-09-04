import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useNetworkStatus } from './useNetworkStatus';
import { useCacheManager } from './useCacheManager';
import { Customer } from '../types';

// Helper function to transform database customer to interface
const transformDbCustomer = (dbCustomer: any): Customer => ({
  id: dbCustomer.id,
  name: dbCustomer.name,
  phone: dbCustomer.phone,
  email: dbCustomer.email,
  address: dbCustomer.address,
  createdDate: dbCustomer.created_date || dbCustomer.created_at,
  totalPurchases: Number(dbCustomer.total_purchases ?? 0) || 0,
  outstandingDebt: Number(dbCustomer.outstanding_debt ?? 0) || 0,
  creditLimit: Number(dbCustomer.credit_limit ?? 1000) || 1000,
  lastPurchaseDate: dbCustomer.last_purchase_date,
  riskRating: (String(dbCustomer.risk_rating || 'low').toLowerCase() as 'low' | 'medium' | 'high'),
});

export const useUnifiedCustomers = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { user } = useAuth();
  const { isOnline } = useNetworkStatus();
  
  // Listen for auth state changes to refresh data
  useEffect(() => {
    const handleAuthStateChange = () => {
      console.log('[useUnifiedCustomers] Auth state changed, refreshing data');
      if (user) {
        loadCustomers();
      } else {
        setCustomers([]);
        setLoading(false);
      }
    };

    window.addEventListener('auth-state-change', handleAuthStateChange);
    return () => window.removeEventListener('auth-state-change', handleAuthStateChange);
  }, [user]);
  const { getCache, setCache, addPendingOperation, pendingOps, clearPendingOperation, debugPendingOperations } = useCacheManager();
  
  const isLoadingRef = useRef(false);
  const syncInProgressRef = useRef(false);

  // Sync pending operations
  const syncPendingOperations = useCallback(async () => {
    if (!user || !isOnline || syncInProgressRef.current) return;

    const customerOps = pendingOps.filter(op => op.type === 'customer');
    if (customerOps.length === 0) return;

    console.log('[UnifiedCustomers] Syncing', customerOps.length, 'pending customer operations');
    syncInProgressRef.current = true;

    const syncedCreates: Array<{tempId: string, realCustomer: Customer}> = [];

    for (const operation of customerOps) {
      try {
        let success = false;

        switch (operation.operation) {
          case 'create':
            console.log('[UnifiedCustomers] Syncing create operation:', operation.data);
            const createData = {
              name: operation.data.name,
              phone: operation.data.phone,
              email: operation.data.email,
              address: operation.data.address,
              total_purchases: operation.data.totalPurchases || 0,
              outstanding_debt: operation.data.outstandingDebt || 0,
              credit_limit: operation.data.creditLimit || 1000,
              risk_rating: operation.data.riskRating || 'low',
              last_purchase_date: operation.data.lastPurchaseDate,
              user_id: user.id,
            };

            const { data: createdData, error: createError } = await supabase
              .from('customers')
              .insert([createData])
              .select()
              .single();

            success = !createError;
            if (createError) {
              console.error('[UnifiedCustomers] Create sync failed:', createError);
            } else {
              console.log('[UnifiedCustomers] Create synced successfully');
              // Track temp ID to real customer mapping for replacement
              const tempId = operation.data.tempId || `temp_${operation.data.name}_${operation.data.phone}`;
              if (createdData) {
                syncedCreates.push({
                  tempId,
                  realCustomer: transformDbCustomer(createdData)
                });
              }
            }
            break;

          case 'update':
            console.log('[UnifiedCustomers] Syncing update operation:', operation.data);
            const updates = operation.data.updates;
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
              .eq('id', operation.data.id)
              .eq('user_id', user.id);

            success = !updateError;
            if (updateError) {
              console.error('[UnifiedCustomers] Update sync failed:', updateError);
            } else {
              console.log('[UnifiedCustomers] Update synced successfully');
            }
            break;

          case 'delete':
            console.log('[UnifiedCustomers] Syncing delete operation:', operation.data);
            const { error: deleteError } = await supabase
              .from('customers')
              .delete()
              .eq('id', operation.data.id)
              .eq('user_id', user.id);

            success = !deleteError;
            if (deleteError) {
              console.error('[UnifiedCustomers] Delete sync failed:', deleteError);
            } else {
              console.log('[UnifiedCustomers] Delete synced successfully');
            }
            break;
        }

        if (success) {
          clearPendingOperation(operation.id);
        }
      } catch (error) {
        console.error('[UnifiedCustomers] Error syncing operation:', operation.id, error);
      }
    }

    // Replace temp customers with real ones from sync
    if (syncedCreates.length > 0) {
      setCustomers(prev => {
        let updated = [...prev];
        
        for (const {tempId, realCustomer} of syncedCreates) {
          // Remove temp customer and add real one
          updated = updated.filter(c => !c.id.startsWith('temp_') || 
            !(c.name === realCustomer.name && c.phone === realCustomer.phone));
          updated.unshift(realCustomer);
        }
        
        // Remove duplicates and sort
        const uniqueCustomers = updated.filter((customer, index, self) => 
          index === self.findIndex(c => c.id === customer.id)
        ).sort((a, b) => new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime());
        
        setCache('customers', uniqueCustomers);
        return uniqueCustomers;
      });
    }

    syncInProgressRef.current = false;
    
    // Refresh data after sync
    await loadCustomers();
  }, [user, isOnline, pendingOps, clearPendingOperation]);

  // Load customers from cache or server
  const loadCustomers = useCallback(async () => {
    if (!user || isLoadingRef.current) {
      if (!user) {
        setCustomers([]);
        setLoading(false);
      }
      return;
    }

    isLoadingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      // Always try cache first for fast UI
      const cached = getCache<Customer[]>('customers');
      if (cached && Array.isArray(cached)) {
        console.log('[UnifiedCustomers] Using cached data:', cached.length, 'customers');
        setCustomers(cached);
        setLoading(false);
        
        // If online, fetch fresh data in background and merge intelligently
        if (isOnline) {
          try {
            const { data, error: fetchError } = await supabase
              .from('customers')
              .select('*')
              .eq('user_id', user.id)
              .order('created_date', { ascending: false });

            if (!fetchError && data) {
              const serverData = data.map(transformDbCustomer);
              
              // Get local customers that might have unsynced changes
              const unsyncedLocal = cached.filter(customer => 
                customer.id.startsWith('temp_') && 
                !serverData.some(s => s.name === customer.name && s.phone === customer.phone)
              );
              
              // For each server customer, prefer server aggregates unless there's a real pending local update
              const mergedData: Customer[] = [...unsyncedLocal];
              
              // Build a set of customer IDs with pending local updates
              const pendingUpdateIds = new Set(
                pendingOps
                  .filter(op => op.type === 'customer' && op.operation === 'update' && op.data?.id)
                  .map(op => op.data.id)
              );
              
              for (const serverCustomer of serverData) {
                const localCustomer = cached.find(c => c.id === serverCustomer.id);
                
                if (localCustomer) {
                  if (localCustomer.id.startsWith('temp_') || pendingUpdateIds.has(serverCustomer.id)) {
                    // Keep local temp or actively edited customers
                    mergedData.push(localCustomer);
                  } else {
                    // Prefer authoritative server values (prevents stale debt/total overwrites)
                    mergedData.push(serverCustomer);
                  }
                } else {
                  // New customer from server
                  mergedData.push(serverCustomer);
                }
              }
              
              // Remove duplicates and sort
              const uniqueData = mergedData.filter((customer, index, self) => 
                index === self.findIndex(c => c.id === customer.id)
              ).sort((a, b) => new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime());
              
              // Update cache and state if data changed
              if (JSON.stringify(uniqueData) !== JSON.stringify(cached)) {
                console.log('[UnifiedCustomers] Background refresh: updating with merged data');
                setCache('customers', uniqueData);
                setCustomers(uniqueData);
              }
            }
          } catch (bgError) {
            console.error('[UnifiedCustomers] Background refresh failed:', bgError);
          }
        }
        return;
      }

      // If no cache and online, fetch from server
      if (isOnline) {
        console.log('[UnifiedCustomers] No cache, fetching from server');
        const { data, error: fetchError } = await supabase
          .from('customers')
          .select('*')
          .eq('user_id', user.id)
          .order('created_date', { ascending: false });

        if (fetchError) {
          setError('Failed to load customers');
          console.error('[UnifiedCustomers] Fetch error:', fetchError);
        } else {
          const transformedData = (data || []).map(transformDbCustomer);
          console.log('[UnifiedCustomers] Fetched from server:', transformedData.length, 'customers');
          setCache('customers', transformedData);
          setCustomers(transformedData);
        }
      } else {
        setError('No cached data available offline');
      }
    } catch (err) {
      setError('Failed to load customers');
      console.error('[UnifiedCustomers] Load error:', err);
    } finally {
      setLoading(false);
      isLoadingRef.current = false;
    }
  }, [user?.id, isOnline, getCache, setCache, pendingOps]);

  // Create customer
  const createCustomer = useCallback(async (customerData: Omit<Customer, 'id' | 'createdDate'>) => {
    if (!user) throw new Error('User not authenticated');

    const newCustomer: Customer = {
      ...customerData,
      id: `temp_${Date.now()}`,
      createdDate: new Date().toISOString(),
      totalPurchases: customerData.totalPurchases || 0,
      outstandingDebt: customerData.outstandingDebt || 0,
      creditLimit: customerData.creditLimit || 1000,
    };

    // Optimistically update UI
    setCustomers(prev => {
      const updated = [newCustomer, ...prev];
      setCache('customers', updated);
      return updated;
    });

    if (isOnline) {
      try {
        const dbData = {
          name: customerData.name,
          phone: customerData.phone,
          email: customerData.email,
          address: customerData.address,
          total_purchases: customerData.totalPurchases || 0,
          outstanding_debt: customerData.outstandingDebt || 0,
          credit_limit: customerData.creditLimit || 1000,
          risk_rating: customerData.riskRating || 'low',
          last_purchase_date: customerData.lastPurchaseDate,
          user_id: user.id,
        };

        const { data, error } = await supabase
          .from('customers')
          .insert([dbData])
          .select()
          .single();

        if (error) throw error;

        const transformedCustomer = transformDbCustomer(data);
        
        // Replace temp customer with real one
        setCustomers(prev => {
          const updated = prev.map(c => c.id === newCustomer.id ? transformedCustomer : c);
          setCache('customers', updated);
          return updated;
        });

        return transformedCustomer;
      } catch (error) {
        console.error('[UnifiedCustomers] Create failed, queuing for sync:', error);
        addPendingOperation({
          type: 'customer',
          operation: 'create',
          data: { ...customerData, tempId: newCustomer.id },
        });
        return newCustomer;
      }
    } else {
      // Queue for sync when online
      addPendingOperation({
        type: 'customer',
        operation: 'create',
        data: { ...customerData, tempId: newCustomer.id },
      });
      return newCustomer;
    }
  }, [user, isOnline, addPendingOperation, setCache]);

  // Update customer with improved immediate feedback
  const updateCustomer = useCallback(async (id: string, updates: Partial<Customer>) => {
    if (!user) {
      console.error('[UnifiedCustomers] User not authenticated');
      throw new Error('User not authenticated');
    }

    console.log('[UnifiedCustomers] updateCustomer called:', {
      customerId: id,
      updates,
      isOnline,
      currentCustomers: customers.length,
      userAuthenticated: !!user
    });

    // Find the current customer
    const currentCustomer = customers.find(c => c.id === id);
    if (!currentCustomer) {
      console.error('[UnifiedCustomers] Customer not found:', id);
      throw new Error(`Customer ${id} not found`);
    }

    console.log('[UnifiedCustomers] Current customer before update:', {
      id: currentCustomer.id,
      name: currentCustomer.name,
      outstandingDebt: currentCustomer.outstandingDebt,
      totalPurchases: currentCustomer.totalPurchases
    });

    // Calculate new values
    const updatedCustomer = { ...currentCustomer, ...updates };
    console.log('[UnifiedCustomers] New customer values:', {
      id: updatedCustomer.id,
      name: updatedCustomer.name,
      outstandingDebt: updatedCustomer.outstandingDebt,
      totalPurchases: updatedCustomer.totalPurchases
    });

    // Immediately update local state for instant UI feedback
    setCustomers(prev => {
      const updated = prev.map(c => c.id === id ? updatedCustomer : c);
      // Also immediately update cache
      setCache('customers', updated);
      console.log('[UnifiedCustomers] Immediately updated customer in UI and cache');
      return updated;
    });

    // Dispatch immediate event for UI updates
    window.dispatchEvent(new CustomEvent('customer-updated-locally', {
      detail: { customerId: id, customer: updatedCustomer }
    }));

    // Handle server sync
    if (isOnline) {
      try {
        // Prepare database update object
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

        console.log('[UnifiedCustomers] Updating database with:', dbUpdates);

        const { error } = await supabase
          .from('customers')
          .update(dbUpdates)
          .eq('id', id)
          .eq('user_id', user.id);

        if (error) {
          console.error('[UnifiedCustomers] Database update failed:', error);
          throw error;
        }

        console.log('[UnifiedCustomers] Customer updated successfully in database');
        
        // Dispatch success event
        window.dispatchEvent(new CustomEvent('customer-updated-server', {
          detail: { customerId: id, customer: updatedCustomer }
        }));
        
      } catch (error) {
        console.error('[UnifiedCustomers] Server update failed, queuing for sync:', error);
        
        // Add to pending operations for later sync
        addPendingOperation({
          type: 'customer',
          operation: 'update',
          data: { id, updates },
        });
        
        console.log('[UnifiedCustomers] Added pending operation for customer update');
      }
    } else {
      console.log('[UnifiedCustomers] Offline mode - queuing customer update');
      
      // Queue for sync when online
      addPendingOperation({
        type: 'customer',
        operation: 'update',
        data: { id, updates },
      });
    }

    console.log('[UnifiedCustomers] Customer update completed');
    return updatedCustomer;
  }, [user, isOnline, addPendingOperation, setCache, customers]);

  // Delete customer
  const deleteCustomer = useCallback(async (id: string) => {
    if (!user) throw new Error('User not authenticated');

    const originalCustomer = customers.find(c => c.id === id);

    // Optimistically update UI
    setCustomers(prev => {
      const filtered = prev.filter(c => c.id !== id);
      setCache('customers', filtered);
      return filtered;
    });

    if (isOnline) {
      try {
        const { error } = await supabase
          .from('customers')
          .delete()
          .eq('id', id)
          .eq('user_id', user.id);

        if (error) throw error;

        console.log('[UnifiedCustomers] Customer deleted successfully');
      } catch (error) {
        console.error('[UnifiedCustomers] Delete failed, queuing for sync:', error);
        
        // Rollback optimistic update
        if (originalCustomer) {
          setCustomers(prev => {
            const restored = [...prev, originalCustomer].sort((a, b) => 
              new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime()
            );
            setCache('customers', restored);
            return restored;
          });
        }
        
        addPendingOperation({
          type: 'customer',
          operation: 'delete',
          data: { id },
        });
        throw error;
      }
    } else {
      // Queue for sync when online
      addPendingOperation({
        type: 'customer',
        operation: 'delete',
        data: { id },
      });
    }
  }, [user, isOnline, addPendingOperation, setCache, customers]);

  // Load customers on mount and when user changes
  useEffect(() => {
    if (user) {
      loadCustomers();
    }
  }, [user?.id]);

  // Listen for various events to refresh customer data
  useEffect(() => {
    const handleDataRefresh = () => {
      console.log('[UnifiedCustomers] Data refresh event received');
      loadCustomers();
    };

    const events = [
      'sync-completed',
      'data-synced', 
      'customers-synced',
      'sale-completed',
      'checkout-completed'
    ];

    events.forEach(event => {
      window.addEventListener(event, handleDataRefresh);
    });
    
    return () => {
      events.forEach(event => {
        window.removeEventListener(event, handleDataRefresh);
      });
    };
  }, [loadCustomers]);

  // Sync pending operations when coming online
  useEffect(() => {
    if (isOnline && pendingOps.filter(op => op.type === 'customer').length > 0) {
      const timer = setTimeout(() => {
        syncPendingOperations();
      }, 1000); // Delay to ensure stable connection

      return () => clearTimeout(timer);
    }
  }, [isOnline, pendingOps, syncPendingOperations]);

  return {
    customers,
    loading,
    error,
    createCustomer,
    updateCustomer,
    deleteCustomer,
    refetch: useCallback(async () => {
      console.log('[UnifiedCustomers] Force refreshing customer data...');
      await loadCustomers();
      // Dispatch a custom event to notify components
      window.dispatchEvent(new CustomEvent('customers-refreshed'));
    }, [loadCustomers]),
    isOnline,
    pendingOperations: pendingOps.filter(op => op.type === 'customer').length,
    syncPendingOperations,
  };
};
