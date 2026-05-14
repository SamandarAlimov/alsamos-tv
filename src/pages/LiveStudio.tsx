import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Radio, Settings, Users, Play, Pause,
  Camera, Mic, MicOff, MonitorPlay, Plus,
  Signal, Wifi, WifiOff, Clock, TrendingUp, Key,
  Copy, Check, RefreshCw, AlertTriangle, ExternalLink,
  Monitor, Tv, Cog, ShieldAlert, Calendar, Grid3X3,
  Music, Youtube
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import Navbar from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { cn } from '@/lib/utils';
import { EPGManager } from '@/components/EPGManager';
import { useChannels } from '@/hooks/useChannels';
import { AlsamosStudioPanel } from '@/components/AlsamosStudioPanel';

interface Channel {
  id: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  stream_url: string | null;
  stream_key: string | null;
  rtmp_url: string | null;
  category: string | null;
  is_live: boolean | null;
  viewer_count: number | null;
  current_program: string | null;
}

const LiveStudio = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { channels: epgChannels, schedules, loading: epgLoading } = useChannels();
  
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showStreamKey, setShowStreamKey] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [showOBSGuide, setShowOBSGuide] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [newChannel, setNewChannel] = useState({
    name: '',
    description: '',
    category: 'Entertainment',
    stream_url: ''
  });
  const [isCreating, setIsCreating] = useState(false);
  const [isGeneratingKey, setIsGeneratingKey] = useState(false);
  const [epgRefreshKey, setEpgRefreshKey] = useState(0);

  const handleEpgUpdate = () => {
    setEpgRefreshKey(prev => prev + 1);
  };

  useEffect(() => {
    checkAdminAccess();
  }, [user]);

  useEffect(() => {
    if (isAdmin) {
      fetchChannels();
      
      const channel = supabase
        .channel('channels-realtime')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'channels'
        }, () => {
          fetchChannels();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [isAdmin]);

  const checkAdminAccess = async () => {
    setIsLoading(true);
    if (!user) {
      setIsAdmin(false);
      setIsLoading(false);
      return;
    }

    // Check if user has admin role
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    setIsAdmin(!!data);
    setIsLoading(false);
  };

  const fetchChannels = async () => {
    const { data } = await supabase
      .from('channels')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (data) {
      setChannels(data as Channel[]);
      const alsamosChannel = data.find(c => c.name.includes('Alsamos'));
      if (alsamosChannel && !selectedChannel) {
        setSelectedChannel(alsamosChannel as Channel);
      }
    }
  };

  const generateStreamKey = async () => {
    if (!selectedChannel) return;
    
    setIsGeneratingKey(true);
    try {
      const { data, error } = await supabase.rpc('generate_stream_key' as any);
      
      if (error) throw error;
      
      const { error: updateError } = await supabase
        .from('channels')
        .update({ stream_key: data })
        .eq('id', selectedChannel.id);
      
      if (updateError) throw updateError;
      
      setSelectedChannel({ ...selectedChannel, stream_key: data });
      toast({ title: 'Stream Key Generated!', description: 'Your new stream key is ready' });
      fetchChannels();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsGeneratingKey(false);
    }
  };

  const handleCreateChannel = async () => {
    if (!newChannel.name) {
      toast({ title: 'Error', description: 'Channel name is required', variant: 'destructive' });
      return;
    }

    if (!user) {
      toast({ title: 'Login Required', description: 'Please login to create a channel', variant: 'destructive' });
      return;
    }

    setIsCreating(true);
    try {
      // Generate stream key for new channel
      const { data: streamKey, error: keyError } = await supabase.rpc('generate_stream_key' as any);
      
      if (keyError) {
        console.error('Stream key generation error:', keyError);
      }
      
      const { error } = await supabase.from('channels').insert({
        name: newChannel.name,
        description: newChannel.description,
        category: newChannel.category,
        stream_url: newChannel.stream_url || null,
        stream_key: streamKey || `live_${Date.now()}`,
        rtmp_url: 'rtmp://live.alsamos.tv/live',
        is_live: false,
        viewer_count: 0
      });

      if (error) throw error;

      toast({ title: 'Channel Created!', description: `${newChannel.name} is ready to go live` });
      setNewChannel({ name: '', description: '', category: 'Entertainment', stream_url: '' });
      fetchChannels();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggleStream = async () => {
    if (!selectedChannel) return;

    const { error } = await supabase
      .from('channels')
      .update({ is_live: !isStreaming })
      .eq('id', selectedChannel.id);

    if (!error) {
      setIsStreaming(!isStreaming);
      toast({ 
        title: isStreaming ? 'Stream Ended' : 'Going Live!', 
        description: isStreaming ? 'Your stream has ended' : 'You are now live!'
      });
    }
  };

  const copyToClipboard = (text: string, type: 'key' | 'url') => {
    navigator.clipboard.writeText(text);
    if (type === 'key') {
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    } else {
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    }
    toast({ title: 'Copied!' });
  };

  const formatViewers = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
    return num.toString();
  };

  const categories = ['Entertainment', 'News', 'Sports', 'Music', 'Documentary', 'Kids', 'Movies'];

  const rtmpUrl = selectedChannel?.rtmp_url || 'rtmp://live.alsamos.tv/live';

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-20 flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // Access denied for non-admins
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-20 flex items-center justify-center min-h-[60vh]">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center max-w-md mx-auto p-8"
          >
            <div className="w-20 h-20 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto mb-6">
              <ShieldAlert className="w-10 h-10 text-destructive" />
            </div>
            <h1 className="font-display font-bold text-2xl mb-3">Access Restricted</h1>
            <p className="text-muted-foreground mb-6">
              Live Studio is only available to Alsamos Corporation administrators. 
              Regular users can watch live TV channels on the Live TV page.
            </p>
            <div className="flex gap-3 justify-center">
              <Button variant="hero" onClick={() => navigate('/live')}>
                Watch Live TV
              </Button>
              <Button variant="outline" onClick={() => navigate('/')}>
                Go Home
              </Button>
            </div>
          </motion.div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="pt-20 pb-12">
        <div className="container mx-auto px-4 md:px-6">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent to-red-600 flex items-center justify-center">
                <Radio className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-display font-bold">Live Studio</h1>
                <p className="text-muted-foreground">Manage and broadcast live TV channels</p>
              </div>
            </div>
          </motion.div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Main Preview */}
            <div className="lg:col-span-2 space-y-6">
              {/* Stream Preview */}
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative aspect-video bg-card rounded-2xl overflow-hidden border border-border"
              >
                {selectedChannel ? (
                  <>
                    <video
                      src={selectedChannel.stream_url || "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"}
                      className="w-full h-full object-cover"
                      autoPlay
                      muted={isMuted}
                      loop
                      playsInline
                    />

                    {isStreaming && (
                      <div className="absolute top-4 left-4 flex items-center gap-2 bg-accent/90 px-3 py-1.5 rounded-lg">
                        <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                        <span className="text-sm font-bold text-white">LIVE</span>
                      </div>
                    )}

                    <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 to-transparent">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center font-bold">
                            {selectedChannel.name.charAt(0)}
                          </div>
                          <div>
                            <h3 className="font-semibold">{selectedChannel.name}</h3>
                            <p className="text-sm text-muted-foreground">{selectedChannel.current_program || 'No program scheduled'}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Users className="w-4 h-4" />
                          {formatViewers(selectedChannel.viewer_count || 0)} watching
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <MonitorPlay className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                      <p className="text-muted-foreground">Select a channel to preview</p>
                    </div>
                  </div>
                )}
              </motion.div>

              {/* Stream Controls */}
              {selectedChannel && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass-card p-4 rounded-xl"
                >
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-2">
                      <Button
                        variant={isStreaming ? 'destructive' : 'hero'}
                        size="lg"
                        onClick={handleToggleStream}
                        className="gap-2"
                      >
                        {isStreaming ? (
                          <>
                            <Pause className="w-5 h-5" /> End Stream
                          </>
                        ) : (
                          <>
                            <Play className="w-5 h-5 fill-current" /> Go Live
                          </>
                        )}
                      </Button>
                      
                      <Button
                        variant="glass"
                        size="icon"
                        onClick={() => setIsMuted(!isMuted)}
                      >
                        {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                      </Button>
                      
                      <Button variant="glass" size="icon">
                        <Camera className="w-5 h-5" />
                      </Button>
                      
                      <Button 
                        variant="glass" 
                        size="icon"
                        onClick={() => setShowOBSGuide(!showOBSGuide)}
                      >
                        <Cog className="w-5 h-5" />
                      </Button>
                    </div>

                    <div className="flex items-center gap-4 text-sm">
                      <span className={cn(
                        "flex items-center gap-1",
                        isStreaming ? "text-green-500" : "text-muted-foreground"
                      )}>
                        {isStreaming ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
                        {isStreaming ? 'Connected' : 'Offline'}
                      </span>
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Clock className="w-4 h-4" />
                        00:00:00
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* OBS/RTMP Setup Guide */}
              <AnimatePresence>
                {showOBSGuide && selectedChannel && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="glass-card rounded-xl overflow-hidden"
                  >
                    <div className="p-6 space-y-6">
                      <div className="flex items-center justify-between">
                        <h3 className="font-display font-bold text-xl flex items-center gap-2">
                          <Monitor className="w-5 h-5 text-primary" />
                          OBS/RTMP Stream Setup
                        </h3>
                        <Button variant="ghost" size="sm" onClick={() => setShowOBSGuide(false)}>
                          Close
                        </Button>
                      </div>

                      {/* Stream Credentials */}
                      <div className="grid md:grid-cols-2 gap-4">
                        {/* RTMP URL */}
                        <div className="space-y-2">
                          <label className="text-sm font-medium flex items-center gap-2">
                            <Signal className="w-4 h-4 text-primary" />
                            RTMP Server URL
                          </label>
                          <div className="flex gap-2">
                            <Input
                              value={rtmpUrl}
                              readOnly
                              className="font-mono text-sm bg-background"
                            />
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => copyToClipboard(rtmpUrl, 'url')}
                            >
                              {copiedUrl ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                            </Button>
                          </div>
                        </div>

                        {/* Stream Key */}
                        <div className="space-y-2">
                          <label className="text-sm font-medium flex items-center gap-2">
                            <Key className="w-4 h-4 text-primary" />
                            Stream Key
                          </label>
                          <div className="flex gap-2">
                            <div className="relative flex-1">
                              <Input
                                type={showStreamKey ? 'text' : 'password'}
                                value={selectedChannel.stream_key || 'No key generated'}
                                readOnly
                                className="font-mono text-sm bg-background pr-20"
                              />
                              <Button
                                variant="ghost"
                                size="sm"
                                className="absolute right-1 top-1/2 -translate-y-1/2 text-xs"
                                onClick={() => setShowStreamKey(!showStreamKey)}
                              >
                                {showStreamKey ? 'Hide' : 'Show'}
                              </Button>
                            </div>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => selectedChannel.stream_key && copyToClipboard(selectedChannel.stream_key, 'key')}
                              disabled={!selectedChannel.stream_key}
                            >
                              {copiedKey ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={generateStreamKey}
                              disabled={isGeneratingKey}
                            >
                              <RefreshCw className={cn("w-4 h-4", isGeneratingKey && "animate-spin")} />
                            </Button>
                          </div>
                        </div>
                      </div>

                      {/* Warning */}
                      <div className="flex items-start gap-3 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                        <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                        <div className="text-sm">
                          <p className="font-medium text-yellow-500">Keep your stream key private!</p>
                          <p className="text-muted-foreground">Never share your stream key. If compromised, generate a new one immediately.</p>
                        </div>
                      </div>

                      {/* OBS Setup Instructions */}
                      <div className="space-y-4">
                        <h4 className="font-semibold flex items-center gap-2">
                          <Tv className="w-4 h-4" />
                          OBS Studio Setup Instructions
                        </h4>
                        
                        <div className="grid gap-3">
                          {[
                            { step: 1, title: 'Download OBS Studio', desc: 'Get OBS from obsproject.com if you haven\'t already' },
                            { step: 2, title: 'Open Settings', desc: 'Go to Settings → Stream in OBS' },
                            { step: 3, title: 'Select Service', desc: 'Choose "Custom..." from the Service dropdown' },
                            { step: 4, title: 'Enter Server URL', desc: `Paste: ${rtmpUrl}` },
                            { step: 5, title: 'Enter Stream Key', desc: 'Paste your stream key from above' },
                            { step: 6, title: 'Configure Output', desc: 'Set bitrate to 4500-6000 kbps for 1080p' },
                            { step: 7, title: 'Start Streaming', desc: 'Click "Start Streaming" in OBS, then "Go Live" here' },
                          ].map((item) => (
                            <div key={item.step} className="flex gap-3 p-3 bg-background/50 rounded-lg">
                              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                                <span className="text-sm font-bold text-primary">{item.step}</span>
                              </div>
                              <div>
                                <p className="font-medium">{item.title}</p>
                                <p className="text-sm text-muted-foreground">{item.desc}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Recommended Settings */}
                      <div className="space-y-3">
                        <h4 className="font-semibold">Recommended Stream Settings</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {[
                            { label: 'Resolution', value: '1920x1080' },
                            { label: 'Framerate', value: '30 or 60 FPS' },
                            { label: 'Bitrate', value: '4500-6000 kbps' },
                            { label: 'Encoder', value: 'x264 or NVENC' },
                          ].map((setting) => (
                            <div key={setting.label} className="p-3 bg-background/50 rounded-lg text-center">
                              <p className="text-xs text-muted-foreground">{setting.label}</p>
                              <p className="font-medium text-sm">{setting.value}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* External Links */}
                      <div className="flex gap-3">
                        <Button variant="outline" className="gap-2" asChild>
                          <a href="https://obsproject.com/download" target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="w-4 h-4" />
                            Download OBS
                          </a>
                        </Button>
                        <Button variant="outline" className="gap-2" asChild>
                          <a href="https://obsproject.com/wiki/" target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="w-4 h-4" />
                            OBS Documentation
                          </a>
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              <Tabs defaultValue="alsamos" className="space-y-4">
                <TabsList className="w-full grid grid-cols-4">
                  <TabsTrigger value="alsamos" className="gap-1">
                    <Music className="w-4 h-4" /> Alsamos
                  </TabsTrigger>
                  <TabsTrigger value="channels" className="gap-1">
                    <Radio className="w-4 h-4" /> Channels
                  </TabsTrigger>
                  <TabsTrigger value="epg" className="gap-1">
                    <Calendar className="w-4 h-4" /> EPG
                  </TabsTrigger>
                  <TabsTrigger value="create" className="gap-1">
                    <Plus className="w-4 h-4" /> Create
                  </TabsTrigger>
                </TabsList>

                {/* Alsamos Studio Tab */}
                <TabsContent value="alsamos" className="space-y-4">
                  <AlsamosStudioPanel onChannelUpdate={fetchChannels} />
                </TabsContent>

                <TabsContent value="channels" className="space-y-3">
                  {/* Quick link to TV Guide */}
                  <Link to="/tv-guide">
                    <Button variant="outline" className="w-full gap-2 mb-3">
                      <Grid3X3 className="w-4 h-4" />
                      Open Full TV Guide
                    </Button>
                  </Link>
                  
                  {channels.length > 0 ? (
                    channels.map((channel) => (
                      <motion.button
                        key={channel.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setSelectedChannel(channel)}
                        className={cn(
                          "w-full p-4 rounded-xl border transition-all text-left",
                          selectedChannel?.id === channel.id
                            ? "bg-primary/10 border-primary"
                            : "bg-card border-border hover:border-primary/50"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary to-gold-light flex items-center justify-center text-lg font-bold text-primary-foreground overflow-hidden">
                            {channel.logo_url ? (
                              <img src={channel.logo_url} alt={channel.name} className="w-full h-full object-cover" />
                            ) : (
                              channel.name.charAt(0)
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold truncate">{channel.name}</h4>
                              {channel.is_live && (
                                <span className="w-2 h-2 bg-accent rounded-full animate-pulse" />
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground truncate">
                              {channel.category} • {formatViewers(channel.viewer_count || 0)} viewers
                            </p>
                          </div>
                        </div>
                      </motion.button>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <Signal className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                      <p className="text-muted-foreground">No channels yet</p>
                      <p className="text-sm text-muted-foreground/70">Create your first channel</p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="epg" className="space-y-4">
                  <EPGManager 
                    key={epgRefreshKey}
                    channels={epgChannels} 
                    schedules={schedules} 
                    onUpdate={handleEpgUpdate}
                  />
                </TabsContent>

                <TabsContent value="create" className="space-y-4">
                  <div className="glass-card p-4 rounded-xl space-y-4">
                    <h3 className="font-semibold">Create New Channel</h3>
                    
                    <Input
                      placeholder="Channel Name (e.g., Alsamos TV)"
                      value={newChannel.name}
                      onChange={(e) => setNewChannel(prev => ({ ...prev, name: e.target.value }))}
                    />
                    
                    <Textarea
                      placeholder="Channel Description"
                      value={newChannel.description}
                      onChange={(e) => setNewChannel(prev => ({ ...prev, description: e.target.value }))}
                    />
                    
                    <select
                      value={newChannel.category}
                      onChange={(e) => setNewChannel(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full p-2 rounded-lg bg-background border border-border"
                    >
                      {categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                    
                    <Button 
                      onClick={handleCreateChannel} 
                      disabled={isCreating || !newChannel.name}
                      className="w-full"
                    >
                      {isCreating ? 'Creating...' : 'Create Channel'}
                    </Button>
                    
                    <p className="text-xs text-muted-foreground text-center">
                      Stream key will be auto-generated
                    </p>
                  </div>
                </TabsContent>
              </Tabs>

              {/* Quick Stats */}
              <div className="glass-card p-4 rounded-xl">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  Live Stats
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-background/50 rounded-lg text-center">
                    <p className="text-2xl font-bold text-gradient-gold">{channels.length}</p>
                    <p className="text-xs text-muted-foreground">Channels</p>
                  </div>
                  <div className="p-3 bg-background/50 rounded-lg text-center">
                    <p className="text-2xl font-bold text-gradient-gold">
                      {channels.filter(c => c.is_live).length}
                    </p>
                    <p className="text-xs text-muted-foreground">Live Now</p>
                  </div>
                  <div className="p-3 bg-background/50 rounded-lg text-center">
                    <p className="text-2xl font-bold text-gradient-gold">
                      {formatViewers(channels.reduce((sum, c) => sum + (c.viewer_count || 0), 0))}
                    </p>
                    <p className="text-xs text-muted-foreground">Total Viewers</p>
                  </div>
                  <div className="p-3 bg-background/50 rounded-lg text-center">
                    <p className="text-2xl font-bold text-accent">24/7</p>
                    <p className="text-xs text-muted-foreground">Uptime</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default LiveStudio;
