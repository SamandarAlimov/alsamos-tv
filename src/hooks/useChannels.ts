import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useIPTVChannels } from './useIPTVChannels';
import { useShamsChannels } from './useShamsChannels';
import { useUzbekChannels } from './useUzbekChannels';
import { normalizeSearchText } from '@/utils/search';

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
  source?: 'alsamos' | 'iptv-org' | 'shams' | 'uz';
  stream_health?: 'ready' | 'mixed-content' | 'unsupported' | 'unknown';
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
  const [dbChannels, setDbChannels] = useState<Channel[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const { iptvChannels, iptvLoading } = useIPTVChannels();
  const { shamsChannels, shamsLoading } = useShamsChannels();
  const { uzChannels, uzLoading } = useUzbekChannels();
  const channels = useMemo(() => {
    const tagged = dbChannels.map(c => ({ ...c, source: c.source ?? ('alsamos' as const) }));
    const priority = { alsamos: 0, uz: 1, shams: 2, 'iptv-org': 3 } as const;
    const unique = new Map<string, Channel>();

    for (const channel of [...tagged, ...uzChannels, ...shamsChannels, ...iptvChannels]) {
      const source = channel.source ?? 'alsamos';
      const streamKey = channel.stream_url || channel.youtube_video_id || channel.youtube_channel_id || channel.id;
      const key = normalizeSearchText(`${source}-${channel.name}-${channel.category || ''}-${streamKey}`);
      const existing = unique.get(key);
      if (!existing) {
        unique.set(key, { ...channel, source });
        continue;
      }

      const existingPriority = priority[existing.source ?? 'alsamos'];
      const nextPriority = priority[source];
      const existingPlayable = existing.stream_health !== 'mixed-content' && existing.stream_health !== 'unsupported';
      const nextPlayable = channel.stream_health !== 'mixed-content' && channel.stream_health !== 'unsupported';

      if ((!existingPlayable && nextPlayable) || nextPriority < existingPriority) {
        unique.set(key, { ...channel, source });
      }
    }

    return Array.from(unique.values()).sort((a, b) => {
      const sourceDiff = priority[a.source ?? 'alsamos'] - priority[b.source ?? 'alsamos'];
      if (sourceDiff !== 0) return sourceDiff;
      if (Number(b.is_live) !== Number(a.is_live)) return Number(b.is_live) - Number(a.is_live);
      return a.name.localeCompare(b.name);
    });
  }, [dbChannels, iptvChannels, shamsChannels, uzChannels]);

  useEffect(() => {
    const fetchData = async () => {
      try {
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
          setDbChannels(channelsRes.data as Channel[]);
        }
        if (schedulesRes.data) {
          setSchedules(schedulesRes.data as Schedule[]);
        }
      } catch (error) {
        console.error('Error fetching channels:', error);
      } finally {
        setLoading(false);
      }
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
    loading: loading || iptvLoading || shamsLoading || uzLoading,
    getCurrentProgram,
    getUpcomingPrograms,
    getChannelSchedule,
    getFeaturedChannel
  };
}
