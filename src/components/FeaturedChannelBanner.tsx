import { motion } from 'framer-motion';
import { Play, Radio, Users, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Channel, Schedule } from '@/hooks/useChannels';
import { format } from 'date-fns';

interface FeaturedChannelBannerProps {
  channel: Channel;
  currentProgram?: Schedule;
  onWatch: () => void;
}

export function FeaturedChannelBanner({ channel, currentProgram, onWatch }: FeaturedChannelBannerProps) {
  const formatViewers = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
    return num.toString();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/20 via-secondary to-accent/10 border border-border"
    >
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
      </div>

      <div className="relative p-6 md:p-8">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
          {/* Channel Logo */}
          <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-background/50 backdrop-blur flex items-center justify-center overflow-hidden border border-border/50">
            {channel.logo_url ? (
              <img src={channel.logo_url} alt={channel.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-3xl font-bold text-primary">{channel.name.charAt(0)}</span>
            )}
          </div>

          {/* Channel Info */}
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              {channel.is_live && (
                <span className="flex items-center gap-1.5 px-3 py-1 bg-accent text-accent-foreground rounded-full text-xs font-bold">
                  <Radio className="w-3 h-3 animate-pulse" />
                  LIVE NOW
                </span>
              )}
              <span className="px-3 py-1 bg-secondary text-secondary-foreground rounded-full text-xs">
                {channel.category}
              </span>
            </div>

            <h2 className="font-display font-bold text-2xl md:text-3xl mb-2">{channel.name}</h2>
            
            {currentProgram && (
              <div className="mb-3">
                <p className="text-lg font-semibold text-foreground">{currentProgram.program_title}</p>
                <p className="text-sm text-muted-foreground">{currentProgram.program_description}</p>
              </div>
            )}

            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              {channel.viewer_count > 0 && (
                <span className="flex items-center gap-1.5">
                  <Users className="w-4 h-4" />
                  {formatViewers(channel.viewer_count)} watching
                </span>
              )}
              {currentProgram && (
                <span className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4" />
                  Until {format(new Date(currentProgram.end_time), 'h:mm a')}
                </span>
              )}
            </div>
          </div>

          {/* Watch Button */}
          <Button
            onClick={onWatch}
            size="lg"
            className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 px-8"
          >
            <Play className="w-5 h-5 fill-current" />
            Watch Now
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
