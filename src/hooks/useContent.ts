import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { fallbackContent } from '@/data/fallbackContent';
import { rankedSearch } from '@/utils/search';

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

function mapDbToContent(row: any): ContentItem {
  return {
    id: row.id,
    title: row.title,
    description: row.description || '',
    thumbnail: row.thumbnail_url || '/placeholder.svg',
    backdrop: row.backdrop_url || row.thumbnail_url || '/placeholder.svg',
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

export function useContent() {
  const [allContent, setAllContent] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchContent = async () => {
      try {
        const { data, error } = await supabase
          .from('content')
          .select('*')
          .order('created_at', { ascending: false });

        if (data) {
          const mapped = data.map(mapDbToContent);
          const existingIds = new Set(mapped.map((item) => item.id));
          setAllContent([
            ...mapped,
            ...fallbackContent.filter((item) => !existingIds.has(item.id)),
          ]);
        }
        if (error) {
          console.error('Error fetching content:', error);
          setAllContent(fallbackContent);
        }
      } catch (error) {
        console.error('Error fetching content:', error);
        setAllContent(fallbackContent);
      } finally {
        setLoading(false);
      }
    };

    fetchContent();
  }, []);

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
