
import { useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useOfflineFirstSupabase } from '@/hooks/useOfflineFirstSupabase';

export interface CustomerDebtPayment {
  id: string;
  user_id: string;
  customer_id: string;
  customer_name: string;
  amount: number;
  payment_method: 'cash' | 'mpesa' | 'bank' | 'debt';
  reference?: string | null;
  timestamp: string;
  created_at: string;
  synced: boolean;
}

const convertMethod = (m: any): 'cash' | 'mpesa' | 'bank' | 'debt' => {
  const v = String(m || '').toLowerCase();
  if (v === 'mpesa') return 'mpesa';
  if (v === 'bank') return 'bank';
  if (v === 'debt') return 'debt';
  return 'cash';
};

const toLocal = (p: any): CustomerDebtPayment => ({
  id: p.id,
  user_id: p.user_id,
  customer_id: p.customer_id,
  customer_name: p.customer_name,
  amount: Number(p.amount || 0),
  payment_method: convertMethod(p.payment_method),
  reference: p.reference || null,
  timestamp: p.timestamp || p.created_at,
  created_at: p.created_at,
  synced: p.synced !== false,
});

const fromLocal = (p: CustomerDebtPayment) => ({
  id: p.id,
  user_id: p.user_id,
  customer_id: p.customer_id,
  customer_name: p.customer_name,
  amount: p.amount,
  payment_method: p.payment_method,
  reference: p.reference,
  timestamp: p.timestamp,
  created_at: p.created_at,
  synced: p.synced !== false,
});

export const useOfflineCustomerPayments = (customerId?: string) => {
  const { user } = useAuth();

  const loadFromSupabase = useCallback(async () => {
    if (!user) return [] as CustomerDebtPayment[];
    const { data, error } = await supabase
      .from('debt_payments')
      .select('*')
      .eq('user_id', user.id)
      .order('timestamp', { ascending: false })
      .limit(1000);
    if (error) throw error;
    return (data || []).map(toLocal);
  }, [user?.id]);

  const {
    data,
    loading,
    error,
    refresh,
    isOnline,
    lastSyncTime,
    testOffline,
  } = useOfflineFirstSupabase<CustomerDebtPayment>({
    cacheKey: 'debt_payments',
    tableName: 'debt_payments',
    loadFromSupabase,
    transformToLocal: toLocal,
    transformFromLocal: fromLocal,
    user,
  });

  // Always present a stable array
  const payments = useMemo(() => (data || []).filter(p => !customerId || p.customer_id === (customerId as string)), [data, customerId]);

  return { payments, loading, error, refresh, isOnline, lastSyncTime, testOffline };
};
