import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import type { ContentItem } from '@/hooks/useContent';
import type { Channel } from '@/hooks/useChannels';

type SavedContentEntry = {
  item: ContentItem;
  savedAt: string;
};

type SavedChannelEntry = {
  channel: Channel;
  savedAt: string;
};

type LocalLibrary = {
  content: Record<string, SavedContentEntry>;
  channels: Record<string, SavedChannelEntry>;
};

type UserLibraryContextValue = {
  dbContentIds: Set<string>;
  savedContents: ContentItem[];
  savedChannels: Channel[];
  isContentSaved: (contentOrId: ContentItem | string | null | undefined) => boolean;
  isChannelSaved: (channelOrId: Channel | string | null | undefined) => boolean;
  toggleContent: (content: ContentItem) => Promise<void>;
  toggleChannel: (channel: Channel) => void;
};

const EMPTY_LIBRARY: LocalLibrary = { content: {}, channels: {} };
const UserLibraryContext = createContext<UserLibraryContextValue | null>(null);

function isUuid(value: string | undefined) {
  return !!value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function libraryKey(userId: string) {
  return `alsamos:user-library:${userId}`;
}

function readLocalLibrary(userId: string): LocalLibrary {
  try {
    const raw = localStorage.getItem(libraryKey(userId));
    if (!raw) return EMPTY_LIBRARY;
    const parsed = JSON.parse(raw);
    return {
      content: parsed?.content && typeof parsed.content === 'object' ? parsed.content : {},
      channels: parsed?.channels && typeof parsed.channels === 'object' ? parsed.channels : {},
    };
  } catch {
    return EMPTY_LIBRARY;
  }
}

function writeLocalLibrary(userId: string, library: LocalLibrary) {
  localStorage.setItem(libraryKey(userId), JSON.stringify(library));
}

function getContentId(contentOrId: ContentItem | string | null | undefined) {
  if (!contentOrId) return null;
  return typeof contentOrId === 'string' ? contentOrId : contentOrId.id;
}

function getChannelId(channelOrId: Channel | string | null | undefined) {
  if (!channelOrId) return null;
  return typeof channelOrId === 'string' ? channelOrId : channelOrId.id;
}

export function UserLibraryProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [dbContentIds, setDbContentIds] = useState<Set<string>>(new Set());
  const [localLibrary, setLocalLibrary] = useState<LocalLibrary>(EMPTY_LIBRARY);

  useEffect(() => {
    if (!user) {
      setDbContentIds(new Set());
      setLocalLibrary(EMPTY_LIBRARY);
      return;
    }

    setLocalLibrary(readLocalLibrary(user.id));

    let cancelled = false;
    supabase
      .from('watchlist')
      .select('content_id')
      .eq('user_id', user.id)
      .then(({ data }) => {
        if (!cancelled) setDbContentIds(new Set((data || []).map((item) => item.content_id)));
      });

    return () => {
      cancelled = true;
    };
  }, [user]);

  const persistLocalLibrary = useCallback((updater: (current: LocalLibrary) => LocalLibrary) => {
    if (!user) return EMPTY_LIBRARY;
    const next = updater(readLocalLibrary(user.id));
    writeLocalLibrary(user.id, next);
    setLocalLibrary(next);
    return next;
  }, [user]);

  const requireAuth = useCallback(() => {
    if (user) return true;
    toast.error('Avval profilingizga kiring', {
      description: 'Kinolar va kanallarni saqlash uchun auth kerak.',
    });
    return false;
  }, [user]);

  const isContentSaved = useCallback((contentOrId: ContentItem | string | null | undefined) => {
    const id = getContentId(contentOrId);
    if (!id) return false;
    return dbContentIds.has(id) || !!localLibrary.content[id];
  }, [dbContentIds, localLibrary.content]);

  const isChannelSaved = useCallback((channelOrId: Channel | string | null | undefined) => {
    const id = getChannelId(channelOrId);
    return !!id && !!localLibrary.channels[id];
  }, [localLibrary.channels]);

  const toggleContent = useCallback(async (content: ContentItem) => {
    if (!requireAuth() || !user) return;

    const saved = isContentSaved(content);
    if (isUuid(content.id)) {
      if (saved) {
        await supabase.from('watchlist').delete().eq('user_id', user.id).eq('content_id', content.id);
        setDbContentIds((current) => {
          const next = new Set(current);
          next.delete(content.id);
          return next;
        });
        toast.success('My Listdan olib tashlandi');
        return;
      }

      await supabase.from('watchlist').upsert(
        { user_id: user.id, content_id: content.id },
        { onConflict: 'user_id,content_id' }
      );
      setDbContentIds((current) => new Set(current).add(content.id));
      toast.success('My Listga qo‘shildi');
      return;
    }

    persistLocalLibrary((current) => {
      const next: LocalLibrary = {
        content: { ...current.content },
        channels: { ...current.channels },
      };

      if (saved) delete next.content[content.id];
      else next.content[content.id] = { item: content, savedAt: new Date().toISOString() };
      return next;
    });

    toast.success(saved ? 'My Listdan olib tashlandi' : 'My Listga qo‘shildi');
  }, [isContentSaved, persistLocalLibrary, requireAuth, user]);

  const toggleChannel = useCallback((channel: Channel) => {
    if (!requireAuth() || !user) return;
    const saved = isChannelSaved(channel);

    persistLocalLibrary((current) => {
      const next: LocalLibrary = {
        content: { ...current.content },
        channels: { ...current.channels },
      };

      if (saved) delete next.channels[channel.id];
      else next.channels[channel.id] = { channel, savedAt: new Date().toISOString() };
      return next;
    });

    toast.success(saved ? 'Kanal playlistdan olib tashlandi' : 'Kanal playlistga qo‘shildi');
  }, [isChannelSaved, persistLocalLibrary, requireAuth, user]);

  const value = useMemo<UserLibraryContextValue>(() => ({
    dbContentIds,
    savedContents: Object.values(localLibrary.content).map((entry) => entry.item).filter(Boolean),
    savedChannels: Object.values(localLibrary.channels).map((entry) => entry.channel).filter(Boolean),
    isContentSaved,
    isChannelSaved,
    toggleContent,
    toggleChannel,
  }), [dbContentIds, isChannelSaved, isContentSaved, localLibrary.channels, localLibrary.content, toggleChannel, toggleContent]);

  return (
    <UserLibraryContext.Provider value={value}>
      {children}
    </UserLibraryContext.Provider>
  );
}

export function useUserLibrary() {
  const context = useContext(UserLibraryContext);
  if (!context) throw new Error('useUserLibrary must be used inside UserLibraryProvider');
  return context;
}
