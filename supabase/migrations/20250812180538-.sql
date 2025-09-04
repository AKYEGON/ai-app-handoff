-- Harden daraja_credentials: enforce encryption-at-rest and restrict direct reads

-- 1) Drop direct SELECT policy so clients cannot read raw credentials
DROP POLICY IF EXISTS "Users can view own daraja credentials" ON public.daraja_credentials;

-- 2) Create trigger to enforce encrypted format on sensitive columns
CREATE OR REPLACE FUNCTION public.enforce_daraja_encryption()
RETURNS trigger AS $$
BEGIN
  -- Only enforce when a value is provided (non-null)
  IF NEW.consumer_key IS NOT NULL AND position('enc:v1:' in NEW.consumer_key) <> 1 THEN
    RAISE EXCEPTION 'consumer_key must be encrypted (enc:v1: prefix required)';
  END IF;
  IF NEW.consumer_secret IS NOT NULL AND position('enc:v1:' in NEW.consumer_secret) <> 1 THEN
    RAISE EXCEPTION 'consumer_secret must be encrypted (enc:v1: prefix required)';
  END IF;
  IF NEW.passkey IS NOT NULL AND position('enc:v1:' in NEW.passkey) <> 1 THEN
    RAISE EXCEPTION 'passkey must be encrypted (enc:v1: prefix required)';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_enforce_daraja_encryption ON public.daraja_credentials;
CREATE TRIGGER trg_enforce_daraja_encryption
BEFORE INSERT OR UPDATE ON public.daraja_credentials
FOR EACH ROW EXECUTE FUNCTION public.enforce_daraja_encryption();