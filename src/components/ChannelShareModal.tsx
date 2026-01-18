import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Share2, Copy, Check, Code, List, 
  ExternalLink, MessageCircle, Send, Twitter,
  Facebook, Linkedin, X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface Channel {
  id: string;
  name: string;
  description?: string | null;
  logo_url?: string | null;
  stream_url?: string | null;
  youtube_video_id?: string | null;
  is_live?: boolean | null;
}

interface ChannelShareModalProps {
  channel: Channel;
  isOpen: boolean;
  onClose: () => void;
  baseUrl?: string;
}

export function ChannelShareModal({ 
  channel, 
  isOpen, 
  onClose,
  baseUrl = window.location.origin 
}: ChannelShareModalProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState<string | null>(null);

  const channelUrl = `${baseUrl}/live?channel=${channel.id}`;
  const embedUrl = `${baseUrl}/embed/${channel.id}`;

  const copyToClipboard = async (text: string, type: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
    toast({ title: 'Copied!', description: `${type} copied to clipboard` });
  };

  // Generate Embed Code
  const embedCode = `<iframe 
  src="${embedUrl}" 
  width="640" 
  height="360" 
  frameborder="0" 
  allowfullscreen
  allow="autoplay; encrypted-media"
  title="${channel.name}"
></iframe>`;

  // Generate M3U Playlist
  const m3uPlaylist = `#EXTM3U
#EXTINF:-1 tvg-id="${channel.id}" tvg-name="${channel.name}" tvg-logo="${channel.logo_url || ''}" group-title="Alsamos TV",${channel.name}
${channel.stream_url || channel.youtube_video_id ? `https://www.youtube.com/watch?v=${channel.youtube_video_id}` : channelUrl}`;

  // Social Share URLs
  const shareUrls = {
    telegram: `https://t.me/share/url?url=${encodeURIComponent(channelUrl)}&text=${encodeURIComponent(`${channel.name} - Alsamos TV da jonli efir!`)}`,
    whatsapp: `https://wa.me/?text=${encodeURIComponent(`${channel.name}\n${channelUrl}`)}`,
    twitter: `https://twitter.com/intent/tweet?url=${encodeURIComponent(channelUrl)}&text=${encodeURIComponent(`${channel.name} ni Alsamos TV da tomosha qiling!`)}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(channelUrl)}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(channelUrl)}`,
  };

  const socialButtons = [
    { key: 'telegram', icon: Send, label: 'Telegram', color: 'bg-[#0088cc]' },
    { key: 'whatsapp', icon: MessageCircle, label: 'WhatsApp', color: 'bg-[#25D366]' },
    { key: 'twitter', icon: Twitter, label: 'Twitter', color: 'bg-[#1DA1F2]' },
    { key: 'facebook', icon: Facebook, label: 'Facebook', color: 'bg-[#1877F2]' },
    { key: 'linkedin', icon: Linkedin, label: 'LinkedIn', color: 'bg-[#0A66C2]' },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-primary" />
            {channel.name} - Ulashish
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="social" className="mt-4">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="social" className="gap-1">
              <Share2 className="w-4 h-4" /> Social
            </TabsTrigger>
            <TabsTrigger value="embed" className="gap-1">
              <Code className="w-4 h-4" /> Embed
            </TabsTrigger>
            <TabsTrigger value="m3u" className="gap-1">
              <List className="w-4 h-4" /> M3U
            </TabsTrigger>
          </TabsList>

          {/* Social Share Tab */}
          <TabsContent value="social" className="space-y-4 pt-4">
            {/* Direct Link */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Kanal havolasi</label>
              <div className="flex gap-2">
                <Input value={channelUrl} readOnly className="font-mono text-sm" />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(channelUrl, 'Link')}
                >
                  {copied === 'Link' ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Social Buttons */}
            <div className="grid grid-cols-5 gap-2">
              {socialButtons.map(({ key, icon: Icon, label, color }) => (
                <motion.a
                  key={key}
                  href={shareUrls[key as keyof typeof shareUrls]}
                  target="_blank"
                  rel="noopener noreferrer"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={cn(
                    "flex flex-col items-center gap-1 p-3 rounded-xl transition-all",
                    color, "hover:opacity-90"
                  )}
                >
                  <Icon className="w-5 h-5 text-white" />
                  <span className="text-[10px] text-white font-medium">{label}</span>
                </motion.a>
              ))}
            </div>

            {/* QR Code Placeholder */}
            <div className="p-4 border border-border rounded-xl text-center bg-card">
              <div className="w-32 h-32 mx-auto bg-muted rounded-lg flex items-center justify-center mb-2">
                <span className="text-muted-foreground text-xs">QR Code</span>
              </div>
              <p className="text-xs text-muted-foreground">Telefoningiz bilan skanerlang</p>
            </div>
          </TabsContent>

          {/* Embed Code Tab */}
          <TabsContent value="embed" className="space-y-4 pt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">HTML Embed kodi</label>
              <div className="relative">
                <Textarea
                  value={embedCode}
                  readOnly
                  className="font-mono text-xs min-h-[120px] pr-12"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2"
                  onClick={() => copyToClipboard(embedCode, 'Embed code')}
                >
                  {copied === 'Embed code' ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Preview */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Ko'rinish</label>
              <div className="aspect-video bg-muted rounded-lg flex items-center justify-center border border-border">
                <div className="text-center">
                  <div className="w-12 h-12 mx-auto rounded-lg bg-primary/20 flex items-center justify-center mb-2">
                    {channel.logo_url ? (
                      <img src={channel.logo_url} alt={channel.name} className="w-full h-full object-cover rounded-lg" />
                    ) : (
                      <span className="font-bold">{channel.name.charAt(0)}</span>
                    )}
                  </div>
                  <p className="font-medium text-sm">{channel.name}</p>
                  <p className="text-xs text-muted-foreground">Embed preview</p>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <ExternalLink className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground">
                Bu kodni o'z veb-saytingizga qo'shib, {channel.name} kanalini to'g'ridan-to'g'ri ko'rsatishingiz mumkin.
              </p>
            </div>
          </TabsContent>

          {/* M3U Playlist Tab */}
          <TabsContent value="m3u" className="space-y-4 pt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">M3U Playlist</label>
              <div className="relative">
                <Textarea
                  value={m3uPlaylist}
                  readOnly
                  className="font-mono text-xs min-h-[100px] pr-12"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2"
                  onClick={() => copyToClipboard(m3uPlaylist, 'M3U playlist')}
                >
                  {copied === 'M3U playlist' ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Download Button */}
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={() => {
                const blob = new Blob([m3uPlaylist], { type: 'audio/mpegurl' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${channel.name.replace(/\s+/g, '_')}.m3u`;
                a.click();
                URL.revokeObjectURL(url);
                toast({ title: 'Downloaded!', description: 'M3U file saved' });
              }}
            >
              <List className="w-4 h-4" />
              M3U faylini yuklab olish
            </Button>

            <div className="flex items-start gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
              <List className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-muted-foreground">
                <p className="font-medium text-foreground mb-1">IPTV Playerlar uchun</p>
                <p>VLC, IPTV Smarters, TiviMate yoki boshqa IPTV playerlarida ishlaydi.</p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
