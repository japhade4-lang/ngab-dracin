import { NextRequest, NextResponse } from 'next/server';

const DRACIN_API_BASE = process.env.NEXT_PUBLIC_DRACIN_API_URL || 'https://dracinapi.com';

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const source = searchParams.get('source') || 'netshort';
  const dramaId = searchParams.get('dramaId') || '';
  const episode = parseInt(searchParams.get('episode') || '1', 10);

  // Retrieve API key from request headers, query param, or server environment
  const apiKey =
    req.headers.get('x-api-key') ||
    req.headers.get('authorization')?.replace('Bearer ', '') ||
    searchParams.get('apiKey') ||
    process.env.DRACIN_API_KEY ||
    process.env.NEXT_PUBLIC_DRACIN_API_KEY ||
    '';

  const verifiedStreams = [
    'https://vjs.zencdn.net/v/oceans.mp4',
    'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    'https://media.w3.org/2010/05/sintel/trailer.mp4',
  ];
  const demoFallback = verifiedStreams[(episode - 1) % verifiedStreams.length];

  if (!dramaId) {
    return NextResponse.json(
      { success: false, error: 'dramaId wajib diisi' },
      { status: 400 }
    );
  }

  // If user provided an API key, call official Dracin API endpoints
  if (apiKey) {
    const authHeaders: Record<string, string> = {
      'User-Agent': 'Dracin-Web/1.0.0',
      'Accept': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'x-api-key': apiKey,
    };

    // 1. Try Streaming Endpoint: GET /{provider}/api/v1/play/{id}/{ep}
    // Docs: https://dracinapi.com/docs/streaming-api/
    try {
      const playRes = await fetch(
        `${DRACIN_API_BASE}/${encodeURIComponent(source)}/api/v1/play/${encodeURIComponent(dramaId)}/${episode}`,
        {
          headers: authHeaders,
          signal: AbortSignal.timeout(4000),
        }
      );

      if (playRes.ok) {
        const data = await playRes.json();
        if (data && data.streamUrl) {
          return NextResponse.json({
            success: true,
            provider: data.provider || source,
            dramaId,
            episode,
            streamUrl: data.streamUrl,
            qualities: data.quality || ['1080p', '720p', '480p'],
            subtitles: data.subtitles || [],
            cdn: data.cdn || 'cdn.dracinapi.com',
            format: data.format || (data.streamUrl.includes('.m3u8') ? 'HLS' : 'MP4'),
          });
        }
      }
    } catch (err: unknown) {
      console.warn('[Dracin API] Stream play fetch error:', err);
    }

    // 2. Try Download & CDN Endpoint: GET /{provider}/api/v1/download/{id}
    // Docs: https://dracinapi.com/docs/download-api/
    try {
      const dlRes = await fetch(
        `${DRACIN_API_BASE}/${encodeURIComponent(source)}/api/v1/download/${encodeURIComponent(dramaId)}?quality=720p`,
        {
          headers: authHeaders,
          signal: AbortSignal.timeout(4000),
        }
      );

      if (dlRes.ok) {
        const data = await dlRes.json();
        const targetUrl = data.cdnUrl || data.downloadUrl;
        if (targetUrl) {
          return NextResponse.json({
            success: true,
            provider: data.provider || source,
            dramaId,
            episode,
            streamUrl: targetUrl,
            downloadUrl: data.downloadUrl,
            qualities: [data.quality || '720p'],
            format: data.format || 'mp4',
            size: data.size,
          });
        }
      }
    } catch (err: unknown) {
      console.warn('[Dracin API] Download fetch error:', err);
    }
  }

  // If no API key or upstream failed, return preview fallback with clear instruction
  return NextResponse.json({
    success: false,
    isDemo: true,
    message: apiKey
      ? 'Kunci API Dracin API tidak dapat memuat video untuk judul ini. Menjalankan server pemutar preview.'
      : 'API key Dracin API belum terpasang. Kunjungi dracinapi.com untuk mendapatkan akses 42 platform.',
    streamUrl: demoFallback,
    qualities: ['720p', '480p'],
  });
}
