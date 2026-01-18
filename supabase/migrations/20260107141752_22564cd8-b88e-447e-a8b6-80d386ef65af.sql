-- Create channel_schedules table for EPG
CREATE TABLE public.channel_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  channel_id UUID NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  program_title TEXT NOT NULL,
  program_description TEXT,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  category TEXT,
  is_live BOOLEAN DEFAULT false,
  thumbnail_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.channel_schedules ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Schedules are viewable by everyone" 
ON public.channel_schedules 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage schedules" 
ON public.channel_schedules 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create index for efficient schedule lookups
CREATE INDEX idx_channel_schedules_channel_time ON public.channel_schedules(channel_id, start_time);
CREATE INDEX idx_channel_schedules_time ON public.channel_schedules(start_time, end_time);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.channel_schedules;