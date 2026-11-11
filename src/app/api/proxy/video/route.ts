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
