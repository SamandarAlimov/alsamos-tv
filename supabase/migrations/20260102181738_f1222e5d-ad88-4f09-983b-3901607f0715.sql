-- Remove the policy that allows all authenticated users to create channels
DROP POLICY IF EXISTS "Authenticated users can create channels" ON public.channels;
DROP POLICY IF EXISTS "Authenticated users can update channels" ON public.channels;

-- Channels can only be managed by admins (Alsamos Corporation)
-- The existing "Admins can manage channels" policy already handles this