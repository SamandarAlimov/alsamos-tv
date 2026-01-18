import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ContentCard } from '@/components/ContentCard';
import { Content } from '@/types/content';
import { cn } from '@/lib/utils';

interface ContentCarouselProps {
  title: string;
  items: Content[];
  variant?: 'default' | 'large' | 'portrait';
  showAIBadge?: boolean;
}

export function ContentCarousel({ title, items, variant = 'default', showAIBadge = false }: ContentCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = () => {
    const el = scrollRef.current;
    if (el) {
      setCanScrollLeft(el.scrollLeft > 0);
      setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
    }
  };

  const scroll = (direction: 'left' | 'right') => {
    const el = scrollRef.current;
    if (el) {
      const scrollAmount = direction === 'left' ? -600 : 600;
      el.scrollBy({ left: scrollAmount, behavior: 'smooth' });
      setTimeout(checkScroll, 300);
    }
  };

  return (
    <section className="relative py-6 md:py-8">
      {/* Header */}
      <div className="container mx-auto px-4 md:px-6 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="font-display font-bold text-xl md:text-2xl">{title}</h2>
            {showAIBadge && (
              <span className="px-2 py-0.5 text-[10px] font-display font-semibold bg-gradient-to-r from-primary to-gold-light text-primary-foreground rounded uppercase tracking-wider">
                AI Ranked
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="glass"
              size="iconSm"
              onClick={() => scroll('left')}
              disabled={!canScrollLeft}
              className={cn('rounded-full', !canScrollLeft && 'opacity-30')}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="glass"
              size="iconSm"
              onClick={() => scroll('right')}
              disabled={!canScrollRight}
              className={cn('rounded-full', !canScrollRight && 'opacity-30')}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Carousel */}
      <div className="relative">
        {/* Left Fade */}
        <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
        
        {/* Right Fade */}
        <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />

        <motion.div
          ref={scrollRef}
          onScroll={checkScroll}
          className="flex gap-4 overflow-x-auto scrollbar-hide px-4 md:px-6 pb-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          {items.map((item, index) => (
            <ContentCard key={item.id} content={item} index={index} variant={variant} />
          ))}
        </motion.div>
      </div>
    </section>
  );
}
