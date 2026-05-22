import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useState, useCallback, useRef } from 'react';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { VideoPlayer } from '@/components/VideoPlayer';
import { YouTubePlayer, YTPlayer } from '@/components/YouTubePlayer';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { fallbackContent } from '@/data/fallbackContent';
import { normalizeSearchText } from '@/utils/search';
import { type ContentItem, useContent } from '@/hooks/useContent';

interface ContentData {
  id: string;
  title: string;
  backdrop_url: string | null;
  video_url: string | null;
}

type YouTubeSource = {
  videoId?: string;
  playlistId?: string;
};

const QOCHQIN_VIDEO_ID = 'lA2Tg_QuPVQ';
const QOCHQIN_VIDEO_URL = `https://www.youtube.com/watch?v=${QOCHQIN_VIDEO_ID}`;
const QOCHQIN_BACKDROP_URL = `https://i.ytimg.com/vi/${QOCHQIN_VIDEO_ID}/sddefault.jpg`;
const OLD_QOCHQIN_VIDEO_IDS = new Set(['AsuRRiXB0nU']);

// Extract YouTube video and playlist IDs from common URL formats.
function getYouTubeSource(url: string | null | undefined): YouTubeSource | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, '');
    const playlistId = parsed.searchParams.get('list') || undefined;

    if (host === 'youtu.be') {
      const videoId = parsed.pathname.split('/').filter(Boolean)[0];
      return videoId || playlistId ? { videoId, playlistId } : null;
    }

    if (host.endsWith('youtube.com') || host === 'youtube-nocookie.com') {
      const parts = parsed.pathname.split('/').filter(Boolean);
      const videoId =
        parsed.searchParams.get('v') ||
        (['embed', 'shorts', 'live'].includes(parts[0]) ? parts[1] : undefined);

      return videoId || playlistId ? { videoId: videoId || undefined, playlistId } : null;
    }
  } catch {
    const videoMatch = url.match(/(?:v=|youtu\.be\/|embed\/|shorts\/|live\/)([A-Za-z0-9_-]{10,})/);
    const playlistMatch = url.match(/[?&]list=([A-Za-z0-9_-]+)/);
    if (videoMatch?.[1] || playlistMatch?.[1]) {
      return { videoId: videoMatch?.[1], playlistId: playlistMatch?.[1] };
    }
  }
  return null;
}

const isUuid = (value: string | undefined) =>
  !!value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

function getFallbackContent(id: string | undefined): ContentData | null {
  if (!id) return null;
  const item = fallbackContent.find((content) => content.id === id);
  if (!item) return null;

  return {
    id: item.id,
    title: item.title,
    backdrop_url: item.backdrop,
    video_url: item.videoUrl || null,
  };
}

function mapCatalogToWatchContent(item: ContentItem): ContentData {
  return {
    id: item.id,
    title: item.title,
    backdrop_url: item.backdrop || item.thumbnail || null,
    video_url: item.videoUrl || null,
  };
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
  } catch {
    const match = value.match(/(?:v=|youtu\.be\/|embed\/|shorts\/|live\/)([A-Za-z0-9_-]{10,})/);
    return match?.[1] || null;
  }
  return null;
}

function normalizeWatchContent(content: ContentData): ContentData {
  const videoId = getYouTubeId(content.video_url);
  const normalizedTitle = normalizeSearchText(content.title);
  if (normalizedTitle === 'qochqin' || normalizedTitle.startsWith('qochqin ') || (!!videoId && OLD_QOCHQIN_VIDEO_IDS.has(videoId))) {
    return {
      ...content,
      title: 'Qochqin',
      backdrop_url: QOCHQIN_BACKDROP_URL,
      video_url: QOCHQIN_VIDEO_URL,
    };
  }
  if (normalizedTitle === 'otam' && videoId === '7XrD7KN1Zpk') {
    return { ...content, title: 'Sotqin' };
  }
  return content;
}

const Watch = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const { allContent, loading: catalogLoading, shamsMoviesLoading } = useContent();
  const [content, setContent] = useState<ContentData | null>(null);
  const [loading, setLoading] = useState(true);
  const ytRef = useRef<YTPlayer | null>(null);
  const youtubeContainerRef = useRef<HTMLDivElement>(null);

  // Fetch content data
  useEffect(() => {
    const fetchContent = async () => {
      if (!id) {
        navigate('/');
        return;
      }

      try {
        if (!isUuid(id)) {
          const routedContent = (location.state as { content?: ContentItem } | null)?.content;
          if (routedContent?.id === id) {
            setContent(normalizeWatchContent(mapCatalogToWatchContent(routedContent)));
            setLoading(false);
            return;
          }

          const catalogItem = allContent.find((item) => item.id === id) || null;
          if (catalogItem) {
            setContent(normalizeWatchContent(mapCatalogToWatchContent(catalogItem)));
            setLoading(false);
            return;
          }

          if (catalogLoading || shamsMoviesLoading) {
            setLoading(true);
            return;
          }

          toast({
            title: 'Kontent topilmadi',
            description: 'Ushbu kino katalogda topilmadi yoki ShamsTV ro‘yxati yuklanmadi.',
            variant: 'destructive',
          });
          navigate('/movies');
          setLoading(false);
          return;
        }

        const localContent = getFallbackContent(id);
        if (localContent) {
          setContent(normalizeWatchContent(localContent));
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from('content')
          .select('id, title, backdrop_url, video_url')
          .eq('id', id)
          .single();

        if (error || !data) {
          const fallback = getFallbackContent(id);
          if (fallback) {
            setContent(fallback);
            return;
          }

          toast({
            title: 'Content not found',
            description: 'The requested content could not be found.',
            variant: 'destructive',
          });
          navigate('/');
          return;
        }

        setContent(normalizeWatchContent(data));
      } catch (err) {
        console.error('Error fetching content:', err);
        navigate('/');
      } finally {
        setLoading(false);
      }
    };

    fetchContent();
  }, [allContent, catalogLoading, id, location.state, navigate, shamsMoviesLoading, toast]);

  const handleProgressUpdate = useCallback(
    async (progress: number, duration: number) => {
      if (!user || !id) return;
      if (!isUuid(id)) return;
      const completed = duration > 0 && progress / duration >= 0.9;
      try {
        const { data: existing } = await supabase
          .from('viewing_history')
          .select('id')
          .eq('user_id', user.id)
          .eq('content_id', id)
          .maybeSingle();

        if (existing) {
          await supabase
            .from('viewing_history')
            .update({
              progress_seconds: Math.floor(progress),
              completed,
              watched_at: new Date().toISOString(),
            })
            .eq('id', existing.id);
        } else {
          await supabase.from('viewing_history').insert({
            user_id: user.id,
            content_id: id,
            progress_seconds: Math.floor(progress),
            completed,
          });
        }
      } catch (err) {
        console.error('Error saving progress:', err);
      }
    },
    [user, id]
  );

  useEffect(() => {
    const incrementViewCount = async () => {
      if (!id) return;
      if (!isUuid(id)) return;
      try {
        await supabase.rpc('increment_view_count' as any, { content_id: id });
      } catch (err) {
        console.error('Failed to increment view count:', err);
      }
    };
    if (content) incrementViewCount();
  }, [id, content]);

  useEffect(() => {
    if (!content || !getYouTubeSource(content.video_url)) return;
    requestAnimationFrame(() => youtubeContainerRef.current?.focus({ preventScroll: true }));
  }, [content]);

  if (loading) {
    return (
      <div className="w-full h-screen bg-black flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!content) return null;

  const ytSource = getYouTubeSource(content.video_url);
  const goBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate('/');
  };

  const toggleYouTubeFullscreen = async () => {
    const container = youtubeContainerRef.current;
    if (!container) return;
    const doc = document as any;
    const el = container as any;
    try {
      if (doc.fullscreenElement || doc.webkitFullscreenElement || doc.msFullscreenElement) {
        if (doc.exitFullscreen) await doc.exitFullscreen();
        else if (doc.webkitExitFullscreen) doc.webkitExitFullscreen();
        else if (doc.msExitFullscreen) doc.msExitFullscreen();
        return;
      }
      if (el.requestFullscreen) await el.requestFullscreen();
      else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
      else if (el.msRequestFullscreen) el.msRequestFullscreen();
    } catch (error) {
      console.warn('YouTube fullscreen failed', error);
    }
  };

  const handleYouTubeKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (target !== youtubeContainerRef.current && target.closest('button, a[href]')) {
      if (event.key === 'Enter' || event.key === ' ') return;
    }

    const player = ytRef.current;
    const key = event.key.toLowerCase();
    const prevent = () => {
      event.preventDefault();
      event.stopPropagation();
    };

    switch (key) {
      case ' ':
      case 'enter':
      case 'ok':
      case 'accept':
      case 'select':
      case 'k':
        prevent();
        if (player?.getPlayerState?.() === 1) player.pauseVideo();
        else player?.playVideo();
        break;
      case 'f':
        prevent();
        toggleYouTubeFullscreen();
        break;
      case 'm':
        prevent();
        if (player?.isMuted?.()) player.unMute();
        else player?.mute();
        break;
      case 'arrowleft':
      case 'j':
        prevent();
        player?.seekTo(Math.max(0, (player.getCurrentTime?.() || 0) - 10), true);
        break;
      case 'arrowright':
      case 'l':
        prevent();
        player?.seekTo(Math.min(player.getDuration?.() || Number.MAX_SAFE_INTEGER, (player.getCurrentTime?.() || 0) + 10), true);
        break;
      case 'pagedown':
        prevent();
        player?.seekTo(Math.max(0, (player.getCurrentTime?.() || 0) - 60), true);
        break;
      case 'pageup':
        prevent();
        player?.seekTo(Math.min(player.getDuration?.() || Number.MAX_SAFE_INTEGER, (player.getCurrentTime?.() || 0) + 60), true);
        break;
      case 'arrowup':
        prevent();
        player?.setVolume(Math.min(100, (player.getVolume?.() || 0) + 5));
        player?.unMute();
        break;
      case 'arrowdown':
        prevent();
        player?.setVolume(Math.max(0, (player.getVolume?.() || 0) - 5));
        break;
      case 'escape':
      case 'backspace':
      case 'browserback':
        prevent();
        goBack();
        break;
    }
  };

  // YouTube playback path — wrap with our own minimal overlay
  if (ytSource) {
    return (
      <div
        ref={youtubeContainerRef}
        tabIndex={0}
        onKeyDown={handleYouTubeKeyDown}
        className="w-full h-screen bg-black relative focus:outline-none"
      >
        <YouTubePlayer
          videoId={ytSource.videoId}
          playlistId={ytSource.playlistId && !ytSource.videoId ? ytSource.playlistId : undefined}
          playlistLength={100}
          syncEnabled={!!ytSource.playlistId && !ytSource.videoId}
          autoplay
          muted={false}
          fullControls
          hideControls={false}
          playerRef={ytRef}
          className="w-full h-full"
        />
        {/* Minimal top bar — pointer-events-none so it never blocks the player */}
        <div className="pointer-events-none absolute top-0 left-0 right-0 z-50 p-3 md:p-5 flex items-center gap-3 bg-gradient-to-b from-black/85 via-black/45 to-transparent">
          <Button
            variant="ghost"
            size="icon"
            className="pointer-events-auto text-white hover:bg-white/15 backdrop-blur-md bg-white/10 rounded-full"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              goBack();
            }}
            aria-label="Orqaga qaytish"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-display font-semibold text-base md:text-lg text-white truncate">
            {content.title}
          </h1>
          {!ytSource.videoId && ytSource.playlistId && (
            <span className="ml-auto hidden sm:inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs text-white/75 backdrop-blur-md">
              <Loader2 className="w-3 h-3 animate-spin" />
              Serial playlist
            </span>
          )}
        </div>
      </div>
    );
  }

  // Direct video URL (mp4/HLS) path
  const videoSrc =
    content.video_url ||
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';

  return (
    <div className="w-full h-screen bg-black">
      <VideoPlayer
        src={videoSrc}
        poster={content.backdrop_url || undefined}
        title={content.title}
        contentId={content.id}
        onBack={goBack}
        onProgressUpdate={handleProgressUpdate}
      />
    </div>
  );
};

export default Watch;
