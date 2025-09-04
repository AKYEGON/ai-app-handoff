
-- Clean up duplicate shop_settings records and add unique constraint
-- First, delete duplicate records, keeping only the most recent one per user/key combination
DELETE FROM shop_settings 
WHERE id NOT IN (
  SELECT DISTINCT ON (user_id, settings_key) id
  FROM shop_settings
  ORDER BY user_id, settings_key, updated_at DESC
);

-- Add unique constraint to prevent future duplicates
ALTER TABLE shop_settings 
ADD CONSTRAINT shop_settings_user_settings_unique 
UNIQUE (user_id, settings_key);

-- Add index for better performance on lookups
CREATE INDEX IF NOT EXISTS idx_shop_settings_user_key 
ON shop_settings (user_id, settings_key);
