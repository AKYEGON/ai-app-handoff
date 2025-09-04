import { supabase } from '@/integrations/supabase/client';

export interface PendingOperation {
  id: string;
  type: 'sale' | 'product' | 'customer' | 'transaction';
  operation: 'create' | 'update' | 'delete';
  data: any;
  timestamp?: string;
  attempts?: number;
}

export class SyncService {
  static async syncPendingOperations(operations: PendingOperation[], userId: string): Promise<boolean> {
    if (!operations.length) return true;

    console.log(`[SyncService] Starting enhanced sync of ${operations.length} operations`);
    const syncResults: { operation: PendingOperation; success: boolean; error?: any }[] = [];

    // Group operations by type and process in order
    const operationsByType = operations.reduce((acc, op) => {
      if (!acc[op.type]) acc[op.type] = [];
      acc[op.type].push(op);
      return acc;
    }, {} as Record<string, PendingOperation[]>);

    for (const [type, typeOperations] of Object.entries(operationsByType)) {
      console.log(`[SyncService] Processing ${typeOperations.length} ${type} operations`);
      
      // Sort operations by timestamp to maintain order
      const sortedOps = typeOperations.sort((a, b) => 
        new Date(a.timestamp || 0).getTime() - new Date(b.timestamp || 0).getTime()
      );

      for (const operation of sortedOps) {
        try {
          console.log(`[SyncService] Syncing ${operation.type} ${operation.operation}:`, operation.id);
          
          let success = false;
          switch (operation.type) {
            case 'product':
              success = await this.syncProductOperation(operation, userId);
              break;
            case 'customer':
              success = await this.syncCustomerOperation(operation, userId);
              break;
            case 'sale':
              success = await this.syncSaleOperation(operation, userId);
              break;
            case 'transaction':
              success = await this.syncTransactionOperation(operation, userId);
              break;
            default:
              console.warn('[SyncService] Unknown operation type:', operation.type);
              success = false;
          }
          
          syncResults.push({ operation, success });
          
          if (success) {
            console.log(`[SyncService] Successfully synced operation:`, operation.id);
          } else {
            console.error(`[SyncService] Failed to sync operation:`, operation.id);
          }
        } catch (error) {
          console.error(`[SyncService] Error syncing operation ${operation.id}:`, error);
          syncResults.push({ operation, success: false, error });
        }
      }
    }

    const allSuccess = syncResults.every(result => result.success);
    const successCount = syncResults.filter(result => result.success).length;
    
    console.log(`[SyncService] Enhanced sync completed: ${successCount}/${operations.length} successful`);

    if (allSuccess) {
      console.log('[SyncService] All operations synced successfully - dispatching enhanced events');
      
      // Dispatch comprehensive sync events
      const syncDetail = {
        totalOperations: operations.length,
        successfulOperations: successCount,
        operationTypes: [...new Set(operations.map(op => op.type))],
        timestamp: new Date().toISOString()
      };

      window.dispatchEvent(new CustomEvent('sync-completed', { detail: syncDetail }));
      window.dispatchEvent(new CustomEvent('data-synced', { detail: syncDetail }));
      
      // Dispatch type-specific events
      for (const type of syncDetail.operationTypes) {
        window.dispatchEvent(new CustomEvent(`${type}-synced`, { 
          detail: { 
            operationCount: operations.filter(op => op.type === type).length,
            timestamp: syncDetail.timestamp
          }
        }));
      }
      
      console.log('[SyncService] Enhanced events dispatched');
    }

    return allSuccess;
  }

  private static async syncProductOperation(operation: PendingOperation, userId: string): Promise<boolean> {
    const { data } = operation;
    
    try {
      switch (operation.operation) {
        case 'create':
          // Check for existing product to prevent duplicates
          const { data: existingProduct } = await supabase
            .from('products')
            .select('id')
            .eq('user_id', userId)
            .eq('name', data.name)
            .eq('category', data.category)
            .maybeSingle();

          if (existingProduct) {
            console.log('[SyncService] Product already exists, skipping create:', data.name);
            return true;
          }

          const { error: createError } = await supabase
            .from('products')
            .insert([{
              user_id: userId,
              name: data.name,
              category: data.category,
              cost_price: data.costPrice,
              selling_price: data.sellingPrice,
              current_stock: data.currentStock || 0,
              low_stock_threshold: data.lowStockThreshold || 10,
            }]);
          
          if (createError) {
            console.error('[SyncService] Product create error:', createError);
            return false;
          }
          return true;
          
        case 'update':
          if (!data.id || data.id.startsWith('temp_')) {
            console.warn('[SyncService] Cannot update product with temp ID:', data.id);
            return true; // Consider temp updates as successful to remove from queue
          }
          
          // Verify product exists
          const { data: productExists } = await supabase
            .from('products')
            .select('id')
            .eq('id', data.id)
            .eq('user_id', userId)
            .maybeSingle();
            
          if (!productExists) {
            console.warn('[SyncService] Product not found for update:', data.id);
            return true; // Remove from queue since product doesn't exist
          }
          
          const updateData: any = {};
          const updates = data.updates || data;
          
          if (updates.name !== undefined) updateData.name = updates.name;
          if (updates.category !== undefined) updateData.category = updates.category;
          if (updates.costPrice !== undefined) updateData.cost_price = updates.costPrice;
          if (updates.sellingPrice !== undefined) updateData.selling_price = updates.sellingPrice;
          if (updates.currentStock !== undefined) updateData.current_stock = updates.currentStock;
          if (updates.lowStockThreshold !== undefined) updateData.low_stock_threshold = updates.lowStockThreshold;
          
          updateData.updated_at = new Date().toISOString();
          
          console.log('[SyncService] Updating product with data:', { id: data.id, updateData });
          
          const { error: updateError, data: updatedProduct } = await supabase
            .from('products')
            .update(updateData)
            .eq('id', data.id)
            .eq('user_id', userId)
            .select()
            .single();
            
          if (updateError) {
            console.error('[SyncService] Product update error:', updateError);
            return false;
          }
          
          console.log('[SyncService] Product updated successfully:', updatedProduct);
          return true;
          
        case 'delete':
          if (!data.id || data.id.startsWith('temp_')) {
            console.warn('[SyncService] Cannot delete product with temp ID:', data.id);
            return true; // Consider temp deletes as successful
          }
          
          const { error: deleteError } = await supabase
            .from('products')
            .delete()
            .eq('id', data.id)
            .eq('user_id', userId);
            
          if (deleteError) {
            console.error('[SyncService] Product delete error:', deleteError);
            return false;
          }
          return true;
          
        default:
          console.warn(`[SyncService] Unsupported product operation: ${operation.operation}`);
          return false;
      }
    } catch (error) {
      console.error('[SyncService] Product operation error:', error);
      return false;
    }
  }

  private static async syncSaleOperation(operation: PendingOperation, userId: string): Promise<boolean> {
    const { data } = operation;
    
    try {
      switch (operation.operation) {
        case 'create':
          // Idempotency: if a sale with this clientSaleId and product already exists, skip
          if (data.clientSaleId) {
            const { data: existing } = await supabase
              .from('sales')
              .select('id')
              .eq('user_id', userId)
              .eq('client_sale_id', data.clientSaleId)
              .eq('product_id', data.productId)
              .maybeSingle();
            if (existing) {
              console.log('[SyncService] Duplicate sale detected, skipping insert:', data.clientSaleId, data.productId);
              return true;
            }
          }

          const { error: saleError } = await supabase
            .from('sales')
            .insert([{
              user_id: userId,
              product_id: data.productId,
              product_name: data.productName,
              customer_id: data.customerId,
              customer_name: data.customerName,
              quantity: data.quantity,
              selling_price: data.sellingPrice,
              cost_price: data.costPrice,
              profit: data.profit,
              total_amount: data.total,
              payment_method: data.paymentMethod,
              payment_details: data.paymentDetails,
              timestamp: data.timestamp || new Date().toISOString(),
              synced: true,
              client_sale_id: data.clientSaleId || null,
              offline_id: data.offlineId || null,
            }]);
          return !saleError;
        default:
          console.warn(`[SyncService] Unsupported sale operation: ${operation.operation}`);
          return false;
      }
    } catch (error) {
      console.error('[SyncService] Sale operation error:', error);
      return false;
    }
  }

  private static async syncCustomerOperation(operation: PendingOperation, userId: string): Promise<boolean> {
    const { data } = operation;
    console.log('[SyncService] Syncing customer operation:', operation.operation, data);
    
    try {
      switch (operation.operation) {
        case 'create':
          // Check if customer already exists to prevent duplicates
          const { data: existingCustomer } = await supabase
            .from('customers')
            .select('id')
            .eq('user_id', userId)
            .eq('name', data.name)
            .eq('phone', data.phone)
            .maybeSingle();

          if (existingCustomer) {
            console.log('[SyncService] Customer already exists, skipping creation:', data.name);
            return true;
          }

          const { error: createError } = await supabase
            .from('customers')
            .insert([{
              user_id: userId,
              name: data.name,
              phone: data.phone,
              email: data.email,
              address: data.address,
              total_purchases: data.totalPurchases || 0,
              outstanding_debt: data.outstandingDebt || 0,
              credit_limit: data.creditLimit || 1000,
              risk_rating: data.riskRating || 'low',
              last_purchase_date: data.lastPurchaseDate,
            }]);
            
          if (createError) {
            console.error('[SyncService] Customer create error:', createError);
            return false;
          }
          console.log('[SyncService] Customer created successfully');
          return true;
          
        case 'update':
          if (!data.id || data.id.startsWith('temp_')) {
            console.warn('[SyncService] Cannot update customer with temp ID:', data.id);
            return true;
          }
          
          console.log('[SyncService] Updating customer:', data.id, 'with updates:', data.updates);
          
          // First, verify the customer exists
          const { data: customerExists } = await supabase
            .from('customers')
            .select('id, outstanding_debt, total_purchases')
            .eq('id', data.id)
            .eq('user_id', userId)
            .maybeSingle();
            
          if (!customerExists) {
            console.error('[SyncService] Customer not found for update:', data.id);
            return true; // Remove from queue since customer doesn't exist
          }
          
          console.log('[SyncService] Current customer data before update:', customerExists);
          
          const updateData: any = {};
          const updates = data.updates || data;
          
          if (updates.name !== undefined) updateData.name = updates.name;
          if (updates.phone !== undefined) updateData.phone = updates.phone;
          if (updates.email !== undefined) updateData.email = updates.email;
          if (updates.address !== undefined) updateData.address = updates.address;
          if (updates.totalPurchases !== undefined) updateData.total_purchases = updates.totalPurchases;
          if (updates.outstandingDebt !== undefined) updateData.outstanding_debt = updates.outstandingDebt;
          if (updates.creditLimit !== undefined) updateData.credit_limit = updates.creditLimit;
          if (updates.riskRating !== undefined) updateData.risk_rating = updates.riskRating;
          if (updates.lastPurchaseDate !== undefined) updateData.last_purchase_date = updates.lastPurchaseDate;
          
          updateData.updated_at = new Date().toISOString();
          
          console.log('[SyncService] Preparing to update customer with data:', updateData);
          
          const { error: updateError, data: updatedCustomer } = await supabase
            .from('customers')
            .update(updateData)
            .eq('id', data.id)
            .eq('user_id', userId)
            .select()
            .single();
            
          if (updateError) {
            console.error('[SyncService] Customer update error:', updateError);
            return false;
          }
          
          console.log('[SyncService] Customer updated successfully in database:', updatedCustomer);
          return true;
          
        default:
          console.warn(`[SyncService] Unsupported customer operation: ${operation.operation}`);
          return false;
      }
    } catch (error) {
      console.error('[SyncService] Customer operation error:', error);
      return false;
    }
  }

  private static async syncTransactionOperation(operation: PendingOperation, userId: string): Promise<boolean> {
    const { data } = operation;
    
    try {
      switch (operation.operation) {
        case 'create':
          const { error: createError } = await supabase
            .from('transactions')
            .insert([{
              user_id: userId,
              ...data,
            }]);
          return !createError;
          
        case 'update':
          if (!data.id || data.id.startsWith('temp_')) {
            console.warn('[SyncService] Cannot update transaction with temp ID:', data.id);
            return true;
          }
          
          const { error: updateError } = await supabase
            .from('transactions')
            .update(data.updates)
            .eq('id', data.id)
            .eq('user_id', userId);
          return !updateError;
          
        default:
          console.warn(`[SyncService] Unsupported transaction operation: ${operation.operation}`);
          return false;
      }
    } catch (error) {
      console.error('[SyncService] Transaction operation error:', error);
      return false;
    }
  }
}
