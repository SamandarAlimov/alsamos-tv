import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  User, Settings, Clock, Download, Heart, 
  Shield, Bell, Globe, Subtitles, LogOut,
  Edit2, Camera, Check, X, Lock, Plus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ContentCard from '@/components/ContentCard';

const Profile = () => {
  const { user, profile, subscription, signOut, updateProfile, loading } = useAuth();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    display_name: '',
    username: '',
    bio: ''
  });
  const [watchlist, setWatchlist] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [downloads, setDownloads] = useState<any[]>([]);
  const [pinInput, setPinInput] = useState('');
  const [showPinSetup, setShowPinSetup] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (profile) {
      setEditForm({
        display_name: profile.display_name || '',
        username: profile.username || '',
        bio: profile.bio || ''
      });
    }
  }, [profile]);

  useEffect(() => {
    if (user) {
      fetchUserData();
    }
  }, [user]);

  const fetchUserData = async () => {
    const [watchlistRes, historyRes, downloadsRes] = await Promise.all([
      supabase.from('watchlist').select('*, content(*)').eq('user_id', user!.id),
      supabase.from('viewing_history').select('*, content(*)').eq('user_id', user!.id).order('watched_at', { ascending: false }).limit(20),
      supabase.from('downloads').select('*, content(*)').eq('user_id', user!.id)
    ]);

    if (watchlistRes.data) setWatchlist(watchlistRes.data);
    if (historyRes.data) setHistory(historyRes.data);
    if (downloadsRes.data) setDownloads(downloadsRes.data);
  };

  const handleSaveProfile = async () => {
    const { error } = await updateProfile(editForm);
    if (!error) {
      setIsEditing(false);
    }
  };

  const handleSetPin = async () => {
    if (pinInput.length === 4) {
      await updateProfile({ pin_code: pinInput });
      setShowPinSetup(false);
      setPinInput('');
    }
  };

  const handleToggleParentalControls = async () => {
    await updateProfile({ parental_controls_enabled: !profile?.parental_controls_enabled });
  };

  const handleToggleAutoplay = async () => {
    await updateProfile({ autoplay_enabled: !profile?.autoplay_enabled });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || !profile) return null;

  const tierColors: Record<string, string> = {
    free: 'bg-muted',
    plus: 'bg-blue-500',
    pro: 'bg-purple-500',
    vip: 'bg-gradient-to-r from-primary to-accent',
    family: 'bg-green-500',
    creator_pro: 'bg-pink-500',
    studio_max: 'bg-gradient-to-r from-primary via-purple-500 to-accent'
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="pt-20 pb-12">
        {/* Profile Header */}
        <div className="relative h-48 bg-gradient-to-r from-primary/20 via-accent/20 to-primary/20">
          <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
        </div>

        <div className="container mx-auto px-4 -mt-20 relative z-10">
          <div className="flex flex-col items-center md:items-start md:flex-row md:items-end gap-4 md:gap-6 mb-8">
            {/* Avatar */}
            <div className="relative group">
              <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-gradient-to-br from-primary to-accent p-1">
                <div className="w-full h-full rounded-full bg-background flex items-center justify-center overflow-hidden">
                  {profile.avatar_url ? (
                    <img src={profile.avatar_url} alt={profile.display_name || ''} className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-10 h-10 md:w-16 md:h-16 text-muted-foreground" />
                  )}
                </div>
              </div>
              <button className="absolute bottom-0 right-0 w-8 h-8 md:w-10 md:h-10 rounded-full bg-primary flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="w-4 h-4 md:w-5 md:h-5" />
              </button>
            </div>

            {/* User Info */}
            <div className="flex-1 text-center md:text-left">
              {isEditing ? (
                <div className="space-y-3 max-w-md mx-auto md:mx-0">
                  <Input
                    value={editForm.display_name}
                    onChange={(e) => setEditForm({ ...editForm, display_name: e.target.value })}
                    placeholder="Display name"
                    className="bg-background/50"
                  />
                  <Input
                    value={editForm.username}
                    onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                    placeholder="Username"
                    className="bg-background/50"
                  />
                  <div className="flex gap-2 justify-center md:justify-start">
                    <Button onClick={handleSaveProfile} size="sm">
                      <Check className="w-4 h-4 mr-1" /> Save
                    </Button>
                    <Button onClick={() => setIsEditing(false)} variant="outline" size="sm">
                      <X className="w-4 h-4 mr-1" /> Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 md:gap-3">
                    <h1 className="text-2xl md:text-3xl font-display font-bold">{profile.display_name || 'User'}</h1>
                    <span className={`px-2 md:px-3 py-1 rounded-full text-xs font-medium uppercase ${tierColors[subscription?.tier || 'free']}`}>
                      {subscription?.tier || 'Free'}
                    </span>
                    <button onClick={() => setIsEditing(true)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </div>
                  {profile.username && <p className="text-muted-foreground">@{profile.username}</p>}
                  <p className="text-sm text-muted-foreground mt-1">{user.email}</p>
                </>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
              <Button onClick={() => navigate('/subscription')} variant="outline" className="w-full sm:w-auto">
                Manage Subscription
              </Button>
              <Button onClick={signOut} variant="ghost" className="text-destructive w-full sm:w-auto">
                <LogOut className="w-4 h-4 mr-2" /> Sign Out
              </Button>
            </div>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="watchlist" className="mt-8">
            <TabsList className="bg-card/50 backdrop-blur-sm w-full flex-wrap h-auto gap-1 p-1">
              <TabsTrigger value="watchlist" className="gap-1 md:gap-2 text-xs md:text-sm flex-1 sm:flex-none">
                <Heart className="w-3 h-3 md:w-4 md:h-4" /> 
                <span className="hidden xs:inline">Watchlist</span>
                <span className="xs:hidden">List</span>
              </TabsTrigger>
              <TabsTrigger value="history" className="gap-1 md:gap-2 text-xs md:text-sm flex-1 sm:flex-none">
                <Clock className="w-3 h-3 md:w-4 md:h-4" /> History
              </TabsTrigger>
              <TabsTrigger value="downloads" className="gap-1 md:gap-2 text-xs md:text-sm flex-1 sm:flex-none">
                <Download className="w-3 h-3 md:w-4 md:h-4" /> 
                <span className="hidden xs:inline">Downloads</span>
                <span className="xs:hidden">DL</span>
              </TabsTrigger>
              <TabsTrigger value="settings" className="gap-1 md:gap-2 text-xs md:text-sm flex-1 sm:flex-none">
                <Settings className="w-3 h-3 md:w-4 md:h-4" /> 
                <span className="hidden xs:inline">Settings</span>
                <span className="xs:hidden">⚙</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="watchlist" className="mt-4 md:mt-6">
              {watchlist.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4">
                  {watchlist.map((item) => (
                    <ContentCard key={item.id} content={item.content} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 md:py-16 px-4">
                  <Heart className="w-12 h-12 md:w-16 md:h-16 mx-auto text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg md:text-xl font-semibold mb-2">Your watchlist is empty</h3>
                  <p className="text-sm md:text-base text-muted-foreground mb-4">Add movies and shows to watch later</p>
                  <Button onClick={() => navigate('/')} size="sm" className="md:size-default">Browse Content</Button>
                </div>
              )}
            </TabsContent>

            <TabsContent value="history" className="mt-4 md:mt-6">
              {history.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4">
                  {history.map((item) => (
                    <ContentCard key={item.id} content={item.content} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 md:py-16 px-4">
                  <Clock className="w-12 h-12 md:w-16 md:h-16 mx-auto text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg md:text-xl font-semibold mb-2">No viewing history</h3>
                  <p className="text-sm md:text-base text-muted-foreground mb-4">Start watching to see your history here</p>
                  <Button onClick={() => navigate('/')} size="sm" className="md:size-default">Start Watching</Button>
                </div>
              )}
            </TabsContent>

            <TabsContent value="downloads" className="mt-4 md:mt-6">
              {downloads.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4">
                  {downloads.map((item) => (
                    <ContentCard key={item.id} content={item.content} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 md:py-16 px-4">
                  <Download className="w-12 h-12 md:w-16 md:h-16 mx-auto text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg md:text-xl font-semibold mb-2">No downloads</h3>
                  <p className="text-sm md:text-base text-muted-foreground mb-4">Download content to watch offline</p>
                  <Button onClick={() => navigate('/')} size="sm" className="md:size-default">Browse Content</Button>
                </div>
              )}
            </TabsContent>

            <TabsContent value="settings" className="mt-6">
              <div className="max-w-2xl space-y-6">
                {/* Parental Controls */}
                <div className="glass-card p-6 rounded-xl">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                      <Shield className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold">Parental Controls</h3>
                      <p className="text-sm text-muted-foreground">Restrict content based on rating</p>
                    </div>
                    <Switch 
                      checked={profile.parental_controls_enabled} 
                      onCheckedChange={handleToggleParentalControls} 
                    />
                  </div>
                  
                  {profile.parental_controls_enabled && (
                    <div className="mt-4 pt-4 border-t border-white/10">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">PIN Lock</span>
                        {profile.pin_code ? (
                          <span className="text-sm text-primary">PIN Set ✓</span>
                        ) : (
                          <Button size="sm" variant="outline" onClick={() => setShowPinSetup(true)}>
                            <Lock className="w-4 h-4 mr-1" /> Set PIN
                          </Button>
                        )}
                      </div>
                      
                      {showPinSetup && (
                        <div className="mt-4 flex gap-2">
                          <Input
                            type="password"
                            maxLength={4}
                            placeholder="4-digit PIN"
                            value={pinInput}
                            onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
                            className="w-32"
                          />
                          <Button onClick={handleSetPin} disabled={pinInput.length !== 4}>Save PIN</Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Playback Settings */}
                <div className="glass-card p-6 rounded-xl">
                  <h3 className="font-semibold mb-4">Playback</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Autoplay</p>
                        <p className="text-sm text-muted-foreground">Play next episode automatically</p>
                      </div>
                      <Switch 
                        checked={profile.autoplay_enabled} 
                        onCheckedChange={handleToggleAutoplay} 
                      />
                    </div>
                  </div>
                </div>

                {/* Language Settings */}
                <div className="glass-card p-6 rounded-xl">
                  <h3 className="font-semibold mb-4">Language & Subtitles</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Globe className="w-5 h-5 text-muted-foreground" />
                        <span>Display Language</span>
                      </div>
                      <span className="text-muted-foreground">{profile.language.toUpperCase()}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Subtitles className="w-5 h-5 text-muted-foreground" />
                        <span>Subtitle Language</span>
                      </div>
                      <span className="text-muted-foreground">{profile.subtitle_language.toUpperCase()}</span>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Profile;
