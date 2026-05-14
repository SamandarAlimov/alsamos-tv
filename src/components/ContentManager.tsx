import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Edit2, Trash2, Save, X, Film, Search,
  Image, Link2, Calendar, Clock, Tag, Users as UsersIcon, Star
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface ContentRow {
  id: string;
  title: string;
  description: string | null;
  type: string;
  thumbnail_url: string | null;
  backdrop_url: string | null;
  video_url: string | null;
  trailer_url: string | null;
  release_year: number | null;
  rating: string | null;
  duration_seconds: number | null;
  genres: string[] | null;
  director: string | null;
  cast_members: string[] | null;
  is_original: boolean | null;
  is_trending: boolean | null;
  view_count: number | null;
  created_at: string;
}

const emptyForm = {
  title: '',
  description: '',
  type: 'movie' as string,
  thumbnail_url: '',
  backdrop_url: '',
  video_url: '',
  trailer_url: '',
  release_year: new Date().getFullYear(),
  rating: 'PG',
  duration_seconds: 0,
  genres: '' as string,
  director: '',
  cast_members: '' as string,
  is_original: false,
  is_trending: false,
};

export function ContentManager() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [contents, setContents] = useState<ContentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [searchQuery, setSearchQuery] = useState('');
  const [saving, setSaving] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    fetchContent();
    checkAdmin();
  }, [user]);

  const checkAdmin = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();
    setIsAdmin(!!data);
  };

  const fetchContent = async () => {
    const { data, error } = await supabase
      .from('content')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setContents(data as ContentRow[]);
    if (error) console.error('Error:', error);
    setLoading(false);
  };

  const handleEdit = (content: ContentRow) => {
    setEditingId(content.id);
    setForm({
      title: content.title,
      description: content.description || '',
      type: content.type,
      thumbnail_url: content.thumbnail_url || '',
      backdrop_url: content.backdrop_url || '',
      video_url: content.video_url || '',
      trailer_url: content.trailer_url || '',
      release_year: content.release_year || new Date().getFullYear(),
      rating: content.rating || 'PG',
      duration_seconds: content.duration_seconds || 0,
      genres: (content.genres || []).join(', '),
      director: content.director || '',
      cast_members: (content.cast_members || []).join(', '),
      is_original: content.is_original || false,
      is_trending: content.is_trending || false,
    });
    setShowForm(true);
  };

  const handleNew = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast({ title: 'Xatolik', description: 'Sarlavha kiritilishi shart', variant: 'destructive' });
      return;
    }

    setSaving(true);
    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      type: form.type as any,
      thumbnail_url: form.thumbnail_url.trim() || null,
      backdrop_url: form.backdrop_url.trim() || null,
      video_url: form.video_url.trim() || null,
      trailer_url: form.trailer_url.trim() || null,
      release_year: form.release_year,
      rating: form.rating,
      duration_seconds: form.duration_seconds || null,
      genres: form.genres ? form.genres.split(',').map(g => g.trim()).filter(Boolean) : null,
      director: form.director.trim() || null,
      cast_members: form.cast_members ? form.cast_members.split(',').map(c => c.trim()).filter(Boolean) : null,
      is_original: form.is_original,
      is_trending: form.is_trending,
    };

    let error;
    if (editingId) {
      ({ error } = await supabase.from('content').update(payload).eq('id', editingId));
    } else {
      ({ error } = await supabase.from('content').insert({ ...payload, creator_id: user?.id }));
    }

    if (error) {
      toast({ title: 'Xatolik', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: editingId ? 'Yangilandi!' : 'Qo\'shildi!' });
      setShowForm(false);
      fetchContent();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('content').delete().eq('id', id);
    if (!error) {
      setContents(prev => prev.filter(c => c.id !== id));
      toast({ title: 'O\'chirildi!' });
    } else {
      toast({ title: 'Xatolik', description: error.message, variant: 'destructive' });
    }
  };

  const filtered = contents.filter(c =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDuration = (s: number | null) => {
    if (!s) return '-';
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  if (!isAdmin) {
    return (
      <div className="text-center py-16 px-4">
        <Film className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
        <h3 className="text-xl font-semibold mb-2">Admin ruxsati kerak</h3>
        <p className="text-muted-foreground">Kontent boshqarish faqat adminlar uchun mavjud</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-display font-bold">Kontent Boshqarish</h2>
          <p className="text-sm text-muted-foreground">{contents.length} ta kontent</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Qidirish..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-secondary"
            />
          </div>
          <Button onClick={handleNew} className="gap-2 w-full sm:w-auto">
            <Plus className="w-4 h-4" /> Yangi Kontent
          </Button>
        </div>
      </div>

      {/* Form Modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="glass-card p-4 sm:p-6 rounded-xl border border-border"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-semibold text-lg">
                {editingId ? 'Kontentni Tahrirlash' : 'Yangi Kontent Qo\'shish'}
              </h3>
              <Button variant="ghost" size="icon" onClick={() => setShowForm(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Sarlavha *</label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Kino nomi"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Tur</label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="movie">Kino</SelectItem>
                    <SelectItem value="series">Serial</SelectItem>
                    <SelectItem value="short">Qisqa</SelectItem>
                    <SelectItem value="documentary">Hujjatli</SelectItem>
                    <SelectItem value="live">Jonli</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-2 space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Tavsif</label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Kino haqida qisqacha..."
                  className="min-h-[80px]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <Image className="w-3 h-3" /> Thumbnail URL
                </label>
                <Input
                  value={form.thumbnail_url}
                  onChange={(e) => setForm({ ...form, thumbnail_url: e.target.value })}
                  placeholder="https://..."
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <Image className="w-3 h-3" /> Backdrop URL
                </label>
                <Input
                  value={form.backdrop_url}
                  onChange={(e) => setForm({ ...form, backdrop_url: e.target.value })}
                  placeholder="https://..."
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <Link2 className="w-3 h-3" /> Video URL
                </label>
                <Input
                  value={form.video_url}
                  onChange={(e) => setForm({ ...form, video_url: e.target.value })}
                  placeholder="YouTube yoki direct URL"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <Link2 className="w-3 h-3" /> Trailer URL
                </label>
                <Input
                  value={form.trailer_url}
                  onChange={(e) => setForm({ ...form, trailer_url: e.target.value })}
                  placeholder="Trailer video URL"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> Yil
                </label>
                <Input
                  type="number"
                  value={form.release_year}
                  onChange={(e) => setForm({ ...form, release_year: parseInt(e.target.value) || 2024 })}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Reyting</label>
                <Select value={form.rating} onValueChange={(v) => setForm({ ...form, rating: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="G">G</SelectItem>
                    <SelectItem value="PG">PG</SelectItem>
                    <SelectItem value="PG-13">PG-13</SelectItem>
                    <SelectItem value="R">R</SelectItem>
                    <SelectItem value="NR">NR</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Davomiylik (soniya)
                </label>
                <Input
                  type="number"
                  value={form.duration_seconds}
                  onChange={(e) => setForm({ ...form, duration_seconds: parseInt(e.target.value) || 0 })}
                  placeholder="7200 = 2 soat"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <Tag className="w-3 h-3" /> Janrlar (vergul bilan)
                </label>
                <Input
                  value={form.genres}
                  onChange={(e) => setForm({ ...form, genres: e.target.value })}
                  placeholder="Drama, Action, Comedy"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Rejissyor</label>
                <Input
                  value={form.director}
                  onChange={(e) => setForm({ ...form, director: e.target.value })}
                  placeholder="Rejissyor ismi"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <UsersIcon className="w-3 h-3" /> Aktyorlar (vergul bilan)
                </label>
                <Input
                  value={form.cast_members}
                  onChange={(e) => setForm({ ...form, cast_members: e.target.value })}
                  placeholder="Aktyor 1, Aktyor 2"
                />
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 md:col-span-2 pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Switch checked={form.is_original} onCheckedChange={(v) => setForm({ ...form, is_original: v })} />
                  <span className="text-sm">Alsamos Original</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Switch checked={form.is_trending} onCheckedChange={(v) => setForm({ ...form, is_trending: v })} />
                  <span className="text-sm">Trending</span>
                </label>
              </div>
            </div>

            {/* Thumbnail Preview */}
            {form.thumbnail_url && (
              <div className="mt-4">
                <label className="text-xs font-medium text-muted-foreground mb-2 block">Preview</label>
                <img src={form.thumbnail_url} alt="Preview" className="w-full max-w-xs h-auto rounded-lg object-cover" />
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2 mt-6">
              <Button onClick={handleSave} disabled={saving} className="gap-2 w-full sm:w-auto">
                <Save className="w-4 h-4" /> {saving ? 'Saqlanmoqda...' : 'Saqlash'}
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)} className="w-full sm:w-auto">
                Bekor qilish
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Film className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-semibold mb-2">Kontent topilmadi</h3>
          <p className="text-muted-foreground text-sm">Yangi kontent qo'shish uchun "Yangi Kontent" tugmasini bosing</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((content) => (
            <motion.div
              key={content.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card p-3 sm:p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4"
            >
              <div className="w-full sm:w-28 h-40 sm:h-16 bg-muted rounded-lg overflow-hidden flex-shrink-0">
                {content.thumbnail_url ? (
                  <img src={content.thumbnail_url} alt={content.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Film className="w-6 h-6 text-muted-foreground" />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-medium text-sm truncate">{content.title}</h4>
                  <Badge variant="outline" className="text-[10px]">{content.type}</Badge>
                  {content.is_original && <Badge className="text-[10px] bg-primary/20 text-primary">Original</Badge>}
                  {content.is_trending && <Badge className="text-[10px] bg-accent/20 text-accent">Trending</Badge>}
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                  <span>{content.release_year}</span>
                  <span>{formatDuration(content.duration_seconds)}</span>
                  <span>{content.rating}</span>
                  {content.view_count ? <span>{content.view_count} ko'rishlar</span> : null}
                </div>
              </div>

              <div className="flex gap-2 w-full sm:w-auto">
                <Button size="sm" variant="outline" onClick={() => handleEdit(content)} className="flex-1 sm:flex-none gap-1">
                  <Edit2 className="w-3 h-3" /> <span className="sm:hidden">Tahrirlash</span>
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleDelete(content.id)} className="flex-1 sm:flex-none gap-1 text-destructive hover:text-destructive">
                  <Trash2 className="w-3 h-3" /> <span className="sm:hidden">O'chirish</span>
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
