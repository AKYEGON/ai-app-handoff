import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useUnifiedCustomers } from '@/hooks/useUnifiedCustomers';
import { useSupabaseDebtPayments } from '@/hooks/useSupabaseDebtPayments';
import { formatCurrency } from '@/utils/currency';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

/**
 * Deep debugging test for split payment debt issues
 * This will help identify exactly where the doubling occurs
 */
export const SplitPaymentDebtTest: React.FC = () => {
  const { customers, updateCustomer } = useUnifiedCustomers();
  const { createMultipleDebtPayments } = useSupabaseDebtPayments();
  const { user } = useAuth();
  const { toast } = useToast();
  const [testing, setTesting] = useState(false);
  const [debugResults, setDebugResults] = useState<string[]>([]);

  const runDeepDebtTest = async () => {
    if (!user || customers.length === 0) {
      toast({
        title: "Test Requirements Not Met",
        description: "Need authenticated user and at least one customer to run test",
        variant: "destructive"
      });
      return;
    }

    setTesting(true);
    setDebugResults([]);
    const results: string[] = [];

    try {
      // Get a test customer
      const testCustomer = customers[0];
      results.push(`🧪 Testing with customer: ${testCustomer.name} (ID: ${testCustomer.id})`);
      
      // Check initial state
      results.push(`📊 Initial customer debt: ${formatCurrency(testCustomer.outstandingDebt)}`);
      results.push(`📊 Initial total purchases: ${formatCurrency(testCustomer.totalPurchases || 0)}`);

      // Query actual database state
      const { data: initialDbCustomer } = await supabase
        .from('customers')
        .select('outstanding_debt, total_purchases')
        .eq('id', testCustomer.id)
        .single();
      
      if (initialDbCustomer) {
        results.push(`💾 DB initial debt: ${formatCurrency(initialDbCustomer.outstanding_debt || 0)}`);
        results.push(`💾 DB initial purchases: ${formatCurrency(initialDbCustomer.total_purchases || 0)}`);
      }

      // Test Case 1: Simple split payment (30 total: 20 cash + 10 mpesa)
      results.push(`\n🔬 TEST CASE 1: Split Debt Payment`);
      results.push(`Creating split payment: 20 cash + 10 mpesa = 30 total`);

      const splitPayments = [
        {
          user_id: user.id,
          customer_id: testCustomer.id,
          customer_name: testCustomer.name,
          amount: 20,
          payment_method: 'cash',
          reference: 'test_split_cash',
          timestamp: new Date().toISOString(),
        },
        {
          user_id: user.id,
          customer_id: testCustomer.id,
          customer_name: testCustomer.name,
          amount: 10,
          payment_method: 'mpesa',
          reference: 'test_split_mpesa',
          timestamp: new Date().toISOString(),
        }
      ];

      // Record the payments
      await createMultipleDebtPayments(splitPayments);
      results.push(`✅ Split payments recorded in debt_payments table`);

      // Manually update customer debt (simulating the CustomersPage logic)
      const totalPaymentAmount = 30;
      const newDebt = Math.max(0, testCustomer.outstandingDebt - totalPaymentAmount);
      
      results.push(`📝 Updating customer debt: ${formatCurrency(testCustomer.outstandingDebt)} - ${formatCurrency(totalPaymentAmount)} = ${formatCurrency(newDebt)}`);
      
      await updateCustomer(testCustomer.id, {
        outstandingDebt: newDebt
      });

      // Wait for database to process
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Check final state
      const { data: finalDbCustomer } = await supabase
        .from('customers')
        .select('outstanding_debt, total_purchases')
        .eq('id', testCustomer.id)
        .single();

      if (finalDbCustomer) {
        results.push(`\n📊 FINAL RESULTS:`);
        results.push(`💾 DB final debt: ${formatCurrency(finalDbCustomer.outstanding_debt || 0)}`);
        results.push(`💾 Expected debt: ${formatCurrency(newDebt)}`);
        
        const debtDifference = Math.abs((finalDbCustomer.outstanding_debt || 0) - newDebt);
        if (debtDifference < 0.01) {
          results.push(`✅ SUCCESS: Debt matches expected amount`);
        } else {
          results.push(`❌ FAILURE: Debt mismatch - difference: ${formatCurrency(debtDifference)}`);
        }
      }

      // Check debt payments table
      const { data: debtPayments } = await supabase
        .from('debt_payments')
        .select('amount, payment_method, reference')
        .eq('customer_id', testCustomer.id)
        .ilike('reference', 'test_split_%');

      if (debtPayments) {
        results.push(`\n💳 DEBT PAYMENTS RECORDED:`);
        let totalRecorded = 0;
        debtPayments.forEach(payment => {
          results.push(`  ${payment.payment_method}: ${formatCurrency(payment.amount)} (${payment.reference})`);
          totalRecorded += payment.amount;
        });
        results.push(`💰 Total payments recorded: ${formatCurrency(totalRecorded)}`);
        results.push(`💰 Expected total: ${formatCurrency(totalPaymentAmount)}`);
        
        if (Math.abs(totalRecorded - totalPaymentAmount) < 0.01) {
          results.push(`✅ Payment amounts are correct`);
        } else {
          results.push(`❌ Payment amounts are wrong - difference: ${formatCurrency(Math.abs(totalRecorded - totalPaymentAmount))}`);
        }
      }

    } catch (error) {
      results.push(`❌ ERROR: ${error instanceof Error ? error.message : 'Unknown error'}`);
      console.error('Deep debt test error:', error);
    } finally {
      setDebugResults(results);
      setTesting(false);
    }
  };

  const clearTestData = async () => {
    if (!user || customers.length === 0) return;
    
    try {
      const testCustomer = customers[0];
      
      // Delete test payments
      await supabase
        .from('debt_payments')
        .delete()
        .eq('customer_id', testCustomer.id)
        .ilike('reference', 'test_split_%');
        
      toast({
        title: "Test Data Cleared",
        description: "Removed test debt payments from database",
      });
      
      setDebugResults([]);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to clear test data",
        variant: "destructive"
      });
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Deep Split Payment Debt Analysis</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          This test analyzes the exact flow of split payment debt recording to identify doubling issues.
        </p>
        
        <div className="flex gap-2">
          <Button 
            onClick={runDeepDebtTest} 
            disabled={testing || !user || customers.length === 0}
            className="flex-1"
          >
            {testing ? 'Running Deep Analysis...' : 'Run Deep Debt Test'}
          </Button>
          
          <Button 
            onClick={clearTestData} 
            variant="outline"
            disabled={testing || !user || customers.length === 0}
          >
            Clear Test Data
          </Button>
        </div>

        {debugResults.length > 0 && (
          <div className="mt-4 p-4 bg-muted rounded-lg">
            <h3 className="font-medium mb-2">Deep Analysis Results:</h3>
            <div className="text-sm space-y-1 max-h-96 overflow-y-auto">
              {debugResults.map((result, index) => (
                <div key={index} className={`font-mono ${
                  result.includes('SUCCESS') || result.includes('✅') ? 'text-green-600' : 
                  result.includes('FAILURE') || result.includes('❌') ? 'text-red-600' : 
                  result.includes('🧪') || result.includes('🔬') ? 'text-blue-600 font-bold' :
                  result.includes('📊') || result.includes('💾') ? 'text-purple-600' :
                  ''
                }`}>
                  {result}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="text-xs text-muted-foreground">
          <p>Available customers: {customers.length}</p>
          <p>User authenticated: {user ? 'Yes' : 'No'}</p>
          <p>This test simulates the exact CustomersPage split payment logic</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default SplitPaymentDebtTest;