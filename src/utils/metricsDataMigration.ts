import { supabase } from '@/integrations/supabase/client';
import { Sale } from '@/types';
import { dedupeSalesForReporting } from './salesDedupe';

interface MigrationResult {
  success: boolean;
  duplicatesRemoved?: number;
  error?: string;
  message: string;
}

/**
 * Safe migration script to clean up historical reporting data
 * Removes duplicate sales entries that may cause inflated metrics
 */
export const migrateMetricsData = async (): Promise<MigrationResult> => {
  try {
    console.log('[MetricsMigration] Starting data migration...');
    
    // 1. Fetch all sales for the current user
    const { data: allSales, error: fetchError } = await supabase
      .from('sales')
      .select('*')
      .order('timestamp', { ascending: false });
      
    if (fetchError) {
      return {
        success: false,
        error: fetchError.message,
        message: 'Failed to fetch sales data for migration'
      };
    }

    if (!allSales || allSales.length === 0) {
      return {
        success: true,
        message: 'No sales data found - migration not needed'
      };
    }

    console.log(`[MetricsMigration] Found ${allSales.length} sales records`);

    // 2. Map database records to Sale interface and apply deduplication
    const mappedSales: Sale[] = allSales.map(sale => ({
      id: sale.id,
      productId: sale.product_id,
      productName: sale.product_name,
      quantity: sale.quantity,
      sellingPrice: sale.selling_price,
      costPrice: sale.cost_price,
      profit: sale.profit,
      total: sale.total_amount,
      customerId: sale.customer_id,
      customerName: sale.customer_name,
      paymentMethod: sale.payment_method as "cash" | "mpesa" | "debt" | "partial" | "split",
      paymentDetails: sale.payment_details as any,
      timestamp: sale.timestamp,
      clientSaleId: sale.client_sale_id,
      offlineId: sale.offline_id,
      synced: sale.synced
    }));
    
    const dedupedSales = dedupeSalesForReporting(mappedSales);
    const duplicatesCount = allSales.length - dedupedSales.length;

    if (duplicatesCount === 0) {
      return {
        success: true,
        duplicatesRemoved: 0,
        message: 'No duplicate sales found - data is already clean'
      };
    }

    console.log(`[MetricsMigration] Found ${duplicatesCount} duplicate sales to clean up`);

    // 3. Get IDs of sales to keep (deduplicated ones)
    const validSaleIds = new Set(dedupedSales.map(sale => sale.id));
    
    // 4. Find duplicate sales to remove (those not in the deduplicated set)
    const duplicatesToRemove = allSales.filter(sale => !validSaleIds.has(sale.id));

    // 5. Create backup before deletion (store in a temp table or log)
    console.log('[MetricsMigration] Creating backup of duplicates...');
    const backupData = {
      timestamp: new Date().toISOString(),
      removed_count: duplicatesToRemove.length,
      duplicate_sales: duplicatesToRemove.map(sale => ({
        id: sale.id,
        product_name: sale.product_name,
        total_amount: sale.total_amount,
        timestamp: sale.timestamp,
        client_sale_id: sale.client_sale_id,
        offline_id: sale.offline_id
      }))
    };

    // Log the backup (in production, you might want to save this to a dedicated backup table)
    console.log('[MetricsMigration] Backup created:', JSON.stringify(backupData, null, 2));

    // 6. Remove duplicates in batches to avoid overwhelming the database
    const batchSize = 50;
    let removedCount = 0;
    
    for (let i = 0; i < duplicatesToRemove.length; i += batchSize) {
      const batch = duplicatesToRemove.slice(i, i + batchSize);
      const idsToDelete = batch.map(sale => sale.id);
      
      const { error: deleteError } = await supabase
        .from('sales')
        .delete()
        .in('id', idsToDelete);
        
      if (deleteError) {
        console.error(`[MetricsMigration] Failed to delete batch ${i}-${i + batch.length}:`, deleteError);
        return {
          success: false,
          error: deleteError.message,
          message: `Migration failed during deletion at batch ${i}-${i + batch.length}`
        };
      }
      
      removedCount += batch.length;
      console.log(`[MetricsMigration] Removed batch ${i}-${i + batch.length} (${removedCount}/${duplicatesToRemove.length})`);
    }

    console.log(`[MetricsMigration] Successfully removed ${removedCount} duplicate sales`);

    return {
      success: true,
      duplicatesRemoved: removedCount,
      message: `Migration completed successfully. Removed ${removedCount} duplicate sales entries.`
    };

  } catch (error) {
    console.error('[MetricsMigration] Unexpected error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Migration failed due to unexpected error'
    };
  }
};

/**
 * Dry run migration to preview what would be cleaned up without making changes
 */
export const previewMetricsMigration = async (): Promise<{
  duplicatesFound: number;
  duplicateDetails: Array<{
    id: string;
    productName: string;
    total: number;
    timestamp: string;
    reason: string;
  }>;
}> => {
  try {
    const { data: allSales } = await supabase
      .from('sales')
      .select('*')
      .order('timestamp', { ascending: false });
      
    if (!allSales) {
      return { duplicatesFound: 0, duplicateDetails: [] };
    }

    // Map database records to Sale interface
    const mappedSales: Sale[] = allSales.map(sale => ({
      id: sale.id,
      productId: sale.product_id,
      productName: sale.product_name,
      quantity: sale.quantity,
      sellingPrice: sale.selling_price,
      costPrice: sale.cost_price,
      profit: sale.profit,
      total: sale.total_amount,
      customerId: sale.customer_id,
      customerName: sale.customer_name,
      paymentMethod: sale.payment_method as "cash" | "mpesa" | "debt" | "partial" | "split",
      paymentDetails: sale.payment_details as any,
      timestamp: sale.timestamp,
      clientSaleId: sale.client_sale_id,
      offlineId: sale.offline_id,
      synced: sale.synced
    }));
    
    const dedupedSales = dedupeSalesForReporting(mappedSales);
    const validSaleIds = new Set(dedupedSales.map(sale => sale.id));
    
    const duplicates = allSales.filter(sale => !validSaleIds.has(sale.id));
    
    const duplicateDetails = duplicates.map(sale => ({
      id: sale.id,
      productName: sale.product_name,
      total: sale.total_amount,
      timestamp: sale.timestamp,
      reason: sale.synced ? 'Duplicate synced record' : 'Duplicate unsynced record'
    }));

    return {
      duplicatesFound: duplicates.length,
      duplicateDetails
    };
  } catch (error) {
    console.error('[MetricsMigration] Preview failed:', error);
    return { duplicatesFound: 0, duplicateDetails: [] };
  }
};
