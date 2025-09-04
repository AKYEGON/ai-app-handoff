-- Fix 1: Remove duplicate trigger causing 2x debt increases
DROP TRIGGER IF EXISTS trigger_update_customer_on_sale_insert ON public.sales;

-- Fix 2: Ensure only one trigger remains active
-- The trg_update_customer_on_sale_insert trigger should handle all debt updates automatically