import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  let videoUrl = searchParams.get('url');
  const title = searchParams.get('title') || 'Drama';
  const episode = searchParams.get('episode') || '1';

  if (!videoUrl) {
    return new NextResponse('Missing url parameter', { status: 400 });
  }

  // If url was wrapped in /api/proxy/video, unwrap it
  if (videoUrl.includes('/api/proxy/video?url=')) {
    try {
      const parsed = new URL(videoUrl, 'http://localhost:3000');
      const inner = parsed.searchParams.get('url');
      if (inner) videoUrl = inner;
    } catch {}
  }

  // Sanitize filename for Indonesian characters & ASCII
  const cleanTitle = title
    .replace(/[^\w\s-]/gi, '')
    .trim()
    .replace(/\s+/g, '_');
  const filename = `${cleanTitle}_EP${episode}.mp4`;

  try {
    // 1. If it's an HLS playlist (.m3u8), stream the concatenated TS segments as an MP4/video file
    if (videoUrl.includes('.m3u8')) {
      const playlistRes = await fetch(videoUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Referer: 'https://www.shorttv.live/',
        },
      });

      if (!playlistRes.ok) {
        return NextResponse.redirect(videoUrl);
      }

      const playlistText = await playlistRes.text();
      const lines = playlistText.split('\n');
      const baseUrl = videoUrl.substring(0, videoUrl.lastIndexOf('/') + 1);
      const queryParams = videoUrl.includes('?') ? '?' + videoUrl.split('?')[1] : '';

      const segmentUrls: string[] = [];
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const fullSegUrl = trimmed.startsWith('http')
            ? trimmed
            : baseUrl + trimmed + (trimmed.includes('?') ? '' : queryParams);
          segmentUrls.push(fullSegUrl);
        }
      }

      if (segmentUrls.length === 0) {
        return NextResponse.redirect(videoUrl);
      }

      // Stream each segment sequentially
      const stream = new ReadableStream({
        async start(controller) {
          try {
            for (const segUrl of segmentUrls) {
              const segRes = await fetch(segUrl, {
                headers: {
                  'User-Agent':
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                },
              });
              if (segRes.ok && segRes.body) {
                const reader = segRes.body.getReader();
                while (true) {
                  const { done, value } = await reader.read();
                  if (done) break;
                  controller.enqueue(value);
                }
              }
            }
          } catch (e) {
            console.warn('[Download] HLS stream error:', e);
          } finally {
            controller.close();
          }
        },
      });

      const headers = new Headers();
      headers.set('Content-Type', 'video/mp4');
      headers.set(
        'Content-Disposition',
        `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`
      );
      headers.set('Access-Control-Allow-Origin', '*');

      return new NextResponse(stream, { headers });
    }

    // 2. Direct MP4 Video URL (DramaBox, direct video links)
    const upstreamHeaders: Record<string, string> = {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Accept: '*/*',
    };

    if (videoUrl.includes('dramabox')) {
      upstreamHeaders['Referer'] = 'https://www.dramabox.com/';
      upstreamHeaders['Origin'] = 'https://www.dramabox.com/';
    } else if (videoUrl.includes('netshort')) {
      upstreamHeaders['Referer'] = 'https://netshort.com/';
      upstreamHeaders['Origin'] = 'https://netshort.com/';
    }

    const upstream = await fetch(videoUrl, { headers: upstreamHeaders });

    if (!upstream.ok || !upstream.body) {
      return NextResponse.redirect(videoUrl);
    }

    const headers = new Headers();
    headers.set('Content-Type', 'video/mp4');
    headers.set(
      'Content-Disposition',
      `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`
    );
    headers.set('Access-Control-Allow-Origin', '*');

    const contentLength = upstream.headers.get('content-length');
    if (contentLength) {
      headers.set('Content-Length', contentLength);
    }

    return new NextResponse(upstream.body, {
      status: 200,
      headers,
    });
  } catch (err: unknown) {
    console.error('[Download] Failed to download video:', err);
    return NextResponse.redirect(videoUrl);
  }
}
