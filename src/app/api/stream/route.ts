import { NextRequest, NextResponse } from 'next/server';
import { fetchDramaStream } from '@/lib/api';
import { DramaSource } from '@/types/drama';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const source = (req.nextUrl.searchParams.get('source') || 'dramabox') as DramaSource;
  const id = req.nextUrl.searchParams.get('id') || '';
  const ep = parseInt(req.nextUrl.searchParams.get('ep') || '1', 10) || 1;

  if (!id) {
    return NextResponse.json({ success: false, error: 'Missing id' }, { status: 400 });
  }

  try {
    const stream = await fetchDramaStream(source, id, ep);
    return NextResponse.json({ success: true, ...stream });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Stream lookup failed';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
