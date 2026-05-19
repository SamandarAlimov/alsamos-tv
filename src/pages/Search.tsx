import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Search as SearchIcon, X, Sparkles, Mic, Camera, Tv, Radio } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import Navbar from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { ContentCard } from '@/components/ContentCard';
import { useContent } from '@/hooks/useContent';
import { useChannels } from '@/hooks/useChannels';
import { genres } from '@/data/genres';
import { rankedSearch } from '@/utils/search';

const Search = () => {
  const { search: searchContent, trending } = useContent();
  const { channels } = useChannels();
  const [query, setQuery] = useState('');
  const [isAISearch, setIsAISearch] = useState(false);

  const filteredContent = query ? searchContent(query) : [];
  const filteredChannels = useMemo(() => {
    if (!query) return [];
    return rankedSearch(channels, query, (channel) => [
      channel.name,
      channel.description,
      channel.category,
      channel.current_program,
      channel.source,
    ]).slice(0, 24);
  }, [query, channels]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="pt-24 pb-20 lg:pb-12">
        <div className="container mx-auto px-4 md:px-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl mx-auto space-y-6">
            <h1 className="font-display font-bold text-2xl sm:text-3xl md:text-4xl text-center">Alsamos TV qidiruv</h1>

            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                {isAISearch ? <Sparkles className="w-5 h-5 text-primary" /> : <SearchIcon className="w-5 h-5 text-muted-foreground" />}
              </div>
              <Input
                type="text"
                placeholder={isAISearch ? 'Masalan: "sarguzasht va sirli kinolar"' : 'Kino, serial, kanal yoki janr qidiring...'}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="h-12 sm:h-14 pl-12 pr-24 sm:pr-32 text-base sm:text-lg bg-secondary border-secondary rounded-xl focus:ring-2 focus:ring-primary"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                {query && (
                  <Button variant="ghost" size="iconSm" onClick={() => setQuery('')} className="text-muted-foreground">
                    <X className="w-4 h-4" />
                  </Button>
                )}
                <Button variant="ghost" size="iconSm" className="text-muted-foreground"><Mic className="w-4 h-4" /></Button>
                <Button variant="ghost" size="iconSm" className="text-muted-foreground"><Camera className="w-4 h-4" /></Button>
                <Button variant={isAISearch ? 'hero' : 'secondary'} size="sm" onClick={() => setIsAISearch(!isAISearch)} className="gap-1">
                  <Sparkles className="w-3 h-3" />AI
                </Button>
              </div>
            </div>

            {isAISearch && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="flex items-center justify-center gap-2 text-sm text-primary">
                <Sparkles className="w-4 h-4" />
                Aqlli qidiruv yoqildi
              </motion.div>
            )}
          </motion.div>

          {query ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-12 space-y-10">
              <div>
                <div className="flex items-center gap-2 mb-6">
                  <Tv className="w-5 h-5 text-primary" />
                  <h2 className="font-display font-semibold text-xl">
                    {filteredContent.length} kino/serial natija
                  </h2>
                </div>
                {filteredContent.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
                    {filteredContent.map((content, index) => (
                      <ContentCard key={content.id} content={content} index={index} variant="grid" />
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">Kino topilmadi.</p>
                )}
              </div>

              <div>
                <div className="flex items-center gap-2 mb-6">
                  <Radio className="w-5 h-5 text-primary" />
                  <h2 className="font-display font-semibold text-xl">
                    {filteredChannels.length} jonli kanal
                  </h2>
                </div>
                {filteredChannels.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {filteredChannels.map((ch) => (
                      <Link
                        key={ch.id}
                        to={`/live?channel=${encodeURIComponent(ch.id)}`}
                        className="group glass-subtle rounded-xl p-3 hover:ring-1 hover:ring-primary/40 transition-all flex flex-col items-center text-center gap-2"
                      >
                        <div className="w-14 h-14 rounded-lg bg-black/40 flex items-center justify-center overflow-hidden">
                          {ch.logo_url ? (
                            <img src={ch.logo_url} alt={ch.name} className="w-full h-full object-contain" loading="lazy" />
                          ) : (
                            <Tv className="w-6 h-6 text-muted-foreground" />
                          )}
                        </div>
                        <div className="min-w-0 w-full">
                          <p className="text-xs font-semibold truncate group-hover:text-primary">{ch.name}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{ch.category || ch.source}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">Kanal topilmadi.</p>
                )}
              </div>

              {filteredContent.length === 0 && filteredChannels.length === 0 && (
                <div className="text-center py-10">
                  <p className="text-muted-foreground">Hech narsa topilmadi. Boshqa so'z bilan qidiring.</p>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-12 space-y-12">
              <div>
                <h2 className="font-display font-semibold text-xl mb-4">Browse by Genre</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                  {genres.map((genre) => (
                    <Button key={genre.id} variant="secondary" onClick={() => setQuery(genre.name)} className="h-12 rounded-xl">{genre.name}</Button>
                  ))}
                </div>
              </div>

              {trending.length > 0 && (
                <div>
                  <h2 className="font-display font-semibold text-xl mb-6">Trending Now</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
                    {trending.slice(0, 5).map((content, index) => (
                      <ContentCard key={content.id} content={content} index={index} variant="grid" />
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Search;
