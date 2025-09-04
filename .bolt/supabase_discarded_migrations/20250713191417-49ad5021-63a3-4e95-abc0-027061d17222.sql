-- Allow null item_id for cash lending transactions
ALTER TABLE public.transactions ALTER COLUMN item_id DROP NOT NULL;