import { Globe, Radio, Tv2, Sparkles, Star } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export type ChannelSource = 'all' | 'alsamos' | 'uz' | 'shams' | 'iptv-org';

const SOURCES: { id: ChannelSource; label: string; icon: React.ElementType }[] = [
  { id: 'all', label: 'Barchasi', icon: Globe },
  { id: 'alsamos', label: 'Alsamos', icon: Sparkles },
  { id: 'uz', label: "O'zbek", icon: Star },
  { id: 'shams', label: 'Shams TV', icon: Tv2 },
  { id: 'iptv-org', label: 'IPTV-Org', icon: Radio },
];

export function SourceFilter({
  selected, onSelect, counts, className,
}: {
  selected: ChannelSource;
  onSelect: (s: ChannelSource) => void;
  counts?: Partial<Record<ChannelSource, number>>;
  className?: string;
}) {
  return (
    <div data-tv-row="source-filter" className={cn("flex gap-1.5 overflow-x-auto scrollbar-hide pb-1", className)}>
      {SOURCES.map(s => {
        const isActive = selected === s.id;
        const Icon = s.icon;
        const count = counts?.[s.id];
        return (
          <motion.button
            key={s.id}
            type="button"
            data-selected={isActive ? 'true' : undefined}
            whileTap={{ scale: 0.95 }}
            onClick={() => onSelect(s.id)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold whitespace-nowrap transition-all flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              isActive
                ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
                : "glass-subtle text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="w-3 h-3" />
            <span>{s.label}</span>
            {typeof count === 'number' && (
              <span className={cn(
                "ml-0.5 px-1.5 rounded-full text-[9px] font-mono",
                isActive ? "bg-white/20" : "bg-white/5"
              )}>
                {count > 999 ? `${Math.round(count / 100) / 10}k` : count}
              </span>
            )}
          </motion.button>
        );
      })}
    </div>
  );
}
