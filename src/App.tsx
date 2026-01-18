import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import Watch from "./pages/Watch";
import TitleDetail from "./pages/TitleDetail";
import Search from "./pages/Search";
import Movies from "./pages/Movies";
import Series from "./pages/Series";
import LiveTV from "./pages/LiveTV";
import LiveStudio from "./pages/LiveStudio";
import TVGuide from "./pages/TVGuide";
import AIStudio from "./pages/AIStudio";
import Auth from "./pages/Auth";
import Profile from "./pages/Profile";
import Subscription from "./pages/Subscription";
import Shorts from "./pages/Shorts";
import CreatorStudio from "./pages/CreatorStudio";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
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
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
