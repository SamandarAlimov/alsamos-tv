-- Enable pgcrypto extension for gen_random_bytes
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Recreate the function with proper schema reference
CREATE OR REPLACE FUNCTION public.generate_stream_key()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_key text;
BEGIN
  new_key := 'live_' || encode(extensions.gen_random_bytes(16), 'hex');
  RETURN new_key;
END;
$$;

-- Add policy for authenticated users to create channels
CREATE POLICY "Authenticated users can create channels"
ON public.channels
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Add policy for authenticated users to update channels
CREATE POLICY "Authenticated users can update channels"
ON public.channels
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);