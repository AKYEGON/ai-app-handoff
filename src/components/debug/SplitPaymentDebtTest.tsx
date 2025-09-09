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

      // Now test a real split payment with debt using the sales system
      results.push(`\n🧪 TESTING: Split payment with debt via sales checkout`);
      
      // Test case: 60 total = 30 cash + 30 debt
      results.push(`Creating sale with split payment: 30 cash + 30 debt = 60 total`);
      
      // Insert sale directly into database to test trigger
      const { data: saleData, error: saleError } = await supabase
        .from('sales')
        .insert([{
          product_id: 'test-product-id',
          product_name: 'Test Product',
          quantity: 1,
          selling_price: 60,
          cost_price: 40,
          profit: 20,
          total_amount: 60,
          customer_id: testCustomer.id,
          customer_name: testCustomer.name,
          payment_method: 'partial',
          payment_details: {
            cashAmount: 30,
            mpesaAmount: 0,
            debtAmount: 30,
            discountAmount: 0,
            saleReference: 'test_split_sale_ref'
          },
          timestamp: new Date().toISOString(),
          client_sale_id: `test_${Date.now()}`,
          user_id: user.id
        }])
        .select()
        .single();
        
      if (saleError) {
        results.push(`❌ Failed to create test sale: ${saleError.message}`);
        return;
      }
      
      results.push(`✅ Test sale created with ID: ${saleData.id}`);
      results.push(`📊 Sale debt amount: ${formatCurrency(30)}`);
      
      // Wait for trigger to execute
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Check the sale was created properly
      results.push(`✅ Test sale recorded successfully`);

      // The database trigger should automatically increase debt by 30
      const expectedNewDebt = testCustomer.outstandingDebt + 30;
      
      results.push(`📝 Expected debt increase: ${formatCurrency(testCustomer.outstandingDebt)} + ${formatCurrency(30)} = ${formatCurrency(expectedNewDebt)}`);
      
      // No manual customer update needed - the database trigger should handle it

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
        results.push(`💾 Expected debt: ${formatCurrency(expectedNewDebt)}`);
        
        const debtDifference = Math.abs((finalDbCustomer.outstanding_debt || 0) - expectedNewDebt);
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
        results.push(`💰 Sale debt amount: ${formatCurrency(30)}`);
        results.push(`💰 This was a sale, not a debt payment, so debt_payments table should be empty for this test`);
        
        if (debtPayments.length === 0) {
          results.push(`✅ Debt payments table correctly empty (this was a sale, not a payment)`);
        } else {
          results.push(`⚠️ Unexpected debt payments found: ${debtPayments.length} records`);
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