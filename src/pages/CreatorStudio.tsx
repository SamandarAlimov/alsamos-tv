import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Upload, Video, BarChart3, Users, DollarSign, Settings,
  TrendingUp, Eye, Heart, MessageCircle, Clock, Plus,
  Film, Image, Music, Wand2, FileText, Mic, Play, Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import Navbar from '@/components/Navbar';

interface CreatorStats {
  totalViews: number;
  totalLikes: number;
  subscribers: number;
  earnings: number;
  videosCount: number;
}

interface VideoUpload {
  id: string;
  title: string;
  description: string;
  status: 'uploading' | 'processing' | 'published' | 'draft';
  progress: number;
  thumbnail: string | null;
  views: number;
  likes: number;
}

const CreatorStudio = () => {
  const { user, profile, subscription } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [stats, setStats] = useState<CreatorStats>({
    totalViews: 0,
    totalLikes: 0,
    subscribers: 0,
    earnings: 0,
    videosCount: 0
  });
  const [videos, setVideos] = useState<VideoUpload[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [newVideo, setNewVideo] = useState({
    title: '',
    description: '',
    file: null as File | null
  });

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchCreatorData();
  }, [user, navigate]);

  const fetchCreatorData = async () => {
    if (!user) return;

    // Fetch creator profile
    const { data: creatorProfile } = await supabase
      .from('creator_profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (creatorProfile) {
      setStats({
        totalViews: creatorProfile.total_views || 0,
        totalLikes: 0,
        subscribers: creatorProfile.subscriber_count || 0,
        earnings: Number(creatorProfile.total_earnings) || 0,
        videosCount: 0
      });
    }

    // Fetch videos
    const { data: userVideos } = await supabase
      .from('short_videos')
      .select('*')
      .eq('creator_id', user.id)
      .order('created_at', { ascending: false });

    if (userVideos) {
      setVideos(userVideos.map(v => ({
        id: v.id,
        title: v.title || 'Untitled',
        description: v.description || '',
        status: v.is_published ? 'published' : 'draft',
        progress: 100,
        thumbnail: v.thumbnail_url,
        views: v.view_count,
        likes: v.like_count
      })));

      const totalViews = userVideos.reduce((sum, v) => sum + v.view_count, 0);
      const totalLikes = userVideos.reduce((sum, v) => sum + v.like_count, 0);
      
      setStats(prev => ({
        ...prev,
        totalViews,
        totalLikes,
        videosCount: userVideos.length
      }));
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 500 * 1024 * 1024) {
        toast({ title: 'File too large', description: 'Maximum file size is 500MB', variant: 'destructive' });
        return;
      }
      setNewVideo(prev => ({ ...prev, file }));
    }
  };

  const handleUpload = async () => {
    if (!user || !newVideo.file || !newVideo.title) {
      toast({ title: 'Missing info', description: 'Please add a title and select a video file', variant: 'destructive' });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Upload video to storage
      const fileExt = newVideo.file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 500);

      const { error: uploadError } = await supabase.storage
        .from('videos')
        .upload(fileName, newVideo.file);

      clearInterval(progressInterval);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage.from('videos').getPublicUrl(fileName);

      // Create video record
      const { error: dbError } = await supabase.from('short_videos').insert({
        creator_id: user.id,
        title: newVideo.title,
        description: newVideo.description,
        video_url: urlData.publicUrl,
        is_published: true
      });

      if (dbError) throw dbError;

      setUploadProgress(100);
      toast({ title: 'Video uploaded!', description: 'Your video is now live' });
      
      // Reset form
      setNewVideo({ title: '', description: '', file: null });
      fetchCreatorData();
    } catch (error: any) {
      toast({ title: 'Upload failed', description: error.message, variant: 'destructive' });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDeleteVideo = async (videoId: string) => {
    const { error } = await supabase.from('short_videos').delete().eq('id', videoId);
    if (!error) {
      setVideos(prev => prev.filter(v => v.id !== videoId));
      toast({ title: 'Video deleted' });
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  if (!user) return null;

  const statCards = [
    { label: 'Total Views', value: formatNumber(stats.totalViews), icon: Eye, color: 'from-blue-500 to-cyan-500' },
    { label: 'Total Likes', value: formatNumber(stats.totalLikes), icon: Heart, color: 'from-pink-500 to-rose-500' },
    { label: 'Subscribers', value: formatNumber(stats.subscribers), icon: Users, color: 'from-purple-500 to-violet-500' },
    { label: 'Earnings', value: `$${stats.earnings.toFixed(2)}`, icon: DollarSign, color: 'from-green-500 to-emerald-500' },
  ];

  const aiTools = [
    { name: 'Auto-Edit', icon: Wand2, description: 'AI-powered video editing' },
    { name: 'Thumbnail Generator', icon: Image, description: 'Generate eye-catching thumbnails' },
    { name: 'Caption Generator', icon: FileText, description: 'Auto-generate captions' },
    { name: 'Background Music', icon: Music, description: 'AI music suggestions' },
    { name: 'Script Generator', icon: FileText, description: 'Generate video scripts' },
    { name: 'Voice Clone', icon: Mic, description: 'Clone your voice for dubbing' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="pt-20 pb-12">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-display font-bold mb-2">Creator Studio</h1>
            <p className="text-muted-foreground">Manage your content and grow your audience</p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {statCards.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="glass-card p-6 rounded-xl"
                >
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center mb-4`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </motion.div>
              );
            })}
          </div>

          {/* Main Content */}
          <Tabs defaultValue="upload" className="space-y-6">
            <TabsList className="bg-card/50 backdrop-blur-sm">
              <TabsTrigger value="upload" className="gap-2">
                <Upload className="w-4 h-4" /> Upload
              </TabsTrigger>
              <TabsTrigger value="content" className="gap-2">
                <Video className="w-4 h-4" /> Content
              </TabsTrigger>
              <TabsTrigger value="analytics" className="gap-2">
                <BarChart3 className="w-4 h-4" /> Analytics
              </TabsTrigger>
              <TabsTrigger value="ai-tools" className="gap-2">
                <Wand2 className="w-4 h-4" /> AI Tools
              </TabsTrigger>
            </TabsList>

            {/* Upload Tab */}
            <TabsContent value="upload">
              <div className="glass-card p-8 rounded-xl">
                <h2 className="text-xl font-semibold mb-6">Upload New Video</h2>
                
                <div className="space-y-6">
                  {/* File Upload */}
                  <div 
                    className="border-2 border-dashed border-white/20 rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="video/*"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    {newVideo.file ? (
                      <div className="flex items-center justify-center gap-4">
                        <Video className="w-12 h-12 text-primary" />
                        <div className="text-left">
                          <p className="font-medium">{newVideo.file.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {(newVideo.file.size / (1024 * 1024)).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                    ) : (
                      <>
                        <Upload className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                        <p className="text-lg font-medium mb-2">Drop your video here</p>
                        <p className="text-sm text-muted-foreground">or click to browse (max 500MB)</p>
                      </>
                    )}
                  </div>

                  {/* Video Details */}
                  <div className="space-y-4">
                    <Input
                      placeholder="Video title"
                      value={newVideo.title}
                      onChange={(e) => setNewVideo(prev => ({ ...prev, title: e.target.value }))}
                      className="bg-background/50"
                    />
                    <Textarea
                      placeholder="Video description"
                      value={newVideo.description}
                      onChange={(e) => setNewVideo(prev => ({ ...prev, description: e.target.value }))}
                      className="bg-background/50 min-h-[100px]"
                    />
                  </div>

                  {/* Upload Progress */}
                  {isUploading && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Uploading...</span>
                        <span>{uploadProgress}%</span>
                      </div>
                      <Progress value={uploadProgress} />
                    </div>
                  )}

                  <Button 
                    onClick={handleUpload} 
                    disabled={!newVideo.file || !newVideo.title || isUploading}
                    className="w-full"
                  >
                    {isUploading ? 'Uploading...' : 'Upload Video'}
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* Content Tab */}
            <TabsContent value="content">
              <div className="space-y-4">
                {videos.length > 0 ? (
                  videos.map((video) => (
                    <motion.div
                      key={video.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="glass-card p-4 rounded-xl flex items-center gap-4"
                    >
                      <div className="w-32 h-20 bg-muted rounded-lg flex items-center justify-center">
                        {video.thumbnail ? (
                          <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover rounded-lg" />
                        ) : (
                          <Film className="w-8 h-8 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium">{video.title}</h3>
                        <p className="text-sm text-muted-foreground line-clamp-1">{video.description}</p>
                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Eye className="w-4 h-4" /> {formatNumber(video.views)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Heart className="w-4 h-4" /> {formatNumber(video.likes)}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-xs ${
                            video.status === 'published' ? 'bg-green-500/20 text-green-500' : 'bg-yellow-500/20 text-yellow-500'
                          }`}>
                            {video.status}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">
                          <Play className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleDeleteVideo(video.id)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="text-center py-16">
                    <Video className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                    <h3 className="text-xl font-semibold mb-2">No videos yet</h3>
                    <p className="text-muted-foreground mb-4">Upload your first video to get started</p>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Analytics Tab */}
            <TabsContent value="analytics">
              <div className="glass-card p-8 rounded-xl">
                <h2 className="text-xl font-semibold mb-6">Analytics Overview</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-4 bg-white/5 rounded-lg">
                    <h3 className="font-medium mb-4">Views Over Time</h3>
                    <div className="h-48 flex items-end justify-around gap-2">
                      {[30, 50, 40, 70, 55, 85, 60].map((height, i) => (
                        <div key={i} className="w-8 bg-primary/50 rounded-t" style={{ height: `${height}%` }} />
                      ))}
                    </div>
                    <div className="flex justify-around mt-2 text-xs text-muted-foreground">
                      {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                        <span key={day}>{day}</span>
                      ))}
                    </div>
                  </div>

                  <div className="p-4 bg-white/5 rounded-lg">
                    <h3 className="font-medium mb-4">Engagement</h3>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Like Rate</span>
                          <span>4.2%</span>
                        </div>
                        <Progress value={42} />
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Comment Rate</span>
                          <span>1.8%</span>
                        </div>
                        <Progress value={18} />
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Share Rate</span>
                          <span>0.9%</span>
                        </div>
                        <Progress value={9} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* AI Tools Tab */}
            <TabsContent value="ai-tools">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {aiTools.map((tool, index) => {
                  const Icon = tool.icon;
                  return (
                    <motion.div
                      key={tool.name}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="glass-card p-6 rounded-xl hover:border-primary/50 transition-colors cursor-pointer"
                    >
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mb-4">
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <h3 className="font-semibold mb-1">{tool.name}</h3>
                      <p className="text-sm text-muted-foreground">{tool.description}</p>
                    </motion.div>
                  );
                })}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default CreatorStudio;
