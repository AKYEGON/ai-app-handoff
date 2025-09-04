-- Create duka_products table for Kenyan duka inventory system
CREATE TABLE public.duka_products (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  image_url TEXT
);

-- Add index on category for better query performance
CREATE INDEX idx_duka_products_category ON public.duka_products(category);

-- Add index on name for search functionality
CREATE INDEX idx_duka_products_name ON public.duka_products(name);

-- Enable Row Level Security
ALTER TABLE public.duka_products ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access (common for product catalogs)
CREATE POLICY "Allow public read access to duka products" 
ON public.duka_products 
FOR SELECT 
USING (true);