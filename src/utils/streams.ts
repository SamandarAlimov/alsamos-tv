export type StreamHealth = 'ready' | 'mixed-content' | 'unsupported' | 'unknown';

export interface StreamRequestOptions {
  referer?: string | null;
  userAgent?: string | null;
  proxyOnly?: boolean;
  preferDirectHls?: boolean;
  directHlsOnly?: boolean;
  forceHls?: boolean;
}

const STREAM_PROXIES = [
  (url: string) => `https://corsproxy.io/?url=${encodeURIComponent(url)}`,
  (url: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
];

function unique(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.filter(Boolean) as string[]));
}

function getInspectableUrl(url: string) {
  try {
    const base = typeof window !== 'undefined' ? window.location.origin : 'https://alsamos.local';
    const parsed = new URL(url, base);
    return parsed.searchParams.get('url') || url;
  } catch {
    return url;
  }
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

export function getLocalStreamProxyUrl(url: string | null | undefined, options: StreamRequestOptions = {}) {
  if (!url) return null;

  try {
    new URL(url);
    const params = new URLSearchParams({ url });
    if (options.referer) params.set('referer', options.referer);
    if (options.userAgent) params.set('ua', options.userAgent);
    if (options.preferDirectHls) params.set('direct', '1');
    if (options.forceHls) params.set('hls', '1');
    return `/api/stream?${params.toString()}`;
  } catch {
    return null;
  }
}

export function getStreamCandidates(url: string | null | undefined, options: StreamRequestOptions = {}) {
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
  const directOptions = { ...options, preferDirectHls: true };
  const directHlsCandidates = unique([
    options.preferDirectHls || options.directHlsOnly ? getLocalStreamProxyUrl(url, directOptions) : null,
    (options.preferDirectHls || options.directHlsOnly) && upgraded ? getLocalStreamProxyUrl(upgraded, directOptions) : null,
  ]);
  const fullProxyCandidates = unique([
    getLocalStreamProxyUrl(url, { ...options, preferDirectHls: false }),
    upgraded ? getLocalStreamProxyUrl(upgraded, { ...options, preferDirectHls: false }) : null,
  ]);
  const localProxyCandidates = options.directHlsOnly
    ? directHlsCandidates
    : unique([...directHlsCandidates, ...fullProxyCandidates]);

  if (options.proxyOnly && localProxyCandidates.length > 0) {
    return localProxyCandidates;
  }

  return unique([
    ...localProxyCandidates,
    preferred,
    upgraded,
    isMixedContentUrl(url) ? null : url,
    ...proxyTargets.flatMap((target) => STREAM_PROXIES.map((proxy) => proxy(target))),
  ]);
}

export function isHlsUrl(url: string | null | undefined) {
  if (!url) return false;
  const inspectableUrl = getInspectableUrl(url);
  try {
    return new URL(inspectableUrl).pathname.toLowerCase().endsWith('.m3u8') || /\.m3u8(\?|$)/i.test(inspectableUrl);
  } catch {
    return /\.m3u8(\?|$)/i.test(inspectableUrl);
  }
}

export function isTransportStreamUrl(url: string | null | undefined, streamType?: string | null) {
  if (!url) return false;
  const type = (streamType || '').toLowerCase();
  if (type === 'mpegts' || type === 'ts') return true;
  const inspectableUrl = getInspectableUrl(url);
  try {
    const path = new URL(inspectableUrl).pathname.toLowerCase();
    return path.endsWith('.ts') || path.includes('/mpegts/') || path.includes('/ts/');
  } catch {
    return /\.ts(\?|$)/i.test(inspectableUrl);
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
  if (path.endsWith('.ts') || type === 'mpegts' || type === 'ts') return 'ready';

  return 'unknown';
}
