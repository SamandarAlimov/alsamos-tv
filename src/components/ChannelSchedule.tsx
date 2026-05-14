import { motion } from 'framer-motion';
import { Clock, Play } from 'lucide-react';
import { Schedule } from '@/hooks/useChannels';
import { format, isWithinInterval } from 'date-fns';
import { cn } from '@/lib/utils';

interface ChannelScheduleProps {
  schedules: Schedule[];
  channelName: string;
}

export function ChannelSchedule({ schedules, channelName }: ChannelScheduleProps) {
  const now = new Date();

  const isCurrentlyPlaying = (schedule: Schedule) => {
    return isWithinInterval(now, {
      start: new Date(schedule.start_time),
      end: new Date(schedule.end_time)
    });
  };

  const getProgress = (schedule: Schedule) => {
    const start = new Date(schedule.start_time).getTime();
    const end = new Date(schedule.end_time).getTime();
    const current = now.getTime();
    return Math.min(100, Math.max(0, ((current - start) / (end - start)) * 100));
  };

  if (schedules.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p>No scheduled programs</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h4 className="font-display font-semibold text-sm text-muted-foreground mb-3">
        Schedule for {channelName}
      </h4>
      
      {schedules.map((schedule, index) => {
        const isCurrent = isCurrentlyPlaying(schedule);
        const progress = isCurrent ? getProgress(schedule) : 0;

        return (
          <motion.div
            key={schedule.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className={cn(
              "relative p-3 rounded-lg border transition-colors",
              isCurrent 
                ? "bg-primary/10 border-primary/30" 
                : "bg-secondary/50 border-border hover:bg-secondary"
            )}
          >
            {/* Progress bar for current program */}
            {isCurrent && (
              <div className="absolute bottom-0 left-0 h-0.5 bg-primary rounded-full transition-all" 
                   style={{ width: `${progress}%` }} />
            )}

            <div className="flex items-start gap-3">
              {/* Time */}
              <div className="flex-shrink-0 text-right w-16">
                <p className={cn(
                  "text-xs font-medium",
                  isCurrent ? "text-primary" : "text-muted-foreground"
                )}>
                  {format(new Date(schedule.start_time), 'h:mm a')}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {format(new Date(schedule.end_time), 'h:mm a')}
                </p>
              </div>

              {/* Indicator */}
              <div className="flex-shrink-0 mt-1">
                {isCurrent ? (
                  <div className="w-3 h-3 rounded-full bg-primary flex items-center justify-center">
                    <Play className="w-1.5 h-1.5 fill-primary-foreground text-primary-foreground" />
                  </div>
                ) : (
                  <div className="w-3 h-3 rounded-full border-2 border-muted-foreground/30" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h5 className={cn(
                    "font-medium text-sm truncate",
                    isCurrent && "text-primary"
                  )}>
                    {schedule.program_title}
                  </h5>
                  {isCurrent && (
                    <span className="flex-shrink-0 px-1.5 py-0.5 bg-primary text-primary-foreground text-[10px] font-bold rounded">
                      NOW
                    </span>
                  )}
                </div>
                {schedule.program_description && (
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {schedule.program_description}
                  </p>
                )}
                {schedule.category && (
                  <span className="inline-block mt-1 px-1.5 py-0.5 bg-secondary text-[10px] text-muted-foreground rounded">
                    {schedule.category}
                  </span>
                )}
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
