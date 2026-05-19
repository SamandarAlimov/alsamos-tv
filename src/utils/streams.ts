export type StreamHealth = 'ready' | 'mixed-content' | 'unsupported' | 'unknown';

export function getPreferredStreamUrl(url: string | null | undefined) {
  if (!url) return url || null;

  try {
    const parsed = new URL(url);
    if (
      typeof window !== 'undefined' &&
      window.location.protocol === 'https:' &&
      parsed.protocol === 'http:'
    ) {
      parsed.protocol = 'https:';
      return parsed.toString();
    }
  } catch {
    return url;
  }

  return url;
}

export function getStreamHealth(url: string | null | undefined, streamType?: string | null): StreamHealth {
  if (!url) return 'unknown';

  let parsed: URL;
  try {
    parsed = new URL(getPreferredStreamUrl(url) || url);
  } catch {
    return 'unsupported';
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) return 'unsupported';

  if (
    typeof window !== 'undefined' &&
    window.location.protocol === 'https:' &&
    parsed.protocol === 'http:'
  ) {
    return 'mixed-content';
  }

  const path = parsed.pathname.toLowerCase();
  const type = (streamType || '').toLowerCase();

  if (type === 'hls' || path.endsWith('.m3u8')) return 'ready';
  if (['.mp4', '.m4v', '.webm', '.ogg', '.mov'].some((ext) => path.endsWith(ext))) return 'ready';
  if (path.endsWith('.ts') || type === 'mpegts') return 'unknown';

  return 'unknown';
}
