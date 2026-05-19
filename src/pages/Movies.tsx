import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowUpDown, Grid, LayoutList, PlayCircle, Search, Sparkles, Star, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import Navbar from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { ContentCard } from '@/components/ContentCard';
import { useContent } from '@/hooks/useContent';
import { genres } from '@/data/genres';
import { cn } from '@/lib/utils';
import { rankedSearch } from '@/utils/search';

const Movies = () => {
  const { movies, loading } = useContent();
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortMode, setSortMode] = useState<'featured' | 'newest' | 'match'>('featured');

  const allGenres = useMemo(() => {
    const contentGenres = new Set(movies.flatMap((movie) => movie.genres));
    return genres
      .map((genre) => genre.name)
      .concat(Array.from(contentGenres))
      .filter((genre, index, array) => genre && array.indexOf(genre) === index)
      .slice(0, 14);
  }, [movies]);

  const filteredMovies = useMemo(() => {
    const byGenre = selectedGenre
      ? movies.filter((movie) => movie.genres.some((genre) => genre.toLowerCase() === selectedGenre.toLowerCase()))
      : movies;

    const searched = searchQuery.trim()
      ? rankedSearch(byGenre, searchQuery, (movie) => [
          movie.title,
          movie.description,
          movie.year?.toString(),
          movie.rating,
          movie.genres.join(' '),
          movie.cast?.join(' '),
          movie.director,
        ])
      : byGenre;

    return [...searched].sort((a, b) => {
      if (sortMode === 'newest') return b.year - a.year;
      if (sortMode === 'match') return (b.aiScore || 0) - (a.aiScore || 0);
      return Number(b.isTrending) - Number(a.isTrending) || Number(b.isOriginal) - Number(a.isOriginal) || b.year - a.year;
    });
  }, [movies, searchQuery, selectedGenre, sortMode]);

  const heroMovie = filteredMovies.find((movie) => movie.isTrending || movie.isOriginal) || filteredMovies[0] || movies[0];

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      <Navbar />

      <div className="pt-24 pb-20 lg:pb-12">
        <div className="container mx-auto px-4 md:px-6">
          {heroMovie && (
            <motion.section
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative overflow-hidden rounded-2xl border border-white/10 bg-card min-h-[340px] md:min-h-[420px] mb-8"
            >
              <img
                src={heroMovie.backdrop}
                alt={heroMovie.title}
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-background via-background/82 to-background/15" />
              <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-black/20" />

              <div className="relative z-10 p-5 sm:p-8 md:p-10 max-w-3xl min-h-[340px] md:min-h-[420px] flex flex-col justify-end">
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  <Badge className="bg-primary text-primary-foreground border-0 gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    Premium katalog
                  </Badge>
                  {heroMovie.isTrending && (
                    <Badge variant="secondary" className="glass-subtle border-white/10 gap-1.5">
                      <Star className="w-3.5 h-3.5 text-primary fill-primary" />
                      Trend
                    </Badge>
                  )}
                </div>
                <h1 className="font-display font-bold text-3xl sm:text-4xl md:text-6xl leading-tight">
                  {heroMovie.title}
                </h1>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  <span>{heroMovie.year}</span>
                  <span className="w-1 h-1 rounded-full bg-muted-foreground/60" />
                  <span>{heroMovie.rating}</span>
                  <span className="w-1 h-1 rounded-full bg-muted-foreground/60" />
                  <span>{heroMovie.duration}</span>
                  <span className="hidden sm:inline w-1 h-1 rounded-full bg-muted-foreground/60" />
                  <span className="hidden sm:inline">{heroMovie.genres.slice(0, 3).join(' / ')}</span>
                </div>
                <p className="mt-4 text-sm sm:text-base text-muted-foreground max-w-xl line-clamp-3">
                  {heroMovie.description}
                </p>
                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <Link to={`/watch/${heroMovie.id}`}>
                    <Button variant="hero" className="gap-2">
                      <PlayCircle className="w-5 h-5" />
                      Tomosha qilish
                    </Button>
                  </Link>
                  <Link to={`/title/${heroMovie.id}`}>
                    <Button variant="glass">Batafsil</Button>
                  </Link>
                </div>
              </div>
            </motion.section>
          )}

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col xl:flex-row xl:items-end justify-between gap-5 mb-6"
          >
            <div>
              <h2 className="font-display font-bold text-2xl md:text-4xl">Kinolar</h2>
              <p className="text-muted-foreground mt-1 text-sm md:text-base">
                {filteredMovies.length} ta kino saralandi · jami {movies.length} ta katalog
              </p>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full xl:w-auto">
              <div className="relative flex-1 xl:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Kino, janr, yil bo'yicha qidirish..."
                  className="h-10 pl-9 pr-9 glass-subtle border-white/5 rounded-xl"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full hover:bg-white/10 flex items-center justify-center text-muted-foreground"
                    aria-label="Qidiruvni tozalash"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="flex items-center glass rounded-xl p-1 overflow-x-auto scrollbar-hide">
                {[
                  { id: 'featured', label: 'Tanlangan' },
                  { id: 'newest', label: 'Yangi' },
                  { id: 'match', label: 'Match' },
                ].map((item) => (
                  <Button
                    key={item.id}
                    variant={sortMode === item.id ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => setSortMode(item.id as typeof sortMode)}
                    className="h-8 text-xs flex-shrink-0"
                  >
                    {item.id === 'featured' && <ArrowUpDown className="w-3.5 h-3.5" />}
                    {item.label}
                  </Button>
                ))}
              </div>

              <div className="flex items-center glass rounded-lg p-1">
                <Button aria-label="Grid" variant={viewMode === 'grid' ? 'secondary' : 'ghost'} size="iconSm" onClick={() => setViewMode('grid')}>
                  <Grid className="w-4 h-4" />
                </Button>
                <Button aria-label="List" variant={viewMode === 'list' ? 'secondary' : 'ghost'} size="iconSm" onClick={() => setViewMode('list')}>
                  <LayoutList className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="flex gap-2 overflow-x-auto scrollbar-hide pb-4 mb-6">
            <Button variant={selectedGenre === null ? 'hero' : 'secondary'} size="sm" onClick={() => setSelectedGenre(null)} className="rounded-full flex-shrink-0">Barchasi</Button>
            {allGenres.map((genre) => (
              <Button key={genre} variant={selectedGenre === genre ? 'hero' : 'secondary'} size="sm" onClick={() => setSelectedGenre(genre)} className="rounded-full flex-shrink-0">{genre}</Button>
            ))}
          </motion.div>

          {viewMode === 'grid' ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
              className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 2xl:grid-cols-6"
            >
              {filteredMovies.map((movie, index) => (
                <ContentCard key={movie.id} content={movie} index={index} variant="grid" />
              ))}
            </motion.div>
          ) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="grid gap-3">
              {filteredMovies.map((movie, index) => (
                <Link
                  key={movie.id}
                  to={`/watch/${movie.id}`}
                  className={cn(
                    "group grid grid-cols-[88px_1fr_auto] sm:grid-cols-[116px_1fr_auto] gap-4 items-center rounded-2xl glass-subtle p-3 hover:border-primary/30 hover:bg-white/[0.06] transition-all",
                    index === 0 && "ring-1 ring-primary/20"
                  )}
                >
                  <img src={movie.thumbnail} alt={movie.title} className="w-full aspect-[2/3] object-cover rounded-xl bg-secondary" loading="lazy" />
                  <div className="min-w-0">
                    <h3 className="font-display font-semibold text-base sm:text-lg truncate group-hover:text-primary">{movie.title}</h3>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span>{movie.year}</span>
                      <span>{movie.rating}</span>
                      <span>{movie.duration}</span>
                      <span className="hidden sm:inline">{movie.genres.slice(0, 3).join(' / ')}</span>
                    </div>
                    <p className="mt-2 text-xs sm:text-sm text-muted-foreground line-clamp-2">{movie.description}</p>
                  </div>
                  <span className="hidden sm:inline-flex h-10 w-10 items-center justify-center rounded-full bg-foreground text-background shadow-xl group-hover:scale-105 transition-transform">
                    <PlayCircle className="w-5 h-5" />
                  </span>
                </Link>
              ))}
            </motion.div>
          )}

          {filteredMovies.length === 0 && (
            <div className="text-center py-20 glass-subtle rounded-2xl">
              <p className="text-muted-foreground">Bu qidiruv bo'yicha kino topilmadi. Janr yoki so'zni almashtirib ko'ring.</p>
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Movies;
