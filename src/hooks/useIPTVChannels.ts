import { useEffect, useState } from 'react';
import type { Channel } from './useChannels';
import {
  getStreamCandidates,
  getStreamHealth,
  isHlsUrl,
  isTransportStreamUrl,
} from '@/utils/streams';

const IPTV_INDEX_URL = 'https://iptv-org.github.io/iptv/index.m3u';
const CACHE_KEY = 'iptv_channels_cache_v5_all';
const CACHE_TTL = 1000 * 60 * 60 * 6; // 6 hours
const FETCH_TIMEOUT_MS = 15000;

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
  animation: 'Animation',
  culture: 'Culture',
  entertainment_local: 'Entertainment',
  shop: 'Shopping',
  undefined: 'General',
};

function parseAttr(line: string, key: string): string | null {
  const m = line.match(new RegExp(`${key}="([^"]*)"`, 'i'));
  return m ? m[1] : null;
}

function normalizeCategory(group: string | null) {
  if (!group) return 'General';
  const first = group.split(';')[0].split(',')[0].trim();
  if (!first) return 'General';
  const key = first.toLowerCase().replace(/\s+/g, '_');
  return CATEGORY_MAP[key] || first.charAt(0).toUpperCase() + first.slice(1);
}

function getStreamType(url: string) {
  if (isHlsUrl(url)) return 'hls';
  if (isTransportStreamUrl(url)) return 'mpegts';
  return 'hls';
}

function parseM3U(text: string): Channel[] {
  const lines = text.split(/\r?\n/);
  const out: Channel[] = [];
  const seen = new Set<string>();
  let i = 0;
  let n = 0;

  while (i < lines.length) {
    const line = lines[i].trim();
    if (!line.startsWith('#EXTINF')) {
      i += 1;
      continue;
    }

    const commaIdx = line.indexOf(',');
    const name = commaIdx > -1 ? line.slice(commaIdx + 1).trim() : 'Unknown';
    const logo = parseAttr(line, 'tvg-logo');
    const tvgId = parseAttr(line, 'tvg-id');
    const country = parseAttr(line, 'tvg-country');
    const group = parseAttr(line, 'group-title');

    let j = i + 1;
    while (j < lines.length && (lines[j].trim() === '' || lines[j].trim().startsWith('#'))) j += 1;

    const url = lines[j]?.trim();
    if (url && /^https?:\/\//i.test(url)) {
      const streamUrl = url;
      const streamType = getStreamType(streamUrl);
      const streamHealth = getStreamHealth(streamUrl, streamType);
      const playableCandidates = getStreamCandidates(streamUrl);
      const dedupeKey = `${name.toLowerCase()}|${streamUrl}`;

      if (!seen.has(dedupeKey)) {
        seen.add(dedupeKey);
        out.push({
          id: `iptv:${tvgId || n}:${n}`,
          name,
          description: country ? `IPTV-Org • ${country}` : 'IPTV-Org global playlist',
          logo_url: logo,
          stream_url: streamUrl,
          category: normalizeCategory(group),
          is_live: true,
          current_program: 'Live Broadcast',
          viewer_count: 0,
          stream_type: streamType,
          is_alsamos_channel: false,
          embed_allowed: streamHealth !== 'unsupported' || playableCandidates.length > 0,
          share_enabled: true,
          source: 'iptv-org',
          stream_health: streamHealth === 'mixed-content' && playableCandidates.length > 0 ? 'ready' : streamHealth,
        });
        n += 1;
      }
    }

    i = j + 1;
  }

  return out.sort((a, b) => a.name.localeCompare(b.name));
}

async function fetchWithTimeout(url: string, timeoutMs = FETCH_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { cache: 'no-store', signal: controller.signal });
  } finally {
    window.clearTimeout(timeout);
  }
}

async function fetchWithFallback(url: string): Promise<string> {
  const proxies = [
    (u: string) => u,
    (u: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
    (u: string) => `https://corsproxy.io/?url=${encodeURIComponent(u)}`,
    (u: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(u)}`,
  ];
  let lastErr: unknown;

  for (const proxy of proxies) {
    try {
      const res = await fetchWithTimeout(proxy(url));
      if (!res.ok) continue;
      const text = await res.text();
      if (text.includes('#EXTM3U') && text.includes('#EXTINF')) return text;
    } catch (err) {
      lastErr = err;
    }
  }

  throw lastErr || new Error('IPTV-Org playlist fetch failed');
}

export function useIPTVChannels() {
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
            if (!cancelled) {
              setChannels(data);
              setLoading(false);
            }
            return;
          }
        }
      } catch {}

      try {
        const playlist = await fetchWithFallback(IPTV_INDEX_URL);
        const parsed = parseM3U(playlist);

        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data: parsed }));
        } catch {}

        if (!cancelled) {
          setChannels(parsed);
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
