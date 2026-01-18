import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Clock, Plus, Pencil, Trash2, Save, X, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Channel, Schedule } from '@/hooks/useChannels';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface EPGManagerProps {
  channels: Channel[];
  schedules: Schedule[];
  onUpdate: () => void;
}

const categories = ['Entertainment', 'News', 'Sports', 'Movies', 'Kids', 'Music', 'Documentary', 'Education', 'Talk Show', 'Religious', 'Concert', 'Action', 'Animation', 'Business', 'Football'];

export function EPGManager({ channels, schedules, onUpdate }: EPGManagerProps) {
  const { toast } = useToast();
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [scheduleToDelete, setScheduleToDelete] = useState<Schedule | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    program_title: '',
    program_description: '',
    start_time: '',
    end_time: '',
    category: 'Entertainment',
    is_live: false
  });

  const getChannelSchedules = (channelId: string) => {
    return schedules
      .filter(s => s.channel_id === channelId)
      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
  };

  const handleOpenCreate = (channel: Channel) => {
    setSelectedChannel(channel);
    setEditingSchedule(null);
    const now = new Date();
    const startTime = new Date(now.setMinutes(0, 0, 0));
    const endTime = new Date(startTime.getTime() + 2 * 60 * 60 * 1000);
    
    setFormData({
      program_title: '',
      program_description: '',
      start_time: format(startTime, "yyyy-MM-dd'T'HH:mm"),
      end_time: format(endTime, "yyyy-MM-dd'T'HH:mm"),
      category: 'Entertainment',
      is_live: false
    });
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (schedule: Schedule, channel: Channel) => {
    setSelectedChannel(channel);
    setEditingSchedule(schedule);
    setFormData({
      program_title: schedule.program_title,
      program_description: schedule.program_description || '',
      start_time: format(new Date(schedule.start_time), "yyyy-MM-dd'T'HH:mm"),
      end_time: format(new Date(schedule.end_time), "yyyy-MM-dd'T'HH:mm"),
      category: schedule.category || 'Entertainment',
      is_live: schedule.is_live
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!selectedChannel || !formData.program_title || !formData.start_time || !formData.end_time) {
      toast({ title: 'Error', description: 'Please fill in all required fields', variant: 'destructive' });
      return;
    }

    const startTime = new Date(formData.start_time);
    const endTime = new Date(formData.end_time);

    if (endTime <= startTime) {
      toast({ title: 'Error', description: 'End time must be after start time', variant: 'destructive' });
      return;
    }

    setIsSaving(true);
    try {
      if (editingSchedule) {
        // Update existing schedule
        const { error } = await supabase
          .from('channel_schedules')
          .update({
            program_title: formData.program_title,
            program_description: formData.program_description || null,
            start_time: startTime.toISOString(),
            end_time: endTime.toISOString(),
            category: formData.category,
            is_live: formData.is_live
          })
          .eq('id', editingSchedule.id);

        if (error) throw error;
        toast({ title: 'Schedule Updated', description: 'Program schedule has been updated' });
      } else {
        // Create new schedule
        const { error } = await supabase
          .from('channel_schedules')
          .insert({
            channel_id: selectedChannel.id,
            program_title: formData.program_title,
            program_description: formData.program_description || null,
            start_time: startTime.toISOString(),
            end_time: endTime.toISOString(),
            category: formData.category,
            is_live: formData.is_live
          });

        if (error) throw error;
        toast({ title: 'Schedule Created', description: 'New program has been scheduled' });
      }

      setIsDialogOpen(false);
      onUpdate();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!scheduleToDelete) return;

    try {
      const { error } = await supabase
        .from('channel_schedules')
        .delete()
        .eq('id', scheduleToDelete.id);

      if (error) throw error;
      toast({ title: 'Deleted', description: 'Program schedule has been removed' });
      setIsDeleteDialogOpen(false);
      setScheduleToDelete(null);
      onUpdate();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const confirmDelete = (schedule: Schedule) => {
    setScheduleToDelete(schedule);
    setIsDeleteDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display font-semibold text-lg flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary" />
          EPG Schedule Manager
        </h3>
      </div>

      <div className="space-y-4 max-h-[500px] overflow-y-auto scrollbar-thin pr-2">
        {channels.map((channel) => {
          const channelSchedules = getChannelSchedules(channel.id);
          
          return (
            <motion.div
              key={channel.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="border border-border rounded-lg overflow-hidden"
            >
              {/* Channel Header */}
              <div className="flex items-center justify-between p-3 bg-secondary/50">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
                    {channel.logo_url ? (
                      <img src={channel.logo_url} alt={channel.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="font-bold text-xs">{channel.name.charAt(0)}</span>
                    )}
                  </div>
                  <div>
                    <span className="font-semibold text-sm">{channel.name}</span>
                    <span className="text-xs text-muted-foreground ml-2">
                      ({channelSchedules.length} programs)
                    </span>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleOpenCreate(channel)}
                  className="gap-1"
                >
                  <Plus className="w-3 h-3" />
                  Add
                </Button>
              </div>

              {/* Schedule List */}
              <div className="divide-y divide-border">
                {channelSchedules.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground text-sm">
                    No programs scheduled
                  </div>
                ) : (
                  channelSchedules.slice(0, 5).map((schedule) => {
                    const isPast = new Date(schedule.end_time) < new Date();
                    
                    return (
                      <div
                        key={schedule.id}
                        className={cn(
                          "p-3 flex items-center justify-between gap-3",
                          isPast && "opacity-50"
                        )}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm truncate">
                              {schedule.program_title}
                            </span>
                            {schedule.category && (
                              <span className="px-1.5 py-0.5 bg-secondary text-[10px] rounded">
                                {schedule.category}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                            <Clock className="w-3 h-3" />
                            {format(new Date(schedule.start_time), 'MMM d, h:mm a')} - 
                            {format(new Date(schedule.end_time), 'h:mm a')}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => handleOpenEdit(schedule, channel)}
                          >
                            <Pencil className="w-3 h-3" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => confirmDelete(schedule)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    );
                  })
                )}
                {channelSchedules.length > 5 && (
                  <div className="p-2 text-center text-xs text-muted-foreground">
                    +{channelSchedules.length - 5} more programs
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingSchedule ? 'Edit Program' : 'Add Program'} - {selectedChannel?.name}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Program Title *</label>
              <Input
                placeholder="e.g., Morning News"
                value={formData.program_title}
                onChange={(e) => setFormData(prev => ({ ...prev, program_title: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Textarea
                placeholder="Brief description of the program"
                value={formData.program_description}
                onChange={(e) => setFormData(prev => ({ ...prev, program_description: e.target.value }))}
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Start Time *</label>
                <Input
                  type="datetime-local"
                  value={formData.start_time}
                  onChange={(e) => setFormData(prev => ({ ...prev, start_time: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">End Time *</label>
                <Input
                  type="datetime-local"
                  value={formData.end_time}
                  onChange={(e) => setFormData(prev => ({ ...prev, end_time: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                className="w-full p-2 rounded-lg bg-background border border-border text-sm"
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving} className="gap-2">
              {isSaving ? (
                <>Saving...</>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  {editingSchedule ? 'Update' : 'Create'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Delete Program
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{scheduleToDelete?.program_title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
