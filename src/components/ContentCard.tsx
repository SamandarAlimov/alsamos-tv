import { useState } from 'react';
import { motion } from 'framer-motion';
import { Play, Plus, Info, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Content } from '@/types/content';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface ContentCardProps {
  content: Content;
  index?: number;
  variant?: 'default' | 'large' | 'portrait';
}

export function ContentCard({ content, index = 0, variant = 'default' }: ContentCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  const cardSizes = {
    default: 'w-[280px] md:w-[320px]',
    large: 'w-[320px] md:w-[400px]',
    portrait: 'w-[180px] md:w-[220px]',
  };

  const aspectRatios = {
    default: 'aspect-video',
    large: 'aspect-video',
    portrait: 'aspect-[2/3]',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className={cn('flex-shrink-0', cardSizes[variant])}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="relative group cursor-pointer">
        {/* Thumbnail */}
        <div
          className={cn(
            'relative overflow-hidden rounded-xl transition-all duration-300',
            aspectRatios[variant],
            isHovered && 'ring-2 ring-primary shadow-[0_0_30px_hsl(38,92%,50%,0.3)]'
          )}
        >
          <img
            src={content.thumbnail}
            alt={content.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
          
          {/* Gradient Overlay */}
          <div className="absolute inset-0 thumbnail-overlay opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          
          {/* Badges */}
          <div className="absolute top-3 left-3 flex items-center gap-2">
            {content.isOriginal && (
              <span className="px-2 py-0.5 text-[10px] font-display font-semibold bg-primary text-primary-foreground rounded uppercase tracking-wider">
                Original
              </span>
            )}
            {content.isNew && (
              <span className="px-2 py-0.5 text-[10px] font-display font-semibold bg-accent text-accent-foreground rounded uppercase tracking-wider">
                New
              </span>
            )}
          </div>

          {/* AI Score */}
          {content.aiScore && (
            <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-0.5 glass rounded text-xs font-semibold">
              <Star className="w-3 h-3 text-primary fill-primary" />
              {content.aiScore}%
            </div>
          )}

          {/* Hover Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: isHovered ? 1 : 0, y: isHovered ? 0 : 20 }}
            transition={{ duration: 0.2 }}
            className="absolute bottom-0 left-0 right-0 p-4 flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <Link to={`/watch/${content.id}`}>
                <Button variant="play" size="iconSm" className="rounded-full">
                  <Play className="w-4 h-4 fill-current" />
                </Button>
              </Link>
              <Button variant="glass" size="iconSm" className="rounded-full">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <Link to={`/title/${content.id}`}>
              <Button variant="glass" size="iconSm" className="rounded-full">
                <Info className="w-4 h-4" />
              </Button>
            </Link>
          </motion.div>
        </div>

        {/* Info */}
        <div className="mt-3 space-y-1">
          <h3 className="font-display font-semibold text-sm line-clamp-1 group-hover:text-primary transition-colors">
            {content.title}
          </h3>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{content.year}</span>
            <span>•</span>
            <span>{content.duration}</span>
            {content.type === 'series' && (
              <>
                <span>•</span>
                <span>{content.seasons} Seasons</span>
              </>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default ContentCard;
