import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  SkipBack,
  SkipForward,
  Settings,
  Subtitles,
  ArrowLeft,
  Sparkles,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import Hls from 'hls.js';
import { isHlsUrl, isTransportStreamUrl } from '@/utils/streams';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface VideoPlayerProps {
  src: string;
  poster?: string;
  title?: string;
  contentId?: string;
  onBack?: () => void;
  onProgressUpdate?: (progress: number, duration: number) => void;
}

type QualityOption = {
  label: string;
  value: string;
  resolution: string;
};

const qualityOptions: QualityOption[] = [
  { label: 'Auto', value: 'auto', resolution: 'Auto' },
  { label: '4K', value: '2160', resolution: '2160p' },
  { label: '1080p', value: '1080', resolution: '1080p' },
  { label: '720p', value: '720', resolution: '720p' },
  { label: '480p', value: '480', resolution: '480p' },
  { label: '360p', value: '360', resolution: '360p' },
];

const playbackSpeeds = [0.5, 0.75, 1, 1.25, 1.5, 2];

type MpegTsPlayer = {
  attachMediaElement: (mediaElement: HTMLMediaElement) => void;
  load: () => void;
  play: () => Promise<void> | void;
  unload: () => void;
  detachMediaElement: () => void;
  destroy: () => void;
  on: (event: string, handler: (...args: unknown[]) => void) => void;
};

type MpegTsApi = {
  isSupported: () => boolean;
  createPlayer: (
    mediaDataSource: Record<string, unknown>,
    config?: Record<string, unknown>
  ) => MpegTsPlayer;
  Events: {
    ERROR: string;
  };
};

type WindowWithMpegTs = Window & { mpegts?: MpegTsApi };

let mpegTsLoader: Promise<MpegTsApi | null> | null = null;
const MPEG_TS_SCRIPT_SOURCES = [
  'https://cdn.jsdelivr.net/npm/mpegts.js@1.8.0/dist/mpegts.min.js',
  'https://unpkg.com/mpegts.js@1.8.0/dist/mpegts.min.js',
];

function loadMpegTs() {
  if (typeof window === 'undefined') return Promise.resolve(null);
  const browserWindow = window as WindowWithMpegTs;
  if (browserWindow.mpegts) return Promise.resolve(browserWindow.mpegts);
  if (mpegTsLoader) return mpegTsLoader;

  mpegTsLoader = new Promise((resolve) => {
    let index = 0;

    const tryNext = () => {
      if (browserWindow.mpegts) {
        resolve(browserWindow.mpegts);
        return;
      }

      const source = MPEG_TS_SCRIPT_SOURCES[index];
      if (!source) {
        resolve(null);
        return;
      }
      index += 1;

      const script = document.createElement('script');
      script.src = source;
      script.async = true;
      script.crossOrigin = 'anonymous';
      script.dataset.mpegtsPlayer = 'true';
      script.onload = () => {
        if (browserWindow.mpegts) resolve(browserWindow.mpegts);
        else tryNext();
      };
      script.onerror = () => {
        script.remove();
        tryNext();
      };
      document.head.appendChild(script);
    };

    tryNext();
  });

  return mpegTsLoader;
}

export function VideoPlayer({ src, poster, title, contentId, onBack, onProgressUpdate }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const mpegTsRef = useRef<MpegTsPlayer | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [showControls, setShowControls] = useState(true);
  const [isBuffering, setIsBuffering] = useState(false);
  const [selectedQuality, setSelectedQuality] = useState<string>('auto');
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [bufferedProgress, setBufferedProgress] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [playbackError, setPlaybackError] = useState(false);
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const progressUpdateRef = useRef<ReturnType<typeof setTimeout>>();
  const hlsRetryTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const mpegTsRetryTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const hlsRecoveryAttemptsRef = useRef(0);
  const mpegTsRecoveryAttemptsRef = useRef(0);

  const isLikelyHlsSource = useCallback((value: string) => {
    return isHlsUrl(value);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    let cancelled = false;

    const destroyMpegTs = () => {
      if (!mpegTsRef.current) return;
      try {
        mpegTsRef.current.unload();
        mpegTsRef.current.detachMediaElement();
        mpegTsRef.current.destroy();
      } catch {}
      mpegTsRef.current = null;
    };

    setPlaybackError(false);
    setIsBuffering(true);
    hlsRecoveryAttemptsRef.current = 0;
    mpegTsRecoveryAttemptsRef.current = 0;
    if (hlsRetryTimerRef.current) clearTimeout(hlsRetryTimerRef.current);
    if (mpegTsRetryTimerRef.current) clearTimeout(mpegTsRetryTimerRef.current);
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    destroyMpegTs();
    video.removeAttribute('src');
    video.load();

    const isHls = isLikelyHlsSource(src);
    const isMpegTs = isTransportStreamUrl(src);
    if (isHls && Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        backBufferLength: 30,
        maxBufferLength: 60,
        manifestLoadingTimeOut: 25000,
        manifestLoadingMaxRetry: 8,
        levelLoadingMaxRetry: 8,
        fragLoadingMaxRetry: 8,
      });
      hlsRef.current = hls;
      hls.loadSource(src);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => setIsBuffering(false));
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (!data.fatal) return;

        hlsRecoveryAttemptsRef.current += 1;
        if (data.type === Hls.ErrorTypes.MEDIA_ERROR && hlsRecoveryAttemptsRef.current <= 4) {
          hls.recoverMediaError();
          return;
        }

        if (data.type === Hls.ErrorTypes.NETWORK_ERROR && hlsRecoveryAttemptsRef.current <= 8) {
          if (hlsRetryTimerRef.current) clearTimeout(hlsRetryTimerRef.current);
          hlsRetryTimerRef.current = window.setTimeout(
            () => hls.startLoad(-1),
            Math.min(5000, 700 + hlsRecoveryAttemptsRef.current * 600)
          );
          return;
        }

        setPlaybackError(true);
        setIsBuffering(false);
      });
    } else if (isMpegTs) {
      loadMpegTs().then((mpegts) => {
        if (cancelled) return;

        if (!mpegts?.isSupported()) {
          video.src = src;
          setIsBuffering(false);
          return;
        }

        const player = mpegts.createPlayer({
          type: 'mpegts',
          isLive: false,
          url: src,
          cors: true,
          withCredentials: false,
          hasAudio: true,
          hasVideo: true,
        }, {
          enableWorker: true,
          enableStashBuffer: true,
          stashInitialSize: 384,
          lazyLoad: false,
          autoCleanupSourceBuffer: true,
          autoCleanupMaxBackwardDuration: 90,
          autoCleanupMinBackwardDuration: 30,
          reuseRedirectedURL: true,
        });

        mpegTsRef.current = player;
        player.attachMediaElement(video);
        player.load();
        setIsBuffering(false);

        player.on(mpegts.Events.ERROR, () => {
          mpegTsRecoveryAttemptsRef.current += 1;
          if (mpegTsRecoveryAttemptsRef.current <= 5) {
            if (mpegTsRetryTimerRef.current) clearTimeout(mpegTsRetryTimerRef.current);
            mpegTsRetryTimerRef.current = window.setTimeout(() => {
              try {
                player.unload();
                player.load();
                if (!video.paused) {
                  const playResult = player.play();
                  if (playResult && typeof playResult.catch === 'function') playResult.catch(() => {});
                }
              } catch {
                setPlaybackError(true);
                setIsBuffering(false);
              }
            }, Math.min(5000, 700 + mpegTsRecoveryAttemptsRef.current * 700));
            return;
          }

          setPlaybackError(true);
          setIsBuffering(false);
        });
      });
    } else {
      video.src = src;
      setIsBuffering(false);
    }

    return () => {
      cancelled = true;
      if (hlsRetryTimerRef.current) clearTimeout(hlsRetryTimerRef.current);
      if (mpegTsRetryTimerRef.current) clearTimeout(mpegTsRetryTimerRef.current);
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      destroyMpegTs();
    };
  }, [isLikelyHlsSource, src]);

  // Update buffered progress
  const updateBuffered = useCallback(() => {
    const video = videoRef.current;
    if (!video || !video.buffered.length) return;
    
    const bufferedEnd = video.buffered.end(video.buffered.length - 1);
    const bufferedPercent = (bufferedEnd / video.duration) * 100;
    setBufferedProgress(bufferedPercent);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      updateBuffered();
    };
    
    const handleLoadedMetadata = () => setDuration(video.duration);
    const handleWaiting = () => setIsBuffering(true);
    const handlePlaying = () => { setIsBuffering(false); setPlaybackError(false); };
    const handleProgress = () => updateBuffered();
    const handleError = () => {
      if (hlsRef.current || mpegTsRef.current) return;
      setPlaybackError(true);
      setIsBuffering(false);
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('playing', handlePlaying);
    video.addEventListener('progress', handleProgress);
    video.addEventListener('error', handleError);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('playing', handlePlaying);
      video.removeEventListener('progress', handleProgress);
      video.removeEventListener('error', handleError);
    };
  }, [updateBuffered]);

  // Progress tracking - save every 10 seconds
  useEffect(() => {
    if (!onProgressUpdate || !isPlaying) return;

    progressUpdateRef.current = setInterval(() => {
      if (videoRef.current) {
        onProgressUpdate(videoRef.current.currentTime, videoRef.current.duration);
      }
    }, 10000);

    return () => {
      if (progressUpdateRef.current) {
        clearInterval(progressUpdateRef.current);
      }
    };
  }, [isPlaying, onProgressUpdate]);

  // Save progress on unmount or pause
  useEffect(() => {
    return () => {
      if (onProgressUpdate && videoRef.current) {
        onProgressUpdate(videoRef.current.currentTime, videoRef.current.duration);
      }
    };
  }, [onProgressUpdate]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
      if (onProgressUpdate) {
        onProgressUpdate(video.currentTime, video.duration);
      }
    } else {
      const playResult = mpegTsRef.current ? mpegTsRef.current.play() : video.play();
      if (playResult && typeof playResult.catch === 'function') playResult.catch(() => {
        setPlaybackError(true);
        setIsBuffering(false);
      });
    }
    setIsPlaying(!isPlaying);
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleVolumeChange = (value: number[]) => {
    const video = videoRef.current;
    if (!video) return;
    const newVolume = value[0];
    video.volume = newVolume;
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };

  const handleSeek = (value: number[]) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = value[0];
    setCurrentTime(value[0]);
  };

  const skip = (seconds: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.max(0, Math.min(duration, video.currentTime + seconds));
  };

  const toggleFullscreen = () => {
    const container = containerRef.current;
    if (!container) return;

    if (!isFullscreen) {
      container.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
    setIsFullscreen(!isFullscreen);
  };

  const handleQualityChange = (quality: string) => {
    setSelectedQuality(quality);
    // In a real implementation, this would switch video sources
    setShowSettings(false);
  };

  const handleSpeedChange = (speed: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.playbackRate = speed;
    setPlaybackSpeed(speed);
    setShowSettings(false);
  };

  useEffect(() => {
    containerRef.current?.focus({ preventScroll: true });
  }, []);

  const formatTime = (time: number) => {
    const hours = Math.floor(time / 3600);
    const minutes = Math.floor((time % 3600) / 60);
    const seconds = Math.floor(time % 60);
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
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

  const getQualityLabel = () => {
    const quality = qualityOptions.find(q => q.value === selectedQuality);
    return quality?.label || 'Auto';
  };

  const handleBackClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (onBack) {
      onBack();
      return;
    }
    if (window.history.length > 1) window.history.back();
    else window.location.href = '/';
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (target.closest('[role="menu"], [role="menuitem"]')) return;
    if (target !== containerRef.current && target.closest('button, [role="slider"], input, textarea, select, a[href]')) {
      if (event.key === 'Enter' || event.key === ' ') return;
    }

    const key = event.key.toLowerCase();
    const selectKey = ['enter', ' ', 'ok', 'accept', 'select'].includes(key);

    switch (key) {
      case ' ':
      case 'enter':
      case 'ok':
      case 'accept':
      case 'select':
      case 'k':
        event.preventDefault();
        event.stopPropagation();
        togglePlay();
        break;
      case 'f':
        event.preventDefault();
        event.stopPropagation();
        toggleFullscreen();
        break;
      case 'm':
        event.preventDefault();
        event.stopPropagation();
        toggleMute();
        break;
      case 'arrowleft':
      case 'j':
        event.preventDefault();
        event.stopPropagation();
        skip(-10);
        break;
      case 'arrowright':
      case 'l':
        event.preventDefault();
        event.stopPropagation();
        skip(10);
        break;
      case 'pagedown':
        event.preventDefault();
        event.stopPropagation();
        skip(-60);
        break;
      case 'pageup':
        event.preventDefault();
        event.stopPropagation();
        skip(60);
        break;
      case 'arrowup':
        event.preventDefault();
        event.stopPropagation();
        handleVolumeChange([Math.min(1, volume + 0.05)]);
        break;
      case 'arrowdown':
        event.preventDefault();
        event.stopPropagation();
        handleVolumeChange([Math.max(0, volume - 0.05)]);
        break;
      case 'home':
        event.preventDefault();
        event.stopPropagation();
        handleSeek([0]);
        break;
      case 'end':
        if (Number.isFinite(duration) && duration > 0) {
          event.preventDefault();
          event.stopPropagation();
          handleSeek([duration]);
        }
        break;
      case 'escape':
      case 'backspace':
      case 'browserback':
        event.preventDefault();
        event.stopPropagation();
        if (onBack) onBack();
        break;
      default:
        if (selectKey) {
          event.preventDefault();
          event.stopPropagation();
          togglePlay();
        }
    }
  };

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      className="relative w-full h-full bg-black overflow-hidden group focus:outline-none"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setShowControls(false)}
      onDoubleClick={toggleFullscreen}
      onKeyDown={handleKeyDown}
    >
      {/* Video */}
      <video
        ref={videoRef}
        poster={poster}
        className="w-full h-full object-contain"
        onClick={togglePlay}
        playsInline
      />

      {/* Buffering Indicator */}
      <AnimatePresence>
        {isBuffering && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center bg-black/50"
          >
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Playback Error */}
      <AnimatePresence>
        {playbackError && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center bg-black/80 px-4"
          >
            <div className="max-w-md text-center glass-strong rounded-2xl p-6">
              <p className="font-display text-lg font-semibold text-white">Video yuklanmadi</p>
              <p className="text-sm text-white/65 mt-2">Manba vaqtincha ishlamayapti yoki brauzer bu formatni qo'llab-quvvatlamaydi.</p>
              <Button variant="hero" className="mt-4" onClick={() => window.location.reload()}>
                Qayta urinish
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Play/Pause Overlay */}
      <AnimatePresence>
        {!isPlaying && !isBuffering && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <Button
              variant="play"
              size="iconLg"
              className="w-20 h-20 rounded-full"
              onClick={togglePlay}
            >
              <Play className="w-8 h-8 fill-current ml-1" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Controls Overlay */}
      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0"
          >
            {/* Top Gradient */}
            <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-black/80 to-transparent" />

            {/* Bottom Gradient */}
            <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-black/90 to-transparent" />

            {/* Top Bar */}
            <div className="absolute top-0 left-0 right-0 p-4 md:p-6 flex items-center justify-between">
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20 rounded-full bg-white/10 backdrop-blur-md"
                onClick={handleBackClick}
                aria-label="Orqaga qaytish"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              {title && (
                <h1 className="font-display font-semibold text-lg text-white truncate mx-4">
                  {title}
                </h1>
              )}
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
                  <Sparkles className="w-5 h-5" />
                </Button>
              </div>
            </div>

            {/* Bottom Controls */}
            <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6 space-y-4">
              {/* Progress Bar */}
              <div className="group/progress relative">
                {/* Buffered Progress Background */}
                <div className="absolute top-1/2 -translate-y-1/2 left-0 h-1 bg-white/20 rounded-full w-full">
                  <div 
                    className="h-full bg-white/40 rounded-full transition-all duration-300"
                    style={{ width: `${bufferedProgress}%` }}
                  />
                </div>
                <Slider
                  value={[currentTime]}
                  max={duration || 100}
                  step={0.1}
                  onValueChange={handleSeek}
                  className="cursor-pointer relative z-10"
                />
              </div>

              {/* Controls Row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 md:gap-4">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-white hover:bg-white/20"
                    onClick={togglePlay}
                  >
                    {isPlaying ? (
                      <Pause className="w-5 h-5" />
                    ) : (
                      <Play className="w-5 h-5 fill-current" />
                    )}
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-white hover:bg-white/20"
                    onClick={() => skip(-10)}
                  >
                    <SkipBack className="w-5 h-5" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-white hover:bg-white/20"
                    onClick={() => skip(10)}
                  >
                    <SkipForward className="w-5 h-5" />
                  </Button>

                  <div className="flex items-center gap-2 group/volume">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-white hover:bg-white/20"
                      onClick={toggleMute}
                    >
                      {isMuted || volume === 0 ? (
                        <VolumeX className="w-5 h-5" />
                      ) : (
                        <Volume2 className="w-5 h-5" />
                      )}
                    </Button>
                    <div className="w-0 overflow-hidden transition-all duration-300 group-hover/volume:w-20">
                      <Slider
                        value={[isMuted ? 0 : volume]}
                        max={1}
                        step={0.01}
                        onValueChange={handleVolumeChange}
                        className="cursor-pointer"
                      />
                    </div>
                  </div>

                  <span className="text-sm text-white/80 font-mono ml-2">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {/* Quality Badge */}
                  <span className="text-xs font-medium text-white/60 bg-white/10 px-2 py-1 rounded hidden md:block">
                    {getQualityLabel()}
                  </span>

                  {/* Speed Badge */}
                  {playbackSpeed !== 1 && (
                    <span className="text-xs font-medium text-white/60 bg-white/10 px-2 py-1 rounded hidden md:block">
                      {playbackSpeed}x
                    </span>
                  )}

                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-white hover:bg-white/20 hidden md:flex"
                  >
                    <Subtitles className="w-5 h-5" />
                  </Button>

                  {/* Settings Menu */}
                  <DropdownMenu open={showSettings} onOpenChange={setShowSettings}>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-white hover:bg-white/20"
                      >
                        <Settings className="w-5 h-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent 
                      className="w-56 bg-black/95 border-white/10 text-white"
                      align="end"
                    >
                      <DropdownMenuLabel className="text-white/60">Quality</DropdownMenuLabel>
                      {qualityOptions.map((option) => (
                        <DropdownMenuItem
                          key={option.value}
                          onClick={() => handleQualityChange(option.value)}
                          className="flex items-center justify-between hover:bg-white/10 cursor-pointer"
                        >
                          <span>{option.label}</span>
                          {selectedQuality === option.value && (
                            <Check className="w-4 h-4 text-primary" />
                          )}
                        </DropdownMenuItem>
                      ))}
                      <DropdownMenuSeparator className="bg-white/10" />
                      <DropdownMenuLabel className="text-white/60">Playback Speed</DropdownMenuLabel>
                      {playbackSpeeds.map((speed) => (
                        <DropdownMenuItem
                          key={speed}
                          onClick={() => handleSpeedChange(speed)}
                          className="flex items-center justify-between hover:bg-white/10 cursor-pointer"
                        >
                          <span>{speed === 1 ? 'Normal' : `${speed}x`}</span>
                          {playbackSpeed === speed && (
                            <Check className="w-4 h-4 text-primary" />
                          )}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-white hover:bg-white/20"
                    onClick={toggleFullscreen}
                  >
                    {isFullscreen ? (
                      <Minimize className="w-5 h-5" />
                    ) : (
                      <Maximize className="w-5 h-5" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
