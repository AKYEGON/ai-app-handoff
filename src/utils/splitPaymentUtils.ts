import { Sale } from '../types';

/**
 * Generate a unique reference for split payment groups
 * Format: SP_YYYYMMDD_HHMMSS_RANDOM
 */
export const generateSplitPaymentReference = (): string => {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 19).replace(/[-:T]/g, '');
  const random = Math.random().toString(36).substring(2, 8);
  return `SP_${dateStr}_${random}`;
};

/**
 * Enhanced split payment recording with proper grouping and deduplication support
 */
export interface SplitPaymentGroup {
  reference: string;
  payments: {
    method: 'cash' | 'mpesa' | 'debt';
    amount: number;
    details?: any;
  }[];
  totalAmount: number;
  productId: string;
  productName: string;
  quantity: number;
  sellingPrice: number;
  costPrice: number;
  customerId?: string;
  customerName?: string;
}

/**
 * Create individual sale records from a split payment group
 * Each payment method gets its own sale record with shared reference
 */
export const createSplitPaymentSales = (
  userId: string,
  splitGroup: SplitPaymentGroup
): Omit<Sale, 'id' | 'timestamp' | 'synced'>[] => {
  const { reference, payments, productId, productName, quantity, sellingPrice, costPrice, customerId, customerName } = splitGroup;
  
  const baseProfit = (sellingPrice - costPrice) * quantity;
  
  return payments.map((payment, index) => {
    // Calculate proportional profit for this payment
    const proportionalProfit = (payment.amount / splitGroup.totalAmount) * baseProfit;
    
    // Create payment details based on method
    const paymentDetails = {
      cashAmount: payment.method === 'cash' ? payment.amount : 0,
      mpesaAmount: payment.method === 'mpesa' ? payment.amount : 0,
      debtAmount: payment.method === 'debt' ? payment.amount : 0,
      saleReference: reference,
      splitPaymentIndex: index,
      splitPaymentTotal: payments.length,
      ...payment.details
    };

    return {
      productId,
      productName,
      quantity: payment.method === 'debt' ? quantity : 0, // Only debt affects stock
      sellingPrice,
      costPrice,
      profit: proportionalProfit,
      total: payment.amount,
      customerId,
      customerName,
      paymentMethod: payment.method,
      paymentDetails,
      // Add split payment identifiers for deduplication
      clientSaleId: `${reference}_${payment.method}_${index}`,
      offlineId: `split_${reference}_${payment.method}_${index}`,
    };
  });
};

/**
 * Validate split payment amounts
 */
export const validateSplitPayment = (
  totalAmount: number,
  payments: { amount: number }[]
): { isValid: boolean; error?: string } => {
  const paymentSum = payments.reduce((sum, p) => sum + p.amount, 0);
  const tolerance = 0.01; // Allow 1 cent tolerance for rounding
  
  if (Math.abs(paymentSum - totalAmount) > tolerance) {
    return {
      isValid: false,
      error: `Payment amounts (${paymentSum}) don't match total (${totalAmount})`
    };
  }
  
  if (payments.some(p => p.amount <= 0)) {
    return {
      isValid: false,
      error: 'All payment amounts must be greater than 0'
    };
  }
  
  return { isValid: true };
};

/**
 * Check if a sale is part of a split payment group
 */
export const isSplitPaymentSale = (sale: Sale): boolean => {
  return !!(sale.paymentDetails?.saleReference && 
           sale.paymentDetails.saleReference.startsWith('SP_'));
};

/**
 * Get split payment group reference from a sale
 */
export const getSplitPaymentReference = (sale: Sale): string | null => {
  return sale.paymentDetails?.saleReference || null;
};

/**
 * Group split payment sales by their reference
 */
export const groupSplitPaymentSales = (sales: Sale[]): Map<string, Sale[]> => {
  const groups = new Map<string, Sale[]>();
  
  sales.forEach(sale => {
    const reference = getSplitPaymentReference(sale);
    if (reference) {
      if (!groups.has(reference)) {
        groups.set(reference, []);
      }
      groups.get(reference)!.push(sale);
    }
  });
  
  return groups;
};