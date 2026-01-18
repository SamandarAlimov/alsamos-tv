import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Play, Info, Plus, Volume2, VolumeX, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Content } from '@/types/content';
import { Link } from 'react-router-dom';

interface HeroBannerProps {
  content: Content;
}

export function HeroBanner({ content }: HeroBannerProps) {
  const [isMuted, setIsMuted] = useState(true);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.play().catch(() => {
        // Autoplay might be blocked
      });
    }
  }, []);

  return (
    <div className="relative w-full h-[85vh] md:h-[90vh] overflow-hidden">
      {/* Background Video/Image */}
      <div className="absolute inset-0">
        {content.trailer ? (
          <>
            <video
              ref={videoRef}
              src={content.trailer}
              className={`w-full h-full object-cover transition-opacity duration-1000 ${
                isVideoLoaded ? 'opacity-100' : 'opacity-0'
              }`}
              autoPlay
              loop
              muted={isMuted}
              playsInline
              onLoadedData={() => setIsVideoLoaded(true)}
            />
            {/* Fallback Image */}
            <img
              src={content.backdrop}
              alt={content.title}
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${
                isVideoLoaded ? 'opacity-0' : 'opacity-100'
              }`}
            />
          </>
        ) : (
          <img
            src={content.backdrop}
            alt={content.title}
            className="w-full h-full object-cover"
          />
        )}
      </div>

      {/* Gradients Overlay */}
      <div className="absolute inset-0 bg-gradient-hero" />
      <div className="absolute inset-0 bg-gradient-hero-bottom" />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />

      {/* Content */}
      <div className="absolute inset-0 flex items-center">
        <div className="container mx-auto px-4 md:px-6">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="max-w-2xl space-y-6"
          >
            {/* Badges */}
            <div className="flex items-center gap-3">
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
            <h1 className="font-display font-bold text-4xl md:text-6xl lg:text-7xl tracking-tight leading-none">
              {content.title}
            </h1>

            {/* Metadata */}
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="text-primary font-semibold">{content.year}</span>
              <span className="px-2 py-0.5 border border-muted-foreground/50 rounded text-xs">
                {content.rating}
              </span>
              <span>{content.duration}</span>
              <span className="hidden sm:inline">{content.genres.join(' • ')}</span>
            </div>

            {/* Description */}
            <p className="text-base md:text-lg text-muted-foreground max-w-xl line-clamp-3">
              {content.description}
            </p>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2">
              <Link to={`/watch/${content.id}`}>
                <Button variant="play" size="xl" className="gap-2">
                  <Play className="w-5 h-5 fill-current" />
                  Play Now
                </Button>
              </Link>
              <Link to={`/title/${content.id}`}>
                <Button variant="glass" size="xl" className="gap-2">
                  <Info className="w-5 h-5" />
                  More Info
                </Button>
              </Link>
              <Button variant="glass" size="iconLg" className="hidden sm:flex">
                <Plus className="w-5 h-5" />
              </Button>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Volume Control */}
      {content.trailer && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="absolute bottom-32 right-4 md:right-8"
        >
          <Button
            variant="glass"
            size="icon"
            onClick={() => setIsMuted(!isMuted)}
            className="rounded-full"
          >
            {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </Button>
        </motion.div>
      )}

      {/* Scroll Indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="w-6 h-10 border-2 border-muted-foreground/30 rounded-full flex justify-center pt-2"
        >
          <motion.div className="w-1 h-2 bg-muted-foreground/50 rounded-full" />
        </motion.div>
      </motion.div>
    </div>
  );
}
