import { useEffect, useState } from 'react';
import type { Channel } from './useChannels';
import { getPreferredStreamUrl, getStreamCandidates, getStreamHealth, isHlsUrl, isTransportStreamUrl } from '@/utils/streams';

const SHAMS_URLS = ['http://iptvshams.ru/ShamsTV.m3u8', 'https://iptvshams.ru/ShamsTV.m3u8'];
const CACHE_KEY = 'shams_channels_cache_v4';
const CACHE_TTL = 1000 * 60 * 60 * 6; // 6h

const GROUP_TO_CATEGORY: Record<string, string> = {
  'Россия': 'Russia',
  'Узбекистан': 'Uzbekistan',
  'Спорт': 'Sports',
  'Кино': 'Movies',
  'Детские': 'Kids',
  'Музыка': 'Music',
  'Новости': 'News',
  'Развлекательные': 'Entertainment',
  'Документальные': 'Documentary',
  'Познавательные': 'Education',
};

function parseAttr(line: string, key: string): string | null {
  const re = new RegExp(`${key}="([^"]*)"`, 'i');
  const m = line.match(re);
  return m ? m[1] : null;
}

function parseM3U(text: string): Channel[] {
  const lines = text.split(/\r?\n/);
  const out: Channel[] = [];
  let i = 0;
  let n = 0;
  while (i < lines.length) {
    const line = lines[i].trim();
    if (line.startsWith('#EXTINF')) {
      const commaIdx = line.indexOf(',');
      const name = commaIdx > -1 ? line.slice(commaIdx + 1).trim() : 'Unknown';
      const logo = parseAttr(line, 'tvg-logo');
      const group = parseAttr(line, 'group-title') || 'General';
      // find next non-empty, non-comment line as URL
      let j = i + 1;
      while (j < lines.length && (lines[j].trim() === '' || lines[j].trim().startsWith('#'))) j++;
      const url = lines[j]?.trim();
      if (url && /^https?:\/\//i.test(url)) {
        const streamUrl = getPreferredStreamUrl(url) || url;
        const cat = GROUP_TO_CATEGORY[group] || group;
        const streamType = isHlsUrl(streamUrl) ? 'hls' : isTransportStreamUrl(streamUrl) ? 'mpegts' : 'mpegts';
        const streamHealth = getStreamHealth(streamUrl, streamType);
        const playableCandidates = getStreamCandidates(streamUrl);
        // skip the "subscribe" promo entry
        if (!/подпишись/i.test(name) && !/подпишись/i.test(group)) {
          out.push({
            id: `shams:${n++}`,
            name,
            description: `Shams TV • ${group}`,
            logo_url: logo,
            stream_url: streamUrl,
            category: cat,
            is_live: true,
            current_program: 'Live Broadcast',
            viewer_count: 0,
            stream_type: streamType,
            is_alsamos_channel: false,
            embed_allowed: streamHealth !== 'unsupported' || playableCandidates.length > 0,
            share_enabled: true,
            source: 'shams',
            stream_health: streamHealth === 'mixed-content' && playableCandidates.length > 0 ? 'ready' : streamHealth,
          });
        }
      }
      i = j + 1;
    } else {
      i++;
    }
  }
  return out;
}

async function fetchWithFallback(urls: string[]): Promise<string> {
  const proxies = [
    (u: string) => u,
    (u: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
    (u: string) => `https://corsproxy.io/?url=${encodeURIComponent(u)}`,
    (u: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(u)}`,
  ];
  let lastErr: unknown;
  for (const url of urls) {
    for (const p of proxies) {
      try {
        const r = await fetch(p(url), { cache: 'no-store' });
        if (r.ok) {
          const t = await r.text();
          if (t && t.includes('#EXTM3U')) return t;
        }
      } catch (e) { lastErr = e; }
    }
  }
  throw lastErr || new Error('all proxies failed');
}

export function useShamsChannels() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const raw = localStorage.getItem(CACHE_KEY);
        if (raw) {
          const { ts, data } = JSON.parse(raw);
          if (Date.now() - ts < CACHE_TTL && Array.isArray(data)) {
            if (!cancelled) { setChannels(data); setLoading(false); }
            return;
          }
        }
      } catch {}
      try {
        const text = await fetchWithFallback(SHAMS_URLS);
        const parsed = parseM3U(text);
        try { localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data: parsed })); } catch {}
        if (!cancelled) { setChannels(parsed); setLoading(false); }
      } catch (e) {
        console.warn('Shams fetch failed', e);
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  return { shamsChannels: channels, shamsLoading: loading };
}
