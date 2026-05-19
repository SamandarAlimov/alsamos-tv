import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { MobileBottomNav } from "@/components/MobileBottomNav";

const Index = lazy(() => import("./pages/Index"));
const Watch = lazy(() => import("./pages/Watch"));
const TitleDetail = lazy(() => import("./pages/TitleDetail"));
const Search = lazy(() => import("./pages/Search"));
const Movies = lazy(() => import("./pages/Movies"));
const Series = lazy(() => import("./pages/Series"));
const LiveTV = lazy(() => import("./pages/LiveTV"));
const LiveStudio = lazy(() => import("./pages/LiveStudio"));
const TVGuide = lazy(() => import("./pages/TVGuide"));
const AIStudio = lazy(() => import("./pages/AIStudio"));
const Auth = lazy(() => import("./pages/Auth"));
const Profile = lazy(() => import("./pages/Profile"));
const Subscription = lazy(() => import("./pages/Subscription"));
const Shorts = lazy(() => import("./pages/Shorts"));
const CreatorStudio = lazy(() => import("./pages/CreatorStudio"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const PageLoader = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/watch/:id" element={<Watch />} />
              <Route path="/title/:id" element={<TitleDetail />} />
              <Route path="/search" element={<Search />} />
              <Route path="/movies" element={<Movies />} />
              <Route path="/series" element={<Series />} />
              <Route path="/live" element={<LiveTV />} />
              <Route path="/live/:id" element={<LiveTV />} />
              <Route path="/live-studio" element={<LiveStudio />} />
              <Route path="/tv-guide" element={<TVGuide />} />
              <Route path="/ai-studio" element={<AIStudio />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/subscription" element={<Subscription />} />
              <Route path="/shorts" element={<Shorts />} />
              <Route path="/creator-studio" element={<CreatorStudio />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
          <MobileBottomNav />
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
