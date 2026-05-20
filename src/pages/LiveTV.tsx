import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Radio, Users, Play, Pause, Clock, Grid3X3, Tv,
  Minimize2, ChevronUp, ChevronDown, ChevronLeft, ChevronRight,
  Volume2, VolumeX, Maximize, PictureInPicture2, LayoutGrid,
  Signal, Wifi, Share2, Heart, Info, X, Search,
  ShieldCheck, AlertTriangle, RotateCcw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import Navbar from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { cn } from '@/lib/utils';
import { useChannels, Channel } from '@/hooks/useChannels';
import { MiniPlayer } from '@/components/MiniPlayer';
import { HLSPlayer } from '@/components/HLSPlayer';
import { YouTubePlayer, YTPlayer } from '@/components/YouTubePlayer';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { DVRTimeline } from '@/components/DVRTimeline';
import { GlassChannelCard } from '@/components/live/GlassChannelCard';
import { CategoryFilter } from '@/components/live/CategoryFilter';

import { VirtualChannelList } from '@/components/live/VirtualChannelList';
import { SourceFilter, ChannelSource } from '@/components/live/SourceFilter';
import { getSyncedPlaybackPosition, getSyncedPlaybackPositionWithOffset } from '@/utils/playlistSync';
import { rankedSearch } from '@/utils/search';
import { getStreamCandidates, getStreamHealth } from '@/utils/streams';

function isBrowserPlayableChannel(channel: Channel | null | undefined, failedIds = new Set<string>(), strict = false) {
  if (!channel || failedIds.has(channel.id)) return false;
  if (channel.youtube_video_id || channel.stream_type === 'youtube_playlist' || channel.stream_type === 'youtube_live') return true;
  if (!channel.stream_url) return false;
  const health = channel.stream_health || getStreamHealth(channel.stream_url, channel.stream_type);
  const hasFallback = getStreamCandidates(channel.stream_url, {
    referer: channel.http_referrer,
    userAgent: channel.http_user_agent,
  }).length > 0;
  if (channel.embed_allowed === false && !hasFallback) return false;
  if (strict) return (health !== 'unsupported' && health !== 'mixed-content') || hasFallback;
  return health !== 'unsupported' || hasFallback;
}

const LiveTV = () => {
  const { id: routeChannelId } = useParams<{ id?: string }>();
  const [searchParams] = useSearchParams();
  const requestedChannelId = searchParams.get('channel') || routeChannelId;
  const { channels, loading, getCurrentProgram, getChannelSchedule } = useChannels();
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [volume, setVolume] = useState(100);
  const [showMiniPlayer, setShowMiniPlayer] = useState(false);
  const [miniPlayerChannel, setMiniPlayerChannel] = useState<Channel | null>(null);
  const [isTheaterMode, setIsTheaterMode] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showInfo, setShowInfo] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedSource, setSelectedSource] = useState<ChannelSource>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showPlayableOnly, setShowPlayableOnly] = useState(false);
  const [failedChannelIds, setFailedChannelIds] = useState<Set<string>>(new Set());
  const [mobileTab, setMobileTab] = useState<'channels' | 'schedule'>('channels');
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const youtubePlayerRef = useRef<YTPlayer | null>(null);
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  
  const [dvrOffset, setDvrOffset] = useState(0);
  const [isDvrLive, setIsDvrLive] = useState(true);

  const sourceCounts = useMemo(() => ({
    all: channels.length,
    alsamos: channels.filter(c => (c.source ?? 'alsamos') === 'alsamos').length,
    uz: channels.filter(c => c.source === 'uz').length,
    shams: channels.filter(c => c.source === 'shams').length,
    'iptv-org': channels.filter(c => c.source === 'iptv-org').length,
  }), [channels]);

  const sourceFiltered = useMemo(() => (
    selectedSource === 'all'
      ? channels
      : channels.filter(c => (c.source ?? 'alsamos') === selectedSource)
  ), [channels, selectedSource]);

  const playableFiltered = useMemo(() => (
    showPlayableOnly
      ? sourceFiltered.filter((channel) => isBrowserPlayableChannel(channel, failedChannelIds, true))
      : sourceFiltered
  ), [failedChannelIds, showPlayableOnly, sourceFiltered]);

  const categories = useMemo(() => (
    ['All', ...Array.from(new Set(playableFiltered.map(c => c.category).filter(Boolean) as string[]))]
  ), [playableFiltered]);

  const filteredChannels = useMemo(() => {
    const categoryFiltered = playableFiltered.filter(channel =>
      selectedCategory === 'All' || channel.category === selectedCategory
    );

    return searchQuery.trim()
      ? rankedSearch(categoryFiltered, searchQuery, (channel) => [
          channel.name,
          channel.description,
          channel.category,
          channel.current_program,
          channel.source,
        ])
      : categoryFiltered;
  }, [playableFiltered, selectedCategory, searchQuery]);

  // Reset key triggers VirtualChannelList to reset visibleCount/page when filters change
  const resetKey = `${selectedSource}|${selectedCategory}|${searchQuery}|${showPlayableOnly}`;

  useEffect(() => {
    if (channels.length === 0) return;
    const requested = requestedChannelId
      ? channels.find((channel) => channel.id === requestedChannelId)
      : null;
    const fallback = channels.find((channel) => isBrowserPlayableChannel(channel, failedChannelIds, true)) || channels[0];

    if (requested) {
      setSelectedChannel((current) => current?.id === requested.id ? current : requested);
      return;
    }

    setSelectedChannel((current) => {
      if (current && channels.some((channel) => channel.id === current.id)) return current;
      return fallback;
    });
  }, [channels, failedChannelIds, requestedChannelId]);

  useEffect(() => {
    setSelectedCategory('All');
  }, [selectedSource, showPlayableOnly]);

  const currentProgram = selectedChannel ? getCurrentProgram(selectedChannel.id) : undefined;
  const channelSchedule = selectedChannel ? getChannelSchedule(selectedChannel.id) : [];
  const currentIndex = selectedChannel ? Math.max(0, channels.findIndex(c => c.id === selectedChannel.id)) : 0;

  const formatViewers = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
    return num.toString();
  };

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 3000);
  };

  const toggleMute = () => {
    if (youtubePlayerRef.current) {
      if (isMuted) { youtubePlayerRef.current.unMute(); youtubePlayerRef.current.setVolume(volume); }
      else { youtubePlayerRef.current.mute(); }
    }
    if (videoRef.current) videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleVolumeChange = (value: number[]) => {
    const v = value[0];
    setVolume(v);
    if (videoRef.current) { videoRef.current.volume = v / 100; videoRef.current.muted = v === 0; }
    if (youtubePlayerRef.current) { youtubePlayerRef.current.setVolume(v); v === 0 ? youtubePlayerRef.current.mute() : youtubePlayerRef.current.unMute(); }
    setIsMuted(v === 0);
  };

  const goToPrevChannel = () => setSelectedChannel(channels[currentIndex > 0 ? currentIndex - 1 : channels.length - 1]);
  const goToNextChannel = () => setSelectedChannel(channels[currentIndex < channels.length - 1 ? currentIndex + 1 : 0]);

  const findNextPlayableChannel = useCallback((from: Channel | null, failedIds: Set<string>) => {
    if (channels.length === 0) return null;
    const startIndex = from ? Math.max(0, channels.findIndex((channel) => channel.id === from.id)) : 0;
    for (let offset = 1; offset <= channels.length; offset += 1) {
      const candidate = channels[(startIndex + offset) % channels.length];
      if (isBrowserPlayableChannel(candidate, failedIds, true)) return candidate;
    }
    return null;
  }, [channels]);

  const handleStreamError = useCallback(() => {
    if (!selectedChannel) return;
    const nextFailed = new Set(failedChannelIds);
    nextFailed.add(selectedChannel.id);
    setFailedChannelIds(nextFailed);

    const nextChannel = findNextPlayableChannel(selectedChannel, nextFailed);
    if (nextChannel) {
      setSelectedChannel(nextChannel);
    }
  }, [failedChannelIds, findNextPlayableChannel, selectedChannel]);

  const enterPiP = async () => {
    if (videoRef.current && document.pictureInPictureEnabled) {
      try { await videoRef.current.requestPictureInPicture(); toast.success('Picture-in-Picture enabled'); }
      catch { toast.error('Picture-in-Picture not available'); }
    }
  };

  const toggleFullscreen = async () => {
    const container = containerRef.current;
    if (!container) return;
    const doc = document as any;
    const el = container as any;
    const isFs = doc.fullscreenElement || doc.webkitFullscreenElement || doc.msFullscreenElement;
    try {
      if (isFs) {
        if (doc.exitFullscreen) await doc.exitFullscreen();
        else if (doc.webkitExitFullscreen) doc.webkitExitFullscreen();
        else if (doc.msExitFullscreen) doc.msExitFullscreen();
        return;
      }
      // Try container first
      if (el.requestFullscreen) { await el.requestFullscreen(); return; }
      if (el.webkitRequestFullscreen) { el.webkitRequestFullscreen(); return; }
      if (el.msRequestFullscreen) { el.msRequestFullscreen(); return; }
      // Fallback to media element (iframe / video) — needed for iOS Safari
      const iframe = container.querySelector('iframe') as any;
      const video = container.querySelector('video') as any;
      const mediaEl = iframe || video;
      if (mediaEl?.requestFullscreen) await mediaEl.requestFullscreen();
      else if (mediaEl?.webkitRequestFullscreen) mediaEl.webkitRequestFullscreen();
      else if (mediaEl?.webkitEnterFullscreen) mediaEl.webkitEnterFullscreen();
      else toast.error('Fullscreen qo\'llab-quvvatlanmaydi');
    } catch (err) { console.warn('Fullscreen failed:', err); }
  };

  // Keyboard shortcuts (desktop)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      switch (e.key.toLowerCase()) {
        case ' ':
        case 'k':
          e.preventDefault(); togglePlay(); break;
        case 'm':
          e.preventDefault(); toggleMute(); break;
        case 'f':
          e.preventDefault(); toggleFullscreen(); break;
        case 'arrowup':
          e.preventDefault(); handleVolumeChange([Math.min(100, volume + 5)]); break;
        case 'arrowdown':
          e.preventDefault(); handleVolumeChange([Math.max(0, volume - 5)]); break;
        case 'arrowright':
        case 'n':
          e.preventDefault(); goToNextChannel(); break;
        case 'arrowleft':
        case 'p':
          e.preventDefault(); goToPrevChannel(); break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, isMuted, volume, currentIndex, channels.length, selectedChannel?.id]);

  const handleChannelSelect = (channel: Channel) => {
    setSelectedChannel(channel);
    if (showMiniPlayer && miniPlayerChannel?.id === channel.id) { setShowMiniPlayer(false); setMiniPlayerChannel(null); }
  };

  const togglePlay = () => {
    if (videoRef.current) { isPlaying ? videoRef.current.pause() : videoRef.current.play(); }
    if (youtubePlayerRef.current) { isPlaying ? youtubePlayerRef.current.pauseVideo() : youtubePlayerRef.current.playVideo(); }
    setIsPlaying(!isPlaying);
  };

  const handleDvrSeek = useCallback((offsetSeconds: number) => {
    setDvrOffset(offsetSeconds);
    setIsDvrLive(offsetSeconds < 30);
    if (!youtubePlayerRef.current || !selectedChannel) return;
    if (selectedChannel.stream_type === 'youtube_playlist' && selectedChannel.youtube_video_id) {
      const pos = getSyncedPlaybackPositionWithOffset(100, offsetSeconds);
      youtubePlayerRef.current.playVideoAt(pos.videoIndex);
      setTimeout(() => { youtubePlayerRef.current?.seekTo(pos.seekToSeconds, true); youtubePlayerRef.current?.playVideo(); }, 800);
    }
  }, [selectedChannel]);

  const handleGoLive = useCallback(() => {
    setDvrOffset(0); setIsDvrLive(true);
    if (!youtubePlayerRef.current || !selectedChannel) return;
    if (selectedChannel.stream_type === 'youtube_playlist' && selectedChannel.youtube_video_id) {
      const pos = getSyncedPlaybackPosition(100);
      youtubePlayerRef.current.playVideoAt(pos.videoIndex);
      setTimeout(() => { youtubePlayerRef.current?.seekTo(pos.seekToSeconds, true); youtubePlayerRef.current?.playVideo(); }, 800);
    }
  }, [selectedChannel]);

  useEffect(() => { setDvrOffset(0); setIsDvrLive(true); }, [selectedChannel?.id]);

  // Progress for current program
  const programProgress = currentProgram ? Math.min(100, Math.max(0,
    ((Date.now() - new Date(currentProgram.start_time).getTime()) /
    (new Date(currentProgram.end_time).getTime() - new Date(currentProgram.start_time).getTime())) * 100
  )) : 0;
  const selectedHealth = selectedChannel?.stream_url
    ? selectedChannel.stream_health || getStreamHealth(selectedChannel.stream_url, selectedChannel.stream_type)
    : 'ready';
  const canPlaySelected = isBrowserPlayableChannel(selectedChannel, failedChannelIds, false);
  const selectedStreamCandidates = useMemo(
    () => getStreamCandidates(selectedChannel?.stream_url, {
      referer: selectedChannel?.http_referrer,
      userAgent: selectedChannel?.http_user_agent,
    }),
    [selectedChannel?.http_referrer, selectedChannel?.http_user_agent, selectedChannel?.stream_url]
  );
  const playableCount = channels.filter((channel) => isBrowserPlayableChannel(channel, failedChannelIds, true)).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-14 lg:pt-20">
          {/* Mobile skeleton */}
          <Skeleton className="aspect-video w-full lg:hidden" />
          <div className="p-4 space-y-3 lg:hidden">
            <Skeleton className="h-20 w-full rounded-2xl" />
            <div className="flex gap-2 overflow-hidden">
              {[1,2,3,4].map(i => <Skeleton key={i} className="h-16 w-20 rounded-xl flex-shrink-0" />)}
            </div>
            {[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
          </div>
          {/* Desktop skeleton */}
          <div className="hidden lg:flex flex-row">
            <div className="flex-1"><Skeleton className="aspect-video w-full" /></div>
            <div className="w-80 xl:w-96 p-4 space-y-3">
              {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-20 w-full rounded-2xl" />)}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col overflow-x-hidden">
      <Navbar />

      <div className="flex-1 pt-14 lg:pt-20 overflow-hidden">
        <div className={cn("flex flex-col lg:flex-row h-full", isTheaterMode && "lg:flex-col")}>
          {/* ===== PLAYER SECTION ===== */}
          <div className="flex-1 flex flex-col">
            <div 
              ref={containerRef}
              className={cn(
                "relative bg-black w-full",
                isTheaterMode ? "aspect-video max-h-[85vh]" : "aspect-video lg:aspect-auto lg:h-[calc(100vh-200px)] lg:min-h-[400px]"
              )}
              onMouseMove={handleMouseMove}
              onMouseLeave={() => isPlaying && setShowControls(false)}
              onTouchStart={() => { setShowControls(true); if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current); controlsTimeoutRef.current = setTimeout(() => { if (isPlaying) setShowControls(false); }, 4000); }}
            >
              {/* Video Source */}
              {canPlaySelected && (selectedChannel?.youtube_video_id || selectedChannel?.stream_type === 'youtube_playlist') ? (
                <YouTubePlayer
                  key={selectedChannel.id}
                  videoId={selectedChannel.stream_type !== 'youtube_playlist' ? selectedChannel.youtube_video_id : undefined}
                  playlistId={selectedChannel.stream_type === 'youtube_playlist' ? selectedChannel.youtube_video_id : undefined}
                  playlistLength={100}
                  syncEnabled={selectedChannel.stream_type === 'youtube_playlist'}
                  channelId={selectedChannel.youtube_channel_id}
                  isLive={selectedChannel.stream_type === 'youtube_live'}
                  autoplay={true}
                  muted={isMuted}
                  hideControls={true}
                  playerRef={youtubePlayerRef}
                  onMuteChange={(muted) => setIsMuted(muted)}
                  className="w-full h-full"
                />
              ) : canPlaySelected && selectedChannel?.stream_url ? (
                <HLSPlayer
                  ref={videoRef}
                  key={selectedChannel.id}
                  src={selectedChannel.stream_url}
                  srcs={selectedStreamCandidates}
                  muted={isMuted}
                  autoPlay
                  className="w-full h-full object-contain"
                  referrer={selectedChannel.http_referrer || undefined}
                  userAgent={selectedChannel.http_user_agent || undefined}
                  streamType={selectedChannel.stream_type}
                  onRecovering={() => setShowControls(true)}
                  onError={handleStreamError}
                />
              ) : selectedChannel ? (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-secondary to-background px-4">
                  <div className="max-w-md text-center">
                    <div className="w-20 h-20 md:w-24 md:h-24 mx-auto mb-4 md:mb-6 rounded-full glass flex items-center justify-center">
                      <AlertTriangle className="w-10 h-10 md:w-12 md:h-12 text-yellow-500" />
                    </div>
                    <h3 className="font-display text-lg md:text-xl font-semibold mb-1 md:mb-2 text-white">
                      Signal tiklanmoqda
                    </h3>
                    <p className="text-white/65 text-xs md:text-sm">
                      {selectedHealth === 'mixed-content'
                        ? 'Manba xavfsiz HTTPS kanaliga moslashtirilmoqda.'
                        : "Player avtomatik qayta ulanmoqda. Zarur bo'lsa keyingi stabil kanal tanlanadi."}
                    </p>
                    <div className="mt-5 flex flex-wrap justify-center gap-2">
                      <Button
                        variant="hero"
                        size="sm"
                        onClick={() => {
                          const next = findNextPlayableChannel(selectedChannel, failedChannelIds);
                          if (next) setSelectedChannel(next);
                        }}
                        className="gap-2"
                      >
                        <RotateCcw className="w-4 h-4" />
                        Keyingi ishlaydigan kanal
                      </Button>
                      <Button variant="glass" size="sm" onClick={() => setShowPlayableOnly(false)}>
                        Barchasini ko'rsatish
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="hidden" />
              )}
              {!selectedChannel && (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-secondary to-background">
                  <div className="text-center">
                    <div className="w-20 h-20 md:w-24 md:h-24 mx-auto mb-4 md:mb-6 rounded-full glass flex items-center justify-center">
                      <Signal className="w-10 h-10 md:w-12 md:h-12 text-muted-foreground animate-pulse" />
                    </div>
                    <h3 className="font-display text-lg md:text-xl font-semibold mb-1 md:mb-2">Stream Unavailable</h3>
                    <p className="text-muted-foreground text-xs md:text-sm">Bu kanal hozirda oflayn</p>
                  </div>
                </div>
              )}

              {/* Gradient Overlays */}
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-0 left-0 right-0 h-24 md:h-32 bg-gradient-to-b from-black/70 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 h-32 md:h-48 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />
              </div>

              {/* ===== PLAYER CONTROLS ===== */}
              <AnimatePresence>
                {showControls && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="absolute inset-0">
                    {/* Top Bar - Mobile optimized */}
                    <div className="absolute top-0 left-0 right-0 p-2.5 md:p-4 flex items-center justify-between">
                      <div className="flex items-center gap-1.5 md:gap-2">
                        {selectedChannel?.is_live && (
                          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent/90 backdrop-blur-sm text-[10px] md:text-xs font-bold uppercase tracking-wider text-accent-foreground">
                            <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                            Live
                          </div>
                        )}
                        {selectedChannel && selectedChannel.viewer_count > 0 && (
                          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full glass-subtle text-white/90 text-[10px] md:text-xs">
                            <Users className="w-3 h-3 md:w-3.5 md:h-3.5" />
                            <span className="font-medium">{formatViewers(selectedChannel.viewer_count)}</span>
                          </div>
                        )}
                        <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full glass-subtle text-white text-xs">
                          <Wifi className="w-3.5 h-3.5" />
                          <span className="font-medium">HD</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-0.5 md:gap-1.5">
                        <Button variant="ghost" size="icon" className="w-8 h-8 md:w-9 md:h-9 text-white hover:bg-white/20 rounded-full" onClick={() => toast.success('Sevimlilarga qo\'shildi')}>
                          <Heart className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="w-8 h-8 md:w-9 md:h-9 text-white hover:bg-white/20 rounded-full" onClick={() => setShowInfo(!showInfo)}>
                          <Info className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="w-8 h-8 md:w-9 md:h-9 text-white hover:bg-white/20 rounded-full"
                          onClick={() => { navigator.share?.({ title: selectedChannel?.name, url: window.location.href }).catch(() => { navigator.clipboard.writeText(window.location.href); toast.success('Link nusxalandi'); }); }}>
                          <Share2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Center Play - only visible when paused; doesn't intercept clicks otherwise */}
                    <AnimatePresence mode="wait">
                      {!isPlaying && (
                        <motion.button
                          onClick={togglePlay}
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0.8, opacity: 0 }}
                          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 md:w-20 md:h-20 rounded-full glass-strong flex items-center justify-center shadow-2xl ring-1 ring-white/10 hover:scale-105 transition-transform"
                          aria-label="Play"
                        >
                          <Play className="w-7 h-7 md:w-9 md:h-9 text-white fill-current ml-1" />
                        </motion.button>
                      )}
                    </AnimatePresence>

                    {/* Bottom Controls - Mobile compact */}
                    <div className="absolute bottom-0 left-0 right-0 p-2.5 md:p-4 lg:p-6">
                      {/* Channel Info - Mobile compact */}
                      <div className="flex items-center gap-2.5 md:gap-4 mb-2 md:mb-4">
                        <div className="w-10 h-10 md:w-14 md:h-14 rounded-xl glass flex items-center justify-center overflow-hidden flex-shrink-0">
                          {selectedChannel?.logo_url ? (
                            <img src={selectedChannel.logo_url} alt={selectedChannel?.name} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-base md:text-xl font-bold text-white">{selectedChannel?.name?.charAt(0)}</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h2 className="font-display font-bold text-sm md:text-xl text-white truncate">{selectedChannel?.name}</h2>
                          <p className="text-[11px] md:text-sm text-white/70 truncate">{currentProgram?.program_title || selectedChannel?.current_program || 'Live Broadcast'}</p>
                        </div>
                        {/* Desktop channel switcher */}
                        <div className="hidden md:flex items-center gap-1 glass-subtle rounded-full p-1">
                          <Button variant="ghost" size="icon" className="w-9 h-9 text-white hover:bg-white/20 rounded-full" onClick={goToPrevChannel}><ChevronUp className="w-5 h-5" /></Button>
                          <span className="text-sm text-white/80 font-mono px-2 min-w-[3rem] text-center">{currentIndex + 1}/{channels.length}</span>
                          <Button variant="ghost" size="icon" className="w-9 h-9 text-white hover:bg-white/20 rounded-full" onClick={goToNextChannel}><ChevronDown className="w-5 h-5" /></Button>
                        </div>
                      </div>

                      <DVRTimeline currentOffset={dvrOffset} onSeek={handleDvrSeek} onGoLive={handleGoLive} isLive={isDvrLive} className="mb-2 md:mb-3" />

                      {/* Control Bar - Mobile optimized */}
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-0.5 md:gap-2">
                          <Button variant="ghost" size="icon" className="w-9 h-9 md:w-10 md:h-10 text-white hover:bg-white/20 rounded-full" onClick={togglePlay}>
                            {isPlaying ? <Pause className="w-4 h-4 md:w-5 md:h-5" /> : <Play className="w-4 h-4 md:w-5 md:h-5 fill-current ml-0.5" />}
                          </Button>
                          {/* Mobile channel nav */}
                          <div className="flex md:hidden items-center gap-0">
                            <Button variant="ghost" size="icon" className="w-8 h-8 text-white hover:bg-white/20 rounded-full" onClick={goToPrevChannel}><ChevronLeft className="w-4 h-4" /></Button>
                            <span className="text-[10px] text-white/60 font-mono w-8 text-center">{currentIndex + 1}/{channels.length}</span>
                            <Button variant="ghost" size="icon" className="w-8 h-8 text-white hover:bg-white/20 rounded-full" onClick={goToNextChannel}><ChevronRight className="w-4 h-4" /></Button>
                          </div>
                          <div className="flex items-center gap-2 group">
                            <Button variant="ghost" size="icon" className="w-9 h-9 md:w-10 md:h-10 text-white hover:bg-white/20 rounded-full" onClick={toggleMute}>
                              {isMuted ? <VolumeX className="w-4 h-4 md:w-5 md:h-5" /> : <Volume2 className="w-4 h-4 md:w-5 md:h-5" />}
                            </Button>
                            <div className="hidden md:block w-0 group-hover:w-24 overflow-hidden transition-all duration-300">
                              <Slider value={[isMuted ? 0 : volume]} max={100} step={1} onValueChange={handleVolumeChange} className="w-24" />
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-0.5 md:gap-1">
                          <Button variant="ghost" size="icon" className="hidden md:flex w-10 h-10 text-white hover:bg-white/20 rounded-full" onClick={() => { setMiniPlayerChannel(selectedChannel); setShowMiniPlayer(true); toast.success('Mini player ochildi'); }} title="Mini Player">
                            <Minimize2 className="w-5 h-5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="hidden md:flex w-10 h-10 text-white hover:bg-white/20 rounded-full" onClick={enterPiP} title="Picture-in-Picture">
                            <PictureInPicture2 className="w-5 h-5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="hidden lg:flex w-10 h-10 text-white hover:bg-white/20 rounded-full" onClick={() => setIsTheaterMode(!isTheaterMode)} title="Theater Mode">
                            {isTheaterMode ? <LayoutGrid className="w-5 h-5" /> : <Tv className="w-5 h-5" />}
                          </Button>
                          <Button variant="ghost" size="icon" className="w-9 h-9 md:w-10 md:h-10 text-white hover:bg-white/20 rounded-full" onClick={toggleFullscreen} title="Fullscreen">
                            <Maximize className="w-4 h-4 md:w-5 md:h-5" />
                          </Button>
                        </div>
                      </div>

                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Info Panel */}
              <AnimatePresence>
                {showInfo && (
                  <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                    className="absolute top-0 right-0 bottom-0 w-full md:w-96 glass-strong p-4 md:p-6 overflow-y-auto z-30">
                    <div className="flex items-center justify-between mb-4 md:mb-6">
                      <h3 className="font-display font-semibold text-base md:text-lg text-white">Kanal ma'lumotlari</h3>
                      <Button variant="ghost" size="icon" className="w-8 h-8 md:w-9 md:h-9 text-white hover:bg-white/20 rounded-full" onClick={() => setShowInfo(false)}><X className="w-5 h-5" /></Button>
                    </div>
                    <div className="space-y-4 md:space-y-6">
                      <div className="flex items-center gap-3 md:gap-4">
                        <div className="w-14 h-14 md:w-16 md:h-16 rounded-xl glass flex items-center justify-center overflow-hidden">
                          {selectedChannel?.logo_url ? <img src={selectedChannel.logo_url} alt={selectedChannel?.name} className="w-full h-full object-cover" /> : <span className="text-xl md:text-2xl font-bold text-white">{selectedChannel?.name?.charAt(0)}</span>}
                        </div>
                        <div>
                          <h4 className="font-display font-bold text-white text-sm md:text-base">{selectedChannel?.name}</h4>
                          {selectedChannel?.category && <Badge variant="secondary" className="mt-1 glass-subtle border-0 text-[10px] md:text-xs">{selectedChannel.category}</Badge>}
                        </div>
                      </div>
                      <p className="text-xs md:text-sm text-white/70">{selectedChannel?.description || 'Premium kontent 24/7 efirda.'}</p>
                      {currentProgram && (
                        <div className="p-3 md:p-4 rounded-xl glass-card">
                          <p className="text-[10px] md:text-xs text-primary font-semibold uppercase tracking-wide mb-1.5 md:mb-2">Hozir efirda</p>
                          <h5 className="font-semibold text-white mb-1 text-sm">{currentProgram.program_title}</h5>
                          <p className="text-[10px] md:text-xs text-white/60">{format(new Date(currentProgram.start_time), 'h:mm a')} - {format(new Date(currentProgram.end_time), 'h:mm a')}</p>
                        </div>
                      )}
                      {channelSchedule.length > 0 && (
                        <div>
                          <p className="text-[10px] md:text-xs text-white/50 font-semibold uppercase tracking-wide mb-2 md:mb-3">Keyingi dasturlar</p>
                          <div className="space-y-1.5 md:space-y-2">
                            {channelSchedule.slice(0, 5).map(s => (
                              <div key={s.id} className="p-2.5 md:p-3 rounded-xl glass-subtle hover:bg-[hsl(222_47%_15%/0.5)] transition-colors">
                                <p className="text-xs md:text-sm text-white font-medium truncate">{s.program_title}</p>
                                <p className="text-[10px] md:text-xs text-white/50 mt-0.5">{format(new Date(s.start_time), 'h:mm a')}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      <Link to="/tv-guide" className="block">
                        <Button variant="outline" className="w-full gap-2 glass-subtle border-white/10 text-white hover:bg-white/10 text-xs md:text-sm">
                          <Grid3X3 className="w-4 h-4" />TV Guide
                        </Button>
                      </Link>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* ===== MOBILE CONTENT BELOW PLAYER ===== */}
            <div className="lg:hidden flex flex-col flex-1 pb-20">
              {/* Now Playing Card - Glassmorphism */}
              <div className="mx-3 mt-3 rounded-2xl glass-card p-3.5 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-transparent pointer-events-none" />
                <div className="relative flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl glass flex items-center justify-center overflow-hidden flex-shrink-0 ring-2 ring-primary/20">
                    {selectedChannel?.logo_url ? (
                      <img src={selectedChannel.logo_url} alt={selectedChannel?.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-lg font-bold text-primary">{selectedChannel?.name?.charAt(0)}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-display font-bold text-sm text-foreground truncate">{selectedChannel?.name}</h3>
                      {selectedChannel?.is_live && (
                        <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-accent/20 text-accent text-[9px] font-bold uppercase">
                          <span className="w-1 h-1 bg-accent rounded-full animate-pulse" />
                          Live
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                      {currentProgram?.program_title || selectedChannel?.current_program || 'Jonli efir'}
                    </p>
                    {currentProgram && (
                      <div className="mt-1.5">
                        <div className="h-1 rounded-full overflow-hidden bg-white/5">
                          <motion.div 
                            initial={{ width: 0 }} 
                            animate={{ width: `${programProgress}%` }}
                            className="h-full bg-gradient-to-r from-primary to-primary/60 rounded-full"
                          />
                        </div>
                        <div className="flex justify-between mt-0.5">
                          <span className="text-[9px] text-muted-foreground">{format(new Date(currentProgram.start_time), 'HH:mm')}</span>
                          <span className="text-[9px] text-muted-foreground">{format(new Date(currentProgram.end_time), 'HH:mm')}</span>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    {selectedChannel && selectedChannel.viewer_count > 0 && (
                      <span className="text-[9px] text-muted-foreground flex items-center gap-1">
                        <Users className="w-2.5 h-2.5" />
                        {formatViewers(selectedChannel.viewer_count)}
                      </span>
                    )}
                  </div>
                </div>
              </div>


              {/* Mobile Tabs - Channels / Schedule */}
              <div className="flex items-center gap-1 mx-3 mt-3 p-1 rounded-xl glass-subtle">
                <button
                  onClick={() => setMobileTab('channels')}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all",
                    mobileTab === 'channels' 
                      ? "bg-primary/20 text-primary shadow-sm" 
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Radio className="w-3.5 h-3.5" />
                  Kanallar
                </button>
                <button
                  onClick={() => setMobileTab('schedule')}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all",
                    mobileTab === 'schedule' 
                      ? "bg-primary/20 text-primary shadow-sm" 
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Clock className="w-3.5 h-3.5" />
                  Dastur
                </button>
              </div>

              {/* Mobile Tab Content */}
              <AnimatePresence mode="wait">
                {mobileTab === 'channels' ? (
                  <motion.div
                    key="channels"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="flex-1 px-3 mt-2"
                  >
                    {/* Search & Filter */}
                    <div className="space-y-2 mb-2">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                        <Input 
                          placeholder="Kanal qidirish..." 
                          value={searchQuery} 
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-9 h-9 glass-subtle border-white/5 text-xs rounded-xl"
                        />
                      </div>
                      <SourceFilter selected={selectedSource} onSelect={setSelectedSource} counts={sourceCounts} />
                      <button
                        type="button"
                        onClick={() => setShowPlayableOnly((value) => !value)}
                        className={cn(
                          "w-full flex items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold transition-all",
                          showPlayableOnly ? "bg-primary/15 text-primary ring-1 ring-primary/20" : "glass-subtle text-muted-foreground"
                        )}
                      >
                        <span className="flex items-center gap-2">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          Faqat ishlaydigan kanallar
                        </span>
                        <span className="font-mono text-[10px]">{playableCount}/{channels.length}</span>
                      </button>
                      <CategoryFilter categories={categories} selected={selectedCategory} onSelect={setSelectedCategory} />
                    </div>

                    {/* Virtualized Channel List */}
                    <div className="h-[calc(100vh-460px)] min-h-[320px]">
                      <VirtualChannelList
                        channels={filteredChannels}
                        selectedChannelId={selectedChannel?.id}
                        getCurrentProgram={getCurrentProgram}
                        onSelect={handleChannelSelect}
                        compact
                        resetKey={resetKey}
                        rowHeight={72}
                      />
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="schedule"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className="flex-1 px-3 mt-2"
                  >
                    {/* Schedule for current channel */}
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-display font-semibold text-xs text-foreground">
                        {selectedChannel?.name} — Bugungi dastur
                      </h4>
                      <Link to="/tv-guide">
                        <Button variant="ghost" size="sm" className="h-7 text-[10px] gap-1 text-primary hover:text-primary">
                          <Grid3X3 className="w-3 h-3" />
                          TV Guide
                        </Button>
                      </Link>
                    </div>
                    
                    {channelSchedule.length > 0 ? (
                      <div className="space-y-1.5">
                        {channelSchedule.map((s, idx) => {
                          const isNow = new Date(s.start_time) <= new Date() && new Date(s.end_time) > new Date();
                          const isPast = new Date(s.end_time) <= new Date();
                          return (
                            <motion.div
                              key={s.id}
                              initial={{ opacity: 0, y: 6 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: idx * 0.03 }}
                              className={cn(
                                "flex items-center gap-3 p-3 rounded-xl transition-all",
                                isNow ? "glass-card ring-1 ring-primary/20" : "glass-subtle",
                                isPast && "opacity-40"
                              )}
                            >
                              <div className="flex flex-col items-center flex-shrink-0 w-10">
                                <span className={cn("text-[11px] font-mono font-semibold", isNow ? "text-primary" : "text-muted-foreground")}>
                                  {format(new Date(s.start_time), 'HH:mm')}
                                </span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                  {isNow && (
                                    <span className="flex-shrink-0 w-1.5 h-1.5 bg-accent rounded-full animate-pulse" />
                                  )}
                                  <p className={cn("text-xs font-medium truncate", isNow ? "text-foreground" : "text-foreground/80")}>
                                    {s.program_title}
                                  </p>
                                </div>
                                {s.program_description && (
                                  <p className="text-[10px] text-muted-foreground truncate mt-0.5">{s.program_description}</p>
                                )}
                              </div>
                              {isNow && (
                                <Badge className="text-[8px] px-1.5 py-0.5 bg-primary/20 text-primary border-0 flex-shrink-0">
                                  HOZIR
                                </Badge>
                              )}
                            </motion.div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-10 glass-subtle rounded-2xl">
                        <Clock className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
                        <p className="text-xs text-muted-foreground">Dastur jadvali mavjud emas</p>
                        <Link to="/tv-guide">
                          <Button variant="ghost" size="sm" className="mt-2 text-[10px] text-primary">
                            TV Guide'ga o'tish
                          </Button>
                        </Link>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Info Bar - Desktop */}
            <div className="hidden lg:flex items-center justify-between p-4 glass-strong border-t border-white/5">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {currentProgram ? <>{format(new Date(currentProgram.start_time), 'h:mm a')} - {format(new Date(currentProgram.end_time), 'h:mm a')}</> : 'Jonli efir'}
                  </span>
                </div>
                {selectedChannel?.category && (<><div className="w-px h-4 bg-border" /><Badge variant="secondary" className="glass-subtle border-0">{selectedChannel.category}</Badge></>)}
              </div>
              <Link to="/tv-guide"><Button variant="ghost" size="sm" className="gap-2"><Grid3X3 className="w-4 h-4" />TV Guide</Button></Link>
            </div>
          </div>

          {/* Channel Sidebar - Desktop */}
          <div className={cn(
            "hidden lg:flex flex-col glass-strong border-l border-white/5 flex-shrink-0 overflow-hidden",
            isTheaterMode ? "lg:w-full lg:border-l-0 lg:border-t" : "lg:w-80 xl:w-96"
          )}>
            <div className="p-4 border-b border-white/5 space-y-3 overflow-hidden flex-shrink-0">
              <div className="flex items-center justify-between">
                <h3 className="font-display font-semibold text-sm">Kanallar</h3>
                <span className="text-xs text-muted-foreground">{filteredChannels.length} ta kanal</span>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Qidirish..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 glass-subtle border-white/5 text-sm" />
              </div>
              <SourceFilter selected={selectedSource} onSelect={setSelectedSource} counts={sourceCounts} />
              <button
                type="button"
                onClick={() => setShowPlayableOnly((value) => !value)}
                className={cn(
                  "flex items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold transition-all",
                  showPlayableOnly ? "bg-primary/15 text-primary ring-1 ring-primary/20" : "glass-subtle text-muted-foreground hover:text-foreground"
                )}
              >
                <span className="flex items-center gap-2">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Faqat ishlaydiganlar
                </span>
                <span className="font-mono text-[10px]">{playableCount}/{channels.length}</span>
              </button>
              <div className="overflow-x-auto scrollbar-hide">
                <CategoryFilter categories={categories} selected={selectedCategory} onSelect={setSelectedCategory} />
              </div>
            </div>

            <div className={cn("flex-1 p-3 min-h-0", isTheaterMode ? "h-48 lg:h-auto" : "h-[calc(100vh-340px)]")}>
              <VirtualChannelList
                channels={filteredChannels}
                selectedChannelId={selectedChannel?.id}
                getCurrentProgram={getCurrentProgram}
                onSelect={handleChannelSelect}
                compact={isTheaterMode}
                resetKey={resetKey}
                rowHeight={84}
              />
            </div>
          </div>
        </div>
      </div>

      <MiniPlayer
        channel={miniPlayerChannel}
        isVisible={showMiniPlayer}
        onClose={() => { setShowMiniPlayer(false); setMiniPlayerChannel(null); }}
        onExpand={() => { if (miniPlayerChannel) setSelectedChannel(miniPlayerChannel); setShowMiniPlayer(false); setMiniPlayerChannel(null); }}
      />

      {/* Footer only on desktop */}
      <div className="hidden lg:block">
        {!isTheaterMode && <Footer />}
      </div>
    </div>
  );
};

export default LiveTV;
