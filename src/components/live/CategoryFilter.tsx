import { motion } from 'framer-motion';
import { Tv, Film, Newspaper, Baby, Trophy, Music, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  'All': Tv,
  'Movies': Film,
  'News': Newspaper,
  'Kids': Baby,
  'Sports': Trophy,
  'Music': Music,
  'Entertainment': Sparkles,
};

interface CategoryFilterProps {
  categories: string[];
  selected: string;
  onSelect: (cat: string) => void;
  counts?: Partial<Record<string, number>>;
  className?: string;
}

export function CategoryFilter({ categories, selected, onSelect, counts, className }: CategoryFilterProps) {
  return (
    <div data-tv-row="category-filter" className={cn("flex gap-2 overflow-x-auto scrollbar-hide pb-1", className)}>
      {categories.map((cat) => {
        const isActive = selected === cat;
        const Icon = CATEGORY_ICONS[cat] || Tv;
        const count = counts?.[cat];
        
        return (
          <motion.button
            key={cat}
            type="button"
            data-selected={isActive ? 'true' : undefined}
            whileTap={{ scale: 0.95 }}
            onClick={() => onSelect(cat)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold whitespace-nowrap transition-all duration-300 flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              isActive 
                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" 
                : "glass-subtle text-muted-foreground hover:text-foreground hover:bg-[hsl(222_47%_15%/0.5)]"
            )}
          >
            <Icon className="w-3.5 h-3.5" />
            <span>{cat}</span>
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
