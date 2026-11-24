import { NextResponse } from 'next/server';
import { getServerAccessStatus } from '@/lib/accessAuth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const status = await getServerAccessStatus();
  return NextResponse.json(status, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  });
}
