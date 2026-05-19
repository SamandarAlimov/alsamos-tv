export type StreamHealth = 'ready' | 'mixed-content' | 'unsupported' | 'unknown';

const STREAM_PROXIES = [
  (url: string) => `https://corsproxy.io/?url=${encodeURIComponent(url)}`,
  (url: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
];

function unique(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.filter(Boolean) as string[]));
}

export function isMixedContentUrl(url: string | null | undefined) {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return typeof window !== 'undefined' && window.location.protocol === 'https:' && parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

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

export function getStreamCandidates(url: string | null | undefined) {
  if (!url) return [];

  let upgraded: string | null = null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'http:') {
      parsed.protocol = 'https:';
      upgraded = parsed.toString();
    }
  } catch {
    return [url];
  }

  const preferred = getPreferredStreamUrl(url);
  const proxyTargets = unique([url, upgraded]);

  return unique([
    preferred,
    upgraded,
    isMixedContentUrl(url) ? null : url,
    ...proxyTargets.flatMap((target) => STREAM_PROXIES.map((proxy) => proxy(target))),
  ]);
}

export function isHlsUrl(url: string | null | undefined) {
  if (!url) return false;
  try {
    return new URL(url).pathname.toLowerCase().endsWith('.m3u8') || /\.m3u8(\?|$)/i.test(url);
  } catch {
    return /\.m3u8(\?|$)/i.test(url);
  }
}

export function isTransportStreamUrl(url: string | null | undefined, streamType?: string | null) {
  if (!url) return false;
  const type = (streamType || '').toLowerCase();
  if (type === 'mpegts' || type === 'ts') return true;
  try {
    const path = new URL(url).pathname.toLowerCase();
    return path.endsWith('.ts') || path.includes('/mpegts/') || path.includes('/ts/');
  } catch {
    return /\.ts(\?|$)/i.test(url);
  }
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
  if (path.endsWith('.ts') || type === 'mpegts') return 'ready';

  return 'unknown';
}
