import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { useNetworkStatus } from './useNetworkStatus';
import { useCacheManager } from './useCacheManager';
import { Customer } from '../types';

export interface DebtTransaction {
  id: string;
  customerId: string;
  customerName: string;
  amount: number;
  type: 'increase' | 'payment';
  timestamp: string;
  salesId?: string;
  paymentMethod?: 'cash' | 'mpesa' | 'bank';
  reference?: string;
  synced: boolean;
  tempId?: string;
}

export const useOfflineDebtManager = () => {
  const [debtTransactions, setDebtTransactions] = useState<DebtTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { user } = useAuth();
  const { isOnline } = useNetworkStatus();
  const { getCache, setCache, addPendingOperation } = useCacheManager();

  // Record debt increase from sale
  const recordDebtIncrease = useCallback(async (
    customerId: string,
    customerName: string,
    amount: number,
    salesId?: string
  ) => {
    if (!user || amount <= 0) return;

    const transaction: DebtTransaction = {
      id: `debt_inc_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      customerId,
      customerName,
      amount,
      type: 'increase',
      timestamp: new Date().toISOString(),
      salesId,
      synced: false,
      tempId: `temp_${Date.now()}`
    };

    console.log('[OfflineDebtManager] Recording debt increase:', {
      customerId,
      customerName,
      amount,
      salesId,
      transaction
    });

    // Update local state immediately
    setDebtTransactions(prev => {
      const updated = [transaction, ...prev];
      setCache('debt_transactions', updated);
      return updated;
    });

    // Queue for sync using compatible types
    addPendingOperation({
      type: 'customer',
      operation: 'update',
      data: {
        id: customerId,
        updates: {
          outstandingDebt: amount,
          lastPurchaseDate: transaction.timestamp
        },
        debtIncrease: true,
        salesId,
        tempId: transaction.tempId
      }
    });

    return transaction;
  }, [user, setCache, addPendingOperation]);

  // Record debt payment
  const recordDebtPayment = useCallback(async (
    customerId: string,
    customerName: string,
    amount: number,
    paymentMethod: 'cash' | 'mpesa' | 'bank' = 'cash',
    reference?: string
  ) => {
    if (!user || amount <= 0) return;

    const transaction: DebtTransaction = {
      id: `debt_pay_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      customerId,
      customerName,
      amount,
      type: 'payment',
      timestamp: new Date().toISOString(),
      paymentMethod,
      reference,
      synced: false,
      tempId: `temp_${Date.now()}`
    };

    console.log('[OfflineDebtManager] Recording debt payment:', {
      customerId,
      customerName,
      amount,
      paymentMethod,
      reference,
      transaction
    });

    // Update local state immediately
    setDebtTransactions(prev => {
      const updated = [transaction, ...prev];
      setCache('debt_transactions', updated);
      return updated;
    });

    // Queue for sync using compatible types
    addPendingOperation({
      type: 'customer',
      operation: 'update',
      data: {
        id: customerId,
        updates: {
          outstandingDebt: -amount // negative for payment
        },
        debtPayment: true,
        paymentMethod,
        reference,
        timestamp: transaction.timestamp,
        tempId: transaction.tempId
      }
    });

    return transaction;
  }, [user, setCache, addPendingOperation]);

  // Calculate customer debt balance including pending transactions
  const calculateCustomerDebt = useCallback((
    customer: Customer,
    includePending: boolean = true
  ) => {
    let baseDebt = customer.outstandingDebt || 0;
    
    if (!includePending) return baseDebt;

    // Add pending debt increases and subtract pending payments
    const customerTransactions = debtTransactions.filter(
      t => t.customerId === customer.id && !t.synced
    );

    for (const transaction of customerTransactions) {
      if (transaction.type === 'increase') {
        baseDebt += transaction.amount;
      } else if (transaction.type === 'payment') {
        baseDebt -= transaction.amount;
      }
    }

    return Math.max(0, baseDebt);
  }, [debtTransactions]);

  // Get pending debt transactions for a customer
  const getPendingDebtTransactions = useCallback((customerId: string) => {
    return debtTransactions.filter(
      t => t.customerId === customerId && !t.synced
    );
  }, [debtTransactions]);

  // Load debt transactions from cache
  const loadDebtTransactions = useCallback(async () => {
    if (!user) {
      setDebtTransactions([]);
      return;
    }

    setLoading(true);
    
    try {
      const cached = getCache<DebtTransaction[]>('debt_transactions');
      if (cached && Array.isArray(cached)) {
        setDebtTransactions(cached);
        console.log('[OfflineDebtManager] Loaded', cached.length, 'debt transactions from cache');
      }
    } catch (error) {
      console.error('[OfflineDebtManager] Error loading debt transactions:', error);
      setError('Failed to load debt transactions');
    } finally {
      setLoading(false);
    }
  }, [user, getCache]);

  // Sync debt transactions
  const syncDebtTransactions = useCallback(async () => {
    if (!user || !isOnline) return;

    const unsyncedTransactions = debtTransactions.filter(t => !t.synced);
    if (unsyncedTransactions.length === 0) return;

    console.log('[OfflineDebtManager] Syncing', unsyncedTransactions.length, 'debt transactions');

    for (const transaction of unsyncedTransactions) {
      try {
        // Mark as synced immediately to prevent duplicate sync attempts
        setDebtTransactions(prev => 
          prev.map(t => t.id === transaction.id ? { ...t, synced: true } : t)
        );

        console.log('[OfflineDebtManager] Debt transaction synced:', transaction.id);
      } catch (error) {
        console.error('[OfflineDebtManager] Failed to sync debt transaction:', transaction.id, error);
        
        // Revert synced status on failure
        setDebtTransactions(prev => 
          prev.map(t => t.id === transaction.id ? { ...t, synced: false } : t)
        );
      }
    }
  }, [user, isOnline, debtTransactions]);

  // Initialize and listen for events
  useEffect(() => {
    loadDebtTransactions();
  }, [loadDebtTransactions]);

  useEffect(() => {
    const handleNetworkReconnected = () => {
      console.log('[OfflineDebtManager] Network reconnected, syncing debt transactions');
      syncDebtTransactions();
    };

    window.addEventListener('network-reconnected', handleNetworkReconnected);
    return () => window.removeEventListener('network-reconnected', handleNetworkReconnected);
  }, [syncDebtTransactions]);

  return {
    debtTransactions,
    loading,
    error,
    recordDebtIncrease,
    recordDebtPayment,
    calculateCustomerDebt,
    getPendingDebtTransactions,
    syncDebtTransactions,
    pendingTransactions: debtTransactions.filter(t => !t.synced).length
  };
};