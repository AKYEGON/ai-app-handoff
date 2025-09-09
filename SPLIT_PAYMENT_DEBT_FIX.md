# Split Payment Debt Fix

## Issue Description
When checking out with \"Split Payment\" using debt + another method, the Reports page → Debt Transactions table showed correct data, but the Customers page doubled the customer's debt amount.

## Root Cause Analysis

### The Problem
**Double Debt Counting**: Customer debt was being incremented twice for split payments:

1. **Manual Update in Checkout Logic** (`NewSalesCheckout.tsx` lines 211-233): The checkout process was manually updating customer debt
2. **Database Trigger**: The `update_customer_on_sale_insert()` trigger was also automatically updating customer debt when sales were inserted

This caused debt to be added twice, resulting in doubled debt amounts on the Customers page.

### Database Trigger Details
The trigger reads the `payment_details->>'debtAmount'` field from sale records and automatically updates customer debt:

```sql
-- Enhanced debt detection for split payments and regular debt
begin
  -- Check payment_details->>'debtAmount' first (for split payments)
  debt_inc := coalesce((NEW.payment_details->>'debtAmount')::numeric, 0);
exception when others then
  debt_inc := 0;
end;

-- If no debt amount in payment_details, check payment method
if debt_inc = 0 and lower(coalesce(NEW.payment_method, '')) = 'debt' then
  debt_inc := coalesce(NEW.total_amount, 0);
end if;

-- Update customer debt
update public.customers c
set
  total_purchases = coalesce(c.total_purchases, 0) + purchase_inc,
  outstanding_debt = coalesce(c.outstanding_debt, 0) + debt_inc,
  last_purchase_date = greatest(coalesce(c.last_purchase_date, to_timestamp(0)), effective_ts),
  updated_at = now()
where c.id = NEW.customer_id
  and c.user_id = NEW.user_id;
```

## Fix Applied

### 1. Removed Manual Debt Updates
**File**: `src/components/sales/NewSalesCheckout.tsx`

**Before** (lines 211-233):
```typescript
// For debt sales or split payments with debt, update customer debt
let updatedCustomer = selectedCustomer;
const debtAmount = paymentMethod === 'debt' ? total : 
                  (paymentMethod === 'split' && splitPaymentData?.methods.debt ? splitPaymentData.methods.debt.amount : 0);

if (debtAmount > 0 && selectedCustomer) {
  // Manual debt calculation and customer update
  const customerUpdates = {
    outstandingDebt: (selectedCustomer.outstandingDebt || 0) + debtAmount,
    totalPurchases: (selectedCustomer.totalPurchases || 0) + total,
    lastPurchaseDate: new Date().toISOString(),
  };
  // ... update logic
}
```

**After**:
```typescript
// Customer aggregates (debt, purchases) are handled automatically by database trigger
// when sales are inserted. No manual updates needed to prevent double-counting.
let updatedCustomer = selectedCustomer;
```

### 2. Preserved Existing Payment Logic
The payment details structure remains unchanged, ensuring the database trigger receives correct debt amounts:

```typescript
const itemPaymentDetails = paymentMethod === 'split' && splitPaymentData ? {
  cashAmount: Math.round((splitPaymentData.methods.cash?.amount || 0) * splitRatio),
  mpesaAmount: Math.round((splitPaymentData.methods.mpesa?.amount || 0) * splitRatio),
  debtAmount: Math.round((splitPaymentData.methods.debt?.amount || 0) * splitRatio), // ← Trigger reads this
  discountAmount: Math.round((splitPaymentData.methods.discount?.amount || 0) * splitRatio),
  saleReference: salesReference || undefined,
} : {
  // ... other payment methods
};
```

### 3. Added Test Component
**File**: `src/components/debug/SplitPaymentDebtTest.tsx`

Created a comprehensive test component that:
- Creates test split payment scenarios
- Verifies debt is increased by the correct amount (not doubled)
- Provides real-time feedback on debt calculation accuracy
- Accessible via `/test` page for easy debugging

## Expected Behavior After Fix

1. **Consistent Debt Calculation**: Customer debt should only increase once by the correct debt amount across all pages
2. **Reports Page**: Shows correct debt transaction amounts
3. **Customers Page**: Shows correct total customer debt (not doubled)
4. **Split Payments**: Work correctly with debt components without duplication

## Testing Instructions

1. Navigate to `/test` page
2. Run the \"Split Payment Debt Test\"
3. Verify test passes with \"SUCCESS: Debt increased by correct amount (no doubling)\"
4. Manually test split payments with debt components in the sales flow
5. Check both Reports and Customers pages show consistent debt values

## Technical Notes

- **Database Trigger**: Remains unchanged and handles all debt calculations automatically
- **Payment Logic**: Debt payments (reducing debt) in `CustomersPage.tsx` remain unchanged
- **Split Payment Utils**: Utility functions remain unchanged
- **Backwards Compatibility**: All existing functionality preserved

The fix ensures a single source of truth for debt calculations (the database trigger) while removing the duplicate manual calculations that caused the doubling issue.
