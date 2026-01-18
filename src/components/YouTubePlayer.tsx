import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, VolumeX, Maximize, Minimize } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { getSyncedPlaybackPosition } from '@/utils/playlistSync';

interface YouTubePlayerProps {
  videoId?: string;
  channelId?: string;
  playlistId?: string;
  playlistLength?: number; // Number of videos in playlist for sync calculation
  isLive?: boolean;
  autoplay?: boolean;
  muted?: boolean;
  syncEnabled?: boolean; // Enable 24/7 radio-style sync
  className?: string;
  hideControls?: boolean;
  onReady?: () => void;
  onError?: () => void;
  onMuteChange?: (isMuted: boolean) => void;
  playerRef?: React.MutableRefObject<YTPlayer | null>;
}

export interface YTPlayer {
  playVideo: () => void;
  pauseVideo: () => void;
  mute: () => void;
  unMute: () => void;
  isMuted: () => boolean;
  setVolume: (volume: number) => void;
  getVolume: () => number;
  seekTo: (seconds: number, allowSeekAhead?: boolean) => void;
  playVideoAt: (index: number) => void;
  getPlaylistIndex: () => number;
  getCurrentTime: () => number;
  destroy: () => void;
}

interface YTPlayerEvent {
  target: YTPlayer;
  data: number;
}

// Extend Window interface for YouTube API
declare global {
  interface Window {
    YT: {
      Player: new (
        element: HTMLElement,
        config: {
          videoId: string;
          playerVars: Record<string, string | number>;
          events: {
            onReady?: (event: YTPlayerEvent) => void;
            onError?: (event: YTPlayerEvent) => void;
            onStateChange?: (event: YTPlayerEvent) => void;
          };
        }
      ) => YTPlayer;
      PlayerState: {
        ENDED: number;
        PLAYING: number;
        PAUSED: number;
        BUFFERING: number;
        CUED: number;
      };
    };
    onYouTubeIframeAPIReady: () => void;
  }
}

export function YouTubePlayer({ 
  videoId, 
  channelId,
  playlistId,
  playlistLength = 100, // Default playlist length for sync calculation
  isLive = false,
  autoplay = true,
  muted = true,
  syncEnabled = false, // 24/7 radio sync
  className,
  hideControls = false,
  onReady,
  onError,
  onMuteChange,
  playerRef: externalPlayerRef
}: YouTubePlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const internalPlayerRef = useRef<YTPlayer | null>(null);
  const playerRef = externalPlayerRef || internalPlayerRef;
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMuted, setIsMuted] = useState(muted);
  const [isPlaying, setIsPlaying] = useState(autoplay);
  const [showControls, setShowControls] = useState(true);
  const [volume, setVolume] = useState(muted ? 0 : 100);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const controlsTimeoutRef = useRef<NodeJS.Timeout>();

  // Load YouTube IFrame API
  useEffect(() => {
    if (window.YT && window.YT.Player) {
      return;
    }

    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
  }, []);

  // Initialize player when API is ready
  useEffect(() => {
    if (!videoId && !channelId && !playlistId) return;

    const initPlayer = () => {
      if (!playerContainerRef.current || playerRef.current) return;

      // Determine video source - playlist takes priority for music channels
      const videoSource = playlistId ? undefined : (isLive && channelId ? channelId : videoId);
      
      // Build player vars
      const playerVars: Record<string, string | number> = {
        autoplay: 1,
        mute: 1,
        controls: 0,
        modestbranding: 1,
        rel: 0,
        showinfo: 0,
        iv_load_policy: 3,
        disablekb: 1,
        fs: 0,
        playsinline: 1,
        loop: 1,
        origin: window.location.origin,
      };

      // If playlist, use listType=playlist
      if (playlistId) {
        playerVars.listType = 'playlist';
        playerVars.list = playlistId;
      } else if (videoSource) {
        playerVars.playlist = videoSource;
      }

      playerRef.current = new window.YT.Player(playerContainerRef.current, {
        videoId: videoSource || '',
        playerVars,
        events: {
          onReady: (event) => {
            setIsPlayerReady(true);
            
            // If sync is enabled, jump to the correct position
            if (syncEnabled && playlistId) {
              const syncPosition = getSyncedPlaybackPosition(playlistLength);
              console.log('Syncing to position:', syncPosition);
              
              // Small delay to ensure playlist is loaded
              setTimeout(() => {
                // Jump to the correct video in playlist
                event.target.playVideoAt(syncPosition.videoIndex);
                
                // After video starts, seek to correct position
                setTimeout(() => {
                  event.target.seekTo(syncPosition.seekToSeconds, true);
                }, 1000);
              }, 500);
            } else {
              event.target.playVideo();
            }
            
            onReady?.();
          },
          onError: () => {
            onError?.();
          },
          onStateChange: (event) => {
            // Auto-advance for playlist or loop single video
            if (event.data === window.YT.PlayerState.ENDED) {
              event.target.playVideo();
            }
            setIsPlaying(event.data === window.YT.PlayerState.PLAYING);
          },
        },
      });
    };

    if (window.YT && window.YT.Player) {
      initPlayer();
    } else {
      window.onYouTubeIframeAPIReady = initPlayer;
    }

    return () => {
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
        setIsPlayerReady(false);
      }
    };
  }, [videoId, channelId, playlistId, isLive, onReady, onError]);

  // Toggle mute
  const toggleMute = useCallback(() => {
    if (!playerRef.current || !isPlayerReady) return;
    
    if (isMuted) {
      playerRef.current.unMute();
      playerRef.current.setVolume(volume || 100);
      setIsMuted(false);
      onMuteChange?.(false);
    } else {
      playerRef.current.mute();
      setIsMuted(true);
      onMuteChange?.(true);
    }
  }, [isMuted, volume, isPlayerReady, onMuteChange]);

  // Handle volume change
  const handleVolumeChange = useCallback((newVolume: number[]) => {
    if (!playerRef.current || !isPlayerReady) return;
    
    const vol = newVolume[0];
    setVolume(vol);
    
    if (vol === 0) {
      playerRef.current.mute();
      setIsMuted(true);
    } else {
      playerRef.current.unMute();
      playerRef.current.setVolume(vol);
      setIsMuted(false);
    }
  }, [isPlayerReady]);

  const toggleFullscreen = () => {
    const container = containerRef.current;
    if (!container) return;

    if (!isFullscreen) {
      container.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
    setIsFullscreen(!isFullscreen);
  };

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 3000);
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, []);

  if (!videoId && !channelId && !playlistId) {
    return (
      <div className={cn("aspect-video bg-muted flex items-center justify-center rounded-xl", className)}>
        <p className="text-muted-foreground">No video source available</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative aspect-video bg-black rounded-xl overflow-hidden group",
        className
      )}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      {/* YouTube Player Container */}
      <div 
        ref={playerContainerRef} 
        className="absolute inset-0 w-full h-full"
      />

      {/* Live Badge */}
      {isLive && (
        <div className="absolute top-4 left-4 flex items-center gap-2 bg-accent/90 px-3 py-1.5 rounded-lg z-10">
          <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
          <span className="text-sm font-bold text-white">LIVE</span>
        </div>
      )}

      {/* Custom Controls Overlay - only show if not hidden */}
      {!hideControls && (
        <AnimatePresence>
          {showControls && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 pointer-events-none z-20"
            >
              {/* Bottom Gradient */}
              <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-black/80 to-transparent" />

              {/* Bottom Controls */}
              <div className="absolute bottom-0 left-0 right-0 p-4 pointer-events-auto">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {/* Volume Control */}
                    <div className="flex items-center gap-2 group/volume">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-white hover:bg-white/20 h-8 w-8"
                        onClick={toggleMute}
                      >
                        {isMuted ? (
                          <VolumeX className="w-4 h-4" />
                        ) : (
                          <Volume2 className="w-4 h-4" />
                        )}
                      </Button>
                      <div className="w-0 overflow-hidden transition-all duration-300 group-hover/volume:w-20">
                        <Slider
                          value={[isMuted ? 0 : volume]}
                          max={100}
                          step={1}
                          onValueChange={handleVolumeChange}
                          className="cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Fullscreen */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-white hover:bg-white/20 h-8 w-8"
                      onClick={toggleFullscreen}
                    >
                      {isFullscreen ? (
                        <Minimize className="w-4 h-4" />
                      ) : (
                        <Maximize className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}
