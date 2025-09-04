
-- Update trial limits and add new subscription model
-- First, let's add new columns for enhanced trial tracking
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS trial_sales_used INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS trial_products_used INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS trial_customers_used INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS trial_start_date TIMESTAMP WITH TIME ZONE DEFAULT now();
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS trial_end_date TIMESTAMP WITH TIME ZONE DEFAULT (now() + INTERVAL '14 days');
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'trial';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_plan TEXT DEFAULT 'free_trial';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_end_date TIMESTAMP WITH TIME ZONE;

-- Add SMS notifications preferences
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS sms_notifications_enabled BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS sms_phone_number TEXT;

-- Create table for storing Daraja API credentials (encrypted)
CREATE TABLE IF NOT EXISTS daraja_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  consumer_key TEXT,
  consumer_secret TEXT,
  business_short_code TEXT,
  passkey TEXT,
  is_sandbox BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add RLS policies for daraja_credentials
ALTER TABLE daraja_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own daraja credentials" 
  ON daraja_credentials 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own daraja credentials" 
  ON daraja_credentials 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own daraja credentials" 
  ON daraja_credentials 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own daraja credentials" 
  ON daraja_credentials 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Create table for background sync queue
CREATE TABLE IF NOT EXISTS sync_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  operation_type TEXT NOT NULL, -- 'sale', 'product_update', 'customer_update'
  data JSONB NOT NULL,
  status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  next_retry_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add RLS for sync_queue
ALTER TABLE sync_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own sync queue" 
  ON sync_queue 
  FOR ALL 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create table for push notification subscriptions
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add RLS for push_subscriptions
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own push subscriptions" 
  ON push_subscriptions 
  FOR ALL 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create subscription plans table
CREATE TABLE IF NOT EXISTS subscription_plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  price INTEGER NOT NULL, -- in KSh
  features JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Insert the new subscription plan
INSERT INTO subscription_plans (id, name, price, features) VALUES 
('dukafiti_standard', 'DukaFiti Standard', 200, '{
  "unlimited_sales": true,
  "unlimited_products": true,
  "unlimited_customers": true,
  "sms_notifications": true,
  "offline_sync": true,
  "debt_management": true,
  "advanced_reports": true,
  "customer_support": true
}'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  price = EXCLUDED.price,
  features = EXCLUDED.features;

-- Update existing profiles with new trial limits
UPDATE profiles SET 
  trial_sales_used = 0,
  trial_products_used = 0,
  trial_customers_used = 0
WHERE trial_sales_used IS NULL;
