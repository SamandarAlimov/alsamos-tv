import Navbar from '@/components/Navbar';
import { HeroBanner } from '@/components/HeroBanner';
import { ContentCarousel } from '@/components/ContentCarousel';
import { GenreGrid } from '@/components/GenreGrid';
import { LiveChannels } from '@/components/LiveChannels';
import { Footer } from '@/components/Footer';
import { useContent, useContinueWatching } from '@/hooks/useContent';
import { useChannels } from '@/hooks/useChannels';
import { genres } from '@/data/genres';

const Index = () => {
  const { featured, trending, originals, allContent, loading } = useContent();
  const { items: continueWatching } = useContinueWatching();
  const { channels } = useChannels();

  // Map real channels to LiveChannels format
  const liveChannelsMapped = channels
    .filter(c => c.is_live)
    .slice(0, 6)
    .map(c => ({
      id: c.id,
      name: c.name,
      logo: c.logo_url || '📺',
      category: c.category || 'General',
      isLive: c.is_live,
      currentProgram: c.current_program || undefined,
      viewers: c.viewer_count,
    }));

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // If no content yet, show empty state
  if (!featured && allContent.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
          <h2 className="font-display font-bold text-2xl md:text-3xl mb-4">Kontentlar tez orada qo'shiladi</h2>
          <p className="text-muted-foreground max-w-md">
            Hozirda real kino va seriallar ulanyapti. Live TV bo'limidan kanallarni tomosha qilishingiz mumkin.
          </p>
        </div>
        {liveChannelsMapped.length > 0 && <LiveChannels channels={liveChannelsMapped} />}
        <GenreGrid genres={genres} />
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {featured && <HeroBanner content={featured} />}
      
      <div className={featured ? "relative -mt-16 sm:-mt-24 md:-mt-32 z-10" : "pt-20 sm:pt-24"}>
        {trending.length > 0 && (
          <ContentCarousel title="Trending Now" items={trending} showAIBadge />
        )}
        
        {originals.length > 0 && (
          <ContentCarousel title="Alsamos Originals" items={originals} variant="large" />
        )}
        
        {continueWatching.length > 0 && (
          <ContentCarousel title="Continue Watching" items={continueWatching} />
        )}
        
        {liveChannelsMapped.length > 0 && <LiveChannels channels={liveChannelsMapped} />}
        
        <GenreGrid genres={genres} />
        
        {allContent.length > 5 && (
          <ContentCarousel
            title="Siz uchun tavsiya"
            items={allContent.slice(0, 10)}
            showAIBadge
          />
        )}
      </div>
      
      <Footer />
    </div>
  );
};

export default Index;
