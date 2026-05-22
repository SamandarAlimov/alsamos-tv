import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Play, Plus, Share2, Download, Star, Clock, Calendar, Users, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Navbar from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { ContentCarousel } from '@/components/ContentCarousel';
import { useContent, ContentItem } from '@/hooks/useContent';

const TitleDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { getById, allContent, loading } = useContent();

  const routedContent = (location.state as { content?: ContentItem } | null)?.content;
  const content = id ? getById(id) || (routedContent?.id === id ? routedContent : null) : null;
  const similarContent = allContent
    .filter(c => c.id !== id && content && c.genres.some(g => content.genres.includes(g)))
    .slice(0, 10);

  const goBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate(content?.type === 'series' ? '/series' : '/movies');
  };

  if (loading && !content) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!content) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-muted-foreground">Kontent topilmadi</p>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <Button
        variant="ghost"
        size="icon"
        className="fixed left-4 top-20 z-50 rounded-full bg-black/45 text-white backdrop-blur-md hover:bg-white/15 sm:left-6"
        onClick={goBack}
        aria-label="Orqaga qaytish"
      >
        <ArrowLeft className="w-5 h-5" />
      </Button>
      
      <div className="relative h-[70vh] md:h-[80vh]">
        <div className="absolute inset-0">
          <img src={content.backdrop} alt={content.title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-hero" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
        </div>

        <div className="absolute inset-0 flex items-end">
          <div className="container mx-auto px-4 md:px-6 pb-12 md:pb-20">
            <div className="grid md:grid-cols-3 gap-8 items-end">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="hidden md:block">
                <div className="aspect-[2/3] rounded-xl overflow-hidden shadow-2xl ring-1 ring-white/10">
                  <img src={content.thumbnail} alt={content.title} className="w-full h-full object-cover" />
                </div>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }} className="md:col-span-2 space-y-6">
                <div className="flex items-center gap-3 flex-wrap">
                  {content.isOriginal && (
                    <span className="px-3 py-1 text-xs font-display font-semibold bg-gradient-to-r from-primary to-gold-light text-primary-foreground rounded-full uppercase tracking-wider">Alsamos Original</span>
                  )}
                  {content.aiScore && (
                    <span className="flex items-center gap-1 px-3 py-1 text-xs font-display font-semibold bg-foreground/10 backdrop-blur-sm text-foreground rounded-full">
                      <Star className="w-3 h-3 text-primary fill-primary" />{content.aiScore}% AI Match
                    </span>
                  )}
                </div>

                <h1 className="font-display font-bold text-4xl md:text-5xl lg:text-6xl">{content.title}</h1>

                <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                  <span className="flex items-center gap-1"><Calendar className="w-4 h-4" />{content.year}</span>
                  <span className="px-2 py-0.5 border border-muted-foreground/50 rounded text-xs">{content.rating}</span>
                  {content.duration && <span className="flex items-center gap-1"><Clock className="w-4 h-4" />{content.duration}</span>}
                  {content.type === 'series' && content.seasons && (
                    <span className="flex items-center gap-1"><Users className="w-4 h-4" />{content.seasons} Seasons</span>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {content.genres.map((genre) => (
                    <span key={genre} className="px-3 py-1 text-xs bg-secondary rounded-full text-secondary-foreground">{genre}</span>
                  ))}
                </div>

                <p className="text-base md:text-lg text-muted-foreground max-w-2xl">{content.description}</p>

                {content.cast && (
                  <p className="text-sm text-muted-foreground">
                    <span className="text-foreground">Starring:</span> {content.cast.join(', ')}
                  </p>
                )}

                <div className="flex items-center gap-3 pt-2 flex-wrap">
                  <Link to={`/watch/${content.id}`} state={{ content }}>
                    <Button variant="play" size="xl" className="gap-2"><Play className="w-5 h-5 fill-current" />Play Now</Button>
                  </Link>
                  <Button variant="glass" size="xl" className="gap-2"><Plus className="w-5 h-5" />My List</Button>
                  <Button variant="glass" size="iconLg"><Download className="w-5 h-5" /></Button>
                  <Button variant="glass" size="iconLg"><Share2 className="w-5 h-5" /></Button>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>

      {similarContent.length > 0 && (
        <div className="py-12">
          <ContentCarousel title="More Like This" items={similarContent} showAIBadge />
        </div>
      )}

      <Footer />
    </div>
  );
};

export default TitleDetail;
