ALTER VIEW public.channels_public SET (security_invoker = off);
GRANT SELECT ON public.channels_public TO anon, authenticated;