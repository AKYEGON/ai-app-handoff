-- Add product variants support to the products table
ALTER TABLE public.products 
ADD COLUMN parent_id uuid REFERENCES public.products(id) ON DELETE CASCADE,
ADD COLUMN variant_name text,
ADD COLUMN variant_multiplier numeric DEFAULT 1.0,
ADD COLUMN stock_derivation_quantity integer DEFAULT 0,
ADD COLUMN is_parent boolean DEFAULT false;

-- Create index for parent-child relationships
CREATE INDEX idx_products_parent_id ON public.products(parent_id);
CREATE INDEX idx_products_is_parent ON public.products(is_parent);

-- Add constraint to ensure variant products have a multiplier
ALTER TABLE public.products 
ADD CONSTRAINT check_variant_multiplier 
CHECK (parent_id IS NULL OR variant_multiplier > 0);

-- Add constraint to ensure parent products don't have a parent
ALTER TABLE public.products 
ADD CONSTRAINT check_parent_hierarchy 
CHECK ((is_parent = true AND parent_id IS NULL) OR (is_parent = false));

-- Update existing products to be non-parents by default
UPDATE public.products SET is_parent = false WHERE is_parent IS NULL;