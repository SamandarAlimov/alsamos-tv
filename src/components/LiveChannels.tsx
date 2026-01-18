import { motion } from 'framer-motion';
import { Radio, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Channel } from '@/types/content';
import { Link } from 'react-router-dom';

interface LiveChannelsProps {
  channels: Channel[];
}

export function LiveChannels({ channels }: LiveChannelsProps) {
  const formatViewers = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
    return num.toString();
  };

  return (
    <section className="py-8 md:py-12">
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <h2 className="font-display font-bold text-xl md:text-2xl">Live TV</h2>
            <span className="flex items-center gap-1.5 px-2 py-0.5 bg-accent text-accent-foreground rounded text-xs font-semibold">
              <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
              LIVE
            </span>
          </div>
          <Link to="/live">
            <Button variant="ghost" className="text-muted-foreground hover:text-foreground">
              View All
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {channels.map((channel, index) => (
            <motion.div
              key={channel.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
            >
              <Link to={`/live/${channel.id}`}>
                <div className="group glass rounded-xl p-4 hover:ring-1 hover:ring-primary/50 transition-all duration-300 cursor-pointer">
                  <div className="flex items-center gap-4">
                    {/* Channel Logo */}
                    <div className="w-14 h-14 rounded-xl bg-secondary flex items-center justify-center text-2xl">
                      {channel.logo}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-display font-semibold text-sm truncate group-hover:text-primary transition-colors">
                          {channel.name}
                        </h3>
                        {channel.isLive && (
                          <Radio className="w-3 h-3 text-accent animate-pulse flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {channel.currentProgram}
                      </p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="px-2 py-0.5 text-[10px] bg-secondary rounded text-muted-foreground">
                          {channel.category}
                        </span>
                        {channel.viewers && (
                          <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                            <Users className="w-3 h-3" />
                            {formatViewers(channel.viewers)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Watch Button */}
                    <Button variant="subtle" size="sm" className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      Watch
                    </Button>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
