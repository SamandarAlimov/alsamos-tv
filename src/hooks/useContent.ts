import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { fallbackContent } from '@/data/fallbackContent';
import { rankedSearch, normalizeSearchText } from '@/utils/search';
import { useShamsMovies } from './useShamsMovies';

export interface ContentItem {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  backdrop: string;
  trailer?: string;
  year: number;
  rating: string;
  duration: string;
  genres: string[];
  type: 'movie' | 'series' | 'short';
  seasons?: number;
  episodes?: number;
  cast?: string[];
  director?: string;
  aiScore?: number;
  isOriginal?: boolean;
  isNew?: boolean;
  isTrending?: boolean;
  videoUrl?: string;
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return '';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function getYouTubeId(value: string | null | undefined) {
  if (!value) return null;
  try {
    const parsed = new URL(value);
    const host = parsed.hostname.replace(/^www\./, '');
    if (host === 'youtu.be') return parsed.pathname.split('/').filter(Boolean)[0] || null;
    if (host.includes('youtube.com')) {
      const parts = parsed.pathname.split('/').filter(Boolean);
      return parsed.searchParams.get('v') || (['embed', 'shorts', 'live'].includes(parts[0]) ? parts[1] : null);
    }
    if (host.includes('ytimg.com')) {
      const parts = parsed.pathname.split('/').filter(Boolean);
      const viIndex = parts.findIndex((part) => part === 'vi');
      return viIndex >= 0 ? parts[viIndex + 1] || null : null;
    }
  } catch {
    const match = value.match(/(?:v=|youtu\.be\/|embed\/|shorts\/|live\/|\/vi\/)([A-Za-z0-9_-]{10,})/);
    return match?.[1] || null;
  }
  return null;
}

function youtubeImage(videoId: string, quality: 'hqdefault' | 'sddefault') {
  return `https://i.ytimg.com/vi/${videoId}/${quality}.jpg`;
}

function titleArtwork(title: string, wide = false) {
  const escapedTitle = title
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  const width = wide ? 1280 : 640;
  const height = wide ? 720 : 360;
  const fontSize = wide ? 82 : 44;
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#101827"/>
          <stop offset="0.48" stop-color="#1f2937"/>
          <stop offset="1" stop-color="#f59e0b"/>
        </linearGradient>
        <radialGradient id="glow" cx="72%" cy="22%" r="52%">
          <stop offset="0" stop-color="#fbbf24" stop-opacity="0.72"/>
          <stop offset="1" stop-color="#020617" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#bg)"/>
      <rect width="100%" height="100%" fill="url(#glow)"/>
      <rect x="34" y="34" width="${width - 68}" height="${height - 68}" rx="28" fill="none" stroke="rgba(255,255,255,0.22)" stroke-width="2"/>
      <text x="52" y="74" fill="#fbbf24" font-family="Arial, sans-serif" font-size="24" font-weight="700">ALSAMOS TV</text>
      <text x="52" y="${height - 102}" fill="#ffffff" font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="800">${escapedTitle}</text>
      <text x="52" y="${height - 56}" fill="rgba(255,255,255,0.72)" font-family="Arial, sans-serif" font-size="24">O'zbek kino</text>
    </svg>
  `;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function normalizeContentImages(row: any, title: string) {
  const videoId = getYouTubeId(row.thumbnail_url) || getYouTubeId(row.backdrop_url) || getYouTubeId(row.video_url);
  const brokenYouTubeIds = new Set(['3rR3Yk1BQDY', '0Z6QkqGq6Ks']);

  if (videoId && brokenYouTubeIds.has(videoId)) {
    return {
      thumbnail: titleArtwork(title),
      backdrop: titleArtwork(title, true),
    };
  }

  if (videoId) {
    return {
      thumbnail: youtubeImage(videoId, 'hqdefault'),
      backdrop: youtubeImage(videoId, 'sddefault'),
    };
  }

  return {
    thumbnail: row.thumbnail_url || titleArtwork(title),
    backdrop: row.backdrop_url || row.thumbnail_url || titleArtwork(title, true),
  };
}

function mapDbToContent(row: any): ContentItem {
  const videoId = getYouTubeId(row.video_url) || getYouTubeId(row.thumbnail_url) || getYouTubeId(row.backdrop_url);
  const shouldRenameSotqin = normalizeSearchText(row.title) === 'otam' && videoId === '7XrD7KN1Zpk';
  const title = shouldRenameSotqin ? 'Sotqin' : row.title;
  const images = normalizeContentImages(row, title);

  return {
    id: row.id,
    title,
    description: shouldRenameSotqin
      ? "Ishonch, xiyonat va oilaviy qadriyatlar haqida ta'sirli o'zbek filmi."
      : row.description || '',
    thumbnail: images.thumbnail,
    backdrop: images.backdrop,
    trailer: row.trailer_url || undefined,
    year: row.release_year || new Date().getFullYear(),
    rating: row.rating || 'NR',
    duration: formatDuration(row.duration_seconds),
    genres: row.genres || [],
    type: row.type === 'documentary' || row.type === 'live' ? 'movie' : row.type,
    seasons: row.seasons || undefined,
    episodes: row.episodes || undefined,
    cast: row.cast_members || undefined,
    director: row.director || undefined,
    aiScore: row.ai_score || undefined,
    isOriginal: row.is_original || false,
    isNew: false,
    isTrending: row.is_trending || false,
    videoUrl: row.video_url || undefined,
  };
}

function mergeContent(groups: ContentItem[][]) {
  const seenIds = new Set<string>();
  const seenTitles = new Set<string>();
  const merged: ContentItem[] = [];

  for (const item of groups.flat()) {
    const titleKey = normalizeSearchText(item.title);
    if (seenIds.has(item.id) || (titleKey && seenTitles.has(titleKey))) continue;
    seenIds.add(item.id);
    if (titleKey) seenTitles.add(titleKey);
    merged.push(item);
  }

  return merged;
}

export function useContent() {
  const [dbContent, setDbContent] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { shamsMovies } = useShamsMovies();

  useEffect(() => {
    const fetchContent = async () => {
      try {
        const { data, error } = await supabase
          .from('content')
          .select('*')
          .order('created_at', { ascending: false });

        if (data) {
          const mapped = data.map(mapDbToContent);
          setDbContent(mapped);
        }
        if (error) {
          console.error('Error fetching content:', error);
          setDbContent([]);
        }
      } catch (error) {
        console.error('Error fetching content:', error);
        setDbContent([]);
      } finally {
        setLoading(false);
      }
    };

    fetchContent();
  }, []);

  const allContent = useMemo(
    () => mergeContent([dbContent, shamsMovies, fallbackContent]),
    [dbContent, shamsMovies]
  );

  const featured = allContent.find(c => c.isTrending || c.isOriginal) || allContent[0] || null;
  const trending = allContent.filter(c => c.isTrending);
  const originals = allContent.filter(c => c.isOriginal);
  const movies = allContent.filter(c => c.type === 'movie');
  const series = allContent.filter(c => c.type === 'series');

  const getById = (id: string) => allContent.find(c => c.id === id) || null;

  const search = (query: string) => {
    return rankedSearch(allContent, query, (c) => [
      c.title,
      c.description,
      c.director,
      c.rating,
      c.year?.toString(),
      c.genres.join(' '),
      c.cast?.join(' '),
    ]);
  };

  return {
    allContent,
    featured,
    trending,
    originals,
    movies,
    series,
    loading,
    getById,
    search,
  };
}

export function useContinueWatching() {
  const { user } = useAuth();
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setItems([]);
      setLoading(false);
      return;
    }

    const fetch = async () => {
      const { data } = await supabase
        .from('viewing_history')
        .select('content_id, progress_seconds, content(*)')
        .eq('user_id', user.id)
        .eq('completed', false)
        .order('watched_at', { ascending: false })
        .limit(10);

      if (data) {
        const mapped = data
          .filter((d: any) => d.content)
          .map((d: any) => mapDbToContent(d.content));
        setItems(mapped);
      }
      setLoading(false);
    };

    fetch();
  }, [user]);

  return { items, loading };
}
