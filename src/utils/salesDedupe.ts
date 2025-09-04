import { Sale } from '@/types';
import { isSplitPaymentSale, getSplitPaymentReference } from './splitPaymentUtils';

// Enhanced deduplicate sales for reporting by preferring server-synced rows over temp duplicates
// Handles split payments properly by grouping them by reference
// Matching keys: offlineId+productId, clientSaleId+productId, and splitPaymentReference
export function dedupeSalesForReporting(sales: Sale[]): Sale[] {
  if (!Array.isArray(sales) || sales.length === 0) return sales;

  const byCompositeKey = new Map<string, Sale>();

  for (const s of sales) {
    const keys: string[] = [];
    
    // Handle split payments specially - each payment method should be unique
    if (isSplitPaymentSale(s)) {
      const splitRef = getSplitPaymentReference(s);
      if (splitRef && s.paymentMethod) {
        keys.push(`split:${splitRef}::${s.paymentMethod}`);
      }
    }
    
    // Standard deduplication keys
    if (s.offlineId && s.productId) keys.push(`off:${s.offlineId}::${s.productId}`);
    if (s.clientSaleId && s.productId) keys.push(`cli:${s.clientSaleId}::${s.productId}`);

    // Fallback to unique id if no composite key available
    if (keys.length === 0) keys.push(`id:${s.id}`);

    for (const key of keys) {
      const existing = byCompositeKey.get(key);
      if (!existing) {
        byCompositeKey.set(key, s);
      } else {
        // Prefer synced server record over temp/unsynced
        const pick = existing.synced ? existing : s.synced ? s : existing;
        byCompositeKey.set(key, pick);
      }
    }
  }

  // Return unique values preserving recency
  return Array.from(new Set(Array.from(byCompositeKey.values())))
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}
