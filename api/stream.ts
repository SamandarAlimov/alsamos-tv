import { Readable } from 'node:stream';

const HLS_CONTENT_TYPES = [
  'application/vnd.apple.mpegurl',
  'application/x-mpegurl',
  'audio/mpegurl',
  'audio/x-mpegurl',
];

const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36';

const CORS_HEADERS: Record<string, string> = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, HEAD, OPTIONS',
  'access-control-allow-headers': 'Range, Content-Type, Origin, Referer, User-Agent',
  'access-control-expose-headers': 'Content-Length, Content-Range, Accept-Ranges, Content-Type',
  'x-accel-buffering': 'no',
};

type ApiRequest = {
  method?: string;
  query: Record<string, string | string[] | undefined>;
  headers: Record<string, string | string[] | undefined>;
};

type ApiResponse = {
  status: (code: number) => ApiResponse;
  setHeader: (name: string, value: string) => void;
  end: (body?: string) => void;
  send: (body: string) => void;
};

export const config = {
  maxDuration: 60,
};

function getQueryValue(req: ApiRequest, key: string) {
  const value = req.query[key];
  return Array.isArray(value) ? value[0] : value;
}

function getHeaderValue(req: ApiRequest, key: string) {
  const value = req.headers[key.toLowerCase()] || req.headers[key];
  return Array.isArray(value) ? value[0] : value;
}

function setHeaders(res: ApiResponse, headers: Record<string, string>) {
  Object.entries(headers).forEach(([key, value]) => res.setHeader(key, value));
}

type RewriteOptions = {
  directHls?: boolean;
  referer?: string | null;
  userAgent?: string | null;
};

function getProxyUrl(target: string, referer?: string | null, userAgent?: string | null, directHls?: boolean) {
  const params = new URLSearchParams({ url: target });
  if (referer) params.set('referer', referer);
  if (userAgent) params.set('ua', userAgent);
  if (directHls) params.set('direct', '1');
  return `/api/stream?${params.toString()}`;
}

function isHlsManifest(target: URL, contentType: string | null) {
  const normalizedType = (contentType || '').split(';')[0].trim().toLowerCase();
  const path = target.pathname.toLowerCase();
  return (
    HLS_CONTENT_TYPES.includes(normalizedType) ||
    path.endsWith('.m3u8')
  );
}

function rewriteUri(value: string, base: URL, options: RewriteOptions) {
  if (!value || value.startsWith('data:')) return value;

  try {
    const absolute = new URL(value, base);
    if (options.directHls && absolute.protocol === 'https:') return absolute.toString();
    return getProxyUrl(absolute.toString(), options.referer, options.userAgent, options.directHls);
  } catch {
    return value;
  }
}

function rewriteHlsManifest(manifest: string, base: URL, options: RewriteOptions) {
  return manifest
    .split(/\r?\n/)
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return line;

      if (trimmed.startsWith('#')) {
        return line.replace(
          /URI="([^"]+)"/g,
          (_match, uri) => `URI="${rewriteUri(uri, base, options)}"`
        );
      }

      return rewriteUri(trimmed, base, options);
    })
    .join('\n');
}

function sendError(res: ApiResponse, message: string, status = 400) {
  setHeaders(res, CORS_HEADERS);
  res.setHeader('content-type', 'text/plain; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  res.status(status).end(message);
}

function copyUpstreamHeaders(upstream: Response, res: ApiResponse, rewriteManifest: boolean) {
  setHeaders(res, CORS_HEADERS);
  res.setHeader('cache-control', 'no-store');
  res.setHeader('accept-ranges', upstream.headers.get('accept-ranges') || 'bytes');

  const passthroughHeaders = ['content-range'];
  for (const header of passthroughHeaders) {
    const value = upstream.headers.get(header);
    if (value) res.setHeader(header, value);
  }

  if (rewriteManifest) {
    res.setHeader('content-type', 'application/vnd.apple.mpegurl; charset=utf-8');
    return;
  }

  const contentType = upstream.headers.get('content-type');
  const contentLength = upstream.headers.get('content-length');
  if (contentType) res.setHeader('content-type', contentType);
  if (contentLength && contentLength !== '0') res.setHeader('content-length', contentLength);
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method === 'OPTIONS') {
    setHeaders(res, CORS_HEADERS);
    res.status(204).end();
    return;
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    sendError(res, 'Method not allowed', 405);
    return;
  }

  const rawTarget = getQueryValue(req, 'url');
  if (!rawTarget) {
    sendError(res, 'Missing stream url');
    return;
  }

  let target: URL;
  try {
    target = new URL(rawTarget);
  } catch {
    sendError(res, 'Invalid stream url');
    return;
  }

  if (target.protocol !== 'http:' && target.protocol !== 'https:') {
    sendError(res, 'Unsupported stream protocol');
    return;
  }

  const referer = getQueryValue(req, 'referer') || getQueryValue(req, 'referrer') || null;
  const userAgent = getQueryValue(req, 'ua') || getQueryValue(req, 'userAgent') || getHeaderValue(req, 'user-agent') || DEFAULT_USER_AGENT;
  const rawMode = getQueryValue(req, 'raw') === '1' || getQueryValue(req, 'rewrite') === '0';
  const directHls = getQueryValue(req, 'direct') === '1';
  const upstreamHeaders = new Headers();
  upstreamHeaders.set('user-agent', userAgent);
  upstreamHeaders.set('accept', getHeaderValue(req, 'accept') || '*/*');
  if (referer) {
    upstreamHeaders.set('referer', referer);
    try {
      upstreamHeaders.set('origin', new URL(referer).origin);
    } catch {}
  }

  const range = getHeaderValue(req, 'range');
  if (range) upstreamHeaders.set('range', range);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  let upstream: Response;
  try {
    upstream = await fetch(target.toString(), {
      method: req.method,
      headers: upstreamHeaders,
      redirect: 'follow',
      signal: controller.signal,
    });
  } catch {
    clearTimeout(timeout);
    sendError(res, 'Stream source unreachable', 502);
    return;
  }
  clearTimeout(timeout);

  const upstreamBase = new URL(upstream.url || target.toString());
  const rewriteManifest = !rawMode && isHlsManifest(upstreamBase, upstream.headers.get('content-type'));
  copyUpstreamHeaders(upstream, res, rewriteManifest);
  res.status(upstream.status);

  if (req.method === 'HEAD') {
    res.end();
    return;
  }

  if (rewriteManifest) {
    const manifest = await upstream.text();
    res.send(rewriteHlsManifest(manifest, upstreamBase, { directHls, referer, userAgent }));
    return;
  }

  if (!upstream.body) {
    res.end();
    return;
  }

  Readable.fromWeb(upstream.body as any).pipe(res as any);
}
