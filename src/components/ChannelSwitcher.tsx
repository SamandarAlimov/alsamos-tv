import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronUp, ChevronDown, Radio, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Channel, Schedule } from '@/hooks/useChannels';

interface ChannelSwitcherProps {
  channels: Channel[];
  currentChannel: Channel | null;
  currentProgram?: Schedule;
  onChannelChange: (channel: Channel) => void;
  getCurrentProgram: (channelId: string) => Schedule | undefined;
}

export function ChannelSwitcher({
  channels,
  currentChannel,
  currentProgram,
  onChannelChange,
  getCurrentProgram
}: ChannelSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const currentIndex = currentChannel ? channels.findIndex(c => c.id === currentChannel.id) : 0;

  useEffect(() => {
    if (isOpen && scrollRef.current && currentChannel) {
      const currentElement = scrollRef.current.querySelector(`[data-channel-id="${currentChannel.id}"]`);
      if (currentElement) {
        currentElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [isOpen, currentChannel]);

  const goToPrevChannel = () => {
    if (currentIndex > 0) {
      onChannelChange(channels[currentIndex - 1]);
    }
  };

  const goToNextChannel = () => {
    if (currentIndex < channels.length - 1) {
      onChannelChange(channels[currentIndex + 1]);
    }
  };

  const formatViewers = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
    return num.toString();
  };

  return (
    <div className="relative">
      {/* Quick Navigation */}
      <div className="absolute -right-16 top-1/2 -translate-y-1/2 flex flex-col gap-2 z-20">
        <Button
          variant="secondary"
          size="icon"
          className="w-10 h-10 rounded-full bg-black/80 border border-white/10 hover:bg-black/90"
          onClick={goToPrevChannel}
          disabled={currentIndex === 0}
        >
          <ChevronUp className="w-5 h-5" />
        </Button>
        <Button
          variant="secondary"
          size="icon"
          className="w-10 h-10 rounded-full bg-black/80 border border-white/10 hover:bg-black/90"
          onClick={() => setIsOpen(!isOpen)}
        >
          <span className="text-xs font-bold">{currentIndex + 1}</span>
        </Button>
        <Button
          variant="secondary"
          size="icon"
          className="w-10 h-10 rounded-full bg-black/80 border border-white/10 hover:bg-black/90"
          onClick={goToNextChannel}
          disabled={currentIndex === channels.length - 1}
        >
          <ChevronDown className="w-5 h-5" />
        </Button>
      </div>

      {/* Channel List Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 50 }}
            className="absolute right-0 top-0 bottom-0 w-80 bg-black/95 backdrop-blur-xl border-l border-white/10 z-10"
          >
            {/* Header */}
            <div className="p-4 border-b border-white/10">
              <h3 className="font-display font-semibold text-white">Channels</h3>
              <p className="text-sm text-white/60">{channels.length} available</p>
            </div>

            {/* Channel List */}
            <div ref={scrollRef} className="h-[calc(100%-80px)] overflow-y-auto scrollbar-thin">
              {channels.map((channel, index) => {
                const program = getCurrentProgram(channel.id);
                const isActive = currentChannel?.id === channel.id;

                return (
                  <button
                    key={channel.id}
                    data-channel-id={channel.id}
                    onClick={() => {
                      onChannelChange(channel);
                      setIsOpen(false);
                    }}
                    className={cn(
                      "w-full p-4 flex items-center gap-3 border-b border-white/5 transition-colors text-left",
                      isActive ? "bg-primary/20" : "hover:bg-white/5"
                    )}
                  >
                    {/* Channel Number */}
                    <span className="w-6 text-xs font-mono text-white/40">
                      {String(index + 1).padStart(2, '0')}
                    </span>

                    {/* Logo */}
                    <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                      {channel.logo_url ? (
                        <img src={channel.logo_url} alt={channel.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-sm font-bold text-white">{channel.name.charAt(0)}</span>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={cn(
                          "font-semibold text-sm truncate",
                          isActive ? "text-primary" : "text-white"
                        )}>
                          {channel.name}
                        </p>
                        {channel.is_live && (
                          <Radio className="w-3 h-3 text-accent animate-pulse flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-white/50 truncate">
                        {program?.program_title || channel.current_program || 'No program info'}
                      </p>
                      {channel.viewer_count > 0 && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <Users className="w-3 h-3 text-white/30" />
                          <span className="text-[10px] text-white/30">{formatViewers(channel.viewer_count)}</span>
                        </div>
                      )}
                    </div>

                    {/* Active Indicator */}
                    {isActive && (
                      <div className="w-1.5 h-8 bg-primary rounded-full" />
                    )}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
