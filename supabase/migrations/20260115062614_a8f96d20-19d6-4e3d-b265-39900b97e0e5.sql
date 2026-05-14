-- Add youtube_playlist to allowed stream types
ALTER TABLE public.channels DROP CONSTRAINT IF EXISTS channels_stream_type_check;
ALTER TABLE public.channels ADD CONSTRAINT channels_stream_type_check 
  CHECK (stream_type IN ('rtmp', 'youtube_live', 'youtube_video', 'youtube_playlist', 'hls'));