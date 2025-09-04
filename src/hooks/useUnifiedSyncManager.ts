
import { useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { useNetworkStatus } from './useNetworkStatus';
import { useCacheManager } from './useCacheManager';
import { useSyncCoordinator } from './useSyncCoordinator';

export const useUnifiedSyncManager = () => {
  const { user } = useAuth();
  const { isOnline } = useNetworkStatus();
  const { pendingOps } = useCacheManager();
  const { requestSync, globalSyncInProgress, pendingOperationsCount } = useSyncCoordinator();

  const syncPendingOperations = useCallback(async () => {
    if (!isOnline || pendingOps.length === 0 || !user || globalSyncInProgress) {
      console.log('[UnifiedSyncManager] Sync conditions not met:', {
        isOnline,
        pendingOpsLength: pendingOps.length,
        hasUser: !!user,
        globalSyncInProgress
      });
      return false;
    }

    console.log('[UnifiedSyncManager] Starting coordinated sync process...');
    console.log('[UnifiedSyncManager] Pending operations:', pendingOps);
    
    try {
      // Group operations by type for coordinated syncing
      const operationsByType = pendingOps.reduce((acc, op) => {
        if (!acc[op.type]) acc[op.type] = [];
        acc[op.type].push(op);
        return acc;
      }, {} as Record<string, any[]>);

      console.log('[UnifiedSyncManager] Operations by type:', Object.keys(operationsByType).map(type => `${type}: ${operationsByType[type].length}`));

      // Request coordinated sync for each type that has pending operations
      const syncPromises = Object.keys(operationsByType).map(async (type) => {
        console.log(`[UnifiedSyncManager] Requesting sync for ${type} (${operationsByType[type].length} operations)`);
        return await requestSync(type);
      });

      const results = await Promise.all(syncPromises);
      const allSuccessful = results.every(result => result);

      console.log('[UnifiedSyncManager] Sync coordination completed:', {
        allSuccessful,
        results
      });

      return allSuccessful;
    } catch (error) {
      console.error('[UnifiedSyncManager] Sync failed:', error);
      return false;
    }
  }, [isOnline, pendingOps, user, globalSyncInProgress, requestSync]);

  // Auto-sync when coming online (with coordination)
  useEffect(() => {
    if (isOnline && pendingOps.length > 0 && user && !globalSyncInProgress) {
      console.log('[UnifiedSyncManager] Coming online with pending operations, initiating coordinated sync...');
      // Use timeout to prevent immediate re-triggering
      const timeout = setTimeout(() => {
        syncPendingOperations();
      }, 1500);
      return () => clearTimeout(timeout);
    }
  }, [isOnline, user?.id, pendingOps.length, globalSyncInProgress, syncPendingOperations]);

  // Periodic sync for any remaining operations
  useEffect(() => {
    if (!isOnline || pendingOps.length === 0 || globalSyncInProgress) return;

    const interval = setInterval(() => {
      console.log('[UnifiedSyncManager] Periodic sync check - pending operations:', pendingOps.length);
      if (pendingOps.length > 0) {
        syncPendingOperations();
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [isOnline, pendingOps.length, globalSyncInProgress, syncPendingOperations]);

  return {
    isOnline,
    pendingOperations: pendingOperationsCount,
    syncPendingOperations,
    globalSyncInProgress,
  };
};
