import { NextRequest, NextResponse } from 'next/server';
import { searchDramas } from '@/lib/api';

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q') || '';
  if (!q.trim()) {
    return NextResponse.json({ results: [] });
  }

  const results = await searchDramas(q);
  return NextResponse.json({ results });
}
