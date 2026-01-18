import Navbar from '@/components/Navbar';
import { HeroBanner } from '@/components/HeroBanner';
import { ContentCarousel } from '@/components/ContentCarousel';
import { GenreGrid } from '@/components/GenreGrid';
import { LiveChannels } from '@/components/LiveChannels';
import { Footer } from '@/components/Footer';
import {
  featuredContent,
  trendingNow,
  alsamosOriginals,
  continueWatching,
  genres,
  liveChannels,
} from '@/data/mockContent';

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Hero */}
      <HeroBanner content={featuredContent} />
      
      {/* Content Sections */}
      <div className="relative -mt-32 z-10">
        <ContentCarousel
          title="Trending Now"
          items={trendingNow}
          showAIBadge
        />
        
        <ContentCarousel
          title="Alsamos Originals"
          items={alsamosOriginals}
          variant="large"
        />
        
        {continueWatching.length > 0 && (
          <ContentCarousel
            title="Continue Watching"
            items={continueWatching}
          />
        )}
        
        <LiveChannels channels={liveChannels} />
        
        <GenreGrid genres={genres} />
        
        <ContentCarousel
          title="Because You Watched: The Algorithm"
          items={[...trendingNow].reverse()}
          showAIBadge
        />
      </div>
      
      <Footer />
    </div>
  );
};

export default Index;
