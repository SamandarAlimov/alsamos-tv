import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  Clock,
  Play,
  Radio,
  ChevronLeft,
  ChevronRight,
  Grid3X3,
  Tv,
  Search,
  Bell,
  BellOff,
  Filter,
  Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Navbar from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { useChannels, Channel, Schedule } from '@/hooks/useChannels';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { format, addHours, startOfHour, isWithinInterval, differenceInMinutes, addDays, subDays } from 'date-fns';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const TVGuide = () => {
  const navigate = useNavigate();
  const { channels, schedules, loading } = useChannels();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [timeOffset, setTimeOffset] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [reminders, setReminders] = useState<Set<string>>(new Set());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const scrollRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  const categories = ['All', ...new Set(channels.map(c => c.category).filter(Boolean) as string[])];

  // Update current time every minute
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  // Scroll to current time on load
  useEffect(() => {
    if (timelineRef.current && timeOffset === 0) {
      const now = new Date();
      const startOfDay = startOfHour(now);
      const minutesSinceStart = differenceInMinutes(now, startOfDay);
      const pixelsPerMinute = 200 / 60;
      const scrollPosition = Math.max(0, (minutesSinceStart * pixelsPerMinute) - 400);
      timelineRef.current.scrollLeft = scrollPosition;
    }
  }, [loading, timeOffset]);

  const baseTime = startOfHour(addHours(currentTime, timeOffset));
  const timeSlots = Array.from({ length: 12 }, (_, i) => addHours(baseTime, i));

  const getScheduleForChannel = useCallback((channelId: string) => {
    return schedules.filter(s => s.channel_id === channelId);
  }, [schedules]);

  const isCurrentlyPlaying = useCallback((schedule: Schedule) => {
    return isWithinInterval(currentTime, {
      start: new Date(schedule.start_time),
      end: new Date(schedule.end_time)
    });
  }, [currentTime]);

  const getSchedulePosition = useCallback((schedule: Schedule) => {
    const start = new Date(schedule.start_time);
    const end = new Date(schedule.end_time);
    const slotStart = baseTime;
    const slotEnd = addHours(baseTime, 12);

    const visibleStart = start < slotStart ? slotStart : start;
    const visibleEnd = end > slotEnd ? slotEnd : end;

    const leftOffset = Math.max(0, differenceInMinutes(visibleStart, slotStart));
    const duration = differenceInMinutes(visibleEnd, visibleStart);

    const pixelsPerMinute = 200 / 60;
    const left = leftOffset * pixelsPerMinute;
    const width = Math.max(80, duration * pixelsPerMinute);

    return { left, width };
  }, [baseTime]);

  const isScheduleVisible = useCallback((schedule: Schedule) => {
    const start = new Date(schedule.start_time);
    const end = new Date(schedule.end_time);
    const slotStart = baseTime;
    const slotEnd = addHours(baseTime, 12);
    return start < slotEnd && end > slotStart;
  }, [baseTime]);

  const handleWatchChannel = (channelId: string) => {
    navigate(`/live`);
  };

  const toggleReminder = (scheduleId: string, programTitle: string) => {
    setReminders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(scheduleId)) {
        newSet.delete(scheduleId);
        toast.info(`Reminder removed for "${programTitle}"`);
      } else {
        newSet.add(scheduleId);
        toast.success(`Reminder set for "${programTitle}"`, {
          description: 'We\'ll notify you when it starts'
        });
      }
      return newSet;
    });
  };

  const filteredChannels = channels.filter(channel => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const channelSchedules = getScheduleForChannel(channel.id);
      const matchesSearch = 
        channel.name.toLowerCase().includes(query) ||
        channelSchedules.some(s => s.program_title.toLowerCase().includes(query));
      if (!matchesSearch) return false;
    }
    if (selectedCategory !== 'All' && channel.category !== selectedCategory) {
      return false;
    }
    return true;
  });

  const currentTimePosition = (() => {
    const minutesSinceBase = differenceInMinutes(currentTime, baseTime);
    const pixelsPerMinute = 200 / 60;
    return minutesSinceBase * pixelsPerMinute;
  })();

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-20 container mx-auto px-4">
          <Skeleton className="h-12 w-64 mb-6" />
          <Skeleton className="h-[600px] w-full rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="pt-20 pb-12">
        <div className="container mx-auto px-4 md:px-6">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                  <Grid3X3 className="w-6 h-6 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="text-3xl font-display font-bold">TV Guide</h1>
                  <p className="text-muted-foreground">Full program schedule for all channels</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setTimeOffset(prev => prev - 6)}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setTimeOffset(0)}
                  className="gap-2"
                >
                  <Zap className="w-4 h-4" />
                  Now
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setTimeOffset(prev => prev + 6)}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
                <Link to="/live">
                  <Button variant="default" className="gap-2 ml-2">
                    <Tv className="w-4 h-4" />
                    Watch Live
                  </Button>
                </Link>
              </div>
            </div>
          </motion.div>

          {/* Search & Filters */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-6 flex flex-col sm:flex-row gap-4"
          >
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search channels or programs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-secondary border-border"
              />
            </div>
            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
              {categories.map((cat) => (
                <Button
                  key={cat}
                  variant={selectedCategory === cat ? 'default' : 'secondary'}
                  size="sm"
                  onClick={() => setSelectedCategory(cat)}
                  className="rounded-full flex-shrink-0"
                >
                  {cat}
                </Button>
              ))}
            </div>
          </motion.div>

          {/* Current Time Display */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-4 flex items-center gap-2 text-sm text-muted-foreground"
          >
            <Calendar className="w-4 h-4" />
            {format(currentTime, 'EEEE, MMMM d, yyyy')}
            <span className="mx-2">•</span>
            <Clock className="w-4 h-4" />
            {format(currentTime, 'h:mm a')}
            {reminders.size > 0 && (
              <>
                <span className="mx-2">•</span>
                <Bell className="w-4 h-4 text-primary" />
                <span className="text-primary">{reminders.size} reminder{reminders.size !== 1 ? 's' : ''}</span>
              </>
            )}
          </motion.div>

          {/* EPG Grid */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="border border-border rounded-2xl overflow-hidden bg-card shadow-xl"
          >
            {/* Time Header */}
            <div className="flex border-b border-border sticky top-0 z-20 bg-card">
              <div className="w-48 flex-shrink-0 p-4 bg-secondary border-r border-border">
                <span className="font-display font-semibold text-sm">Channel</span>
              </div>
              <div ref={timelineRef} className="flex overflow-x-auto scrollbar-thin relative">
                {timeSlots.map((slot, i) => (
                  <div
                    key={i}
                    className="w-[200px] flex-shrink-0 p-4 border-r border-border/50 last:border-r-0 bg-secondary/50"
                  >
                    <span className="text-sm font-medium">{format(slot, 'h:mm a')}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Channel Rows */}
            <div ref={scrollRef} className="max-h-[calc(100vh-380px)] overflow-y-auto scrollbar-thin">
              {filteredChannels.length === 0 ? (
                <div className="p-12 text-center">
                  <Search className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                  <h3 className="font-semibold text-lg mb-1">No channels found</h3>
                  <p className="text-muted-foreground text-sm">Try adjusting your search or filters</p>
                </div>
              ) : (
                filteredChannels.map((channel, index) => {
                  const channelSchedules = getScheduleForChannel(channel.id).filter(isScheduleVisible);

                  return (
                    <motion.div
                      key={channel.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.02 }}
                      className="flex border-b border-border last:border-b-0 group/row hover:bg-secondary/10 transition-colors"
                    >
                      {/* Channel Info */}
                      <button
                        onClick={() => handleWatchChannel(channel.id)}
                        className="w-48 flex-shrink-0 p-4 border-r border-border flex items-center gap-3 hover:bg-secondary/50 transition-colors text-left sticky left-0 bg-card z-10"
                      >
                        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                          {channel.logo_url ? (
                            <img src={channel.logo_url} alt={channel.name} className="w-full h-full object-cover" />
                          ) : (
                            <span className="font-bold text-sm">{channel.name.charAt(0)}</span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-sm truncate">{channel.name}</span>
                            {channel.is_live && (
                              <Radio className="w-3 h-3 text-accent animate-pulse flex-shrink-0" />
                            )}
                          </div>
                          <span className="text-[10px] text-muted-foreground px-1.5 py-0.5 bg-secondary rounded">
                            {channel.category}
                          </span>
                        </div>
                      </button>

                      {/* Schedule Timeline */}
                      <div className="flex-1 relative h-24 min-w-[2400px] overflow-hidden">
                        {/* Grid lines */}
                        <div className="absolute inset-0 flex">
                          {timeSlots.map((_, i) => (
                            <div key={i} className="w-[200px] border-r border-border/20 last:border-r-0" />
                          ))}
                        </div>

                        {/* Current Time Indicator */}
                        {currentTimePosition > 0 && currentTimePosition < 2400 && (
                          <div
                            className="absolute top-0 bottom-0 w-0.5 bg-accent z-20"
                            style={{ left: `${currentTimePosition}px` }}
                          >
                            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-accent" />
                          </div>
                        )}

                        {/* Programs */}
                        {channelSchedules.map((schedule) => {
                          const { left, width } = getSchedulePosition(schedule);
                          const isCurrent = isCurrentlyPlaying(schedule);
                          const hasReminder = reminders.has(schedule.id);
                          const isFuture = new Date(schedule.start_time) > currentTime;

                          return (
                            <motion.div
                              key={schedule.id}
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className={cn(
                                "absolute top-2 bottom-2 rounded-xl px-3 py-2 text-left transition-all overflow-hidden group cursor-pointer",
                                isCurrent
                                  ? "bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/20 ring-2 ring-primary/30"
                                  : "bg-secondary hover:bg-secondary/80 border border-border/50"
                              )}
                              style={{ left: `${left}px`, width: `${width}px` }}
                              onClick={() => handleWatchChannel(channel.id)}
                            >
                              <div className="flex items-start justify-between gap-2 h-full">
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5">
                                    {isCurrent && (
                                      <Play className="w-3 h-3 fill-current flex-shrink-0" />
                                    )}
                                    <p className={cn(
                                      "font-semibold text-xs truncate",
                                      isCurrent && "text-primary-foreground"
                                    )}>
                                      {schedule.program_title}
                                    </p>
                                  </div>
                                  <p className={cn(
                                    "text-[10px] truncate mt-0.5",
                                    isCurrent ? "text-primary-foreground/80" : "text-muted-foreground"
                                  )}>
                                    {format(new Date(schedule.start_time), 'h:mm')} - {format(new Date(schedule.end_time), 'h:mm a')}
                                  </p>
                                  {schedule.category && (
                                    <span className={cn(
                                      "inline-block mt-1 px-1.5 py-0.5 rounded text-[9px]",
                                      isCurrent ? "bg-primary-foreground/20" : "bg-background/50"
                                    )}>
                                      {schedule.category}
                                    </span>
                                  )}
                                </div>
                                {/* Reminder Button */}
                                {isFuture && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className={cn(
                                      "w-6 h-6 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity",
                                      hasReminder && "opacity-100"
                                    )}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleReminder(schedule.id, schedule.program_title);
                                    }}
                                  >
                                    {hasReminder ? (
                                      <Bell className="w-3 h-3 text-primary fill-primary" />
                                    ) : (
                                      <BellOff className="w-3 h-3" />
                                    )}
                                  </Button>
                                )}
                              </div>
                            </motion.div>
                          );
                        })}

                        {/* No programs placeholder */}
                        {channelSchedules.length === 0 && (
                          <div className="absolute inset-2 flex items-center justify-center text-muted-foreground text-xs">
                            No scheduled programs
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
          </motion.div>

          {/* Legend */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-6 flex flex-wrap items-center gap-6 text-sm text-muted-foreground"
          >
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-gradient-to-r from-primary to-primary/80" />
              <span>Now Playing</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-secondary border border-border/50" />
              <span>Upcoming</span>
            </div>
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-accent animate-pulse" />
              <span>Live Channel</span>
            </div>
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-primary" />
              <span>Reminder Set</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-0.5 h-4 bg-accent" />
              <span>Current Time</span>
            </div>
          </motion.div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default TVGuide;
