
import { useState, useCallback, useRef } from 'react';
import { useAuth } from './useAuth';
import { useNetworkStatus } from './useNetworkStatus';
import { useCacheManager } from './useCacheManager';
import { SyncService } from '../services/syncService';

interface SyncOperation {
  type: 'product' | 'customer' | 'sale' | 'transaction';
  status: 'pending' | 'syncing' | 'completed' | 'failed';
  lastAttempt?: number;
  operationCount?: number;
}

export const useSyncCoordinator = () => {
  const [syncStatus, setSyncStatus] = useState<Record<string, SyncOperation>>({});
  const [globalSyncInProgress, setGlobalSyncInProgress] = useState(false);
  const syncQueueRef = useRef<string[]>([]);
  const processingRef = useRef(false);
  const syncLockRef = useRef<Set<string>>(new Set());
  
  const { user } = useAuth();
  const { isOnline } = useNetworkStatus();
  const { pendingOps, clearPendingOperation } = useCacheManager();

  const requestSync = useCallback(async (type: string) => {
    if (!isOnline || !user) {
      console.log(`[SyncCoordinator] Sync request denied for ${type}:`, { isOnline, hasUser: !!user });
      return false;
    }

    if (syncLockRef.current.has(type)) {
      console.log(`[SyncCoordinator] Sync already in progress for ${type}, skipping duplicate request`);
      return true;
    }

    // Check if we have pending operations for this type
    const typeOperations = pendingOps.filter(op => op.type === type);
    if (typeOperations.length === 0) {
      console.log(`[SyncCoordinator] No pending operations for ${type}`);
      return true;
    }

    // Add to queue if not already present
    if (!syncQueueRef.current.includes(type)) {
      syncQueueRef.current.push(type);
      console.log(`[SyncCoordinator] Added ${type} to sync queue:`, syncQueueRef.current);
    }

    // Process queue if not already processing
    if (!processingRef.current) {
      await processSync();
    }

    return true;
  }, [isOnline, user, pendingOps]);

  const processSync = useCallback(async () => {
    if (processingRef.current || syncQueueRef.current.length === 0) {
      return;
    }

    processingRef.current = true;
    setGlobalSyncInProgress(true);
    console.log('[SyncCoordinator] Starting sync process for queue:', syncQueueRef.current);

    try {
      // Process each type in the queue
      while (syncQueueRef.current.length > 0) {
        const type = syncQueueRef.current.shift()!;
        
        // Check if already processing this type
        if (syncLockRef.current.has(type)) {
          console.log(`[SyncCoordinator] Skipping ${type} - already processing`);
          continue;
        }
        
        syncLockRef.current.add(type);
        
        setSyncStatus(prev => ({
          ...prev,
          [type]: { type: type as any, status: 'syncing', lastAttempt: Date.now() }
        }));

        try {
          // Get operations for this specific type
          const typeOperations = pendingOps.filter(op => op.type === type);
          
          if (typeOperations.length > 0) {
            console.log(`[SyncCoordinator] Syncing ${typeOperations.length} ${type} operations`);
            
            // Update sync status with operation count
            setSyncStatus(prev => ({
              ...prev,
              [type]: { 
                type: type as any, 
                status: 'syncing', 
                lastAttempt: Date.now(),
                operationCount: typeOperations.length
              }
            }));
            
            // Use SyncService to handle the actual sync
            const success = await SyncService.syncPendingOperations(typeOperations, user!.id);
            
            if (success) {
              // Clear the synced operations only after confirmed success
              typeOperations.forEach(op => {
                console.log(`[SyncCoordinator] Clearing successfully synced operation: ${op.id}`);
                clearPendingOperation(op.id);
              });
              
              setSyncStatus(prev => ({
                ...prev,
                [type]: { 
                  type: type as any, 
                  status: 'completed', 
                  lastAttempt: Date.now(),
                  operationCount: typeOperations.length
                }
              }));

              // Dispatch type-specific sync events with delay to ensure state updates
              setTimeout(() => {
                console.log(`[SyncCoordinator] Dispatching events for ${type}`);
                window.dispatchEvent(new CustomEvent(`${type}-synced`, {
                  detail: { 
                    operationCount: typeOperations.length,
                    timestamp: new Date().toISOString()
                  }
                }));
                window.dispatchEvent(new CustomEvent(`data-refresh-${type}`, {
                  detail: { 
                    operationCount: typeOperations.length,
                    timestamp: new Date().toISOString()
                  }
                }));
              }, 100);
              
              console.log(`[SyncCoordinator] Completed sync for ${type}`);
            } else {
              setSyncStatus(prev => ({
                ...prev,
                [type]: { 
                  type: type as any, 
                  status: 'failed', 
                  lastAttempt: Date.now(),
                  operationCount: typeOperations.length
                }
              }));
              console.error(`[SyncCoordinator] Failed to sync ${type} operations`);
            }
          } else {
            setSyncStatus(prev => ({
              ...prev,
              [type]: { 
                type: type as any, 
                status: 'completed', 
                lastAttempt: Date.now(),
                operationCount: 0
              }
            }));
          }
        } catch (error) {
          console.error(`[SyncCoordinator] Error syncing ${type}:`, error);
          setSyncStatus(prev => ({
            ...prev,
            [type]: { 
              type: type as any, 
              status: 'failed', 
              lastAttempt: Date.now()
            }
          }));
        } finally {
          syncLockRef.current.delete(type);
        }
      }

      // Final notification after all syncs complete
      setTimeout(() => {
        console.log('[SyncCoordinator] All syncs completed, dispatching global events');
        window.dispatchEvent(new CustomEvent('sync-completed', {
          detail: {
            timestamp: new Date().toISOString(),
            syncedTypes: Object.keys(syncStatus).filter(type => syncStatus[type].status === 'completed')
          }
        }));
        window.dispatchEvent(new CustomEvent('data-synced', {
          detail: {
            timestamp: new Date().toISOString(),
            syncedTypes: Object.keys(syncStatus).filter(type => syncStatus[type].status === 'completed')
          }
        }));
      }, 200);

    } finally {
      processingRef.current = false;
      setGlobalSyncInProgress(false);
      console.log('[SyncCoordinator] Sync process completed');
    }
  }, [pendingOps, user, clearPendingOperation, syncStatus]);

  const getSyncStatus = useCallback((type: string) => {
    return syncStatus[type] || { type: type as any, status: 'pending' };
  }, [syncStatus]);

  const hasPendingOperations = useCallback((type: string) => {
    return pendingOps.filter(op => op.type === type).length > 0;
  }, [pendingOps]);

  const forceClearSyncLocks = useCallback(() => {
    console.log('[SyncCoordinator] Force clearing sync locks');
    syncLockRef.current.clear();
    processingRef.current = false;
    setGlobalSyncInProgress(false);
  }, []);

  return {
    requestSync,
    getSyncStatus,
    globalSyncInProgress,
    hasPendingOperations,
    pendingOperationsCount: pendingOps.length,
    forceClearSyncLocks,
  };
};
