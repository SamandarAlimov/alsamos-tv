import { useEffect, useState } from 'react';
import type { ContentItem } from './useContent';
import { getLocalStreamProxyUrl, isHlsUrl } from '@/utils/streams';

const SHAMS_URLS = ['https://iptvshams.ru/ShamsTV.m3u8', 'http://iptvshams.ru/ShamsTV.m3u8'];
const CACHE_KEY = 'shams_movies_cache_v5';
const CACHE_TTL = 1000 * 60 * 60 * 6;
const FETCH_TIMEOUT_MS = 12000;
const MAX_MOVIES = 240;

function parseAttr(line: string, key: string): string | null {
  const re = new RegExp(`${key}="([^"]*)"`, 'i');
  const m = line.match(re);
  return m ? m[1] : null;
}

function getPlaylistProxyUrl(url: string) {
  return `/api/stream?raw=1&url=${encodeURIComponent(url)}`;
}

function getImageUrl(url: string | null) {
  if (!url) return '/placeholder.svg';
  if (/^https:\/\//i.test(url)) return url;
  return getLocalStreamProxyUrl(url) || url;
}

function getVideoUrl(url: string) {
  const isHls = isHlsUrl(url);
  return getLocalStreamProxyUrl(url, {
    forceHls: isHls,
    preferDirectHls: false,
  }) || url;
}

function normalizeDuration(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

function isUzbekMovieGroup(group: string) {
  const normalized = group.toLowerCase();
  return (
    (normalized.includes('фильмы') || normalized.includes('кино')) &&
    (normalized.includes('uzb') || normalized.includes('uzbek') || normalized.includes('узб'))
  );
}

function cleanTitle(value: string) {
  return value
    .replace(/\s*\(\s*uzb\s*\)\s*/gi, ' ')
    .replace(/\s*\|\s*uzbek\s*kino.*$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseM3U(text: string): ContentItem[] {
  const lines = text.split(/\r?\n/);
  const out: ContentItem[] = [];
  let i = 0;
  let n = 0;

  while (i < lines.length && out.length < MAX_MOVIES) {
    const line = lines[i].trim();
    if (!line.startsWith('#EXTINF')) {
      i += 1;
      continue;
    }

    const commaIdx = line.indexOf(',');
    const rawName = commaIdx > -1 ? line.slice(commaIdx + 1).trim() : 'Uzbek kino';
    const group = parseAttr(line, 'group-title') || '';
    const logo = parseAttr(line, 'tvg-logo');
    const xuiId = parseAttr(line, 'xui-id');
    const title = cleanTitle(parseAttr(line, 'tvg-name') || rawName);

    let j = i + 1;
    while (j < lines.length && (lines[j].trim() === '' || lines[j].trim().startsWith('#'))) {
      j += 1;
    }

    const streamUrl = lines[j]?.trim();
    if (streamUrl && /^https?:\/\//i.test(streamUrl) && isUzbekMovieGroup(group) && title) {
      const poster = getImageUrl(logo);
      out.push({
        id: `shams-movie-${xuiId || n}`,
        title,
        description: `${title} - ShamsTV katalogidan o'zbek tilidagi kino.`,
        thumbnail: poster,
        backdrop: poster,
        year: 2024,
        rating: 'PG-13',
        duration: normalizeDuration(90 * 60),
        genres: ["O'zbek kino", 'Drama'],
        type: 'movie',
        cast: [],
        director: 'ShamsTV',
        aiScore: 78 + (n % 18),
        isOriginal: false,
        isNew: n < 24,
        isTrending: n < 18,
        videoUrl: getVideoUrl(streamUrl),
      });
      n += 1;
    }

    i = j + 1;
  }

  return out;
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

async function fetchWithFallback(urls: string[]): Promise<string> {
  const proxies = [
    getPlaylistProxyUrl,
    (u: string) => u,
    (u: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
    (u: string) => `https://corsproxy.io/?url=${encodeURIComponent(u)}`,
  ];

  let lastError: unknown;
  for (const url of urls) {
    for (const proxy of proxies) {
      try {
        const response = await fetchWithTimeout(proxy(url));
        if (response.ok) {
          const text = await response.text();
          if (text.includes('#EXTM3U')) return text;
        }
      } catch (error) {
        lastError = error;
      }
    }
  }

  throw lastError || new Error('Shams movies playlist fetch failed');
}

export function useShamsMovies() {
  const [movies, setMovies] = useState<ContentItem[]>([]);
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
              setMovies(data);
              setLoading(false);
            }
            return;
          }
        }
      } catch {}

      try {
        const text = await fetchWithFallback(SHAMS_URLS);
        const parsed = parseM3U(text);
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data: parsed }));
        } catch {}
        if (!cancelled) setMovies(parsed);
      } catch (error) {
        console.warn('Shams movies fetch failed', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { shamsMovies: movies, shamsMoviesLoading: loading };
}
