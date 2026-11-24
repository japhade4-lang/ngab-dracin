import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const VPS_CACHE_DIR = '/var/cache/nginx/dracin_videos';

function getCacheDir(): string {
  if (fs.existsSync(VPS_CACHE_DIR)) {
    return VPS_CACHE_DIR;
  }
  const localDir = path.join(process.cwd(), '.video_cache');
  if (!fs.existsSync(localDir)) {
    try {
      fs.mkdirSync(localDir, { recursive: true });
    } catch {}
  }
  return localDir;
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');
  const source = req.nextUrl.searchParams.get('source') || 'netshort';

  if (!url) {
    return new NextResponse('Missing url parameter', { status: 400 });
  }

  try {
    const parsedTarget = new URL(url);
    const pathname = parsedTarget.pathname.toLowerCase();
    const isM3U8 = pathname.endsWith('.m3u8') || url.includes('.m3u8');
    const isTsSegment = pathname.endsWith('.ts') || url.includes('.ts');

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

    // =========================================================================
    // 1. HLS PLAYLIST REWRITING (.m3u8) — Required for CORS on Hls.js browsers
    // =========================================================================
    if (isM3U8) {
      const upstreamResponse = await fetch(url, { headers: forwardHeaders });
      if (!upstreamResponse.ok) {
        return new NextResponse('Failed to fetch m3u8 playlist', { status: upstreamResponse.status });
      }

      const playlistText = await upstreamResponse.text();
      const basePath = url.substring(0, url.lastIndexOf('/') + 1);
      const searchParams = parsedTarget.search; // preserves ?auth_key=...

      const rewrittenLines = playlistText.split('\n').map((line) => {
        const trimmed = line.trim();
        if (!trimmed) return line;

        if (trimmed.startsWith('#')) {
          if (trimmed.includes('URI="')) {
            return trimmed.replace(/URI="([^"]+)"/, (_, uri) => {
              const fullKeyUrl = uri.startsWith('http') ? uri : `${basePath}${uri}${searchParams}`;
              return `URI="/api/proxy/video?url=${encodeURIComponent(fullKeyUrl)}&source=${encodeURIComponent(source)}"`;
            });
          }
          return line;
        }

        let segmentAbsoluteUrl = trimmed;
        if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
          segmentAbsoluteUrl = `${basePath}${trimmed}${searchParams}`;
        } else if (!trimmed.includes('?') && searchParams) {
          segmentAbsoluteUrl = `${trimmed}${searchParams}`;
        }

        return `/api/proxy/video?url=${encodeURIComponent(segmentAbsoluteUrl)}&source=${encodeURIComponent(source)}`;
      });

      return new NextResponse(rewrittenLines.join('\n'), {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.apple.mpegurl',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, max-age=3600',
        },
      });
    }

    // =========================================================================
    // 2. HLS VIDEO SEGMENTS (.ts) — Direct 200 response or internal X-Accel-Redirect
    //    (Never 302 redirect so Hls.js never wastes an extra HTTP round-trip!)
    // =========================================================================
    const cacheDir = getCacheDir();
    const isVpsNginx = cacheDir === VPS_CACHE_DIR;

    if (isTsSegment) {
      const urlHash = crypto.createHash('md5').update(url).digest('hex');
      const cachedFilePath = path.join(cacheDir, `${urlHash}.ts`);

      if (fs.existsSync(cachedFilePath)) {
        if (isVpsNginx) {
          return new NextResponse(null, {
            status: 200,
            headers: {
              'X-Accel-Redirect': `/internal-video-cache/${urlHash}.ts`,
              'Content-Type': 'video/MP2T',
              'Access-Control-Allow-Origin': '*',
              'Cache-Control': 'public, max-age=604800, immutable',
            },
          });
        }
        const buf = await fs.promises.readFile(cachedFilePath);
        return new NextResponse(buf as unknown as BodyInit, {
          status: 200,
          headers: {
            'Content-Type': 'video/MP2T',
            'Content-Length': String(buf.byteLength),
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'public, max-age=604800, immutable',
          },
        });
      }

      const upstreamRes = await fetch(url, { headers: forwardHeaders });
      if (!upstreamRes.ok) {
        return new NextResponse('Segment fetch failed', { status: upstreamRes.status });
      }
      const buffer = Buffer.from(await upstreamRes.arrayBuffer());

      // Save to disk cache asynchronously in background without blocking the client response
      const tempPath = `${cachedFilePath}.tmp.${Date.now()}`;
      fs.promises
        .writeFile(tempPath, buffer)
        .then(() => fs.promises.rename(tempPath, cachedFilePath))
        .catch(() => {});

      return new NextResponse(buffer as unknown as BodyInit, {
        status: 200,
        headers: {
          'Content-Type': 'video/MP2T',
          'Content-Length': String(buffer.byteLength),
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, max-age=604800, immutable',
        },
      });
    }

    // =========================================================================
    // 3. MP4 FALLBACK PROXY (Zero-stall Range forwarding with strict Content-Length)
    // =========================================================================
    const urlHash = crypto.createHash('md5').update(url).digest('hex');
    const cachedMp4Path = path.join(cacheDir, `${urlHash}.mp4`);

    if (fs.existsSync(cachedMp4Path) && isVpsNginx) {
      return new NextResponse(null, {
        status: 200,
        headers: {
          'X-Accel-Redirect': `/internal-video-cache/${urlHash}.mp4`,
          'Content-Type': 'video/mp4',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, max-age=604800, immutable',
        },
      });
    }

    // Never block waiting for full 25MB+ MP4 download: forward exact Range chunk directly!
    const range = req.headers.get('range');
    if (range) {
      forwardHeaders['range'] = range;
    }

    const upstreamResponse = await fetch(url, { headers: forwardHeaders });
    const buffer = Buffer.from(await upstreamResponse.arrayBuffer());

    const headers = new Headers();
    headers.set('Content-Type', upstreamResponse.headers.get('content-type') || 'video/mp4');
    headers.set('Content-Length', String(buffer.byteLength));
    headers.set('Accept-Ranges', 'bytes');
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    headers.set('Access-Control-Allow-Headers', 'Range, Content-Type');
    headers.set('Cache-Control', 'public, max-age=86400');

    const contentRange = upstreamResponse.headers.get('content-range');
    if (contentRange) {
      headers.set('Content-Range', contentRange);
    }

    return new NextResponse(buffer as unknown as BodyInit, {
      status: upstreamResponse.status,
      headers,
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
      'Access-Control-Max-Age': '86400',
    },
  });
}
