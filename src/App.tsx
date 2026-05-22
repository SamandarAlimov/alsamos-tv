import { lazy, Suspense, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
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

const TV_FOCUS_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

function isTextEntryElement(element: EventTarget | null) {
  if (!(element instanceof HTMLElement)) return false;
  return element.tagName === 'INPUT' || element.tagName === 'TEXTAREA' || element.isContentEditable;
}

function isFocusableElement(element: HTMLElement) {
  if (element.tabIndex < 0 || element.getAttribute('aria-hidden') === 'true') return false;
  if (element.tagName === 'BUTTON' && element.closest('a[href]')) return false;
  const style = window.getComputedStyle(element);
  if (style.visibility === 'hidden' || style.display === 'none') return false;
  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

function focusableElements() {
  return Array.from(document.querySelectorAll<HTMLElement>(TV_FOCUS_SELECTOR)).filter(isFocusableElement);
}

function centerOf(rect: DOMRect) {
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

function findFocusTarget(
  elements: HTMLElement[],
  current: HTMLElement | null,
  direction: 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight'
) {
  if (elements.length === 0) return null;
  const currentIndex = current ? elements.indexOf(current) : -1;

  if (!current || currentIndex === -1) {
    return elements.find((element) => element.dataset.selected === 'true') || elements[0];
  }

  const row = current.closest<HTMLElement>('[data-tv-row]');
  if ((direction === 'ArrowLeft' || direction === 'ArrowRight') && row) {
    const rowItems = elements.filter((element) => row.contains(element));
    if (rowItems.length > 1) {
      const rowIndex = rowItems.indexOf(current);
      const step = direction === 'ArrowRight' ? 1 : -1;
      return rowItems[(rowIndex + step + rowItems.length) % rowItems.length];
    }
  }

  const currentCenter = centerOf(current.getBoundingClientRect());
  const candidates = elements
    .filter((element) => element !== current)
    .map((element) => {
      const center = centerOf(element.getBoundingClientRect());
      const dx = center.x - currentCenter.x;
      const dy = center.y - currentCenter.y;
      const horizontal = direction === 'ArrowLeft' || direction === 'ArrowRight';
      const primary = direction === 'ArrowRight' ? dx : direction === 'ArrowLeft' ? -dx : direction === 'ArrowDown' ? dy : -dy;
      const cross = horizontal ? Math.abs(dy) : Math.abs(dx);
      return { element, inDirection: primary > 4, score: primary * 3 + cross };
    })
    .filter((item) => item.inDirection)
    .sort((a, b) => a.score - b.score);

  if (candidates[0]) return candidates[0].element;
  const step = direction === 'ArrowRight' || direction === 'ArrowDown' ? 1 : -1;
  return elements[(currentIndex + step + elements.length) % elements.length];
}

function TvRemoteNavigation() {
  const location = useLocation();

  useEffect(() => {
    if (location.pathname.startsWith('/live') || location.pathname.startsWith('/watch')) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || isTextEntryElement(event.target)) return;
      const isArrow = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key);
      const isSelect = ['Enter', ' ', 'OK', 'Accept', 'Select'].includes(event.key);
      const elements = focusableElements();
      const active = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      const current = active && elements.includes(active) ? active : null;

      if (isArrow) {
        const target = findFocusTarget(elements, current, event.key as 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight');
        if (target) {
          event.preventDefault();
          target.focus({ preventScroll: true });
          target.scrollIntoView({ block: 'nearest', inline: 'nearest' });
        }
        return;
      }

      if (isSelect && current) {
        event.preventDefault();
        current.click();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [location.pathname]);

  return null;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <TvRemoteNavigation />
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
