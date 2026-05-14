import { useParams, useNavigate, Link } from 'react-router-dom';
import { useEffect, useState, useCallback, useRef } from 'react';
import { ArrowLeft } from 'lucide-react';
import { VideoPlayer } from '@/components/VideoPlayer';
import { YouTubePlayer, YTPlayer } from '@/components/YouTubePlayer';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface ContentData {
  id: string;
  title: string;
  backdrop_url: string | null;
  video_url: string | null;
}

// Extract YouTube video ID from common URL formats
function getYouTubeId(url: string | null | undefined): string | null {
  if (!url) return null;
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([A-Za-z0-9_-]{11})/,
  ];
  for (const re of patterns) {
    const m = url.match(re);
    if (m) return m[1];
  }
  return null;
}

const Watch = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [content, setContent] = useState<ContentData | null>(null);
  const [loading, setLoading] = useState(true);
  const ytRef = useRef<YTPlayer | null>(null);

  // Fetch content data
  useEffect(() => {
    const fetchContent = async () => {
      if (!id) {
        navigate('/');
        return;
      }

      try {
        const { data, error } = await supabase
          .from('content')
          .select('id, title, backdrop_url, video_url')
          .eq('id', id)
          .single();

        if (error || !data) {
          toast({
            title: 'Content not found',
            description: 'The requested content could not be found.',
            variant: 'destructive',
          });
          navigate('/');
          return;
        }

        setContent(data);
      } catch (err) {
        console.error('Error fetching content:', err);
        navigate('/');
      } finally {
        setLoading(false);
      }
    };

    fetchContent();
  }, [id, user, navigate, toast]);

  const handleProgressUpdate = useCallback(
    async (progress: number, duration: number) => {
      if (!user || !id) return;
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
      try {
        await supabase.rpc('increment_view_count' as any, { content_id: id });
      } catch (err) {
        console.error('Failed to increment view count:', err);
      }
    };
    if (content) incrementViewCount();
  }, [id, content]);

  if (loading) {
    return (
      <div className="w-full h-screen bg-black flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!content) return null;

  const ytId = getYouTubeId(content.video_url);

  // YouTube playback path — wrap with our own minimal overlay
  if (ytId) {
    return (
      <div className="w-full h-screen bg-black relative">
        <YouTubePlayer
          videoId={ytId}
          autoplay
          muted={false}
          fullControls
          hideControls={false}
          playerRef={ytRef}
          className="w-full h-full"
        />
        {/* Minimal top bar — pointer-events-none so it never blocks the player */}
        <div className="pointer-events-none absolute top-0 left-0 right-0 p-3 md:p-5 flex items-center gap-3 bg-gradient-to-b from-black/70 to-transparent">
          <Link to="/" className="pointer-events-auto">
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/15 backdrop-blur-md bg-white/5 rounded-full">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="font-display font-semibold text-base md:text-lg text-white truncate">
            {content.title}
          </h1>
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
        onProgressUpdate={handleProgressUpdate}
      />
    </div>
  );
};

export default Watch;
