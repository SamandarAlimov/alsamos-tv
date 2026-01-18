import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { 
  Heart, MessageCircle, Share2, Plus, Volume2, VolumeX, 
  Pause, Play, MoreHorizontal, User, Music2, X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

interface ShortVideo {
  id: string;
  creator_id: string;
  title: string | null;
  description: string | null;
  video_url: string;
  thumbnail_url: string | null;
  duration_seconds: number | null;
  view_count: number;
  like_count: number;
  comment_count: number;
  creator?: {
    display_name: string | null;
    avatar_url: string | null;
    username: string | null;
  };
  is_liked?: boolean;
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user: {
    display_name: string | null;
    avatar_url: string | null;
  };
}

// Sample demo videos for when database is empty
const demoVideos: ShortVideo[] = [
  {
    id: '1',
    creator_id: 'demo',
    title: 'Epic Movie Scene',
    description: 'Behind the scenes of the latest blockbuster 🎬 #cinema #movies',
    video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    thumbnail_url: null,
    duration_seconds: 15,
    view_count: 1250000,
    like_count: 89000,
    comment_count: 1200,
    creator: { display_name: 'Alsamos Studios', avatar_url: null, username: 'alsamosstudios' }
  },
  {
    id: '2',
    creator_id: 'demo',
    title: 'Sunset Vibes',
    description: 'Golden hour magic ✨ #nature #sunset',
    video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    thumbnail_url: null,
    duration_seconds: 12,
    view_count: 890000,
    like_count: 67000,
    comment_count: 890,
    creator: { display_name: 'Nature Clips', avatar_url: null, username: 'natureclips' }
  },
  {
    id: '3',
    creator_id: 'demo',
    title: 'Action Sequence',
    description: 'Intense action from our latest series 💥 #action #series',
    video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
    thumbnail_url: null,
    duration_seconds: 20,
    view_count: 2100000,
    like_count: 156000,
    comment_count: 3400,
    creator: { display_name: 'Action Hub', avatar_url: null, username: 'actionhub' }
  },
  {
    id: '4',
    creator_id: 'demo',
    title: 'Comedy Gold',
    description: 'This scene had me dying 😂 #comedy #funny',
    video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
    thumbnail_url: null,
    duration_seconds: 18,
    view_count: 3500000,
    like_count: 245000,
    comment_count: 5600,
    creator: { display_name: 'Comedy Central', avatar_url: null, username: 'comedycentral' }
  },
];

const formatCount = (count: number) => {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
};

const ShortVideoPlayer: React.FC<{
  video: ShortVideo;
  isActive: boolean;
  onLike: () => void;
  onComment: () => void;
  onFollow: () => void;
}> = ({ video, isActive, onLike, onComment, onFollow }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showControls, setShowControls] = useState(false);

  useEffect(() => {
    if (videoRef.current) {
      if (isActive) {
        videoRef.current.play().catch(() => {});
        setIsPlaying(true);
      } else {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
        setIsPlaying(false);
      }
    }
  }, [isActive]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const progress = (videoRef.current.currentTime / videoRef.current.duration) * 100;
      setProgress(progress);
    }
  };

  return (
    <div 
      className="relative w-full h-full bg-black"
      onClick={togglePlay}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      <video
        ref={videoRef}
        src={video.video_url}
        className="w-full h-full object-cover"
        loop
        muted={isMuted}
        playsInline
        onTimeUpdate={handleTimeUpdate}
      />

      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
        <div 
          className="h-full bg-primary transition-all duration-100"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Play/Pause indicator */}
      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
          >
            <div className="w-20 h-20 rounded-full bg-black/50 flex items-center justify-center">
              {isPlaying ? (
                <Pause className="w-10 h-10 text-white" />
              ) : (
                <Play className="w-10 h-10 text-white ml-1" />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Video info */}
      <div className="absolute bottom-4 left-4 right-20 text-white">
        <div className="flex items-center gap-2 mb-2">
          <Avatar className="w-10 h-10 border-2 border-white">
            <AvatarImage src={video.creator?.avatar_url || undefined} />
            <AvatarFallback>{video.creator?.display_name?.[0] || 'U'}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <p className="font-semibold text-sm">{video.creator?.display_name || 'User'}</p>
            <p className="text-xs opacity-70">@{video.creator?.username || 'user'}</p>
          </div>
          <Button 
            size="sm" 
            variant="outline" 
            className="border-white text-white hover:bg-white/20 rounded-full h-8"
            onClick={(e) => { e.stopPropagation(); onFollow(); }}
          >
            <Plus className="w-4 h-4 mr-1" /> Follow
          </Button>
        </div>
        
        <p className="text-sm mb-2 line-clamp-2">{video.description}</p>
        
        <div className="flex items-center gap-2 text-xs opacity-70">
          <Music2 className="w-4 h-4" />
          <span className="animate-marquee">Original sound - {video.creator?.display_name}</span>
        </div>
      </div>

      {/* Action buttons */}
      <div className="absolute right-4 bottom-24 flex flex-col items-center gap-6">
        <button 
          className="flex flex-col items-center gap-1"
          onClick={(e) => { e.stopPropagation(); onLike(); }}
        >
          <div className={`w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center ${video.is_liked ? 'text-red-500' : 'text-white'}`}>
            <Heart className={`w-7 h-7 ${video.is_liked ? 'fill-current' : ''}`} />
          </div>
          <span className="text-white text-xs font-medium">{formatCount(video.like_count)}</span>
        </button>

        <button 
          className="flex flex-col items-center gap-1"
          onClick={(e) => { e.stopPropagation(); onComment(); }}
        >
          <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white">
            <MessageCircle className="w-7 h-7" />
          </div>
          <span className="text-white text-xs font-medium">{formatCount(video.comment_count)}</span>
        </button>

        <button className="flex flex-col items-center gap-1">
          <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white">
            <Share2 className="w-7 h-7" />
          </div>
          <span className="text-white text-xs font-medium">Share</span>
        </button>

        <button
          className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white"
          onClick={(e) => { e.stopPropagation(); setIsMuted(!isMuted); }}
        >
          {isMuted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
        </button>
      </div>
    </div>
  );
};

const Shorts = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [videos, setVideos] = useState<ShortVideo[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchVideos();
  }, [user]);

  const fetchVideos = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('short_videos')
      .select('*')
      .eq('is_published', true)
      .order('created_at', { ascending: false })
      .limit(50);

    if (data && data.length > 0) {
      // Fetch creator profiles
      const creatorIds = [...new Set(data.map(v => v.creator_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url, username')
        .in('user_id', creatorIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]));

      // Check user likes if logged in
      let likedIds: string[] = [];
      if (user) {
        const { data: likes } = await supabase
          .from('likes')
          .select('short_video_id')
          .eq('user_id', user.id);
        likedIds = likes?.map(l => l.short_video_id) || [];
      }

      const enrichedVideos = data.map(v => ({
        ...v,
        creator: profileMap.get(v.creator_id),
        is_liked: likedIds.includes(v.id)
      }));

      setVideos(enrichedVideos);
    } else {
      // Use demo videos if database is empty
      setVideos(demoVideos);
    }
    setLoading(false);
  };

  const handleSwipe = useCallback((direction: 'up' | 'down') => {
    if (direction === 'up' && currentIndex < videos.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else if (direction === 'down' && currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  }, [currentIndex, videos.length]);

  const handleDragEnd = (_: any, info: PanInfo) => {
    if (info.offset.y < -100) {
      handleSwipe('up');
    } else if (info.offset.y > 100) {
      handleSwipe('down');
    }
  };

  const handleWheel = useCallback((e: WheelEvent) => {
    if (e.deltaY > 0) {
      handleSwipe('up');
    } else if (e.deltaY < 0) {
      handleSwipe('down');
    }
  }, [handleSwipe]);

  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.addEventListener('wheel', handleWheel, { passive: true });
      return () => container.removeEventListener('wheel', handleWheel);
    }
  }, [handleWheel]);

  const handleLike = async () => {
    if (!user) {
      navigate('/auth');
      return;
    }

    const video = videos[currentIndex];
    const isLiked = video.is_liked;

    // Optimistic update
    setVideos(prev => prev.map((v, i) => 
      i === currentIndex 
        ? { ...v, is_liked: !isLiked, like_count: isLiked ? v.like_count - 1 : v.like_count + 1 }
        : v
    ));

    if (video.creator_id === 'demo') return; // Demo video

    if (isLiked) {
      await supabase.from('likes').delete().eq('user_id', user.id).eq('short_video_id', video.id);
    } else {
      await supabase.from('likes').insert({ user_id: user.id, short_video_id: video.id });
    }
  };

  const handleComment = async () => {
    setShowComments(true);
    const video = videos[currentIndex];
    
    if (video.creator_id === 'demo') {
      setComments([]);
      return;
    }

    const { data } = await supabase
      .from('comments')
      .select('*')
      .eq('short_video_id', video.id)
      .order('created_at', { ascending: false });

    if (data) {
      // Fetch user profiles separately
      const userIds = [...new Set(data.map(c => c.user_id))];
      const { data: profiles } = await supabase.from('profiles').select('user_id, display_name, avatar_url').in('user_id', userIds);
      const profileMap = new Map(profiles?.map(p => [p.user_id, p]));
      
      setComments(data.map(c => ({
        id: c.id,
        content: c.content,
        created_at: c.created_at,
        user: profileMap.get(c.user_id) || { display_name: 'User', avatar_url: null }
      })));
    }
  };

  const submitComment = async () => {
    if (!user || !newComment.trim()) {
      if (!user) navigate('/auth');
      return;
    }

    const video = videos[currentIndex];
    if (video.creator_id === 'demo') {
      toast({ title: 'Demo mode', description: 'Comments disabled in demo mode' });
      return;
    }

    await supabase.from('comments').insert({
      user_id: user.id,
      short_video_id: video.id,
      content: newComment
    });

    setNewComment('');
    handleComment(); // Refresh comments
  };

  const handleFollow = () => {
    if (!user) {
      navigate('/auth');
      return;
    }
    toast({ title: 'Followed!', description: 'You are now following this creator' });
  };

  if (loading) {
    return (
      <div className="h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div ref={containerRef} className="h-screen bg-black overflow-hidden relative">
      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="absolute top-4 left-4 z-50 w-10 h-10 rounded-full bg-black/50 flex items-center justify-center text-white"
      >
        <X className="w-6 h-6" />
      </button>

      {/* Video feed */}
      <motion.div
        className="h-full"
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        onDragEnd={handleDragEnd}
      >
        <AnimatePresence initial={false}>
          <motion.div
            key={currentIndex}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="absolute inset-0"
          >
            {videos[currentIndex] && (
              <ShortVideoPlayer
                video={videos[currentIndex]}
                isActive={true}
                onLike={handleLike}
                onComment={handleComment}
                onFollow={handleFollow}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </motion.div>

      {/* Video indicator */}
      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col gap-1 z-40">
        {videos.map((_, i) => (
          <div
            key={i}
            className={`w-1 h-4 rounded-full transition-colors ${
              i === currentIndex ? 'bg-primary' : 'bg-white/30'
            }`}
          />
        ))}
      </div>

      {/* Comments panel */}
      <AnimatePresence>
        {showComments && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="absolute bottom-0 left-0 right-0 h-[60%] bg-background rounded-t-3xl z-50"
          >
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <h3 className="font-semibold">{videos[currentIndex]?.comment_count || 0} Comments</h3>
              <button onClick={() => setShowComments(false)}>
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="h-[calc(100%-120px)] overflow-y-auto p-4 space-y-4">
              {comments.length > 0 ? (
                comments.map(comment => (
                  <div key={comment.id} className="flex gap-3">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={comment.user?.avatar_url || undefined} />
                      <AvatarFallback>{comment.user?.display_name?.[0] || 'U'}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{comment.user?.display_name || 'User'}</p>
                      <p className="text-sm text-muted-foreground">{comment.content}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-muted-foreground py-8">No comments yet. Be the first!</p>
              )}
            </div>

            <div className="absolute bottom-0 left-0 right-0 p-4 bg-background border-t border-white/10">
              <div className="flex gap-2">
                <Input
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add a comment..."
                  className="flex-1"
                  onKeyDown={(e) => e.key === 'Enter' && submitComment()}
                />
                <Button onClick={submitComment}>Post</Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Shorts;
