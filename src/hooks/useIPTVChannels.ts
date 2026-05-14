import { useEffect, useState } from 'react';
import type { Channel } from './useChannels';

interface IPTVChannel {
  id: string;
  name: string;
  alt_names?: string[];
  network?: string | null;
  country: string;
  languages?: string[];
  categories?: string[];
  logo?: string;
  is_nsfw?: boolean;
  closed?: string | null;
}

interface IPTVStream {
  channel: string | null;
  url: string;
  http_referrer?: string | null;
  user_agent?: string | null;
  quality?: string | null;
}

const CACHE_KEY = 'iptv_channels_cache_v2';
const CACHE_TTL = 1000 * 60 * 60 * 6; // 6 hours

const CATEGORY_MAP: Record<string, string> = {
  news: 'News',
  sports: 'Sports',
  movies: 'Movies',
  kids: 'Kids',
  music: 'Music',
  entertainment: 'Entertainment',
  documentary: 'Documentary',
  religious: 'Religious',
  education: 'Education',
  business: 'Business',
  cooking: 'Cooking',
  lifestyle: 'Lifestyle',
  general: 'General',
  series: 'Series',
  travel: 'Travel',
  weather: 'Weather',
  auto: 'Auto',
  family: 'Family',
  outdoor: 'Outdoor',
  comedy: 'Comedy',
  classic: 'Classic',
  legislative: 'Legislative',
};

function normalizeCategory(cats?: string[]): string {
  if (!cats || cats.length === 0) return 'General';
  const c = cats[0];
  return CATEGORY_MAP[c] || c.charAt(0).toUpperCase() + c.slice(1);
}

export function useIPTVChannels() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      // Try cache
      try {
        const raw = localStorage.getItem(CACHE_KEY);
        if (raw) {
          const { ts, data } = JSON.parse(raw);
          if (Date.now() - ts < CACHE_TTL && Array.isArray(data)) {
            if (!cancelled) {
              setChannels(data);
              setLoading(false);
            }
            return;
          }
        }
      } catch {}

      try {
        const [channelsRes, streamsRes] = await Promise.all([
          fetch('https://iptv-org.github.io/api/channels.json'),
          fetch('https://iptv-org.github.io/api/streams.json'),
        ]);
        const channelsData: IPTVChannel[] = await channelsRes.json();
        const streamsData: IPTVStream[] = await streamsRes.json();

        // Index streams by channel id (first valid stream per channel)
        const streamMap = new Map<string, IPTVStream>();
        for (const s of streamsData) {
          if (!s.channel || !s.url) continue;
          if (!streamMap.has(s.channel)) streamMap.set(s.channel, s);
        }

        const merged: Channel[] = [];
        for (const c of channelsData) {
          if (c.closed) continue;
          if (c.is_nsfw) continue;
          const stream = streamMap.get(c.id);
          if (!stream) continue;
          merged.push({
            id: `iptv:${c.id}`,
            name: c.name,
            description: c.network ? `${c.network} • ${c.country}` : c.country,
            logo_url: c.logo || null,
            stream_url: stream.url,
            category: normalizeCategory(c.categories),
            is_live: true,
            current_program: 'Live Broadcast',
            viewer_count: 0,
            stream_type: 'hls',
            is_alsamos_channel: false,
            embed_allowed: true,
            share_enabled: true,
            source: 'iptv-org',
          });
        }

        // Sort by name
        merged.sort((a, b) => a.name.localeCompare(b.name));

        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data: merged }));
        } catch {}

        if (!cancelled) {
          setChannels(merged);
          setLoading(false);
        }
      } catch (err) {
        console.warn('IPTV fetch failed', err);
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { iptvChannels: channels, iptvLoading: loading };
}
