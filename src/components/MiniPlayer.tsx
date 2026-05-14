import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Maximize2, Play, Pause, Volume2, VolumeX, Radio } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Channel } from '@/hooks/useChannels';

interface MiniPlayerProps {
  channel: Channel | null;
  isVisible: boolean;
  onClose: () => void;
  onExpand: () => void;
}

export function MiniPlayer({ channel, isVisible, onClose, onExpand }: MiniPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (isVisible && videoRef.current && channel?.stream_url) {
      videoRef.current.play().catch(() => {});
    }
  }, [isVisible, channel]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  if (!channel) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 100 }}
          animate={{ 
            opacity: 1, 
            scale: 1, 
            y: 0,
            x: position.x,
          }}
          exit={{ opacity: 0, scale: 0.8, y: 100 }}
          drag
          dragMomentum={false}
          onDragStart={() => setIsDragging(true)}
          onDragEnd={(_, info) => {
            setIsDragging(false);
            setPosition(prev => ({
              x: prev.x + info.offset.x,
              y: prev.y + info.offset.y
            }));
          }}
          className={cn(
            "fixed bottom-24 right-6 z-50 w-80 rounded-2xl overflow-hidden shadow-2xl",
            "bg-card border border-border/50 backdrop-blur-xl",
            isDragging ? "cursor-grabbing" : "cursor-grab"
          )}
        >
          {/* Video */}
          <div className="relative aspect-video bg-black">
            {channel.stream_url ? (
              <video
                ref={videoRef}
                src={channel.stream_url}
                className="w-full h-full object-cover"
                autoPlay
                muted={isMuted}
                loop
                playsInline
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-muted">
                <Radio className="w-8 h-8 text-muted-foreground" />
              </div>
            )}

            {/* Live Badge */}
            {channel.is_live && (
              <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-1 bg-accent rounded text-[10px] font-bold text-accent-foreground">
                <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                LIVE
              </div>
            )}

            {/* Controls Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 hover:opacity-100 transition-opacity">
              <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-7 h-7 text-white hover:bg-white/20"
                    onClick={togglePlay}
                  >
                    {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-7 h-7 text-white hover:bg-white/20"
                    onClick={toggleMute}
                  >
                    {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                  </Button>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-7 h-7 text-white hover:bg-white/20"
                    onClick={onExpand}
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-7 h-7 text-white hover:bg-white/20"
                    onClick={onClose}
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Channel Info */}
          <div className="p-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
              {channel.logo_url ? (
                <img src={channel.logo_url} alt={channel.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-sm font-bold">{channel.name.charAt(0)}</span>
              )}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm truncate">{channel.name}</p>
              <p className="text-xs text-muted-foreground truncate">{channel.current_program || 'Live Broadcast'}</p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
