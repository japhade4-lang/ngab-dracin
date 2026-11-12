import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');
  const source = req.nextUrl.searchParams.get('source') || 'netshort';

  if (!url) {
    return new NextResponse('Missing url parameter', { status: 400 });
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

    const range = req.headers.get('range');
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

      responseHeaders.set('Content-Type', 'application/vnd.apple.mpegurl');
      responseHeaders.set('Cache-Control', 'public, max-age=3600');
      return new NextResponse(rewrittenLines.join('\n'), {
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
