import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Filter, Grid3X3, List, X, TrendingUp, Star, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Channel, Schedule } from '@/hooks/useChannels';
import { ChannelCard } from './ChannelCard';

interface ChannelBrowserProps {
  channels: Channel[];
  selectedChannel: Channel | null;
  onChannelSelect: (channel: Channel) => void;
  getCurrentProgram: (channelId: string) => Schedule | undefined;
}

const categories = ['All', 'Entertainment', 'News', 'Sports', 'Movies', 'Kids', 'Music', 'Documentary', 'Religious'];

type ViewMode = 'grid' | 'list';
type SortOption = 'popular' | 'name' | 'live';

export function ChannelBrowser({
  channels,
  selectedChannel,
  onChannelSelect,
  getCurrentProgram
}: ChannelBrowserProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortBy, setSortBy] = useState<SortOption>('popular');
  const [showFilters, setShowFilters] = useState(false);

  const filteredChannels = useMemo(() => {
    let result = channels;

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        c =>
          c.name.toLowerCase().includes(query) ||
          c.category?.toLowerCase().includes(query) ||
          c.current_program?.toLowerCase().includes(query)
      );
    }

    // Filter by category
    if (selectedCategory !== 'All') {
      result = result.filter(c => c.category === selectedCategory);
    }

    // Sort
    switch (sortBy) {
      case 'popular':
        result = [...result].sort((a, b) => (b.viewer_count || 0) - (a.viewer_count || 0));
        break;
      case 'name':
        result = [...result].sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'live':
        result = [...result].sort((a, b) => (b.is_live ? 1 : 0) - (a.is_live ? 1 : 0));
        break;
    }

    return result;
  }, [channels, searchQuery, selectedCategory, sortBy]);

  const trendingChannels = useMemo(() => {
    return [...channels]
      .filter(c => c.is_live)
      .sort((a, b) => (b.viewer_count || 0) - (a.viewer_count || 0))
      .slice(0, 4);
  }, [channels]);

  return (
    <div className="space-y-6">
      {/* Trending Section */}
      {trendingChannels.length > 0 && !searchQuery && selectedCategory === 'All' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-accent" />
            <h2 className="font-display font-semibold text-lg">Trending Now</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {trendingChannels.map((channel, index) => (
              <ChannelCard
                key={channel.id}
                channel={channel}
                currentProgram={getCurrentProgram(channel.id)}
                isActive={selectedChannel?.id === channel.id}
                onClick={() => onChannelSelect(channel)}
                variant="featured"
                index={index}
              />
            ))}
          </div>
        </motion.div>
      )}

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search channels, programs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-secondary border-border"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
              onClick={() => setSearchQuery('')}
            >
              <X className="w-3 h-3" />
            </Button>
          )}
        </div>

        {/* View & Filter Controls */}
        <div className="flex items-center gap-2">
          <Button
            variant={showFilters ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="gap-2"
          >
            <Filter className="w-4 h-4" />
            <span className="hidden sm:inline">Filters</span>
          </Button>
          <div className="flex items-center gap-1 p-1 bg-secondary rounded-lg">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="icon"
              className="h-8 w-8"
              onClick={() => setViewMode('grid')}
            >
              <Grid3X3 className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="icon"
              className="h-8 w-8"
              onClick={() => setViewMode('list')}
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Filters Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 bg-secondary/50 rounded-xl border border-border space-y-4">
              {/* Categories */}
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">Category</label>
                <div className="flex flex-wrap gap-2">
                  {categories.map((cat) => (
                    <Button
                      key={cat}
                      variant={selectedCategory === cat ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedCategory(cat)}
                      className="rounded-full"
                    >
                      {cat}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Sort */}
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">Sort By</label>
                <div className="flex gap-2">
                  <Button
                    variant={sortBy === 'popular' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSortBy('popular')}
                    className="gap-1.5"
                  >
                    <Star className="w-3 h-3" />
                    Popular
                  </Button>
                  <Button
                    variant={sortBy === 'live' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSortBy('live')}
                    className="gap-1.5"
                  >
                    <Clock className="w-3 h-3" />
                    Live First
                  </Button>
                  <Button
                    variant={sortBy === 'name' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSortBy('name')}
                  >
                    A-Z
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results Count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {filteredChannels.length} channel{filteredChannels.length !== 1 ? 's' : ''} found
        </p>
        {(searchQuery || selectedCategory !== 'All') && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('All');
            }}
            className="text-xs"
          >
            Clear all filters
          </Button>
        )}
      </div>

      {/* Channels Grid/List */}
      {filteredChannels.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-16"
        >
          <Search className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="font-semibold text-lg mb-1">No channels found</h3>
          <p className="text-muted-foreground text-sm">Try adjusting your search or filters</p>
        </motion.div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filteredChannels.map((channel, index) => (
            <ChannelCard
              key={channel.id}
              channel={channel}
              currentProgram={getCurrentProgram(channel.id)}
              isActive={selectedChannel?.id === channel.id}
              onClick={() => onChannelSelect(channel)}
              index={index}
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredChannels.map((channel, index) => (
            <ChannelCard
              key={channel.id}
              channel={channel}
              currentProgram={getCurrentProgram(channel.id)}
              isActive={selectedChannel?.id === channel.id}
              onClick={() => onChannelSelect(channel)}
              variant="compact"
              index={index}
            />
          ))}
        </div>
      )}
    </div>
  );
}
