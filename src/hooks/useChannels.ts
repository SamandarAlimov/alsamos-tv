import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Channel {
  id: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  stream_url: string | null;
  category: string | null;
  is_live: boolean;
  current_program: string | null;
  viewer_count: number;
  youtube_video_id?: string | null;
  youtube_channel_id?: string | null;
  stream_type?: string | null;
  is_alsamos_channel?: boolean | null;
  embed_allowed?: boolean | null;
  share_enabled?: boolean | null;
}

export interface Schedule {
  id: string;
  channel_id: string;
  program_title: string;
  program_description: string | null;
  start_time: string;
  end_time: string;
  category: string | null;
  is_live: boolean;
}

export function useChannels() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const [channelsRes, schedulesRes] = await Promise.all([
        // Use the public view that excludes sensitive fields (stream_key, rtmp_url)
        supabase
          .from('channels_public')
          .select('*')
          .order('is_alsamos_channel', { ascending: false })
          .order('is_live', { ascending: false })
          .order('name'),
        supabase
          .from('channel_schedules')
          .select('*')
          .gte('end_time', new Date().toISOString())
          .order('start_time')
      ]);

      if (channelsRes.data) {
        setChannels(channelsRes.data as Channel[]);
      }
      if (schedulesRes.data) {
        setSchedules(schedulesRes.data as Schedule[]);
      }
      setLoading(false);
    };

    fetchData();

    // Subscribe to realtime updates
    const channelsChannel = supabase
      .channel('channels-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'channels' }, () => {
        fetchData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'channel_schedules' }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channelsChannel);
    };
  }, []);

  const getCurrentProgram = (channelId: string) => {
    const now = new Date();
    return schedules.find(
      s => s.channel_id === channelId && 
      new Date(s.start_time) <= now && 
      new Date(s.end_time) >= now
    );
  };

  const getUpcomingPrograms = (channelId: string, limit = 3) => {
    const now = new Date();
    return schedules
      .filter(s => s.channel_id === channelId && new Date(s.start_time) > now)
      .slice(0, limit);
  };

  const getChannelSchedule = (channelId: string) => {
    return schedules.filter(s => s.channel_id === channelId);
  };

  const getFeaturedChannel = () => {
    return channels.find(c => c.is_live) || channels[0];
  };

  return {
    channels,
    schedules,
    loading,
    getCurrentProgram,
    getUpcomingPrograms,
    getChannelSchedule,
    getFeaturedChannel
  };
}
