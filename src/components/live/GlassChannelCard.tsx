import { memo, useCallback } from 'react';
import { AlertTriangle, Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Channel, Schedule } from '@/hooks/useChannels';

interface GlassChannelCardProps {
  channel: Channel;
  index: number;
  isSelected: boolean;
  currentProgram?: Schedule;
  compact?: boolean;
  onSelect: (channel: Channel) => void;
}

function GlassChannelCardBase({
  channel, index, isSelected, currentProgram, compact, onSelect
}: GlassChannelCardProps) {
  const handleClick = useCallback(() => onSelect(channel), [channel, onSelect]);
  const progress = currentProgram ? Math.min(100, Math.max(0, 
    ((Date.now() - new Date(currentProgram.start_time).getTime()) / 
    (new Date(currentProgram.end_time).getTime() - new Date(currentProgram.start_time).getTime())) * 100
  )) : 0;
  const hasStreamWarning = channel.stream_health === 'mixed-content' || channel.stream_health === 'unsupported';

  return (
    <button
      type="button"
      onClick={handleClick}
      data-channel-id={channel.id}
      data-selected={isSelected ? 'true' : undefined}
      className={cn(
        "w-full text-left rounded-2xl transition-all duration-300 relative overflow-hidden group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        compact ? "p-2.5" : "p-3",
        isSelected 
          ? "glass-card glass-glow border-primary/30" 
          : "glass-subtle hover:bg-[hsl(222_47%_15%/0.5)]"
      )}
    >
      {/* Selection glow */}
      {isSelected && (
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-transparent pointer-events-none" />
      )}

      <div className="flex items-center gap-3 relative z-10">
        <span className="text-[11px] font-mono text-muted-foreground w-4 text-center flex-shrink-0">
          {index + 1}
        </span>
        
        <div className={cn(
          "rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0 transition-all",
          compact ? "w-9 h-9" : "w-11 h-11",
          isSelected ? "ring-2 ring-primary/40 shadow-lg shadow-primary/10" : "ring-1 ring-white/5"
        )}>
          {channel.logo_url ? (
            <img src={channel.logo_url} alt={channel.name} className="w-full h-full object-contain p-1.5 bg-black/30" loading="lazy" />
          ) : (
            <div className={cn(
              "w-full h-full flex items-center justify-center",
              isSelected ? "bg-primary/20" : "bg-muted/50"
            )}>
              <span className={cn("font-bold", compact ? "text-xs" : "text-sm", isSelected ? "text-primary" : "text-muted-foreground")}>
                {channel.name.charAt(0)}
              </span>
            </div>
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className={cn(
              "font-medium text-sm truncate transition-colors",
              isSelected ? "text-primary" : "text-foreground group-hover:text-foreground"
            )}>
              {channel.name}
            </h4>
            {channel.is_live && (
              <span className="relative flex-shrink-0">
                <span className="w-2 h-2 bg-accent rounded-full block" />
                <span className="w-2 h-2 bg-accent rounded-full block absolute inset-0 animate-ping opacity-75" />
              </span>
            )}
            {hasStreamWarning && (
              <AlertTriangle className="w-3.5 h-3.5 text-yellow-500 flex-shrink-0" />
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5 min-w-0">
            {channel.source && (
              <span className="text-[9px] uppercase tracking-wide text-muted-foreground/70 rounded bg-white/5 px-1.5 py-0.5 flex-shrink-0">
                {channel.source === 'iptv-org' ? 'IPTV' : channel.source}
              </span>
            )}
            <p className="text-xs text-muted-foreground truncate">
              {hasStreamWarning ? 'Brauzerda ochilmasligi mumkin' : currentProgram?.program_title || channel.current_program || 'Live Broadcast'}
            </p>
          </div>
        </div>
        
        {isSelected && (
          <div className="w-8 h-8 rounded-full bg-primary/90 flex items-center justify-center flex-shrink-0 shadow-lg shadow-primary/20">
            <Play className="w-3.5 h-3.5 text-primary-foreground fill-current ml-0.5" />
          </div>
        )}
      </div>

      {/* Progress bar */}
      {currentProgram && isSelected && (
        <div className="mt-2.5 ml-7 mr-1">
          <div className="h-1 rounded-full overflow-hidden bg-white/5">
            <div
              style={{ width: `${progress}%` }}
              className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full"
            />
          </div>
        </div>
      )}
    </button>
  );
}

export const GlassChannelCard = memo(GlassChannelCardBase);
