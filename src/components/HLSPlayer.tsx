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

    useImperativeHandle(ref, () => videoRef.current as HTMLVideoElement, []);

    useEffect(() => {
      const video = videoRef.current;
      if (!video || !src) return;

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
          backBufferLength: 30,
          maxBufferLength: 30,
        });
        hlsRef.current = hls;
        hls.loadSource(src);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          if (autoPlay) video.play().catch(() => {});
        });
        hls.on(Hls.Events.ERROR, (_e, data) => {
          if (data.fatal) {
            console.warn('HLS fatal error', data.type, data.details);
            onError?.();
          }
        });
      } else {
        // Native HLS (Safari) or direct MP4/WebM
        video.src = src;
        if (autoPlay) video.play().catch(() => {});
      }

      return () => {
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
        crossOrigin="anonymous"
      />
    );
  }
);

HLSPlayer.displayName = 'HLSPlayer';
