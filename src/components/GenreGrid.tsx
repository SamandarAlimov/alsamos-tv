import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface Genre {
  id: string;
  name: string;
  color: string;
}

interface GenreGridProps {
  genres: Genre[];
}

export function GenreGrid({ genres }: GenreGridProps) {
  return (
    <section className="py-8 md:py-12">
      <div className="container mx-auto px-4 md:px-6">
        <h2 className="font-display font-bold text-xl md:text-2xl mb-6">Browse by Genre</h2>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
          {genres.map((genre, index) => (
            <motion.div
              key={genre.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
            >
              <Link to={`/genre/${genre.id}`}>
                <div
                  className={cn(
                    'relative h-24 md:h-28 rounded-xl overflow-hidden cursor-pointer',
                    'bg-gradient-to-br',
                    genre.color,
                    'transition-all duration-300 hover:scale-105 hover:shadow-lg'
                  )}
                >
                  {/* Glass overlay */}
                  <div className="absolute inset-0 glass-highlight" />
                  
                  {/* Content */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="font-display font-semibold text-sm md:text-base text-white drop-shadow-lg">
                      {genre.name}
                    </span>
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
