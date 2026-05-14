-- Add YouTube stream support to channels table
ALTER TABLE public.channels ADD COLUMN IF NOT EXISTS youtube_video_id TEXT;
ALTER TABLE public.channels ADD COLUMN IF NOT EXISTS youtube_channel_id TEXT;
ALTER TABLE public.channels ADD COLUMN IF NOT EXISTS stream_type TEXT DEFAULT 'rtmp' CHECK (stream_type IN ('rtmp', 'youtube_live', 'youtube_video', 'hls', 'external'));
ALTER TABLE public.channels ADD COLUMN IF NOT EXISTS is_alsamos_channel BOOLEAN DEFAULT false;
ALTER TABLE public.channels ADD COLUMN IF NOT EXISTS embed_allowed BOOLEAN DEFAULT true;
ALTER TABLE public.channels ADD COLUMN IF NOT EXISTS share_enabled BOOLEAN DEFAULT true;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_channels_stream_type ON public.channels(stream_type);
CREATE INDEX IF NOT EXISTS idx_channels_is_alsamos ON public.channels(is_alsamos_channel);