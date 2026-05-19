import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Volume2, VolumeX, Maximize, Minimize, Play, Pause,
  SkipBack, SkipForward, Settings, Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { getSyncedPlaybackPosition } from '@/utils/playlistSync';

interface YouTubePlayerProps {
  videoId?: string;
  channelId?: string;
  playlistId?: string;
  playlistLength?: number;
  isLive?: boolean;
  autoplay?: boolean;
  muted?: boolean;
  syncEnabled?: boolean;
  className?: string;
  hideControls?: boolean;
  /** Render full Alsamos-styled controls (timeline, skip, settings, etc.) */
  fullControls?: boolean;
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
  getDuration: () => number;
  getPlayerState: () => number;
  getPlaybackRate: () => number;
  setPlaybackRate: (rate: number) => void;
  getAvailablePlaybackRates: () => number[];
  destroy: () => void;
}

interface YTPlayerEvent {
  target: YTPlayer;
  data: number;
}

declare global {
  interface Window {
    YT: {
      Player: new (
        element: HTMLElement,
        config: {
          videoId: string;
          host?: string;
          playerVars: Record<string, string | number>;
          events: {
            onReady?: (event: YTPlayerEvent) => void;
            onError?: (event: YTPlayerEvent) => void;
            onStateChange?: (event: YTPlayerEvent) => void;
          };
        }
      ) => YTPlayer;
      PlayerState: {
        ENDED: number; PLAYING: number; PAUSED: number; BUFFERING: number; CUED: number;
      };
    };
    onYouTubeIframeAPIReady: () => void;
  }
}

const fmtTime = (s: number) => {
  if (!isFinite(s) || s < 0) s = 0;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  const mm = m.toString().padStart(h > 0 ? 2 : 1, '0');
  const ss = sec.toString().padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
};

export function YouTubePlayer({
  videoId, channelId, playlistId, playlistLength = 100,
  isLive = false, autoplay = true, muted = true, syncEnabled = false,
  className, hideControls = false, fullControls = false,
  onReady, onError, onMuteChange,
  playerRef: externalPlayerRef,
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
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffering, setBuffering] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [scrubbing, setScrubbing] = useState(false);
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  // Load YouTube IFrame API
  useEffect(() => {
    if (window.YT && window.YT.Player) return;
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    const first = document.getElementsByTagName('script')[0];
    first.parentNode?.insertBefore(tag, first);
  }, []);

  useEffect(() => {
    if (!videoId && !channelId && !playlistId) return;

    const initPlayer = () => {
      if (!playerContainerRef.current || playerRef.current) return;
      const videoSource = playlistId ? undefined : (isLive && channelId ? channelId : videoId);

      const playerVars: Record<string, string | number> = {
        autoplay: autoplay ? 1 : 0,
        mute: muted ? 1 : 0,
        controls: 0,
        modestbranding: 1,
        rel: 0,
        showinfo: 0,
        iv_load_policy: 3,
        disablekb: 1,
        enablejsapi: 1,
        fs: 0,
        playsinline: 1,
        loop: isLive ? 1 : 0,
        cc_load_policy: 0,
        color: 'white',
        origin: window.location.origin,
        widget_referrer: window.location.origin,
      };

      if (playlistId) {
        playerVars.listType = 'playlist';
        playerVars.list = playlistId;
      } else if (videoSource && isLive) {
        playerVars.playlist = videoSource;
      }

      playerRef.current = new window.YT.Player(playerContainerRef.current, {
        videoId: videoSource || '',
        host: 'https://www.youtube-nocookie.com',
        playerVars,
        events: {
          onReady: (event) => {
            setIsPlayerReady(true);
            try { setDuration(event.target.getDuration() || 0); } catch {}
            if (syncEnabled && playlistId) {
              const syncPosition = getSyncedPlaybackPosition(playlistLength);
              setTimeout(() => {
                event.target.playVideoAt(syncPosition.videoIndex);
                setTimeout(() => event.target.seekTo(syncPosition.seekToSeconds, true), 1000);
              }, 500);
            } else if (autoplay) {
              event.target.playVideo();
            }
            onReady?.();
          },
          onError: () => onError?.(),
          onStateChange: (event) => {
            const s = event.data;
            if (s === window.YT.PlayerState.ENDED && isLive) event.target.playVideo();
            setIsPlaying(s === window.YT.PlayerState.PLAYING);
            setBuffering(s === window.YT.PlayerState.BUFFERING);
            try {
              const d = event.target.getDuration();
              if (d && d !== duration) setDuration(d);
            } catch {}
          },
        },
      });
    };

    if (window.YT && window.YT.Player) initPlayer();
    else window.onYouTubeIframeAPIReady = initPlayer;

    return () => {
      if (playerRef.current) {
        try { playerRef.current.destroy(); } catch {}
        playerRef.current = null;
        setIsPlayerReady(false);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId, channelId, playlistId, isLive]);

  // Tick current time
  useEffect(() => {
    if (!isPlayerReady || !fullControls) return;
    const id = setInterval(() => {
      if (!playerRef.current || scrubbing) return;
      try {
        setCurrentTime(playerRef.current.getCurrentTime() || 0);
        const d = playerRef.current.getDuration();
        if (d && Math.abs(d - duration) > 1) setDuration(d);
      } catch {}
    }, 500);
    return () => clearInterval(id);
  }, [isPlayerReady, fullControls, scrubbing, duration]);

  const togglePlay = useCallback(() => {
    if (!playerRef.current || !isPlayerReady) return;
    if (isPlaying) playerRef.current.pauseVideo();
    else playerRef.current.playVideo();
  }, [isPlaying, isPlayerReady]);

  const toggleMute = useCallback(() => {
    if (!playerRef.current || !isPlayerReady) return;
    if (isMuted) {
      playerRef.current.unMute();
      playerRef.current.setVolume(volume || 100);
      if (!volume) setVolume(100);
      setIsMuted(false); onMuteChange?.(false);
    } else {
      playerRef.current.mute();
      setIsMuted(true); onMuteChange?.(true);
    }
  }, [isMuted, volume, isPlayerReady, onMuteChange]);

  const handleVolumeChange = useCallback((v: number[]) => {
    if (!playerRef.current || !isPlayerReady) return;
    const vol = v[0];
    setVolume(vol);
    if (vol === 0) { playerRef.current.mute(); setIsMuted(true); }
    else { playerRef.current.unMute(); playerRef.current.setVolume(vol); setIsMuted(false); }
  }, [isPlayerReady]);

  const seekBy = (delta: number) => {
    if (!playerRef.current || !isPlayerReady) return;
    try {
      const t = Math.max(0, Math.min((duration || 0), playerRef.current.getCurrentTime() + delta));
      playerRef.current.seekTo(t, true);
      setCurrentTime(t);
    } catch {}
  };

  const handleSeek = (v: number[]) => {
    if (!playerRef.current || !isPlayerReady) return;
    const t = v[0];
    setCurrentTime(t);
    playerRef.current.seekTo(t, true);
  };

  const setRate = (r: number) => {
    if (!playerRef.current) return;
    try { playerRef.current.setPlaybackRate(r); setPlaybackRate(r); } catch {}
  };

  const toggleFullscreen = () => {
    const el = containerRef.current as any;
    if (!el) return;
    const doc = document as any;
    const isFs = !!(doc.fullscreenElement || doc.webkitFullscreenElement);
    if (!isFs) {
      (el.requestFullscreen || el.webkitRequestFullscreen || el.webkitEnterFullscreen)?.call(el);
    } else {
      (doc.exitFullscreen || doc.webkitExitFullscreen)?.call(doc);
    }
  };

  const wakeControls = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying && !scrubbing) setShowControls(false);
    }, 3000);
  };

  useEffect(() => {
    const handler = () => {
      const doc = document as any;
      setIsFullscreen(!!(doc.fullscreenElement || doc.webkitFullscreenElement));
    };
    document.addEventListener('fullscreenchange', handler);
    document.addEventListener('webkitfullscreenchange', handler as any);
    return () => {
      document.removeEventListener('fullscreenchange', handler);
      document.removeEventListener('webkitfullscreenchange', handler as any);
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    if (!fullControls) return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.code === 'Space') { e.preventDefault(); togglePlay(); }
      else if (e.code === 'ArrowLeft') seekBy(-10);
      else if (e.code === 'ArrowRight') seekBy(10);
      else if (e.code === 'KeyM') toggleMute();
      else if (e.code === 'KeyF') toggleFullscreen();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [fullControls, togglePlay, toggleMute]);

  if (!videoId && !channelId && !playlistId) {
    return (
      <div className={cn("aspect-video bg-muted flex items-center justify-center rounded-xl", className)}>
        <p className="text-muted-foreground">No video source available</p>
      </div>
    );
  }

  const wrapperClass = cn(
    "relative bg-black overflow-hidden group",
    (fullControls || hideControls) && "yt-privacy-shell",
    fullControls ? "w-full h-full" : "aspect-video rounded-xl",
    className
  );

  return (
    <div
      ref={containerRef}
      className={wrapperClass}
      onMouseMove={wakeControls}
      onMouseLeave={() => isPlaying && !scrubbing && setShowControls(false)}
    >
      {/* YouTube iframe — pointer-events disabled in fullControls mode so YT chrome can't appear */}
      <div
        ref={playerContainerRef}
        className={cn(
          "absolute inset-0 w-full h-full",
          (fullControls || hideControls) && "pointer-events-none"
        )}
      />

      {/* Privacy masks hide transient YouTube title/cards while our controls stay on top. */}
      {(fullControls || hideControls) && (
        <>
          <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-black/70 via-black/25 to-transparent pointer-events-none z-10" />
          <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-black/70 via-black/20 to-transparent pointer-events-none z-10" />
          <div className="absolute top-0 right-0 w-40 h-16 bg-gradient-to-l from-black/45 to-transparent pointer-events-none z-10" />
        </>
      )}

      {isLive && (
        <div className="absolute top-4 left-4 flex items-center gap-2 bg-accent/90 px-3 py-1.5 rounded-lg z-20">
          <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
          <span className="text-sm font-bold text-white">LIVE</span>
        </div>
      )}

      {/* Buffering spinner */}
      {fullControls && buffering && (
        <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
          <Loader2 className="w-12 h-12 text-white/90 animate-spin" />
        </div>
      )}

      {/* Full custom controls (movies / VOD) */}
      {fullControls && !hideControls && (
        <AnimatePresence>
          {(showControls || !isPlaying || scrubbing) && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 z-30"
            >
              {/* Click-to-toggle-play overlay (center area) */}
              <button
                aria-label={isPlaying ? 'Pause' : 'Play'}
                onClick={togglePlay}
                onDoubleClick={toggleFullscreen}
                className="absolute inset-0 w-full h-full bg-transparent cursor-pointer"
              />

              {/* Center play button when paused */}
              {!isPlaying && !buffering && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-20 h-20 rounded-full bg-primary/90 backdrop-blur-md flex items-center justify-center shadow-2xl shadow-primary/40">
                    <Play className="w-10 h-10 text-primary-foreground fill-current ml-1" />
                  </div>
                </div>
              )}

              {/* Bottom gradient + controls bar */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/95 via-black/60 to-transparent pt-16 pb-3 px-3 md:px-5">
                {/* Timeline */}
                <div className="px-1 md:px-2">
                  <Slider
                    value={[currentTime]}
                    min={0}
                    max={Math.max(duration, 1)}
                    step={0.1}
                    onValueChange={(v) => { setScrubbing(true); setCurrentTime(v[0]); }}
                    onValueCommit={(v) => { handleSeek(v); setScrubbing(false); }}
                    className="cursor-pointer"
                  />
                  <div className="flex items-center justify-between mt-1.5 text-[11px] font-mono text-white/80">
                    <span>{fmtTime(currentTime)}</span>
                    <span>{fmtTime(duration)}</span>
                  </div>
                </div>

                {/* Controls row */}
                <div className="flex items-center justify-between gap-2 mt-1">
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="text-white hover:bg-white/15 h-9 w-9 rounded-full" onClick={() => seekBy(-10)} aria-label="Back 10s">
                      <SkipBack className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-white hover:bg-white/15 h-11 w-11 rounded-full" onClick={togglePlay} aria-label={isPlaying ? 'Pause' : 'Play'}>
                      {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
                    </Button>
                    <Button variant="ghost" size="icon" className="text-white hover:bg-white/15 h-9 w-9 rounded-full" onClick={() => seekBy(10)} aria-label="Forward 10s">
                      <SkipForward className="w-4 h-4" />
                    </Button>

                    <div className="flex items-center gap-1.5 ml-1 group/vol">
                      <Button variant="ghost" size="icon" className="text-white hover:bg-white/15 h-9 w-9 rounded-full" onClick={toggleMute} aria-label="Mute">
                        {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                      </Button>
                      <div className="w-0 overflow-hidden transition-all duration-300 group-hover/vol:w-20">
                        <Slider value={[isMuted ? 0 : volume]} max={100} step={1} onValueChange={handleVolumeChange} />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-white hover:bg-white/15 h-9 w-9 rounded-full" aria-label="Settings">
                          <Settings className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40 backdrop-blur-xl bg-background/85 border-white/10">
                        <DropdownMenuLabel className="text-xs">Tezlik</DropdownMenuLabel>
                        <DropdownMenuRadioGroup value={String(playbackRate)} onValueChange={(v) => setRate(parseFloat(v))}>
                          {[0.5, 0.75, 1, 1.25, 1.5, 2].map(r => (
                            <DropdownMenuRadioItem key={r} value={String(r)}>{r === 1 ? 'Normal' : `${r}x`}</DropdownMenuRadioItem>
                          ))}
                        </DropdownMenuRadioGroup>
                      </DropdownMenuContent>
                    </DropdownMenu>

                    <Button variant="ghost" size="icon" className="text-white hover:bg-white/15 h-9 w-9 rounded-full" onClick={toggleFullscreen} aria-label="Fullscreen">
                      {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* Minimal controls (legacy, used by Live TV) */}
      {!fullControls && !hideControls && (
        <AnimatePresence>
          {showControls && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 pointer-events-none z-20"
            >
              <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-black/80 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-4 pointer-events-auto">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 group/volume">
                    <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 h-8 w-8" onClick={toggleMute}>
                      {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                    </Button>
                    <div className="w-0 overflow-hidden transition-all duration-300 group-hover/volume:w-20">
                      <Slider value={[isMuted ? 0 : volume]} max={100} step={1} onValueChange={handleVolumeChange} />
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 h-8 w-8" onClick={toggleFullscreen}>
                    {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}
