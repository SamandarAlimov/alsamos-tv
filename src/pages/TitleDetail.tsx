import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Play, Plus, Share2, Download, Star, Clock, Calendar, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Navbar from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { ContentCarousel } from '@/components/ContentCarousel';
import { featuredContent, trendingNow, alsamosOriginals } from '@/data/mockContent';

const allContent = [featuredContent, ...trendingNow, ...alsamosOriginals];

const TitleDetail = () => {
  const { id } = useParams();
  const content = allContent.find((c) => c.id === id) || featuredContent;
  const similarContent = trendingNow.filter((c) => c.id !== id);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Hero Section */}
      <div className="relative h-[70vh] md:h-[80vh]">
        {/* Background */}
        <div className="absolute inset-0">
          <img
            src={content.backdrop}
            alt={content.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-hero" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
        </div>

        {/* Content */}
        <div className="absolute inset-0 flex items-end">
          <div className="container mx-auto px-4 md:px-6 pb-12 md:pb-20">
            <div className="grid md:grid-cols-3 gap-8 items-end">
              {/* Poster */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="hidden md:block"
              >
                <div className="aspect-[2/3] rounded-xl overflow-hidden shadow-2xl ring-1 ring-white/10">
                  <img
                    src={content.thumbnail}
                    alt={content.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              </motion.div>

              {/* Info */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="md:col-span-2 space-y-6"
              >
                {/* Badges */}
                <div className="flex items-center gap-3 flex-wrap">
                  {content.isOriginal && (
                    <span className="px-3 py-1 text-xs font-display font-semibold bg-gradient-to-r from-primary to-gold-light text-primary-foreground rounded-full uppercase tracking-wider">
                      Alsamos Original
                    </span>
                  )}
                  {content.isNew && (
                    <span className="px-3 py-1 text-xs font-display font-semibold bg-accent text-accent-foreground rounded-full uppercase tracking-wider">
                      New
                    </span>
                  )}
                  {content.aiScore && (
                    <span className="flex items-center gap-1 px-3 py-1 text-xs font-display font-semibold bg-foreground/10 backdrop-blur-sm text-foreground rounded-full">
                      <Star className="w-3 h-3 text-primary fill-primary" />
                      {content.aiScore}% AI Match
                    </span>
                  )}
                </div>

                {/* Title */}
                <h1 className="font-display font-bold text-4xl md:text-5xl lg:text-6xl">
                  {content.title}
                </h1>

                {/* Metadata */}
                <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {content.year}
                  </span>
                  <span className="px-2 py-0.5 border border-muted-foreground/50 rounded text-xs">
                    {content.rating}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {content.duration}
                  </span>
                  {content.type === 'series' && (
                    <span className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {content.seasons} Seasons
                    </span>
                  )}
                </div>

                {/* Genres */}
                <div className="flex items-center gap-2 flex-wrap">
                  {content.genres.map((genre) => (
                    <span
                      key={genre}
                      className="px-3 py-1 text-xs bg-secondary rounded-full text-secondary-foreground"
                    >
                      {genre}
                    </span>
                  ))}
                </div>

                {/* Description */}
                <p className="text-base md:text-lg text-muted-foreground max-w-2xl">
                  {content.description}
                </p>

                {/* Cast */}
                {content.cast && (
                  <p className="text-sm text-muted-foreground">
                    <span className="text-foreground">Starring:</span>{' '}
                    {content.cast.join(', ')}
                  </p>
                )}

                {/* Actions */}
                <div className="flex items-center gap-3 pt-2 flex-wrap">
                  <Link to={`/watch/${content.id}`}>
                    <Button variant="play" size="xl" className="gap-2">
                      <Play className="w-5 h-5 fill-current" />
                      Play Now
                    </Button>
                  </Link>
                  <Button variant="glass" size="xl" className="gap-2">
                    <Plus className="w-5 h-5" />
                    My List
                  </Button>
                  <Button variant="glass" size="iconLg">
                    <Download className="w-5 h-5" />
                  </Button>
                  <Button variant="glass" size="iconLg">
                    <Share2 className="w-5 h-5" />
                  </Button>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>

      {/* Similar Content */}
      <div className="py-12">
        <ContentCarousel
          title="More Like This"
          items={similarContent}
          showAIBadge
        />
      </div>

      <Footer />
    </div>
  );
};

export default TitleDetail;
