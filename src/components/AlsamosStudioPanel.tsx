import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Youtube, Plus, Pencil, Trash2, Save, X, 
  Radio, Eye, Globe, Share2, Code, Settings,
  Play, Check, AlertTriangle, ExternalLink, Music
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
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
import { ChannelShareModal } from './ChannelShareModal';

interface AlsamosChannel {
  id: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  stream_url: string | null;
  youtube_video_id: string | null;
  youtube_channel_id: string | null;
  stream_type: string | null;
  is_alsamos_channel: boolean | null;
  is_live: boolean | null;
  viewer_count: number | null;
  embed_allowed: boolean | null;
  share_enabled: boolean | null;
  category: string | null;
}

interface AlsamosStudioPanelProps {
  onChannelUpdate?: () => void;
}

const streamTypes = [
  { value: 'youtube_live', label: 'YouTube Live', icon: Youtube },
  { value: 'youtube_video', label: 'YouTube Video', icon: Play },
  { value: 'rtmp', label: 'RTMP Stream', icon: Radio },
  { value: 'hls', label: 'HLS Stream', icon: Globe },
  { value: 'external', label: 'External URL', icon: ExternalLink },
];

const categories = ['Music', 'Entertainment', 'News', 'Sports', 'Documentary', 'Kids', 'Movies', 'Education', 'Religious'];

export function AlsamosStudioPanel({ onChannelUpdate }: AlsamosStudioPanelProps) {
  const { toast } = useToast();
  const [channels, setChannels] = useState<AlsamosChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [channelToDelete, setChannelToDelete] = useState<AlsamosChannel | null>(null);
  const [editingChannel, setEditingChannel] = useState<AlsamosChannel | null>(null);
  const [shareChannel, setShareChannel] = useState<AlsamosChannel | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    logo_url: '',
    youtube_video_id: '',
    youtube_channel_id: '',
    stream_type: 'youtube_live',
    stream_url: '',
    category: 'Music',
    is_live: true,
    embed_allowed: true,
    share_enabled: true,
  });

  useEffect(() => {
    fetchAlsamosChannels();
    
    // Subscribe to realtime changes
    const channel = supabase
      .channel('alsamos-channels')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'channels',
        filter: 'is_alsamos_channel=eq.true'
      }, () => {
        fetchAlsamosChannels();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchAlsamosChannels = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('channels')
      .select('*')
      .eq('is_alsamos_channel', true)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setChannels(data as AlsamosChannel[]);
    }
    setLoading(false);
  };

  const extractYouTubeId = (url: string): string => {
    // Extract video ID from various YouTube URL formats
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/live\/)([^&\n?#]+)/,
      /^([a-zA-Z0-9_-]{11})$/, // Direct ID
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return url;
  };

  const handleOpenCreate = () => {
    setEditingChannel(null);
    setFormData({
      name: '',
      description: '',
      logo_url: '',
      youtube_video_id: '',
      youtube_channel_id: '',
      stream_type: 'youtube_live',
      stream_url: '',
      category: 'Music',
      is_live: true,
      embed_allowed: true,
      share_enabled: true,
    });
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (channel: AlsamosChannel) => {
    setEditingChannel(channel);
    setFormData({
      name: channel.name,
      description: channel.description || '',
      logo_url: channel.logo_url || '',
      youtube_video_id: channel.youtube_video_id || '',
      youtube_channel_id: channel.youtube_channel_id || '',
      stream_type: channel.stream_type || 'youtube_live',
      stream_url: channel.stream_url || '',
      category: channel.category || 'Music',
      is_live: channel.is_live ?? true,
      embed_allowed: channel.embed_allowed ?? true,
      share_enabled: channel.share_enabled ?? true,
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name) {
      toast({ title: 'Xato', description: 'Kanal nomi kiritilishi shart', variant: 'destructive' });
      return;
    }

    // Extract YouTube ID if URL is provided
    let youtubeVideoId = formData.youtube_video_id;
    if (youtubeVideoId) {
      youtubeVideoId = extractYouTubeId(youtubeVideoId);
    }

    setIsSaving(true);
    try {
      const channelData = {
        name: formData.name,
        description: formData.description || null,
        logo_url: formData.logo_url || null,
        youtube_video_id: youtubeVideoId || null,
        youtube_channel_id: formData.youtube_channel_id || null,
        stream_type: formData.stream_type,
        stream_url: formData.stream_url || null,
        category: formData.category,
        is_live: formData.is_live,
        embed_allowed: formData.embed_allowed,
        share_enabled: formData.share_enabled,
        is_alsamos_channel: true,
      };

      if (editingChannel) {
        const { error } = await supabase
          .from('channels')
          .update(channelData)
          .eq('id', editingChannel.id);

        if (error) throw error;
        toast({ title: 'Muvaffaqiyatli', description: 'Kanal yangilandi' });
      } else {
        const { error } = await supabase
          .from('channels')
          .insert(channelData);

        if (error) throw error;
        toast({ title: 'Muvaffaqiyatli', description: 'Yangi kanal yaratildi' });
      }

      setIsDialogOpen(false);
      fetchAlsamosChannels();
      onChannelUpdate?.();
    } catch (error: any) {
      toast({ title: 'Xato', description: error.message, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!channelToDelete) return;

    try {
      const { error } = await supabase
        .from('channels')
        .delete()
        .eq('id', channelToDelete.id);

      if (error) throw error;
      toast({ title: "O'chirildi", description: 'Kanal muvaffaqiyatli o\'chirildi' });
      setIsDeleteDialogOpen(false);
      setChannelToDelete(null);
      fetchAlsamosChannels();
      onChannelUpdate?.();
    } catch (error: any) {
      toast({ title: 'Xato', description: error.message, variant: 'destructive' });
    }
  };

  const toggleLive = async (channel: AlsamosChannel) => {
    const { error } = await supabase
      .from('channels')
      .update({ is_live: !channel.is_live })
      .eq('id', channel.id);

    if (!error) {
      toast({ 
        title: channel.is_live ? 'Efir to\'xtatildi' : 'Efirga chiqdi!',
        description: `${channel.name} ${channel.is_live ? 'offline' : 'online'}`
      });
      fetchAlsamosChannels();
    }
  };

  const formatViewers = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
    return num.toString();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <Music className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-display font-bold text-lg">Alsamos Kanallari</h2>
            <p className="text-sm text-muted-foreground">YouTube va RTMP stream boshqaruvi</p>
          </div>
        </div>
        <Button onClick={handleOpenCreate} className="gap-2">
          <Plus className="w-4 h-4" />
          Yangi Kanal
        </Button>
      </div>

      {/* Channels Grid */}
      {loading ? (
        <div className="grid md:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-40 bg-card animate-pulse rounded-xl" />
          ))}
        </div>
      ) : channels.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-border rounded-xl">
          <Youtube className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-muted-foreground">Hozircha Alsamos kanallari yo'q</p>
          <Button onClick={handleOpenCreate} variant="outline" className="mt-4 gap-2">
            <Plus className="w-4 h-4" />
            Birinchi kanalni yarating
          </Button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {channels.map((channel) => (
            <motion.div
              key={channel.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="border border-border rounded-xl overflow-hidden bg-card"
            >
              {/* Channel Header */}
              <div className="p-4 flex items-start gap-4">
                <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                  {channel.logo_url ? (
                    <img src={channel.logo_url} alt={channel.name} className="w-full h-full object-cover" />
                  ) : (
                    <Youtube className="w-8 h-8 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold truncate">{channel.name}</h3>
                    {channel.is_live && (
                      <span className="px-2 py-0.5 bg-accent/20 text-accent text-xs rounded-full font-medium flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-accent rounded-full animate-pulse" />
                        LIVE
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-1">
                    {channel.description || 'Tavsif yo\'q'}
                  </p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      {formatViewers(channel.viewer_count || 0)}
                    </span>
                    <span className="px-1.5 py-0.5 bg-secondary rounded text-[10px]">
                      {streamTypes.find(t => t.value === channel.stream_type)?.label || 'RTMP'}
                    </span>
                    <span className="px-1.5 py-0.5 bg-secondary rounded text-[10px]">
                      {channel.category}
                    </span>
                  </div>
                </div>
              </div>

              {/* YouTube Preview */}
              {channel.youtube_video_id && (
                <div className="px-4 pb-2">
                  <div className="aspect-video rounded-lg overflow-hidden bg-black">
                    <iframe
                      src={`https://www.youtube.com/embed/${channel.youtube_video_id}?autoplay=0&mute=1`}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope"
                      allowFullScreen
                    />
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="p-4 pt-2 flex items-center justify-between border-t border-border mt-2">
                <div className="flex items-center gap-2">
                  <Button
                    variant={channel.is_live ? 'destructive' : 'default'}
                    size="sm"
                    onClick={() => toggleLive(channel)}
                    className="gap-1"
                  >
                    {channel.is_live ? (
                      <>
                        <X className="w-3 h-3" /> Stop
                      </>
                    ) : (
                      <>
                        <Play className="w-3 h-3" /> Go Live
                      </>
                    )}
                  </Button>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setShareChannel(channel)}
                    disabled={!channel.share_enabled}
                  >
                    <Share2 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleOpenEdit(channel)}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => {
                      setChannelToDelete(channel);
                      setIsDeleteDialogOpen(true);
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editingChannel ? <Pencil className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
              {editingChannel ? 'Kanalni tahrirlash' : 'Yangi Alsamos kanali'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Name */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Kanal nomi *</label>
              <Input
                placeholder="masalan: Alsamos Music"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Tavsif</label>
              <Textarea
                placeholder="Kanal haqida qisqacha ma'lumot"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={2}
              />
            </div>

            {/* Stream Type */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Stream turi</label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {streamTypes.map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, stream_type: value }))}
                    className={cn(
                      "flex items-center gap-2 p-3 rounded-lg border transition-all text-left",
                      formData.stream_type === value
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-sm">{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* YouTube Video ID */}
            {(formData.stream_type === 'youtube_live' || formData.stream_type === 'youtube_video') && (
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  YouTube {formData.stream_type === 'youtube_live' ? 'Live Stream' : 'Video'} URL yoki ID
                </label>
                <Input
                  placeholder="https://youtube.com/watch?v=... yoki video ID"
                  value={formData.youtube_video_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, youtube_video_id: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">
                  YouTube URL yoki 11 belgili video ID kiriting
                </p>
              </div>
            )}

            {/* YouTube Channel ID (for live streams) */}
            {formData.stream_type === 'youtube_live' && (
              <div className="space-y-2">
                <label className="text-sm font-medium">YouTube Channel ID (ixtiyoriy)</label>
                <Input
                  placeholder="UC..."
                  value={formData.youtube_channel_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, youtube_channel_id: e.target.value }))}
                />
              </div>
            )}

            {/* Stream URL (for RTMP/HLS) */}
            {(formData.stream_type === 'rtmp' || formData.stream_type === 'hls' || formData.stream_type === 'external') && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Stream URL</label>
                <Input
                  placeholder={formData.stream_type === 'rtmp' ? 'rtmp://...' : 'https://...'}
                  value={formData.stream_url}
                  onChange={(e) => setFormData(prev => ({ ...prev, stream_url: e.target.value }))}
                />
              </div>
            )}

            {/* Logo URL */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Logo URL</label>
              <Input
                placeholder="https://example.com/logo.png"
                value={formData.logo_url}
                onChange={(e) => setFormData(prev => ({ ...prev, logo_url: e.target.value }))}
              />
            </div>

            {/* Category */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Kategoriya</label>
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

            {/* Toggles */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Jonli efir</p>
                  <p className="text-xs text-muted-foreground">Kanal hozir efirda</p>
                </div>
                <Switch
                  checked={formData.is_live}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_live: checked }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Embed ruxsati</p>
                  <p className="text-xs text-muted-foreground">Boshqa saytlarga joylash mumkin</p>
                </div>
                <Switch
                  checked={formData.embed_allowed}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, embed_allowed: checked }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Ulashish</p>
                  <p className="text-xs text-muted-foreground">Ijtimoiy tarmoqlarga ulashish</p>
                </div>
                <Switch
                  checked={formData.share_enabled}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, share_enabled: checked }))}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Bekor qilish
            </Button>
            <Button onClick={handleSave} disabled={isSaving} className="gap-2">
              {isSaving ? (
                <>Saqlanmoqda...</>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  {editingChannel ? 'Yangilash' : 'Yaratish'}
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
              Kanalni o'chirish
            </AlertDialogTitle>
            <AlertDialogDescription>
              "{channelToDelete?.name}" kanalini o'chirishni xohlaysizmi? Bu amalni ortga qaytarib bo'lmaydi.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Bekor qilish</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              O'chirish
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Share Modal */}
      {shareChannel && (
        <ChannelShareModal
          channel={shareChannel}
          isOpen={!!shareChannel}
          onClose={() => setShareChannel(null)}
        />
      )}
    </div>
  );
}
