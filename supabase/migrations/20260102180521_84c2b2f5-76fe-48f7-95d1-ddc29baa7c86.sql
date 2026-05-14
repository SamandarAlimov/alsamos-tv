-- Add stream key column to channels table
ALTER TABLE public.channels 
ADD COLUMN IF NOT EXISTS stream_key text UNIQUE,
ADD COLUMN IF NOT EXISTS rtmp_url text DEFAULT 'rtmp://live.alsamos.tv/live';

-- Create function to generate unique stream keys
CREATE OR REPLACE FUNCTION public.generate_stream_key()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_key text;
BEGIN
  new_key := 'live_' || encode(gen_random_bytes(16), 'hex');
  RETURN new_key;
END;
$$;

-- Create index on stream_key for faster lookups
CREATE INDEX IF NOT EXISTS idx_channels_stream_key ON public.channels(stream_key);