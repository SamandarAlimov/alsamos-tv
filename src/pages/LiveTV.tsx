import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Radio,
  Users,
  Play,
  Calendar,
  Clock,
  Grid3X3,
  Tv,
  Minimize2,
  ChevronUp,
  ChevronDown,
  Volume2,
  VolumeX,
  Maximize,
  PictureInPicture2,
  Settings,
  List,
  LayoutGrid
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import Navbar from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { cn } from '@/lib/utils';
import { useChannels, Channel } from '@/hooks/useChannels';
import { FeaturedChannelBanner } from '@/components/FeaturedChannelBanner';
import { ChannelSchedule } from '@/components/ChannelSchedule';
import { ChannelBrowser } from '@/components/ChannelBrowser';
import { MiniPlayer } from '@/components/MiniPlayer';
import { YouTubePlayer, YTPlayer } from '@/components/YouTubePlayer';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const LiveTV = () => {
  const { channels, loading, getCurrentProgram, getChannelSchedule, getFeaturedChannel } = useChannels();
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [showMiniPlayer, setShowMiniPlayer] = useState(false);
  const [miniPlayerChannel, setMiniPlayerChannel] = useState<Channel | null>(null);
  const [isTheaterMode, setIsTheaterMode] = useState(false);
  const [activeTab, setActiveTab] = useState<'channels' | 'schedule'>('channels');
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const youtubePlayerRef = useRef<YTPlayer | null>(null);

  useEffect(() => {
    if (channels.length > 0 && !selectedChannel) {
      setSelectedChannel(channels[0]);
    }
  }, [channels, selectedChannel]);

  const currentProgram = selectedChannel ? getCurrentProgram(selectedChannel.id) : undefined;
  const channelSchedule = selectedChannel ? getChannelSchedule(selectedChannel.id) : [];
  const featuredChannel = getFeaturedChannel();
  const currentIndex = selectedChannel ? channels.findIndex(c => c.id === selectedChannel.id) : 0;

  const formatViewers = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
    return num.toString();
  };

  const toggleMute = () => {
    // For HTML5 video
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
    // For YouTube player
    if (youtubePlayerRef.current) {
      if (isMuted) {
        youtubePlayerRef.current.unMute();
        youtubePlayerRef.current.setVolume(100);
      } else {
        youtubePlayerRef.current.mute();
      }
      setIsMuted(!isMuted);
    }
  };

  const goToPrevChannel = () => {
    if (currentIndex > 0) {
      setSelectedChannel(channels[currentIndex - 1]);
    }
  };

  const goToNextChannel = () => {
    if (currentIndex < channels.length - 1) {
      setSelectedChannel(channels[currentIndex + 1]);
    }
  };

  const enterPiP = async () => {
    if (videoRef.current && document.pictureInPictureEnabled) {
      try {
        await videoRef.current.requestPictureInPicture();
        toast.success('Picture-in-Picture enabled');
      } catch {
        toast.error('Picture-in-Picture not available');
      }
    }
  };

  const openMiniPlayer = () => {
    setMiniPlayerChannel(selectedChannel);
    setShowMiniPlayer(true);
    toast.success('Mini player opened');
  };

  const toggleFullscreen = () => {
    if (containerRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        containerRef.current.requestFullscreen();
      }
    }
  };

  const handleChannelSelect = (channel: Channel) => {
    setSelectedChannel(channel);
    // If mini player is showing different channel, keep it
    if (showMiniPlayer && miniPlayerChannel?.id === channel.id) {
      setShowMiniPlayer(false);
      setMiniPlayerChannel(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-20 container mx-auto px-4">
          <Skeleton className="h-48 w-full rounded-2xl mb-8" />
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Skeleton className="aspect-video w-full rounded-xl" />
            </div>
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-20 w-full rounded-lg" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="pt-20">
        {/* Featured Channel Banner */}
        {featuredChannel && !isTheaterMode && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="container mx-auto px-4 py-6"
          >
            <FeaturedChannelBanner
              channel={featuredChannel}
              currentProgram={getCurrentProgram(featuredChannel.id)}
              onWatch={() => setSelectedChannel(featuredChannel)}
            />
          </motion.div>
        )}

        <div className={cn(
          "grid gap-0 transition-all duration-300",
          isTheaterMode ? "grid-cols-1" : "lg:grid-cols-3"
        )}>
          {/* Video Player Section */}
          <div className={cn(
            "relative",
            isTheaterMode ? "" : "lg:col-span-2"
          )}>
            <div 
              ref={containerRef}
              className={cn(
                "relative bg-black group",
                isTheaterMode ? "aspect-video max-h-[80vh]" : "aspect-video"
              )}
            >
              {/* YouTube Stream (priority for Alsamos channels) */}
              {selectedChannel?.youtube_video_id || selectedChannel?.stream_type === 'youtube_playlist' ? (
                <YouTubePlayer
                  key={selectedChannel.id}
                  videoId={selectedChannel.stream_type !== 'youtube_playlist' ? selectedChannel.youtube_video_id : undefined}
                  playlistId={selectedChannel.stream_type === 'youtube_playlist' ? selectedChannel.youtube_video_id : undefined}
                  playlistLength={100} // Playlist has ~100 videos
                  syncEnabled={selectedChannel.stream_type === 'youtube_playlist'} // Enable 24/7 radio sync for playlists
                  channelId={selectedChannel.youtube_channel_id}
                  isLive={selectedChannel.stream_type === 'youtube_live'}
                  autoplay={true}
                  muted={isMuted}
                  hideControls={true}
                  playerRef={youtubePlayerRef}
                  onMuteChange={(muted) => setIsMuted(muted)}
                  className="w-full h-full"
                />
              ) : selectedChannel?.stream_url ? (
                <video
                  ref={videoRef}
                  key={selectedChannel.id}
                  src={selectedChannel.stream_url}
                  className="w-full h-full object-cover"
                  autoPlay
                  muted={isMuted}
                  loop
                  playsInline
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-center">
                    <Tv className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
                    <p className="text-muted-foreground">Stream unavailable</p>
                  </div>
                </div>
              )}

              {/* Video Controls Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                {/* Top Controls */}
                <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
                  {/* Live Badge */}
                  {selectedChannel?.is_live && (
                    <div className="flex items-center gap-2 glass px-3 py-1.5 rounded-lg">
                      <span className="w-2 h-2 bg-accent rounded-full animate-pulse" />
                      <span className="text-sm font-semibold text-white">LIVE</span>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2 ml-auto">
                    {selectedChannel?.viewer_count > 0 && (
                      <div className="flex items-center gap-1.5 glass px-3 py-1.5 rounded-lg">
                        <Users className="w-4 h-4 text-white" />
                        <span className="text-sm text-white">{formatViewers(selectedChannel.viewer_count)}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Center Play Button */}
                {!isPlaying && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Button
                      variant="play"
                      size="iconLg"
                      className="w-20 h-20 rounded-full"
                      onClick={() => {
                        videoRef.current?.play();
                        setIsPlaying(true);
                      }}
                    >
                      <Play className="w-8 h-8 fill-current ml-1" />
                    </Button>
                  </div>
                )}

                {/* Bottom Controls */}
                <div className="absolute bottom-4 left-4 right-4">
                  {/* Channel Info */}
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur flex items-center justify-center overflow-hidden">
                      {selectedChannel?.logo_url ? (
                        <img src={selectedChannel.logo_url} alt={selectedChannel?.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xl font-bold text-white">{selectedChannel?.name?.charAt(0)}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h2 className="font-display font-bold text-lg text-white truncate">{selectedChannel?.name}</h2>
                      <p className="text-sm text-white/70 truncate">
                        {currentProgram?.program_title || selectedChannel?.current_program || 'Live Broadcast'}
                      </p>
                    </div>
                  </div>

                  {/* Control Buttons */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {/* Channel Navigation */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-white hover:bg-white/20"
                        onClick={goToPrevChannel}
                        disabled={currentIndex === 0}
                      >
                        <ChevronUp className="w-5 h-5" />
                      </Button>
                      <span className="text-sm text-white/70 font-mono w-10 text-center">
                        {currentIndex + 1}/{channels.length}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-white hover:bg-white/20"
                        onClick={goToNextChannel}
                        disabled={currentIndex === channels.length - 1}
                      >
                        <ChevronDown className="w-5 h-5" />
                      </Button>

                      <div className="w-px h-6 bg-white/20 mx-2" />

                      {/* Volume */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-white hover:bg-white/20"
                        onClick={toggleMute}
                      >
                        {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                      </Button>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Mini Player */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-white hover:bg-white/20"
                        onClick={openMiniPlayer}
                        title="Mini Player"
                      >
                        <Minimize2 className="w-5 h-5" />
                      </Button>

                      {/* Picture in Picture */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-white hover:bg-white/20"
                        onClick={enterPiP}
                        title="Picture-in-Picture"
                      >
                        <PictureInPicture2 className="w-5 h-5" />
                      </Button>

                      {/* Theater Mode */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-white hover:bg-white/20"
                        onClick={() => setIsTheaterMode(!isTheaterMode)}
                        title="Theater Mode"
                      >
                        {isTheaterMode ? <LayoutGrid className="w-5 h-5" /> : <Tv className="w-5 h-5" />}
                      </Button>

                      {/* Fullscreen */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-white hover:bg-white/20"
                        onClick={toggleFullscreen}
                        title="Fullscreen"
                      >
                        <Maximize className="w-5 h-5" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Program Info & EPG */}
            <div className="p-4 md:p-6 border-b border-border">
              <div className="flex items-center gap-4 mb-4">
                <h3 className="font-display font-semibold text-xl">Now Playing</h3>
                {selectedChannel?.category && (
                  <span className="px-2.5 py-0.5 text-xs bg-secondary rounded-full">{selectedChannel.category}</span>
                )}
                <Link to="/tv-guide" className="ml-auto">
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <Grid3X3 className="w-4 h-4" />
                    Full TV Guide
                  </Button>
                </Link>
              </div>

              {currentProgram ? (
                <>
                  <h4 className="font-semibold text-lg mb-2">{currentProgram.program_title}</h4>
                  <p className="text-muted-foreground text-sm mb-4">
                    {currentProgram.program_description || `Live broadcast from ${selectedChannel?.name}.`}
                  </p>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-4 h-4" />
                      {format(new Date(currentProgram.start_time), 'MMM d, yyyy')}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4" />
                      {format(new Date(currentProgram.start_time), 'h:mm a')} - {format(new Date(currentProgram.end_time), 'h:mm a')}
                    </span>
                  </div>
                </>
              ) : (
                <p className="text-muted-foreground text-sm">
                  {selectedChannel?.description || `Live broadcast from ${selectedChannel?.name}. Enjoy premium content streaming 24/7.`}
                </p>
              )}

              {/* EPG Schedule */}
              {selectedChannel && channelSchedule.length > 0 && (
                <div className="mt-6 pt-6 border-t border-border">
                  <ChannelSchedule schedules={channelSchedule} channelName={selectedChannel.name} />
                </div>
              )}
            </div>
          </div>

          {/* Channel List / Browser */}
          {!isTheaterMode && (
            <div className="border-l border-border bg-card/50">
              <div className="sticky top-20">
                {/* Tabs */}
                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'channels' | 'schedule')}>
                  <div className="p-4 border-b border-border">
                    <TabsList className="w-full">
                      <TabsTrigger value="channels" className="flex-1 gap-1.5">
                        <Tv className="w-4 h-4" />
                        Channels
                      </TabsTrigger>
                      <TabsTrigger value="schedule" className="flex-1 gap-1.5">
                        <List className="w-4 h-4" />
                        Schedule
                      </TabsTrigger>
                    </TabsList>
                  </div>

                  <TabsContent value="channels" className="p-4 h-[calc(100vh-220px)] overflow-y-auto scrollbar-thin m-0">
                    <ChannelBrowser
                      channels={channels}
                      selectedChannel={selectedChannel}
                      onChannelSelect={handleChannelSelect}
                      getCurrentProgram={getCurrentProgram}
                    />
                  </TabsContent>

                  <TabsContent value="schedule" className="p-4 h-[calc(100vh-220px)] overflow-y-auto scrollbar-thin m-0">
                    {selectedChannel && channelSchedule.length > 0 ? (
                      <ChannelSchedule schedules={channelSchedule} channelName={selectedChannel.name} />
                    ) : (
                      <div className="text-center py-12 text-muted-foreground">
                        <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>No schedule available</p>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mini Player */}
      <MiniPlayer
        channel={miniPlayerChannel}
        isVisible={showMiniPlayer}
        onClose={() => {
          setShowMiniPlayer(false);
          setMiniPlayerChannel(null);
        }}
        onExpand={() => {
          if (miniPlayerChannel) {
            setSelectedChannel(miniPlayerChannel);
          }
          setShowMiniPlayer(false);
          setMiniPlayerChannel(null);
        }}
      />

      <Footer />
    </div>
  );
};

export default LiveTV;
