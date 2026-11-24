import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

// Get appropriate cache directory for VPS or local development
function getCacheDir(): string {
  const vpsCacheDir = '/var/cache/nginx/dracin_videos';
  if (fs.existsSync(vpsCacheDir)) {
    return vpsCacheDir;
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

    const isM3U8 = url.includes('.m3u8');
    const isTsSegment = url.includes('.ts');

    // =========================================================================
    // 1. HLS PLAYLIST REWRITING (.m3u8)
    // =========================================================================
    if (isM3U8) {
      const upstreamResponse = await fetch(url, { headers: forwardHeaders });
      if (!upstreamResponse.ok) {
        return new NextResponse('Failed to fetch m3u8 playlist', { status: upstreamResponse.status });
      }

      const playlistText = await upstreamResponse.text();
      const parsedUrl = new URL(url);
      const basePath = url.substring(0, url.lastIndexOf('/') + 1);
      const searchParams = parsedUrl.search; // preserves ?auth_key=...

      const rewrittenLines = playlistText.split('\n').map((line) => {
        const trimmed = line.trim();
        if (!trimmed) return line;

        if (trimmed.startsWith('#')) {
          if (trimmed.includes('URI="')) {
            return trimmed.replace(/URI="([^"]+)"/, (_, uri) => {
              const fullKeyUrl = uri.startsWith('http') ? uri : `${basePath}${uri}${searchParams}`;
              return `URI="/api/proxy/video?url=${encodeURIComponent(fullKeyUrl)}&source=${source}"`;
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

        return `/api/proxy/video?url=${encodeURIComponent(segmentAbsoluteUrl)}&source=${source}`;
      });

      const resHeaders = new Headers();
      resHeaders.set('Content-Type', 'application/vnd.apple.mpegurl');
      resHeaders.set('Access-Control-Allow-Origin', '*');
      resHeaders.set('Cache-Control', 'public, max-age=3600');
      return new NextResponse(rewrittenLines.join('\n'), {
        status: 200,
        headers: resHeaders,
      });
    }

    // =========================================================================
    // 2. VIDEO SEGMENTS (.ts) & STANDALONE VIDEOS (.mp4)
    // =========================================================================
    // Generate unique MD5 hash for the URL (stripping ephemeral auth params for cache reuse if desired)
    const urlHash = crypto.createHash('md5').update(url).digest('hex');
    const ext = isTsSegment ? '.ts' : '.mp4';
    const cacheDir = getCacheDir();
    const cachedFilePath = path.join(cacheDir, `${urlHash}${ext}`);
    const mimeType = isTsSegment ? 'video/MP2T' : 'video/mp4';

    // If file is not yet cached locally on VPS SSD, download it once at full 80MB/s line rate
    if (!fs.existsSync(cachedFilePath)) {
      const downloadRes = await fetch(url, { headers: forwardHeaders });
      if (downloadRes.ok) {
        const buffer = Buffer.from(await downloadRes.arrayBuffer());
        try {
          const tempPath = `${cachedFilePath}.tmp.${Date.now()}`;
          fs.writeFileSync(tempPath, buffer);
          fs.renameSync(tempPath, cachedFilePath);
        } catch (e) {
          console.warn('[Video Cache] Could not write cache file:', e);
        }
      }
    }

    // Check if we now have the local cached file
    if (fs.existsSync(cachedFilePath)) {
      const stat = fs.statSync(cachedFilePath);
      const fileSize = stat.size;
      const rangeHeader = req.headers.get('range');

      let start = 0;
      let end = fileSize - 1;
      let status = 200;

      if (rangeHeader) {
        const parts = rangeHeader.replace(/bytes=/, '').split('-');
        start = parseInt(parts[0], 10);
        end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        if (end >= fileSize) end = fileSize - 1;
        status = 206;
      }

      const chunkSize = end - start + 1;
      const fd = fs.openSync(cachedFilePath, 'r');
      const chunkBuffer = Buffer.alloc(chunkSize);
      fs.readSync(fd, chunkBuffer, 0, chunkSize, start);
      fs.closeSync(fd);

      const resHeaders = new Headers();
      resHeaders.set('Content-Type', mimeType);
      resHeaders.set('Content-Length', String(chunkSize));
      resHeaders.set('Accept-Ranges', 'bytes');
      resHeaders.set('Access-Control-Allow-Origin', '*');
      resHeaders.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
      resHeaders.set('Access-Control-Allow-Headers', 'Range, Content-Type');
      resHeaders.set('Cache-Control', 'public, max-age=604800, immutable');
      resHeaders.set('X-Proxy-Cache', 'HIT');

      if (status === 206) {
        resHeaders.set('Content-Range', `bytes ${start}-${end}/${fileSize}`);
      }

      // Return real Buffer with Content-Length header so browser never receives 'Transfer-Encoding: chunked'
      return new NextResponse(chunkBuffer as unknown as BodyInit, {
        status,
        headers: resHeaders,
      });
    }

    // =========================================================================
    // 3. FALLBACK: LIVE PROXY WITH STRICT CONTENT-LENGTH
    // =========================================================================
    const range = req.headers.get('range');
    if (range) {
      forwardHeaders['range'] = range;
    }

    const upstreamResponse = await fetch(url, { headers: forwardHeaders });
    const buffer = Buffer.from(await upstreamResponse.arrayBuffer());

    const fallbackHeaders = new Headers();
    fallbackHeaders.set('Content-Type', mimeType);
    fallbackHeaders.set('Content-Length', String(buffer.byteLength));
    fallbackHeaders.set('Accept-Ranges', 'bytes');
    fallbackHeaders.set('Access-Control-Allow-Origin', '*');
    fallbackHeaders.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    fallbackHeaders.set('Access-Control-Allow-Headers', 'Range, Content-Type');
    fallbackHeaders.set('Cache-Control', 'public, max-age=86400');
    fallbackHeaders.set('X-Proxy-Cache', 'PASS');

    const contentRange = upstreamResponse.headers.get('content-range');
    if (contentRange) {
      fallbackHeaders.set('Content-Range', contentRange);
    }

    return new NextResponse(buffer as unknown as BodyInit, {
      status: upstreamResponse.status,
      headers: fallbackHeaders,
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
