-- Secure daraja_credentials: add SELECT RLS and enforce encryption trigger

-- Ensure RLS is enabled
ALTER TABLE public.daraja_credentials ENABLE ROW LEVEL SECURITY;

-- Add SELECT policy to allow users to read only their own rows (without exposing plaintext thanks to Edge Function masking)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'daraja_credentials' 
      AND policyname = 'Users can view own daraja credentials'
  ) THEN
    CREATE POLICY "Users can view own daraja credentials"
    ON public.daraja_credentials
    FOR SELECT
    USING (auth.uid() = user_id);
  END IF;
END
$$;

-- Enforce encrypted-at-rest values via trigger using existing function public.enforce_daraja_encryption()
DROP TRIGGER IF EXISTS trg_enforce_daraja_encryption ON public.daraja_credentials;
CREATE TRIGGER trg_enforce_daraja_encryption
BEFORE INSERT OR UPDATE ON public.daraja_credentials
FOR EACH ROW
EXECUTE FUNCTION public.enforce_daraja_encryption();