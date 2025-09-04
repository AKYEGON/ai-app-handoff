import { supabase } from '@/integrations/supabase/client';
import { Sale } from '../types';
import { generateSplitPaymentReference, createSplitPaymentSales, validateSplitPayment, SplitPaymentGroup } from '../utils/splitPaymentUtils';

export interface CreateSaleRequest {
  productId: string;
  productName: string;
  quantity: number;
  sellingPrice: number;
  costPrice: number;
  customerId?: string;
  customerName?: string;
  paymentMethod: 'cash' | 'mpesa' | 'debt' | 'partial' | 'split';
  paymentDetails: {
    cashAmount: number;
    mpesaAmount: number;
    debtAmount: number;
    mpesaReference?: string;
    tillNumber?: string;
    discountAmount?: number;
  };
}

// Helper function to safely parse payment details from Supabase
const parsePaymentDetails = (details: any) => {
  try {
    // If it's already an object, use it directly
    if (typeof details === 'object' && details !== null) {
      return {
        cashAmount: Number(details.cashAmount || 0),
        mpesaAmount: Number(details.mpesaAmount || 0),
        debtAmount: Number(details.debtAmount || 0),
        mpesaReference: details.mpesaReference || undefined,
        tillNumber: details.tillNumber || undefined,
        discountAmount: Number(details.discountAmount || 0),
      };
    }
    
    // If it's a string, try to parse it as JSON
    if (typeof details === 'string') {
      const parsed = JSON.parse(details);
      return {
        cashAmount: Number(parsed.cashAmount || 0),
        mpesaAmount: Number(parsed.mpesaAmount || 0),
        debtAmount: Number(parsed.debtAmount || 0),
        mpesaReference: parsed.mpesaReference || undefined,
        tillNumber: parsed.tillNumber || undefined,
        discountAmount: Number(parsed.discountAmount || 0),
      };
    }
    
    // Fallback to default values
    return {
      cashAmount: 0,
      mpesaAmount: 0,
      debtAmount: 0,
    };
  } catch (error) {
    console.error('[SalesService] Error parsing payment details:', error);
    return {
      cashAmount: 0,
      mpesaAmount: 0,
      debtAmount: 0,
    };
  }
};

export class SalesService {
  static async createSplitPaymentSale(userId: string, splitGroup: SplitPaymentGroup): Promise<Sale[]> {
    console.log('[SalesService] Creating split payment sale:', splitGroup);

    try {
      // Validate the split payment
      const validation = validateSplitPayment(splitGroup.totalAmount, splitGroup.payments);
      if (!validation.isValid) {
        throw new Error(validation.error);
      }

      // Create individual sale records for each payment method
      const saleRecords = createSplitPaymentSales(userId, splitGroup);
      const createdSales: Sale[] = [];

      for (const saleRecord of saleRecords) {
        const dbRecord = {
          user_id: userId,
          product_id: saleRecord.productId,
          product_name: saleRecord.productName,
          quantity: saleRecord.quantity,
          selling_price: saleRecord.sellingPrice,
          cost_price: saleRecord.costPrice,
          profit: saleRecord.profit,
          total_amount: saleRecord.total,
          customer_id: saleRecord.customerId || null,
          customer_name: saleRecord.customerName || null,
          payment_method: saleRecord.paymentMethod,
          payment_details: saleRecord.paymentDetails,
          timestamp: new Date().toISOString(),
          synced: true,
          client_sale_id: saleRecord.clientSaleId,
          offline_id: saleRecord.offlineId,
        };

        const { data, error } = await supabase
          .from('sales')
          .insert([dbRecord])
          .select()
          .single();

        if (error) {
          console.error('[SalesService] Database error for split payment:', error);
          throw new Error(`Failed to create split payment sale: ${error.message}`);
        }

        if (!data) {
          throw new Error('Split payment sale was created but no data returned');
        }

        // Transform the response to match our Sale interface
        const sale: Sale = {
          id: data.id,
          productId: data.product_id,
          productName: data.product_name,
          quantity: data.quantity,
          sellingPrice: data.selling_price,
          costPrice: data.cost_price,
          profit: data.profit,
          timestamp: data.timestamp,
          synced: data.synced || true,
          customerId: data.customer_id,
          customerName: data.customer_name,
          paymentMethod: data.payment_method as 'cash' | 'mpesa' | 'debt' | 'partial' | 'split',
          paymentDetails: parsePaymentDetails(data.payment_details),
          total: data.total_amount,
          clientSaleId: data.client_sale_id,
          offlineId: data.offline_id,
        };

        createdSales.push(sale);
      }

      console.log('[SalesService] Split payment sales created successfully:', createdSales.length);

      // Update stock only once for the total quantity (avoid duplicate stock deductions)
      if (splitGroup.quantity > 0) {
        await this.updateProductStock(splitGroup.productId, splitGroup.quantity);
      }

      // Update customer debt if any debt payment was made
      const debtPayment = splitGroup.payments.find(p => p.method === 'debt');
      if (debtPayment && splitGroup.customerId) {
        await this.updateCustomerDebt(splitGroup.customerId, debtPayment.amount);
      }

      return createdSales;
    } catch (error) {
      console.error('[SalesService] Error creating split payment sale:', error);
      throw error;
    }
  }

  static async createSale(userId: string, saleData: CreateSaleRequest): Promise<Sale> {
    console.log('[SalesService] Creating sale:', saleData);

    try {
      // Validate input data
      if (!userId) {
        throw new Error('User ID is required');
      }

      if (!saleData.productId || !saleData.productName) {
        throw new Error('Product information is required');
      }

      if (saleData.quantity <= 0) {
        throw new Error('Quantity must be greater than 0');
      }

      if (saleData.sellingPrice < 0 || saleData.costPrice < 0) {
        throw new Error('Prices cannot be negative');
      }

      const totalAmount = saleData.sellingPrice * saleData.quantity;
      const profit = (saleData.sellingPrice - saleData.costPrice) * saleData.quantity;

      // Create the sale record
      const saleRecord = {
        user_id: userId,
        product_id: saleData.productId,
        product_name: saleData.productName,
        quantity: saleData.quantity,
        selling_price: saleData.sellingPrice,
        cost_price: saleData.costPrice,
        profit: profit,
        total_amount: totalAmount,
        customer_id: saleData.customerId || null,
        customer_name: saleData.customerName || null,
        payment_method: saleData.paymentMethod,
        payment_details: saleData.paymentDetails,
        timestamp: new Date().toISOString(),
        synced: true,
      };

      console.log('[SalesService] Inserting sale record:', saleRecord);

      const { data, error } = await supabase
        .from('sales')
        .insert([saleRecord])
        .select()
        .single();

      if (error) {
        console.error('[SalesService] Database error:', error);
        throw new Error(`Failed to create sale: ${error.message}`);
      }

      if (!data) {
        throw new Error('Sale was created but no data returned');
      }

      console.log('[SalesService] Sale created successfully:', data);

      // Transform the response to match our Sale interface
      const sale: Sale = {
        id: data.id,
        productId: data.product_id,
        productName: data.product_name,
        quantity: data.quantity,
        sellingPrice: data.selling_price,
        costPrice: data.cost_price,
        profit: data.profit,
        timestamp: data.timestamp,
        synced: data.synced || true,
        customerId: data.customer_id,
        customerName: data.customer_name,
        paymentMethod: data.payment_method as 'cash' | 'mpesa' | 'debt' | 'partial' | 'split',
        paymentDetails: parsePaymentDetails(data.payment_details),
        total: data.total_amount,
      };

      return sale;
    } catch (error) {
      console.error('[SalesService] Error creating sale:', error);
      throw error;
    }
  }

  static async updateProductStock(productId: string, quantitySold: number): Promise<void> {
    console.log('[SalesService] Updating product stock:', productId, quantitySold);

    try {
      // First get product details including variant information
      const { data: product, error: fetchError } = await supabase
        .from('products')
        .select('current_stock, parent_id, variant_multiplier, stock_derivation_quantity, name, variant_name')
        .eq('id', productId)
        .single();

      if (fetchError) {
        console.error('[SalesService] Error fetching product:', fetchError);
        // Don't throw here - stock update is not critical for sale completion
        return;
      }

      console.log('[SalesService] Product details:', {
        id: productId,
        name: product.name,
        variant_name: product.variant_name,
        current_stock: product.current_stock,
        parent_id: product.parent_id,
        variant_multiplier: product.variant_multiplier,
        stock_derivation_quantity: product.stock_derivation_quantity,
        quantitySold
      });

      // Skip stock update for unspecified quantity products (current_stock = -1)
      if (product.current_stock === -1) {
        console.log('[SalesService] Skipping stock update for unspecified quantity product:', productId);
        return;
      }

      // If this is a variant (has parent_id), update parent stock instead
      if (product.parent_id) {
        console.log('[SalesService] Variant detected, updating parent stock:', product.parent_id);
        await this.updateParentStock(product.parent_id, quantitySold, product.variant_multiplier || 1);
        return;
      }

      // For regular products or parent products, update normally
      const newStock = Math.max(0, (product.current_stock || 0) - quantitySold);

      console.log('[SalesService] Updating regular product stock:', {
        productId,
        currentStock: product.current_stock,
        quantitySold,
        newStock
      });

      const { error: updateError } = await supabase
        .from('products')
        .update({ 
          current_stock: newStock,
          updated_at: new Date().toISOString()
        })
        .eq('id', productId);

      if (updateError) {
        console.error('[SalesService] Error updating stock:', updateError);
        // Don't throw here - stock update is not critical for sale completion
      } else {
        console.log('[SalesService] Stock updated successfully:', newStock);
      }
    } catch (error) {
      console.error('[SalesService] Stock update failed:', error);
      // Don't throw here - stock update is not critical for sale completion
    }
  }

  static async updateParentStock(parentId: string, variantQuantitySold: number, variantMultiplier: number): Promise<void> {
    console.log('[SalesService] Updating parent stock:', { parentId, variantQuantitySold, variantMultiplier });

    try {
      // Get parent product details
      const { data: parentProduct, error: fetchError } = await supabase
        .from('products')
        .select('current_stock, stock_derivation_quantity, name')
        .eq('id', parentId)
        .single();

      if (fetchError) {
        console.error('[SalesService] Error fetching parent product:', fetchError);
        return;
      }

      console.log('[SalesService] Parent product details:', {
        parentId,
        name: parentProduct.name,
        current_stock: parentProduct.current_stock,
        stock_derivation_quantity: parentProduct.stock_derivation_quantity,
        variantQuantitySold,
        variantMultiplier
      });

      // Skip stock update for unspecified quantity products
      if (parentProduct.current_stock === -1) {
        console.log('[SalesService] Skipping stock update for unspecified quantity parent product:', parentId);
        return;
      }

      // Calculate stock deduction: variant_quantity * variant_multiplier
      // Note: stock_derivation_quantity is set to 1 for variants, so we use variant_multiplier directly
      // Keep precise decimal calculations for fractional multipliers (e.g., 0.5, 0.25)
      const stockDeduction = variantQuantitySold * variantMultiplier;
      const newStock = Math.max(0, (parentProduct.current_stock || 0) - stockDeduction);

      console.log('[SalesService] Parent stock calculation:', {
        currentStock: parentProduct.current_stock,
        variantQuantitySold,
        variantMultiplier,
        stockDeduction,
        newStock
      });

      const { error: updateError } = await supabase
        .from('products')
        .update({ 
          current_stock: newStock,
          updated_at: new Date().toISOString()
        })
        .eq('id', parentId);

      if (updateError) {
        console.error('[SalesService] Error updating parent stock:', updateError);
      } else {
        console.log('[SalesService] Parent stock updated successfully:', newStock);
        
        // Emit event to notify UI components of stock change
        window.dispatchEvent(new CustomEvent('product-stock-updated', {
          detail: { productId: parentId, newStock, type: 'parent' }
        }));
      }
    } catch (error) {
      console.error('[SalesService] Parent stock update failed:', error);
    }
  }

  static async updateCustomerDebt(customerId: string, debtAmount: number): Promise<void> {
    if (!customerId || debtAmount <= 0) return;

    console.log('[SalesService] Updating customer debt:', customerId, debtAmount);

    try {
      // Get current customer data
      const { data: customer, error: fetchError } = await supabase
        .from('customers')
        .select('outstanding_debt, total_purchases')
        .eq('id', customerId)
        .single();

      if (fetchError) {
        console.error('[SalesService] Error fetching customer:', fetchError);
        return;
      }

      const newDebt = (customer.outstanding_debt || 0) + debtAmount;
      const newTotalPurchases = (customer.total_purchases || 0) + debtAmount;

      const { error: updateError } = await supabase
        .from('customers')
        .update({
          outstanding_debt: newDebt,
          total_purchases: newTotalPurchases,
          last_purchase_date: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', customerId);

      if (updateError) {
        console.error('[SalesService] Error updating customer:', updateError);
      } else {
        console.log('[SalesService] Customer debt updated successfully');
      }
    } catch (error) {
      console.error('[SalesService] Customer update failed:', error);
    }
  }
}
