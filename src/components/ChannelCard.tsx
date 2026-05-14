import { motion } from 'framer-motion';
import { Play, Radio, Users, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Channel, Schedule } from '@/hooks/useChannels';
import { format } from 'date-fns';

interface ChannelCardProps {
  channel: Channel;
  currentProgram?: Schedule;
  isActive?: boolean;
  onClick: () => void;
  variant?: 'default' | 'compact' | 'featured';
  index?: number;
}

export function ChannelCard({
  channel,
  currentProgram,
  isActive,
  onClick,
  variant = 'default',
  index = 0
}: ChannelCardProps) {
  const formatViewers = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
    return num.toString();
  };

  if (variant === 'compact') {
    return (
      <motion.button
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.03 }}
        onClick={onClick}
        className={cn(
          "w-full p-3 flex items-center gap-3 rounded-xl border transition-all text-left group",
          isActive
            ? "bg-primary/10 border-primary/30 ring-1 ring-primary/20"
            : "bg-card border-border hover:bg-secondary/50 hover:border-border/80"
        )}
      >
        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center overflow-hidden flex-shrink-0 group-hover:scale-105 transition-transform">
          {channel.logo_url ? (
            <img src={channel.logo_url} alt={channel.name} className="w-full h-full object-cover" />
          ) : (
            <span className="font-bold text-sm">{channel.name.charAt(0)}</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={cn("font-semibold text-sm truncate", isActive && "text-primary")}>
              {channel.name}
            </span>
            {channel.is_live && (
              <span className="w-2 h-2 bg-accent rounded-full animate-pulse flex-shrink-0" />
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate">
            {currentProgram?.program_title || 'Live'}
          </p>
        </div>
        <Play className={cn(
          "w-4 h-4 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity",
          isActive ? "text-primary" : "text-muted-foreground"
        )} />
      </motion.button>
    );
  }

  if (variant === 'featured') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: index * 0.05 }}
        className="relative group cursor-pointer"
        onClick={onClick}
      >
        <div className="relative aspect-video rounded-2xl overflow-hidden bg-muted">
          {/* Thumbnail/Stream Preview */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/10" />
          
          {/* Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

          {/* Play Button */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <Button variant="play" size="iconLg" className="w-16 h-16 rounded-full">
              <Play className="w-6 h-6 fill-current" />
            </Button>
          </div>

          {/* Badges */}
          <div className="absolute top-3 left-3 flex items-center gap-2">
            {channel.is_live && (
              <span className="flex items-center gap-1.5 px-2.5 py-1 bg-accent text-accent-foreground rounded text-xs font-bold">
                <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                LIVE
              </span>
            )}
            {channel.category && (
              <span className="px-2.5 py-1 bg-black/50 backdrop-blur rounded text-xs text-white">
                {channel.category}
              </span>
            )}
          </div>

          {/* Channel Logo */}
          <div className="absolute top-3 right-3 w-10 h-10 rounded-lg bg-black/50 backdrop-blur flex items-center justify-center overflow-hidden">
            {channel.logo_url ? (
              <img src={channel.logo_url} alt={channel.name} className="w-full h-full object-cover" />
            ) : (
              <span className="font-bold text-white">{channel.name.charAt(0)}</span>
            )}
          </div>

          {/* Info */}
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <h3 className="font-display font-bold text-lg text-white mb-1">{channel.name}</h3>
            {currentProgram && (
              <p className="text-sm text-white/80 mb-2 line-clamp-1">{currentProgram.program_title}</p>
            )}
            <div className="flex items-center gap-4 text-xs text-white/60">
              {channel.viewer_count > 0 && (
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {formatViewers(channel.viewer_count)} watching
                </span>
              )}
              {currentProgram && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Until {format(new Date(currentProgram.end_time), 'h:mm a')}
                </span>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  // Default variant
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      onClick={onClick}
      className={cn(
        "relative group cursor-pointer rounded-xl overflow-hidden border transition-all",
        isActive
          ? "border-primary ring-2 ring-primary/20"
          : "border-border hover:border-border/80"
      )}
    >
      {/* Thumbnail */}
      <div className="relative aspect-video bg-muted">
        <div className="absolute inset-0 bg-gradient-to-br from-secondary to-muted" />
        
        {/* Logo Centered */}
        <div className="absolute inset-0 flex items-center justify-center">
          {channel.logo_url ? (
            <img src={channel.logo_url} alt={channel.name} className="w-16 h-16 object-contain opacity-50 group-hover:opacity-80 transition-opacity" />
          ) : (
            <span className="text-4xl font-bold text-muted-foreground/50 group-hover:text-muted-foreground/80 transition-colors">
              {channel.name.charAt(0)}
            </span>
          )}
        </div>

        {/* Overlay on hover */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <Button variant="play" size="icon" className="rounded-full">
            <Play className="w-5 h-5 fill-current" />
          </Button>
        </div>

        {/* Live Badge */}
        {channel.is_live && (
          <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 bg-accent rounded text-[10px] font-bold text-accent-foreground">
            <Radio className="w-2.5 h-2.5 animate-pulse" />
            LIVE
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3 bg-card">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h4 className="font-semibold text-sm truncate">{channel.name}</h4>
          {channel.viewer_count > 0 && (
            <span className="text-[10px] text-muted-foreground flex items-center gap-1 flex-shrink-0">
              <Users className="w-3 h-3" />
              {formatViewers(channel.viewer_count)}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground truncate">
          {currentProgram?.program_title || channel.current_program || 'Live Broadcast'}
        </p>
        {channel.category && (
          <span className="inline-block mt-2 px-2 py-0.5 bg-secondary rounded text-[10px] text-muted-foreground">
            {channel.category}
          </span>
        )}
      </div>
    </motion.div>
  );
}
