import { useState, useRef, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Radio, SkipBack, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface DVRTimelineProps {
  /** Max rewind in seconds (default 24 hours) */
  maxRewindSeconds?: number;
  /** Current offset from live in seconds (0 = live) */
  currentOffset: number;
  /** Called when user seeks to a new offset */
  onSeek: (offsetSeconds: number) => void;
  /** Called when user clicks "LIVE" button */
  onGoLive: () => void;
  /** Whether currently at live position */
  isLive: boolean;
  disabled?: boolean;
  unavailableLabel?: string;
  className?: string;
}

const MAX_24H = 24 * 60 * 60; // 86400 seconds

export function DVRTimeline({
  maxRewindSeconds = MAX_24H,
  currentOffset,
  onSeek,
  onGoLive,
  isLive,
  disabled = false,
  unavailableLabel = 'DVR mavjud emas',
  className,
}: DVRTimelineProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [hoverOffset, setHoverOffset] = useState<number | null>(null);
  const [hoverX, setHoverX] = useState(0);

  const safeMaxRewindSeconds = Math.max(1, maxRewindSeconds);
  const clampedOffset = Math.max(0, Math.min(currentOffset, safeMaxRewindSeconds));
  // Progress: 0 = oldest available point, 1 = live
  const progress = 1 - clampedOffset / safeMaxRewindSeconds;

  const formatTime = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const formatTimeAgo = (seconds: number): string => {
    if (seconds < 60) return 'Hozir';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h} soat ${m > 0 ? `${m} daqiqa` : ''} oldin`;
    return `${m} daqiqa oldin`;
  };

  const getOffsetFromPosition = useCallback((clientX: number) => {
    if (!trackRef.current) return 0;
    const rect = trackRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    // x=0 is 24h ago, x=1 is live
    return Math.round((1 - x) * safeMaxRewindSeconds);
  }, [safeMaxRewindSeconds]);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (disabled) return;
    e.preventDefault();
    setIsDragging(true);
    const offset = getOffsetFromPosition(e.clientX);
    onSeek(offset);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!trackRef.current || disabled) return;
    const rect = trackRef.current.getBoundingClientRect();
    setHoverX(e.clientX - rect.left);
    const offset = getOffsetFromPosition(e.clientX);
    setHoverOffset(offset);

    if (isDragging) {
      onSeek(offset);
    }
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  const handlePointerLeave = () => {
    setHoverOffset(null);
    if (isDragging) setIsDragging(false);
  };

  // Tick marks for hours
  const hourMarks = [];
  const markCount = safeMaxRewindSeconds >= 3600 ? Math.min(23, Math.floor(safeMaxRewindSeconds / 3600)) : 0;
  for (let i = 1; i <= markCount; i++) {
    const x = (1 - (i * 3600) / safeMaxRewindSeconds) * 100;
    hourMarks.push(
      <div
        key={i}
        className="absolute top-0 h-full w-px bg-white/10"
        style={{ left: `${x}%` }}
      >
        {i % 3 === 0 && (
          <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] text-white/30 whitespace-nowrap">
            {i}h
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={cn("w-full", className)}>
      {/* Timeline Track */}
      <div className="flex items-center gap-2 md:gap-3">
        {/* Time Display */}
        <div className="hidden md:flex items-center gap-1.5 text-[11px] text-white/50 min-w-[80px]">
          <Clock className="w-3 h-3" />
          <span>{disabled ? unavailableLabel : clampedOffset > 0 ? `-${formatTime(clampedOffset)}` : 'Jonli'}</span>
        </div>

        {/* Track */}
        <div
          ref={trackRef}
          className={cn(
            "flex-1 relative h-6 flex items-center group",
            disabled ? "cursor-not-allowed opacity-55" : "cursor-pointer"
          )}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerLeave}
          style={{ touchAction: 'none' }}
        >
          {/* Track Background */}
          <div className="absolute left-0 right-0 h-1 group-hover:h-1.5 transition-all rounded-full bg-white/15 overflow-hidden">
            {/* Buffered/Available area */}
            <div className="absolute inset-0 bg-white/10" />

            {/* Progress fill */}
            <div
              className={cn(
                "absolute left-0 top-0 h-full rounded-full transition-all",
                disabled ? "bg-white/20" : isLive ? "bg-accent" : "bg-primary"
              )}
              style={{ width: `${progress * 100}%` }}
            />
          </div>

          {/* Hour markers */}
          <div className="absolute left-0 right-0 h-1 group-hover:h-1.5 transition-all pointer-events-none">
            {hourMarks}
          </div>

          {/* Scrubber Head */}
          <div
            className={cn(
              "absolute top-1/2 -translate-y-1/2 w-3 h-3 md:w-3.5 md:h-3.5 rounded-full shadow-lg transition-transform z-10",
              "scale-100 group-hover:scale-125",
              isDragging && "scale-150",
              disabled ? "bg-white/40" : isLive ? "bg-accent" : "bg-primary"
            )}
            style={{ left: `calc(${progress * 100}% - 6px)` }}
          />

          {/* Hover Tooltip */}
          {hoverOffset !== null && !isDragging && (
            <div
              className="absolute -top-8 px-2 py-0.5 bg-black/90 backdrop-blur-sm rounded text-[10px] text-white whitespace-nowrap pointer-events-none z-20 -translate-x-1/2"
              style={{ left: `${hoverX}px` }}
            >
              {hoverOffset < 60 ? 'Jonli' : formatTimeAgo(hoverOffset)}
            </div>
          )}
        </div>

        {/* LIVE Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={disabled ? undefined : onGoLive}
          disabled={disabled}
          className={cn(
            "h-7 px-2.5 md:px-3 gap-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all",
            disabled
              ? "bg-white/5 text-white/35 cursor-not-allowed"
              : isLive
              ? "bg-accent/20 text-accent hover:bg-accent/30"
              : "bg-white/10 text-white/60 hover:bg-white/20 hover:text-white animate-pulse"
          )}
        >
          <span className={cn(
            "w-1.5 h-1.5 rounded-full",
            disabled ? "bg-white/30" : isLive ? "bg-accent animate-pulse" : "bg-white/40"
          )} />
          <span className="hidden sm:inline">LIVE</span>
          <Radio className="w-3 h-3 sm:hidden" />
        </Button>
      </div>

      {/* Mobile time indicator */}
      {!isLive && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="md:hidden flex items-center justify-center gap-1.5 mt-1 text-[10px] text-white/40"
        >
          <SkipBack className="w-3 h-3" />
          <span>{formatTimeAgo(currentOffset)}</span>
        </motion.div>
      )}
    </div>
  );
}
