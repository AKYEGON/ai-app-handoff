
import { useState, useEffect, useCallback } from 'react';
import { useNetworkStatus } from './useNetworkStatus';
import { Sale, Product, Customer } from '../types';

interface ReportsSnapshot {
  timestamp: string;
  sales: Sale[];
  products: Product[];
  customers: Customer[];
  metrics: {
    totalRevenue: number;
    totalOrders: number;
    activeCustomers: number;
    lowStockProducts: number;
  };
  chartData: any[];
}

export const useOfflineReports = () => {
  const { isOnline } = useNetworkStatus();
  const [cachedSnapshot, setCachedSnapshot] = useState<ReportsSnapshot | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

  // Load cached snapshot from IndexedDB
  const loadCachedSnapshot = useCallback(async () => {
    try {
      const cached = localStorage.getItem('reports_snapshot');
      if (cached) {
        const snapshot = JSON.parse(cached);
        setCachedSnapshot(snapshot);
        setLastSyncedAt(snapshot.timestamp);
        console.log('[OfflineReports] Loaded cached snapshot from:', snapshot.timestamp);
      }
    } catch (error) {
      console.error('[OfflineReports] Failed to load cached snapshot:', error);
    }
  }, []);

  // Cache reports snapshot
  const cacheSnapshot = useCallback(async (
    sales: Sale[], 
    products: Product[], 
    customers: Customer[],
    metrics: any,
    chartData: any[]
  ) => {
    try {
      const snapshot: ReportsSnapshot = {
        timestamp: new Date().toISOString(),
        sales,
        products,
        customers,
        metrics,
        chartData
      };
      
      localStorage.setItem('reports_snapshot', JSON.stringify(snapshot));
      setCachedSnapshot(snapshot);
      setLastSyncedAt(snapshot.timestamp);
      console.log('[OfflineReports] Cached new snapshot at:', snapshot.timestamp);
    } catch (error) {
      console.error('[OfflineReports] Failed to cache snapshot:', error);
    }
  }, []);

  // Load cached data on mount
  useEffect(() => {
    loadCachedSnapshot();
  }, [loadCachedSnapshot]);

  return {
    isOnline,
    cachedSnapshot,
    lastSyncedAt,
    cacheSnapshot,
    readOnly: !isOnline
  };
};
