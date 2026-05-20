import { useEffect, useRef, useMemo, useState, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ChevronLeft, ChevronRight, Loader2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { GlassChannelCard } from './GlassChannelCard';
import { Channel, Schedule } from '@/hooks/useChannels';
import { cn } from '@/lib/utils';

interface Props {
  channels: Channel[];
  selectedChannelId?: string;
  getCurrentProgram: (id: string) => Schedule | undefined;
  onSelect: (c: Channel) => void;
  pageSize?: number;
  compact?: boolean;
  resetKey?: string; // change to reset visibleCount/page
  className?: string;
  rowHeight?: number;
}

export function VirtualChannelList({
  channels, selectedChannelId, getCurrentProgram, onSelect,
  pageSize = 200, compact, resetKey, className, rowHeight = 76,
}: Props) {
  const parentRef = useRef<HTMLDivElement>(null);
  const [visibleCount, setVisibleCount] = useState(pageSize);
  const [page, setPage] = useState(1);
  const [loadingChunk, setLoadingChunk] = useState(false);
  const [chunkStartTs, setChunkStartTs] = useState(0);
  const [avgChunkMs, setAvgChunkMs] = useState(700);

  // Reset on filter/source/sort change
  useEffect(() => {
    setVisibleCount(pageSize);
    setPage(1);
    parentRef.current?.scrollTo({ top: 0 });
  }, [resetKey, pageSize]);

  const totalPages = Math.max(1, Math.ceil(channels.length / pageSize));
  const cappedVisible = Math.min(visibleCount, channels.length);
  const items = useMemo(() => channels.slice(0, cappedVisible), [channels, cappedVisible]);
  const hasMore = cappedVisible < channels.length;

  // Sentinel row appended at end
  const rowCount = items.length + (hasMore ? 1 : 0);

  const virtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowHeight,
    overscan: 8,
  });
  const virtualItems = virtualizer.getVirtualItems();
  const lastVirtualIndex = virtualItems[virtualItems.length - 1]?.index;

  // Trigger next chunk when sentinel comes into view
  const loadMore = useCallback(() => {
    if (loadingChunk || !hasMore) return;
    setLoadingChunk(true);
    setChunkStartTs(performance.now());
    // Defer to next frame so UI can paint skeleton
    requestAnimationFrame(() => {
      setVisibleCount(c => Math.min(c + pageSize, channels.length));
      setPage(p => Math.min(p + 1, totalPages));
    });
  }, [loadingChunk, hasMore, pageSize, channels.length, totalPages]);

  useEffect(() => {
    if (!loadingChunk) return;
    // After items grew, measure latency
    const elapsed = performance.now() - chunkStartTs;
    setAvgChunkMs(prev => Math.round(prev * 0.5 + elapsed * 0.5));
    setLoadingChunk(false);
  }, [cappedVisible]); // eslint-disable-line react-hooks/exhaustive-deps

  // Observe sentinel via virtualizer items
  useEffect(() => {
    if (typeof lastVirtualIndex !== 'number') return;
    if (hasMore && lastVirtualIndex >= items.length) loadMore();
  }, [lastVirtualIndex, hasMore, items.length, loadMore]);

  const goToPage = (p: number) => {
    const np = Math.min(Math.max(1, p), totalPages);
    setPage(np);
    setVisibleCount(np * pageSize);
    requestAnimationFrame(() => {
      const targetIdx = (np - 1) * pageSize;
      virtualizer.scrollToIndex(targetIdx, { align: 'start' });
    });
  };

  const remaining = channels.length - cappedVisible;
  const etaSec = Math.max(1, Math.round((remaining / pageSize) * (avgChunkMs / 1000)));

  if (channels.length === 0) {
    return (
      <div className="text-center py-12">
        <Search className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
        <p className="text-sm text-muted-foreground">Kanal topilmadi</p>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col h-full min-h-0", className)}>
      {/* Pagination bar */}
      {channels.length > pageSize && (
        <div className="flex items-center justify-between gap-2 px-1 pb-2 flex-shrink-0">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-[11px] gap-1"
            disabled={page <= 1}
            onClick={() => goToPage(page - 1)}
          >
            <ChevronLeft className="w-3 h-3" /> Oldingi
          </Button>
          <div className="text-[11px] text-muted-foreground font-mono">
            {Math.min(cappedVisible, channels.length)}/{channels.length}
            <span className="opacity-60"> · {page}/{totalPages}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-[11px] gap-1"
            disabled={page >= totalPages}
            onClick={() => goToPage(page + 1)}
          >
            Keyingi <ChevronRight className="w-3 h-3" />
          </Button>
        </div>
      )}

      <div
        ref={parentRef}
        className="flex-1 overflow-y-auto scrollbar-hide"
        style={{ contain: 'strict' }}
      >
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {virtualItems.map(vRow => {
            const isSentinel = vRow.index >= items.length;
            const ch = items[vRow.index];
            return (
              <div
                key={vRow.key}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: `${vRow.size}px`,
                  transform: `translateY(${vRow.start}px)`,
                  paddingBottom: 6,
                }}
              >
                {isSentinel ? (
                  <div className="space-y-1.5 px-0.5">
                    {[0, 1, 2].map(i => (
                      <Skeleton key={i} className="h-[68px] w-full rounded-2xl" />
                    ))}
                    <div className="flex items-center justify-center gap-2 pt-1 text-[11px] text-muted-foreground">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>Yuklanmoqda… ~{etaSec}s · qoldi {remaining}</span>
                    </div>
                  </div>
                ) : ch ? (
                  <GlassChannelCard
                    channel={ch}
                    index={vRow.index}
                    isSelected={selectedChannelId === ch.id}
                    currentProgram={getCurrentProgram(ch.id)}
                    compact={compact}
                    onSelect={onSelect}
                  />
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      {!hasMore && channels.length > pageSize && (
        <div className="py-2 text-center text-[10px] text-muted-foreground/60 flex-shrink-0">
          Barcha {channels.length} ta kanal ko‘rsatildi
        </div>
      )}
    </div>
  );
}
