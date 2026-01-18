import { useState } from 'react';
import { motion } from 'framer-motion';
import { Filter, Grid, LayoutList } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Navbar from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { ContentCard } from '@/components/ContentCard';
import { trendingNow, alsamosOriginals, genres } from '@/data/mockContent';
import { cn } from '@/lib/utils';

const allSeries = [...trendingNow, ...alsamosOriginals].filter((c) => c.type === 'series');

const Series = () => {
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const filteredSeries = selectedGenre
    ? allSeries.filter((s) => s.genres.some((g) => g.toLowerCase() === selectedGenre.toLowerCase()))
    : allSeries;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="pt-24 pb-12">
        <div className="container mx-auto px-4 md:px-6">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8"
          >
            <div>
              <h1 className="font-display font-bold text-3xl md:text-4xl">TV Series</h1>
              <p className="text-muted-foreground mt-1">
                {filteredSeries.length} series available
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Button variant="glass" size="sm" className="gap-2">
                <Filter className="w-4 h-4" />
                Filters
              </Button>
              <div className="flex items-center glass rounded-lg p-1">
                <Button
                  variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                  size="iconSm"
                  onClick={() => setViewMode('grid')}
                >
                  <Grid className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                  size="iconSm"
                  onClick={() => setViewMode('list')}
                >
                  <LayoutList className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </motion.div>

          {/* Genre Filters */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="flex gap-2 overflow-x-auto scrollbar-hide pb-4 mb-8"
          >
            <Button
              variant={selectedGenre === null ? 'hero' : 'secondary'}
              size="sm"
              onClick={() => setSelectedGenre(null)}
              className="rounded-full flex-shrink-0"
            >
              All
            </Button>
            {genres.slice(0, 8).map((genre) => (
              <Button
                key={genre.id}
                variant={selectedGenre === genre.name ? 'hero' : 'secondary'}
                size="sm"
                onClick={() => setSelectedGenre(genre.name)}
                className="rounded-full flex-shrink-0"
              >
                {genre.name}
              </Button>
            ))}
          </motion.div>

          {/* Series Grid */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className={cn(
              'grid gap-4',
              viewMode === 'grid'
                ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5'
                : 'grid-cols-1 md:grid-cols-2'
            )}
          >
            {filteredSeries.map((series, index) => (
              <ContentCard
                key={series.id}
                content={series}
                index={index}
                variant={viewMode === 'list' ? 'large' : 'default'}
              />
            ))}
          </motion.div>

          {filteredSeries.length === 0 && (
            <div className="text-center py-20">
              <p className="text-muted-foreground">No series found in this genre.</p>
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Series;
