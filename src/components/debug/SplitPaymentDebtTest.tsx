import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useUnifiedCustomers } from '@/hooks/useUnifiedCustomers';
import { useUnifiedSales } from '@/hooks/useUnifiedSales';
import { formatCurrency } from '@/utils/currency';
import { useToast } from '@/hooks/use-toast';
import { createSplitPaymentSales, generateSplitPaymentReference } from '@/utils/splitPaymentUtils';
import { useAuth } from '@/hooks/useAuth';

/**
 * Test component to verify split payment debt handling is working correctly
 * This component creates test sales with split payments that include debt
 * and verifies that customer debt is only increased once (not doubled)
 */
export const SplitPaymentDebtTest: React.FC = () => {
  const { customers, updateCustomer } = useUnifiedCustomers();
  const { createSale } = useUnifiedSales();
  const { user } = useAuth();
  const { toast } = useToast();
  const [testing, setTesting] = useState(false);
  const [testResults, setTestResults] = useState<string[]>([]);

  const runTest = async () => {
    if (!user || customers.length === 0) {
      toast({
        title: "Test Requirements Not Met",
        description: "Need authenticated user and at least one customer to run test",
        variant: "destructive"
      });
      return;
    }

    setTesting(true);
    setTestResults([]);
    const results: string[] = [];

    try {
      // Get a test customer
      const testCustomer = customers[0];
      const initialDebt = testCustomer.outstandingDebt;
      results.push(`Initial customer debt: ${formatCurrency(initialDebt)}`);

      // Create a split payment scenario: 100 total, 60 cash + 40 debt
      const testTotal = 100;
      const debtAmount = 40;
      const cashAmount = 60;

      const splitPaymentGroup = {
        reference: generateSplitPaymentReference(),
        payments: [
          { method: 'cash' as const, amount: cashAmount },
          { method: 'debt' as const, amount: debtAmount }
        ],
        totalAmount: testTotal,
        productId: 'test-product-id',
        productName: 'Test Product',
        quantity: 1,
        sellingPrice: testTotal,
        costPrice: 50,
        customerId: testCustomer.id,
        customerName: testCustomer.name
      };

      results.push(`Creating split payment: ${formatCurrency(cashAmount)} cash + ${formatCurrency(debtAmount)} debt`);

      // Create split payment sales using the utility function
      const splitSales = createSplitPaymentSales(user.id, splitPaymentGroup);
      results.push(`Generated ${splitSales.length} sale records from split payment`);

      // Create each sale record
      for (const saleData of splitSales) {
        const saleWithTimestamp = {
          ...saleData,
          timestamp: new Date().toISOString()
        };
        await createSale(saleWithTimestamp);
        results.push(`Created sale record: ${saleData.paymentMethod} - ${formatCurrency(saleData.total)}`);
      }

      // Wait a moment for database trigger to execute
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Refresh customer data to get updated debt
      const updatedCustomers = await new Promise<any[]>((resolve) => {
        const timer = setTimeout(() => {
          resolve(customers);
        }, 1000);
        
        // Listen for customer refresh
        const handler = () => {
          clearTimeout(timer);
          resolve(customers);
        };
        window.addEventListener('customers-refreshed', handler, { once: true });
        
        // Trigger refresh
        window.dispatchEvent(new CustomEvent('sale-completed'));
      });

      const updatedCustomer = updatedCustomers.find(c => c.id === testCustomer.id);
      const finalDebt = updatedCustomer?.outstandingDebt || initialDebt;
      const debtIncrease = finalDebt - initialDebt;

      results.push(`Final customer debt: ${formatCurrency(finalDebt)}`);
      results.push(`Debt increase: ${formatCurrency(debtIncrease)}`);

      // Check if debt was increased correctly (should be exactly the debt amount, not doubled)
      if (Math.abs(debtIncrease - debtAmount) < 0.01) {
        results.push("✅ SUCCESS: Debt increased by correct amount (no doubling)");
        toast({
          title: "Test Passed",
          description: "Split payment debt handling is working correctly!",
        });
      } else {
        results.push("❌ FAILURE: Debt increase doesn't match expected amount");
        results.push(`Expected: ${formatCurrency(debtAmount)}, Actual: ${formatCurrency(debtIncrease)}`);
        toast({
          title: "Test Failed",
          description: "Split payment debt handling has issues",
          variant: "destructive"
        });
      }

    } catch (error) {
      results.push(`❌ ERROR: ${error instanceof Error ? error.message : 'Unknown error'}`);
      toast({
        title: "Test Error",
        description: "Test failed with error",
        variant: "destructive"
      });
    } finally {
      setTestResults(results);
      setTesting(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Split Payment Debt Test</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          This test verifies that split payments with debt components only increase customer debt once, not twice.
        </p>
        
        <Button 
          onClick={runTest} 
          disabled={testing || !user || customers.length === 0}
          className="w-full"
        >
          {testing ? 'Running Test...' : 'Run Split Payment Debt Test'}
        </Button>

        {testResults.length > 0 && (
          <div className="mt-4 p-4 bg-muted rounded-lg">
            <h3 className="font-medium mb-2">Test Results:</h3>
            <div className="text-sm space-y-1">
              {testResults.map((result, index) => (
                <div key={index} className={`
                  ${result.includes('SUCCESS') ? 'text-green-600' : ''}
                  ${result.includes('FAILURE') || result.includes('ERROR') ? 'text-red-600' : ''}
                `}>
                  {result}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="text-xs text-muted-foreground">
          <p>Available customers: {customers.length}</p>
          <p>User authenticated: {user ? 'Yes' : 'No'}</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default SplitPaymentDebtTest;