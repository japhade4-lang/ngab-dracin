import { NextRequest, NextResponse } from 'next/server';

const DRACIN_API_BASE = process.env.NEXT_PUBLIC_DRACIN_API_URL || 'https://dracinapi.com';

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const source = searchParams.get('source') || 'netshort';
  const dramaId = searchParams.get('dramaId') || '';
  const quality = searchParams.get('quality') || '720p';

  const apiKey =
    req.headers.get('x-api-key') ||
    req.headers.get('authorization')?.replace('Bearer ', '') ||
    searchParams.get('apiKey') ||
    process.env.DRACIN_API_KEY ||
    process.env.NEXT_PUBLIC_DRACIN_API_KEY ||
    '';

  if (!dramaId) {
    return NextResponse.json(
      { success: false, error: 'dramaId wajib diisi' },
      { status: 400 }
    );
  }

  if (apiKey) {
    try {
      const dlRes = await fetch(
        `${DRACIN_API_BASE}/${encodeURIComponent(source)}/api/v1/download/${encodeURIComponent(dramaId)}?quality=${encodeURIComponent(quality)}`,
        {
          headers: {
            'User-Agent': 'Dracin-Web/1.0.0',
            'Accept': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            'x-api-key': apiKey,
          },
          signal: AbortSignal.timeout(5000),
        }
      );

      if (dlRes.ok) {
        const data = await dlRes.json();
        return NextResponse.json({
          success: true,
          ...data,
        });
      }
    } catch (err: unknown) {
      console.warn('[Dracin API] Download route error:', err);
    }
  }

  // Fallback direct link
  return NextResponse.json({
    success: false,
    isDemo: true,
    message: 'Kunci lisensi Dracin API diperlukan untuk mengunduh file asli.',
    downloadUrl: 'https://vjs.zencdn.net/v/oceans.mp4',
    format: 'mp4',
    quality: '720p',
    size: '15.4 MB',
  });
}
