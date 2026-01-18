import { useState } from 'react';
import { motion } from 'framer-motion';
import { Search as SearchIcon, X, Sparkles, Mic, Camera } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import Navbar from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { ContentCard } from '@/components/ContentCard';
import { trendingNow, alsamosOriginals, genres } from '@/data/mockContent';

const allContent = [...trendingNow, ...alsamosOriginals];

const Search = () => {
  const [query, setQuery] = useState('');
  const [isAISearch, setIsAISearch] = useState(false);

  const filteredContent = query
    ? allContent.filter(
        (c) =>
          c.title.toLowerCase().includes(query.toLowerCase()) ||
          c.genres.some((g) => g.toLowerCase().includes(query.toLowerCase()))
      )
    : [];

  const recentSearches = ['Sci-Fi movies', 'The Algorithm', 'Action 2024', 'Thriller'];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="pt-24 pb-12">
        <div className="container mx-auto px-4 md:px-6">
          {/* Search Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-3xl mx-auto space-y-6"
          >
            <h1 className="font-display font-bold text-3xl md:text-4xl text-center">
              Search Alsamos TV
            </h1>

            {/* Search Input */}
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                {isAISearch ? (
                  <Sparkles className="w-5 h-5 text-primary" />
                ) : (
                  <SearchIcon className="w-5 h-5 text-muted-foreground" />
                )}
              </div>
              <Input
                type="text"
                placeholder={
                  isAISearch
                    ? 'Ask AI: "Find movies with plot twists"'
                    : 'Search movies, series, genres...'
                }
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="h-14 pl-12 pr-32 text-lg bg-secondary border-secondary rounded-xl focus:ring-2 focus:ring-primary"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                {query && (
                  <Button
                    variant="ghost"
                    size="iconSm"
                    onClick={() => setQuery('')}
                    className="text-muted-foreground"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
                <Button variant="ghost" size="iconSm" className="text-muted-foreground">
                  <Mic className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="iconSm" className="text-muted-foreground">
                  <Camera className="w-4 h-4" />
                </Button>
                <Button
                  variant={isAISearch ? 'hero' : 'secondary'}
                  size="sm"
                  onClick={() => setIsAISearch(!isAISearch)}
                  className="gap-1"
                >
                  <Sparkles className="w-3 h-3" />
                  AI
                </Button>
              </div>
            </div>

            {/* AI Search Badge */}
            {isAISearch && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="flex items-center justify-center gap-2 text-sm text-primary"
              >
                <Sparkles className="w-4 h-4" />
                AI-powered search enabled. Try: "Find the scene where..." or "Movies like Inception but scarier"
              </motion.div>
            )}
          </motion.div>

          {/* Search Results or Default Content */}
          {query ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-12"
            >
              <h2 className="font-display font-semibold text-xl mb-6">
                {filteredContent.length} results for "{query}"
              </h2>
              {filteredContent.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {filteredContent.map((content, index) => (
                    <ContentCard key={content.id} content={content} index={index} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-20">
                  <p className="text-muted-foreground">No results found. Try a different search term.</p>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-12 space-y-12"
            >
              {/* Recent Searches */}
              <div>
                <h2 className="font-display font-semibold text-xl mb-4">Recent Searches</h2>
                <div className="flex flex-wrap gap-2">
                  {recentSearches.map((search) => (
                    <Button
                      key={search}
                      variant="secondary"
                      size="sm"
                      onClick={() => setQuery(search)}
                      className="rounded-full"
                    >
                      {search}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Browse by Genre */}
              <div>
                <h2 className="font-display font-semibold text-xl mb-4">Browse by Genre</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                  {genres.map((genre) => (
                    <Button
                      key={genre.id}
                      variant="secondary"
                      onClick={() => setQuery(genre.name)}
                      className="h-12 rounded-xl"
                    >
                      {genre.name}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Trending Searches */}
              <div>
                <h2 className="font-display font-semibold text-xl mb-6">Trending Now</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {trendingNow.slice(0, 5).map((content, index) => (
                    <ContentCard key={content.id} content={content} index={index} />
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Search;
