-- Remove duplicate trigger that's causing debt to be doubled
-- Keep only the first trigger and remove the second one
DROP TRIGGER IF EXISTS trigger_update_customer_on_sale_insert ON public.sales;

-- Verify we still have the working trigger
-- (trg_update_customer_on_sale_insert should remain)