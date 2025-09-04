-- Fix the payment method constraint to allow 'split' OR ensure frontend saves 'partial'
-- Since the app logic already converts 'partial' to 'split' on read, let's update the constraint to allow 'split'
ALTER TABLE public.sales DROP CONSTRAINT IF EXISTS sales_payment_method_check;
ALTER TABLE public.sales ADD CONSTRAINT sales_payment_method_check 
  CHECK (payment_method = ANY (ARRAY['cash'::text, 'mpesa'::text, 'debt'::text, 'partial'::text, 'split'::text]));