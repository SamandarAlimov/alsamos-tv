import { useState, useRef, useEffect, useCallback, useDeferredValue, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar, Clock, Play, Radio, ChevronLeft, ChevronRight,
  Grid3X3, Tv, Search, Bell, BellOff, Zap, ChevronDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Navbar from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { useChannels, Channel, Schedule } from '@/hooks/useChannels';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { format, addHours, startOfHour, isWithinInterval, differenceInMinutes } from 'date-fns';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { CategoryFilter } from '@/components/live/CategoryFilter';
import { useIsMobile } from '@/hooks/use-mobile';
import { rankedSearch } from '@/utils/search';

const TVGuide = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isMobile = useIsMobile();
  const { channels, loading, getChannelSchedule } = useChannels();
  const requestedChannelId = searchParams.get('channel');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [timeOffset, setTimeOffset] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [reminders, setReminders] = useState<Set<string>>(new Set());
  const [expandedChannel, setExpandedChannel] = useState<string | null>(null);
  const guidePageSize = isMobile ? 80 : 160;
  const [visibleCount, setVisibleCount] = useState(guidePageSize);
  const scrollRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  const activeSearchQuery = deferredSearchQuery.trim();
  const categories = useMemo(() => (
    ['All', ...new Set(channels.map(c => c.category).filter(Boolean) as string[])]
  ), [channels]);

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (timelineRef.current && timeOffset === 0) {
      const now = new Date();
      const base = startOfHour(now);
      const mins = differenceInMinutes(now, base);
      const pxPerMin = 200 / 60;
      timelineRef.current.scrollLeft = Math.max(0, (mins * pxPerMin) - 400);
    }
  }, [loading, timeOffset]);

  const baseTime = startOfHour(addHours(currentTime, timeOffset));
  const timeSlots = Array.from({ length: 12 }, (_, i) => addHours(baseTime, i));

  const getScheduleForChannel = useCallback((channelId: string) => getChannelSchedule(channelId), [getChannelSchedule]);
  const isCurrentlyPlaying = useCallback((schedule: Schedule) => isWithinInterval(currentTime, { start: new Date(schedule.start_time), end: new Date(schedule.end_time) }), [currentTime]);

  const getSchedulePosition = useCallback((schedule: Schedule) => {
    const start = new Date(schedule.start_time);
    const end = new Date(schedule.end_time);
    const slotStart = baseTime;
    const slotEnd = addHours(baseTime, 12);
    const visibleStart = start < slotStart ? slotStart : start;
    const visibleEnd = end > slotEnd ? slotEnd : end;
    const leftOffset = Math.max(0, differenceInMinutes(visibleStart, slotStart));
    const duration = differenceInMinutes(visibleEnd, visibleStart);
    const pxPerMin = 200 / 60;
    return { left: leftOffset * pxPerMin, width: Math.max(80, duration * pxPerMin) };
  }, [baseTime]);

  const isScheduleVisible = useCallback((schedule: Schedule) => {
    const start = new Date(schedule.start_time);
    const end = new Date(schedule.end_time);
    const slotEnd = addHours(baseTime, 12);
    return start < slotEnd && end > baseTime;
  }, [baseTime]);

  const handleWatchChannel = (channel?: Channel) => {
    navigate(channel ? `/live/${encodeURIComponent(channel.id)}` : '/live');
  };

  const toggleReminder = (scheduleId: string, programTitle: string) => {
    setReminders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(scheduleId)) {
        newSet.delete(scheduleId);
        toast.info(`"${programTitle}" uchun eslatma o'chirildi`);
      } else {
        newSet.add(scheduleId);
        toast.success(`"${programTitle}" uchun eslatma qo'yildi`, { description: 'Boshlanishida xabar beramiz' });
      }
      return newSet;
    });
  };

  const filteredChannels = useMemo(() => {
    const base = activeSearchQuery
      ? channels
      : channels.filter(channel => selectedCategory === 'All' || channel.category === selectedCategory);

    return activeSearchQuery
      ? rankedSearch(base, activeSearchQuery, (channel) => [
          channel.name,
          channel.id,
          channel.description,
          channel.category,
          channel.current_program,
          channel.source,
          getScheduleForChannel(channel.id).map((schedule) => schedule.program_title).join(' '),
        ])
      : base;
  }, [activeSearchQuery, channels, getScheduleForChannel, selectedCategory]);

  useEffect(() => {
    setVisibleCount(guidePageSize);
    if (!requestedChannelId) scrollRef.current?.scrollTo({ top: 0 });
  }, [activeSearchQuery, guidePageSize, requestedChannelId, selectedCategory]);

  useEffect(() => {
    if (!requestedChannelId) return;
    setSearchQuery('');
    setSelectedCategory('All');
    setExpandedChannel(requestedChannelId);
  }, [requestedChannelId]);

  const visibleChannels = useMemo(
    () => filteredChannels.slice(0, visibleCount),
    [filteredChannels, visibleCount]
  );
  const hiddenChannelCount = Math.max(0, filteredChannels.length - visibleChannels.length);

  useEffect(() => {
    if (!requestedChannelId || filteredChannels.length === 0) return;
    const requestedIndex = filteredChannels.findIndex((channel) => channel.id === requestedChannelId);
    if (requestedIndex < 0) return;
    const neededCount = Math.min(filteredChannels.length, Math.max(guidePageSize, requestedIndex + 8));
    setVisibleCount((count) => Math.max(count, neededCount));
  }, [filteredChannels, guidePageSize, requestedChannelId]);

  useEffect(() => {
    if (!requestedChannelId) return;
    const frame = window.requestAnimationFrame(() => {
      const row = Array.from(document.querySelectorAll<HTMLElement>('[data-guide-channel-id]'))
        .find((element) => element.dataset.guideChannelId === requestedChannelId);
      if (!row) return;
      row.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'smooth' });
      const focusTarget = row.querySelector<HTMLElement>('button, a[href], [tabindex]:not([tabindex="-1"])');
      focusTarget?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [requestedChannelId, visibleChannels]);

  const currentTimePosition = (() => {
    const mins = differenceInMinutes(currentTime, baseTime);
    return mins * (200 / 60);
  })();

  const getProgramProgress = (schedule: Schedule) => {
    const start = new Date(schedule.start_time).getTime();
    const end = new Date(schedule.end_time).getTime();
    const now = currentTime.getTime();
    return Math.min(100, Math.max(0, ((now - start) / (end - start)) * 100));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-20 container mx-auto px-4">
          <Skeleton className="h-12 w-64 mb-6" />
          <div className="space-y-3">
            {[1,2,3,4].map(i => <Skeleton key={i} className="h-24 w-full rounded-2xl" />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="pt-20 pb-24 lg:pb-12">
        <div className="container mx-auto px-3 sm:px-4 md:px-6">
          {/* Header */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-4 sm:mb-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 sm:gap-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl glass-card flex items-center justify-center">
                  <Grid3X3 className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                </div>
                <div>
                  <h1 className="text-xl sm:text-3xl font-display font-bold">TV Guide</h1>
                  <p className="text-muted-foreground text-xs sm:text-sm">Dastur jadvali</p>
                </div>
              </div>

              {/* Mobile: compact controls */}
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Button variant="outline" size="icon" onClick={() => setTimeOffset(p => p - 6)} 
                  className="w-8 h-8 sm:w-9 sm:h-9 glass-subtle border-white/10 hover:bg-white/10">
                  <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </Button>
                <Button onClick={() => setTimeOffset(0)} size="sm" className="gap-1.5 bg-primary hover:bg-primary/90 h-8 sm:h-9 px-2.5 sm:px-3 text-xs sm:text-sm">
                  <Zap className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden xs:inline">Hozir</span>
                </Button>
                <Button variant="outline" size="icon" onClick={() => setTimeOffset(p => p + 6)} 
                  className="w-8 h-8 sm:w-9 sm:h-9 glass-subtle border-white/10 hover:bg-white/10">
                  <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </Button>
                <Link to="/live" className="hidden sm:block">
                  <Button variant="default" size="sm" className="gap-2 ml-1"><Tv className="w-4 h-4" />Jonli efir</Button>
                </Link>
              </div>
            </div>
          </motion.div>

          {/* Search & Filters */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-4 sm:mb-6 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Kanal yoki dastur qidirish..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 glass-subtle border-white/5 h-10 text-sm" />
            </div>
            <CategoryFilter categories={categories} selected={selectedCategory} onSelect={setSelectedCategory} />
          </motion.div>

          {/* Time Info */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-3 sm:mb-4 flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-muted-foreground flex-wrap">
            <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">{format(currentTime, 'EEEE, MMMM d, yyyy')}</span>
            <span className="sm:hidden">{format(currentTime, 'MMM d, yyyy')}</span>
            <span className="mx-1 sm:mx-2">•</span>
            <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            {format(currentTime, 'h:mm a')}
            {reminders.size > 0 && (<><span className="mx-1 sm:mx-2">•</span><Bell className="w-3.5 h-3.5 text-primary" /><span className="text-primary">{reminders.size} eslatma</span></>)}
          </motion.div>

          {/* Mobile: Card-based channel list */}
          {isMobile ? (
            <MobileEPG
              channels={visibleChannels}
              getScheduleForChannel={getScheduleForChannel}
              isCurrentlyPlaying={isCurrentlyPlaying}
              isScheduleVisible={isScheduleVisible}
              currentTime={currentTime}
              expandedChannel={expandedChannel}
              setExpandedChannel={setExpandedChannel}
              reminders={reminders}
              toggleReminder={toggleReminder}
              handleWatchChannel={handleWatchChannel}
              getProgramProgress={getProgramProgress}
              highlightChannelId={requestedChannelId || undefined}
            />
          ) : (
            /* Desktop: Horizontal EPG Grid */
            <DesktopEPG
              channels={visibleChannels}
              timeSlots={timeSlots}
              timelineRef={timelineRef}
              scrollRef={scrollRef}
              getScheduleForChannel={getScheduleForChannel}
              isScheduleVisible={isScheduleVisible}
              isCurrentlyPlaying={isCurrentlyPlaying}
              getSchedulePosition={getSchedulePosition}
              currentTimePosition={currentTimePosition}
              reminders={reminders}
              toggleReminder={toggleReminder}
              handleWatchChannel={handleWatchChannel}
              currentTime={currentTime}
              highlightChannelId={requestedChannelId || undefined}
            />
          )}

          {hiddenChannelCount > 0 && (
            <div className="mt-4 flex justify-center">
              <Button
                variant="outline"
                className="glass-subtle border-white/10"
                onClick={() => setVisibleCount((count) => Math.min(count + guidePageSize, filteredChannels.length))}
              >
                Yana {Math.min(guidePageSize, hiddenChannelCount)} ta kanal ko'rsatish
              </Button>
            </div>
          )}

          {/* Legend */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
            className="mt-4 sm:mt-6 flex flex-wrap items-center gap-3 sm:gap-6 text-xs sm:text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 sm:w-4 sm:h-4 rounded bg-gradient-to-r from-primary to-primary/60" /><span>Hozir efirda</span></div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 sm:w-4 sm:h-4 rounded glass-card" /><span>Keyingi</span></div>
            <div className="flex items-center gap-1.5"><Radio className="w-3 h-3 sm:w-4 sm:h-4 text-accent animate-pulse" /><span>Jonli</span></div>
            <div className="flex items-center gap-1.5"><Bell className="w-3 h-3 sm:w-4 sm:h-4 text-primary" /><span>Eslatma</span></div>
          </motion.div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

/* ==================== Mobile EPG ==================== */
interface MobileEPGProps {
  channels: Channel[];
  getScheduleForChannel: (id: string) => Schedule[];
  isCurrentlyPlaying: (s: Schedule) => boolean;
  isScheduleVisible: (s: Schedule) => boolean;
  currentTime: Date;
  expandedChannel: string | null;
  setExpandedChannel: (id: string | null) => void;
  reminders: Set<string>;
  toggleReminder: (id: string, title: string) => void;
  handleWatchChannel: (channel?: Channel) => void;
  getProgramProgress: (s: Schedule) => number;
  highlightChannelId?: string;
}

const MobileEPG = ({
  channels, getScheduleForChannel, isCurrentlyPlaying, isScheduleVisible,
  currentTime, expandedChannel, setExpandedChannel, reminders, toggleReminder,
  handleWatchChannel, getProgramProgress, highlightChannelId
}: MobileEPGProps) => {
  if (channels.length === 0) {
    return (
      <div className="glass-card rounded-2xl p-8 text-center">
        <Search className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
        <h3 className="font-semibold mb-1">Kanal topilmadi</h3>
        <p className="text-muted-foreground text-xs">Qidiruv yoki filterlarni o'zgartiring</p>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {channels.map((channel, index) => {
        const allSchedules = getScheduleForChannel(channel.id).filter(isScheduleVisible);
        const currentProgram = allSchedules.find(isCurrentlyPlaying);
        const upcomingPrograms = allSchedules.filter(s => new Date(s.start_time) > currentTime).slice(0, 4);
        const isExpanded = expandedChannel === channel.id;

        return (
          <motion.div
            key={channel.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.03 }}
            data-guide-channel-id={channel.id}
            tabIndex={-1}
            className={cn(
              "glass-card rounded-2xl overflow-hidden",
              channel.id === highlightChannelId && "ring-2 ring-primary/70 bg-primary/10 shadow-lg shadow-primary/10"
            )}
          >
            {/* Channel header + current program */}
            <button
              onClick={() => setExpandedChannel(isExpanded ? null : channel.id)}
              className="w-full p-3.5 flex items-center gap-3 active:bg-white/[0.03] transition-colors"
            >
              {/* Logo */}
              <div className="w-11 h-11 rounded-xl glass-strong flex items-center justify-center overflow-hidden flex-shrink-0 ring-1 ring-white/10">
                {channel.logo_url ? (
                  <img src={channel.logo_url} alt={channel.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="font-bold text-sm">{channel.name.charAt(0)}</span>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0 text-left">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-sm truncate">{channel.name}</span>
                  {channel.is_live && (
                    <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-accent/20 text-accent text-[10px] font-medium flex-shrink-0">
                      <Radio className="w-2.5 h-2.5 animate-pulse" />LIVE
                    </span>
                  )}
                </div>
                {currentProgram ? (
                  <div className="mt-0.5">
                    <div className="flex items-center gap-1">
                      <Play className="w-2.5 h-2.5 text-primary fill-primary flex-shrink-0" />
                      <span className="text-xs text-foreground/80 truncate">{currentProgram.program_title}</span>
                    </div>
                    <div className="mt-1.5 h-1 rounded-full bg-white/10 overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-primary to-primary/60 transition-all" style={{ width: `${getProgramProgress(currentProgram)}%` }} />
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground mt-0.5">Dastur mavjud emas</p>
                )}
              </div>

              {/* Expand arrow + watch button */}
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <Button size="icon" variant="ghost" className="w-8 h-8 glass-subtle" onClick={(e) => { e.stopPropagation(); handleWatchChannel(channel); }}>
                  <Tv className="w-3.5 h-3.5 text-primary" />
                </Button>
                <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", isExpanded && "rotate-180")} />
              </div>
            </button>

            {/* Expanded schedule */}
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden"
                >
                  <div className="px-3.5 pb-3.5 space-y-1.5 border-t border-white/5 pt-2.5">
                    {currentProgram && (
                      <ScheduleItem
                        schedule={currentProgram}
                        isCurrent={true}
                        isFuture={false}
                        hasReminder={reminders.has(currentProgram.id)}
                        toggleReminder={toggleReminder}
                        handleWatch={() => handleWatchChannel(channel)}
                      />
                    )}
                    {upcomingPrograms.map(s => (
                      <ScheduleItem
                        key={s.id}
                        schedule={s}
                        isCurrent={false}
                        isFuture={true}
                        hasReminder={reminders.has(s.id)}
                        toggleReminder={toggleReminder}
                        handleWatch={() => handleWatchChannel(channel)}
                      />
                    ))}
                    {!currentProgram && upcomingPrograms.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-3">Rejalashtirgan dastur yo'q</p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </div>
  );
};

/* Schedule item for mobile */
const ScheduleItem = ({ schedule, isCurrent, isFuture, hasReminder, toggleReminder, handleWatch }: {
  schedule: Schedule; isCurrent: boolean; isFuture: boolean; hasReminder: boolean;
  toggleReminder: (id: string, title: string) => void; handleWatch: () => void;
}) => (
  <button
    onClick={handleWatch}
    className={cn(
      "w-full flex items-center gap-2.5 p-2.5 rounded-xl text-left transition-all active:scale-[0.98]",
      isCurrent
        ? "bg-gradient-to-r from-primary/20 to-primary/5 ring-1 ring-primary/30"
        : "glass-subtle hover:bg-white/[0.04]"
    )}
  >
    {/* Time */}
    <div className="flex-shrink-0 w-14 text-center">
      <span className={cn("text-xs font-medium", isCurrent ? "text-primary" : "text-muted-foreground")}>
        {format(new Date(schedule.start_time), 'HH:mm')}
      </span>
      <span className="block text-[10px] text-muted-foreground/60">
        {format(new Date(schedule.end_time), 'HH:mm')}
      </span>
    </div>

    {/* Divider */}
    <div className={cn("w-0.5 h-8 rounded-full flex-shrink-0", isCurrent ? "bg-primary" : "bg-white/10")} />

    {/* Title */}
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-1.5">
        {isCurrent && <Play className="w-3 h-3 text-primary fill-primary flex-shrink-0" />}
        <span className={cn("text-xs font-medium truncate", isCurrent && "text-primary")}>{schedule.program_title}</span>
      </div>
      {schedule.category && (
        <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded text-[9px] glass-subtle text-muted-foreground">{schedule.category}</span>
      )}
    </div>

    {/* Reminder */}
    {isFuture && (
      <Button variant="ghost" size="icon" className={cn("w-7 h-7 flex-shrink-0", hasReminder && "text-primary")}
        onClick={(e) => { e.stopPropagation(); toggleReminder(schedule.id, schedule.program_title); }}>
        {hasReminder ? <Bell className="w-3.5 h-3.5 fill-primary" /> : <BellOff className="w-3.5 h-3.5" />}
      </Button>
    )}
  </button>
);

/* ==================== Desktop EPG ==================== */
interface DesktopEPGProps {
  channels: Channel[];
  timeSlots: Date[];
  timelineRef: React.RefObject<HTMLDivElement>;
  scrollRef: React.RefObject<HTMLDivElement>;
  getScheduleForChannel: (id: string) => Schedule[];
  isScheduleVisible: (s: Schedule) => boolean;
  isCurrentlyPlaying: (s: Schedule) => boolean;
  getSchedulePosition: (s: Schedule) => { left: number; width: number };
  currentTimePosition: number;
  reminders: Set<string>;
  toggleReminder: (id: string, title: string) => void;
  handleWatchChannel: (channel?: Channel) => void;
  currentTime: Date;
  highlightChannelId?: string;
}

const DesktopEPG = ({
  channels, timeSlots, timelineRef, scrollRef, getScheduleForChannel,
  isScheduleVisible, isCurrentlyPlaying, getSchedulePosition,
  currentTimePosition, reminders, toggleReminder, handleWatchChannel, currentTime, highlightChannelId
}: DesktopEPGProps) => (
  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
    className="rounded-2xl overflow-hidden glass-card shadow-2xl">
    {/* Time Header */}
    <div className="flex border-b border-white/5 sticky top-0 z-20">
      <div className="w-48 flex-shrink-0 p-4 glass-strong border-r border-white/5">
        <span className="font-display font-semibold text-sm">Kanal</span>
      </div>
      <div ref={timelineRef} className="flex overflow-x-auto scrollbar-thin relative">
        {timeSlots.map((slot, i) => (
          <div key={i} className="w-[200px] flex-shrink-0 p-4 border-r border-white/5 last:border-r-0 glass-subtle">
            <span className="text-sm font-medium">{format(slot, 'h:mm a')}</span>
          </div>
        ))}
      </div>
    </div>

    {/* Rows */}
    <div ref={scrollRef} className="max-h-[calc(100vh-380px)] overflow-y-auto scrollbar-thin">
      {channels.length === 0 ? (
        <div className="p-12 text-center">
          <Search className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
          <h3 className="font-semibold text-lg mb-1">Kanal topilmadi</h3>
          <p className="text-muted-foreground text-sm">Qidiruv yoki filterlarni o'zgartiring</p>
        </div>
      ) : (
        channels.map((channel, index) => {
          const channelSchedules = getScheduleForChannel(channel.id).filter(isScheduleVisible);
          return (
            <motion.div key={channel.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.02 }}
              data-guide-channel-id={channel.id}
              tabIndex={-1}
              className={cn(
                "flex border-b border-white/5 last:border-b-0 group/row hover:bg-white/[0.02] transition-colors",
                channel.id === highlightChannelId && "bg-primary/10 ring-1 ring-inset ring-primary/50"
              )}>
              <button onClick={() => handleWatchChannel(channel)}
                className="w-48 flex-shrink-0 p-4 border-r border-white/5 flex items-center gap-3 hover:bg-white/[0.03] transition-colors text-left sticky left-0 glass-strong z-10">
                <div className="w-10 h-10 rounded-xl glass flex items-center justify-center overflow-hidden flex-shrink-0">
                  {channel.logo_url ? (
                    <img src={channel.logo_url} alt={channel.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="font-bold text-sm">{channel.name.charAt(0)}</span>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-sm truncate">{channel.name}</span>
                    {channel.is_live && <Radio className="w-3 h-3 text-accent animate-pulse flex-shrink-0" />}
                  </div>
                  <span className="text-[10px] text-muted-foreground px-1.5 py-0.5 glass-subtle rounded inline-block mt-0.5">{channel.category}</span>
                </div>
              </button>

              <div className="flex-1 relative h-24 min-w-[2400px] overflow-hidden">
                <div className="absolute inset-0 flex">
                  {timeSlots.map((_, i) => <div key={i} className="w-[200px] border-r border-white/[0.03] last:border-r-0" />)}
                </div>

                {currentTimePosition > 0 && currentTimePosition < 2400 && (
                  <div className="absolute top-0 bottom-0 w-0.5 bg-accent z-20" style={{ left: `${currentTimePosition}px` }}>
                    <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-accent shadow-lg shadow-accent/50" />
                  </div>
                )}

                {channelSchedules.map((schedule) => {
                  const { left, width } = getSchedulePosition(schedule);
                  const isCurrent = isCurrentlyPlaying(schedule);
                  const hasReminder = reminders.has(schedule.id);
                  const isFuture = new Date(schedule.start_time) > currentTime;

                  return (
                    <motion.div key={schedule.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                      className={cn(
                        "absolute top-2 bottom-2 rounded-xl px-3 py-2 text-left transition-all overflow-hidden group cursor-pointer",
                        isCurrent
                          ? "bg-gradient-to-r from-primary/90 to-primary/60 text-primary-foreground shadow-lg shadow-primary/20 ring-1 ring-primary/40"
                          : "glass-card hover:border-white/15"
                      )}
                      style={{ left: `${left}px`, width: `${width}px` }}
                      onClick={() => handleWatchChannel(channel)}>
                      <div className="flex items-start justify-between gap-2 h-full">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            {isCurrent && <Play className="w-3 h-3 fill-current flex-shrink-0" />}
                            <p className={cn("font-semibold text-xs truncate", isCurrent && "text-primary-foreground")}>{schedule.program_title}</p>
                          </div>
                          <p className={cn("text-[10px] truncate mt-0.5", isCurrent ? "text-primary-foreground/80" : "text-muted-foreground")}>
                            {format(new Date(schedule.start_time), 'h:mm')} - {format(new Date(schedule.end_time), 'h:mm a')}
                          </p>
                          {schedule.category && (
                            <span className={cn("inline-block mt-1 px-1.5 py-0.5 rounded text-[9px]", isCurrent ? "bg-white/20" : "glass-subtle")}>{schedule.category}</span>
                          )}
                        </div>
                        {isFuture && (
                          <Button variant="ghost" size="icon"
                            className={cn("w-6 h-6 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity", hasReminder && "opacity-100")}
                            onClick={(e) => { e.stopPropagation(); toggleReminder(schedule.id, schedule.program_title); }}>
                            {hasReminder ? <Bell className="w-3 h-3 text-primary fill-primary" /> : <BellOff className="w-3 h-3" />}
                          </Button>
                        )}
                      </div>
                    </motion.div>
                  );
                })}

                {channelSchedules.length === 0 && (
                  <div className="absolute inset-2 flex items-center justify-center text-muted-foreground text-xs">Rejalashtirgan dastur yo'q</div>
                )}
              </div>
            </motion.div>
          );
        })
      )}
    </div>
  </motion.div>
);

export default TVGuide;
