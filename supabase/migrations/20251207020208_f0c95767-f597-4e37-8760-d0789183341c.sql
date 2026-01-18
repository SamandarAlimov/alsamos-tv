-- Create function to increment view count
CREATE OR REPLACE FUNCTION public.increment_view_count(content_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.content
  SET view_count = COALESCE(view_count, 0) + 1
  WHERE id = content_id;
END;
$$;