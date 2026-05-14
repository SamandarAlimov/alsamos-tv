-- 1. Create channels public view (excludes stream_key and rtmp_url)
CREATE VIEW public.channels_public
WITH (security_invoker=on) AS
  SELECT id, name, description, logo_url, stream_url, category, 
         is_live, current_program, viewer_count, youtube_video_id,
         youtube_channel_id, stream_type, is_alsamos_channel, 
         embed_allowed, share_enabled, created_at
  FROM public.channels;

-- 2. Create profiles public view (excludes sensitive fields)
CREATE VIEW public.profiles_public
WITH (security_invoker=on) AS
  SELECT id, username, display_name, avatar_url, bio,
         is_kids_profile, language, created_at
  FROM public.profiles;

-- 3. Update channels SELECT policy - use view for public, direct for admins
DROP POLICY IF EXISTS "Channels are viewable by everyone" ON public.channels;
CREATE POLICY "Admins can view all channel data" ON public.channels 
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- 4. Update profiles SELECT policy - own profile or public view
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

-- 5. Restrict creator profile creation to admins only
DROP POLICY IF EXISTS "Creators can manage their profile" ON public.creator_profiles;
CREATE POLICY "Creators can update their profile" ON public.creator_profiles
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage creator profiles" ON public.creator_profiles
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- 6. Restrict content insertion to verified creators only
DROP POLICY IF EXISTS "Authenticated users can insert content" ON public.content;
CREATE POLICY "Verified creators can insert content" ON public.content
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.creator_profiles 
      WHERE user_id = auth.uid() AND is_verified = true
    )
  );

-- 7. Protect billing history - no user write access
CREATE POLICY "No user insert to billing" ON public.billing_history
  FOR INSERT WITH CHECK (false);
CREATE POLICY "No user update to billing" ON public.billing_history  
  FOR UPDATE USING (false);
CREATE POLICY "No user delete from billing" ON public.billing_history
  FOR DELETE USING (false);

-- 8. Remove ability for users to delete subscriptions
-- First check if there's an ALL policy and replace with specific ones
DROP POLICY IF EXISTS "Users can delete their subscription" ON public.subscriptions;