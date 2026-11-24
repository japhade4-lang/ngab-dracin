import { NextRequest, NextResponse } from 'next/server';

// In-memory cache for HLS playlists and .ts video chunks to prevent any stutter
interface CacheEntry {
  body: Buffer | string;
  contentType: string;
  status: number;
  timestamp: number;
}

const memoryCache = new Map<string, CacheEntry>();
const MAX_CACHE_ITEMS = 120; // Stores up to ~100MB of hot video segments in VPS RAM

function getCached(key: string): CacheEntry | null {
  const item = memoryCache.get(key);
  if (!item) return null;
  // Expire after 2 hours
  if (Date.now() - item.timestamp > 2 * 3600 * 1000) {
    memoryCache.delete(key);
    return null;
  }
  return item;
}

function setCached(key: string, entry: CacheEntry) {
  if (memoryCache.size >= MAX_CACHE_ITEMS) {
    // Delete oldest entry
    const oldestKey = memoryCache.keys().next().value;
    if (oldestKey) memoryCache.delete(oldestKey);
  }
  memoryCache.set(key, entry);
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');
  const source = req.nextUrl.searchParams.get('source') || 'netshort';

  if (!url) {
    return new NextResponse('Missing url parameter', { status: 400 });
  }

  const range = req.headers.get('range');
  const cacheKey = `${url}_${range || 'full'}`;

  // Check in-memory cache for fast instant delivery (0ms)
  const cached = getCached(cacheKey);
  if (cached) {
    const resHeaders = new Headers();
    resHeaders.set('Access-Control-Allow-Origin', '*');
    resHeaders.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    resHeaders.set('Access-Control-Allow-Headers', 'Range, Content-Type');
    resHeaders.set('Accept-Ranges', 'bytes');
    resHeaders.set('Content-Type', cached.contentType);
    resHeaders.set('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
    resHeaders.set('X-Proxy-Cache', 'HIT');
    return new NextResponse(cached.body as unknown as BodyInit, {
      status: cached.status,
      headers: resHeaders,
    });
  }

  try {
    const referer =
      source === 'dramabox'
        ? 'https://www.dramabox.com/'
        : source === 'melolo'
        ? 'https://melolo.com/'
        : 'https://netshort.com/';

    const forwardHeaders: Record<string, string> = {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Referer: referer,
      Origin: referer,
      Accept: '*/*',
    };

    if (range) {
      forwardHeaders['range'] = range;
    }

    const upstreamResponse = await fetch(url, {
      headers: forwardHeaders,
    });

    const responseHeaders = new Headers();
    responseHeaders.set('Access-Control-Allow-Origin', '*');
    responseHeaders.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    responseHeaders.set('Access-Control-Allow-Headers', 'Range, Content-Type');
    responseHeaders.set('Accept-Ranges', 'bytes');
    responseHeaders.set('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
    responseHeaders.set('X-Proxy-Cache', 'MISS');

    const contentType = upstreamResponse.headers.get('content-type') || 'video/mp4';

    // If this is an HLS playlist (.m3u8), rewrite relative segment paths to proxy URLs
    if (url.includes('.m3u8') || contentType.includes('mpegurl') || contentType.includes('application/x-mpegURL')) {
      const playlistText = await upstreamResponse.text();
      const parsedUrl = new URL(url);
      const basePath = url.substring(0, url.lastIndexOf('/') + 1);
      const searchParams = parsedUrl.search; // preserves ?auth_key=...

      const rewrittenLines = playlistText.split('\n').map((line) => {
        const trimmed = line.trim();
        if (!trimmed) return line;

        // Header comments and directives
        if (trimmed.startsWith('#')) {
          if (trimmed.includes('URI="')) {
            return trimmed.replace(/URI="([^"]+)"/, (_, uri) => {
              const fullKeyUrl = uri.startsWith('http') ? uri : `${basePath}${uri}${searchParams}`;
              return `URI="/api/proxy/video?url=${encodeURIComponent(fullKeyUrl)}&source=${source}"`;
            });
          }
          return line;
        }

        // Segment URI line
        let segmentAbsoluteUrl = trimmed;
        if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
          segmentAbsoluteUrl = `${basePath}${trimmed}${searchParams}`;
        } else if (!trimmed.includes('?') && searchParams) {
          segmentAbsoluteUrl = `${trimmed}${searchParams}`;
        }

        return `/api/proxy/video?url=${encodeURIComponent(segmentAbsoluteUrl)}&source=${source}`;
      });

      const rewrittenContent = rewrittenLines.join('\n');
      responseHeaders.set('Content-Type', 'application/vnd.apple.mpegurl');

      setCached(cacheKey, {
        body: rewrittenContent,
        contentType: 'application/vnd.apple.mpegurl',
        status: 200,
        timestamp: Date.now(),
      });

      return new NextResponse(rewrittenContent, {
        status: 200,
        headers: responseHeaders,
      });
    }

    // Binary stream (e.g. .ts segment or .mp4)
    responseHeaders.set('Content-Type', contentType);

    const contentLength = upstreamResponse.headers.get('content-length');
    if (contentLength) {
      responseHeaders.set('Content-Length', contentLength);
    }

    const contentRange = upstreamResponse.headers.get('content-range');
    if (contentRange) {
      responseHeaders.set('Content-Range', contentRange);
    }

    // If this is a .ts segment (typically < 3MB), cache it in memory
    const isTsSegment = url.includes('.ts') || contentType.includes('MP2T');
    if (isTsSegment && upstreamResponse.ok) {
      const buffer = await upstreamResponse.arrayBuffer();
      const nodeBuf = Buffer.from(buffer);
      setCached(cacheKey, {
        body: nodeBuf,
        contentType,
        status: upstreamResponse.status,
        timestamp: Date.now(),
      });
      return new NextResponse(nodeBuf as unknown as BodyInit, {
        status: upstreamResponse.status,
        headers: responseHeaders,
      });
    }

    // For larger streams (e.g. direct mp4 or ranges)
    return new NextResponse(upstreamResponse.body, {
      status: upstreamResponse.status,
      headers: responseHeaders,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Proxy fetch failed';
    return new NextResponse(`Proxy error: ${message}`, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Range, Content-Type',
    },
  });
}
