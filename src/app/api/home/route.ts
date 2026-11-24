import { NextResponse } from 'next/server';
import {
  fetchTrending,
  fetchLatestDramas,
  fetchDubbedDramas,
  fetchForYou,
} from '@/lib/api';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [trending, latest, dubbed, forYou] = await Promise.all([
      fetchTrending('dramabox'),
      fetchLatestDramas(24),
      fetchDubbedDramas(),
      fetchForYou('dramabox'),
    ]);

    return NextResponse.json(
      {
        success: true,
        timestamp: Date.now(),
        trending,
        latest,
        dubbed,
        forYou,
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to load live feed';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
