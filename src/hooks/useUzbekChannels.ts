import { useEffect, useState } from 'react';
import type { Channel } from './useChannels';
import { getStreamCandidates, getStreamHealth } from '@/utils/streams';

const UZ_URLS = [
  'https://iptv-org.github.io/iptv/countries/uz.m3u',
  'https://iptv-org.github.io/iptv/languages/uzb.m3u',
];
const CACHE_KEY = 'uz_channels_cache_v3';
const CACHE_TTL = 1000 * 60 * 60 * 6;
const FETCH_TIMEOUT_MS = 10000;

function parseAttr(line: string, key: string): string | null {
  const m = line.match(new RegExp(`${key}="([^"]*)"`, 'i'));
  return m ? m[1] : null;
}

function parseM3U(text: string, idPrefix: string): Channel[] {
  const lines = text.split(/\r?\n/);
  const out: Channel[] = [];
  let i = 0, n = 0;
  while (i < lines.length) {
    const line = lines[i].trim();
    if (line.startsWith('#EXTINF')) {
      const commaIdx = line.indexOf(',');
      const name = commaIdx > -1 ? line.slice(commaIdx + 1).trim() : 'Unknown';
      const logo = parseAttr(line, 'tvg-logo');
      const group = parseAttr(line, 'group-title') || 'Uzbekistan';
      let j = i + 1;
      while (j < lines.length && (lines[j].trim() === '' || lines[j].trim().startsWith('#'))) j++;
      const url = lines[j]?.trim();
      if (url && /^https?:\/\//i.test(url)) {
        const streamUrl = url;
        const streamType = /\.m3u8(\?|$)/i.test(streamUrl) ? 'hls' : 'mpegts';
        const streamHealth = getStreamHealth(streamUrl, streamType);
        const playableCandidates = getStreamCandidates(streamUrl);
        out.push({
          id: `${idPrefix}:${n++}`,
          name,
          description: `O'zbekiston • ${group}`,
          logo_url: logo,
          stream_url: streamUrl,
          category: group || 'Uzbekistan',
          is_live: true,
          current_program: 'Live Broadcast',
          viewer_count: 0,
          stream_type: streamType,
          is_alsamos_channel: false,
          embed_allowed: streamHealth !== 'unsupported' || playableCandidates.length > 0,
          share_enabled: true,
          source: 'uz',
          stream_health: streamHealth === 'mixed-content' && playableCandidates.length > 0 ? 'ready' : streamHealth,
        });
      }
      i = j + 1;
    } else {
      i++;
    }
  }
  return out;
}

async function fetchWithTimeout(url: string, timeoutMs = FETCH_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    window.clearTimeout(timeout);
  }
}

async function fetchText(url: string): Promise<string> {
  try {
    const r = await fetchWithTimeout(url);
    if (r.ok) return await r.text();
  } catch {}
  // Fallback through allorigins
  const r = await fetchWithTimeout(`https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`);
  return await r.text();
}

export function useUzbekChannels() {
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
        const results = await Promise.all(
          UZ_URLS.map(async (u, idx) => {
            try { return parseM3U(await fetchText(u), `uz${idx}`); } catch { return []; }
          })
        );
        // Dedupe by name
        const map = new Map<string, Channel>();
        for (const arr of results) for (const c of arr) {
          const key = c.name.toLowerCase().trim();
          if (!map.has(key)) map.set(key, c);
        }
        const merged = Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
        try { localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data: merged })); } catch {}
        if (!cancelled) { setChannels(merged); setLoading(false); }
      } catch (e) {
        console.warn('Uzbek channels fetch failed', e);
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  return { uzChannels: channels, uzLoading: loading };
}
