import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import Hls from 'hls.js';

interface HLSPlayerProps {
  src: string;
  muted?: boolean;
  autoPlay?: boolean;
  className?: string;
  referrer?: string;
  userAgent?: string;
  onError?: () => void;
}

export const HLSPlayer = forwardRef<HTMLVideoElement, HLSPlayerProps>(
  ({ src, muted = true, autoPlay = true, className, onError }, ref) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const hlsRef = useRef<Hls | null>(null);
    const recoveryAttemptsRef = useRef(0);
    const nativeErrorTimerRef = useRef<ReturnType<typeof setTimeout>>();

    useImperativeHandle(ref, () => videoRef.current as HTMLVideoElement, []);

    useEffect(() => {
      const video = videoRef.current;
      if (!video || !src) return;
      recoveryAttemptsRef.current = 0;

      const handleVideoError = () => {
        if (nativeErrorTimerRef.current) clearTimeout(nativeErrorTimerRef.current);
        nativeErrorTimerRef.current = setTimeout(() => onError?.(), 2500);
      };
      const handlePlaying = () => {
        if (nativeErrorTimerRef.current) clearTimeout(nativeErrorTimerRef.current);
      };
      video.addEventListener('error', handleVideoError);
      video.addEventListener('playing', handlePlaying);

      // Cleanup previous
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }

      const isM3U8 = /\.m3u8(\?|$)/i.test(src);

      if (isM3U8 && Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
          backBufferLength: 45,
          maxBufferLength: 45,
          manifestLoadingMaxRetry: 6,
          manifestLoadingRetryDelay: 1000,
          manifestLoadingMaxRetryTimeout: 12000,
          levelLoadingMaxRetry: 6,
          fragLoadingMaxRetry: 6,
        });
        hlsRef.current = hls;
        hls.loadSource(src);
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
          onError?.();
        });
      } else {
        // Native HLS (Safari) or direct MP4/WebM
        video.src = src;
        if (autoPlay) video.play().catch(() => {});
      }

      return () => {
        if (nativeErrorTimerRef.current) clearTimeout(nativeErrorTimerRef.current);
        video.removeEventListener('error', handleVideoError);
        video.removeEventListener('playing', handlePlaying);
        if (hlsRef.current) {
          hlsRef.current.destroy();
          hlsRef.current = null;
        }
      };
    }, [src, autoPlay, onError]);

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
