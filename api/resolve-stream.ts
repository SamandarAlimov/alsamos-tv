const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36';

const CORS_HEADERS: Record<string, string> = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, OPTIONS',
  'access-control-allow-headers': 'Range, Content-Type, Origin, Referer, User-Agent',
  'cache-control': 'no-store',
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

function json(res: ApiResponse, status: number, body: unknown) {
  setHeaders(res, CORS_HEADERS);
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.status(status).end(JSON.stringify(body));
}

function getProxyUrl(target: string, referer?: string | null, userAgent?: string | null) {
  const params = new URLSearchParams({ url: target });
  if (referer) params.set('referer', referer);
  if (userAgent) params.set('ua', userAgent);
  return `/api/stream?${params.toString()}`;
}

function isVideoFile(url: URL, contentType: string | null) {
  const type = (contentType || '').split(';')[0].trim().toLowerCase();
  const path = url.pathname.toLowerCase();
  return (
    type.startsWith('video/') ||
    ['.mp4', '.m4v', '.mov', '.webm', '.ogg'].some((ext) => path.endsWith(ext))
  );
}

function isHls(url: URL, contentType: string | null) {
  const type = (contentType || '').split(';')[0].trim().toLowerCase();
  return type.includes('mpegurl') || url.pathname.toLowerCase().endsWith('.m3u8');
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method === 'OPTIONS') {
    setHeaders(res, CORS_HEADERS);
    res.status(204).end();
    return;
  }

  if (req.method !== 'GET') {
    json(res, 405, { error: 'Method not allowed' });
    return;
  }

  const rawTarget = getQueryValue(req, 'url');
  if (!rawTarget) {
    json(res, 400, { error: 'Missing stream url' });
    return;
  }

  let target: URL;
  try {
    target = new URL(rawTarget);
  } catch {
    json(res, 400, { error: 'Invalid stream url' });
    return;
  }

  if (!['http:', 'https:'].includes(target.protocol)) {
    json(res, 400, { error: 'Unsupported stream protocol' });
    return;
  }

  const referer = getQueryValue(req, 'referer') || getQueryValue(req, 'referrer') || null;
  const userAgent = getQueryValue(req, 'ua') || getQueryValue(req, 'userAgent') || getHeaderValue(req, 'user-agent') || DEFAULT_USER_AGENT;
  const headers = new Headers();
  headers.set('user-agent', userAgent);
  headers.set('accept', '*/*');
  headers.set('range', 'bytes=0-0');
  if (referer) headers.set('referer', referer);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  let upstream: Response;
  try {
    upstream = await fetch(target.toString(), {
      method: 'GET',
      headers,
      redirect: 'follow',
      signal: controller.signal,
    });
  } catch {
    clearTimeout(timeout);
    json(res, 502, { error: 'Stream source unreachable', proxyUrl: getProxyUrl(target.toString(), referer, userAgent) });
    return;
  }
  clearTimeout(timeout);

  const finalUrl = new URL(upstream.url || target.toString());
  const contentType = upstream.headers.get('content-type');
  const kind = isHls(finalUrl, contentType) ? 'hls' : isVideoFile(finalUrl, contentType) ? 'video' : 'unknown';
  const directUrl = finalUrl.protocol === 'https:' && kind === 'video' ? finalUrl.toString() : null;
  upstream.body?.cancel().catch(() => {});

  json(res, 200, {
    ok: upstream.ok,
    status: upstream.status,
    sourceUrl: target.toString(),
    finalUrl: finalUrl.toString(),
    directUrl,
    proxyUrl: getProxyUrl(finalUrl.toString(), referer, userAgent),
    kind,
    contentType,
    contentLength: upstream.headers.get('content-length'),
    contentRange: upstream.headers.get('content-range'),
  });
}
