-- Change current_stock column to support decimal values for precise variant stock calculations
ALTER TABLE public.products 
ALTER COLUMN current_stock TYPE NUMERIC USING current_stock::NUMERIC;

-- Add a comment to document the change
COMMENT ON COLUMN public.products.current_stock IS 'Product stock quantity (supports decimal values for variant calculations)';