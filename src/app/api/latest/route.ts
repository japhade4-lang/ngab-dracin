import { NextRequest, NextResponse } from 'next/server';
import { fetchLatestDramas } from '@/lib/api';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const limit = parseInt(req.nextUrl.searchParams.get('limit') || '40', 10);
  try {
    const dramas = await fetchLatestDramas(limit);
    return NextResponse.json(
      {
        success: true,
        timestamp: Date.now(),
        count: dramas.length,
        dramas,
      },
      {
        headers: {
          'Cache-Control': 'no-cache, no-store, max-age=0, must-revalidate',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: 'Failed to fetch latest dramas', details: message },
      { status: 500 }
    );
  }
}
