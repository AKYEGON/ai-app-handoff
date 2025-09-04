
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';
import { Transaction } from '../types';

export const useSupabaseTransactions = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  // Load transactions from database
  const loadTransactions = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .order('date', { ascending: false });

      if (error) throw error;

      const mappedTransactions: Transaction[] = data.map(transaction => ({
        id: transaction.id,
        customerId: transaction.customer_id,
        itemId: transaction.item_id,
        quantity: transaction.quantity,
        unitPrice: Number(transaction.unit_price),
        totalAmount: Number(transaction.total_amount),
        notes: transaction.notes || '',
        date: transaction.date || transaction.created_at,
        paid: transaction.paid || false,
        paidDate: transaction.paid_date,
      }));

      setTransactions(mappedTransactions);
    } catch (error) {
      console.error('Error loading transactions:', error);
      toast({
        title: "Error",
        description: "Failed to load transactions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Create transaction
  const createTransaction = async (transactionData: Omit<Transaction, 'id'>) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('transactions')
        .insert({
          user_id: user.id,
          customer_id: transactionData.customerId,
          item_id: transactionData.itemId,
          quantity: transactionData.quantity,
          unit_price: transactionData.unitPrice,
          total_amount: transactionData.totalAmount,
          notes: transactionData.notes,
          date: transactionData.date,
          paid: transactionData.paid,
          paid_date: transactionData.paidDate,
        })
        .select()
        .single();

      if (error) throw error;

      const newTransaction: Transaction = {
        id: data.id,
        customerId: data.customer_id,
        itemId: data.item_id,
        quantity: data.quantity,
        unitPrice: Number(data.unit_price),
        totalAmount: Number(data.total_amount),
        notes: data.notes || '',
        date: data.date || data.created_at,
        paid: data.paid || false,
        paidDate: data.paid_date,
      };

      setTransactions(prev => [newTransaction, ...prev]);
      return newTransaction;
    } catch (error) {
      console.error('Error creating transaction:', error);
      toast({
        title: "Error",
        description: "Failed to create transaction",
        variant: "destructive",
      });
      throw error;
    }
  };

  // Update transaction
  const updateTransaction = async (id: string, updates: Partial<Transaction>) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('transactions')
        .update({
          customer_id: updates.customerId,
          item_id: updates.itemId,
          quantity: updates.quantity,
          unit_price: updates.unitPrice,
          total_amount: updates.totalAmount,
          notes: updates.notes,
          paid: updates.paid,
          paid_date: updates.paidDate,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      const updatedTransaction: Transaction = {
        id: data.id,
        customerId: data.customer_id,
        itemId: data.item_id,
        quantity: data.quantity,
        unitPrice: Number(data.unit_price),
        totalAmount: Number(data.total_amount),
        notes: data.notes || '',
        date: data.date || data.created_at,
        paid: data.paid || false,
        paidDate: data.paid_date,
      };

      setTransactions(prev => prev.map(t => t.id === id ? updatedTransaction : t));
      return updatedTransaction;
    } catch (error) {
      console.error('Error updating transaction:', error);
      toast({
        title: "Error",
        description: "Failed to update transaction",
        variant: "destructive",
      });
      throw error;
    }
  };

  // Migrate localStorage data to database
  const migrateLocalStorageData = async () => {
    if (!user) return;

    try {
      const localData = localStorage.getItem('dts_transactions');
      if (!localData) return;

      const localTransactions = JSON.parse(localData);
      if (!Array.isArray(localTransactions) || localTransactions.length === 0) return;

      console.log('Migrating transactions from localStorage:', localTransactions.length);

      for (const transaction of localTransactions) {
        await supabase
          .from('transactions')
          .insert({
            user_id: user.id,
            customer_id: transaction.customerId,
            item_id: transaction.itemId,
            quantity: transaction.quantity,
            unit_price: transaction.unitPrice,
            total_amount: transaction.totalAmount,
            notes: transaction.notes || '',
            date: transaction.date || new Date().toISOString(),
            paid: transaction.paid || false,
            paid_date: transaction.paidDate,
          });
      }

      // Clear localStorage after successful migration
      localStorage.removeItem('dts_transactions');
      console.log('Transactions migrated successfully');

      // Reload transactions from database
      await loadTransactions();
    } catch (error) {
      console.error('Error migrating transactions:', error);
    }
  };

  // Set up real-time subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('transactions-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transactions',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          loadTransactions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Load transactions and migrate data on mount
  useEffect(() => {
    if (user) {
      loadTransactions().then(() => {
        migrateLocalStorageData();
      });
    }
  }, [user]);

  return {
    transactions,
    loading,
    createTransaction,
    updateTransaction,
    refreshTransactions: loadTransactions,
  };
};
