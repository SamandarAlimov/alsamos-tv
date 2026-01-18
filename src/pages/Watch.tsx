import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState, useCallback } from 'react';
import { VideoPlayer } from '@/components/VideoPlayer';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface ContentData {
  id: string;
  title: string;
  backdrop_url: string | null;
  video_url: string | null;
}

const Watch = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [content, setContent] = useState<ContentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialProgress, setInitialProgress] = useState(0);

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
            variant: 'destructive' 
          });
          navigate('/');
          return;
        }

        setContent(data);

        // Fetch viewing progress if user is logged in
        if (user) {
          const { data: historyData } = await supabase
            .from('viewing_history')
            .select('progress_seconds')
            .eq('user_id', user.id)
            .eq('content_id', id)
            .order('watched_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (historyData?.progress_seconds) {
            setInitialProgress(historyData.progress_seconds);
          }
        }
      } catch (err) {
        console.error('Error fetching content:', err);
        navigate('/');
      } finally {
        setLoading(false);
      }
    };

    fetchContent();
  }, [id, user, navigate, toast]);

  // Save viewing progress
  const handleProgressUpdate = useCallback(async (progress: number, duration: number) => {
    if (!user || !id) return;

    const completed = duration > 0 && progress / duration >= 0.9;

    try {
      // Check if there's an existing record
      const { data: existing } = await supabase
        .from('viewing_history')
        .select('id')
        .eq('user_id', user.id)
        .eq('content_id', id)
        .maybeSingle();

      if (existing) {
        // Update existing record
        await supabase
          .from('viewing_history')
          .update({
            progress_seconds: Math.floor(progress),
            completed,
            watched_at: new Date().toISOString(),
          })
          .eq('id', existing.id);
      } else {
        // Insert new record
        await supabase
          .from('viewing_history')
          .insert({
            user_id: user.id,
            content_id: id,
            progress_seconds: Math.floor(progress),
            completed,
          });
      }
    } catch (err) {
      console.error('Error saving progress:', err);
    }
  }, [user, id]);

  // Increment view count on first load
  useEffect(() => {
    const incrementViewCount = async () => {
      if (!id) return;

      try {
        await supabase.rpc('increment_view_count' as any, { content_id: id });
      } catch (err) {
        // Silently fail - view count is not critical
        console.error('Failed to increment view count:', err);
      }
    };

    if (content) {
      incrementViewCount();
    }
  }, [id, content]);

  if (loading) {
    return (
      <div className="w-full h-screen bg-black flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!content) {
    return null;
  }

  // Use sample video if no video_url is set
  const videoSrc = content.video_url || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';

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