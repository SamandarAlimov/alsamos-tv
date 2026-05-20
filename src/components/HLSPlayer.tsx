import { useEffect, useMemo, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import Hls from 'hls.js';
import { getStreamCandidates, isHlsUrl, isTransportStreamUrl } from '@/utils/streams';

interface HLSPlayerProps {
  src: string;
  srcs?: string[];
  muted?: boolean;
  autoPlay?: boolean;
  className?: string;
  referrer?: string;
  userAgent?: string;
  streamType?: string | null;
  onError?: () => void;
  onRecovering?: () => void;
}

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

declare global {
  interface Window {
    mpegts?: MpegTsApi;
  }
}

let mpegTsLoader: Promise<MpegTsApi | null> | null = null;
const MPEG_TS_SCRIPT_SOURCES = [
  'https://cdn.jsdelivr.net/npm/mpegts.js@1.8.0/dist/mpegts.min.js',
  'https://unpkg.com/mpegts.js@1.8.0/dist/mpegts.min.js',
];

function loadMpegTs() {
  if (typeof window === 'undefined') return Promise.resolve(null);
  if (window.mpegts) return Promise.resolve(window.mpegts);
  if (mpegTsLoader) return mpegTsLoader;

  mpegTsLoader = new Promise((resolve) => {
    let index = 0;

    const tryNext = () => {
      if (window.mpegts) {
        resolve(window.mpegts);
        return;
      }

      const src = MPEG_TS_SCRIPT_SOURCES[index];
      if (!src) {
        resolve(null);
        return;
      }
      index += 1;

      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.crossOrigin = 'anonymous';
      script.dataset.mpegtsPlayer = 'true';
      script.onload = () => {
        if (window.mpegts) resolve(window.mpegts);
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

export const HLSPlayer = forwardRef<HTMLVideoElement, HLSPlayerProps>(
  ({ src, srcs, muted = true, autoPlay = true, className, referrer, userAgent, streamType, onError, onRecovering }, ref) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const hlsRef = useRef<Hls | null>(null);
    const mpegTsRef = useRef<MpegTsPlayer | null>(null);
    const recoveryAttemptsRef = useRef(0);
    const nativeErrorTimerRef = useRef<ReturnType<typeof setTimeout>>();
    const retryTimerRef = useRef<ReturnType<typeof setTimeout>>();
    const startupWatchdogRef = useRef<ReturnType<typeof setTimeout>>();
    const onErrorRef = useRef(onError);
    const onRecoveringRef = useRef(onRecovering);
    const [sourceIndex, setSourceIndex] = useState(0);

    const candidates = useMemo(() => {
      const list = srcs?.length ? srcs : getStreamCandidates(src, {
        referer: referrer,
        userAgent,
        proxyOnly: true,
        preferDirectHls: true,
      });
      return list.length ? list : [src];
    }, [referrer, src, srcs, userAgent]);

    const activeSrc = candidates[Math.min(sourceIndex, Math.max(candidates.length - 1, 0))];

    useImperativeHandle(ref, () => videoRef.current as HTMLVideoElement, []);

    useEffect(() => {
      onErrorRef.current = onError;
      onRecoveringRef.current = onRecovering;
    }, [onError, onRecovering]);

    useEffect(() => {
      if (videoRef.current) videoRef.current.muted = muted;
    }, [muted]);

    useEffect(() => {
      setSourceIndex(0);
    }, [src, srcs]);

    useEffect(() => {
      const video = videoRef.current;
      if (!video || !activeSrc) return;
      recoveryAttemptsRef.current = 0;
      video.autoplay = autoPlay;
      video.playsInline = true;

      const cleanupPlayers = () => {
        if (hlsRef.current) {
          hlsRef.current.destroy();
          hlsRef.current = null;
        }
        if (mpegTsRef.current) {
          try {
            mpegTsRef.current.unload();
            mpegTsRef.current.detachMediaElement();
            mpegTsRef.current.destroy();
          } catch {}
          mpegTsRef.current = null;
        }
        video.removeAttribute('src');
        video.load();
      };

      const tryNextSource = () => {
        if (nativeErrorTimerRef.current) clearTimeout(nativeErrorTimerRef.current);
        if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
        if (startupWatchdogRef.current) clearTimeout(startupWatchdogRef.current);

        if (sourceIndex < candidates.length - 1) {
          onRecoveringRef.current?.();
          retryTimerRef.current = setTimeout(() => {
            setSourceIndex((value) => Math.min(value + 1, candidates.length - 1));
          }, 600);
          return;
        }

        onErrorRef.current?.();
      };

      const handleVideoError = () => {
        if (hlsRef.current) return;
        if (nativeErrorTimerRef.current) clearTimeout(nativeErrorTimerRef.current);
        nativeErrorTimerRef.current = setTimeout(tryNextSource, 2500);
      };
      const handlePlaying = () => {
        if (nativeErrorTimerRef.current) clearTimeout(nativeErrorTimerRef.current);
        if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
        if (startupWatchdogRef.current) clearTimeout(startupWatchdogRef.current);
      };
      const handleReady = () => {
        if (video.readyState >= 2 && startupWatchdogRef.current) {
          clearTimeout(startupWatchdogRef.current);
        }
        if (autoPlay && video.paused) video.play().catch(() => {});
      };
      cleanupPlayers();
      video.addEventListener('error', handleVideoError);
      video.addEventListener('playing', handlePlaying);
      video.addEventListener('loadeddata', handleReady);
      video.addEventListener('canplay', handleReady);
      startupWatchdogRef.current = setTimeout(() => {
        if (video.readyState < 2) tryNextSource();
      }, 22000);

      const normalizedStreamType = (streamType || '').toLowerCase();
      const isM3U8 = normalizedStreamType === 'hls' || isHlsUrl(activeSrc);
      const isMpegTs = isTransportStreamUrl(activeSrc, streamType);
      let cancelled = false;

      if (isM3U8 && Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
          backBufferLength: 45,
          maxBufferLength: 45,
          liveSyncDurationCount: 3,
          manifestLoadingMaxRetry: 6,
          manifestLoadingRetryDelay: 1000,
          manifestLoadingMaxRetryTimeout: 12000,
          levelLoadingMaxRetry: 6,
          fragLoadingMaxRetry: 6,
        });
        hlsRef.current = hls;
        hls.loadSource(activeSrc);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          if (autoPlay) video.play().catch(() => {});
        });
        hls.on(Hls.Events.ERROR, (_e, data) => {
          if (!data.fatal) {
            if (data.type === Hls.ErrorTypes.NETWORK_ERROR) hls.startLoad();
            return;
          }

          recoveryAttemptsRef.current += 1;
          if (data.type === Hls.ErrorTypes.MEDIA_ERROR && recoveryAttemptsRef.current <= 3) {
            hls.recoverMediaError();
            return;
          }
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR && recoveryAttemptsRef.current <= 6) {
            hls.startLoad();
            return;
          }

          console.warn('HLS playback could not recover', data.type, data.details);
          tryNextSource();
        });
      } else if (isMpegTs) {
        loadMpegTs().then((mpegts) => {
          if (cancelled || !mpegts?.isSupported()) {
            video.src = activeSrc;
            if (autoPlay) video.play().catch(() => {});
            return;
          }

          const player = mpegts.createPlayer({
            type: 'mpegts',
            isLive: true,
            url: activeSrc,
            cors: true,
            withCredentials: false,
            hasAudio: true,
            hasVideo: true,
          }, {
            enableWorker: true,
            enableStashBuffer: false,
            stashInitialSize: 128,
            lazyLoad: false,
            autoCleanupSourceBuffer: true,
            reuseRedirectedURL: true,
          });
          mpegTsRef.current = player;
          player.attachMediaElement(video);
          player.load();
          player.on(mpegts.Events.ERROR, () => tryNextSource());
          if (autoPlay) {
            const playResult = player.play();
            if (playResult && typeof playResult.catch === 'function') playResult.catch(() => {});
          }
        });
      } else {
        // Native HLS (Safari) or direct MP4/WebM
        video.src = activeSrc;
        if (autoPlay) video.play().catch(() => {});
      }

      return () => {
        cancelled = true;
        if (nativeErrorTimerRef.current) clearTimeout(nativeErrorTimerRef.current);
        if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
        if (startupWatchdogRef.current) clearTimeout(startupWatchdogRef.current);
        video.removeEventListener('error', handleVideoError);
        video.removeEventListener('playing', handlePlaying);
        video.removeEventListener('loadeddata', handleReady);
        video.removeEventListener('canplay', handleReady);
        cleanupPlayers();
      };
    }, [activeSrc, autoPlay, candidates.length, sourceIndex, streamType]);

    return (
      <video
        ref={videoRef}
        className={className}
        muted={muted}
        autoPlay={autoPlay}
        playsInline
        controls={false}
      />
    );
  }
);

HLSPlayer.displayName = 'HLSPlayer';
