
import { useState, useEffect } from 'react';
import { supabase } from '../integrations/supabase/client';
import { useAuth } from './useAuth';

export interface DebtPayment {
  id: string;
  user_id: string;
  customer_id: string;
  customer_name: string;
  amount: number;
  payment_method: string;
  reference?: string;
  timestamp: string;
  created_at: string;
  synced: boolean;
}

export const useSupabaseDebtPayments = () => {
  const [debtPayments, setDebtPayments] = useState<DebtPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchDebtPayments = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('debt_payments')
        .select('*')
        .eq('user_id', user.id)
        .order('timestamp', { ascending: false });

      if (error) {
        console.error('Error fetching debt payments:', error);
        setError(error.message);
      } else {
        setDebtPayments(data || []);
        setError(null);
      }
    } catch (err) {
      console.error('Error in fetchDebtPayments:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const createDebtPayment = async (paymentData: Omit<DebtPayment, 'id' | 'created_at' | 'synced'>) => {
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('debt_payments')
      .insert({
        ...paymentData,
        user_id: user.id,
        synced: true,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating debt payment:', error);
      throw error;
    }

    await fetchDebtPayments();
    return data;
  };

  const createMultipleDebtPayments = async (paymentsData: Omit<DebtPayment, 'id' | 'created_at' | 'synced'>[]) => {
    if (!user) throw new Error('User not authenticated');

    const paymentsWithUser = paymentsData.map(payment => ({
      ...payment,
      user_id: user.id,
      synced: true,
    }));

    const { data, error } = await supabase
      .from('debt_payments')
      .insert(paymentsWithUser)
      .select();

    if (error) {
      console.error('Error creating multiple debt payments:', error);
      throw error;
    }

    await fetchDebtPayments();
    return data;
  };

  const updateDebtPayment = async (id: string, updates: Partial<DebtPayment>) => {
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('debt_payments')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating debt payment:', error);
      throw error;
    }

    await fetchDebtPayments();
    return data;
  };

  const deleteDebtPayment = async (id: string) => {
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('debt_payments')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting debt payment:', error);
      throw error;
    }

    await fetchDebtPayments();
  };

  useEffect(() => {
    fetchDebtPayments();
  }, [user]);

  return {
    debtPayments,
    loading,
    error,
    createDebtPayment,
    createMultipleDebtPayments,
    updateDebtPayment,
    deleteDebtPayment,
    refetch: fetchDebtPayments,
  };
};
