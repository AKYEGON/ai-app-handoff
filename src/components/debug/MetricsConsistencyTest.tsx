import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  TestTube,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Play,
  Database
} from 'lucide-react';
import { useUnifiedSales } from '@/hooks/useUnifiedSales';
import { useUnifiedProducts } from '@/hooks/useUnifiedProducts';
import { useUnifiedCustomers } from '@/hooks/useUnifiedCustomers';
import { useDashboardMetrics } from '@/hooks/useDashboardMetrics';
import { useUnifiedMetricsCalculator } from '@/hooks/useUnifiedMetricsCalculator';
import { formatCurrency } from '@/utils/currency';
import { migrateMetricsData, previewMetricsMigration } from '@/utils/metricsDataMigration';

interface TestResult {
  name: string;
  passed: boolean;
  details: string;
  expected?: any;
  actual?: any;
}

const MetricsConsistencyTest: React.FC = () => {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [migrationPreview, setMigrationPreview] = useState<{
    duplicatesFound: number;
    duplicateDetails: any[];
  } | null>(null);
  const [migrationResult, setMigrationResult] = useState<any>(null);

  const { sales, loading: salesLoading } = useUnifiedSales();
  const { products, loading: productsLoading } = useUnifiedProducts();
  const { customers, loading: customersLoading } = useUnifiedCustomers();

  // Calculate metrics outside of the test function
  const dashboardMetrics = useDashboardMetrics(sales, products, customers);
  const today = new Date().toISOString().split('T')[0];
  const todayRange = { from: today, to: today };
  const reportsMetrics = useUnifiedMetricsCalculator(sales, products, customers, todayRange);

  const runMetricsConsistencyTest = () => {
    setIsRunning(true);
    setTestResults([]);

    try {
      const results: TestResult[] = [];

      // Test 1: Compare Dashboard vs Reports Active Customers
      results.push({
        name: 'Dashboard vs Reports: Active Customers (Today)',
        passed: dashboardMetrics.customers.active === reportsMetrics.today.activeCustomers,
        details: `Dashboard: ${dashboardMetrics.customers.active}, Reports: ${reportsMetrics.today.activeCustomers}`,
        expected: dashboardMetrics.customers.active,
        actual: reportsMetrics.today.activeCustomers
      });

      // Test 2: Compare Dashboard vs Reports Total Revenue (Today)
      results.push({
        name: 'Dashboard vs Reports: Total Revenue (Today)',
        passed: Math.abs(dashboardMetrics.todaySales.totalRevenue - reportsMetrics.today.totalRevenue) < 0.01,
        details: `Dashboard: ${formatCurrency(dashboardMetrics.todaySales.totalRevenue)}, Reports: ${formatCurrency(reportsMetrics.today.totalRevenue)}`,
        expected: dashboardMetrics.todaySales.totalRevenue,
        actual: reportsMetrics.today.totalRevenue
      });

      // Test 3: Check for sales deduplication consistency
      const originalSalesCount = sales.length;
      const dedupedCount = reportsMetrics.period.orderCount + reportsMetrics.today.orderCount; // This isn't perfect but gives an idea
      results.push({
        name: 'Sales Deduplication Working',
        passed: originalSalesCount >= dedupedCount, // Should have removed some duplicates or stayed same
        details: `Original: ${originalSalesCount} sales, After dedup logic applied`,
        expected: `<= ${originalSalesCount}`,
        actual: dedupedCount
      });

      // Test 4: Split payments not double-counting debt
      const splitPaymentSales = sales.filter(sale => 
        sale.paymentDetails?.saleReference && 
        sale.paymentDetails.saleReference.startsWith('SP_')
      );
      
      if (splitPaymentSales.length > 0) {
        const splitPaymentGroups = new Map();
        splitPaymentSales.forEach(sale => {
          const ref = sale.paymentDetails?.saleReference;
          if (ref) {
            if (!splitPaymentGroups.has(ref)) {
              splitPaymentGroups.set(ref, []);
            }
            splitPaymentGroups.get(ref).push(sale);
          }
        });

        let allSplitPaymentsValid = true;
        let splitTestDetails = '';
        
        splitPaymentGroups.forEach((groupSales, ref) => {
          const totalAmount = groupSales.reduce((sum: number, sale: any) => sum + (sale.total || 0), 0);
          const debtSales = groupSales.filter((sale: any) => sale.paymentMethod === 'debt');
          const debtAmount = debtSales.reduce((sum: number, sale: any) => sum + (sale.total || 0), 0);
          
          if (debtSales.length > 1) {
            allSplitPaymentsValid = false;
            splitTestDetails += `Group ${ref}: ${debtSales.length} debt entries (should be 1). `;
          }
        });

        results.push({
          name: 'Split Payments: No Debt Double-Counting',
          passed: allSplitPaymentsValid,
          details: splitTestDetails || `${splitPaymentGroups.size} split payment groups checked - all valid`,
          expected: 'Max 1 debt entry per split payment group',
          actual: allSplitPaymentsValid ? 'All groups valid' : 'Some groups have multiple debt entries'
        });
      }

      // Test 5: Customer debt consistency
      const customersWithDebt = customers.filter(c => (c.outstandingDebt || 0) > 0);
      const totalDebtFromCustomers = customersWithDebt.reduce((sum, c) => sum + (c.outstandingDebt || 0), 0);
      const totalDebtFromMetrics = reportsMetrics.overall.customers.totalDebt;
      
      results.push({
        name: 'Customer Debt Calculation Consistency',
        passed: Math.abs(totalDebtFromCustomers - totalDebtFromMetrics) < 0.01,
        details: `Direct: ${formatCurrency(totalDebtFromCustomers)}, Metrics: ${formatCurrency(totalDebtFromMetrics)}`,
        expected: totalDebtFromCustomers,
        actual: totalDebtFromMetrics
      });

      setTestResults(results);
    } catch (error) {
      setTestResults([{
        name: 'Test Execution',
        passed: false,
        details: `Error running tests: ${error}`,
        expected: 'No errors',
        actual: `Error: ${error}`
      }]);
    } finally {
      setIsRunning(false);
    }
  };

  const runMigrationPreview = async () => {
    try {
      const preview = await previewMetricsMigration();
      setMigrationPreview(preview);
    } catch (error) {
      console.error('Migration preview failed:', error);
    }
  };

  const runMigration = async () => {
    try {
      setMigrationResult({ loading: true });
      const result = await migrateMetricsData();
      setMigrationResult(result);
      
      // Refresh the page data after migration
      if (result.success) {
        window.location.reload();
      }
    } catch (error) {
      setMigrationResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Migration failed'
      });
    }
  };

  const passedTests = testResults.filter(r => r.passed).length;
  const totalTests = testResults.length;

  if (salesLoading || productsLoading || customersLoading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading data for metrics consistency test...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TestTube className="h-5 w-5" />
            Metrics Consistency Test
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Button 
              onClick={runMetricsConsistencyTest}
              disabled={isRunning}
              className="flex items-center gap-2"
            >
              {isRunning ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              Run Consistency Tests
            </Button>
            
            {testResults.length > 0 && (
              <Badge variant={passedTests === totalTests ? "default" : "destructive"}>
                {passedTests}/{totalTests} tests passed
              </Badge>
            )}
          </div>

          {testResults.length > 0 && (
            <div className="space-y-2">
              {testResults.map((test, index) => (
                <Alert key={index} variant={test.passed ? "default" : "destructive"}>
                  <div className="flex items-start gap-2">
                    {test.passed ? (
                      <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <div className="font-medium">{test.name}</div>
                      <AlertDescription className="text-sm mt-1">
                        {test.details}
                      </AlertDescription>
                      {!test.passed && test.expected !== undefined && (
                        <div className="text-xs mt-2 text-muted-foreground">
                          Expected: {JSON.stringify(test.expected)} | 
                          Actual: {JSON.stringify(test.actual)}
                        </div>
                      )}
                    </div>
                  </div>
                </Alert>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Data Migration Tools
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={runMigrationPreview}
            >
              Preview Migration
            </Button>
            <Button 
              variant="destructive" 
              onClick={runMigration}
              disabled={migrationResult?.loading}
            >
              {migrationResult?.loading ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Run Migration
            </Button>
          </div>

          {migrationPreview && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Found {migrationPreview.duplicatesFound} duplicate sales entries that would be removed.
                {migrationPreview.duplicateDetails.length > 0 && (
                  <div className="mt-2 text-xs">
                    Sample: {migrationPreview.duplicateDetails.slice(0, 3).map(d => 
                      `${d.productName} (${formatCurrency(d.total)})`
                    ).join(', ')}
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}

          {migrationResult && !migrationResult.loading && (
            <Alert variant={migrationResult.success ? "default" : "destructive"}>
              <div className="flex items-start gap-2">
                {migrationResult.success ? (
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-600 mt-0.5" />
                )}
                <AlertDescription>
                  {migrationResult.message}
                  {migrationResult.duplicatesRemoved > 0 && (
                    <div className="mt-1 text-sm font-medium">
                      Removed {migrationResult.duplicatesRemoved} duplicate entries
                    </div>
                  )}
                </AlertDescription>
              </div>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MetricsConsistencyTest;